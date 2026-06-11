// ─── ThemeManager: Light/Dark mode with system preference detection ─────────

class ThemeManager {
  constructor() {
    this.currentTheme = 'dark'; // default
    this.STORAGE_KEY = 'tb_theme';
    
    this.themes = {
      light: {
        // Backgrounds
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8f9fa',
        '--bg-tertiary': '#f1f3f5',
        '--bg-elevated': '#ffffff',
        
        // Text
        '--text-primary': '#1a1a1a',
        '--text-secondary': '#4a4a4a',
        '--text-tertiary': '#6a6a6a',
        
        // Accents (maintained from dark theme)
        '--accent-pink': '#c2185b',
        '--accent-pink-dark': '#ad1457',
        '--accent-pink-light': '#f8bbd0',
        '--accent-gold': '#f5c842',
        '--accent-gold-soft': '#ffe082',
        
        // Borders & overlays
        '--border-color': 'rgba(0, 0, 0, 0.1)',
        '--glass-bg': 'rgba(255, 255, 255, 0.7)',
        '--glass-border': 'rgba(0, 0, 0, 0.08)',
        '--shadow-color': 'rgba(0, 0, 0, 0.1)',
        
        // Status bar
        '--theme-color': '#c2185b'
      },
      dark: {
        // Backgrounds (darker for cyber glass)
        '--bg-primary': '#0a0a15',
        '--bg-secondary': '#151520',
        '--bg-tertiary': '#1a1a28',
        '--bg-elevated': '#1f1f30',
        
        // Text (existing)
        '--text-primary': '#fff0f6',
        '--text-secondary': '#d497b8',
        '--text-tertiary': '#9a6080',
        
        // Accents
        '--accent-pink': '#c2185b',
        '--accent-pink-dark': '#880e4f',
        '--accent-pink-light': '#e91e8c',
        '--accent-gold': '#f5c842',
        '--accent-gold-soft': '#ffe082',
        
        // Borders & overlays (pink theme)
        '--border-color': 'rgba(194, 24, 91, 0.2)',
        '--glass-bg': 'rgba(30, 10, 30, 0.4)',
        '--glass-border': 'rgba(194, 24, 91, 0.35)',
        '--shadow-color': 'rgba(0, 0, 0, 0.6)',
        
        // Status bar
        '--theme-color': '#0a0a15'
      }
    };
  }

  // Initialize theme on app load
  initialize() {
    this.currentTheme = this.loadTheme();
    this.applyTheme(this.currentTheme);
    this.setupSystemPreferenceListener();
  }

  // Load theme from localStorage or detect system preference
  loadTheme() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && (saved === 'light' || saved === 'dark')) {
      return saved;
    }

    // Detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark'; // default
  }

  // Apply theme by updating CSS custom properties
  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;

    const root = document.documentElement;
    
    // Update CSS custom properties
    for (const [property, value] of Object.entries(theme)) {
      root.style.setProperty(property, value);
    }

    // Update body data attribute for CSS hooks
    document.body.setAttribute('data-theme', themeName);
    
    // Update meta theme-color for iOS status bar
    this.updateMetaThemeColor(theme['--theme-color']);
    
    this.currentTheme = themeName;
  }

  // Update meta theme-color tag for iOS
  updateMetaThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  // Toggle between light and dark themes
  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    localStorage.setItem(this.STORAGE_KEY, newTheme);
    return newTheme;
  }

  // Get current theme name
  getTheme() {
    return this.currentTheme;
  }

  // Set specific theme
  setTheme(themeName) {
    if (themeName === 'light' || themeName === 'dark') {
      this.applyTheme(themeName);
      localStorage.setItem(this.STORAGE_KEY, themeName);
    }
  }

  // Listen for system preference changes
  setupSystemPreferenceListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      
      // Only apply system preference if user hasn't set a preference
      mediaQuery.addEventListener('change', (e) => {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) {
          const newTheme = e.matches ? 'light' : 'dark';
          this.applyTheme(newTheme);
        }
      });
    }
  }
}
