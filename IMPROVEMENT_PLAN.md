# Meridiax — Phased Improvement Plan

> Roadmap for the next development cycles. Each phase is self-contained, ordered by impact vs. effort, and includes copy-paste prompts ready for a new session.

---

## How to Use This Document

Each phase contains:
- **Goal** — what gets better and why it matters
- **Features** — specific deliverables
- **Prompt** — exact text to paste at the start of a new Claude Code session
- **Success Criteria** — how to verify it's done
- **Dependencies** — what must exist first

Phases are roughly ordered: do Phase 1 before Phase 4, but Phases 2 and 3 are independent of each other.

---

## Phase 1 — Real-Time Market Data Integration

**Goal:** Replace AI-estimated ticker data and MACRO_CONTEXT static snapshots with live data from free public APIs. Traders need numbers they can trust, not approximations.

**Features:**
- Live policy rates from central bank APIs (FRED for US, ECB API, etc.)
- Real CPI / GDP prints from World Bank Data API or FRED
- Live equity index prices from Yahoo Finance (already used for FX/Commodities — extend to country indices)
- Auto-refresh `MACRO_CONTEXT` values on app load; show "last updated" timestamp
- Replace `DATA_VINTAGE = 'Q1 2025'` static string with a dynamic computed date based on freshest data fetched
- Fallback gracefully to static snapshot when APIs are unavailable

**Prompt:**
```
Review the current MACRO_CONTEXT object in global_macro_intel.html. It contains static Q1 2025 snapshots for 40 countries (GDP, CPI, policy rate, unemployment, current account, PMI).

Implement real-time data refresh using these free public APIs:
1. FRED API (https://fred.stlouisfed.org/docs/api/fred/) — US: Fed Funds Rate (FEDFUNDS), CPI (CPIAUCSL), Unemployment (UNRATE), GDP growth (A191RL1Q225SBEA)
2. World Bank API (https://api.worldbank.org/v2/) — GDP growth, CPI, unemployment for all countries using ISO2 codes; returns JSON without auth
3. ECB Data Portal (https://data.ecb.europa.eu/api) — Euro area rates and CPI
4. Yahoo Finance (already integrated via fetchYFOHLC) — extend YF_TICKER to include country equity indices (SPY, EWG, EWJ, FXI, etc.) for live index prices

Implementation:
- Add `refreshMacroContext()` async function that fetches live values and patches the in-memory MACRO_CONTEXT
- Run on boot (non-blocking, after initMap)
- Cache results in localStorage with 6-hour TTL (`gmi_macro_ctx_cache`)
- Update DATA_VINTAGE dynamically to the date of the most recently fetched data point
- Show a "📡 LIVE DATA" badge variant (green) alongside the existing "📊 ANCHORED" badge when live data was used
- Keep static fallback: if all fetches fail, use existing MACRO_CONTEXT values
- Log which fields were refreshed vs still using static data

Perform full end-to-end testing after implementation. Verify: live data is fetched on load, cache works (second load skips fetch), fallback works when fetch fails, badge shows correctly, existing factor-coherence pipeline still processes fresh data correctly.
```

**Success Criteria:**
- `MACRO_CONTEXT["840"].rate` reflects actual current Fed Funds Rate on load
- `📡 LIVE DATA` badge appears when data was fetched from APIs
- `📊 ANCHORED` badge appears when using cached/static data
- All 510 existing tests still pass + new tests for the refresh pipeline

**Dependencies:** None (can be done now)

---

## Phase 2 — Price Alerts & Notifications

**Goal:** Let users set threshold-based alerts on countries, tickers, and macro scores so they are notified when conditions change — without needing to manually check the app.

**Features:**
- Alert builder in the Watchlist panel: set score threshold (e.g., "notify when US macro score drops below −0.20"), price levels (e.g., "Gold > 2500"), or regime change triggers
- In-app toast notification when a tracked condition is met (check on each `fetchSentiment` completion)
- Browser Push Notification (Web Push API) for background delivery — opt-in permission flow
- Alert history log in Profile panel
- Persistent alerts stored in localStorage (`gmi_alerts[]`)

