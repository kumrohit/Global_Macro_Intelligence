// src/panels/profile.js — Profile, Digest, Newsletter, Opportunities panel
import { storageGet, storageSet } from '../core/storage.js';
import {
  profileOpen, setProfileOpen,
  apiKey,
  cache, watchlist,
  nlEmail, nlSubDaily, nlSubWeekly, oppHorizon,
} from '../core/state.js';
import { loadSession, requireAuth, loadUsers, saveUsers } from '../auth/auth.js';
import { callLLM, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { showToast } from '../utils/toast.js';

// ── Module-level state ─────────────────────────────────────────────
let _profileOpen   = false;
let _profileTab    = 'daily';
let _digestCache   = {};
let _digestExpandCache = {};
let _userRegion    = 'global';

// Newsletter state (local shadows of state.js exports — updated via loadNewsletterTab)
let _nlEmail       = nlEmail;
let _nlSubDaily    = nlSubDaily;
let _nlSubWeekly   = nlSubWeekly;

// EmailJS config
let _ejsPK         = storageGet('gmi_ejs_pk')  || '';
let _ejsSID        = storageGet('gmi_ejs_sid') || '';
let _ejsTID        = storageGet('gmi_ejs_tid') || '';
let _ejsInited     = false;

// Opportunities
const OPP_HORIZONS = ['DAY','WEEK','MONTH','THEMES'];
let _oppHorizon    = oppHorizon;
let _oppCache      = {};

// ── Key helpers ────────────────────────────────────────────────────
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function weekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

export function digestStorageKey(period) {
  const sess = loadSession();
  const timeKey = period === 'daily' ? todayKey() : weekKey();
  return `gmi_digest_${period}_${sess?.username || 'anon'}_${timeKey}`;
}

// ── User region ────────────────────────────────────────────────────
export function saveUserRegion(region) {
  _userRegion = region;
  const sess = loadSession();
  if (!sess) return;
  const users = loadUsers();
  if (users[sess.username]) {
    users[sess.username].region = region;
    saveUsers(users);
  }
}

export function loadUserRegion() {
  const sess = loadSession();
  if (!sess) return 'global';
  const users = loadUsers();
  return users[sess.username]?.region || 'global';
}

// ── Profile open/close ─────────────────────────────────────────────
export function openProfile() {
  requireAuth(() => {
    _profileOpen = true;
    setProfileOpen(true);
    document.getElementById('profile-overlay').classList.add('open');
    refreshProfileMeta();
    if (apiKey) {
      loadDigestTab(_profileTab, false);
    } else {
      _showNoKeyWelcome();
    }
  }, 'Sign in to view your Profile & Digest');
}

function _showNoKeyWelcome() {
  _showProfileBody();
  _profileTab = 'daily';
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'daily'));
  const body = document.getElementById('profile-body');
  if (!body) return;
  body.innerHTML = `
    <div class="digest-empty" style="padding:32px 20px;text-align:center;">
      <div style="font-size:30px;margin-bottom:14px;">📊</div>
      <div style="font-size:13px;font-family:var(--font-display);font-weight:600;color:var(--text);margin-bottom:10px;letter-spacing:0.04em;">INTELLIGENCE PROFILE</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:20px;max-width:300px;margin-left:auto;margin-right:auto;">
        Daily Capsule, Weekly Digest and Opportunities use AI and require a free <strong style="color:var(--text)">Gemini</strong> or <strong style="color:var(--text)">Claude</strong> API key.<br>
        The map, community board and watchlist work without one.
      </div>
      <button id="profile-setup-key-btn" style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;background:rgba(34,211,238,0.10);border:1px solid rgba(34,211,238,0.35);color:var(--cyan);border-radius:3px;padding:10px 20px;cursor:pointer;margin-bottom:16px;">
        ⚙ &nbsp;SET UP API KEY →
      </button>
      <div style="font-size:9px;font-family:var(--font-mono);color:var(--text3);line-height:1.9;">
        Free keys: &nbsp;
        <a href="https://aistudio.google.com" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:none;">Google AI Studio (Gemini)</a>
        &nbsp;·&nbsp;
        <a href="https://console.anthropic.com" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:none;">Anthropic Console (Claude)</a>
      </div>
    </div>`;
  document.getElementById('profile-setup-key-btn')?.addEventListener('click', showApiSettings);
}

export function closeProfile() {
  _profileOpen = false;
  setProfileOpen(false);
  document.getElementById('profile-overlay').classList.remove('open');
}

export function refreshProfileMeta() {
  const sess = loadSession();
  if (!sess) return;
  const users = loadUsers();
  const user = users[sess.username] || {};

  const initial = (sess.displayName || sess.username || '?')[0].toUpperCase();
  const avatarEl = document.querySelector('#profile-avatar');
  if (avatarEl) avatarEl.textContent = initial;

  document.getElementById('profile-name').textContent = (sess.displayName || sess.username).toUpperCase();

  const created = user.created ? new Date(user.created).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : '—';
  document.getElementById('profile-meta').textContent = `@${sess.username}  ·  Member since ${created}`;

  document.getElementById('ps-wl').textContent = watchlist.length;
  document.getElementById('ps-ca').textContent = Object.keys(cache).length;
  document.getElementById('ps-la').textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});

  const savedRegion = loadUserRegion();
  _userRegion = savedRegion;
  document.querySelectorAll('.pr-region-btn').forEach(b => b.classList.toggle('active', b.dataset.region === savedRegion));
}

