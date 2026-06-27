// utils/misc.js — World Bank refresh, FRED key UI, API key wiring, region jump, country selector
import * as d3 from 'd3';
import { storageGet, storageSet, storageRemove } from '../core/storage.js';
import { MACRO_CONTEXT, COUNTRY_ISO2, META, REGION_NAMES, REGION_TOP } from '../core/constants.js';
import {
  cache, worldData,
  apiKey, setApiKey,
  tickerTimer, setTickerTimer,
  _tickerVisibilityWired, setTickerVisibilityWired,
  countryMode, setCountryMode as _setCountryMode, selectedCountries,
} from '../core/state.js';
import { detectProvider, requireApiKey } from '../api/llm.js';
import { fetchSentiment } from '../api/sentiment.js';
import { loadTickers } from '../utils/ticker.js';

// ── World Bank data helpers ───────────────────────────────────────────────────

export async function fetchWorldBankSeries(iso2, indicator) {
  const cKey = `gmi_wb_${iso2}_${indicator}`;
  try {
    const cached = storageGet(cKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 24 * 3600 * 1000) return data;
    }
  } catch(_) {}
  const url     = `https://api.worldbank.org/v2/country/${iso2}/indicator/${indicator}?format=json&per_page=10&mrv=10`;
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  for (const endpoint of [url, proxied]) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json();
      const rows = Array.isArray(json[1]) ? json[1] : null;
      if (!rows) continue;
      const data = rows.filter(r => r.value !== null)
                       .map(r => ({ year: +r.date, value: +r.value }))
                       .sort((a, b) => a.year - b.year);
      if (data.length === 0) continue;
      try { storageSet(cKey, JSON.stringify({ data, ts: Date.now() })); } catch(_) {}
      return data;
    } catch(_) {}
  }
  return null;
}

export function _wbAnnualToQuarterly(annualData) {
  const QUARTERS = ['Q1 2020','Q2 2020','Q3 2020','Q4 2020','Q1 2021','Q2 2021','Q3 2021','Q4 2021',
                    'Q1 2022','Q2 2022','Q3 2022','Q4 2022','Q1 2023','Q2 2023','Q3 2023','Q4 2023',
                    'Q1 2024','Q2 2024','Q3 2024','Q4 2024','Q1 2025','Q2 2025'];
  const byYear = {};
  annualData.forEach(r => { byYear[r.year] = r.value; });
  if (!byYear[2025] && byYear[2024] && byYear[2023]) {
    byYear[2025] = byYear[2024] + (byYear[2024] - byYear[2023]) * 0.5;
  }
  return QUARTERS.map(q => {
    const yr = +q.slice(-4);
    return byYear[yr] != null ? byYear[yr] : null;
  });
}

export async function refreshMacroContextFromWB() {
  const TS_KEY = 'gmi_macro_wb_ts';
  try {
    const lastTs = +storageGet(TS_KEY) || 0;
    if (Date.now() - lastTs < 24 * 3600 * 1000) return;
  } catch(_) {}

  const PRIORITY = ['840','276','392','826','156','036','124','376','410'];
  const unique   = [...new Set(PRIORITY)].filter(id => COUNTRY_ISO2[id]);

  await Promise.allSettled(unique.map(async id => {
    const iso2 = COUNTRY_ISO2[id];
    try {
      const [gdpRows, cpiRows, unempRows] = await Promise.all([
        fetchWorldBankSeries(iso2, 'NY.GDP.MKTP.KD.ZG'),
        fetchWorldBankSeries(iso2, 'FP.CPI.TOTL.ZG'),
        fetchWorldBankSeries(iso2, 'SL.UEM.TOTL.ZS'),
      ]);
      const entry = MACRO_CONTEXT[id];
      if (!entry) return;
      if (gdpRows?.length)   entry.gdp   = (gdpRows[gdpRows.length-1].value >= 0 ? '+' : '') + gdpRows[gdpRows.length-1].value.toFixed(1);
      if (cpiRows?.length)   entry.cpi   = cpiRows[cpiRows.length-1].value.toFixed(1);
      if (unempRows?.length) entry.unemp = unempRows[unempRows.length-1].value.toFixed(1);
    } catch(_) {}
  }));

  try { storageSet(TS_KEY, String(Date.now())); } catch(_) {}
}

