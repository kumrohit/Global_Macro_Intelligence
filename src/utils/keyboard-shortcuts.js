// keyboard-shortcuts.js — event wiring hub
// Imports all needed modules and wires DOM events.
import {
  currentCountryMeta,
  socialOpen, socialScope, socialCache,
  calOpen, chartFsOpen,
  deepOpen, caOpen, researchOpen,
  fxOpen, commodOpen, commOpen,
  profileOpen, watchlistOpen,
  shortcutsOpen, searchOpen,
} from '../core/state.js';
import { REGION_TOP } from '../core/constants.js';
import { openSearch, closeSearch } from './search.js';
import { toggleSocialPanel, closeSocialPanel, loadSocialSentiment, wireSocialScope } from './social.js';
import { toggleHistoryChart } from './history-chart.js';
import { toggleWatchlist, closeWatchlist, addWatchlistItem, addCurrentCountryToWatchlist } from '../panels/watchlist.js';
import { openDeepAnalysis, closeDeepAnalysis, setDeepTab } from '../panels/deep-analysis.js';
import { openCustomAnalysis, closeCustomAnalysis, addCustomTag, runCustomAnalysis } from '../panels/custom-analysis.js';
import { toggleLanguage } from './language.js';

// ── Keyboard Shortcuts Panel ──
export function openShortcuts() {
  // shortcutsOpen is a live binding — set via DOM manipulation
  document.getElementById('shortcuts-panel')?.classList.add('open');
  window._shortcutsOpen = true;
}
export function closeShortcuts() {
  document.getElementById('shortcuts-panel')?.classList.remove('open');
  window._shortcutsOpen = false;
}
export function toggleShortcuts() {
  window._shortcutsOpen ? closeShortcuts() : openShortcuts();
}

