// api/sentiment.js — country macro sentiment via LLM (JSON parse + validation)
import * as d3 from 'd3';
import { MACRO_CONTEXT, DATA_VINTAGE, devMode, cacheTs } from '../core/constants.js';
import { cache, newsCache, activeId, _sentimentInFlight } from '../core/state.js';
import { detectProvider, callLLM, callLLMFree, callClaudeWithSearch } from './llm.js';

// ── JSON repair helpers ───────────────────────────────────────────────────────

export function closeTruncated(s) {
  let inStr = false, esc = false;
  const stack = [];
  for (const c of s) {
    if (esc)              { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"')        { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) s += '"';
  while (stack.length) s += stack.pop();
  return s;
}

export function repairAndParseJSON(raw) {
  raw = raw.replace(/^```(?:json)?/gim, '').replace(/^```/gim, '').trim();

  const objStart = raw.indexOf('{');
  const arrStart = raw.indexOf('[');
  if (objStart < 0 && arrStart < 0) throw new Error('No JSON in model response');
  const start = (objStart < 0) ? arrStart : (arrStart < 0) ? objStart : Math.min(objStart, arrStart);
  const isArr = raw[start] === '[';
  const closeChar = isArr ? ']' : '}';
  const end = raw.lastIndexOf(closeChar);
  raw = end > start ? raw.slice(start, end + 1) : raw.slice(start);

  try { return JSON.parse(raw); } catch (_) {}

  raw = raw
    .replace(/\/\/[^\n\r"]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/"([^"]+)"(?:\s*\|\s*"[^"]+")+/g, '"$1"');

  try { return JSON.parse(raw); } catch (_) {}
  try { return JSON.parse(closeTruncated(raw)); } catch (_) {}

  const lastComma = raw.lastIndexOf(',');
  if (lastComma > 0) {
    try { return JSON.parse(closeTruncated(raw.slice(0, lastComma))); } catch (_) {}
  }

  throw new Error('Model returned unparseable JSON — try again');
}

// ── Post-response validation ──────────────────────────────────────────────────

export function validateSentimentResult(r) {
  r.score = Math.max(-1, Math.min(1, parseFloat(r.score) || 0));
  const s = r.score;

  if      (s >  0.10) r.sentiment = 'bullish';
  else if (s < -0.10) r.sentiment = 'bearish';
  else                r.sentiment = 'neutral';

  const margin  = r.confidence === 'High' ? 0.10 : r.confidence === 'Low' ? 0.30 : 0.20;
  const rawLow  = parseFloat(r.score_low);
  const rawHigh = parseFloat(r.score_high);
  r.score_low   = Math.max(-1, Math.min(s, isNaN(rawLow)  ? (s - margin) : rawLow));
  r.score_high  = Math.min( 1, Math.max(s, isNaN(rawHigh) ? (s + margin) : rawHigh));

  const modelSpread    = r.score_high - r.score_low;
  const expectedSpread = margin * 2;
  if (Math.abs(modelSpread - expectedSpread) < 0.02) {
    const biasDown = s > 0 ? margin * 0.80 : margin * 1.20;
    const biasUp   = s > 0 ? margin * 1.20 : margin * 0.80;
    r.score_low  = Math.max(-1, Math.round((s - biasDown) * 100) / 100);
    r.score_high = Math.min( 1, Math.round((s + biasUp)   * 100) / 100);
  }

  if (!['High','Medium','Low'].includes(r.confidence)) r.confidence = 'Medium';

  const validRegimes = ['Goldilocks','Reflation','Stagflation','Recession'];
  if (!validRegimes.includes(r.regime)) r.regime = 'Goldilocks';

  if (r.rate_outlook === 'Hiking' && r.regime === 'Recession')   r.regime = 'Stagflation';
  if (r.rate_outlook === 'Cutting' && r.regime === 'Goldilocks' && s < -0.15) r.regime = 'Reflation';
  if (s < -0.40 && r.regime === 'Goldilocks') r.regime = 'Recession';

  if (!['Overweight','Neutral','Underweight'].includes(r.equity_bias)) r.equity_bias = 'Neutral';
  if (!['Cutting','Holding','Hiking'].includes(r.rate_outlook))         r.rate_outlook = 'Holding';
  if (!['Strengthen','Stable','Weaken'].includes(r.fx_bias))            r.fx_bias = 'Stable';
  if (!['Low','Medium','High','Very High'].includes(r.risk_level))      r.risk_level = 'Medium';

  if (r.factors && typeof r.factors === 'object') {
    ['growth','inflation','monetary','fx','geopolitical','market'].forEach(k => {
      if (r.factors[k] != null) r.factors[k] = Math.max(-1, Math.min(1, parseFloat(r.factors[k]) || 0));
    });
  }

  if (r.factors && r.factors.inflation > 0.30 && ['Stagflation','Recession'].includes(r.regime)) {
    r.factors.inflation = Math.min(0.10, r.factors.inflation);
    r._inflation_clamped = true;
  }

  if (r.factors && typeof r.factors === 'object') {
    const f = r.factors;
    const keys = ['growth','inflation','monetary','fx','geopolitical','market'];
    const weights = [0.25, 0.20, 0.25, 0.15, 0.10, 0.05];
    if (keys.every(k => typeof f[k] === 'number' && !isNaN(f[k]))) {
      const fc = Math.round(keys.reduce((sum, k, i) => sum + f[k] * weights[i], 0) * 100) / 100;
      r._factor_composite = fc;
      const dev = Math.abs(fc - r.score);
      if (dev >= 0.30) {
        r.score = Math.max(-1, Math.min(1, Math.round((fc * 0.50 + r.score * 0.50) * 100) / 100));
        r._score_adjusted = true;
      } else if (dev >= 0.15) {
        r.score = Math.max(-1, Math.min(1, Math.round((fc * 0.30 + r.score * 0.70) * 100) / 100));
        r._score_adjusted = true;
      }
      if (r._score_adjusted) {
        const sa = r.score;
        r.sentiment = sa > 0.10 ? 'bullish' : sa < -0.10 ? 'bearish' : 'neutral';
        r.score_low  = Math.max(-1, Math.min(sa, r.score_low));
        r.score_high = Math.min( 1, Math.max(sa, r.score_high));
      }
    }
  }

  if (devMode && r._score_adjusted && r._inflation_clamped) {
    console.warn('[GMI Accuracy] Compound correction applied:', {
      country: r._meta?.name || '?',
      score: r.score,
      factor_composite: r._factor_composite,
      inflation_clamped: r._inflation_clamped,
      score_adjusted: r._score_adjusted,
      regime: r.regime
    });
  }

  return r;
}

// ── Main sentiment fetch ──────────────────────────────────────────────────────

export async function fetchSentiment(key, meta, silent = false) {
  if (_sentimentInFlight.has(key)) return;
  _sentimentInFlight.add(key);
  d3.select('#' + key).classed('loading', true);

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const isoId  = key.replace(/^c/, '').padStart(3, '0');
  const econ   = MACRO_CONTEXT[isoId];
  const econBlock = econ
    ? `\nVERIFIED ECONOMIC SNAPSHOT (data vintage: ${DATA_VINTAGE} — today is ${today}):
GDP Growth: ${econ.gdp}% | CPI: ${econ.cpi}% | Policy Rate: ${econ.rate}% | Unemployment: ${econ.unemp}% | Current Account: ${econ.ca}% GDP | PMI: ${econ.pmi}
Key context (as of ${DATA_VINTAGE}): ${econ.note}
⚑ Apply your current knowledge of developments since ${DATA_VINTAGE} to update these figures (central bank decisions, CPI prints, growth revisions, political events).\n`
    : '';
  const _hasEconData = !!econ;

  const cachedNews = newsCache[key];
  const newsBlock = (cachedNews && cachedNews.length)
    ? `\nRECENT HEADLINES (use to calibrate sentiment — these happened before today):\n` +
      cachedNews.slice(0, 3).map(a => `• ${a.title}: ${a.summary || ''}`).join('\n') + '\n'
    : '';

  const jsonSchema = `
Respond with ONLY a valid JSON object. No markdown, no code fences, no trailing commas:

sentiment: "bullish" if score > 0.10, "bearish" if score < -0.10, else "neutral" — must be consistent with score
score: composite number from -1.0 to 1.0
score_low: lower plausible bound (must be ≤ score)
score_high: upper plausible bound (must be ≥ score)
confidence: one of High, Medium, Low
regime: derive from your factor scores using these exact rules —
  Goldilocks  = growth factor ≥ 0 AND inflation factor ≥ -0.15 (on-trend growth, inflation contained)
  Reflation   = growth factor ≥ 0 AND inflation factor < -0.15  (growth with inflation above target)
  Stagflation = growth factor < 0 AND inflation factor < -0.15  (contraction + elevated inflation)
  Recession   = growth factor < 0 AND inflation factor ≥ -0.15  (contraction + low/falling inflation)
  Note: if inflation factor < -0.40 choose Stagflation regardless of growth
rationale: one sentence explaining the single dominant macro driver for ${meta.name}, max 25 words
equity_bias: one of Overweight, Neutral, Underweight
rate_outlook: one of Cutting, Holding, Hiking
fx_bias: one of Strengthen, Stable, Weaken
risk_level: one of Low, Medium, High, Very High
key_risk: biggest tail risk for ${meta.name} in 6-8 words
news_topics: array of 3 specific current ${meta.name} macro topics, max 5 words each
factors: object with exactly these keys — growth, inflation, monetary, fx, geopolitical, market — each a number from -1.0 to 1.0`;

  const searchPrompt = `Today is ${today}. Search for the latest macroeconomic data for ${meta.name}: current GDP growth, CPI inflation, central bank policy rate and most recent rate decision, any major economic news or risk events in the past 4 weeks. Then use the searched data plus the context below to conduct a structured sentiment assessment for ${meta.name} (${meta.region}).
${econBlock}${newsBlock}
STEP 0 — DATA REVIEW (internal scratchpad — do NOT include this in your JSON output)
Before scoring, identify the single most important data point for each factor from the live search results and/or context above. State each as one short phrase. Do not assign scores yet.
• Growth evidence: [one key fact about GDP, PMI, or output]
• Inflation evidence: [one key fact about CPI, core inflation, or price pressures]
• Monetary evidence: [one key fact about rate decisions or central bank guidance]
• FX evidence: [one key fact about currency, current account, or capital flows]
• Geopolitical evidence: [one key fact about political or trade risk]
• Market evidence: [one key fact about equity trend or credit spreads]

STEP 1 — FACTOR SCORING (use ONLY evidence from STEP 0)
Score each dimension from -1.0 (very negative) to +1.0 (very positive).
Calibration anchors — use these reference points to anchor your scores:
  GROWTH:      +1.0 = GDP >4% & PMI >55 | 0.0 = GDP ~0–1% & PMI ~50 | -1.0 = GDP contraction & PMI <45
  INFLATION:   +1.0 = CPI at/converging to target | 0.0 = CPI 50–100bp from target | -1.0 = EITHER hyperinflation (>15%) OR deflation (<-0.5%) — both extremes are negative for markets
  MONETARY:    +1.0 = easing into positive real rates | 0.0 = holding with stable real rates | -1.0 = tightening into recession OR deeply negative real rates
  FX:          +1.0 = large CA surplus + inflows + undervalued | 0.0 = balanced | -1.0 = CA deficit + outflows + overvalued
  GEOPOLITICAL:+1.0 = stable government, no sanctions, low risk | 0.0 = moderate uncertainty | -1.0 = active conflict, sanctions, or credible political crisis
  MARKET:      +1.0 = ${meta.index} bull trend, tight credit, strong inflows | 0.0 = sideways, neutral | -1.0 = bear market, widening spreads, outflows

1. GROWTH: GDP trajectory, PMI trend, industrial output, consumer demand for ${meta.name}
2. INFLATION: CPI path, core vs headline gap — note: deflation AND hyperinflation both score negatively for different reasons
3. MONETARY POLICY: Rate direction from ${meta.name}'s central bank, real rate level, forward guidance credibility
4. FX: ${meta.currency} current account dynamics, capital flows, ${meta.currency}/USD valuation
5. GEOPOLITICAL: Government stability, regional risk exposure, sanctions/trade war risk
6. MARKET MOMENTUM: ${meta.index} equity trend, credit spreads, investor risk appetite

STEP 2 — COMPOSITE SCORE
score = (growth×0.25) + (inflation×0.20) + (monetary×0.25) + (fx×0.15) + (geopolitical×0.10) + (market×0.05)
Round to 2 decimal places. Clamp to [-1.0, +1.0].

STEP 3 — CONFIDENCE (reflects DATA CERTAINTY, not score certainty)
  High   = live searched data available AND no major data gaps across factors
  Medium = partial data or mixed signals making some factors hard to pin down
  Low    = significant data gaps, contradictory signals, or country with limited public data
Set score_low and score_high to reflect data uncertainty:
  High: ±0.10 | Medium: ±0.20 | Low: ±0.30. Clamp to [-1.0, +1.0].

STEP 4 — ARITHMETIC VERIFICATION (before writing JSON)
Recompute: (growth×0.25)+(inflation×0.20)+(monetary×0.25)+(fx×0.15)+(geopolitical×0.10)+(market×0.05).
If this differs from your intended score by more than ±0.02, correct the score field to match the factor-derived value. The factors are the primary evidence; the score must be mathematically consistent with them.
${jsonSchema}`;

  const prompt = `Today is ${today}. You are a senior macro strategist at a top-tier investment bank conducting a structured sentiment assessment for ${meta.name} (${meta.region}).
${econBlock}${newsBlock}
STEP 0 — DATA REVIEW (internal scratchpad — do NOT include this in your JSON output)
Before scoring, identify the single most important data point for each factor from the snapshot and headlines above, plus your training knowledge of recent developments. State each as one short phrase. Do not assign scores yet.
• Growth evidence: [one key fact about GDP, PMI, or output]
• Inflation evidence: [one key fact about CPI, core inflation, or price pressures]
• Monetary evidence: [one key fact about rate decisions or central bank guidance]
• FX evidence: [one key fact about currency, current account, or capital flows]
• Geopolitical evidence: [one key fact about political or trade risk]
• Market evidence: [one key fact about equity trend or credit spreads]

STEP 1 — FACTOR SCORING (use ONLY evidence from STEP 0)
Score each dimension from -1.0 (very negative) to +1.0 (very positive).
Calibration anchors — use these reference points to anchor your scores:
  GROWTH:      +1.0 = GDP >4% & PMI >55 | 0.0 = GDP ~0–1% & PMI ~50 | -1.0 = GDP contraction & PMI <45
  INFLATION:   +1.0 = CPI at/converging to target | 0.0 = CPI 50–100bp from target | -1.0 = EITHER hyperinflation (>15%) OR deflation (<-0.5%) — both extremes are negative for markets
  MONETARY:    +1.0 = easing into positive real rates | 0.0 = holding with stable real rates | -1.0 = tightening into recession OR deeply negative real rates
  FX:          +1.0 = large CA surplus + inflows + undervalued | 0.0 = balanced | -1.0 = CA deficit + outflows + overvalued
  GEOPOLITICAL:+1.0 = stable government, no sanctions, low risk | 0.0 = moderate uncertainty | -1.0 = active conflict, sanctions, or credible political crisis
  MARKET:      +1.0 = ${meta.index} bull trend, tight credit, strong inflows | 0.0 = sideways, neutral | -1.0 = bear market, widening spreads, outflows

1. GROWTH: GDP trajectory, PMI trend, industrial output, consumer demand for ${meta.name}
2. INFLATION: CPI path, core vs headline gap — note: deflation AND hyperinflation both score negatively for different reasons
3. MONETARY POLICY: Rate direction from ${meta.name}'s central bank, real rate level, forward guidance credibility
4. FX: ${meta.currency} current account dynamics, capital flows, ${meta.currency}/USD valuation
5. GEOPOLITICAL: Government stability, regional risk exposure, sanctions/trade war risk
6. MARKET MOMENTUM: ${meta.index} equity trend, credit spreads, investor risk appetite

STEP 2 — COMPOSITE SCORE
score = (growth×0.25) + (inflation×0.20) + (monetary×0.25) + (fx×0.15) + (geopolitical×0.10) + (market×0.05)
Round to 2 decimal places. Clamp to [-1.0, +1.0].

STEP 3 — CONFIDENCE (reflects DATA CERTAINTY, not score certainty)
  High   = verified economic snapshot present AND no major data gaps across factors
  Medium = partial data or mixed signals making some factors hard to pin down
  Low    = no snapshot injected OR significant data gaps / contradictory signals
Set score_low and score_high to reflect data uncertainty:
  High: ±0.10 | Medium: ±0.20 | Low: ±0.30. Clamp to [-1.0, +1.0].

STEP 4 — ARITHMETIC VERIFICATION (before writing JSON)
Recompute: (growth×0.25)+(inflation×0.20)+(monetary×0.25)+(fx×0.15)+(geopolitical×0.10)+(market×0.05).
If this differs from your intended score by more than ±0.02, correct the score field to match the factor-derived value. The factors are the primary evidence; the score must be mathematically consistent with them.
${jsonSchema}`;

  const promptB = `Today is ${today}. You are a risk analyst stress-testing the macro outlook for ${meta.name} (${meta.region}). Your task: assume the current market consensus may be too complacent and identify where it could be wrong.
${econBlock}${newsBlock}
STEP 0 — DOWNSIDE DATA REVIEW (internal scratchpad — do NOT include in JSON)
For each factor, identify the most concerning data point or risk that the consensus may be underweighting. Be rigorous, not gratuitously bearish — only flag genuine risks supported by evidence.
• Growth concern: [lagging indicator, revision risk, or structural drag]
• Inflation concern: [stickiness, second-round effect, or deflation trap]
• Monetary concern: [policy mistake risk, credibility gap, or tightening lag]
• FX concern: [external vulnerability, currency risk, or capital flight risk]
• Geopolitical concern: [tail risk, escalation potential, or contagion]
• Market concern: [valuation stretch, liquidity risk, or sentiment reversal]

STEP 1 — FACTOR SCORING (use evidence from STEP 0; apply downside scrutiny)
Score each factor from -1.0 (very negative) to +1.0 (very positive) using the same calibration anchors:
  GROWTH:      +1.0 = GDP >4% & PMI >55 | 0.0 = GDP ~0–1% & PMI ~50 | -1.0 = contraction & PMI <45
  INFLATION:   +1.0 = converging to target | 0.0 = 50–100bp from target | -1.0 = hyperinflation OR deflation
  MONETARY:    +1.0 = easing into positive real rates | 0.0 = stable real rates | -1.0 = tightening into recession
  FX:          +1.0 = CA surplus + inflows | 0.0 = balanced | -1.0 = CA deficit + outflows + overvalued
  GEOPOLITICAL:+1.0 = stable, no sanctions | 0.0 = moderate uncertainty | -1.0 = conflict or credible crisis
  MARKET:      +1.0 = bull trend, tight credit | 0.0 = sideways | -1.0 = bear market, widening spreads

1. GROWTH: GDP trajectory, PMI trend, industrial output, consumer demand
2. INFLATION: CPI path — deflation AND hyperinflation both score negatively
3. MONETARY POLICY: Rate direction, real rate level, forward guidance credibility
4. FX: ${meta.currency} current account, capital flows, ${meta.currency}/USD valuation
5. GEOPOLITICAL: Government stability, regional risk, sanctions/trade war risk
6. MARKET MOMENTUM: ${meta.index} trend, credit spreads, investor risk appetite

STEP 2 — COMPOSITE SCORE
score = (growth×0.25) + (inflation×0.20) + (monetary×0.25) + (fx×0.15) + (geopolitical×0.10) + (market×0.05)
Round to 2 decimal places. Clamp to [-1.0, +1.0].

STEP 3 — CONFIDENCE (reflects DATA CERTAINTY)
  High = verified snapshot present AND factors are clearly directional
  Medium = partial data or genuine ambiguity in at least 2 factors
  Low = significant data gaps or highly contradictory signals
Set score_low and score_high: High ±0.10 | Medium ±0.20 | Low ±0.30. Clamp to [-1.0, +1.0].

STEP 4 — ARITHMETIC VERIFICATION
Recompute (growth×0.25)+(inflation×0.20)+(monetary×0.25)+(fx×0.15)+(geopolitical×0.10)+(market×0.05). Correct score if it differs from factor-derived value by more than ±0.02.
${jsonSchema}`;

  const HIGH_STAKES = new Set(['c840','c156','c276','c392','c826','c250','c380','c124','c36','c76',
    'c356','c410','c484','c682','c158','c702','c752','c756','c528','c710']);

  const sysPrompt = 'Output only a single raw JSON object. No markdown. No explanation. No code fences. No trailing commas.';

  function extractClaudeText(data) {
    return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  }

  try {
    let result;
    const provider = detectProvider();

    if (provider === 'claude') {
      const searchData = await callClaudeWithSearch(searchPrompt, 2200, 3);
      const searchText = extractClaudeText(searchData);
      const searchResult = validateSentimentResult(repairAndParseJSON(searchText));

      if (HIGH_STAKES.has(key)) {
        const rawB = await callLLM(sysPrompt, promptB, 1800, 0.35);
        const b = validateSentimentResult(repairAndParseJSON(rawB));
        const avgScore = Math.round(((searchResult.score + b.score) / 2) * 100) / 100;
        result = {
          ...searchResult,
          score:       avgScore,
          score_low:   Math.round(((searchResult.score_low  + b.score_low)  / 2) * 100) / 100,
          score_high:  Math.round(((searchResult.score_high + b.score_high) / 2) * 100) / 100,
        };
        if (searchResult.factors && b.factors) {
          result.factors = {};
          ['growth','inflation','monetary','fx','geopolitical','market'].forEach(k => {
            result.factors[k] = Math.round(((searchResult.factors[k] || 0) + (b.factors[k] || 0)) / 2 * 100) / 100;
          });
        }
        result = validateSentimentResult(result);
        result._grounded = true;
      } else {
        result = searchResult;
        result._grounded = true;
      }

    } else if (provider && HIGH_STAKES.has(key)) {
      const [rawA, rawB] = await Promise.all([
        callLLM(sysPrompt, prompt, 1800, 0.2),
        callLLM(sysPrompt, promptB, 1800, 0.35)
      ]);
      const a = validateSentimentResult(repairAndParseJSON(rawA));
      const b = validateSentimentResult(repairAndParseJSON(rawB));
      const avgScore = Math.round(((a.score + b.score) / 2) * 100) / 100;
      const pickRegime = (ra, rb, s) => {
        if (ra === rb) return ra;
        if (s <= -0.40) return 'Recession';
        if (s <= -0.15) return (ra === 'Stagflation' || rb === 'Stagflation') ? 'Stagflation' : ra;
        if (s >= 0.30)  return (ra === 'Goldilocks'  || rb === 'Goldilocks')  ? 'Goldilocks'  : ra;
        return ra;
      };
      const pickRisk = (ra, rb) => {
        if (ra === rb) return ra;
        const order = ['Low','Medium','High','Very High'];
        return order.indexOf(ra) >= order.indexOf(rb) ? ra : rb;
      };
      result = {
        ...a,
        score:        avgScore,
        score_low:    Math.round(((a.score_low  + b.score_low)  / 2) * 100) / 100,
        score_high:   Math.round(((a.score_high + b.score_high) / 2) * 100) / 100,
        regime:       pickRegime(a.regime, b.regime, avgScore),
        rate_outlook: a.rate_outlook === b.rate_outlook ? a.rate_outlook : a.rate_outlook,
        fx_bias:      a.fx_bias === b.fx_bias ? a.fx_bias : a.fx_bias,
        equity_bias:  avgScore > 0.15 && (a.equity_bias !== b.equity_bias) ? 'Overweight'
                    : avgScore < -0.15 && (a.equity_bias !== b.equity_bias) ? 'Underweight'
                    : a.equity_bias,
        risk_level:   pickRisk(a.risk_level, b.risk_level),
      };
      if (a.factors && b.factors) {
        result.factors = {};
        ['growth','inflation','monetary','fx','geopolitical','market'].forEach(k => {
          result.factors[k] = Math.round(((a.factors[k] || 0) + (b.factors[k] || 0)) / 2 * 100) / 100;
        });
      }
      result = validateSentimentResult(result);

    } else if (!provider) {
      // Free tier (no API key) — Pollinations uses a smaller model; use a compact prompt
      const freeEcon = econ
        ? ` GDP ${econ.gdp}%, CPI ${econ.cpi}%, Rate ${econ.rate}%, PMI ${econ.pmi}. ${econ.note}`
        : '';
      const freePrompt =
        `Assess macro sentiment for ${meta.name} (${meta.region}).${freeEcon}\n` +
        `Return ONLY valid JSON, no markdown, no explanation:\n` +
        `{"sentiment":"bullish","score":0.15,"score_low":0.05,"score_high":0.25,"confidence":"Medium","regime":"Goldilocks","rationale":"brief 20-word reason","equity_bias":"Overweight","rate_outlook":"Holding","fx_bias":"Stable","risk_level":"Medium","key_risk":"main tail risk 8 words","news_topics":["topic1","topic2","topic3"],"factors":{"growth":0.2,"inflation":0.1,"monetary":0.1,"fx":0.0,"geopolitical":0.1,"market":0.1}}\n` +
        `Rules: sentiment matches score (>0.10=bullish, <-0.10=bearish, else neutral). ` +
        `Regime: Goldilocks=growth≥0+inflation ok, Reflation=growth≥0+inflation high, Stagflation=growth<0+inflation high, Recession=growth<0+inflation ok.`;
      const raw = await callLLMFree(sysPrompt, freePrompt, 600);
      result = validateSentimentResult(repairAndParseJSON(raw));
    } else {
      // Gemini key, non-high-stakes country
      const raw = await callLLM(sysPrompt, prompt, 1800, 0.2);
      result = validateSentimentResult(repairAndParseJSON(raw));
    }

    result._meta         = meta;
    result._econ_grounded = _hasEconData;

    const prev = cache[key];
    if (prev && typeof prev.score === 'number') {
      const delta = Math.abs(result.score - prev.score);
      const sentimentFlip = prev.sentiment !== result.sentiment &&
        !(prev.sentiment === 'neutral' || result.sentiment === 'neutral');
      const regimeChange  = prev.regime !== result.regime;
      if ((sentimentFlip || regimeChange) && delta >= 0.20) {
        result._regime_shift   = true;
        result._prev_sentiment = prev.sentiment;
        result._prev_regime    = prev.regime;
        result._prev_score     = prev.score;
      }
    }

    cache[key]  = result;
    cacheTs[key] = Date.now();
    // updateCount not yet extracted — bridge via window until Phase 4
    window.updateCount?.();

    d3.select('#' + key)
      .classed('loading', false)
      .classed('default', false)
      .classed('bullish', result.sentiment === 'bullish')
      .classed('bearish', result.sentiment === 'bearish')
      .classed('neutral', result.sentiment === 'neutral');

    if (!silent && activeId === key) window.renderPanel?.(result);

  } catch (err) {
    d3.select('#' + key).classed('loading', false).classed('default', true);
    if (!silent && activeId === key) {
      document.getElementById('sent-badge').className = 'neutral';
      document.getElementById('sent-badge').innerHTML = '⚠ &nbsp;Error';
      const isFreeMsg = err.message.startsWith('Free AI');
      document.getElementById('rationale').textContent = isFreeMsg ? err.message : 'Error: ' + err.message;
    }
    console.warn('fetchSentiment failed for', key, err.message);
  } finally {
    _sentimentInFlight.delete(key);
  }
}
