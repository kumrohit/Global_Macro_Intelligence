// Storage layer — must be imported FIRST in main.js
// _storage and _memStore must exist before any storageGet/Set call anywhere in the app.

let _storage = null;

export function getStorage() {
  if (_storage) return _storage;
  for (const s of [localStorage, sessionStorage]) {
    try {
      s.setItem('__gmi_test__', '1');
      if (s.getItem('__gmi_test__') === '1') { s.removeItem('__gmi_test__'); _storage = s; return s; }
    } catch(_) {}
  }
  return null;
}

const _memStore = {};

export function storageGet(key) {
  const s = getStorage();
  if (s) { try { return s.getItem(key); } catch(_) {} }
  return _memStore[key] ?? null;
}

export function storageSet(key, val) {
  const s = getStorage();
  if (s) { try { s.setItem(key, val); return; } catch(_) {} }
  _memStore[key] = val;
}

export function storageRemove(key) {
  const s = getStorage();
  if (s) { try { s.removeItem(key); } catch(_) {} }
  delete _memStore[key];
}

export function isStoragePersistent() {
  try {
    localStorage.setItem('__gmi_chk__', '1');
    const ok = localStorage.getItem('__gmi_chk__') === '1';
    localStorage.removeItem('__gmi_chk__');
    return ok;
  } catch(_) { return false; }
}
