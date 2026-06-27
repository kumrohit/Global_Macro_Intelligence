// watchlist.js — Watchlist panel
import { META, MACRO_CONTEXT, DATA_VINTAGE } from '../core/constants.js';
import {
  cache, activeId,
  watchlist, watchlistOpen, setWatchlistOpen,
  watchlistSentCache, currentCountryMeta, apiKey,
} from '../core/state.js';
import { callLLM } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { showToast } from '../utils/toast.js';
import { toggleExpand } from '../utils/expand.js';

// DOM element refs — grabbed inline to avoid timing issues
function _getWlAddCountryBtn()   { return document.getElementById('wl-add-country-btn'); }
function _getAddToWatchlistBtn() { return document.getElementById('add-to-watchlist-btn'); }

export function loadWatchlistFromStorage() {
  try {
    const saved = localStorage.getItem('gmi_watchlist');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Mutate in place — ES module live binding cannot be reassigned
      watchlist.splice(0, watchlist.length, ...parsed);
    }
  } catch(_) { watchlist.splice(0); }
}

function saveWatchlistToStorage() {
  try { localStorage.setItem('gmi_watchlist', JSON.stringify(watchlist)); } catch(_) {}
}

export function toggleWatchlist() {
  const newOpen = !watchlistOpen;
  setWatchlistOpen(newOpen);
  const panel = document.getElementById('watchlist-panel');
  const tab   = document.getElementById('watchlist-tab');
  panel.classList.toggle('open', newOpen);
  tab.classList.toggle('active', newOpen);
  if (newOpen) renderWatchlist();
}

export function closeWatchlist() {
  setWatchlistOpen(false);
  document.getElementById('watchlist-panel').classList.remove('open');
  document.getElementById('watchlist-tab').classList.remove('active');
}

export function updateWatchlistCountryBtn() {
  const btn = _getWlAddCountryBtn();
  const panelBtn = _getAddToWatchlistBtn();
  if (!btn || !panelBtn) return;
  if (currentCountryMeta) {
    btn.style.display = 'block';
    btn.textContent = `★ Add ${currentCountryMeta.name} to watchlist`;
    panelBtn.style.display = 'block';
    panelBtn.textContent = `★ ADD ${currentCountryMeta.name.toUpperCase()} TO WATCHLIST`;
    // Show as "added" if already in watchlist
    const exists = watchlist.some(w => w.type === 'country' && w.key === currentCountryMeta._id);
    if (exists) {
      panelBtn.textContent = `✓ IN WATCHLIST — REMOVE`;
      panelBtn.style.background = 'rgba(239,68,68,0.08)';
      panelBtn.style.borderColor = 'var(--bear)';
      panelBtn.style.color = 'var(--bear)';
    } else {
      panelBtn.style.background = '';
      panelBtn.style.borderColor = '';
      panelBtn.style.color = '';
    }
  } else {
    btn.style.display = 'none';
    panelBtn.style.display = 'none';
  }
}

export function addCurrentCountryToWatchlist() {
  if (!currentCountryMeta) return;
  const exists = watchlist.findIndex(w => w.type === 'country' && w.key === currentCountryMeta._id);
  if (exists >= 0) {
    // Toggle: remove if already there
    watchlist.splice(exists, 1);
    saveWatchlistToStorage();
    updateWatchlistCountryBtn();
    if (watchlistOpen) renderWatchlist();
    return;
  }
  const item = {
    type: 'country',
    name: currentCountryMeta.name,
    icon: currentCountryMeta.flag || '🌍',
    key:  currentCountryMeta._id || '',
    sentiment: null, score: null, keyNote: '', updatedAt: null
  };
  // Pre-fill from cache if available
  const cached = activeId ? cache[activeId] : null;
  if (cached) {
    item.sentiment = cached.sentiment;
    item.score = cached.score;
    item.keyNote = cached.rationale || cached.key_risk || '';
    item.updatedAt = Date.now();
  }
  watchlist.unshift(item);
  saveWatchlistToStorage();
  updateWatchlistCountryBtn();
  if (watchlistOpen) renderWatchlist();
  else { toggleWatchlist(); }
}

