// map/map.js — D3 world map: init, tooltip, country select, panel open/close
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {
  META, AUTHORITY_INFO, CACHE_TTL, cacheTs,
} from '../core/constants.js';
import {
  cache, newsCache,
  activeId, setActiveId,
  currentCountryMeta, setCurrentCountryMeta,
  langNative, setLangNative,
  newsOpen, setNewsOpen,
  authorityOpen, setAuthorityOpen,
  historyOpen, setHistoryOpen,
  historyCurrentData, setHistoryCurrentData,
  socialOpen, socialScope, setSocialScope,
  _sentimentInFlight, _newsInFlight,
  setWorldData, setProjection, setPath,
  projection, path,
} from '../core/state.js';
import { loadSession, requireAuth } from '../auth/auth.js';
import { fetchSentiment } from '../api/sentiment.js';

// ── Cached element refs (avoids getElementById in hot paths) ──────────────────
const _tt       = document.getElementById('tooltip');
const _ttFlag   = document.getElementById('tt-flag');
const _ttName   = document.getElementById('tt-name');
const _ttRegion = document.getElementById('tt-region');
const _ttSent   = document.getElementById('tt-sent');
const _ttScore  = document.getElementById('tt-score');
const _ttAct    = document.getElementById('tt-action');

const _elPanel       = document.getElementById('panel');
const _elPFlag       = document.getElementById('p-flag');
const _elPName       = document.getElementById('p-name');
const _elPMeta       = document.getElementById('p-meta');
const _elLangBtn     = document.getElementById('lang-btn');
const _elNativeNote  = document.getElementById('native-note');
const _elAuthLabel   = document.getElementById('auth-label');
const _elExName      = document.getElementById('ex-name');
const _elExMeta      = document.getElementById('ex-meta');
const _elExCard      = document.getElementById('exchange-card');
const _elAuthArrow   = document.getElementById('auth-arrow');
const _elAuthList    = document.getElementById('auth-list');
const _elHistArrow   = document.getElementById('history-arrow');
const _elNewsArrow   = document.getElementById('news-arrow');
const _elNewsList    = document.getElementById('news-list');
const _elNewsLabel   = document.getElementById('news-label');

// Panel sentiment display refs
const _elSentBadge  = document.getElementById('sent-badge');
const _elRegimePill = document.getElementById('regime-pill');
const _elSbar       = document.getElementById('sbar');
const _elScoreText  = document.getElementById('score-text');
const _elRationale  = document.getElementById('rationale');
const _elCEq        = document.getElementById('c-eq');
const _elCRt        = document.getElementById('c-rt');
const _elCFx        = document.getElementById('c-fx');
const _elCRk        = document.getElementById('c-rk');
const _elCCy        = document.getElementById('c-cy');
const _elCKr        = document.getElementById('c-kr');

// ── Map init ─────────────────────────────────────────────────────────────────

