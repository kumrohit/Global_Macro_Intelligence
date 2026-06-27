// src/panels/commodities.js — Commodity Heatmap panel
import * as d3 from 'd3';
import { COMMOD_DEFS, COMMOD_LLM_ONLY, CACHE_TTL, YF_TICKER } from '../core/constants.js';
import { commodOpen, setCommodOpen, apiKey } from '../core/state.js';
import { fetchYFOHLC } from '../api/market-data.js';
import { callLLM, requireApiKey, detectProvider } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { loadSession } from '../auth/auth.js';
import { openChartFs } from '../utils/chart.js';

// Module-level state
let _commodTab           = 'all';
let _commodSort          = 'pct';
let _commodData          = [];
let _commodLoading       = false;
let _commodDetailSym     = null;
let _commodDetailLoading = false;
let _commodDetailCache   = {};

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

export function openCommodities() {
  if (!loadSession()?.username) { window.requireAuth?.(() => openCommodities(), 'Sign in to view Commodity Markets'); return; }
  if (!apiKey) { requireApiKey(() => openCommodities(), 'Commodity Markets'); return; }
  setCommodOpen(true);
  document.getElementById('commod-overlay').classList.add('open');
  document.getElementById('commod-topbar-btn')?.classList.add('nav-active');
  if (!_commodData.length && !_commodLoading) loadCommodityHeat();
}

export function closeCommodities() {
  setCommodOpen(false);
  document.getElementById('commod-overlay').classList.remove('open');
  document.getElementById('commod-topbar-btn')?.classList.remove('nav-active');
}

export function commodPctColor(pct) {
  if (pct >  3.0) return {bg:'#064e3b', text:'#6ee7b7'};
  if (pct >  1.5) return {bg:'#065f46', text:'#34d399'};
  if (pct >  0.3) return {bg:'#047857', text:'#6ee7b7'};
  if (pct > -0.3) return {bg:'#1e2a3a', text:'#94a3b8'};
  if (pct > -1.5) return {bg:'#7f1d1d', text:'#fca5a5'};
  if (pct > -3.0) return {bg:'#991b1b', text:'#fca5a5'};
  return              {bg:'#450a0a', text:'#f87171'};
}

export async function loadCommodityHeat() {
  if (_commodLoading) return;
  _commodLoading = true;
  const grid = document.getElementById('commod-grid');
  if (grid) grid.innerHTML = '<div class="commod-loading">⟳ Loading commodity data…</div>';

  const withYF = COMMOD_DEFS.filter(d => YF_TICKER[d.symbol] && !COMMOD_LLM_ONLY.has(d.symbol));
  const noYF   = COMMOD_DEFS.filter(d => !YF_TICKER[d.symbol] ||  COMMOD_LLM_ONLY.has(d.symbol));

  const yfSettled = await Promise.allSettled(
    withYF.map(def => {
      const yfSym = YF_TICKER[def.symbol];
      return fetchYFOHLC(yfSym, '5d', '1d').then(bars => {
        if (!bars || bars.length < 2) return { def, q: null };
        const last = bars[bars.length - 1], prev = bars[bars.length - 2];
        const price = last.close, prevClose = prev.close;
        if (!price || !prevClose) return { def, q: null };
        const pct = ((price - prevClose) / prevClose) * 100;
        return { def, q: { price, pct } };
      });
    })
  );

  const realData = {};
  let yfHits = 0;
  yfSettled.forEach(res => {
    if (res.status === 'fulfilled' && res.value?.q) {
      const { def, q } = res.value;
      realData[def.symbol] = {
        ...def, price: q.price, pct: q.pct, _src: 'yf',
        trend: q.pct > 0.2 ? 'bullish' : q.pct < -0.2 ? 'bearish' : 'neutral',
      };
      yfHits++;
    }
  });

  const needsLLM = [
    ...noYF,
    ...withYF.filter(d => !realData[d.symbol]),
  ];
  let llmData = {};
  if (needsLLM.length > 0) {
    try {
      const _ct = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      const syms = needsLLM.map(d => `${d.symbol}:${d.name}(${d.unit})`).join(', ');
      const sys = 'You are a commodity market data provider. Output only valid JSON. No markdown, no code fences.';
      const usr = `Today is ${_ct}. Provide realistic current market price estimates ONLY for these ${needsLLM.length} commodities: ${syms}. JSON: {"data":[{"symbol":"COAL","price":0,"pct":0,"trend":"neutral"},...]}. Use latest available prices.`;
      const raw = await callLLM(sys, usr, 400, 0);
      const parsed = repairAndParseJSON(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed && Object.values(parsed).find(v => Array.isArray(v)));
      if (arr) arr.forEach(row => {
        const def = needsLLM.find(d => d.symbol === row.symbol);
        if (def && row.price) llmData[def.symbol] = { ...def, price: +row.price, pct: +row.pct || 0, trend: row.trend || 'neutral', _src: 'ai' };
      });
    } catch(_) {}
  }

  _commodData = COMMOD_DEFS.map(def => realData[def.symbol] || llmData[def.symbol] || { ...def, price: 0, pct: 0, trend: 'neutral', _src: 'na' });

  const srcLabel = yfHits >= 15 ? '📡 YF' : yfHits > 0 ? '📡 YF (partial)' : '⚠ AI';
  const dateStr  = new Date().toISOString().slice(0, 10);
  const badge    = document.getElementById('commod-data-badge');
  if (badge) badge.textContent = `${srcLabel} · ${dateStr}`;

  renderCommodityHeat();
  _commodLoading = false;
}

