// src/panels/stocks.js — Stocks modal panel
import { callLLM, requireApiKey, detectProvider } from '../api/llm.js';
import { callClaudeWithSearch } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { currentCountryMeta, cache, activeId, currentStocks, currentSector, apiKey, stocksCache } from '../core/state.js';
import { loadSession } from '../auth/auth.js';
import { showToast } from '../utils/toast.js';

// Module-level mutable state (mirrors state.js but managed locally for stocks)
let _stocksCache = {};

export function openStocks() {
  if (!currentCountryMeta) return;
  if (!currentCountryMeta.index || currentCountryMeta.index === '—') return;
  if (!apiKey) { requireApiKey(() => openStocks(), 'Stock Market Analysis'); return; }

  const modal = document.getElementById('stocks-modal');
  modal.classList.add('open');

  document.getElementById('sh-flag').textContent = currentCountryMeta.flag || '🌍';
  document.getElementById('sh-title').textContent = currentCountryMeta.index;
  document.getElementById('sh-sub').textContent =
    `${currentCountryMeta.name.toUpperCase()} · ${currentCountryMeta.currency} · ${currentCountryMeta.region.toUpperCase()}`;
  document.getElementById('sh-stats').innerHTML = '';

  document.getElementById('st-filter').value = '';
  // Direct assignment on imported let — use splice to mutate
  currentStocks.splice(0, currentStocks.length);
  // Reset sector via global direct approach
  window._currentSector = 'all';
  document.querySelectorAll('.st-tab').forEach(t => t.classList.toggle('active', t.dataset.sector === 'all'));

  const cacheKey = currentCountryMeta.index + '|' + currentCountryMeta.name;
  if (_stocksCache[cacheKey] || stocksCache[cacheKey]) {
    const cached = _stocksCache[cacheKey] || stocksCache[cacheKey];
    currentStocks.splice(0, currentStocks.length, ...(cached.stocks || []));
    renderIndexStats(cached.indexStats);
    renderStocks();
  } else {
    fetchStocks(cacheKey);
  }
}

export function closeStocks() {
  document.getElementById('stocks-modal').classList.remove('open');
}

export async function fetchStocks(cacheKey) {
  const meta = currentCountryMeta;
  document.getElementById('stocks-loading').style.display = 'block';
  document.getElementById('stocks-grid').innerHTML = '';
  document.getElementById('stocks-empty').style.display = 'none';

  const geminiPrompt = `List the top 30 constituent stocks of the ${meta.index} index (${meta.name}) sorted by market cap, using your training knowledge.

Respond with ONLY a valid JSON object. No markdown, no code fences, no trailing commas. Use these exact field names:

indexStats: object with level (number, current index level), pct (number, recent % change), constituents (number, total stocks in index)
stocks: array of 30 objects, each with:
  ticker: string, real local exchange ticker symbol
  name: string, full company name
  sector: string, must be one of Financials, Technology, Energy, Healthcare, Consumer, Industrials, Materials, Utilities, Telecom, Real Estate
  price: number, approximate share price in ${meta.currency}
  pct: number, recent % change (signed)
  mcap: string, market cap abbreviation e.g. "2.4T" or "850B" or "42B"

Use real tickers and companies that actually trade on the ${meta.index}. Sort by market cap descending.`;

  const claudePrompt = `For stock index "${meta.index}" in ${meta.name}, return top 30 stocks by market cap.
Output ONLY valid JSON no markdown: {"indexStats":{"level":0,"pct":0,"constituents":0},"stocks":[{"ticker":"","name":"","sector":"Technology","price":0,"pct":0,"mcap":"0B"}]}
sector options: Financials/Technology/Energy/Healthcare/Consumer/Industrials/Materials/Utilities/Telecom/Real Estate. Use exact local exchange tickers. 30 stocks sorted by market cap descending.`;

  try {
    if (detectProvider() !== 'claude') {
      let raw = await callLLM('Output only a raw JSON object. No markdown. No code fences. No trailing commas.', geminiPrompt, 4000);
      const result = repairAndParseJSON(raw);
      _stocksCache[cacheKey] = result;
      stocksCache[cacheKey] = result;
      currentStocks.splice(0, currentStocks.length, ...(result.stocks || []));
      renderIndexStats(result.indexStats);
      renderStocks();
      document.getElementById('stocks-loading').style.display = 'none';
      return;
    } else {
      const data = await callClaudeWithSearch(claudePrompt, 4000, 3);
      let fullText = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      const result = repairAndParseJSON(fullText);
      _stocksCache[cacheKey] = result;
      stocksCache[cacheKey] = result;
      currentStocks.splice(0, currentStocks.length, ...(result.stocks || []));
      renderIndexStats(result.indexStats);
      renderStocks();
    }
  } catch (err) {
    console.error('Stocks fetch failed:', err);
    showStocksMessage('Failed to load: ' + err.message);
  }
}

