// src/panels/fx.js — FX Heatmap panel
import * as d3 from 'd3';
import { FX_DEFS, FX_INVERT, CACHE_TTL, YF_TICKER } from '../core/constants.js';
import { fxOpen, setFxOpen, apiKey } from '../core/state.js';
import { fetchYFOHLC } from '../api/market-data.js';
import { callLLM, detectProvider, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { loadSession } from '../auth/auth.js';
import { openChartFs } from '../utils/chart.js';

// Module-level state (managed locally)
let _fxTab          = 'all';
let _fxData         = [];
let _fxLoading      = false;
let _fxDetailSym    = null;
let _fxDetailLoading= false;
let _fxDetailCache  = {};

// escHtml helper (local)
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

export function fxPctColor(pct) {
  if (pct >  2.0) return {bg:'#052e16', text:'#6ee7b7'};
  if (pct >  0.8) return {bg:'#0a3a20', text:'#34d399'};
  if (pct >  0.1) return {bg:'#0f4a30', text:'#6ee7b7'};
  if (pct > -0.1) return {bg:'#0c1020', text:'#94a3b8'};
  if (pct > -0.8) return {bg:'#2e0a0a', text:'#fca5a5'};
  if (pct > -2.0) return {bg:'#3d1010', text:'#fca5a5'};
  return              {bg:'#4a0a0a', text:'#f87171'};
}

export function openFx() {
  if (!loadSession()?.username) { window.requireAuth?.(() => openFx(), 'Sign in to view FX Markets'); return; }
  if (!apiKey) { requireApiKey(() => openFx(), 'FX Markets'); return; }
  setFxOpen(true);
  document.getElementById('fx-overlay').classList.add('open');
  document.getElementById('fx-topbar-btn')?.classList.add('nav-active');
  if (!_fxData.length && !_fxLoading) loadFxHeat();
}

export function closeFx() {
  setFxOpen(false);
  document.getElementById('fx-overlay').classList.remove('open');
  document.getElementById('fx-topbar-btn')?.classList.remove('nav-active');
}

export async function loadFxHeat() {
  _fxLoading = true;
  const grid = document.getElementById('fx-grid');
  if (grid) grid.innerHTML = '<div class="fx-loading-msg">⟳ Loading FX data…</div>';

  const yfSettled = await Promise.allSettled(
    FX_DEFS.map(def => {
      const yfSym = YF_TICKER[def.symbol];
      return yfSym
        ? fetchYFOHLC(yfSym, '5d', '1d').then(bars => {
            if (!bars || bars.length < 2) return { def, q: null };
            const last = bars[bars.length - 1], prev = bars[bars.length - 2];
            const price = last.close, prevClose = prev.close;
            if (!price || !prevClose) return { def, q: null };
            const pct = ((price - prevClose) / prevClose) * 100;
            return { def, q: { price, pct } };
          })
        : Promise.resolve({ def, q: null });
    })
  );

  let filled = 0;
  const newFxData = FX_DEFS.map((def, i) => {
    const res = yfSettled[i];
    if (res.status === 'fulfilled' && res.value?.q) {
      filled++;
      const { price, pct } = res.value.q;
      return { symbol: def.symbol, price, pct,
               trend: pct > 0.1 ? 'bullish' : pct < -0.1 ? 'bearish' : 'neutral', _src: 'yf' };
    }
    return null;
  });

  const missing = newFxData.map((d, i) => d === null ? i : -1).filter(i => i >= 0);
  if (missing.length > 0) {
    try {
      const yday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const [todayFx, yestFx] = await Promise.all([
        fetch('https://api.frankfurter.app/latest?from=USD', {signal: AbortSignal.timeout(8000)}).then(r => r.json()),
        fetch(`https://api.frankfurter.app/${yday}?from=USD`,  {signal: AbortSignal.timeout(8000)}).then(r => r.json()),
      ]);
      for (const i of missing) {
        const def = FX_DEFS[i];
        const rate = todayFx?.rates?.[def.symbol];
        const prev = yestFx?.rates?.[def.symbol];
        if (!rate) continue;
        const inv   = FX_INVERT.has(def.symbol);
        const price = inv ? 1 / rate : rate;
        const prevP = prev ? (inv ? 1 / prev : prev) : price;
        const pct   = prevP ? ((price - prevP) / prevP) * 100 : 0;
        newFxData[i] = { symbol: def.symbol, price, pct,
                         trend: pct > 0.1 ? 'bullish' : pct < -0.1 ? 'bearish' : 'neutral', _src: 'fkfr' };
        filled++;
      }
    } catch(_) {}
  }

  const stillNull = newFxData.map((d, i) => d === null ? i : -1).filter(i => i >= 0);
  if (stillNull.length > 0) {
    try {
      const missingSymbols = stillNull.map(i => `${FX_DEFS[i].symbol}(${FX_DEFS[i].quote})`).join(', ');
      const _fxToday = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      const sys  = 'You are an FX market data provider. Output only a raw JSON object {"data":[...]}. No markdown.';
      const user = `Today is ${_fxToday}. Return realistic current FX rates vs USD for ONLY these pairs: ${missingSymbols}. JSON: {"data":[{"symbol":"XXX","price":0,"pct":0,"trend":"neutral"},...]}`;
      const raw  = await callLLM(sys, user, 500, 0);
      const parsed = repairAndParseJSON(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed && Object.values(parsed).find(v => Array.isArray(v)));
      if (arr) arr.forEach(row => {
        const i = stillNull.find(i => FX_DEFS[i].symbol === row.symbol);
        if (i !== undefined && row.price) {
          newFxData[i] = { symbol: row.symbol, price: +row.price, pct: +row.pct || 0,
                           trend: row.trend || 'neutral', _src: 'ai' };
          filled++;
        }
      });
    } catch(_) {}
  }

  if (filled > 0) {
    _fxData = newFxData.map((d, i) => d || { symbol: FX_DEFS[i].symbol, price: 0, pct: 0, trend: 'neutral', _src: 'na' });
    const srcCounts = { yf: 0, fkfr: 0, ai: 0 };
    _fxData.forEach(d => { if (d._src && srcCounts[d._src] !== undefined) srcCounts[d._src]++; });
    const srcLabel = srcCounts.yf > 20 ? '📡 YF' : srcCounts.fkfr > 10 ? '📡 ECB/Frankfurter' : '⚠ AI';
    const dateStr  = new Date().toISOString().slice(0, 10);
    const hdrBadge = document.getElementById('fx-data-badge');
    if (hdrBadge) hdrBadge.textContent = `${srcLabel} · ${dateStr}`;
    renderFxHeat();
  } else {
    if (grid) grid.innerHTML = `<div class="fx-loading-msg" style="color:#ef4444">⚠ Failed to load FX data<br><br><span style="cursor:pointer;text-decoration:underline;color:#818cf8" onclick="_fxData=[];loadFxHeat()">↺ try again</span></div>`;
  }
  _fxLoading = false;
}

export function renderFxHeat() {
  const grid = document.getElementById('fx-grid');
  if (!grid || !_fxData.length) return;
  const filtered = _fxTab === 'all'
    ? FX_DEFS
    : FX_DEFS.filter(d => d.region === _fxTab);
  grid.innerHTML = filtered.map(def => {
    const row = _fxData.find(r => r.symbol === def.symbol) || {};
    const pct = isFinite(+row.pct) ? +row.pct : 0;
    const price = isFinite(+row.price) ? +row.price : 0;
    const col = fxPctColor(pct);
    const sign = pct >= 0 ? '+' : '';
    const priceStr = price > 0 ? price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:4}) : '—';
    return `<div class="fx-tile${_fxDetailSym===def.symbol?' selected':''}" style="background:${col.bg};border-color:${_fxDetailSym===def.symbol?'#6366f1':'transparent'}" onclick="openFxDetail('${escHtml(def.symbol)}')">
      <div class="fx-tile-sym" style="color:${col.text}">${escHtml(def.symbol)}</div>
      <div class="fx-tile-name">${escHtml(def.name)}</div>
      <div class="fx-tile-quote" style="color:#6366f1;font-size:7px">${escHtml(def.quote)}</div>
      <div class="fx-tile-price" style="color:${col.text}">${priceStr}</div>
      <div class="fx-tile-pct" style="color:${col.text}">${sign}${pct.toFixed(2)}%</div>
    </div>`;
  }).join('');
}

