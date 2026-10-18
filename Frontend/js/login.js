/* CodePrep AI — login.js
   Makes login.html work: validation, sign-in against accounts stored in this browser, show/hide password,
   Caps Lock warning, "Remember me", a short lock after repeated failures, and a safe redirect.

   Save as Frontend/js/login.js and add this line before </body> in login.html:
       <script src="../js/login.js"></script>

   NOTE: there is no server yet, so accounts live in this browser's localStorage. That is fine for a demo
   or a college project, but it is not real security. Replace login()/register() with calls to your backend later. */

(function () {
  'use strict';

  /* ============ Settings ============ */
  const KEYS = {
    users: 'codeprep:users',                  // [{ name, email, salt, hash, joined }]
    session: 'codeprep:session',              // the signed-in email
    rememberedEmail: 'codeprep:rememberedEmail',
    attempts: 'codeprep:loginAttempts',       // { count, until }
  };
  const HOME_PAGE = 'dashboard.html';         // where to go after signing in
  const MAX_ATTEMPTS = 5;                     // failed tries before a short lock
  const LOCK_SECONDS = 30;

  /* ============ Storage helpers (never crash if storage is blocked) ============ */
  function readJSON(storage, key, fallback) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked or full */ }
  }

  /* ============ Password hashing (SHA-256 with a random salt) ============ */
  const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

  async function hashPassword(password, salt) {
    if (!(window.crypto && window.crypto.subtle)) throw new Error('insecure-context');
    return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password)));
  }

  /* ============ Account functions (also usable from a register page) ============ */
  const normalizeEmail = (email) => String(email).trim().toLowerCase();

  async function register(name, email, password) {
    const users = readJSON(localStorage, KEYS.users, []);
    const mail = normalizeEmail(email);
    if (users.some((u) => u.email === mail)) return { ok: false, error: 'An account with this email already exists.' };
    const salt = newSalt();
    users.push({ name: String(name).trim(), email: mail, salt, hash: await hashPassword(password, salt), joined: new Date().toISOString() });
    writeJSON(localStorage, KEYS.users, users);
    return { ok: true };
  }

  async function login(email, password, remember) {
    const state = readJSON(localStorage, KEYS.attempts, { count: 0, until: 0 });
    if (state.until > Date.now()) {
      const seconds = Math.ceil((state.until - Date.now()) / 1000);
      return { ok: false, error: `Too many failed attempts. Try again in ${seconds} seconds.` };
    }

    const users = readJSON(localStorage, KEYS.users, []);
    if (users.length === 0) return { ok: false, error: 'No account exists on this device yet. Please create an account first.' };

    const mail = normalizeEmail(email);
    const user = users.find((u) => u.email === mail);
    const valid = user && (await hashPassword(password, user.salt)) === user.hash;

    if (!valid) {
      state.count += 1;
      if (state.count >= MAX_ATTEMPTS) { state.until = Date.now() + LOCK_SECONDS * 1000; state.count = 0; }
      writeJSON(localStorage, KEYS.attempts, state);
      return { ok: false, error: 'Incorrect email or password.' }; // same message either way, so emails can't be guessed
    }

    try { localStorage.removeItem(KEYS.attempts); } catch (e) { /* ignore */ }
    logout();
    // "Remember me" keeps the session after the browser closes; otherwise it ends with the tab
    (remember ? localStorage : sessionStorage).setItem(KEYS.session, user.email);
    return { ok: true, user: { name: user.name, email: user.email } };
  }

  function currentUser() {
    const email = sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session);
    const user = email && readJSON(localStorage, KEYS.users, []).find((u) => u.email === email);
    return user ? { name: user.name, email: user.email } : null;
  }

  function logout() {
    try { sessionStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.session); } catch (e) { /* ignore */ }
  }

  window.CodePrepAuth = { register, login, logout, currentUser };

  /* ============ Page behaviour (only runs on the login page) ============ */
  const form = document.querySelector('.auth-form');
  if (!form) return;

  form.noValidate = true; // we show our own, friendlier messages
  const emailInput = form.querySelector('#email');
  const passwordInput = form.querySelector('#password');
  const rememberInput = form.querySelector('input[name="remember"]');
  const submitButton = form.querySelector('.primary-button');
  const submitLabel = submitButton.querySelector('span');

  // Styles for the pieces this script adds (move them into login.css if you prefer)
  const style = document.createElement('style');
  style.textContent = `
    .form-status { margin: 0 0 16px; padding: 11px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; border: 1px solid transparent; }
    .form-status[hidden] { display: none; }
    .form-status.is-error { color: #b42318; background: #fff0ee; border-color: rgba(214, 59, 59, .3); }
    .form-status.is-success { color: #0b7a6e; background: rgba(25, 195, 177, .12); border-color: rgba(25, 195, 177, .4); }
    .form-status.is-info { color: var(--primary-dark); background: rgba(91, 75, 255, .08); border-color: rgba(91, 75, 255, .22); }
    .field-error, .caps-warning { margin: 6px 0 0; font-size: 12px; font-weight: 600; }
    .field-error { color: #b42318; }
    .caps-warning { color: #9a6700; }
    .input-wrapper input[aria-invalid="true"] { border-color: #d63b3b; }
    .input-wrapper input.has-toggle { padding-right: 46px; }
    .toggle-password { position: absolute; top: 50%; right: 8px; width: 34px; height: 34px; display: grid; place-items: center;
      border: 0; border-radius: 9px; background: transparent; color: #7b81a6; cursor: pointer; transform: translateY(-50%); }
    .toggle-password:hover { color: var(--primary); background: rgba(91, 75, 255, .08); }
    .primary-button:disabled { opacity: .7; cursor: progress; transform: none; }
  `;
  document.head.appendChild(style);

  // Message area above the form (screen readers announce changes)
  const status = document.createElement('div');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  form.parentNode.insertBefore(status, form);

  function showStatus(message, type) {
    status.hidden = !message;
    status.textContent = message || '';
    status.className = 'form-status' + (type ? ' is-' + type : '');
  }

  /* ---------- Field errors ---------- */
  function setFieldError(input, message) {
    const group = input.closest('.input-group');
    let error = group.querySelector('.field-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'field-error';
      error.id = input.id + '-error';
      group.appendChild(error);
    }
    error.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
  }
  function clearFieldError(input) {
    const error = input.closest('.input-group').querySelector('.field-error');
    if (error) error.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }

  function validate() {
    const email = emailInput.value.trim();
    let firstInvalid = null;

    if (!email) { setFieldError(emailInput, 'Enter your email address.'); firstInvalid = emailInput; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError(emailInput, 'Enter a valid email, like you@example.com.'); firstInvalid = emailInput; }
    else clearFieldError(emailInput);

    if (!passwordInput.value) { setFieldError(passwordInput, 'Enter your password.'); firstInvalid = firstInvalid || passwordInput; }
    else clearFieldError(passwordInput);

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  emailInput.addEventListener('input', () => clearFieldError(emailInput));
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput));

  /* ---------- Show / hide password ---------- */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'toggle-password';
  toggle.setAttribute('aria-label', 'Show password');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i>';
  passwordInput.classList.add('has-toggle');
  passwordInput.closest('.input-wrapper').appendChild(toggle);

  toggle.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
    toggle.firstElementChild.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    passwordInput.focus();
  });

  /* ---------- Caps Lock warning ---------- */
  const caps = document.createElement('p');
  caps.className = 'caps-warning';
  caps.textContent = 'Caps Lock is on.';
  caps.hidden = true;
  passwordInput.closest('.input-group').appendChild(caps);

  const checkCaps = (event) => { caps.hidden = !(event.getModifierState && event.getModifierState('CapsLock')); };
  passwordInput.addEventListener('keydown', checkCaps);
  passwordInput.addEventListener('keyup', checkCaps);
  passwordInput.addEventListener('blur', () => { caps.hidden = true; });

  /* ---------- Submit ---------- */
  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Signing in…' : 'Log in';
  }

  // login.html?next=profile.html sends the user back where they were headed (only simple same-folder page names)
  function destination() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^[\w-]+\.html$/.test(next) && next !== 'login.html' ? next : HOME_PAGE;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus('');
    if (!validate()) return;

    setBusy(true);
    let result;
    try {
      result = await login(emailInput.value, passwordInput.value, rememberInput.checked);
    } catch (e) {
      result = { ok: false, error: 'Sign-in needs a secure page. Open this site from https:// or http://localhost.' };
    }
    setBusy(false);

    if (!result.ok) {
      showStatus(result.error, 'error');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    try {
      if (rememberInput.checked) localStorage.setItem(KEYS.rememberedEmail, normalizeEmail(emailInput.value));
      else localStorage.removeItem(KEYS.rememberedEmail);
    } catch (e) { /* ignore */ }

    showStatus('Signed in. Redirecting…', 'success');
    window.location.href = destination();
  });

  /* ---------- Forgot password and social buttons (no server yet) ---------- */
  const forgot = form.querySelector('.login-options a');
  if (forgot) {
    forgot.addEventListener('click', (event) => {
      event.preventDefault();
      showStatus('Password reset needs an email service, which is not set up yet.', 'info');
    });
  }
  document.querySelectorAll('.social-button').forEach((button) => {
    button.addEventListener('click', () => {
      const provider = button.textContent.trim();
      showStatus(`${provider} sign-in is not set up yet. Please use your email and password.`, 'info');
    });
  });

  /* ---------- On load: prefill a remembered email and focus the right field ---------- */
  let remembered = '';
  try { remembered = localStorage.getItem(KEYS.rememberedEmail) || ''; } catch (e) { /* ignore */ }
  if (remembered) {
    emailInput.value = remembered;
    rememberInput.checked = true;
    passwordInput.focus();
  } else {
    emailInput.focus();
  }
})();