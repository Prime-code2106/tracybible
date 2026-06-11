# Implementation Plan: App UI Polish and Performance

## Overview

This plan implements performance enhancements through intelligent caching (memory + LocalStorage with LRU eviction), modern glassmorphism UI design, personalized welcome screen, comprehensive light/dark theme support, improved typography for readability, optimized spacing for content density, and iOS-native polish patterns for Tracy's Bible PWA.

The implementation will be done incrementally, building from core infrastructure (caching, themes) through visual enhancements (glassmorphism, typography, spacing) to user-facing features (welcome screen, theme toggle).

## Tasks

- [x] 1. Set up new module files and project structure
  - Create `js/caching.js` for ChapterCache class
  - Create `js/themes.js` for ThemeManager class
  - Create `js/welcome.js` for WelcomeScreen component
  - Create `js/utils.js` for typography and utility functions
  - Create `css/themes.css` for theme variables and transitions
  - Create `css/glassmorphism.css` for backdrop blur utilities
  - Create `css/typography.css` for font size scales and iOS fonts
  - Create `css/ios-polish.css` for animations and touch interactions
  - Update `index.html` to include new script and stylesheet references
  - _Requirements: Foundation for all subsequent tasks_

- [x] 2. Implement ChapterCache with LRU eviction and prefetching
  - [x] 2.1 Create ChapterCache class with memory and LocalStorage tiers
    - Implement constructor with memoryCache Map, accessLog Map, and size limits
    - Implement getCacheKey method for version-aware cache keys
    - Implement getChapter method with memory → LocalStorage → API fallback
    - Implement updateAccessLog method for LRU tracking
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_
  
  - [x] 2.2 Implement LRU eviction logic
    - Implement addToMemory method with size checking
    - Implement evictLRU method to remove least recently used entry
    - Implement getFromStorage and saveToStorage methods
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 2.3 Implement intelligent prefetching
    - Implement prefetchAdjacent method for next/previous chapters
    - Add prefetchQueue Set to prevent duplicate fetches
    - Use setTimeout to avoid blocking main thread
    - _Requirements: 1.3, 1.4, 10.8_
  
  - [x] 2.4 Implement storage quota management
    - Implement manageStorageQuota method with 100-chapter limit
    - Implement clearOldestStorageEntries method
    - Add QuotaExceededError handling in saveToStorage
    - _Requirements: 10.1, 10.2, 10.7_
  
  - [x] 2.5 Implement cache management utilities
    - Implement clearAll method to clear all cached chapters
    - Implement clearVersion method for version-specific cache clearing
    - Implement getStats method for cache statistics display
    - _Requirements: 1.8, 10.4, 10.5, 10.6_
  
  - [ ]* 2.6 Write property tests for ChapterCache
    - **Property 1: Cache Hit Consistency** - Cached chapters return identical data to fresh API fetches
    - **Property 2: LRU Eviction Order** - Least recently accessed items are evicted first when cache is full
    - **Property 3: Version Isolation** - Clearing one version's cache does not affect other versions
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.8, 10.1, 10.2**

- [x] 3. Integrate ChapterCache into existing app.js
  - [x] 3.1 Initialize ChapterCache instance and update fetchChapter function
    - Create global ChapterCache instance in app.js
    - Replace fetchChapter API call with chapterCache.getChapter
    - Ensure backward compatibility with existing UI flow
    - Test chapter loading in reader view
    - _Requirements: 1.1, 1.2, 1.5, 1.6_
  
  - [x] 3.2 Add cache statistics display to settings page
    - Update renderSettings to show cache size information
    - Display memory cache size and LocalStorage cache size
    - Add "Clear Cache" button with confirmation
    - Wire button to chapterCache.clearAll method
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [x] 3.3 Handle version switching with cache clearing
    - Update switchVersion function to call chapterCache.clearVersion
    - Reload current chapter after version switch
    - Show toast notification after cache clear
    - _Requirements: 1.8_

