// history-chart.js — macro history chart panel
import * as d3 from 'd3';
import { META, COUNTRY_ISO2, HISTORY_SERIES } from '../core/constants.js';
import {
  cache, activeId,
  historyOpen, setHistoryOpen,
  historyMetric, setHistoryMetric,
  historyCache,
  historyCurrentData, setHistoryCurrentData,
  currentCountryMeta,
} from '../core/state.js';
import { callLLM } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { fetchYFOHLC } from '../api/market-data.js';
import { storageGet, storageSet } from '../core/storage.js';

export function toggleHistoryChart() {
  const newOpen = !historyOpen;
  setHistoryOpen(newOpen);
  document.getElementById('history-arrow').className = newOpen ? 'open' : '';
  const section = document.getElementById('history-section');
  section.className = newOpen ? 'open' : '';
  if (newOpen) {
    if (!currentCountryMeta) {
      section.innerHTML = '<div style="padding:10px;font-family:var(--font-mono);font-size:10px;color:var(--text2);">Select a country first.</div>';
      return;
    }
    if (historyCache[currentCountryMeta.name]) {
      setHistoryCurrentData(historyCache[currentCountryMeta.name]);
      renderHistoryChart(historyCache[currentCountryMeta.name]);
    } else {
      loadHistoryData();
    }
  }
}

export async function loadHistoryData() {
  const section = document.getElementById('history-section');
  section.innerHTML = '<div style="padding:20px;text-align:center;"><div class="big-spin"></div><div class="sl-text" style="font-size:11px;margin-top:8px;">Loading macro history…</div></div>';

  const meta = currentCountryMeta;
  const QUARTERS = ['Q1 2020','Q2 2020','Q3 2020','Q4 2020','Q1 2021','Q2 2021','Q3 2021','Q4 2021',
                    'Q1 2022','Q2 2022','Q3 2022','Q4 2022','Q1 2023','Q2 2023','Q3 2023','Q4 2023',
                    'Q1 2024','Q2 2024','Q3 2024','Q4 2024','Q1 2025','Q2 2025'];

  // ── Step 1: try World Bank for GDP + CPI ──────────────────────────────────
  const numId = meta._id ? String(meta._id).replace(/^c/, '') : null;
  const iso2 = numId ? COUNTRY_ISO2[numId] : null;
  let wbGdp = null, wbCpi = null;

  if (iso2) {
    try {
      const fetchWB = window.fetchWorldBankSeries;
      if (fetchWB) {
        [wbGdp, wbCpi] = await Promise.all([
          fetchWB(iso2, 'NY.GDP.MKTP.KD.ZG'),
          fetchWB(iso2, 'FP.CPI.TOTL.ZG'),
        ]);
      }
    } catch(_) {}
  }

  const wbAnnualToQuarterly = window._wbAnnualToQuarterly;
  const gdpFromWB  = wbGdp  && wbAnnualToQuarterly ? wbAnnualToQuarterly(wbGdp)  : null;
  const inflFromWB = wbCpi  && wbAnnualToQuarterly ? wbAnnualToQuarterly(wbCpi)  : null;

  // ── Step 2: FX from Yahoo Finance (existing) ──────────────────────────────
  let fxFromYF = null;
  const yfFxSym = meta._yfSym || null; // set by country meta if available
  if (yfFxSym) {
    try {
      const bars = await fetchYFOHLC(yfFxSym, '5y', '1wk');
      if (bars && bars.length >= 4) {
        // map weekly bars to quarterly slots (use last bar within each quarter)
        const quarterly = {};
        bars.forEach(b => {
          const d = new Date(b.t * 1000);
          const yr = d.getUTCFullYear();
          const q = Math.floor(d.getUTCMonth() / 3) + 1;
          const key = `Q${q} ${yr}`;
          quarterly[key] = b.c ?? b.o;
        });
        fxFromYF = QUARTERS.map(q => quarterly[q] ?? null);
      }
    } catch(_) {}
  }

  // Check if we have enough real data to skip LLM for GDP/CPI
  const hasRealGdp  = gdpFromWB  && gdpFromWB.filter(v => v !== null).length >= 4;
  const hasRealCpi  = inflFromWB && inflFromWB.filter(v => v !== null).length >= 4;

  // ── Step 3: LLM for rate + FX (and GDP/CPI if WB unavailable) ─────────────
  const llmFields = [];
  if (!hasRealGdp)  llmFields.push('"gdp": [22 numbers: real GDP growth YoY %]');
  if (!hasRealCpi)  llmFields.push('"inflation": [22 numbers: CPI YoY %]');
  llmFields.push('"rate": [22 numbers: central bank policy rate %]');
  if (!fxFromYF)    llmFields.push(`"fx": [22 numbers: FX rate in market convention for ${meta.currency}]`);
  llmFields.push('"fx_convention": "e.g. EURUSD or USDJPY or DXY"');

  const prompt = `Generate historical macroeconomic data for ${meta.name} covering 22 quarters Q1 2020–Q2 2025.
Respond ONLY with a raw JSON object (no markdown):
{
  "quarters": ${JSON.stringify(QUARTERS)},
  ${llmFields.join(',\n  ')}
}
Reflect actual history: COVID crash Q2 2020, recovery 2021, inflation surge 2021-2022, rate hikes 2022-2023, disinflation 2023-2024, rate cuts 2024-2025.`;

  let llmResult = {};
  try {
    const raw = await callLLM('Output only a raw JSON object. No markdown.', prompt, 700);
    llmResult = repairAndParseJSON(raw) || {};
  } catch(_) {}

  // ── Step 4: merge real + LLM data ─────────────────────────────────────────
  // Fill nulls in WB series using LLM interpolation
  const fillNulls = (arr, fallback) => {
    if (!arr || !fallback) return fallback || arr;
    return arr.map((v, i) => v !== null ? v : (fallback[i] ?? null));
  };

  const result = {
    quarters:     QUARTERS,
    gdp:          hasRealGdp ? fillNulls(gdpFromWB, llmResult.gdp)   : (llmResult.gdp || []),
    inflation:    hasRealCpi ? fillNulls(inflFromWB, llmResult.inflation) : (llmResult.inflation || []),
    rate:         llmResult.rate || [],
    fx:           fxFromYF   ? fxFromYF : (llmResult.fx || []),
    fx_convention: llmResult.fx_convention || '',
    _wbGdp:       hasRealGdp,
    _wbCpi:       hasRealCpi,
    _yfFx:        !!fxFromYF,
  };

  if (!result.gdp.length && !result.inflation.length) {
    section.innerHTML = `<div style="padding:10px;font-family:var(--font-mono);font-size:10px;color:var(--bear);">Failed to load history data. Check API key or try again.</div>`;
    return;
  }

  historyCache[meta.name] = result;
  setHistoryCurrentData(result);
  renderHistoryChart(result);
}

