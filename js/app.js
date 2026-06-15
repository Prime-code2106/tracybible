// ─── State ───────────────────────────────────────────────────────────────────

// Check localStorage availability
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Safe localStorage getter
function getStorageItem(key, defaultValue = '[]') {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage not available');
    return defaultValue;
  }
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return defaultValue;
  }
}

// Global system instances
let chapterCache;
let themeManager;
let splashScreen;
let welcomeScreen;
let typographySystem;

const STATE = {
  version: 'kjv',
  book: null,
  chapter: null,
  view: 'home',
  bookmarks: JSON.parse(getStorageItem('tb_bookmarks', '[]')),
  journal: JSON.parse(getStorageItem('tb_journal', '[]')),
  highlight: JSON.parse(getStorageItem('tb_highlight', '{}')),
  searchQuery: '',
  searchResults: [],
  verseOfDay: null,
  bookmarkSort: localStorage.getItem('tb_bookmark_sort') || 'newest',
  bookmarkVersionFilter: localStorage.getItem('tb_bookmark_version_filter') || 'all',
  bookmarkSearchQuery: '',
  lastDeletedBookmark: null,
  deleteUndoTimeout: null,
};

const VERSIONS = {
  kjv:  { label: 'KJV',  name: 'King James Version',    api: 'kjv' },
  web:  { label: 'WEB',  name: 'World English Bible',   api: 'web' },
  asv:  { label: 'ASV',  name: 'American Standard',     api: 'asv' },
  bbe:  { label: 'BBE',  name: 'Bible in Basic English', api: 'bbe' },
};

const OT_BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"];
const NT_BOOKS = ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const CHAPTER_COUNTS = {
  "Genesis":50,"Exodus":40,"Leviticus":27,"Numbers":36,"Deuteronomy":34,"Joshua":24,"Judges":21,"Ruth":4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,"1 Chronicles":29,"2 Chronicles":36,"Ezra":10,"Nehemiah":13,"Esther":10,"Job":42,"Psalms":150,"Proverbs":31,"Ecclesiastes":12,"Song of Solomon":8,"Isaiah":66,"Jeremiah":52,"Lamentations":5,"Ezekiel":48,"Daniel":12,"Hosea":14,"Joel":3,"Amos":9,"Obadiah":1,"Jonah":4,"Micah":7,"Nahum":3,"Habakkuk":3,"Zephaniah":3,"Haggai":2,"Zechariah":14,"Malachi":4,"Matthew":28,"Mark":16,"Luke":24,"John":21,"Acts":28,"Romans":16,"1 Corinthians":16,"2 Corinthians":13,"Galatians":6,"Ephesians":6,"Philippians":4,"Colossians":4,"1 Thessalonians":5,"2 Thessalonians":3,"1 Timothy":6,"2 Timothy":4,"Titus":3,"Philemon":1,"Hebrews":13,"James":5,"1 Peter":5,"2 Peter":3,"1 John":5,"2 John":1,"3 John":1,"Jude":1,"Revelation":22
};

