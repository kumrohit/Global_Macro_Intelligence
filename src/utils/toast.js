// utils/toast.js — dismissable notification toast
let _toastTimer = null;

export function showToast(msg, onSend, duration) {
  const toast  = document.getElementById('mrx-toast');
  const msgEl  = document.getElementById('mrx-toast-msg');
  const sendBtn = document.getElementById('mrx-toast-send');
  if (!toast) return;
  msgEl.textContent = msg;
  sendBtn.style.display = onSend ? 'inline-block' : 'none';
  if (onSend) { sendBtn.onclick = () => { onSend(); dismissToast(); }; }
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(dismissToast, duration || 5000);
}

export function dismissToast() {
  const toast = document.getElementById('mrx-toast');
  toast?.classList.remove('show');
  clearTimeout(_toastTimer);
}

window.showToast    = showToast;
window.dismissToast = dismissToast;
