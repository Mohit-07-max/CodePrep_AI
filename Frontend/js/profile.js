/* CodePrep AI - Profile Page JavaScript */

document.addEventListener("DOMContentLoaded", () => {

    /* ================= SIDEBAR ================= */

    const menuState = document.getElementById("profile-menu-state");
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.querySelector(".profile-sidebar-backdrop");
    const menuButton = document.querySelector(".dashboard-menu-button");
    const closeButton = document.querySelector(".profile-sidebar-close");

    const closeSidebar = () => {
        if (menuState) {
            menuState.checked = false;
        }
    };

    menuButton?.addEventListener("click", (event) => {
        event.preventDefault();

        if (menuState) {
            menuState.checked = !menuState.checked;
        }
    });

    closeButton?.addEventListener("click", closeSidebar);
    backdrop?.addEventListener("click", closeSidebar);

    document.querySelectorAll(".app-nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 760) {
                closeSidebar();
            }
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeSidebar();
        }
    });

    /* ================= NOTIFICATIONS ================= */

    function initNotifications() {
        const bell = document.querySelector(".notification-btn, .app-page-bell");
        if (!bell) return;

        const READ_KEY = "codeprep:profileNotificationsRead";
        let readIds = [];
        try {
            readIds = JSON.parse(localStorage.getItem(READ_KEY)) || [];
            if (!Array.isArray(readIds)) readIds = [];
        } catch (e) { readIds = []; }

        // Check if user has completed a recent quiz
        let lastResult = null;
        try {
            lastResult = JSON.parse(localStorage.getItem("codeprep:lastResult"));
        } catch (e) { lastResult = null; }

        const notifications = [
            {
                id: "profile-notif-sync",
                icon: "fa-solid fa-user-check",
                iconColor: "notification-icon-blue",
                title: "Profile Synced",
                desc: "Your personal details and learning preferences are up to date.",
                time: "Just now"
            },
            {
                id: "profile-notif-streak",
                icon: "fa-solid fa-fire",
                iconColor: "notification-icon-orange",
                title: "7-Day Streak Active!",
                desc: "Keep up the momentum. Complete today's practice session to maintain your streak.",
                time: "Today",
                url: "quiz-setup.html"
            },
            {
                id: "profile-notif-tip",
                icon: "fa-solid fa-lightbulb",
                iconColor: "notification-icon-purple",
                title: "AI Skill Recommendation",
                desc: "Based on your activity, practice Pointers and Data Structures for interview prep.",
                time: "1h ago",
                url: "quiz-setup.html"
            }
        ];

        if (lastResult && (lastResult.language || lastResult.languageLabel)) {
            const questionsCount = Number(lastResult.questions?.length || lastResult.total || 10);
            const correctCount = Number(lastResult.correct || 0);
            const scorePct = questionsCount ? Math.round((correctCount / questionsCount) * 100) : 0;
            notifications.unshift({
                id: `profile-result-${lastResult.id || 'latest'}`,
                icon: "fa-solid fa-trophy",
                iconColor: "notification-icon-green",
                title: "Quiz Performance Saved",
                desc: `You scored ${scorePct}% in ${lastResult.languageLabel || lastResult.language}. Review your feedback.`,
                time: "Recent",
                url: "result.html"
            });
        }

        const notificationPanel = document.createElement("div");
        notificationPanel.className = "notification-panel";
        notificationPanel.setAttribute("role", "region");
        notificationPanel.setAttribute("aria-label", "Notifications dropdown");

        const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

        notificationPanel.innerHTML = `
            <div class="notification-header">
                <div>
                    <h3>Notifications</h3>
                    <span class="notification-count">${unreadCount > 0 ? `${unreadCount} new` : "All caught up"}</span>
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
                }).join("")}
            </div>
            <div class="notification-footer">
                <a href="history.html">
                    View learning activity
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </div>
        `;

        const parent = bell.parentElement;
        if (parent) {
            parent.style.position = "relative";
            parent.appendChild(notificationPanel);
        }

        const bellDot = bell.querySelector(".notification-dot");

        const updateBadge = () => {
            const remainingUnread = notificationPanel.querySelectorAll(".notification-item.unread").length;
            const countEl = notificationPanel.querySelector(".notification-count");
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

        notificationPanel.querySelectorAll(".notification-item").forEach((item) => {
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

        const markAllBtn = notificationPanel.querySelector(".mark-all-read");
        if (markAllBtn) {
            markAllBtn.addEventListener("click", () => {
                notificationPanel.querySelectorAll(".notification-item").forEach((item) => {
                    item.classList.remove("unread");
                    const id = item.dataset.id;
                    if (id && !readIds.includes(id)) {
                        readIds.push(id);
                    }
                });
                updateBadge();
            });
        }

        document.addEventListener("click", () => {
            if (isOpen()) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && isOpen()) {
                setOpen(false);
                bell.focus();
            }
        });
    }

    initNotifications();

    /* ================= PROFILE DATA & MODAL EDITING ================= */

    const PROFILE_KEY = "codeprep:profileData";
    const AVATAR_KEY = "codeprep:profileAvatar";

    function getPersonalField(labelText) {
        const items = Array.from(document.querySelectorAll(".personal-card .info-item"));
        const found = items.find((item) => {
            const label = item.querySelector("span");
            return label && label.textContent.trim().toUpperCase() === labelText.toUpperCase();
        });
        return found ? found.querySelector("strong") : null;
    }

    function computeInitials(fullName) {
        if (!fullName || typeof fullName !== "string") return "U";
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0] ? parts[0].slice(0, 2).toUpperCase() : "U";
    }

    function updateAvatarLarge() {
        const avatar = document.querySelector(".profile-avatar-large");
        if (!avatar) return;
        const cameraBtn = avatar.querySelector(".avatar-edit");
        avatar.innerHTML = "";
        const userIcon = document.createElement("i");
        userIcon.className = "fa-solid fa-user";
        userIcon.setAttribute("aria-hidden", "true");
        avatar.appendChild(userIcon);
        if (cameraBtn) avatar.appendChild(cameraBtn);
    }

    function syncAvatarUI(customDataUrl) {
        const avatarLarge = document.querySelector(".profile-avatar-large");
        const topbarAvatar = document.querySelector(".app-page-avatar");
        const modalPreview = document.getElementById("modalAvatarPreview");
        const modalRemoveBtn = document.getElementById("modalRemoveBtn");

        if (customDataUrl) {
            if (avatarLarge) {
                avatarLarge.style.backgroundImage = `url("${customDataUrl}")`;
                avatarLarge.style.backgroundSize = "cover";
                avatarLarge.style.backgroundPosition = "center";
                avatarLarge.style.color = "transparent";
                const userIcon = avatarLarge.querySelector("i.fa-user");
                if (userIcon) userIcon.style.display = "none";
            }
            if (topbarAvatar) {
                topbarAvatar.style.backgroundImage = `url("${customDataUrl}")`;
                topbarAvatar.style.backgroundSize = "cover";
                topbarAvatar.style.backgroundPosition = "center";
                topbarAvatar.style.color = "transparent";
                topbarAvatar.innerHTML = "";
            }
            if (modalPreview) {
                modalPreview.style.backgroundImage = `url("${customDataUrl}")`;
                modalPreview.style.backgroundSize = "cover";
                modalPreview.style.backgroundPosition = "center";
                modalPreview.style.color = "transparent";
                modalPreview.innerHTML = "";
            }
            if (modalRemoveBtn) {
                modalRemoveBtn.disabled = false;
                modalRemoveBtn.classList.remove("disabled");
            }
        } else {
            if (avatarLarge) {
                avatarLarge.style.backgroundImage = "";
                avatarLarge.style.color = "#ffffff";
                updateAvatarLarge();
            }
            if (topbarAvatar) {
                topbarAvatar.style.backgroundImage = "";
                topbarAvatar.style.color = "#ffffff";
                topbarAvatar.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
            }
            if (modalPreview) {
                modalPreview.style.backgroundImage = "";
                modalPreview.style.color = "#ffffff";
                modalPreview.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
            }
            if (modalRemoveBtn) {
                modalRemoveBtn.disabled = true;
                modalRemoveBtn.classList.add("disabled");
            }
        }
    }

    function removeProfilePhoto() {
        try {
            localStorage.removeItem(AVATAR_KEY);
        } catch (e) {}

        syncAvatarUI(null);
        showToast("Profile photo removed.", "success");
    }

    function showToast(message, type = "success") {
        let container = document.querySelector(".profile-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "profile-toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `profile-toast ${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("show"));
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 260);
        }, 3000);
    }

    function applyProfileData(data) {
        if (!data) return;

        const name = (data.name || "Mohit Singh Gusain").trim();
        const username = (data.username || "mohit").replace(/^@+/, "").trim();
        const email = (data.email || "mohit@example.com").trim();
        const phone = (data.phone || "+91 XXXXX XXXXX").trim();
        const education = (data.education || "BE CSE Core").trim();
        const year = (data.year || "1st Year").trim();
        const role = (data.role || "CSE Student").trim();

        // Hero Name and Username
        const heroName = document.querySelector(".profile-main-info h2");
        if (heroName) heroName.textContent = name;

        const heroUsername = document.querySelector(".username");
        if (heroUsername) {
            heroUsername.innerHTML = `<i class="fa-solid fa-at"></i> ${username}`;
        }

        // Hero Tags
        const tags = document.querySelectorAll(".profile-tags span");
        if (tags && tags.length >= 2) {
            tags[0].innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${role}`;
            tags[1].innerHTML = `<i class="fa-solid fa-code"></i> ${education}`;
        }

        // Avatar Large or Saved Image
        const savedAvatarImage = localStorage.getItem(AVATAR_KEY);
        syncAvatarUI(savedAvatarImage);

        // Personal Information Card fields
        const fieldFullName = getPersonalField("FULL NAME");
        if (fieldFullName) fieldFullName.textContent = name;

        const fieldUsername = getPersonalField("USERNAME");
        if (fieldUsername) fieldUsername.textContent = username;

        const fieldEmail = getPersonalField("EMAIL");
        if (fieldEmail) fieldEmail.textContent = email;

        const fieldPhone = getPersonalField("PHONE");
        if (fieldPhone) fieldPhone.textContent = phone;

        const fieldEducation = getPersonalField("EDUCATION");
        if (fieldEducation) fieldEducation.textContent = education;

        const fieldYear = getPersonalField("YEAR");
        if (fieldYear) fieldYear.textContent = year;

        // Topbar
        const firstName = name.split(/\s+/)[0] || name;
        const topbarName = document.querySelector(".app-page-student-info strong");
        const profileLink = document.querySelector(".profile.app-page-student");
        if (topbarName) topbarName.textContent = firstName;
        if (profileLink) profileLink.setAttribute("aria-label", `${firstName}’s profile`);
    }

    function loadProfileData() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
        } catch (e) { saved = null; }

        if (saved && typeof saved === "object") {
            applyProfileData(saved);
            return saved;
        }

        let email = null;
        try {
            email = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session");
        } catch (e) {}

        let users = [];
        try {
            users = JSON.parse(localStorage.getItem("codeprep:users")) || [];
        } catch (e) {}

        const user = email && Array.isArray(users) && users.find((u) => u && u.email === email);
        if (user && user.name) {
            const defaults = {
                name: user.name,
                username: user.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15),
                email: user.email || email,
                phone: "+91 XXXXX XXXXX",
                education: "BE CSE Core",
                year: "1st Year",
                role: "CSE Student"
            };
            applyProfileData(defaults);
            return defaults;
        }

        const heroName = document.querySelector(".profile-main-info h2");
        const heroUsername = document.querySelector(".username");
        const defaults = {
            name: heroName ? heroName.textContent.trim() : "Mohit Singh Gusain",
            username: heroUsername ? heroUsername.textContent.replace("@", "").trim() : "mohit",
            email: getPersonalField("EMAIL")?.textContent.trim() || "mohit@example.com",
            phone: getPersonalField("PHONE")?.textContent.trim() || "+91 XXXXX XXXXX",
            education: getPersonalField("EDUCATION")?.textContent.trim() || "BE CSE Core",
            year: getPersonalField("YEAR")?.textContent.trim() || "1st Year",
            role: "CSE Student"
        };
        applyProfileData(defaults);
        return defaults;
    }

    let currentProfile = loadProfileData();

    // Modal elements
    const editModal = document.getElementById("editProfileModal");
    const editBtn = document.querySelector(".edit-profile-btn");
    const closeBtn = document.getElementById("closeEditModalBtn");
    const cancelBtn = document.getElementById("cancelEditModalBtn");
    const editForm = document.getElementById("editProfileForm");

    const inputFullName = document.getElementById("editFullName");
    const inputUsername = document.getElementById("editUsername");
    const inputEmail = document.getElementById("editEmail");
    const inputPhone = document.getElementById("editPhone");
    const inputYear = document.getElementById("editYear");
    const inputEducation = document.getElementById("editEducation");
    const inputRole = document.getElementById("editRole");

    function openEditModal() {
        if (!editModal) return;

        currentProfile = loadProfileData();

        if (inputFullName) inputFullName.value = currentProfile.name || "";
        if (inputUsername) inputUsername.value = currentProfile.username || "";
        if (inputEmail) inputEmail.value = currentProfile.email || "";
        if (inputPhone) inputPhone.value = currentProfile.phone || "";
        if (inputYear) inputYear.value = currentProfile.year || "";
        if (inputEducation) inputEducation.value = currentProfile.education || "";
        if (inputRole) inputRole.value = currentProfile.role || "";

        const savedAvatar = localStorage.getItem(AVATAR_KEY);
        syncAvatarUI(savedAvatar);

        editModal.classList.add("show");
        editModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        setTimeout(() => {
            if (inputFullName) inputFullName.focus();
        }, 100);
    }

    function closeEditModal() {
        if (!editModal) return;
        editModal.classList.remove("show");
        editModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (editBtn) editBtn.focus();
    }

    if (editBtn) {
        editBtn.addEventListener("click", (event) => {
            event.preventDefault();
            openEditModal();
        });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);

    if (editModal) {
        editModal.addEventListener("click", (event) => {
            if (event.target === editModal) {
                closeEditModal();
            }
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const fullName = (inputFullName?.value || "").trim();
            const username = (inputUsername?.value || "").trim();
            const email = (inputEmail?.value || "").trim();
            const phone = (inputPhone?.value || "").trim();
            const year = (inputYear?.value || "").trim();
            const education = (inputEducation?.value || "").trim();
            const role = (inputRole?.value || "").trim();

            if (!fullName) {
                showToast("Please enter your full name.", "error");
                inputFullName?.focus();
                return;
            }

            if (!email || !email.includes("@")) {
                showToast("Please enter a valid email address.", "error");
                inputEmail?.focus();
                return;
            }

            const updatedData = {
                name: fullName,
                username: username || fullName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15),
                email: email,
                phone: phone || "+91 XXXXX XXXXX",
                year: year || "1st Year",
                education: education || "BE CSE Core",
                role: role || "CSE Student"
            };

            try {
                localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedData));
            } catch (e) {}

            try {
                const currentSessionEmail = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session");
                let users = JSON.parse(localStorage.getItem("codeprep:users")) || [];
                if (Array.isArray(users)) {
                    const uIdx = users.findIndex((u) => u && u.email === currentSessionEmail);
                    if (uIdx !== -1) {
                        users[uIdx].name = fullName;
                        if (email && email !== currentSessionEmail) {
                            users[uIdx].email = email;
                            if (sessionStorage.getItem("codeprep:session")) sessionStorage.setItem("codeprep:session", email);
                            if (localStorage.getItem("codeprep:session")) localStorage.setItem("codeprep:session", email);
                        }
                        localStorage.setItem("codeprep:users", JSON.stringify(users));
                    }
                }
            } catch (e) {}

            currentProfile = updatedData;
            applyProfileData(updatedData);

            closeEditModal();
            showToast("Profile updated successfully!", "success");
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
            if (editModal && editModal.classList.contains("show")) {
                closeEditModal();
            }
        }
    });

    /* ================= AVATAR CAMERA & REMOVE ================= */

    const avatarEditButton = document.querySelector(".avatar-edit");
    const modalUploadButton = document.getElementById("modalUploadBtn");
    const modalRemoveButton = document.getElementById("modalRemoveBtn");

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    const avatarLargeContainer = document.querySelector(".profile-avatar-large");
    if (avatarLargeContainer) {
        avatarLargeContainer.addEventListener("click", (event) => {
            const editTarget = event.target.closest(".avatar-edit");
            if (editTarget) {
                event.preventDefault();
                event.stopPropagation();
                fileInput.click();
            }
        });
    }

    if (avatarEditButton) {
        avatarEditButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            fileInput.click();
        });
    }

    if (modalUploadButton) {
        modalUploadButton.addEventListener("click", (event) => {
            event.preventDefault();
            fileInput.click();
        });
    }

    if (modalRemoveButton) {
        modalRemoveButton.addEventListener("click", (event) => {
            event.preventDefault();
            removeProfilePhoto();
        });
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            try {
                localStorage.setItem(AVATAR_KEY, dataUrl);
            } catch (e) {}

            syncAvatarUI(dataUrl);
            showToast("Profile photo updated!", "success");
            fileInput.value = "";
        };
        reader.readAsDataURL(file);
    });

    /* ================= ACCOUNT ACTIVITY ================= */

    document.querySelectorAll(".activity-action").forEach((button) => {
        button.addEventListener("click", () => {
            const originalText = button.textContent.trim();
            button.textContent = "Updated";
            button.disabled = true;

            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1400);
        });
    });

    /* ================= PREFERENCE TOGGLES ================= */

    document.querySelectorAll(".toggle input").forEach((input, index) => {
        const toggle = input.closest(".toggle");

        if (toggle) {
            toggle.setAttribute("role", "switch");
            toggle.setAttribute("aria-checked", String(input.checked));
        }

        input.addEventListener("change", () => {
            if (toggle) {
                toggle.setAttribute("aria-checked", String(input.checked));
            }
            try {
                localStorage.setItem(`codeprep-profile-preference-${index}`, String(input.checked));
            } catch (e) {}
        });

        const saved = localStorage.getItem(`codeprep-profile-preference-${index}`);
        if (saved !== null) {
            input.checked = saved === "true";
            if (toggle) {
                toggle.setAttribute("aria-checked", String(input.checked));
            }
        }
    });

    /* ================= EXPORT PROFILE DATA ================= */

    const exportButton = document.querySelector(".secondary-btn");

    exportButton?.addEventListener("click", () => {
        const data = {
            profile: currentProfile || loadProfileData(),
            preferences: Array.from(document.querySelectorAll(".preference-row")).map((row) => ({
                name: row.querySelector("strong")?.textContent.trim() || "",
                enabled: row.querySelector("input")?.checked || false
            })),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "codeprep-profile-data.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });

    /* ================= USER SESSION & LOGOUT ================= */

    function initAccount() {
        let email = null;
        try {
            email = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session");
        } catch (e) { /* ignore */ }

        let users = [];
        try {
            users = JSON.parse(localStorage.getItem("codeprep:users")) || [];
        } catch (e) { users = []; }

        const user = email && Array.isArray(users) && users.find((u) => u && u.email === email);

        const logoutBtn = document.querySelector(".logout-btn");
        logoutBtn?.addEventListener("click", () => {
            try {
                sessionStorage.removeItem("codeprep:session");
                localStorage.removeItem("codeprep:session");
            } catch (e) { /* ignore */ }
        });

        const signInLink = document.querySelector('.app-sidebar-account a[href="login.html"]');
        if (user && signInLink) {
            signInLink.title = "Sign out";
            const span = signInLink.querySelector("span");
            if (span) span.textContent = "Sign out";
            const icon = signInLink.querySelector("i");
            if (icon) icon.className = "fa-solid fa-right-from-bracket";
            signInLink.addEventListener("click", () => {
                try {
                    sessionStorage.removeItem("codeprep:session");
                    localStorage.removeItem("codeprep:session");
                } catch (e) { /* ignore */ }
            });
        }
    }

    initAccount();

});