// src/utils/chart.js — Chart fullscreen panel
import { createChart } from 'lightweight-charts';
import { fetchYFOHLC } from '../api/market-data.js';
import { callLLM } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';

// Module-level chart state (managed locally, not from state.js)
let chartFsOpen      = false;
let chartFsPayload   = null;
let chartFsMetric    = 'gdp';
let chartFsPeriod    = 'ALL';
let chartFsShowEMA9  = true;
let chartFsShowEMA21 = true;
let chartFsShowEMA50 = false;
let chartFsShowEMA200= false;
let chartFsInstance  = null;
let chartFsType      = 'line';
let chartFsShowBB    = false;
let chartFsOscillator= 'rsi';

const HISTORY_SERIES = {
  gdp:       { label:'GDP Growth',   color:'#10B981', unit:'%' },
  inflation: { label:'CPI Inflation',color:'#F59E0B', unit:'%' },
  rate:      { label:'Policy Rate',  color:'#22D3EE', unit:'%' },
  fx:        { label:'FX vs USD',    color:'#60A5FA', unit:''  },
};

export function cfsPeriodClick(btn, period) {
  chartFsPeriod = period;
  document.querySelectorAll('.cfs-period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChartFs();
}

export function cfsEmaClick(btn, n) {
  if (n === 9)        chartFsShowEMA9   = !chartFsShowEMA9;
  else if (n === 21)  chartFsShowEMA21  = !chartFsShowEMA21;
  else if (n === 50)  chartFsShowEMA50  = !chartFsShowEMA50;
  else if (n === 200) chartFsShowEMA200 = !chartFsShowEMA200;
  btn.classList.toggle('active');
  renderChartFs();
}

export function cfsOscClick(btn, osc) {
  chartFsOscillator = osc;
  document.querySelectorAll('.cfs-osc-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChartFs();
}

export function cfsTypeClick(btn, type) {
  chartFsType = type;
  document.querySelectorAll('.cfs-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderChartFs();
}

export function cfsBBClick(btn) {
  chartFsShowBB = !chartFsShowBB;
  btn.classList.toggle('active');
  renderChartFs();
}

export function openChartFs(type, payload) {
  chartFsOpen    = true;
  chartFsPayload = { type, ...payload };
  if (type === 'history') chartFsPeriod = 'ALL';
  document.getElementById('chart-fs').classList.add('open');
  document.getElementById('chart-fs-title').textContent = payload.title || 'CHART';
  document.getElementById('chart-fs-sub').textContent   = payload.sub || '';

  const toolbar = document.getElementById('chart-fs-toolbar');
  let html = '';

  html += `<button class="cfs-type-btn${chartFsType==='line'?' active':''}" onclick="cfsTypeClick(this,'line')">LINE</button>`;
  html += `<button class="cfs-type-btn${chartFsType==='area'?' active':''}" onclick="cfsTypeClick(this,'area')">AREA</button>`;
  html += `<button class="cfs-type-btn${chartFsType==='candlestick'?' active':''}" onclick="cfsTypeClick(this,'candlestick')">CANDLE</button>`;
  html += `<span class="cfs-sep"></span>`;

  if (type === 'history') {
    html += Object.entries(HISTORY_SERIES).map(([k, s]) =>
      `<button class="cfs-metric-btn${chartFsMetric===k?' active':''}" data-m="${k}">${s.label}</button>`
    ).join('');
  } else {
    const hasWeekly = chartFsPayload?.ohlcv?.length >= 4;
    const hasDaily  = chartFsPayload?.ohlcvDaily?.length >= 4;
    const hasReal   = hasWeekly || hasDaily;
    const periods   = hasReal ? ['1M','3M','6M','1Y','ALL'] : ['3M','6M','ALL'];
    html += periods.map(p => {
      const label = (p === 'ALL' && hasWeekly) ? '5Y' : p;
      return `<button class="cfs-period-btn${chartFsPeriod===p?' active':''}" onclick="cfsPeriodClick(this,'${p}')">${label}</button>`;
    }).join('');
    html += `<span class="cfs-sep"></span>`;
    html += `<button class="cfs-ema-btn e9${chartFsShowEMA9?' active':''}" onclick="cfsEmaClick(this,9)">EMA9</button>`;
    html += `<button class="cfs-ema-btn e21${chartFsShowEMA21?' active':''}" onclick="cfsEmaClick(this,21)">EMA21</button>`;
    html += `<button class="cfs-ema-btn e50${chartFsShowEMA50?' active':''}" onclick="cfsEmaClick(this,50)">EMA50</button>`;
    html += `<button class="cfs-ema-btn e200${chartFsShowEMA200?' active':''}" onclick="cfsEmaClick(this,200)">EMA200</button>`;
    html += `<button class="cfs-bb-btn${chartFsShowBB?' active':''}" onclick="cfsBBClick(this)">BB</button>`;
    html += `<span class="cfs-sep"></span>`;
    html += `<button class="cfs-osc-btn${chartFsOscillator==='rsi'?' active':''}" onclick="cfsOscClick(this,'rsi')">RSI</button>`;
    html += `<button class="cfs-osc-btn${chartFsOscillator==='macd'?' active':''}" onclick="cfsOscClick(this,'macd')">MACD</button>`;
    html += `<button class="cfs-osc-btn${chartFsOscillator==='stoch'?' active':''}" onclick="cfsOscClick(this,'stoch')">STOCH</button>`;
    html += `<button class="cfs-osc-btn${chartFsOscillator==='off'?' active':''}" onclick="cfsOscClick(this,'off')">OFF</button>`;
  }

  toolbar.innerHTML = html;

  if (type === 'history') {
    toolbar.querySelectorAll('.cfs-metric-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chartFsMetric = btn.dataset.m;
        toolbar.querySelectorAll('.cfs-metric-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.m === chartFsMetric));
        renderChartFs();
      });
    });
  }
  requestAnimationFrame(renderChartFs);
}

export function closeChartFs() {
  chartFsOpen = false;
  document.getElementById('chart-fs').classList.remove('open');
  document.getElementById('chart-fs-tip').style.display = 'none';
  if (chartFsInstance) { try { chartFsInstance.remove(); } catch (e) {} chartFsInstance = null; }
  const infoEl = document.getElementById('chart-analysis-info');
  if (infoEl) infoEl.style.display = 'none';
}

export function renderChartFs() {
  if (!chartFsPayload) return;
  const { type } = chartFsPayload;
  if (type === 'history')   renderChartFsHistory();
  else if (type === 'commodity') renderChartFsCommodity();
}

function renderChartFsHistory() {
  const data = chartFsPayload.histData;
  if (!data) return;
  const s    = HISTORY_SERIES[chartFsMetric];
  const vals = (data[chartFsMetric] || []).map(Number).filter(isFinite);
  const labs = data.quarters || [];
  buildCfsOhlcDefault(vals, labs, s.color, s.unit);
  drawChartFsLine(vals, labs, s.color, s.unit);
}

function renderChartFsCommodity() {
  const { vals, labs, color, unit } = chartFsPayload;
  if (!vals || vals.length < 2) {
    const el = document.getElementById('chart-fs-ohlc');
    if (el) el.innerHTML = '<span class="cfs-ohlc-lbl" style="padding:4px 0">No chart data available</span>';
    return;
  }
  buildCfsOhlcDefault(vals, labs || [], color || '#10B981', unit || '');
  drawChartFsLine(vals, labs || [], color || '#10B981', unit || '');
}

function drawChartFsLine(allVals, allLabs, color, unit) {
  const container = document.getElementById('chart-fs-chart');
  if (!container) return;
  if (chartFsInstance) { try { chartFsInstance.remove(); } catch (e) {} chartFsInstance = null; }

  function calcEMA(data, p) {
    if (!data || data.length < 1) return [];
    const k = 2 / (p + 1);
    const out = new Array(data.length).fill(null);
    let ema = data[0];
    for (let i = 0; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      if (i >= p - 1) out[i] = ema;
    }
    return out;
  }
  function calcSMA(data, p) {
    p = Math.min(p, data.length);
    return data.map((_, i) =>
      i < p - 1 ? null : data.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p
    );
  }
  function calcBB(data, p, k) {
    p = Math.min(p || 20, data.length); k = k || 2;
    return data.map((_, i) => {
      if (i < p - 1) return null;
      const sl = data.slice(i - p + 1, i + 1);
      const mean = sl.reduce((a, b) => a + b, 0) / p;
      const std = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / p);
      return { upper: mean + k * std, mid: mean, lower: mean - k * std };
    });
  }
  function calcRSI(data, p) {
    p = Math.min(p || 14, data.length - 1);
    if (p < 2) return new Array(data.length).fill(null);
    const out = new Array(p).fill(null);
    let ag = 0, al = 0;
    for (let i = 1; i <= p; i++) {
      const d = data[i] - data[i - 1];
      if (d >= 0) ag += d; else al -= d;
    }
    ag /= p; al /= p;
    out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    for (let i = p + 1; i < data.length; i++) {
      const d = data[i] - data[i - 1];
      const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
      ag = (ag * (p - 1) + g) / p; al = (al * (p - 1) + l) / p;
      out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return out;
  }
  function calcMACD(data, fast, slow, sig) {
    const ef = calcEMA(data, fast), es = calcEMA(data, slow);
    const ml = ef.map((v, i) => v != null && es[i] != null ? v - es[i] : null);
    const validMl = ml.filter(v => v != null);
    const rawSig = calcEMA(validMl, sig);
    const fullSig = new Array(data.length).fill(null);
    let si = 0;
    for (let i = 0; i < ml.length; i++) {
      if (ml[i] != null && si < rawSig.length) fullSig[i] = rawSig[si++];
    }
    const hist = ml.map((v, i) => v != null && fullSig[i] != null ? v - fullSig[i] : null);
    return { macdLine: ml, signalLine: fullSig, hist };
  }
  function calcStoch(highs, lows, closes, kp, dp) {
    const n = closes.length;
    const k = new Array(n).fill(null);
    for (let i = kp - 1; i < n; i++) {
      const hh = Math.max(...highs.slice(i - kp + 1, i + 1));
      const ll = Math.min(...lows.slice(i - kp + 1, i + 1));
      k[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
    }
    const d = new Array(n).fill(null);
    for (let i = dp - 1; i < n; i++) {
      const sl = k.slice(i - dp + 1, i + 1).filter(v => v != null);
      if (sl.length === dp) d[i] = sl.reduce((a, b) => a + b, 0) / dp;
    }
    return { k, d };
  }

  const hasOsc = chartFsOscillator !== 'off';

  let vals, labs, mainData, volData;
  let ema9Data=[], ema21Data=[], ema50Data=[], ema200Data=[];
  let bbUData=[], bbLData=[], bbMData=[];
  let rsiData=[], macdLineData=[], macdSigData=[], macdHistData=[];
  let stochKData=[], stochDData=[];
  let highs=[], lows=[];

  const rawOhlcvWeekly = chartFsPayload?.ohlcv;
  const rawOhlcvDaily  = chartFsPayload?.ohlcvDaily;
  const useDaily  = ['1M','3M','6M','1Y'].includes(chartFsPeriod) && rawOhlcvDaily?.length >= 20;
  const rawOhlcv  = useDaily ? rawOhlcvDaily : (rawOhlcvWeekly || rawOhlcvDaily);

  if (rawOhlcv && rawOhlcv.length >= 4) {
    const nowSec = Date.now() / 1000;
    let bars = rawOhlcv;
    if (chartFsPeriod === '1M') {
      const cut = nowSec - 30 * 86400;
      const f = rawOhlcv.filter(b => b.time >= cut);
      if (f.length >= 4) bars = f;
    } else if (chartFsPeriod === '3M') {
      const cut = nowSec - 91 * 86400;
      const f = rawOhlcv.filter(b => b.time >= cut);
      if (f.length >= 4) bars = f;
    } else if (chartFsPeriod === '6M') {
      const cut = nowSec - 183 * 86400;
      const f = rawOhlcv.filter(b => b.time >= cut);
      if (f.length >= 4) bars = f;
    } else if (chartFsPeriod === '1Y') {
      const cut = nowSec - 365 * 86400;
      const f = rawOhlcv.filter(b => b.time >= cut);
      if (f.length >= 4) bars = f;
    }

    const closes = bars.map(b => b.close);
    highs = bars.map(b => b.high);
    lows  = bars.map(b => b.low);
    const ts = bars.map(b => b.time);
    vals = closes;
    labs = bars.map(b => new Date(b.time * 1000).toISOString().slice(0, 7));

    if (chartFsType === 'candlestick') {
      mainData = bars.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close }));
      volData  = bars.map(b => ({ time: b.time, value: b.volume || 1,
        color: b.close >= b.open ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)' }));
    } else {
      mainData = bars.map(b => ({ time: b.time, value: b.close }));
      volData  = bars.map((b, i) => ({ time: b.time,
        value: i === 0 ? 0 : Math.abs(b.close - bars[i - 1].close),
        color: i > 0 && b.close >= bars[i - 1].close ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)' }));
    }

    const mapSeries = (arr, tsArr) => arr.map((v, i) => v != null ? { time: tsArr[i], value: v } : null).filter(Boolean);
    if (chartFsShowEMA9)   ema9Data   = mapSeries(calcEMA(closes, Math.min(9,  closes.length)), ts);
    if (chartFsShowEMA21)  ema21Data  = mapSeries(calcEMA(closes, Math.min(21, closes.length)), ts);
    if (chartFsShowEMA50)  ema50Data  = mapSeries(calcEMA(closes, Math.min(50, closes.length)), ts);
    if (chartFsShowEMA200) ema200Data = mapSeries(calcEMA(closes, Math.min(200,closes.length)), ts);
    if (chartFsShowBB) {
      const bb = calcBB(closes, 20, 2);
      bbUData = mapSeries(bb.map(b => b?.upper ?? null), ts);
      bbLData = mapSeries(bb.map(b => b?.lower ?? null), ts);
      bbMData = mapSeries(bb.map(b => b?.mid   ?? null), ts);
    }
    if (chartFsOscillator === 'rsi') {
      rsiData = mapSeries(calcRSI(closes, 14), ts);
    } else if (chartFsOscillator === 'macd') {
      const { macdLine, signalLine, hist } = calcMACD(closes, 12, 26, 9);
      macdLineData = mapSeries(macdLine, ts);
      macdSigData  = mapSeries(signalLine, ts);
      macdHistData = hist.map((v, i) => v != null ? { time: ts[i], value: v,
        color: v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)' } : null).filter(Boolean);
    } else if (chartFsOscillator === 'stoch' && highs.length === lows.length) {
      const { k, d } = calcStoch(highs, lows, closes, 14, 3);
      stochKData = mapSeries(k, ts);
      stochDData = mapSeries(d, ts);
    }

  } else {
    vals = allVals.slice(); labs = allLabs.slice();
    if (chartFsPeriod === '3M' && vals.length > 3) { vals = vals.slice(-3); labs = labs.slice(-3); }
    if (chartFsPeriod === '6M' && vals.length > 6) { vals = vals.slice(-6); labs = labs.slice(-6); }
    if (!vals || vals.length < 2) { buildCfsOhlcDefault(vals, labs, color, unit); return; }

    const N = vals.length;
    const WEEK_S = 7 * 24 * 3600;
    function monthTs(idx) {
      const now = new Date();
      return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (N - 1 - idx), 1) / 1000);
    }

    if (chartFsType === 'candlestick') {
      const candles = [], vols = [], wTs = [], wVals = [], wHighs = [], wLows = [];
      for (let m = 0; m < N; m++) {
        const baseTs = monthTs(m);
        const close = vals[m], prevClose = m > 0 ? vals[m - 1] : close;
        for (let w = 0; w < 4; w++) {
          const t = baseTs + w * WEEK_S;
          const prevW = candles.length > 0 ? candles[candles.length - 1].close : prevClose;
          const target = prevClose + (close - prevClose) * ((w + 1) / 4);
          const range = Math.abs(close - prevClose) * 0.15 || Math.abs(close) * 0.007 || 0.01;
          const s1 = Math.sin(m * 13.7 + w * 4.3) * range, s2 = Math.cos(m * 9.1 + w * 6.7) * range;
          const o = +prevW.toFixed(6), c = +(target + s1 * 0.4).toFixed(6);
          const h = +(Math.max(o, c) + Math.abs(s2) * 0.9).toFixed(6);
          const lo = +(Math.min(o, c) - Math.abs(s1) * 0.8).toFixed(6);
          candles.push({ time: t, open: o, high: h, low: lo, close: c });
          vols.push({ time: t, value: Math.abs(c - o) || 0.001,
            color: c >= o ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)' });
          wTs.push(t); wVals.push(c); wHighs.push(h); wLows.push(lo);
        }
      }
      mainData = candles; volData = vols;
      const mapW = (arr) => arr.map((v, i) => v != null ? { time: wTs[i], value: v } : null).filter(Boolean);
      if (chartFsShowEMA9)   ema9Data   = mapW(calcEMA(wVals, Math.min(9,  wVals.length)));
      if (chartFsShowEMA21)  ema21Data  = mapW(calcEMA(wVals, Math.min(21, wVals.length)));
      if (chartFsShowEMA50)  ema50Data  = mapW(calcEMA(wVals, Math.min(50, wVals.length)));
      if (chartFsShowEMA200) ema200Data = mapW(calcEMA(wVals, Math.min(200,wVals.length)));
      if (chartFsShowBB) {
        const bb = calcBB(wVals, 20, 2);
        bbUData = mapW(bb.map(b => b?.upper ?? null)); bbLData = mapW(bb.map(b => b?.lower ?? null)); bbMData = mapW(bb.map(b => b?.mid ?? null));
      }
      if (chartFsOscillator === 'rsi') rsiData = mapW(calcRSI(wVals, 14));
      else if (chartFsOscillator === 'macd') {
        const { macdLine, signalLine, hist } = calcMACD(wVals, 12, 26, 9);
        macdLineData = mapW(macdLine); macdSigData = mapW(signalLine);
        macdHistData = hist.map((v, i) => v != null ? { time: wTs[i], value: v, color: v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)' } : null).filter(Boolean);
      } else if (chartFsOscillator === 'stoch') {
        const { k, d } = calcStoch(wHighs, wLows, wVals, 14, 3);
        stochKData = mapW(k); stochDData = mapW(d);
      }
    } else {
      const mTs = vals.map((_, i) => monthTs(i));
      mainData = vals.map((v, i) => ({ time: mTs[i], value: v }));
      volData  = vals.map((v, i) => ({ time: mTs[i], value: i === 0 ? 0 : Math.abs(v - vals[i - 1]),
        color: i > 0 && v >= vals[i - 1] ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)' }));
      const mapM = (arr) => arr.map((v, i) => v != null ? { time: mTs[i], value: v } : null).filter(Boolean);
      if (chartFsShowEMA9)   ema9Data   = mapM(calcEMA(vals, Math.min(9,  vals.length)));
      if (chartFsShowEMA21)  ema21Data  = mapM(calcEMA(vals, Math.min(21, vals.length)));
      if (chartFsShowEMA50)  ema50Data  = mapM(calcEMA(vals, Math.min(50, vals.length)));
      if (chartFsShowEMA200) ema200Data = mapM(calcEMA(vals, Math.min(200,vals.length)));
      if (chartFsShowBB) {
        const bb = calcBB(vals, 20, 2);
        bbUData = mapM(bb.map(b => b?.upper ?? null)); bbLData = mapM(bb.map(b => b?.lower ?? null)); bbMData = mapM(bb.map(b => b?.mid ?? null));
      }
      if (chartFsOscillator === 'rsi') rsiData = mapM(calcRSI(vals, 14));
      else if (chartFsOscillator === 'macd') {
        const { macdLine, signalLine, hist } = calcMACD(vals, 12, 26, 9);
        macdLineData = mapM(macdLine); macdSigData = mapM(signalLine);
        macdHistData = hist.map((v, i) => v != null ? { time: mTs[i], value: v, color: v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)' } : null).filter(Boolean);
      } else if (chartFsOscillator === 'stoch') {
        const stoch = calcStoch(vals.map(v => v * 1.02), vals.map(v => v * 0.98), vals, 14, 3);
        stochKData = mapM(stoch.k); stochDData = mapM(stoch.d);
      }
    }
  }

  // Use the imported createChart from lightweight-charts
  const chart = createChart(container, {
    autoSize: true,
    layout: {
      background: { type: 'solid', color: '#131722' },
      textColor: '#787b86', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    },
    grid: {
      vertLines: { color: 'rgba(42,46,57,0.75)' },
      horzLines: { color: 'rgba(42,46,57,0.75)' },
    },
    crosshair: {
      mode: 1, // CrosshairMode.Normal
      vertLine: { color: 'rgba(178,181,190,0.5)', style: 2, labelBackgroundColor: '#364156' },
      horzLine: { color: 'rgba(178,181,190,0.5)', style: 2, labelBackgroundColor: '#364156' },
    },
    rightPriceScale: {
      borderColor: 'rgba(42,46,57,0.75)',
      scaleMargins: { top: 0.05, bottom: hasOsc ? 0.42 : 0.27 },
    },
    timeScale: { borderColor: 'rgba(42,46,57,0.75)', timeVisible: true, secondsVisible: false },
    handleScroll: true, handleScale: true,
  });

  let mainSeries;
  if (chartFsType === 'candlestick') {
    mainSeries = chart.addCandlestickSeries({
      upColor: '#10B981', downColor: '#EF4444',
      borderUpColor: '#10B981', borderDownColor: '#EF4444',
      wickUpColor: '#10B981', wickDownColor: '#EF4444',
      priceLineColor: color, priceLineVisible: true, lastValueVisible: true,
    });
  } else if (chartFsType === 'area') {
    mainSeries = chart.addAreaSeries({
      lineColor: color, topColor: color + '55', bottomColor: color + '05', lineWidth: 2,
      priceLineColor: color, priceLineVisible: true, lastValueVisible: true,
      crosshairMarkerRadius: 5, crosshairMarkerBorderColor: '#fff', crosshairMarkerBackgroundColor: color,
    });
  } else {
    mainSeries = chart.addLineSeries({
      color, lineWidth: 2.5,
      priceLineColor: color, priceLineVisible: true, lastValueVisible: true,
      crosshairMarkerRadius: 5, crosshairMarkerBorderColor: '#fff', crosshairMarkerBackgroundColor: color,
    });
  }
  mainSeries.setData(mainData);

  const suppRaw = chartFsPayload?.support;
  const resRaw  = chartFsPayload?.resistance;
  const suppVal = typeof suppRaw === 'string' ? parseFloat(suppRaw.replace(/[^0-9.\-]/g, '')) : Number(suppRaw);
  const resVal  = typeof resRaw  === 'string' ? parseFloat(resRaw.replace(/[^0-9.\-]/g, ''))  : Number(resRaw);
  if (isFinite(suppVal) && suppVal > 0) {
    mainSeries.createPriceLine({ price: suppVal, color: 'rgba(16,185,129,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'S' });
  }
  if (isFinite(resVal) && resVal > 0) {
    mainSeries.createPriceLine({ price: resVal, color: 'rgba(239,68,68,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'R' });
  }

  let emaSeries9=null, emaSeries21=null, emaSeries50=null, emaSeries200=null;
  if (chartFsShowEMA9 && ema9Data.length) {
    emaSeries9 = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    emaSeries9.setData(ema9Data);
  }
  if (chartFsShowEMA21 && ema21Data.length) {
    emaSeries21 = chart.addLineSeries({ color: '#22D3EE', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    emaSeries21.setData(ema21Data);
  }
  if (chartFsShowEMA50 && ema50Data.length) {
    emaSeries50 = chart.addLineSeries({ color: '#a78bfa', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    emaSeries50.setData(ema50Data);
  }
  if (chartFsShowEMA200 && ema200Data.length) {
    emaSeries200 = chart.addLineSeries({ color: '#f472b6', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    emaSeries200.setData(ema200Data);
  }

  if (chartFsShowBB && bbUData.length) {
    const bbU = chart.addLineSeries({ color: 'rgba(139,92,246,0.85)', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    bbU.setData(bbUData);
    const bbL = chart.addLineSeries({ color: 'rgba(139,92,246,0.85)', lineWidth: 1, lineStyle: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    bbL.setData(bbLData);
    const bbM = chart.addLineSeries({ color: 'rgba(139,92,246,0.4)', lineWidth: 1, lineStyle: 3,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    bbM.setData(bbMData);
  }

  const volSeries = chart.addHistogramSeries({
    priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    lastValueVisible: false, priceLineVisible: false,
  });
  volSeries.setData(volData);
  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: hasOsc ? 0.60 : 0.76, bottom: hasOsc ? 0.38 : 0.05 },
  });

  let oscSeries1=null, oscSeries2=null, oscSeries3=null;

  if (chartFsOscillator === 'rsi' && rsiData.length) {
    oscSeries1 = chart.addLineSeries({
      color: '#a78bfa', lineWidth: 1.5, priceScaleId: 'osc',
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    oscSeries1.setData(rsiData);
    chart.priceScale('osc').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    oscSeries1.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    oscSeries1.createPriceLine({ price: 30, color: 'rgba(16,185,129,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    oscSeries1.createPriceLine({ price: 50, color: 'rgba(120,123,134,0.3)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false });
  } else if (chartFsOscillator === 'macd' && macdLineData.length) {
    oscSeries3 = chart.addHistogramSeries({
      priceScaleId: 'osc', lastValueVisible: false, priceLineVisible: false,
    });
    oscSeries3.setData(macdHistData);
    oscSeries1 = chart.addLineSeries({
      color: '#22D3EE', lineWidth: 1.5, priceScaleId: 'osc',
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    oscSeries1.setData(macdLineData);
    oscSeries2 = chart.addLineSeries({
      color: '#F59E0B', lineWidth: 1, lineStyle: 2, priceScaleId: 'osc',
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    oscSeries2.setData(macdSigData);
    chart.priceScale('osc').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  } else if (chartFsOscillator === 'stoch' && stochKData.length) {
    oscSeries1 = chart.addLineSeries({
      color: '#22D3EE', lineWidth: 1.5, priceScaleId: 'osc',
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    oscSeries1.setData(stochKData);
    oscSeries2 = chart.addLineSeries({
      color: '#F59E0B', lineWidth: 1, lineStyle: 2, priceScaleId: 'osc',
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    oscSeries2.setData(stochDData);
    chart.priceScale('osc').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    oscSeries1.createPriceLine({ price: 80, color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    oscSeries1.createPriceLine({ price: 20, color: 'rgba(16,185,129,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
  }

  const infoEl = document.getElementById('chart-analysis-info');
  if (infoEl) {
    const trend     = chartFsPayload?.trend   || '';
    const tradeIdea = chartFsPayload?.tradeIdea;
    const trendCls  = /uptrend|bullish|up/i.test(trend) ? 'cai-bull' : /downtrend|bearish|down/i.test(trend) ? 'cai-bear' : 'cai-neu';
    const trendArrow = /up|bull/i.test(trend) ? '▲' : /down|bear/i.test(trend) ? '▼' : '◆';
    let rows = '';
    if (trend) rows += `<div class="cai-row"><span class="cai-lbl">TREND</span><span class="cai-val ${trendCls}">${trendArrow} ${trend.toUpperCase()}</span></div>`;
    if (isFinite(suppVal) && suppVal > 0) rows += `<div class="cai-row"><span class="cai-lbl">SUPPORT</span><span class="cai-val cai-bull">${suppVal.toLocaleString(undefined,{maximumFractionDigits:4})}</span></div>`;
    if (isFinite(resVal) && resVal > 0) rows += `<div class="cai-row"><span class="cai-lbl">RESIST</span><span class="cai-val cai-bear">${resVal.toLocaleString(undefined,{maximumFractionDigits:4})}</span></div>`;
    if (tradeIdea?.direction) {
      const dirCls = tradeIdea.direction === 'LONG' ? 'cai-bull' : tradeIdea.direction === 'SHORT' ? 'cai-bear' : 'cai-neu';
      rows += `<div class="cai-row"><span class="cai-lbl">SIGNAL</span><span class="cai-val ${dirCls}">${tradeIdea.direction}${tradeIdea.conviction ? ' ' + tradeIdea.conviction + '%' : ''}</span></div>`;
      if (tradeIdea.entry) rows += `<div class="cai-row"><span class="cai-lbl">ENTRY</span><span class="cai-val">${tradeIdea.entry}</span></div>`;
      if (tradeIdea.target) rows += `<div class="cai-row"><span class="cai-lbl">TARGET</span><span class="cai-val cai-bull">${tradeIdea.target}</span></div>`;
      if (tradeIdea.stop) rows += `<div class="cai-row"><span class="cai-lbl">STOP</span><span class="cai-val cai-bear">${tradeIdea.stop}</span></div>`;
    }
    infoEl.innerHTML = rows;
    infoEl.style.display = rows ? 'block' : 'none';
  }

  chart.subscribeCrosshairMove(param => {
    const el = document.getElementById('chart-fs-ohlc');
    if (!el) return;
    if (!param.time || !param.point) { buildCfsOhlcDefault(vals, labs, color, unit); return; }
    const mp = param.seriesData.get(mainSeries);
    if (!mp) return;
    const closeV = mp.close !== undefined ? mp.close : (mp.value || 0);
    const openV  = mp.open  !== undefined ? mp.open  : closeV;
    const highV  = mp.high  !== undefined ? mp.high  : closeV;
    const lowV   = mp.low   !== undefined ? mp.low   : closeV;

    let html = '';
    if (chartFsType === 'candlestick') {
      const chg = closeV - openV, chgC = chg >= 0 ? '#10B981' : '#EF4444';
      html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">O</span><span style="color:#d1d4dc">${openV.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>`;
      html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">H</span><span style="color:#10B981">${highV.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>`;
      html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">L</span><span style="color:#EF4444">${lowV.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>`;
      html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">C</span><span style="color:${color};font-weight:700">${closeV.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>`;
      html += `<span class="cfs-ohlc-item"><span style="color:${chgC}">${chg>=0?'+':''}${chg.toFixed(4)}</span></span>`;
    } else {
      const bi = typeof param.logical === 'number' ? Math.round(param.logical) : -1;
      const prev = bi > 0 && bi < vals.length ? vals[bi - 1] : null;
      const chgV = prev !== null ? closeV - prev : null;
      const chgP = prev !== null && prev !== 0 ? (chgV / Math.abs(prev)) * 100 : null;
      const chgVC = chgV === null ? '#787b86' : chgV >= 0 ? '#10B981' : '#EF4444';
      html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">VAL</span><span style="color:${color};font-weight:700">${closeV.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>`;
      if (chgV !== null) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">CHG</span><span style="color:${chgVC}">${chgV>=0?'+':''}${chgV.toFixed(3)} (${chgP>=0?'+':''}${chgP?.toFixed(2)}%)</span></span>`;
    }
    if (emaSeries9)   { const pt = param.seriesData.get(emaSeries9);   if (pt) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#F59E0B">E9</span><span style="color:#F59E0B">${(pt.value||0).toFixed(3)}</span></span>`; }
    if (emaSeries21)  { const pt = param.seriesData.get(emaSeries21);  if (pt) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#22D3EE">E21</span><span style="color:#22D3EE">${(pt.value||0).toFixed(3)}</span></span>`; }
    if (emaSeries50)  { const pt = param.seriesData.get(emaSeries50);  if (pt) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#a78bfa">E50</span><span style="color:#a78bfa">${(pt.value||0).toFixed(3)}</span></span>`; }
    if (emaSeries200) { const pt = param.seriesData.get(emaSeries200); if (pt) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#f472b6">E200</span><span style="color:#f472b6">${(pt.value||0).toFixed(3)}</span></span>`; }
    if (chartFsOscillator === 'rsi' && oscSeries1) {
      const pt = param.seriesData.get(oscSeries1);
      if (pt) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#a78bfa">RSI</span><span style="color:#a78bfa">${(pt.value||0).toFixed(1)}</span></span>`;
    } else if (chartFsOscillator === 'macd' && oscSeries1) {
      const pt1 = param.seriesData.get(oscSeries1), pt2 = oscSeries2 ? param.seriesData.get(oscSeries2) : null;
      if (pt1) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#22D3EE">MACD</span><span style="color:#22D3EE">${(pt1.value||0).toFixed(4)}</span></span>`;
      if (pt2) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#F59E0B">SIG</span><span style="color:#F59E0B">${(pt2.value||0).toFixed(4)}</span></span>`;
    } else if (chartFsOscillator === 'stoch' && oscSeries1) {
      const pt1 = param.seriesData.get(oscSeries1), pt2 = oscSeries2 ? param.seriesData.get(oscSeries2) : null;
      if (pt1) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#22D3EE">%K</span><span style="color:#22D3EE">${(pt1.value||0).toFixed(1)}</span></span>`;
      if (pt2) html += `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl" style="color:#F59E0B">%D</span><span style="color:#F59E0B">${(pt2.value||0).toFixed(1)}</span></span>`;
    }
    const tStr = typeof param.time === 'number'
      ? new Date(param.time * 1000).toISOString().slice(0, 10)
      : (param.time ? String(param.time) : '');
    html += `<span class="cfs-ohlc-item" style="margin-left:auto;color:#787b86">${tStr}</span>`;
    el.innerHTML = html;
  });

  buildCfsOhlcDefault(vals, labs, color, unit);
  chart.timeScale().fitContent();
  chartFsInstance = chart;
}

export function buildCfsOhlcDefault(vals, labs, color, unit) {
  const el = document.getElementById('chart-fs-ohlc');
  if (!el || !vals || !vals.length) return;
  const last   = vals[vals.length - 1];
  const first  = vals[0];
  const hi     = Math.max(...vals);
  const lo     = Math.min(...vals);
  const chgAbs = last - first;
  const chgPct = first !== 0 ? (chgAbs / Math.abs(first)) * 100 : 0;
  const hiFromLast = last > 0 ? ((hi - last) / last) * 100 : 0;
  const loFromLast = last > 0 ? ((lo - last) / last) * 100 : 0;
  const chgC = chgAbs >= 0 ? '#10B981' : '#EF4444';
  el.innerHTML =
    `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">LAST</span><span style="color:${color};font-weight:700">${last.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span></span>` +
    `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">CHG</span><span style="color:${chgC}">${chgAbs>=0?'+':''}${chgAbs.toFixed(3)} (${chgPct>=0?'+':''}${chgPct.toFixed(2)}%)</span></span>` +
    `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">HI</span><span style="color:#10B981">${hi.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span><span style="color:#545862;font-size:8px;margin-left:2px">${hiFromLast>=0?'+':''}${hiFromLast.toFixed(1)}%</span></span>` +
    `<span class="cfs-ohlc-item"><span class="cfs-ohlc-lbl">LO</span><span style="color:#EF4444">${lo.toLocaleString(undefined,{maximumFractionDigits:4})}${unit||''}</span><span style="color:#545862;font-size:8px;margin-left:2px">${loFromLast>=0?'+':''}${loFromLast.toFixed(1)}%</span></span>` +
    `<span class="cfs-ohlc-item" style="margin-left:auto;color:#787b86;font-size:9px">${labs[0]||''} — ${labs[labs.length-1]||''} · ${vals.length}pts</span>`;
}

export function wireChartFsEvents() {
  document.getElementById('chart-fs-close')?.addEventListener('click', closeChartFs);
  document.getElementById('chart-fs')?.addEventListener('click', e => {
    if (e.target === document.getElementById('chart-fs')) closeChartFs();
  });
  let _cfsResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_cfsResizeTimer);
    _cfsResizeTimer = setTimeout(() => chartFsInstance?.applyOptions({}), 150);
  });
}

window.openChartFs = openChartFs;
window.closeChartFs = closeChartFs;
window.wireChartFsEvents = wireChartFsEvents;
window.cfsPeriodClick = cfsPeriodClick;
window.cfsEmaClick = cfsEmaClick;
window.cfsOscClick = cfsOscClick;
window.cfsTypeClick = cfsTypeClick;
window.cfsBBClick = cfsBBClick;
window.renderChartFs = renderChartFs;
