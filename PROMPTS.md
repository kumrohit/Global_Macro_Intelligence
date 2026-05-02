# Global Macro Intelligence — Build Log & Prompt Registry

> Single-file dashboard: `global_macro_intel.html`
> Stack: Vanilla HTML/CSS/JS · D3.js v7 · TopoJSON · Gemini 2.5 Flash API

---

## Phase 1 — Core Dashboard (Prior Session)

- Built the base single-file HTML dashboard with a TopoJSON world map
- Integrated Gemini 2.5 Flash API with a unified `callLLM()` wrapper
- Country selection via map click → side panel with sentiment analysis
- Real-time macro data: equity index, currency, regime, risk level
- Social sentiment panel (left side) with live feed simulation
- Ticker tape with global indices (DXY, Gold, WTI, VIX, US10Y)
- Dark terminal aesthetic with CSS variables and monospace fonts

---

## Phase 2 — Feature Batch 1 (Session 1)

### Prompts Delivered

1. **Selective Country Analysis**
   > "Add an ALL COUNTRIES vs SELECT mode so users can restrict which countries get precomputed by the API."
   - ALL / SELECT toggle in the API widget
   - Country search box with checkboxes, selection counter
   - `precomputeAll` respects `selectedCountries` set; empty selection defaults to all

2. **Clickable Sources**
   > "Make sources clickable — real institution URLs on authority publications and news items."
   - `AUTHORITY_URLS` map covering 54 central banks / finance ministries
   - Authority pub items render as `<a href target="_blank">` with ↗ indicator
   - News items request real article URLs from source domains in the prompt

3. **Deep Analysis in a Separate Tab**
   > "Add full-screen deep analysis per country with multiple tabs."
   - Full-screen overlay at z-index 2000 with blur backdrop
   - 5 tabs: Overview · Economy · Markets · Risks · Outlook
   - Each tab independently cached per country; 2000-token responses
   - Key stats grid + multi-paragraph content render

4. **Social Media Hashtag / Topic Filter**
   > "Add a hashtag/topic filter input in the social sentiment panel."
   - Filter input with 600ms debounce
   - Filter string appended to cache key — different filters = separate cache entries
   - Placeholder: `Filter by hashtag, topic, sector… e.g. #Fed #AI`

5. **Historical Macro Data Chart**
   > "Add a D3 multi-line chart showing GDP, Inflation, Rate, FX over 12 quarters."
   - Collapsible section inside country panel
   - D3 SVG: area fill + line + dots + tooltips via `getBoundingClientRect()`
   - 4 metric toggle buttons; `vals.length < 2` guard for missing data
   - Data covers Q1 2022 – Q4 2024 (12 quarters); 800-token prompt

---

## Phase 3 — Feature Batch 2 (Session 2)

### Prompts Delivered

6. **Full Regional Language Translation**
   > "Make sure that when the regional language is turned on it should convert everything in the language."
   - Expanded from 2 fields → 8 core fields + conditional news/auth pub arrays
   - Single 2000-token translation call per toggle
   - `applyTranslation()` updates: rationale, key_risk, sentiment badge, regime pill, all chip values, news titles+summaries, authority pub titles+summaries
   - `restoreEnglish()` calls `renderPanel(data)` for a clean full re-render

7. **Watchlist**
   > "Create a section where a user can create a watchlist. It can be a stock, ticker, country, region etc. The watchlist should track sentiments backed with data."
   - Right-side floating panel (amber color scheme, opposite social panel)
   - Auto-detect item type: country name → `'country'`, `/^[A-Z]{1,6}$/` → `'ticker'`, else → `'theme'`
   - AI sentiment per item: score (−1 to +1), label, key note, regime/asset type
   - Score rendered as a filled progress bar
   - Persists to `localStorage` under key `'gmi_watchlist'`
   - Pre-fills from analysis cache when adding an already-analyzed country
   - "Add to Watchlist" button in side panel toggles in/out with ✓ state

8. **Custom Analysis Builder**
   > "Create a section where a user can create customized analysis by adding tags. It should provide detailed analysis along with helpful data and charts."
   - Full-screen overlay at z-index 2100, accessed via `⊕ CUSTOM ANALYSIS` in topbar
   - Tag input + 10 suggestion chips; max 10 tags enforced
   - AI response (2500 tokens, temp 0.3): title, executive_summary, overall_sentiment, overall_score, themes, key_findings, opportunities, risks, trade_ideas, outlook
   - 2-column grid layout: theme sentiment bars, D3 arc gauge (semicircle, −1→+1), trade idea cards
   - D3 gauge: 4 arc segments (bear→neutral→bull), needle computed as `π + ((score+1)/2)×π`

---

## Phase 4 — Testing & Hardening (Session 2)

### Prompts Delivered

9. **Test Batch 1**
   > "Test everything once, ensure they are robust, handle edge cases and run smooth."
   - Automated test suite (node): 40 checks across all Phase 1–2 features
   - Caught: unclosed template literal in `loadAuthorityPubs` (missing closing backtick)
   - Fix: added closing backtick + semicolon before `try {` block
   - All checks passed after fix

