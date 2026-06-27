// src/panels/authority.js — Authority Publications panel
import { AUTHORITY_INFO, AUTHORITY_URLS, CACHE_TTL, authCacheTs } from '../core/constants.js';
import {
  authorityOpen, setAuthorityOpen, authorityCache, activeId, currentCountryMeta, cache, _authInFlight
} from '../core/state.js';
import { callLLM, requireApiKey } from '../api/llm.js';
import { closeTruncated } from '../api/sentiment.js';

export function getAuthorityInfo(meta) {
  const id = meta._id || '';
  return AUTHORITY_INFO[id] || {
    authority: meta.name + ' Central Bank & Finance Ministry',
    lang: 'English'
  };
}

export function toggleAuthority() {
  setAuthorityOpen(!authorityOpen);
  document.getElementById('auth-arrow').className = authorityOpen ? 'open' : '';
  const list = document.getElementById('auth-list');
  list.className = authorityOpen ? 'open' : '';
  if (authorityOpen && activeId) {
    const label = document.getElementById('auth-label');
    if (authorityCache[activeId]) {
      renderAuthorityPubs(authorityCache[activeId], label);
      const age = Date.now() - (authCacheTs[activeId] || 0);
      if (age > CACHE_TTL.authority && !_authInFlight.has(activeId)) loadAuthorityPubs(activeId);
    } else {
      loadAuthorityPubs(activeId);
    }
  }
}

export async function loadAuthorityPubs(key) {
  if (_authInFlight.has(key)) return;
  _authInFlight.add(key);
  const list = document.getElementById('auth-list');
  const label = document.getElementById('auth-label');
  list.innerHTML = '<div style="padding:10px 14px;font-family:var(--font-mono);font-size:10px;color:var(--text2);"><span class="spin"></span> &nbsp;Loading publications...</div>';
  label.textContent = '📋  Loading...';

  if (authorityCache[key]) {
    renderAuthorityPubs(authorityCache[key], label);
    const age = Date.now() - (authCacheTs[key] || 0);
    if (age <= CACHE_TTL.authority) { _authInFlight.delete(key); return; }
    list.innerHTML = '';
  }

  const meta = currentCountryMeta || cache[key]?._meta;
  if (!meta) { list.innerHTML = '<div style="padding:10px 14px;color:var(--text2);">Select a country first.</div>'; _authInFlight.delete(key); return; }

  const authInfo = getAuthorityInfo(meta);
  const baseUrl = AUTHORITY_URLS[meta._id || ''] || '#';
  const prompt = `Synthesise 3 representative publications from ${authInfo.authority} (${meta.name}) based on their known focus. AI-synthesized — do not assert as verbatim. Focus on market-moving: rate decisions, inflation reports, financial stability reviews, monetary policy minutes, regulatory guidance.

JSON array of 3: [{"type":"Policy Statement|Economic Report|Speech|Press Release|Regulatory Notice|Working Paper","title":"≤18 words — ${meta.name} theme with policy angle","date":"Month YYYY","summary":"2 sentences: (1) policy message, (2) implication for local rates/FX/equities — ≤45 words","impact":"HIGH|MEDIUM|LOW","market_signal":"rate path or asset signal, max 8 words"}]
No markdown. No url field.`;

  try {
    let raw = await callLLM('Output only a raw JSON array. No markdown. No code fences. No trailing commas.', prompt, 1000);
    const arrStart = raw.indexOf('['), arrEnd = raw.lastIndexOf(']');
    raw = arrEnd > arrStart && arrStart >= 0 ? raw.slice(arrStart, arrEnd + 1) : arrStart >= 0 ? raw.slice(arrStart) : raw;
    raw = raw.replace(/,(\s*[\]}])/g, '$1');
    let pubs;
    try { pubs = JSON.parse(raw); } catch (_) { pubs = JSON.parse(closeTruncated(raw)); }
    authorityCache[key]  = { pubs, authority: authInfo.authority, baseUrl };
    authCacheTs[key]     = Date.now();
    renderAuthorityPubs({ pubs, authority: authInfo.authority, baseUrl }, label);
  } catch (err) {
    list.innerHTML = `<div style="padding:10px 14px;font-family:var(--font-mono);font-size:10px;color:var(--bear);">Error: ${err.message}</div>`;
    label.textContent = '📋  Failed to load';
  } finally {
    _authInFlight.delete(key);
  }
}

export function renderAuthorityPubs({ pubs, authority, baseUrl }, label) {
  const list = document.getElementById('auth-list');
  label.textContent = `📋  ${pubs.length} publications · ${authority}`;
  const typeClass = { 'Policy Statement':'policy', 'Economic Report':'report', 'Speech':'speech', 'Press Release':'release', 'Regulatory Notice':'release' };
  list.innerHTML = pubs.map(p => {
    const cls = typeClass[p.type] || 'release';
    const href = baseUrl || '#';
    return `
      <div class="auth-item">
        <div class="auth-top">
          <span class="auth-type ${cls}">${p.type || '—'}</span>
          <span class="auth-date">${p.date || '—'}</span>
        </div>
        <div class="auth-title">
          <a href="${href}" target="_blank" rel="noopener noreferrer"
             style="color:inherit;text-decoration:none;"
             onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color=''">${p.title || '—'} ↗</a>
        </div>
        <div class="auth-summary">${p.summary || '—'}</div>
        <div class="auth-authority">${authority}</div>
      </div>`;
  }).join('');
}

window.toggleAuthority = toggleAuthority;
