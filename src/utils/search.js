// search.js — Quick Search overlay
import { META } from '../core/constants.js';
import { searchOpen, setSearchOpen, searchActiveIdx } from '../core/state.js';

// Local state — searchActiveIdx is a live binding, manage locally
let _activeIdx = -1;
let _searchIndex = null;

const QS_ACTIONS = [
  { icon:'🗺️', name:'FX Markets',    sub:'G10 & EM currency heatmap',  tag:'SECTION', action:() => window.openFx?.()          },
  { icon:'⛏️', name:'Commodities',   sub:'Energy, metals, agriculture', tag:'SECTION', action:() => window.openCommodities?.() },
  { icon:'📚', name:'Research Hub',  sub:'Goldman Sachs, JPMorgan, IMF…',tag:'SECTION', action:() => window.openResearch?.()   },
  { icon:'💬', name:'Community',     sub:'Macro community board',        tag:'SECTION', action:() => window.openCommunity?.()  },
  { icon:'📅', name:'Economic Calendar',sub:'Upcoming macro events',     tag:'SECTION', action:() => window.openCalendar?.()   },
  { icon:'⊕', name:'Custom Analysis',sub:'Build multi-theme analysis',   tag:'SECTION', action:() => window.openCustomAnalysis?.() },
  { icon:'👤', name:'Profile & Digest',sub:'Settings, digest, opportunities',tag:'SECTION', action:() => window.openProfile?.() },
];

function _escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

function _buildSearchIndex() {
  const items = [];
  Object.entries(META || {}).forEach(([id, m]) => {
    items.push({ icon: m.flag || '🌐', name: m.name, sub: `${m.currency} · ${m.region}`, tag:'COUNTRY',
      action: () => { closeSearch(); window.selectCountry?.({ id: +id }); } });
  });
  const fxKeys = ['EUR','GBP','JPY','CHF','AUD','NZD','CAD','SEK','NOK','CNY','INR','KRW','BRL','MXN','ZAR','TRY'];
  fxKeys.forEach(sym => {
    items.push({ icon:'💱', name: sym + '/USD', sub:'FX pair', tag:'FX',
      action: () => { closeSearch(); window.openFx?.(); } });
  });
  const commKeys = ['GOLD','SILVER','WTI','BRENT','NATGAS','COPPER','CORN','WHEAT','SOYB','COFFEE','SUGAR'];
  commKeys.forEach(sym => {
    items.push({ icon:'📦', name: sym, sub:'Commodity', tag:'COMMODITY',
      action: () => { closeSearch(); window.openCommodities?.(); } });
  });
  return items;
}

export function openSearch() {
  setSearchOpen(true);
  if (!_searchIndex) _searchIndex = _buildSearchIndex();
  document.getElementById('quick-search-overlay').classList.add('open');
  const inp = document.getElementById('quick-search-input');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 50); }
  performSearch('');
}

export function closeSearch() {
  setSearchOpen(false);
  document.getElementById('quick-search-overlay').classList.remove('open');
  _activeIdx = -1;
}

export function performSearch(q) {
  const res = document.getElementById('quick-search-results');
  if (!res) return;
  _activeIdx = -1;
  q = q.trim().toLowerCase();
  let items = [];
  if (!q) {
    items = QS_ACTIONS.map(a => ({ ...a, isAction: true }));
  } else {
    const idx = _searchIndex || (_searchIndex = _buildSearchIndex());
    items = idx.filter(it =>
      it.name.toLowerCase().includes(q) || (it.sub && it.sub.toLowerCase().includes(q))
    ).slice(0, 12);
  }
  if (!items.length) {
    res.innerHTML = '<div id="quick-search-empty">No results found.</div>';
    return;
  }
  const groups = {};
  items.forEach(it => { if (!groups[it.tag]) groups[it.tag] = []; groups[it.tag].push(it); });
  let html = '';
  Object.entries(groups).forEach(([tag, grpItems]) => {
    if (!q) html += `<div class="qs-section">${tag}</div>`;
    grpItems.forEach((it) => {
      html += `<div class="qs-item" data-idx="${items.indexOf(it)}" onclick="qsSelect(${items.indexOf(it)})">
        <span class="qs-item-icon">${it.icon}</span>
        <div class="qs-item-main">
          <div class="qs-item-name">${_escHtml(it.name)}</div>
          <div class="qs-item-sub">${_escHtml(it.sub||'')}</div>
        </div>
        <span class="qs-item-tag">${it.tag}</span>
      </div>`;
    });
  });
  res.innerHTML = html;
  res._items = items;
}

export function qsSelect(idx) {
  const res = document.getElementById('quick-search-results');
  const items = res?._items;
  if (!items || !items[idx]) return;
  items[idx].action?.();
  closeSearch();
}

export function handleSearchKey(e) {
  const res = document.getElementById('quick-search-results');
  const items = res?._items || [];
  const rows = res?.querySelectorAll('.qs-item') || [];
  if (e.key === 'Escape') { closeSearch(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _activeIdx = Math.min(_activeIdx + 1, rows.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _activeIdx = Math.max(_activeIdx - 1, 0);
  } else if (e.key === 'Enter') {
    if (_activeIdx >= 0) qsSelect(_activeIdx);
    return;
  } else { return; }
  rows.forEach((r, i) => r.classList.toggle('qs-active', i === _activeIdx));
  rows[_activeIdx]?.scrollIntoView({ block: 'nearest' });
}

// Window bridges
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.performSearch = performSearch;
window.qsSelect = qsSelect;
window.handleSearchKey = handleSearchKey;
