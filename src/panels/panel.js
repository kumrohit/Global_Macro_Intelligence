// panels/panel.js — renderPanel (country sentiment display) + updateCount
import { cache } from '../core/state.js';

// Cached element refs shared with map.js — re-queried here since panel.js loads independently
const _elSentBadge  = () => document.getElementById('sent-badge');
const _elRegimePill = () => document.getElementById('regime-pill');
const _elSbar       = () => document.getElementById('sbar');
const _elRationale  = () => document.getElementById('rationale');
const _elCEq        = () => document.getElementById('c-eq');
const _elCRt        = () => document.getElementById('c-rt');
const _elCFx        = () => document.getElementById('c-fx');
const _elCRk        = () => document.getElementById('c-rk');
const _elCCy        = () => document.getElementById('c-cy');
const _elCKr        = () => document.getElementById('c-kr');

export function renderPanel(data) {
  const welcome = document.getElementById('panel-welcome');
  if (welcome) welcome.style.display = 'none';
  const hint = document.getElementById('map-hint');
  if (hint) hint.style.display = 'none';

  const rawSent  = (data.sentiment || '').toLowerCase().trim();
  const sentiment = ['bullish','bearish','neutral'].includes(rawSent) ? rawSent : 'neutral';

  const sentBadge = _elSentBadge();
  sentBadge.className = sentiment;
  const icons = { bullish:'▲ BULLISH', bearish:'▼ BEARISH', neutral:'◆ NEUTRAL' };
  sentBadge.textContent = icons[sentiment];

  const rc = { Goldilocks:'rp-goldilocks', Reflation:'rp-reflation', Stagflation:'rp-stagflation', Recession:'rp-recession' };
  const liveBadge = data._grounded
    ? `<span style="font-family:var(--font-mono);font-size:8px;letter-spacing:0.08em;padding:1px 5px;border-radius:2px;background:rgba(0,212,255,0.12);color:var(--cyan);border:1px solid rgba(0,212,255,0.28);margin-left:6px;vertical-align:middle;">⚡ LIVE</span>`
    : '';
  _elRegimePill().innerHTML =
    `<span class="regime-pill ${rc[data.regime]||'rp-goldilocks'}">${data.regime || '—'}</span>${liveBadge}`;

  const score    = parseFloat(data.score)      || 0;
  const _rawLow  = parseFloat(data.score_low);
  const _rawHigh = parseFloat(data.score_high);
  const scoreLow = Math.max(-1, Math.min(score, isNaN(_rawLow)  ? (score - 0.15) : _rawLow));
  const scoreHi  = Math.min( 1, Math.max(score, isNaN(_rawHigh) ? (score + 0.15) : _rawHigh));
  const pct      = Math.round(((score + 1) / 2) * 100);
  const pctLow   = Math.round(((Math.max(-1, scoreLow) + 1) / 2) * 100);
  const pctHi    = Math.round(((Math.min(1,  scoreHi)  + 1) / 2) * 100);

  const sbar = _elSbar();
  sbar.style.width      = pct + '%';
  sbar.style.background = score > 0.1 ? 'var(--bull)' : score < -0.1 ? 'var(--bear)' : 'var(--neut)';

  const rangeEl = document.getElementById('sbar-range');
  if (rangeEl && data.score_low != null) {
    rangeEl.style.display = 'block';
    rangeEl.style.left    = pctLow + '%';
    rangeEl.style.width   = (pctHi - pctLow) + '%';
  } else if (rangeEl) {
    rangeEl.style.display = 'none';
  }

  const conf     = data.confidence || '';
  const confHtml = conf ? `<span class="conf-badge ${conf}">${conf.toUpperCase()} CONF</span>` : '';
  const adjHtml  = data._score_adjusted
    ? `<span style="font-family:var(--font-mono);font-size:7px;letter-spacing:0.08em;padding:1px 4px;border-radius:2px;background:rgba(251,191,36,0.12);color:#FBB724;border:1px solid rgba(251,191,36,0.28);margin-left:5px;vertical-align:middle;" title="Score blended with factor-derived composite to correct LLM arithmetic deviation">FC ADJ</span>`
    : '';
  const scoreSign = score >= 0 ? '+' : '';
  document.getElementById('score-text').innerHTML =
    `Score: ${scoreSign}${score.toFixed(2)}${confHtml}${adjHtml}`;

  const shiftEl = document.getElementById('regime-shift-banner');
  if (shiftEl) {
    if (data._regime_shift) {
      const arrow   = data._prev_sentiment === 'bullish' ? '▼' : data._prev_sentiment === 'bearish' ? '▲' : '◆';
      const scoreChg = score - (data._prev_score || 0);
      shiftEl.innerHTML = `<span style="color:#F59E0B;">⚠ SHIFT</span>&nbsp;&nbsp;${(data._prev_regime||'').toUpperCase()} → ${(data.regime||'').toUpperCase()}&nbsp;&nbsp;|&nbsp;&nbsp;${arrow} ${(data._prev_sentiment||'').toUpperCase()} → ${(data.sentiment||'').toUpperCase()}&nbsp;&nbsp;(${scoreChg >= 0 ? '+' : ''}${scoreChg.toFixed(2)})`;
      shiftEl.classList.add('visible');
    } else {
      shiftEl.classList.remove('visible');
    }
  }

  const freshEl = document.getElementById('data-freshness-badge');
  if (freshEl) freshEl.classList.toggle('visible', !!data._econ_grounded);

  _elRationale().textContent = data.rationale || '—';

  const factorSection = document.getElementById('factor-section');
  const factorGrid    = document.getElementById('factor-grid');
  if (data.factors && typeof data.factors === 'object' && factorSection && factorGrid) {
    const factorLabels = { growth:'GROWTH', inflation:'INFLTN', monetary:'POLICY', fx:'FX', geopolitical:'GEOPOL', market:'MARKET' };
    factorGrid.innerHTML = Object.entries(factorLabels).map(([key, label]) => {
      const val        = parseFloat(data.factors[key]) || 0;
      const cv         = Math.max(-1, Math.min(1, val));
      const color      = cv > 0.1 ? 'var(--bull)' : cv < -0.1 ? 'var(--bear)' : 'var(--neut)';
      const barLeft    = cv >= 0 ? 50 : Math.round(((cv + 1) / 2) * 100);
      const barWidth   = Math.round(Math.abs(cv) * 50);
      const sign       = cv >= 0 ? '+' : '';
      return `<div class="factor-row">
        <span class="factor-label">${label}</span>
        <div class="factor-bar-track">
          <div class="factor-bar-fill" style="left:${barLeft}%;width:${barWidth}%;background:${color};"></div>
        </div>
        <span class="factor-val" style="color:${color};">${sign}${cv.toFixed(2)}</span>
      </div>`;
    }).join('');
    factorSection.style.display = 'block';
  } else if (factorSection) {
    factorSection.style.display = 'none';
  }

  const ceq = _elCEq();
  ceq.textContent = data.equity_bias || '—';
  ceq.className   = 'chip-val' + (data.equity_bias === 'Overweight' ? ' cv-up' : data.equity_bias === 'Underweight' ? ' cv-dn' : '');

  const crt = _elCRt();
  const rateArrow = data.rate_outlook === 'Hiking' ? ' ▲' : data.rate_outlook === 'Cutting' ? ' ▼' : data.rate_outlook === 'Holding' ? ' ◆' : '';
  crt.textContent = (data.rate_outlook || '—') + rateArrow;
  crt.className   = 'chip-val' + (data.rate_outlook === 'Cutting' ? ' cv-up' : data.rate_outlook === 'Hiking' ? ' cv-dn' : '');

  const cfx = _elCFx();
  const fxArrow = data.fx_bias === 'Strengthen' ? ' ▲' : data.fx_bias === 'Weaken' ? ' ▼' : '';
  cfx.textContent = (data.fx_bias || '—') + fxArrow;
  cfx.className   = 'chip-val' + (data.fx_bias === 'Strengthen' ? ' cv-up' : data.fx_bias === 'Weaken' ? ' cv-dn' : '');

  const crk = _elCRk();
  crk.textContent = data.risk_level || '—';
  crk.className   = 'chip-val' + (['High','Very High'].includes(data.risk_level) ? ' cv-dn' : data.risk_level === 'Low' ? ' cv-up' : '');

  _elCCy().textContent = data._meta ? data._meta.currency : '—';
  _elCKr().textContent = data.key_risk || '—';
}

export function updateCount() {
  const el = document.getElementById('analysed-inline');
  if (el) el.textContent = `${Object.keys(cache).length} analysed`;
}

window.renderPanel = renderPanel;
window.updateCount = updateCount;
