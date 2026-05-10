# Meridiax

> AI-powered macro intelligence terminal for analysts, traders, and researchers — delivered as a single self-contained HTML file.

![Tests](https://img.shields.io/badge/tests-510%2F510%20passing-brightgreen)
![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-informational)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash%20%7C%20Claude%20%7C%20Free%20Mode-blue)
![Charts](https://img.shields.io/badge/charts-D3.js%20v7%20%7C%20TradingView%20LW-orange)
![PWA](https://img.shields.io/badge/PWA-installable-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Click any country on the world map and instantly get an AI-generated macro brief — sentiment regime, equity bias, rate outlook, FX bias, risk level, rationale, central bank publications, news, social sentiment, and historical charts. No API key needed for country analysis. Advanced features (Deep Analysis, Research Hub, FX/Commodities heatmaps, Digest, Opportunities, Custom Analysis, Stocks) unlock with your own Gemini or Claude API key.

Everything runs in a **single HTML file** (~636 KB · ~8 420 JS lines) with zero dependencies to install.

---

## Access Tiers

### Free — no API key required
- Interactive world map — click any of 195 countries
- AI country sentiment panel (Pollinations.ai free backend)
- Macro news feed, authority publications, social sentiment
- History chart, language translation, expand-to-detail
- Community Board (post, discuss, like, comment)
- Live ticker tape (DXY, Gold, WTI, VIX, US10Y)

### Advanced — requires your own API key (Gemini or Claude)
- Deep Analysis overlay (5-tab per-country deep dive)
- Research Hub (16 institutions — Goldman, JPMorgan, IMF, BIS, ECB, and more)
- FX Markets heatmap (G10 + EM currencies)
- Commodity Markets heatmap
- Stock Market Analysis (top-30 constituents + individual stock deep-dive)
- Custom Analysis Builder (multi-theme thematic reports)
- Daily Capsule & Weekly Digest
- Opportunities (AI trade ideas by horizon)

API keys are stored on-device only — never sent to any server other than the selected AI provider. Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com) or a Claude key at [console.anthropic.com](https://console.anthropic.com).

---

## Features

### Map & Country Analysis (Free)
- **Interactive world map** — flat equirectangular D3 projection; click any of 195 countries
- **Country sentiment panel** — sentiment score (−1 to +1), regime pill, key indicator chips (equity, rate, FX, risk, currency), AI rationale; **FC ADJ** amber badge when factor-composite blending was applied; **📊 ANCHORED** badge when Q1 2025 MACRO_CONTEXT was injected
- **Regime shift detection** — compares new analysis against cached previous result; amber ⚠ SHIFT banner when sentiment flips (non-neutral) or regime changes with Δ ≥ 0.20
- **Factor-score coherence** — 6-factor weighted composite (growth/inflation/monetary/FX/geopolitical/market) cross-checks the LLM's reported score; blended automatically if deviation exceeds 15%
- **Historical macro chart** — D3 multi-line chart: GDP, Inflation, Rate, FX over 20 quarters (Q1 2020 – Q4 2024)
- **Authority publications** — links to 54 central banks and finance ministries
- **Macro news feed** — AI-generated news with clickable source URLs
- **Social sentiment panel** — community-style macro posts with hashtag/topic filter
- **Regional language translation** — one-click full panel translation to the country's native language
- **Expand-to-detail** — inline deep-dives on any news or data point

### Advanced Analysis (API Key Required)
- **Deep Analysis overlay** — full-screen 5-tab deep dive per country (Overview, Economy, Markets, Risks, Outlook); 2000 tokens per tab
- **Stock Market Analysis** — top-30 equities for the active country's index; per-stock AI analysis
- **Custom Analysis Builder** — tag up to 10 themes; generates a full report with D3 arc sentiment gauge, trade ideas, opportunities, and risks
- **Opportunities** — AI-generated trade ideas across Day / Week / Month / Themes horizons
- **Daily Capsule & Weekly Digest** — personalised AI macro briefings; expand any item for deeper analysis
- **Newsletter** — generate and email your digest via EmailJS; preview in a new tab

### Research Hub (API Key Required)
- 16 institutions: Goldman Sachs, JPMorgan, Morgan Stanley, BofA, Citi, BlackRock, Bridgewater, AQR, IMF, World Bank, BIS, ECB, Fed, BoJ, BoE, MAS
- Per-institution house view, key calls, and 10 article cards with sentiment scoring
- Live RSS feeds for official institutions (IMF, BIS, ECB, World Bank); AI synthesis for investment banks
- Session-cached source results, keyword filter, refresh button

### FX & Commodity Markets (API Key Required)
- **FX heatmap** — G10 and EM currencies vs USD; colour-coded sentiment tiles
- **Commodity heatmap** — energy, metals, agriculture; colour-coded sentiment tiles
- **Full-screen TradingView charts** — LINE / AREA / CANDLESTICK; real 5-year OHLCV from Yahoo Finance (adjusted close, dual-tier: 5Y weekly + 1Y daily) with AI simulation fallback
- EMA9/21/50/200 overlays, Bollinger Bands (20,2), RSI(14) / MACD(12,26,9) / Stoch(14,3,3) oscillators, volume histogram, AI support/resistance price lines, AI trade signal overlay (direction, conviction %, entry/target/stop), LIVE / AI ESTIMATE badge

### Community Board (Free)
- **Feed** — post macro views; bullish / bearish / neutral tagging; like, comment, delete
- **Pulse** — AI sentiment analysis derived exclusively from community posts: bull/bear breakdown, top themes, narrative, consensus level
- **Firebase real-time sync** — optional Firestore integration for multi-user live boards; falls back to localStorage in local mode
- Search/filter posts · sort by newest or top liked · animated post entry · official-account badges

### Auth & Session
- **Login / Register** — full auth flow with djb2 password hashing
- **Social sign-in** — Google (GIS JWT), Apple (Sign in with Apple), GitHub (public API verification)
- **Three-tier storage** — localStorage → sessionStorage → in-memory fallback (private-mode safe)
- **Session persistence** — reload without re-logging-in

### Trader Productivity
- **Mini-ticker bar** — fixed bottom bar showing live DXY / GOLD / WTI / VIX / US10Y with colour-coded % change and UTC clock
- **Economic Calendar** — AI-generated 4-week forward event list (FOMC, ECB, NFP, CPI, PMIs, G7) with category/importance filters; opens via `E` key or toolbar button
- **Ctrl+K quick search** — instant search across 195 countries, 16 FX pairs, 11 commodities, and all sections; arrow-key navigation
- **Keyboard shortcuts** — `F`=FX · `X`=Commodities · `R`=Research · `E`=Calendar · `?`=shortcut cheat sheet · `ESC`=close any overlay

### Mobile & PWA
- **Progressive Web App** — installable on Android from Chrome; standalone mode, dark theme
- **Bottom navigation bar** — Social, Watchlist, Analyse, Community, Profile (phones ≤ 480 px)
- **Fully responsive** — 5 breakpoints (900 px, 768 px, 480 px, 360 px + mini-ticker mobile handling)
- **Offline support** — service worker caches app shell and map data
- **Touch-optimised** — `touch-action: manipulation` on map, 44 px tap targets

---

## Quickstart

```bash
# No install required — open directly in a browser
open global_macro_intel.html
```

Or deploy to any static host (see [deploy/README.md](deploy/README.md)).

**First run:**
1. Register an account (top-right sign-in button)
2. Click any country on the map — free AI analysis loads immediately
3. To unlock advanced features, open your profile → **⚙ API & SETTINGS** and paste a Gemini or Claude key

No build step. No `npm install`. No server.

---

## Project Structure

```
global_macro_intelligence/
├── global_macro_intel.html   # Entire application (~636 KB · ~8 420 JS lines)
│
├── deploy/                   # Production deploy assets
│   ├── index.html            # Synced copy of the app
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   ├── netlify.toml          # Netlify config + strict CSP headers
│   ├── vercel.json           # Vercel routes + CSP headers
│   ├── _headers              # Cloudflare Pages / Netlify headers syntax
│   └── README.md             # 5-option one-click deployment guide
│
├── android/                  # Android / mobile deployment
│   ├── index.html            # Mobile-optimised app copy
│   ├── manifest.json         # PWA manifest (standalone, dark theme)
│   ├── sw.js                 # Cache-first service worker
│   └── README.md             # PWA install · Capacitor APK · Play Store guide
│
├── test_e2e.js               # 510-test E2E suite (Node.js, no browser needed)
├── PROMPTS.md                # Full build log — 56 tasks with specs
└── README.md                 # This file
```

---

## Deploy in 30 seconds

### Netlify (drag & drop)
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**
2. Drag the `deploy/` folder onto the upload zone
3. Done — live at `https://random-name.netlify.app`

### GitHub Pages
```bash
git init && git add . && git commit -m "Initial release"
gh repo create global-macro-intelligence --public --source=. --push
# Settings → Pages → Branch: main / Folder: /deploy → Save
```

Full guide with Vercel, Cloudflare Pages, and Surge options: [deploy/README.md](deploy/README.md)

### Android / Mobile
See [android/README.md](android/README.md) for:
- **PWA install** (30 seconds, no app store)
- **Capacitor APK** (native Android wrapper)
- **Bubblewrap / TWA** (Google Play Store)

---

## Architecture

```
global_macro_intel.html
│
├── <head>
│   ├── D3.js v7                  (CDN — world map, history chart, sentiment gauge)
│   ├── TopoJSON v3               (CDN — world geometry)
│   ├── TradingView Lightweight   (CDN — candlestick / line / area charts)
│   ├── EmailJS v4                (CDN — newsletter delivery)
│   ├── Google Identity Services  (CDN — Google sign-in)
│   ├── Apple Sign-In JS          (CDN — Apple sign-in)
│   ├── PWA meta tags             (manifest, apple-mobile-web-app-capable)
│   └── Google Fonts              (Rajdhani + JetBrains Mono)
│
├── <style>               (~1900 lines)
│   ├── CSS custom properties     (:root — palette, fonts)
│   ├── Layout                    (topbar, map, panels, mobile nav, mini-ticker bar)
│   ├── Component styles          (chips, pills, badges, cards, gauges, FC ADJ, shift banner)
│   ├── Overlay styles            (deep, research, FX, commodities, community,
│   │                              watchlist, custom analysis, profile, API key gate)
│   └── Mobile responsive         (4 breakpoints, bottom nav, full-width panels)
│
├── <body>                (~700 lines)
│   ├── #login-overlay            Full-screen auth (login/register + Google/Apple/GitHub)
│   ├── #apikey-gate-overlay      API key prompt modal (shown on first access to paid features)
│   ├── #app
│   │   ├── #topbar               Logo · Community · FX · Commodities · User · Clock
│   │   └── #main
│   │       ├── #map-wrap         SVG world map (equirectangular D3 projection)
│   │       ├── #social-panel     Left floating panel — social sentiment
│   │       ├── #panel            Right sliding panel — country analysis detail
│   │       │   ├── #data-freshness-badge  📊 ANCHORED: Q1 2025 (shown when _econ_grounded)
│   │       │   └── #regime-shift-banner   ⚠ SHIFT (shown on sentiment flip or regime change)
│   │       ├── #deep-overlay     5-tab full-screen deep analysis
│   │       ├── #research-overlay Research Hub (16 institutions)
│   │       ├── #fx-overlay       FX heatmap + TradingView charts
│   │       ├── #commod-overlay   Commodity heatmap + TradingView charts
│   │       ├── #comm-overlay     Community Board (Feed · Pulse · Settings)
│   │       ├── #watchlist-*      Floating tab + sliding watchlist panel
│   │       ├── #ca-overlay       Custom analysis builder
│   │       └── #profile-overlay  Profile, Digest, Opportunities, Newsletter, ⚙ API
│   ├── #mini-ticker-bar          Fixed bottom bar — DXY/GOLD/WTI/VIX/US10Y + UTC clock
│   └── #mobile-nav               Bottom navigation (phones ≤ 480 px)
│
└── <script>              (~8 420 lines)
    ├── Constants
    │   ├── META{}                195 countries → {name, flag, currency, index, …}
    │   ├── AUTHORITY_INFO{}      54 central banks / finance ministries
    │   ├── RESEARCH_SOURCES[]    16 institution definitions (id, name, color, rss)
    │   ├── DEEP_TAB_PROMPTS{}    Per-tab prompt builders for deep analysis
    │   ├── OPP_HORIZONS[]        Trade-idea time horizons
    │   ├── DATA_VINTAGE          'Q1 2025' — snapshot date injected into LLM prompts
    │   ├── MACRO_CONTEXT{}       40-country Q1 2025 economic snapshots (GDP/CPI/rate/unemp/CA/PMI/note)
    │   └── HIGH_STAKES           Set of 20 ISO ids → dual-call self-consistency averaging
    │
    ├── Storage layer
    │   └── storageGet/Set/Remove  localStorage → sessionStorage → _memStore fallback
    │
    ├── API layer
    │   ├── detectProvider()       Returns 'gemini' | 'claude' | 'unknown' | null
    │   ├── callLLM(sys, usr, tokens, temp)
    │   │     Routes to Gemini 2.5 Flash, Claude Sonnet, or callLLMFree().
    │   │     45-second AbortController timeout on all paths.
    │   ├── callLLMFree(sys, usr, tokens)
    │   │     Pollinations.ai (free, CORS-enabled, no-auth) — GPT-4o backend.
    │   │     32-second AbortController timeout; markdown code-fence stripping.
    │   ├── requireApiKey(callback, featureName)
    │   │     Shows #apikey-gate-overlay when no key; fires callback on save.
    │   │     Gated: Deep Analysis, Research Hub, FX, Commodities, Stocks,
    │   │     Custom Analysis, Digest, Opportunities.
    │   ├── repairAndParseJSON(raw)
    │   │     7-step repair pipeline for truncated/malformed LLM JSON.
    │   ├── closeTruncated(s)
    │   │     Character-walk state machine — closes open strings/arrays/objects.
    │   └── validateSentimentResult(r)
    │         9-step post-parse validation including factor-composite coherence (Step 9):
    │         clamp score → clamp factors → set defaults → check fields → fix types
    │         → validate ranges → derive sentiment label → clamp band → coherence blend
    │
    ├── Map
    │   ├── initMap()              Fetches TopoJSON, renders SVG, wires events
    │   ├── selectCountry(d)       Sets active country, triggers panel + fetch
    │   ├── renderPanel(data)      Populates all side-panel DOM fields; shows FC ADJ / ⚠ SHIFT / 📊 ANCHORED badges
    │   ├── fetchSentiment(id)     Chain-of-thought prompt with MACRO_CONTEXT; HIGH_STAKES → dual LLM call
    │   │                          with smart voting (pickRegime/pickRisk) + regime shift detection
    │   └── pickRegime/pickRisk    Score-informed categorical tiebreakers for HIGH_STAKES dual-call averaging
    │
    ├── Free-tier features (no API key needed)
    │   ├── loadAuthorityPubs()    Central bank publications
    │   ├── loadNews()             Macro news with clickable source URLs
    │   ├── loadSocialSentiment()  Social-style macro posts; hashtag/topic filter
    │   ├── loadHistoryData()      20-quarter macro history → D3 chart
    │   ├── toggleLanguage()       Full panel translation
    │   └── loadExpandDetail()     Inline expand-to-detail for any summary
    │
    ├── Advanced features (API key required)
    │   ├── loadDeepSection(tab)   2000-token per-tab deep analysis (5 tabs)
    │   ├── openStocks()           Country equity screen (30 stocks + detail)
    │   ├── runCustomAnalysis()    2500-token multi-theme analysis + D3 gauge
    │   ├── loadDigestTab()        Daily / weekly AI macro digest
    │   ├── loadOpportunitiesTab() Trade opportunities by horizon
    │   ├── loadResearch(srcId)    Institution research + RSS + AI synthesis
    │   ├── loadCommodityHeat()    Commodity heatmap + TradingView charts
    │   └── loadFxHeat()           FX heatmap + TradingView charts
    │
    ├── Community Board (free — login required)
    │   ├── Local mode             localStorage with full CRUD
    │   ├── Firebase mode          Firestore real-time with onSnapshot listener
    │   └── analyzeCommunityPulse() AI sentiment from post content only
    │
    ├── Auth
    │   ├── hashPassword(pw)       djb2 deterministic hash
    │   ├── attemptLogin/Register  Validates against gmi_users
    │   ├── googleSignIn()         Google Identity Services JWT
    │   ├── appleSignIn()          Apple Sign-In JS SDK (popup mode)
    │   ├── githubSignIn()         Public GitHub API verification (no OAuth backend)
    │   └── loadSession()          Cached with `undefined` sentinel (not null)
    │
    └── Boot sequence
          wireLoginEvents() → wireProfileEvents() → wireCommEvents()
          → loadCommOwners() → loadLocalPosts()
          → restore API key from storage → restore session
          → loadWatchlistFromStorage() → wireEventListeners()
          → initMap() → loadTickers()
          → checkNewsletterAutoNotify() → register service worker
```

---

## LLM Routing

```
callLLM(systemPrompt, userPrompt, maxTokens, temperature)
    │
    ├── detectProvider() === null  ──► callLLMFree()  [Pollinations.ai, GPT-4o]
    ├── detectProvider() === 'gemini' ──► Gemini 2.5 Flash API
    └── detectProvider() === 'claude' ──► Claude Sonnet API
```

| Function | Max Tokens | Temp | Tier | Purpose |
|----------|-----------|------|------|---------|
| `fetchSentiment` (standard) | 800 | 0 | Free | Country macro sentiment JSON; MACRO_CONTEXT Q1 2025 anchor injected |
| `fetchSentiment` (HIGH_STAKES) | 800 × 2 | 0 × 2 | Free | Dual-call for 20 major economies; scores averaged; `pickRegime`/`pickRisk` smart voting |
| `loadAuthorityPubs` | 600 | 0 | Free | Central bank publications |
| `loadNews` | 700 | 0 | Free | Macro news with source URLs |
| `loadSocialSentiment` | 500 | 1.0 | Free | Social-style macro posts |
| `loadHistoryData` | 800 | 0 | Free | 20-quarter macro history (Q1 2020–Q4 2024) |
| `toggleLanguage` | 2000 | 0 | Free | Full panel translation |
| `loadExpandDetail` | 350 | 0.4 | Free | Expand-to-detail for any summary |
| `loadTickers` | 400 | 0 | Free | Global price ticker estimation |
| `loadDeepSection` | 2000 | 0 | Key | Per-tab deep country analysis |
| `fetchWatchlistSentiment` | 400 | 0.8 | Key | Per-item watchlist sentiment |
| `runCustomAnalysis` | 2500 | 0.3 | Key | Multi-theme thematic analysis |
| `loadDigestTab` | 2000 | 0.4 | Key | Daily / weekly macro digest |
| `loadOpportunitiesTab` | 2000 | 0.3 | Key | Trade opportunities by horizon |
| `loadResearch` | 1600 | 0.3 | Key | Institution research synthesis |
| `fetchStocks` | 400 | 0 | Key | Country equity screener |
| `fetchStockAnalysis` | 1000 | 0.3 | Key | Individual stock analysis |
| `analyzeCommunityPulse` | 600 | 0.2 | Key | Sentiment from community posts |
| `loadCommodityHeat` | 500 | 0 | Key | Commodity price/sentiment |
| `loadFxHeat` | 500 | 0 | Key | FX rate/sentiment |

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `gmi_users` | `{ [username]: { hash, displayName, created } }` |
| `gmi_session` | `{ username, displayName }` |
| `gmi_api_key` | User-entered Gemini / Claude API key |
| `gmi_watchlist` | `WatchlistItem[]` |
| `gmi_comm_local_posts` | Community posts (local mode) |
| `gmi_comm_owners` | Comma-separated official usernames |
| `gmi_comm_fb_config` | Firebase project config JSON |
| `gmi_nl_email` | Newsletter recipient email |
| `gmi_nl_sub_daily` | Daily digest subscription flag |
| `gmi_nl_sub_weekly` | Weekly digest subscription flag |
| `gmi_newsletter_*` | EmailJS service ID, template ID, public key |
| `gmi_apple_service_id` | Apple Sign-In Service ID |
| `gmi_digest_daily_*` | Cached daily digest JSON |
| `gmi_digest_weekly_*` | Cached weekly digest JSON |
| `gmi_opp_*` | Cached opportunities by horizon |

---

## Caching Strategy

All LLM responses are cached to avoid duplicate calls within a session:

| Cache | Key pattern | Scope |
|-------|-------------|-------|
| `cache` | ISO country id | Sentiment analysis |
| `deepCache` | `countryName\|tab` | Deep analysis per tab |
| `historyCache` | `countryName` | 20-quarter chart data (Q1 2020–Q4 2024) |
| `socialCache` | `countryName\|filter` | Social posts |
| `newsCache` | `countryName` | News feed |
| `authCache` | `countryName` | Authority publications |
| `watchlistSentCache` | item key | Watchlist sentiment |
| `stocksCache` | `countryName` | Equity screener |
| `researchCache` | source id | Research Hub articles |
| `commodData` | global array | Commodity heatmap |
| `fxData` | global array | FX heatmap |
| `digestCache` | storage key | Digest by tab + user |
| `oppCache` | horizon + user | Opportunities |
| `digestExpandCache` | section key | Expanded digest items |

`digestCache` and `oppCache` are also persisted to localStorage (keyed by user + date). All other caches are in-memory only — cleared on page reload.

---

## Performance

Key optimisations:

- **195 DOM refs cached** at boot for all hot-path panel fields
- **`will-change: transform`** on tooltip, social panel, watchlist panel
- **`contain: layout style`** on all scroll containers
- **Country `transition`** on fill + stroke only — `filter` excluded to prevent 195 GPU layer promotions on hover
- **`touch-action: manipulation`** on map SVG — eliminates 300 ms tap delay on mobile
- **Clock interval 10 s** (not 1 s)
- **Firebase SDK loaded dynamically** — only when user connects Firebase; not blocking at boot
- **TradingView charts rendered on-demand** — container cleared and redrawn on open
- **Yahoo Finance data cached per ticker** — no repeated CORS-proxy calls within a session
- **No `backdrop-filter`** on always-visible elements (topbar, legend) — only on modal overlays

---

## JSON Repair Pipeline

`repairAndParseJSON` applies 7 sequential steps to handle truncated or malformed LLM output:

1. Strip markdown code fences (` ```json … ``` `)
2. Extract the outermost `{…}` or `[…]` block
3. Remove trailing commas before `}` or `]`
4. Fix unescaped newlines inside string values
5. `closeTruncated()` — character-walk state machine closes open strings, arrays, objects
6. `JSON.parse`; on failure strip control characters and retry
7. Return `null` if all steps fail — callers show a graceful error state

---

## Security

- **API keys** persisted to localStorage (on-device only); never sent to any server except the selected AI provider
- **Free-tier requests** routed through Pollinations.ai with `private: true` — not indexed publicly
- **Passwords** hashed client-side with djb2 before storage; plaintext never persisted
- **XSS prevention** — all community post content, author names, and AI-generated strings rendered via `escHtml()` before `innerHTML` assignment
- **No `eval()`** anywhere in the codebase
- **CSP headers** in `deploy/netlify.toml`, `deploy/vercel.json`, and `deploy/_headers` restrict script and connect sources to only the required CDNs and APIs
- **Community posts** sent to AI for pulse analysis stripped of usernames — only `content` + `tag` fields
- **Social sign-in tokens** decoded client-side only; sub/email used as local account identifier, not forwarded

---

## Running the Tests

```bash
node test_e2e.js
```

No browser, no Playwright, no Puppeteer — pure Node.js static analysis of the HTML source.

```
═════════════════════════════════════════════════════════════════
  RESULTS   510/510 passing   0 failing   0 warnings
═════════════════════════════════════════════════════════════════
```

**21 test phases:**

| Phase | Tests | Coverage |
|-------|-------|----------|
| 1 — Core Structure | 23 | HTML, CDNs, DOM elements |
| 2 — Map & Country Analysis | 24 | Projection, panel refs, sentiment |
| 2 — API Layer | 10 | callLLM, callLLMFree, JSON repair, providers |
| 3 — Feature Panels | 14 | Social, news, authority, history, translation |
| 4 — Watchlist | 10 | CRUD, type detection, localStorage |
| 5 — Custom Analysis | 10 | Tags, gauge, gate, tokens |
| 6 — Authentication | 19 | Login, register, Google/Apple/GitHub, session |
| 7 — Profile / Digest / Newsletter / Opportunities | 26 | Digest, newsletter, opportunities, toast |
| 8 — Performance | 14 | DOM cache, will-change, contain, transitions |
| 9 — Community Board | 42 | Feed, posts, Firebase, local, escaping |
| 10 — Deploy Folder | 11 | Files, CSP, Netlify/Vercel config |
| 11 — Security & XSS | 7 | escHtml, no eval, key storage |
| 12 — UX / Edge Cases | 51 | Free mode, API gate, ESC, callbacks |
| 13 — Android / Mobile | 15 | PWA, service worker, responsive, bottom nav |
| 14 — Community Pulse | 16 | Analysis, render, XSS, prompt integrity |
| 15 — Commodity Heatmap | 35 | Grid, tiles, sorting, detail, charts |
| 16 — Chart Fullscreen | 68 | TradingView, OHLC, MA, BB, RSI, volume |
| 17 — FX Heatmap | 37 | G10/EM grid, detail panel, charts |
| 18 — Real Market Data | 21 | Yahoo Finance, CORS proxy, LIVE/AI badge |
| 19 — Research Hub | 29 | 16 institutions, RSS, house view, articles |
| 20 — Accuracy & Intelligence | 28 | Factor coherence, regime shift, data freshness, DATA_VINTAGE, HIGH_STAKES voting, ISO zero-padding, Singapore META |

---

## Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| HTML / CSS / JS | — | Entire application (single file) |
| D3.js | v7.9.0 | World map, history chart, sentiment gauge |
| TopoJSON | v3.0.2 | World geometry (equirectangular projection) |
| TradingView Lightweight Charts | v4 | Candlestick / line / area charts |
| Gemini API | 2.5 Flash | Primary AI provider |
| Claude API | Sonnet 4.6 | Alternative AI provider |
| Pollinations.ai | — | Free AI backend (no key required) |
| Yahoo Finance | — | Real OHLCV market data (via CORS proxy) |
| Firebase Firestore | v10.12.2 | Optional real-time community sync |
| EmailJS | v4 | Newsletter delivery |
| Google Identity Services | — | Google sign-in |
| Apple Sign-In JS | — | Apple sign-in |
| Google Fonts | — | Rajdhani (display) + JetBrains Mono |

---

## License

MIT — free to use, modify, and distribute.