// ── Body visibility helpers ────────────────────────────────────────
export function _showProfileBody() {
  const b = document.getElementById('profile-body');
  const w = document.getElementById('api-widget');
  const c = document.getElementById('country-widget');
  if (b) b.style.display = '';
  if (w) w.style.display = 'none';
  if (c) c.style.display = 'none';
}

export function showApiSettings() {
  _profileTab = 'settings';
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'settings'));
  document.getElementById('profile-body').style.display    = 'none';
  document.getElementById('api-widget').style.display      = 'block';
  document.getElementById('country-widget').style.display  = 'none';
  const inp = document.getElementById('api-input');
  if (inp && !inp.value && apiKey) inp.value = apiKey;
}

export function showCountriesTab() {
  _profileTab = 'countries';
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'countries'));
  document.getElementById('profile-body').style.display    = 'none';
  document.getElementById('api-widget').style.display      = 'none';
  document.getElementById('country-widget').style.display  = 'block';
}

// ── Digest loading ─────────────────────────────────────────────────
export async function loadDigestTab(tab, forceRefresh) {
  if (tab === 'settings')      { showApiSettings();  return; }
  if (tab === 'countries')     { showCountriesTab(); return; }
  if (tab === 'newsletter')    { loadNewsletterTab(); return; }
  if (tab === 'opportunities') { await loadOpportunitiesTab(forceRefresh); return; }
  if (!apiKey) { requireApiKey(() => loadDigestTab(tab, forceRefresh), tab === 'daily' ? 'Daily Capsule' : 'Weekly Digest'); return; }
  _showProfileBody();
  _profileTab = tab;
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

  const body = document.getElementById('profile-body');
  const sKey = digestStorageKey(tab);

  if (!forceRefresh && _digestCache[sKey]) {
    renderDigest(_digestCache[sKey], tab);
    return;
  }

  if (!forceRefresh) {
    try {
      const stored = storageGet(sKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        _digestCache[sKey] = parsed;
        renderDigest(parsed, tab);
        return;
      }
    } catch(_) {}
  }

  body.innerHTML = '<div class="digest-loading"><span class="spin"></span> &nbsp;Generating your personalised ' + (tab === 'daily' ? 'Daily Capsule' : 'Weekly Digest') + '…</div>';

  const wlNames = watchlist.map(w => `${w.name} (${w.type}${w.sentiment ? ', ' + w.sentiment : ''})`).slice(0, 8);
  const recentCountries = [...new Set(Object.values(cache).map(v => v._meta?.name).filter(Boolean))].slice(0, 6);
  const regionCtx = _userRegion === 'global' ? 'global markets' : `${_userRegion} region`;
  const period = tab === 'daily' ? 'today' : 'this week';
  const periodLabel = tab === 'daily' ? 'Daily Capsule' : 'Weekly Digest';

  const digestMacroCtx = Object.entries(cache)
    .filter(([, v]) => v._meta && typeof v.score === 'number')
    .slice(0, 4)
    .map(([, v]) => `${v._meta.name}: ${v.sentiment} (${v.score >= 0 ? '+' : ''}${v.score}, ${v.regime || '—'})`)
    .join(', ');
  const digestMacroBlock = digestMacroCtx
    ? `\nCurrent macro picture from user's recent analyses: ${digestMacroCtx}. Incorporate these signals when selecting and framing relevant digest items.\n`
    : '';

  const prompt = `You are a senior macro intelligence analyst. Create a personalised ${periodLabel} for ${period}.
Region: ${regionCtx}. Watchlist: ${wlNames.join(', ')||'none'}. Analysed: ${recentCountries.join(', ')||'none'}.${digestMacroBlock}
Generate 10 macro intelligence items prioritised for this user. Each must include real data points, specific institutions, and market levels.

Respond with ONLY a valid JSON object. No markdown, no code fences. Exact structure:
{
  "period": "${tab}",
  "generated": "${tab === 'daily' ? todayKey() : weekKey()}",
  "market_recap": {"equities": "overnight equity moves with specific index levels and % changes", "fixed_income": "bond market moves — key yield levels", "fx": "major FX moves — specific pairs and magnitude", "commodities": "key commodity moves"},
  "events_today": [{"time": "HH:MM ET", "event": "event name", "consensus": "consensus estimate", "importance": "HIGH|MEDIUM|LOW"}, {2 more events same structure}],
  "positioning_shifts": "2 sentences on institutional positioning — accumulation/distribution and crowding signals",
  "items": [{"rank": 1, "title": "headline max 18 words with specific number/institution/policy action", "source": "real financial media outlet (FT, Reuters, Bloomberg, WSJ, CNBC, Nikkei)", "impact": "HIGH|MEDIUM|LOW", "region": "region or country", "summary": "1-2 sentences with specific data points, max 35 words", "implication": "affected instrument and direction, max 25 words", "portfolio_relevance": "relevance to user's watchlist/region, max 20 words"}]
}`;

  try {
    const raw = await callLLM(
      'You are a macro intelligence analyst. Output only valid JSON. No markdown. No code fences.',
      prompt, 2000, 0.4
    );
    const result = repairAndParseJSON(raw);
    if (!result || !Array.isArray(result.items)) throw new Error('Invalid digest response');
    _digestCache[sKey] = result;
    try { storageSet(sKey, JSON.stringify(result)); } catch(_) {}
    renderDigest(result, tab);
  } catch(err) {
    body.innerHTML = `<div class="digest-empty">Failed to generate digest: ${err.message}<br><br><button class="digest-refresh-btn" onclick="loadDigestTab('${tab}',true)">↺ RETRY</button></div>`;
  }
}

