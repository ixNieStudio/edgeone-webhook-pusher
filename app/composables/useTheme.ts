import { computed, readonly, ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';
const LIGHT_THEME_COLOR = '#f6f8fb';
const DARK_THEME_COLOR = '#020617';

const mode = ref<ThemeMode>('light');
const hasExplicitPreference = ref(false);

let initialized = false;
let mediaQuery: MediaQueryList | null = null;
let mediaQueryHandler: ((event: MediaQueryListEvent) => void) | null = null;

function readStoredMode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistMode(theme: ThemeMode) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures and keep the in-memory theme responsive.
  }
}

function getSystemPreference(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeColor(theme: ThemeMode) {
  if (typeof document === 'undefined') return;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

function applyTheme(theme: ThemeMode, withTransition = true) {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  if (withTransition) {
    html.classList.add('theme-transition');
  }
  html.classList.toggle('dark', theme === 'dark');
  html.style.colorScheme = theme;

  if (withTransition) {
    window.setTimeout(() => {
      html.classList.remove('theme-transition');
    }, 180);
  }

  updateThemeColor(theme);
  mode.value = theme;
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = readStoredMode();

  if (stored === 'light' || stored === 'dark') {
    hasExplicitPreference.value = true;
    return stored;
  }

  if (stored === 'system') {
    const resolved = getSystemPreference();
    persistMode(resolved);
    hasExplicitPreference.value = true;
    return resolved;
  }

  hasExplicitPreference.value = false;
  return getSystemPreference();
}

function setMode(nextMode: ThemeMode) {
  mode.value = nextMode;
  hasExplicitPreference.value = true;
  persistMode(nextMode);
  applyTheme(nextMode);
}

function toggle() {
  setMode(mode.value === 'dark' ? 'light' : 'dark');
}

function init() {
  if (initialized || typeof window === 'undefined') return;

  initialized = true;
  applyTheme(resolveInitialTheme(), false);

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQueryHandler = (event) => {
    if (!hasExplicitPreference.value) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  };
  mediaQuery.addEventListener('change', mediaQueryHandler);
}

export function useTheme() {
  const isDark = computed(() => mode.value === 'dark');

  return {
    mode: readonly(mode),
    isDark,
    setMode,
    toggle,
    init,
  };
}