export async function addWatchlistItem(rawInput) {
  const name = rawInput.trim();
  if (!name) return;
  const input = document.getElementById('wl-search-input');
  if (input) input.value = '';

  // Check if it matches a known country name
  const countryEntry = Object.entries(META).find(([k, v]) =>
    v.name.toLowerCase() === name.toLowerCase()
  );

  let item;
  if (countryEntry) {
    const [metaId, meta] = countryEntry;
    item = {
      type: 'country', name: meta.name, icon: meta.flag || '🌍', key: metaId,
      sentiment: null, score: null, keyNote: '', updatedAt: null
    };
    // Use cached sentiment if available
    const cached = cache['c' + parseInt(metaId)];
    if (cached) {
      item.sentiment = cached.sentiment; item.score = cached.score;
      item.keyNote = cached.rationale || ''; item.updatedAt = Date.now();
    }
  } else {
    // Generic: stock/ticker/sector/theme
    const isLikelyTicker = /^[A-Z]{1,6}$/.test(name);
    item = {
      type: isLikelyTicker ? 'ticker' : 'theme',
      name, icon: isLikelyTicker ? '📈' : '◈', key: name.toLowerCase().replace(/\s+/g,'_'),
      sentiment: null, score: null, keyNote: '', updatedAt: null
    };
  }

  // Avoid duplicates
  if (watchlist.some(w => w.key === item.key)) return;
  watchlist.unshift(item);
  saveWatchlistToStorage();
  renderWatchlist();

  // Fetch sentiment if no API key yet, skip — will show pending
  if (apiKey && item.sentiment === null) fetchWatchlistSentiment(item);
}

async function fetchWatchlistSentiment(item, noRender = false) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ── MACRO_CONTEXT lookup for watchlist country items ──────────────────────
  let econBlockWl = '';
  if (item.type === 'country') {
    const stripped = (item.key || '').replace(/^c/, '').padStart(3, '0');
    let isoIdWl = MACRO_CONTEXT[stripped] ? stripped : null;
    if (!isoIdWl) {
      // Fallback: search META by name
      const nameMatch = Object.entries(META).find(([, m]) =>
        m.name.toLowerCase() === (item.name || '').toLowerCase()
      );
      if (nameMatch) {
        const candidate = nameMatch[0].padStart(3, '0');
        if (MACRO_CONTEXT[candidate]) isoIdWl = candidate;
      }
    }
    const econWl = isoIdWl ? MACRO_CONTEXT[isoIdWl] : null;
    if (econWl) {
      econBlockWl = `\nVERIFIED SNAPSHOT (${DATA_VINTAGE}): GDP ${econWl.gdp}% | CPI ${econWl.cpi}% | Rate ${econWl.rate}% | Unemp ${econWl.unemp}% | CA ${econWl.ca}% | PMI ${econWl.pmi}\nContext: ${econWl.note}\nApply your knowledge of developments since ${DATA_VINTAGE}.\n`;
    }
  }

  const prompt = item.type === 'country'
    ? `Today is ${today}. You are a senior macro strategist. Assess the current macroeconomic sentiment for ${item.name}.
${econBlockWl}
Score these 6 factors from -1.0 to +1.0 using the same formula as the main panel analysis:
  Calibration anchors:
    GROWTH:      +1.0=GDP>4%&PMI>55 | 0.0=GDP~0–1%&PMI~50 | -1.0=contraction&PMI<45
    INFLATION:   +1.0=converging to target | 0.0=50–100bp from target | -1.0=deflation OR hyperinflation (both negative)
    MONETARY:    +1.0=easing into positive real rates | 0.0=stable | -1.0=tightening into recession
    FX:          +1.0=CA surplus+inflows | 0.0=balanced | -1.0=CA deficit+outflows+overvalued
    GEOPOLITICAL:+1.0=stable,no sanctions | 0.0=moderate risk | -1.0=conflict or crisis
    MARKET:      +1.0=bull trend,tight credit | 0.0=sideways | -1.0=bear,widening spreads

Compute score = (growth×0.25)+(inflation×0.20)+(monetary×0.25)+(fx×0.15)+(geopolitical×0.10)+(market×0.05). Round to 2 decimal places.
Regime rules: Goldilocks=growth≥0&inflation≥-0.15 | Reflation=growth≥0&inflation<-0.15 | Stagflation=growth<0&inflation<-0.15 | Recession=growth<0&inflation≥-0.15
sentiment: "bullish" if score > 0.10, "bearish" if score < -0.10, else "neutral" — must match score.

Return ONLY valid JSON, no markdown:
{"sentiment":"bullish|bearish|neutral","score":<-1.0 to 1.0>,"keyNote":"<dominant macro driver, max 15 words>","regime":"Goldilocks|Reflation|Stagflation|Recession","rate_outlook":"Cutting|Holding|Hiking"}`
    : `Today is ${today}. You are a senior market analyst. Assess current sentiment for "${item.name}" (stock ticker, sector, theme, or commodity).

Evaluate: fundamental momentum, price/technical trend, macro tailwinds/headwinds, positioning.
Assign score from -1.0 (very bearish) to +1.0 (very bullish). Round to 2 decimal places.
sentiment: "bullish" if score > 0.10, "bearish" if score < -0.10, else "neutral" — must match score.

Return ONLY valid JSON, no markdown:
{"sentiment":"bullish|bearish|neutral","score":<-1.0 to 1.0>,"keyNote":"<key insight or catalyst, max 15 words>","assetType":"Stock|Sector|Theme|Commodity|Index","confidence":"High|Medium|Low"}`;

  try {
    const raw = await callLLM(
      'You are a market analyst. Return only valid JSON, no markdown.',
      prompt, 500, 0.2
    );
    const result = repairAndParseJSON(raw);
    const idx = watchlist.findIndex(w => w.key === item.key);
    if (idx < 0) return;

    // Validate score/sentiment alignment
    const score = Math.max(-1, Math.min(1, parseFloat(result.score) || 0));
    const sentiment = score > 0.10 ? 'bullish' : score < -0.10 ? 'bearish' : 'neutral';

    watchlist[idx].sentiment = sentiment;
    watchlist[idx].score     = score;
    watchlist[idx].keyNote   = result.keyNote || '';
    watchlist[idx].updatedAt = Date.now();
    if (result.regime)      watchlist[idx].regime      = result.regime;
    if (result.rate_outlook) watchlist[idx].rate_outlook = result.rate_outlook;
    if (result.assetType)   watchlist[idx].assetType   = result.assetType;
    if (result.confidence)  watchlist[idx].confidence  = result.confidence;
    saveWatchlistToStorage();
    if (!noRender && watchlistOpen) renderWatchlist();
  } catch(e) {
    console.warn('Watchlist sentiment fetch failed for', item.name, e.message);
  }
}

