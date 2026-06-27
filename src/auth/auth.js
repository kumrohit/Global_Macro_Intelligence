// auth/auth.js — local auth (username/password + OAuth bridges for Google/Apple/GitHub)
import { storageGet, storageSet, storageRemove, isStoragePersistent } from '../core/storage.js';
import { AUTH_USERS_KEY, AUTH_SESSION_KEY } from '../core/constants.js';
import {
  authMode, setAuthMode as stateSetAuthMode,
  _pendingAuthCallback, setPendingAuthCallback,
  _cachedSession, setCachedSession,
} from '../core/state.js';

// ── Login overlay helpers ─────────────────────────────────────────────────────

export function requireAuth(callback, reason) {
  if (loadSession()?.username) { callback(); return; }
  setPendingAuthCallback(callback);
  setLoginContext(reason || '');
  showLoginOverlay();
}

function setLoginContext(msg) {
  const el = document.getElementById('login-context');
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

export function togglePwVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '👁' : '🙈';
}

function setLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) el.textContent = msg;
}

export function setAuthMode(mode) {
  stateSetAuthMode(mode);
  document.querySelectorAll('.lm-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const nameWrap    = document.getElementById('login-name-wrap');
  const confirmWrap = document.getElementById('login-confirm-wrap');
  const submitBtn   = document.getElementById('login-submit-btn');
  const footerText  = document.getElementById('login-footer-text');
  if (mode === 'register') {
    if (nameWrap)    nameWrap.style.display    = '';
    if (confirmWrap) confirmWrap.style.display = '';
    if (submitBtn)   submitBtn.textContent     = 'CREATE ACCOUNT';
    if (footerText)  footerText.innerHTML      = 'Already have an account? <a id="login-switch-link">Sign in</a>';
  } else {
    if (nameWrap)    nameWrap.style.display    = 'none';
    if (confirmWrap) confirmWrap.style.display = 'none';
    if (submitBtn)   submitBtn.textContent     = 'SIGN IN';
    if (footerText)  footerText.innerHTML      = 'New here? <a id="login-switch-link">Create an account</a>';
  }
  setLoginError('');
  const newLink = document.getElementById('login-switch-link');
  if (newLink) newLink.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
}

function showLoginOverlay() {
  const el = document.getElementById('login-overlay');
  if (!el) return;
  _setGithubPanelMode(false);
  el.classList.remove('hidden');
  el.classList.add('visible');
  requestAnimationFrame(() => el.classList.add('fade-in'));
  if (!isStoragePersistent()) {
    setLoginError('⚠ Storage unavailable — account will only last this session.');
  }
}

function hideLoginOverlay() {
  const el = document.getElementById('login-overlay');
  if (!el) return;
  el.classList.remove('fade-in');
  setTimeout(() => {
    el.classList.remove('visible');
    el.classList.add('hidden');
  }, 300);
}

// ── Storage-backed session ────────────────────────────────────────────────────

function hashPassword(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h) ^ pw.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function loadUsers() {
  try { return JSON.parse(storageGet(AUTH_USERS_KEY) || '{}'); }
  catch(_) { return {}; }
}

export function saveUsers(users) {
  storageSet(AUTH_USERS_KEY, JSON.stringify(users));
}

export function loadSession() {
  if (_cachedSession !== undefined) return _cachedSession;
  try { setCachedSession(JSON.parse(storageGet(AUTH_SESSION_KEY) || 'null')); }
  catch(_) { setCachedSession(null); }
  return _cachedSession;
}

function saveSession(session) {
  setCachedSession(session);
  storageSet(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  setCachedSession(null);
  storageRemove(AUTH_SESSION_KEY);
}

export function applySession(session) {
  const userEl   = document.getElementById('topbar-user');
  const nameEl   = document.getElementById('topbar-username');
  const logoutEl = document.getElementById('logout-btn');
  if (userEl)   userEl.style.display = 'flex';
  if (nameEl) {
    nameEl.textContent = '▸ ' + (session.displayName || session.username).toUpperCase();
    nameEl.title = 'Open Profile & Digest';
    nameEl.onclick = null;
  }
  if (logoutEl) logoutEl.style.display = '';
}

function startSession(session) {
  saveSession(session);
  applySession(session);
  hideLoginOverlay();
  setLoginContext('');
  if (_pendingAuthCallback) {
    const cb = _pendingAuthCallback;
    setPendingAuthCallback(null);
    setTimeout(cb, 380);
  }
}

export function logout() {
  clearSession();
  ['login-username','login-password','login-displayname','login-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setLoginError('');
  setAuthMode('login');
  const userEl = document.getElementById('topbar-user');
  if (userEl) userEl.style.display = 'none';
  showLoginOverlay();
}

// ── Username/password auth ────────────────────────────────────────────────────

export function attemptLogin() {
  const username = (document.getElementById('login-username')?.value || '').trim().toLowerCase();
  const password = document.getElementById('login-password')?.value || '';
  if (!username) { setLoginError('Username is required.'); return; }
  if (!password) { setLoginError('Password is required.'); return; }
  const users = loadUsers();
  const user = users[username];
  if (!user) { setLoginError('No account found. Please register.'); return; }
  if (user.hash !== hashPassword(password)) { setLoginError('Incorrect password.'); return; }
  setLoginError('');
  startSession({ username, displayName: user.displayName || username });
}

export function attemptRegister() {
  const username    = (document.getElementById('login-username')?.value || '').trim().toLowerCase();
  const displayName = (document.getElementById('login-displayname')?.value || '').trim();
  const password    = document.getElementById('login-password')?.value || '';
  const confirm     = document.getElementById('login-confirm')?.value || '';
  if (!username)                           { setLoginError('Username is required.'); return; }
  if (username.length < 3)                 { setLoginError('Username must be at least 3 characters.'); return; }
  if (!/^[a-z0-9_]+$/.test(username))     { setLoginError('Username: letters, numbers, underscore only.'); return; }
  if (!password)                           { setLoginError('Password is required.'); return; }
  if (password.length < 6)                 { setLoginError('Password must be at least 6 characters.'); return; }
  if (password !== confirm)                { setLoginError('Passwords do not match.'); return; }
  const users = loadUsers();
  if (users[username])                     { setLoginError('Username already taken.'); return; }
  users[username] = { hash: hashPassword(password), displayName: displayName || username, created: Date.now() };
  saveUsers(users);
  setLoginError('');
  startSession({ username, displayName: displayName || username });
}

// ── Google Sign-In ────────────────────────────────────────────────────────────

export function handleGoogleCredential(response) {
  try {
    const parts   = response.credential.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    const email   = payload.email;
    const name    = payload.name || email.split('@')[0];
    const sub     = payload.sub;
    const users   = JSON.parse(storageGet(AUTH_USERS_KEY) || '{}');
    if (!users[email]) {
      users[email] = { displayName: name, googleSub: sub, created: Date.now() };
      storageSet(AUTH_USERS_KEY, JSON.stringify(users));
    }
    startSession({ username: email, displayName: users[email].displayName || name });
  } catch(e) {
    setLoginError('Google sign-in failed — please try again or use username/password.');
  }
}

export function googleSignIn() {
  const clientId = storageGet('gmi_google_client_id') || '';
  if (!clientId) {
    setLoginError('Google Sign-In needs a Client ID. After signing in, add it in Profile → ⚙ API.');
    return;
  }
  if (!window.google?.accounts?.id) {
    setLoginError('Google library not loaded. Check your internet connection.');
    return;
  }
  google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential, ux_mode: 'popup' });
  google.accounts.id.prompt(notification => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      setLoginError('Google pop-up was blocked. Allow pop-ups for this site and try again.');
    }
  });
}

