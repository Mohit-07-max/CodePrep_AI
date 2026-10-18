/* =========================================================
   CodePrep AI - Dashboard
   File: dashboard.js
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "codeprep:quizConfig";
    const CURRENT_QUIZ_KEY = "codeprep:currentQuiz";

    // ---------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        Array.from(parent.querySelectorAll(selector));

    function getStoredJSON(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return fallback;
        }
    }

    function setStoredJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Unable to save ${key}:`, error);
        }
    }



    // ---------------------------------------------------------
    // Notifications
    // ---------------------------------------------------------

    function initNotifications() {
        const bell = $(".app-page-bell");

        if (!bell) {
            return;
        }

        // Create notification panel
        const notificationPanel = document.createElement("div");

        notificationPanel.className = "notification-panel";

        notificationPanel.innerHTML = `
            <div class="notification-header">
                <div>
                    <h3>Notifications</h3>
                    <span class="notification-count">3 new</span>
                </div>

                <button
                    class="mark-all-read"
                    type="button"
                >
                    Mark all as read
                </button>
            </div>

            <div class="notification-list">

                <div class="notification-item unread">
                    <div class="notification-icon notification-icon-blue">
                        <i class="fa-solid fa-code"></i>
                    </div>

                    <div class="notification-content">
                        <strong>New practice available</strong>
                        <p>
                            Practice your Arrays and improve your coding skills.
                        </p>
                        <span>5 minutes ago</span>
                    </div>

                    <span class="notification-dot-item"></span>
                </div>

                <div class="notification-item unread">
                    <div class="notification-icon notification-icon-purple">
                        <i class="fa-solid fa-sparkles"></i>
                    </div>

                    <div class="notification-content">
                        <strong>AI recommendation</strong>
                        <p>
                            We found topics that could improve your performance.
                        </p>
                        <span>2 hours ago</span>
                    </div>

                    <span class="notification-dot-item"></span>
                </div>

                <div class="notification-item unread">
                    <div class="notification-icon notification-icon-green">
                        <i class="fa-solid fa-trophy"></i>
                    </div>

                    <div class="notification-content">
                        <strong>Great progress!</strong>
                        <p>
                            You completed your daily coding goal.
                        </p>
                        <span>Yesterday</span>
                    </div>

                    <span class="notification-dot-item"></span>
                </div>

                <div class="notification-item">
                    <div class="notification-icon notification-icon-orange">
                        <i class="fa-solid fa-fire"></i>
                    </div>

                    <div class="notification-content">
                        <strong>Keep your streak alive</strong>
                        <p>
                            Complete another quiz today to continue your streak.
                        </p>
                        <span>2 days ago</span>
                    </div>
                </div>

            </div>

            <div class="notification-footer">
                <a href="history.html">
                    View quiz activity
                    <i class="fa-solid fa-arrow-right"></i>
                </a>
            </div>
        `;

        // Make the notification button the positioning parent
        const topbarActions = bell.parentElement;

        if (topbarActions) {
            topbarActions.style.position = "relative";
            topbarActions.appendChild(notificationPanel);
        }

        // Start hidden
        notificationPanel.classList.remove("show");

        // Open / close panel
        bell.addEventListener("click", event => {
            event.stopPropagation();

            notificationPanel.classList.toggle("show");

            const isOpen =
                notificationPanel.classList.contains("show");

            bell.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        // Prevent clicks inside panel from closing it
        notificationPanel.addEventListener("click", event => {
            event.stopPropagation();
        });

        // Mark individual notification as read
        const notificationItems =
            $$(".notification-item.unread", notificationPanel);

        notificationItems.forEach(item => {
            item.addEventListener("click", () => {
                item.classList.remove("unread");

                updateNotificationCount(notificationPanel);
            });
        });

        // Mark everything as read
        const markAllRead =
            $(".mark-all-read", notificationPanel);

        if (markAllRead) {
            markAllRead.addEventListener("click", () => {
                $$(".notification-item", notificationPanel)
                    .forEach(item => {
                        item.classList.remove("unread");
                    });

                updateNotificationCount(notificationPanel);
            });
        }

        // Close when clicking outside
        document.addEventListener("click", () => {
            notificationPanel.classList.remove("show");

            bell.setAttribute(
                "aria-expanded",
                "false"
            );
        });

        bell.setAttribute("aria-expanded", "false");
    }

    // ---------------------------------------------------------
    // Notification Count
    // ---------------------------------------------------------

    function updateNotificationCount(panel) {
        const unreadItems =
            $$(".notification-item.unread", panel);

        const countElement =
            $(".notification-count", panel);

        const notificationDot =
            $(".notification-dot");

        if (unreadItems.length === 0) {
            if (countElement) {
                countElement.textContent = "All caught up";
            }

            if (notificationDot) {
                notificationDot.style.display = "none";
            }

            return;
        }

        if (countElement) {
            countElement.textContent =
                `${unreadItems.length} new`;
        }

        if (notificationDot) {
            notificationDot.style.display = "block";
        }
    }

    // ---------------------------------------------------------
    // Quick Practice Language Cards
    // ---------------------------------------------------------

    // ---------------------------------------------------------
// Profile
// ---------------------------------------------------------

    function initProfile() {
        const profile = $(".app-page-student");

        if (profile) {
            profile.style.cursor = "pointer";
            profile.addEventListener("click", () => {
                window.location.href = "profile.html";
            });
        }

        // Synchronize with active user session
        let email = null;
        try {
            email = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session");
        } catch (e) { /* ignore */ }

        const users = getStoredJSON("codeprep:users", []);
        const user = email && Array.isArray(users) && users.find((u) => u && u.email === email);
        let profileData = null;
        try {
            profileData = JSON.parse(localStorage.getItem("codeprep:profileData"));
        } catch (e) { /* ignore */ }

        const activeName = (user && user.name) || (profileData && profileData.name) || "Mohit";
        const firstName = activeName.split(" ")[0] || activeName;
        const welcomeSpan = $(".welcome-text h2 span");
        if (welcomeSpan) welcomeSpan.textContent = `${firstName}!`;
        const studentStrong = $(".app-page-student-info strong");
        if (studentStrong) studentStrong.textContent = firstName;

        let customAvatar = null;
        try {
            customAvatar = localStorage.getItem("codeprep:profileAvatar");
        } catch (e) { /* ignore */ }

        const avatar = $(".app-page-avatar, .avatar");
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

        // Support Sign out in sidebar
        const signInLink = $('.app-sidebar-account a[href="login.html"]');
        if (user && signInLink) {
            signInLink.title = "Sign out";
            const span = $("span", signInLink);
            if (span) span.textContent = "Sign out";
            const icon = $("i", signInLink);
            if (icon) icon.className = "fa-solid fa-right-from-bracket";
            signInLink.addEventListener("click", () => {
                try {
                    sessionStorage.removeItem("codeprep:session");
                    localStorage.removeItem("codeprep:session");
                } catch (e) { /* ignore */ }
            });
        }
    }

    function initLanguageCards() {
        const cards = $$(".language-card");

        if (!cards.length) {
            return;
        }

        cards.forEach(card => {
            const heading = $("h4", card);

            if (!heading) {
                return;
            }

            const language = heading.textContent.trim();

            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");

            const openPractice = () => {
                window.location.href =
                    `quiz-setup.html?language=${encodeURIComponent(language)}`;
            };

            card.addEventListener("click", openPractice);

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPractice();
                }
            });
        });
    }

    // ---------------------------------------------------------
    // Practice Links
    // ---------------------------------------------------------

    function initPracticeLinks() {
        const startPractice =
            $(".welcome-section .primary-btn");

        if (startPractice) {
            startPractice.addEventListener("click", () => {
                localStorage.removeItem(STORAGE_KEY);
            });
        }

        const practiceArrays = $(".ai-btn");

        if (practiceArrays) {
            practiceArrays.addEventListener("click", () => {
                setStoredJSON(STORAGE_KEY, {
                    language: "C Programming",
                    difficulty: "Medium",
                    topics: ["Arrays"],
                    questionCount: 10,
                    questionType: "Multiple Choice",
                    timeLimit: "30 minutes"
                });
            });
        }
    }

    // ---------------------------------------------------------
    // Dashboard Statistics
    // ---------------------------------------------------------

    function updateDashboardFromQuiz() {
        const currentQuiz =
            getStoredJSON(CURRENT_QUIZ_KEY);

        if (!currentQuiz) {
            return;
        }

        const statCards = $$(".stat-card");

        if (statCards.length < 4) {
            return;
        }

        // Update average accuracy if a score exists.
        if (
            typeof currentQuiz.score === "number" &&
            Number.isFinite(currentQuiz.score)
        ) {
            const accuracy =
                $(".stat-info strong", statCards[1]);

            if (accuracy) {
                accuracy.textContent =
                    `${Math.round(currentQuiz.score)}%`;
            }
        }

        // Update completed quiz count if available.
        if (
            typeof currentQuiz.completedQuizzes === "number" &&
            Number.isFinite(currentQuiz.completedQuizzes)
        ) {
            const completed =
                $(".stat-info strong", statCards[0]);

            if (completed) {
                completed.textContent =
                    String(currentQuiz.completedQuizzes);
            }
        }
    }

    // ---------------------------------------------------------
    // Current Quiz Status
    // ---------------------------------------------------------

    function checkActiveQuiz() {
        const currentQuiz =
            getStoredJSON(CURRENT_QUIZ_KEY);

        if (
            !currentQuiz ||
            currentQuiz.status !== "ready"
        ) {
            return;
        }

        const startPractice =
            $(".welcome-section .primary-btn");

        if (!startPractice) {
            return;
        }

        startPractice.setAttribute(
            "data-active-quiz",
            "true"
        );
    }

    // ---------------------------------------------------------
    // Keyboard Accessibility
    // ---------------------------------------------------------

    function initKeyboardSupport() {
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") {
                return;
            }

            const menuState =
                $("#dashboard-menu-state");

            if (menuState) {
                menuState.checked = false;
            }
        });
    }

    // ---------------------------------------------------------
    // Initialize
    // ---------------------------------------------------------

    function initDashboard() {
        initNotifications();
        initProfile();
        initLanguageCards();
        initPracticeLinks();
        updateDashboardFromQuiz();
        checkActiveQuiz();
        initKeyboardSupport();
    }

    // ---------------------------------------------------------
    //                      DOM Ready
    // ---------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initDashboard
        );
    } else {
        initDashboard();
    }

})();