10. **Test Batch 2**
    > "Test everything, make sure it runs smoothly, handle edge cases and provide delightful user experience."
    - Extended suite: 55 checks across all Phase 1–3 features
    - Verified: watchlist localStorage, custom analysis gauge, language translation completeness, deep overlay z-index, history chart guards
    - Result: **55/55 passing**

---

## Phase 5 — Auth, UX & Release (Session 3)

### Prompts Delivered

11. **User Login Page** *(Task 1)*
    > "Add user login page"
    - Full-screen login overlay (z-index 5000) with fade-in animation
    - Register + Sign In mode tabs; `hashPassword` (djb2 deterministic hash)
    - Three-tier storage: localStorage → sessionStorage → in-memory `_memStore` fallback
    - `storageGet/Set/Remove` wrappers; `isStoragePersistent()` shows warning in private mode
    - Session restored on page load — no re-login required after refresh

12. **Login Persistence Fix** *(Task 4)*
    > "It is not remembering my login info. I need to create account every time."
    - Root cause: bare `localStorage` calls silently failing (private mode / Safari)
    - Fix: `getStorage()` test-write pattern; catch → `_memStore` in-memory fallback
    - Added persistent session warning toast when storage is unavailable

13. **Expand to Details** *(Task 5)*
    > "Allow the user to expand the analysis to go into details wherever it is providing the summary — social media sentiments, watchlist, etc."
    - `▸ DETAILS` / `▴ COLLAPSE` toggle on news items, watchlist items, social posts
    - `loadExpandDetail(cacheKey, prompt, bodyEl)` — 350-token Gemini call, cached per item
    - Cache key includes country scope to avoid cross-country collisions
    - Bug caught: `async async function loadExpandDetail` (double-async introduced by faulty edit) — fixed immediately

14. **Static World Map** *(Task 6)*
    > "The dynamic background is not user friendly. Please make it a static world map covering the web window."
    - Replaced `d3.geoNaturalEarth1()` zoom-based map with `projection.fitSize([W,H], {type:'Sphere'})`
    - Removed all D3 zoom infrastructure (`d3.zoom()`, `_zoom`, `_svg` globals)
    - Zoom control buttons hidden with `display:none !important`
    - Region jump repurposed as cyan flash highlight (no scroll/zoom)
    - Resize handler recalculates `fitSize` on window resize

15. **E2E Testing (Phase 5)** *(Task 7)*
    > "Perform end to end robust testing of covering edge cases and user experience."
    - 148/148 checks passed across all Phase 1–5 features
    - Verified: login flow, storage fallback, expand cache keys, static map, social debounce

---

## Phase 6 — Profile, Digest, Newsletter & Opportunities (Session 4)

### Prompts Delivered

16. **Daily & Weekly Digest** *(Task 8)*
    > "Based on the user activity, watchlist, user region provide daily and weekly capsule of 10 macro news and analysis. Keep this under user profile section."
    - Profile overlay (z-index 3000), opened by clicking username in topbar
    - Stats bar: watchlist count, countries analysed, last active date
    - Region preference buttons (Global / Americas / Europe / Asia / Africa / Middle East) — persisted to user record
    - Two tabs: **Daily Capsule** / **Weekly Digest** — 10 AI-generated personalized items each
    - Each card: rank, impact badge (HIGH/MEDIUM/LOW), region tag, source, title, summary, implication
    - Personalized with watchlist items + recently analysed countries
    - Cache keyed `gmi_digest_{tab}_{username}_{date/week}` — localStorage + in-memory
    - ESC key closes overlay; auto-loads on profile open

17. **Digest Deep Analysis + Source Links** *(Task 9)*
    > "Allow the user to go into detail and source article for the daily and weekly capsules."
    - `▸ DEEP ANALYSIS` expand button on each digest card — 400-token Gemini analytical deep-dive
    - `FIND ARTICLE ↗` button (Google search link) displayed prominently below the title
    - `READ SOURCE ↗` retained in the card footer
    - Expand results cached in `digestExpandCache` keyed by `tab|rank|title`

18. **Newsletter Subscription** *(Task 10)*
    > "Allow the user to subscribe to these capsules for their inbox so they are automatically delivered daily/weekly. The newsletter should be professional and aesthetic."
    - Third profile tab: **NEWSLETTER**
    - Email input + Daily/Weekly subscription toggles (persisted to `gmi_nl_email`, `gmi_nl_daily`, `gmi_nl_weekly`)
    - **PREVIEW** → opens HTML email in new tab
    - **COPY HTML** → clipboard (paste into Gmail/Outlook)
    - **OPEN IN MAIL CLIENT** → pre-composed `mailto:` with text version; marks `gmi_nl_sent_*` key
    - Auto-notify toast (3s delay, 8s display) on app load when subscribed and not yet sent today/this week
    - Newsletter HTML: professional dark-mode table-based email template with GMI branding, gradient header, color-coded impact badges, implication rows, footer