// ── Apple Sign-In ─────────────────────────────────────────────────────────────

function handleAppleResponse(data) {
  try {
    const id_token = data?.authorization?.id_token;
    if (!id_token) throw new Error('no id_token');
    const parts     = id_token.split('.');
    const payload   = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    const sub       = payload.sub;
    const email     = payload.email || ('apple_' + sub);
    const firstName = data?.user?.name?.firstName || '';
    const lastName  = data?.user?.name?.lastName  || '';
    const name      = (firstName + ' ' + lastName).trim() || email.split('@')[0];
    const key       = 'apple_' + sub;
    const users     = JSON.parse(storageGet(AUTH_USERS_KEY) || '{}');
    if (!users[key]) {
      users[key] = { displayName: name, appleSub: sub, email, created: Date.now() };
      storageSet(AUTH_USERS_KEY, JSON.stringify(users));
    }
    startSession({ username: key, displayName: users[key].displayName || name });
  } catch(e) {
    setLoginError('Apple sign-in failed — please try again or use username/password.');
  }
}

export function appleSignIn() {
  const serviceId = storageGet('gmi_apple_service_id') || '';
  if (!serviceId) {
    setLoginError('Apple Sign-In needs a Service ID. After signing in, add it in Profile → ⚙ API.');
    return;
  }
  if (!window.AppleID?.auth) {
    setLoginError('Apple Sign-In library not loaded. Check your internet connection.');
    return;
  }
  try {
    AppleID.auth.init({
      clientId: serviceId,
      scope: 'name email',
      redirectURI: location.origin + location.pathname,
      usePopup: true
    });
    AppleID.auth.signIn().then(handleAppleResponse).catch(err => {
      if (err?.error !== 'popup_closed_by_user') {
        setLoginError('Apple sign-in failed — allow pop-ups and try again.');
      }
    });
  } catch(e) {
    setLoginError('Apple sign-in failed — please try again.');
  }
}

// ── GitHub Sign-In ────────────────────────────────────────────────────────────

function _setGithubPanelMode(on) {
  const mainForm = document.getElementById('login-main-form');
  const panel    = document.getElementById('github-panel');
  if (mainForm) mainForm.style.display = on ? 'none' : '';
  if (panel)    panel.style.display    = on ? 'flex'  : 'none';
}

