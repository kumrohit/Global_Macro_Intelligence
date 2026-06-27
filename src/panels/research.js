// src/panels/research.js — Research Hub panel
import { RESEARCH_SOURCES, RESEARCH_CAT_LABELS } from '../core/constants.js';
import { researchOpen, setResearchOpen, cache, activeId, apiKey } from '../core/state.js';
import { callLLM, requireApiKey } from '../api/llm.js';
import { loadSession, requireAuth } from '../auth/auth.js';
import { showToast } from '../utils/toast.js';

// Module-level state
let _researchSrc  = null;
const _researchCache = {};

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

export function openResearch() {
  if (!loadSession()?.username) { requireAuth(() => openResearch(), 'Sign in to access the Research Hub'); return; }
  if (!apiKey) { requireApiKey(() => openResearch(), 'Research Hub'); return; }
  setResearchOpen(true);
  document.getElementById('research-overlay').classList.add('open');
  document.getElementById('research-topbar-btn')?.classList.add('nav-active');
  if (!_researchSrc) _researchSrc = 'gs';
  renderResearchSources();
  loadResearch(_researchSrc);
}

export function closeResearch() {
  setResearchOpen(false);
  document.getElementById('research-overlay').classList.remove('open');
  document.getElementById('research-topbar-btn')?.classList.remove('nav-active');
}

export function refreshResearch() {
  if (!_researchSrc) return;
  delete _researchCache[_researchSrc];
  renderResearchSources();
  loadResearch(_researchSrc);
}

export function renderResearchSources() {
  const col = document.getElementById('research-sources-col');
  if (!col) return;
  col.innerHTML = ['banks','hedge','official'].map(cat => {
    const srcs = RESEARCH_SOURCES.filter(s => s.cat === cat);
    return `<div class="research-cat-label">${RESEARCH_CAT_LABELS[cat]}</div>` +
      srcs.map(s =>
        `<button class="research-source-btn${_researchSrc===s.id?' active':''}" data-sid="${s.id}">
          <span class="research-source-dot" style="background:${s.color}"></span>
          ${escHtml(s.name)}
          ${_researchCache[s.id]?'<span class="research-cached-dot" title="Cached">✓</span>':''}
        </button>`
      ).join('');
  }).join('');
  col.querySelectorAll('.research-source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _researchSrc = btn.dataset.sid;
      col.querySelectorAll('.research-source-btn').forEach(b => b.classList.toggle('active', b.dataset.sid === _researchSrc));
      loadResearch(_researchSrc);
    });
  });
}

export function _extractResearchJSON(raw) {
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) throw new Error('No JSON object found in response');
  return JSON.parse(raw.slice(s, e + 1));
}

export function _articleLink(a, src) {
  if (a.directUrl) return a.directUrl;
  return src?.url || '#';
}

export function _isDirectLink(a) {
  return !!a.directUrl;
}