export async function initMap() {
  const svg  = d3.select('#map-svg');
  const wrap = document.getElementById('map-wrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  svg.attr('width', W).attr('height', H);

  const defs = svg.append('defs');

  const oceanGrad = defs.append('radialGradient')
    .attr('id','oceanGradient').attr('cx','50%').attr('cy','50%').attr('r','70%');
  oceanGrad.append('stop').attr('offset','0%').attr('stop-color','#0F1E3D');
  oceanGrad.append('stop').attr('offset','60%').attr('stop-color','#081428');
  oceanGrad.append('stop').attr('offset','100%').attr('stop-color','#030712');

  const landGrad = defs.append('linearGradient')
    .attr('id','landGradient').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
  landGrad.append('stop').attr('offset','0%').attr('stop-color','#2A3858');
  landGrad.append('stop').attr('offset','100%').attr('stop-color','#1A243C');

  const bullGrad = defs.append('linearGradient')
    .attr('id','bullGradient').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
  bullGrad.append('stop').attr('offset','0%').attr('stop-color','#10B981');
  bullGrad.append('stop').attr('offset','100%').attr('stop-color','#065F46');

  const bearGrad = defs.append('linearGradient')
    .attr('id','bearGradient').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
  bearGrad.append('stop').attr('offset','0%').attr('stop-color','#EF4444');
  bearGrad.append('stop').attr('offset','100%').attr('stop-color','#7F1D1D');

  const neutGrad = defs.append('linearGradient')
    .attr('id','neutGradient').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
  neutGrad.append('stop').attr('offset','0%').attr('stop-color','#64748B');
  neutGrad.append('stop').attr('offset','100%').attr('stop-color','#334155');

  const proj = d3.geoEquirectangular().fitSize([W, H], {type:'Sphere'});
  setProjection(proj);
  const p = d3.geoPath().projection(proj);
  setPath(p);

  const graticule = d3.geoGraticule()();
  const sphere    = {type:'Sphere'};

  let world;
  const mapLoader = document.getElementById('map-loading');
  try {
    try {
      world = await d3.json('/data/countries-110m.json');
    } catch(_) {
      world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    }
  } catch(fetchErr) {
    if (mapLoader) {
      mapLoader.innerHTML = '<div style="color:#ef4444;font-family:monospace;font-size:12px;padding:16px;text-align:center;">MAP DATA UNAVAILABLE<br><span style="color:#666;font-size:10px;">Check network connection</span></div>';
      mapLoader.classList.add('hidden');
      setTimeout(() => mapLoader.remove(), 450);
    }
    console.error('[initMap] Failed to load world atlas:', fetchErr);
    return;
  }
  setWorldData(world);

  if (mapLoader) {
    mapLoader.classList.add('hidden');
    setTimeout(() => mapLoader.remove(), 450);
  }

  const countries = topojson.feature(world, world.objects.countries);
  const borders   = topojson.mesh(world, world.objects.countries, (a,b) => a !== b);

  const g = svg.append('g').attr('class','map-group');
  g.append('path').datum(sphere).attr('class','sphere').attr('d', p);
  g.append('path').datum(graticule).attr('class','graticule').attr('d', p);

  g.selectAll('.country')
    .data(countries.features)
    .join('path')
    .attr('class','country default')
    .attr('id', d => 'c' + d.id)
    .attr('d', p)
    .on('mousemove', onCountryHover)
    .on('mouseleave', onCountryLeave)
    .on('click', (event, d) => selectCountry(d));

  g.append('path').datum(borders).attr('class','borders').attr('d', p);
  g.append('path').datum(sphere).attr('class','outline').attr('d', p);

  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const W2 = wrap.clientWidth, H2 = wrap.clientHeight;
      svg.attr('width', W2).attr('height', H2);
      proj.fitSize([W2, H2], {type:'Sphere'});
      g.selectAll('path').attr('d', p);
    }, 200);
  });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function getMeta(d) {
  const id = String(d.id).padStart(3,'0');
  return META[id] || META[String(d.id)] || null;
}

let _ttVisible    = false;
let _tipRafPending = false;
let _tipLastEvent  = null;
let _tipLastId     = null;

function onCountryHover(event, d) {
  const meta = getMeta(d);
  if (!meta) return;

  const key = 'c' + d.id;
  if (key !== _tipLastId) {
    _tipLastId = key;
    _ttFlag.textContent   = meta.flag || '';
    _ttName.textContent   = meta.name;
    _ttRegion.textContent = meta.region + ' · ' + meta.currency;

    const cached = cache[key];
    const icons  = {bullish:'▲ BULLISH', bearish:'▼ BEARISH', neutral:'◆ NEUTRAL'};
    if (cached) {
      _ttSent.style.display  = 'block';
      _ttSent.className      = 'tt-sentiment tt-' + cached.sentiment;
      _ttSent.textContent    = icons[cached.sentiment] || cached.sentiment.toUpperCase();
      _ttScore.style.display = 'block';
      _ttScore.textContent   = `Score: ${cached.score > 0 ? '+' : ''}${parseFloat(cached.score).toFixed(2)}  ·  ${cached.regime}`;
      _ttAct.textContent     = 'CLICK TO VIEW DETAIL';
    } else {
      _ttSent.style.display  = 'none';
      _ttScore.style.display = 'none';
      _ttAct.textContent     = 'CLICK TO ANALYSE';
    }
    _tt.style.display = 'block';
    _ttVisible = true;
  }

  _tipLastEvent = event;
  if (!_tipRafPending) {
    _tipRafPending = true;
    requestAnimationFrame(() => {
      if (_tipLastEvent) moveTip(_tipLastEvent);
      _tipRafPending = false;
    });
  }
}

function moveTip(event) {
  const mw = window.innerWidth, mh = window.innerHeight;
  let x = event.clientX + 16, y = event.clientY + 16;
  if (x + 200 > mw) x = event.clientX - 200;
  if (y + 140 > mh) y = event.clientY - 140;
  _tt.style.left = x + 'px';
  _tt.style.top  = y + 'px';
}

document.getElementById('map-svg')?.addEventListener('mousemove', e => {
  if (!_ttVisible || _tipRafPending) return;
  _tipLastEvent = e;
});

function onCountryLeave() {
  _tt.style.display = 'none';
  _ttVisible = false;
  _tipLastId = null;
}

// ── Country selection ─────────────────────────────────────────────────────────