const DAILY_VERSES = [
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
  { ref: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want." },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him." },
  { ref: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles." },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble." },
  { ref: "Matthew 6:33", text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { ref: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
];

// ─── API ──────────────────────────────────────────────────────────────────────
// Raw API fetch function (used by cache) with timeout
async function fetchChapterFromAPI(book, chapter, version) {
  const url = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${version}`;
  
  showLoader(true);
  
  try {
    // Add 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    showLoader(false);
    
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    return data.verses || [];
  } catch (e) {
    showLoader(false);
    if (e.name === 'AbortError') {
      console.error('Chapter load timeout (>3s)');
    }
    throw e;
  }
}

// Main fetch function with caching
async function fetchChapter(book, chapter, version) {
  try {
    const verses = await chapterCache.getChapter(book, chapter, version, fetchChapterFromAPI);
    
    // Prefetch adjacent chapters after successful load
    if (verses && verses.length > 0) {
      const maxChapters = CHAPTER_COUNTS[book] || 150;
      chapterCache.prefetchAdjacent(book, chapter, version, maxChapters, fetchChapterFromAPI);
    }
    
    return verses;
  } catch (e) {
    console.error('fetchChapter error:', e);
    return null;
  }
}

async function searchBible(query, version) {
  const url = `https://bible-api.com/${encodeURIComponent(query)}?translation=${version}`;
  try {
    showLoader(true);
    
    // Add 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    showLoader(false);
    
    if (data.verses) return data.verses;
    return [];
  } catch (e) {
    showLoader(false);
    if (e.name === 'AbortError') {
      console.error('Search timeout (>3s)');
    }
    return [];
  }
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const app = () => $('app');

function showLoader(on) {
  const l = $('loader');
  if (l) l.style.display = on ? 'flex' : 'none';
}

function setView(v, extra = {}) {
  // Clear countdown interval when leaving home
  if (STATE.view === 'home' && v !== 'home' && countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  STATE.view = v;
  Object.assign(STATE, extra);
  render();
  window.scrollTo(0, 0);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const views = { home: renderHome, books: renderBooks, chapters: renderChapters, reader: renderReader, bookmarks: renderBookmarks, journal: renderJournal, search: renderSearch, settings: renderSettings };
  if (views[STATE.view]) views[STATE.view]();
  renderNav();
}

function renderNav() {
  const n = $('nav');
  if (!n) return;
  const tabs = [
    { id: 'home', icon: 'ti-home', label: 'Home' },
    { id: 'books', icon: 'ti-book', label: 'Bible' },
    { id: 'search', icon: 'ti-search', label: 'Search' },
    { id: 'bookmarks', icon: 'ti-bookmark', label: 'Saved' },
    { id: 'journal', icon: 'ti-pencil', label: 'Journal' },
  ];
  n.innerHTML = tabs.map(t => `
    <button class="nav-btn ${STATE.view === t.id || (t.id === 'books' && ['books','chapters','reader'].includes(STATE.view)) ? 'active' : ''}"
      onclick="setView('${t.id}')">
      <i class="ti ${t.icon}"></i>
      <span>${t.label}</span>
    </button>
  `).join('');
}

function renderHome() {
  const now = new Date();
  const dayIdx = now.getDate() % DAILY_VERSES.length;
  const vod = DAILY_VERSES[dayIdx];
  const isHerBday = now.getMonth() === 5 && now.getDate() === 9;
  const currentTheme = themeManager.getTheme();
  const themeEmoji = currentTheme === 'light' ? '🌙' : '☀️';
  
  $('main').innerHTML = `
    <div class="home-wrap">
      ${isHerBday ? `<div class="bday-banner"><i class="ti ti-gift" aria-hidden="true"></i> Happy Birthday, Tracy! 🎂 God bless you abundantly.</div>` : ''}
      <div class="home-hero">
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle ${currentTheme === 'light' ? 'dark' : 'light'} mode" style="position:absolute;top:20px;right:20px;background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:0.5px solid var(--glass-border);width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent-gold);font-size:22px;cursor:pointer;">
          ${themeEmoji}
        </button>
        <div class="hero-cross">✝</div>
        <h1 class="hero-name">Tracy's Bible</h1>
        <p class="hero-sub">A gift of faith, love & grace</p>
      </div>
      <div class="vod-card glass-card" style="position:relative;">
        <p class="vod-label"><i class="ti ti-cake" aria-hidden="true"></i> Tracy's Birthday Countdown</p>
        <div style="text-align:center;margin-bottom:16px;">
          <p style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">Current Time</p>
          <p id="current-time" style="font-size:18px;font-weight:600;color:var(--accent-gold);"></p>
        </div>
        <div style="text-align:center;margin-bottom:12px;">
          <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">Time until June 9, 2027</p>
          <div id="countdown" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
            <div style="background:var(--bg-secondary);border-radius:12px;padding:12px;">
              <p id="days" style="font-size:24px;font-weight:700;color:var(--accent-pink);margin-bottom:4px;">-</p>
              <p style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;">Days</p>
            </div>
            <div style="background:var(--bg-secondary);border-radius:12px;padding:12px;">
              <p id="hours" style="font-size:24px;font-weight:700;color:var(--accent-pink);margin-bottom:4px;">-</p>
              <p style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;">Hours</p>
            </div>
            <div style="background:var(--bg-secondary);border-radius:12px;padding:12px;">
              <p id="minutes" style="font-size:24px;font-weight:700;color:var(--accent-pink);margin-bottom:4px;">-</p>
              <p style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;">Mins</p>
            </div>
            <div style="background:var(--bg-secondary);border-radius:12px;padding:12px;">
              <p id="seconds" style="font-size:24px;font-weight:700;color:var(--accent-pink);margin-bottom:4px;">-</p>
              <p style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;">Secs</p>
            </div>
          </div>
        </div>
      </div>
      <div class="vod-card glass-card" style="position:relative;margin-top:16px;">
        <p class="vod-label"><i class="ti ti-sun" aria-hidden="true"></i> Verse of the day</p>
        <p class="vod-text">"${vod.text}"</p>
        <p class="vod-ref">— ${vod.ref}</p>
        <button class="vod-read btn-ghost" onclick="openVerseRef('${vod.ref}')">Read in context <i class="ti ti-arrow-right"></i></button>
      </div>
      <div class="quick-grid">
        <button class="quick-card glass-card" onclick="setView('books')" style="position:relative;">
          <i class="ti ti-book-2" aria-hidden="true"></i>
          <span>Read Bible</span>
        </button>
        <button class="quick-card glass-card" onclick="setView('bookmarks')" style="position:relative;">
          <i class="ti ti-bookmark" aria-hidden="true"></i>
          <span>Saved Verses</span>
          ${STATE.bookmarks.length ? `<span class="badge">${STATE.bookmarks.length}</span>` : ''}
        </button>
        <button class="quick-card glass-card" onclick="setView('journal')" style="position:relative;">
          <i class="ti ti-pencil" aria-hidden="true"></i>
          <span>My Journal</span>
          ${STATE.journal.length ? `<span class="badge">${STATE.journal.length}</span>` : ''}
        </button>
        <button class="quick-card glass-card" onclick="setView('search')" style="position:relative;">
          <i class="ti ti-search" aria-hidden="true"></i>
          <span>Search</span>
        </button>
      </div>
      <div class="version-row">
        <span class="version-label">Version:</span>
        ${Object.entries(VERSIONS).map(([k,v]) => `
          <button class="ver-pill ${STATE.version === k ? 'active' : ''}" onclick="switchVersion('${k}')">${v.label}</button>
        `).join('')}
      </div>
      <div class="home-date">
        <i class="ti ti-calendar" aria-hidden="true"></i>
        ${now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
      </div>
    </div>
  `;
  
  // Start countdown timer
  startBirthdayCountdown();
}

function renderBooks() {
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <h2>Books of the Bible</h2>
        <div class="version-row">
          ${Object.entries(VERSIONS).map(([k,v]) => `
            <button class="ver-pill ${STATE.version === k ? 'active' : ''}" onclick="switchVersion('${k}')">${v.label}</button>
          `).join('')}
        </div>
      </div>
      <div class="testament-section">
        <p class="testament-label">Old Testament</p>
        <div class="book-grid">
          ${OT_BOOKS.map(b => `<button class="book-btn" onclick="setView('chapters',{book:'${b}'})">${b}</button>`).join('')}
        </div>
      </div>
      <div class="testament-section">
        <p class="testament-label">New Testament</p>
        <div class="book-grid">
          ${NT_BOOKS.map(b => `<button class="book-btn nt" onclick="setView('chapters',{book:'${b}'})">${b}</button>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderChapters() {
  const count = CHAPTER_COUNTS[STATE.book] || 50;
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <button class="back-btn" onclick="setView('books')"><i class="ti ti-arrow-left"></i> Books</button>
        <h2>${STATE.book}</h2>
      </div>
      <div class="chapter-grid">
        ${Array.from({length:count},(_,i)=>i+1).map(c=>`
          <button class="chapter-btn" onclick="openChapter('${STATE.book}',${c})">${c}</button>
        `).join('')}
      </div>
    </div>
  `;
}

async function openChapter(book, chapter) {
  STATE.book = book;
  STATE.chapter = chapter;
  STATE.view = 'reader';
  $('main').innerHTML = `<div class="page-wrap"><div class="loader-center"><div class="spinner"></div><p>Loading ${book} ${chapter}...</p></div></div>`;
  renderNav();
  const verses = await fetchChapter(book, chapter, STATE.version);
  if (!verses) {
    $('main').innerHTML = `<div class="page-wrap"><p class="err-msg">Couldn't load chapter. Check your connection.</p><button class="btn-ghost" onclick="openChapter('${book}',${chapter})">Try again</button></div>`;
    return;
  }
  renderReader(verses);
}

function renderReader(verses) {
  const totalChaps = CHAPTER_COUNTS[STATE.book] || 1;
  const prevCh = STATE.chapter > 1 ? STATE.chapter - 1 : null;
  const nextCh = STATE.chapter < totalChaps ? STATE.chapter + 1 : null;

  // Create Set of bookmark keys for O(1) lookup performance
  const bookmarkKeys = new Set(STATE.bookmarks.map(b => b.key));

  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="reader-header">
        <button class="back-btn" onclick="setView('chapters')"><i class="ti ti-arrow-left"></i></button>
        <div class="reader-title">
          <h2>${STATE.book}</h2>
          <span>Chapter ${STATE.chapter}</span>
        </div>
        <button class="icon-btn" onclick="setView('settings')" title="Settings"><i class="ti ti-settings"></i></button>
      </div>
      <div class="chapter-nav">
        ${prevCh ? `<button class="nav-chapter" onclick="openChapter('${STATE.book}',${prevCh})"><i class="ti ti-chevron-left"></i> Ch ${prevCh}</button>` : '<span></span>'}
        ${nextCh ? `<button class="nav-chapter" onclick="openChapter('${STATE.book}',${nextCh})">Ch ${nextCh} <i class="ti ti-chevron-right"></i></button>` : '<span></span>'}
      </div>
      <div class="verses-wrap" style="font-size:${typographySystem.getFontSize()}px">
        ${(verses||[]).map(v => {
          const key = `${STATE.book}-${STATE.chapter}-${v.verse}`;
          const hl = STATE.highlight[key] || '';
          const bm = bookmarkKeys.has(key);
          return `
            <div class="verse ${hl ? 'hl-'+hl : ''}" id="v${v.verse}" data-book="${STATE.book}" data-chapter="${STATE.chapter}" data-verse="${v.verse}" data-text="${v.text.replace(/"/g, '&quot;')}">
              <span class="verse-num">${v.verse}</span>
              <span class="verse-text">${v.text.trim()}</span>
              ${bm ? '<i class="ti ti-bookmark-filled verse-bm-icon" aria-hidden="true"></i>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="chapter-nav bottom">
        ${prevCh ? `<button class="nav-chapter" onclick="openChapter('${STATE.book}',${prevCh})"><i class="ti ti-chevron-left"></i> Previous</button>` : '<span></span>'}
        ${nextCh ? `<button class="nav-chapter" onclick="openChapter('${STATE.book}',${nextCh})">Next <i class="ti ti-chevron-right"></i></button>` : '<span></span>'}
      </div>
    </div>
  `;

  // Add click listeners to verses
  document.querySelectorAll('.verse').forEach(verseEl => {
    verseEl.addEventListener('click', (e) => {
      e.stopPropagation();

      const book = verseEl.dataset.book;
      const chapter = parseInt(verseEl.dataset.chapter);
      const verse = parseInt(verseEl.dataset.verse);
      const text = verseEl.dataset.text;

      console.log('Verse clicked:', {book, chapter, verse, text: text.substring(0, 50)});
      verseMenu(e, book, chapter, verse, text);
    });
  });
}

function verseMenu(e, book, chapter, verse, text) {
  console.log('verseMenu called:', {book, chapter, verse});

  // Remove any existing menu and backdrop
  const existing = $('verse-menu');
  if (existing) {
    console.log('Removing existing menu');
    existing.remove();
  }
  const existingBackdrop = $('verse-menu-backdrop');
  if (existingBackdrop) {
    existingBackdrop.remove();
  }
  
  const key = `${book}-${chapter}-${verse}`;
  const isBm = STATE.bookmarks.some(b=>b.key===key);
  
  console.log('Creating menu for verse:', key, 'isBookmarked:', isBm);
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'verse-menu-backdrop';
  backdrop.className = 'verse-menu-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
  document.body.appendChild(backdrop);
  
  // Create menu
  const menu = document.createElement('div');
  menu.id = 'verse-menu';
  menu.className = 'verse-ctx-menu';
  menu.innerHTML = `
    <div class="ctx-ref">${book} ${chapter}:${verse}</div>
    <button data-action="bookmark">
      <i class="ti ${isBm?'ti-bookmark-off':'ti-bookmark'}"></i> ${isBm?'Remove bookmark':'Bookmark'}
    </button>
    <button data-action="highlight-pink"><span class="hl-dot pink"></span> Pink</button>
    <button data-action="highlight-yellow"><span class="hl-dot yellow"></span> Yellow</button>
    <button data-action="highlight-clear"><i class="ti ti-eraser"></i> Clear highlight</button>
    <button data-action="journal">
      <i class="ti ti-pencil"></i> Add to journal
    </button>
    <button data-action="copy">
      <i class="ti ti-copy"></i> Copy verse
    </button>
    <button class="ctx-close" data-action="close"><i class="ti ti-x"></i> Close</button>
  `;
  
  document.body.appendChild(menu);
  console.log('Menu appended to body');
  
  // Prevent menu from closing when clicking inside it
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Close menu when clicking backdrop
  backdrop.addEventListener('click', () => {
    console.log('Backdrop clicked, closing menu');
    menu.remove();
    backdrop.remove();
  });
  
  // Add event listeners to buttons
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const action = btn.dataset.action;
      console.log('Menu button clicked:', action);
      
      switch(action) {
        case 'bookmark':
          toggleBookmark(key, book, chapter, verse, text);
          break;
        case 'highlight-pink':
          highlightVerse(key, 'pink');
          break;
        case 'highlight-yellow':
          highlightVerse(key, 'yellow');
          break;
        case 'highlight-clear':
          highlightVerse(key, 'clear');
          break;
        case 'journal':
          addJournalFromVerse(`${book} ${chapter}:${verse}`, text);
          break;
        case 'copy':
          copyVerse(`${book} ${chapter}:${verse}`, text);
          break;
        case 'close':
          menu.remove();
          backdrop.remove();
          break;
      }
    });
  });
}

function toggleBookmark(key, book, chapter, verse, text) {
  try {
    const idx = STATE.bookmarks.findIndex(b=>b.key===key);
    if (idx > -1) {
      STATE.bookmarks.splice(idx,1);
      showToast('Bookmark removed');
    } else {
      STATE.bookmarks.push({key, book, chapter, verse: parseInt(verse), text, version: STATE.version, date: new Date().toISOString()});
      showToast('Verse bookmarked!');
    }
    localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));
  } catch (error) {
    console.error('Error saving bookmark:', error);
    showToast('Error saving bookmark');
  }
  const m = $('verse-menu'); if(m) m.remove();
  const b = $('verse-menu-backdrop'); if(b) b.remove();

  // Optimize: update DOM directly instead of full re-render
  if (STATE.view === 'reader') {
    const verseEl = document.getElementById(`v${verse}`);
    if (verseEl) {
      // Update bookmark icon
      const existingIcon = verseEl.querySelector('.verse-bm-icon');
      const isBookmarked = STATE.bookmarks.some(b => b.key === key);

      if (isBookmarked && !existingIcon) {
        // Add bookmark icon
        const icon = document.createElement('i');
        icon.className = 'ti ti-bookmark-filled verse-bm-icon';
        icon.setAttribute('aria-hidden', 'true');
        verseEl.appendChild(icon);
      } else if (!isBookmarked && existingIcon) {
        // Remove bookmark icon
        existingIcon.remove();
      }
    } else {
      // Fallback to full re-render if verse element not found
      openChapter(STATE.book, STATE.chapter);
    }
  }
}

function highlightVerse(key, color) {
  if (color === 'clear') delete STATE.highlight[key];
  else STATE.highlight[key] = color;
  localStorage.setItem('tb_highlight', JSON.stringify(STATE.highlight));
  const m = $('verse-menu'); if(m) m.remove();
  const b = $('verse-menu-backdrop'); if(b) b.remove();
  if (STATE.view === 'reader') openChapter(STATE.book, STATE.chapter);
}

function copyVerse(ref, text) {
  navigator.clipboard.writeText(`"${text.replace(/\\'/g,"'")}" — ${ref.replace(/\\'/g,"'")}`).catch(()=>{});
  const m = $('verse-menu'); if(m) m.remove();
  const b = $('verse-menu-backdrop'); if(b) b.remove();
  showToast('Verse copied!');
}

function renderBookmarks() {
  // Apply filters and sorting
  let filteredBookmarks = [...STATE.bookmarks];

  // Filter by version
  if (STATE.bookmarkVersionFilter !== 'all') {
    filteredBookmarks = filteredBookmarks.filter(b => b.version === STATE.bookmarkVersionFilter);
  }

  // Filter by search query
  if (STATE.bookmarkSearchQuery.trim()) {
    const query = STATE.bookmarkSearchQuery.toLowerCase();
    filteredBookmarks = filteredBookmarks.filter(b =>
      b.book.toLowerCase().includes(query) ||
      b.text.toLowerCase().includes(query) ||
      `${b.book} ${b.chapter}:${b.verse}`.toLowerCase().includes(query)
    );
  }

  // Sort bookmarks
  switch (STATE.bookmarkSort) {
    case 'newest':
      filteredBookmarks.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'oldest':
      filteredBookmarks.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'book':
      filteredBookmarks.sort((a, b) => {
        const aIdx = ALL_BOOKS.indexOf(a.book);
        const bIdx = ALL_BOOKS.indexOf(b.book);
        if (aIdx !== bIdx) return aIdx - bIdx;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
      });
      break;
    case 'alphabetical':
      filteredBookmarks.sort((a, b) => {
        const refA = `${a.book} ${a.chapter}:${a.verse}`;
        const refB = `${b.book} ${b.chapter}:${b.verse}`;
        return refA.localeCompare(refB);
      });
      break;
  }

  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <h2><i class="ti ti-bookmark"></i> Saved Verses</h2>
      </div>
      ${STATE.bookmarks.length === 0 ? `
        <div class="empty-state">
          <i class="ti ti-bookmark" style="font-size:48px;color:var(--accent-pink)"></i>
          <p>No saved verses yet.</p>
          <p class="muted">Tap any verse while reading to bookmark it.</p>
        </div>
      ` : `
        <div style="margin-bottom:16px;">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <input
              type="text"
              id="bookmark-search"
              placeholder="Search bookmarks..."
              value="${STATE.bookmarkSearchQuery}"
              style="flex:1;min-width:200px;font-size:14px;"
              aria-label="Search bookmarks by book name or verse text"
            />
            <button onclick="exportBookmarks()" class="btn-ghost sm" style="white-space:nowrap;" aria-label="Export all bookmarks to JSON file">
              <i class="ti ti-download" aria-hidden="true"></i> Export
            </button>
            <button onclick="importBookmarksPrompt()" class="btn-ghost sm" style="white-space:nowrap;" aria-label="Import bookmarks from JSON file">
              <i class="ti ti-upload" aria-hidden="true"></i> Import
            </button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select id="bookmark-sort" class="btn-ghost sm" style="flex:1;min-width:150px;" onchange="updateBookmarkSort(this.value)" aria-label="Sort bookmarks by">
              <option value="newest" ${STATE.bookmarkSort==='newest'?'selected':''}>Newest First</option>
              <option value="oldest" ${STATE.bookmarkSort==='oldest'?'selected':''}>Oldest First</option>
              <option value="book" ${STATE.bookmarkSort==='book'?'selected':''}>Book Order</option>
              <option value="alphabetical" ${STATE.bookmarkSort==='alphabetical'?'selected':''}>Alphabetical</option>
            </select>
            <select id="bookmark-version-filter" class="btn-ghost sm" style="flex:1;min-width:120px;" onchange="updateBookmarkVersionFilter(this.value)" aria-label="Filter bookmarks by Bible version">
              <option value="all" ${STATE.bookmarkVersionFilter==='all'?'selected':''}>All Versions</option>
              ${Object.entries(VERSIONS).map(([k,v]) =>
                `<option value="${k}" ${STATE.bookmarkVersionFilter===k?'selected':''}>${v.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        ${filteredBookmarks.length === 0 ? `
          <div class="empty-state">
            <i class="ti ti-search" style="font-size:48px;color:var(--accent-pink)"></i>
            <p>No bookmarks match your filters.</p>
          </div>
        ` : `
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
            ${filteredBookmarks.length} of ${STATE.bookmarks.length} bookmark${STATE.bookmarks.length!==1?'s':''}
          </p>
          <div class="bookmark-list">
            ${filteredBookmarks.map(b => {
              const safeBook = escQ(b.book);
              return `
                <div class="bookmark-card">
                  <div class="bm-ref">${b.book} ${b.chapter}:${b.verse} <span class="ver-tag">${b.version.toUpperCase()}</span></div>
                  <p class="bm-text">"${b.text.trim()}"</p>
                  <div class="bm-actions">
                    <button onclick="openChapter('${safeBook}',${b.chapter})" class="btn-ghost sm">Read</button>
                    <button onclick="removeBookmarkByKey('${b.key}')" class="btn-ghost sm danger">Remove</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `}
    </div>
  `;

  // Add search input listener
  const searchInput = $('bookmark-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      STATE.bookmarkSearchQuery = e.target.value;
      renderBookmarks();
    });
  }
}

function updateBookmarkSort(value) {
  STATE.bookmarkSort = value;
  try {
    localStorage.setItem('tb_bookmark_sort', value);
  } catch (e) {
    console.error('Error saving bookmark sort preference:', e);
  }
  renderBookmarks();
}

function updateBookmarkVersionFilter(value) {
  STATE.bookmarkVersionFilter = value;
  try {
    localStorage.setItem('tb_bookmark_version_filter', value);
  } catch (e) {
    console.error('Error saving version filter preference:', e);
  }
  renderBookmarks();
}

function exportBookmarks() {
  try {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      bookmarks: STATE.bookmarks
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracys-bible-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Bookmarks exported successfully!');
  } catch (error) {
    console.error('Error exporting bookmarks:', error);
    showToast('Error exporting bookmarks');
  }
}

function importBookmarksPrompt() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const bookmarks = data.bookmarks || data;

        if (!Array.isArray(bookmarks)) {
          showToast('Invalid bookmark file format');
          return;
        }

        // Merge with existing bookmarks, avoiding duplicates by key
        const existingKeys = new Set(STATE.bookmarks.map(b => b.key));
        let importedCount = 0;

        bookmarks.forEach(b => {
          if (b.key && !existingKeys.has(b.key)) {
            STATE.bookmarks.push(b);
            existingKeys.add(b.key);
            importedCount++;
          }
        });

        if (importedCount > 0) {
          localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));
          showToast(`Imported ${importedCount} bookmark${importedCount!==1?'s':''}`);
          renderBookmarks();
        } else {
          showToast('No new bookmarks to import');
        }
      } catch (error) {
        console.error('Error importing bookmarks:', error);
        showToast('Error importing bookmarks');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function removeBookmarkByKey(key) {
  try {
    const idx = STATE.bookmarks.findIndex(b => b.key === key);
    if (idx === -1) {
      showToast('Bookmark not found');
      return;
    }

    // Show confirmation dialog
    if (!confirm('Remove this bookmark?')) {
      return;
    }

    // Clear any existing undo timeout
    if (STATE.deleteUndoTimeout) {
      clearTimeout(STATE.deleteUndoTimeout);
    }

    // Store for undo
    STATE.lastDeletedBookmark = STATE.bookmarks[idx];

    // Remove bookmark
    STATE.bookmarks.splice(idx, 1);
    localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));

    // Show toast with undo option
    showToastWithUndo('Bookmark removed', () => {
      if (STATE.lastDeletedBookmark) {
        STATE.bookmarks.push(STATE.lastDeletedBookmark);
        localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));
        STATE.lastDeletedBookmark = null;
        showToast('Bookmark restored');
        renderBookmarks();
      }
    });

    // Clear undo after 5 seconds
    STATE.deleteUndoTimeout = setTimeout(() => {
      STATE.lastDeletedBookmark = null;
    }, 5000);

    renderBookmarks();
  } catch (error) {
    console.error('Error removing bookmark:', error);
    showToast('Error removing bookmark');
  }
}