// ── Precompute all countries ──────────────────────────────────────────────────

export async function precomputeAll() {
  const entries = Object.entries(META).filter(([k], i, arr) =>
    arr.findIndex(([k2]) => k2 === k) === i &&
    (countryMode !== 'select' || selectedCountries.size === 0 || selectedCountries.has(k))
  );
  const total       = entries.length;
  const progressWrap = document.getElementById('api-progress');
  const progressBar  = document.getElementById('api-progress-bar');
  const progressText = document.getElementById('api-progress-text');
  if (progressWrap) progressWrap.style.display = 'block';

  let done = 0;
  const update = () => {
    done++;
    const pct = Math.round((done / total) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = done === total
      ? `All ${total} countries computed`
      : `Precomputed ${done} / ${total} countries`;
    if (done === total && progressBar) progressBar.style.background = 'var(--bull)';
  };

  const CONCURRENCY = detectProvider() === 'gemini' ? 2 : 4;
  const BATCH_DELAY  = detectProvider() === 'gemini' ? 1200 : 400;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(async ([metaId, meta]) => {
      const key = 'c' + metaId;
      if (cache[key]) { update(); return; }
      await fetchSentiment(key, meta, true);
      update();
    }));
    if (i + CONCURRENCY < entries.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
  }
}

// ── FRED key UI ───────────────────────────────────────────────────────────────

export function saveFredKey() {
  const v = (document.getElementById('fred-key-input')?.value || '').trim();
  if (!v) return;
  storageSet('gmi_fred_key', v);
  const ok = document.getElementById('fred-key-ok');
  if (ok) { ok.style.display = 'block'; setTimeout(() => ok.style.display = 'none', 3000); }
  loadTickers();
}

export function clearFredKey() {
  storageRemove('gmi_fred_key');
  const inp = document.getElementById('fred-key-input');
  if (inp) inp.value = '';
}

// ── API key widget event wiring ───────────────────────────────────────────────

export function wireApiKeyWidget() {
  document.getElementById('api-save')?.addEventListener('click', () => {
    const v = document.getElementById('api-input').value.trim();
    if (!v) return;
    const provider = v.startsWith('AIza') ? 'gemini' : (v.startsWith('sk-ant-') || v.startsWith('sk-')) ? 'claude' : null;
    const ok = document.getElementById('api-ok');
    if (!provider) {
      if (ok) { ok.textContent = '✗ Unrecognised key format — use sk-ant-… (Claude) or AIza… (Gemini)'; ok.style.color = 'var(--bear)'; ok.style.display = 'block'; setTimeout(() => { ok.style.display = 'none'; ok.style.color = ''; }, 5000); }
      return;
    }
    setApiKey(v);
    storageSet('gmi_api_key', v);
    if (ok) { ok.textContent = provider === 'gemini' ? '✓ GEMINI ACTIVE' : '✓ CLAUDE ACTIVE'; ok.style.color = ''; ok.style.display = 'block'; setTimeout(() => ok.style.display = 'none', 4000); }
    loadTickers();
    if (tickerTimer) clearInterval(tickerTimer);
    setTickerTimer(setInterval(loadTickers, 300000));
    if (!_tickerVisibilityWired) {
      setTickerVisibilityWired(true);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { clearInterval(tickerTimer); setTickerTimer(null); }
        else { loadTickers(); setTickerTimer(setInterval(loadTickers, 300000)); }
      });
    }
  });

  document.getElementById('api-clear')?.addEventListener('click', () => {
    setApiKey('');
    storageRemove('gmi_api_key');
    const inp = document.getElementById('api-input');
    if (inp) inp.value = '';
    const ok = document.getElementById('api-ok');
    if (ok) { ok.textContent = 'Key cleared — now running in free AI mode'; ok.style.color = 'var(--text2)'; ok.style.display = 'block'; setTimeout(() => { ok.style.display = 'none'; ok.style.color = ''; }, 4000); }
    if (tickerTimer) { clearInterval(tickerTimer); setTickerTimer(null); }
    setTickerTimer(setInterval(loadTickers, 300000));
    loadTickers();
  });
}

// ── No-op zoom stubs (map is static) ─────────────────────────────────────────