- [ ] 4. Checkpoint - Verify caching system works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ThemeManager and create theme CSS
  - [x] 5.1 Create theme CSS variables for light and dark modes
    - Define light theme variables in css/themes.css (backgrounds, text, glass effects)
    - Define dark theme variables in css/themes.css (existing dark colors)
    - Create theme transition classes with 300ms duration
    - Ensure all colors meet WCAG 4.5:1 contrast ratio
    - _Requirements: 4.1, 4.2, 8.1, 8.2, 8.3, 8.4, 4.9_
  
  - [x] 5.2 Create ThemeManager class
    - Implement constructor with theme definitions
    - Implement loadTheme method with LocalStorage and system preference detection
    - Implement applyTheme method to update CSS custom properties
    - Implement updateMetaThemeColor method for iOS status bar
    - Implement toggle method to switch between themes
    - Implement initialize method with system preference listener
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.10_
  
  - [ ]* 5.3 Write unit tests for ThemeManager
    - Test loadTheme with various LocalStorage states
    - Test system preference detection fallback
    - Test applyTheme updates DOM correctly
    - Test meta tag synchronization
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 4.10_

- [x] 6. Apply glassmorphism effects across UI components
  - [x] 6.1 Create glassmorphism utility CSS classes
    - Create .glass-card class with backdrop-filter blur (12px+)
    - Create .glass-nav class for navigation with transparency (70-95%)
    - Create .glass-modal class for dialogs
    - Create .glass-menu class for context menus
    - Add subtle border highlights for depth perception
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 6.2 Update existing CSS to use glassmorphism
    - Update #nav styles to use glassmorphism (backdrop blur, transparency)
    - Update .vod-card, .quick-card, .bookmark-card to use glassmorphism
    - Update .verse-ctx-menu to use glassmorphism
    - Update modal dialogs to use glassmorphism
    - Ensure effects work in both light and dark themes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.5_
  
  - [x] 6.3 Test glassmorphism visual consistency
    - Verify blur effects are visible against various backgrounds
    - Verify borders are subtle but visible
    - Verify transparency levels work in both themes
    - Test on different backgrounds (home hero, reader, cards)
    - _Requirements: 2.7, 2.8_

- [x] 7. Implement WelcomeScreen component
  - [x] 7.1 Create WelcomeScreen class with session management
    - Implement constructor with userName and enabled state loading
    - Implement loadUserName and loadEnabledState from LocalStorage
    - Implement shouldShow method with session detection
    - Implement setUserName and setEnabled methods with validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.9, 3.10, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x] 7.2 Create welcome screen UI with animations
    - Implement show method to create overlay DOM
    - Create gradient background with cross icon and greeting
    - Implement getInspirationalVerse method with verse rotation
    - Add Continue/Skip button with event handlers
    - Implement dismiss method with fade-out animation (400ms)
    - Auto-dismiss after 3 seconds
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 3.9_
  
  - [x] 7.3 Add welcome screen customization to settings
    - Add "Personalization" section to settings page
    - Add input field for user name with validation (1-30 chars)
    - Add toggle to enable/disable welcome screen
    - Wire inputs to welcomeScreen.setUserName and setEnabled
    - Show current user name in settings
    - _Requirements: 3.5, 9.1, 9.2, 9.3, 9.4, 9.8_
  
  - [ ]* 7.4 Write unit tests for WelcomeScreen
    - Test shouldShow returns false after session storage is set
    - Test setUserName validation (length constraints)
    - Test setEnabled persists to LocalStorage
    - Test escapeHtml prevents XSS
    - _Requirements: 3.1, 3.10, 9.4_

- [x] 8. Integrate WelcomeScreen into app initialization
  - [x] 8.1 Initialize WelcomeScreen on app load
    - Create global WelcomeScreen instance in app.js
    - Check welcomeScreen.shouldShow() in DOMContentLoaded handler
    - Call welcomeScreen.show() if shouldShow returns true
    - Ensure welcome screen appears before main interface
    - _Requirements: 3.1, 3.10_
  
  - [x] 8.2 Add welcome screen settings UI to renderSettings
    - Add "Personalization" section to settings rendering
    - Add user name input field with current value
    - Add welcome screen enable/disable toggle
    - Wire input events to WelcomeScreen methods
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 9.8_

