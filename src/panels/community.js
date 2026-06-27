// src/panels/community.js — Community Board panel
import { storageGet, storageSet, storageRemove } from '../core/storage.js';
import { commOpen, setCommOpen } from '../core/state.js';
import { loadSession, requireAuth } from '../auth/auth.js';
import { callLLM } from '../api/llm.js';
import { repairAndParseJSON } from '../api/sentiment.js';
import { showToast } from '../utils/toast.js';

// ── Constants ──────────────────────────────────────────────────────
const COMM_LOCAL_KEY  = 'gmi_comm_local_posts';
const COMM_OWNERS_KEY = 'gmi_comm_owners';
const COMM_FB_KEY     = 'gmi_comm_fb_config';
const COMM_COLL       = 'gmi-community-posts';
const COMM_MAX_CHARS  = 600;
const COMM_MAX_POSTS  = 200;

// ── Module-level state ─────────────────────────────────────────────
let _commTab          = 'feed';
let _commTag          = null;
let _commSort         = 'newest';
let _commOwners       = [];
let _fbApp            = null;
let _fbDb             = null;
let _commUnsubPosts   = null;
let _commLocalPosts   = [];
let _commAllPosts     = [];
let _commTsInterval   = null;
let _fbSdkLoading     = false;
let _commPulseRunning = false;
let _commPosting      = false;

// ── Escape helper ──────────────────────────────────────────────────
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

// ── Firebase helpers ───────────────────────────────────────────────
export function loadFbConfig() {
  try { return JSON.parse(storageGet(COMM_FB_KEY) || 'null'); } catch(_) { return null; }
}

export function saveFbConfig(cfg) {
  storageSet(COMM_FB_KEY, JSON.stringify(cfg));
}

export function commIsFirebase() { return !!_fbDb; }

export function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (typeof firebase !== 'undefined') { resolve(); return; }
    if (_fbSdkLoading) { setTimeout(() => resolve(), 3000); return; }
    _fbSdkLoading = true;
    let loaded = 0;
    const done = () => { if (++loaded === 2) resolve(); };
    const err  = () => reject(new Error('Failed to load Firebase SDK — check your connection'));
    const s1 = document.createElement('script');
    s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
    s1.onload = done; s1.onerror = err;
    const s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s2.onload = done; s2.onerror = err;
    document.head.appendChild(s1);
    document.head.appendChild(s2);
  });
}

export async function initFirebase(config) {
  try {
    await loadFirebaseSDK();
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK did not load');
    if (_fbApp) { _fbApp.delete().catch(() => {}); _fbApp = null; _fbDb = null; }
    _fbApp = firebase.initializeApp(config, 'gmi-community-' + Date.now());
    _fbDb  = firebase.firestore(_fbApp);
    return true;
  } catch(e) {
    _fbApp = null; _fbDb = null;
    throw e;
  }
}

function disconnectFirebase() {
  if (_commUnsubPosts) { _commUnsubPosts(); _commUnsubPosts = null; }
  if (_fbApp) { _fbApp.delete().catch(() => {}); _fbApp = null; _fbDb = null; }
}