export async function refreshAllWatchlistItems() {
  if (watchlist.length === 0) return;
  // Clear watchlistSentCache in place — it's an object
  Object.keys(watchlistSentCache).forEach(k => delete watchlistSentCache[k]);

  // Clear stale sentiments and show loading state immediately
  watchlist.forEach(item => { item.sentiment = null; item.score = 0; item.keyNote = ''; });
  if (watchlistOpen) renderWatchlist();

  const prog  = document.getElementById('wl-progress');
  const total = watchlist.length;
  let done    = 0;
  const updateProg = () => { if (prog) prog.textContent = `⟳ Refreshing ${done}/${total}…`; };
  updateProg();

  // Concurrency-limited parallel fetch: max 3 simultaneous LLM calls
  const CONCURRENCY = 3;
  const queue = [...watchlist];
  let active  = 0;

  await new Promise(resolve => {
    let settled = 0;
    function next() {
      while (active < CONCURRENCY && queue.length > 0) {
        const item = queue.shift();
        active++;
        fetchWatchlistSentiment(item, true).finally(() => {
          active--;
          done++;
          updateProg();
          settled++;
          if (settled === total) resolve();
          else next();
        });
      }
    }
    next();
  });

  if (prog) prog.textContent = '';
  if (watchlistOpen) renderWatchlist();
}

function removeWatchlistItem(key) {
  const kept = watchlist.filter(w => w.key !== key);
  watchlist.splice(0, watchlist.length, ...kept);
  saveWatchlistToStorage();
  updateWatchlistCountryBtn();
  renderWatchlist();
}

