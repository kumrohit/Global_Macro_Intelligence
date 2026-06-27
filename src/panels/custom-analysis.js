// custom-analysis.js — Custom Analysis Builder
import * as d3 from 'd3';
import { callLLM, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import {
  cache, activeId,
  caOpen, setCaOpen,
  customTags, caRunning,
  apiKey,
} from '../core/state.js';
import { CA_SUGGESTIONS } from '../core/constants.js';
import { loadSession } from '../auth/auth.js';
import { requireAuth } from '../auth/auth.js';

// caRunning is a live binding — we need local tracking since we can't reassign it
let _caRunning = false;

export function openCustomAnalysis() {
  requireAuth(() => {
    setCaOpen(true);
    document.getElementById('ca-overlay').classList.add('open');
    document.getElementById('ca-topbar-btn')?.classList.add('nav-active');
  }, 'Sign in to use Custom Analysis');
}

export function closeCustomAnalysis() {
  setCaOpen(false);
  document.getElementById('ca-overlay').classList.remove('open');
  document.getElementById('ca-topbar-btn')?.classList.remove('nav-active');
}

export function renderCaTags() {
  const box = document.getElementById('ca-tags-box');
  const runBtn = document.getElementById('ca-run-btn');
  if (!box) return;

  box.innerHTML = customTags.map(tag => `
    <span class="ca-tag">
      ${tag}
      <button class="ca-tag-remove" data-tag="${tag.replace(/"/g,'&quot;')}">✕</button>
    </span>`).join('');

  box.querySelectorAll('.ca-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => removeCustomTag(btn.dataset.tag));
  });

  if (runBtn) runBtn.disabled = customTags.length === 0 || _caRunning;
}

export function addCustomTag(tag) {
  tag = tag.trim();
  if (!tag || customTags.includes(tag) || customTags.length >= 10) return;
  customTags.push(tag);
  renderCaTags();
  const input = document.getElementById('ca-tag-input');
  if (input) input.value = '';
}

export function removeCustomTag(tag) {
  // Mutate in place — live binding can't be reassigned
  const kept = customTags.filter(t => t !== tag);
  customTags.splice(0, customTags.length, ...kept);
  renderCaTags();
}

export async function runCustomAnalysis() {
  if (!customTags.length || _caRunning) return;
  if (!apiKey) { requireApiKey(() => runCustomAnalysis(), 'Custom Analysis'); return; }

  _caRunning = true;
  const runBtn = document.getElementById('ca-run-btn');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⟳ RUNNING…'; }

  const placeholder = document.getElementById('ca-placeholder');
  const result = document.getElementById('ca-result');
  if (placeholder) placeholder.style.display = 'none';
  if (result) {
    result.style.display = 'block';
    result.innerHTML = '<div style="text-align:center;padding:60px 20px;"><div class="big-spin"></div><div class="sl-text" style="margin-top:12px;">Running custom analysis…</div><div class="sl-sub">Synthesising data for: ' + customTags.join(', ') + '</div></div>';
  }

  const tagsStr = customTags.join(', ');
  const prompt = `You are a senior macro strategist writing an institutional research memo for a global macro fund's investment committee. Produce a rigorous, cross-asset thematic analysis covering: ${tagsStr}. Identify macro regime context, inter-theme correlations, consensus vs contrarian view, and actionable trade ideas.

Respond with ONLY a valid JSON object. No markdown, no code fences, no trailing commas:
{
  "title": "research memo title — key theme and market implication, max 12 words",
  "macro_regime": "current macro regime (growth, inflation, CB cycle) and how it shapes themes, max 25 words",
  "executive_summary": "4 sentences: dominant theme phase, inter-theme linkage, consensus vs contrarian angle, portfolio implication",
  "overall_sentiment": "bullish|bearish|neutral",
  "overall_score": <number -1.0 to 1.0>,
  "themes": [{"name": "theme name", "sentiment": "bullish|bearish|neutral", "score": <-1.0 to 1.0>, "weight": <0-100>, "insight": "differentiated insight beyond consensus, max 25 words", "key_asset": "most affected instrument e.g. USD/JPY, Gold, 2yr UST"}],
  "key_findings": [{"icon": "▲ or ▼ or ◆", "text": "specific finding with data point or level, max 25 words"}, {3 more with same structure}],
  "opportunities": ["instrument, direction, catalyst with timeframe, max 25 words", "same for 2", "same for 3"],
  "risks": ["specific risk with quantified downside, max 25 words", "same for 2", "same for 3"],
  "trade_ideas": [{"idea": "instrument + direction + entry/exit condition, max 20 words", "direction": "Long|Short|Neutral", "conviction": "High|Medium|Low", "catalyst": "trigger, max 10 words", "risk_reward": "e.g. 1:2.5"}, {same structure for idea 2}, {same for idea 3}],
  "scenario_analysis": {"base": "base case 60% — outcome and portfolio implication, max 30 words", "bull": "upside case 20% — trigger and market move magnitude, max 25 words", "bear": "downside case 20% — tail risk and drawdown magnitude, max 25 words"},
  "outlook": "3 sentences: 3-month call, key event in next 30 days, portfolio hedge recommendation"
}`;

  try {
    const raw = await callLLM(
      'You are a senior macro strategist. Output only valid JSON, no markdown.',
      prompt, 2500, 0.3
    );
    const data = repairAndParseJSON(raw);
    renderCustomAnalysis(data, tagsStr);
  } catch(err) {
    if (result) result.innerHTML = `<div style="text-align:center;padding:40px;color:var(--bear);font-family:var(--font-display);font-size:13px;">⚠ Analysis failed: ${err.message}</div>`;
  } finally {
    _caRunning = false;
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶ ANALYSE'; }
  }
}

