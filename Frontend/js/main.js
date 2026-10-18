/* CodePrep AI — main.js
   Behaviour for main.html
   Sections:
   1 Sidebar
   2 Smooth scrolling
   3 Stat counters
   4 Reveal on scroll
   5 Language choice
   6 Latest quiz result preview
   Needs no libraries and no changes to main.css.
*/

(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Runs callback once when an element scrolls into view
  function onVisible(element, callback, threshold = 0.2) {
    if (!('IntersectionObserver' in window)) {
      callback();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        callback();
      }
    }, { threshold });

    observer.observe(element);
  }


  /* =========================================================
     1. Sidebar
     ========================================================= */

  function initSidebar() {
    const sidebar = $('#app-sidebar');
    const menuToggle = $('.dashboard-menu-button, .app-page-menu-toggle, .main-menu-toggle');
    const drawerClose = $('.drawer-close');
    const overlay = $('.sidebar-overlay');

    if (!sidebar || !menuToggle) return;

    const setSidebarOpen = (isOpen) => {
      sidebar.classList.toggle('is-open', isOpen);
      document.body.classList.toggle('sidebar-open', isOpen);

      sidebar.inert = !isOpen;

      sidebar.setAttribute(
        'aria-hidden',
        String(!isOpen)
      );

      menuToggle.setAttribute(
        'aria-expanded',
        String(isOpen)
      );

      menuToggle.setAttribute(
        'aria-label',
        isOpen
          ? 'Close sidebar navigation'
          : 'Open sidebar navigation'
      );

      menuToggle.classList.toggle(
        'is-open',
        isOpen
      );

      if (isOpen && drawerClose) {
        drawerClose.focus();
      } else {
        menuToggle.focus();
      }
    };

    const isOpen = () =>
      menuToggle.getAttribute('aria-expanded') === 'true' ||
      sidebar.classList.contains('is-open');


    // Open / close sidebar
    menuToggle.addEventListener('click', () => {
      setSidebarOpen(!isOpen());
    });


    // Close button
    if (drawerClose) {
      drawerClose.addEventListener('click', () => {
        setSidebarOpen(false);
      });
    }


    // Overlay click closes sidebar
    if (overlay) {
      overlay.addEventListener('click', () => {
        setSidebarOpen(false);
      });
    }


    // Clicking outside sidebar closes it
    document.addEventListener('click', (event) => {
      if (
        isOpen() &&
        !sidebar.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setSidebarOpen(false);
      }
    });


    // Escape closes sidebar, Tab traps inside when open
    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const items = $$('a[href], button', sidebar);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });


    // Clicking sidebar link closes sidebar
    $$('a', sidebar).forEach((link) => {
      link.addEventListener('click', () => {
        setSidebarOpen(false);
      });
    });
  }


  /* =========================================================
     2. Smooth scrolling for in-page links
     ========================================================= */

  function initSmoothScroll() {
    const header = $('.site-header, .topbar, .dashboard-navbar');

    const headerOffset = () => {
      if (!header) return 0;

      const position =
        getComputedStyle(header).position;

      return (
        position === 'sticky' ||
        position === 'fixed'
      )
        ? header.offsetHeight
        : 0;
    };


    document.addEventListener('click', (event) => {
      const link = event.target.closest(
        'a[href*="#"]'
      );

      if (
        !link ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }


      // Placeholder links
      if (link.getAttribute('href') === '#') {
        event.preventDefault();
        return;
      }


      // Only handle same-page links
      const url = new URL(
        link.href,
        window.location.href
      );

      if (
        url.pathname !==
        window.location.pathname
      ) {
        return;
      }


      const target = document.getElementById(
        decodeURIComponent(
          url.hash.slice(1)
        )
      );

      if (!target) return;

      event.preventDefault();


      const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        headerOffset() -
        12;


      window.scrollTo({
        top: Math.max(top, 0),
        behavior: reduceMotion
          ? 'auto'
          : 'smooth'
      });


      try {
        history.pushState(
          null,
          '',
          url.hash
        );
      } catch (e) {
        // Some browsers block this on local files
      }
    });
  }


  /* =========================================================
     3. Count-up for statistics
     ========================================================= */

  function initStatCounters() {
    $$('.stat-card h2').forEach((heading) => {

      const match =
        heading.textContent
          .trim()
          .match(/^(\d+)(K?\+)$/);

      // Skip AI and 24/7
      if (!match || reduceMotion) {
        return;
      }

      const end = Number(match[1]);
      const suffix = match[2];


      onVisible(
        heading,
        () => {
          const duration = 1200;
          const start = performance.now();


          const tick = (now) => {
            const progress = Math.min(
              (now - start) / duration,
              1
            );


            const eased =
              1 -
              Math.pow(
                1 - progress,
                3
              );


            heading.textContent =
              Math.round(
                end * eased
              ) + suffix;


            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };


          requestAnimationFrame(tick);
        },
        0.6
      );
    });
  }


  /* =========================================================
     4. Fade-up reveal
     ========================================================= */

  function initReveal() {
    if (
      reduceMotion ||
      !Element.prototype.animate
    ) {
      return;
    }


    const items = $$(
      '.stat-card, .feature-card, .language-option, .step, .dash-panel, .section-head, .cta'
    );


    items.forEach((element) => {
      element.style.opacity = '0';


      const index =
        Array.from(
          element.parentElement.children
        ).indexOf(element);


      onVisible(
        element,
        () => {
          const animation =
            element.animate(
              [
                {
                  opacity: 0,
                  transform:
                    'translateY(24px)'
                },
                {
                  opacity: 1,
                  transform:
                    'translateY(0)'
                }
              ],
              {
                duration: 600,
                delay: Math.min(
                  index * 70,
                  280
                ),
                easing: 'ease-out',
                fill: 'both'
              }
            );


          animation.onfinish = () => {
            element.style.opacity = '';
            animation.cancel();
          };
        },
        0.12
      );
    });
  }


  /* =========================================================
     5. Remember selected language
     ========================================================= */

  function initLanguageCards() {
    $$('.language-option').forEach((card) => {

      card.addEventListener(
        'click',
        () => {
          const name = $('strong', card);

          if (!name) return;

          try {
            localStorage.setItem(
              'codeprep:selectedLanguage',
              name.textContent.trim()
            );
          } catch (e) {
            // Storage blocked
          }
        }
      );
    });
  }


  /* =========================================================
     6. Latest quiz result preview
     ========================================================= */

  function initResultPreview() {
    let data = null;


    try {
      data = JSON.parse(
        localStorage.getItem(
          'codeprep:lastResult'
        )
      );
    } catch (e) {
      return;
    }


    if (!data) return;


    const clamp = (n) =>
      Math.max(
        0,
        Math.min(
          100,
          Math.round(n)
        )
      );


    const questions =
      Math.max(
        0,
        Number(data.questions) || 0
      );


    const correct =
      Math.min(
        questions,
        Math.max(
          0,
          Number(data.correct) || 0
        )
      );


    const score =
      questions
        ? clamp(
            (correct / questions) * 100
          )
        : 0;


    const preparation =
      data.preparation === undefined
        ? score
        : clamp(
            Number(data.preparation) || 0
          );


    const numbers =
      $$('.mini-stat strong');


    if (numbers.length === 4) {
      numbers[0].textContent =
        score + '%';

      numbers[1].textContent =
        questions;

      numbers[2].textContent =
        correct;

      numbers[3].textContent =
        preparation + '%';
    }


    const bars =
      $$('.bar-fill');


    const widths = [
      score,
      questions
        ? clamp(
            (correct / questions) * 100
          )
        : 0,
      preparation
    ];


    bars.forEach((bar, i) => {
      if (widths[i] === undefined) {
        return;
      }


      bar.style.transition =
        reduceMotion
          ? 'none'
          : 'width 0.9s ease';


      onVisible(
        bar,
        () => {
          bar.style.width =
            widths[i] + '%';
        },
        0.5
      );
    });


    const quote =
      $('.ai-panel blockquote');


    if (
      quote &&
      typeof data.feedback ===
        'string' &&
      data.feedback.trim()
    ) {
      quote.textContent = '';


      const paragraph =
        document.createElement('p');


      paragraph.textContent =
        '“' +
        data.feedback.trim() +
        '”';


      quote.appendChild(
        paragraph
      );
    }
  }


  /* =========================================================
     7. Account session UI
     ========================================================= */

  function initAccountUI() {
    let email = null;
    try {
      email = sessionStorage.getItem('codeprep:session') || localStorage.getItem('codeprep:session');
    } catch (e) { /* ignore */ }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('codeprep:users')) || [];
    } catch (e) { users = []; }

    const user = email && Array.isArray(users) && users.find((u) => u && u.email === email);

    let profileData = null;
    try {
      profileData = JSON.parse(localStorage.getItem('codeprep:profileData'));
    } catch (e) { /* ignore */ }

    const activeName = (user && user.name) || (profileData && profileData.name) || 'Mohit';
    const firstName = activeName.split(' ')[0] || activeName;
    const strong = $('.profile-info strong');
    const avatar = $('.avatar, .app-page-avatar');
    const profile = $('.profile');

    if (strong) strong.textContent = firstName;
    if (profile) profile.setAttribute('aria-label', `${firstName}’s profile`);

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

    const link = $('.app-sidebar-account a[href="login.html"]');
    if (user && link) {
      link.title = 'Sign out';
      const label = $('span', link);
      const icon = $('i', link);
      if (label) label.textContent = 'Sign out';
      if (icon) icon.className = 'fa-solid fa-right-from-bracket';
      link.addEventListener('click', () => {
        try {
          sessionStorage.removeItem('codeprep:session');
          localStorage.removeItem('codeprep:session');
        } catch (e) { /* ignore */ }
      });
    }
  }


  /* =========================================================
     8. Notifications
     ========================================================= */

  function initNotifications() {
    const bell = $('.notification-btn, .app-page-bell');
    if (!bell) return;

    // Check if user has completed a recent quiz
    let lastResult = null;
    try {
      lastResult = JSON.parse(localStorage.getItem('codeprep:lastResult'));
    } catch (e) { lastResult = null; }

    // Read dismissed/read state
    const READ_KEY = 'codeprep:mainNotificationsRead';
    let readIds = [];
    try {
      readIds = JSON.parse(localStorage.getItem(READ_KEY)) || [];
      if (!Array.isArray(readIds)) readIds = [];
    } catch (e) { readIds = []; }

    const notifications = [
      {
        id: 'notif-practice',
        icon: 'fa-solid fa-code',
        iconColor: 'notification-icon-blue',
        title: 'New practice available',
        desc: 'Generate a focused session in C, Python, JavaScript, or C++.',
        time: '5m ago',
        url: 'quiz-setup.html'
      },
      {
        id: 'notif-ai',
        icon: 'fa-solid fa-sparkles',
        iconColor: 'notification-icon-purple',
        title: 'AI learning recommendations',
        desc: 'Review personalized topic suggestions to improve your scores.',
        time: '2h ago',
        url: 'dashboard.html'
      },
      {
        id: 'notif-streak',
        icon: 'fa-solid fa-fire',
        iconColor: 'notification-icon-orange',
        title: 'Keep your streak alive',
        desc: 'Complete another quiz today to maintain your coding streak.',
        time: 'Yesterday',
        url: 'quiz-setup.html'
      }
    ];

    if (lastResult && (lastResult.language || lastResult.languageLabel)) {
      const questionsCount = Number(lastResult.questions?.length || lastResult.total || 10);
      const correctCount = Number(lastResult.correct || 0);
      const scorePct = questionsCount ? Math.round((correctCount / questionsCount) * 100) : 0;
      notifications.unshift({
        id: `notif-result-${lastResult.id || 'latest'}`,
        icon: 'fa-solid fa-trophy',
        iconColor: 'notification-icon-green',
        title: 'Latest Quiz Result Ready',
        desc: `You scored ${scorePct}% in ${lastResult.languageLabel || lastResult.language}. Tap to review feedback.`,
        time: 'Just now',
        url: 'result.html'
      });
    }

    // Build notification panel
    const notificationPanel = document.createElement('div');
    notificationPanel.className = 'notification-panel';
    notificationPanel.setAttribute('role', 'region');
    notificationPanel.setAttribute('aria-label', 'Notifications dropdown');

    const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

    notificationPanel.innerHTML = `
      <div class="notification-header">
        <div>
          <h3>Notifications</h3>
          <span class="notification-count">${unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}</span>
        </div>
        <button class="mark-all-read" type="button">Mark all as read</button>
      </div>
      <div class="notification-list" role="list">
        ${notifications.map(n => {
          const isUnread = !readIds.includes(n.id);
          return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}" data-url="${n.url}" role="listitem" tabindex="0">
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
          View quiz activity
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    `;

    // Position panel relative to parent action container
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

    // Mark individual notification as read on click / enter
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

    // Mark all as read button
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

    // Close when clicking outside
    document.addEventListener('click', () => {
      if (isOpen()) {
        setOpen(false);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        bell.focus();
      }
    });
  }


  /* =========================================================
     Start everything
     ========================================================= */

  initSidebar();
  initSmoothScroll();
  initStatCounters();
  initReveal();
  initLanguageCards();
  initResultPreview();
  initAccountUI();
  initNotifications();

})();