- [ ] 9. Checkpoint - Verify themes and welcome screen work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement TypographySystem with user adjustments
  - [x] 10.1 Create TypographySystem class
    - Implement constructor with font size loading from LocalStorage
    - Implement setFontSize method with clamping (15-26px)
    - Implement increase and decrease methods
    - Implement applyFontSize method to update CSS custom property
    - Implement initialize method
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_
  
  - [x] 10.2 Create typography CSS with iOS fonts and improved readability
    - Update body font stack to use -apple-system, SF Pro Text
    - Set base body font size to 17px minimum
    - Set verse text font size to 18px minimum
    - Set heading font sizes to 20px minimum
    - Set line heights to 1.6 for body, 1.8 for verses
    - Ensure navigation labels are 11px with letter-spacing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 5.9_
  
  - [x] 10.3 Update existing CSS to use user font size variable
    - Add --user-font-size CSS custom property
    - Update .verse-text to use var(--user-font-size)
    - Update body text elements to use var(--user-font-size)
    - Ensure font size applies throughout app
    - _Requirements: 5.6, 5.7_
  
  - [ ]* 10.4 Write unit tests for TypographySystem
    - Test loadFontSize with valid and invalid values
    - Test setFontSize clamping behavior
    - Test increase/decrease boundary conditions
    - Test LocalStorage persistence
    - _Requirements: 5.6, 5.7_

- [x] 11. Integrate TypographySystem and update font controls
  - [x] 11.1 Initialize TypographySystem and refactor font size handling
    - Create global TypographySystem instance in app.js
    - Remove old fontSize from STATE object
    - Update changeFontSize function to use typographySystem.increase/decrease
    - Update renderReader to use typographySystem.getFontSize()
    - _Requirements: 5.6, 5.7_
  
  - [x] 11.2 Update settings page font controls
    - Update renderSettings to use typographySystem.getFontSize()
    - Ensure font preview updates when size changes
    - Test font size persistence across sessions
    - _Requirements: 5.6, 5.7_