**Prompt:**
```
Add an alert system to Meridiax (global_macro_intel.html).

Alert types to support:
1. Macro Score Alert — user sets a country + condition (above/below) + threshold value (e.g., "US score < -0.20")
2. Regime Change Alert — triggers when `_regime_shift` is detected for a tracked country
3. Watchlist Score Alert — triggers when any watchlist item's sentiment score crosses a user-defined threshold

Implementation:
- Add "🔔 ADD ALERT" button to the country side panel (next to "Add to Watchlist")
- Alert builder modal: pick condition type, threshold, and notification method
- Store alerts array in localStorage key `gmi_alerts`
- On every `renderPanel(data)` call, run `checkAlerts(data)` — evaluates all active alerts against the new data
- When an alert fires: show persistent toast (stays until dismissed), log to `gmi_alert_history` in localStorage, optionally fire Web Push Notification
- Web Push: add `requestNotificationPermission()` call on first alert creation; use service worker `self.registration.showNotification()` for background delivery (sw.js already exists)
- Alert management UI in Profile panel: list all active alerts with delete button; show last 10 fired alerts in a history tab
- Dedup: an alert can only fire once per 30-minute window for the same condition (prevent spam on repeated analysis)

Add alerts section to Profile overlay as a fifth tab: ALERTS. Full end-to-end testing including: alert creation, condition evaluation, firing logic, dedup, push permission, localStorage persistence.
```

**Success Criteria:**
- User can create a "US score < −0.20" alert and it fires (toast + optional push) the next time US analysis returns score < −0.20
- Alerts persist across page reloads
- Alert history tab shows fired alerts with timestamps
- No duplicate fires within 30-minute window

**Dependencies:** None (can be done now)

---

## Phase 3 — Portfolio Intelligence

**Goal:** Let users track their actual macro-tilted positions and get AI analysis of how their portfolio aligns with the current macro regime — moving Meridiax from pure research tool to actionable portfolio advisor.

**Features:**
- Portfolio builder: add positions (instrument, direction LONG/SHORT, size %, asset class)
- AI portfolio-macro alignment score: how well does the portfolio fit the current global macro regime?
- Per-position risk flags: highlight positions that are exposed to regime shifts in tracked countries
- Heat map view showing portfolio exposure by region, asset class, and macro factor
- Export portfolio brief as PDF or copy-to-clipboard

**Prompt:**
```
Add a Portfolio Intelligence section to Meridiax (global_macro_intel.html).

Add a new "PORTFOLIO" tab to the Profile overlay (sixth tab, after ALERTS).

Portfolio builder:
- Add position form: instrument name/ticker, direction (LONG/SHORT), size (% of portfolio, 1–100), asset class (Equity/Bond/FX/Commodity/Alternative), region (Americas/Europe/Asia/EM/Global)
- Positions stored in localStorage `gmi_portfolio[]`
- Portfolio summary bar: total longs %, total shorts %, number of positions, last updated

AI Portfolio Analysis (requires API key, 2000 tokens, temp 0.3):
- Button "🧠 ANALYSE PORTFOLIO" generates a portfolio-macro alignment brief
- Prompt context: include all user positions + current macro scores for countries in their watchlist + recent regime shifts detected
- AI response schema: { alignment_score: -1 to 1, alignment_label: string, portfolio_risks: [], portfolio_tailwinds: [], regime_conflicts: [], recommended_adjustments: [], overall_thesis: string }
- Render: alignment gauge (reuse D3 semicircle gauge from Custom Analysis), risk cards (red), tailwind cards (green), regime conflict banners (amber), adjustment cards with conviction %

Exposure heat map:
- Simple CSS grid: rows = asset classes, columns = regions
- Cell color = weighted average macro score of positions in that cell
- Click cell → filters positions to that category

Full E2E testing: position CRUD, localStorage persistence, analysis prompt + render, gauge, conflict detection.
```

**Success Criteria:**
- User can add 5 positions and get an AI alignment score
- Regime conflicts are flagged when a position is LONG in a country whose score just went negative
- Exposure heat map renders correctly
- Works in free mode (Pollinations) with degraded token budget

**Dependencies:** Phase 2 (alert system) recommended but not required

---

## Phase 4 — Macro Scenario Builder

**Goal:** Let traders run "what if" scenarios — model the impact of Fed cuts, geopolitical shocks, or commodity price spikes on country sentiment scores — turning Meridiax into a forward-looking stress-testing tool.