export function selectCountry(d) {
  const meta = getMeta(d);
  if (!meta) return;
  if (!loadSession()?.username) {
    requireAuth(() => selectCountry(d), `Sign in to analyse ${meta.name}`);
    return;
  }

  if (meta?.name) document.title = `${meta.name} — Meridiax`;

  const isoId = String(d.id).padStart(3, '0');
  meta._id = isoId;
  const key  = 'c' + d.id;

  if (activeId && activeId !== key) {
    d3.select('#' + activeId).classed('active', false);
  }
  setActiveId(key);
  d3.select('#' + key).classed('active', true);

  _elPanel.classList.add('open');
  const _pwCard = document.getElementById('panel-welcome');
  if (_pwCard && !cache[key]) _pwCard.style.display = 'block';

  _elPFlag.textContent = meta.flag || '🌍';
  _elPName.textContent = meta.name;
  _elPMeta.textContent = meta.region + ' · ' + meta.currency + ' · ' + meta.index;

  const authInfo = AUTHORITY_INFO[isoId];
  const lang = authInfo?.lang || 'English';
  _elLangBtn.textContent = '🌐 EN';
  _elLangBtn.className = '';
  _elLangBtn.style.display = lang === 'English' ? 'none' : 'block';
  setLangNative(false);
  _elNativeNote.className = '';
  _elNativeNote.textContent = '';

  const authDisplay = authInfo ? authInfo.authority.split('&')[0].trim() : meta.name + ' Central Bank';
  _elAuthLabel.textContent = `📋  ${authDisplay} publications`;

  if (meta.index && meta.index !== '—') {
    _elExName.textContent = meta.index;
    _elExMeta.textContent = `${meta.currency} · Click to browse constituents`;
    _elExCard.style.opacity = '1';
    _elExCard.style.pointerEvents = 'auto';
  } else {
    _elExName.textContent = 'No major exchange';
    _elExMeta.textContent = 'Data unavailable';
    _elExCard.style.opacity = '0.5';
    _elExCard.style.pointerEvents = 'none';
  }

  setCurrentCountryMeta(meta);
  window.updateWatchlistCountryBtn?.();

  setAuthorityOpen(false);
  _elAuthArrow.className = '';
  _elAuthList.className  = '';
  _elAuthList.innerHTML  = '';

  setHistoryOpen(false);
  setHistoryCurrentData(null);
  _elHistArrow.className = '';
  const histSec = document.getElementById('history-section');
  if (histSec) { histSec.className = ''; histSec.innerHTML = ''; }

  setNewsOpen(false);
  _elNewsArrow.className = '';
  _elNewsList.className  = '';
  _elNewsList.innerHTML  = '';
  _elNewsLabel.textContent = '📰  Load latest headlines';

  const _elSocCountryBtn = document.getElementById('soc-country-btn');
  if (_elSocCountryBtn) {
    _elSocCountryBtn.textContent     = meta.name.toUpperCase();
    _elSocCountryBtn.style.display   = 'block';
    _elSocCountryBtn.dataset.scope   = 'country';
  }
  if (socialScope === 'country') {
    setSocialScope('global');
    document.querySelectorAll('.soc-scope-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === 'global'));
    if (socialOpen) window.loadSocialSentiment?.();
  }

  if (!newsCache[key] && !_newsInFlight.has(key)) {
    setTimeout(() => window.loadNewsBackground?.(key, meta), 500);
  }

  if (cache[key]) {
    window.renderPanel?.(cache[key]);
    const age = Date.now() - (cacheTs[key] || 0);
    if (age > CACHE_TTL.sentiment && !_sentimentInFlight.has(key)) fetchSentiment(key, meta, true);
  } else {
    setLoading();
    fetchSentiment(key, meta);
  }
}

export function closePanel() {
  _elPanel.classList.remove('open');
  if (activeId) {
    d3.select('#' + activeId).classed('active', false);
    setActiveId(null);
  }
}

window.closePanel = closePanel;

// ── Panel loading state ───────────────────────────────────────────────────────

export function setLoading() {
  _elSentBadge.className    = 'loading';
  _elSentBadge.innerHTML    = '<span class="spin"></span> &nbsp;ANALYSING';
  _elRegimePill.innerHTML   = '';
  _elRationale.textContent  = 'Querying AI model...';
  _elSbar.style.width       = '50%';
  _elSbar.style.background  = 'var(--neut)';
  _elScoreText.textContent  = 'Score: —';
  for (const el of [_elCEq,_elCRt,_elCFx,_elCRk,_elCCy,_elCKr]) {
    el.textContent = '—'; el.className = 'chip-val';
  }
}
