// api/llm.js — unified LLM abstraction (Gemini + Claude + Pollinations free tier)
import { storageGet, storageSet } from '../core/storage.js';
import {
  apiKey, setApiKey,
  tickerTimer, setTickerTimer,
  _tickerVisibilityWired, setTickerVisibilityWired,
} from '../core/state.js';

export function detectProvider() {
  if (!apiKey) return null;
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-ant-') || apiKey.startsWith('sk-')) return 'claude';
  return 'unknown';
}

export function friendlyError(status, body) {
  const msg = body?.error?.message || body?.error?.type || '';
  if (status === 400) return `Bad request — check prompt format (${msg || 'HTTP 400'})`;
  if (status === 401) return 'Invalid API key — double-check you copied it correctly';
  if (status === 403) return 'API key not authorised — check key permissions or billing';
  if (status === 429) {
    const isQuota = /quota|exhausted|limit/i.test(msg);
    return isQuota
      ? 'Quota exceeded — you have hit your free-tier limit; upgrade your plan or wait for reset'
      : 'Rate limited — too many requests; please wait a moment and try again';
  }
  if (status === 500) return 'API server error (500) — try again in a moment';
  if (status === 503) return 'API temporarily unavailable (503) — try again shortly';
  return msg || `HTTP ${status}`;
}

let _apikeyGateCallback = null;

export function requireApiKey(callback, featureName) {
  if (apiKey) { callback(); return; }
  _apikeyGateCallback = callback;

  const title = document.getElementById('apikey-gate-title');
  if (title) title.textContent = `🔑 ${(featureName || 'This Feature').toUpperCase()} — API KEY REQUIRED`;

  const desc = document.getElementById('apikey-gate-desc');
  if (desc) desc.innerHTML =
    `<strong style="color:var(--text)">${featureName || 'This feature'}</strong> requires your own Gemini or Claude API key.<br>` +
    `<span style="color:var(--text2)">🆓 Country map analysis, news, authority links and community board stay free forever — no key needed.</span>`;

  const inp = document.getElementById('apikey-gate-input');
  const saved = storageGet('gmi_api_key') || '';
  if (inp) inp.value = saved;

  const err = document.getElementById('apikey-gate-error');
  if (err) { err.textContent = ''; err.style.display = 'none'; }
  document.getElementById('apikey-gate-overlay')?.classList.add('open');
  setTimeout(() => (saved ? null : document.getElementById('apikey-gate-input')?.focus()), 80);
}

export function closeApiKeyGate() {
  document.getElementById('apikey-gate-overlay').classList.remove('open');
  _apikeyGateCallback = null;
}

export function toggleApiKeyGateVis() {
  const inp = document.getElementById('apikey-gate-input');
  const btn = document.getElementById('apikey-gate-eye');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

export function saveApiKeyGate() {
  const v = (document.getElementById('apikey-gate-input')?.value || '').trim();
  const err = document.getElementById('apikey-gate-error');
  const provider = v.startsWith('AIza') ? 'gemini' : (v.startsWith('sk-ant-') || v.startsWith('sk-')) ? 'claude' : null;
  if (!provider) {
    if (err) { err.textContent = 'Unrecognised key format — use AIza… (Gemini) or sk-ant-… / sk-… (Claude)'; err.style.display = 'block'; }
    return;
  }
  setApiKey(v);
  storageSet('gmi_api_key', v);
  const ok = document.getElementById('api-ok');
  if (ok) { ok.textContent = provider === 'gemini' ? '✓ GEMINI ACTIVE' : '✓ CLAUDE ACTIVE'; ok.style.display = 'block'; setTimeout(() => ok.style.display = 'none', 4000); }
  const inp2 = document.getElementById('api-input');
  if (inp2) inp2.value = v;
  // loadTickers not yet extracted — bridge via window until Phase 4
  window.loadTickers?.();
  const currentTimer = tickerTimer;
  if (currentTimer) clearInterval(currentTimer);
  setTickerTimer(setInterval(() => window.loadTickers?.(), 300000));
  if (!_tickerVisibilityWired) {
    setTickerVisibilityWired(true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(tickerTimer); setTickerTimer(null); }
      else { window.loadTickers?.(); setTickerTimer(setInterval(() => window.loadTickers?.(), 300000)); }
    });
  }
  document.getElementById('apikey-gate-overlay').classList.remove('open');
  const cb = _apikeyGateCallback;
  _apikeyGateCallback = null;
  if (cb) setTimeout(cb, 180);
}

export async function callLLMFree(systemPrompt, userPrompt, maxTokens) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push({ role: 'user', content: userPrompt });
  const controller = new AbortController();
  const _t = setTimeout(() => controller.abort(), 32000);
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: msgs, private: true }),
      signal: controller.signal
    });
    clearTimeout(_t);
    if (!res.ok) throw new Error('Free AI is temporarily unavailable — add your own API key for reliable access.');
    let text = (await res.text()).trim();
    if (!text) throw new Error('Free AI returned an empty response — try again or add your own API key.');
    text = text.replace(/^```(?:json|js|javascript)?\s*/i, '').replace(/\s*```\s*$/, '');
    return text.trim();
  } catch(e) {
    clearTimeout(_t);
    if (e.name === 'AbortError') throw new Error('Free AI request timed out (30 s) — add your own API key for faster responses.');
    throw e;
  }
}

export async function callLLM(systemPrompt, userPrompt, maxTokens = 800, temperature = 0) {
  const provider = detectProvider();
  if (!provider) return callLLMFree(systemPrompt, userPrompt, maxTokens);
  if (provider === 'unknown') throw new Error('Unrecognised API key format — expected AIza… (Gemini) or sk-ant-… (Claude)');

  const ctrl = new AbortController();
  const _t = setTimeout(() => ctrl.abort(), 45000);

  try {
    if (provider === 'gemini') {
      const combined = systemPrompt ? systemPrompt + '\n\n' + userPrompt : userPrompt;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combined }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
            thinkingConfig: { thinkingBudget: 0 }
          }
        }),
        signal: ctrl.signal
      });
      clearTimeout(_t);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(friendlyError(res.status, data));
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
      if (!text) {
        const reason = data?.candidates?.[0]?.finishReason;
        throw new Error(reason === 'MAX_TOKENS'
          ? 'Response truncated — model ran out of tokens'
          : 'Gemini returned an empty response');
      }
      return text;
    }

    // Claude
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: ctrl.signal
    });
    clearTimeout(_t);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(friendlyError(res.status, data));
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error('Claude returned an empty response');
    return text.trim();
  } catch (e) {
    clearTimeout(_t);
    if (e.name === 'AbortError') throw new Error('Request timed out (45 s) — check your connection or try again');
    throw e;
  }
}

export async function callClaudeWithSearch(userPrompt, maxTokens, maxSearches = 3) {
  if (detectProvider() !== 'claude') {
    throw new Error('Live market data requires a Claude API key (sk-ant-…). Gemini does not support real-time search.');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches }],
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(friendlyError(res.status, data));
  return data;
}

// Window bridges — needed because llm.js functions are called via inline onclick
window.closeApiKeyGate     = closeApiKeyGate;
window.saveApiKeyGate      = saveApiKeyGate;
window.toggleApiKeyGateVis = toggleApiKeyGateVis;
