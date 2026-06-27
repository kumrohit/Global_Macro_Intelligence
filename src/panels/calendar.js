// src/panels/calendar.js — Economic Calendar panel
import { CB_SCHEDULE, CACHE_TTL } from '../core/constants.js';
import { calOpen, setCalOpen, calFilter } from '../core/state.js';
import { loadSession, requireAuth } from '../auth/auth.js';
import { callLLM } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';

const CAL_TTL = 12 * 60 * 60 * 1000; // 12-hour TTL

// Module-level calendar state
let _calCache = null;
let _calCacheTs = 0;
let _calFilter = 'all';

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

export function openCalendar() {
  if (!loadSession()?.username) { requireAuth(() => openCalendar(), 'Sign in to access the Economic Calendar'); return; }
  setCalOpen(true);
  document.getElementById('econ-cal-overlay').classList.add('open');
  const stale = !_calCache || (Date.now() - _calCacheTs > CAL_TTL);
  if (stale) loadCalendar();
  else renderCalendar(_calCache);
}

export function closeCalendar() {
  setCalOpen(false);
  document.getElementById('econ-cal-overlay').classList.remove('open');
}

export function ecalFilterClick(btn, f) {
  _calFilter = f;
  document.querySelectorAll('.ecal-filter').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  if (_calCache) renderCalendar(_calCache);
}

function _buildRecurringEvents(startDate, endDate) {
  const events = [];
  const s = new Date(startDate), e = new Date(endDate);

  function nthWeekday(year, month, n, weekday) {
    let count = 0, d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === weekday) { if (++count === n) return new Date(d); }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }
  function lastWeekday(year, month, weekday) {
    let d = new Date(year, month + 1, 0);
    while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
    return d;
  }
  function nearestWeekday(year, month, target) {
    let d = new Date(year, month, target);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  }

  const fmt = d => d ? d.toISOString().slice(0, 10) : null;
  const inRange = d => d && d >= s && d <= e;

  let cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    const yr = cur.getFullYear(), mo = cur.getMonth();

    const nfp = nthWeekday(yr, mo, 1, 5);
    if (inRange(nfp)) events.push({ date: fmt(nfp), time:'08:30 ET', name:'US Nonfarm Payrolls (NFP)', country:'US', category:'econ', importance:'high', consensus:'Est. 150k–200k', note:'' });

    const cpi = nearestWeekday(yr, mo, 13);
    if (inRange(cpi)) events.push({ date: fmt(cpi), time:'08:30 ET', name:'US CPI (monthly)', country:'US', category:'econ', importance:'high', consensus:'—', note:'' });

    const ppi = nearestWeekday(yr, mo, 14);
    if (inRange(ppi)) events.push({ date: fmt(ppi), time:'08:30 ET', name:'US PPI (monthly)', country:'US', category:'econ', importance:'medium', consensus:'—', note:'' });

    const pce = lastWeekday(yr, mo, 5);
    if (inRange(pce)) events.push({ date: fmt(pce), time:'08:30 ET', name:'US PCE Deflator', country:'US', category:'econ', importance:'high', consensus:'—', note:'' });

    if ([0,3,6,9].includes(mo)) {
      const gdp = lastWeekday(yr, mo, 3);
      if (inRange(gdp)) events.push({ date: fmt(gdp), time:'08:30 ET', name:'US GDP (advance)', country:'US', category:'econ', importance:'high', consensus:'—', note:'' });
    }

    const ism = nearestWeekday(yr, mo, 1);
    if (inRange(ism)) events.push({ date: fmt(ism), time:'10:00 ET', name:'US ISM Manufacturing PMI', country:'US', category:'econ', importance:'medium', consensus:'—', note:'' });

    cur.setMonth(cur.getMonth() + 1);
  }
  return events;
}

