# 📖 Tracy's Bible - Personal Bible PWA

> *A gift of faith, love & grace*

A beautiful, personalized Progressive Web App (PWA) Bible reader designed specifically for Tracy. Features offline reading, glassmorphic design, light/dark themes, and a countdown to Tracy's birthday.

![Version](https://img.shields.io/badge/version-2.1-pink)
![PWA](https://img.shields.io/badge/PWA-enabled-success)
![Offline](https://img.shields.io/badge/offline-ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 📱 **Progressive Web App (PWA)**
- **Fully installable** on iOS and Android devices
- **Works completely offline** after first visit
- **Native app experience** with custom splash screen
- **Fast loading** with intelligent caching
- **Standalone mode** - runs without browser UI

### 📚 **Bible Reading**
- **4 Bible versions**: KJV, WEB, ASV, BBE
- **Smart caching** - chapters load in < 3 seconds
- **Offline reading** - access previously loaded chapters without internet
- **Quick navigation** - Old Testament & New Testament organized
- **Chapter prefetching** - automatic loading of adjacent chapters
- **Verse-of-the-day** - daily inspirational verses

### 🎨 **Beautiful Design**
- **Glassmorphism UI** with pink neon aesthetic
- **Light & Dark themes** with smooth transitions
- **iOS-native polish** - spring animations and haptic feedback
- **Responsive typography** - adjustable font sizes (15-26px)
- **Elegant spacing** - optimized for readability

### 🔖 **Personal Features**
- **Bookmarks** - save favorite verses with one tap
- **Highlights** - mark verses in pink or yellow
- **Journal** - write reflections and prayers
- **Personalized welcome** - custom name and greeting
- **Birthday countdown** - real-time countdown to June 9, 2027
- **Search** - find verses and books with autocomplete

### ⚡ **Performance**
- **< 100ms** load time for cached content
- **< 3 second** guarantee for API calls
- **Smart prefetching** of adjacent chapters
- **LRU cache** with automatic eviction
- **100 chapters** cached for offline use

---

## 🚀 Quick Start

### **Option 1: Install as PWA (Recommended)**

#### On iOS (iPhone/iPad):
1. Open https://prime-code2106.github.io/tracybible/ in Safari
2. Tap the **Share** button (⎙)
3. Select **"Add to Home Screen"**
4. Tap **"Add"**
5. The app icon appears on your home screen! 🎉

#### On Android:
1. Open https://prime-code2106.github.io/tracybible/ in Chrome
2. Tap the **"Install"** button in the address bar
3. Or tap the menu (⋮) → **"Add to Home Screen"**
4. Confirm installation
5. The app appears in your app drawer! 🎉

### **Option 2: Use in Browser**
Simply visit https://prime-code2106.github.io/tracybible/ in any modern browser.

---

## 📖 How to Use

### **Reading the Bible**
1. Tap **"Read Bible"** on the home screen
2. Choose a book from Old or New Testament
3. Select a chapter number
4. Read! Swipe or tap navigation buttons to move between chapters

### **Bookmarking Verses**
1. While reading, tap any verse
2. A menu slides up from the bottom
3. Tap **"Bookmark"** to save
4. Access saved verses from the **"Saved"** tab

### **Highlighting Verses**
1. Tap any verse to open the menu
2. Choose **Pink** or **Yellow** highlight
3. The verse background changes color
4. Tap **"Clear highlight"** to remove

### **Journaling**
1. Go to the **"Journal"** tab
2. Write your title (optional) and entry
3. Tap **"Save entry"**
4. Or add verses directly from the reader menu

### **Searching**
1. Go to the **"Search"** tab
2. Start typing a book name (e.g., "John")
3. Autocomplete suggestions appear
4. Or search for specific verses (e.g., "John 3:16")

### **Customization**
1. Tap the **Settings** icon ⚙️
2. Switch between **Light/Dark** themes
3. Adjust **font size** with +/- buttons
4. Change your **name** for the welcome screen
5. Toggle **welcome screen** on/off
6. Switch **Bible versions**

---

## 🎨 Design Philosophy

### **Color Palette**
- **Primary**: Pink (#c2185b) - represents love and grace
- **Accent**: Gold (#f5c842) - represents divine light
- **Glassmorphism**: Frosted glass with pink neon borders

### **Typography**
- **Font Family**: SF Pro Text (iOS), Segoe UI (Windows), System default
- **Base Size**: 18px (adjustable 15-26px)
- **Line Height**: 1.8 for verses, 1.6 for body text

### **Themes**
- **Dark Mode** (default): Deep purple-black backgrounds
- **Light Mode**: Soft whites with subtle shadows
- Smooth 300ms transitions between themes

---

## 🏗️ Technical Stack

### **Frontend**
- **Pure Vanilla JavaScript** - no frameworks, maximum performance
- **Modern CSS** - Grid, Flexbox, CSS Variables, Animations
- **Progressive Enhancement** - works everywhere, enhanced on modern browsers

### **PWA Features**
- **Service Worker** - comprehensive offline support
- **Web Manifest** - installability and app metadata
- **Cache API** - intelligent multi-tier caching
- **localStorage** - persistent user data

### **APIs**
- **Bible API**: https://bible-api.com
- **Tabler Icons**: CDN-hosted icon library

### **Performance Optimizations**
- Multi-tier caching (memory + localStorage)
- LRU cache eviction strategy
- Adjacent chapter prefetching
- 3-second timeout on API calls
- Debounced search suggestions

---

## 📂 Project Structure

```
tracybible/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline support)
├── css/
│   ├── style.css          # Main styles
│   ├── themes.css         # Light/dark theme definitions
│   ├── glassmorphism.css  # Glass UI effects
│   ├── typography.css     # Font system
│   └── ios-polish.css     # iOS-specific polish
├── js/
│   ├── app.js             # Main application logic
│   ├── caching.js         # ChapterCache class
│   ├── themes.js          # ThemeManager class
│   ├── welcome.js         # Splash & Welcome screens
│   └── utils.js           # TypographySystem class
├── icons/
│   ├── icon-192.png       # App icon (192x192)
│   └── icon-512.png       # App icon (512x512)
└── README.md              # This file
```

---

## 🔧 Development

### **Prerequisites**
- Any modern browser with service worker support
- Local web server (for testing service workers)

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/Prime-code2106/tracybible.git
cd tracybible

# Serve with any local server
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: PHP
php -S localhost:8000

# Open in browser
open http://localhost:8000
```

### **Testing Offline Mode**

#### Method 1 - Browser DevTools:
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers**
4. Check **"Offline"** checkbox
5. Reload the page

#### Method 2 - Network Throttling:
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Select **"Offline"** from throttling dropdown
4. Reload the page

#### Method 3 - Real Offline:
1. Load the app while online
2. Read several Bible chapters (they get cached)
3. Turn on Airplane Mode ✈️
4. Refresh the app - it works!

---

## 💾 Caching Strategy

### **Static Cache** (Immediate)
- HTML, CSS, JavaScript files
- Icons and images
- Manifest file

### **API Cache** (On-demand)
- Bible chapters as they're read
- Up to 100 chapters stored
- Cache-first strategy for instant loading

### **Dynamic Cache** (On-demand)
- External fonts
- CDN resources (Tabler Icons)
- Up to 50 resources stored

### **Cache Lifecycle**
```
Install → Cache static assets
Activate → Clean old caches
Fetch → Serve from cache → Fallback to network
```

---

## 📊 Storage Usage

| Data Type | Storage Method | Max Size | Lifetime |
|-----------|---------------|----------|----------|
| App files | Cache API | ~500 KB | Permanent |
| Bible chapters | Cache API | ~10 MB | Until cleared |
| Bookmarks | localStorage | ~5 MB | Permanent |
| Journal entries | localStorage | ~5 MB | Permanent |
| Highlights | localStorage | ~1 MB | Permanent |
| Settings | localStorage | ~10 KB | Permanent |

**Total Max Storage**: ~20 MB (well under typical limits)

---

## 🎯 Browser Support

| Browser | Desktop | Mobile | PWA Install |
|---------|---------|--------|-------------|
| **Chrome** | ✅ 90+ | ✅ 90+ | ✅ Yes |
| **Safari** | ✅ 14+ | ✅ 14+ | ✅ Yes (iOS) |
| **Firefox** | ✅ 88+ | ✅ 88+ | ⚠️ Limited |
| **Edge** | ✅ 90+ | ✅ 90+ | ✅ Yes |
| **Samsung Internet** | - | ✅ 14+ | ✅ Yes |

**Note**: PWA features work best on Chrome (Android) and Safari (iOS).

---

## 🌟 Special Features

### **Birthday Countdown**
- Real-time countdown to Tracy's birthday (June 9, 2027)
- Displays: Days, Hours, Minutes, Seconds
- Current time in 12-hour format
- Special birthday banner on June 9th

### **Personalized Welcome**
- Custom name (default: "Grace")
- Random inspirational Bible verse
- Only shows once per session
- Can be disabled in settings

### **Text-based Splash Screen**
- Shows "Tracy's Bible" with gold cross
- Elegant fade-in animation
- 2.5-second duration
- Purple-black gradient background

---

## 📱 Installation Benefits

### **Why Install as PWA?**
1. **No app store required** - install directly from browser
2. **Automatic updates** - always get the latest version
3. **Offline access** - read anywhere, anytime
4. **Native feel** - no browser UI, full screen
5. **Fast loading** - cached content loads instantly
6. **Less storage** - smaller than traditional apps
7. **Privacy** - no tracking, all data stays local

---

## 🔒 Privacy & Data

### **What We Collect**
- **Nothing!** All data stays on your device.

### **What's Stored Locally**
- Bookmarked verses
- Journal entries
- Highlight colors
- Font size preferences
- Theme preference
- Welcome screen settings
- Cached Bible chapters

### **What's NOT Stored**
- No user analytics
- No personal information
- No location data
- No usage tracking

### **Data Control**
- Clear cache from Settings → Cache & Storage
- Data persists only on your device
- Uninstalling removes all data

---

## 🐛 Troubleshooting

### **App won't install on iOS**
- Make sure you're using **Safari** (not Chrome)
- Check iOS version (14+ required)
- Try clearing Safari cache and retry

### **Offline mode not working**
- Visit the app while online first
- Read at least one Bible chapter
- Check Settings → Cache shows cached chapters
- Try clearing and rebuilding cache

### **Bookmarks not saving**
- Check browser storage permissions
- Try clearing localStorage and re-creating
- Ensure you're not in private/incognito mode

### **Slow chapter loading**
- Check internet connection
- Clear cache and reload
- Try different Bible version
- Check if service worker is active (DevTools)

### **Theme not switching**
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check if JavaScript is enabled

---

## 🤝 Contributing

This is a personal gift project, but if you'd like to suggest improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 Changelog

### **v2.1** (Current) - June 2026
- ✅ Comprehensive offline support
- ✅ Enhanced service worker with intelligent caching
- ✅ Bible API responses cached for offline reading
- ✅ Cache trimming to prevent bloat
- ✅ Improved bookmark menu with backdrop overlay
- ✅ Clearer PWA installation messaging

### **v2.0** - June 2026
- ✅ Glassmorphism UI with pink neon aesthetic
- ✅ Light/Dark theme system
- ✅ Personalized welcome screen
- ✅ Birthday countdown timer
- ✅ Smart caching system
- ✅ Enhanced typography controls
- ✅ iOS-native polish
- ✅ PWA install functionality

### **v1.0** - Initial Release
- Basic Bible reader
- Bookmarks and journal
- Simple search functionality

---

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2026 Tracy's Bible

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Bible API**: https://bible-api.com for providing free Bible text
- **Tabler Icons**: https://tabler-icons.io for beautiful icon set
- **Tracy**: The inspiration for this app 💖
- **God**: For the Word that inspired it all ✝️

---

## 📞 Support

For issues or questions:
- **GitHub Issues**: https://github.com/Prime-code2106/tracybible/issues
- **Email**: prime-code2106@github.com

---

## 🌐 Live Demo

**Visit**: https://prime-code2106.github.io/tracybible/

---

<div align="center">

**Made with 💖 and ✝️**

*"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."*  
**— John 3:16**

</div>
