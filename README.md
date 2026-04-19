# Global Macro Intelligence

> A single-file, AI-powered country sentiment terminal for macro analysts, traders, and researchers.

![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-informational)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue)
![Charts](https://img.shields.io/badge/charts-D3.js%20v7-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Global Macro Intelligence is an interactive world-map terminal that lets you click any country and instantly get AI-generated macro analysis: sentiment regime, equity bias, rate outlook, FX bias, risk level, and a narrative rationale — all powered by Google Gemini. Everything runs in a single HTML file with zero dependencies to install.

**Key capabilities:**

- **Country sentiment analysis** — click any country on the map for a full AI-driven macro brief
- **Deep analysis overlay** — 5-tab full-screen deep dive (Overview, Economy, Markets, Risks, Outlook)
- **Watchlist** — track stocks, tickers, countries, sectors, or any theme with AI-backed sentiment scores
- **Custom Analysis Builder** — compose your own cross-asset analysis by tagging themes; get a full report with a D3 sentiment gauge
- **Historical macro chart** — D3 multi-line chart for GDP, Inflation, Rate, FX over 12 quarters
- **Social sentiment panel** — live macro social feed with hashtag/topic filtering
- **Authority publications** — central bank and finance ministry links per country
- **Regional language translation** — translate the entire panel to the country's native language
- **User authentication** — login/register system with localStorage session persistence
- **Selective precompute** — choose ALL countries or a custom subset for bulk analysis

---

## Quickstart

1. Clone or download the repository
2. Open `global_macro_intel.html` in any modern browser (Chrome / Firefox / Edge / Safari)
3. Click the **API** panel (bottom-left) and paste your [Google Gemini API key](https://aistudio.google.com/app/apikey)
4. Click any country on the map

No build step. No `npm install`. No server required.

---

## Project Structure

```
global_macro_intelligence/
├── global_macro_intel.html   # Entire application — HTML + CSS + JS (~4600 lines)
├── PROMPTS.md                # Build log: all prompts, features, and task tracker
└── README.md                 # This file
```

The entire application lives in **one file**. This is a deliberate architectural choice: zero deployment friction, shareable as a single attachment, and trivially hostable on GitHub Pages or any static host.

---

## Architecture

```
global_macro_intel.html
│
├── <head>
│   ├── D3.js v7          (CDN — charts and map rendering)
│   └── TopoJSON v3       (CDN — world geometry)
│
├── <style>               (~1100 lines)
│   ├── CSS custom properties  (:root — color palette, fonts)
│   ├── Layout                 (topbar, map, side panels, ticker)
│   ├── Component styles       (chips, pills, badges, cards)
│   └── Overlay styles         (deep analysis, watchlist, custom analysis, login)
│
├── <body>                (~400 lines)
│   ├── #login-overlay         Full-screen auth gate
│   ├── #app
│   │   ├── #topbar            Logo · Tickers · Custom Analysis btn · User · Clock
│   │   └── #main
│   │       ├── #map-wrap      SVG world map (TopoJSON + D3 projection)
│   │       ├── #social-panel  Left floating panel — social sentiment feed
│   │       ├── #side-panel    Right sliding panel — country analysis detail
│   │       ├── #deep-overlay  Full-screen 5-tab country deep dive
│   │       ├── #watchlist-*   Right floating tab + sliding watchlist panel
│   │       └── #ca-overlay    Full-screen custom analysis builder
│   └── #api-widget            Bottom-left — API key input + country selector
│
└── <script>              (~3150 lines)
    │
    ├── Constants
    │   ├── META{}              ISO 3-digit → {name, flag, currency, index, …} for 195 countries
    │   ├── AUTHORITY_INFO{}    54 countries → {name, lang} of central bank / finance ministry
    │   └── AUTHORITY_URLS{}    54 countries → real institution website URLs
    │
    ├── State
    │   ├── apiKey, provider    User-entered key + model routing
    │   ├── activeId            Currently selected country ISO id
    │   ├── currentCountryMeta  Meta object for active country
    │   ├── cache{}             Per-country analysis cache (avoids repeat API calls)
    │   ├── socialFilter        Current hashtag/topic filter string
    │   ├── countryMode         'all' | 'select' — precompute scope
    │   ├── selectedCountries   Set of ISO ids for selective precompute
    │   ├── deepOpen, deepTab   Deep analysis overlay state + active tab
    │   ├── deepCache{}         Per-country, per-tab deep analysis cache
    │   ├── historyOpen         History chart collapsed/expanded state
    │   ├── historyCache{}      Per-country historical data cache
    │   ├── watchlist[]         Array of watchlist items (persisted to localStorage)
    │   ├── watchlistSentCache  Per-key sentiment cache for watchlist items
    │   ├── caOpen, customTags  Custom analysis overlay state + current tags
    │   └── caRunning           Prevents concurrent custom analysis runs
    │
    ├── API Layer
    │   ├── callLLM(sys, user, maxTokens, temp)
    │   │     Unified Gemini REST caller. Uses thinkingBudget:0 to suppress thinking tokens.
    │   ├── repairAndParseJSON(raw)
    │   │     7-step repair pipeline: strips markdown fences, fixes trailing commas,
    │   │     unescapes, closes truncated structures via closeTruncated().
    │   └── closeTruncated(s)
    │         Character-walk state machine that closes unclosed strings, arrays, objects.
    │
    ├── Map
    │   ├── initMap()           Fetches TopoJSON, renders SVG paths, wires hover/click
    │   ├── selectCountry(d)    Sets active country, triggers renderPanel + fetchSentiment
    │   ├── renderPanel(data)   Populates all side-panel fields from cached analysis
    │   └── fetchSentiment(id)  Calls LLM for country sentiment JSON, stores in cache
    │
    ├── Features
    │   ├── loadAuthorityPubs()      Fetches central bank publications for active country
    │   ├── loadNewsFeed()           Fetches macro news items with real source URLs
    │   ├── loadSocialSentiment()    Fetches social-style macro posts; respects socialFilter
    │   ├── loadDeepSection(tab)     Fetches 2000-token deep analysis for one tab
    │   ├── loadHistoryData()        Fetches 12-quarter macro history; renders D3 chart
    │   ├── drawHistoryLine(data)    D3 area+line+dot chart with metric toggle buttons
    │   ├── toggleLanguage()         Translates entire panel to country native language
    │   ├── applyTranslation(…)      Applies translated fields to all DOM elements
    │   ├── restoreEnglish()         Re-renders panel from cache to restore English
    │   ├── addWatchlistItem(input)  Auto-detects type, fetches sentiment, saves to LS
    │   ├── fetchWatchlistSentiment  Per-item AI sentiment at 400 tokens, temp 0.8
    │   ├── renderWatchlist()        Renders watchlist panel; auto-fetches pending items
    │   ├── runCustomAnalysis()      Runs 2500-token thematic analysis across all tags
    │   ├── renderCustomAnalysis()   Renders 2-column grid + D3 arc gauge
    │   └── drawCaGauge(score)       D3 semicircle gauge, needle at π+((s+1)/2)×π
    │
    ├── Auth
    │   ├── hashPassword(pw)         Simple deterministic hash (client-side only)
    │   ├── attemptLogin()           Validates credentials against gmi_users in LS
    │   ├── attemptRegister()        Creates new user entry in gmi_users
    │   ├── startSession(session)    Saves gmi_session, applies UI, hides login overlay
    │   ├── applySession(session)    Shows topbar username + logout button
    │   └── logout()                 Clears session, resets form, re-shows login overlay
    │
    └── Boot sequence
        wireLoginEvents()
        → restore session from localStorage (skip login if valid session exists)
        → loadWatchlistFromStorage()
        → wireEventListeners()
        → initMap()
        → loadTickers()
```

---

## LLM Integration Details

| Call | Max Tokens | Temperature | Purpose |
|------|-----------|-------------|---------|
| `fetchSentiment` | 800 | 0 | Country macro sentiment JSON |
| `loadAuthorityPubs` | 600 | 0 | Central bank publication summaries |
| `loadNewsFeed` | 700 | 0 | Macro news with source URLs |
| `loadSocialSentiment` | 500 | 1.0 | Social-style macro posts |
| `loadDeepSection` | 2000 | 0 | Per-tab deep country analysis |
| `loadHistoryData` | 800 | 0 | 12-quarter historical macro data |
| `toggleLanguage` | 2000 | 0 | Full panel translation |
| `fetchWatchlistSentiment` | 400 | 0.8 | Per-item watchlist sentiment |
| `runCustomAnalysis` | 2500 | 0.3 | Multi-theme custom analysis |

All calls use `thinkingBudget: 0` to prevent thinking tokens from consuming the output budget.

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `gmi_users` | `{ [username]: { hash, displayName, created } }` |
| `gmi_session` | `{ username, displayName }` |
| `gmi_watchlist` | `WatchlistItem[]` — full watchlist array |

---

## Caching Strategy

Every expensive LLM call is cached in-memory to avoid redundant API usage:

- **`cache[isoId]`** — country sentiment analysis
- **`deepCache[countryName|tab]`** — per-tab deep analysis
- **`historyCache[countryName]`** — historical chart data
- **`socialCache[countryName|filter]`** — social posts (filter is part of key)
- **`newsCache[countryName]`** — news feed
- **`authCache[countryName]`** — authority publications
- **`watchlistSentCache[key]`** — watchlist item sentiment

Cache is in-memory only — cleared on page reload.

---

## JSON Repair Pipeline

Gemini occasionally truncates JSON at token limits. The `repairAndParseJSON` function applies 7 sequential repair steps:

1. Strip markdown code fences (` ```json ... ``` `)
2. Extract the outermost `{...}` or `[...]` block
3. Remove trailing commas before `}` or `]`
4. Fix unescaped newlines inside string values
5. Call `closeTruncated()` — character-walk state machine to close open strings/arrays/objects
6. Try `JSON.parse`; on failure, strip control characters and retry
7. Return `null` if all steps fail (caller shows a graceful error state)

---

## Hosting on GitHub Pages

1. Push the repo to GitHub
2. Go to **Settings → Pages → Source → Deploy from branch → main / root**
3. Access at `https://<your-username>.github.io/<repo-name>/global_macro_intel.html`

No build step required.

---

## Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| HTML / CSS / JS | — | Entire application (single file) |
| D3.js | v7.8.5 | World map, history chart, sentiment gauge |
| TopoJSON | v3.0.2 | World geometry (Natural Earth projection) |
| Gemini API | 2.5 Flash | All AI analysis and translation |
| Google Fonts | — | Rajdhani (display) + JetBrains Mono |

---

## License

MIT — free to use, modify, and distribute.