**Features:**
- Scenario editor: define a macro shock (e.g., "Fed cuts 100 bps", "Oil +30%", "China growth −2%")
- AI estimates the delta impact on each affected country's sentiment score
- Side-by-side view: baseline vs. scenario scores on the world map (colour shift visualization)
- Scenario library: save and name up to 5 scenarios; compare them
- Integration with Portfolio Intelligence: show portfolio P&L impact under each scenario

**Prompt:**
```
Add a Macro Scenario Builder to Meridiax (global_macro_intel.html).

Access: new "SCENARIOS" button in the topbar (between ANALYSIS and RESEARCH). Opens a full-screen overlay at z-index 2150.

Scenario editor:
- Scenario name input
- Add shock items: category (Monetary Policy / Growth / Inflation / FX / Geopolitical / Commodity), description (free text), magnitude (−5 to +5 slider with labels like "mild/moderate/severe")
- Up to 6 shocks per scenario
- Save to localStorage `gmi_scenarios[]` (max 5 scenarios)

AI impact analysis (2500 tokens, temp 0.2):
- Prompt: given defined shocks, estimate the sentiment score delta (−1 to +1) for each of 20 HIGH_STAKES countries and identify the 5 most affected countries
- Response schema: { affected_countries: [{iso: string, name: string, baseline_score: number, scenario_score: number, delta: number, key_transmission: string}], global_impact: string, asset_class_implications: {equities: string, bonds: string, fx: string, commodities: string} }

Visualization:
- World map overlay mode: apply delta colours on top of baseline (green = positive delta, red = negative)
- Ranked impact table: top 5 gainers and top 5 losers under the scenario
- Asset class impact cards (4 cards: Equities / Bonds / FX / Commodities)

Scenario comparison: load 2 saved scenarios side-by-side in a split table

Full E2E testing. Verify: scenario save/load, AI analysis with schema validation, map colour overlay, comparison view.
```

**Success Criteria:**
- User can define a "Fed +100bps" scenario and see which countries are most impacted
- Map shows colour delta overlay correctly
- Scenario is saved and reloadable
- Side-by-side comparison works for 2 scenarios

**Dependencies:** Phase 1 recommended (live data makes scenarios more grounded)

---

## Phase 5 — Advanced Signal Intelligence

**Goal:** Add quantitative signal generation — cross-asset momentum, macro factor scores over time, and a signal dashboard that summarises tradeable signals across all asset classes in one view.

**Features:**
- Macro Factor Dashboard: visualise 6 macro factors (growth/inflation/monetary/FX/geopolitical/market) as a radar chart per country
- Cross-asset signal matrix: table of countries × asset classes with directional signals (↑/↓/◆) and conviction %
- Signal history: track how macro scores and factors have changed over sessions (stored in localStorage)
- "Top 5 Macro Trades" daily brief: AI-generated highest-conviction cross-asset trade ideas from the full country analysis set

**Prompt:**
```
Add an Advanced Signal Intelligence section to Meridiax (global_macro_intel.html).

1. Macro Factor Radar Chart (in country side panel, below the confidence band):
- D3 radar chart showing the 6 factor scores from the current analysis (growth, inflation, monetary, fx, geopolitical, market) — values −1 to +1
- Hexagonal grid with labels; filled polygon for current values; colour matches sentiment (green/amber/red)
- Show only when `data.factors` is available; hide otherwise
- Small (200×200 px) inline chart, no separate overlay needed

2. Signal History (localStorage-backed):
- On every `renderPanel(data)` call, append to `gmi_signal_history[isoId]` array: { ts, score, sentiment, regime, factors }
- Cap at 30 entries per country to limit storage
- Show "HISTORY" mini-spark line in the side panel: a tiny D3 line chart (300×40 px) of the last 10 score readings with a dot for the latest
- Tooltip on hover shows the exact score and date

3. Cross-Asset Signal Matrix (new tab in Profile overlay — SIGNALS):
- For each country in the user's watchlist, show a row with: flag, name, score bar, equity signal (↑/↓/◆), bond signal, FX signal, commodity signal
- Signals derived from `equity_bias`, `rate_outlook`, `fx_bias`, `factors.market` from cached analysis
- Color-coded cells; click row → opens the country side panel
- "REFRESH ALL" button re-runs `fetchSentiment` for all watchlist countries

4. Top 5 Macro Trades Brief (in Opportunities tab, new "SIGNALS" horizon alongside DAY/WEEK/MONTH/THEMES):
- Scans all cached country analyses; finds the 5 highest |score| countries with `_econ_grounded = true`
- Generates a 5-trade brief: highest-conviction long and short ideas with instrument, rationale, and risk

Full E2E testing: radar chart render, history storage, signal matrix, trade brief generation.
```