// EVENT LISTENERS (attached programmatically to avoid scope issues)
export function wireEventListeners() {
  // Panel close
  const pClose = document.getElementById('p-close');
  if (pClose) pClose.addEventListener('click', () => window.closePanel?.());

  // Exchange card -> open stocks
  const exCard = document.getElementById('exchange-card');
  if (exCard) exCard.addEventListener('click', () => window.openStocks?.());

  // Stocks modal close
  const shClose = document.getElementById('sh-close-btn');
  if (shClose) shClose.addEventListener('click', () => window.closeStocks?.());
  const backdrop = document.getElementById('stocks-backdrop');
  if (backdrop) backdrop.addEventListener('click', () => window.closeStocks?.());

  // Stock detail back button
  const sdpBack = document.getElementById('sdp-back');
  if (sdpBack) sdpBack.addEventListener('click', () => window.closeStockDetail?.());

  // Search filter
  const filter = document.getElementById('st-filter');
  let _stFilterTimer = null;
  if (filter) filter.addEventListener('input', () => {
    clearTimeout(_stFilterTimer);
    _stFilterTimer = setTimeout(() => window.renderStocks?.(), 200);
  });

  // Sector tabs
  document.querySelectorAll('.st-tab').forEach(tab => {
    tab.addEventListener('click', () => window.filterSector?.(tab.dataset.sector));
  });

  // News toggle
  const nt = document.getElementById('news-toggle');
  if (nt) nt.addEventListener('click', () => window.toggleNews?.());

  // Authority publications toggle
  const at = document.getElementById('auth-toggle');
  if (at) at.addEventListener('click', () => window.toggleAuthority?.());

  // Language toggle
  const lb = document.getElementById('lang-btn');
  if (lb) lb.addEventListener('click', toggleLanguage);

  // Social media panel — floating tab
  const socTab = document.getElementById('social-tab');
  if (socTab) socTab.addEventListener('click', toggleSocialPanel);

  // Social panel close
  const socClose = document.getElementById('social-close-btn');
  if (socClose) socClose.addEventListener('click', closeSocialPanel);

  // Social panel scope buttons
  document.querySelectorAll('.soc-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => wireSocialScope(btn.dataset.scope));
  });

  // Social refresh
  const socRefresh = document.getElementById('soc-refresh-btn');
  if (socRefresh) socRefresh.addEventListener('click', () => {
    const cacheKey = socialScope === 'country' && currentCountryMeta
      ? currentCountryMeta.name + ' financial markets'
      : 'global financial markets';
    delete socialCache[cacheKey];
    loadSocialSentiment();
  });

  // Zoom buttons
  document.querySelectorAll('.zbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (action === 'in')    window.zoomBy?.(1.5);
      if (action === 'out')   window.zoomBy?.(0.667);
      if (action === 'reset') window.resetZoom?.();
    });
  });

  // Region jump buttons — click to jump, hover to prefetch top countries
  document.querySelectorAll('.rj-btn').forEach(btn => {
    btn.addEventListener('click', () => window.jumpTo?.(btn.dataset.region));
    let _rjPrefetchTimer = null;
    btn.addEventListener('mouseenter', () => {
      _rjPrefetchTimer = setTimeout(() => {
        const isoList = REGION_TOP[btn.dataset.region] || [];
        isoList.forEach(iso => {
          const key = 'c' + parseInt(iso, 10);
          if (!window._cache?.[key] && !window._sentimentInFlight?.has(key)) {
            const meta = window._META?.[iso];
            if (meta) window.fetchSentiment?.(key, meta, true);
          }
        });
      }, 300);
    });
    btn.addEventListener('mouseleave', () => clearTimeout(_rjPrefetchTimer));
  });

  // Country mode selector buttons
  document.querySelectorAll('.cmode-btn').forEach(btn => {
    btn.addEventListener('click', () => window.setCountryMode?.(btn.dataset.mode));
  });

  // Deep analysis button (panel)
  const deepBtn = document.getElementById('deep-analysis-btn');
  if (deepBtn) deepBtn.addEventListener('click', openDeepAnalysis);

  // Deep analysis overlay close
  const deepClose = document.getElementById('deep-close-btn');
  if (deepClose) deepClose.addEventListener('click', closeDeepAnalysis);

  // Deep analysis overlay — click backdrop to close
  const deepOverlay = document.getElementById('deep-overlay');
  if (deepOverlay) deepOverlay.addEventListener('click', e => {
    if (e.target === deepOverlay) closeDeepAnalysis();
  });

  // Deep analysis tabs
  document.querySelectorAll('.deep-tab').forEach(tab => {
    tab.addEventListener('click', () => setDeepTab(tab.dataset.tab));
  });

  // History chart toggle
  const histToggle = document.getElementById('history-toggle');
  if (histToggle) histToggle.addEventListener('click', toggleHistoryChart);

  // Social filter input — clear cache and reload on change (debounced)
  const socFilterInput = document.getElementById('soc-filter-input');
  if (socFilterInput) {
    let socFilterTimer = null;
    socFilterInput.addEventListener('input', () => {
      clearTimeout(socFilterTimer);
      socFilterTimer = setTimeout(() => {
        const newFilter = socFilterInput.value.trim();
        // socialFilter is not directly settable — use module-level state via import
        // We store it in a module-local variable and re-use the window bridge
        const currentSocialFilter = window._socialFilter || '';
        if (newFilter !== currentSocialFilter) {
          window._socialFilter = newFilter;
          // Update the exported state by calling setter if available
          if (window._setSocialFilter) window._setSocialFilter(newFilter);
          const filterText = newFilter ? ` — focusing on: ${newFilter}` : '';
          const target = (socialScope === 'country' && currentCountryMeta
            ? currentCountryMeta.name + ' financial markets'
            : 'global financial markets') + filterText;
          if (!socialCache[target] && socialOpen) loadSocialSentiment();
        }
      }, 600);
    });
  }

  // Watchlist floating tab
  const wlTab = document.getElementById('watchlist-tab');
  if (wlTab) wlTab.addEventListener('click', toggleWatchlist);

  // Watchlist close
  const wlClose = document.getElementById('wl-close-btn');
  if (wlClose) wlClose.addEventListener('click', closeWatchlist);

  // Watchlist add button
  const wlAddBtn = document.getElementById('wl-add-btn');
  if (wlAddBtn) wlAddBtn.addEventListener('click', () => {
    const v = document.getElementById('wl-search-input')?.value;
    if (v) addWatchlistItem(v);
  });

  // Watchlist search input — Enter key
  const wlInput = document.getElementById('wl-search-input');
  if (wlInput) wlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && wlInput.value.trim()) addWatchlistItem(wlInput.value);
  });

  // Watchlist "Add current country" button (in watchlist panel)
  const elWlAddCountryBtn = document.getElementById('wl-add-country-btn');
  if (elWlAddCountryBtn) elWlAddCountryBtn.addEventListener('click', addCurrentCountryToWatchlist);

  // "Add to watchlist" button in side panel
  const elAddToWatchlistBtn = document.getElementById('add-to-watchlist-btn');
  if (elAddToWatchlistBtn) elAddToWatchlistBtn.addEventListener('click', addCurrentCountryToWatchlist);

  // Custom analysis topbar button
  const caBtn = document.getElementById('ca-topbar-btn');
  if (caBtn) caBtn.addEventListener('click', openCustomAnalysis);

  // Custom analysis close
  const caClose = document.getElementById('ca-close-btn');
  if (caClose) caClose.addEventListener('click', closeCustomAnalysis);

  // CA overlay backdrop click to close
  const caOverlay = document.getElementById('ca-overlay');
  if (caOverlay) caOverlay.addEventListener('click', e => {
    if (e.target === caOverlay) closeCustomAnalysis();
  });

  // CA tag input — Enter to add
  const caTagInput = document.getElementById('ca-tag-input');
  if (caTagInput) {
    caTagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { addCustomTag(caTagInput.value); }
    });
  }

  // CA add tag button
  const caAddTag = document.getElementById('ca-add-tag-btn');
  if (caAddTag) caAddTag.addEventListener('click', () => {
    addCustomTag(document.getElementById('ca-tag-input')?.value || '');
  });

  // CA run button
  const caRunBtn = document.getElementById('ca-run-btn');
  if (caRunBtn) caRunBtn.addEventListener('click', runCustomAnalysis);

  // CA suggestion chips
  document.querySelectorAll('.ca-tag-suggestion').forEach(chip => {
    chip.addEventListener('click', () => addCustomTag(chip.dataset.tag));
  });

  // ESC to close overlays in z-index priority order (highest first)
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    const inInput = (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable);

    // Global shortcuts (only when not typing in an input)
    if (!inInput) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchOpen ? closeSearch() : openSearch(); return; }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); searchOpen ? closeSearch() : openSearch(); return; }
      if (e.key === '?') { toggleShortcuts(); return; }
      if (searchOpen) { /* let search handle its own keys */ return; }
      if (e.key === 'f' || e.key === 'F') { window.openFx?.(); return; }
      if (e.key === 'x' || e.key === 'X') { window.openCommodities?.(); return; }
      if (e.key === 'r' || e.key === 'R') { window.openResearch?.(); return; }
      if (e.key === 'e' || e.key === 'E') { window.openCalendar?.(); return; }
      if (e.key === 'b' || e.key === 'B') { window.openCommunity?.(); return; }
      if (e.key === 'p' || e.key === 'P') { window.openProfile?.(); return; }
      if (e.key === 'a' || e.key === 'A') { openCustomAnalysis?.(); return; }
    }

    if (e.key === 'Escape') {
      if (searchOpen) { closeSearch(); return; }
      if (calOpen) { window.closeCalendar?.(); return; }
      if (window._shortcutsOpen) { closeShortcuts(); return; }
      if (document.getElementById('apikey-gate-overlay')?.classList.contains('open')) { window.closeApiKeyGate?.(); return; }
      if (document.getElementById('contact-overlay')?.classList.contains('open')) { window.closeContact?.(); return; }
      if (document.getElementById('about-overlay')?.classList.contains('open')) { window.closeAbout?.(); return; }
      if (chartFsOpen) window.closeChartFs?.();
      else if (document.getElementById('stock-detail')?.classList.contains('open')) window.closeStockDetail?.();
      else if (document.getElementById('stocks-modal')?.classList.contains('open')) window.closeStocks?.();
      else if (profileOpen) window.closeProfile?.();
      else if (caOpen) closeCustomAnalysis();
      else if (researchOpen) window.closeResearch?.();
      else if (fxOpen) window.closeFx?.();
      else if (commodOpen) window.closeCommodities?.();
      else if (commOpen) window.closeCommunity?.();
      else if (deepOpen) closeDeepAnalysis();
      else if (socialOpen) closeSocialPanel();
      else if (watchlistOpen) closeWatchlist();
    }
  });

  // Close shortcuts panel when clicking outside
  document.addEventListener('click', e => {
    if (!window._shortcutsOpen) return;
    const panel = document.getElementById('shortcuts-panel');
    if (panel && !panel.contains(e.target)) closeShortcuts();
  });
}

// Window bridges
window.wireEventListeners = wireEventListeners;
window.openShortcuts = openShortcuts;
window.closeShortcuts = closeShortcuts;
window.toggleShortcuts = toggleShortcuts;
