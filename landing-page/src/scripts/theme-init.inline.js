/**
 * Synchronous, blocking inline script to prevent Flash of Incorrect Theme (FOIT).
 * Evaluates persisted preference from localStorage or dynamic system preference from matchMedia,
 * immediately applying .dark or .light class and style/data-theme attributes to document.documentElement.
 */
(function () {
  var THEME_KEY = '9drive_theme';

  function getSystemTheme() {
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (e) {
      // media query check failed or not supported
    }
    return 'dark';
  }

  function getStoredTheme() {
    try {
      var storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (storage) {
        var stored = storage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
          return stored;
        }
      }
    } catch (e) {
      // Accessing localStorage failed (SecurityError, private browsing, etc.)
    }
    return null;
  }

  function resolveTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function applyTheme(theme) {
    try {
      var root = document.documentElement;
      if (!root) return;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    } catch (e) {
      // Ignore DOM manipulation errors
    }
  }

  function initTheme() {
    var theme = resolveTheme();
    applyTheme(theme);
    return theme;
  }

  // Expose on window for runtime consumers and testing
  if (typeof window !== 'undefined') {
    window.__9drive_theme = {
      resolveTheme: resolveTheme,
      applyTheme: applyTheme,
      initTheme: initTheme,
      getStoredTheme: getStoredTheme,
      getSystemTheme: getSystemTheme,
      THEME_KEY: THEME_KEY,
    };
  }

  if (typeof document !== 'undefined') {
    initTheme();
  }
})();
