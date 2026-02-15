/**
 * Theme composable for managing light/dark mode
 * Supports system preference detection, manual toggle, and localStorage persistence
 */

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-mode';

// Global state (shared across all components)
const mode = ref<ThemeMode>('system');
const resolvedMode = ref<'light' | 'dark'>('light');

export function useTheme() {
  const isDark = computed(() => resolvedMode.value === 'dark');

  /**
   * Get system color scheme preference
   */
  function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Apply theme to DOM
   */
  function applyTheme(theme: 'light' | 'dark') {
    if (typeof document === 'undefined') return;
    
    const html = document.documentElement;
    
    // Add transition class for smooth theme change
    html.classList.add('theme-transition');
    
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
      html.classList.remove('theme-transition');
    }, 300);
    
    resolvedMode.value = theme;
  }

  /**
   * Resolve the actual theme based on mode
   */
  function resolveTheme(themeMode: ThemeMode): 'light' | 'dark' {
    if (themeMode === 'system') {
      return getSystemPreference();
    }
    return themeMode;
  }

  /**
   * Set theme mode and persist to localStorage
   */
  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    
    // Persist to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
    
    // Apply the resolved theme
    const resolved = resolveTheme(newMode);
    applyTheme(resolved);
  }

  /**
   * Toggle between light and dark mode
   * If currently in system mode, switch to the opposite of current resolved mode
   */
  function toggle() {
    if (mode.value === 'system') {
      // Switch to explicit mode opposite of current
      setMode(resolvedMode.value === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setMode(mode.value === 'dark' ? 'light' : 'dark');
    }
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  function init() {
    if (typeof window === 'undefined') return;
    
    // Read from localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      mode.value = stored;
    } else {
      mode.value = 'system';
    }
    
    // Apply initial theme
    const resolved = resolveTheme(mode.value);
    applyTheme(resolved);
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (mode.value === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  return {
    mode: readonly(mode),
    resolvedMode: readonly(resolvedMode),
    isDark,
    setMode,
    toggle,
    init,
  };
}