export function renderCommodityHeat() {
  const grid = document.getElementById('commod-grid');
  if (!grid) return;
  let data = _commodData.slice();
  if (_commodTab !== 'all') data = data.filter(d => d.sector === _commodTab);
  if (_commodSort === 'pct')  data.sort((a,b) => b.pct - a.pct);
  else                        data.sort((a,b) => a.name.localeCompare(b.name));
  if (!data.length) { grid.innerHTML = '<div class="commod-empty">No commodities in this category.</div>'; return; }
  grid.innerHTML = data.map(d => {
    const c    = commodPctColor(d.pct);
    const sign = d.pct >= 0 ? '+' : '';
    const pStr = (isFinite(d.price) && d.price > 0)
      ? d.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
    const sel  = _commodDetailSym === d.symbol ? ' selected' : '';
    return `<div class="commod-tile${sel}" data-sym="${d.symbol}" style="background:${c.bg}"
      onclick="openCommodityDetail('${d.symbol}')">
      <div class="commod-tile-sym">${d.symbol}</div>
      <div class="commod-tile-name">${d.name}</div>
      <div class="commod-tile-price">${pStr}</div>
      <div class="commod-tile-pct" style="color:${c.text}">${sign}${d.pct.toFixed(2)}%</div>
    </div>`;
  }).join('');
}

