// ─── TypographySystem: User-adjustable font sizes with persistence ───────────

class TypographySystem {
  constructor() {
    this.STORAGE_KEY = 'tb_fontsize';
    this.MIN_SIZE = 15;
    this.MAX_SIZE = 26;
    this.DEFAULT_SIZE = 18;
    this.fontSize = this.loadFontSize();
  }

  // Load font size from localStorage
  loadFontSize() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= this.MIN_SIZE && parsed <= this.MAX_SIZE) {
        return parsed;
      }
    }
    return this.DEFAULT_SIZE;
  }

  // Set font size with clamping
  setFontSize(size) {
    const clamped = Math.min(this.MAX_SIZE, Math.max(this.MIN_SIZE, size));
    this.fontSize = clamped;
    localStorage.setItem(this.STORAGE_KEY, clamped.toString());
    this.applyFontSize();
    return clamped;
  }

  // Increase font size
  increase() {
    return this.setFontSize(this.fontSize + 1);
  }

  // Decrease font size
  decrease() {
    return this.setFontSize(this.fontSize - 1);
  }

  // Get current font size
  getFontSize() {
    return this.fontSize;
  }

  // Apply font size to CSS custom property
  applyFontSize() {
    document.documentElement.style.setProperty('--user-font-size', `${this.fontSize}px`);
  }

  // Initialize typography system
  initialize() {
    this.applyFontSize();
  }
}
