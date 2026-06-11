// ─── State ───────────────────────────────────────────────────────────────────

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
  bookmarks: JSON.parse(localStorage.getItem('tb_bookmarks') || '[]'),
  journal: JSON.parse(localStorage.getItem('tb_journal') || '[]'),
  highlight: JSON.parse(localStorage.getItem('tb_highlight') || '{}'),
  searchQuery: '',
  searchResults: [],
  verseOfDay: null,
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
          const bm = STATE.bookmarks.find(b=>b.key===key);
          return `
            <div class="verse ${hl ? 'hl-'+hl : ''}" id="v${v.verse}" onclick="verseMenu(event,'${STATE.book}',${STATE.chapter},${v.verse},'${escQ(v.text)}')">
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
}

function verseMenu(e, book, chapter, verse, text) {
  e.stopPropagation();
  const existing = $('verse-menu');
  if (existing) existing.remove();
  const key = `${book}-${chapter}-${verse}`;
  const isBm = STATE.bookmarks.some(b=>b.key===key);
  const menu = document.createElement('div');
  menu.id = 'verse-menu';
  menu.className = 'verse-ctx-menu';
  menu.innerHTML = `
    <div class="ctx-ref">${book} ${chapter}:${verse}</div>
    <button onclick="toggleBookmark('${key}','${escQ(book)}',${chapter},${verse},'${escQ(text)}')">
      <i class="ti ${isBm?'ti-bookmark-off':'ti-bookmark'}"></i> ${isBm?'Remove bookmark':'Bookmark'}
    </button>
    <button onclick="highlightVerse('${key}','pink')"><span class="hl-dot pink"></span> Pink</button>
    <button onclick="highlightVerse('${key}','yellow')"><span class="hl-dot yellow"></span> Yellow</button>
    <button onclick="highlightVerse('${key}','clear')"><i class="ti ti-eraser"></i> Clear highlight</button>
    <button onclick="addJournalFromVerse('${escQ(book+' '+chapter+':'+verse)}','${escQ(text)}')">
      <i class="ti ti-pencil"></i> Add to journal
    </button>
    <button onclick="copyVerse('${escQ(book+' '+chapter+':'+verse)}','${escQ(text)}')">
      <i class="ti ti-copy"></i> Copy verse
    </button>
    <button class="ctx-close" onclick="document.getElementById('verse-menu').remove()"><i class="ti ti-x"></i> Close</button>
  `;
  document.body.appendChild(menu);
  document.addEventListener('click', () => { const m=$('verse-menu'); if(m) m.remove(); }, {once:true});
}

function toggleBookmark(key, book, chapter, verse, text) {
  const idx = STATE.bookmarks.findIndex(b=>b.key===key);
  if (idx > -1) STATE.bookmarks.splice(idx,1);
  else STATE.bookmarks.push({key, book, chapter, verse: parseInt(verse), text, version: STATE.version, date: new Date().toISOString()});
  localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));
  const m = $('verse-menu'); if(m) m.remove();
  if (STATE.view === 'reader') openChapter(STATE.book, STATE.chapter);
}

function highlightVerse(key, color) {
  if (color === 'clear') delete STATE.highlight[key];
  else STATE.highlight[key] = color;
  localStorage.setItem('tb_highlight', JSON.stringify(STATE.highlight));
  const m = $('verse-menu'); if(m) m.remove();
  if (STATE.view === 'reader') openChapter(STATE.book, STATE.chapter);
}

function copyVerse(ref, text) {
  navigator.clipboard.writeText(`"${text.replace(/\\'/g,"'")}" — ${ref.replace(/\\'/g,"'")}`).catch(()=>{});
  const m = $('verse-menu'); if(m) m.remove();
  showToast('Verse copied!');
}

function renderBookmarks() {
  $('main').innerHTML = `
    <div class="page-wrap">
      <div class="page-header"><h2><i class="ti ti-bookmark"></i> Saved Verses</h2></div>
      ${STATE.bookmarks.length === 0 ? `
        <div class="empty-state">
          <i class="ti ti-bookmark" style="font-size:48px;color:var(--accent-pink)"></i>
          <p>No saved verses yet.</p>
          <p class="muted">Tap any verse while reading to bookmark it.</p>
        </div>
      ` : `
        <div class="bookmark-list">
          ${STATE.bookmarks.map((b,i) => {
            const safeBook = escQ(b.book);
            return `
              <div class="bookmark-card">
                <div class="bm-ref">${b.book} ${b.chapter}:${b.verse} <span class="ver-tag">${b.version.toUpperCase()}</span></div>
                <p class="bm-text">"${b.text.trim()}"</p>
                <div class="bm-actions">
                  <button onclick="openChapter('${safeBook}',${b.chapter})" class="btn-ghost sm">Read</button>
                  <button onclick="removeBookmark(${i})" class="btn-ghost sm danger">Remove</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function removeBookmark(i) {
  STATE.bookmarks.splice(i,1);
  localStorage.setItem('tb_bookmarks', JSON.stringify(STATE.bookmarks));
  renderBookmarks();
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

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.deferredPrompt = e;
  
  // Show install popup once per session
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const hasSeenPrompt = sessionStorage.getItem('tb_install_prompt_shown');
  
  if (!isStandalone && !hasSeenPrompt) {
    setTimeout(() => {
      showInstallPopup();
    }, 3000); // Show after 3 seconds
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
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;text-align:center;line-height:1.5;">Get quick access and offline reading by installing the app on your phone</p>
      <div style="display:flex;gap:10px;">
        <button onclick="dismissInstallPopup()" class="btn-ghost" style="flex:1;justify-content:center;">
          Maybe Later
        </button>
        <button onclick="installApp()" class="btn-primary" style="flex:1;justify-content:center;">
          <i class="ti ti-download" style="margin-right:6px;"></i>
          Install
        </button>
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
    // Fallback for iOS - show manual instructions
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      dismissInstallPopup();
      showToast('Tap Share ⎙ then "Add to Home Screen"');
    } else {
      dismissInstallPopup();
      showToast('Install not available on this browser');
    }
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