19. **Investment & Trading Opportunities** *(Task 11)*
    > "Add section in the user's profile where it should give investment and trading opportunities based on short and long term horizon. Allow the user to choose the horizon in day, week, month, themes etc."
    - Fourth profile tab: **OPPORTUNITIES**
    - Horizon buttons: DAY / WEEK / MONTH / THEMES (persisted to `gmi_opp_horizon`)
    - 8 AI-generated trade ideas per horizon (2000 tokens, temp 0.3)
    - Each card: direction badge (LONG/SHORT/NEUTRAL), asset class, region, specific instrument, thesis, conviction bar (0–100%), key risk, source + RESEARCH ↗ link
    - Personalized to watchlist and recently analysed countries
    - Cached per `gmi_opp_{horizon}_{username}_{date/week}`

20. **Performance Optimization** *(Task 12)*
    > "The whole dashboard has become very heavy and it has lag. Review the complete code and decrease the lag as much as possible."
    - **CSS**: `will-change: transform` on `#social-panel`, `#watchlist-panel`; `will-change: width` on `#panel`; `will-change: opacity` on `#deep-overlay`, `#ca-overlay`; `contain: layout style` on `#panel`
    - **JS**: Cached tooltip element refs (`_tt`, `_ttFlag`, `_ttName`, etc.) — no `getElementById` in hover/mousemove hot paths
    - **JS**: `_ttVisible` boolean flag instead of reading `style.display` on each mousemove
    - **JS**: `requestAnimationFrame` throttle on mousemove → capped at 60fps
    - **JS**: Ticker data cached in `gmi_ticker_cache` with 5-min TTL — avoids LLM call on page reload

21. **E2E Testing (Phase 6)** *(Task 13)*
    > "Perform end to end robust testing, covering edge cases and user experience."
    - 102/102 checks passed across all Phase 1–6 features

22. **Source Visibility Fix** *(Task 14)*
    > "I still can't see the source in the capsules and opportunities. Please provide the referred sources and link."
    - **Digest**: Added prominent `SOURCE: [outlet name]` row below title with `FIND ARTICLE ↗` search link; `.digest-source-btn` styled in cyan with border
    - **Opportunities**: Added `source` + `catalyst` fields to AI prompt; each card now shows `SOURCE: [institution]` row with `RESEARCH ↗` search link
    - Digest prompt now explicitly requests named outlets (Financial Times, Reuters, Bloomberg, WSJ, etc.)

---

## Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `SyntaxError: Unexpected identifier 'style'` at line ~1524 | Unclosed backtick in `loadAuthorityPubs` prompt template literal | Added closing backtick + semicolon before `try {` |
| Language translation only updating 2 fields | `toTranslate` object too narrow; token budget too low (600) | Expanded to 8+ fields; raised to 2000 tokens |
| Gauge needle not rendering | `drawCaGauge` called before overlay DOM was painted | Wrapped in `requestAnimationFrame` |
| Watchlist duplicate entries | No key dedup check | Added `watchlist.some(w => w.key === item.key)` guard |
| `async async function loadExpandDetail` | Edit prepended `async` to already-async function (faulty substring match) | Fixed to single `async function` |
| Login overlay flash on load | `#login-overlay` had `display:flex` by default | Changed to `display:none`; JS adds `.visible` + `.fade-in` classes |
| localStorage silent failure (private mode) | Bare `localStorage` calls threw uncaught exceptions | Three-tier storage: localStorage → sessionStorage → `_memStore` |
| Digest source not visible | Source was `color:var(--text3)` (near-invisible) in dark theme | Promoted to labeled row with cyan `FIND ARTICLE ↗` button |
| Opportunities had no source | `source`/`catalyst` fields missing from AI prompt and card render | Added both fields to prompt schema and rendered with `RESEARCH ↗` link |

---

## Architecture Reference