export function zoomBy() {}
export function resetZoom() {}

// ── Region jump ───────────────────────────────────────────────────────────────

function getMeta(d) {
  const id = String(d.id).padStart(3, '0');
  return META[id] || META[String(d.id)] || null;
}

export function jumpTo(region) {
  const match = REGION_NAMES[region];
  if (!match || !worldData) return;
  const regions = Array.isArray(match) ? match : [match];
  d3.selectAll('.country').each(function(d) {
    const meta = getMeta(d);
    if (!meta) return;
    if (regions.includes(meta.region)) {
      d3.select(this).transition().duration(200).attr('stroke','var(--cyan)').attr('stroke-width','1.5')
        .transition().delay(800).duration(400).attr('stroke','#0B1426').attr('stroke-width','0.5');
    }
  });
  document.querySelectorAll('.rj-btn').forEach(b => b.classList.toggle('active', b.dataset.region === region));
  setTimeout(() => document.querySelectorAll('.rj-btn').forEach(b => b.classList.remove('active')), 1200);
}

// ── Country selector ──────────────────────────────────────────────────────────

export function setCountryMode(mode) {
  _setCountryMode(mode);
  document.querySelectorAll('.cmode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const wrap = document.getElementById('country-search-wrap');
  if (mode === 'select') {
    wrap.classList.add('show');
    if (!wrap._initialized) { initCountrySelector(); wrap._initialized = true; }
  } else {
    wrap.classList.remove('show');
  }
}

export function initCountrySelector() {
  const listBox     = document.getElementById('country-list-box');
  const searchInput = document.getElementById('country-search-input');
  function renderList(filter) {
    const q    = (filter || '').toLowerCase();
    const seen = new Set();
    const entries = Object.entries(META)
      .filter(([k]) => { if (seen.has(k)) return false; seen.add(k); return true; })
      .map(([k, v]) => ({ id: k, name: v.name, flag: v.flag || '' }))
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    listBox.innerHTML = entries.map(c => `
      <div class="clist-item ${selectedCountries.has(c.id) ? 'selected' : ''}" data-id="${c.id}">
        <span class="clist-check">${selectedCountries.has(c.id) ? '✓' : ' '}</span>
        <span>${c.flag}</span>
        <span>${c.name}</span>
      </div>`).join('');
    const count = document.getElementById('country-sel-count');
    if (count) count.textContent = selectedCountries.size === 0
      ? 'No selection — will analyse ALL countries'
      : `${selectedCountries.size} selected — only these will be precomputed`;
  }
  listBox.addEventListener('click', e => {
    const item = e.target.closest('.clist-item');
    if (!item) return;
    const id = item.dataset.id;
    if (selectedCountries.has(id)) selectedCountries.delete(id);
    else selectedCountries.add(id);
    renderList(searchInput.value);
  });
  let _csTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(_csTimer);
    _csTimer = setTimeout(() => renderList(searchInput.value), 200);
  });
  renderList('');
}

// ── About overlay ─────────────────────────────────────────────────────────────

function _animateAboutCounters() {
  document.querySelectorAll('.about-stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    if (!target) return;
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export function openAbout() {
  const el = document.getElementById('about-overlay');
  if (!el) return;
  el.classList.add('open');
  el.scrollTop = 0;
  _animateAboutCounters();
}

export function closeAbout() {
  document.getElementById('about-overlay')?.classList.remove('open');
}

export function handleAboutCta() {
  closeAbout();
}

// ── Contact overlay ───────────────────────────────────────────────────────────

const CONTACT_EMAIL = 'connectwithmeridiax@gmail.com';

const CONTACT_SUGGESTIONS = {
  'Feature Request': ['Dark mode','Mobile app','Portfolio tracker','Alert notifications','Historical data export'],
  'Data Request':    ['More EM countries','Crypto sentiment','Earnings calendar','Options flow data','Fund flow data'],
};

function _wireContactPanel() {
  const cats    = document.getElementById('contact-cats');
  const msgEl   = document.getElementById('contact-msg');
  const countEl = document.getElementById('contact-char-count');
  const sentEl  = document.getElementById('contact-sent-note');
  if (sentEl) sentEl.style.display = 'none';

  if (cats && !cats._wired) {
    cats._wired = true;
    cats.addEventListener('click', e => {
      const btn = e.target.closest('.contact-cat');
      if (!btn) return;
      cats.querySelectorAll('.contact-cat').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _updateContactSuggestions(btn.dataset.cat);
    });
  }

  if (msgEl && countEl && !msgEl._wired) {
    msgEl._wired = true;
    const max = parseInt(msgEl.getAttribute('maxlength') || '2000', 10);
    const update = () => { countEl.textContent = `${msgEl.value.length} / ${max}`; };
    msgEl.addEventListener('input', update);
    update();
  }

  const overlay = document.getElementById('contact-overlay');
  if (overlay && !overlay._keyWired) {
    overlay._keyWired = true;
    overlay.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') window.submitContact?.();
    });
  }
}