function renderJournal() {
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header"><h2><i class="ti ti-pencil"></i> My Journal</h2></div>
      <div class="journal-new">
        <input id="j-title" type="text" placeholder="Title (optional)" />
        <textarea id="j-text" rows="4" placeholder="Write your thoughts, prayers, reflections..."></textarea>
        <button class="btn-primary" onclick="saveJournalEntry()">Save entry</button>
      </div>
      ${STATE.journal.length === 0 ? `
        <div class="empty-state"><i class="ti ti-book-2" style="font-size:48px;color:var(--pink-mid)"></i><p>Your journal is empty.</p></div>
      ` : `
        <div class="journal-list">
          ${[...STATE.journal].reverse().map((e,ri) => {
            const i = STATE.journal.length - 1 - ri;
            return `
              <div class="journal-card">
                <div class="j-meta">${new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} ${e.verse ? `· ${e.verse}` : ''}</div>
                ${e.title ? `<p class="j-title">${e.title}</p>` : ''}
                <p class="j-body">${e.text}</p>
                <button onclick="deleteJournal(${i})" class="btn-ghost sm danger">Delete</button>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function saveJournalEntry() {
  const title = $('j-title').value.trim();
  const text = $('j-text').value.trim();
  if (!text) return;
  STATE.journal.push({ title, text, date: new Date().toISOString() });
  localStorage.setItem('tb_journal', JSON.stringify(STATE.journal));
  renderJournal();
}

function deleteJournal(i) {
  STATE.journal.splice(i,1);
  localStorage.setItem('tb_journal', JSON.stringify(STATE.journal));
  renderJournal();
}

function addJournalFromVerse(ref, text) {
  const m = $('verse-menu'); if(m) m.remove();
  const b = $('verse-menu-backdrop'); if(b) b.remove();
  STATE.journal.push({ title: ref.replace(/\\'/g,"'"), text: `"${text.replace(/\\'/g,"'")}"`, date: new Date().toISOString(), verse: ref.replace(/\\'/g,"'") });
  localStorage.setItem('tb_journal', JSON.stringify(STATE.journal));
  showToast('Added to journal!');
}

async function renderSearch() {
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header"><h2><i class="ti ti-search"></i> Search</h2></div>
      <div class="search-bar">
        <i class="ti ti-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-size:18px;pointer-events:none;"></i>
        <input id="search-input" type="text" placeholder="Search verse reference, e.g. John 3:16" value="${STATE.searchQuery}" style="padding-left:42px;" />
        <button class="btn-primary" onclick="doSearch()"><i class="ti ti-search"></i></button>
      </div>
      <p class="search-hint">Try: "John 3:16", "Romans 8", "Psalm 23"</p>
      <div id="search-suggestions"></div>
      <div id="search-results"></div>
    </div>
  `;
  
  const searchInput = $('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });
    searchInput.addEventListener('input', e => showSearchSuggestions(e.target.value));
    searchInput.focus();
  }
  
  if (STATE.searchResults.length) showSearchResults(STATE.searchResults);
}

function showSearchSuggestions(query) {
  const suggestionsEl = $('search-suggestions');
  if (!suggestionsEl || !query || query.length < 2) {
    if (suggestionsEl) suggestionsEl.innerHTML = '';
    return;
  }

  const q = query.toLowerCase().trim();
  
  // Match books
  const matchingBooks = ALL_BOOKS.filter(book => 
    book.toLowerCase().includes(q) || 
    book.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))
  ).slice(0, 5);

  // Match book + chapter patterns (e.g., "john 3", "psalm 23")
  const bookChapterMatch = q.match(/^([a-z\s\d]+)\s+(\d+)$/i);
  let chapterSuggestions = [];
  
  if (bookChapterMatch) {
    const bookPart = bookChapterMatch[1].trim();
    const chapterNum = parseInt(bookChapterMatch[2]);
    
    const matchedBook = ALL_BOOKS.find(b => 
      b.toLowerCase().startsWith(bookPart) || 
      b.toLowerCase() === bookPart
    );
    
    if (matchedBook && chapterNum > 0) {
      const maxChapters = CHAPTER_COUNTS[matchedBook] || 0;
      if (chapterNum <= maxChapters) {
        chapterSuggestions.push({
          type: 'chapter',
          book: matchedBook,
          chapter: chapterNum,
          display: `${matchedBook} ${chapterNum}`
        });
      }
    }
  }

  if (matchingBooks.length === 0 && chapterSuggestions.length === 0) {
    suggestionsEl.innerHTML = '';
    return;
  }

  suggestionsEl.innerHTML = `
    <div class="search-suggestions-list">
      ${chapterSuggestions.map(s => `
        <button class="suggestion-item" onclick="openChapter('${escQ(s.book)}', ${s.chapter})">
          <i class="ti ti-book-2"></i>
          <span>${s.display}</span>
        </button>
      `).join('')}
      ${matchingBooks.map(book => `
        <button class="suggestion-item" onclick="setView('chapters',{book:'${escQ(book)}'})">
          <i class="ti ti-book"></i>
          <span>${book}</span>
          <span class="suggestion-meta">${CHAPTER_COUNTS[book]} chapters</span>
        </button>
      `).join('')}
    </div>
  `;
}

async function doSearch() {
  const q = $('search-input').value.trim();
  if (!q) return;
  STATE.searchQuery = q;
  $('search-results').innerHTML = '<div class="loader-center"><div class="spinner"></div></div>';
  const results = await searchBible(q, STATE.version);
  STATE.searchResults = results;
  showSearchResults(results);
}

function showSearchResults(results) {
  const el = $('search-results');
  if (!el) return;
  if (!results.length) { el.innerHTML = '<p class="muted center">No results found. Try a book and chapter like "Psalm 23".</p>'; return; }
  el.innerHTML = `
    <p class="result-count">${results.length} verse${results.length>1?'s':''} found</p>
    <div class="bookmark-list">
      ${results.map(v => `
        <div class="bookmark-card" onclick="openChapter('${escQ(v.book_name)}',${v.chapter})">
          <div class="bm-ref">${v.book_name} ${v.chapter}:${v.verse}</div>
          <p class="bm-text">${v.text.trim()}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSettings() {
  const cacheStats = chapterCache.getStats();
  const currentTheme = themeManager.getTheme();
  const userName = welcomeScreen.getUserName();
  const welcomeEnabled = welcomeScreen.isEnabled();
  const fontSize = typographySystem.getFontSize();
  
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header"><h2><i class="ti ti-settings"></i> Settings</h2></div>
      
      <div class="settings-section">
        <p class="settings-label">Theme</p>
        <div class="version-list">
          <button class="version-item ${currentTheme==='light'?'active':''}" onclick="setThemeMode('light')">
            <i class="ti ti-sun" style="font-size:20px;color:var(--accent-gold);margin-right:4px;margin-left:0;"></i>
            <span class="ver-name">Light Mode</span>
            ${currentTheme==='light' ? '<i class="ti ti-check"></i>' : ''}
          </button>
          <button class="version-item ${currentTheme==='dark'?'active':''}" onclick="setThemeMode('dark')">
            <i class="ti ti-moon" style="font-size:20px;color:var(--accent-gold);margin-right:4px;margin-left:0;"></i>
            <span class="ver-name">Dark Mode</span>
            ${currentTheme==='dark' ? '<i class="ti ti-check"></i>' : ''}
          </button>
        </div>
      </div>
      
      <div class="settings-section">
        <p class="settings-label">Personalization</p>
        <div style="background:var(--bg-secondary);border:0.5px solid var(--border-color);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;">
          <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px;">Your Name</label>
          <input id="user-name-input" type="text" value="${userName}" placeholder="Enter your name" maxlength="30" style="margin-bottom:0;" />
          <p style="font-size:12px;color:var(--text-tertiary);margin-top:6px;">Shown in the welcome screen</p>
        </div>
        <div style="background:var(--bg-secondary);border:0.5px solid var(--border-color);border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <p style="font-size:15px;color:var(--text-primary);margin-bottom:4px;">Show Welcome Screen</p>
            <p style="font-size:12px;color:var(--text-tertiary);">Display greeting when app opens</p>
          </div>
          <button onclick="toggleWelcomeScreen()" style="background:${welcomeEnabled ? 'var(--accent-pink)' : 'var(--bg-tertiary)'};border:0.5px solid ${welcomeEnabled ? 'var(--accent-pink)' : 'var(--border-color)'};width:52px;height:32px;border-radius:16px;position:relative;transition:all 0.2s;cursor:pointer;">
            <span style="display:block;width:28px;height:28px;border-radius:50%;background:white;position:absolute;top:1px;left:${welcomeEnabled ? '21px' : '1px'};transition:all 0.2s;"></span>
          </button>
        </div>
      </div>
      
      <div class="settings-section">
        <p class="settings-label">Bible Version</p>
        <div class="version-list">
          ${Object.entries(VERSIONS).map(([k,v]) => `
            <button class="version-item ${STATE.version===k?'active':''}" onclick="switchVersion('${k}'); renderSettings();">
              <span class="ver-code">${v.label}</span>
              <span class="ver-name">${v.name}</span>
              ${STATE.version===k ? '<i class="ti ti-check"></i>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="settings-section">
        <p class="settings-label">Font Size: <strong>${fontSize}px</strong></p>
        <div class="font-controls">
          <button class="icon-btn" onclick="changeFontSize(-1)"><i class="ti ti-minus"></i></button>
          <div class="font-preview" style="font-size:${fontSize}px">The Lord is my shepherd.</div>
          <button class="icon-btn" onclick="changeFontSize(1)"><i class="ti ti-plus"></i></button>
        </div>
      </div>
      
      <div class="settings-section">
        <p class="settings-label">Cache & Storage</p>
        <div class="about-card">
          <p style="display:flex;justify-content:space-between;"><span>Cached chapters:</span><strong>${cacheStats.memorySize + cacheStats.storageSize}</strong></p>
          <p style="display:flex;justify-content:space-between;"><span>Memory cache:</span><strong>${cacheStats.memorySize} / ${cacheStats.maxMemorySize}</strong></p>
          <p style="display:flex;justify-content:space-between;margin-bottom:12px;"><span>Storage cache:</span><strong>${cacheStats.storageSize} / ${cacheStats.maxStorageSize}</strong></p>
          <button class="btn-ghost" onclick="clearCache()" style="width:100%;justify-content:center;">
            <i class="ti ti-trash"></i> Clear Cache
          </button>
        </div>
      </div>
      
      <div class="settings-section">
        <p class="settings-label">About</p>
        <div class="about-card">
          <p>🎁 A personal Bible gifted to <strong>Tracy</strong> with love.</p>
          <p>Birthday: <strong>9th June</strong></p>
          <p>Versions available: KJV, WEB, ASV, BBE</p>
          <p class="muted" style="font-size:12px;margin-top:12px">Powered by bible-api.com · Works offline after first use</p>
        </div>
      </div>
      ${STATE.view !== 'home' ? `<button class="btn-ghost" onclick="setView('home')"><i class="ti ti-arrow-left"></i> Back</button>` : ''}
    </div>
  `;
  
  // Add event listener for name input
  const nameInput = $('user-name-input');
  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      const newName = nameInput.value.trim();
      if (newName && newName.length >= 1 && newName.length <= 30) {
        welcomeScreen.setUserName(newName);
        showToast('Name saved!');
      }
    });
  }
}

function changeFontSize(delta) {
  if (delta > 0) {
    typographySystem.increase();
  } else {
    typographySystem.decrease();
  }
  renderSettings();
}

function switchVersion(v) {
  const oldVersion = STATE.version;
  STATE.version = v;
  
  // Clear cache for old version if switching versions
  if (oldVersion !== v) {
    chapterCache.clearVersion(oldVersion);
  }
  
  if (STATE.view === 'reader') openChapter(STATE.book, STATE.chapter);
  else render();
}

// Theme toggle function
function toggleTheme() {
  themeManager.toggle();
  render(); // Re-render to update theme icon
}

// Set specific theme
function setThemeMode(mode) {
  themeManager.setTheme(mode);
  renderSettings();
}

// Toggle welcome screen enabled/disabled
function toggleWelcomeScreen() {
  const current = welcomeScreen.isEnabled();
  welcomeScreen.setEnabled(!current);
  renderSettings();
}

// Clear cache function
function clearCache() {
  if (confirm('Clear all cached chapters? You will need to download them again when reading.')) {
    chapterCache.clearAll();
    showToast('Cache cleared!');
    renderSettings();
  }
}

function openVerseRef(ref) {
  const parts = ref.split(' ');
  const chVerse = parts[parts.length-1];
  const book = parts.slice(0,-1).join(' ');
  const ch = parseInt(chVerse.split(':')[0]);
  openChapter(book, ch);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, 2500);
}

function showToastWithUndo(msg, undoCallback) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.display = 'flex';
  t.style.alignItems = 'center';
  t.style.justifyContent = 'space-between';
  t.style.gap = '12px';

  const msgSpan = document.createElement('span');
  msgSpan.textContent = msg;

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.style.cssText = 'background:var(--accent-gold);color:var(--bg-primary);border:none;padding:4px 12px;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer;';
  undoBtn.onclick = () => {
    undoCallback();
    t.remove();
  };

  t.appendChild(msgSpan);
  t.appendChild(undoBtn);

  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=>t.remove(),400);
  }, 5000);
}