**Success Criteria:**
- Radar chart appears in the side panel for HIGH_STAKES countries
- Score history spark line shows progression after 3+ analyses of the same country
- Signal matrix tab shows all watchlist countries with directional signals
- Top 5 Macro Trades generates 5 valid trade ideas

**Dependencies:** Phase 1 (more accurate data improves signals)

---

## Phase 6 — MACRO_CONTEXT Quarterly Refresh Tooling

**Goal:** Make it easy to update the 40-country MACRO_CONTEXT data each quarter without manual code editing. Currently requires opening the HTML source and editing hardcoded values — not sustainable.

**Features:**
- Admin panel in Profile → ⚙ API & SETTINGS: "UPDATE MACRO DATA" section
- Paste raw macro data (JSON or text table) → AI parses it and updates the in-memory MACRO_CONTEXT
- Validate against schema: ensure all required fields present and within valid ranges
- Export updated MACRO_CONTEXT as a JSON file (download button) for pasting back into the source
- Automated quarterly reminder: if `DATA_VINTAGE` is older than 90 days, show a yellow banner in the analyst panel

**Prompt:**
```
Add a MACRO_CONTEXT refresh tool to Meridiax (global_macro_intel.html) in the Profile → ⚙ API & SETTINGS tab.

Add a collapsible "📋 MACRO DATA UPDATE" section at the bottom of the API settings tab.

Features:
1. Data vintage indicator: show current DATA_VINTAGE value and days since last update. If > 90 days old, show amber warning "⚠ Data is X days old — consider updating".

2. Paste-to-update input:
- Large textarea for pasting raw macro data (free-form text or JSON: country, GDP, CPI, rate, unemployment, CA balance, PMI, key note)
- "🧠 PARSE & UPDATE" button — sends the pasted text to the LLM with instructions to extract structured MACRO_CONTEXT entries
- LLM response schema: array of { iso3: string, gdp: string, cpi: string, rate: string, unemp: string, ca: string, pmi: string, note: string }
- Validate each field: iso3 must be a known 3-digit code; numeric fields must be parseable; note must be non-empty string
- Show preview table of parsed data before applying (with ✓/✗ per row)
- "APPLY UPDATES" button merges parsed entries into the runtime MACRO_CONTEXT and updates DATA_VINTAGE to today's date
- Changes stored in localStorage `gmi_macro_overrides` and applied on top of the compiled MACRO_CONTEXT at boot

3. Export: "⬇ EXPORT JSON" button downloads the full current MACRO_CONTEXT (with any overrides applied) as `macro_context_YYYY-MM-DD.json`

4. Quarterly reminder: on boot, if DATA_VINTAGE age > 90 days, show a dismissible amber banner strip below the topbar: "📋 MACRO_CONTEXT is X days old — update in ⚙ API Settings"

Full E2E testing: paste parse, validation, preview, apply, export, boot reminder.
```

**Success Criteria:**
- User can paste a table of central bank rates and have them parsed into the correct MACRO_CONTEXT format
- Preview shows which rows parsed successfully
- Applied data persists across page reloads
- Export downloads a valid JSON file
- Quarterly reminder appears when data is >90 days old

**Dependencies:** None

---

## Phase 7 — Report Generation & Export

**Goal:** Let analysts generate professional PDF/HTML reports from Meridiax analysis — useful for sending to clients, internal teams, or archiving research.

**Features:**
- "GENERATE REPORT" button in the Deep Analysis overlay and Custom Analysis overlay
- Report types: Country Brief (1 page), Deep Dive (5-page multi-section), Custom Thematic (custom length)
- Professional dark-themed HTML report template (print-ready, A4)
- Export as: open-in-tab HTML, download HTML file, copy-to-clipboard
- Include: country flag, score gauge visual, factor breakdown, key risks, outlook, date/vintage stamp