```
global_macro_intel.html (~5400 lines, single file)
├── <style>          (~1450 lines)
│   ├── CSS custom properties  (:root — color palette, fonts)
│   ├── Layout                 (topbar, map, side panels, ticker)
│   ├── Component styles       (chips, pills, badges, cards, overlays)
│   ├── Performance hints      (will-change, contain)
│   └── Feature styles         (digest, opportunities, newsletter, toast)
│
├── <body>           (~400 lines)
│   ├── #login-overlay         Full-screen auth gate (z-index 5000)
│   ├── #app
│   │   ├── #topbar            Logo · Tickers · Custom Analysis btn · User · Clock
│   │   └── #main
│   │       ├── #map-wrap      SVG world map (TopoJSON + D3 NaturalEarth1 fitSize)
│   │       ├── #social-panel  Left floating — social sentiment feed
│   │       ├── #side-panel    Right sliding — country analysis detail
│   │       ├── #deep-overlay  Full-screen 5-tab country deep dive (z-index 2000)
│   │       ├── #watchlist-*   Right floating tab + sliding watchlist panel
│   │       ├── #ca-overlay    Full-screen custom analysis builder (z-index 2100)
│   │       └── #profile-overlay  Full-screen user profile (z-index 3000)
│   │           ├── Daily Capsule tab
│   │           ├── Weekly Digest tab
│   │           ├── Newsletter tab
│   │           └── Opportunities tab
│   ├── #api-widget            Bottom-left — API key + country selector
│   └── #gmi-toast             Bottom-center notification toast
│
└── <script>         (~4030 lines)
    │
    ├── Storage Layer
    │   ├── getStorage()              Test-write to find available storage
    │   ├── storageGet/Set/Remove()   Three-tier: localStorage → sessionStorage → _memStore
    │   └── isStoragePersistent()     Check for private mode warning
    │
    ├── Auth
    │   ├── hashPassword(pw)          djb2 deterministic hash (client-side only)
    │   ├── attemptLogin/Register()   Validate/create against gmi_users in storage
    │   ├── startSession(session)     Save gmi_session, show app, hide login overlay
    │   ├── showLoginOverlay()        display:none → .visible → .fade-in (no flash)
    │   └── logout()                  Clear session, reset form, re-show login overlay
    │
    ├── Constants
    │   ├── META{}              ISO 3-digit → {name, flag, currency, index, region} for 195 countries
    │   ├── AUTHORITY_INFO{}    54 countries → {authority, lang} of central bank / finance ministry
    │   └── AUTHORITY_URLS{}    54 countries → real institution website URLs
    │
    ├── State
    │   ├── apiKey, provider          User-entered key + model routing
    │   ├── activeId                  Currently selected country ISO id
    │   ├── cache{}                   Per-country analysis cache
    │   ├── socialFilter, socialScope Social panel filter + scope state
    │   ├── countryMode               'all' | 'select' for precompute
    │   ├── selectedCountries         Set of ISO ids for selective precompute
    │   ├── deepCache{}, deepTab      Deep analysis overlay state
    │   ├── historyCache{}            Per-country historical data cache
    │   ├── expandCache{}             Expand-to-detail response cache
    │   ├── watchlist[]               Array of watchlist items (persisted)
    │   ├── watchlistSentCache{}      Per-item sentiment cache
    │   ├── caOpen, customTags        Custom analysis overlay state
    │   ├── profileOpen, profileTab   Profile overlay state
    │   ├── digestCache{}             Per-period digest response cache
    │   ├── digestExpandCache{}       Per-card digest expand cache
    │   ├── userRegion                User's region preference (persisted)
    │   ├── nlEmail, nlSubDaily/Weekly  Newsletter subscription state (persisted)
    │   ├── oppHorizon, oppCache{}    Opportunities horizon + response cache
    │   └── _tt, _ttVisible, rAF state  Cached tooltip refs + mousemove throttle
    │
    ├── API Layer
    │   ├── callLLM(sys, user, maxTokens, temp)
    │   │     Unified Gemini REST caller. thinkingBudget:0 suppresses thinking tokens.
    │   ├── repairAndParseJSON(raw)
    │   │     7-step repair: strip fences → extract block → fix commas → unescape →
    │   │     closeTruncated() → JSON.parse → strip controls → return null
    │   └── closeTruncated(s)
    │         Character-walk state machine closes unclosed strings/arrays/objects
    │
    ├── Map
    │   ├── initMap()            Fetches TopoJSON, renders SVG, caches tooltip refs, wires hover/click
    │   ├── selectCountry(d)     Sets active country, triggers panel + fetchSentiment
    │   ├── renderPanel(data)    Populates all side-panel fields from cached analysis
    │   └── fetchSentiment(id)   Calls LLM for country sentiment JSON, stores in cache
    │
    ├── Tooltip (performance-optimized)
    │   ├── _tt, _ttFlag, …      DOM refs cached at startup (not in mousemove loop)
    │   ├── _ttVisible           Boolean flag (no style.display read per frame)
    │   └── rAF throttle         requestAnimationFrame gate on mousemove
    │
    ├── Features
    │   ├── loadAuthorityPubs()        Central bank publications
    │   ├── loadNewsFeed()             Macro news with source links
    │   ├── loadSocialSentiment()      Social-style posts; respects filter + scope
    │   ├── loadDeepSection(tab)       5-tab deep analysis (2000 tokens)
    │   ├── loadHistoryData()          12-quarter historical macro data
    │   ├── drawHistoryLine(data)      D3 area+line+dot chart with metric toggles
    │   ├── toggleLanguage()           Full panel translation to country native language
    │   ├── loadExpandDetail()         Expand-to-details on summary items (350 tokens)
    │   ├── addWatchlistItem()         Auto-detects type, fetches sentiment
    │   ├── renderWatchlist()          Renders watchlist panel with expand
    │   ├── runCustomAnalysis()        Multi-theme analysis (2500 tokens)
    │   └── drawCaGauge(score)         D3 semicircle gauge, needle at π+((s+1)/2)×π
    │
    ├── Profile / Digest / Newsletter / Opportunities
    │   ├── openProfile/closeProfile()
    │   ├── loadDigestTab(tab)         Routes: daily/weekly → digest, newsletter → NL, opportunities → opp
    │   ├── renderDigest(data, tab)    10 cards with source row + expand + FIND ARTICLE link
    │   ├── loadDigestItemDetail()     Per-card deep analysis expand (400 tokens)
    │   ├── toggleDigestExpand()       Expand/collapse per digest card
    │   ├── loadNewsletterTab()        Subscription UI render + event wiring
    │   ├── generateNewsletterHTML()   Professional dark-mode HTML email template
    │   ├── generateNewsletterText()   Plain-text version for mailto:
    │   ├── sendOrPreviewNewsletter()  Preview / copy / mail-client dispatch
    │   ├── showToast/dismissToast()   Bottom-center notification toast
    │   ├── checkNewsletterAutoNotify() On boot: prompt if subscribed + not yet sent
    │   ├── loadOpportunitiesTab()     Horizon-based trade ideas (2000 tokens)
    │   ├── renderOpportunitiesHTML()  Cards with conviction bar, source + RESEARCH link
    │   └── wireOppEvents()            Horizon buttons + refresh wiring
    │
    └── Boot sequence
        wireLoginEvents()
        wireProfileEvents()
        → restore session (skip login if valid)
        → loadWatchlistFromStorage()
        → wireEventListeners()
        → initMap()
        → loadTickers()         (serves from 5-min localStorage cache if fresh)
        → checkNewsletterAutoNotify()
```