// ── Owner detection ────────────────────────────────────────────────
export function loadCommOwners() {
  const raw = storageGet(COMM_OWNERS_KEY) || '';
  _commOwners = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function isOwner(username) {
  return username && _commOwners.includes((username || '').toLowerCase());
}

// ── Timestamp helpers ──────────────────────────────────────────────
function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

// ── Local storage posts ────────────────────────────────────────────
export function loadLocalPosts() {
  try { _commLocalPosts = JSON.parse(storageGet(COMM_LOCAL_KEY) || '[]'); }
  catch(_) { _commLocalPosts = []; }
}

function saveLocalPosts() {
  try { storageSet(COMM_LOCAL_KEY, JSON.stringify(_commLocalPosts.slice(0, COMM_MAX_POSTS))); } catch(_) {}
}

function addLocalPost(post) {
  _commLocalPosts.unshift(post);
  saveLocalPosts();
}

function addLocalComment(postId, comment) {
  const post = _commLocalPosts.find(p => p.id === postId);
  if (!post) return;
  post.comments = post.comments || [];
  post.comments.push(comment);
  post.commentCount = (post.commentCount || 0) + 1;
  saveLocalPosts();
}

function toggleLocalLike(postId) {
  const post = _commLocalPosts.find(p => p.id === postId);
  if (!post) return;
  const sess = loadSession();
  const me = sess?.username || 'anon';
  post.likedBy = post.likedBy || [];
  const idx = post.likedBy.indexOf(me);
  if (idx >= 0) { post.likedBy.splice(idx, 1); post.likeCount = Math.max(0, (post.likeCount||1)-1); }
  else           { post.likedBy.push(me);        post.likeCount = (post.likeCount||0)+1; }
  saveLocalPosts();
}

// ── Render helpers ─────────────────────────────────────────────────
function renderPostCard(post) {
  const sess = loadSession();
  const me   = sess?.username || '';
  const official  = isOwner(post.authorUsername);
  const liked     = (post.likedBy || []).includes(me);
  const isMyPost  = me && post.authorUsername === me;
  const tagHtml   = post.tag
    ? `<div class="comm-post-tag ${post.tag}">▸ ${post.tag.toUpperCase()}</div>` : '';
  const officialBadge = official
    ? `<span class="comm-badge-official">OFFICIAL</span>` : '';
  const avatarInit = (post.authorDisplay || post.authorUsername || '?')[0].toUpperCase();
  const deleteBtn  = isMyPost
    ? `<button class="comm-delete-btn" data-action="delete" data-post-id="${post.id}" title="Delete post">✕</button>` : '';

  return `
  <div class="comm-post-card ${official?'official':''}" data-post-id="${post.id}">
    <div class="comm-post-top">
      <div class="comm-post-avatar ${official?'official':''}">${avatarInit}</div>
      <span class="comm-post-author">${escHtml(post.authorDisplay || post.authorUsername)}</span>
      ${officialBadge}
      <span class="comm-post-time" data-ts="${post.timestamp}">${relativeTime(post.timestamp)}</span>
      ${deleteBtn}
    </div>
    <div class="comm-post-body">${escHtml(post.content)}</div>
    ${tagHtml}
    <div class="comm-post-footer">
      <button class="comm-action-btn ${liked?'liked':''}" data-action="like" data-post-id="${post.id}">
        ♥ ${post.likeCount || 0}
      </button>
      <button class="comm-action-btn" data-action="comments" data-post-id="${post.id}">
        ◎ ${post.commentCount || 0} COMMENTS
      </button>
    </div>
    <div class="comm-comments-section" id="comm-cmts-${post.id}" style="display:none;"></div>
  </div>`;
}

function renderComments(post) {
  const sess    = loadSession();
  const me      = sess?.username || '';
  const comments = (post.comments || []);
  const cHtml = comments.map(c => {
    const cOfficial = isOwner(c.authorUsername);
    const cInit = (c.authorDisplay || c.authorUsername || '?')[0].toUpperCase();
    return `
    <div class="comm-comment-card">
      <div class="comm-comment-avatar ${cOfficial?'official':''}">${cInit}</div>
      <div class="comm-comment-body">
        <span class="comm-comment-author">${c.authorDisplay || c.authorUsername}</span>
        ${cOfficial ? `<span class="comm-badge-official" style="margin-left:5px;">OFFICIAL</span>` : ''}
        <span class="comm-comment-time">${relativeTime(c.timestamp)}</span>
        <div class="comm-comment-text">${escHtml(c.content)}</div>
      </div>
    </div>`;
  }).join('');
  return `
    ${cHtml || '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);padding:4px 0 8px;">No comments yet.</div>'}
    <div class="comm-reply-input-row">
      <input type="text" class="comm-reply-input" data-post-id="${post.id}"
             placeholder="Add a comment…" maxlength="300">
      <button class="comm-reply-btn" data-post-id="${post.id}">REPLY →</button>
    </div>`;
}

// ── Render full feed ───────────────────────────────────────────────
function renderFeed(posts) {
  _commAllPosts = posts;
  applyFeedFilter();
}

function applyFeedFilter() {
  const list    = document.getElementById('comm-posts-list');
  const countEl = document.getElementById('comm-post-count');
  if (!list) return;

  const q = (document.getElementById('comm-search-input')?.value || '').trim().toLowerCase();

  let filtered = _commAllPosts;
  if (q) {
    filtered = filtered.filter(p =>
      (p.content || '').toLowerCase().includes(q) ||
      (p.authorDisplay || '').toLowerCase().includes(q) ||
      (p.tag || '').toLowerCase().includes(q)
    );
  }

  if (_commSort === 'top') {
    filtered = [...filtered].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  }

  if (countEl) countEl.textContent = filtered.length + ' POST' + (filtered.length !== 1 ? 'S' : '');

  if (!filtered.length) {
    list.innerHTML = q
      ? `<div class="comm-empty">No posts match "<em>${escHtml(q)}</em>"</div>`
      : '<div class="comm-empty">No posts yet. Be the first to share a macro view.</div>';
    return;
  }
  list.innerHTML = filtered.map(renderPostCard).join('');
}

// ── Like ───────────────────────────────────────────────────────────
async function handleLike(postId) {
  if (commIsFirebase()) {
    const sess = loadSession();
    const me   = sess?.username || 'anon';
    const ref  = _fbDb.collection(COMM_COLL).doc(postId);
    try {
      await _fbDb.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists) return;
        const d = doc.data();
        const likedBy = d.likedBy || [];
        const idx = likedBy.indexOf(me);
        if (idx >= 0) { likedBy.splice(idx,1); tx.update(ref, { likedBy, likeCount: Math.max(0,(d.likeCount||1)-1) }); }
        else           { likedBy.push(me);      tx.update(ref, { likedBy, likeCount: (d.likeCount||0)+1 }); }
      });
    } catch(_) {}
  } else {
    toggleLocalLike(postId);
    const post = _commLocalPosts.find(p => p.id === postId);
    if (post) {
      const sess = loadSession();
      const liked = (post.likedBy || []).includes(sess?.username || 'anon');
      const btn = document.querySelector(`.comm-action-btn[data-action="like"][data-post-id="${postId}"]`);
      if (btn) {
        btn.textContent = `♥ ${post.likeCount || 0}`;
        btn.classList.toggle('liked', liked);
      }
    }
  }
}