**Prompt:**
```
Add report generation to Meridiax (global_macro_intel.html).

Add a "📄 GENERATE REPORT" button to:
1. The country side panel (next to the deep analysis button)
2. The Custom Analysis overlay (in the header bar)

Report generator function `generateCountryReport(isoId)`:
- Gathers all cached data for the country: main analysis (cache[isoId]), deep analysis tabs (deepCache), history data, authority publications
- Builds a professional single-page HTML report with:
  - Header: country flag, name, date, DATA_VINTAGE label
  - Score section: large score number, sentiment label, confidence band (score_low to score_high), FC ADJ / ANCHORED badges if applicable
  - Regime & Outlook row: regime pill, equity bias, rate outlook, FX bias, risk level
  - Factor Breakdown table: 6 factors with score bars
  - Key Risk panel (amber background)
  - AI Rationale (full text)
  - Deep Analysis sections (if available): Economy, Markets, Risks, Outlook tabs as sections
  - Footer: "Generated by Meridiax | meridiax.app | Not financial advice"

Styling: dark background (#0f1117), cyan accents, JetBrains Mono font loaded from Google Fonts, print media query forces white background with dark text for PDF printing

`openReportPreview(html)`: opens the report in a new tab (`window.open` with `document.write`)
`downloadReport(html, filename)`: triggers download of the HTML file

Custom Analysis report: include title, executive summary, sentiment gauge image (SVG export of the D3 arc gauge), theme bars, trade ideas, opportunities, risks.

Full E2E testing: report generation, HTML structure validation, both export methods.
```

**Success Criteria:**
- Country report opens in a new tab with correct data populated
- Report prints cleanly to PDF from browser print dialog
- Custom Analysis report includes all sections
- Download works and produces a valid HTML file

**Dependencies:** None (can be done anytime)

---

## Phase 8 — Multi-Model AI Routing & Comparison

**Goal:** Let users route different features to different AI models and, for key analyses, run two models in parallel and show both outputs side-by-side — improving confidence through model diversity.

**Features:**
- Per-feature model selector in API settings: choose Gemini 2.5 Flash / Claude Sonnet / Claude Opus for each feature type
- "DUAL MODEL" mode for country analysis: run Gemini and Claude in parallel, show both results, highlight agreements and disagreements
- Model performance tracker: record which model gave higher confidence outputs per country (based on factor coherence score)
- Cost estimator: show approximate token usage and estimated cost per session

**Prompt:**
```
Extend the API layer in Meridiax (global_macro_intel.html) to support multi-model routing and dual-model comparison.

1. Per-feature model selector (in Profile → ⚙ API & SETTINGS):
- Model routing table: rows for fetchSentiment, loadDeepSection, runCustomAnalysis, loadDigestTab, loadOpportunitiesTab
- Each row has a dropdown: Auto (use available key) / Gemini 2.5 Flash / Claude Sonnet / Claude Opus
- Settings saved to localStorage `gmi_model_routing`
- `getModelForFeature(featureName)` reads the routing table and returns the appropriate provider+model string
- Update `callLLM()` to accept an optional `model` override parameter

2. Dual Model mode for country analysis:
- New toggle in ⚙ API & SETTINGS: "🔀 DUAL MODEL ANALYSIS" (requires both Gemini and Claude keys)
- When enabled, `fetchSentiment` fires both models in parallel (`Promise.all`)
- Show results in a split view: left = Gemini result, right = Claude result
- Highlight disagreements: score delta > 0.15 shown in amber; regime mismatch shown in red; agreements shown in green check
- "ACCEPT LEFT / ACCEPT RIGHT / BLEND" buttons to choose which result to cache
- Blend option uses the same weighted averaging logic as HIGH_STAKES dual-call

3. Model performance tracker:
- After each analysis, record `{ isoId, model, score, _factor_composite, _score_adjusted, ts }` in a rolling `gmi_model_perf[]` array (max 100 entries)
- In API settings: "MODEL STATS" section showing per-model average coherence score and adjustment rate

Full E2E testing: routing table, dual model parallel fetch, split view render, blend logic, performance tracker.
```