export async function openCommodityDetail(symbol) {
  _commodDetailSym = symbol;
  document.querySelectorAll('.commod-tile').forEach(t => t.classList.toggle('selected', t.dataset.sym === symbol));
  const wrap = document.getElementById('commod-detail-wrap');
  const det  = document.getElementById('commod-detail');
  if (!wrap || !det) return;
  wrap.style.display = 'flex';
  if (_commodDetailCache[symbol]) { renderCommodityDetail(_commodDetailCache[symbol]); return; }
  if (_commodDetailLoading) return;
  const base = _commodData.find(d => d.symbol === symbol) || COMMOD_DEFS.find(d => d.symbol === symbol) || {};
  det.innerHTML = `<div class="commod-det-loading"><span style="color:var(--amber);">⬡</span> Analysing ${escHtml(base.name || symbol)}…</div>`;

  _commodDetailLoading = true;
  const sys = 'You are a commodity market analyst. Output ONLY a valid JSON object. No markdown, no code fences, no prose before or after. Start your response with { and end with }.';
  const usr = `You are a senior commodity analyst at a macro hedge fund. Provide rigorous, trader-grade analysis for ${base.name || symbol} (${base.unit || ''}).
Current price: ~${base.price || 'unknown'} ${base.unit || ''}, today's change: ${(base.pct||0)>=0?'+':''}${(base.pct||0).toFixed(2)}%.

Return ONLY this JSON object — no extra text, start with { end with }:
{"overview":"2 sentences — market state with supply/demand balance, inventory levels, or OPEC+/producer action","supply_demand":"current fundamental balance — surplus/deficit with approximate magnitude","macro_drivers":["specific driver 1 with direction and magnitude","specific driver 2","specific driver 3 — include USD correlation or geopolitical risk premium"],"positioning":"speculative positioning — net long/short vs historical, squeeze or washout risk","technical_levels":{"support":"price level and why it matters","resistance":"price level and why it matters","key_level":"critical structural level — break changes the trade","structure":"Uptrend|Downtrend|Range-bound"},"seasonal":"seasonal pattern for current quarter","outlook":"2 sentences — 1-3 month directional view with price target range and key catalyst","risks":["specific upside risk with price impact","specific downside risk with price impact"],"trade_idea":{"direction":"LONG|SHORT|NEUTRAL","entry":"specific price level or condition","target":"specific price target","stop":"stop level and reasoning","risk_reward":"e.g. 1:2.3","conviction":70,"timeframe":"e.g. 2-4 weeks"},"chart_data":[{"month":"May-24","price":0},{"month":"Jun-24","price":0},{"month":"Jul-24","price":0},{"month":"Aug-24","price":0},{"month":"Sep-24","price":0},{"month":"Oct-24","price":0},{"month":"Nov-24","price":0},{"month":"Dec-24","price":0},{"month":"Jan-25","price":0},{"month":"Feb-25","price":0},{"month":"Mar-25","price":0},{"month":"Apr-25","price":0}]}
Fill chart_data with realistic historical prices. direction must be LONG, SHORT, or NEUTRAL.`;
  try {
    const raw  = await callLLM(sys, usr, 1000, 0.2);
    const data = repairAndParseJSON(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Parse failed — try again');
    const full = { ...data, symbol, name: base.name, price: base.price, pct: base.pct, unit: base.unit };
    _commodDetailCache[symbol] = full;
    if (_commodDetailSym === symbol) renderCommodityDetail(full);
  } catch(e) {
    if (_commodDetailSym === symbol)
      det.innerHTML = `<div class="commod-det-loading">⚠ ${escHtml(e.message)}<br><button class="commod-retry-btn" onclick="_commodDetailCache?.delete?.('${symbol}');openCommodityDetail('${symbol}')">RETRY</button></div>`;
  } finally { _commodDetailLoading = false; }
}

function renderCommodityDetail(data) {
  const det = document.getElementById('commod-detail');
  if (!det) return;
  const def       = COMMOD_DEFS.find(d => d.symbol === data.symbol) || {};
  const sectorMap = {energy:'⚡ ENERGY', metals:'◈ METALS', agriculture:'🌾 AGRI', softs:'⬥ SOFTS'};
  const secLabel  = sectorMap[def.sector] || '';
  const up        = (data.pct || 0) >= 0;
  const pStr      = (isFinite(data.price) && data.price > 0)
    ? data.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
  const drivers   = (data.macro_drivers || []).map(d => `<span class="commod-driver-chip">${escHtml(d)}</span>`).join('');
  const risks     = (data.risks || []).map(r => `<div class="commod-risk-item">⚠ ${escHtml(r)}</div>`).join('');
  const ti        = data.trade_idea || {};
  const tiDir     = ti.direction || 'NEUTRAL';
  const tiCls     = tiDir === 'LONG' ? 'bull' : tiDir === 'SHORT' ? 'bear' : 'neutral';
  const tiBg      = tiDir === 'LONG' ? 'var(--bull)' : tiDir === 'SHORT' ? 'var(--bear)' : 'var(--amber)';
  const conv      = Math.min(100, Math.max(0, +(ti.conviction) || 50));
  const tl        = data.technical_levels || {};
  det.innerHTML = `
    <div class="commod-det-header">
      <div>
        <div class="commod-det-sym">${escHtml(data.symbol)}</div>
        <div class="commod-det-name">${escHtml(data.name || '')}</div>
        <span class="commod-det-sector">${secLabel}</span>
      </div>
      <button class="commod-det-close" onclick="closeCommodityDetail()">✕</button>
    </div>
    <div class="commod-det-price-row">
      <span class="commod-det-price">${pStr}</span>
      <span class="commod-det-unit">${escHtml(data.unit || '')}</span>
      <span class="commod-det-pct ${up ? 'bull' : 'bear'}">${up ? '+' : ''}${(data.pct||0).toFixed(2)}%</span>
    </div>
    <div class="commod-det-chart" id="commod-chart-wrap"></div>
    <div style="text-align:right;margin:-4px 0 6px;">
      <button class="chart-expand-btn" id="commod-expand-btn" title="Expand chart fullscreen">⊞ FULLSCREEN</button>
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">OVERVIEW</div>
      <div class="commod-det-text">${escHtml(data.overview || '')}</div>
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">MACRO DRIVERS</div>
      <div style="margin-top:2px">${drivers}</div>
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">TECHNICAL LEVELS</div>
      <div class="commod-tech-grid">
        <div class="commod-tech-item"><div class="commod-tech-lbl">SUPPORT</div><div class="commod-tech-val">${escHtml(String(tl.support||'—'))}</div></div>
        <div class="commod-tech-item"><div class="commod-tech-lbl">RESISTANCE</div><div class="commod-tech-val">${escHtml(String(tl.resistance||'—'))}</div></div>
        <div class="commod-tech-item" style="grid-column:1/-1"><div class="commod-tech-lbl">KEY LEVEL</div><div class="commod-tech-val" style="color:var(--text2);font-size:9px;">${escHtml(String(tl.key_level||'—'))}</div></div>
      </div>
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">OUTLOOK</div>
      <div class="commod-det-text">${escHtml(data.outlook || '')}</div>
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">KEY RISKS</div>
      ${risks}
    </div>
    <div class="commod-det-section">
      <div class="commod-det-label">TRADE IDEA</div>
      <div class="commod-trade-card">
        <div class="commod-trade-dir ${tiCls}">${tiDir}</div>
        <div class="commod-trade-grid">
          <div class="commod-trade-item"><div class="commod-tech-lbl">ENTRY</div><div class="commod-tech-val">${escHtml(String(ti.entry||'—'))}</div></div>
          <div class="commod-trade-item"><div class="commod-tech-lbl">TARGET</div><div class="commod-tech-val">${escHtml(String(ti.target||'—'))}</div></div>
          <div class="commod-trade-item"><div class="commod-tech-lbl">STOP</div><div class="commod-tech-val">${escHtml(String(ti.stop||'—'))}</div></div>
        </div>
        <div class="commod-tech-lbl">CONVICTION</div>
        <div class="commod-conv-bar"><div class="commod-conv-fill" style="width:${conv}%;background:${tiBg}"></div></div>
        <div style="font-size:10px;color:var(--amber);font-weight:700;margin-top:4px;">${conv}%</div>
      </div>
    </div>`;
  requestAnimationFrame(() => drawCommodityChart(data.chart_data || [], up ? '#10B981' : '#EF4444'));

  const _yfSymCommod = YF_TICKER[data.symbol];
  if (_yfSymCommod) {
    if (!(_commodDetailCache[data.symbol]?.ohlcvWeekly)) {
      fetchYFOHLC(_yfSymCommod, '5y', '1wk').then(ohlcv => {
        _commodDetailCache[data.symbol] = _commodDetailCache[data.symbol] || {};
        _commodDetailCache[data.symbol].ohlcv       = ohlcv;
        _commodDetailCache[data.symbol].ohlcvWeekly = ohlcv;
      }).catch(() => {});
    }
    if (!(_commodDetailCache[data.symbol]?.ohlcvDaily)) {
      fetchYFOHLC(_yfSymCommod, '1y', '1d').then(ohlcv => {
        _commodDetailCache[data.symbol] = _commodDetailCache[data.symbol] || {};
        _commodDetailCache[data.symbol].ohlcvDaily = ohlcv;
      }).catch(() => {});
    }
  }

  document.getElementById('commod-expand-btn')?.addEventListener('click', () => {
    const cached     = _commodDetailCache[data.symbol] || data;
    const rawChart   = cached.chart_data || [];
    const fsVals     = rawChart.map(d => +d.price).filter(v => isFinite(v) && v > 0);
    const fsLabs     = rawChart.map(d => d.month || '');
    const ohlcvW     = cached.ohlcvWeekly || cached.ohlcv || null;
    const ohlcvD     = cached.ohlcvDaily  || null;
    const isLive     = (ohlcvW?.length >= 4) || (ohlcvD?.length >= 4);
    openChartFs('commodity', {
      vals: fsVals,
      labs: fsLabs,
      color: up ? '#10B981' : '#EF4444',
      unit: data.unit || '',
      name: data.name || data.symbol,
      title: (data.symbol || '') + ' — ' + (data.name || ''),
      sub: (data.unit || '') + ' · ' + (up ? '+' : '') + (data.pct || 0).toFixed(2) + '%'
        + (isLive ? '  ⬤ LIVE' : '  ⚠ AI ESTIMATE'),
      support:    cached.technical_levels?.support,
      resistance: cached.technical_levels?.resistance,
      trend:      cached.technicals?.trend || cached.trend,
      tradeIdea:  cached.trade_idea,
      ohlcv:      ohlcvW,
      ohlcvDaily: ohlcvD,
    });
  });
}

function drawCommodityChart(chartData, color) {
  const wrap = document.getElementById('commod-chart-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const vals = (chartData || []).map(d => +d.price).filter(v => isFinite(v) && v > 0);
  const labs = (chartData || []).map(d => d.month || '');
  if (vals.length < 2) { wrap.innerHTML = '<div style="padding:20px;text-align:center;font-family:var(--font-mono);font-size:9px;color:var(--text3);">Chart data unavailable</div>'; return; }
  const W = Math.max(wrap.clientWidth || 280, 220), H = 110;
  const svg = d3.select(wrap).append('svg').attr('width','100%').attr('height', H)
    .attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio','none');
  const mn = d3.min(vals), mx = d3.max(vals);
  const pad = {t:10, r:10, b:24, l:46};
  const xS = d3.scaleLinear().domain([0, vals.length-1]).range([pad.l, W-pad.r]);
  const yS = d3.scaleLinear().domain([mn * 0.996, mx * 1.004]).range([H-pad.b, pad.t]);
  const area = d3.area().x((_,i) => xS(i)).y0(H-pad.b).y1(v => yS(v)).curve(d3.curveCatmullRom.alpha(0.5));
  const line = d3.line().x((_,i) => xS(i)).y(v => yS(v)).curve(d3.curveCatmullRom.alpha(0.5));
  svg.append('path').datum(vals).attr('d', area).attr('fill', color).attr('opacity', 0.12);
  svg.append('path').datum(vals).attr('d', line).attr('fill','none').attr('stroke', color).attr('stroke-width',2).attr('stroke-linejoin','round');
  yS.ticks(3).forEach(v => {
    svg.append('line').attr('x1',pad.l).attr('x2',W-pad.r).attr('y1',yS(v)).attr('y2',yS(v))
      .attr('stroke','rgba(255,255,255,0.06)').attr('stroke-width',1);
    svg.append('text').attr('x',pad.l-4).attr('y',yS(v)+4).attr('text-anchor','end')
      .attr('font-size',8).attr('fill','#64748b').text(v.toLocaleString());
  });
  labs.forEach((l,i) => {
    if (i % 3 !== 0 && i !== labs.length-1) return;
    svg.append('text').attr('x',xS(i)).attr('y',H-4).attr('text-anchor','middle')
      .attr('font-size',8).attr('fill','#64748b').text(l);
  });
  const lastX = xS(vals.length-1), lastY = yS(vals[vals.length-1]);
  svg.append('circle').attr('cx',lastX).attr('cy',lastY).attr('r',3.5)
    .attr('fill',color).attr('stroke','#0A1220').attr('stroke-width',1.5);
}

export function closeCommodityDetail() {
  _commodDetailSym = null;
  document.querySelectorAll('.commod-tile').forEach(t => t.classList.remove('selected'));
  const wrap = document.getElementById('commod-detail-wrap');
  if (wrap) wrap.style.display = 'none';
}

export function switchCommodTab(tab) {
  _commodTab = tab;
  document.querySelectorAll('.commod-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderCommodityHeat();
}

export function wireCommodEvents() {
  const closeBtn = document.getElementById('commod-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeCommodities);
  const topBtn = document.getElementById('commod-topbar-btn');
  if (topBtn) topBtn.addEventListener('click', openCommodities);
  document.querySelectorAll('.commod-tab').forEach(t => {
    t.addEventListener('click', () => switchCommodTab(t.dataset.tab));
  });
  document.querySelectorAll('.commod-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _commodSort = btn.dataset.sort;
      document.querySelectorAll('.commod-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === _commodSort));
      renderCommodityHeat();
    });
  });
  const refreshBtn = document.getElementById('commod-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => { _commodData = []; _commodDetailCache = {}; loadCommodityHeat(); });
  document.getElementById('commod-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('commod-overlay')) closeCommodities();
  });
}

window.openCommodities = openCommodities;
window.closeCommodities = closeCommodities;
window.wireCommodEvents = wireCommodEvents;
window.openCommodityDetail = openCommodityDetail;
window.closeCommodityDetail = closeCommodityDetail;
window.switchCommodTab = switchCommodTab;