// ── Delete own post ────────────────────────────────────────────────
async function deleteCommPost(postId) {
  if (!confirm('Delete this post?')) return;
  if (commIsFirebase()) {
    try { await _fbDb.collection(COMM_COLL).doc(postId).delete(); }
    catch(e) { showToast('Delete failed: ' + e.message, null, 3000); }
  } else {
    _commLocalPosts = _commLocalPosts.filter(p => p.id !== postId);
    _commAllPosts   = _commAllPosts.filter(p => p.id !== postId);
    saveLocalPosts();
    const card = document.querySelector(`.comm-post-card[data-post-id="${postId}"]`);
    if (card) {
      card.remove();
      const remaining = document.querySelectorAll('.comm-post-card').length;
      const countEl = document.getElementById('comm-post-count');
      if (countEl) countEl.textContent = remaining + ' POST' + (remaining !== 1 ? 'S' : '');
      if (!remaining) {
        const list = document.getElementById('comm-posts-list');
        if (list) list.innerHTML = '<div class="comm-empty">No posts yet. Be the first to share a macro view.</div>';
      }
    }
  }
}

// ── Comments toggle ────────────────────────────────────────────────
async function toggleComments(postId) {
  const section = document.getElementById(`comm-cmts-${postId}`);
  if (!section) return;
  const visible = section.style.display !== 'none';
  if (visible) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  section.innerHTML = '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);padding:6px 0;">Loading…</div>';

  if (commIsFirebase()) {
    try {
      const snap = await _fbDb.collection(COMM_COLL).doc(postId)
        .collection('comments').orderBy('timestamp','asc').limit(100).get();
      const comments = snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toMillis() || Date.now() }));
      const post = { id: postId, comments };
      section.innerHTML = renderComments(post);
      wireReplyEvents(section, postId);
    } catch(e) {
      section.innerHTML = `<div style="color:var(--bear);font-family:var(--font-mono);font-size:9px;">${e.message}</div>`;
    }
  } else {
    const post = _commLocalPosts.find(p => p.id === postId);
    if (!post) { section.innerHTML = ''; return; }
    section.innerHTML = renderComments(post);
    wireReplyEvents(section, postId);
  }
}