---

## LLM Call Reference

| Function | Max Tokens | Temp | Purpose |
|----------|-----------|------|---------|
| `fetchSentiment` | 800 | 0 | Country macro sentiment JSON |
| `loadAuthorityPubs` | 600 | 0 | Central bank publication summaries |
| `loadNewsFeed` | 700 | 0 | Macro news with source outlets |
| `loadSocialSentiment` | 500 | 1.0 | Social-style macro posts |
| `loadDeepSection` | 2000 | 0 | Per-tab deep country analysis |
| `loadHistoryData` | 800 | 0 | 12-quarter historical macro data |
| `toggleLanguage` | 2000 | 0 | Full panel translation |
| `loadExpandDetail` | 350 | 0.3 | Expand-to-details on summary items |
| `fetchWatchlistSentiment` | 400 | 0.8 | Per-item watchlist sentiment |
| `runCustomAnalysis` | 2500 | 0.3 | Multi-theme custom analysis |
| `loadDigestTab` | 2000 | 0.4 | Personalized daily/weekly digest |
| `loadDigestItemDetail` | 400 | 0.3 | Digest card deep analysis |
| `loadOpportunitiesTab` | 2000 | 0.3 | Trade opportunities by horizon |
| `loadTickers` | 400 | — | Market ticker estimates |

All calls use `thinkingBudget: 0` to prevent thinking tokens from consuming the output budget.

---

## localStorage Keys

| Key | Contents |
|-----|----------|
| `gmi_users` | `{ [username]: { hash, displayName, created } }` |
| `gmi_session` | `{ username, displayName }` |
| `gmi_watchlist` | `WatchlistItem[]` |
| `gmi_ticker_cache` | `{ data: {...}, ts: timestamp }` — 5-min TTL |
| `gmi_digest_{tab}_{user}_{date}` | Digest response JSON |
| `gmi_opp_{horizon}_{user}_{date}` | Opportunities response JSON |
| `gmi_opp_horizon` | Last selected horizon string |
| `gmi_nl_email` | Newsletter subscription email |
| `gmi_nl_daily` | `'1'` if subscribed to daily |
| `gmi_nl_weekly` | `'1'` if subscribed to weekly |
| `gmi_nl_sent_daily` | Date string of last daily send |
| `gmi_nl_sent_weekly` | Week string of last weekly send |

---

## Next Tasks

> Add tasks below. Strike through with `~~task~~` once complete. Make sure to perform robust testing including the edge cases before completing the task.

