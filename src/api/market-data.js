// api/market-data.js — Yahoo Finance OHLC/quote + FRED US10Y
import { storageGet } from '../core/storage.js';

// ── FRED: US 10-year treasury yield (DGS10) ──────────────────────────────────
export async function fetchFredUS10Y() {
  const key = storageGet('gmi_fred_key');
  if (!key) return null;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${key}&file_type=json&limit=5&sort_order=desc`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const obs = json.observations?.filter(o => o.value !== '.');
    if (!obs || obs.length === 0) return null;
    const price = parseFloat(obs[0].value);
    const prev  = obs.length > 1 ? parseFloat(obs[1].value) : price;
    if (!isFinite(price)) return null;
    const pct = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, pct, date: obs[0].date };
  } catch(_) { return null; }
}

// ── Yahoo Finance OHLC bars (via CORS proxies) ───────────────────────────────
const _yfCache = {};
const _yfInFlight = {};

export async function fetchYFOHLC(yfSym, range, interval) {
  const key = `${yfSym}|${range}|${interval}`;
  if (_yfCache[key]) return _yfCache[key];
  if (_yfInFlight[key]) return _yfInFlight[key];
  const _doFetch = (async () => {
    const yfUrl1 = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${interval}&range=${range}&includePrePost=false&events=div,split`;
    const yfUrl2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${interval}&range=${range}&includePrePost=false&events=div,split`;
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yfUrl1)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yfUrl2)}`,
      `https://corsproxy.io/?${yfUrl1}`,
    ];
    let json = null;
    for (const proxyUrl of proxies) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 10000);
        const res  = await fetch(proxyUrl, { signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) continue;
        const j = await res.json();
        if (j?.chart?.result?.[0]?.timestamp?.length) { json = j; break; }
      } catch (e) { /* try next proxy */ }
    }
    if (!json) throw new Error('market data unavailable');
    const r = json.chart?.result?.[0];
    if (!r?.timestamp?.length) throw new Error('empty response');
    const q    = r.indicators.quote[0] || {};
    const adjC = r.indicators.adjclose?.[0]?.adjclose || [];
    const raw = r.timestamp.map((t, i) => {
      const rawC = q.close?.[i];
      const adj  = adjC[i];
      const close = (isFinite(adj) && adj > 0) ? adj : (isFinite(rawC) && rawC > 0 ? rawC : null);
      if (!close) return null;
      const factor = (rawC && rawC > 0) ? close / rawC : 1;
      const o = q.open?.[i],  h = q.high?.[i], l = q.low?.[i];
      if (!isFinite(o) || !isFinite(h) || !isFinite(l)) return null;
      const open = +(o * factor), high = +(h * factor), low = +(l * factor);
      if (high < low || open <= 0 || high <= 0 || low <= 0) return null;
      return { time: t, open, high, low, close, volume: +(q.volume?.[i] || 0) };
    }).filter(Boolean);
    raw.sort((a, b) => a.time - b.time);
    const data = raw.filter((d, i) => i === 0 || d.time !== raw[i - 1].time);
    if (data.length < 4) throw new Error('insufficient bars');
    _yfCache[key] = data;
    return data;
  })();
  _yfInFlight[key] = _doFetch;
  try {
    return await _doFetch;
  } finally {
    delete _yfInFlight[key];
  }
}

// ── Yahoo Finance quote: latest price + daily % change ───────────────────────
const _yfQuoteCache = {};

export async function fetchYFQuote(yfSym) {
  if (!yfSym) return null;
  const cacheKey = yfSym + '|quote';
  const hit = _yfQuoteCache[cacheKey];
  if (hit && Date.now() - hit.ts < 10 * 60 * 1000) return hit.data;
  try {
    const bars = await fetchYFOHLC(yfSym, '5d', '1d');
    if (!bars || bars.length < 2) return null;
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const price     = last.close ?? last.open ?? null;
    const prevClose = prev.close ?? prev.open ?? null;
    if (price == null || prevClose == null || prevClose === 0) return null;
    const pct  = ((price - prevClose) / prevClose) * 100;
    const date = last.time ? new Date(last.time * 1000).toISOString().slice(0, 10) : null;
    const result = { price, pct, date };
    _yfQuoteCache[cacheKey] = { data: result, ts: Date.now() };
    return result;
  } catch(_) { return null; }
}