function wireReplyEvents(section, postId) {
  const btn   = section.querySelector('.comm-reply-btn');
  const input = section.querySelector('.comm-reply-input');
  if (!btn || !input) return;
  const submit = async () => {
    const content = (input.value || '').trim();
    if (!content) return;
    const sess = loadSession();
    const comment = {
      id: 'c' + Date.now(),
      postId,
      authorUsername: sess?.username || 'anon',
      authorDisplay:  sess?.displayName || sess?.username || 'Anonymous',
      content,
      timestamp: Date.now(),
    };
    input.value = '';
    if (commIsFirebase()) {
      try {
        await _fbDb.collection(COMM_COLL).doc(postId).collection('comments').add({
          ...comment, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        await _fbDb.collection(COMM_COLL).doc(postId).update({
          commentCount: firebase.firestore.FieldValue.increment(1)
        });
        toggleComments(postId); toggleComments(postId); // refresh
      } catch(e) { input.value = content; }
    } else {
      addLocalComment(postId, comment);
      const post = _commLocalPosts.find(p => p.id === postId);
      section.innerHTML = renderComments(post);
      wireReplyEvents(section, postId);
    }
  };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
}

// ── Submit post ────────────────────────────────────────────────────
async function submitCommPost() {
  if (_commPosting) return;
  const input  = document.getElementById('comm-text-input');
  const sbtn   = document.getElementById('comm-submit-btn');
  const content = (input?.value || '').trim();
  if (!content) return;
  _commPosting = true;
  if (sbtn) { sbtn.disabled = true; sbtn.textContent = 'POSTING…'; }

  const sess = loadSession();
  const post = {
    id: 'p' + Date.now(),
    authorUsername: sess?.username || 'anon',
    authorDisplay:  sess?.displayName || sess?.username || 'Anonymous',
    content,
    tag: _commTag,
    timestamp: Date.now(),
    likeCount: 0,
    likedBy: [],
    commentCount: 0,
    comments: [],
  };
  if (input) input.value = '';
  document.querySelectorAll('.comm-tag-btn').forEach(b => b.className = 'comm-tag-btn');
  _commTag = null;
  updateCommCharCount();

  try {
    if (commIsFirebase()) {
      await _fbDb.collection(COMM_COLL).add({
        ...post,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likedBy: [],
      });
      // onSnapshot listener updates feed automatically
    } else {
      addLocalPost(post);
      renderFeed(_commLocalPosts);
    }
  } catch(e) {
    showToast('Post failed: ' + e.message, null, 4000);
  } finally {
    _commPosting = false;
    if (sbtn) { sbtn.disabled = false; sbtn.textContent = 'POST →'; }
  }
}

// ── Firebase real-time listener ────────────────────────────────────
function subscribeFirebasePosts() {
  if (_commUnsubPosts) { _commUnsubPosts(); _commUnsubPosts = null; }
  if (!_fbDb) return;
  _commUnsubPosts = _fbDb.collection(COMM_COLL)
    .orderBy('timestamp', 'desc').limit(100)
    .onSnapshot(snap => {
      const posts = snap.docs.map(d => ({
        id: d.id, ...d.data(),
        timestamp: d.data().timestamp?.toMillis() || Date.now()
      }));
      renderFeed(posts);
    }, err => {
      console.warn('Firestore error:', err.message);
    });
}

// ── Open / close ───────────────────────────────────────────────────
export async function openCommunity() {
  if (!loadSession()?.username) { requireAuth(() => openCommunity(), 'Sign in to access the Community Board'); return; }
  setCommOpen(true);
  document.getElementById('comm-overlay').classList.add('open');
  document.getElementById('comm-topbar-btn')?.classList.add('nav-active');
  const sess = loadSession();
  const avatar = document.getElementById('comm-my-avatar');
  if (avatar) avatar.textContent = (sess?.displayName || sess?.username || '?')[0].toUpperCase();
  switchCommTab('feed');
  if (!commIsFirebase()) {
    const cfg = loadFbConfig();
    if (cfg) {
      try { await initFirebase(cfg); } catch(_) {}
    }
  }
  if (commIsFirebase()) subscribeFirebasePosts();
  else { loadLocalPosts(); renderFeed(_commLocalPosts); }
  setTimeout(() => document.getElementById('comm-text-input')?.focus(), 180);
  if (_commTsInterval) clearInterval(_commTsInterval);
  _commTsInterval = setInterval(() => {
    document.querySelectorAll('[data-ts]').forEach(el => {
      const ts = Number(el.dataset.ts);
      if (ts) el.textContent = relativeTime(ts);
    });
  }, 60000);
}

export function closeCommunity() {
  setCommOpen(false);
  document.getElementById('comm-overlay').classList.remove('open');
  document.getElementById('comm-topbar-btn')?.classList.remove('nav-active');
  if (_commUnsubPosts) { _commUnsubPosts(); _commUnsubPosts = null; }
  if (_commTsInterval) { clearInterval(_commTsInterval); _commTsInterval = null; }
}

// ── Tab switch ─────────────────────────────────────────────────────
export function switchCommTab(tab) {
  _commTab = tab;
  document.querySelectorAll('.comm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('comm-feed').style.display     = tab === 'feed'     ? 'block' : 'none';
  document.getElementById('comm-pulse').style.display    = tab === 'pulse'    ? 'block' : 'none';
  document.getElementById('comm-settings').style.display = tab === 'settings' ? 'block' : 'none';
  if (tab === 'settings') loadCommSettings();
}

// ── Community Pulse ────────────────────────────────────────────────
export async function analyzeCommunityPulse() {
  if (_commPulseRunning) return;

  let posts = [];
  if (commIsFirebase()) {
    try {
      const snap = await _fbDb.collection(COMM_COLL).orderBy('timestamp','desc').limit(50).get();
      posts = snap.docs.map(d => ({ ...d.data(), id: d.id, timestamp: d.data().timestamp?.toMillis() || Date.now() }));
    } catch(_) { posts = _commLocalPosts.slice(0, 50); }
  } else {
    posts = _commLocalPosts.slice(0, 50);
  }

  const resultEl = document.getElementById('comm-pulse-result');
  if (!resultEl) return;

  if (!posts.length) {
    resultEl.innerHTML = '<div class="comm-pulse-empty">No community posts yet.<br>Be the first to post a macro view, then come back to analyse the community pulse.</div>';
    return;
  }

  _commPulseRunning = true;
  const btn = document.getElementById('comm-pulse-run-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⚡ ANALYSING…'; }
  resultEl.innerHTML = `<div class="comm-pulse-empty" style="padding:32px 20px;">Analysing ${posts.length} community post${posts.length !== 1 ? 's' : ''}…</div>`;

  const postData = posts.map(p => ({ content: p.content || '', tag: p.tag || 'neutral' }));

  const sysPrompt = 'You are a macro sentiment aggregator. Output only valid JSON. No markdown, no code fences, no explanation.';
  const userPrompt = `You are a sentiment aggregation engine for a professional trading community. Analyze the collective sentiment of these ${postData.length} community posts from macro traders and analysts. Base your analysis ONLY on what is written in these posts — do not introduce external knowledge or assumptions.

Posts:
${JSON.stringify(postData)}

Return ONLY valid JSON:
{"overall_sentiment":"bullish or bearish or neutral","score":<-1.0 to 1.0>,"bull_pct":<0-100>,"bear_pct":<0-100>,"neutral_pct":<0-100>,"consensus_level":"high or moderate or low","top_themes":["theme1","theme2","theme3","theme4"],"key_views":["most representative bullish view","most representative bearish view","most nuanced view"],"contrarian_signals":"minority view contradicting consensus, or null","conviction_level":"high or medium or low — based on certainty of language","narrative":"2-3 sentences on collective community thesis, dominant concern or opportunity, and risk appetite — based only on what was written"}`;

  try {
    const raw  = await callLLM(sysPrompt, userPrompt, 700, 0.2);
    const data = repairAndParseJSON(raw);
    if (!data) throw new Error('Could not parse AI response — try again');
    renderCommPulse(data, posts.length);
  } catch(e) {
    resultEl.innerHTML = `<div class="comm-pulse-empty" style="color:var(--bear);">Analysis failed: ${escHtml(e.message)}</div>`;
  } finally {
    _commPulseRunning = false;
    if (btn) { btn.disabled = false; btn.textContent = '⚡ ANALYSE COMMUNITY SENTIMENT'; }
  }
}

export function renderCommPulse(d, postCount) {
  const resultEl = document.getElementById('comm-pulse-result');
  if (!resultEl || !d) return;

  const sent      = (d.overall_sentiment || 'neutral').toLowerCase();
  const score     = typeof d.score === 'number' ? d.score : 0;
  const sentColor = sent === 'bullish' ? 'var(--bull)' : sent === 'bearish' ? 'var(--bear)' : 'var(--neut)';
  const barPct    = ((score + 1) / 2 * 100).toFixed(1);
  const barColor  = sent === 'bullish' ? '#10B981' : sent === 'bearish' ? '#EF4444' : '#64748B';

  const bPct  = Math.min(100, Math.max(0, d.bull_pct    || 0));
  const brPct = Math.min(100, Math.max(0, d.bear_pct    || 0));
  const nPct  = Math.min(100, Math.max(0, d.neutral_pct || 0));

  const themes = (d.top_themes || []).map(t =>
    `<span class="comm-pulse-theme-chip">${escHtml(t)}</span>`).join('');

  const views = (d.key_views || []).map(v =>
    `<div class="comm-pulse-view">"${escHtml(v)}"</div>`).join('');

  const consensusColor = d.consensus_level === 'high' ? 'var(--bull)' :
                         d.consensus_level === 'low'  ? 'var(--bear)' : 'var(--text)';

  const contrarianHtml = d.contrarian_signals && d.contrarian_signals !== 'null'
    ? `<div class="comm-pulse-meta-item">
         <div class="comm-pulse-meta-key">CONTRARIAN SIGNALS</div>
         <div class="comm-pulse-meta-val">${escHtml(d.contrarian_signals)}</div>
       </div>`
    : '';

  resultEl.innerHTML = `
    <div class="comm-pulse-score-row">
      <div class="comm-pulse-sentiment-label" style="color:${sentColor};">${sent.toUpperCase()}</div>
      <div class="comm-pulse-score-num">${score >= 0 ? '+' : ''}${score.toFixed(2)}</div>
      <div class="comm-pulse-bar-wrap">
        <div class="comm-pulse-bar-fill" style="width:${barPct}%;background:${barColor};"></div>
      </div>
    </div>

    <div class="comm-pulse-section-title">POST BREAKDOWN — ${postCount} POST${postCount !== 1 ? 'S' : ''} ANALYSED</div>
    <div class="comm-pulse-breakdown">
      <div class="comm-pulse-breakdown-row">
        <div class="comm-pulse-breakdown-label" style="color:var(--bull);">▲ BULLISH</div>
        <div class="comm-pulse-breakdown-bar"><div class="comm-pulse-breakdown-fill" style="width:${bPct}%;background:var(--bull);"></div></div>
        <div class="comm-pulse-breakdown-pct">${bPct}%</div>
      </div>
      <div class="comm-pulse-breakdown-row">
        <div class="comm-pulse-breakdown-label" style="color:var(--bear);">▼ BEARISH</div>
        <div class="comm-pulse-breakdown-bar"><div class="comm-pulse-breakdown-fill" style="width:${brPct}%;background:var(--bear);"></div></div>
        <div class="comm-pulse-breakdown-pct">${brPct}%</div>
      </div>
      <div class="comm-pulse-breakdown-row">
        <div class="comm-pulse-breakdown-label" style="color:var(--neut);">◆ NEUTRAL</div>
        <div class="comm-pulse-breakdown-bar"><div class="comm-pulse-breakdown-fill" style="width:${nPct}%;background:var(--neut);"></div></div>
        <div class="comm-pulse-breakdown-pct">${nPct}%</div>
      </div>
    </div>

    ${themes ? `<div class="comm-pulse-section-title">TOP THEMES</div><div class="comm-pulse-themes">${themes}</div>` : ''}

    ${views ? `<div class="comm-pulse-section-title">REPRESENTATIVE VIEWS</div>${views}` : ''}

    <div class="comm-pulse-section-title">COMMUNITY NARRATIVE</div>
    <div class="comm-pulse-narrative">${escHtml(d.narrative || '')}</div>

    <div class="comm-pulse-meta-row">
      <div class="comm-pulse-meta-item">
        <div class="comm-pulse-meta-key">CONSENSUS LEVEL</div>
        <div class="comm-pulse-meta-val" style="color:${consensusColor};">${escHtml((d.consensus_level || '—').toUpperCase())}</div>
      </div>
      ${contrarianHtml}
    </div>

    <div style="font-family:var(--font-mono);font-size:8px;color:var(--text3);margin-top:14px;text-align:right;letter-spacing:0.06em;">
      Analysis based on community posts only · Not financial advice
    </div>`;
}

// ── Settings helpers ───────────────────────────────────────────────
export function loadCommSettings() {
  const ownersEl = document.getElementById('comm-owners-input');
  if (ownersEl) ownersEl.value = storageGet(COMM_OWNERS_KEY) || '';

  const fbEl = document.getElementById('comm-fb-config-input');
  const fbCfg = loadFbConfig();
  if (fbEl && fbCfg) {
    try { fbEl.value = JSON.stringify(fbCfg, null, 2); } catch(_) {}
  }

  const fbStatus = document.getElementById('comm-fb-status');
  if (fbStatus) {
    if (commIsFirebase()) {
      fbStatus.textContent = '✓ Firebase connected — real-time sync active';
      fbStatus.className = 'comm-set-status ok';
    } else {
      fbStatus.textContent = fbCfg ? '⚠ Config saved but not connected — reload the page' : '○ Not configured — local mode active';
      fbStatus.className = 'comm-set-status ' + (fbCfg ? 'err' : '');
    }
  }
  updateCommModeNotice();
}

export function updateCommModeNotice() {
  const el = document.getElementById('comm-mode-notice');
  if (!el) return;
  el.textContent = commIsFirebase()
    ? '◉ LIVE BOARD — real-time Firebase sync active. Posts visible to all users.'
    : '◌ LOCAL BOARD — posts are stored on this device. Connect Firebase in Settings for real-time sharing.';
}

export function updateCommCharCount() {
  const input = document.getElementById('comm-text-input');
  const counter = document.getElementById('comm-char-count');
  if (!input || !counter) return;
  const remaining = COMM_MAX_CHARS - (input.value || '').length;
  counter.textContent = remaining;
  counter.classList.remove('cc-danger', 'cc-warn');
  if (remaining < 30) counter.classList.add('cc-danger');
  else if (remaining < 100) counter.classList.add('cc-warn');
}

// ── Wire community events ──────────────────────────────────────────
export function wireCommEvents() {
  const btn = document.getElementById('comm-topbar-btn');
  if (btn) btn.addEventListener('click', openCommunity);

  const closeBtn = document.getElementById('comm-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeCommunity);

  document.getElementById('comm-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('comm-overlay')) closeCommunity();
  });

  document.querySelectorAll('.comm-tab').forEach(t => {
    t.addEventListener('click', () => switchCommTab(t.dataset.tab));
  });

  document.querySelectorAll('.comm-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (_commTag === tag) {
        _commTag = null;
        document.querySelectorAll('.comm-tag-btn').forEach(b => b.className = 'comm-tag-btn');
      } else {
        _commTag = tag;
        document.querySelectorAll('.comm-tag-btn').forEach(b => b.className = 'comm-tag-btn');
        btn.className = `comm-tag-btn active-${tag==='bullish'?'bull':tag==='bearish'?'bear':'neut'}`;
      }
    });
  });

  document.getElementById('comm-text-input')?.addEventListener('input', updateCommCharCount);
  document.getElementById('comm-submit-btn')?.addEventListener('click', submitCommPost);
  document.getElementById('comm-text-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitCommPost();
  });

  document.getElementById('comm-owners-save-btn')?.addEventListener('click', () => {
    const val = (document.getElementById('comm-owners-input')?.value || '').trim();
    storageSet(COMM_OWNERS_KEY, val);
    loadCommOwners();
    const st = document.getElementById('comm-owners-status');
    if (st) { st.textContent = '✓ Saved'; st.className = 'comm-set-status ok'; }
    setTimeout(() => { const s2 = document.getElementById('comm-owners-status'); if(s2) s2.textContent=''; }, 2500);
  });

  document.getElementById('comm-fb-save-btn')?.addEventListener('click', async () => {
    const val = (document.getElementById('comm-fb-config-input')?.value || '').trim();
    const st  = document.getElementById('comm-fb-status');
    const fbBtn = document.getElementById('comm-fb-save-btn');
    try {
      const cfg = JSON.parse(val);
      if (!cfg.apiKey || !cfg.projectId) throw new Error('Missing apiKey or projectId');
      if (st) { st.textContent = '⟳ Loading Firebase SDK…'; st.className = 'comm-set-status'; }
      if (fbBtn) fbBtn.disabled = true;
      await initFirebase(cfg);
      saveFbConfig(cfg);
      if (st) { st.textContent = '✓ Connected! Real-time sync active.'; st.className = 'comm-set-status ok'; }
      updateCommModeNotice();
      const commOpenState = document.getElementById('comm-overlay')?.classList.contains('open');
      if (commOpenState && _commTab === 'feed') subscribeFirebasePosts();
    } catch(e) {
      if (st) { st.textContent = '✗ ' + e.message; st.className = 'comm-set-status err'; }
    } finally {
      if (fbBtn) fbBtn.disabled = false;
    }
  });

  document.getElementById('comm-fb-clear-btn')?.addEventListener('click', () => {
    disconnectFirebase();
    storageRemove(COMM_FB_KEY);
    const fbEl = document.getElementById('comm-fb-config-input');
    if (fbEl) fbEl.value = '';
    const st = document.getElementById('comm-fb-status');
    if (st) { st.textContent = '○ Disconnected — now in local mode'; st.className = 'comm-set-status'; }
    updateCommModeNotice();
    loadLocalPosts();
    renderFeed(_commLocalPosts);
  });

  document.getElementById('comm-clear-local-btn')?.addEventListener('click', () => {
    _commLocalPosts = [];
    storageRemove(COMM_LOCAL_KEY);
    const st = document.getElementById('comm-clear-status');
    if (st) { st.textContent = '✓ Local board cleared'; st.className = 'comm-set-status ok'; }
    setTimeout(() => { const s2 = document.getElementById('comm-clear-status'); if(s2) s2.textContent=''; }, 2500);
    if (!commIsFirebase()) renderFeed([]);
  });

  let _commSearchTimer = null;
  document.getElementById('comm-search-input')?.addEventListener('input', () => {
    clearTimeout(_commSearchTimer);
    _commSearchTimer = setTimeout(applyFeedFilter, 200);
  });

  document.querySelectorAll('.comm-sort-btn').forEach(sortBtn => {
    sortBtn.addEventListener('click', () => {
      _commSort = sortBtn.dataset.sort;
      document.querySelectorAll('.comm-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === _commSort));
      applyFeedFilter();
    });
  });

  // Delegated handler for all post card actions
  const postsList = document.getElementById('comm-posts-list');
  if (postsList) {
    postsList.addEventListener('click', e => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;
      const { action, postId } = actionBtn.dataset;
      if (action === 'like') {
        actionBtn.classList.add('like-anim');
        actionBtn.addEventListener('animationend', () => actionBtn.classList.remove('like-anim'), { once: true });
        handleLike(postId);
      } else if (action === 'comments') {
        toggleComments(postId);
      } else if (action === 'delete') {
        deleteCommPost(postId);
      }
    });

    postsList.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('comm-reply-input')) {
        e.preventDefault();
        const pid = e.target.dataset.postId;
        document.querySelector(`.comm-reply-btn[data-post-id="${pid}"]`)?.click();
      }
    });
  }

  // Pulse tab button
  document.getElementById('comm-pulse-run-btn')?.addEventListener('click', analyzeCommunityPulse);
}

window.openCommunity = openCommunity;
window.closeCommunity = closeCommunity;
window.wireCommEvents = wireCommEvents;
window.loadCommOwners = loadCommOwners;
window.loadLocalPosts = loadLocalPosts;
window.switchCommTab = switchCommTab;
window.analyzeCommunityPulse = analyzeCommunityPulse;
