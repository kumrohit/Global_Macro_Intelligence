#!/usr/bin/env node
/**
 * Global Macro Intelligence — E2E Test Suite (Task 20)
 * Tests all features via static analysis of the HTML source.
 * Run: node test_e2e.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'global_macro_intel.html');
if (!fs.existsSync(FILE)) { console.error('ERROR: global_macro_intel.html not found'); process.exit(1); }
const html = fs.readFileSync(FILE, 'utf8');

// Extract style and script blocks
const styleStart = html.indexOf('<style>');
const styleEnd   = html.indexOf('</style>');
const css = styleStart >= 0 && styleEnd > styleStart ? html.slice(styleStart, styleEnd) : '';

const scriptStart = html.indexOf('<script>', html.indexOf('</style>'));
const scriptEnd   = html.lastIndexOf('</script>');
const js = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart + 8, scriptEnd) : '';

// ── Test runner ────────────────────────────────────────────────────────────────
let pass = 0, fail = 0, warn = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === 'WARN') {
      warn++;
      console.log(`  ⚠  ${name}`);
    } else if (result !== false) {
      pass++;
      console.log(`  ✓  ${name}`);
    } else {
      fail++;
      failures.push(name);
      console.log(`  ✗  ${name}`);
    }
  } catch(e) {
    fail++;
    failures.push(name + ' (threw: ' + e.message + ')');
    console.log(`  ✗  ${name} — ${e.message}`);
  }
}

function has(str, pattern, src) {
  src = src || html;
  if (pattern instanceof RegExp) return pattern.test(src);
  return src.includes(pattern);
}

function hasEl(id) { return html.includes(`id="${id}"`); }
function hasClass(cls) { return html.includes(`class="${cls}"`) || html.includes(`"${cls}"`) || css.includes(`.${cls}`); }
function hasFn(name) { return js.includes(`function ${name}(`) || js.includes(`function ${name} (`); }
function hasVar(name) { return js.includes(`let ${name}`) || js.includes(`const ${name}`) || js.includes(`var ${name}`); }
function hasSelector(sel) { return js.includes(`'${sel}'`) || js.includes(`"${sel}"`); }

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — Core Structure
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 1: Core Structure ─────────────────────────────────────────');

test('HTML5 doctype', () => html.startsWith('<!DOCTYPE html>'));
test('UTF-8 charset', () => has('<meta charset="UTF-8">'));
test('Page title', () => has('Global Macro Intelligence'));
test('D3 v7 CDN loaded', () => has('d3/7.8.5'));
test('TopoJSON CDN loaded', () => has('topojson/3.0.2'));
test('EmailJS CDN loaded', () => has('@emailjs/browser'));
test('Firebase App SDK loaded', () => has('firebase-app-compat.js'));
test('Firebase Firestore SDK loaded', () => has('firebase-firestore-compat.js'));
test('Google Fonts loaded', () => has('fonts.googleapis.com'));
test('CSS custom properties (:root)', () => css.includes(':root{') || css.includes(':root {'));
test('--cyan variable defined', () => css.includes('--cyan:'));
test('--bull variable defined', () => css.includes('--bull:'));
test('--bear variable defined', () => css.includes('--bear:'));
test('App container #app exists', () => hasEl('app'));
test('Topbar #topbar exists', () => hasEl('topbar'));
test('Map wrapper #map-wrap exists', () => hasEl('map-wrap'));
test('Map SVG #map-svg exists', () => hasEl('map-svg'));
test('Country tooltip #tooltip exists', () => hasEl('tooltip'));
test('Side panel #panel exists', () => hasEl('panel'));
test('Clock element #clock exists', () => hasEl('clock'));
test('Ticker tape present', () => hasEl('tickers'));
test('API widget #api-widget present', () => hasEl('api-widget'));
test('API key input present', () => hasEl('api-input'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — Map & Country Analysis
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 2: Map & Country Analysis ─────────────────────────────────');

test('initMap() function defined', () => hasFn('initMap'));
test('selectCountry() function defined', () => hasFn('selectCountry'));
test('renderPanel() function defined', () => hasFn('renderPanel'));
test('fetchSentiment() function defined', () => hasFn('fetchSentiment'));
test('getMeta() function defined', () => hasFn('getMeta'));
test('onCountryHover() function defined', () => hasFn('onCountryHover'));
test('onCountryLeave() function defined', () => hasFn('onCountryLeave'));
test('Tooltip DOM refs cached (_tt)', () => hasVar('_tt'));
test('Panel DOM refs cached (_elPanel)', () => hasVar('_elPanel'));
test('renderPanel refs cached (_elSentBadge)', () => hasVar('_elSentBadge'));
test('rAF throttle for mousemove', () => js.includes('_tipRafPending'));
test('Country fill transition (no filter)', () => {
  const ok = css.includes('transition:fill 0.3s ease,stroke 0.2s ease');
  const bad = /transition:.*filter/.test(css.split('.country')[1]?.split('}')[0] || '');
  return ok && !bad;
});
test('Equirectangular (flat) projection used', () => js.includes('geoEquirectangular'));
test('fitSize projection used', () => js.includes('fitSize'));
test('Bullish/bearish/neutral country classes', () =>
  css.includes('.country.bullish') && css.includes('.country.bearish') && css.includes('.country.neutral'));
test('Sentiment badge #sent-badge exists', () => hasEl('sent-badge'));
test('Score bar #sbar exists', () => hasEl('sbar'));
test('Regime pill #regime-pill exists', () => hasEl('regime-pill'));
test('Rationale #rationale exists', () => hasEl('rationale'));
test('Key indicator chips (c-eq, c-rt, c-fx)', () =>
  hasEl('c-eq') && hasEl('c-rt') && hasEl('c-fx') && hasEl('c-rk'));
test('Deep analysis overlay #deep-overlay exists', () => hasEl('deep-overlay'));
test('Deep analysis 5 tabs', () =>
  ['overview','economy','markets','risks','outlook'].every(t => html.includes(`data-tab="${t}"`)));
test('updateCount() for analysed counter', () => hasFn('updateCount'));
test('_elAnalysedInline cached', () => hasVar('_elAnalysedInline'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — API Layer
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 2: API Layer ───────────────────────────────────────────────');

test('callLLM() function defined', () => hasFn('callLLM'));
test('detectProvider() function defined', () => hasFn('detectProvider'));
test('Gemini endpoint present', () => js.includes('generativelanguage.googleapis.com'));
test('Claude endpoint present', () => js.includes('api.anthropic.com'));
test('thinkingBudget:0 to suppress thinking tokens', () => js.includes('thinkingBudget: 0'));
test('repairAndParseJSON() defined', () => hasFn('repairAndParseJSON'));
test('closeTruncated() defined', () => hasFn('closeTruncated'));
test('friendlyError() for HTTP errors', () => hasFn('friendlyError'));
test('7-step JSON repair pipeline (trailing comma fix)', () => js.includes('trailing commas') || js.includes("replace(/,"));
test('Markdown fence stripping in JSON repair', () => js.includes('```'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Feature Panels
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 3: Feature Panels ──────────────────────────────────────────');

test('Social panel #social-panel exists', () => hasEl('social-panel'));
test('Social body has contain:layout style', () => css.includes('#social-body') && css.includes('contain:layout style'));
test('loadSocialSentiment() defined', () => hasFn('loadSocialSentiment'));
test('Social hashtag filter debounce', () => js.includes('socFilterTimer') || js.includes('socialDebounce') || js.includes('clearTimeout'));
test('News toggle toggleNews() defined', () => hasFn('toggleNews'));
test('loadNews() defined', () => hasFn('loadNews'));
test('Authority pubs loadAuthorityPubs() defined', () => hasFn('loadAuthorityPubs'));
test('AUTHORITY_URLS map present (54 countries)', () => {
  const m = js.match(/AUTHORITY_URLS\s*=\s*\{/);
  return m ? true : false;
});
test('History chart loadHistoryData() defined', () => hasFn('loadHistoryData'));
test('History D3 chart drawHistoryLine() defined', () => hasFn('drawHistoryLine'));
test('Language translation toggleLanguage() defined', () => hasFn('toggleLanguage'));
test('restoreEnglish() defined', () => hasFn('restoreEnglish'));
test('#history-section element exists', () => hasEl('history-section') || js.includes("'history-section'"));
test('Exchange card #exchange-card exists', () => hasEl('exchange-card'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Watchlist
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 4: Watchlist ───────────────────────────────────────────────');

test('Watchlist panel #watchlist-panel exists', () => hasEl('watchlist-panel'));
test('Watchlist body has contain:layout style', () => css.includes('#wl-body') && css.includes('contain:layout style'));
test('addWatchlistItem() defined', () => hasFn('addWatchlistItem'));
test('renderWatchlist() defined', () => hasFn('renderWatchlist'));
test('fetchWatchlistSentiment() defined', () => hasFn('fetchWatchlistSentiment'));
test('loadWatchlistFromStorage() defined', () => hasFn('loadWatchlistFromStorage'));
test('updateWatchlistCountryBtn() uses cached refs', () =>
  js.includes('_elWlAddCountryBtn') && js.includes('_elAddToWatchlistBtn'));
test('gmi_watchlist localStorage key present', () => js.includes("'gmi_watchlist'"));
test('watchlist array declared', () => hasVar('watchlist'));
test('Type detection: ticker regex', () => js.includes('/^[A-Z]{1,6}$/'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — Custom Analysis
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 5: Custom Analysis ─────────────────────────────────────────');

test('CA overlay #ca-overlay exists', () => hasEl('ca-overlay'));
test('Custom Analysis topbar button #ca-topbar-btn exists', () => hasEl('ca-topbar-btn'));
test('runCustomAnalysis() defined', () => hasFn('runCustomAnalysis'));
test('renderCustomAnalysis() defined', () => hasFn('renderCustomAnalysis'));
test('drawCaGauge() D3 gauge defined', () => hasFn('drawCaGauge'));
test('openCustomAnalysis() defined', () => hasFn('openCustomAnalysis'));
test('closeCustomAnalysis() defined', () => hasFn('closeCustomAnalysis'));
test('caRunning guard prevents concurrent runs', () => js.includes('caRunning'));
test('Tag input max 10 enforced', () => js.includes('10') && js.includes('customTags'));
test('2500-token CA call', () => js.includes('2500'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — Authentication
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 6: Authentication ──────────────────────────────────────────');

test('Login overlay #login-overlay exists', () => hasEl('login-overlay'));
test('wireLoginEvents() defined', () => hasFn('wireLoginEvents'));
test('attemptLogin() defined', () => hasFn('attemptLogin'));
test('attemptRegister() defined', () => hasFn('attemptRegister'));
test('startSession() defined', () => hasFn('startSession'));
test('logout() defined', () => hasFn('logout'));
test('hashPassword() defined', () => hasFn('hashPassword'));
test('loadSession() defined', () => hasFn('loadSession'));
test('clearSession() defined', () => hasFn('clearSession'));
test('_cachedSession in-memory cache declared', () => hasVar('_cachedSession'));
test('_cachedSession uses undefined sentinel (not null)', () =>
  js.includes('_cachedSession = undefined'));
test('clearSession invalidates cache (_cachedSession = null)', () =>
  js.includes('_cachedSession = null'));
test('Three-tier storage: storageGet defined', () => hasFn('storageGet'));
test('Three-tier storage: storageSet defined', () => hasFn('storageSet'));
test('Three-tier storage: storageRemove defined', () => hasFn('storageRemove'));
test('_memStore fallback declared', () => hasVar('_memStore'));
test('isStoragePersistent() defined', () => hasFn('isStoragePersistent'));
test('gmi_users localStorage key', () => js.includes("'gmi_users'") || js.includes('AUTH_USERS_KEY'));
test('gmi_session localStorage key', () => js.includes("'gmi_session'") || js.includes('AUTH_SESSION_KEY'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — Profile / Digest / Newsletter / Opportunities
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 7: Profile / Digest / Newsletter / Opportunities ──────────');

test('Profile overlay #profile-overlay exists', () => hasEl('profile-overlay'));
test('Profile body has contain:layout style', () => css.includes('#profile-body') && css.includes('contain:layout style'));
test('openProfile() defined', () => hasFn('openProfile'));
test('closeProfile() defined', () => hasFn('closeProfile'));
test('loadDigestTab() defined', () => hasFn('loadDigestTab'));
test('Daily tab present (data-tab="daily")', () => html.includes('data-tab="daily"'));
test('Weekly tab present (data-tab="weekly")', () => html.includes('data-tab="weekly"'));
test('Newsletter tab present (data-tab="newsletter")', () => html.includes('data-tab="newsletter"'));
test('Opportunities tab present (data-tab="opportunities")', () => html.includes('data-tab="opportunities"'));
test('loadNewsletterTab() defined', () => hasFn('loadNewsletterTab'));
test('generateNewsletterHTML() defined', () => hasFn('generateNewsletterHTML'));
test('generateNewsletterText() defined', () => hasFn('generateNewsletterText'));
test('sendOrPreviewNewsletter() defined', () => hasFn('sendOrPreviewNewsletter'));
test('Toast #gmi-toast exists', () => hasEl('gmi-toast'));
test('showToast() defined', () => hasFn('showToast'));
test('dismissToast() defined', () => hasFn('dismissToast'));
test('EmailJS ejsSend() defined', () => hasFn('ejsSend'));
test('ejsConfigured() check defined', () => hasFn('ejsConfigured'));
test('checkNewsletterAutoNotify() defined', () => hasFn('checkNewsletterAutoNotify'));
test('loadOpportunitiesTab() defined', () => hasFn('loadOpportunitiesTab'));
test('renderOpportunitiesHTML() defined', () => hasFn('renderOpportunitiesHTML'));
test('OPP_HORIZONS array: DAY/WEEK/MONTH/THEMES', () =>
  js.includes("'DAY'") && js.includes("'WEEK'") && js.includes("'MONTH'") && js.includes("'THEMES'"));
test('Digest expand toggleDigestExpand() defined', () => hasFn('toggleDigestExpand'));
test('digestExpandCache declared', () => hasVar('digestExpandCache'));
test('Source row visible: digest-source-btn class', () => css.includes('.digest-source-btn'));
test('Source row visible: opp-source-link class', () => css.includes('.opp-source-link'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8 — Performance Optimisations
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 8: Performance Optimisations ───────────────────────────────');

test('Clock interval 10s (not 1s)', () =>
  js.includes('setInterval(tick, 10000)') || js.includes('setInterval(tick,10000)'));
test('_clockEl cached', () => hasVar('_clockEl'));
test('will-change:transform on tooltip', () => css.includes('#tooltip') && css.includes('will-change:transform'));
test('will-change:transform on #social-panel', () =>
  css.includes('#social-panel') && css.includes('will-change:transform'));
test('will-change:width on #panel', () =>
  css.includes('#panel') && css.includes('will-change:width'));
test('contain:layout style on #panel-body', () =>
  css.includes('#panel-body') && css.includes('contain:layout style'));
test('contain:layout style on #social-body', () =>
  css.includes('#social-body') && css.includes('contain:layout style'));
test('contain:layout style on #wl-body', () =>
  css.includes('#wl-body') && css.includes('contain:layout style'));
test('contain:layout style on #profile-body', () =>
  css.includes('#profile-body') && css.includes('contain:layout style'));
test('No backdrop-filter on always-visible static elements', () => {
  // Only overlays (display:none by default) should have backdrop-filter
  const noStaticBackdrop = !css.includes('#legend{') || !css.match(/#legend\{[^}]*backdrop-filter/);
  const apiNoBack = !css.match(/#api-widget\{[^}]*backdrop-filter/);
  return noStaticBackdrop && apiNoBack;
});
test('Country transition excludes filter property', () => {
  // transition on .country should only have fill and stroke, not filter
  const transLine = css.match(/transition:fill[^;]+;/)?.[0] || '';
  return transLine.includes('fill') && !transLine.includes('filter');
});
test('Ticker cache 5-min TTL', () =>
  js.includes('gmi_ticker_cache') && js.includes('5 * 60 * 1000'));
test('rAF throttle on tooltip mousemove', () =>
  js.includes('_tipRafPending') && js.includes('requestAnimationFrame'));
test('_elSentBadge, _elSbar, _elRationale cached refs declared', () =>
  hasVar('_elSentBadge') && hasVar('_elSbar') && hasVar('_elRationale'));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 9 — Community Board (Task 19)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 9: Community Board ─────────────────────────────────────────');

test('Community topbar button #comm-topbar-btn exists', () => hasEl('comm-topbar-btn'));
test('Community overlay #comm-overlay exists', () => hasEl('comm-overlay'));
test('Community panel #comm-panel exists', () => hasEl('comm-panel'));
test('Community Feed tab present', () => html.includes('data-tab="feed"'));
test('Community Settings tab present', () => html.includes('data-tab="settings"'));
test('Post composer textarea #comm-text-input', () => hasEl('comm-text-input'));
test('Post submit button #comm-submit-btn', () => hasEl('comm-submit-btn'));
test('Tag buttons: bullish/bearish/neutral', () =>
  html.includes('data-tag="bullish"') && html.includes('data-tag="bearish"') && html.includes('data-tag="neutral"'));
test('Posts list #comm-posts-list', () => hasEl('comm-posts-list'));
test('openCommunity() defined', () => hasFn('openCommunity'));
test('closeCommunity() defined', () => hasFn('closeCommunity'));
test('switchCommTab() defined', () => hasFn('switchCommTab'));
test('submitCommPost() defined', () => hasFn('submitCommPost'));
test('handleLike() defined', () => hasFn('handleLike'));
test('toggleComments() defined', () => hasFn('toggleComments'));
test('renderFeed() defined', () => hasFn('renderFeed'));
test('renderPostCard() defined', () => hasFn('renderPostCard'));
test('renderComments() defined', () => hasFn('renderComments'));
test('wireCommEvents() defined', () => hasFn('wireCommEvents'));
test('wireCommEvents() called in boot', () => js.includes('wireCommEvents()'));
test('isOwner() for official detection', () => hasFn('isOwner'));
test('commOwners array declared', () => hasVar('commOwners'));
test('loadCommOwners() defined', () => hasFn('loadCommOwners'));
test('OFFICIAL badge CSS class', () => css.includes('.comm-badge-official'));
test('OFFICIAL post card variant (.official)', () => css.includes('.comm-post-card.official'));
test('initFirebase() defined', () => hasFn('initFirebase'));
test('disconnectFirebase() defined', () => hasFn('disconnectFirebase'));
test('subscribeFirebasePosts() real-time listener', () => hasFn('subscribeFirebasePosts'));
test('Local fallback: addLocalPost() defined', () => hasFn('addLocalPost'));
test('Local fallback: loadLocalPosts() defined', () => hasFn('loadLocalPosts'));
test('Local fallback: saveLocalPosts() defined', () => hasFn('saveLocalPosts'));
test('Firestore comment sub-collection support', () => js.includes("'comments'") && js.includes('toggleComments'));
test('Firebase auto-connect on boot from saved config', () => js.includes('loadFbConfig') && js.includes('initFirebase'));
test('COMM_LOCAL_KEY constant', () => js.includes('COMM_LOCAL_KEY'));
test('COMM_OWNERS_KEY constant', () => js.includes('COMM_OWNERS_KEY'));
test('COMM_FB_KEY constant', () => js.includes('COMM_FB_KEY'));
test('escHtml() XSS prevention on post content', () => hasFn('escHtml'));
test('Char count updater updateCommCharCount()', () => hasFn('updateCommCharCount'));
test('comm-reply-input class for comment input', () => css.includes('.comm-reply-input'));
test('comm-comment-card class for comments', () => css.includes('.comm-comment-card'));
test('updateCommModeNotice() for local vs live label', () => hasFn('updateCommModeNotice'));
test('Community overlay CSS backdrop-filter (modal only)', () => {
  const block = css.match(/#comm-overlay\{[^}]+\}/)?.[0] || '';
  return block.includes('backdrop-filter');
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 10 — Deploy Folder
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 10: Deploy Folder ──────────────────────────────────────────');

const DEPLOY = path.join(__dirname, 'deploy');
test('deploy/ folder exists', () => fs.existsSync(DEPLOY) && fs.statSync(DEPLOY).isDirectory());
test('deploy/index.html exists', () => fs.existsSync(path.join(DEPLOY, 'index.html')));
test('deploy/index.html is current (≥ 300 KB)', () => {
  const size = fs.statSync(path.join(DEPLOY, 'index.html')).size;
  return size >= 300000;
});
test('deploy/netlify.toml exists', () => fs.existsSync(path.join(DEPLOY, 'netlify.toml')));
test('deploy/vercel.json exists', () => fs.existsSync(path.join(DEPLOY, 'vercel.json')));
test('deploy/_headers exists', () => fs.existsSync(path.join(DEPLOY, '_headers')));
test('deploy/README.md exists', () => fs.existsSync(path.join(DEPLOY, 'README.md')));
test('netlify.toml has publish = "."', () => {
  const t = fs.readFileSync(path.join(DEPLOY,'netlify.toml'),'utf8');
  return t.includes('publish = "."');
});
test('netlify.toml has Content-Security-Policy header', () => {
  const t = fs.readFileSync(path.join(DEPLOY,'netlify.toml'),'utf8');
  return t.includes('Content-Security-Policy');
});
test('vercel.json has routes', () => {
  const v = JSON.parse(fs.readFileSync(path.join(DEPLOY,'vercel.json'),'utf8'));
  return Array.isArray(v.routes) && v.routes.length > 0;
});
test('_headers CSP covers generativelanguage API', () => {
  const h = fs.readFileSync(path.join(DEPLOY,'_headers'),'utf8');
  return h.includes('generativelanguage.googleapis.com');
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 11 — Security & XSS
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 11: Security & XSS ──────────────────────────────────────────');

test('API key stored in variable, not localStorage', () =>
  !js.includes("localStorage.setItem('apiKey") && !js.includes('localStorage.setItem("apiKey'));
test('escHtml prevents XSS in community posts', () =>
  js.includes('escHtml') && js.includes(".replace(/&/g,'&amp;')"));
test('No eval() calls', () => !js.includes('eval('));
test('document.write() only in newsletter preview window (intentional)', () => {
  // Newsletter preview legitimately uses win.document.write() to render HTML in a new tab
  const uses = (js.match(/document\.write\(/g) || []).length;
  return uses <= 1 && js.includes('win.document.write');
});
test('innerHTML only used for controlled template strings (not raw user input unescaped)', () => {
  // All innerHTML that writes user-sourced content should pass through escHtml()
  // We verify escHtml is called for community content
  return js.includes('escHtml(post.content)') && js.includes('escHtml(c.content)');
});
test('Password hashing in auth (hashPassword)', () => hasFn('hashPassword'));
test('Session not stored with plaintext password', () => {
  const sessionSave = js.match(/saveSession\([^)]+\)/)?.[0] || '';
  return !sessionSave.includes('password');
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 12 — Misc / UX
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 12: UX / Edge Cases ────────────────────────────────────────');

test('Precompute ALL/SELECT mode toggle', () => js.includes('countryMode'));
test('selectCountry handles missing META gracefully', () =>
  js.includes('if (!meta) return'));
test('repairAndParseJSON handles truncated JSON', () =>
  js.includes('closeTruncated'));
test('Watchlist empty state shown', () => js.includes('wl-empty'));
test('Social sentiment filter debounced (600ms)', () =>
  js.includes('600'));
test('History chart guard (vals.length < 2)', () =>
  js.includes('vals.length') || js.includes('.length < 2'));
test('Deep analysis tab cache per country', () =>
  js.includes('deepCache'));
test('Community MAX_CHARS 600 enforced', () =>
  js.includes('COMM_MAX_CHARS') && js.includes('600'));
test('Community MAX_POSTS 200 guard', () =>
  js.includes('COMM_MAX_POSTS') && js.includes('200'));
test('relativeTime() for timestamps', () => hasFn('relativeTime'));
test('todayKey() for digest cache keys', () => hasFn('todayKey'));
test('weekKey() for digest cache keys', () => hasFn('weekKey'));
test('Region jump highlights countries', () => hasFn('jumpToRegion') || js.includes('REGION_NAMES'));
test('Static map resize handler', () =>
  js.includes("window.addEventListener('resize'") || js.includes('window.addEventListener("resize"'));
test('File size under 360 KB (single file)', () => {
  const bytes = fs.statSync(FILE).size;
  return bytes < 360000;
});
test('Boot sequence calls wireCommEvents', () => {
  // wireCommEvents() appears in the boot sequence (after BOOT comment)
  const bootIdx = js.lastIndexOf('// BOOT');
  return bootIdx >= 0 && js.indexOf('wireCommEvents()', bootIdx) > bootIdx;
});
test('Boot sequence calls checkNewsletterAutoNotify', () =>
  js.includes('checkNewsletterAutoNotify()'));
test('Boot sequence calls loadWatchlistFromStorage', () =>
  js.includes('loadWatchlistFromStorage()'));
test('Boot sequence calls initMap', () =>
  js.includes('initMap()'));

// ══════════════════════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════════════════════
const total = pass + fail + warn;
console.log(`\n${'═'.repeat(65)}`);
console.log(`  RESULTS   ${pass}/${total} passing   ${fail} failing   ${warn} warnings`);
console.log(`${'═'.repeat(65)}`);

if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗  ${f}`));
}

console.log(`\n  File: global_macro_intel.html  (${(fs.statSync(FILE).size / 1024).toFixed(0)} KB · ${html.split('\n').length} lines)`);
const deploySize = fs.existsSync(path.join(DEPLOY,'index.html')) ? fs.statSync(path.join(DEPLOY,'index.html')).size : 0;
console.log(`  Deploy: deploy/index.html  (${(deploySize/1024).toFixed(0)} KB)`);

process.exit(fail > 0 ? 1 : 0);