function buildEconCalendar(startStr, endStr) {
  const s = new Date(startStr), e = new Date(endStr);
  const fixed   = CB_SCHEDULE.filter(ev => ev.date >= startStr && ev.date <= endStr)
                              .map(ev => ({ ...ev, time:'TBD', consensus:'Est. no change', note:'' }));
  const rolling = _buildRecurringEvents(s, e);
  return [...fixed, ...rolling].sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadCalendar() {
  const body = document.getElementById('econ-cal-body');
  body.innerHTML = '<div id="econ-cal-loading"><span class="big-spin"></span><br><br>Loading calendar…</div>';
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const endDate = new Date(today); endDate.setDate(endDate.getDate() + 28);
  const endStr = endDate.toISOString().slice(0,10);

  const deterministicEvents = buildEconCalendar(todayStr, endStr);
  _calCache = deterministicEvents;
  _calCacheTs = Date.now();
  renderCalendar(_calCache);

  try {
    const eventSummary = deterministicEvents.map(e => `${e.date} ${e.name} (${e.country})`).join('\n');
    const sys = 'You are a macro calendar analyst. Output only valid JSON arrays.';
    const user = `For each of these known upcoming macro events, add a brief "note" (1 sentence why it matters for traders) and a "consensus" estimate where applicable. Return a JSON array with objects containing ONLY: date, note, consensus — do not change the dates or names.\n\nEvents:\n${eventSummary}\n\nReturn array length: ${deterministicEvents.length}`;
    const raw = await callLLM(sys, user, 1500, 0);
    const annotations = repairAndParseJSON(raw);
    if (Array.isArray(annotations)) {
      annotations.forEach(ann => {
        const ev = _calCache.find(e => e.date === ann.date && (!ann.name || e.name.includes(ann.name?.split(' ')[0])));
        if (ev) { ev.note = ann.note || ev.note; ev.consensus = ann.consensus || ev.consensus; }
      });
      renderCalendar(_calCache);
    }
  } catch(_) {}
}

export function renderCalendar(events) {
  const body = document.getElementById('econ-cal-body');
  if (!body) return;
  const filtered = events.filter(e => {
    if (_calFilter === 'all') return true;
    if (_calFilter === 'high') return e.importance === 'high';
    return e.category === _calFilter;
  });
  if (!filtered.length) {
    body.innerHTML = '<div style="padding:30px;text-align:center;font-family:var(--font-mono);font-size:11px;color:#545862;">No events for this filter.</div>';
    return;
  }
  const weeks = {};
  filtered.forEach(e => {
    const d = new Date(e.date + 'T12:00:00Z');
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((day === 0 ? 7 : day) - 1));
    const wKey = mon.toISOString().slice(0,10);
    if (!weeks[wKey]) weeks[wKey] = [];
    weeks[wKey].push(e);
  });
  const catLabels = { cb:'CB', econ:'DATA', mkt:'MKT' };
  let html = '';
  Object.keys(weeks).sort().forEach(wKey => {
    const mon = new Date(wKey + 'T12:00:00Z');
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
    html += `<div class="ecal-week">
      <div class="ecal-week-label">WEEK OF ${fmt(mon).toUpperCase()} — ${fmt(sun).toUpperCase()}</div>`;
    weeks[wKey].forEach(e => {
      const dateStr = new Date(e.date + 'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
      const catCls = `ecal-cat-${e.category||'econ'}`;
      const catLbl = catLabels[e.category] || 'EVENT';
      html += `<div class="ecal-event">
        <div class="ecal-date">${dateStr}<br><span style="font-size:7px;color:#545862">${e.time||'TBD'}</span></div>
        <div><div class="ecal-imp ${e.importance||'low'}"></div></div>
        <div class="ecal-info">
          <div class="ecal-name">${escHtml(e.name||'')}<span class="ecal-cat-pill ${catCls}">${e.country||''} · ${catLbl}</span></div>
          ${e.consensus ? `<div class="ecal-note">Est: ${escHtml(e.consensus)}</div>` : ''}
          ${e.note ? `<div class="ecal-note" style="color:#545862">${escHtml(e.note)}</div>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
  });
  body.innerHTML = html;
}

window.openCalendar = openCalendar;
window.closeCalendar = closeCalendar;
window.ecalFilterClick = ecalFilterClick;