export function renderHistoryChart(data) {
  const section = document.getElementById('history-section');
  section.innerHTML = `
    <div id="history-metric-row">
      <button class="hm-btn ${historyMetric==='gdp'?'active':''}" data-hm="gdp">GDP %</button>
      <button class="hm-btn ${historyMetric==='inflation'?'active':''}" data-hm="inflation">INFLATION</button>
      <button class="hm-btn ${historyMetric==='rate'?'active':''}" data-hm="rate">POL. RATE</button>
      <button class="hm-btn ${historyMetric==='fx'?'active':''}" data-hm="fx">FX RATE</button>
      <button class="chart-expand-btn" id="history-expand-btn" title="Expand chart fullscreen">⊞ EXPAND</button>
    </div>
    <div id="history-chart-wrap">
      <svg id="history-chart-svg"></svg>
      <div id="history-tooltip"></div>
    </div>
    <div id="hchart-legend-box" class="hchart-legend"></div>`;

  section.querySelectorAll('.hm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setHistoryMetric(btn.dataset.hm);
      section.querySelectorAll('.hm-btn').forEach(b => b.classList.toggle('active', b.dataset.hm === btn.dataset.hm));
      drawHistoryLine(data);
    });
  });
  document.getElementById('history-expand-btn')?.addEventListener('click', () => {
    const meta = currentCountryMeta;
    // openChartFs not yet extracted — use window bridge
    window.openChartFs?.('history', {
      histData: data,
      title: (meta?.name || 'COUNTRY') + ' — MACRO HISTORY',
      sub: 'GDP · INFLATION · POLICY RATE · FX'
    });
  });
  drawHistoryLine(data);
}

