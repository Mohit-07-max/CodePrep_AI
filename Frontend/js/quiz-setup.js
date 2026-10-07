/* =========================================================
   CodePrep AI - Quiz Setup
   File: quiz-setup.js
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "codeprep:quizConfig";
    const CURRENT_QUIZ_KEY = "codeprep:currentQuiz";

    const DEFAULT_CONFIG = {
        language: "C Programming",
        difficulty: "Medium",
        topics: [],
        questionCount: 10,
        questionType: "Multiple Choice",
        timeLimit: "30 minutes"
    };

    // ---------------------------------------------------------
    // Utility functions
    // ---------------------------------------------------------

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function getElements(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    function saveConfig(config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return { ...DEFAULT_CONFIG };
            }

            const config = JSON.parse(saved);

            return {
                ...DEFAULT_CONFIG,
                ...config,
                topics: Array.isArray(config.topics) ? config.topics : []
            };
        } catch (error) {
            console.error("Unable to load quiz configuration:", error);
            return { ...DEFAULT_CONFIG };
        }
    }

    function getLanguageFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get("language");
    }

    function normalizeLanguage(language) {
        if (!language) {
            return null;
        }

        const aliases = {
            "C": "C Programming",
            "C Programming": "C Programming",
            "C++": "C++",
            "Python": "Python",
            "Java": "Java",
            "JavaScript": "JavaScript",
            "HTML & CSS": "HTML & CSS"
        };

        return aliases[language] || language;
    }

    function updateStorage() {
        const config = getCurrentConfig();
        saveConfig(config);
    }

    // ---------------------------------------------------------
    // Read current UI configuration
    // ---------------------------------------------------------

    function getCurrentConfig() {
        const languageElement =
            document.querySelector(".language-option.active") ||
            document.querySelector(".language-option.selected");

        const languageNameElement =
            languageElement?.querySelector(".option-text strong");
        const difficultyElement =
            document.querySelector(".difficulty-option.active") ||
            document.querySelector(".difficulty-option.selected");

        const topicElements = getElements(".topic.selected, .topic.active");

        const numberElement = getElement(".number-control span");

        const selectElements = getElements(".settings-grid select");

        const questionTypeElement = selectElements[0];
        const timeLimitElement = selectElements[1];

        return {
            language:
                languageElement?.dataset.language ||
                languageElement?.getAttribute("data-language") ||
                languageNameElement?.textContent?.trim() ||
                DEFAULT_CONFIG.language,

            difficulty:
                difficultyElement?.dataset.difficulty ||
                difficultyElement?.getAttribute("data-difficulty") ||
                difficultyElement?.textContent?.trim() ||
                DEFAULT_CONFIG.difficulty,

            topics: topicElements
                .map(topic => {
                    return (
                        topic.dataset.topic ||
                        topic.getAttribute("data-topic") ||
                        topic.textContent.trim()
                    );
                })
                .filter(Boolean),

            questionCount: numberElement
                ? parseInt(numberElement.textContent.trim(), 10) ||
                  DEFAULT_CONFIG.questionCount
                : DEFAULT_CONFIG.questionCount,

            questionType:
                questionTypeElement?.value ||
                DEFAULT_CONFIG.questionType,

            timeLimit:
                timeLimitElement?.value ||
                DEFAULT_CONFIG.timeLimit
        };
    }

    // ---------------------------------------------------------
    // Language selection
    // ---------------------------------------------------------

    function initLanguageSelection(config) {
        const languageOptions = getElements(".language-option");

        if (!languageOptions.length) {
            return;
        }

        function updateCheckIcons(selectedOption) {
            languageOptions.forEach(option => {
                const checkIcon = option.querySelector(".check");

                if (!checkIcon) {
                    return;
                }

                if (option === selectedOption) {
                    checkIcon.classList.remove("fa-regular");
                    checkIcon.classList.remove("fa-circle");
                    checkIcon.classList.add("fa-solid");
                    checkIcon.classList.add("fa-circle-check");
                } else {
                    checkIcon.classList.remove("fa-solid");
                    checkIcon.classList.remove("fa-circle-check");
                    checkIcon.classList.add("fa-regular");
                    checkIcon.classList.add("fa-circle");
                }
            });
        }

        languageOptions.forEach(option => {
            const languageElement =
                option.querySelector(".option-text strong");

            if (!languageElement) {
                return;
            }

            const optionLanguage =
                languageElement.textContent.trim();

            const normalizedOption =
                normalizeLanguage(optionLanguage);

            const normalizedConfig =
                normalizeLanguage(config.language);

            if (normalizedOption === normalizedConfig) {
                setActiveOption(
                    languageOptions,
                    option,
                    "active"
                );

                updateCheckIcons(option);
            }

            option.addEventListener("click", () => {
                setActiveOption(
                    languageOptions,
                    option,
                    "active"
                );

                updateCheckIcons(option);

                config.language =
                    normalizeLanguage(optionLanguage);

                saveConfig(config);
                updatePreview(config);
            });
        });
    }

    // ---------------------------------------------------------
    // Difficulty selection
    // ---------------------------------------------------------

    function initDifficultySelection(config) {
        const difficultyOptions = getElements(".difficulty-option");

        if (!difficultyOptions.length) {
            return;
        }

        difficultyOptions.forEach(option => {
            const difficulty =
                option.dataset.difficulty ||
                option.getAttribute("data-difficulty") ||
                option.textContent.trim();

            if (
                difficulty.toLowerCase() ===
                String(config.difficulty).toLowerCase()
            ) {
                setActiveOption(
                    difficultyOptions,
                    option,
                    "active"
                );
            }

            option.addEventListener("click", () => {
                setActiveOption(
                    difficultyOptions,
                    option,
                    "active"
                );

                config.difficulty =
                    option.dataset.difficulty ||
                    option.getAttribute("data-difficulty") ||
                    option.textContent.trim();

                saveConfig(config);
                updatePreview(config);
            });
        });
    }

    // ---------------------------------------------------------
    // Generic active option helper
    // ---------------------------------------------------------

    function setActiveOption(options, selected, activeClass) {
        options.forEach(option => {
            option.classList.remove(activeClass);
            option.classList.remove("selected");
        });

        selected.classList.add(activeClass);
        selected.classList.add("selected");
    }

    // ---------------------------------------------------------
    // Topic selection
    // ---------------------------------------------------------

    function initTopics(config) {
        const topics = getElements(".topic");

        if (!topics.length) {
            return;
        }

        topics.forEach(topic => {
            const topicName =
                topic.dataset.topic ||
                topic.getAttribute("data-topic") ||
                topic.textContent.trim();

            if (config.topics.includes(topicName)) {
                topic.classList.add("selected");
                topic.classList.add("active");
                updateTopicCheckIcon(topic, true);
            }

            topic.addEventListener("click", () => {
                const isSelected =
                    topic.classList.contains("selected") ||
                    topic.classList.contains("active");

                if (isSelected) {
                    topic.classList.remove("selected");
                    topic.classList.remove("active");
                    updateTopicCheckIcon(topic, false);

                    config.topics = config.topics.filter(
                        item => item !== topicName
                    );
                } else {
                    topic.classList.add("selected");
                    topic.classList.add("active");
                    updateTopicCheckIcon(topic, true);

                    if (!config.topics.includes(topicName)) {
                        config.topics.push(topicName);
                    }
                }

                saveConfig(config);
                updatePreview(config);
            });
        });
    }

    // ---------------------------------------------------------
    // Topic check icon
    // ---------------------------------------------------------

    function updateTopicCheckIcon(topic, selected) {
        const icon =
            topic.querySelector(
                ".topic-check, .check-icon, .topic i, .topic svg"
            );

        if (!icon) {
            return;
        }

        if (selected) {
            icon.style.opacity = "1";
        } else {
            icon.style.opacity = "0";
        }
    }

    // ---------------------------------------------------------
    // Question count
    // ---------------------------------------------------------

    function initQuestionCount(config) {
        const control = document.querySelector(".number-control");

        if (!control) {
            return;
        }

        const buttons = control.querySelectorAll("button");
        const display = control.querySelector("span");

        if (!display || buttons.length < 2) {
            return;
        }

        let count = parseInt(display.textContent.trim(), 10);

        if (Number.isNaN(count)) {
            count = config.questionCount || 10;
        }

        count = Math.min(50, Math.max(1, count));

        display.textContent = count;
        config.questionCount = count;

        // First button = decrease
        buttons[0].addEventListener("click", () => {
            if (count > 1) {
                count--;
            }

            display.textContent = count;
            config.questionCount = count;

            saveConfig(config);
            updatePreview(config);
        });

        // Second button = increase
        buttons[1].addEventListener("click", () => {
            if (count < 50) {
                count++;
            }

            display.textContent = count;
            config.questionCount = count;

            saveConfig(config);
            updatePreview(config);
        });
    }

    // ---------------------------------------------------------
    // Select controls
    // ---------------------------------------------------------

    function initSelectControls(config) {
        const selects = getElements(".settings-grid select");

        if (!selects.length) {
            return;
        }

        if (selects[0]) {
            selects[0].value = config.questionType;

            selects[0].addEventListener("change", () => {
                config.questionType = selects[0].value;

                saveConfig(config);
                updatePreview(config);
            });
        }

        if (selects[1]) {
            selects[1].value = config.timeLimit;

            selects[1].addEventListener("change", () => {
                config.timeLimit = selects[1].value;

                saveConfig(config);
                updatePreview(config);
            });
        }
    }

    // ---------------------------------------------------------
    // Preview
    // ---------------------------------------------------------

    function updatePreview(config) {
        const previewItems = getElements(".preview-item");

        if (previewItems.length) {
            previewItems.forEach(item => {
                const label = item.querySelector("span");
                const value = item.querySelector("strong");

                if (!label || !value) {
                    return;
                }

                const labelText =
                    label.textContent.trim().toLowerCase();

                if (labelText.includes("language")) {
                    value.textContent = config.language;
                }

                if (labelText.includes("difficulty")) {
                    value.textContent = config.difficulty;
                }

                if (
                    labelText.includes("question") ||
                    labelText.includes("number")
                ) {
                    value.textContent = config.questionCount;
                }

                if (labelText.includes("type")) {
                    value.textContent = config.questionType;
                }

                if (labelText.includes("time")) {
                    value.textContent = config.timeLimit;
                }
            });
        }

        const summaryStrong =
            getElement(".selected-summary strong");

        const summarySpan =
            getElement(".selected-summary span");

        if (summaryStrong) {
            summaryStrong.textContent =
                config.topics.length > 0
                    ? config.topics.length
                    : "0";
        }

        if (summarySpan) {
            summarySpan.textContent =
                config.topics.length === 1
                    ? "topic selected"
                    : "topics selected";
        }

        const aiMessage = getElement(".ai-message p");

        if (aiMessage) {
            const topicText =
                config.topics.length > 0
                    ? config.topics.join(", ")
                    : "your selected topics";

            aiMessage.textContent =
                `I'll create ${config.questionCount} ` +
                `${config.questionType.toLowerCase()} questions ` +
                `for ${config.language} at ${config.difficulty} ` +
                `difficulty, focusing on ${topicText}.`;
        }
    }

    // ---------------------------------------------------------
    // Validate configuration
    // ---------------------------------------------------------

    function validateConfig(config) {
        const errors = [];

        if (!config.language) {
            errors.push("Please select a programming language.");
        }

        if (!config.difficulty) {
            errors.push("Please select a difficulty level.");
        }

        if (!config.topics || config.topics.length === 0) {
            errors.push("Please select at least one topic.");
        }

        if (
            !Number.isInteger(config.questionCount) ||
            config.questionCount < 1 ||
            config.questionCount > 50
        ) {
            errors.push(
                "Question count must be between 1 and 50."
            );
        }

        if (!config.questionType) {
            errors.push("Please select a question type.");
        }

        if (!config.timeLimit) {
            errors.push("Please select a time limit.");
        }

        return errors;
    }

    // ---------------------------------------------------------
    // Generate Quiz
    // ---------------------------------------------------------

    function initGenerateButton(config) {
        const generateButton =
            getElement(".generate-btn");

        if (!generateButton) {
            return;
        }

        generateButton.addEventListener("click", event => {
            event.preventDefault();

            const currentConfig = getCurrentConfig();

            const errors = validateConfig(currentConfig);

            if (errors.length) {
                alert(errors.join("\n"));
                return;
            }

            // Save setup configuration
            saveConfig(currentConfig);

            // Save configuration specifically for the quiz page
            localStorage.setItem(
                CURRENT_QUIZ_KEY,
                JSON.stringify({
                    ...currentConfig,
                    createdAt: new Date().toISOString(),
                    status: "ready"
                })
            );

            // Navigate to quiz page
            window.location.href =
                `quiz.html?source=quiz-setup`;
        });
    }

    // ---------------------------------------------------------
    // Notification / Bell
    // ---------------------------------------------------------

    function initNotificationButton() {
        const bell =
            getElement(".app-page-bell");

        if (!bell) {
            return;
        }

        bell.addEventListener("click", () => {
            alert("No new notifications.");
        });
    }

    // ---------------------------------------------------------
    // Initialize
    // ---------------------------------------------------------

    function initQuizSetup() {
        let config = loadConfig();

        // If language was passed from main.html, use it.
        const urlLanguage = getLanguageFromURL();

        if (urlLanguage) {
            config.language =
                normalizeLanguage(urlLanguage);
        }

        saveConfig(config);

        initLanguageSelection(config);
        initDifficultySelection(config);
        initTopics(config);
        initQuestionCount(config);
        initSelectControls(config);

        updatePreview(config);

        initGenerateButton(config);
        initNotificationButton();
    }

    // ---------------------------------------------------------
    // DOM Ready
    // ---------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initQuizSetup
        );
    } else {
        initQuizSetup();
    }
})();