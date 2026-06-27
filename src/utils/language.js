// language.js — language toggle / translation helpers
import { callLLM, requireApiKey } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { AUTHORITY_INFO } from '../core/constants.js';
import {
  cache, activeId, langNative, setLangNative,
  newsOpen, authorityOpen, translationCache,
  currentCountryMeta,
} from '../core/state.js';
import { renderPanel } from '../panels/panel.js';

export function getLangInfo() {
  if (!currentCountryMeta) return { lang: 'English', code: 'EN' };
  const info = AUTHORITY_INFO[currentCountryMeta._id || ''];
  if (!info || info.lang === 'English') return { lang: 'English', code: 'EN' };
  const code = info.lang.substring(0, 2).toUpperCase();
  return { lang: info.lang, code };
}

export async function toggleLanguage() {
  const { lang, code } = getLangInfo();
  if (code === 'EN') return; // English-only country, nothing to do

  const newVal = !langNative;
  setLangNative(newVal);
  const btn = document.getElementById('lang-btn');
  const note = document.getElementById('native-note');

  if (!newVal) {
    btn.className = '';
    btn.textContent = `🌐 EN`;
    note.className = '';
    restoreEnglish(); // restore all panel fields + chips
    return;
  }

  btn.className = 'active';
  btn.textContent = `🌐 ${code}`;
  note.className = 'show';
  note.textContent = `Translating to ${lang}…`;

  const data = cache[activeId];
  if (!data) {
    note.textContent = `No analysis loaded to translate`;
    setLangNative(false);
    btn.className = '';
    btn.textContent = '🌐 EN';
    return;
  }

  const transCacheKey = activeId + '|' + lang;
  if (translationCache[transCacheKey]) {
    applyTranslation(translationCache[transCacheKey], lang);
    return;
  }

  try {
    // Collect all visible text to translate in one call
    const toTranslate = {
      rationale:    data.rationale    || '',
      key_risk:     data.key_risk     || '',
      regime:       data.regime       || '',
      equity_bias:  data.equity_bias  || '',
      rate_outlook: data.rate_outlook || '',
      fx_bias:      data.fx_bias      || '',
      risk_level:   data.risk_level   || '',
      sentiment_label: data.sentiment === 'bullish' ? 'BULLISH' : data.sentiment === 'bearish' ? 'BEARISH' : 'NEUTRAL'
    };

    // Include visible news items if the news section is open
    const newsList = document.getElementById('news-list');
    const newsItems = newsList && newsOpen ? [...newsList.querySelectorAll('.ni')] : [];
    if (newsItems.length) {
      toTranslate.news = newsItems.map((el, i) => ({
        title:   el.querySelector('.ni-title')?.textContent?.trim() || '',
        summary: el.querySelector('.ni-sum')?.textContent?.trim()   || ''
      }));
    }

    // Include visible authority publications if open
    const authList = document.getElementById('auth-list');
    const authItems = authList && authorityOpen ? [...authList.querySelectorAll('.auth-item')] : [];
    if (authItems.length) {
      toTranslate.authority_pubs = authItems.map(el => ({
        title:   el.querySelector('.auth-title')?.childNodes?.[0]?.textContent?.trim() || '',
        summary: el.querySelector('.auth-summary')?.textContent?.trim() || ''
      }));
    }

    const prompt = `Translate the following English financial content to ${lang}. Rules:
- Keep numbers, ticker symbols, institution names, proper nouns, and financial metric names exactly as-is
- Translate descriptive words (e.g. "Overweight"→ native equivalent, "Cutting"→ native, "Bullish"→ native)
- For "news" and "authority_pubs" arrays: translate each title and summary
- Return ONLY a JSON object with the same keys and structure

${JSON.stringify(toTranslate, null, 1)}`;

    const raw = await callLLM(
      'You are a professional financial translator. Preserve all JSON structure exactly. Output only raw JSON.',
      prompt, 2000
    );
    const result = repairAndParseJSON(raw);
    translationCache[transCacheKey] = result;
    applyTranslation(result, lang, data);
  } catch (err) {
    note.textContent = `Translation failed: ${err.message}`;
  }
}

export function applyTranslation(result, lang, originalData) {
  // Core sentiment fields
  if (result.rationale) document.getElementById('rationale').textContent = result.rationale;
  if (result.key_risk)  document.getElementById('c-kr').textContent = result.key_risk;

  // Sentiment badge
  if (result.sentiment_label) {
    const badge = document.getElementById('sent-badge');
    const orig = originalData || cache[activeId] || {};
    const icons = { bullish:'▲', bearish:'▼', neutral:'◆' };
    const icon = icons[orig.sentiment] || '◆';
    badge.textContent = `${icon} ${result.sentiment_label}`;
  }

  // Regime pill (keep original CSS class for colour, translate text only)
  if (result.regime) {
    const rc = { Goldilocks:'rp-goldilocks', Reflation:'rp-reflation', Stagflation:'rp-stagflation', Recession:'rp-recession' };
    const orig = originalData || cache[activeId] || {};
    const cls = rc[orig.regime] || 'rp-goldilocks';
    document.getElementById('regime-pill').innerHTML =
      `<span class="regime-pill ${cls}">${result.regime}</span>`;
  }

  // Chip values (display-only translation — CSS classes preserved from original render)
  const chipMap = {
    equity_bias: 'c-eq', rate_outlook: 'c-rt',
    fx_bias: 'c-fx', risk_level: 'c-rk'
  };
  Object.entries(chipMap).forEach(([key, id]) => {
    if (result[key]) document.getElementById(id).textContent = result[key];
  });

  // News items (if present in translation)
  if (result.news && Array.isArray(result.news)) {
    const niEls = document.getElementById('news-list').querySelectorAll('.ni');
    result.news.forEach((n, i) => {
      if (!niEls[i]) return;
      const titleEl = niEls[i].querySelector('.ni-title a') || niEls[i].querySelector('.ni-title');
      if (titleEl && n.title) titleEl.textContent = n.title;
      const sumEl = niEls[i].querySelector('.ni-sum');
      if (sumEl && n.summary) sumEl.textContent = n.summary;
    });
  }

  // Authority publication items
  if (result.authority_pubs && Array.isArray(result.authority_pubs)) {
    const authEls = document.getElementById('auth-list').querySelectorAll('.auth-item');
    result.authority_pubs.forEach((p, i) => {
      if (!authEls[i]) return;
      const titleEl = authEls[i].querySelector('.auth-title a') || authEls[i].querySelector('.auth-title');
      if (titleEl && p.title) {
        // Preserve the link if present
        if (titleEl.tagName === 'A') titleEl.textContent = p.title + ' ↗';
        else titleEl.textContent = p.title;
      }
      const sumEl = authEls[i].querySelector('.auth-summary');
      if (sumEl && p.summary) sumEl.textContent = p.summary;
    });
  }

  const note = document.getElementById('native-note');
  note.className = 'show';
  note.textContent = `Displaying in ${lang} · click 🌐 EN to restore English`;
}

// Restore all English text fields from original cached data
export function restoreEnglish() {
  const data = cache[activeId];
  if (!data) return;
  if (data.rationale) document.getElementById('rationale').textContent = data.rationale;
  if (data.key_risk)  document.getElementById('c-kr').textContent = data.key_risk;
  // Re-render the full panel to restore all fields cleanly
  renderPanel(data);
  // Restore news if open
  if (newsOpen) {
    const list = document.getElementById('news-list');
    // Re-render news from original DOM is complex — reload it
    // Simply mark label to re-trigger if needed
  }
}

// Window bridges
window.toggleLanguage = toggleLanguage;