function renderWatchlist() {
  const list   = document.getElementById('wl-list');
  const empty  = document.getElementById('wl-empty');
  if (!list) return;

  // Show/hide add-country shortcut
  updateWatchlistCountryBtn();

  if (watchlist.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const sentLabel = { bullish:'▲ BULLISH', bearish:'▼ BEARISH', neutral:'◆ NEUTRAL' };
  const sentClass = { bullish:'wl-badge-bull', bearish:'wl-badge-bear', neutral:'wl-badge-neut' };
  const scoreColor = s => s > 0.1 ? 'var(--bull)' : s < -0.1 ? 'var(--bear)' : 'var(--neut)';

  list.innerHTML = watchlist.map((item, i) => {
    const s = item.sentiment;
    const score = item.score ?? 0;
    const barPct = Math.round(((score + 1) / 2) * 100);
    const badgeCls = s ? sentClass[s] || 'wl-badge-neut' : 'wl-badge-load';
    const badgeText = s ? (sentLabel[s] || s.toUpperCase()) : '⟳ Fetching…';
    const typeLabel = item.type === 'country' ? 'COUNTRY' : item.type === 'ticker' ? 'TICKER' : 'THEME';
    const ts = item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—';

    return `
    <div class="wl-item">
      <div class="wl-item-top">
        <span class="wl-item-icon">${item.icon || '◈'}</span>
        <span class="wl-item-name" title="${item.name}">${item.name}</span>
        <span class="wl-item-type">${typeLabel}</span>
        <button class="wl-item-del" data-key="${item.key}" title="Remove">✕</button>
      </div>
      <div class="wl-item-badge ${badgeCls}">${badgeText}</div>
      ${s ? `<div class="wl-score-bar"><div class="wl-score-fill" style="width:${barPct}%;background:${scoreColor(score)};"></div></div>` : ''}
      <div class="wl-item-key">${item.keyNote || (s ? '' : 'Loading sentiment…')}</div>
      <div class="wl-item-meta">${item.regime || item.assetType || ''} ${ts !== '—' ? '· Updated ' + ts : ''}</div>
      ${s ? `<button class="expand-btn" data-wl-key="${item.key}">▸ DETAILS</button><div class="expand-body" id="wl-exp-${item.key.replace(/[^a-z0-9]/gi,'_')}"></div>` : ''}
    </div>`;
  }).join('');

  // Wire delete buttons
  list.querySelectorAll('.wl-item-del').forEach(btn => {
    btn.addEventListener('click', () => removeWatchlistItem(btn.dataset.key));
  });

  // Wire expand buttons
  list.querySelectorAll('.expand-btn[data-wl-key]').forEach(btn => {
    const key = btn.dataset.wlKey;
    const item = watchlist.find(w => w.key === key);
    if (!item) return;
    const safeKey = key.replace(/[^a-z0-9]/gi, '_');
    const bodyEl = document.getElementById(`wl-exp-${safeKey}`);
    btn.addEventListener('click', () => {
      const cKey = `wl|${key}`;
      const typeCtx = item.type === 'country' ? 'country macro' : item.type === 'ticker' ? 'financial asset' : 'investment theme';
      const sentCtx = item.sentiment ? `Current sentiment: ${item.sentiment} (score ${item.score?.toFixed(2)}). Key note: ${item.keyNote || 'N/A'}.` : '';
      const prompt = `You are a senior portfolio manager at a multi-strategy hedge fund. Provide rigorous, actionable analysis for the ${typeCtx}: "${item.name}". ${sentCtx} Structure in 4 sections: (1) CURRENT DRIVERS: the 2-3 most important macro or fundamental forces now — cite specific data points, policy decisions, or structural shifts; (2) POSITIONING LANDSCAPE: institutional positioning — overcrowded, under-owned, short squeeze risk, or consensus long — and how this affects risk profile; (3) RISK SCENARIOS: two specific adverse scenarios with probability weighting and price/spread/rate impact magnitude; (4) TRADE SETUP & OUTLOOK: 3-month view with directional bias, dated catalysts, and one concrete trade idea (instrument, direction, entry, stop, target). Cite specific levels, percentages, timeframes. Max 250 words.`;
      toggleExpand(btn, bodyEl, cKey, prompt);
    });
  });

  // Fetch pending items
  if (apiKey) {
    watchlist.filter(w => w.sentiment === null).forEach(w => fetchWatchlistSentiment(w));
  }
}

// Window bridges
window.toggleWatchlist = toggleWatchlist;
window.closeWatchlist = closeWatchlist;
window.updateWatchlistCountryBtn = updateWatchlistCountryBtn;
window.addWatchlistItem = addWatchlistItem;
window.addCurrentCountryToWatchlist = addCurrentCountryToWatchlist;
window.loadWatchlistFromStorage = loadWatchlistFromStorage;
window.refreshAllWatchlistItems = refreshAllWatchlistItems;