export function renderDigest(data, tab) {
  const body = document.getElementById('profile-body');
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    body.innerHTML = '<div class="digest-empty">No digest items available. Try refreshing.</div>';
    return;
  }

  const label = tab === 'daily' ? 'Daily Capsule' : 'Weekly Digest';
  const dateStr = tab === 'daily'
    ? new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    : `Week of ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;

  const cardsHtml = data.items.map((item, idx) => {
    const searchQ = encodeURIComponent(`${item.title} ${item.source}`);
    const searchUrl = `https://www.google.com/search?q=${searchQ}`;
    return `
    <div class="digest-card" data-digest-idx="${idx}">
      <div class="digest-card-top">
        <span class="digest-rank">${item.rank || '—'}</span>
        <span class="digest-impact ${item.impact || 'LOW'}">${item.impact || 'LOW'}</span>
        <span class="digest-region-tag">${item.region || '—'}</span>
      </div>
      <div class="digest-title">${item.title || '—'}</div>
      <div class="digest-source-row">
        <span class="digest-source-label">SOURCE:</span>
        <span class="digest-source-name">${item.source || '—'}</span>
        <a class="digest-source-btn" href="${searchUrl}" target="_blank" rel="noopener">FIND ARTICLE ↗</a>
      </div>
      <div class="digest-summary">${item.summary || '—'}</div>
      ${item.implication ? `<div class="digest-implication">${item.implication}</div>` : ''}
      <div class="digest-card-footer">
        <button class="digest-expand-btn" data-digest-idx="${idx}">▸ DEEP ANALYSIS</button>
        <a class="digest-source-link" href="${searchUrl}" target="_blank" rel="noopener">READ SOURCE ↗</a>
      </div>
      <div class="digest-detail-body" data-digest-body="${idx}"></div>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="digest-header">
      <div>
        <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text);letter-spacing:0.08em;">${label}</div>
        <div class="digest-date">${dateStr}</div>
      </div>
      <button class="digest-refresh-btn" data-tab="${tab}">↺ REFRESH</button>
    </div>
    <div class="digest-grid">${cardsHtml}</div>
  `;

  body.querySelector('.digest-refresh-btn[data-tab]')?.addEventListener('click', e => {
    loadDigestTab(e.target.dataset.tab, true);
  });

  body.querySelectorAll('.digest-expand-btn').forEach(btn => {
    const idx = parseInt(btn.dataset.digestIdx, 10);
    const item = data.items[idx];
    const bodyEl = body.querySelector(`.digest-detail-body[data-digest-body="${idx}"]`);
    const cacheKey = `${tab}|${item.rank}|${(item.title||'').slice(0,40)}`;
    btn.addEventListener('click', () => toggleDigestExpand(btn, bodyEl, cacheKey, item));
  });
}

export async function loadDigestItemDetail(cacheKey, item, bodyEl) {
  if (_digestExpandCache[cacheKey]) { bodyEl.innerHTML = _digestExpandCache[cacheKey]; return; }
  bodyEl.innerHTML = '<span class="expand-loading"><span class="spin"></span> &nbsp;Loading deep analysis…</span>';

  try {
    const raw = await callLLM(
      'You are a senior macro analyst. Provide concise, data-driven analytical insight. Plain text only.',
      `Deep analysis of this macro development:\n\nTitle: ${item.title}\nRegion: ${item.region}\nSource: ${item.source}\nContext: ${item.summary}\nImplication: ${item.implication}\n\nProvide 3-4 sentences covering: root drivers, key data or policy backdrop, and specific market implications for equities, rates, or FX. Be direct and analytical.`,
      400, 0.3
    );
    const html = raw.trim()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n\n+/g,'</p><p>').replace(/\n/g,' ');
    const wrapped = `<p>${html}</p>`;
    _digestExpandCache[cacheKey] = wrapped;
    bodyEl.innerHTML = wrapped;
  } catch(e) {
    bodyEl.innerHTML = `<span style="color:var(--bear)">Failed: ${e.message}</span>`;
  }
}

export function toggleDigestExpand(btn, bodyEl, cacheKey, item) {
  const isOpen = bodyEl.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.textContent = isOpen ? '▴ COLLAPSE' : '▸ DEEP ANALYSIS';
  if (isOpen) loadDigestItemDetail(cacheKey, item, bodyEl);
}

// ── Newsletter ─────────────────────────────────────────────────────
export function saveNlPrefs() {
  storageSet('gmi_nl_email', _nlEmail);
  storageSet('gmi_nl_daily', _nlSubDaily ? '1' : '0');
  storageSet('gmi_nl_weekly', _nlSubWeekly ? '1' : '0');
}

export function saveEjsConfig() {
  storageSet('gmi_ejs_pk',  _ejsPK);
  storageSet('gmi_ejs_sid', _ejsSID);
  storageSet('gmi_ejs_tid', _ejsTID);
  _ejsInited = false;
}

function ejsConfigured() {
  return !!(_ejsPK && _ejsSID && _ejsTID);
}

export function initEmailJS() {
  if (_ejsInited || !ejsConfigured()) return false;
  try {
    if (typeof emailjs === 'undefined') return false;
    emailjs.init({ publicKey: _ejsPK });
    _ejsInited = true;
    return true;
  } catch(_) { return false; }
}