- [x] ~~Task 1 — Add user login page~~
- [x] ~~Task 2 — Improve my readme file. Provide description of the project. helpful technical notes and detailed architecture for github repo~~
- [x] ~~Task 3 — make it ready for web release. Help me with detailed release instructions~~
- [x] ~~Task 4 - Could you review user login part. it is not remembering my login info. I need to create account everytime~~
- [x] ~~Task 5 - Allow the user to expand the analysis to go into details wherever it is providing the summary especially the social media sentiments, watchlist, etc.~~
- [x] ~~Task 6 - The dynamic background of the dashboard is not user friendly. Please make it a static world map covering the web window. Keep all the remaining functionality.~~
- [x] ~~Task 7 - Perform end to end robust testing of covering edge cases and user experience.~~
- [x] ~~Task 8 - Based on the user activity, watchlist, user region provide daily and weekly capsule of 10 macro news and analysis. Keep this under user profile section.~~
- [x] ~~Task 9 - Allow the user to go into detail and source article for the daily and weekly capsules.~~
- [x] ~~Task 10 - Allow the user to subscribe to these capsules for their inbox so they are automatically delivered daily and/or weekly. The newsletter for the inbox should be very professional and aesthetic.~~
- [x] ~~Task 11 - Add section in the user's profile where it should give investment and trading opportunities based on short and long term horizon. Allow the user to choose the horizon in day, week, month, themes etc.~~
- [x] ~~Task 12 - The whole dashboard has become very heavy and it has lag. Review the complete code and decrease the lag as much as possible so the user's experience is very smooth for all sections~~
- [x] ~~Task 13 - Perform end to end robust testing, covering edge cases and user experience~~
- [x] ~~Task 14 - I still cant see the source in the capsules and opportunities. Please provide the referred sources and link so I can go to the sources for capsules and opportunities.~~
- [x] ~~Task 15 - Review and Improve the PROMPTS.md file. Add all the pending sections.~~
- [x] ~~Task 16 - Perform thorough review of the subscription module. I dont think it is working. Please make sure user receive automatic newsletter once subscribed.~~
- [x] ~~Task 17 - Perform in-depth review of the backend and frontend. The UI is very slow and it lags many times. Reduce the lag and latency as much as possible keeping all the features intact.~~
- [x] ~~Task 18 - Lets deploy it to the web. Create a separate folder which has all the files needed for a single click deployment. Create a README file as well that details every step for the web deployment.~~
- [x] ~~Task 19 - I want to create an interactive section where users can post, chat, comment. It should allow the owner of the website also post as official. Could you please build it?~~
- [x] ~~Task 20 - Do end to end testing before deploying so that everything runs smoothly.~~
- [x] ~~Task 21 - Could you please review the community board? there are many bugs, i.e., I am not able to access settings, it is very slow, my post is also not visible after posting, it is very slow. Please fix it.~~
- [x] ~~Task 22 - Could you please make the map flat and rectangular? It is curved. Please do thorough testing before finalizing.~~
- [x] ~~Task 23 - Create a folder for android app. Enhanced the app for seamless user experience on the mobile phone. Provide details guide for one click deployment.~~
- [x] ~~Task 24 - Implement a feature in the community board that tells the sentiment and analysis based on community board data only.~~
- [x] ~~Task 25 - Perform thorough review of the communnity board. It should be very smooth and interactive for users. Add more features if that is helpful but it should be very smooth. User experience is a priority here.~~
- [x] ~~Task 26 - Create a section which provide heatmap of all the commodity tickers with detailed analysis on click with charting.~~
- [x] ~~Task 27 - Incorporate advanced full screen charting wherever the chart is generated.~~
- [x] ~~Task 28 - Create a section which provide heatmap of the G10 and Emerging market currencies basis dollar tickers. Incorporate advanced detailed analysis with charting.~~
- [x] ~~Task 29 - Replace fullscreen chart renderer with TradingView Lightweight Charts (official TV library). Features: LINE/AREA/CANDLESTICK chart types; realistic weekly OHLC simulation from monthly closes for candlestick mode; MA5/MA20 dashed overlays; Bollinger Bands (20,2) dashed lines; RSI(14) sub-pane with 70/30 reference lines; volume histogram sub-pane; TV-style dark theme #131722 with native crosshair (subscribeCrosshairMove); O/H/L/C values in stat row on hover; autoSize for resize; fitContent on load; BB and RSI toggleable.~~
- [x] ~~Task 30 - Transfer the API key input and country analysis trigger pop in the below to user information section so that the dashboard is clean. Perform full end to end testing to ensure that everything works smoothly. Moved #api-widget (API key input + country mode selector) from floating map overlay into Profile panel as a new "⚙ API & SETTINGS" tab. Map area is now clean. All existing JS/event listeners preserved; _showProfileBody() / showApiSettings() toggle profile-body visibility. Error messages updated to direct users to the new location.~~
- [x] ~~Task 31 - Replace LLM-generated fictitious chart data with real market data from Yahoo Finance API for all commodity and FX fullscreen charts. Added YF_TICKER map (commodities + G10/EM FX), fetchYFOHLC() with corsproxy.io CORS proxy and in-memory caching. drawChartFsLine dual data path: real OHLCV (time-based period filter, true candlestick OHLC) when available, LLM simulation fallback otherwise. Background pre-fetch on detail panel open; ⬤ LIVE / ⚠ AI ESTIMATE badge in chart sub-title.~~
---
- [x] ~~Task 32 - Research Hub implemented: 16 institutions, 10 article cards each, house view, key calls, sentiment badges, READ links, session cache.~~
- [x] ~~Task 33 - Research Hub review & hardening: auto-load Goldman Sachs on first open; robust JSON extraction (first/{last brace); REFRESH button clears session cache; retry button on parse failure; article numbering (#1-#10); sentiment score micro-bar visualization; cached-state checkmark on source buttons; real-time keyword filter across loaded articles; mobile responsive (sources collapse to horizontal strip, panel goes full-screen, topbar button hidden on small screens). 450/450 tests passing.~~
- [x] ~~Task 34 - Article links now go directly to the article where publicly available. LLM prompt requests real `url` for each article; `_articleLink()` validates it (rejects homepage-only URLs). Fallback links now point to institution's own search/publications page (not Google). "OPEN ARTICLE →" shown for direct links; "SEARCH INSTITUTION →" shown for fallback links (dimmer style). Official institutions (IMF, BIS, ECB, World Bank) serve direct URLs from RSS.~~
- [x] ~~Task 35 - API key save now just activates the key (loads tickers, shows "✓ GEMINI/CLAUDE ACTIVE"). Removed `precomputeAll()` call — country analysis only runs on demand via the 🌍 COUNTRIES tab. Dashboard stays fast on key entry.~~
- [x] ~~Task 36 - Thorough UX review and improvements: (1) First-run onboarding banner — amber strip after login when no API key, one-click ADD KEY → button opens Profile ⚙ API, auto-dismisses on key save. (2) Map click hint — pulsing "CLICK ANY COUNTRY TO ANALYSE" text hides once a country is selected. (3) Panel welcome card — replaces blank "—" values with a friendly "SELECT A COUNTRY" state before first selection. (4) Unified API key toasts — `showApiKeyToast()` helper gives every guard a tappable ADD KEY action button that opens Profile → ⚙ API directly (Commodities, FX Markets, Research Hub, Community Pulse). (5) Fixed "Enter your Gemini API key" bug in Community Pulse — now provider-agnostic. (6) Countries tab description updated — clarifies that analysis is on-demand (no precompute). (7) Inline "Enter API key" messages in Commodities detail, Digest, and Social now show clickable links to open API settings. (8) ESC hint shown in Research Hub header. 450/450 tests passing.~~
- [x] ~~Task 37 - Dashboard now visible on first load with no login gate. `requireAuth(callback, reason)` soft-gates each feature: selectCountry, openProfile, openResearch, openCustomAnalysis, openCommodities, openFx, openCommunity. When a guest triggers a feature, login modal appears with a contextual message ("Sign in to analyse Brazil", "Sign in to access Research Hub", etc.) and a pending callback that auto-executes after sign-in. Modal has a ✕ close button so users can dismiss and keep browsing. Topbar shows "▸ SIGN IN" for guests (clicking opens modal). Logout button hidden in guest mode.~~
- [x] ~~Task 38 - Password show/hide eye toggle added to both password fields (🙈/👁 button, toggles type=password/text). Google Sign-In implemented via Google Identity Services (GIS): "Continue with Google" button in login modal; `googleSignIn()` uses `google.accounts.id.prompt()` with popup mode; `handleGoogleCredential()` decodes the JWT, creates/finds user by email, starts session. Google Client ID field added in Profile → ⚙ API tab with save button and setup instructions. 450/450 tests passing.~~
- [x] ~~Task 39 - Apple ID and GitHub sign-in options added. Apple button uses Apple Sign-In JS SDK (`appleid.cdn-apple.com`); `appleSignIn()` calls `AppleID.auth.signIn()` with popup mode; `handleAppleResponse()` decodes the id_token JWT to extract sub/email/name. GitHub button uses public GitHub API (`api.github.com/users/{username}`) — no backend required; `githubSignIn()` shows a dedicated `#github-panel` with username input + avatar preview; `verifyGithubUser()` fetches and shows the profile for confirmation before creating the local account with `github_` prefix; `_completeGithubSignIn()` calls `startSession()`. Apple Service ID config in Profile → ⚙ API. Login modal: all form areas wrapped in `#login-main-form` so the GitHub panel can take over the entire box cleanly. 450/450 tests passing.~~
- [x] ~~Task 40 - Free AI mode integrated via Pollinations.ai (free, CORS-enabled, no-auth LLM endpoint). `callLLMFree()` uses Pollinations `openai` model with POST to `text.pollinations.ai`. `callLLM()` now routes to `callLLMFree()` when no API key is configured. All hard `!apiKey` blocks removed from every feature (Research Hub, FX Markets, Commodities, Community Pulse, Country Analysis, News, Social Sentiment, Digest, Opportunities, Custom Analysis, Watchlist, Language Translation, History Chart, Expand Details, etc.). `#free-mode-badge` amber badge shown in topbar when no key — clickable to open API settings. Onboarding banner updated to "⚡ Running in free AI mode — add your own Gemini or Claude key for faster, deeper analysis". `updateFreeModeBadge()` called on boot and on API key save. Ticker refresh interval starts in boot for free mode users. 456/456 tests passing.~~

- [x] ~~Task 41 - Free AI is now the silent default. Removed `#free-mode-badge` topbar badge, `updateFreeModeBadge()` function, and all 3 call sites. Removed onboarding banner trigger from `startSession()`. Removed `!apiKey` guard in `loadDeepSection()` (was blocking deep analysis without a key). Added `_upgradeHint()` helper that returns a slim amber hint strip when no API key is configured (empty string when key is set). Injected `_upgradeHint()` at the top of results in: Deep Analysis (`renderDeepSection`), Research Hub (`renderResearchArticles`), Custom Analysis (`renderCustomAnalysis`), Digest (`renderDigest`), and Opportunities (`renderOpportunitiesHTML`). The API key prompt now surfaces only inside advanced analysis features — not as a topbar badge or onboarding banner. 465/465 tests passing.~~

- [x] ~~Task 42 - API key gate: removed upgrade hints and made advanced features hard-gate on API key. Removed `_upgradeHint()` and `.upgrade-hint` CSS entirely. Added `#apikey-gate-overlay` modal (HTML + CSS + JS) with password input, show/hide toggle, format validation, SAVE & ACTIVATE button that saves key and fires pending callback, and CANCEL. Added `requireApiKey(callback, featureName)` + `closeApiKeyGate` + `toggleApiKeyGateVis` + `saveApiKeyGate` functions. Gated 8 entry points: `openDeepAnalysis`, `openResearch`, `openFx`, `openCommodities`, `openCommunity`, `loadDigestTab` (daily/weekly), `loadOpportunitiesTab`, `runCustomAnalysis`. Refactored `openResearch/openFx/openCommodities` from requireAuth-callback nesting to direct guard pattern. Basic country map analysis remains free via Pollinations. 482/482 tests passing.~~
- [x] ~~Task 43 - Topbar redesigned: removed DXY/GOLD/WTI/VIX/US10Y ticker strip. Converted to CSS grid (1fr auto 1fr) for perfect centering. Nav buttons moved to centre `<nav class="topbar-nav">` with vertical separator `.nav-sep` dividers. Symbols updated: ⬡ COMMUNITY · ◊ FX MARKETS · ◆ COMMODITIES · ⊕ ANALYSIS · ◎ RESEARCH. Unified `.topbar-nav button` base style; per-button hover accent colours preserved. Null guards added in `loadTickers()` / `applyTickerData()` for removed DOM elements. Responsive: 768px hides CA+COMMODITIES; 480px collapses entire nav.~~
- [x] ~~Task 44 - About / Product page implemented as a full-screen overlay (z-index 4500). Triggered by clicking the ◈ GLOBAL MACRO INTELLIGENCE logo; ESC closes it. Sections: (1) Hero — animated badge, gradient title, tagline, dual CTA buttons ("ENTER TERMINAL" + "EXPLORE THE MAP"). (2) Stats row — animated counters: 195 countries, 16 institutions, 6+ asset classes, 50+ indicators. (3) Core Modules grid (3×2) — feature cards for World Map, FX Markets, Commodities, Research Hub, Community Board, Personal Intelligence; each with coloured top-line accent, hover lift, symbol, description and tag pill. (4) Who It's For — 4 use-case cards (Macro Traders, Portfolio Managers, Research Analysts, Long-term Investors) with chip tags. (5) Tech Stack — 10 technology chips with hover highlight. (6) Footer CTA — "Ready to see the world differently?" with ENTER TERMINAL button. Background: dark gradient + subtle cyan grid pattern. Responsive: 2-col at 768px, 1-col at 480px. CTA routes to login gate for guests.~~

- [x] ~~Task 45 - Thorough dashboard review & E2E testing. Bugs fixed: (1) `currentSession` undefined in `handleAboutCta` → replaced with `loadSession()?.username`. (2) About overlay scroll reset now happens before `.open` class is added (prevents animated scroll-to-top). (3) Standalone about-overlay ESC handler removed and merged into the unified `wireEventListeners` handler; about-overlay added as second check (after apikey-gate, before chartFs). (4) `apikey-gate-overlay` and DOM lookups in ESC chain now use optional chaining `?.classList` to prevent null throws. (5) `stock-detail` and `stocks-modal` ESC checks also null-guarded. UX improvements: (6) Nav-active state added to all 6 topbar buttons — highlighted in their accent colour when the corresponding overlay is open (comm=purple, fx=indigo, commodities=amber, analysis=cyan, research=blue, about=cyan-border). (7) `scrollbar-gutter: stable` added to `#about-overlay` to prevent layout shift. (8) 8 open/close function pairs updated to toggle `.nav-active`. Test suite: updated 4 stale tests — ticker-tape → about-topbar-btn, file-size 500KB → 600KB, ESC slice windows 250→400 and 600→900 to accommodate new about-overlay check. Final: 482/482 passing.~~

*Last updated: 2026-05-02 · Build version: Phase 17 · 45/45 tasks done · 482/482 tests passing*