**Success Criteria:**
- User with both keys sees side-by-side Gemini vs Claude analysis
- Blend correctly averages scores and applies smart voting
- Routing table persists across sessions
- Model stats show meaningful per-model comparison

**Dependencies:** Both Gemini and Claude API keys required by the user for dual mode

---

## Phase 9 — Community Intelligence Upgrade

**Goal:** Make the Community Board the primary social layer for macro intelligence — with analyst reputation scores, curated macro threads, and AI synthesis that improves with more community data.

**Features:**
- Analyst reputation system: track-record score based on accuracy of past macro calls (bullish on a country → check if score went up)
- Macro Threads: themed discussion channels (e.g., #Fed Watch, #EM Crisis, #Commodities)
- Community Consensus Meter: real-time bull/bear ratio per country derived from posts
- AI Synthesis 2.0: enhanced community pulse that cross-references community sentiment with official MACRO_CONTEXT data

**Prompt:**
```
Upgrade the Community Board in Meridiax (global_macro_intel.html) with three new features.

1. Macro Threads:
- Add a "THREADS" tab to the Community Board alongside FEED and PULSE
- Predefined thread channels: #Fed Watch · #EM Crisis · #Commodities · #China · #Rate Hikes · #Geopolitics + user-created threads (up to 3 custom)
- Posts can be tagged to a thread; threads show unread count badge
- Thread view filters FEED to posts in that thread + shows a pinned AI summary of the thread (100 tokens, auto-refreshes every 10 new posts)
- Store threads in localStorage `gmi_threads[]`

2. Country Consensus Meter:
- Add `computeCountryConsensus(isoId)` — counts community posts tagged with a country (by mention or hashtag), tallies bullish/bearish/neutral
- Show a mini consensus bar below each country's score in the side panel when >2 relevant posts exist: "👥 COMMUNITY: 70% BULL · 30% BEAR (14 posts)"
- Update on every new post submission and on FEED refresh

3. Analyst Reputation (local mode):
- Track each user's macro calls: when a user posts "BULLISH $US" and the US macro score later increases, award +1 accuracy point
- Check accuracy on the next `fetchSentiment` for that country (within 7 days of the post)
- Display accuracy score in Profile overlay: "TRACK RECORD: 8/12 calls correct (67%)"
- Top analysts leaderboard in Community Board PULSE tab (local data only, no server needed)

Full E2E testing: thread filtering, consensus meter, accuracy scoring, leaderboard render.
```

**Success Criteria:**
- Thread channels render and filter posts correctly
- Consensus meter appears in country panel when community posts exist
- Track record updates after making a call and re-analysing the country
- Leaderboard shows top 5 analysts by accuracy

**Dependencies:** Community Board must be working (already done)

---

## Phase 10 — Mobile Native & PWA Enhancement

**Goal:** Make the Android/iOS PWA experience indistinguishable from a native app — with offline-first architecture, push alerts, and mobile-specific UX patterns.

**Features:**
- Offline-first: pre-cache all 195 country metadata and map SVG; serve cached analyses when offline
- Background sync: queue `fetchSentiment` calls when offline; execute on reconnect
- Share Sheet: native share of country analysis as a formatted summary card
- Haptic feedback: light vibration on country selection and alert fire (Vibration API)
- Home screen widget (shortcut icons) for top 5 watchlist items using Web App Manifest shortcuts

**Prompt:**
```
Upgrade the PWA capabilities in Meridiax. Update both android/sw.js and deploy/sw.js (or create them if only one exists).

1. Offline-first cache strategy:
- Cache-first for static assets (HTML, CDN scripts, TopoJSON map)
- Network-first with cache fallback for LLM API calls (Gemini/Pollinations)
- Pre-cache on install: the app HTML, all CDN dependencies, the TopoJSON world geometry file
- Update sw.js CACHE_VERSION constant to bust old caches on deploy

2. Background sync for analysis requests:
- When `fetchSentiment` is called offline, queue the request in IndexedDB using Background Sync API (`navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-sentiment'))`)
- Service worker `sync` event handler: dequeue and execute all pending sentiment requests
- Show "📶 OFFLINE — analysis queued" toast when queueing; "✓ SYNCED" toast on execution

3. Share Sheet:
- Add "SHARE" button to country side panel
- `shareCountryBrief(data)` uses Web Share API (`navigator.share`) with title, text summary (score + regime + key risk), and URL
- Fallback: copy formatted summary to clipboard if Web Share not supported

4. Haptic feedback:
- `haptic(pattern)` wrapper for `navigator.vibrate()` with null check
- Short pulse (50ms) on country selection; double pulse (50,100,50) on alert fire; long buzz (200ms) on error
- Can be disabled in ⚙ API & SETTINGS via `gmi_haptic_enabled` flag

5. Web App Manifest shortcuts (manifest.json update):
- Add `shortcuts` array with top 5 most-analysed countries (derive from `gmi_signal_history` — countries with the most entries)
- Each shortcut: `{ name: country, url: "?country=ISO_ID", icons: [...] }`
- On app load, detect `?country=` query param and auto-select that country

Full E2E testing: offline mode (DevTools → Network → Offline), share functionality, haptic calls, manifest validation.
```

**Success Criteria:**
- App loads fully from cache when offline
- Pending analyses execute when reconnected
- Share sheet opens with formatted brief on mobile
- Haptic feedback fires on country selection (test on actual Android device)

**Dependencies:** Phase 2 (alert system) for haptic on alert fire

---

## Phase 11 — Data Transparency & Source Attribution

**Goal:** Every number in Meridiax should be traceable. Show users exactly where each data point came from — API, AI-estimated, MACRO_CONTEXT static, or community-sourced — so analysts can calibrate their trust.

**Features:**
- Data provenance layer: tag every displayed figure with its source type
- Source panel: click any statistic to see its provenance (API + timestamp, or AI model + prompt hash, or MACRO_CONTEXT vintage)
- Methodology disclosure: "How is this score calculated?" expandable explanation per country
- Audit log: per-session log of all LLM calls with token usage, model, and response confidence

**Prompt:**
```
Add data transparency and source attribution to Meridiax (global_macro_intel.html).

1. Provenance tagging:
- Extend the cached result schema with `_provenance: { score: string, factors: {[key]: string}, macro_data: {[field]: string} }`
- Possible source values: 'gemini-2.5-flash', 'claude-sonnet', 'pollinations', 'macro_context_static', 'macro_context_live', 'yahoo_finance', 'community'
- Populate `_provenance` in `fetchSentiment`, `refreshMacroContext` (Phase 1), and `fetchYFOHLC`

2. Provenance hover tooltips:
- In `renderPanel`, add a small ⓘ icon next to the score, each factor chip, and the MACRO_CONTEXT data fields
- On hover: tooltip shows "Source: Gemini 2.5 Flash · Q1 2025 MACRO_CONTEXT · 2026-05-09"
- Tooltip uses the existing `_tt` cached tooltip element pattern for performance

3. Methodology panel:
- "HOW IS THIS CALCULATED?" collapsible section at the bottom of the country side panel
- Explains: chain-of-thought prompting → factor decomposition → coherence blending → confidence band
- Shows the actual factor weights used (growth 25%, inflation 20%, etc.)
- Indicates whether dual-call averaging was used (HIGH_STAKES flag)

4. Session audit log (developer mode):
- Add `gmi_dev_mode` flag in ⚙ API & SETTINGS (toggle switch)
- When enabled: after each LLM call, append to in-memory `_auditLog[]` array: { ts, feature, model, tokens_in (estimated), tokens_out (estimated), response_score, _score_adjusted }
- "VIEW AUDIT LOG" button in API settings: opens a modal with the full session log as a scrollable table
- Export button downloads log as CSV

Full E2E testing: provenance tags populated, tooltip renders, methodology section, dev mode log.
```

**Success Criteria:**
- Hovering over the score shows which model generated it
- Methodology section correctly describes factor weights
- Audit log records all LLM calls when dev mode is on
- Provenance distinguishes live API data from static MACRO_CONTEXT

**Dependencies:** Phase 1 (live data) makes provenance more meaningful

---

## Phase 12 — Self-Calibration & Accuracy Tracking

**Goal:** Track prediction accuracy over time and use historical performance to auto-tune the factor weights in the coherence pipeline — making the model smarter with every use.

**Features:**
- Prediction log: store each analysis with its score and regime; on next analysis of the same country, record whether the score moved in the right direction
- Accuracy metrics per country: directional accuracy %, average score delta, regime consistency
- Auto-weight tuning: if a factor consistently over/under-estimates, adjust its weight in the coherence formula
- Accuracy leaderboard: which countries are most predictable vs most volatile

**Prompt:**
```
Add self-calibration and accuracy tracking to Meridiax (global_macro_intel.html).

1. Prediction logging:
- After each `fetchSentiment` call, store in localStorage `gmi_pred_log[isoId][]`: { ts, score, sentiment, regime, factors, model, _score_adjusted }
- Cap at 20 entries per country
- On each new analysis, compare to previous entry: compute { direction_correct: bool, delta: number, regime_stable: bool }
- Append accuracy verdict to the log entry

2. Accuracy metrics (in Profile overlay, new ACCURACY tab):
- Per-country accuracy table: flag, name, entries count, directional accuracy %, avg |delta|, regime stability %
- Sort by most analysed countries first
- Overall session stats bar: total predictions, % directional accuracy, avg delta

3. Dynamic weight tuning (optional, requires 10+ predictions):
- Compute per-factor correlation with actual score direction across all logged predictions
- If a factor's correlation < 0.3 (low predictive value), reduce its weight by 10% (floored at 0.05)
- If correlation > 0.7, increase weight by 10% (capped at 0.35)
- Show current vs. compiled weights in a comparison table in ⚙ API & SETTINGS
- "RESET WEIGHTS" button restores the compiled defaults
- Tuned weights stored in `gmi_factor_weights` localStorage key; read by `validateSentimentResult` at runtime

4. Volatility heatmap:
- World map colour mode: toggle between "Sentiment" (current) and "Volatility" (avg |score delta| over logged predictions)
- High-volatility countries glow amber; low-volatility countries glow cyan
- Hover tooltip shows volatility metric

Full E2E testing: log creation, accuracy computation, weight tuning (with mock data), volatility mode.
```

**Success Criteria:**
- After 3 analyses of the same country, accuracy metrics are shown
- Dynamic weights update after 10+ predictions
- Volatility map mode toggles correctly
- Weight reset restores compiled defaults

**Dependencies:** Phases 5 and 11 build on the same data structures; best done after Phase 5

---

## Implementation Priority Matrix

| Phase | Impact | Effort | Dependency | Recommended Order |
|-------|--------|--------|-----------|-------------------|
| 1 — Real-Time Data | High | Medium | None | **1st** |
| 2 — Alerts | High | Low | None | **2nd** |
| 6 — MACRO_CONTEXT Tooling | High | Low | None | **3rd** |
| 7 — Report Generation | Medium | Low | None | **4th** |
| 3 — Portfolio Intelligence | High | High | None | **5th** |
| 5 — Signal Intelligence | High | Medium | Phase 1 | **6th** |
| 4 — Scenario Builder | High | Medium | Phase 1 | **7th** |
| 11 — Data Transparency | Medium | Medium | Phase 1 | **8th** |
| 9 — Community Upgrade | Medium | Medium | None | **9th** |
| 10 — Mobile PWA | Medium | High | Phase 2 | **10th** |
| 8 — Multi-Model AI | Medium | Medium | None | **11th** |
| 12 — Self-Calibration | Medium | High | Phase 5, 11 | **12th** |

---

## Quick-Start Prompts (Copy-Paste Ready)

For each new session, paste the relevant prompt block above preceded by this context header:

```
Context: Meridiax is a single-file HTML/CSS/JS macro intelligence terminal (global_macro_intel.html, ~636 KB, ~8 420 JS lines, 510 tests passing). Stack: Vanilla JS, D3.js v7, TradingView Lightweight Charts, Gemini 2.5 Flash / Claude Sonnet / Pollinations.ai (free). Current test suite: node test_e2e.js. Deploy copy: deploy/index.html (sync after changes with: cp global_macro_intel.html deploy/index.html).

[Paste the phase prompt below]
```

---

*Last updated: 2026-05-10 · 12 planned phases · Current build: Phase 20 (60 tasks complete) · 510/510 tests passing · ~636 KB*
