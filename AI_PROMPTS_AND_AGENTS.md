# Meridiax — AI Prompts & Agent Architecture

> **Dashboard**: `global_macro_intel.html` · **Stack**: Vanilla JS · Gemini 2.5 Flash · Claude (Anthropic) · Pollinations.ai (free fallback)

---

## Table of Contents

1. [LLM Infrastructure](#1-llm-infrastructure)
2. [Core Prompt Engineering Patterns](#2-core-prompt-engineering-patterns)
3. [Prompt Registry — All 19 Features](#3-prompt-registry)
   - [3.1 Country Sentiment Analysis](#31-country-sentiment-analysis-fetchsentiment)
   - [3.2 Central Bank Publications](#32-central-bank-publications-loadauthoritypubs)
   - [3.3 Macro News Headlines](#33-macro-news-headlines-loadnews)
   - [3.4 News Background Pre-fetch](#34-news-background-pre-fetch-loadnewsbackground)
   - [3.5 Social Sentiment](#35-social-sentiment-loadsocialsentiment)
   - [3.6 Deep Country Analysis](#36-deep-country-analysis-loaddeepsection)
   - [3.7 Historical Macro Data](#37-historical-macro-data-loadhistorydata)
   - [3.8 Language Translation](#38-language-translation-togglelanguage)
   - [3.9 Expand-to-Details](#39-expand-to-details-loadexpanddetail)
   - [3.10 Watchlist Sentiment](#310-watchlist-sentiment-fetchwatchlistsentiment)
   - [3.11 Custom Thematic Analysis](#311-custom-thematic-analysis-runcustomanalysis)
   - [3.12 Daily & Weekly Digest](#312-daily--weekly-digest-loaddigesttab)
   - [3.13 Digest Item Deep Dive](#313-digest-item-deep-dive-loaddigestitemdetail)
   - [3.14 Investment Opportunities](#314-investment-opportunities-loadopportunitiestab)
   - [3.15 Economic Calendar](#315-economic-calendar-loadcalendar)
   - [3.16 Research Hub](#316-research-hub-loadresearch)
   - [3.17 Commodities Heatmap Analysis](#317-commodities-heatmap-analysis-loadcommodityheat)
   - [3.18 FX Markets Heatmap Analysis](#318-fx-markets-heatmap-analysis-loadfxheat)
   - [3.19 Community Sentiment](#319-community-sentiment-loadcommunitypulse)
4. [Post-Processing Pipeline](#4-post-processing-pipeline)
   - [4.1 JSON Repair](#41-json-repair-repairandparsejson)
   - [4.2 Sentiment Validation](#42-sentiment-validation-validatesentimentresult)
   - [4.3 Regime Shift Detection](#43-regime-shift-detection)
5. [Agent Architecture](#5-agent-architecture)
   - [5.1 Sentinel Pattern — Sentiment Orchestrator](#51-sentinel-pattern--sentiment-orchestrator)
   - [5.2 Web-Grounded Research Agent (Claude)](#52-web-grounded-research-agent-claude)
   - [5.3 Dual-Call Self-Consistency Agent (HIGH_STAKES)](#53-dual-call-self-consistency-agent-high_stakes)
   - [5.4 Background Pre-fetch Agent](#54-background-pre-fetch-agent)
   - [5.5 Personalisation Agent — Digest & Opportunities](#55-personalisation-agent--digest--opportunities)
6. [LLM Call Reference Summary](#6-llm-call-reference-summary)
7. [Data Grounding & Context Injection](#7-data-grounding--context-injection)

---

## 1. LLM Infrastructure

### Provider Routing

The dashboard supports three LLM backends, selected automatically based on the configured API key.

```
User API Key
    │
    ├── starts with "AIza…"       → Gemini 2.5 Flash  (Google REST API)
    ├── starts with "sk-ant-…"    → Claude             (Anthropic SDK)
    │   or "sk-…"
    └── no key configured         → Pollinations.ai    (free, no auth, openai model)
```

**Function: `detectProvider()`**

```javascript
// Returns: 'gemini' | 'claude' | 'unknown' | null
function detectProvider()
```

---

### Core API Functions

#### `callLLM(systemPrompt, userPrompt, maxTokens = 800, temperature = 0)`

The unified LLM gateway used by every feature in the dashboard. Routes to Gemini, Claude, or the free tier based on the configured API key.

| Parameter | Details |
|-----------|---------|
| `thinkingBudget` | Set to `0` on all calls — suppresses reasoning tokens from consuming the output budget |
| Timeout | 45-second `AbortController` on every call |
| Fallback | Routes to `callLLMFree()` when no API key is set |

#### `callLLMFree(systemPrompt, userPrompt, maxTokens)`

Free-tier fallback via **Pollinations.ai** (`text.pollinations.ai`). No authentication required. Used automatically when no API key is configured, enabling full dashboard functionality for unauthenticated users.

#### `callClaudeWithSearch(userPrompt, maxTokens, maxSearches = 3)`

**Claude-exclusive**. Adds live web search capability using Claude's native `web_search` tool. Used in `fetchSentiment` when Claude is the configured provider, grounding sentiment analysis in real-time news and data.

- Tool: `web_search` with up to 3 search iterations
- Extracts text from `tool_use` response blocks
- Sets `result._grounded = true` when search is used

---

## 2. Core Prompt Engineering Patterns

All 19 LLM features in the dashboard share a consistent set of prompt engineering techniques:

### 2.1 Strict JSON-Only Output Constraint

Every system prompt enforces strict JSON-only output to enable reliable parsing:

```
"Output only a single raw JSON object. No markdown. No explanation. No code fences. No trailing commas."
```

This pattern prevents the LLM from wrapping output in prose or markdown fences, which would require complex parsing.

### 2.2 Expert Role Persona

Each prompt assigns a domain-expert role to improve output quality:

| Feature | Role Assigned |
|---------|--------------|
| Country Sentiment | "Senior macro strategist at a top-tier investment bank" |
| Watchlist | "Senior macro strategist" / "Senior market analyst" |
| Research Hub | "Financial research synthesizer for [institution]" |
| Digest | "Senior macro intelligence analyst" |
| Opportunities | "Senior macro portfolio strategist" |
| Social Sentiment | "Market sentiment analyst" |
| Deep Analysis | "Senior macro strategist" |

### 2.3 Schema-First Prompting

Every prompt includes a detailed JSON schema in the user prompt, with field-level constraints (value ranges, word limits, allowed enum values):

```
"score": number between -1.0 and 1.0,
"confidence": "High" | "Medium" | "Low",
"rationale": "25 words or fewer"
```

### 2.4 Today's Date Injection

Time-sensitive prompts inject `today` (the current date in ISO format) to anchor LLM reasoning to the correct time period:

```javascript
const today = new Date().toISOString().split('T')[0];
// Injected into prompt as: `Today is ${today}.`
```

### 2.5 Trader-Grade Output Fields

All 14 prompt-generating features include specific actionable output fields for professional traders and macro strategists. Key additions across the prompt library:

| Feature | Trader-Grade Fields Added |
|---------|--------------------------|
| Stock Analysis | `valuation_method`, `peer_comparison`, `fcf_yield`, `positioning`, `trade_setup` (entry/stop/target/R:R/holding_period) |
| News Expand | IMMEDIATE IMPACT / 48-HOUR POSITIONING / CROSS-ASSET CONTAGION / KEY LEVEL TO WATCH structure |
| News Headlines | `asset_impact` field; specific numbers and institutions required |
| Watchlist Expand | CURRENT DRIVERS / POSITIONING LANDSCAPE / RISK SCENARIOS / TRADE SETUP & OUTLOOK structure |
| Custom Analysis | `macro_regime`, `scenario_analysis` (base/bull/bear with probabilities), `key_asset`, `risk_reward`, `catalyst` |
| Digest | `market_recap` (overnight moves), `events_today`, `positioning_shifts`, `portfolio_relevance` per item |
| Opportunities | `entry_level`, `stop_level`, `target_level`, `risk_reward`, `position_size_note`, `catalyst_trigger` |
| Commodity Detail | `supply_demand`, `positioning` (CoT context), `seasonal`, trade setup with `risk_reward` and `timeframe` |
| FX Detail | `positioning` (IMM data), `vol_context` (skew), `carry.annualised_carry_pct`, trade `risk_reward` and `catalyst` |
| Social Expand | Smart money vs retail divergence, asset impact map, 4-point professional structure |
| Authority Pubs | `market_signal` field, policy message + market implication structure |
| Community Sentiment | `conviction_level`, bull/bear/nuanced `key_views` |

### 2.7 Economic Data Anchoring

Quantitative macro context is injected into sentiment prompts via `MACRO_CONTEXT` — a curated Q1 2025 snapshot covering 40 countries:

```javascript
const econBlock = `
  GDP: ${ctx.gdp}% | CPI: ${ctx.cpi}% | Policy Rate: ${ctx.rate}%
  Unemployment: ${ctx.unemp}% | Current Account: ${ctx.ca}% | PMI: ${ctx.pmi}
  Note: ${ctx.note} | Data vintage: Q1 2025
`;
```

---

## 3. Prompt Registry

### 3.1 Country Sentiment Analysis (`fetchSentiment`)

**The core intelligence engine of the dashboard.** Produces a structured macro sentiment score for any of 195 countries.

---

**System Prompt:**

```
Output only a single raw JSON object. No markdown. No explanation. No code fences. No trailing commas.
```

---

**Standard User Prompt (Gemini / free tier):**

```
You are a senior macro strategist at a top-tier investment bank.

Today is [DATE]. Assess the current macroeconomic sentiment for [COUNTRY].

Economic context (data vintage: Q1 2025):
  GDP: X% | CPI: X% | Policy Rate: X%
  Unemployment: X% | Current Account: X% | PMI: X
  Note: [country-specific macro note]

Recent news context:
  - [headline 1]
  - [headline 2]
  - [headline 3]

Decompose sentiment across 6 factors:
  - growth      (weight 0.25): GDP trajectory, PMI, employment trends
  - inflation   (weight 0.20): CPI path relative to central bank target
  - monetary    (weight 0.25): central bank stance and rate outlook
  - fx          (weight 0.15): currency strength and external balance
  - geopolitical(weight 0.10): political stability, trade relations, sanctions
  - market      (weight 0.05): equity index performance, credit spreads

Composite score = growth×0.25 + inflation×0.20 + monetary×0.25 + fx×0.15 + geopolitical×0.10 + market×0.05

Output schema:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": -1.0 to 1.0,
  "score_low": -1.0 to 1.0,
  "score_high": -1.0 to 1.0,
  "confidence": "High" | "Medium" | "Low",
  "regime": "Goldilocks" | "Reflation" | "Stagflation" | "Recession",
  "rationale": "25 words or fewer",
  "equity_bias": "Overweight" | "Neutral" | "Underweight",
  "rate_outlook": "Cutting" | "Holding" | "Hiking",
  "fx_bias": "Strengthen" | "Stable" | "Weaken",
  "risk_level": "Low" | "Medium" | "High" | "Very High",
  "key_risk": "8 words or fewer",
  "news_topics": ["topic1", "topic2", "topic3"],
  "factors": {
    "growth": -1.0 to 1.0,
    "inflation": -1.0 to 1.0,
    "monetary": -1.0 to 1.0,
    "fx": -1.0 to 1.0,
    "geopolitical": -1.0 to 1.0,
    "market": -1.0 to 1.0
  }
}
```

**Token budget:** 1800 · **Temperature:** 0.2

---

**Claude Web-Search Variant (prepended instruction):**

```
Search for the latest macroeconomic data, central bank statements, and market news 
for [COUNTRY] before responding. Use real-time data where available.

[Standard prompt continues below]
```

**Token budget:** 2200 · **Temperature:** 0.2

---

**Dual-Call (HIGH_STAKES countries):**

For 20 high-importance economies (US, China, Japan, UK, Germany, France, India, Canada, Australia, Brazil, Mexico, South Korea, Singapore, Hong Kong, Israel, Saudi Arabia, Switzerland, Sweden, Norway, Turkey), two parallel calls are made with different temperatures (0.2 and 0.3) and results are merged using:

- `pickRegime(ra, rb, score)` — score-informed tiebreak: Recession ≤ −0.40, Goldilocks ≥ 0.30
- `pickRisk(ra, rb)` — conservative bias (returns the higher risk level)
- Numeric fields: averaged
- `equity_bias`: score-routed on disagreement (> 0.15 → Overweight, < −0.15 → Underweight)

---

### 3.2 Central Bank Publications (`loadAuthorityPubs`)

Generates recent publication summaries from 54 central banks and finance ministries.

**System Prompt:**

```
Output only a raw JSON array. No markdown. No code fences. No trailing commas.
```

**User Prompt:**

```
List 3 recent publications from [AUTHORITY_NAME] ([COUNTRY_NAME]).

Each item must follow this schema exactly:
[
  {
    "type": "Policy Statement" | "Economic Report" | "Speech" | "Press Release" | "Regulatory Notice",
    "title": "15 words or fewer, country-specific",
    "date": "Month YYYY",
    "summary": "40 words or fewer — key findings",
    "impact": "HIGH" | "MEDIUM" | "LOW",
    "url": "plausible publication path"
  }
]
```

**Token budget:** 1000 · **Temperature:** 0

---

### 3.3 Macro News Headlines (`loadNews`)

Generates 4 financial news headlines for the selected country, with source attribution.

**System Prompt:**

```
Output only a raw JSON array. No markdown. No code fences. No trailing commas.
```

**User Prompt:**

```
Generate 4 specific financial news headlines for [COUNTRY] covering: [TOPICS].

Schema:
[
  {
    "title": "headline text",
    "summary": "2-3 sentence article summary",
    "source": "outlet name (e.g. Reuters, Bloomberg, FT)",
    "url": "article URL",
    "impact": "HIGH" | "MEDIUM" | "LOW",
    "time": "time ago (e.g. '2h ago')"
  }
]
```

**Token budget:** 1200 · **Temperature:** 0

---

### 3.4 News Background Pre-fetch (`loadNewsBackground`)

Silent background call that fetches 5 macro headlines before sentiment analysis runs. These headlines are injected into the sentiment prompt as grounding context.

**User Prompt:**

```
List the 5 most significant macro news headlines for [COUNTRY] covering [TOPICS].
Focus on central bank decisions, GDP releases, inflation data, and geopolitical events.

Schema:
[
  {
    "title": "headline",
    "summary": "1-2 sentence summary",
    "source": "outlet name",
    "date": "date string"
  }
]
```

**Token budget:** 1200 · **Temperature:** 0

---

### 3.5 Social Sentiment (`loadSocialSentiment`)

Generates a synthetic social media investor sentiment snapshot — calibrated to the macro backdrop.

**System Prompt:**

```
You are a market sentiment analyst. Output only a raw JSON object. No markdown.
```

**User Prompt:**

```
Today is [DATE]. You are a market sentiment analyst. Based on your training knowledge, 
estimate the likely social media investor sentiment for [COUNTRY] markets.

Note: You do not have live social data. Calibrate your estimates to the macro backdrop 
and typical retail investor behaviour patterns for this market.

Output schema:
{
  "overall": {
    "bull_pct": 0-100,
    "neut_pct": 0-100,
    "bear_pct": 0-100,
    "volume": "High" | "Moderate" | "Low",
    "trend": "Rising" | "Stable" | "Falling"
  },
  "platforms": [
    {
      "name": "platform name",
      "bull_pct": 0-100,
      "top_sentiment": "Bullish" | "Neutral" | "Bearish",
      "activity": "High" | "Moderate" | "Low"
    }
  ],
  "trending": [
    {
      "ticker": "symbol",
      "name": "company name",
      "sentiment": "Bullish" | "Neutral" | "Bearish",
      "driver": "8 words or fewer"
    }
  ],
  "topics": [
    {
      "tag": "#hashtag",
      "type": "Bullish" | "Bearish" | "Neutral" | "Breaking",
      "relevance": "8 words or fewer"
    }
  ],
  "fear_greed": 0-100,
  "mood_summary": "20 words or fewer",
  "data_note": "15 words or fewer — discloses AI-estimated nature"
}
```

**Token budget:** 1400 · **Temperature:** 0.3

---

**Social Sentiment Expand Prompts:**

When a user taps on a trending ticker or topic, a detail analysis is generated:

*For a trending ticker:*
```
Analyse current social media and investor sentiment for [NAME] ([TICKER]).
Cover: recent price action, retail sentiment drivers, institutional view, key risk. 
Return 3-4 sentences.
```

*For a trending topic:*
```
Analyse the macro significance of the trending topic "[TAG]" for [COUNTRY] markets.
Cover: why it's trending, macro implications, investor response, outlook.
Return 3-4 sentences.
```

**Token budget:** 350 · **Temperature:** 0.3

---

### 3.6 Deep Country Analysis (`loadDeepSection`)

Generates a 2,000-token structured analysis across 5 tabs per country.

**System Prompt:**

```
Senior macro strategist. Respond with JSON only — no markdown, no code fences.
```

**Tab Prompts (DEEP_TAB_PROMPTS):**

| Tab | Prompt Focus |
|-----|-------------|
| **Overview** | Macroeconomic overview — regime, key themes, recent developments |
| **Economy** | GDP composition, labour market, inflation dynamics, fiscal position |
| **Markets** | Equity valuations, fixed income, currency dynamics, capital flows |
| **Risks** | Tail risks, geopolitical exposures, debt dynamics, financial stability |
| **Outlook** | 12-month base case, bull/bear scenarios, key catalysts |

**Output Schema per Tab:**

```json
{
  "title": "tab-specific heading",
  "keyStats": [
    { "label": "METRIC NAME", "value": "formatted value" }
  ],
  "content": "multi-paragraph analysis separated by \\n\\n"
}
```

**Token budget:** 2000 · **Temperature:** 0

---

### 3.7 Historical Macro Data (`loadHistoryData`)

Generates 20 quarters of realistic historical economic data (Q1 2020 – Q4 2024), covering the full COVID-to-rate-hike economic cycle.

**User Prompt:**

```
Generate realistic historical macroeconomic data for [COUNTRY] covering 20 quarters 
from Q1 2020 to Q4 2024. The data should reflect the COVID shock (Q1-Q2 2020), 
recovery (2021), inflation surge (2022), rate hike cycle (2022-2023), 
and stabilisation (2024).

Output this exact JSON schema:
{
  "quarters": ["Q1 2020", "Q2 2020", ..., "Q4 2024"],
  "gdp": [20 numbers — real GDP growth YoY %],
  "inflation": [20 numbers — CPI YoY %],
  "rate": [20 numbers — central bank policy rate %],
  "unemployment": [20 numbers — unemployment rate %]
}
```

**Token budget:** 800 · **Temperature:** 0

---

### 3.8 Language Translation (`toggleLanguage`)

Translates the full country analysis panel into the country's primary language in a single LLM call.

**User Prompt:**

```
Translate the following English financial content to [LANGUAGE]. 

Rules:
- Keep all numbers, percentages, and financial symbols unchanged
- Preserve enum values (Bullish/Bearish/Neutral, HIGH/MEDIUM/LOW) exactly as-is
- Do not translate institution names (e.g. Federal Reserve, ECB)
- Return valid JSON only

Content to translate:
{
  "rationale": "...",
  "key_risk": "...",
  "sentiment": "...",
  "regime": "...",
  "equity_bias": "...",
  "rate_outlook": "...",
  "fx_bias": "...",
  "risk_level": "...",
  "news": [...],
  "authority_pubs": [...]
}
```

**Token budget:** 2000 · **Temperature:** 0

---

### 3.9 Expand-to-Details (`loadExpandDetail`)

On-demand 350-token deep analysis on any summary item (news headline, watchlist entry, social post, digest card). Prompt is constructed dynamically by the calling feature.

**Common prompt patterns:**

*For a news item:*
```
Provide a detailed macro analysis of this news: "[TITLE] — [SUMMARY]"
Context: [COUNTRY]. Cover: significance, market impact, policy implications, outlook.
```

*For a watchlist item:*
```
Provide deeper analysis for [ITEM NAME]. Current sentiment: [SCORE] ([LABEL]).
Cover: key drivers, risks, near-term catalysts, positioning implications.
```

**Token budget:** 350 · **Temperature:** 0.3

---

### 3.10 Watchlist Sentiment (`fetchWatchlistSentiment`)

Scores each watchlist item — which can be a country, stock, sector, commodity, index, or thematic tag.

**Country Prompt:**

```
Today is [DATE]. You are a senior macro strategist.

Assess the current macroeconomic sentiment for [COUNTRY].

Score 4 factors:
- growth      (weight 0.30): economic output and employment
- inflation   (weight 0.25): price stability vs. target
- monetary    (weight 0.30): central bank stance
- geopolitical(weight 0.15): stability and external relations

Output schema:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": -1.0 to 1.0,
  "keyNote": "15 words or fewer",
  "regime": "optional regime label",
  "rate_outlook": "optional rate direction",
  "confidence": "High" | "Medium" | "Low"
}
```

**Non-Country Prompt (stocks, sectors, themes):**

```
Today is [DATE]. You are a senior market analyst.

Assess current sentiment for "[ITEM NAME]".

Evaluate based on: recent price action, fundamental backdrop, macro tailwinds/headwinds,
institutional positioning, and near-term catalysts.

Output schema:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": -1.0 to 1.0,
  "keyNote": "15 words or fewer",
  "assetType": "Stock" | "Sector" | "Theme" | "Commodity" | "Index",
  "confidence": "High" | "Medium" | "Low"
}
```

**Token budget:** 500 · **Temperature:** 0.2

---

### 3.11 Custom Thematic Analysis (`runCustomAnalysis`)

Generates a comprehensive cross-thematic macro analysis report from user-defined tags (up to 10).

**System Prompt:**

```
You are a senior macro strategist. Output only valid JSON, no markdown.
```

**User Prompt:**

```
You are a senior macro strategist. Generate a comprehensive thematic analysis report 
for these topics/themes: [TAG1, TAG2, TAG3, ...]

Today is [DATE]. Consider macro interdependencies, cross-asset implications, 
and near-term catalysts for each theme.

Output schema:
{
  "title": "concise report title",
  "executive_summary": "3-4 sentences",
  "overall_sentiment": "bullish" | "bearish" | "neutral",
  "overall_score": -1.0 to 1.0,
  "themes": [
    {
      "name": "theme name",
      "sentiment": "bullish" | "bearish" | "neutral",
      "score": -1.0 to 1.0,
      "weight": 0-100,
      "insight": "20 words or fewer"
    }
  ],
  "key_findings": [
    { "icon": "▲" | "▼" | "◆", "text": "20 words or fewer" }
  ],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "trade_ideas": [
    {
      "idea": "15 words or fewer",
      "direction": "Long" | "Short" | "Neutral",
      "conviction": "High" | "Medium" | "Low"
    }
  ],
  "outlook": "2-3 sentence conclusion"
}
```

**Token budget:** 2500 · **Temperature:** 0.3

---

### 3.12 Daily & Weekly Digest (`loadDigestTab`)

Generates a personalised 10-item macro intelligence digest, calibrated to the user's watchlist, recently analysed countries, and region preference.

**System Prompt:**

```
You are a macro intelligence analyst. Output only valid JSON. No markdown. No code fences.
```

**User Prompt:**

```
You are a senior macro intelligence analyst creating a personalised [daily/weekly] 
for [DATE/WEEK].

User context:
- Watchlist: [item1, item2, item3, ...]
- Recently analysed: [country1, country2, ...]
- Region preference: [Global / Americas / Europe / Asia / Africa / Middle East]

Generate exactly 10 ranked macro news items most relevant to this user's portfolio 
and region. Each item must be specific, data-rich, and actionable.

Output schema:
{
  "period": "daily" | "weekly",
  "generated": "date-key",
  "items": [
    {
      "rank": 1,
      "title": "18 words or fewer — include specific data points",
      "source": "Financial Times" | "Reuters" | "Bloomberg" | "WSJ" | "CNBC" | "Nikkei",
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "region": "region or country name",
      "summary": "30 words or fewer",
      "implication": "20 words or fewer — investment implication"
    }
  ]
}
```

**Personalisation signals:** top 8 watchlist items + top 6 recently analysed countries + region preference.

**Token budget:** 2000 · **Temperature:** 0.4

---

### 3.13 Digest Item Deep Dive (`loadDigestItemDetail`)

Expands any digest card into a 400-token analytical deep-dive.

**Prompt (constructed dynamically):**

```
Provide a detailed macro analysis for this digest item:
Title: "[TITLE]"
Source: [SOURCE] | Impact: [IMPACT] | Region: [REGION]
Summary: [SUMMARY]

Cover: full context, key data behind the headline, market implications, 
policy response, cross-asset impact, 3-month outlook.
```

**Token budget:** 400 · **Temperature:** 0.3

---

### 3.14 Investment Opportunities (`loadOpportunitiesTab`)

Generates 8 specific trade ideas per investment horizon (DAY / WEEK / MONTH / THEMES), personalized to the user's watchlist.

**System Prompt:**

```
You are a senior macro portfolio strategist. Output only valid JSON. No markdown.
```

**User Prompt:**

```
Today is [DATE]. You are a senior portfolio strategist and macro trader.

Generate exactly 8 specific investment and trading opportunities for the [HORIZON] horizon.

User context:
- Watchlist: [item1, item2, ...]
- Recently analysed: [country1, country2, ...]

Prioritise opportunities relevant to the user's watchlist. Be specific — name actual 
instruments (e.g. "S&P 500", "USD/JPY", "Brent Crude"), not generalisations.

Output schema:
{
  "horizon": "DAY" | "WEEK" | "MONTH" | "THEMES",
  "generated": "date-key",
  "opportunities": [
    {
      "rank": 1,
      "direction": "LONG" | "SHORT" | "NEUTRAL",
      "asset_class": "Equities" | "Fixed Income" | "FX" | "Commodities" | "Crypto" | "Multi-Asset",
      "asset": "specific ticker or pair",
      "region": "region or country",
      "horizon_tag": "DAY" | "WEEK" | "MONTH" | "THEMES",
      "title": "12 words or fewer",
      "thesis": "2-3 sentences: catalyst, macro backdrop, rationale",
      "conviction": 0.0 to 1.0,
      "key_risk": "15 words or fewer",
      "source": "institution name (e.g. Goldman Sachs, Fed, Bloomberg)",
      "catalyst": "10 words or fewer"
    }
  ]
}
```

**Token budget:** 2000 · **Temperature:** 0.3

---

### 3.15 Economic Calendar (`loadCalendar`)

Generates 4 weeks of forward economic events (FOMC meetings, ECB decisions, NFP, CPI releases, PMIs, GDP prints).

**System Prompt:**

```
Output only valid JSON. No markdown. No code fences.
```

**User Prompt:**

```
Generate a 4-week forward economic calendar starting from [DATE].
Include high-impact events: FOMC, ECB, BOE, BOJ, NFP, CPI, GDP, PMI, and other 
tier-1 macro releases from G10 economies.

Output schema:
{
  "events": [
    {
      "week": "week-of date (YYYY-MM-DD)",
      "date": "YYYY-MM-DD",
      "time": "HH:MM UTC",
      "country": "ISO country code",
      "event": "event name",
      "category": "Central Bank" | "Employment" | "Inflation" | "GDP" | "PMI" | "Other",
      "importance": "HIGH" | "MEDIUM" | "LOW",
      "forecast": "consensus forecast value",
      "previous": "previous release value"
    }
  ]
}
```

**Token budget:** 2000 · **Temperature:** 0 · **Cache TTL:** 12 hours

---

### 3.16 Research Hub (`loadResearch`)

Synthesizes research from 16 major financial institutions. Each institution gets an independent LLM call generating a house view, 3 key calls, and 10 article summaries.

**Institutions covered:** Goldman Sachs · Morgan Stanley · JPMorgan · Bank of America · Citi · BlackRock · Vanguard · Fidelity · Invesco · PIMCO · IMF · BIS · ECB · World Bank · Federal Reserve · Bank of England

**System Prompt:**

```
You output only valid minified JSON. No markdown, no code fences, no extra text 
before or after the JSON object.
```

**User Prompt:**

```
Today is [DATE]. You are a financial research synthesizer for [INSTITUTION_NAME].

Generate a realistic research output representing [INSTITUTION]'s current macro views 
and recent publications. Use your knowledge of this institution's analytical style, 
research themes, and current positioning.

Output schema:
{
  "institution": "institution name",
  "house_view": "1 sentence — current macro stance",
  "key_calls": [
    "specific call 1",
    "specific call 2",
    "specific call 3"
  ],
  "articles": [
    {
      "title": "specific, realistic report name",
      "date": "Mon YYYY",
      "summary": "2 sentences on key findings",
      "themes": ["theme1", "theme2"],
      "sentiment": "bullish" | "bearish" | "neutral",
      "score": -1.0 to 1.0,
      "asset_class": "Macro" | "Equities" | "Fixed Income" | "FX" | "Commodities" | "Credit",
      "url": "article URL (real where available)"
    }
  ],
  "disclaimer": "AI-synthesized — verify with [INSTITUTION_NAME]"
}
```

**Token budget:** 4000 · **Temperature:** 0.4 *(highest in the system — allows stylistic variation per institution)*

---

### 3.17 Commodities Heatmap Analysis (`loadCommodityHeat`)

Generates sentiment scores and directional analysis for the commodities heatmap, covering energy, metals, and agricultural commodities.

**User Prompt:**

```
Today is [DATE]. Assess current macro sentiment for these commodity sectors.

For each commodity, provide a sentiment score and brief directional thesis 
based on supply/demand dynamics, macro backdrop, and recent price action.

Schema:
{
  "commodities": {
    "[SYMBOL]": {
      "score": -1.0 to 1.0,
      "sentiment": "bullish" | "bearish" | "neutral",
      "driver": "10 words or fewer"
    }
  }
}
```

**Token budget:** 800 · **Temperature:** 0

---

### 3.18 FX Markets Heatmap Analysis (`loadFxHeat`)

Generates sentiment scores for 16 currency pairs against the US dollar, covering G10 and major emerging market currencies.

**Pairs covered:** EURUSD · GBPUSD · JPYUSD · AUDUSD · CADUSD · CHFUSD (G10) + CNHUSD · INRUSD · ZARUSD · MXNUSD · BRLUSD · RUBUSD · TRYUSD · KRWUSD · SGDUSD · THBUSD (EM)

**User Prompt:**

```
Today is [DATE]. Assess current macro sentiment for these FX pairs (all vs USD).

Consider: interest rate differentials, central bank stance, macro momentum, 
risk appetite, geopolitical factors, and positioning.

Schema:
{
  "pairs": {
    "[PAIR]": {
      "score": -1.0 to 1.0,
      "sentiment": "bullish" | "bearish" | "neutral",
      "driver": "10 words or fewer",
      "rate_diff": "directional note on rate differential"
    }
  }
}
```

**Token budget:** 800 · **Temperature:** 0

---

### 3.19 Community Sentiment (`loadCommunityPulse`)

Generates AI sentiment analysis from community board post data, surfacing aggregate sentiment from user-generated content.

**User Prompt:**

```
Analyse the following community board posts and provide an aggregate sentiment 
assessment for [COUNTRY/TOPIC].

Posts:
[POST_1_CONTENT]
[POST_2_CONTENT]
...

Identify: overall sentiment direction, top themes, sentiment intensity, notable signals.
Return a structured JSON analysis.
```

**Token budget:** Dynamic (scales with post count) · **Temperature:** 0.2

---

## 4. Post-Processing Pipeline

Every LLM response passes through a multi-stage validation and repair pipeline before being used.

### 4.1 JSON Repair (`repairAndParseJSON`)

A 7-step pipeline that handles common LLM output failures:

```
Raw LLM output
    │
    ├── Step 1: Strip markdown fences (```json ... ```)
    ├── Step 2: Extract first JSON block ({ ... })
    ├── Step 3: Fix trailing commas before } or ]
    ├── Step 4: Unescape incorrectly escaped characters
    ├── Step 5: closeTruncated() — close unclosed strings/arrays/objects
    │           Character-walk state machine tracking string/array/object depth
    ├── Step 6: JSON.parse()
    ├── Step 7: Strip control characters (if Step 6 fails)
    └── Return parsed object or null
```

### 4.2 Sentiment Validation (`validateSentimentResult`)

A 9-step validation pipeline applied to all `fetchSentiment` outputs:

| Step | Validation |
|------|-----------|
| 1 | Clamp `score` to `[-1, 1]` |
| 2 | Clamp all 6 factor scores to `[-1, 1]` |
| 3 | Set missing optional fields to defaults |
| 4 | Check all required fields exist |
| 5 | Fix type mismatches (e.g. string score → number) |
| 6 | Validate enum fields against allowed values |
| 7 | Derive `sentiment` label from numeric `score` |
| 8 | Clamp score band: enforce `score_low ≤ score ≤ score_high` |
| **9** | **Factor-Coherence Enforcement** (see below) |

**Step 9 — Factor-Coherence Enforcement:**

The reported `score` is cross-checked against the weighted factor composite:

```
composite = growth×0.25 + inflation×0.20 + monetary×0.25 + fx×0.15 + geopolitical×0.10 + market×0.05

if |score - composite| ≥ 0.30:
    score = 0.50×composite + 0.50×score   (heavy blend toward factors)
    result._score_adjusted = true

elif |score - composite| ≥ 0.15:
    score = 0.30×composite + 0.70×score   (light blend toward factors)
    result._score_adjusted = true
```

When `_score_adjusted` is true, an amber **FC ADJ** badge is shown in the dashboard panel.

### 4.3 Regime Shift Detection

After each `fetchSentiment` call, the new result is compared to the previously cached result for the same country:

```
sentimentFlip  = sentiment changed AND neither old nor new is "neutral"
regimeChange   = regime classification changed
scoreDelta     = |new_score - prev_score|

if (sentimentFlip OR regimeChange) AND scoreDelta ≥ 0.20:
    result._regime_shift = true
    result._prev_sentiment = ...
    result._prev_regime = ...
    result._prev_score = ...
```

When `_regime_shift` is true, an amber **⚠ SHIFT** banner appears in the dashboard panel showing the before/after comparison.

---

## 5. Agent Architecture

The dashboard does not use a formal agent framework (no LangChain, no function-calling loops, no ReAct). However, it implements several **agent-like orchestration patterns** in vanilla JavaScript:

---

### 5.1 Sentinel Pattern — Sentiment Orchestrator

**Function:** `fetchSentiment(countryId)`

The central orchestrator for country analysis. Coordinates data injection, provider routing, dual-call logic, validation, caching, and UI rendering.

```
fetchSentiment(id)
    │
    ├── 1. Check in-flight dedup (_sentimentInFlight Set)
    ├── 2. Check cache (return if fresh)
    ├── 3. Load MACRO_CONTEXT economic snapshot → econBlock
    ├── 4. Load cached news headlines → newsBlock
    ├── 5. Build prompt (standard or web-search variant)
    │
    ├── Route A: HIGH_STAKES country
    │   ├── Call 1: callLLM(temp=0.2) → result_a
    │   ├── Call 2: callLLM(temp=0.3) → result_b
    │   ├── Average numeric fields
    │   ├── pickRegime(a, b, avg_score) → regime
    │   ├── pickRisk(a, b) → risk_level
    │   └── Merge → merged_result
    │
    └── Route B: Standard country
        └── callLLM(temp=0.2) → result
    │
    ├── 6. repairAndParseJSON(raw)
    ├── 7. validateSentimentResult(parsed) — 9 steps
    ├── 8. Regime shift detection (compare vs. cache)
    ├── 9. Set _econ_grounded, _grounded flags
    ├── 10. Write to cache
    └── 11. renderPanel(result) — only if activeId still matches
```

**In-flight deduplication:** a `Set` of in-progress country IDs prevents duplicate parallel calls on rapid map clicks.

**Stale-result guard:** `renderPanel` is only called if `activeId === key` at response time, preventing wrong-country flash on rapid navigation.

---

### 5.2 Web-Grounded Research Agent (Claude)

**Function:** `callClaudeWithSearch(userPrompt, maxTokens, maxSearches = 3)`

When Claude is the configured provider, `fetchSentiment` upgrades to a grounded research agent that autonomously searches the web before producing its analysis.

```
callClaudeWithSearch(prompt)
    │
    ├── Define tool: web_search
    │   └── Input schema: { query: string }
    │
    ├── Loop (up to maxSearches iterations):
    │   ├── Send message to Claude with tool_choice: auto
    │   ├── If response contains tool_use block:
    │   │   ├── Execute web_search(query)
    │   │   ├── Append search result as tool_result
    │   │   └── Continue loop
    │   └── If response contains text block:
    │       └── Extract and return text → break loop
    │
    └── Return final text response
```

This is the only feature in the dashboard with a true agentic loop — Claude autonomously decides what to search, reads results, and iterates until it has sufficient grounding to produce the analysis.

The result is flagged with `result._grounded = true` and a **🔍 LIVE** badge is shown in the panel.

---

### 5.3 Dual-Call Self-Consistency Agent (HIGH_STAKES)

**Location:** Inside `fetchSentiment`, for the 20 HIGH_STAKES countries

A self-consistency pattern that runs two independent sentiment analyses and merges them, reducing model variance for the most economically significant countries.

```
HIGH_STAKES countries: US, China, Japan, UK, Germany, France, India, Canada,
                        Australia, Brazil, Mexico, South Korea, Singapore, Hong Kong,
                        Israel, Saudi Arabia, Switzerland, Sweden, Norway, Turkey

Parallel calls:
    call_A = callLLM(prompt, temp=0.2)
    call_B = callLLM(prompt, temp=0.3)

Merge strategy:
    Numeric fields  →  averaged
    regime          →  pickRegime(A, B, avg_score)
    risk_level      →  pickRisk(A, B)  [conservative: returns higher risk]
    equity_bias     →  score-routed on disagreement
    factors.*       →  averaged per factor
    confidence      →  lower of A/B (conservative)
```

**Smart voting functions:**

`pickRegime(a, b, score)`:
- Agree → same value
- Disagree + score ≤ −0.40 → `"Recession"`
- Disagree + score ≥ 0.30 → `"Goldilocks"`
- Either is `"Stagflation"` + score ≤ −0.15 → `"Stagflation"`
- Else → first call's value

`pickRisk(a, b)`:
- Always returns the more conservative (higher) of the two risk levels
- Order: `Low < Medium < High < Very High`

---

### 5.4 Background Pre-fetch Agent

**Functions:** `loadNewsBackground()`, `loadDeepSection()`, `loadHistoryData()`, `loadAuthorityPubs()`

When a country is selected, multiple background LLM calls are triggered in parallel without blocking the primary sentiment display. This creates a pipeline effect that pre-warms data for features the user might open next.

```
selectCountry(id)
    │
    ├── fetchSentiment(id)        ← blocks: renders panel when complete
    │
    └── Background (non-blocking, parallel):
        ├── loadNewsBackground()   ← pre-fetches headlines for sentiment grounding
        ├── loadAuthorityPubs()    ← pre-fetches central bank publications
        ├── loadDeepSection('overview')  ← pre-loads first deep tab
        └── loadHistoryData()     ← pre-loads historical chart data
```

This pattern means that by the time the user opens the Deep Analysis overlay or clicks the History Chart, the data is already cached.

---

### 5.5 Personalisation Agent — Digest & Opportunities

**Functions:** `loadDigestTab()`, `loadOpportunitiesTab()`

A stateful personalisation pattern that reads the user's activity history and constructs context-rich prompts.

```
loadDigestTab(tab)
    │
    ├── Read user state:
    │   ├── watchlist[]           (top 8 items)
    │   ├── recentlyAnalysed[]    (top 6 countries from session)
    │   └── userRegion            (Global / Americas / Europe / Asia / ...)
    │
    ├── Check cache: gmi_digest_{tab}_{username}_{date}
    │   └── Return cached if fresh (same day/week)
    │
    ├── Build personalised prompt with user context injected
    ├── callLLM(prompt, 2000 tokens, temp=0.4)
    │
    ├── Cache result to localStorage
    └── renderDigest(data)
```

The `temp=0.4` setting (the second-highest in the system) introduces variability so daily and weekly digests feel fresh rather than formulaic.

---

## 6. LLM Call Reference Summary

| Feature | Function | Max Tokens | Temperature | Provider Support |
|---------|----------|-----------|-------------|-----------------|
| Country Sentiment (standard) | `fetchSentiment` | 1800 | 0.2 | Gemini · Claude · Free |
| Country Sentiment (HIGH_STAKES ×2) | `fetchSentiment` | 1800 × 2 | 0.2 + 0.3 | Gemini · Claude · Free |
| Country Sentiment (Claude web-search) | `fetchSentiment` | 2200 | 0.2 | Claude only |
| Central Bank Publications | `loadAuthorityPubs` | 1000 | 0.0 | All |
| Macro News | `loadNews` | 1200 | 0.0 | All |
| News Pre-fetch | `loadNewsBackground` | 1200 | 0.0 | All |
| Social Sentiment | `loadSocialSentiment` | 1400 | 0.3 | All |
| Social Expand | `loadSocialSentiment` expand | 350 | 0.3 | All |
| Deep Analysis (per tab) | `loadDeepSection` | 2000 | 0.0 | All |
| Historical Macro Data | `loadHistoryData` | 800 | 0.0 | All |
| Language Translation | `toggleLanguage` | 2000 | 0.0 | All |
| Expand-to-Details | `loadExpandDetail` | 350 | 0.3 | All |
| Watchlist Sentiment | `fetchWatchlistSentiment` | 500 | 0.2 | All |
| Custom Thematic Analysis | `runCustomAnalysis` | 2500 | 0.3 | All |
| Daily / Weekly Digest | `loadDigestTab` | 2000 | 0.4 | All |
| Digest Deep Dive | `loadDigestItemDetail` | 400 | 0.3 | All |
| Investment Opportunities | `loadOpportunitiesTab` | 2000 | 0.3 | All |
| Economic Calendar | `loadCalendar` | 2000 | 0.0 | All |
| Research Hub (per institution) | `loadResearch` | 4000 | 0.4 | All |
| Commodities Heatmap | `loadCommodityHeat` | 800 | 0.0 | All |
| FX Heatmap | `loadFxHeat` | 800 | 0.0 | All |
| Community Sentiment | `loadCommunityPulse` | Dynamic | 0.2 | All |

> All calls use `thinkingBudget: 0` to prevent reasoning tokens from consuming the output budget.

---

## 7. Data Grounding & Context Injection

### MACRO_CONTEXT — Economic Snapshot (Q1 2025)

All sentiment prompts are anchored to a curated Q1 2025 economic snapshot covering 40 countries. Each entry includes:

```javascript
MACRO_CONTEXT["840"] = {  // US
  gdp:   2.8,     // Real GDP growth YoY %
  cpi:   2.3,     // CPI inflation YoY %
  rate:  4.25,    // Policy rate % (post Dec 2024 Fed cut)
  unemp: 4.1,     // Unemployment rate %
  ca:    -3.1,    // Current account % of GDP
  pmi:   52.1,    // Manufacturing PMI
  note:  "Fed in cutting cycle; labour market resilient; core services inflation sticky"
}
```

**DATA_VINTAGE constant:**

```javascript
const DATA_VINTAGE = 'Q1 2025';
```

This single constant is the source of truth for the data vintage label injected into every sentiment prompt. The prompt instructs the LLM to:
- Accept the snapshot as the quantitative baseline
- Apply its own knowledge of developments since that date
- Disclose when extrapolating beyond the snapshot

**devMode constant:**

```javascript
const devMode = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost';
```

Controls dev-only logging in `validateSentimentResult` (factor-composite adjustment warnings, inflation-directionality guard flags). Safe to use in production — evaluates to `false` on any non-localhost host.

### Freshness Badges

| Badge | Condition | Meaning |
|-------|-----------|---------|
| `📊 ANCHORED: Q1 2025` | `result._econ_grounded = true` | MACRO_CONTEXT was injected into this analysis |
| `🔍 LIVE` | `result._grounded = true` | Claude web-search was used for real-time grounding |
| `⚠ FC ADJ` (amber) | `result._score_adjusted = true` | Score was adjusted for factor-composite coherence |
| `⚠ SHIFT` (amber banner) | `result._regime_shift = true` | Sentiment or regime has shifted since last analysis |

---

*Last updated: 2026-05-10 · Dashboard version: Phase 20 · 19 LLM features · 5 agent patterns · ~636 KB · 510/510 tests*
