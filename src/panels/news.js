// src/panels/news.js — News panel
import {
  cache, newsCache, activeId, newsOpen, setNewsOpen, _newsInFlight
} from '../core/state.js';
import { newsCacheTs, CACHE_TTL } from '../core/constants.js';
import { callLLM } from '../api/llm.js';
import { closeTruncated } from '../api/sentiment.js';
import { toggleExpand } from '../utils/expand.js';

export function toggleNews() {
  setNewsOpen(!newsOpen);
  document.getElementById('news-arrow').className = newsOpen ? 'open' : '';
  const list = document.getElementById('news-list');
  list.className = newsOpen ? 'open' : '';
  if (newsOpen && list.innerHTML === '' && activeId) loadNews(activeId);
}

export function renderNewsArticles(articles, label, list, key) {
  const countryName = (cache[key]?._meta?.name) || 'this country';
  label.textContent = `📰  ${articles.length} headlines`;
  list.innerHTML = articles.map((a, idx) => `
    <div class="ni">
      <div class="ni-top">
        <span class="ni-imp ${a.impact}">${a.impact}</span>
        <span class="ni-src">${a.source}</span>
        <span class="ni-time">${a.time}</span>
      </div>
      <div class="ni-title"><a href="https://www.google.com/search?q=${encodeURIComponent(a.title + ' ' + (a.source || ''))}" target="_blank" rel="noopener">${a.title}</a></div>
      <div class="ni-sum">${a.summary}</div>
      <button class="expand-btn" data-ni="${idx}">▸ DETAILS</button>
      <div class="expand-body" id="ni-exp-${idx}"></div>
    </div>
  `).join('');
  list.querySelectorAll('.expand-btn[data-ni]').forEach(btn => {
    const idx = +btn.dataset.ni;
    const a   = articles[idx];
    const bodyEl = document.getElementById(`ni-exp-${idx}`);
    btn.addEventListener('click', () => {
      const cKey   = `news|${a.title}`;
      const prompt = `You are a macro trader at a global macro hedge fund. Headline just crossed: "${a.title}". Context: ${a.summary}. Country: ${countryName}. Analyse market implications in 4 points: (1) IMMEDIATE IMPACT: which specific assets move first (equities, bonds, currency, credit spreads) and direction — give approximate magnitude; (2) 48-HOUR POSITIONING: how will institutional desks reposition — crowded trades unwound, what gets added; (3) CROSS-ASSET CONTAGION: secondary effects on correlated markets (regional peers, risk-on/off, commodities, USD); (4) KEY LEVEL TO WATCH: one specific technical or fundamental level whose breach confirms or invalidates the thesis. Use price/yield/spread terms. Avoid vague phrases. Max 180 words.`;
      toggleExpand(btn, bodyEl, cKey, prompt);
    });
  });
}

export async function loadNews(key) {
  if (_newsInFlight.has(key)) return;

  const list  = document.getElementById('news-list');
  const label = document.getElementById('news-label');

  if (newsCache[key]) {
    renderNewsArticles(newsCache[key], label, list, key);
    const age = Date.now() - (newsCacheTs[key] || 0);
    if (age <= CACHE_TTL.news) return;
  }

  _newsInFlight.add(key);
  if (!newsCache[key]) {
    list.innerHTML = '<div style="padding:12px 14px;font-family:var(--font-mono);font-size:10px;color:var(--text2);"><span class="spin"></span> &nbsp;Loading headlines...</div>';
    label.textContent = '📰  Loading...';
  }

  const cached = cache[key];
  const meta = cached?._meta;
  const topics = cached?.news_topics?.join(', ') || (meta?.name + ' economy');

  const countryName = meta?.name || 'this country';
  const prompt = `Today is ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}. Generate 4 market-moving financial news headlines for ${countryName} covering: ${topics}. Each must include a specific number or institution. Prioritise: CB rate decisions (exact bps), CPI/GDP vs consensus, fiscal/political risk, trade/sanctions.
JSON array of 4: [{"title":"≤18 words with specific figure or institution","source":"real outlet (Reuters, Bloomberg, FT, WSJ, Nikkei, Caixin)","time":"1h ago|2h ago|3h ago|6h ago|12h ago","impact":"HIGH|MEDIUM|LOW","summary":"affected asset and direction, ≤25 words","asset_impact":"primary instrument e.g. EUR/USD, FTSE 100 — max 5 words"}]
No markdown. No url field.`;

  try {
    let raw = await callLLM('Output only a raw JSON array. No markdown. No code fences. No trailing commas.', prompt, 1200);
    const arrStart = raw.indexOf('[');
    const arrEnd   = raw.lastIndexOf(']');
    raw = arrEnd > arrStart && arrStart >= 0
      ? raw.slice(arrStart, arrEnd + 1)
      : arrStart >= 0 ? raw.slice(arrStart) : raw;
    raw = raw.replace(/,(\s*[\]}])/g, '$1');
    let articles;
    try { articles = JSON.parse(raw); } catch (_) {
      articles = JSON.parse(closeTruncated(raw));
    }
    newsCache[key]   = articles;
    newsCacheTs[key] = Date.now();
    renderNewsArticles(articles, label, list, key);
  } catch(err) {
    if (!newsCache[key]) {
      list.innerHTML = `<div style="padding:12px 14px;font-family:var(--font-mono);font-size:10px;color:var(--bear);">Error: ${err.message}</div>`;
      label.textContent = '📰  Failed to load';
    }
  } finally {
    _newsInFlight.delete(key);
  }
}

export async function loadNewsBackground(key, meta) {
  if (_newsInFlight.has(key) || newsCache[key]) return;
  _newsInFlight.add(key);
  const countryName = meta?.name || 'this country';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const bgPrompt = `Today is ${today}. Generate 4 data-rich financial news headlines for ${countryName}. Each must include a specific number, institution name, or named policy action. Focus on: CB rate decisions (exact bps), CPI/GDP vs consensus, political/fiscal developments, trade/geopolitical events.
JSON array of 4: [{"title":"≤18 words with specific figure or institution","source":"real financial outlet","time":"Xh ago","impact":"HIGH|MEDIUM|LOW","summary":"affected market instrument and expected direction, ≤25 words"}]
No markdown. No url field.`;
  try {
    let raw = await callLLM('Output only a raw JSON array. No markdown. No code fences. No trailing commas.', bgPrompt, 1200);
    const arrStart = raw.indexOf('['), arrEnd = raw.lastIndexOf(']');
    raw = arrEnd > arrStart && arrStart >= 0 ? raw.slice(arrStart, arrEnd + 1) : raw;
    raw = raw.replace(/,(\s*[\]}])/g, '$1');
    const articles = JSON.parse(raw);
    newsCache[key]   = articles;
    newsCacheTs[key] = Date.now();
  } catch(_) {
    // silent
  } finally {
    _newsInFlight.delete(key);
  }
}

window.toggleNews = toggleNews;
window.loadNewsBackground = loadNewsBackground;
