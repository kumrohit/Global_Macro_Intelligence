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
- Ticker tape with global indices
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
   - `applyTranslation(result, lang, originalData)` updates: rationale, key_risk, sentiment badge, regime pill, all chip values, news titles+summaries, authority pub titles+summaries
   - `restoreEnglish()` calls `renderPanel(data)` for a clean full re-render

7. **Watchlist**
   > "Create a section where a user can create a watchlist. It can be a stock, ticker, country, region etc. The watchlist should track sentiments backed with data."
   - Right-side floating panel (amber color scheme, opposite social panel)
   - Auto-detect item type: country name → `'country'`, `/^[A-Z]{1,6}$/` → `'ticker'`, else → `'theme'`
   - AI sentiment per item: score (−1 to +1), label, key note, regime/asset type
   - Score rendered as a filled progress bar
   - Persists to `localStorage` under key `'gmi_watchlist'`; try/catch for Safari private mode
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

## Phase 4 — Testing & Hardening

### Prompts Delivered

9. **Test Batch 1**
   > "Test everything once, ensure they are robust, handle edge cases and run smooth."
   - Automated test suite (node): 40 checks across all Phase 1–2 features
   - Caught: unclosed template literal in `loadAuthorityPubs` (`const prompt = \`` missing closing backtick)
   - Fix: added closing backtick + semicolon before `try {` block
   - All checks passed after fix

10. **Test Batch 2**
    > "Test everything, make sure it runs smoothly, handle edge cases and provide delightful user experience."
    - Extended suite: 55 checks across all Phase 1–3 features
    - Verified: watchlist localStorage, custom analysis gauge, language translation completeness, deep overlay z-index, history chart guards
    - Result: **55/55 passing** · `node --check` syntax clean

---

## Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `SyntaxError: Unexpected identifier 'style'` at line ~1524 | Unclosed backtick in `loadAuthorityPubs` prompt template literal | Added `` ` `` + `;` before the `try {` block |
| Language translation only updating 2 fields | `toTranslate` object too narrow; token budget too low (600) | Expanded to 8+ fields; raised to 2000 tokens |
| Gauge needle not rendering | `drawCaGauge` called before overlay DOM was painted | Wrapped in `requestAnimationFrame` |
| Watchlist duplicate entries | No key dedup check | Added `watchlist.some(w => w.key === item.key)` guard |

---

## Architecture Reference

```
global_macro_intel.html (~4470 lines, single file)
├── <style>          CSS variables, layout, panel animations
├── <body>           Map, ticker tape, side panels, overlays
└── <script>
    ├── State         socialFilter, countryMode, selectedCountries, deepCache,
    │                 historyCache, watchlist, customTags, caRunning, …
    ├── Constants     META (ISO→country meta), AUTHORITY_INFO, AUTHORITY_URLS
    ├── API Layer     callLLM(), repairAndParseJSON(), closeTruncated()
    ├── Map           initMap(), selectCountry(), renderPanel()
    ├── Features      loadDeepSection(), loadHistoryData(), drawHistoryLine()
    │                 toggleLanguage(), applyTranslation(), restoreEnglish()
    │                 addWatchlistItem(), fetchWatchlistSentiment(), renderWatchlist()
    │                 runCustomAnalysis(), drawCaGauge()
    └── Boot          loadWatchlistFromStorage() → wireEventListeners() → initMap() → loadTickers()
```

---

## Next Tasks

> Add tasks below. Strike through with `~~task~~` once complete.

- [x] ~~Task 1 — Add user login page~~
- [x] ~~Task 2 — Improve my readme file. Provide description of the project. helpful technical notes and detailed architecture for github repo~~
- [x] ~~Task 3 — make it ready for web release. Help me with detailed release instructions~~

---

*Last updated: 2026-04-19 · Build version: Phase 5 complete · Login system added*