// ─── Birthday Countdown ───────────────────────────────────────────────────────
let countdownInterval = null;

function startBirthdayCountdown() {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Update immediately
  updateCountdown();
  
  // Update every second
  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const now = new Date();
  
  // Update current time
  const currentTimeEl = $('current-time');
  if (currentTimeEl) {
    const timeStr = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    currentTimeEl.textContent = timeStr;
  }
  
  // Calculate time until June 9, 2027, 12:00 AM
  const targetDate = new Date('2027-06-09T00:00:00');
  const diff = targetDate - now;
  
  // If birthday has passed, show 0
  if (diff <= 0) {
    if ($('days')) $('days').textContent = '0';
    if ($('hours')) $('hours').textContent = '0';
    if ($('minutes')) $('minutes').textContent = '0';
    if ($('seconds')) $('seconds').textContent = '0';
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    return;
  }
  
  // Calculate days, hours, minutes, seconds
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  // Update display
  if ($('days')) $('days').textContent = days;
  if ($('hours')) $('hours').textContent = hours;
  if ($('minutes')) $('minutes').textContent = minutes;
  if ($('seconds')) $('seconds').textContent = seconds;
}

function escQ(s) { return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

// ─── PWA Install ──────────────────────────────────────────────────────────────
let deferredPrompt = null;

// Check if iOS
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Check if already installed
function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

// Capture the install prompt event (Android/Desktop)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.deferredPrompt = e;
  
  // Show install popup once per session
  const hasSeenPrompt = sessionStorage.getItem('tb_install_prompt_shown');
  
  if (!isInstalled() && !hasSeenPrompt) {
    setTimeout(() => {
      showInstallPopup();
    }, 3000); // Show after 3 seconds
  }
});

