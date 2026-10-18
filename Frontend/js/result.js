/* CodePrep AI — result.js
   Makes result.html show a real quiz result. It replaces the inline <script> in the page (the sidebar code is included below).

   Save as Frontend/js/result.js and use this line before </body> in result.html:
       <script src="../js/result.js"></script>

   Which result is shown:
     1. result.html?id=abc123   -> the attempt with that id, from the saved attempts (the links on history.html use this)
     2. otherwise               -> the most recent result saved under  codeprep:lastResult
     3. nothing saved yet       -> a built-in sample result, clearly labelled "SAMPLE RESULT"

   When a quiz finishes, quiz.html should save the result in this shape (one object):
     {
       id: 'k3j9x2', title: 'C Programming Quiz', language: 'C Programming', difficulty: 'Intermediate',
       date: '2026-10-13T18:30:00Z', seconds: 768,
       questions: [
         { topic: 'Loops', text: 'What does this print?', userAnswer: '3', correctAnswer: '4', explanation: 'optional' },
         ...                                  // userAnswer '' or null = skipped; status:'correct'|'incorrect'|'skipped' is optional
       ]
     }
   Save it with:   localStorage.setItem('codeprep:lastResult', JSON.stringify(result))
   and add it to the history list with:   CodePrepHistory.add({ ...summary })   (see history.js)
   A result with only { language, difficulty, correct, total, date } still works, but the chart, topic bars and
   question review need the per-question list, so they show a short note instead. */

