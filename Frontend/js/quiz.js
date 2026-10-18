
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================
    // QUESTIONS
    // answer is the zero-based index of the correct option
    // =========================
    const questions = [
        {
            question: "What is the output of the following C program?",
            type: "Multiple Choice",
            language: "C",
            code: `#include <stdio.h>

int main() {
    int x = 10;
    int y = 5;
    printf("%d", x + y);
    return 0;
}`,
            options: ["15", "10", "5", "20"],
            answer: 0,
            hint: "Evaluate the arithmetic operation inside printf."
        },
        {
            question: "Which keyword declares a constant variable in C?",
            type: "Multiple Choice",
            language: "C",
            code: "const int value = 10;",
            options: ["constant", "const", "static", "fixed"],
            answer: 1,
            hint: "The keyword starts with 'con'."
        },
        {
            question: "What is the output of this C loop?",
            type: "Multiple Choice",
            language: "C",
            code: `for (int i = 1; i <= 3; i++) {
    printf("%d ", i);
}`,
            options: ["1 2 3", "0 1 2", "1 2", "3 2 1"],
            answer: 0,
            hint: "The loop starts at 1 and continues through 3."
        },
        {
            question: "Which operator compares two values for equality in C?",
            type: "Multiple Choice",
            language: "C",
            code: "if (a == b) {\n    printf(\"Equal\");\n}",
            options: ["=", "==", "!=", ">="],
            answer: 1,
            hint: "Assignment and equality comparison use different operators."
        },
        {
            question: "What does this program print when x is 7?",
            type: "Multiple Choice",
            language: "C",
            code: `int x = 7;

if (x > 5)
    printf("Yes");
else
    printf("No");`,
            options: ["No", "7", "Yes", "Error"],
            answer: 2,
            hint: "Check whether 7 is greater than 5."
        },
        {
            question: "Which loop executes its body at least once?",
            type: "Multiple Choice",
            language: "C",
            code: "do {\n    printf(\"Hello\");\n} while (0);",
            options: ["for loop", "while loop", "do-while loop", "if statement"],
            answer: 2,
            hint: "This loop checks its condition after executing its body."
        },
        {
            question: "What does sizeof return in C?",
            type: "Multiple Choice",
            language: "C",
            code: "int x;\nprintf(\"%zu\", sizeof(x));",
            options: [
                "The value of x",
                "The memory size in bytes",
                "The address of x",
                "The data type name"
            ],
            answer: 1,
            hint: "sizeof tells you the size of an object or type in bytes."
        },
        {
            question: "Which operator dereferences a pointer in C?",
            type: "Multiple Choice",
            language: "C",
            code: "int x = 25;\nint *p = &x;\nprintf(\"%d\", *p);",
            options: ["&", "*", "#", "%"],
            answer: 1,
            hint: "This is called the dereference operator."
        },
        {
            question: "Which declaration creates an integer array with 5 elements?",
            type: "Multiple Choice",
            language: "C",
            code: "/* Choose the correct declaration */",
            options: [
                "int numbers(5);",
                "array int numbers[5];",
                "int numbers[5];",
                "int[5] numbers;"
            ],
            answer: 2,
            hint: "C array sizes are written inside square brackets."
        },
        {
            question: "What does break do inside a loop?",
            type: "Multiple Choice",
            language: "C",
            code: `for (int i = 1; i <= 5; i++) {
    if (i == 3) break;
    printf("%d ", i);
}`,
            options: [
                "Skips the current iteration",
                "Stops the loop",
                "Restarts the loop",
                "Stops the entire program"
            ],
            answer: 1,
            hint: "break terminates the nearest enclosing loop."
        }
    ];

    // =========================
    // LOAD QUIZ CONFIGURATION
    // =========================
    let config = {};

    try {
        config = JSON.parse(
            localStorage.getItem("codeprep:currentQuiz") || "{}"
        );
    } catch (error) {
        console.warn("Could not load quiz configuration.", error);
    }

    const requestedCount = Number(config.questionCount) || questions.length;
    const count = Math.max(
        1,
        Math.min(Math.floor(requestedCount), questions.length)
    );

    // Shuffle without modifying the original array.
    const quizQuestions = [...questions]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

    const timeLimitMinutes = Math.max(
        1,
        parseInt(String(config.timeLimit || "15").match(/\d+/)?.[0], 10) || 15
    );

    const totalSeconds = timeLimitMinutes * 60;

    let timeRemaining = totalSeconds;
    let currentQuestion = 0;
    let timerInterval = null;
    let quizFinished = false;

    const selectedAnswers = Array(quizQuestions.length).fill(null);
    const markedQuestions = new Set();

    // =========================
    // HTML ELEMENTS
    // =========================
    const questionNumber = document.querySelector(".question-number");
    const questionTitle = document.querySelector(".question-header h1");
    const questionType = document.querySelector(".question-type");
    const codeBlock = document.querySelector(".code-window code");
    const codeLanguage = document.querySelector(".code-language");
    const answersContainer = document.querySelector(".answers");
    const hintText = document.querySelector(".hint-box p");
    const hintButton = document.querySelector(".hint-btn");

    const progressText = document.querySelector(
        ".quiz-page-progress .progress-info strong"
    );
    const progressFill = document.querySelector(
        ".quiz-page-progress .progress-fill"
    );

    const previousButton = document.querySelector(".previous-btn");
    const markButton = document.querySelector(".mark-btn");
    const nextButton = document.querySelector(".next-btn");
    const timerElement = document.querySelector(".timer");
    const timerProgress = document.querySelector(".timer-progress div");
    const questionGrid = document.querySelector(".question-grid");
    const totalQuestions = document.querySelector(".total-questions");
    const infoRows = document.querySelectorAll(".info-row strong");
    const copyButton = document.querySelector(".copy-btn");

    if (!questionTitle || !answersContainer) {
        console.error(
            "Quiz elements not found. Check the selectors in quiz.html."
        );
        return;
    }

    // =========================
    // RENDER ANSWERS
    // =========================
    function renderAnswers(question) {
        const letters = ["A", "B", "C", "D"];

        answersContainer.innerHTML = "";

        question.options.forEach((option, index) => {
            const label = document.createElement("label");
            label.className = "answer-option";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "answer";
            radio.value = String(index);
            radio.checked = selectedAnswers[currentQuestion] === index;

            const letter = document.createElement("span");
            letter.className = "option-letter";
            letter.textContent = letters[index];

            const text = document.createElement("span");
            text.className = "option-text";
            text.textContent = option;

            const check = document.createElement("span");
            check.className = "option-check";
            check.innerHTML = '<i class="fa-solid fa-check"></i>';

            radio.addEventListener("change", () => {
                selectedAnswers[currentQuestion] = Number(radio.value);
                updateNavigator();
            });

            label.append(radio, letter, text, check);
            answersContainer.appendChild(label);
        });
    }

    // =========================
    // RENDER QUESTION
    // =========================
    function renderQuestion() {
        if (quizFinished) return;

        const question = quizQuestions[currentQuestion];

        questionNumber.textContent = String(currentQuestion + 1).padStart(2, "0");
        questionTitle.textContent = question.question;

        if (questionType) {
            questionType.innerHTML =
                '<i class="fa-solid fa-list-check"></i> ' + question.type;
        }

        if (codeBlock) {
            codeBlock.textContent = question.code;
        }

        if (codeLanguage) {
            codeLanguage.innerHTML =
                '<i class="fa-solid fa-code"></i> ' + question.language;
        }

        renderAnswers(question);

        if (hintText) {
            hintText.textContent =
                "Click “Show Hint” when you need help with this question.";
        }

        if (hintButton) {
            hintButton.textContent = "Show Hint";
            hintButton.dataset.visible = "false";
        }

        if (previousButton) {
            previousButton.disabled = currentQuestion === 0;
        }

        if (markButton) {
            markButton.innerHTML = markedQuestions.has(currentQuestion)
                ? '<i class="fa-solid fa-bookmark"></i> Marked'
                : '<i class="fa-regular fa-bookmark"></i> Mark for Review';
        }

        if (nextButton) {
            const isLast = currentQuestion === quizQuestions.length - 1;

            nextButton.innerHTML = isLast
                ? 'Submit Quiz <i class="fa-solid fa-check"></i>'
                : 'Next Question <i class="fa-solid fa-arrow-right"></i>';

            // The original HTML uses an anchor; prevent early navigation.
            nextButton.removeAttribute("href");
            nextButton.setAttribute("role", "button");
        }

        if (progressText) {
            progressText.textContent =
                `${currentQuestion + 1} / ${quizQuestions.length}`;
        }

        if (progressFill) {
            progressFill.style.width =
                `${((currentQuestion + 1) / quizQuestions.length) * 100}%`;
        }

        if (totalQuestions) {
            totalQuestions.textContent = `${quizQuestions.length} Questions`;
        }

        updateInfo();
        updateNavigator();
    }

    // =========================
    // QUESTION NAVIGATOR
    // =========================
    function updateNavigator() {
        if (!questionGrid) return;

        questionGrid.innerHTML = "";

        quizQuestions.forEach((_, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nav-question";
            button.textContent = String(index + 1);
            button.setAttribute("aria-label", `Go to question ${index + 1}`);

            
            if (selectedAnswers[index] !== null) {
                button.classList.add("answered");
            }

            if (index === currentQuestion) {
                button.classList.add("active");
            }

            if (markedQuestions.has(index)) {
                button.classList.add("marked");
            }

            button.addEventListener("click", () => {
                if (quizFinished) return;
                currentQuestion = index;
                renderQuestion();
            });

            questionGrid.appendChild(button);
        });
    }

    // =========================
    // QUIZ INFORMATION
    // =========================
    function updateInfo() {
        if (infoRows[0]) {
            infoRows[0].textContent =
                config.language || quizQuestions[currentQuestion].language;
        }

        if (infoRows[1] && config.difficulty) {
            infoRows[1].textContent = config.difficulty;
        }

        if (infoRows[2]) {
            infoRows[2].textContent = String(quizQuestions.length);
        }

        if (infoRows[3] && config.topics) {
            infoRows[3].textContent = Array.isArray(config.topics)
                ? config.topics.join(", ")
                : String(config.topics);
        }
    }

    // =========================
    // HINT BUTTON
    // =========================
    if (hintButton) {
        hintButton.addEventListener("click", () => {
            const visible = hintButton.dataset.visible === "true";

            hintButton.dataset.visible = String(!visible);
            hintButton.textContent = visible ? "Show Hint" : "Hide Hint";

            if (hintText) {
                hintText.textContent = visible
                    ? "Click “Show Hint” when you need help with this question."
                    : quizQuestions[currentQuestion].hint;
            }
        });
    }

    // =========================
    // PREVIOUS BUTTON
    // =========================
    if (previousButton) {
        previousButton.addEventListener("click", () => {
            if (quizFinished || currentQuestion === 0) return;

            currentQuestion--;
            renderQuestion();
        });
    }

    // =========================
    // NEXT / SUBMIT BUTTON
    // =========================
    if (nextButton) {
        nextButton.addEventListener("click", event => {
            event.preventDefault();

            if (quizFinished) return;

            if (currentQuestion < quizQuestions.length - 1) {
                currentQuestion++;
                renderQuestion();
                return;
            }

            const unanswered = selectedAnswers.filter(
                answer => answer === null
            ).length;

            if (unanswered > 0) {
                const confirmSubmit = window.confirm(
                    `You have ${unanswered} unanswered question(s). Submit anyway?`
                );

                if (!confirmSubmit) return;
            }

            finishQuiz();
        });
    }

    // =========================
    // MARK FOR REVIEW
    // =========================
    if (markButton) {
        markButton.addEventListener("click", () => {
            if (quizFinished) return;

            if (markedQuestions.has(currentQuestion)) {
                markedQuestions.delete(currentQuestion);
            } else {
                markedQuestions.add(currentQuestion);
            }

            renderQuestion();
        });
    }

    // =========================
    // COPY CODE
    // =========================
    if (copyButton && codeBlock) {
        copyButton.addEventListener("click", async () => {
            try {
                if (!navigator.clipboard) {
                    throw new Error("Clipboard API is unavailable.");
                }

                await navigator.clipboard.writeText(codeBlock.textContent);

                const previousContent = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
                copyButton.title = "Copied!";

                window.setTimeout(() => {
                    copyButton.innerHTML = previousContent;
                    copyButton.title = "Copy Code";
                }, 1200);
            } catch (error) {
                window.prompt("Copy this code:", codeBlock.textContent);
            }
        });
    }

    // =========================
    // TIMER
    // =========================
    function updateTimer() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;

        if (timerElement) {
            timerElement.textContent =
                `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        if (timerProgress) {
            timerProgress.style.width =
                `${(timeRemaining / totalSeconds) * 100}%`;
        }
    }

    function startTimer() {
        updateTimer();

        timerInterval = window.setInterval(() => {
            if (quizFinished) {
                window.clearInterval(timerInterval);
                return;
            }

            timeRemaining = Math.max(0, timeRemaining - 1);
            updateTimer();

            if (timeRemaining === 0) {
                window.clearInterval(timerInterval);
                window.alert("Time is up. Your quiz will be submitted.");
                finishQuiz();
            }
        }, 1000);
    }

    // =========================
    // SUBMIT AND SCORE
    // =========================
    function finishQuiz() {
        if (quizFinished) return;

        quizFinished = true;

        if (timerInterval !== null) {
            window.clearInterval(timerInterval);
        }

        let score = 0;

        selectedAnswers.forEach((answer, index) => {
            if (
                answer !== null &&
                answer !== undefined &&
                answer === quizQuestions[index].answer
            ) {
                score++;
            }
        });

        const total = quizQuestions.length;
        const percentage = total > 0
            ? Math.round((score / total) * 100)
            : 0;

        // Save each question and its answer for the result page.
        const result = {
            id: Date.now().toString(),
            title: `${config.language || "C"} Programming Quiz`,
            language: config.language || "C Programming",
            difficulty: config.difficulty || "Intermediate",
            date: new Date().toISOString(),
            seconds: totalSeconds - timeRemaining,

            score: score,
            correct: score,
            total: total,
            percentage: percentage,

            questions: quizQuestions.map((question, index) => {
                const selectedIndex = selectedAnswers[index];
                
                const skipped =
                    selectedIndex === null ||
                    selectedIndex === undefined;

                const isCorrect =
                    !skipped &&
                    selectedIndex === question.answer;

                return {
                    topic: question.topic || "General",
                    text: question.question,

                    userAnswer: skipped
                        ? ""
                        : question.options[selectedIndex],

                    correctAnswer: question.options[question.answer],
                    
                    explanation:
                        question.explanation ||
                        question.hint ||
                        "",

                    status: skipped
                        ? "skipped"
                        : isCorrect
                            ? "correct"
                            : "incorrect"
                };
            }),

            answers: selectedAnswers,
            markedQuestions: Array.from(markedQuestions),
            completedAt: new Date().toISOString()
        };

        // Save the latest result.
        try {
            localStorage.setItem(
                "codeprep:lastResult",
                JSON.stringify(result)
            );

            // Save quiz history.
            const oldHistory = JSON.parse(
                localStorage.getItem("codeprep:quizHistory") || "[]"
            );

            const history = Array.isArray(oldHistory)
                ? oldHistory
                : [];

            history.unshift(result);

            localStorage.setItem(
                "codeprep:quizHistory",
                JSON.stringify(history.slice(0, 100))
            );

            // Also save to user attempts for history page
            const sessionEmail = sessionStorage.getItem("codeprep:session") || localStorage.getItem("codeprep:session") || "guest";
            const attemptsKey = `codeprep:attempts:${sessionEmail}`;
            const oldAttempts = JSON.parse(localStorage.getItem(attemptsKey) || "[]");
            const userAttempts = Array.isArray(oldAttempts) ? oldAttempts : [];
            userAttempts.unshift(result);
            localStorage.setItem(attemptsKey, JSON.stringify(userAttempts.slice(0, 100)));

        } catch (error) {
            console.error("Could not save quiz result:", error);
        }

        // Redirect to the result page.
        const resultUrl = new URL(
            "result.html",
            window.location.href
        );

        resultUrl.searchParams.set("score", String(score));
        resultUrl.searchParams.set("total", String(total));
        resultUrl.searchParams.set("percentage", String(percentage));

        window.location.href = resultUrl.href;
    }

    // =========================
    // EXIT CONFIRMATION MODAL
    // =========================
    const exitButton = document.querySelector(".exit-btn");
    const exitModal = document.getElementById("exitModal");
    const stayQuizBtn = document.getElementById("stayQuizBtn");
    const confirmExitBtn = document.getElementById("confirmExitBtn");

    if (exitButton && exitModal) {
        exitButton.addEventListener("click", event => {
            event.preventDefault();
            exitModal.classList.add("show");
        });

        if (stayQuizBtn) {
            stayQuizBtn.addEventListener("click", () => {
                exitModal.classList.remove("show");
            });
        }

        if (confirmExitBtn) {
            confirmExitBtn.addEventListener("click", () => {
                window.location.href = exitButton.href;
            });
        }

        exitModal.addEventListener("click", event => {
            if (event.target === exitModal) {
                exitModal.classList.remove("show");
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                exitModal.classList.remove("show");
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
        const studentStrong = document.querySelector(".app-page-student-info strong");
        const avatar = document.querySelector(".app-page-avatar, .avatar");

        if (studentStrong) studentStrong.textContent = firstName;

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

    // =========================
    // START QUIZ
    // =========================
    const quizBell = document.querySelector(".app-page-bell");
    if (quizBell) {
        quizBell.addEventListener("click", () => {
            const oldToast = document.querySelector(".quiz-toast");
            if (oldToast) oldToast.remove();
            const toastEl = document.createElement("div");
            toastEl.className = "quiz-toast";
            toastEl.textContent = "Notifications paused during active quiz session.";
            toastEl.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#16183a;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.15);transition:opacity 0.3s ease;";
            document.body.appendChild(toastEl);
            setTimeout(() => {
                toastEl.style.opacity = "0";
                setTimeout(() => toastEl.remove(), 300);
            }, 2500);
        });
    }

    initAccountUI();
    renderQuestion();
    startTimer();
});
