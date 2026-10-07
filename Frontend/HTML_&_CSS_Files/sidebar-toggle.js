const sidebar = document.querySelector('.app-sidebar');

if (sidebar) {
  const storageKey = 'codeprep-sidebar-collapsed';
  let isCollapsed = false;

  try {
    isCollapsed = localStorage.getItem(storageKey) === 'true';
  } catch {
    isCollapsed = false;
  }

  sidebar.id = 'app-sidebar';

  let toggle = document.querySelector('.app-sidebar-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'app-sidebar-toggle';
    toggle.type = 'button';
  }
  toggle.setAttribute('aria-controls', sidebar.id);

  let icon = toggle.querySelector('i');
  if (!icon) {
    icon = document.createElement('i');
    icon.className = 'fa-solid fa-bars';
    icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon);
  }

  const updateToggle = () => {
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.setAttribute('aria-label', isCollapsed ? 'Show sidebar' : 'Hide sidebar');
    toggle.title = isCollapsed ? 'Show sidebar' : 'Hide sidebar';
  };

  toggle.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    updateToggle();

    try {
      localStorage.setItem(storageKey, String(isCollapsed));
    } catch {
      // The control still works when browser storage is unavailable.
    }
  });

  if (!toggle.isConnected) {
    sidebar.before(toggle);
  }
  updateToggle();
}