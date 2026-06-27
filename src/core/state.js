// state.js — all mutable global state.
// imports storage.js (always evaluated first via main.js import order).
import { storageGet } from './storage.js';

// Core UI state
export let apiKey = '';
export let activeId = null;
export let newsOpen = false;
export let authorityOpen = false;
export let langNative = false;
export let socialOpen = false;
export let socialScope = 'global';
export let socialFilter = '';

// Cache objects
export let cache = {};
export let stocksCache = {};
export let authorityCache = {};
export let translationCache = {};
export let socialCache = {};
export let newsCache = {};

// In-flight dedup sets
export const _sentimentInFlight = new Set();
export const _newsInFlight      = new Set();
export const _authInFlight      = new Set();
export const _deepInFlight      = new Set();

// Country state
export let currentCountryMeta = null;
export let currentStocks      = [];
export let currentSector      = 'all';
export let countryMeta        = {};
export let worldData          = null;
export let projection, path;

// Country selector
export let countryMode        = 'all';
export let selectedCountries  = new Set();

// Watchlist
export let watchlistOpen      = false;
export let watchlist          = [];
export let watchlistSentCache = {};

// Custom analysis
export let caOpen    = false;
export let customTags = [];
export let caRunning  = false;
export let expandCache = {};

// Deep analysis
export let deepOpen = false;
export let deepTab  = 'overview';
export let deepCache = {};

// History chart
export let historyOpen        = false;
export let historyMetric      = 'gdp';
export let historyCache       = {};
export let historyCurrentData = null;

// Chart fullscreen
export let chartFsOpen      = false;
export let chartFsPayload   = null;
export let chartFsMetric    = 'gdp';
export let chartFsPeriod    = 'ALL';
export let chartFsShowEMA9  = true;
export let chartFsShowEMA21 = true;
export let chartFsShowEMA50 = false;
export let chartFsShowEMA200= false;
export let chartFsInstance  = null;
export let chartFsType      = 'line';
export let chartFsShowBB    = false;
export let chartFsOscillator= 'rsi';

// Search
export let searchOpen      = false;
export let searchActiveIdx = -1;

// Panel open states
export let fxOpen    = false;
export let fxData    = [];
export let fxLoading = false;
export let fxTab     = 'all';
export let fxDetailSym   = null;
export let fxDetailCache = {};

export let commodOpen    = false;
export let commodData    = [];
export let commodLoading = false;
export let commodTab     = 'all';
export let commodSort    = 'pct';
export let commodDetailCache = {};

export let researchOpen    = false;
export let researchData    = null;
export let researchLoading = false;
export let researchCat     = 'banks';

export let calOpen    = false;
export let calFilter  = 'all';

export let commOpen  = false;
export let commTab   = 'feed';
export let commTag   = null;
export let commSort  = 'newest';
export let commOwners = [];
export let _fbApp    = null;
export let _fbDb     = null;
export let _commUnsubPosts = null;
export let _commLocalPosts = [];

export let profileOpen = false;
export let profileTab  = 'daily';
export let digestCache = {};
export let digestExpandCache = {};
export let userRegion  = 'global';

export let watchlistOpen2 = false; // alias kept for compat — use watchlistOpen

export let shortcutsOpen = false;
export let socialPanelOpen = false;

// Ticker timer
export let tickerTimer = null;
export let _tickerVisibilityWired = false;

// Auth state
export let authMode = 'login';
export let _pendingAuthCallback = null;
export let _cachedSession = undefined;

// Community board
export const COMM_OWNERS_KEY_STATE = 'gmi_comm_owners';

// Newsletter state — these call storageGet, safe here because storage.js is imported first
export let nlEmail     = storageGet('gmi_nl_email')    || '';
export let nlSubDaily  = storageGet('gmi_nl_daily')    === '1';
export let nlSubWeekly = storageGet('gmi_nl_weekly')   === '1';

// Opportunity horizon
export let oppHorizon = storageGet('gmi_opp_horizon') || 'WEEK';

// Setters for primitives (ES module live bindings for let exports work, but setters are clearer)
export function setApiKey(k)       { apiKey = k; }
export function setActiveId(id)    { activeId = id; }
export function setWorldData(d)    { worldData = d; }
export function setProjection(p)   { projection = p; }
export function setPath(p)         { path = p; }
export function setCurrentCountryMeta(m) { currentCountryMeta = m; }
export function setTickerTimer(t)  { tickerTimer = t; }
export function setTickerVisibilityWired(v) { _tickerVisibilityWired = v; }
export function setLangNative(v)   { langNative = v; }
export function setNewsOpen(v)     { newsOpen = v; }
export function setAuthorityOpen(v){ authorityOpen = v; }
export function setHistoryOpen(v)  { historyOpen = v; }
export function setHistoryCurrentData(v) { historyCurrentData = v; }
export function setSocialScope(v)  { socialScope = v; }
export function setSocialOpen(v)   { socialOpen = v; }
export function setFxOpen(v)       { fxOpen = v; }
export function setCommodOpen(v)   { commodOpen = v; }
export function setResearchOpen(v) { researchOpen = v; }
export function setCalOpen(v)      { calOpen = v; }
export function setCommOpen(v)     { commOpen = v; }
export function setProfileOpen(v)  { profileOpen = v; }
export function setSearchOpen(v)   { searchOpen = v; }
export function setWatchlistOpen(v){ watchlistOpen = v; }
export function setDeepOpen(v)     { deepOpen = v; }
export function setCaOpen(v)       { caOpen = v; }
export function setHistoryMetric(v){ historyMetric = v; }
export function setApiKeyState(k)  { apiKey = k; } // alias — prefer setApiKey
export function setCachedSession(s){ _cachedSession = s; }
export function setAuthMode(m)     { authMode = m; }
export function setPendingAuthCallback(cb) { _pendingAuthCallback = cb; }
export function setCountryMode(v)          { countryMode = v; }
export function setSocialFilter(v)         { socialFilter = v; }
