// ─── CREA SECURITY LAYER ───────────────────────────────
// XSS prevention · input sanitization · rate limiting

// ─── DANGEROUS PATTERNS (XSS + SQL injection signatures) ─
const _BLOCK = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /on\w+\s*=\s*["']?[^"'>]*/gi,   // onclick= onload= etc.
  /<\s*(iframe|object|embed|svg|form)[^>]*>/gi,
  /data:\s*text\s*\/\s*html/gi,
  // SQL-style keywords (Firestore is NoSQL but sanitise anyway)
  /'\s*(OR|AND)\s*'/gi,
  /;\s*(DROP|DELETE|INSERT|UPDATE|SELECT|EXEC|UNION)\s/gi,
  /--[^\n]*/g,                      // SQL line comment
];

/**
 * Sanitise a user string: strip dangerous patterns, HTML-encode, trim & cap length.
 * @param {string} val  Raw input value
 * @param {number} max  Max allowed length (default 500)
 * @returns {string}    Safe string
 */
function sanitize(val, max = 500) {
  if (typeof val !== 'string') return '';
  val = val.trim().slice(0, max);
  // Strip dangerous patterns
  _BLOCK.forEach(re => { re.lastIndex = 0; val = val.replace(re, ''); });
  // HTML-encode remaining special chars to prevent injection into DOM
  val = val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return val.trim();
}

/**
 * Validate a numeric amount is a safe positive number within range.
 * @returns {number|null}
 */
function safeAmount(val, min = 0.01, max = 10_000_000) {
  const n = parseFloat(val);
  if (isNaN(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100; // 2 decimal places
}

// ─── RATE LIMITER ─────────────────────────────────────────
class RateLimiter {
  /**
   * @param {number} maxCalls   Max allowed calls per window
   * @param {number} windowMs   Time window in ms
   * @param {string} label      Human-readable name for error messages
   */
  constructor(maxCalls, windowMs, label = 'This action') {
    this.max = maxCalls;
    this.win = windowMs;
    this.label = label;
    this._calls = [];
  }
  _clean() {
    const now = Date.now();
    this._calls = this._calls.filter(t => now - t < this.win);
  }
  /** @returns {{ ok: boolean, waitSec: number }} */
  check() {
    this._clean();
    if (this._calls.length >= this.max) {
      const waitMs = this.win - (Date.now() - this._calls[0]);
      return { ok: false, waitSec: Math.ceil(waitMs / 1000) };
    }
    this._calls.push(Date.now());
    return { ok: true, waitSec: 0 };
  }
  /** Shows a toast and returns false if rate-limited, otherwise true. */
  guard() {
    const r = this.check();
    if (!r.ok) {
      showToast(`⏳ ${this.label} — please wait ${r.waitSec}s`, 'warn');
      return false;
    }
    return true;
  }
}

// ─── RATE LIMITER INSTANCES ───────────────────────────────
const RL = {
  auth:    new RateLimiter(5,  5 * 60_000, 'Login/Signup'),    // 5 per 5 min
  ai:      new RateLimiter(5,  60_000,     'AI endpoint'),      // 5 per minute
  addItem: new RateLimiter(30, 60_000,     'Adding items'),     // 30 per minute
};

// ─── TOAST NOTIFICATION ───────────────────────────────────
(function injectToastCSS() {
  if (document.getElementById('crea-toast-css')) return;
  const s = document.createElement('style');
  s.id = 'crea-toast-css';
  s.textContent = `
    @keyframes _vToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes _vToastOut{to{opacity:0;transform:translateY(8px)}}
    #crea-toast{
      position:fixed;bottom:24px;right:24px;z-index:99999;
      display:flex;align-items:center;gap:10px;
      background:var(--surface);border-radius:12px;
      padding:12px 18px;font-family:var(--font-body);font-size:14px;
      color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,0.18);
      max-width:340px;animation:_vToastIn 0.28s ease;
      transition:opacity 0.28s,transform 0.28s;
    }`;
  document.head.appendChild(s);
})();

/**
 * Show a non-blocking toast notification.
 * @param {string} msg  Message text
 * @param {'info'|'success'|'warn'|'error'} type
 */
function showToast(msg, type = 'info') {
  const old = document.getElementById('crea-toast');
  if (old) old.remove();
  const borderMap = { info:'var(--border2)', success:'var(--green)', warn:'var(--yellow)', error:'var(--red)' };
  const iconMap   = { info:'ℹ️', success:'✅', warn:'⚠️', error:'❌' };
  const t = document.createElement('div');
  t.id = 'crea-toast';
  t.style.borderLeft = `4px solid ${borderMap[type] || borderMap.info}`;
  t.innerHTML = `<span style="font-size:16px">${iconMap[type]||'ℹ️'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ─── AI ENDPOINT WRAPPER ──────────────────────────────────
/**
 * Rate-limited wrapper for ANY expensive AI API call.
 * Limits to 5 calls/min (RL.ai) and sanitizes the prompt automatically.
 *
 * Usage:
 *   const data = await callAI(url, { prompt: userText }, CREA_API.geminiKey);
 *
 * @param {string} endpoint  Full API URL
 * @param {object} payload   Request body (string fields are sanitized)
 * @param {string} [apiKey]  Bearer token / API key from api.js
 * @returns {Promise<object|null>}
 */
async function callAI(endpoint, payload = {}, apiKey = '') {
  if (!RL.ai.guard()) return null;

  // Sanitize string fields in payload (especially prompt)
  const safe = {};
  for (const [k, v] of Object.entries(payload)) {
    safe[k] = typeof v === 'string' ? sanitize(v, 4000) : v;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(safe) });
    if (!res.ok) { showToast(`AI error ${res.status}: ${res.statusText}`, 'error'); return null; }
    return await res.json();
  } catch (err) {
    showToast('AI request failed. Check your connection.', 'error');
    console.error('[Crea AI]', err);
    return null;
  }
}

// ─── QUICK REFERENCE ─────────────────────────────────────
// sanitize(val, maxLen)           → safe string (XSS + SQL-safe)
// safeAmount(val, min, max)       → validated number or null
// showToast(msg, type)            → bottom-right notification
// RL.auth.guard()                 → blocks > 5 logins / 5 min
// RL.ai.guard()                   → blocks > 5 AI calls / min
// RL.addItem.guard()              → blocks > 30 adds / min
// callAI(url, payload, key)       → rate-limited + sanitized AI call

