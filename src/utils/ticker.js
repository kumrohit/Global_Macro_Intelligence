// ticker.js — live macro ticker bar logic
import { TICKERS, YF_TICKER } from '../core/constants.js';
import { fetchYFQuote, fetchFredUS10Y } from '../api/market-data.js';
import { callLLM, callClaudeWithSearch, detectProvider } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { storageGet, storageSet } from '../core/storage.js';
import { tickerTimer, setTickerTimer, _tickerVisibilityWired, setTickerVisibilityWired } from '../core/state.js';

let _tickerFetching = false; // in-flight guard: only one fetch at a time

export function applyTickerData(data) {
  TICKERS.forEach(t => {
    const v = data[t.key];
    const el = document.getElementById(t.id);
    if (!el || !v) return;
    const pct = parseFloat(v.pct || 0);
    const price = parseFloat(v.price || 0);
    el.textContent = `${t.label}: ${price >= 100 ? price.toFixed(2) : price.toFixed(3)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
    el.className = 'tick-val ' + (pct > 0 ? 'tick-up' : pct < 0 ? 'tick-dn' : 'tick-na');
    el.title = '';
  });
  applyMiniTicker(data);
}

export function applyMiniTicker(data) {
  const MAP = { dxy:'dxy', gold:'gold', wti:'wti', vix:'vix', us10y:'10y' };
  const DEC = { dxy:2, gold:1, wti:2, vix:2, us10y:3 };
  Object.entries(MAP).forEach(([key, id]) => {
    const v = data[key]; if (!v) return;
    const price = parseFloat(v.price || 0), pct = parseFloat(v.pct || 0);
    const vEl = document.getElementById(`mtb-${id}`);
    const cEl = document.getElementById(`mtb-${id}-c`);
    if (!vEl || !cEl) return;
    const dec = DEC[key] ?? 2;
    vEl.textContent = price >= 1000 ? price.toFixed(dec < 2 ? 1 : dec) : price.toFixed(dec);
    vEl.className = `mtb-val ${pct > 0 ? 'mtb-up' : pct < 0 ? 'mtb-dn' : 'mtb-na'}`;
    cEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    cEl.className = `mtb-chg ${pct > 0 ? 'mtb-up' : pct < 0 ? 'mtb-dn' : 'mtb-na'}`;
  });
}

export function startMiniClock() {
  function tick() {
    const el = document.getElementById('mtb-clock');
    if (el) el.textContent = new Date().toUTCString().slice(17, 22) + ' UTC';
  }
  tick();
  setInterval(tick, 60000); // HH:MM display — minute-level accuracy is sufficient
}

export async function loadTickers() {
  // YF_TICKER is imported from constants — build the map at call time
  const TICKER_YF_MAP = {
    dxy:   YF_TICKER.DXY,
    gold:  YF_TICKER.GOLD,
    wti:   YF_TICKER.WTI,
    vix:   YF_TICKER.VIX,
    us10y: YF_TICKER.US10Y,
  };
  // Serve from localStorage cache if < 5 min old
  try {
    const cached = storageGet('gmi_ticker_cache');
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 5 * 60 * 1000) { applyTickerData(data); return; }
    }
  } catch(_) {}

  if (_tickerFetching) return;
  _tickerFetching = true;

  // Show spinners
  TICKERS.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;
    el.innerHTML = '<span class="spin" style="width:8px;height:8px;"></span>';
    el.className = 'tick-val tick-na';
  });

  // ── Primary: Yahoo Finance + optional FRED for US10Y ──
  try {
    const keys    = Object.keys(TICKER_YF_MAP);
    const [settled, fredQuote] = await Promise.all([
      Promise.allSettled(keys.map(k => fetchYFQuote(TICKER_YF_MAP[k]))),
      fetchFredUS10Y(), // null if no FRED key configured
    ]);
    const quotes  = {};
    let hitCount  = 0;
    settled.forEach((res, i) => {
      const k = keys[i];
      if (res.status === 'fulfilled' && res.value) {
        let { price, pct } = res.value;
        // ^TNX via YF v8 API already returns actual yield % (e.g. 4.394 = 4.394%)
        quotes[k] = { price, pct };
        hitCount++;
      }
    });
    // Prefer FRED for US10Y when available (more authoritative)
    if (fredQuote) {
      quotes['us10y'] = { price: fredQuote.price, pct: fredQuote.pct, _src: '📡 FRED' };
      if (!quotes['us10y'].price) hitCount++;
    }

    if (hitCount >= 3) { // accept partial success
      try { storageSet('gmi_ticker_cache', JSON.stringify({ data: quotes, ts: Date.now() })); } catch(_) {}
      _applyTickerQuotes(quotes, fredQuote ? '📡 YF+FRED' : '📡 YF');
      _tickerFetching = false;
      return;
    }
  } catch(_) {}

  // ── Fallback: LLM estimate (Claude web-search or Gemini) ──
  try {
    let fullText;
    if (detectProvider() === 'claude') {
      const prompt = `Use web search to get the latest prices for DXY, Gold spot, WTI crude, VIX, and US 10-Year Treasury yield. Return ONLY JSON: {"dxy":{"price":0,"pct":0},"gold":{"price":0,"pct":0},"wti":{"price":0,"pct":0},"vix":{"price":0,"pct":0},"us10y":{"price":0,"pct":0}}`;
      const data = await callClaudeWithSearch(prompt, 800, 5);
      fullText = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else {
      const _td = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
      fullText = await callLLM(null, `Today is ${_td}. Estimate current market prices. Output ONLY JSON: {"dxy":{"price":0,"pct":0},"gold":{"price":0,"pct":0},"wti":{"price":0,"pct":0},"vix":{"price":0,"pct":0},"us10y":{"price":0,"pct":0}} — replace 0s with best estimates. dxy≈96-106, gold≈2800-3500, wti≈55-90, vix≈12-50, us10y≈3.5-5.5 (%). pct = daily % change.`, 400);
    }
    const quotes = repairAndParseJSON(fullText);
    try { storageSet('gmi_ticker_cache', JSON.stringify({ data: quotes, ts: Date.now() })); } catch(_) {}
    _applyTickerQuotes(quotes, '⚠ AI');
  } catch (e) {
    console.warn('Ticker fetch failed:', e);
    TICKERS.forEach(t => {
      const el = document.getElementById(t.id);
      if (el) { el.textContent = 'N/A'; el.className = 'tick-val tick-na'; }
    });
  } finally {
    _tickerFetching = false;
  }
}

export function _applyTickerQuotes(quotes, src) {
  // Tag each quote with its data source for tooltip
  Object.values(quotes).forEach(q => { if (q) q._src = src; });
  applyTickerData(quotes);
}

// Window bridges
window.loadTickers = loadTickers;