export async function ejsSend(tab, data) {
  if (!ejsConfigured()) throw new Error('EmailJS not configured');
  if (!initEmailJS() && !_ejsInited) throw new Error('EmailJS library not loaded');
  if (!_nlEmail) throw new Error('No delivery email set');

  const isDaily = tab === 'daily';
  const subject = isDaily
    ? `Meridiax — Daily Capsule ${todayKey()}`
    : `Meridiax — Weekly Digest ${weekKey()}`;
  const dateStr = isDaily
    ? new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    : `Week of ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;

  await emailjs.send(_ejsSID, _ejsTID, {
    to_email:     _nlEmail,
    to_name:      loadSession()?.displayName || _nlEmail,
    from_name:    'Meridiax',
    subject:      subject,
    period_label: isDaily ? 'Daily Capsule' : 'Weekly Digest',
    date_str:     dateStr,
    message:      generateNewsletterText(data),
    html_message: generateNewsletterHTML(tab, data),
    item_count:   String((data.items||[]).length),
  });

  storageSet(isDaily ? 'gmi_nl_sent_daily' : 'gmi_nl_sent_weekly',
             isDaily ? todayKey() : weekKey());
}

export function loadNewsletterTab() {
  _showProfileBody();
  _profileTab = 'newsletter';
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'newsletter'));
  const body = document.getElementById('profile-body');
  const hasSub = _nlSubDaily || _nlSubWeekly;
  const sentDaily  = storageGet('gmi_nl_sent_daily')  === todayKey();
  const sentWeekly = storageGet('gmi_nl_sent_weekly') === weekKey();
  const statusLine = hasSub && _nlEmail
    ? `Subscribed to: ${_nlSubDaily ? '<strong>Daily Capsule</strong>' : ''}${_nlSubDaily && _nlSubWeekly ? ' + ' : ''}${_nlSubWeekly ? '<strong>Weekly Digest</strong>' : ''} → <strong>${_nlEmail}</strong><br>
       Daily status: ${sentDaily ? '✓ Sent today' : 'Not yet sent'} · Weekly status: ${sentWeekly ? '✓ Sent this week' : 'Not yet sent'}`
    : 'No active subscriptions. Enter your email and toggle frequency below.';

  const ejsOk = ejsConfigured();
  const ejsBadge = ejsOk
    ? '<span class="nl-ejs-badge ok">✓ CONFIGURED</span>'
    : '<span class="nl-ejs-badge warn">NOT SET UP</span>';

  body.innerHTML = `
    <div class="nl-section">
      <div class="nl-section-title">DELIVERY EMAIL</div>
      <div class="nl-email-row">
        <input class="nl-email-input" id="nl-email-inp" type="email" placeholder="your@email.com" value="${_nlEmail}">
        <button class="nl-save-btn" id="nl-save-btn">SAVE</button>
      </div>
      <div class="nl-section-title">SUBSCRIPTION FREQUENCY</div>
      <div class="nl-freq-row">
        <span class="nl-freq-label">RECEIVE:</span>
        <button class="nl-freq-btn${_nlSubDaily ? ' active' : ''}" id="nl-btn-daily">📅 DAILY</button>
        <button class="nl-freq-btn${_nlSubWeekly ? ' active' : ''}" id="nl-btn-weekly">📆 WEEKLY</button>
      </div>
      <div class="nl-status">${statusLine}</div>

      <hr class="nl-divider">
      <div class="nl-section-title">AUTO-DELIVERY ${ejsBadge}</div>
      <div class="nl-ejs-section">
        <div class="nl-ejs-title">⚡ EmailJS Configuration
          <span style="font-size:7px;color:var(--text3);font-weight:normal;">— sends email automatically when you open the app</span>
        </div>
        <div class="nl-ejs-row">
          <span class="nl-ejs-label">PUBLIC KEY</span>
          <input class="nl-ejs-input" id="ejs-pk" type="password" placeholder="e.g. user_xxxxxxxxxxxxxxx" value="${_ejsPK}">
        </div>
        <div class="nl-ejs-row">
          <span class="nl-ejs-label">SERVICE ID</span>
          <input class="nl-ejs-input" id="ejs-sid" placeholder="e.g. service_xxxxxxx" value="${_ejsSID}">
        </div>
        <div class="nl-ejs-row">
          <span class="nl-ejs-label">TEMPLATE ID</span>
          <input class="nl-ejs-input" id="ejs-tid" placeholder="e.g. template_xxxxxxx" value="${_ejsTID}">
        </div>
        <button class="nl-ejs-save" id="ejs-save-btn">SAVE CONFIG</button>
        <div class="nl-ejs-guide">
          <strong style="color:var(--text2);">Quick setup (free · 200 emails/month):</strong><br>
          1. Create account at <strong style="color:var(--cyan);">emailjs.com</strong><br>
          2. Add a Gmail / Outlook email service → copy <code>Service ID</code><br>
          3. Create a new template. Add these variables: <code>{{to_email}}</code> <code>{{subject}}</code> <code>{{message}}</code> <code>{{html_message}}</code><br>
          4. Copy <code>Template ID</code> and your <code>Public Key</code> from Account → API Keys<br>
          5. Paste all three above and click SAVE CONFIG
        </div>
      </div>

      <hr class="nl-divider">
      <div class="nl-section-title">SEND NEWSLETTER</div>
      <div class="nl-actions">
        ${ejsOk ? `<button class="nl-send-btn" id="nl-send-daily">▶ SEND DAILY NOW</button>` : ''}
        ${ejsOk ? `<button class="nl-send-btn" id="nl-send-weekly">▶ SEND WEEKLY NOW</button>` : ''}
        <button class="nl-action-btn primary" id="nl-preview-daily">PREVIEW DAILY ↗</button>
        <button class="nl-action-btn primary" id="nl-preview-weekly">PREVIEW WEEKLY ↗</button>
        <button class="nl-action-btn" id="nl-copy-daily">COPY DAILY HTML</button>
        <button class="nl-action-btn" id="nl-copy-weekly">COPY WEEKLY HTML</button>
        <button class="nl-action-btn" id="nl-mail-daily">DAILY → MAIL CLIENT</button>
        <button class="nl-action-btn" id="nl-mail-weekly">WEEKLY → MAIL CLIENT</button>
      </div>
      ${!ejsOk ? `<div style="font-family:var(--font-mono);font-size:8px;color:var(--text3);line-height:1.7;margin-top:6px;">
        ℹ Configure EmailJS above for one-click sending. Without it, use MAIL CLIENT to open a pre-composed email in your default client.
      </div>` : ''}
    </div>
  `;

  document.getElementById('nl-save-btn').addEventListener('click', () => {
    _nlEmail = document.getElementById('nl-email-inp').value.trim();
    saveNlPrefs();
    loadNewsletterTab();
  });
  document.getElementById('nl-btn-daily').addEventListener('click', () => {
    _nlSubDaily = !_nlSubDaily; saveNlPrefs(); loadNewsletterTab();
  });
  document.getElementById('nl-btn-weekly').addEventListener('click', () => {
    _nlSubWeekly = !_nlSubWeekly; saveNlPrefs(); loadNewsletterTab();
  });
  document.getElementById('ejs-save-btn').addEventListener('click', () => {
    _ejsPK  = document.getElementById('ejs-pk').value.trim();
    _ejsSID = document.getElementById('ejs-sid').value.trim();
    _ejsTID = document.getElementById('ejs-tid').value.trim();
    saveEjsConfig();
    loadNewsletterTab();
  });
  document.getElementById('nl-preview-daily').addEventListener('click',  () => sendOrPreviewNewsletter('daily',  'preview'));
  document.getElementById('nl-preview-weekly').addEventListener('click', () => sendOrPreviewNewsletter('weekly', 'preview'));
  document.getElementById('nl-copy-daily').addEventListener('click',     () => sendOrPreviewNewsletter('daily',  'copy'));
  document.getElementById('nl-copy-weekly').addEventListener('click',    () => sendOrPreviewNewsletter('weekly', 'copy'));
  document.getElementById('nl-mail-daily').addEventListener('click',     () => sendOrPreviewNewsletter('daily',  'mail'));
  document.getElementById('nl-mail-weekly').addEventListener('click',    () => sendOrPreviewNewsletter('weekly', 'mail'));
  document.getElementById('nl-send-daily')?.addEventListener('click',   () => sendOrPreviewNewsletter('daily',  'send'));
  document.getElementById('nl-send-weekly')?.addEventListener('click',  () => sendOrPreviewNewsletter('weekly', 'send'));
}

export async function sendOrPreviewNewsletter(tab, action) {
  const sKey = digestStorageKey(tab);
  let data = _digestCache[sKey];
  if (!data) {
    try { const s = storageGet(sKey); if (s) data = JSON.parse(s); } catch(_) {}
  }

  let previewWin = null;
  if (action === 'preview') {
    previewWin = window.open('', '_blank');
    if (previewWin) {
      previewWin.document.write(
        '<!DOCTYPE html><html><head><title>Meridiax — Generating preview…</title>' +
        '<style>body{margin:0;display:flex;align-items:center;justify-content:center;' +
        'height:100vh;background:#0f172a;font-family:monospace;color:#94a3b8;font-size:14px;}</style></head>' +
        '<body>⟳ Generating newsletter preview…</body></html>'
      );
      previewWin.document.close();
    } else {
      showToast('Popup blocked — allow popups for this page to preview the newsletter.', null, 5000);
      return;
    }
  }

  if (!data) {
    const body = document.getElementById('profile-body');
    body.insertAdjacentHTML('beforeend', '<div class="digest-loading" id="nl-gen-msg"><span class="spin"></span> &nbsp;Generating digest…</div>');
    await loadDigestTab(tab, false);
    data = _digestCache[digestStorageKey(tab)];
    document.getElementById('nl-gen-msg')?.remove();
    if (!data) {
      if (previewWin) previewWin.close();
      alert('Could not generate digest. Please try again.');
      return;
    }
  }

  if (action === 'preview') {
    try {
      previewWin.document.open();
      previewWin.document.write(generateNewsletterHTML(tab, data));
      previewWin.document.close();
    } catch (_) {
      try {
        const blob = new Blob([generateNewsletterHTML(tab, data)], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewWin.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (_2) {
        previewWin.close();
        showToast('Preview blocked by browser. Try the Copy HTML option instead.', null, 5000);
      }
    }
    return;
  } else if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(generateNewsletterHTML(tab, data));
      showToast('Newsletter HTML copied to clipboard. Paste into Gmail or Outlook composer.', null, 3500);
    } catch(_) { alert('Copy failed — please use a secure (HTTPS) context or modern browser.'); }
  } else if (action === 'mail') {
    const subject = encodeURIComponent(tab === 'daily'
      ? `Meridiax — Daily Capsule ${todayKey()}`
      : `Meridiax — Weekly Digest ${weekKey()}`);
    const textBody = encodeURIComponent(generateNewsletterText(data));
    const to = encodeURIComponent(_nlEmail || '');
    window.location.href = `mailto:${to}?subject=${subject}&body=${textBody}`;
    storageSet(tab === 'daily' ? 'gmi_nl_sent_daily' : 'gmi_nl_sent_weekly', tab === 'daily' ? todayKey() : weekKey());
    setTimeout(() => loadNewsletterTab(), 1000);
  } else if (action === 'send') {
    const sendBtn = document.getElementById(tab === 'daily' ? 'nl-send-daily' : 'nl-send-weekly');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ SENDING…'; }
    try {
      await ejsSend(tab, data);
      showToast(`✓ ${tab === 'daily' ? 'Daily Capsule' : 'Weekly Digest'} sent to ${_nlEmail}`, null, 5000);
      if (_profileOpen) loadNewsletterTab();
    } catch(err) {
      showToast(`Send failed: ${err.message}`, null, 6000);
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = `▶ SEND ${tab.toUpperCase()} NOW`; }
    }
  }
}

export function generateNewsletterHTML(tab, data) {
  const isDaily = tab === 'daily';
  const label = isDaily ? 'Daily Capsule' : 'Weekly Digest';
  const dateStr = isDaily
    ? new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    : `Week of ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;
  const impactColors = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#64748b' };
  const impactBg = { HIGH:'rgba(239,68,68,0.1)', MEDIUM:'rgba(245,158,11,0.1)', LOW:'rgba(100,116,139,0.1)' };

  const items = (data.items||[]).map((item, i) => {
    const ic = impactColors[item.impact] || '#64748b';
    const ib = impactBg[item.impact] || 'rgba(100,116,139,0.1)';
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title+' '+item.source)}`;
    return `
    <tr><td style="padding:0 0 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1829;border:1px solid #1e3a5f;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:14px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:8px;">
                <span style="font-family:monospace;font-size:9px;color:#4a6080;margin-right:8px;">${item.rank||i+1}</span>
                <span style="font-family:monospace;font-size:8px;font-weight:700;letter-spacing:0.1em;padding:2px 7px;border-radius:3px;background:${ib};color:${ic};border:1px solid ${ic}44;">${item.impact||'LOW'}</span>
                <span style="font-family:monospace;font-size:8px;color:#334155;background:#0f2040;border:1px solid #1e3a5f;border-radius:3px;padding:2px 7px;margin-left:6px;">${item.region||''}</span>
                <span style="font-family:monospace;font-size:8px;color:#4a6080;float:right;">${item.source||''}</span>
              </td>
            </tr>
            <tr><td style="padding-bottom:6px;">
              <a href="${searchUrl}" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#e2e8f0;text-decoration:none;line-height:1.4;">${item.title||''}</a>
            </td></tr>
            <tr><td style="padding-bottom:8px;">
              <span style="font-family:monospace;font-size:9px;color:#94a3b8;line-height:1.6;">${item.summary||''}</span>
            </td></tr>
            ${item.implication ? `<tr><td style="border-top:1px solid #1e3a5f;padding-top:8px;">
              <span style="font-family:monospace;font-size:9px;color:#63b3ed;line-height:1.5;">▸ ${item.implication}</span>
            </td></tr>` : ''}
          </table>
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MRX — ${label} ${dateStr}</title>
</head>
<body style="margin:0;padding:0;background:#060d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060d1a;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#060d1a 0%,#0d1829 100%);border:1px solid #1e3a5f;border-radius:8px 8px 0 0;padding:28px 32px 24px;">
    <div style="font-family:monospace;font-size:10px;letter-spacing:0.25em;color:#63b3ed;font-weight:700;">◈ MERIDIAX</div>
    <div style="font-family:monospace;font-size:8px;letter-spacing:0.18em;color:#2d4a6e;margin-top:3px;">MERIDIAX TERMINAL</div>
    <div style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#e2e8f0;margin-top:20px;letter-spacing:0.01em;">${label}</div>
    <div style="font-family:monospace;font-size:9px;color:#4a6080;margin-top:6px;letter-spacing:0.06em;">${dateStr}</div>
    <div style="height:1px;background:linear-gradient(90deg,#63b3ed44,transparent);margin-top:20px;"></div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#070e1c;border:1px solid #1e3a5f;border-top:none;padding:24px 24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0">${items}</table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#060d1a;border:1px solid #1e3a5f;border-top:none;border-radius:0 0 8px 8px;padding:20px 32px;text-align:center;">
    <div style="font-family:monospace;font-size:8px;color:#2d4a6e;letter-spacing:0.1em;line-height:1.8;">
      MERIDIAX · AI-POWERED ANALYSIS<br>
      Content generated by Gemini AI for informational purposes only. Not financial advice.<br>
      <span style="color:#1e3a5f;">─────────────────────────────────────────</span>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateNewsletterText(data) {
  const lines = ['MERIDIAX', '='.repeat(40), ''];
  (data.items||[]).forEach(item => {
    lines.push(`[${item.rank}] ${item.impact||'LOW'} | ${item.region||''} | ${item.source||''}`);
    lines.push(item.title||'');
    lines.push(item.summary||'');
    if (item.implication) lines.push(`► ${item.implication}`);
    lines.push('');
  });
  lines.push('─'.repeat(40));
  lines.push('Meridiax — AI-powered analysis. Not financial advice.');
  return lines.join('\n');
}

// ── Newsletter auto-notify ─────────────────────────────────────────
export function checkNewsletterAutoNotify() {
  const today = todayKey();
  const week  = weekKey();
  const needsDaily  = _nlSubDaily  && _nlEmail && storageGet('gmi_nl_sent_daily')  !== today;
  const needsWeekly = _nlSubWeekly && _nlEmail && storageGet('gmi_nl_sent_weekly') !== week;
  const tab = needsDaily ? 'daily' : needsWeekly ? 'weekly' : null;
  if (!tab) return;

  const label = tab === 'daily' ? `Daily Capsule (${today})` : 'Weekly Digest';

  if (ejsConfigured()) {
    setTimeout(async () => {
      try {
        showToast(`Preparing your ${label}…`, null, 30000);
        const sKey = digestStorageKey(tab);
        let data = _digestCache[sKey];
        if (!data) {
          try { const s = storageGet(sKey); if (s) data = JSON.parse(s); } catch(_) {}
        }
        if (!data) { await loadDigestTab(tab, false); data = _digestCache[sKey]; }
        if (!data) throw new Error('Could not generate digest');
        dismissToast();
        await ejsSend(tab, data);
        showToast(`✓ ${label} sent to ${_nlEmail}`, null, 6000);
      } catch(err) {
        dismissToast();
        showToast(
          `Auto-send failed: ${err.message}`,
          () => sendOrPreviewNewsletter(tab, 'mail'),
          8000
        );
      }
    }, 4000);
  } else if (_nlEmail) {
    setTimeout(() => showToast(
      `Your ${label} is ready.`,
      () => sendOrPreviewNewsletter(tab, 'mail'),
      8000
    ), 3000);
  }
}

// ── Toast helpers (duplicated here for use in checkNewsletterAutoNotify) ──
let _toastTimer = null;

function dismissToast() {
  const toast = document.getElementById('mrx-toast');
  toast?.classList.remove('show');
  clearTimeout(_toastTimer);
}

// ── Opportunities ──────────────────────────────────────────────────
function oppCacheKey(horizon) {
  const sess = loadSession();
  const timeKey = horizon === 'DAY' ? todayKey() : weekKey();
  return `gmi_opp_${horizon}_${sess?.username||'anon'}_${timeKey}`;
}

export async function loadOpportunitiesTab(forceRefresh) {
  if (!apiKey) { requireApiKey(() => loadOpportunitiesTab(forceRefresh), 'Opportunities'); return; }
  _showProfileBody();
  _profileTab = 'opportunities';
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'opportunities'));
  const body = document.getElementById('profile-body');
  const sKey = oppCacheKey(_oppHorizon);

  const horizonHtml = `
    <div class="opp-horizon-row">
      <span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);margin-right:4px;line-height:2;">HORIZON:</span>
      ${OPP_HORIZONS.map(h => `<button class="opp-horizon-btn${_oppHorizon===h?' active':''}" data-horizon="${h}">${h}</button>`).join('')}
      <button class="opp-horizon-btn" id="opp-refresh-btn" style="margin-left:auto;">↺ REFRESH</button>
    </div>`;

  if (!forceRefresh && _oppCache[sKey]) {
    body.innerHTML = horizonHtml + renderOpportunitiesHTML(_oppCache[sKey]);
    wireOppEvents(body, sKey);
    return;
  }
  if (!forceRefresh) {
    try {
      const stored = storageGet(sKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        _oppCache[sKey] = parsed;
        body.innerHTML = horizonHtml + renderOpportunitiesHTML(parsed);
        wireOppEvents(body, sKey);
        return;
      }
    } catch(_) {}
  }

  body.innerHTML = horizonHtml + '<div class="opp-loading"><span class="spin"></span> &nbsp;Analysing markets for ' + _oppHorizon.toLowerCase() + ' opportunities…</div>';
  wireOppEvents(body, sKey);

  const wlNames = watchlist.map(w => `${w.name}(${w.type}${w.sentiment?','+w.sentiment:''})`).slice(0,6);
  const recentCountries = [...new Set(Object.values(cache).map(v=>v._meta?.name).filter(Boolean))].slice(0,5);
  const horizonDesc = {DAY:'intraday to next 24 hours',WEEK:'1–5 trading days',MONTH:'2–6 weeks',THEMES:'thematic / structural (3–12 months)'}[_oppHorizon]||_oppHorizon;

  const cacheContext = Object.entries(cache)
    .filter(([, v]) => v._meta && typeof v.score === 'number')
    .slice(0, 5)
    .map(([, v]) => `${v._meta.name}: score ${v.score >= 0 ? '+' : ''}${v.score} (${v.sentiment}, ${v.regime || '—'}, rate: ${v.rate_outlook || '—'})`)
    .join('; ');
  const macroCtxBlock = cacheContext
    ? `\nCurrent macro assessments from user's recent analyses: ${cacheContext}\n`
    : '';

  const oppToday = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prompt = `Today is ${oppToday}. You are a senior macro portfolio strategist. Generate 8 actionable investment opportunities for a ${horizonDesc} horizon.
Watchlist: ${wlNames.join(', ')||'none'}. Analysed: ${recentCountries.join(', ')||'none'}.${macroCtxBlock}
Each: specific instrument, directional bias, precise entry, stop, target. Derive thesis from user's macro data where relevant.

Respond with ONLY valid JSON. No markdown, no code fences. Exact structure:
{
  "horizon": "${_oppHorizon}",
  "generated": "${todayKey()}",
  "opportunities": [{"rank": 1, "direction": "LONG|SHORT|NEUTRAL", "asset_class": "Equities|Fixed Income|FX|Commodities|Crypto|Multi-Asset", "asset": "specific ticker or pair", "region": "region or country", "horizon_tag": "${_oppHorizon}", "title": "trade title max 12 words", "thesis": "3 sentences: catalyst, mispricing, entry rationale", "entry_level": "specific price/yield/spread or break condition", "stop_level": "invalidation level with rationale", "target_level": "price target with timeframe", "risk_reward": "e.g. 1:2.5", "position_size_note": "sizing context", "conviction": 0.75, "key_risk": "risk with magnitude, max 20 words", "correlation_risk": "correlated asset risk, max 12 words", "catalyst_trigger": "dated event or release, max 12 words", "source": "institution or data source"}]
}`;

  try {
    const raw = await callLLM(
      'You are a senior macro portfolio strategist. Output only valid JSON. No markdown.',
      prompt, 2000, 0.3
    );
    const result = repairAndParseJSON(raw);
    if (!result || !Array.isArray(result.opportunities)) throw new Error('Invalid opportunities response');
    _oppCache[sKey] = result;
    try { storageSet(sKey, JSON.stringify(result)); } catch(_) {}
    const bodyEl = document.getElementById('profile-body');
    bodyEl.innerHTML = horizonHtml + renderOpportunitiesHTML(result);
    wireOppEvents(bodyEl, sKey);
  } catch(err) {
    const bodyEl = document.getElementById('profile-body');
    bodyEl.innerHTML = horizonHtml + `<div class="opp-empty">Failed to generate opportunities: ${err.message}<br><br><button class="opp-horizon-btn" onclick="loadOpportunitiesTab(true)">↺ RETRY</button></div>`;
    wireOppEvents(bodyEl, sKey);
  }
}