export function drawHistoryLine(data) {
  const wrap = document.getElementById('history-chart-wrap');
  const svgEl = document.getElementById('history-chart-svg');
  const legendBox = document.getElementById('hchart-legend-box');
  if (!svgEl || !data) return;

  const W = (wrap.clientWidth || 280);
  const H = 155;
  const margin = { top: 12, right: 12, bottom: 22, left: 38 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const quarters = data.quarters || [];
  // Use fx_convention from data (if available) to label the FX axis correctly
  const fxConvention = data.fx_convention || '';
  const fxLabel = fxConvention
    ? fxConvention.replace(/^(EUR|GBP|AUD|NZD|CHF)USD$/i, '$1/USD').replace(/^USD(.+)$/i, 'USD/$1').replace(/^DXY$/i, 'DXY Index') || 'FX vs USD'
    : 'FX vs USD';
  const SERIES = {
    gdp:       { label:'GDP Growth %',  color:'#10B981', unit:'%' },
    inflation: { label:'CPI Inflation', color:'#F59E0B', unit:'%' },
    rate:      { label:'Policy Rate',   color:'#22D3EE', unit:'%' },
    fx:        { label: fxLabel,        color:'#60A5FA', unit:''  },
  };
  const active = SERIES[historyMetric];
  if (!active) return;

  const vals = (data[historyMetric] || []).map(Number).filter(isFinite);
  if (vals.length < 2) {
    svgEl.setAttribute('width', W);
    svgEl.setAttribute('height', 40);
    d3.select(svgEl).selectAll('*').remove();
    d3.select(svgEl).append('text').attr('x', W/2).attr('y', 24)
      .attr('text-anchor','middle').attr('font-family','JetBrains Mono,monospace')
      .attr('font-size',10).attr('fill','#64748B').text('No data available');
    return;
  }

  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const pad = ((maxV - minV) * 0.15) || 0.5;
  const lo = minV - pad, hi = maxV + pad;
  const xS = i => margin.left + (i / (vals.length - 1)) * iW;
  const yS = v => margin.top + iH - ((v - lo) / (hi - lo)) * iH;

  const svg = d3.select(svgEl).attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
  svg.selectAll('*').remove();

  // Grid + y-axis labels
  const YTICKS = 4;
  for (let i = 0; i <= YTICKS; i++) {
    const v = lo + (i / YTICKS) * (hi - lo);
    const y = yS(v);
    svg.append('line').attr('x1', margin.left).attr('x2', margin.left + iW)
      .attr('y1', y).attr('y2', y).attr('stroke','rgba(26,37,64,0.9)').attr('stroke-width',1);
    svg.append('text').attr('x', margin.left - 4).attr('y', y + 3)
      .attr('text-anchor','end').attr('font-family','JetBrains Mono,monospace')
      .attr('font-size',7).attr('fill','rgba(100,116,139,0.8)').text(v.toFixed(1));
  }

  // Zero baseline when data crosses zero
  if (minV < 0 && maxV > 0) {
    svg.append('line').attr('x1', margin.left).attr('x2', margin.left + iW)
      .attr('y1', yS(0)).attr('y2', yS(0))
      .attr('stroke','rgba(100,116,139,0.4)').attr('stroke-width',1).attr('stroke-dasharray','3 3');
  }

  // X-axis labels (yearly)
  quarters.forEach((q, i) => {
    if (i % 4 === 0) {
      svg.append('text').attr('x', xS(i)).attr('y', H - 5)
        .attr('text-anchor','middle').attr('font-family','JetBrains Mono,monospace')
        .attr('font-size',7).attr('fill','rgba(100,116,139,0.8)').text(q.split(' ')[1] || q);
    }
  });

  // Area fill
  const areaD = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(v)}`).join(' ')
    + ` L${xS(vals.length-1)},${yS(lo)} L${xS(0)},${yS(lo)} Z`;
  svg.append('path').attr('d', areaD).attr('fill', active.color).attr('fill-opacity', 0.09);

  // Line
  const lineD = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(v)}`).join(' ');
  svg.append('path').attr('d', lineD).attr('fill','none').attr('stroke', active.color)
    .attr('stroke-width',2).attr('stroke-linejoin','round');

  // Dots with tooltip
  const tipEl = document.getElementById('history-tooltip');
  const _bRect = wrap.getBoundingClientRect();
  const _svgRect = svgEl.getBoundingClientRect();
  vals.forEach((v, i) => {
    svg.append('circle').attr('cx', xS(i)).attr('cy', yS(v)).attr('r', 3)
      .attr('fill', active.color).attr('stroke','#0A1220').attr('stroke-width',1.5)
      .style('cursor','pointer')
      .on('mouseover', function(event) {
        const bRect = _bRect;
        const svgRect = _svgRect;
        const tx = xS(i) + (svgRect.left - bRect.left) + 8;
        const ty = yS(v) + (svgRect.top - bRect.top) - 28;
        tipEl.style.display = 'block';
        tipEl.style.left = tx + 'px';
        tipEl.style.top  = ty + 'px';
        tipEl.innerHTML = `<span style="color:var(--text2);">${quarters[i] || ''}</span>&nbsp;&nbsp;<span style="color:${active.color};font-weight:700;">${v.toFixed(2)}${active.unit}</span>`;
      })
      .on('mouseout', () => { tipEl.style.display = 'none'; });
  });

  // Legend
  const srcTag = (() => {
    if (historyMetric === 'gdp'       && data._wbGdp) return ' · <span style="color:#10B981;font-size:9px;">📡 WORLD BANK</span>';
    if (historyMetric === 'inflation' && data._wbCpi) return ' · <span style="color:#10B981;font-size:9px;">📡 WORLD BANK</span>';
    if (historyMetric === 'fx'        && data._yfFx)  return ' · <span style="color:#10B981;font-size:9px;">📡 YF</span>';
    return ' · <span style="color:#F59E0B;font-size:9px;">⚠ AI EST.</span>';
  })();
  legendBox.innerHTML = `<div class="hchart-leg-item"><div class="hchart-leg-dot" style="background:${active.color};"></div>${active.label} · Q1 2020–Q2 2025${srcTag}</div>`;
}

// Window bridges
window.toggleHistoryChart = toggleHistoryChart;