export async function openFxDetail(symbol) {
  _fxDetailSym = symbol;
  document.querySelectorAll('.fx-tile').forEach(t =>
    t.classList.toggle('selected', t.querySelector('.fx-tile-sym')?.textContent === symbol));
  const wrap = document.getElementById('fx-detail-wrap');
  const det  = document.getElementById('fx-detail');
  if (wrap) wrap.style.display = 'flex';
  if (_fxDetailCache[symbol]) { renderFxDetail(_fxDetailCache[symbol]); return; }
  if (det) det.innerHTML = `<div class="fx-loading-msg">⟳ Loading ${escHtml(symbol)} analysis…</div>`;
  _fxDetailLoading = true;
  const def  = FX_DEFS.find(d => d.symbol === symbol) || {};
  const heatRow = _fxData.find(r => r.symbol === symbol) || {};
  const sys  = 'You are an FX analyst. Output only a raw JSON object. No markdown. No code fences. No trailing commas.';
  const user = `You are a senior FX strategist at a global macro fund. Produce trader-grade analysis for ${symbol} (${def.name||symbol}, pair: ${def.quote||symbol+'/USD'}, current price≈${heatRow.price||'market rate'}, today change≈${heatRow.pct||0}% vs USD).

Return a JSON object with ALL these fields:
symbol ("${symbol}"), name (string), quote ("${def.quote||''}"), price (number), pct (number — % change vs USD, positive=local currency strengthened),
overview (2 sentences: price action and dominant macro driver),
trend ("bullish"|"bearish"|"neutral" — base currency perspective),
macro_drivers (3 strings — each specific e.g. "Fed-ECB rate differential at 165bp favouring USD"),
central_bank (name, stance "hawkish"|"neutral"|"dovish", rate, next_meeting, guidance — 1 sentence),
carry (rate_differential bps, direction "Positive carry for longs"|"Negative carry for longs", annualised_carry_pct),
positioning (IMM/CFTC net positioning vs history and squeeze risk),
vol_context (implied vol vs historical, skew e.g. "25-delta puts bid" = bearish bias),
technical_levels (support with price, resistance with price, key_level — critical level, structure "Uptrend"|"Downtrend"|"Range"),
risks (3 strings — scenario with price impact e.g. "Hawkish ECB could push EUR/USD +1.5% to 1.12"),
trade_idea (direction "LONG"|"SHORT"|"NEUTRAL", entry, target, stop with invalidation, conviction 0-100, risk_reward, catalyst),
outlook (2 sentences: 1-3 month view with level target and key risk),
chart_data (12 objects: month "Mon YYYY", price number — realistic historical for ${def.quote||'the pair'})`;
  try {
    const raw  = await callLLM(sys, user, 1200, 0);
    const full = repairAndParseJSON(raw);
    if (!full || typeof full !== 'object' || Array.isArray(full)) throw new Error('Unexpected response format — retry');
    full.symbol = symbol;
    if (!full.pct && heatRow.pct) full.pct = heatRow.pct;
    if (!full.price && heatRow.price) full.price = heatRow.price;
    _fxDetailCache[symbol] = full;
    if (_fxDetailSym === symbol) renderFxDetail(full);
  } catch(e) {
    if (_fxDetailSym === symbol && det)
      det.innerHTML = `<div class="fx-loading-msg" style="color:#ef4444">⚠ ${escHtml(e.message)}<br><br><span style="cursor:pointer;text-decoration:underline;color:#818cf8" onclick="delete window._fxDetailCache?.['${symbol}'];openFxDetail('${symbol}')">↺ retry</span></div>`;
  } finally {
    _fxDetailLoading = false;
  }
}