export function renderOpportunitiesHTML(data) {
  if (!data || !Array.isArray(data.opportunities) || data.opportunities.length === 0) {
    return '<div class="opp-empty">No opportunities available. Try refreshing.</div>';
  }
  const cards = data.opportunities.map(opp => {
    const dir = (opp.direction||'NEUTRAL').toUpperCase();
    const conviction = Math.min(1, Math.max(0, opp.conviction || 0.5));
    const pct = Math.round(conviction * 100);
    const sourceQ = encodeURIComponent(`${opp.catalyst || opp.asset} ${opp.source}`);
    const sourceUrl = `https://www.google.com/search?q=${sourceQ}`;
    return `
    <div class="opp-card">
      <div class="opp-card-top">
        <span class="opp-dir ${dir}">${dir}</span>
        <span class="opp-asset">${opp.asset_class||'—'}</span>
        <span class="opp-region">${opp.region||'—'}</span>
        <span class="opp-horizon-tag">${opp.horizon_tag||''}</span>
      </div>
      <div class="opp-title">${opp.asset ? `<span style="color:var(--cyan)">${opp.asset}</span> — ` : ''}${opp.title||'—'}</div>
      <div class="opp-thesis">${opp.thesis||'—'}</div>
      <div class="opp-conviction-row">
        <span class="opp-conviction-label">CONVICTION</span>
        <div class="opp-conviction-bar"><div class="opp-conviction-fill" style="width:${pct}%"></div></div>
        <span class="opp-conviction-pct">${pct}%</span>
      </div>
      ${opp.key_risk ? `<div class="opp-risk">${opp.key_risk}</div>` : ''}
      <div class="opp-source-row">
        <span class="opp-source-label">SOURCE:</span>
        <span class="opp-source-name">${opp.source || (opp.catalyst ? 'Market data' : '—')}</span>
        <a class="opp-source-link" href="${sourceUrl}" target="_blank" rel="noopener">RESEARCH ↗</a>
      </div>
    </div>`;
  }).join('');
  return `<div class="opp-grid">${cards}</div>`;
}