export function githubSignIn() {
  _setGithubPanelMode(true);
  const inp = document.getElementById('github-username-input');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 80); }
  const errEl = document.getElementById('github-panel-error');
  if (errEl) errEl.textContent = '';
  const preview = document.getElementById('github-preview');
  if (preview) preview.style.display = 'none';
  const btn = document.getElementById('github-verify-btn');
  if (btn) { btn.textContent = 'VERIFY & SIGN IN'; btn.disabled = false; btn.onclick = verifyGithubUser; }
}

export function cancelGithubSignIn() {
  _setGithubPanelMode(false);
}

export async function verifyGithubUser() {
  const input     = document.getElementById('github-username-input');
  const errEl     = document.getElementById('github-panel-error');
  const previewEl = document.getElementById('github-preview');
  const btn       = document.getElementById('github-verify-btn');
  const username  = (input?.value || '').trim();
  if (!username) { if (errEl) errEl.textContent = 'Enter your GitHub username.'; return; }
  if (errEl) errEl.textContent = '';
  if (btn) { btn.textContent = 'CHECKING…'; btn.disabled = true; }
  try {
    const res = await fetch('https://api.github.com/users/' + encodeURIComponent(username));
    if (!res.ok) {
      if (errEl) errEl.textContent = res.status === 404
        ? '"' + username + '" not found on GitHub.'
        : 'GitHub API error — check your connection.';
      if (btn) { btn.textContent = 'VERIFY & SIGN IN'; btn.disabled = false; }
      return;
    }
    const data      = await res.json();
    const avatarEl  = document.getElementById('github-avatar');
    const nameEl    = document.getElementById('github-name');
    const handleEl  = document.getElementById('github-login-handle');
    if (avatarEl) avatarEl.src = data.avatar_url || '';
    if (nameEl)   nameEl.textContent   = data.name || data.login;
    if (handleEl) handleEl.textContent = '@' + data.login;
    if (previewEl) previewEl.style.display = 'flex';
    if (btn) {
      btn.textContent = 'CONFIRM & SIGN IN';
      btn.disabled = false;
      btn.onclick = () => _completeGithubSignIn(data);
    }
  } catch(e) {
    if (errEl) errEl.textContent = 'Network error — check your connection.';
    if (btn) { btn.textContent = 'VERIFY & SIGN IN'; btn.disabled = false; }
  }
}

function _completeGithubSignIn(data) {
  const key   = 'github_' + data.login;
  const name  = data.name || data.login;
  const users = JSON.parse(storageGet(AUTH_USERS_KEY) || '{}');
  if (!users[key]) {
    users[key] = { displayName: name, githubLogin: data.login, created: Date.now() };
    storageSet(AUTH_USERS_KEY, JSON.stringify(users));
  }
  startSession({ username: key, displayName: users[key].displayName || name });
}

// ── Event wiring ──────────────────────────────────────────────────────────────

export function wireLoginEvents() {
  document.getElementById('login-close-btn')?.addEventListener('click', () => {
    setPendingAuthCallback(null);
    setLoginContext('');
    hideLoginOverlay();
  });

  document.querySelectorAll('.lm-tab').forEach(tab => {
    tab.addEventListener('click', () => setAuthMode(tab.dataset.mode));
  });

  const switchLink = document.getElementById('login-switch-link');
  if (switchLink) switchLink.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));

  const submitBtn = document.getElementById('login-submit-btn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    if (authMode === 'login') attemptLogin();
    else attemptRegister();
  });

  ['login-username','login-password','login-displayname','login-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (authMode === 'login') attemptLogin();
        else attemptRegister();
      }
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', logout);

  document.getElementById('google-client-id-save')?.addEventListener('click', () => {
    const val = document.getElementById('google-client-id-input')?.value.trim() || '';
    if (val) { storageSet('gmi_google_client_id', val); window.showToast?.('Google Client ID saved. "Continue with Google" is now active.', null, 4000); }
    else { storageRemove('gmi_google_client_id'); window.showToast?.('Google Client ID cleared.', null, 3000); }
  });

  const savedGcid = storageGet('gmi_google_client_id');
  if (savedGcid) {
    const inp = document.getElementById('google-client-id-input');
    if (inp) inp.value = savedGcid;
  }

  document.getElementById('apple-service-id-save')?.addEventListener('click', () => {
    const val = document.getElementById('apple-service-id-input')?.value.trim() || '';
    if (val) { storageSet('gmi_apple_service_id', val); window.showToast?.('Apple Service ID saved. "Continue with Apple" is now active.', null, 4000); }
    else { storageRemove('gmi_apple_service_id'); window.showToast?.('Apple Service ID cleared.', null, 3000); }
  });

  const savedAsid = storageGet('gmi_apple_service_id');
  if (savedAsid) {
    const inp = document.getElementById('apple-service-id-input');
    if (inp) inp.value = savedAsid;
  }
}

window.requireAuth        = requireAuth;
window.togglePwVis        = togglePwVis;
window.googleSignIn       = googleSignIn;
window.appleSignIn        = appleSignIn;
window.githubSignIn       = githubSignIn;
window.verifyGithubUser   = verifyGithubUser;
window.cancelGithubSignIn = cancelGithubSignIn;
