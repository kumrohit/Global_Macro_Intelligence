// expand.js — shared expand-to-details helpers
import { callLLM } from '../api/llm.js';
import { expandCache } from '../core/state.js';

export async function loadExpandDetail(cacheKey, prompt, bodyEl) {
  if (expandCache[cacheKey]) { bodyEl.innerHTML = expandCache[cacheKey]; return; }
  bodyEl.innerHTML = '<span class="expand-loading"><span class="spin"></span> &nbsp;Loading analysis…</span>';

  try {
    const raw = await callLLM(
      'You are a concise financial analyst. Write 2–3 short paragraphs in plain English. No markdown, no JSON, no bullet lists. Max 150 words.',
      prompt, 350, 0.3
    );
    const html = raw.trim()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n\n+/g,'</p><p>').replace(/\n/g,' ');
    const wrapped = `<p>${html}</p>`;
    expandCache[cacheKey] = wrapped;
    bodyEl.innerHTML = wrapped;
  } catch(e) {
    bodyEl.innerHTML = `<span style="color:var(--bear)">Failed: ${e.message}</span>`;
  }
}

export function toggleExpand(btn, bodyEl, cacheKey, prompt) {
  const isOpen = bodyEl.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.textContent = isOpen ? '▴ COLLAPSE' : '▸ DETAILS';
  if (isOpen) loadExpandDetail(cacheKey, prompt, bodyEl);
}

// Window bridges
window.toggleExpand = toggleExpand;
window.loadExpandDetail = loadExpandDetail;