function _updateContactSuggestions(cat) {
  const wrap  = document.getElementById('contact-suggestions');
  const chips = CONTACT_SUGGESTIONS[cat];
  if (!wrap) return;
  if (!chips) { wrap.classList.remove('show'); return; }
  const label = wrap.querySelector('.contact-sugg-label');
  wrap.querySelectorAll('.contact-sugg-chip').forEach(c => c.remove());
  chips.forEach(text => {
    const span = document.createElement('span');
    span.className = 'contact-sugg-chip';
    span.textContent = text;
    span.style.cssText = 'cursor:pointer;font-family:var(--font-mono);font-size:9px;padding:3px 8px;border-radius:2px;border:1px solid var(--border2);color:var(--text2);background:rgba(255,255,255,0.03);letter-spacing:0.06em;';
    span.addEventListener('click', () => {
      const subj = document.getElementById('contact-subject');
      if (subj && !subj.value) subj.value = text;
    });
    wrap.appendChild(span);
  });
  wrap.classList.add('show');
}

export function openContact() {
  const el = document.getElementById('contact-overlay');
  if (!el) return;
  _wireContactPanel();
  el.classList.add('open');
  setTimeout(() => document.getElementById('contact-subject')?.focus(), 80);
}

export function closeContact() {
  document.getElementById('contact-overlay')?.classList.remove('open');
}

function _showContactErr(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
}

export function submitContact() {
  const subject = (document.getElementById('contact-subject')?.value || '').trim();
  const msg     = (document.getElementById('contact-msg')?.value || '').trim();
  const reply   = (document.getElementById('contact-reply')?.value || '').trim();
  const cat     = document.querySelector('.contact-cat.selected')?.dataset.cat || 'General';

  let valid = true;
  _showContactErr('contact-subject-err', !subject);
  _showContactErr('contact-msg-err', !msg);
  if (!subject || !msg) { valid = false; }

  if (reply) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply);
    _showContactErr('contact-reply-err', !emailOk);
    if (!emailOk) valid = false;
  } else {
    _showContactErr('contact-reply-err', false);
  }

  if (!valid) return;

  const body = [
    msg,
    '',
    reply ? `Reply to: ${reply}` : '',
    `Category: ${cat}`,
  ].filter(Boolean).join('\n');

  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Meridiax] ${cat}: ${subject}`)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');

  const noteEl = document.getElementById('contact-sent-note');
  if (noteEl) noteEl.style.display = 'block';
}

export function copyContactEmail() {
  navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
    const el = document.getElementById('contact-status');
    if (!el) return;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
  });
}

// Window bridges
window.precomputeAll   = precomputeAll;
window.saveFredKey     = saveFredKey;
window.clearFredKey    = clearFredKey;
window.jumpTo          = jumpTo;
window.setCountryMode  = setCountryMode;
window.zoomBy          = zoomBy;
window.resetZoom       = resetZoom;
window.fetchWorldBankSeries    = fetchWorldBankSeries;
window._wbAnnualToQuarterly    = _wbAnnualToQuarterly;
window.refreshMacroContextFromWB = refreshMacroContextFromWB;
window.openAbout       = openAbout;
window.closeAbout      = closeAbout;
window.handleAboutCta  = handleAboutCta;
window.openContact     = openContact;
window.closeContact    = closeContact;
window.submitContact   = submitContact;
window.copyContactEmail = copyContactEmail;
