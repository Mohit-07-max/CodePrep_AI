/* CodePrep AI — history.js
   Makes history.html work. It replaces the inline <script> in the page (the sidebar code is included below).

   Save as Frontend/js/history.js and use this line before </body> in history.html:
       <script src="../js/history.js"></script>

   Features: sidebar · quiz table built from saved attempts · search · language and difficulty filters ·
   sorting (click a column heading, or use the Filters menu) · pagination · live stat cards · insight text ·
   your name in the navbar · working Sign out.

   Where the data comes from: quiz attempts saved in this browser. When your quiz/result page finishes a quiz it should call
       CodePrepHistory.add({ title: 'C Programming Fundamentals', language: 'C', difficulty: 'Intermediate',
                             topics: ['Variables', 'Loops'], correct: 8, total: 10 });
   Until real attempts exist, 24 sample attempts are shown (labelled "sample data"). Set DEMO_WHEN_EMPTY to false to turn that off. */

(function () {
  'use strict';

  /* ============ Settings ============ */
  const DEMO_WHEN_EMPTY = true;
  const PAGE_SIZE = 6;
  const KEYS = { users: 'codeprep:users', session: 'codeprep:session', attempts: (who) => `codeprep:attempts:${who}` };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ============ 1. Sidebar (moved from the inline script, unchanged in behaviour) ============ */
  function initSidebar() {
    const toggle = $('.dashboard-menu-button');
    const drawer = document.getElementById('app-sidebar');
    const overlay = $('.sidebar-overlay');
    const close = $('.drawer-close');
    if (!toggle || !drawer || !overlay || !close) return;

    const setOpen = (open) => {
      document.body.classList.toggle('sidebar-open', open);
      drawer.classList.toggle('is-open', open);
      drawer.inert = !open;
      drawer.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      if (open) close.focus(); else toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')));
    close.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', () => setOpen(false));
    $$('a', drawer).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (event) => {
      if (!drawer.classList.contains('is-open')) return;
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      // Keep Tab inside the open drawer
      const items = $$('a[href], button', drawer);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); if (last) last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
    });
  }

  /* ============ 2. Who is signed in (set by login.js / register.js) ============ */
  function readJSON(storage, key, fallback) {
    try { const v = storage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function currentUser() {
    let email = null;
    try { email = sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session); } catch (e) { /* ignore */ }
    const user = email && readJSON(localStorage, KEYS.users, []).find((u) => u.email === email);
    return user ? { name: user.name, email: user.email } : null;
  }
  const user = currentUser();
  const storageKey = KEYS.attempts(user ? user.email : 'guest');

  function initAccountUI() {
    let profileData = null;
    try {
      profileData = JSON.parse(localStorage.getItem('codeprep:profileData'));
    } catch (e) { /* ignore */ }

    const activeName = (user && user.name) || (profileData && profileData.name) || 'Mohit';
    const first = activeName.split(' ')[0] || activeName;
    const strong = $('.profile-info strong');
    const avatar = $('.avatar, .app-page-avatar');
    const profile = $('.profile');

    if (strong) strong.textContent = first;
    if (profile) profile.setAttribute('aria-label', `${first}’s profile`);

    let customAvatar = null;
    try {
      customAvatar = localStorage.getItem('codeprep:profileAvatar');
    } catch (e) { /* ignore */ }

    if (avatar) {
      if (customAvatar) {
        avatar.style.backgroundImage = `url("${customAvatar}")`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.style.color = 'transparent';
        avatar.textContent = '';
      } else {
        avatar.style.backgroundImage = '';
        avatar.style.color = '';
        avatar.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
      }
    }
    // Turn the sidebar "Sign in" link into a working "Sign out" when someone is signed in
    const link = $('.app-sidebar-account a[href="login.html"]');
    if (user && link) {
      link.title = 'Sign out';
      const label = $('span', link);
      const icon = $('i', link);
      if (label) label.textContent = 'Sign out';
      if (icon) icon.className = 'fa-solid fa-right-from-bracket';
      link.addEventListener('click', () => {
        try { sessionStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.session); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ============ 3. Attempt data ============ */
  const LANGUAGES = {
    'C': { cls: 'c', tag: 'c-tag', icon: 'fa-solid fa-c' },
    'C++': { cls: 'cpp', tag: 'cpp-tag', icon: 'fa-solid fa-code' },
    'Python': { cls: 'python', tag: 'python-tag', icon: 'fa-brands fa-python' },
    'JavaScript': { cls: 'js', tag: 'js-tag', icon: 'fa-brands fa-js' },
  };
  const DIFFICULTY_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  // Cleans one saved attempt so the page never breaks on bad data
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const total = Math.max(0, Math.round(Number(raw.total) || 0));
    const correct = Math.min(total, Math.max(0, Math.round(Number(raw.correct) || 0)));
    const accuracy = total ? clamp((correct / total) * 100) : clamp(raw.accuracy !== undefined ? raw.accuracy : raw.score);
    const date = new Date(raw.date || Date.now());
    return {
      id: String(raw.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      title: String(raw.title || 'Untitled quiz').slice(0, 80),
      language: String(raw.language || 'C'),
      difficulty: DIFFICULTY_RANK[raw.difficulty] !== undefined ? raw.difficulty : 'Beginner',
      topics: Array.isArray(raw.topics) ? raw.topics.map(String).slice(0, 6) : [],
      score: raw.score !== undefined ? clamp(raw.score) : accuracy,
      accuracy, correct, total,
      date: isNaN(date) ? new Date().toISOString() : date.toISOString(),
    };
  }

  // 24 sample attempts (fixed values, so the page looks the same every time)
  function demoAttempts() {
    const plan = [
      ['C Programming Fundamentals', 'C', ['Variables', 'Operators', 'Loops']],
      ['Python Basics', 'Python', ['Variables', 'Lists', 'Loops']],
      ['C++ Control Flow', 'C++', ['Conditions', 'Loops']],
      ['JavaScript Functions', 'JavaScript', ['Functions', 'Arrays']],
      ['Python Functions', 'Python', ['Functions', 'Strings']],
      ['C Pointers & Arrays', 'C', ['Pointers', 'Arrays']],
    ];
    const levels = ['Intermediate', 'Beginner', 'Intermediate', 'Advanced', 'Beginner', 'Advanced'];
    const scores = [82, 91, 64, 76, 88, 58, 96, 73, 79, 85, 61, 70, 92, 67, 74, 81, 55, 89, 77, 69, 84, 72, 90, 66];
    return scores.map((score, i) => {
      const [title, language, topics] = plan[i % plan.length];
      const date = new Date();
      date.setDate(date.getDate() - (i < 7 ? i : 7 + (i - 7) * 2));
      date.setHours(8 + ((i * 5) % 13), (i * 17) % 60, 0, 0);
      return normalize({ id: 'demo-' + i, title, language, difficulty: levels[i % levels.length], topics, correct: Math.round(score / 10), total: 10, score, date });
    });
  }

  let usingDemo = false;
  function loadAttempts() {
    let saved = readJSON(localStorage, storageKey, []);
    if (!Array.isArray(saved) || !saved.length) {
      const quizHistory = readJSON(localStorage, 'codeprep:quizHistory', []);
      if (Array.isArray(quizHistory) && quizHistory.length) {
        saved = quizHistory;
      }
    }
    const list = (Array.isArray(saved) ? saved : []).map(normalize).filter(Boolean);
    usingDemo = list.length === 0 && DEMO_WHEN_EMPTY;
    return usingDemo ? demoAttempts() : list;
  }
  let attempts = loadAttempts();

  function addAttempt(raw) {
    const attempt = normalize(Object.assign({ date: new Date().toISOString() }, raw));
    const saved = readJSON(localStorage, storageKey, []);
    try { localStorage.setItem(storageKey, JSON.stringify([attempt, ...(Array.isArray(saved) ? saved : [])])); } catch (e) { /* storage blocked */ }
    attempts = loadAttempts();
    render();
    return attempt;
  }

  /* ============ 4. Numbers for the stat cards and insight ============ */
  const DAY = 86400000;
  const average = (list) => (list.length ? Math.round(list.reduce((s, a) => s + a.accuracy, 0) / list.length) : 0);

  function summarize(list) {
    const byNewest = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    const now = Date.now();

    // Streak: consecutive days with at least one quiz, counting back from today (or yesterday)
    const days = new Set(list.map((a) => new Date(a.date).toDateString()));
    const cursor = new Date();
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }

    // Trend: average of the 5 newest quizzes versus the 5 before them
    const recent = byNewest.slice(0, 5), before = byNewest.slice(5, 10);
    const trend = before.length ? average(recent) - average(before) : null;

    // Average accuracy for each language
    const perLanguage = {};
    list.forEach((a) => { (perLanguage[a.language] = perLanguage[a.language] || []).push(a); });
    const ranked = Object.entries(perLanguage).map(([language, items]) => ({ language, avg: average(items) })).sort((a, b) => b.avg - a.avg);

    const best = list.reduce((top, a) => (!top || a.score > top.score ? a : top), null);
    return {
      total: list.length,
      thisWeek: list.filter((a) => now - new Date(a.date) < 7 * DAY).length,
      average: average(list), trend, streak, best,
      strongest: ranked[0] || null,
      weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    };
  }

  /* ============ 5. Table state ============ */
  const state = { query: '', language: '', difficulty: '', sortKey: 'date', sortDir: 'desc', page: 1 };

  const SORTERS = {
    title: (a, b) => a.title.localeCompare(b.title),
    language: (a, b) => a.language.localeCompare(b.language),
    difficulty: (a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty],
    score: (a, b) => a.score - b.score,
    accuracy: (a, b) => a.accuracy - b.accuracy,
    date: (a, b) => new Date(a.date) - new Date(b.date),
  };

  function visibleAttempts() {
    const q = state.query.trim().toLowerCase();
    const list = attempts.filter((a) =>
      (!state.language || a.language === state.language) &&
      (!state.difficulty || a.difficulty === state.difficulty) &&
      (!q || [a.title, a.language, a.difficulty, ...a.topics].join(' ').toLowerCase().includes(q)));
    const dir = state.sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => dir * SORTERS[state.sortKey](a, b));
  }

  /* ============ 6. Building the page ============ */
  const tbody = $('.table-wrapper tbody');
  if (!tbody) { // not the history page: still offer the data API, then stop
    window.CodePrepHistory = { add: addAttempt, getAll: () => attempts, summarize };
    initSidebar();
    return;
  }

  // Small helper to build elements safely (text is never treated as HTML)
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(classes) { const i = el('i', classes); i.setAttribute('aria-hidden', 'true'); return i; }

  function formatDate(iso) {
    const date = new Date(iso), now = new Date();
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === now.toDateString()) return 'Today, ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function buildRow(a) {
    const lang = LANGUAGES[a.language] || { cls: 'c', tag: '', icon: 'fa-solid fa-code' };
    const row = el('tr');
    const cell = (...children) => { const td = el('td'); children.forEach((c) => td.appendChild(c)); row.appendChild(td); return td; };

    const name = el('div', 'quiz-name');
    const iconBox = el('div', 'quiz-icon ' + lang.cls); iconBox.appendChild(icon(lang.icon));
    const text = el('div'); text.append(el('strong', '', a.title), el('span', '', a.topics.join(' • ') || a.language));
    name.append(iconBox, text);
    cell(name);

    cell(el('span', 'language-tag ' + lang.tag, a.language));
    cell(el('span', 'difficulty ' + a.difficulty.toLowerCase(), a.difficulty));
    cell(el('strong', 'score', a.score + '%'));

    const accuracy = el('div', 'accuracy'), bar = el('div', 'accuracy-bar'), fill = el('div');
    fill.style.width = a.accuracy + '%';
    bar.appendChild(fill);
    accuracy.append(bar, el('span', '', a.accuracy + '%'));
    cell(accuracy);

    cell(el('span', 'date', formatDate(a.date)));

    const actions = el('div', 'action-buttons');
    const view = el('a'); view.href = 'result.html?id=' + encodeURIComponent(a.id); view.title = 'View Result';
    view.setAttribute('aria-label', 'View quiz result'); view.appendChild(icon('fa-solid fa-chart-simple'));
    const again = el('a'); again.href = `quiz-setup.html?language=${encodeURIComponent(a.language)}&difficulty=${encodeURIComponent(a.difficulty)}`;
    again.title = 'Practice Again'; again.setAttribute('aria-label', 'Practice again'); again.appendChild(icon('fa-solid fa-rotate-right'));
    actions.append(view, again);
    cell(actions);
    return row;
  }

  function buildEmptyRow() {
    const row = el('tr', 'empty-row'), td = el('td');
    td.colSpan = 7;
    if (attempts.length === 0) {
      td.appendChild(el('p', '', 'No quizzes yet. Your attempts will show up here after your first quiz.'));
      const link = el('a', 'new-quiz-btn'); link.href = 'quiz-setup.html'; link.textContent = 'Start a quiz';
      td.appendChild(link);
    } else {
      td.appendChild(el('p', '', 'No quizzes match your search or filters.'));
      const clear = el('button', 'filter-btn', 'Clear filters'); clear.type = 'button';
      clear.addEventListener('click', clearFilters);
      td.appendChild(clear);
    }
    row.appendChild(td);
    return row;
  }

  /* ---------- Stat cards and insight ---------- */
  const statCards = $$('.stat-card');
  function setStat(card, value, note, iconClass) {
    if (!card) return;
    const strong = $('strong', card), small = $('small', card);
    if (strong) strong.textContent = value;
    if (small) { small.textContent = ''; if (iconClass) small.appendChild(icon(iconClass)); small.append(' ' + note); }
  }

  function renderStats() {
    const s = summarize(attempts);
    setStat(statCards[0], String(s.total), s.total ? `${s.thisWeek} this week` : 'Take your first quiz', s.thisWeek ? 'fa-solid fa-arrow-up' : '');
    setStat(statCards[1], s.total ? s.average + '%' : '0%',
      s.trend === null ? 'Keep practising' : s.trend > 0 ? `${s.trend}% improvement` : s.trend < 0 ? `${-s.trend}% lower than before` : 'Holding steady',
      s.trend > 0 ? 'fa-solid fa-arrow-up' : s.trend < 0 ? 'fa-solid fa-arrow-down' : '');
    setStat(statCards[2], `${s.streak} ${s.streak === 1 ? 'Day' : 'Days'}`, s.streak ? 'Keep it going' : 'Practice today to start one', '');
    setStat(statCards[3], s.best ? s.best.score + '%' : '—', s.best ? s.best.language : 'No quizzes yet', '');

    // Insight: plain rules over your own numbers (no AI model is called)
    const heading = $('.ai-insight-text h3'), paragraph = $('.ai-insight-text p');
    if (!heading || !paragraph) return;
    if (!s.total) {
      heading.textContent = 'Take your first quiz to unlock insights.';
      paragraph.textContent = 'Your strongest and weakest areas will appear here once you have some history.';
      return;
    }
    heading.textContent = s.trend === null ? 'You are off to a good start.' : s.trend > 0 ? 'Your recent performance is improving.' : s.trend < 0 ? 'Your recent scores dipped a little.' : 'Your performance is holding steady.';
    let text = `You have completed ${s.thisWeek} ${s.thisWeek === 1 ? 'quiz' : 'quizzes'} this week.`;
    if (s.strongest) text += ` Your strongest area is ${s.strongest.language} (${s.strongest.avg}% average)`;
    if (s.weakest && s.weakest.language !== s.strongest.language) text += `, while ${s.weakest.language} could use more practice.`;
    else if (s.strongest) text += '.';
    paragraph.textContent = text;
  }

  /* ---------- Pagination ---------- */
  const pagination = $('.pagination');
  function pageNumbers(current, last) {
    const set = new Set([1, last, current - 1, current, current + 1]);
    const pages = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const out = [];
    pages.forEach((p, i) => { if (i && p - pages[i - 1] > 1) out.push('…'); out.push(p); });
    return out;
  }
  function renderPagination(total, pages) {
    if (!pagination) return;
    pagination.textContent = '';
    const from = total ? (state.page - 1) * PAGE_SIZE + 1 : 0;
    const to = Math.min(total, state.page * PAGE_SIZE);
    const info = el('span');
    info.append('Showing ', el('strong', '', total ? `${from}–${to}` : '0'), ' of ', el('strong', '', String(total)));

    const buttons = el('div', 'pagination-buttons');
    const make = (content, page, disabled, label) => {
      const b = el('button'); b.type = 'button'; b.disabled = disabled;
      if (typeof content === 'string') b.textContent = content; else b.appendChild(content);
      if (label) b.setAttribute('aria-label', label);
      if (page === state.page && typeof content === 'string') { b.classList.add('active'); b.setAttribute('aria-current', 'page'); }
      if (!disabled) b.addEventListener('click', () => { state.page = page; render(); });
      return b;
    };
    buttons.appendChild(make(icon('fa-solid fa-chevron-left'), state.page - 1, state.page <= 1, 'Previous page'));
    pageNumbers(state.page, pages).forEach((p) => buttons.appendChild(p === '…' ? make('…', 0, true) : make(String(p), p, false, `Page ${p}`)));
    buttons.appendChild(make(icon('fa-solid fa-chevron-right'), state.page + 1, state.page >= pages, 'Next page'));
    pagination.append(info, buttons);
  }

  /* ---------- Main render ---------- */
  const countBadge = $('.quiz-count');
  const headers = $$('.table-wrapper thead th');
  const HEADER_KEYS = ['title', 'language', 'difficulty', 'score', 'accuracy', 'date'];

  function render() {
    const list = visibleAttempts();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);

    tbody.textContent = '';
    if (list.length === 0) tbody.appendChild(buildEmptyRow());
    else list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE).forEach((a) => tbody.appendChild(buildRow(a)));

    renderPagination(list.length, pages);
    renderStats();
    if (countBadge) countBadge.textContent = `${attempts.length} ${attempts.length === 1 ? 'Attempt' : 'Attempts'}${usingDemo ? ' · sample data' : ''}`;

    headers.forEach((th, i) => {
      if (!HEADER_KEYS[i]) return;
      th.setAttribute('aria-sort', HEADER_KEYS[i] === state.sortKey ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    const active = (state.language ? 1 : 0) + (state.difficulty ? 1 : 0) + (state.query.trim() ? 1 : 0);
    if (filterLabel) filterLabel.textContent = active ? `Filters (${active})` : 'Filters';
    if (sortSelect) sortSelect.value = ['date:desc', 'date:asc', 'score:desc', 'score:asc'].includes(`${state.sortKey}:${state.sortDir}`) ? `${state.sortKey}:${state.sortDir}` : '';
  }

  /* ============ 7. Search, filters, sorting ============ */
  const searchInput = $('.search-box input');
  const [languageSelect, difficultySelect] = $$('.filter-group select');
  const filterButton = $('.filter-btn');
  let filterLabel = null, sortSelect = null;

  function clearFilters() {
    state.query = state.language = state.difficulty = '';
    if (searchInput) searchInput.value = '';
    if (languageSelect) languageSelect.selectedIndex = 0;
    if (difficultySelect) difficultySelect.selectedIndex = 0;
    state.page = 1;
    render();
  }

  if (searchInput) {
    searchInput.setAttribute('aria-label', 'Search quizzes');
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = searchInput.value; state.page = 1; render(); }, 150);
    });
  }
  if (languageSelect) {
    languageSelect.setAttribute('aria-label', 'Filter by language');
    languageSelect.addEventListener('change', () => { state.language = languageSelect.selectedIndex ? languageSelect.value : ''; state.page = 1; render(); });
  }
  if (difficultySelect) {
    difficultySelect.setAttribute('aria-label', 'Filter by difficulty');
    difficultySelect.addEventListener('change', () => { state.difficulty = difficultySelect.selectedIndex ? difficultySelect.value : ''; state.page = 1; render(); });
  }

  // Click (or press Enter on) a column heading to sort by it; click again to reverse
  headers.forEach((th, i) => {
    const key = HEADER_KEYS[i];
    if (!key) return;
    th.classList.add('sortable');
    th.tabIndex = 0;
    const sortBy = () => {
      state.sortDir = state.sortKey === key && state.sortDir === 'asc' ? 'desc' : state.sortKey === key ? 'asc' : (key === 'title' || key === 'language' ? 'asc' : 'desc');
      state.sortKey = key;
      state.page = 1;
      render();
    };
    th.addEventListener('click', sortBy);
    th.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sortBy(); } });
  });

  // The "Filters" button opens a small menu with sorting and a reset
  if (filterButton) {
    filterButton.type = 'button';
    filterButton.textContent = '';
    filterLabel = el('span', '', 'Filters');
    filterButton.append(icon('fa-solid fa-sliders'), filterLabel);
    filterButton.setAttribute('aria-haspopup', 'true');
    filterButton.setAttribute('aria-expanded', 'false');

    const menu = el('div', 'filter-menu');
    menu.hidden = true;
    const sortLabel = el('label', '', 'Sort by');
    sortSelect = el('select');
    [['date:desc', 'Newest first'], ['date:asc', 'Oldest first'], ['score:desc', 'Highest score'], ['score:asc', 'Lowest score']].forEach(([value, text]) => {
      const option = el('option', '', text); option.value = value; sortSelect.appendChild(option);
    });
    sortLabel.appendChild(sortSelect);
    const reset = el('button', 'filter-btn', 'Clear all filters'); reset.type = 'button';
    menu.append(sortLabel, reset);
    filterButton.parentNode.style.position = 'relative';
    filterButton.parentNode.appendChild(menu);

    const setMenu = (open) => { menu.hidden = !open; filterButton.setAttribute('aria-expanded', String(open)); };
    filterButton.addEventListener('click', () => setMenu(menu.hidden));
    sortSelect.addEventListener('change', () => { [state.sortKey, state.sortDir] = sortSelect.value.split(':'); state.page = 1; render(); });
    reset.addEventListener('click', () => { clearFilters(); setMenu(false); });
    document.addEventListener('click', (event) => { if (!menu.hidden && !menu.contains(event.target) && !filterButton.contains(event.target)) setMenu(false); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); filterButton.focus(); } });
  }

  // Styles for the pieces this script adds (move them into history.css if you prefer)
  const style = document.createElement('style');
  style.textContent = `
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { color: var(--blue); }
    th.sortable[aria-sort="ascending"]::after { content: " \\25B2"; font-size: .7em; }
    th.sortable[aria-sort="descending"]::after { content: " \\25BC"; font-size: .7em; }
    .empty-row td { padding: 44px 14px; text-align: center; color: var(--text-secondary); }
    .empty-row p { margin: 0 0 14px; }
    .filter-menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 20; display: grid; gap: 12px; min-width: 210px; padding: 14px;
      border: 1px solid var(--border-light); border-radius: 14px; background: var(--card); box-shadow: var(--shadow); }
    .filter-menu[hidden] { display: none; }
    .filter-menu label { display: grid; gap: 6px; font-size: .75rem; font-weight: 600; color: var(--text-secondary); }
    .filter-menu select { height: 38px; padding: 0 10px; border: 1px solid var(--border); border-radius: 9px; background: #fff; font: inherit; color: var(--text); }
    .filter-menu .filter-btn { justify-content: center; }
  `;
  document.head.appendChild(style);

  /* ============ Start ============ */
  window.CodePrepHistory = {
    add: addAttempt,                  // save a finished quiz and refresh the page
    getAll: () => attempts.slice(),
    summarize,
    clear: () => { try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ } attempts = loadAttempts(); render(); },
  };
  initSidebar();
  initAccountUI();
  render();
})();