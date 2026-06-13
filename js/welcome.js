// ─── SplashScreen: Text-based "Tracy's Bible" splash ─────────────────────────

class SplashScreen {
  constructor() {
    this.SPLASH_SHOWN_KEY = 'tb_splash_shown';
  }

  shouldShow() {
    // Show splash once per session
    const shown = sessionStorage.getItem(this.SPLASH_SHOWN_KEY);
    return !shown;
  }

  show(callback) {
    if (!this.shouldShow()) {
      if (callback) callback();
      return;
    }

    const splash = document.createElement('div');
    splash.id = 'splash-screen';
    splash.style.cssText = `
      position: fixed;
      inset: 0;
      background: linear-gradient(160deg, #380a38 0%, #1a0a1a 100%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 1;
      transition: opacity 0.5s ease;
    `;

    splash.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:24px;animation:fadeIn 0.8s ease;">✝</div>
        <h1 style="font-size:42px;font-weight:700;color:#fff0f6;margin-bottom:12px;letter-spacing:-1px;animation:fadeIn 1s ease 0.3s both;">Tracy's Bible</h1>
        <p style="font-size:16px;color:#d497b8;font-style:italic;animation:fadeIn 1s ease 0.5s both;">A gift of faith, love & grace</p>
      </div>
      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(splash);
    sessionStorage.setItem(this.SPLASH_SHOWN_KEY, 'true');

    // Auto-dismiss after 2.5 seconds
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.remove();
        if (callback) callback();
      }, 500);
    }, 2500);
  }
}

// ─── WelcomeScreen: Personalized welcome with session management ─────────────

class WelcomeScreen {
  constructor() {
    this.STORAGE_USER_NAME = 'tb_welcome_name';
    this.STORAGE_ENABLED = 'tb_welcome_enabled';
    this.SESSION_KEY = 'tb_welcome_shown';
    this.userName = this.loadUserName();
    this.enabled = this.loadEnabledState();
    
    this.inspirationalVerses = [
      { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble." },
      { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
      { ref: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
      { ref: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles." },
      { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding." },
      { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
      { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him." },
      { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." }
    ];
  }

  // Load user name from localStorage
  loadUserName() {
    const name = localStorage.getItem(this.STORAGE_USER_NAME);
    return name || 'Grace'; // Default name
  }

  // Load enabled state from localStorage
  loadEnabledState() {
    const enabled = localStorage.getItem(this.STORAGE_ENABLED);
    if (enabled === null) return true; // Default enabled
    return enabled === 'true';
  }

  // Check if welcome screen should be shown
  shouldShow() {
    if (!this.enabled) return false;
    const shown = sessionStorage.getItem(this.SESSION_KEY);
    return !shown;
  }

  // Show welcome screen with animation
  show() {
    if (!this.shouldShow()) return;

    const verse = this.getInspirationalVerse();
    
    const overlay = document.createElement('div');
    overlay.id = 'welcome-screen';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: linear-gradient(160deg, #380a38 0%, #1a0a1a 100%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; max-width: 400px;">
        <div style="font-size: 64px; color: #f5c842; margin-bottom: 20px; text-shadow: 0 0 30px rgba(245,200,66,0.4);">✝</div>
        <h1 style="font-size: 32px; font-weight: 700; color: #fff0f6; margin-bottom: 8px; letter-spacing: -0.5px;">Welcome ${this.escapeHtml(this.userName)}</h1>
        <p style="font-size: 15px; color: #d497b8; font-style: italic; margin-bottom: 40px;">May God's Word illuminate your path today</p>
        
        <div style="background: rgba(42, 14, 42, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 0.5px solid rgba(194, 24, 91, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
          <p style="font-size: 15px; line-height: 1.7; color: #fff0f6; font-style: italic; margin-bottom: 12px;">"${verse.text}"</p>
          <p style="font-size: 13px; color: #f5c842; font-weight: 600;">— ${verse.ref}</p>
        </div>
        
        <button id="welcome-continue" style="background: #c2185b; color: white; border: none; border-radius: 12px; padding: 14px 32px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          Continue
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);

    // Manual dismiss on button click ONLY (no auto-dismiss)
    const continueBtn = document.getElementById('welcome-continue');
    continueBtn.addEventListener('click', () => {
      this.dismiss();
    });

    // Prevent scroll on body
    document.body.style.overflow = 'hidden';

    // Mark as shown in session
    sessionStorage.setItem(this.SESSION_KEY, 'true');
  }

  // Dismiss welcome screen with fade out
  dismiss() {
    const overlay = document.getElementById('welcome-screen');
    if (!overlay) return;

    overlay.style.opacity = '0';
    
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
    }, 400);
  }

  // Get random inspirational verse
  getInspirationalVerse() {
    const index = Math.floor(Math.random() * this.inspirationalVerses.length);
    return this.inspirationalVerses[index];
  }

  // Set user name with validation
  setUserName(name) {
    const trimmed = (name || '').trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      return false; // Invalid length
    }
    this.userName = trimmed;
    localStorage.setItem(this.STORAGE_USER_NAME, trimmed);
    return true;
  }

  // Get current user name
  getUserName() {
    return this.userName;
  }

  // Set enabled state
  setEnabled(enabled) {
    this.enabled = !!enabled;
    localStorage.setItem(this.STORAGE_ENABLED, this.enabled.toString());
  }

  // Get enabled state
  isEnabled() {
    return this.enabled;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