(function () {
  'use strict';

  const KEYS = {
    users: 'codeprep:users',
    session: 'codeprep:session',
    lastResult: 'codeprep:lastResult',
    attempts: (who) => `codeprep:attempts:${who}`,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (text) => String(text === undefined || text === null ? '' : text).replace(/\s+/g, ' ').trim();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(classes) { const i = el('i', classes); i.setAttribute('aria-hidden', 'true'); return i; }
  function setText(selector, text, root) { const node = $(selector, root); if (node) node.textContent = text; }

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
      const items = $$('a[href], button', drawer); // keep Tab inside the open drawer
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); if (last) last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
    });
  }

  /* ============ 2. Who is signed in (set by login.js / register.js) ============ */
  function readJSON(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function currentUser() {
    let email = null;
    try { email = sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session); } catch (e) { /* ignore */ }
    const users = readJSON(KEYS.users, []);
    const user = email && Array.isArray(users) && users.find((u) => u.email === email);
    return user ? { name: String(user.name || ''), email: user.email } : null;
  }
  const user = currentUser();
  const firstName = user ? (user.name.split(' ')[0] || user.name) : '';

  function initAccountUI() {
    let profileData = null;
    try {
      profileData = JSON.parse(localStorage.getItem('codeprep:profileData'));
    } catch (e) { /* ignore */ }

    const activeName = (user && user.name) || (profileData && profileData.name) || 'Mohit';
    const activeFirst = activeName.split(' ')[0] || activeName;

    setText('.profile-info strong', activeFirst);
    const profile = $('.profile');
    if (profile) profile.setAttribute('aria-label', `${activeFirst}’s profile`);

    let customAvatar = null;
    try {
      customAvatar = localStorage.getItem('codeprep:profileAvatar');
    } catch (e) { /* ignore */ }

    const avatar = $('.avatar, .app-page-avatar');
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
      setText('span', 'Sign out', link);
      const i = $('i', link);
      if (i) i.className = 'fa-solid fa-right-from-bracket';
      link.addEventListener('click', () => {
        try { sessionStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.session); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ============ 3. Getting the result to show ============ */
  const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

  function statusOf(q) {
    const given = clean(q.userAnswer);
    if (q.status === 'correct' || q.status === 'incorrect' || q.status === 'skipped') return q.status;
    if (typeof q.correct === 'boolean') return q.correct ? 'correct' : 'incorrect';
    if (!given) return 'skipped';
    return given.toLowerCase() === clean(q.correctAnswer).toLowerCase() ? 'correct' : 'incorrect';
  }

  // Cleans any saved result so the page never breaks on bad data
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const date = new Date(raw.date || Date.now());
    const base = {
      id: String(raw.id || ''),
      title: clean(raw.title) || 'Practice quiz',
      language: clean(raw.languageLabel) || clean(raw.language) || 'C Programming',
      difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'Intermediate',
      date: isNaN(date) ? new Date() : date,
      seconds: Math.max(0, Math.round(Number(raw.seconds !== undefined ? raw.seconds : raw.timeTaken) || 0)),
    };

    if (Array.isArray(raw.questions) && raw.questions.length) {
      const questions = raw.questions.slice(0, 100).map((q) => ({
        topic: clean(q && q.topic) || 'General',
        text: clean(q && q.text) || 'Question',
        userAnswer: clean(q && q.userAnswer),
        correctAnswer: clean(q && q.correctAnswer),
        explanation: clean(q && q.explanation),
        status: statusOf(q || {}),
      }));
      const correct = questions.filter((q) => q.status === 'correct').length;
      const skipped = questions.filter((q) => q.status === 'skipped').length;
      return Object.assign(base, { questions, total: questions.length, correct, skipped, wrong: questions.length - correct - skipped, hasDetail: true });
    }

    // Summary only (for example an entry from the history list)
    const total = Math.max(0, Math.round(Number(raw.total) || 0));
    const correct = Math.min(total, Math.max(0, Math.round(Number(raw.correct) || 0)));
    const skipped = Math.min(total - correct, Math.max(0, Math.round(Number(raw.skipped) || 0)));
    if (!total) return null;
    return Object.assign(base, { questions: [], total, correct, skipped, wrong: total - correct - skipped, hasDetail: false });
  }

  // A fixed sample (8 of 10, with Q4 and Q8 wrong), shown when nothing has been saved yet
  function sampleResult() {
    const q = (topic, text, user, right, explanation) => ({ topic, text, userAnswer: user, correctAnswer: right, explanation });
    return normalize({
      id: 'sample', title: 'C Programming Fundamentals', language: 'C Programming', difficulty: 'Intermediate',
      date: new Date().toISOString(), seconds: 768,
      questions: [
        q('Variables & Data Types', 'Which type stores a single character in C?', 'char', 'char'),
        q('Operators', 'What is the value of 7 % 3?', '1', '1'),
        q('Conditional Statements', 'Which keyword handles every other case in a switch?', 'default', 'default'),
        q('Loops', 'How many times does for (i = 0; i < 3; i++) run its body?', '4', '3', 'The loop runs for i = 0, 1 and 2, so three times.'),
        q('Variables & Data Types', 'What is sizeof(char) in C?', '1', '1'),
        q('Operators', 'What does 5 / 2 give when both are int?', '2', '2'),
        q('Conditional Statements', 'Which operator checks equality?', '==', '=='),
        q('Functions', 'What does a function declared void return?', 'An int', 'Nothing', 'void means the function gives back no value.'),
        q('Loops', 'Which loop always runs its body at least once?', 'do-while', 'do-while'),
        q('Operators', 'What does i++ do?', 'Adds 1 after use', 'Adds 1 after use'),
      ],
    });
  }

  function loadResult() {
    const id = new URLSearchParams(window.location.search).get('id');
    const who = user ? user.email : 'guest';
    let raw = null;
    if (id) {
      const saved = readJSON(KEYS.attempts(who), []);
      raw = (Array.isArray(saved) ? saved : []).find((a) => a && String(a.id) === id) || null;
      if (!raw) { const last = readJSON(KEYS.lastResult, null); if (last && String(last.id) === id) raw = last; }
    } else {
      raw = readJSON(KEYS.lastResult, null);
    }
    const result = normalize(raw);
    if (result) return { result, sample: false, missing: false };
    return { result: sampleResult(), sample: true, missing: Boolean(id) };
  }

  /* ============ 4. Numbers and rules ============ */
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
  function formatTime(seconds) { return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '—'; }
  function formatDate(date) { return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

  const level = (score) => (score >= 90 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Developing' : 'Getting started');
  const barColor = (p) => (p >= 95 ? 'green' : p >= 80 ? 'blue' : p >= 65 ? 'orange' : 'red');

  function topicStats(result) {
    const groups = {};
    result.questions.forEach((q) => {
      const g = (groups[q.topic] = groups[q.topic] || { name: q.topic, right: 0, total: 0 });
      g.total++;
      if (q.status === 'correct') g.right++;
    });
    return Object.values(groups).map((g) => ({ name: g.name, pct: pct(g.right, g.total) })).sort((a, b) => b.pct - a.pct);
  }

  const TIPS = [
    ['loop', 'Trace a loop by hand: write down the counter on every pass, and check the start value and the stopping condition.'],
    ['function', 'Practise writing small functions: decide the inputs and the return type first, then the body.'],
    ['pointer', 'Draw boxes for variables and arrows for pointers to see what each * and & does.'],
    ['array', 'Remember that indexes start at 0 and the last index is length minus 1.'],
    ['string', 'Review how strings are stored and which helper functions work on them.'],
    ['variable', 'Re-check the size and range of each data type and when a value gets converted.'],
    ['operator', 'Write out operator precedence on a card and test small expressions by hand.'],
    ['conditional', 'Walk through each if/else branch with real values to see which one runs.'],
  ];
  const tipFor = (topic) => (TIPS.find(([key]) => topic.toLowerCase().includes(key)) || [0, 'Review this topic and try a few more practice questions.'])[1];

  /* ============ 5. Drawing the page ============ */
  const { result, sample, missing } = loadResult();
  const score = pct(result.correct, result.total); // score and accuracy are the same number, so the page never disagrees with itself
  const topics = result.hasDetail ? topicStats(result) : [];

  function renderHero() {
    const heading = score >= 80 ? 'Great Work' : score >= 60 ? 'Good Effort' : 'Keep Going';
    setText('.result-hero h1', firstName ? `${heading}, ${firstName}!` : `${heading}!`);
    setText('.completed-label', sample ? 'SAMPLE RESULT' : 'QUIZ COMPLETED');
    let text = `You have completed your ${result.language} practice quiz. Here's a breakdown of your performance.`;
    if (missing) text = 'We could not find that attempt, so a sample result is shown. ' + text;
    else if (sample) text = 'No quiz result is saved yet, so this is a sample. ' + text;
    setText('.hero-content p', text);

    setText('.score-inner strong', score + '%');
    const circle = $('.score-circle');
    if (circle) {
      const degrees = Math.round(score * 3.6);
      circle.style.background = `conic-gradient(var(--blue) 0deg ${degrees}deg, rgba(91, 75, 255, 0.1) ${degrees}deg 360deg)`;
    }
    setText('.score-label', `Preparation Level: ${level(score)}`);
  }

  function renderStats() {
    const cards = $$('.stat-card');
    const values = [`${result.correct} / ${result.total}`, String(result.wrong + result.skipped), formatTime(result.seconds), score + '%'];
    cards.forEach((card, i) => { if (values[i] !== undefined) setText('strong', values[i], card); });

    setText('.large-score strong', score + '%');
    const bar = $('.score-bar div');
    if (bar) bar.style.width = score + '%';
    setText('.large-score small', `${result.correct} correct out of ${result.total} ${result.total === 1 ? 'question' : 'questions'}`);

    const mini = $$('.mini-stat strong');
    [result.correct, result.wrong, result.skipped].forEach((value, i) => { if (mini[i]) mini[i].textContent = value; });

    const badge = $('.result-badge');
    if (badge) {
      const text = score >= 85 ? 'Excellent Work' : score >= 65 ? 'Good Progress' : 'Keep Practising';
      badge.textContent = '';
      badge.append(icon(score >= 65 ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-right'), ' ' + text);
    }
    setText('.chart-summary strong', score + '%');
  }

  /* ---------- Accuracy chart ---------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes).forEach((name) => node.setAttribute(name, attributes[name]));
    return node;
  }

  function renderChart() {
    const svg = $('.accuracy-chart');
    if (!svg) return;
    $$('.accuracy-area, .accuracy-line, .accuracy-point, .chart-question-label', svg).forEach((node) => node.remove());
    if (!result.hasDetail) {
      const note = svgEl('text', { class: 'chart-axis-label', x: '337', y: '125', 'text-anchor': 'middle' });
      note.textContent = 'Question-by-question data is not available for this attempt.';
      svg.appendChild(note);
      return;
    }

    // x runs from 58 to 616; y runs from 192 (0%) up to 48 (100%), matching the grid lines already in the page
    const n = result.questions.length;
    const xAt = (i) => (n === 1 ? 337 : 58 + (i * (616 - 58)) / (n - 1));
    const yAt = (percent) => Math.round((192 - percent * 1.44) * 10) / 10;
    let right = 0;
    const points = result.questions.map((q, i) => {
      if (q.status === 'correct') right++;
      return { x: Math.round(xAt(i) * 10) / 10, y: yAt((right / (i + 1)) * 100), missed: q.status !== 'correct' };
    });

    const line = points.map((p) => `${p.x} ${p.y}`).join(' L');
    svg.appendChild(svgEl('path', { class: 'accuracy-area', d: `M${points[0].x} 192 L${line} L${points[n - 1].x} 192 Z` }));
    svg.appendChild(svgEl('path', { class: 'accuracy-line', d: `M${line}` }));
    points.forEach((p) => svg.appendChild(svgEl('circle', { class: 'accuracy-point' + (p.missed ? ' missed-point' : ''), cx: p.x, cy: p.y, r: 5 })));

    const every = Math.ceil(n / 10); // keep the labels readable on long quizzes
    points.forEach((p, i) => {
      if (i % every !== 0 && i !== n - 1) return;
      const label = svgEl('text', { class: 'chart-question-label', x: p.x, y: 224 });
      label.textContent = String(i + 1);
      svg.appendChild(label);
    });

    const firstAccuracy = result.questions[0].status === 'correct' ? 100 : 0;
    const missed = result.questions.map((q, i) => (q.status !== 'correct' ? i + 1 : 0)).filter(Boolean);
    const description = $('desc', svg);
    if (description) {
      description.textContent = `Accuracy started at ${firstAccuracy} percent and ended at ${score} percent.` +
        (missed.length ? ` It dipped after incorrect or skipped answers to ${missed.length === 1 ? 'question' : 'questions'} ${missed.join(', ')}.` : ' You answered every question correctly.');
    }
  }

  /* ---------- Topic bars ---------- */
  function renderTopics() {
    const list = $('.topic-list');
    if (!list) return;
    list.textContent = '';
    if (!topics.length) {
      list.appendChild(el('p', 'result-note', 'Topic breakdown is not available for this attempt.'));
      return;
    }
    topics.forEach((t) => {
      const row = el('div', 'topic-row');
      const name = el('div', 'topic-name');
      name.append(el('span', '', t.name), el('strong', '', t.pct + '%'));
      const track = el('div', 'topic-progress'), fill = el('div', barColor(t.pct) + '-progress');
      fill.style.width = t.pct + '%';
      track.appendChild(fill);
      row.append(name, track);
      list.appendChild(row);
    });
  }

  /* ---------- Question breakdown and review ---------- */
  function renderBreakdown() {
    const grid = $('.question-grid');
    const panel = $('.breakdown-panel');
    if (!grid || !panel) return;
    grid.textContent = '';
    if (!result.hasDetail) {
      grid.appendChild(el('p', 'result-note', 'Question review is not available for this attempt.'));
      const button = $('.review-btn');
      if (button) button.hidden = true;
      return;
    }

    const review = el('div', 'review-panel');
    review.hidden = true;
    review.setAttribute('aria-live', 'polite');
    panel.appendChild(review);

    const tiles = [];
    function show(index) {
      const q = result.questions[index];
      tiles.forEach((tile, i) => tile.setAttribute('aria-pressed', String(i === index)));
      review.hidden = false;
      review.textContent = '';
      const head = el('div', 'review-head');
      head.append(el('strong', '', `Question ${index + 1}`), el('span', 'review-topic', q.topic), el('span', 'review-status ' + q.status, q.status));
      review.append(head, el('p', 'review-question', q.text));
      review.appendChild(el('p', '', `Your answer: ${q.userAnswer || 'Skipped'}`));
      if (q.status !== 'correct' && q.correctAnswer) review.appendChild(el('p', 'review-right', `Correct answer: ${q.correctAnswer}`));
      if (q.explanation) review.appendChild(el('p', 'review-hint', q.explanation));
    }

    result.questions.forEach((q, i) => {
      const tile = el('div', 'question-item ' + q.status);
      tile.tabIndex = 0;
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', `Question ${i + 1}: ${q.status}`);
      tile.append(el('span', '', String(i + 1).padStart(2, '0')), icon(q.status === 'correct' ? 'fa-solid fa-check' : q.status === 'incorrect' ? 'fa-solid fa-xmark' : 'fa-solid fa-minus'));
      tile.addEventListener('click', () => show(i));
      tile.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(i); } });
      tiles.push(tile);
      grid.appendChild(tile);
    });

    // "Review Answers" opens the review panel on the first question you missed
    const button = $('.review-btn');
    if (button) {
      button.type = 'button';
      button.addEventListener('click', () => {
        const firstMiss = result.questions.findIndex((q) => q.status !== 'correct');
        show(firstMiss === -1 ? 0 : firstMiss);
        if (review.scrollIntoView) review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  /* ---------- AI analysis (plain rules over your answers; no AI model is called) ---------- */
  function fillTags(box, names, emptyText) {
    if (!box) return;
    box.textContent = '';
    (names.length ? names : [emptyText]).forEach((name) => box.appendChild(el('span', '', name)));
  }

  function renderAnalysis() {
    setText('.ai-description', score >= 80
      ? `Your performance shows a strong understanding of ${result.language} concepts.`
      : score >= 60
        ? `You have a solid base in ${result.language}, with a few topics to tighten up.`
        : `${result.language} is still new ground. Focus on the basics and go through each answer in the review.`);

    const strong = topics.filter((t) => t.pct >= 80).slice(0, 4).map((t) => t.name);
    const weak = topics.filter((t) => t.pct < 70).reverse().slice(0, 4).map((t) => t.name);
    const [strongBox, weakBox] = $$('.ai-section .tag-list'); // first = strong areas, second = needs practice
    fillTags(strongBox, strong, result.hasDetail ? 'Keep practising' : 'No topic data');
    fillTags(weakBox, weak, result.hasDetail ? 'None, nice work' : 'No topic data');

    const card = $('.ai-card'), button = $('.ai-feedback-btn');
    if (!card || !button) return;
    const extra = el('div', 'ai-extra');
    extra.hidden = true;
    extra.appendChild(el('p', '', `You answered ${result.correct} of ${result.total} correctly (${score}%).`));
    if (result.seconds && result.total) extra.appendChild(el('p', '', `That is about ${Math.round(result.seconds / result.total)} seconds per question.`));
    topics.filter((t) => t.pct < 70).forEach((t) => extra.appendChild(el('p', '', `${t.name} (${t.pct}%): ${tipFor(t.name)}`)));
    if (result.hasDetail && !topics.some((t) => t.pct < 70)) extra.appendChild(el('p', '', 'Every topic is at 70% or higher. Try a harder difficulty next.'));
    extra.appendChild(el('p', 'ai-note', 'Generated from your answers by simple rules, not by an AI model.'));
    card.appendChild(extra);

    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      extra.hidden = !extra.hidden;
      button.setAttribute('aria-expanded', String(!extra.hidden));
    });
  }

  function renderDetails() {
    const rows = $$('.detail-row strong');
    const values = [result.language, result.difficulty, String(result.total), `${result.total - result.skipped} / ${result.total}`, formatDate(result.date)];
    values.forEach((value, i) => { if (rows[i]) rows[i].textContent = value; });

    const again = $('.primary-btn');
    if (again) again.setAttribute('href', `quiz-setup.html?language=${encodeURIComponent(result.language)}&difficulty=${encodeURIComponent(result.difficulty)}`);
  }

  // Styles for the pieces this script adds (move them into result.css if you prefer)
  const style = document.createElement('style');
  style.textContent = `
    .question-item.skipped { color: var(--text-secondary); background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); }
    .question-item[role="button"] { cursor: pointer; }
    .question-item[aria-pressed="true"] { outline: 2px solid var(--blue); outline-offset: 2px; }
    .result-note { margin: 0; padding: 14px 0; color: var(--text-secondary); font-size: .85rem; }
    .review-panel { margin-top: 18px; padding: 16px 18px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255, 255, 255, .6); font-size: .85rem; }
    .review-panel[hidden], .ai-extra[hidden] { display: none; }
    .review-panel p { margin: 6px 0 0; color: var(--text-secondary); }
    .review-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .review-topic { color: var(--text-secondary); }
    .review-status { padding: 2px 10px; border-radius: 999px; font-size: .7rem; font-weight: 700; text-transform: uppercase; background: rgba(148, 163, 184, .18); }
    .review-status.correct { color: var(--green); background: rgba(25, 169, 142, .12); }
    .review-status.incorrect { color: var(--red); background: rgba(239, 68, 68, .1); }
    .review-panel .review-question { color: var(--text); font-weight: 600; }
    .review-panel .review-right { color: var(--green); font-weight: 600; }
    .ai-extra { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); font-size: .82rem; line-height: 1.6; }
    .ai-extra p { margin: 0 0 8px; }
    .ai-extra .ai-note { color: var(--text-secondary); font-size: .74rem; }
  `;
  document.head.appendChild(style);

  /* ============ 6. Notifications ============ */
  function initNotifications() {
    const bell = $('.notification-btn, .app-page-bell');
    if (!bell) return;

    const READ_KEY = 'codeprep:resultNotificationsRead';
    let readIds = [];
    try {
      readIds = JSON.parse(localStorage.getItem(READ_KEY)) || [];
      if (!Array.isArray(readIds)) readIds = [];
    } catch (e) { readIds = []; }

    const weakTopic = topics.find((t) => t.pct < 70);

    const notifications = [
      {
        id: `result-summary-${result.id || 'latest'}`,
        icon: 'fa-solid fa-trophy',
        iconColor: 'notification-icon-green',
        title: 'Quiz Completed',
        desc: `You scored ${score}% (${result.correct}/${result.total}) in ${result.language} (${result.difficulty}).`,
        time: 'Just now'
      },
      weakTopic ? {
        id: `result-rec-${result.id || 'latest'}-${weakTopic.name.toLowerCase().replace(/\s+/g, '-')}`,
        icon: 'fa-solid fa-lightbulb',
        iconColor: 'notification-icon-orange',
        title: `Target Practice: ${weakTopic.name}`,
        desc: `Review ${weakTopic.name} (${weakTopic.pct}% accuracy) to master key concepts.`,
        time: 'Recommended',
        url: `quiz-setup.html?language=${encodeURIComponent(result.language)}&difficulty=${encodeURIComponent(result.difficulty)}`
      } : {
        id: `result-rec-next-${result.id || 'latest'}`,
        icon: 'fa-solid fa-bolt',
        iconColor: 'notification-icon-purple',
        title: 'Next Challenge Ready',
        desc: `Strong performance! Try taking an Advanced ${result.language} quiz or explore new topics.`,
        time: 'Recommended',
        url: `quiz-setup.html?language=${encodeURIComponent(result.language)}`
      },
      {
        id: 'result-notif-analytics',
        icon: 'fa-solid fa-chart-line',
        iconColor: 'notification-icon-blue',
        title: 'Performance Recorded',
        desc: 'Your quiz results and topic breakdowns have been saved to your history.',
        time: 'Today',
        url: 'history.html'
      },
      {
        id: 'result-notif-streak',
        icon: 'fa-solid fa-fire',
        iconColor: 'notification-icon-orange',
        title: 'Daily Streak Active',
        desc: 'Completing this quiz maintains your daily coding streak. Keep the momentum!',
        time: 'Today'
      }
    ];

    const notificationPanel = document.createElement('div');
    notificationPanel.className = 'notification-panel';
    notificationPanel.setAttribute('role', 'region');
    notificationPanel.setAttribute('aria-label', 'Notifications dropdown');

    const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

    notificationPanel.innerHTML = `
      <div class="notification-header">
        <div>
          <h3>Notifications</h3>
          <span class="notification-count">${unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}</span>
        </div>
        <button class="mark-all-read" type="button">Mark all as read</button>
      </div>
      <div class="notification-list" role="list">
        ${notifications.map((n) => {
          const isUnread = !readIds.includes(n.id);
          return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}" ${n.url ? `data-url="${n.url}"` : ''} role="listitem" tabindex="0">
              <div class="notification-icon ${n.iconColor}">
                <i class="${n.icon}"></i>
              </div>
              <div class="notification-content">
                <strong>${n.title}</strong>
                <p>${n.desc}</p>
                <span>${n.time}</span>
              </div>
              <span class="notification-dot-item" aria-hidden="true"></span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="notification-footer">
        <a href="history.html">
          View quiz history
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    `;

    const parent = bell.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(notificationPanel);
    }

    const bellDot = $('.notification-dot', bell);

    const updateBadge = () => {
      const remainingUnread = $$('.notification-item.unread', notificationPanel).length;
      const countEl = $('.notification-count', notificationPanel);
      if (countEl) {
        countEl.textContent = remainingUnread > 0 ? `${remainingUnread} new` : 'All caught up';
      }
      if (bellDot) {
        bellDot.style.display = remainingUnread > 0 ? 'block' : 'none';
      }
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(readIds));
      } catch (e) { /* ignore */ }
    };

    updateBadge();

    const setOpen = (open) => {
      notificationPanel.classList.toggle('show', open);
      bell.setAttribute('aria-expanded', String(open));
    };

    const isOpen = () => notificationPanel.classList.contains('show');

    bell.setAttribute('aria-expanded', 'false');
    bell.setAttribute('aria-haspopup', 'true');

    bell.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!isOpen());
    });

    notificationPanel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    $$('.notification-item', notificationPanel).forEach((item) => {
      const handleAction = () => {
        const id = item.dataset.id;
        if (id && !readIds.includes(id)) {
          readIds.push(id);
        }
        item.classList.remove('unread');
        updateBadge();

        const url = item.dataset.url;
        if (url) {
          window.location.href = url;
        }
      };

      item.addEventListener('click', handleAction);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAction();
        }
      });
    });

    const markAllBtn = $('.mark-all-read', notificationPanel);
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        $$('.notification-item', notificationPanel).forEach((item) => {
          item.classList.remove('unread');
          const id = item.dataset.id;
          if (id && !readIds.includes(id)) {
            readIds.push(id);
          }
        });
        updateBadge();
      });
    }

    document.addEventListener('click', () => {
      if (isOpen()) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        bell.focus();
      }
    });
  }

  initSidebar();
  initAccountUI();
  initNotifications();
  renderHero();
  renderStats();
  renderChart();
  renderTopics();
  renderBreakdown();
  renderAnalysis();
  renderDetails();
})();