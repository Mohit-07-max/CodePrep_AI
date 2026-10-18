/* =========================================================
   CodePrep AI - Quiz Setup (fixed version)
   File: Frontend/js/quiz-setup.js

   Add this line before </body> in quiz-setup.html, after the existing sidebar script:
       <script src="../js/quiz-setup.js"></script>

   One `config` object is the single source of truth. Every click changes it, saves it, and then render()
   redraws the whole page from it, so the buttons, preview panel, summary line and saved data always agree.
   Saved under:   codeprep:quizConfig   (your last choices)
                  codeprep:currentQuiz  (what quiz.html should build)
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "codeprep:quizConfig";
    const CURRENT_QUIZ_KEY = "codeprep:currentQuiz";
    const MIN_QUESTIONS = 1;
    const MAX_QUESTIONS = 50;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();

    function init() {
        /* ---------- Find the page elements ---------- */
        const languageOptions = $$(".language-option");
        const difficultyOptions = $$(".difficulty-option");
        const topicButtons = $$(".topic");
        const numberControl = $(".number-control");
        const [typeSelect, timeSelect] = $$(".settings-grid select");
        const generateButton = $(".generate-btn");
        if (!languageOptions.length || !difficultyOptions.length || !topicButtons.length) return; // not the setup page

        const countDisplay = numberControl && $("span", numberControl);
        const [minusButton, plusButton] = numberControl ? $$("button", numberControl) : [];

        const nameOf = (option, selector) => clean(($(selector, option) || option).textContent);
        const languageName = (option) => nameOf(option, ".option-text strong");
        const difficultyName = (option) => nameOf(option, "strong");
        const topicName = (button) => clean(button.dataset.topic || button.textContent);
        const selectValues = (select) => (select ? Array.from(select.options).map((o) => clean(o.value || o.textContent)) : []);

        const LANGUAGES = languageOptions.map(languageName);
        const DIFFICULTIES = difficultyOptions.map(difficultyName);
        const TOPICS = topicButtons.map(topicName);
        const TYPES = selectValues(typeSelect);
        const TIMES = selectValues(timeSelect);

        /* ---------- Defaults come from how the HTML is written, so they always match real options ---------- */
        const preselectedDifficulty = difficultyOptions.find((o) => o.classList.contains("selected"));
        const DEFAULTS = {
            language: LANGUAGES[0],
            difficulty: preselectedDifficulty ? difficultyName(preselectedDifficulty) : DIFFICULTIES[0],
            topics: topicButtons.filter((b) => b.classList.contains("selected")).map(topicName),
            questionCount: parseInt(countDisplay && countDisplay.textContent, 10) || 10,
            questionType: (typeSelect && clean(typeSelect.value)) || TYPES[0],
            timeLimit: (timeSelect && clean(timeSelect.value)) || TIMES[0],
        };

        /* ---------- Reading and cleaning saved settings ---------- */
        // Finds the real option that matches a saved value, ignoring capital letters ("30 minutes" -> "30 Minutes")
        const pick = (value, list, fallback) => {
            const wanted = clean(value).toLowerCase();
            return list.find((item) => item.toLowerCase() === wanted) || fallback;
        };
        const LANGUAGE_ALIASES = { c: "c programming" };                                   // links like ?language=C
        const LEGACY_DIFFICULTY = { easy: "beginner", medium: "intermediate", hard: "advanced" }; // old saved values

        function normalize(raw) {
            raw = raw && typeof raw === "object" ? raw : {};
            const languageKey = clean(raw.language).toLowerCase();
            const difficultyKey = clean(raw.difficulty).toLowerCase();
            const savedTopics = Array.isArray(raw.topics) ? raw.topics.map((t) => clean(t).toLowerCase()) : [];
            const topics = TOPICS.filter((t) => savedTopics.includes(t.toLowerCase()));
            const count = parseInt(raw.questionCount, 10);
            return {
                language: pick(LANGUAGE_ALIASES[languageKey] || raw.language, LANGUAGES, DEFAULTS.language),
                difficulty: pick(LEGACY_DIFFICULTY[difficultyKey] || raw.difficulty, DIFFICULTIES, DEFAULTS.difficulty),
                topics: topics.length ? topics : [...DEFAULTS.topics],
                questionCount: Number.isInteger(count) ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, count)) : DEFAULTS.questionCount,
                questionType: pick(raw.questionType, TYPES, DEFAULTS.questionType),
                timeLimit: pick(raw.timeLimit, TIMES, DEFAULTS.timeLimit),
            };
        }

        function loadSaved() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
        }
        function save() {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) { /* storage blocked */ }
        }

        // Links such as quiz-setup.html?language=Python&difficulty=Advanced (used by main.html and history.html)
        const params = new URLSearchParams(window.location.search);
        const saved = loadSaved();
        if (params.get("language")) saved.language = params.get("language");
        if (params.get("difficulty")) saved.difficulty = params.get("difficulty");
        const config = normalize(saved);

        /* ---------- Small floating message (replaces alert) ---------- */
        const style = document.createElement("style");
        style.textContent = `
            .setup-toast { position: fixed; top: 16px; left: 50%; z-index: 1000; max-width: min(92vw, 440px); padding: 11px 18px;
                border-radius: 12px; font: 600 13px/1.5 var(--font, system-ui, sans-serif); color: #fff; background: #4b3de6;
                box-shadow: 0 12px 30px rgba(22, 24, 58, .25); transform: translate(-50%, -14px); opacity: 0; pointer-events: none;
                transition: opacity .2s ease, transform .2s ease; }
            .setup-toast.show { opacity: 1; transform: translate(-50%, 0); }
            .setup-toast.error { background: #d94655; }
            .generate-btn.is-loading { pointer-events: none; opacity: .75; }
            @media (prefers-reduced-motion: reduce) { .setup-toast { transition: none; } }`;
        document.head.appendChild(style);
        const toastEl = document.createElement("div");
        toastEl.className = "setup-toast";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");
        document.body.appendChild(toastEl);
        let toastTimer;
        function toast(message, type) {
            clearTimeout(toastTimer);
            toastEl.textContent = message;
            toastEl.className = "setup-toast show" + (type === "error" ? " error" : "");
            toastTimer = setTimeout(() => toastEl.classList.remove("show"), 4000);
        }

        /* ---------- Drawing the page from `config` ---------- */
        function setTopicIcon(button, selected) {
            const icon = $("i", button);
            if (selected && !icon) {
                const check = document.createElement("i");
                check.className = "fa-solid fa-check";
                check.setAttribute("aria-hidden", "true");
                button.appendChild(check);
            } else if (!selected && icon) {
                icon.remove();
            }
        }

        function describeTopics(list) {
            if (list.length <= 3) return list.join(", ");
            return `${list.slice(0, 3).join(", ")} and ${list.length - 3} more`;
        }

        function renderPreview() {
            const n = config.topics.length;
            $$(".preview-item").forEach((item) => {
                const label = $("span", item), value = $("strong", item);
                if (!label || !value) return;
                const text = clean(label.textContent).toLowerCase();
                if (text.includes("language")) value.textContent = config.language;
                else if (text.includes("difficulty")) value.textContent = config.difficulty;
                else if (text.includes("question")) value.textContent = config.questionCount;
                else if (text.includes("time")) value.textContent = config.timeLimit;
                else if (text.includes("topic")) value.textContent = `${n} Selected`;
            });

            // "Your quiz will contain 10 questions based on your 3 selected topics."
            const summary = $(".selected-summary span");
            if (summary) {
                const strong = document.createElement("strong");
                strong.textContent = `${config.questionCount} ${config.questionCount === 1 ? "question" : "questions"}`;
                summary.textContent = "";
                summary.append("Your quiz will contain ", strong,
                    n ? ` based on your ${n} selected ${n === 1 ? "topic" : "topics"}.` : " once you select at least one topic.");
            }

            const message = $(".ai-message p");
            if (message) {
                const kind = { "multiple choice": "multiple-choice", "coding questions": "coding" }[config.questionType.toLowerCase()] || config.questionType.toLowerCase();
                message.textContent = `CodePrep AI will create ${config.questionCount} ${kind} ${config.questionCount === 1 ? "question" : "questions"} ` +
                    `for ${config.language} at ${config.difficulty} level` + (n ? `, focusing on ${describeTopics(config.topics)}.` : ".");
            }
        }

        function render() {
            languageOptions.forEach((option) => {
                const on = languageName(option) === config.language;
                option.classList.toggle("selected", on);
                option.classList.toggle("active", on);
                option.setAttribute("aria-pressed", String(on));
                const check = $(".check", option);
                if (check) {
                    check.classList.toggle("fa-solid", on);
                    check.classList.toggle("fa-circle-check", on);
                    check.classList.toggle("fa-regular", !on);
                    check.classList.toggle("fa-circle", !on);
                }
            });
            difficultyOptions.forEach((option) => {
                const on = difficultyName(option) === config.difficulty;
                option.classList.toggle("selected", on);
                option.classList.toggle("active", on);
                option.setAttribute("aria-pressed", String(on));
            });
            topicButtons.forEach((button) => {
                const on = config.topics.includes(topicName(button));
                button.classList.toggle("selected", on);
                button.classList.toggle("active", on);
                button.setAttribute("aria-pressed", String(on));
                setTopicIcon(button, on);
            });
            if (countDisplay) countDisplay.textContent = config.questionCount;
            if (minusButton) minusButton.disabled = config.questionCount <= MIN_QUESTIONS;
            if (plusButton) plusButton.disabled = config.questionCount >= MAX_QUESTIONS;
            if (typeSelect) typeSelect.value = config.questionType;
            if (timeSelect) timeSelect.value = config.timeLimit;
            renderPreview();
        }

        const commit = () => { save(); render(); };

        /* ---------- Clicks and changes ---------- */
        languageOptions.forEach((option) => option.addEventListener("click", () => { config.language = languageName(option); commit(); }));
        difficultyOptions.forEach((option) => option.addEventListener("click", () => { config.difficulty = difficultyName(option); commit(); }));
        topicButtons.forEach((button) => button.addEventListener("click", () => {
            const name = topicName(button);
            const chosen = config.topics.includes(name) ? config.topics.filter((t) => t !== name) : [...config.topics, name];
            config.topics = TOPICS.filter((t) => chosen.includes(t)); // keep the same order as on the page
            commit();
        }));

        if (minusButton) {
            minusButton.type = "button";
            minusButton.setAttribute("aria-label", "Fewer questions");
            minusButton.addEventListener("click", () => { config.questionCount = Math.max(MIN_QUESTIONS, config.questionCount - 1); commit(); });
        }
        if (plusButton) {
            plusButton.type = "button";
            plusButton.setAttribute("aria-label", "More questions");
            plusButton.addEventListener("click", () => { config.questionCount = Math.min(MAX_QUESTIONS, config.questionCount + 1); commit(); });
        }
        if (typeSelect) typeSelect.addEventListener("change", () => { config.questionType = clean(typeSelect.value); commit(); });
        if (timeSelect) timeSelect.addEventListener("change", () => { config.timeLimit = clean(timeSelect.value); commit(); });

        /* ---------- Generate Quiz ---------- */
        
    function validate() {
        const errors = [];
        if (!config.language) {
            errors.push("Please select a programming language.");
        }
        if (!config.difficulty) {
            errors.push("Please select a difficulty level.");
        }
        if (!config.topics.length) {
            errors.push("Please select at least one topic.");
        }
        if (
            !Number.isInteger(config.questionCount) ||
            config.questionCount < MIN_QUESTIONS ||
            config.questionCount > MAX_QUESTIONS
        ) {
            errors.push(
                `Question count must be between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`
            );
        }
        return errors;
    }


        if (generateButton) {
            generateButton.addEventListener("click", (event) => {
                event.preventDefault();
                const errors = validate();
                if (errors.length) { toast(errors[0], "error"); return; }

                save();
                try {
                    localStorage.setItem(CURRENT_QUIZ_KEY, JSON.stringify({ ...config, createdAt: new Date().toISOString(), status: "ready" }));
                } catch (e) {
                    toast("Could not save your quiz settings. Check that browser storage is not blocked.", "error");
                    return;
                }
                generateButton.classList.add("is-loading");
                window.location.href = "quiz.html?source=quiz-setup";
            });
        }

        initNotifications();
        initSidebar();
        initAccountUI();
        save();
        render();
    }

    function initSidebar() {
        const toggle = $(".dashboard-menu-button, .app-page-menu-toggle");
        const drawer = document.getElementById("app-sidebar");
        const overlay = $(".sidebar-overlay");
        const close = $(".drawer-close");
        if (!toggle || !drawer || !overlay || !close) return;

        const setOpen = (open) => {
            document.body.classList.toggle("sidebar-open", open);
            drawer.classList.toggle("is-open", open);
            drawer.inert = !open;
            drawer.setAttribute("aria-hidden", String(!open));
            toggle.setAttribute("aria-expanded", String(open));
            if (open) close.focus(); else toggle.focus();
        };

        toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));
        close.addEventListener("click", () => setOpen(false));
        overlay.addEventListener("click", () => setOpen(false));
        $$("a", drawer).forEach((link) => link.addEventListener("click", () => setOpen(false)));

        document.addEventListener("keydown", (event) => {
            if (!drawer.classList.contains("is-open")) return;
            if (event.key === "Escape") { setOpen(false); return; }
            if (event.key !== "Tab") return;
            const items = $$("a[href], button", drawer);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first?.focus();
            }
        });
    }

    function initAccountUI() {
        let email = null;
        try {
            email = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session");
        } catch (e) { /* ignore */ }

        let users = [];
        try {
            users = JSON.parse(localStorage.getItem("codeprep:users")) || [];
        } catch (e) { users = []; }

        const user = email && Array.isArray(users) && users.find((u) => u && u.email === email);

        let profileData = null;
        try {
            profileData = JSON.parse(localStorage.getItem("codeprep:profileData"));
        } catch (e) { /* ignore */ }

        const activeName = (user && user.name) || (profileData && profileData.name) || "Mohit";
        const firstName = activeName.split(" ")[0] || activeName;
        const strong = $(".profile-info strong");
        const avatar = $(".avatar, .app-page-avatar");
        const profile = $(".profile");

        if (strong) strong.textContent = firstName;
        if (profile) profile.setAttribute("aria-label", `${firstName}’s profile`);

        let customAvatar = null;
        try {
            customAvatar = localStorage.getItem("codeprep:profileAvatar");
        } catch (e) { /* ignore */ }

        if (avatar) {
            if (customAvatar) {
                avatar.style.backgroundImage = `url("${customAvatar}")`;
                avatar.style.backgroundSize = "cover";
                avatar.style.backgroundPosition = "center";
                avatar.style.color = "transparent";
                avatar.textContent = "";
            } else {
                avatar.style.backgroundImage = "";
                avatar.style.color = "";
                avatar.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
            }
        }

        const link = $('.app-sidebar-account a[href="login.html"]');
        if (user && link) {
            link.title = "Sign out";
            const label = $("span", link);
            const icon = $("i", link);
            if (label) label.textContent = "Sign out";
            if (icon) icon.className = "fa-solid fa-right-from-bracket";
            link.addEventListener("click", () => {
                try {
                    sessionStorage.removeItem("codeprep:session");
                    localStorage.removeItem("codeprep:session");
                } catch (e) { /* ignore */ }
            });
        }
    }

    function initNotifications() {
        const bell = $(".notification-btn, .app-page-bell");
        if (!bell) return;

        // Check if user has completed a recent quiz
        let lastResult = null;
        try {
            lastResult = JSON.parse(localStorage.getItem("codeprep:lastResult"));
        } catch (e) { lastResult = null; }

        // Read dismissed/read state
        const READ_KEY = "codeprep:practiceNotificationsRead";
        let readIds = [];
        try {
            readIds = JSON.parse(localStorage.getItem(READ_KEY)) || [];
            if (!Array.isArray(readIds)) readIds = [];
        } catch (e) { readIds = []; }

        const notifications = [
            {
                id: "practice-notif-tip",
                icon: "fa-solid fa-lightbulb",
                iconColor: "notification-icon-orange",
                title: "Practice Tip",
                desc: "Combine Multiple Choice questions with a 15-minute timer for interview prep.",
                time: "10m ago"
            },
            {
                id: "practice-notif-focus",
                icon: "fa-solid fa-sparkles",
                iconColor: "notification-icon-purple",
                title: "Recommended Topics",
                desc: "Arrays and Pointers are frequently tested in technical rounds.",
                time: "1h ago"
            },
            {
                id: "practice-notif-streak",
                icon: "fa-solid fa-fire",
                iconColor: "notification-icon-orange",
                title: "Daily Goal Active",
                desc: "Complete 10 questions today to maintain your coding streak.",
                time: "Today"
            }
        ];

        if (lastResult && (lastResult.language || lastResult.languageLabel)) {
            const questionsCount = Number(lastResult.questions?.length || lastResult.total || 10);
            const correctCount = Number(lastResult.correct || 0);
            const scorePct = questionsCount ? Math.round((correctCount / questionsCount) * 100) : 0;
            notifications.unshift({
                id: `practice-result-${lastResult.id || 'latest'}`,
                icon: "fa-solid fa-trophy",
                iconColor: "notification-icon-green",
                title: "Recent Quiz Performance",
                desc: `You scored ${scorePct}% in ${lastResult.languageLabel || lastResult.language}. Tap to review feedback.`,
                time: "Recent",
                url: "result.html"
            });
        }

        // Build notification panel
        const notificationPanel = document.createElement("div");
        notificationPanel.className = "notification-panel";
        notificationPanel.setAttribute("role", "region");
        notificationPanel.setAttribute("aria-label", "Notifications dropdown");

        const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

        notificationPanel.innerHTML = `
            <div class="notification-header">
                <div>
                    <h3>Notifications</h3>
                    <span class="notification-count">${unreadCount > 0 ? `${unreadCount} new` : "All caught up"}</span>
                </div>
                <button class="mark-all-read" type="button">Mark all as read</button>
            </div>
            <div class="notification-list" role="list">
                ${notifications.map(n => {
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
                }).join("")}
            </div>
            <div class="notification-footer">
                <a href="history.html">
                    View quiz activity
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </div>
        `;

        // Position panel relative to parent action container
        const parent = bell.parentElement;
        if (parent) {
            parent.style.position = "relative";
            parent.appendChild(notificationPanel);
        }

        const bellDot = $(".notification-dot", bell);

        const updateBadge = () => {
            const remainingUnread = $$(".notification-item.unread", notificationPanel).length;
            const countEl = $(".notification-count", notificationPanel);
            if (countEl) {
                countEl.textContent = remainingUnread > 0 ? `${remainingUnread} new` : "All caught up";
            }
            if (bellDot) {
                bellDot.style.display = remainingUnread > 0 ? "block" : "none";
            }
            try {
                localStorage.setItem(READ_KEY, JSON.stringify(readIds));
            } catch (e) { /* ignore */ }
        };

        updateBadge();

        const setOpen = (open) => {
            notificationPanel.classList.toggle("show", open);
            bell.setAttribute("aria-expanded", String(open));
        };

        const isOpen = () => notificationPanel.classList.contains("show");

        bell.setAttribute("aria-expanded", "false");
        bell.setAttribute("aria-haspopup", "true");

        bell.addEventListener("click", (event) => {
            event.stopPropagation();
            setOpen(!isOpen());
        });

        notificationPanel.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        // Mark individual notification as read on click / enter
        $$(".notification-item", notificationPanel).forEach((item) => {
            const handleAction = () => {
                const id = item.dataset.id;
                if (id && !readIds.includes(id)) {
                    readIds.push(id);
                }
                item.classList.remove("unread");
                updateBadge();

                const url = item.dataset.url;
                if (url) {
                    window.location.href = url;
                }
            };

            item.addEventListener("click", handleAction);
            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleAction();
                }
            });
        });

        // Mark all as read button
        const markAllBtn = $(".mark-all-read", notificationPanel);
        if (markAllBtn) {
            markAllBtn.addEventListener("click", () => {
                $$(".notification-item", notificationPanel).forEach((item) => {
                    item.classList.remove("unread");
                    const id = item.dataset.id;
                    if (id && !readIds.includes(id)) {
                        readIds.push(id);
                    }
                });
                updateBadge();
            });
        }

        // Close when clicking outside
        document.addEventListener("click", () => {
            if (isOpen()) {
                setOpen(false);
            }
        });

        // Close on Escape key
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && isOpen()) {
                setOpen(false);
                bell.focus();
            }
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();