# Global Macro Intelligence

> AI-powered country sentiment terminal for macro analysts, traders, and researchers — delivered as a single self-contained HTML file.

![Tests](https://img.shields.io/badge/tests-260%2F260%20passing-brightgreen)
![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-informational)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash%20%7C%20Claude-blue)
![Charts](https://img.shields.io/badge/charts-D3.js%20v7-orange)
![PWA](https://img.shields.io/badge/PWA-installable-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Click any country on the flat rectangular world map and instantly receive an AI-generated macro brief — sentiment regime, equity bias, rate outlook, FX bias, risk level, rationale, central bank publications, news, social sentiment, and historical charts. Everything runs in a **single HTML file** with zero dependencies to install.

---

## Features

### Map & Analysis
- **Interactive world map** — flat equirectangular D3 projection; click any of 195 countries
- **Country sentiment panel** — sentiment score, regime pill (dovish / hawkish / neutral), key indicator chips (equity, rate, FX, risk, currency, key rate), AI rationale
- **Deep analysis overlay** — full-screen 5-tab deep dive per country (Overview, Economy, Markets, Risks, Outlook); 2000-token per tab, cached
- **Historical macro chart** — D3 multi-line chart: GDP, Inflation, Rate, FX over 12 quarters (Q1 2022–Q4 2024)
- **Authority publications** — real links to 54 central banks and finance ministries
- **Macro news feed** — AI-generated news with clickable source URLs
- **Regional language translation** — one-click full panel translation to the country's native language
- **Stocks / Exchange panel** — top 30 equities for the active country's index with live AI analysis per stock

### Intelligence Tools
- **Watchlist** — track countries, tickers, sectors, or any theme with AI sentiment scores and progress bars; persists to localStorage
- **Custom Analysis Builder** — tag up to 10 themes; generates a full report with D3 arc sentiment gauge, trade ideas, opportunities, and risks
- **Opportunities tab** — AI-generated trade opportunities across day / week / month / themes horizons

### Community Board
- **Feed tab** — post macro views, like, and comment; bullish / bearish / neutral tagging
- **Pulse tab** — AI sentiment analysis derived exclusively from community posts (no external data): bull/bear/neutral breakdown, top themes, representative views, narrative, consensus level
- **Firebase real-time sync** — optional Firestore integration for multi-user live boards; falls back to localStorage in local mode
- **Official badges** — configurable owner accounts with OFFICIAL badge on posts
- Search/filter posts · sort by newest or top liked · delete your own posts · animated post entry

### Profile & Digest
- **Daily & Weekly Digest** — AI macro briefing across all analysed countries; expand any section for detail
- **Newsletter** — generate and send your digest via EmailJS; preview in a new tab
- **Opportunities** — curated AI trade ideas across time horizons

### Auth & Session
- **Login / Register** — full auth flow with djb2 password hashing
- **Three-tier storage** — localStorage → sessionStorage → in-memory fallback (private mode safe)
- **Session persistence** — reload without re-logging-in

### Mobile & PWA
- **Progressive Web App** — installable on Android from Chrome; standalone mode, dark theme
- **Bottom navigation bar** — Social, Watchlist, Analyse, Community, Profile; shown on phones ≤ 480 px
- **Fully responsive** — 4 breakpoints (900 px, 768 px, 480 px, 360 px); full-width panels on phones
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
1. Register an account (top-right login screen)
2. Click the **API** widget (bottom-right) and paste your [Gemini API key](https://aistudio.google.com/app/apikey)
3. Click any country on the map

No build step. No `npm install`. No server.

---

## Project Structure

```
global_macro_intelligence/
├── global_macro_intel.html   # Entire application (~352 KB · 7491 lines)
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
├── test_e2e.js               # 260-test E2E suite (Node.js, no browser needed)
├── PROMPTS.md                # Full build log — all 25 tasks with specs
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
│   ├── D3.js v7          (CDN — charts and map)
│   ├── TopoJSON v3       (CDN — world geometry)
│   ├── EmailJS v4        (CDN — newsletter delivery)
│   ├── PWA meta tags     (manifest, apple-mobile-web-app-capable)
│   └── Google Fonts      (Rajdhani + JetBrains Mono)
│
├── <style>               (~1600 lines)
│   ├── CSS custom properties   (:root — palette, fonts)
│   ├── Layout                  (topbar, map, panels, mobile nav)
│   ├── Component styles        (chips, pills, badges, cards, gauges)
│   ├── Overlay styles          (deep, watchlist, CA, login, community, profile)
│   ├── Performance CSS         (contain, will-change, no backdrop-filter on hot paths)
│   └── Mobile responsive       (4 breakpoints, bottom nav, full-width panels)
│
├── <body>                (~600 lines)
│   ├── #login-overlay          Full-screen auth gate
│   ├── #comm-overlay           Community Board (Feed · Pulse · Settings tabs)
│   ├── #app
│   │   ├── #topbar             Logo · Community · Custom Analysis · User · Clock
│   │   └── #main
│   │       ├── #map-wrap       SVG world map (equirectangular D3 projection)
│   │       │   ├── #region-jump    Region highlight buttons
│   │       │   ├── #legend         Sentiment colour legend
│   │       │   └── #api-widget     API key + country mode selector
│   │       ├── #social-panel   Left floating panel — social sentiment
│   │       ├── #panel          Right sliding panel — country analysis detail
│   │       ├── #deep-overlay   Full-screen 5-tab deep dive
│   │       ├── #watchlist-*    Floating tab + sliding watchlist panel
│   │       ├── #ca-overlay     Full-screen custom analysis builder
│   │       └── #profile-overlay Full-screen profile, digest, newsletter, opportunities
│   └── #mobile-nav             Bottom navigation (phones ≤ 480 px)
│
└── <script>              (~5200 lines)
    ├── Constants
    │   ├── META{}              195 countries → {name, flag, currency, index, …}
    │   ├── AUTHORITY_INFO{}    54 central banks / finance ministries
    │   └── AUTHORITY_URLS{}    54 real institution website URLs
    │
    ├── Storage layer
    │   ├── storageGet/Set/Remove   localStorage → sessionStorage → _memStore fallback
    │   └── isStoragePersistent()   detects private mode
    │
    ├── API layer
    │   ├── callLLM(prompt, maxTokens, temp)
    │   │     Routes to Gemini or Claude based on key prefix.
    │   │     thinkingBudget:0 suppresses thinking tokens.
    │   ├── repairAndParseJSON(raw)
    │   │     7-step repair pipeline for truncated/malformed LLM JSON.
    │   └── closeTruncated(s)
    │         Character-walk state machine — closes open strings/arrays/objects.
    │
    ├── Map
    │   ├── initMap()            Fetches TopoJSON, renders equirectangular SVG, wires events
    │   ├── selectCountry(d)     Sets active country, triggers panel + sentiment fetch
    │   ├── renderPanel(data)    Populates all side-panel DOM fields from cache
    │   └── fetchSentiment(id)   LLM → country macro JSON → stored in cache{}
    │
    ├── Feature modules
    │   ├── loadAuthorityPubs()  Central bank publications
    │   ├── loadNewsFeed()       Macro news with real source URLs
    │   ├── loadSocialSentiment() Social posts; hashtag/topic filter
    │   ├── loadDeepSection(tab) 2000-token per-tab deep analysis
    │   ├── loadHistoryData()    12-quarter macro history → D3 chart
    │   ├── toggleLanguage()     Full panel translation
    │   ├── loadStocksPanel()    Country equity screen (30 stocks + detail)
    │   ├── loadExpandDetail()   350-token expand-to-detail for any summary
    │   ├── addWatchlistItem()   Auto-type-detect → LLM sentiment → localStorage
    │   ├── runCustomAnalysis()  2500-token multi-theme analysis + D3 gauge
    │   ├── loadDigestTab()      Daily / weekly AI digest
    │   ├── loadNewsletterTab()  Newsletter HTML + plain-text generation
    │   ├── sendOrPreviewNewsletter() EmailJS send or new-tab preview
    │   ├── loadOpportunitiesTab() Trade opportunities by horizon
    │   └── analyzeCommunityPulse() Community-post-only sentiment analysis
    │
    ├── Community Board
    │   ├── Local mode           localStorage with full CRUD
    │   ├── Firebase mode        Firestore real-time with onSnapshot listener
    │   ├── renderFeed()         Search filter + sort (newest/top) + post count
    │   ├── renderPostCard()     Like · Comments · Delete (own posts)
    │   └── analyzeCommunityPulse() AI sentiment from post content only
    │
    ├── Auth
    │   ├── hashPassword(pw)     djb2 deterministic hash
    │   ├── attemptLogin/Register Validates against gmi_users
    │   └── loadSession()        Cached with `undefined` sentinel (not null)
    │
    └── Boot sequence
          wireLoginEvents() → wireProfileEvents() → wireCommEvents()
          → loadCommOwners() → loadLocalPosts()
          → restore session → loadWatchlistFromStorage()
          → wireEventListeners() → initMap() → loadTickers()
          → checkNewsletterAutoNotify()
          → register service worker
```

---

## LLM Calls

| Function | Max Tokens | Temp | Purpose |
|----------|-----------|------|---------|
| `fetchSentiment` | 800 | 0 | Country macro sentiment JSON |
| `loadAuthorityPubs` | 600 | 0 | Central bank publications |
| `loadNewsFeed` | 700 | 0 | Macro news with source URLs |
| `loadSocialSentiment` | 500 | 1.0 | Social-style macro posts |
| `loadDeepSection` | 2000 | 0 | Per-tab deep country analysis |
| `loadHistoryData` | 800 | 0 | 12-quarter macro history |
| `toggleLanguage` | 2000 | 0 | Full panel translation |
| `fetchWatchlistSentiment` | 400 | 0.8 | Per-item watchlist sentiment |
| `runCustomAnalysis` | 2500 | 0.3 | Multi-theme thematic analysis |
| `loadExpandDetail` | 350 | 0.4 | Expand-to-detail for any summary |
| `loadDigestTab` | 1000 | 0.5 | Daily / weekly macro digest |
| `loadNewsletterTab` | 1200 | 0.4 | Newsletter content generation |
| `loadOpportunitiesTab` | 1500 | 0.3 | Trade opportunities by horizon |
| `loadStocksPanel` | 800 | 0 | Country equity screener |
| `loadStockDetail` | 1000 | 0.3 | Individual stock deep analysis |
| `analyzeCommunityPulse` | 600 | 0.2 | Sentiment from community posts only |

All calls pass `thinkingBudget: 0` to prevent thinking tokens from consuming the output budget.

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `gmi_users` | `{ [username]: { hash, displayName, created } }` |
| `gmi_session` | `{ username, displayName }` |
| `gmi_watchlist` | `WatchlistItem[]` |
| `gmi_comm_local_posts` | Community posts (local mode) |
| `gmi_comm_owners` | Comma-separated official usernames |
| `gmi_comm_fb_config` | Firebase project config JSON |
| `gmi_api_key` | User-entered Gemini / Claude API key |
| `gmi_newsletter_*` | EmailJS service ID, template ID, public key |

---

## Caching Strategy

All LLM responses are cached in-memory to avoid duplicate API calls within a session:

| Cache | Key pattern | Scope |
|-------|-------------|-------|
| `cache` | ISO country id | Sentiment analysis |
| `deepCache` | `countryName\|tab` | Deep analysis per tab |
| `historyCache` | `countryName` | 12-quarter chart data |
| `socialCache` | `countryName\|filter` | Social posts |
| `newsCache` | `countryName` | News feed |
| `authCache` | `countryName` | Authority publications |
| `watchlistSentCache` | item key | Watchlist sentiment |
| `stocksCache` | `countryName` | Equity screener |
| `digestExpandCache` | section key | Expanded digest sections |

Cache is in-memory only — cleared on page reload. Ticker data has a 5-minute TTL.

---

## Performance

Key optimisations implemented:

- **195 DOM refs cached** at boot for all hot-path panel fields
- **`will-change: transform`** on tooltip, social panel, watchlist panel
- **`contain: layout style`** on all scroll containers (panel body, social body, watchlist body, profile body)
- **Country `transition`** on fill + stroke only — `filter` excluded to prevent 195 GPU layer promotions on hover
- **`touch-action: manipulation`** on map SVG — eliminates 300 ms tap delay on mobile
- **Clock interval 10 s** (not 1 s)
- **Firebase SDK loaded dynamically** — only when user connects Firebase; not blocking at boot
- **No `backdrop-filter`** on always-visible elements (legend, API widget, topbar) — only on modal overlays

---

## JSON Repair Pipeline

Gemini occasionally truncates JSON at token limits. `repairAndParseJSON` applies 7 sequential steps:

1. Strip markdown code fences (` ```json … ``` `)
2. Extract the outermost `{…}` or `[…]` block
3. Remove trailing commas before `}` or `]`
4. Fix unescaped newlines inside string values
5. `closeTruncated()` — character-walk state machine closes open strings, arrays, objects
6. `JSON.parse`; on failure strip control characters and retry
7. Return `null` if all steps fail — callers show a graceful error state

---

## Security

- **API keys** held in-memory only; never written to localStorage or sent to any server except the configured AI provider
- **Passwords** hashed client-side with djb2 before storage; plaintext never persisted
- **XSS prevention** — all community post content, author names, and AI-generated strings rendered via `escHtml()` before `innerHTML` assignment
- **No `eval()`** anywhere in the codebase
- **CSP headers** in `deploy/netlify.toml`, `deploy/vercel.json`, and `deploy/_headers` restrict script and connect sources to only the required CDNs and APIs
- **Community posts** sent to AI for pulse analysis stripped of usernames — only `content` + `tag` fields

---

## Running the Tests

```bash
node test_e2e.js
```

No browser, no Playwright, no Puppeteer — pure Node.js static analysis.

```
═════════════��═══════════════════════════════════════════════════
  RESULTS   260/260 passing   0 failing   0 warnings
═════════════════��═══════════════════════════════════════════════
```

**14 test phases:**

| Phase | Tests | Coverage |
|-------|-------|----------|
| 1 — Core Structure | 23 | HTML, CDNs, DOM elements |
| 2 — Map & Country Analysis | 24 | Projection, panel refs, sentiment |
| 3 — API Layer | 10 | callLLM, JSON repair, providers |
| 4 — Feature Panels | 14 | Social, news, authority, history, translation |
| 5 — Watchlist | 10 | CRUD, type detection, localStorage |
| 6 — Custom Analysis | 10 | Tags, gauge, guard, tokens |
| 7 — Authentication | 19 | Login, register, session, storage tiers |
| 8 — Profile / Digest / Newsletter | 24 | Digest, newsletter, opportunities, toast |
| 9 — Performance | 14 | DOM cache, will-change, contain, transitions |
| 10 — Community Board | 45 | Feed, posts, Firebase, local, escaping |
| 11 — Deploy Folder | 11 | Files, CSP, Netlify/Vercel config |
| 12 — Security & XSS | 7 | escHtml, no eval, key storage |
| 13 — Android / Mobile | 15 | PWA, service worker, responsive, bottom nav |
| 14 — Community Pulse | 16 | Analysis, render, XSS, prompt integrity |

---

## Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| HTML / CSS / JS | — | Entire application (single file) |
| D3.js | v7.9.0 | World map, history chart, sentiment gauge |
| TopoJSON | v3.0.2 | World geometry (equirectangular projection) |
| Gemini API | 2.5 Flash | Primary AI provider |
| Claude API | Sonnet 4.6 | Alternative AI provider |
| Firebase Firestore | v10.12.2 | Optional real-time community sync |
| EmailJS | v4 | Newsletter delivery |
| Google Fonts | — | Rajdhani (display) + JetBrains Mono |

---

## License

MIT — free to use, modify, and distribute.