export function renderCustomAnalysis(d, tagsStr) {
  const result = document.getElementById('ca-result');
  if (!result) return;

  const sentClass = { bullish:'wl-badge-bull', bearish:'wl-badge-bear', neutral:'wl-badge-neut' };
  const sentLabel = { bullish:'▲ BULLISH', bearish:'▼ BEARISH', neutral:'◆ NEUTRAL' };
  const overall = d.overall_sentiment || 'neutral';
  const score = parseFloat(d.overall_score) || 0;

  // Theme bars HTML
  const themeBarsHtml = (d.themes || []).sort((a,b) => b.weight - a.weight).map(t => {
    const tScore = parseFloat(t.score) || 0;
    const barPct = Math.round(((tScore + 1) / 2) * 100);
    const col = tScore > 0.1 ? 'var(--bull)' : tScore < -0.1 ? 'var(--bear)' : 'var(--neut)';
    return `<div class="ca-theme-bar-wrap">
      <div class="ca-theme-bar-label"><span>${t.name || ''}</span><span style="color:${col};">${tScore >= 0 ? '+' : ''}${tScore.toFixed(2)}</span></div>
      <div class="ca-theme-bar-track"><div class="ca-theme-bar-fill" style="width:${barPct}%;background:${col};"></div></div>
      <div style="font-family:var(--font-display);font-size:10px;color:var(--text2);margin-top:2px;">${t.insight || ''}</div>
    </div>`;
  }).join('');

  // Findings
  const findingsHtml = (d.key_findings || []).map(f =>
    `<div class="ca-finding">
      <span class="ca-finding-icon">${f.icon || '◆'}</span>
      <span class="ca-finding-text">${f.text || ''}</span>
    </div>`).join('');

  // Opportunities
  const oppsHtml = (d.opportunities || []).map(o =>
    `<div class="ca-opp-item"><span class="ca-opp-icon">▲</span>${o}</div>`).join('');

  // Risks
  const risksHtml = (d.risks || []).map(r =>
    `<div class="ca-risk-item"><span class="ca-risk-icon">▼</span>${r}</div>`).join('');

  // Trade ideas
  const tradesHtml = (d.trade_ideas || []).map(t => {
    const dirColor = t.direction === 'Long' ? 'var(--bull)' : t.direction === 'Short' ? 'var(--bear)' : 'var(--neut)';
    const convColor = t.conviction === 'High' ? 'var(--bull)' : t.conviction === 'Low' ? 'var(--bear)' : 'var(--amber)';
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;margin-bottom:5px;background:rgba(10,18,32,0.6);border:1px solid var(--border);border-radius:3px;">
      <span style="font-family:var(--font-mono);font-size:9px;color:${dirColor};padding:2px 7px;border:1px solid ${dirColor};border-radius:2px;flex-shrink:0;">${t.direction || '—'}</span>
      <span style="font-family:var(--font-display);font-size:12px;color:var(--text);flex:1;">${t.idea || ''}</span>
      <span style="font-family:var(--font-mono);font-size:8px;color:${convColor};flex-shrink:0;">${t.conviction || ''}</span>
    </div>`;
  }).join('');

  result.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:#fff;margin-bottom:3px;">${d.title || 'Custom Analysis'}</div>
        <div style="font-family:var(--font-mono);font-size:8px;color:var(--text2);letter-spacing:0.1em;">TAGS: ${tagsStr}</div>
      </div>
      <span class="wl-item-badge ${sentClass[overall] || 'wl-badge-neut'}" style="font-size:12px;padding:5px 14px;">${sentLabel[overall] || '◆ NEUTRAL'} &nbsp;${score >= 0 ? '+' : ''}${score.toFixed(2)}</span>
    </div>

    <div class="ca-grid">
      <div class="ca-col">
        <div class="ca-card">
          <div class="ca-card-title">EXECUTIVE SUMMARY</div>
          <div class="ca-summary-text">${d.executive_summary || '—'}</div>
        </div>
        <div class="ca-card">
          <div class="ca-card-title">SENTIMENT GAUGE</div>
          <div id="ca-gauge-wrap"><svg id="ca-gauge-svg"></svg></div>
          <div style="text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--text2);margin-top:4px;">Overall Score: <span style="color:${score>0.1?'var(--bull)':score<-0.1?'var(--bear)':'var(--neut)'};">${score >= 0 ? '+' : ''}${score.toFixed(2)}</span></div>
        </div>
        <div class="ca-card">
          <div class="ca-card-title">TRADE IDEAS</div>
          ${tradesHtml || '<div style="color:var(--text2);font-size:12px;">No trade ideas generated.</div>'}
        </div>
      </div>
      <div class="ca-col">
        <div class="ca-card">
          <div class="ca-card-title">THEME SENTIMENT BREAKDOWN</div>
          ${themeBarsHtml || '<div style="color:var(--text2);font-size:12px;">No theme data.</div>'}
        </div>
        <div class="ca-card">
          <div class="ca-card-title">KEY FINDINGS</div>
          ${findingsHtml || '<div style="color:var(--text2);font-size:12px;">No findings.</div>'}
        </div>
        <div class="ca-card">
          <div class="ca-card-title">OPPORTUNITIES</div>
          ${oppsHtml || '<div style="color:var(--text2);font-size:12px;">—</div>'}
          <div class="ca-card-title" style="margin-top:12px;">RISKS</div>
          ${risksHtml || '<div style="color:var(--text2);font-size:12px;">—</div>'}
        </div>
      </div>
    </div>
    <div class="ca-card" style="margin-top:14px;">
      <div class="ca-card-title">12-MONTH OUTLOOK</div>
      <div class="ca-summary-text">${d.outlook || '—'}</div>
    </div>`;

  // Draw sentiment gauge
  requestAnimationFrame(() => drawCaGauge(score));
}

export function drawCaGauge(score) {
  const svgEl = document.getElementById('ca-gauge-svg');
  if (!svgEl) return;

  const W = 220, H = 120;
  const cx = W / 2, cy = H * 0.82;
  const R = 78, r = 52;

  const svg = d3.select(svgEl).attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
  svg.selectAll('*').remove();

  // Colour gradient arc segments
  const segments = [
    { from: Math.PI, to: Math.PI * 1.25, color: '#7F1D1D' },
    { from: Math.PI * 1.25, to: Math.PI * 1.5, color: '#EF4444' },
    { from: Math.PI * 1.5, to: Math.PI * 1.75, color: '#F59E0B' },
    { from: Math.PI * 1.75, to: Math.PI * 2,   color: '#10B981' },
  ];

  const arc = d3.arc().innerRadius(r).outerRadius(R);
  segments.forEach(seg => {
    svg.append('path')
      .attr('d', arc({ startAngle: seg.from, endAngle: seg.to }))
      .attr('fill', seg.color).attr('opacity', 0.85)
      .attr('transform', `translate(${cx},${cy})`);
  });

  // Needle: score -1 → angle π, score 0 → 1.5π, score +1 → 2π
  const angle = Math.PI + ((score + 1) / 2) * Math.PI;
  const needleLen = R - 4;
  const nx = cx + Math.cos(angle) * needleLen;
  const ny = cy + Math.sin(angle) * needleLen;
  svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', nx).attr('y2', ny)
    .attr('stroke', '#fff').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5)
    .attr('fill', '#fff').attr('stroke', '#0A1220').attr('stroke-width', 1.5);

  // Labels
  const labels = [['BEAR', Math.PI, -1], ['NEUTRAL', Math.PI * 1.5, 0], ['BULL', Math.PI * 2, 1]];
  labels.forEach(([txt, ang]) => {
    svg.append('text')
      .attr('x', cx + Math.cos(ang) * (R + 12))
      .attr('y', cy + Math.sin(ang) * (R + 12) + 3)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono,monospace')
      .attr('font-size', 8)
      .attr('fill', 'rgba(100,116,139,0.8)')
      .text(txt);
  });
}

// Window bridges
window.openCustomAnalysis = openCustomAnalysis;
window.closeCustomAnalysis = closeCustomAnalysis;
window.addCustomTag = addCustomTag;
window.removeCustomTag = removeCustomTag;
window.runCustomAnalysis = runCustomAnalysis;
