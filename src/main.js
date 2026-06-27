// Meridiax — main entry point
// Import order matters: storage FIRST (fixes TDZ), then constants, then state.
import './style.css';
import './core/storage.js';
import './core/constants.js';
import './core/state.js';

// Phase 2: API layer
import './api/llm.js';
import './api/market-data.js';
import './api/sentiment.js';

// Phase 3: Auth + Map
import './auth/auth.js';
import './map/map.js';

// Phase 4: panels
import './panels/panel.js';
import './panels/watchlist.js';
import './panels/deep-analysis.js';
import './panels/custom-analysis.js';
import './panels/news.js';
import './panels/authority.js';
import './panels/stocks.js';
import './panels/fx.js';
import './panels/commodities.js';
import './panels/research.js';
import './panels/calendar.js';
import './panels/community.js';
import './panels/profile.js';

// Phase 4: utils
import './utils/toast.js';
import './utils/ticker.js';
import './utils/chart.js';
import './utils/history-chart.js';
import './utils/expand.js';
import './utils/language.js';
import './utils/social.js';
import './utils/search.js';
import './utils/keyboard-shortcuts.js';
import './utils/misc.js';

// Named imports used in boot sequence
import { storageGet } from './core/storage.js';
import { META } from './core/constants.js';
import { apiKey, tickerTimer, setApiKey, setTickerTimer, cache, _sentimentInFlight, setSocialFilter } from './core/state.js';
import { wireLoginEvents, loadSession, applySession, handleGoogleCredential } from './auth/auth.js';
import { initMap } from './map/map.js';
import { fetchSentiment } from './api/sentiment.js';
import { loadWatchlistFromStorage } from './panels/watchlist.js';
import { wireCommEvents, loadCommOwners, loadLocalPosts } from './panels/community.js';
import { wireProfileEvents, openProfile } from './panels/profile.js';
import { wireFxEvents } from './panels/fx.js';
import { wireCommodEvents } from './panels/commodities.js';
import { wireResearchEvents } from './panels/research.js';
import { wireChartFsEvents } from './utils/chart.js';
import { wireApiKeyWidget, refreshMacroContextFromWB } from './utils/misc.js';
import { loadTickers, startMiniClock } from './utils/ticker.js';
import { wireEventListeners } from './utils/keyboard-shortcuts.js';
import { checkNewsletterAutoNotify } from './panels/profile.js';

// Google Identity Services requires handleGoogleCredential on window
window.handleGoogleCredential = handleGoogleCredential;

// Expose shared state objects for modules that reference them via window (hover prefetch etc.)
window._META                = META;
window._cache               = cache;
window._sentimentInFlight   = _sentimentInFlight;
window.fetchSentiment       = fetchSentiment;
window._setSocialFilter     = (v) => { setSocialFilter(v); };

// ── Boot sequence ─────────────────────────────────────────────────────────────

// 1. Wire all panel event handlers
wireLoginEvents();
wireProfileEvents();
wireCommodEvents();
wireFxEvents();
wireResearchEvents();
wireCommEvents();
loadCommOwners();
loadLocalPosts();

// 2. Restore session
const session = loadSession();
if (session) applySession(session);

// Wire topbar username -> open profile (done after session restore so element is visible)
document.getElementById('topbar-username')?.addEventListener('click', openProfile);

// 3. Watchlist, keyboard shortcuts, chart, API key widget
loadWatchlistFromStorage();
wireEventListeners();
wireChartFsEvents();
wireApiKeyWidget();

// 4. Map (async — non-blocking)
initMap();

// 5. Restore FRED key into input
const savedFredKey = storageGet('gmi_fred_key');
const fredInp = document.getElementById('fred-key-input');
if (savedFredKey && fredInp) fredInp.value = savedFredKey;

// 6. Restore API key from storage
const savedApiKey = storageGet('gmi_api_key');
if (savedApiKey) {
  setApiKey(savedApiKey);
  const apiInp = document.getElementById('api-input');
  if (apiInp) apiInp.value = savedApiKey;
}

// 7. Tickers — start immediately, then on a 5-minute interval
loadTickers();
refreshMacroContextFromWB();
if (!tickerTimer) setTickerTimer(setInterval(loadTickers, 300000));

// 8. Newsletter auto-notify check
checkNewsletterAutoNotify();

// 9. Mini clock
startMiniClock();

// 10. Title + service worker
document.title = 'Meridiax';
navigator.serviceWorker?.register('/sw.js');

// 11. Remove splash loader — CSS kept overlays hidden until this point
requestAnimationFrame(() => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.transition = 'opacity 0.35s ease';
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 380);
  }
});
