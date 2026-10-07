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
    const menuToggle = $('.main-menu-toggle');
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
      }
    };

    const isOpen = () =>
      menuToggle.getAttribute('aria-expanded') === 'true';


    // Open / close sidebar
    menuToggle.addEventListener('click', () => {
      setSidebarOpen(!isOpen());
    });


    // Close button
    if (drawerClose) {
      drawerClose.addEventListener('click', () => {
        setSidebarOpen(false);
        menuToggle.focus();
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


    // Escape closes sidebar
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setSidebarOpen(false);
        menuToggle.focus();
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
    const header = $('.site-header');

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
     Start everything
     ========================================================= */

  initSidebar();
  initSmoothScroll();
  initStatCounters();
  initReveal();
  initLanguageCards();
  initResultPreview();

})();