function renderFxDetail(data) {
  const det = document.getElementById('fx-detail');
  if (!det) return;
  const def  = FX_DEFS.find(d => d.symbol === data.symbol) || {};
  const up   = (data.pct || 0) >= 0;
  const pStr = isFinite(data.price) && data.price > 0
    ? data.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:4}) : '—';
  const drivers = (data.macro_drivers || []).map(d => `<span class="fx-driver-chip">${escHtml(d)}</span>`).join('');
  const risks   = (data.risks || []).map(r => `<div class="fx-risk-item">⚠ ${escHtml(r)}</div>`).join('');
  const ti  = data.trade_idea || {};
  const dir = ti.direction || 'NEUTRAL';
  const cls = dir === 'LONG' ? 'bull' : dir === 'SHORT' ? 'bear' : 'neutral';
  const bg  = dir === 'LONG' ? 'var(--bull)' : dir === 'SHORT' ? 'var(--bear)' : '#6366f1';
  const conv= Math.min(100, Math.max(0, +(ti.conviction) || 50));
  const cb  = data.central_bank || {};
  const tl  = data.technical_levels || {};
  const carry= data.carry || {};
  det.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
      <div>
        <div class="fx-det-sym">${escHtml(data.symbol)}</div>
        <div class="fx-det-name">${escHtml(data.name||def.name||'')}</div>
        <div class="fx-det-quote">${escHtml(def.quote||'')}</div>
      </div>
      <button class="fx-det-close" onclick="closeFxDetail()">✕</button>
    </div>
    <div class="fx-det-price-row">
      <span class="fx-det-price">${pStr}</span>
      <span class="fx-det-pct ${up?'bull':'bear'} " style="color:${up?'#10B981':'#EF4444'}">${up?'+':''}${(data.pct||0).toFixed(2)}%</span>
    </div>
    <div class="fx-det-chart" id="fx-chart-wrap"></div>
    <div style="text-align:right;margin:-2px 0 6px">
      <button class="chart-expand-btn" id="fx-expand-btn" title="Expand chart fullscreen">⊞ FULLSCREEN</button>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">OVERVIEW</div>
      <div class="fx-det-text">${escHtml(data.overview||'')}</div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">MACRO DRIVERS</div>
      <div style="margin-top:2px">${drivers}</div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">CENTRAL BANK</div>
      <div class="fx-tech-grid">
        <div class="fx-tech-item"><div class="fx-tech-lbl">NAME</div><div class="fx-tech-val" style="font-size:9px">${escHtml(String(cb.name||'—'))}</div></div>
        <div class="fx-tech-item"><div class="fx-tech-lbl">STANCE</div><div class="fx-tech-val" style="color:${cb.stance==='hawkish'?'#10B981':cb.stance==='dovish'?'#EF4444':'#F59E0B'}">${escHtml(String(cb.stance||'—')).toUpperCase()}</div></div>
        <div class="fx-tech-item" style="grid-column:1/-1"><div class="fx-tech-lbl">POLICY RATE</div><div class="fx-tech-val">${escHtml(String(cb.rate||'—'))}%</div></div>
      </div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">CARRY VS USD</div>
      <div class="fx-det-text" style="color:${+carry.rate_differential>=0?'#10B981':'#EF4444'}">${escHtml(String(carry.direction||'—'))} · Δ ${escHtml(String(carry.rate_differential||'—'))}%</div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">TECHNICAL LEVELS</div>
      <div class="fx-tech-grid">
        <div class="fx-tech-item"><div class="fx-tech-lbl">SUPPORT</div><div class="fx-tech-val">${escHtml(String(tl.support||'—'))}</div></div>
        <div class="fx-tech-item"><div class="fx-tech-lbl">RESISTANCE</div><div class="fx-tech-val">${escHtml(String(tl.resistance||'—'))}</div></div>
        <div class="fx-tech-item" style="grid-column:1/-1"><div class="fx-tech-lbl">KEY LEVEL</div><div class="fx-tech-val" style="font-size:9px;color:#c7d2fe">${escHtml(String(tl.key_level||'—'))}</div></div>
      </div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">OUTLOOK</div>
      <div class="fx-det-text">${escHtml(data.outlook||'')}</div>
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">KEY RISKS</div>
      ${risks}
    </div>
    <div class="fx-det-section">
      <div class="fx-det-label">TRADE IDEA</div>
      <div class="fx-trade-card">
        <div class="fx-trade-dir ${cls}">${escHtml(dir)}</div>
        <div class="fx-trade-grid">
          <div class="fx-tech-item"><div class="fx-tech-lbl">ENTRY</div><div class="fx-tech-val">${escHtml(String(ti.entry||'—'))}</div></div>
          <div class="fx-tech-item"><div class="fx-tech-lbl">TARGET</div><div class="fx-tech-val">${escHtml(String(ti.target||'—'))}</div></div>
          <div class="fx-tech-item"><div class="fx-tech-lbl">STOP</div><div class="fx-tech-val">${escHtml(String(ti.stop||'—'))}</div></div>
        </div>
        <div class="fx-tech-lbl">CONVICTION</div>
        <div class="fx-conv-bar"><div class="fx-conv-fill" style="width:${conv}%;background:${bg}"></div></div>
        <div style="font-size:10px;color:#6366f1;font-weight:700;margin-top:4px">${conv}%</div>
      </div>
    </div>`;
  requestAnimationFrame(() => drawFxChart(data.chart_data || [], up ? '#10B981' : '#EF4444'));

  const _yfSymFx = YF_TICKER[data.symbol];
  if (_yfSymFx) {
    if (!(_fxDetailCache[data.symbol]?.ohlcvWeekly)) {
      fetchYFOHLC(_yfSymFx, '5y', '1wk').then(ohlcv => {
        _fxDetailCache[data.symbol] = _fxDetailCache[data.symbol] || {};
        _fxDetailCache[data.symbol].ohlcv       = ohlcv;
        _fxDetailCache[data.symbol].ohlcvWeekly = ohlcv;
      }).catch(() => {});
    }
    if (!(_fxDetailCache[data.symbol]?.ohlcvDaily)) {
      fetchYFOHLC(_yfSymFx, '1y', '1d').then(ohlcv => {
        _fxDetailCache[data.symbol] = _fxDetailCache[data.symbol] || {};
        _fxDetailCache[data.symbol].ohlcvDaily = ohlcv;
      }).catch(() => {});
    }
  }

  document.getElementById('fx-expand-btn')?.addEventListener('click', () => {
    const cached   = _fxDetailCache[data.symbol] || data;
    const rawChart = cached.chart_data || [];
    const fsVals   = rawChart.map(d => +d.price).filter(v => isFinite(v) && v > 0);
    const fsLabs   = rawChart.map(d => d.month || '');
    const ohlcvW   = cached.ohlcvWeekly || cached.ohlcv || null;
    const ohlcvD   = cached.ohlcvDaily  || null;
    const isLive   = (ohlcvW?.length >= 4) || (ohlcvD?.length >= 4);
    openChartFs('commodity', {
      vals: fsVals, labs: fsLabs,
      color: up ? '#10B981' : '#EF4444',
      unit: '', name: data.name || data.symbol,
      title: (data.symbol || '') + ' — ' + (data.name || ''),
      sub: (def.quote || '') + ' · ' + (up ? '+' : '') + (data.pct || 0).toFixed(2) + '% vs USD'
        + (isLive ? '  ⬤ LIVE' : '  ⚠ AI ESTIMATE'),
      support:    cached.technical_levels?.support,
      resistance: cached.technical_levels?.resistance,
      trend:      cached.trend,
      tradeIdea:  cached.trade_idea,
      ohlcv:      ohlcvW,
      ohlcvDaily: ohlcvD,
    });
  });
}

function drawFxChart(chartData, color) {
  const wrap = document.getElementById('fx-chart-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const vals = (chartData||[]).map(d => +d.price).filter(v => isFinite(v) && v > 0);
  const labs = (chartData||[]).map(d => d.month||'');
  if (vals.length < 2) {
    wrap.innerHTML = '<div style="padding:18px;text-align:center;font-family:var(--font-mono);font-size:9px;color:#6b7280">Chart data unavailable</div>';
    return;
  }
  const W = Math.max(wrap.clientWidth||280, 220), H = 110;
  const svg = d3.select(wrap).append('svg').attr('width','100%').attr('height',H)
    .attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','none');
  const mn = d3.min(vals), mx = d3.max(vals);
  const pad = {t:10,r:10,b:24,l:46};
  const xS = d3.scaleLinear().domain([0,vals.length-1]).range([pad.l,W-pad.r]);
  const yS = d3.scaleLinear().domain([mn*0.996,mx*1.004]).range([H-pad.b,pad.t]);
  const area = d3.area().x((_,i)=>xS(i)).y0(H-pad.b).y1(v=>yS(v)).curve(d3.curveCatmullRom.alpha(0.5));
  const line = d3.line().x((_,i)=>xS(i)).y(v=>yS(v)).curve(d3.curveCatmullRom.alpha(0.5));
  svg.append('path').datum(vals).attr('d',area).attr('fill',color).attr('opacity',0.12);
  svg.append('path').datum(vals).attr('d',line).attr('fill','none').attr('stroke',color).attr('stroke-width',2);
  yS.ticks(3).forEach(v=>{
    svg.append('line').attr('x1',pad.l).attr('x2',W-pad.r).attr('y1',yS(v)).attr('y2',yS(v))
      .attr('stroke','rgba(99,102,241,0.12)').attr('stroke-width',1);
    svg.append('text').attr('x',pad.l-4).attr('y',yS(v)+4).attr('text-anchor','end')
      .attr('font-size',8).attr('fill','#6b7280').text(v.toLocaleString(undefined,{maximumFractionDigits:4}));
  });
  labs.forEach((l,i)=>{
    if(i%3!==0&&i!==labs.length-1) return;
    svg.append('text').attr('x',xS(i)).attr('y',H-4).attr('text-anchor','middle')
      .attr('font-size',8).attr('fill','#6b7280').text(l);
  });
  const lastX=xS(vals.length-1), lastY=yS(vals[vals.length-1]);
  svg.append('circle').attr('cx',lastX).attr('cy',lastY).attr('r',3.5)
    .attr('fill',color).attr('stroke','#080e1c').attr('stroke-width',1.5);
}

export function closeFxDetail() {
  _fxDetailSym = null;
  document.querySelectorAll('.fx-tile').forEach(t => t.classList.remove('selected'));
  const wrap = document.getElementById('fx-detail-wrap');
  if (wrap) wrap.style.display = 'none';
}

export function switchFxTab(tab) {
  _fxTab = tab;
  document.querySelectorAll('.fx-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderFxHeat();
}

export function wireFxEvents() {
  const topBtn = document.getElementById('fx-topbar-btn');
  if (topBtn) topBtn.addEventListener('click', openFx);
  document.querySelectorAll('.fx-tab').forEach(t => {
    t.addEventListener('click', () => switchFxTab(t.dataset.tab));
  });
  document.getElementById('fx-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('fx-overlay')) closeFx();
  });
}

window.openFx = openFx;
window.closeFx = closeFx;
window.wireFxEvents = wireFxEvents;
window.openFxDetail = openFxDetail;
window.closeFxDetail = closeFxDetail;
window.switchFxTab = switchFxTab;
window.renderFxHeat = renderFxHeat;