// For iOS, show install popup after app loads
window.addEventListener('load', () => {
  const hasSeenPrompt = sessionStorage.getItem('tb_install_prompt_shown');
  
  if (isIOS() && !isInstalled() && !hasSeenPrompt) {
    setTimeout(() => {
      showInstallPopup();
    }, 3000);
  }
});

// Handle app installed
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  window.deferredPrompt = null;
  showToast('App installed successfully! 🎉');
  // Hide popup if visible
  const popup = document.getElementById('install-popup');
  if (popup) popup.remove();
});

// Show install popup
function showInstallPopup() {
  // Check if already dismissed
  const dismissed = sessionStorage.getItem('tb_install_dismissed');
  if (dismissed) return;
  
  const ios = isIOS();
  
  const popup = document.createElement('div');
  popup.id = 'install-popup';
  popup.className = 'install-popup';
  popup.innerHTML = `
    <div class="install-popup-content glass-card">
      <button class="install-close" onclick="dismissInstallPopup()">
        <i class="ti ti-x"></i>
      </button>
      <div style="text-align:center;margin-bottom:16px;">
        <i class="ti ti-download" style="font-size:48px;color:var(--accent-pink);"></i>
      </div>
      <h3 style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px;text-align:center;">Install Tracy's Bible</h3>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;text-align:center;line-height:1.5;">
        ${ios ? 
          '<strong>Install as a PWA:</strong><br>1. Tap the Share button <span style="font-size:20px;">⎙</span><br>2. Select "Add to Home Screen"<br>3. Tap "Add"<br><br>This installs the app completely - it will work offline and run like a native app!' : 
          'Get quick access and offline reading by installing the app on your phone'
        }
      </p>
      <div style="display:flex;gap:10px;">
        <button onclick="dismissInstallPopup()" class="btn-ghost" style="flex:1;justify-content:center;">
          Maybe Later
        </button>
        ${!ios ? `
          <button onclick="installApp()" class="btn-primary" style="flex:1;justify-content:center;">
            <i class="ti ti-download" style="margin-right:6px;"></i>
            Install
          </button>
        ` : `
          <button onclick="dismissInstallPopup()" class="btn-primary" style="flex:1;justify-content:center;">
            Got it!
          </button>
        `}
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Fade in
  setTimeout(() => {
    popup.style.opacity = '1';
  }, 10);
  
  // Mark as shown
  sessionStorage.setItem('tb_install_prompt_shown', 'true');
}

// Dismiss install popup
function dismissInstallPopup() {
  const popup = document.getElementById('install-popup');
  if (!popup) return;
  
  popup.style.opacity = '0';
  setTimeout(() => {
    popup.remove();
  }, 300);
  
  // Mark as dismissed for this session
  sessionStorage.setItem('tb_install_dismissed', 'true');
}

// Install app function
async function installApp() {
  if (!deferredPrompt && !window.deferredPrompt) {
    dismissInstallPopup();
    showToast('Install not available on this browser');
    return;
  }

  const promptEvent = deferredPrompt || window.deferredPrompt;
  
  // Show the install prompt
  promptEvent.prompt();
  
  // Wait for user response
  const { outcome } = await promptEvent.userChoice;
  
  if (outcome === 'accepted') {
    showToast('Installing app...');
    dismissInstallPopup();
  } else {
    showToast('Installation cancelled');
    dismissInstallPopup();
  }
  
  // Clear the prompt
  deferredPrompt = null;
  window.deferredPrompt = null;
}

// ─── Deep Linking Support ────────────────────────────────────────────────────
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);

  // Check for view parameter (from shortcuts)
  const view = params.get('view');
  if (view && ['home', 'books', 'bookmarks', 'journal', 'search', 'settings'].includes(view)) {
    STATE.view = view;
    return;
  }

  // Check for book parameter (from shortcuts)
  const book = params.get('book');
  if (book && ALL_BOOKS.includes(book)) {
    STATE.view = 'chapters';
    STATE.book = book;
    return;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Disable transitions on page load to prevent flash
  document.body.classList.add('no-transition');

  // Initialize systems
  chapterCache = new ChapterCache();
  themeManager = new ThemeManager();
  splashScreen = new SplashScreen();
  welcomeScreen = new WelcomeScreen();
  typographySystem = new TypographySystem();

  // Initialize theme and typography first
  themeManager.initialize();
  typographySystem.initialize();

  // Re-enable transitions after a brief delay
  setTimeout(() => {
    document.body.classList.remove('no-transition');
  }, 100);

  // Handle deep links from manifest shortcuts
  handleDeepLink();

  // Show splash screen first, then welcome screen
  splashScreen.show(() => {
    if (welcomeScreen.shouldShow()) {
      welcomeScreen.show();
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  // Render app
  render();
});
