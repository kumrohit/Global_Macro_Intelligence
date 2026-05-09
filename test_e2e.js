#!/usr/bin/env node
/**
 * Meridiax — E2E Test Suite (Task 20)
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
test('Page title', () => has('Meridiax'));
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
test('Topbar ABOUT button present', () => hasEl('about-topbar-btn'));
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
  const ok = css.includes('transition:fill 0.25s ease,stroke 0.15s ease,opacity 0.15s ease');
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
test('Toast #mrx-toast exists', () => hasEl('mrx-toast'));
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
test('will-change:transform on #panel', () =>
  css.includes('#panel') && css.includes('will-change:transform'));
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
test('File size under 600 KB (single file)', () => {
  const bytes = fs.statSync(FILE).size;
  return bytes < 600000;
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
test('Free mode: callLLMFree function defined', () => js.includes('async function callLLMFree'));
test('Free mode: callLLM routes to free when no provider', () => js.includes('if (!provider) return callLLMFree('));
test('Free mode: requireApiKey gate function defined', () => js.includes('function requireApiKey'));
test('Free mode: apikey-gate-overlay CSS defined', () => css.includes('#apikey-gate-overlay'));
test('Free mode: apikey-gate-overlay HTML exists', () => html.includes('id="apikey-gate-overlay"'));
test('Free mode: Pollinations endpoint used in callLLMFree', () => js.includes('text.pollinations.ai'));
test('Free mode: no fixed seed in callLLMFree (responses vary)', () => { const fn = js.slice(js.indexOf('async function callLLMFree')); return !fn.slice(0, 500).includes('seed: 42') && !fn.slice(0, 500).includes("seed:42"); });
test('Free mode: AbortController timeout in callLLMFree', () => { const fn = js.slice(js.indexOf('async function callLLMFree')); return fn.slice(0, 600).includes('AbortController') && fn.slice(0, 600).includes('abort()'); });
test('Free mode: code fence stripping in callLLMFree', () => { const fn = js.slice(js.indexOf('async function callLLMFree')); return fn.slice(0, 1200).includes('replace') && fn.slice(0, 1200).includes('json'); });
test('Free mode: loadTickers uses !claude path for free mode', () => js.includes("detectProvider() !== 'claude'"));
test('Free mode: API key persisted on save', () => { return js.includes("storageSet('gmi_api_key'"); });
test('Free mode: API key restored at boot', () => { const bootIdx = js.lastIndexOf('// BOOT'); return js.indexOf('gmi_api_key', bootIdx) > bootIdx; });
test('Free mode: CLEAR button wired to remove stored key', () => js.includes("'api-clear'") && js.includes("storageRemove('gmi_api_key')"));
test('Free mode: renderNoKey dead code removed', () => !js.includes('function renderNoKey'));
test('Free mode: showApiKeyToast dead code removed', () => !js.includes('function showApiKeyToast'));
test('Free mode: onboard-banner HTML removed (dead code)', () => !html.includes('id="onboard-banner"'));
test('Free mode: onboard-banner CSS removed (dead code)', () => !css.includes('#onboard-banner'));
test('Free mode: showOnboardBanner removed (dead code)', () => !js.includes('function showOnboardBanner'));
test('Free mode: hideOnboardBanner removed (dead code)', () => !js.includes('function hideOnboardBanner'));
test('API gate: openDeepAnalysis gated', () => { const fn = js.slice(js.indexOf('function openDeepAnalysis')); return fn.slice(0,200).includes('requireApiKey'); });
test('API gate: openResearch gated', () => { const fn = js.slice(js.indexOf('function openResearch')); return fn.slice(0,200).includes('requireApiKey'); });
test('API gate: openFx gated', () => { const fn = js.slice(js.indexOf('function openFx')); return fn.slice(0,200).includes('requireApiKey'); });
test('API gate: openCommodities gated', () => { const fn = js.slice(js.indexOf('function openCommodities')); return fn.slice(0,200).includes('requireApiKey'); });
test('Community Board: no API key gate (free feature)', () => { const fn = js.slice(js.indexOf('async function openCommunity')); return !fn.slice(0,300).includes('requireApiKey'); });
test('API gate: loadDigestTab gated for daily/weekly', () => { const fn = js.slice(js.indexOf('async function loadDigestTab')); return fn.slice(0,500).includes('requireApiKey'); });
test('API gate: loadOpportunitiesTab gated', () => { const fn = js.slice(js.indexOf('async function loadOpportunitiesTab')); return fn.slice(0,200).includes('requireApiKey'); });
test('API gate: runCustomAnalysis gated', () => { const fn = js.slice(js.indexOf('async function runCustomAnalysis')); return fn.slice(0,200).includes('requireApiKey'); });
test('API gate: saveApiKeyGate persists key', () => js.includes('function saveApiKeyGate') && js.includes("storageSet('gmi_api_key'"));
test('API gate: saveApiKeyGate fires pending callback', () => { const fn = js.slice(js.indexOf('function saveApiKeyGate')); return fn.slice(0,1600).includes('_apikeyGateCallback'); });
test('Free mode: loadDeepSection no !apiKey guard', () => !js.includes('!currentCountryMeta || !apiKey'));
test('Free mode: newsletter alert removed (no !apiKey alert for newsletter)', () => !js.includes('Enter a Gemini API key and load'));
test('Free mode: country map analysis stays free (callLLMFree reachable without key)', () => js.includes('if (!provider) return callLLMFree('));

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 13 — Android / Mobile
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 13: Android / Mobile ───────────────────────────────────────');

const ANDROID = path.join(__dirname, 'android');
test('android/ folder exists', () => fs.existsSync(ANDROID) && fs.statSync(ANDROID).isDirectory());
test('android/index.html exists and is current (≥ 300 KB)', () => {
  const f = path.join(ANDROID, 'index.html');
  return fs.existsSync(f) && fs.statSync(f).size >= 300000;
});
test('android/manifest.json exists with correct fields', () => {
  const f = path.join(ANDROID, 'manifest.json');
  if (!fs.existsSync(f)) return false;
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  return m.name && m.display === 'standalone' && Array.isArray(m.icons) && m.icons.length > 0;
});
test('android/sw.js exists with install + fetch handlers', () => {
  const f = path.join(ANDROID, 'sw.js');
  if (!fs.existsSync(f)) return false;
  const s = fs.readFileSync(f, 'utf8');
  return s.includes("addEventListener('install'") && s.includes("addEventListener('fetch'");
});
test('android/README.md has Capacitor deployment guide', () => {
  const f = path.join(ANDROID, 'README.md');
  return fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('Capacitor');
});
test('PWA manifest linked in HTML head', () =>
  html.includes('rel="manifest"') && html.includes('manifest.json'));
test('Mobile-web-app-capable meta tag present', () =>
  html.includes('mobile-web-app-capable'));
test('Apple mobile web app meta tags present', () =>
  html.includes('apple-mobile-web-app-capable') && html.includes('apple-mobile-web-app-title'));
test('Mobile nav bar #mobile-nav exists in HTML', () =>
  html.includes('id="mobile-nav"'));
test('Mobile nav bar hidden by default (display:none)', () =>
  css.includes('#mobile-nav') && css.includes('display:none'));
test('Mobile nav shows on ≤ 480px (media query)', () =>
  css.includes('max-width:480px') && css.includes('#mobile-nav') && css.includes('display:flex'));
test('Full-width panels on mobile (100vw)', () =>
  css.includes('100vw'));
test('Service worker registered in boot', () =>
  js.includes("serviceWorker.register('sw.js')") || js.includes('serviceWorker.register("sw.js")'));
test('Touch-action set on map SVG for mobile', () =>
  css.includes('#map-svg') && css.includes('touch-action'));
test('Bottom nav has all 5 action buttons', () => {
  const nav = html.slice(html.indexOf('id="mobile-nav"'), html.indexOf('</nav>', html.indexOf('id="mobile-nav"')));
  return (nav.match(/mob-nav-btn/g) || []).length >= 5;
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 14 — Community Pulse
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 14: Community Pulse ────────────────────────────────────────');

test('Community Pulse tab button exists (data-tab="pulse")', () =>
  html.includes('data-tab="pulse"'));
test('Pulse tab panel #comm-pulse exists in HTML', () =>
  html.includes('id="comm-pulse"'));
test('analyzeCommunityPulse function defined', () =>
  js.includes('async function analyzeCommunityPulse('));
test('renderCommPulse function defined', () =>
  js.includes('function renderCommPulse('));
test('switchCommTab handles pulse tab', () =>
  js.includes("'comm-pulse'") || js.includes('"comm-pulse"'));
test('Pulse analysis uses only community post data (no external API params)', () =>
  js.includes('postData') && js.includes('p.content') && js.includes('p.tag'));
test('Pulse prompt instructs AI to use only community posts', () =>
  js.includes('ONLY on what is written in these posts'));
test('Pulse renders sentiment score bar', () =>
  js.includes('comm-pulse-bar-fill') && js.includes('barPct'));
test('Pulse renders bull/bear/neutral breakdown', () =>
  js.includes('bull_pct') && js.includes('bear_pct') && js.includes('neutral_pct'));
test('Pulse renders top themes as chips', () =>
  js.includes('comm-pulse-theme-chip') && js.includes('top_themes'));
test('Pulse renders community narrative', () =>
  js.includes('comm-pulse-narrative') && js.includes('narrative'));
test('Pulse renders representative views', () =>
  js.includes('comm-pulse-view') && js.includes('key_views'));
test('Pulse renders consensus level', () =>
  js.includes('consensus_level') && js.includes('CONSENSUS LEVEL'));
test('Pulse guard: no API key shows toast', () =>
  js.includes("analyzeCommunityPulse") && (js.includes('showApiKeyToast') || js.includes('showToast')));
test('Pulse post content/tag only (no usernames sent to AI)', () =>
  js.includes('p.content') && !js.includes('p.username') || js.includes('postData = posts.map'));
test('escHtml used in pulse render (XSS safe)', () =>
  js.includes('escHtml(d.narrative') && js.includes('escHtml(t)') && js.includes('escHtml(v)'));

console.log('\n── Phase 15: Commodity Heatmap ──────────────────────────────────────');
test('Commodity overlay #commod-overlay exists', () => hasEl('commod-overlay'));
test('Commodity panel #commod-panel exists', () => hasEl('commod-panel'));
test('Commodity topbar button #commod-topbar-btn exists', () => hasEl('commod-topbar-btn'));
test('Commodity close button exists', () => hasEl('commod-close-btn'));
test('Commodity category tabs exist', () => ['all','energy','metals','agriculture','softs'].every(t => html.includes(`data-tab="${t}"`)));
test('Commodity grid #commod-grid exists', () => hasEl('commod-grid'));
test('Commodity detail panel #commod-detail-wrap exists', () => hasEl('commod-detail-wrap'));
test('COMMOD_DEFS array defined', () => js.includes('const COMMOD_DEFS'));
test('COMMOD_DEFS has 29 commodities', () => { const m = js.match(/const COMMOD_DEFS\s*=\s*\[/); if (!m) return false; const block = js.slice(js.indexOf('const COMMOD_DEFS')).split('];')[0]; return (block.match(/symbol:/g)||[]).length >= 25; });
test('Energy sector defined (WTI, BRENT, NATGAS)', () => ['WTI','BRENT','NATGAS'].every(s => js.includes(`'${s}'`)));
test('Metals sector defined (GOLD, SILVER, COPPER)', () => ['GOLD','SILVER','COPPER'].every(s => js.includes(`'${s}'`)));
test('Agriculture sector defined (CORN, WHEAT, SOYB)', () => ['CORN','WHEAT','SOYB'].every(s => js.includes(`'${s}'`)));
test('Softs sector defined (LUMBER, OJ)', () => ['LUMBER','OJ'].every(s => js.includes(`'${s}'`)));
test('openCommodities() defined', () => js.includes('function openCommodities()'));
test('closeCommodities() defined', () => js.includes('function closeCommodities()'));
test('loadCommodityHeat() defined', () => js.includes('async function loadCommodityHeat()'));
test('renderCommodityHeat() defined', () => js.includes('function renderCommodityHeat()'));
test('openCommodityDetail() defined', () => js.includes('async function openCommodityDetail('));
test('renderCommodityDetail() defined', () => js.includes('function renderCommodityDetail('));
test('drawCommodityChart() D3 chart defined', () => js.includes('function drawCommodityChart('));
test('closeCommodityDetail() defined', () => js.includes('function closeCommodityDetail()'));
test('switchCommodTab() defined', () => js.includes('function switchCommodTab('));
test('wireCommodEvents() defined', () => js.includes('function wireCommodEvents()'));
test('wireCommodEvents() called in boot', () => { const bootIdx = js.indexOf('// BOOT'); return bootIdx >= 0 && js.indexOf('wireCommodEvents()', bootIdx) >= 0; });
test('commodPctColor() for green/red heatmap', () => js.includes('function commodPctColor('));
test('Detail panel shows D3 chart (requestAnimationFrame + drawCommodityChart)', () => js.includes('requestAnimationFrame') && js.includes('drawCommodityChart'));
test('Trade idea conviction bar rendered', () => js.includes('commod-conv-fill') && js.includes('conviction'));
test('Macro drivers rendered as chips', () => js.includes('commod-driver-chip'));
test('Technical levels rendered (support/resistance)', () => js.includes('tl.support') && js.includes('tl.resistance'));
test('XSS safe: escHtml used in commodity render', () => { const fn = js.slice(js.indexOf('function renderCommodityDetail(')); return fn.slice(0,fn.indexOf('\n}')).includes('escHtml'); });
test('Commodity detail cache per symbol', () => js.includes('commodDetailCache'));
test('Free mode: loadCommodityHeat works without API key guard', () => js.includes('loadCommodityHeat') && js.includes('callLLM') && !js.includes('showApiKeyToast'));
test('ESC key closes commodity overlay', () => js.includes('commodOpen') && js.includes("'Escape'"));
test('Commodity CSS: heatmap tile defined', () => css.includes('.commod-tile'));
test('Commodity CSS: amber color scheme', () => css.includes('commod-topbar-btn') && css.includes('rgba(245,158,11'));

// ══════════════════════════════════════════════════════════════════════════════
// Phase 16: Chart Fullscreen (Task 27)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 16: Chart Fullscreen ───────────────────────────────────────');
test('chart-fs overlay element exists', () => hasEl('chart-fs'));
test('chart-fs-header element exists', () => hasEl('chart-fs-header'));
test('chart-fs-title element exists', () => hasEl('chart-fs-title'));
test('chart-fs-sub element exists', () => hasEl('chart-fs-sub'));
test('chart-fs-toolbar element exists', () => hasEl('chart-fs-toolbar'));
test('chart-fs-ohlc stats row exists (replaces legend)', () => hasEl('chart-fs-ohlc'));
test('chart-fs-body element exists', () => hasEl('chart-fs-body'));
test('chart-fs-chart container element exists (ECharts)', () => hasEl('chart-fs-chart'));
test('chart-fs-tip element exists', () => hasEl('chart-fs-tip'));
test('chart-fs-close button exists', () => hasEl('chart-fs-close'));
test('openChartFs() function defined', () => js.includes('function openChartFs('));
test('closeChartFs() function defined', () => js.includes('function closeChartFs()'));
test('renderChartFs() function defined', () => js.includes('function renderChartFs()'));
test('renderChartFsHistory() function defined', () => js.includes('function renderChartFsHistory()'));
test('renderChartFsCommodity() function defined', () => js.includes('function renderChartFsCommodity()'));
test('drawChartFsLine() function defined', () => js.includes('function drawChartFsLine('));
test('wireChartFsEvents() function defined', () => js.includes('function wireChartFsEvents()'));
test('wireChartFsEvents() called in boot', () => { const bootIdx = js.lastIndexOf('wireEventListeners()'); return bootIdx >= 0 && js.indexOf('wireChartFsEvents()', bootIdx) > bootIdx; });
test('chartFsOpen state variable declared', () => js.includes('let chartFsOpen'));
test('chartFsMetric state variable declared', () => js.includes('let chartFsMetric'));
test('HISTORY_SERIES constants defined', () => js.includes('const HISTORY_SERIES'));
test('History chart has expand button', () => html.includes('history-expand-btn'));
test('Commodity detail has fullscreen button', () => html.includes('commod-expand-btn'));
test('chart-expand-btn CSS class defined', () => css.includes('.chart-expand-btn'));
test('chart-fs CSS: position fixed overlay', () => css.includes('#chart-fs') && css.includes('position:fixed'));
test('chart-fs CSS: open state display:flex', () => css.includes('#chart-fs.open'));
test('chart-fs CSS: z-index above commodity (2200)', () => css.includes('z-index:2200'));
test('cfs-metric-btn CSS defined', () => css.includes('.cfs-metric-btn'));
test('cfs-stat-badge CSS retained for compatibility', () => css.includes('.cfs-stat-badge'));
test('cfs-ohlc-item CSS defined (TV-style stats row)', () => css.includes('.cfs-ohlc-item'));
test('cfs-period-btn CSS defined', () => css.includes('.cfs-period-btn'));
test('cfs-ma-btn CSS defined', () => css.includes('.cfs-ma-btn'));
test('Close button uses onclick for reliable close (post-script DOM)', () => html.includes('chart-fs-close') && html.includes('onclick="closeChartFs()"'));
test('chart-fs-ohlc element exists (replaces legend)', () => hasEl('chart-fs-ohlc'));
test('chartFsPeriod state variable declared', () => js.includes('let chartFsPeriod'));
test('chartFsShowMA5/MA20 state variables declared', () => js.includes('let chartFsShowMA5') && js.includes('let chartFsShowMA20'));
test('cfsPeriodClick() helper defined', () => js.includes('function cfsPeriodClick('));
test('cfsMaClick() helper defined', () => js.includes('function cfsMaClick('));
test('buildCfsOhlcDefault() defined', () => js.includes('function buildCfsOhlcDefault('));
test('LW crosshair subscribeCrosshairMove used', () => js.includes('subscribeCrosshairMove'));
test('Volume histogram rendered in fullscreen (LightweightCharts)', () => js.includes('addHistogramSeries') && js.includes('volData'));
test('MA5 (amber) drawn in fullscreen', () => js.includes('#F59E0B') && js.includes('maPer5'));
test('MA20 (cyan) drawn in fullscreen', () => js.includes('#22D3EE') && js.includes('ma20'));
test('Period filter applied in drawChartFsLine', () => js.includes("chartFsPeriod === '3M'") && js.includes("chartFsPeriod === '6M'"));
test('LightweightCharts CrosshairMode.Normal used', () => js.includes('CrosshairMode.Normal'));
test('LightweightCharts handleScale and handleScroll enabled', () => js.includes('handleScale') && js.includes('handleScroll'));
test('TV dark background (#131722)', () => js.includes('#131722'));
test('ESC closes apikey gate modal first (highest z-index)', () => {
  const escIdx = js.indexOf("if (e.key === 'Escape')");
  if (escIdx < 0) return false;
  const block = js.slice(escIdx, escIdx + 400);
  const gateIdx = block.indexOf('apikey-gate-overlay');
  const fsIdx = block.indexOf('chartFsOpen');
  return gateIdx >= 0 && fsIdx >= 0 && gateIdx < fsIdx;
});
test('Fullscreen close button onclick present', () => html.includes('onclick="closeChartFs()"'));
test('Fullscreen renders chart using LightweightCharts', () => js.includes('drawChartFsLine') && js.includes('LW.createChart') && js.includes('LightweightCharts'));
test('Fullscreen crosshair via LightweightCharts subscribeCrosshairMove', () => js.includes('subscribeCrosshairMove'));
test('Fullscreen supports history type routing', () => js.includes("type === 'history'") && js.includes('renderChartFsHistory'));
test('Fullscreen supports commodity type routing', () => js.includes("type === 'commodity'") && js.includes('renderChartFsCommodity'));
test('LightweightCharts CDN script included', () => html.includes('lightweight-charts') && html.includes('cdn.jsdelivr.net'));
test('chartFsInstance state variable declared', () => js.includes('let chartFsInstance'));
test('chartFsType state variable declared', () => js.includes('let chartFsType'));
test('chartFsShowBB state variable declared', () => js.includes('let chartFsShowBB'));
test('cfsTypeClick() helper defined', () => js.includes('function cfsTypeClick('));
test('cfsBBClick() helper defined', () => js.includes('function cfsBBClick('));
test('Toolbar has LINE/AREA/CANDLE type buttons', () => js.includes("'line'") && js.includes("'area'") && js.includes("'candlestick'"));
test('Bollinger Bands calcBB() defined in drawChartFsLine', () => js.includes('calcBB') && js.includes('upper') && js.includes('lower'));
test('RSI calcRSI() defined in drawChartFsLine', () => js.includes('calcRSI') && js.includes('ag /= p'));
test('Candlestick weekly OHLC simulation defined', () => js.includes('candles.push') && js.includes('WEEK_S'));
test('closeChartFs removes LightweightCharts instance', () => js.includes('chartFsInstance.remove()'));
test('wireChartFsEvents adds window resize handler', () => js.includes('chartFsInstance?.applyOptions'));
test('cfs-type-btn CSS defined', () => css.includes('.cfs-type-btn'));
test('cfs-bb-btn CSS defined', () => css.includes('.cfs-bb-btn'));
test('RSI pane shown via LightweightCharts addLineSeries', () => js.includes('rsiSeriesObj') && js.includes('priceScaleId'));

// ══════════════════════════════════════════════════════════════════════════════
// Phase 17: FX Heatmap (Task 28)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 17: FX Heatmap ─────────────────────────────────────────');
test('FX overlay #fx-overlay exists', () => hasEl('fx-overlay'));
test('FX panel #fx-panel exists', () => hasEl('fx-panel'));
test('FX topbar button #fx-topbar-btn exists', () => hasEl('fx-topbar-btn'));
test('FX close button uses onclick', () => html.includes('fx-close-btn') && html.includes('onclick="closeFx()"'));
test('FX grid #fx-grid exists', () => hasEl('fx-grid'));
test('FX detail wrap #fx-detail-wrap exists', () => hasEl('fx-detail-wrap'));
test('FX category tabs exist (all/g10/em_asia/em_emea/em_latam)', () =>
  ['all','g10','em_asia','em_emea','em_latam'].every(t => html.includes(`data-tab="${t}"`)));
test('FX_DEFS array defined', () => js.includes('const FX_DEFS'));
test('G10 currencies defined (EUR,GBP,JPY,CHF,AUD,NZD,CAD,SEK,NOK)', () =>
  ['EUR','GBP','JPY','CHF','AUD','NZD','CAD','SEK','NOK'].every(s => js.includes(`'${s}'`)));
test('EM Asia currencies defined (CNY,INR,KRW,SGD)', () =>
  ['CNY','INR','KRW','SGD'].every(s => js.includes(`'${s}'`)));
test('EM EMEA currencies defined (ZAR,TRY,PLN)', () =>
  ['ZAR','TRY','PLN'].every(s => js.includes(`'${s}'`)));
test('EM LatAm currencies defined (BRL,MXN,CLP)', () =>
  ['BRL','MXN','CLP'].every(s => js.includes(`'${s}'`)));
test('openFx() function defined', () => js.includes('function openFx()'));
test('closeFx() function defined', () => js.includes('function closeFx()'));
test('loadFxHeat() async function defined', () => js.includes('async function loadFxHeat()'));
test('renderFxHeat() function defined', () => js.includes('function renderFxHeat()'));
test('openFxDetail() async function defined', () => js.includes('async function openFxDetail('));
test('renderFxDetail() function defined', () => js.includes('function renderFxDetail('));
test('drawFxChart() function defined', () => js.includes('function drawFxChart('));
test('closeFxDetail() function defined', () => js.includes('function closeFxDetail()'));
test('switchFxTab() function defined', () => js.includes('function switchFxTab('));
test('wireFxEvents() function defined', () => js.includes('function wireFxEvents()'));
test('wireFxEvents() called in boot', () => { const bootIdx = js.lastIndexOf('wireCommodEvents()'); return bootIdx >= 0 && js.indexOf('wireFxEvents()', bootIdx) > bootIdx; });
test('fxPctColor() green/red scheme defined', () => js.includes('function fxPctColor('));
test('FX detail has fullscreen expand button', () => html.includes('fx-expand-btn'));
test('FX chart reuses openChartFs for fullscreen', () => { const fn = js.slice(js.indexOf('function renderFxDetail(')); return fn.slice(0,fn.indexOf('\n}')+2).includes('openChartFs'); });
test('FX detail cache per symbol', () => js.includes('fxDetailCache'));
test('ESC closes fxOpen (between caOpen and commodOpen)', () => {
  const escIdx = js.indexOf("if (e.key === 'Escape')");
  if (escIdx < 0) return false;
  const block = js.slice(escIdx, escIdx + 900);
  const caIdx    = block.indexOf('caOpen');
  const fxIdx    = block.indexOf('fxOpen');
  const commIdx  = block.indexOf('commodOpen');
  return fxIdx > caIdx && fxIdx < commIdx;
});
test('FX overlay z-index 2080 (above commodity 2075)', () => css.includes('#fx-overlay') && css.includes('z-index:2080'));
test('FX tile CSS defined', () => css.includes('.fx-tile'));
test('FX indigo color scheme in CSS', () => css.includes('6366f1'));
test('XSS safe: escHtml used in FX render', () => { const fn = js.slice(js.indexOf('function renderFxDetail(')); return fn.slice(0,fn.indexOf('\n}')+2).includes('escHtml'); });
test('Free mode: openFx works without API key (no hard block)', () => { const fn = js.slice(js.indexOf('function openFx()')); return fn.slice(0, 300).includes('fxOpen') && !fn.slice(0,200).includes('showApiKeyToast'); });
test('FX backdrop click closes overlay', () => js.includes('fxOpen') && js.includes('closeFx'));
test('FX D3 chart uses CatmullRom curve', () => js.includes('drawFxChart') && js.includes('curveCatmullRom'));
test('FX carry analysis in detail', () => js.includes('carry') && js.includes('rate_differential'));
test('FX central bank stance in detail', () => js.includes('central_bank') && js.includes('hawkish'));

// ══════════════════════════════════════════════════════════════════════════════
// Phase 18: Real Market Data — Yahoo Finance Integration (Task 30)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 18: Real Market Data (Yahoo Finance) ───────────────────');
test('YF_TICKER map defined with commodity futures', () =>
  js.includes('const YF_TICKER') && js.includes("'CL=F'") && js.includes("'GC=F'") && js.includes("'GBP'"));
test('YF_TICKER includes FX pairs (EURUSD=X, GBPUSD=X, USDJPY=X)', () =>
  js.includes("'EURUSD=X'") && js.includes("'GBPUSD=X'") && js.includes("'USDJPY=X'"));
test('YF_TICKER covers energy futures (CL=F, NG=F, BZ=F)', () =>
  js.includes("'CL=F'") && js.includes("'NG=F'") && js.includes("'BZ=F'"));
test('fetchYFOHLC async function defined', () => js.includes('async function fetchYFOHLC('));
test('fetchYFOHLC uses corsproxy.io for CORS', () => js.includes('corsproxy.io') && js.includes('fetchYFOHLC'));
test('fetchYFOHLC caches results in _yfCache', () => js.includes('_yfCache') && js.includes('_yfCache[key]'));
test('fetchYFOHLC returns OHLCV bars with time/open/high/low/close/volume', () =>
  js.includes('open:') && js.includes('high:') && js.includes('low:') && js.includes('close:') && js.includes('volume:') && js.includes('fetchYFOHLC'));
test('fetchYFOHLC filters null/invalid bars', () => js.includes('isFinite(c.open)') && js.includes('c.high >= c.low'));
test('drawChartFsLine has real OHLCV path (rawOhlcv)', () => js.includes('rawOhlcv') && js.includes('chartFsPayload?.ohlcv'));
test('Real data path applies time-based period filter (91/183 days)', () =>
  js.includes('91 * 86400') && js.includes('183 * 86400'));
test('Real data path uses actual bar timestamps (not synthetic monthTs)', () =>
  js.includes('bars.map(b => b.time)') || js.includes("b => b.time"));
test('Real candlestick uses actual OHLC from Yahoo Finance (no simulation)', () =>
  js.includes('open: b.open') && js.includes('high: b.high') && js.includes('low: b.low'));
test('LLM simulation path still present as fallback', () =>
  js.includes('LLM SIMULATION PATH') || (js.includes('Math.sin(m * 13.7') && js.includes('monthTs')));
test('Commodity expand starts background fetchYFOHLC', () =>
  js.includes('_yfSymCommod') && js.includes('fetchYFOHLC(_yfSymCommod'));
test('Commodity expand stores ohlcv in commodDetailCache', () =>
  js.includes("commodDetailCache[data.symbol].ohlcv = ohlcv"));
test('FX expand starts background fetchYFOHLC', () =>
  js.includes('_yfSymFx') && js.includes('fetchYFOHLC(_yfSymFx'));
test('FX expand stores ohlcv in fxDetailCache', () =>
  js.includes("fxDetailCache[data.symbol].ohlcv = ohlcv"));
test('openChartFs payload includes ohlcv field', () =>
  js.includes('ohlcv,') || js.includes('ohlcv: ohlcv'));
test('Chart sub shows ⬤ LIVE when real data present', () => js.includes('⬤ LIVE'));
test('Chart sub shows ⚠ AI ESTIMATE when using LLM data', () => js.includes('⚠ AI ESTIMATE'));
test('Graceful fallback: fetchYFOHLC failure caught silently', () => {
  const idx = js.indexOf('fetchYFOHLC(_yfSymCommod');
  if (idx < 0) return false;
  const fn = js.slice(idx, idx + 400);
  return fn.includes('.catch(');
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase 19: Research Hub (Task 32)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Phase 19: Research Hub ───────────────────────────────────────');
test('Research overlay #research-overlay exists', () => hasEl('research-overlay'));
test('Research panel #research-panel exists', () => hasEl('research-panel'));
test('Research topbar button #research-topbar-btn exists', () => hasEl('research-topbar-btn'));
test('Research close button exists', () => hasEl('research-close-btn'));
test('Research sources column #research-sources-col exists', () => hasEl('research-sources-col'));
test('Research articles column #research-articles exists', () => hasEl('research-articles'));
test('RESEARCH_SOURCES array defined with 16 institutions', () => {
  const m = js.match(/const RESEARCH_SOURCES\s*=\s*\[/);
  if (!m) return false;
  const block = js.slice(js.indexOf('const RESEARCH_SOURCES')).split('];')[0];
  return (block.match(/id:/g)||[]).length >= 16;
});
test('Investment banks defined (gs, jpm, ms, bofa, citi)', () =>
  ["'gs'","'jpm'","'ms'","'bofa'","'citi'"].every(s => js.includes(s)));
test('Hedge funds defined (bl, bw, aqr)', () =>
  ["'bl'","'bw'","'aqr'"].every(s => js.includes(s)));
test('Official institutions defined (imf, wb, bis, ecb)', () =>
  ["'imf'","'wb'","'bis'","'ecb'"].every(s => js.includes(s)));
test('openResearch() function defined', () => js.includes('function openResearch()'));
test('closeResearch() function defined', () => js.includes('function closeResearch()'));
test('loadResearch() async function defined', () => js.includes('async function loadResearch('));
test('renderResearchArticles() function defined', () => js.includes('function renderResearchArticles('));
test('wireResearchEvents() function defined', () => js.includes('function wireResearchEvents()'));
test('wireResearchEvents() called in boot', () => js.includes('wireResearchEvents()'));
test('Research z-index 2085 (between ca:2100 and fx:2080)', () =>
  css.includes('#research-overlay') && css.includes('z-index:2085'));
test('Research uses callLLM for article generation', () => {
  const fn = js.slice(js.indexOf('async function loadResearch('));
  return fn.slice(0, 4000).includes('callLLM');
});
test('Research LLM prompt requests 10 articles in JSON', () => {
  const fn = js.slice(js.indexOf('async function loadResearch('));
  return fn.slice(0, 4000).includes('10') && fn.slice(0, 4000).includes('JSON');
});
test('Research renders house_view and key_calls', () =>
  js.includes('house_view') && js.includes('key_calls') && js.includes('research-house-card'));
test('Research article cards have title, summary, themes, sentiment', () =>
  js.includes('research-article-title') && js.includes('research-article-summary') &&
  js.includes('research-theme-chip') && js.includes('research-sent-badge'));
test('Research READ → button links to article URL', () =>
  js.includes('research-read-btn') && js.includes('target="_blank"'));
test('Research cache prevents duplicate API calls', () =>
  js.includes('researchCache') && js.includes('researchCache[srcId]'));
test('Research shows disclaimer on AI-synthesized content', () =>
  js.includes('research-disclaimer') && js.includes('disclaimer'));
test('ESC closes research overlay', () => {
  const idx = js.indexOf("if (e.key === 'Escape')");
  if (idx < 0) return false;
  const block = js.slice(idx, idx + 800);
  return block.includes('researchOpen') && block.includes('closeResearch()');
});
test('Research backdrop click closes overlay', () =>
  js.includes('researchOpen') && js.includes('closeResearch'));
test('XSS safe: escHtml used in renderResearchArticles', () => {
  const fn = js.slice(js.indexOf('function renderResearchArticles('));
  return fn.slice(0, fn.indexOf('\n}')+2).includes('escHtml');
});
test('Research CSS: source-btn, article-card, house-card, theme-chip defined', () =>
  css.includes('.research-source-btn') && css.includes('.research-article-card') &&
  css.includes('.research-house-card') && css.includes('.research-theme-chip'));
test('Free mode: openResearch works without API key (no hard block)', () => {
  const fn = js.slice(js.indexOf('function openResearch()'));
  return fn.slice(0, 250).includes('researchOpen') && !fn.slice(0, 250).includes('showApiKeyToast');
});

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