export function wireOppEvents(body, sKey) {
  body.querySelectorAll('.opp-horizon-btn[data-horizon]').forEach(btn => {
    btn.addEventListener('click', () => {
      _oppHorizon = btn.dataset.horizon;
      storageSet('gmi_opp_horizon', _oppHorizon);
      loadOpportunitiesTab(false);
    });
  });
  body.querySelector('#opp-refresh-btn')?.addEventListener('click', () => loadOpportunitiesTab(true));
}

// ── Wire profile events ────────────────────────────────────────────
export function wireProfileEvents() {
  document.getElementById('topbar-username')?.addEventListener('click', openProfile);

  document.getElementById('profile-close')?.addEventListener('click', closeProfile);

  document.getElementById('profile-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('profile-overlay')) closeProfile();
  });

  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => loadDigestTab(tab.dataset.tab, false));
  });

  document.querySelectorAll('.pr-region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pr-region-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveUserRegion(btn.dataset.region);
    });
  });
}

window.openProfile   = openProfile;
window.closeProfile  = closeProfile;
window.wireProfileEvents = wireProfileEvents;
window.checkNewsletterAutoNotify = checkNewsletterAutoNotify;
window.loadDigestTab = loadDigestTab;
window.loadOpportunitiesTab = loadOpportunitiesTab;
window.showApiSettings = showApiSettings;
