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

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
            closeEditMode();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeSidebar();
        }
    });


    /* ================= NOTIFICATIONS ================= */

    const notificationButton = document.querySelector(".notification-btn");
    const notificationDot = document.querySelector(".notification-dot");

    if (notificationButton) {

        notificationButton.addEventListener("click", () => {

            // Remove notification badge
            if (notificationDot) {
                notificationDot.style.display = "none";
            }

            // Add dashboard-style active state
            notificationButton.classList.toggle("notification-active");

        });

    }


    /* ================= PROFILE EDITING ================= */

    const editProfileButton =
        document.querySelector(".edit-profile-btn");

    const smallEditButtons =
        document.querySelectorAll(".small-edit");

    const profileName =
        document.querySelector(".profile-main-info h2");

    const username =
        document.querySelector(".username");

    const infoValues =
        document.querySelectorAll(".info-item strong");

    let editing = false;

    function makeEditable(element) {

        if (!element) return;

        element.setAttribute("contenteditable", "true");
        element.classList.add("profile-editable");
        element.setAttribute("spellcheck", "false");
    }


    function removeEditable() {

        document
            .querySelectorAll(".profile-editable")
            .forEach((element) => {

                element.removeAttribute("contenteditable");
                element.classList.remove("profile-editable");

            });
    }


    function startEditMode() {

        if (editing) return;

        editing = true;

        makeEditable(profileName);
        makeEditable(username);

        /*
         * Make personal information editable.
         * Education and Year remain fixed.
         */

        infoValues.forEach((element, index) => {

            if (index !== 4 && index !== 5) {
                makeEditable(element);
            }

        });


        if (editProfileButton) {

            editProfileButton.innerHTML =
                '<i class="fa-solid fa-check"></i> Save Profile';

            editProfileButton.classList.add("is-saving");
        }
    }


    function closeEditMode() {

        if (!editing) return;

        editing = false;

        removeEditable();

        if (editProfileButton) {

            editProfileButton.innerHTML =
                '<i class="fa-solid fa-pen"></i> Edit Profile';

            editProfileButton.classList.remove("is-saving");
        }
    }


    function saveProfile() {

        document
            .querySelectorAll(".profile-editable")
            .forEach((field) => {

                field.textContent =
                    field.textContent.trim();

            });

        closeEditMode();
    }


    editProfileButton?.addEventListener("click", () => {

        if (editing) {
            saveProfile();
        } else {
            startEditMode();
        }

    });


    smallEditButtons.forEach((button) => {

        button.addEventListener("click", () => {

            startEditMode();

            const card =
                button.closest(".glass-card");

            const firstEditable =
                card?.querySelector(".profile-editable");

            firstEditable?.focus();

        });

    });


    /* ================= AVATAR CAMERA ================= */

    const avatarEditButton =
        document.querySelector(".avatar-edit");

    const avatar =
        document.querySelector(".profile-avatar-large");


    if (avatarEditButton && avatar) {

        const fileInput =
            document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.hidden = true;

        document.body.appendChild(fileInput);


        avatarEditButton.addEventListener("click", (event) => {

            event.preventDefault();

            fileInput.click();

        });


        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];

            if (!file) return;


            const reader = new FileReader();


            reader.onload = (event) => {

                avatar.style.backgroundImage =
                    `url("${event.target.result}")`;

                avatar.style.backgroundSize = "cover";
                avatar.style.backgroundPosition = "center";

                avatar.style.color = "transparent";

            };


            reader.readAsDataURL(file);

        });

    }


    /* ================= ACCOUNT ACTIVITY ================= */

    document
        .querySelectorAll(".activity-action")
        .forEach((button) => {

            button.addEventListener("click", () => {

                const originalText =
                    button.textContent.trim();

                button.textContent = "Updated";
                button.disabled = true;


                setTimeout(() => {

                    button.textContent = originalText;
                    button.disabled = false;

                }, 1400);

            });

        });


    /* ================= PREFERENCE TOGGLES ================= */

    document
        .querySelectorAll(".toggle input")
        .forEach((input, index) => {

            const toggle =
                input.closest(".toggle");


            if (toggle) {

                toggle.setAttribute(
                    "role",
                    "switch"
                );

                toggle.setAttribute(
                    "aria-checked",
                    String(input.checked)
                );

            }


            input.addEventListener("change", () => {

                if (toggle) {

                    toggle.setAttribute(
                        "aria-checked",
                        String(input.checked)
                    );

                }

                localStorage.setItem(
                    `codeprep-profile-preference-${index}`,
                    String(input.checked)
                );

            });


            /*
             * Restore saved preference
             */

            const saved =
                localStorage.getItem(
                    `codeprep-profile-preference-${index}`
                );


            if (saved !== null) {

                input.checked =
                    saved === "true";

                if (toggle) {

                    toggle.setAttribute(
                        "aria-checked",
                        String(input.checked)
                    );

                }

            }

        });


    /* ================= EXPORT PROFILE DATA ================= */

    const exportButton =
        document.querySelector(".secondary-btn");


    exportButton?.addEventListener("click", () => {

        const data = {

            profile: {

                name:
                    profileName?.textContent.trim() || "",

                username:
                    username?.textContent
                        .replace("@", "")
                        .trim() || ""

            },

            preferences:
                Array
                    .from(
                        document.querySelectorAll(
                            ".preference-row"
                        )
                    )
                    .map((row) => ({

                        name:
                            row
                                .querySelector("strong")
                                ?.textContent
                                .trim() || "",

                        enabled:
                            row
                                .querySelector("input")
                                ?.checked || false

                    })),

            exportedAt:
                new Date().toISOString()

        };


        const blob =
            new Blob(
                [
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                ],
                {
                    type: "application/json"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "codeprep-profile-data.json";


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    });

});