export function showStocksMessage(msg) {
  document.getElementById('stocks-loading').style.display = 'none';
  document.getElementById('stocks-grid').innerHTML = '';
  const empty = document.getElementById('stocks-empty');
  empty.style.display = 'block';
  empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">⚠</div><div>${msg}</div>`;
}

export function renderIndexStats(stats) {
  if (!stats) { document.getElementById('sh-stats').innerHTML = ''; return; }
  const up = (stats.pct ?? 0) >= 0;
  const fmt = (n, d = 2) => isFinite(n) ? n.toLocaleString(undefined, {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
  document.getElementById('sh-stats').innerHTML = `
    <div class="shs-item">
      <div class="shs-label">LEVEL</div>
      <div class="shs-val">${fmt(stats.level)}</div>
    </div>
    <div class="shs-item">
      <div class="shs-label">CHANGE</div>
      <div class="shs-val ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'}${Math.abs(stats.pct ?? 0).toFixed(2)}%</div>
    </div>
    <div class="shs-item">
      <div class="shs-label">CONSTITUENTS</div>
      <div class="shs-val">${stats.constituents ?? '—'}</div>
    </div>
  `;
}

export function renderStocks() {
  document.getElementById('stocks-loading').style.display = 'none';
  const grid = document.getElementById('stocks-grid');
  const empty = document.getElementById('stocks-empty');

  const q = (document.getElementById('st-filter').value || '').toLowerCase().trim();
  const sector = window._currentSector || 'all';

  const filtered = currentStocks.filter(s => {
    if (sector !== 'all' && s.sector !== sector) return false;
    if (q && !(`${s.ticker} ${s.name}`.toLowerCase().includes(q))) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">∅</div><div>No stocks match your filter</div>`;
    return;
  }
  empty.style.display = 'none';

  const _stockIdxMap = new Map(currentStocks.map((s, i) => [s, i]));
  grid.innerHTML = filtered.map((s) => {
    const up = (s.pct ?? 0) >= 0;
    const pctText = `${up ? '▲' : '▼'}${Math.abs(s.pct ?? 0).toFixed(2)}%`;
    const price = isFinite(s.price)
      ? s.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
      : '—';
    const realIdx = _stockIdxMap.get(s) ?? -1;
    return `
      <div class="stock-card" data-idx="${realIdx}" title="Click for full analysis">
        <div class="sc-top">
          <div class="sc-ticker">${s.ticker || '—'}</div>
          <div class="sc-sector">${(s.sector || '').toUpperCase()}</div>
        </div>
        <div class="sc-name">${s.name || '—'}</div>
        <div class="sc-bottom">
          <div>
            <div class="sc-price">${price} ${currentCountryMeta.currency}</div>
            <div class="sc-mcap">MCAP ${s.mcap || '—'}</div>
          </div>
          <div class="sc-change ${up ? 'up' : 'dn'}">${pctText}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function filterSector(sector) {
  window._currentSector = sector;
  document.querySelectorAll('.st-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.sector === sector);
  });
  renderStocks();
}

// Stock click delegation
document.addEventListener('click', e => {
  const card = e.target.closest('.stock-card');
  if (card && document.getElementById('stock-detail').classList.contains('open') === false) {
    const idx = parseInt(card.dataset.idx, 10);
    if (!isNaN(idx) && currentStocks[idx]) openStockDetail(currentStocks[idx]);
  }
});

let stockAnalysisCache = {};

export function openStockDetail(stock) {
  const panel = document.getElementById('stock-detail');
  panel.classList.add('open');

  const up = (stock.pct ?? 0) >= 0;
  document.getElementById('sdp-ticker').textContent = stock.ticker || '—';
  document.getElementById('sdp-name').textContent   = stock.name || '—';
  document.getElementById('sdp-price').textContent  =
    isFinite(stock.price) ? stock.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ' + (currentCountryMeta?.currency || '') : '—';
  const chgEl = document.getElementById('sdp-chg');
  chgEl.textContent  = `${up ? '▲' : '▼'}${Math.abs(stock.pct ?? 0).toFixed(2)}%`;
  chgEl.className    = 'sdp-chg ' + (up ? 'up' : 'dn');
  document.getElementById('sdp-mcap').textContent   = 'MCAP ' + (stock.mcap || '—');
  document.getElementById('sdp-sector').textContent = (stock.sector || '—').toUpperCase();

  const recEl = document.getElementById('sdp-rec');
  recEl.className   = 'pending';
  recEl.textContent = 'ANALYSING…';

  document.getElementById('sdp-loading').style.display  = 'block';
  document.getElementById('sdp-content').style.display  = 'none';
  document.getElementById('sdp-error').style.display    = 'none';

  const cacheKey = stock.ticker + '|' + (currentCountryMeta?.name || '');
  if (stockAnalysisCache[cacheKey]) {
    renderStockAnalysis(stockAnalysisCache[cacheKey], stock);
  } else {
    fetchStockAnalysis(stock, cacheKey);
  }
}

export function closeStockDetail() {
  document.getElementById('stock-detail').classList.remove('open');
}

export async function fetchStockAnalysis(stock, cacheKey) {
  const meta = currentCountryMeta || {};
  const priceStr = isFinite(stock.price) ? `${stock.price} ${meta.currency || ''}` : 'unknown';
  const prompt = `You are a senior equity analyst at a top-tier global investment bank. Produce a rigorous, actionable investment analysis for ${stock.name} (${stock.ticker}), listed on ${meta.index || 'local exchange'} in ${meta.name || 'this country'}. Sector: ${stock.sector || 'unknown'}. Current price: ${priceStr}. Market cap: ${stock.mcap || 'unknown'}. Reflect current earnings, guidance, analyst revisions, and macro regime (${meta.name} rates/FX/growth cycle). Be specific — cite actual ratios, levels, and dated catalysts.

Respond with ONLY a valid JSON object. No markdown, no code fences, no trailing commas:

recommendation: "Buy" | "Hold" | "Sell" — based on risk/reward
target_price: number, 12-month price target in ${meta.currency || 'local currency'}
upside_pct: number, % upside/downside to target
time_horizon: "12 months"
confidence: "High" | "Medium" | "Low"
overview: one sentence on ${stock.name}'s business model and competitive moat, max 25 words
valuation_method: primary method (DCF, EV/EBITDA, P/E relative, P/B, Sum-of-parts), max 10 words
fundamentals: {pe_ratio (forward P/E), pb_ratio, ev_ebitda, revenue_growth (%), net_margin (%), roe (%), debt_equity, dividend_yield (%), fcf_yield (%)}
peer_comparison: vs 2 closest peers — premium/discount and why, max 25 words
technicals: {trend ("Uptrend"|"Downtrend"|"Sideways"), rsi (0-100), macd ("Bullish"|"Bearish"|"Neutral"), ma50 ("Above"|"Below"), ma200 ("Above"|"Below"), support, resistance, momentum ("Positive"|"Neutral"|"Negative"), volume_trend ("Accumulation"|"Distribution"|"Neutral")}
catalysts: 3 specific dated catalysts (earnings, product launch, regulatory, macro event) — max 12 words each with timeframe
risks: 3 quantified risks with magnitude (e.g. "tariff escalation compresses margin 150-200bps") — max 15 words each
positioning: overcrowded, short squeeze candidate, under-owned, or neutral — max 20 words
trade_setup: {entry (specific level or condition), stop (invalidation level), target (specific level), risk_reward (e.g. "1:2.8"), holding_period}
analysis: 3-sentence thesis: (1) fundamental case, (2) differentiated insight vs consensus, (3) main risk — max 60 words`;

  try {
    let raw = await callLLM(
      'You are a stock analyst. Output only a raw JSON object. No markdown, no code fences, no trailing commas.',
      prompt,
      1500
    );
    const result = repairAndParseJSON(raw);
    stockAnalysisCache[cacheKey] = result;
    renderStockAnalysis(result, stock);
  } catch (err) {
    document.getElementById('sdp-loading').style.display = 'none';
    const errEl = document.getElementById('sdp-error');
    errEl.style.display = 'block';
    errEl.textContent   = 'Analysis failed: ' + err.message;
    const recEl = document.getElementById('sdp-rec');
    recEl.className   = 'pending';
    recEl.textContent = '⚠ ERROR';
  }
}

export function renderStockAnalysis(d, stock) {
  document.getElementById('sdp-loading').style.display = 'none';
  document.getElementById('sdp-error').style.display   = 'none';
  document.getElementById('sdp-content').style.display = 'block';

  const rec   = (d.recommendation || 'Hold').toLowerCase();
  const recEl = document.getElementById('sdp-rec');
  recEl.className   = rec === 'buy' ? 'buy' : rec === 'sell' ? 'sell' : 'hold';
  recEl.textContent = (d.recommendation || '—').toUpperCase();

  const currency   = currentCountryMeta?.currency || '';
  const targetPrice = isFinite(d.target_price) ? d.target_price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  document.getElementById('sdp-target').textContent  = targetPrice + (targetPrice !== '—' ? ' ' + currency : '');
  document.getElementById('sdp-horizon').textContent = d.time_horizon || '—';
  document.getElementById('sdp-conf').textContent    = d.confidence   || '—';
  const upsideEl = document.getElementById('sdp-upside');
  const upside   = parseFloat(d.upside_pct);
  upsideEl.textContent = isFinite(upside) ? `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%` : '—';
  upsideEl.className   = 'sdp-upside ' + (upside >= 0 ? 'up' : 'dn');

  document.getElementById('sdp-overview').textContent = d.overview || '—';

  const f = d.fundamentals || {};
  document.getElementById('sdp-fund-metrics').innerHTML = [
    ['P/E RATIO',     f.pe_ratio  ?? '—'],
    ['P/B RATIO',     f.pb_ratio  ?? '—'],
    ['EV/EBITDA',     f.ev_ebitda ?? '—'],
    ['REV GROWTH',    f.revenue_growth ?? '—'],
    ['NET MARGIN',    f.net_margin ?? '—'],
    ['ROE',           f.roe ?? '—'],
    ['DEBT/EQUITY',   f.debt_equity ?? '—'],
    ['DIV YIELD',     f.dividend_yield ?? '—'],
  ].map(([label, val]) => `<div class="sdp-metric"><div class="sdp-ml">${label}</div><div class="sdp-mv">${val}</div></div>`).join('');

  const t = d.technicals || {};
  const trendCls = t.trend === 'Uptrend' ? 'up' : t.trend === 'Downtrend' ? 'dn' : '';
  const momCls   = t.momentum === 'Positive' ? 'up' : t.momentum === 'Negative' ? 'dn' : '';
  const macdCls  = t.macd === 'Bullish' ? 'up' : t.macd === 'Bearish' ? 'dn' : '';
  document.getElementById('sdp-tech-metrics').innerHTML = [
    ['TREND',       t.trend      ?? '—', trendCls],
    ['RSI',         isFinite(t.rsi) ? t.rsi : '—', t.rsi > 70 ? 'dn' : t.rsi < 30 ? 'up' : ''],
    ['MACD',        t.macd       ?? '—', macdCls],
    ['50-DAY MA',   t.ma50       ?? '—', t.ma50 === 'Above' ? 'up' : t.ma50 === 'Below' ? 'dn' : ''],
    ['200-DAY MA',  t.ma200      ?? '—', t.ma200 === 'Above' ? 'up' : t.ma200 === 'Below' ? 'dn' : ''],
    ['SUPPORT',     isFinite(t.support) ? t.support.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—', ''],
    ['RESISTANCE',  isFinite(t.resistance) ? t.resistance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—', ''],
    ['MOMENTUM',    t.momentum   ?? '—', momCls],
  ].map(([label, val, cls]) => `<div class="sdp-metric"><div class="sdp-ml">${label}</div><div class="sdp-mv ${cls}">${val}</div></div>`).join('');

  document.getElementById('sdp-analysis').textContent = d.analysis || '—';

  document.getElementById('sdp-catalysts').innerHTML = (d.catalysts || [])
    .map(c => `<li class="sdp-bullet"><span class="bi cat">▲</span><span>${c}</span></li>`).join('');

  document.getElementById('sdp-risks').innerHTML = (d.risks || [])
    .map(r => `<li class="sdp-bullet"><span class="bi risk">▼</span><span>${r}</span></li>`).join('');
}

window.openStocks = openStocks;
window.closeStocks = closeStocks;
window.filterSector = filterSector;
window.openStockDetail = openStockDetail;
window.closeStockDetail = closeStockDetail;
window.renderStocks = renderStocks;
