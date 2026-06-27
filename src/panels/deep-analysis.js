// deep-analysis.js — Deep Analysis Overlay
import { callLLM, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import {
  cache, activeId,
  deepOpen, setDeepOpen,
  deepTab, deepCache,
  currentCountryMeta, apiKey,
} from '../core/state.js';
import { DEEP_TAB_PROMPTS, AUTHORITY_INFO, MACRO_CONTEXT, DATA_VINTAGE, CACHE_TTL, deepCacheTs } from '../core/constants.js';
import { loadSession } from '../auth/auth.js';

// Note: _deepInFlight is exported from state.js
import { _deepInFlight } from '../core/state.js';

export function openDeepAnalysis() {
  if (!currentCountryMeta) return;
  if (!apiKey) { requireApiKey(() => openDeepAnalysis(), 'Deep Analysis'); return; }
  const overlay = document.getElementById('deep-overlay');
  overlay.classList.add('open');
  setDeepOpen(true);
  document.getElementById('deep-flag').textContent = currentCountryMeta.flag || '🌍';
  document.getElementById('deep-title-txt').textContent = currentCountryMeta.name + ' — Full Macro Analysis';
  document.getElementById('deep-subtitle').textContent =
    currentCountryMeta.region + ' · ' + currentCountryMeta.currency + ' · ' + currentCountryMeta.index;
  // Activate overview tab
  document.querySelectorAll('.deep-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'overview'));
  // deepTab is a live binding — we need to mutate via the module's exported ref
  // Use direct DOM + window bridge for deepTab tracking
  _setDeepTabLocal('overview');
  loadOrRenderDeepTab('overview');
  // Silently prefetch all other tabs so they're instant on click
  ['economy','markets','risks','outlook'].forEach(t => {
    const ck = (currentCountryMeta.name || '') + '|' + t;
    if (!deepCache[ck] && !_deepInFlight.has(ck)) loadDeepSection(t, true);
  });
}

export function closeDeepAnalysis() {
  document.getElementById('deep-overlay').classList.remove('open');
  setDeepOpen(false);
}

// Local tab tracking (deepTab from state is a read-only live binding in this module)
let _localDeepTab = 'overview';
function _setDeepTabLocal(tab) { _localDeepTab = tab; }

export function setDeepTab(tab) {
  if (!currentCountryMeta) return;
  _setDeepTabLocal(tab);
  document.querySelectorAll('.deep-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
    if (t.dataset.tab === tab) t.classList.remove('tab-ready');
  });
  loadOrRenderDeepTab(tab);
}

export function loadOrRenderDeepTab(tab) {
  const cacheKey = (currentCountryMeta?.name || '') + '|' + tab;
  if (deepCache[cacheKey]) {
    renderDeepSection(deepCache[cacheKey], tab);
    // Stale-while-revalidate: background refresh if older than TTL
    const age = Date.now() - (deepCacheTs[cacheKey] || 0);
    if (age > CACHE_TTL.deep && !_deepInFlight.has(cacheKey)) loadDeepSection(tab, true);
  } else {
    loadDeepSection(tab, false);
  }
}

// background=true: silently prefetch without touching the DOM
export async function loadDeepSection(tab, background = false) {
  if (!currentCountryMeta) {
    if (!background) document.getElementById('deep-body').innerHTML =
      `<div class="deep-loading"><div style="font-size:13px;color:var(--text2);">Select a country first.</div></div>`;
    return;
  }
  const cacheKey = currentCountryMeta.name + '|' + tab;
  if (_deepInFlight.has(cacheKey)) return; // already in flight
  _deepInFlight.add(cacheKey);

  const body = document.getElementById('deep-body');
  const tabLabels = { overview:'MACROECONOMIC OVERVIEW', economy:'ECONOMIC ANALYSIS', markets:'CAPITAL MARKETS', risks:'RISK ASSESSMENT', outlook:'12-MONTH OUTLOOK' };
  if (!background) body.innerHTML = `<div class="deep-loading"><div class="big-spin"></div><div class="sl-text">Loading ${tabLabels[tab] || tab}…</div></div>`;

  const getPrompt = DEEP_TAB_PROMPTS[tab];
  if (!getPrompt) { _deepInFlight.delete(cacheKey); return; }

  const deepToday = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const sysPrompt = 'Senior macro strategist. Respond with JSON only — no markdown, no code fences.';

  // ── MACRO_CONTEXT + cached regime injection for deep tabs ─────────────────
  const deepIsoId = (currentCountryMeta._id || '').padStart(3, '0');
  const deepEcon  = MACRO_CONTEXT[deepIsoId];
  const deepEconBlock = deepEcon
    ? `\nVERIFIED MACRO SNAPSHOT (${DATA_VINTAGE}): GDP ${deepEcon.gdp}% | CPI ${deepEcon.cpi}% | Rate ${deepEcon.rate}% | Unemp ${deepEcon.unemp}% | CA ${deepEcon.ca}% | PMI ${deepEcon.pmi}\nKey context: ${deepEcon.note}\nApply your knowledge of post-${DATA_VINTAGE} developments to update these figures where relevant.\n`
    : '';
  // Inject the already-computed sentiment result (if available) for continuity
  const deepCachedSentiment = cache[activeId];
  const deepRegimeBlock = deepCachedSentiment
    ? `\nCURRENT AI ASSESSMENT: score ${deepCachedSentiment.score >= 0 ? '+' : ''}${deepCachedSentiment.score} (${deepCachedSentiment.sentiment}), regime: ${deepCachedSentiment.regime || '—'}, rate outlook: ${deepCachedSentiment.rate_outlook || '—'}, key risk: "${deepCachedSentiment.key_risk || '—'}". Align your analysis with this assessment, or explicitly explain where you disagree and why.\n`
    : '';

  const userPrompt = `Today is ${deepToday}.${deepEconBlock}${deepRegimeBlock}
${getPrompt(currentCountryMeta)}

JSON only: {"title":"string","keyStats":[{"label":"METRIC","value":"string"}],"content":"paragraphs separated by \\n\\n"}
keyStats: 5-6 items. content: 4-5 paragraphs.`;

  try {
    const raw = await callLLM(sysPrompt, userPrompt, 2000);
    const result = repairAndParseJSON(raw);
    deepCache[cacheKey]   = result;
    deepCacheTs[cacheKey] = Date.now();
    // Only update the DOM if this tab is currently active
    if (_localDeepTab === tab) renderDeepSection(result, tab);
    else if (background) {
      // Tab badge: show ready indicator if overlay still open
      const tabEl = document.querySelector(`.deep-tab[data-tab="${tab}"]`);
      if (tabEl && deepOpen) tabEl.classList.add('tab-ready');
    }
  } catch (err) {
    if (!background && _localDeepTab === tab)
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--bear);font-family:var(--font-display);font-size:13px;">⚠ Error loading analysis: ${err.message}</div>`;
  } finally {
    _deepInFlight.delete(cacheKey);
  }
}

export function renderDeepSection(d, tab) {
  const body = document.getElementById('deep-body');
  const tabLabels = { overview:'MACROECONOMIC OVERVIEW', economy:'ECONOMIC ANALYSIS', markets:'CAPITAL MARKETS', risks:'RISK ASSESSMENT', outlook:'12-MONTH OUTLOOK' };

  const statsHtml = (d.keyStats || []).map(s => `
    <div class="deep-kv">
      <div class="deep-kv-label">${s.label || ''}</div>
      <div class="deep-kv-val">${s.value || '—'}</div>
    </div>`).join('');

  const paragraphs = (d.content || '—')
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('');

  body.innerHTML = `
    <div class="deep-section">
      <h3>${d.title || tabLabels[tab] || tab.toUpperCase()}</h3>
      ${statsHtml ? `<div class="deep-kv-grid">${statsHtml}</div>` : ''}
      ${paragraphs}
    </div>`;
}

// Window bridges
window.openDeepAnalysis = openDeepAnalysis;
window.closeDeepAnalysis = closeDeepAnalysis;
window.setDeepTab = setDeepTab;
window.loadDeepSection = loadDeepSection;