- [x] 12. Optimize spacing and layout for content density
  - [x] 12.1 Reduce navigation and padding spacing
    - Update --nav-height to 66px maximum
    - Reduce padding between nav and content to 12px maximum
    - Set content container horizontal padding to 16px
    - Set vertical spacing between sections to 20px maximum
    - Set card padding to 16px maximum
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7_
  
  - [x] 12.2 Optimize viewport usage and safe area handling
    - Ensure content uses 85%+ of vertical screen space
    - Update safe area insets for iPhone notch and home indicator
    - Add padding equal to nav height + safe area bottom inset where needed
    - Update existing @supports safe-area-inset rules
    - _Requirements: 6.3, 6.4, 6.8_
  
  - [x] 12.3 Review and test spacing across all views
    - Test home view spacing (hero, cards, VOD)
    - Test reader view spacing (header, verses, navigation)
    - Test settings, bookmarks, journal spacing
    - Ensure consistent 16px horizontal padding
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 13. Implement iOS-native polish and animations
  - [x] 13.1 Add iOS-style spring animations
    - Create animation classes with 300ms duration and spring easing
    - Apply to view transitions, card appearances, modal show/hide
    - Ensure smooth, native-feeling motion
    - _Requirements: 7.1_
  
  - [x] 13.2 Implement touch interactions and button feedback
    - Add scale transform (0.96) to button press states
    - Update .btn-primary, .btn-ghost, .nav-btn active states
    - Update .quick-card, .book-btn, .chapter-btn active states
    - Ensure tap highlight is disabled (-webkit-tap-highlight-color: transparent)
    - _Requirements: 7.4, 7.7, 7.8_
  
  - [x] 13.3 Update corner radii for iOS aesthetic
    - Update card border-radius to 12-20px range
    - Update button border-radius to 8-12px range
    - Apply rounded corners consistently across UI
    - _Requirements: 7.5, 7.6_
  
  - [x] 13.4 Implement momentum scrolling and overscroll control
    - Add -webkit-overflow-scrolling: touch to scrollable areas
    - Prevent overscroll bounce on fixed navigation (#nav)
    - Ensure smooth, native scrolling behavior
    - _Requirements: 7.2, 7.3_
  
  - [x] 13.5 Configure iOS standalone mode and status bar
    - Update viewport meta tag with viewport-fit=cover
    - Set apple-mobile-web-app-capable to yes
    - Set apple-mobile-web-app-status-bar-style to black-translucent
    - Update manifest.json if needed for PWA display mode
    - _Requirements: 7.9, 7.10, 7.11, 7.12_
  
  - [ ]* 13.6 Write integration tests for iOS polish features
    - Test button press animations apply correctly
    - Test corner radii are within specified ranges
    - Test meta tags are present and correct
    - Test overscroll behavior on navigation
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.10, 7.11, 7.12_

- [x] 14. Add theme toggle UI and finalize theme integration
  - [x] 14.1 Add theme toggle button to home view
    - Add theme toggle icon button to home hero or header
    - Wire button to themeManager.toggle()
    - Show current theme icon (sun for light, moon for dark)
    - _Requirements: 4.3, 4.4_
  
  - [x] 14.2 Add theme toggle button to settings view
    - Add "Theme" section to settings page
    - Add theme toggle with light/dark labels
    - Show current theme selection visually
    - Wire to themeManager.toggle()
    - _Requirements: 4.3, 4.4_
  
  - [x] 14.3 Initialize ThemeManager on app load
    - Create global ThemeManager instance in app.js
    - Call themeManager.initialize() in DOMContentLoaded handler
    - Ensure theme is applied before any content renders
    - Test theme persistence across sessions
    - _Requirements: 4.5, 4.6, 4.7, 4.8_
  
  - [x] 14.4 Test theme switching across all views
    - Verify theme switch applies within 300ms
    - Verify all UI components update (nav, cards, modals, menus)
    - Verify glassmorphism adapts to theme (opacity changes)
    - Verify meta theme-color updates for iOS status bar
    - Test system preference detection and auto-switching
    - _Requirements: 4.5, 4.9, 4.10, 8.5_

- [x] 15. Final integration and polish
  - [x] 15.1 Update index.html with all new resources
    - Add script tags for caching.js, themes.js, welcome.js, utils.js
    - Add link tags for themes.css, glassmorphism.css, typography.css, ios-polish.css
    - Ensure scripts load in correct order (utils → caching/themes/welcome → app)
    - Update viewport meta tag for viewport-fit=cover
    - _Requirements: Foundation for all features_
  
  - [ ] 15.2 Verify all features work together
    - Test full flow: welcome screen → home → theme toggle → read chapter (with caching) → adjust font size
    - Test welcome screen customization in settings
    - Test cache statistics and clear cache functionality
    - Verify glassmorphism effects in both themes
    - Test on iPhone/iOS Safari if possible
    - _Requirements: All requirements_
  
  - [ ]* 15.3 Write integration tests for complete user flows
    - Test welcome screen → theme switch → chapter load → font adjustment flow
    - Test cache hit/miss scenarios with real API calls
    - Test theme persistence across page reloads
    - Test welcome screen session management
    - _Requirements: Cross-cutting requirements 1.1-10.8_

- [ ] 16. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and allow for user feedback
- Property tests validate caching correctness properties (cache consistency, LRU behavior, version isolation)
- Unit tests validate specific examples and edge cases for UI components
- Integration tests validate end-to-end flows across multiple features
- Implementation builds from infrastructure (caching, themes) to user-facing features (welcome, polish)
- All code is JavaScript (implementation) with TypeScript interfaces (documentation)
- Glassmorphism effects are theme-adaptive (higher transparency in light mode, lower in dark mode)
- Font sizes are user-adjustable and persist across sessions
- Caching provides multi-tier performance (memory <100ms, storage ~100ms, API <2000ms)
- iOS polish ensures native app feeling with spring animations, momentum scrolling, and safe area handling
