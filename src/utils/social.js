// social.js — Social Media Sentiment Panel
import { callLLM, callLLMFree, detectProvider, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { CACHE_TTL, socialCacheTs } from '../core/constants.js';
import {
  currentCountryMeta,
  socialOpen, setSocialOpen,
  socialScope, setSocialScope,
  socialFilter, socialCache,
} from '../core/state.js';
import { toggleExpand } from './expand.js';

export function toggleSocialPanel() {
  const newOpen = !socialOpen;
  setSocialOpen(newOpen);
  const panel = document.getElementById('social-panel');
  const tab   = document.getElementById('social-tab');
  panel.classList.toggle('open', newOpen);
  tab.classList.toggle('active', newOpen);
  // Load if opening and no cached data for current scope
  if (newOpen) {
    const cKey = socialScope === 'country' && currentCountryMeta
      ? currentCountryMeta.name + ' financial markets'
      : 'global financial markets';
    if (!socialCache[cKey]) loadSocialSentiment();
    else renderSocialSentiment(socialCache[cKey]);
  }
}

export function closeSocialPanel() {
  setSocialOpen(false);
  document.getElementById('social-panel').classList.remove('open');
  document.getElementById('social-tab').classList.remove('active');
}

// wireSocialScope: UI handler — sets scope state AND updates the UI
// (distinct from the state setter setSocialScope imported from state.js)
export function wireSocialScope(scope) {
  if (scope === 'country' && !currentCountryMeta) return; // no country selected yet
  setSocialScope(scope);
  document.querySelectorAll('.soc-scope-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === scope));
  loadSocialSentiment();
}

export async function loadSocialSentiment() {
  const content = document.getElementById('social-content');
  const loading = document.getElementById('social-loading');
  const errEl   = document.getElementById('social-error');
  content.innerHTML = '';
  errEl.style.display = 'none';
  loading.style.display = 'block';

  const filterText = socialFilter.trim() ? ` — focusing on: ${socialFilter.trim()}` : '';
  const target = (socialScope === 'country' && currentCountryMeta
    ? currentCountryMeta.name + ' financial markets'
    : 'global financial markets') + filterText;

  const cacheKey = target;
  if (socialCache[cacheKey]) {
    loading.style.display = 'none';
    renderSocialSentiment(socialCache[cacheKey]);
    // Stale-while-revalidate: continue to fetch if stale (don't return)
    const age = Date.now() - (socialCacheTs[cacheKey] || 0);
    if (age <= CACHE_TTL.social) return;
    // stale — fall through and silently refresh in background
    loading.style.display = 'none'; // already rendered, keep it hidden
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prompt = `Today is ${today}. You are a market sentiment analyst. Based on your training knowledge, estimate the likely social media investor sentiment about "${target}" as of ${today}.${socialFilter.trim() ? ` Focus especially on discussions about: ${socialFilter.trim()}.` : ''}

Epistemic constraint: You do not have live social data. All outputs are calibrated estimates — treat them as directional indicators, not precise measurements. Do not fabricate specific post counts — use qualitative ranges only.

Calibration method — reason through in order before scoring:
1. What is the macro/fundamental backdrop for "${target}" right now? (bullish/bearish/mixed)
2. How far is the situation from consensus expectation? (Surprise = higher social volume)
3. How does retail sentiment typically lag or lead fundamentals for this asset/market?

fear_greed calibration anchors:
  80–100 = extreme greed (late-cycle melt-up, FOMO, meme-stock dynamics)
  60–79  = greed (positive momentum, most investors constructive)
  40–59  = neutral (mixed signals, wait-and-see)
  20–39  = fear (downside concerns, defensive positioning)
  0–19   = extreme fear (panic, capitulation signals)

Respond with ONLY a valid JSON object. No markdown, no code fences, no trailing commas:

overall: object with bull_pct (integer 0-100), neut_pct (integer 0-100), bear_pct (integer 0-100, all three sum to 100), volume ("High"|"Moderate"|"Low"), trend ("Rising"|"Stable"|"Falling")
platforms: array of 4 objects — name (Twitter/X, Reddit, StockTwits, Seeking Alpha), bull_pct (integer 0-100), top_sentiment ("Bullish"|"Neutral"|"Bearish"), activity ("High"|"Moderate"|"Low")
trending: array of 5 objects — ticker (string), name (string), sentiment ("Bullish"|"Neutral"|"Bearish"), driver (string: 1 phrase, max 8 words)
topics: array of 5 objects — tag (string), type ("Bullish"|"Bearish"|"Neutral"|"Breaking"), relevance (string: max 8 words)
fear_greed: integer 0-100 calibrated using the anchors above
mood_summary: string, 1-sentence directional summary, max 20 words
data_note: "Calibrated estimate — no live social data. Treat as directional indicator only."`;

  try {
    const sys = 'You are a market sentiment analyst. Output only a raw JSON object. No markdown.';
    let raw;
    if (!detectProvider()) {
      const freePrompt =
        `Estimate investor social media sentiment for "${target}" as of ${today}.\n` +
        `Return ONLY valid JSON, no markdown:\n` +
        `{"overall":{"bull_pct":45,"neut_pct":35,"bear_pct":20,"volume":"Moderate","trend":"Stable"},"platforms":[{"name":"Twitter/X","bull_pct":48,"top_sentiment":"Bullish","activity":"High"},{"name":"Reddit","bull_pct":42,"top_sentiment":"Neutral","activity":"Moderate"},{"name":"StockTwits","bull_pct":44,"top_sentiment":"Bullish","activity":"Moderate"},{"name":"Seeking Alpha","bull_pct":50,"top_sentiment":"Bullish","activity":"Low"}],"trending":[{"ticker":"TICKER","name":"Name","sentiment":"Bullish","driver":"reason in 6 words"},{"ticker":"TICKER2","name":"Name2","sentiment":"Neutral","driver":"reason in 6 words"},{"ticker":"TICKER3","name":"Name3","sentiment":"Bearish","driver":"reason in 6 words"},{"ticker":"TICKER4","name":"Name4","sentiment":"Bullish","driver":"reason in 6 words"},{"ticker":"TICKER5","name":"Name5","sentiment":"Neutral","driver":"reason in 6 words"}],"topics":[{"tag":"#topic1","type":"Bullish","relevance":"why relevant 6 words"},{"tag":"#topic2","type":"Bearish","relevance":"why relevant 6 words"},{"tag":"#topic3","type":"Neutral","relevance":"why relevant 6 words"},{"tag":"#topic4","type":"Breaking","relevance":"why relevant 6 words"},{"tag":"#topic5","type":"Bullish","relevance":"why relevant 6 words"}],"fear_greed":52,"mood_summary":"One sentence summary max 20 words.","data_note":"Calibrated estimate — no live social data. Treat as directional indicator only."}`;
      raw = await callLLMFree(sys, freePrompt, 700);
    } else {
      raw = await callLLM(sys, prompt, 1400, 0.3);
    }
    const result = repairAndParseJSON(raw);
    result._scope = target; // store for expand prompts
    socialCache[cacheKey]   = result;
    socialCacheTs[cacheKey] = Date.now();
    loading.style.display = 'none';
    renderSocialSentiment(result);
  } catch (err) {
    loading.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = 'Failed to load: ' + err.message;
  }
}

export function renderSocialSentiment(d) {
  const content = document.getElementById('social-content');
  const ov = d.overall || {};
  const bull = ov.bull_pct ?? 40, neut = ov.neut_pct ?? 30, bear = ov.bear_pct ?? 30;
  const fg = d.fear_greed ?? 50;
  const fgColor = fg >= 60 ? 'var(--bull)' : fg <= 40 ? 'var(--bear)' : 'var(--neut)';
  const fgLabel = fg >= 75 ? 'Extreme Greed' : fg >= 55 ? 'Greed' : fg >= 45 ? 'Neutral' : fg >= 25 ? 'Fear' : 'Extreme Fear';

  const platformsHtml = (d.platforms || []).map(p => {
    const fillColor = p.top_sentiment === 'Bullish' ? 'var(--bull)' : p.top_sentiment === 'Bearish' ? 'var(--bear)' : 'var(--neut)';
    return `<div class="soc-platform">
      <div class="soc-plat-name">${p.name || '—'}</div>
      <div class="soc-plat-bar"><div class="soc-plat-fill" style="width:${p.bull_pct ?? 50}%;background:${fillColor};"></div></div>
      <div class="soc-plat-pct" style="color:${fillColor};">${p.top_sentiment || '—'}</div>
    </div>`;
  }).join('');

  const trendingHtml = (d.trending || []).map((t, i) => {
    const sentCls = t.sentiment === 'Bullish' ? 'soc-sent-bull' : t.sentiment === 'Bearish' ? 'soc-sent-bear' : 'soc-sent-neut';
    const sentIcon = t.sentiment === 'Bullish' ? '▲' : t.sentiment === 'Bearish' ? '▼' : '◆';
    const safeId = `soc-tr-${i}`;
    const driverOrMentions = t.driver || t.mentions || '—';
    return `<div class="soc-trend-item" style="flex-wrap:wrap;">
      <div class="soc-trend-rank">${i + 1}</div>
      <div class="soc-trend-ticker">${t.ticker || '—'}</div>
      <div class="soc-trend-name">${t.name || '—'}</div>
      <div class="soc-trend-sent ${sentCls}">${sentIcon}</div>
      <div class="soc-trend-vol" style="font-size:9px;color:var(--text2);">${driverOrMentions}</div>
      <button class="expand-btn" style="margin-top:4px;width:100%;" data-soc-tr="${i}" data-ticker="${t.ticker || ''}" data-name="${t.name || ''}">▸ DETAILS</button>
      <div class="expand-body" id="${safeId}" style="width:100%;"></div>
    </div>`;
  }).join('');

  const topicsHtml = (d.topics || []).map((t, i) => {
    const typeCls = { Bullish:'soc-type-bull', Bearish:'soc-type-bear', Neutral:'soc-type-neut', Breaking:'soc-type-break' }[t.type] || 'soc-type-neut';
    const safeId = `soc-tp-${i}`;
    const volOrRelevance = t.relevance || t.volume || '—';
    return `<div class="soc-topic" style="flex-wrap:wrap;">
      <div class="soc-topic-tag">${t.tag || '—'}</div>
      <div class="soc-topic-type ${typeCls}">${t.type || '—'}</div>
      <div class="soc-topic-vol">${volOrRelevance}</div>
      <button class="expand-btn" style="margin-top:4px;width:100%;" data-soc-tp="${i}" data-tag="${t.tag || ''}" data-type="${t.type || ''}">▸ DETAILS</button>
      <div class="expand-body" id="${safeId}" style="width:100%;"></div>
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="soc-section">
      <div class="soc-slabel">OVERALL SENTIMENT · ${ov.volume || '—'} · ${ov.trend || '—'}</div>
      <div class="soc-overview">
        <div class="soc-ov-stat"><div class="soc-ov-val soc-ov-bull">${bull}%</div><div class="soc-ov-lbl">BULLISH</div></div>
        <div class="soc-ov-stat"><div class="soc-ov-val soc-ov-neut">${neut}%</div><div class="soc-ov-lbl">NEUTRAL</div></div>
        <div class="soc-ov-stat"><div class="soc-ov-val soc-ov-bear">${bear}%</div><div class="soc-ov-lbl">BEARISH</div></div>
      </div>
      <div class="soc-bar-wrap">
        <div class="soc-seg-bull" style="flex:${bull};"></div>
        <div class="soc-seg-neut" style="flex:${neut};"></div>
        <div class="soc-seg-bear" style="flex:${bear};"></div>
      </div>
      <div class="soc-bar-lbl"><span>▲ ${bull}% Bull</span><span>◆ ${neut}% Neutral</span><span>▼ ${bear}% Bear</span></div>
    </div>
    <div class="soc-section">
      <div class="soc-slabel">FEAR &amp; GREED INDEX</div>
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--card);border:1px solid var(--border);border-radius:4px;">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:${fgColor};">${fg}</div>
        <div>
          <div style="font-family:var(--font-mono);font-size:12px;color:${fgColor};font-weight:700;">${fgLabel.toUpperCase()}</div>
          <div style="font-family:var(--font-display);font-size:11px;color:var(--text2);margin-top:2px;">${d.mood_summary || '—'}</div>
        </div>
      </div>
    </div>
    <div class="soc-section">
      <div class="soc-slabel">PLATFORM BREAKDOWN</div>
      ${platformsHtml}
    </div>
    <div class="soc-section">
      <div class="soc-slabel">TRENDING TICKERS</div>
      <div class="soc-trending">${trendingHtml}</div>
    </div>
    <div class="soc-section">
      <div class="soc-slabel">HOT TOPICS &amp; HASHTAGS</div>
      ${topicsHtml}
    </div>
    <div style="padding:8px 12px 4px;font-family:var(--font-mono);font-size:8px;color:var(--text3);border-top:1px solid var(--border);line-height:1.5;">
      ⚠ AI-ESTIMATED · ${d.data_note || 'Based on AI training data — not live social data.'} Verify before trading.
    </div>
  `;

  // Wire trending ticker expand buttons
  const socScope = (d._scope || 'global financial markets');
  content.querySelectorAll('.expand-btn[data-soc-tr]').forEach(btn => {
    const i = +btn.dataset.socTr;
    const ticker = btn.dataset.ticker;
    const name = btn.dataset.name;
    const bodyEl = document.getElementById(`soc-tr-${i}`);
    btn.addEventListener('click', () => {
      const cKey = `soc-tr|${ticker}|${socScope}`;
      const prompt = `You are a market microstructure and sentiment analyst. Analyse the investor sentiment landscape for ${name} (${ticker}) in the context of ${socScope}. Cover 4 points: (1) SOCIAL NARRATIVE: dominant retail thesis and why this name is trending now — specific reason (earnings, short squeeze, macro catalyst); (2) SMART MONEY VS RETAIL: institutional vs retail positioning, crowding risk, short interest, unusual options flow; (3) FUNDAMENTAL ALIGNMENT: is sentiment supported or contradicted by fundamentals? Name the key metric or event that validates or invalidates the narrative; (4) TACTICAL IMPLICATION: momentum trade, fade, or washout risk? Include a specific level or catalyst. Direct, professional, specific. Max 200 words.`;
      toggleExpand(btn, bodyEl, cKey, prompt);
    });
  });

  // Wire hot topic expand buttons
  content.querySelectorAll('.expand-btn[data-soc-tp]').forEach(btn => {
    const i = +btn.dataset.socTp;
    const tag = btn.dataset.tag;
    const type = btn.dataset.type;
    const bodyEl = document.getElementById(`soc-tp-${i}`);
    btn.addEventListener('click', () => {
      const cKey = `soc-tp|${tag}|${socScope}`;
      const prompt = `You are a macro strategist at a global macro fund. Analyse the investment significance of the trending topic "${tag}" (community sentiment: ${type}) in the context of ${socScope}. Cover 4 points: (1) CURRENT DRIVER: precise catalyst making this topic prominent — specific events, data prints, or policy decisions, not generic factors; (2) ASSET IMPACT MAP: 3 specific instruments most affected — direction (long/short/spread) and approximate move magnitude; (3) POSITIONING LANDSCAPE: is this already priced or under-appreciated? Where is the positioning asymmetry? (4) WHAT TO WATCH: one specific data release, event, or price level in next 2-4 weeks that confirms or dismisses this theme. Precise and actionable. Max 200 words.`;
      toggleExpand(btn, bodyEl, cKey, prompt);
    });
  });
}

// Window bridges
window.toggleSocialPanel = toggleSocialPanel;
window.closeSocialPanel = closeSocialPanel;
window.loadSocialSentiment = loadSocialSentiment;
window.setSocialScope = wireSocialScope;