export async function _fetchRSSResearch(src) {
  const proxy = 'https://corsproxy.io/?url=';
  const res = await fetch(proxy + encodeURIComponent(src.rss), { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error('RSS fetch failed: ' + res.status);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const isAtom = doc.querySelector('feed') !== null;
  const entries = isAtom
    ? Array.from(doc.querySelectorAll('entry')).slice(0, 10)
    : Array.from(doc.querySelectorAll('item')).slice(0, 10);
  if (entries.length < 3) throw new Error('Too few RSS entries');
  const articles = entries.map(entry => {
    const getText = (...tags) => { for (const t of tags) { const n = entry.querySelector(t); if (n?.textContent?.trim()) return n.textContent.trim(); } return ''; };
    const title   = getText('title');
    const rawLink = isAtom ? (entry.querySelector('link[rel="alternate"]')?.getAttribute('href') || entry.querySelector('link')?.getAttribute('href') || getText('id')) : getText('link', 'guid');
    const desc    = getText('description', 'summary', 'content');
    const pubDate = getText('pubDate', 'published', 'updated', 'dc\\:date');
    let dateStr = '';
    if (pubDate) { try { const d = new Date(pubDate); if (!isNaN(d)) dateStr = d.toLocaleDateString('en-US',{month:'short',year:'numeric'}); } catch(_){} }
    return { title, directUrl: rawLink || null, date: dateStr, summary: desc.replace(/<[^>]+>/g,'').slice(0,400), themes:[], sentiment:'neutral', score:0, asset_class:'Macro' };
  }).filter(a => a.title);
  if (articles.length < 3) throw new Error('No usable articles in feed');
  return {
    institution: src.name,
    house_view: `Latest research publications from ${src.name}.`,
    key_calls: [],
    articles,
    disclaimer: `Live feed from ${src.name} — articles link directly to source`,
    _fromRss: true,
  };
}

export async function loadResearch(srcId) {
  const src = RESEARCH_SOURCES.find(s => s.id === srcId);
  if (!src) return;
  const el = document.getElementById('research-articles');
  if (!el) return;
  if (_researchCache[srcId]) { renderResearchArticles(_researchCache[srcId], srcId); return; }

  const showLoading = (msg) => {
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:48px 24px;font-family:var(--font-mono);font-size:11px;color:var(--text2);"><span class="spin"></span>&nbsp;${escHtml(msg)}</div>`;
  };

  const showError = (userMsg, hint, rawErr) => {
    el.innerHTML = `<div style="padding:48px 24px;text-align:center;font-family:var(--font-mono);">
      <div style="font-size:22px;margin-bottom:12px;">⚠</div>
      <div style="font-size:12px;color:#ef4444;margin-bottom:8px;letter-spacing:0.05em;">${escHtml(userMsg)}</div>
      ${hint?`<div style="font-size:10px;color:var(--text2);margin-bottom:20px;">${escHtml(hint)}</div>`:''}
      <button class="research-retry-btn" data-sid="${escHtml(srcId)}" style="font-family:var(--font-mono);font-size:10px;color:var(--accent);border:1px solid rgba(96,165,250,0.4);background:transparent;padding:6px 18px;border-radius:2px;cursor:pointer;letter-spacing:0.08em;">↺ TRY AGAIN</button>
      <div style="margin-top:16px;font-size:8px;color:var(--text3);opacity:0.5;">${escHtml(String(rawErr).slice(0,120))}</div>
    </div>`;
    el.querySelector('.research-retry-btn')?.addEventListener('click', e2 => {
      delete _researchCache[e2.target.dataset.sid];
      loadResearch(e2.target.dataset.sid);
    });
  };

  showLoading(`Loading ${src.name} research…`);

  if (src.rss) {
    try {
      showLoading(`Fetching live publications from ${src.name}…`);
      const rssData = await _fetchRSSResearch(src);
      _researchCache[srcId] = rssData;
      renderResearchSources();
      renderResearchArticles(rssData, srcId);
      return;
    } catch(_) {
      showLoading(`Live feed unavailable — synthesising via AI…`);
    }
  }

  const today = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  const prompt = `Today is ${today}. You are synthesizing the likely research output from ${src.name} based on their known macro views, house style, and publicly available communications as of your training data.

Output ONLY a JSON object — no markdown, no code fences, no explanation. Structure:
{"institution":"${src.name}","house_view":"<current macro stance 1 sentence>","key_calls":["<call1>","<call2>","<call3>"],"articles":[{"title":"<representative research theme for ${src.name}'s known focus, 10-15 words — do NOT assert this as a verbatim report title>","date":"<Mon YYYY>","summary":"<2 sentences on findings and implications>","themes":["<tag1>","<tag2>"],"sentiment":"<bullish|bearish|neutral>","score":0.5,"asset_class":"<Macro|Equities|Fixed Income|FX|Commodities|Credit>"}],"disclaimer":"AI-synthesized from ${src.name} public communications — specific titles may not exist verbatim. Verify at ${src.url || src.name + ' website'}"}

Requirements:
- articles array: exactly 10 items, sorted newest-first, 2024-2025 period only
- title: representative research theme aligned to ${src.name}'s known analytical focus — clearly synthesized, NOT a verbatim title claim
- score: number between -1.0 and 1.0 (negative=bearish, positive=bullish)
`;

  try {
    const raw = await callLLM('You output only valid minified JSON. No markdown, no code fences, no extra text before or after the JSON object.', prompt, 4000, 0.4);
    const json = _extractResearchJSON(raw);
    if (!json.articles && !json.publications && !json.papers && !json.reports) {
      throw new Error('Response missing articles array — the model did not follow the required format');
    }
    _researchCache[srcId] = json;
    renderResearchSources();
    renderResearchArticles(json, srcId);
  } catch(e) {
    const msg = String(e);
    let userMsg = 'Could not load research briefs.';
    let hint = 'Try clicking ↺ TRY AGAIN — this usually resolves on retry.';
    if (/invalid api key|401|unauthori/i.test(msg)) {
      userMsg = 'Invalid API key.';
      hint = 'Check your API key in Profile → ⚙ API tab.';
    } else if (/quota|429|rate.?limit|exhausted/i.test(msg)) {
      userMsg = 'API quota exceeded.';
      hint = 'You have hit your usage limit. Wait a moment or check your plan.';
    } else if (/MAX_TOKENS|truncat/i.test(msg)) {
      userMsg = 'Response was cut short by the API.';
      hint = 'Click ↺ TRY AGAIN — a shorter response will come through.';
    } else if (/JSON|parse|Unexpected/i.test(msg)) {
      userMsg = 'AI returned an unexpected format.';
      hint = 'Click ↺ TRY AGAIN — this resolves on retry.';
    } else if (/fetch|network|Failed to fetch/i.test(msg)) {
      userMsg = 'Network error — could not reach the API.';
      hint = 'Check your internet connection and try again.';
    }
    showError(userMsg, hint, msg);
  }
}

export function renderResearchArticles(data, srcId) {
  const el = document.getElementById('research-articles');
  if (!el) return;
  const src = RESEARCH_SOURCES.find(s => s.id === (srcId || _researchSrc));
  const accentColor = src?.color || '#3b82f6';
  let html = '';
  if (data.house_view || data.key_calls?.length) {
    html += `<div class="research-house-card">
      <div class="aw-label" style="margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;">HOUSE VIEW — ${escHtml(data.institution || src?.name || '')}</div>
      ${data.house_view ? `<div class="research-house-view">${escHtml(data.house_view)}</div>` : ''}
      ${data.key_calls?.length ? `<div class="research-key-calls">${data.key_calls.map(c=>`<span class="research-call-chip">↗ ${escHtml(String(c))}</span>`).join('')}</div>` : ''}
    </div>`;
  }
  const articleList = data.articles || data.publications || data.papers || data.reports || data.research_papers || data.research_publications || data.items || [];
  if (!articleList.length) {
    html += `<div style="padding:40px;text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--text3);">No articles returned — click ↺ Refresh to retry.</div>`;
  }
  articleList.forEach((a, i) => {
    const sentClass = a.sentiment==='bullish'?'bullish':a.sentiment==='bearish'?'bearish':'neutral';
    const score = typeof a.score === 'number' ? Math.max(-1, Math.min(1, a.score)) : 0;
    const scoreW = Math.round(Math.abs(score) * 50);
    const scoreLeft = score >= 0 ? 50 : 50 - scoreW;
    const scoreColor = score > 0.1 ? '#10B981' : score < -0.1 ? '#EF4444' : '#64748b';
    html += `<div class="research-article-card" style="border-left-color:${accentColor}">
      <div class="research-article-header">
        <div class="research-article-title">
          <span class="research-article-num">#${i+1}</span>${escHtml(a.title||'—')}
        </div>
        <div class="research-article-meta">
          ${a.date?`<span class="research-article-date">${escHtml(a.date)}</span>`:''}
          ${a.asset_class?`<span class="research-article-class">${escHtml(a.asset_class)}</span>`:''}
        </div>
      </div>
      <div class="research-score-bar"><div class="research-score-fill" style="width:${scoreW}%;left:${scoreLeft}%;background:${scoreColor}"></div></div>
      <div class="research-article-summary">${escHtml(a.summary||'')}</div>
      <div class="research-article-footer">
        <div class="research-themes">${(a.themes||[]).map(t=>`<span class="research-theme-chip">${escHtml(String(t))}</span>`).join('')}</div>
        <div class="research-article-actions">
          <span class="research-sent-badge ${sentClass}">${(a.sentiment||'neutral').toUpperCase()}</span>
          ${_isDirectLink(a)
            ? `<a class="research-read-btn" href="${escHtml(_articleLink(a, src))}" target="_blank" rel="noopener noreferrer" title="Open article directly">OPEN ARTICLE →</a>`
            : `<a class="research-read-btn research-read-btn--search" href="https://www.google.com/search?q=${encodeURIComponent('"'+(a.title||'')+'" '+(src?.name||''))}" target="_blank" rel="noopener noreferrer" title="Search Google for this exact report title — finds the paper, PDF, or news coverage">FIND ARTICLE ↗</a>
               <a class="research-read-btn research-read-btn--search" href="${escHtml(src?.url||'#')}" target="_blank" rel="noopener noreferrer" title="Go to ${escHtml(src?.name||'institution')} research publications page">PUBLICATIONS →</a>`
          }
        </div>
      </div>
    </div>`;
  });
  if (data.disclaimer) html += `<div class="research-disclaimer">⚠ ${escHtml(data.disclaimer)}</div>`;
  el.innerHTML = html;
  const searchEl = document.getElementById('research-search-input');
  if (searchEl) {
    searchEl.value = '';
    searchEl.oninput = () => _filterResearchArticles(searchEl.value);
  }
}

export function _filterResearchArticles(q) {
  const cards = document.querySelectorAll('.research-article-card');
  const term = q.trim().toLowerCase();
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = !term || text.includes(term) ? '' : 'none';
  });
}

export function wireResearchEvents() {
  document.getElementById('research-topbar-btn')?.addEventListener('click', openResearch);
  document.getElementById('research-close-btn')?.addEventListener('click', closeResearch);
  document.getElementById('research-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('research-overlay')) closeResearch();
  });
}

window.openResearch = openResearch;
window.closeResearch = closeResearch;
window.wireResearchEvents = wireResearchEvents;
window.loadResearch = loadResearch;
window.refreshResearch = refreshResearch;
