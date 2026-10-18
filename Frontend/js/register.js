/* CodePrep AI — register.js
   Makes register.html work: validation, account creation, show/hide password, and automatic sign-in.

   Save as Frontend/js/register.js and add this line before </body> in register.html:
       <script src="../js/register.js"></script>
   Do NOT load login.js on this page. It targets the same form class and is only for login.html.

   Accounts are saved in this browser's localStorage in exactly the format login.js reads, so anyone who
   registers here can log in on login.html. There is no server yet, so this is a demo, not real security.

   Messages appear in a floating note (not inside the form) because register.css locks the page to one screen. */

(function () {
  'use strict';

  /* ============ Settings (must match login.js) ============ */
  const KEYS = {
    users: 'codeprep:users',     // [{ name, email, salt, hash, joined }]
    session: 'codeprep:session', // the signed-in email
  };
  const HOME_PAGE = 'dashboard.html'; // where to go after registering
  const MIN_PASSWORD = 8;

  /* ============ Storage and hashing ============ */
  function readUsers() {
    try { return JSON.parse(localStorage.getItem(KEYS.users)) || []; } catch (e) { return []; }
  }
  const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

  async function hashPassword(password, salt) {
    if (!(window.crypto && window.crypto.subtle)) throw new Error('insecure-context');
    return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password)));
  }

  /* ============ Account creation ============ */
  const cleanName = (name) => String(name).trim().replace(/\s+/g, ' ');
  const cleanEmail = (email) => String(email).trim().toLowerCase();

  async function register(name, email, password) {
    const users = readUsers();
    const mail = cleanEmail(email);
    if (users.some((u) => u.email === mail)) return { ok: false, code: 'exists', error: 'An account with this email already exists.' };

    const salt = newSalt();
    users.push({ name: cleanName(name), email: mail, salt, hash: await hashPassword(password, salt), joined: new Date().toISOString() });
    try {
      localStorage.setItem(KEYS.users, JSON.stringify(users));
    } catch (e) {
      return { ok: false, code: 'storage', error: 'Could not save your account. Check that browser storage is not blocked.' };
    }
    return { ok: true, email: mail };
  }

  window.CodePrepAuth = Object.assign(window.CodePrepAuth || {}, { register });

  /* ============ Page behaviour (only runs on the register page) ============ */
  const form = document.querySelector('.auth-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');
  const termsInput = form && form.querySelector('input[name="terms"]');
  if (!form || !nameInput || !emailInput || !passwordInput || !confirmInput || !termsInput) return;

  form.noValidate = true; // we show our own, friendlier messages
  const submitButton = form.querySelector('.primary-button');
  const submitLabel = submitButton.querySelector('span');

  // Styles for the pieces this script adds (move them into register.css if you prefer)
  const style = document.createElement('style');
  style.textContent = `
    .input-wrapper.has-error { border-color: #d63b3b; }
    .terms.has-error { color: #b42318; }
    .toggle-password { flex: 0 0 auto; width: 32px; height: 32px; margin-right: 6px; display: grid; place-items: center;
      border: 0; border-radius: 7px; background: transparent; color: var(--muted-foreground); cursor: pointer; }
    .toggle-password:hover { color: var(--primary); background: var(--background); }
    .toast { position: fixed; top: 14px; left: 50%; z-index: 100; width: max-content; max-width: min(92vw, 440px);
      padding: 11px 16px; border-radius: 12px; border: 1px solid transparent; font-size: 12px; font-weight: 600; line-height: 1.5;
      box-shadow: 0 12px 30px oklch(0.25 0.05 275 / 18%); transform: translate(-50%, -12px); opacity: 0; pointer-events: none;
      transition: opacity .2s ease, transform .2s ease; }
    .toast.show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
    .toast a { color: inherit; text-decoration: underline; margin-left: 6px; }
    .toast.is-error { color: #b42318; background: #fff0ee; border-color: rgba(214, 59, 59, .35); }
    .toast.is-success { color: #0b7a6e; background: #e6faf6; border-color: rgba(25, 195, 177, .5); }
    .toast.is-info { color: var(--primary); background: #f0eeff; border-color: rgba(91, 75, 255, .3); }
    .primary-button:disabled { opacity: .7; cursor: progress; }
    @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
  `;
  document.head.appendChild(style);

  /* ---------- Floating message ---------- */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;

  function showToast(message, type, link) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      toast.appendChild(a);
    }
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.className = 'toast is-' + type + ' show';
    if (type !== 'success') toastTimer = setTimeout(hideToast, 7000);
  }
  function hideToast() { toast.classList.remove('show'); }

  /* ---------- Marking invalid fields ---------- */
  function markInvalid(input, invalid) {
    const box = input === termsInput ? input.closest('.terms') : input.closest('.input-wrapper');
    box.classList.toggle('has-error', invalid);
    if (invalid) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  [nameInput, emailInput, passwordInput, confirmInput, termsInput].forEach((input) => {
    input.addEventListener(input === termsInput ? 'change' : 'input', () => markInvalid(input, false));
  });

  /* ---------- Validation ---------- */
  function validate() {
    const problems = []; // { input, message }
    const name = cleanName(nameInput.value);
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (name.length < 2) problems.push({ input: nameInput, message: 'Enter your full name (at least 2 characters).' });
    else if (name.length > 60) problems.push({ input: nameInput, message: 'Your name can be up to 60 characters.' });

    if (!email) problems.push({ input: emailInput, message: 'Enter your email address.' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push({ input: emailInput, message: 'Enter a valid email, like you@example.com.' });

    if (password.length < MIN_PASSWORD) problems.push({ input: passwordInput, message: `Your password needs at least ${MIN_PASSWORD} characters.` });
    else if (password.length > 128) problems.push({ input: passwordInput, message: 'Your password can be up to 128 characters.' });
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) problems.push({ input: passwordInput, message: 'Use at least one letter and one number in your password.' });

    if (!confirmInput.value) problems.push({ input: confirmInput, message: 'Repeat your password to confirm it.' });
    else if (confirmInput.value !== password) problems.push({ input: confirmInput, message: 'The two passwords do not match.' });

    if (!termsInput.checked) problems.push({ input: termsInput, message: 'Please accept the Terms of Service and Privacy Policy.' });

    [nameInput, emailInput, passwordInput, confirmInput, termsInput].forEach((input) => markInvalid(input, false));
    problems.forEach((p) => markInvalid(p.input, true));

    if (problems.length) {
      const extra = problems.length > 1 ? ` (${problems.length - 1} more to fix)` : '';
      showToast(problems[0].message + extra, 'error');
      problems[0].input.focus();
    }
    return problems.length === 0;
  }

  /* ---------- Show / hide passwords (one button controls both fields) ---------- */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'toggle-password';
  toggle.setAttribute('aria-label', 'Show passwords');
  toggle.setAttribute('aria-pressed', 'false');
  const EYE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  const eyeOpen = EYE + '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed = EYE + '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/></svg>';
  toggle.innerHTML = eyeOpen;
  passwordInput.closest('.input-wrapper').appendChild(toggle);

  toggle.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = confirmInput.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Hide passwords' : 'Show passwords');
    toggle.setAttribute('aria-pressed', String(show));
    toggle.innerHTML = show ? eyeClosed : eyeOpen;
    passwordInput.focus();
  });

  /* ---------- Submit ---------- */
  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Creating account…' : 'Create account';
  }

  // register.html?next=profile.html continues to that page afterwards (simple same-folder page names only)
  function destination() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^[\w-]+\.html$/.test(next) && !['login.html', 'register.html'].includes(next) ? next : HOME_PAGE;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideToast();
    if (!validate()) return;

    setBusy(true);
    let result;
    try {
      result = await register(nameInput.value, emailInput.value, passwordInput.value);
    } catch (e) {
      result = { ok: false, code: 'secure', error: 'Creating an account needs a secure page. Open this site from https:// or http://localhost.' };
    }
    setBusy(false);

    if (!result.ok) {
      if (result.code === 'exists') {
        markInvalid(emailInput, true);
        showToast(result.error, 'error', { text: 'Log in instead', href: 'login.html' });
        emailInput.focus();
      } else {
        showToast(result.error, 'error');
      }
      return;
    }

    // Sign the new user in for this tab, then continue
    try { sessionStorage.setItem(KEYS.session, result.email); } catch (e) { /* ignore */ }
    showToast('Account created! Taking you to your dashboard…', 'success');
    setTimeout(() => { window.location.href = destination(); }, 900);
  });

  /* ---------- Terms links and social buttons (no pages or server yet) ---------- */
  document.querySelectorAll('.terms a').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showToast(`The ${link.textContent.trim()} page is not available yet.`, 'info');
    });
  });
  document.querySelectorAll('.social-button').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(`${button.textContent.trim()} sign-up is not set up yet. Please use your email and password.`, 'info');
    });
  });

  nameInput.focus();
})();