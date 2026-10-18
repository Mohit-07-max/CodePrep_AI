# CodePrep AI (Vibe_Code)

> **Prepare. Practice. Code Smarter.**  
> An AI-assisted programming practice platform for developers and computer science students. Practice multiple languages, generate customized quizzes, review real-time feedback, and track long-term learning performance.

---

## 🚀 Overview

CodePrep AI is a frontend web application built with modern vanilla web standards (HTML5, CSS3, ES6+ JavaScript). It delivers a responsive dashboard, modular practice quiz engine, analytics reports, and profile customization without requiring third-party runtime frameworks or heavy backend dependencies.

---

## 📁 Project Architecture & File Organization

The project follows a clean 1-to-1 modular structure where each page has dedicated HTML, CSS, and JS files, complemented by shared responsive navigation components:

```
Vibe_Code/
├── README.md                          # Project documentation and architecture guide
└── Frontend/
    ├── html/                          # Semantic HTML5 page views
    │   ├── main.html                  # Landing page (Features, Stats, Topics, Quiz Preview)
    │   ├── login.html                 # User authentication (Sign in, Validation, Throttle)
    │   ├── register.html              # Account registration and onboarding
    │   ├── dashboard.html             # Main student dashboard & quick practice hub
    │   ├── quiz-setup.html            # Practice configuration (Language, Difficulty, Topics)
    │   ├── quiz.html                  # Interactive quiz runner with live timer & code snippets
    │   ├── result.html                # Comprehensive performance breakdown & AI feedback
    │   ├── history.html               # Searchable, filterable, and paginated quiz attempts
    │   └── profile.html               # User profile, skills, preferences, and data export
    │
    ├── css/                           # Stylesheets with modern CSS custom properties
    │   ├── main.css                   # Landing page layout & glassmorphic cards
    │   ├── login.css                  # Login layout and input styling
    │   ├── register.css               # Registration layout and step indicators
    │   ├── dashboard.css              # Student dashboard grid and card components
    │   ├── quiz-setup.css             # Interactive quiz builder selectors and preview
    │   ├── quiz.css                   # Quiz interface, code blocks, option selectors
    │   ├── result.css                 # Score ring, bar charts, review lists
    │   ├── history.css                # Attempts table, filter pills, pagination
    │   ├── profile.css                # Profile cover, editable inputs, badges, switches
    │   ├── sidebar.css                # Shared sidebar navigation and responsive drawers
    │   └── page-navbar.css            # Top navigation bar, avatar, and notification badges
    │
    └── js/                            # Modular JavaScript (ES6+, zero runtime dependencies)
        ├── main.js                    # Landing page animations, counter count-up, result preview
        ├── login.js                   # Salted SHA-256 client authentication & lockouts
        ├── register.js                # Account creation, validation, auto-session setup
        ├── dashboard.js               # Dashboard metrics, active quiz detection, notifications
        ├── quiz-setup.js              # Configuration state management & quiz initialization
        ├── quiz.js                    # Quiz engine, timer, option selection, history sync
        ├── result.js                  # Result loader, performance categorizer, review generator
        ├── history.js                 # History table, sorting, multi-criteria filtering, stats
        └── profile.js                 # Live in-place editing, avatar preview, preference storage
```

---

## 🛠️ Tech Stack & Design System

- **Markup:** Semantic HTML5 with complete ARIA attributes and keyboard trap accessibility.
- **Styling:** CSS3 with CSS Custom Properties (variables), Glassmorphism, Flexbox, CSS Grid, and responsive `@media` breakpoints.
- **Typography:** [Sora](https://fonts.google.com/specimen/Sora) (headings & UI) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (code snippets).
- **Icons:** [Font Awesome 6](https://fontawesome.com/) & [Devicon](https://devicon.dev/).
- **Scripting:** Pure ES6+ JavaScript (IIFEs & modern DOM APIs), no npm/bundler required.
- **Persistence:** Client-side `localStorage` and `sessionStorage` managing auth sessions and quiz state.

---

## 💾 Storage & Data Flow

| Key | Scope | Purpose |
|---|---|---|
| `codeprep:session` | Session / Local | Stores current signed-in user email |
| `codeprep:users` | Local | Array of registered user profiles (`name`, `email`, `salt`, `hash`, `joined`) |
| `codeprep:quizConfig` | Local | User's last selected quiz options (language, difficulty, topics, count) |
| `codeprep:currentQuiz` | Local | Stored payload for the currently active quiz session |
| `codeprep:lastResult` | Local | Most recent completed quiz score, breakdown, and question answers |
| `codeprep:quizHistory` | Local | Chronological list of completed quiz attempt records |
| `codeprep:attempts:<email>` | Local | User-specific quiz attempts consumed by the History page |

---

## ⚡ How to Run

Because CodePrep AI is built purely with web standards, you do not need Node.js or any build step to run it:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/Mohit-07-max/Vibe_Code.git
   ```
2. Open any page directly in your browser:
   - Double click `Frontend/html/main.html` or `Frontend/html/dashboard.html`.
   - Or serve with any static web server (such as VS Code Live Server or Python):
     ```bash
     python -m http.server 8000
     ```
     Navigate to `http://localhost:8000/Frontend/html/main.html`.

---

## 📄 License & Attribution

&copy; 2026 CodePrep AI. Built by Mohit Singh Gusain.
