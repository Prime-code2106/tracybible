// ─── ChapterCache: Multi-tier caching with LRU eviction ──────────────────────

class ChapterCache {
  constructor() {
    this.memoryCache = new Map(); // In-memory cache for fastest access
    this.accessLog = new Map(); // Track access times for LRU eviction
    this.maxMemorySize = 50; // Maximum chapters in memory
    this.maxStorageSize = 100; // Maximum chapters in LocalStorage
    this.prefetchQueue = new Set(); // Track pending prefetch operations
    this.STORAGE_PREFIX = 'tb_chapter_';
    this.STORAGE_META = 'tb_cache_meta';
  }

  // Generate cache key from book, chapter, and version
  getCacheKey(book, chapter, version) {
    return `${version}:${book}:${chapter}`;
  }

  // Get chapter with fallback: memory → storage → API
  async getChapter(book, chapter, version, apiFn) {
    const key = this.getCacheKey(book, chapter, version);
    
    // Try memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      this.updateAccessLog(key);
      return this.memoryCache.get(key);
    }

    // Try LocalStorage (fast)
    const stored = this.getFromStorage(key);
    if (stored) {
      this.addToMemory(key, stored);
      this.updateAccessLog(key);
      return stored;
    }

    // Fetch from API (slowest)
    try {
      const verses = await apiFn(book, chapter, version);
      if (verses && verses.length > 0) {
        this.addToMemory(key, verses);
        this.saveToStorage(key, verses, version);
        this.updateAccessLog(key);
      }
      return verses;
    } catch (error) {
      console.error('ChapterCache: Failed to fetch chapter', error);
      return null;
    }
  }

  // Update access timestamp for LRU tracking
  updateAccessLog(key) {
    this.accessLog.set(key, Date.now());
  }

  // Add chapter to memory cache with LRU eviction
  addToMemory(key, verses) {
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.evictLRU();
    }
    this.memoryCache.set(key, verses);
  }

  // Remove least recently used entry from memory
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessLog.entries()) {
      if (time < oldestTime && this.memoryCache.has(key)) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.accessLog.delete(oldestKey);
    }
  }

  // Get chapter from LocalStorage
  getFromStorage(key) {
    try {
      const item = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (item) {
        const parsed = JSON.parse(item);
        return parsed.verses;
      }
    } catch (error) {
      console.error('ChapterCache: Error reading from storage', error);
    }
    return null;
  }

  // Save chapter to LocalStorage with metadata
  saveToStorage(key, verses, version) {
    try {
      const item = {
        verses,
        version,
        timestamp: Date.now(),
        accessCount: 1
      };
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(item));
      this.updateStorageMeta(key);
      this.manageStorageQuota();
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('ChapterCache: Storage quota exceeded, clearing oldest entries');
        this.clearOldestStorageEntries(10);
        // Retry save
        try {
          localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(item));
        } catch (retryError) {
          console.error('ChapterCache: Failed to save after clearing', retryError);
        }
      }
    }
  }

  // Update storage metadata for tracking
  updateStorageMeta(key) {
    try {
      const meta = this.getStorageMeta();
      meta.keys.add(key);
      meta.lastUpdate = Date.now();
      localStorage.setItem(this.STORAGE_META, JSON.stringify({
        keys: Array.from(meta.keys),
        lastUpdate: meta.lastUpdate
      }));
    } catch (error) {
      console.error('ChapterCache: Error updating meta', error);
    }
  }

  // Get storage metadata
  getStorageMeta() {
    try {
      const meta = localStorage.getItem(this.STORAGE_META);
      if (meta) {
        const parsed = JSON.parse(meta);
        return {
          keys: new Set(parsed.keys || []),
          lastUpdate: parsed.lastUpdate || Date.now()
        };
      }
    } catch (error) {
      console.error('ChapterCache: Error reading meta', error);
    }
    return { keys: new Set(), lastUpdate: Date.now() };
  }

  // Manage storage quota by enforcing max size
  manageStorageQuota() {
    const meta = this.getStorageMeta();
    if (meta.keys.size > this.maxStorageSize) {
      const toRemove = meta.keys.size - this.maxStorageSize;
      this.clearOldestStorageEntries(toRemove);
    }
  }

  // Clear oldest entries from storage
  clearOldestStorageEntries(count) {
    try {
      const entries = [];
      const meta = this.getStorageMeta();
      
      // Collect all entries with timestamps
      for (const key of meta.keys) {
        const item = localStorage.getItem(this.STORAGE_PREFIX + key);
        if (item) {
          const parsed = JSON.parse(item);
          entries.push({ key, timestamp: parsed.timestamp || 0 });
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        localStorage.removeItem(this.STORAGE_PREFIX + entries[i].key);
        meta.keys.delete(entries[i].key);
      }

      // Update meta
      localStorage.setItem(this.STORAGE_META, JSON.stringify({
        keys: Array.from(meta.keys),
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('ChapterCache: Error clearing old entries', error);
    }
  }

  // Prefetch adjacent chapters (next and previous) - optimized for speed
  prefetchAdjacent(book, chapter, version, maxChapters, apiFn) {
    const next = chapter + 1;
    const prev = chapter - 1;

    // Prefetch next chapter immediately (most common navigation)
    if (next <= maxChapters) {
      const nextKey = this.getCacheKey(book, next, version);
      if (!this.memoryCache.has(nextKey) && !this.prefetchQueue.has(nextKey)) {
        this.prefetchQueue.add(nextKey);
        setTimeout(() => {
          this.getChapter(book, next, version, apiFn).finally(() => {
            this.prefetchQueue.delete(nextKey);
          });
        }, 100); // Reduced from 500ms to 100ms for faster prefetch
      }
    }

    // Prefetch previous chapter
    if (prev >= 1) {
      const prevKey = this.getCacheKey(book, prev, version);
      if (!this.memoryCache.has(prevKey) && !this.prefetchQueue.has(prevKey)) {
        this.prefetchQueue.add(prevKey);
        setTimeout(() => {
          this.getChapter(book, prev, version, apiFn).finally(() => {
            this.prefetchQueue.delete(prevKey);
          });
        }, 300); // Reduced from 1000ms to 300ms
      }
    }
  }

  // Clear all cached chapters
  clearAll() {
    this.memoryCache.clear();
    this.accessLog.clear();
    this.prefetchQueue.clear();

    const meta = this.getStorageMeta();
    for (const key of meta.keys) {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    }
    localStorage.removeItem(this.STORAGE_META);
  }

  // Clear chapters for specific version
  clearVersion(version) {
    // Clear from memory
    for (const [key] of this.memoryCache.entries()) {
      if (key.startsWith(version + ':')) {
        this.memoryCache.delete(key);
        this.accessLog.delete(key);
      }
    }

    // Clear from storage
    const meta = this.getStorageMeta();
    const keysToRemove = Array.from(meta.keys).filter(k => k.startsWith(version + ':'));
    for (const key of keysToRemove) {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
      meta.keys.delete(key);
    }

    // Update meta
    localStorage.setItem(this.STORAGE_META, JSON.stringify({
      keys: Array.from(meta.keys),
      lastUpdate: Date.now()
    }));
  }

  // Get cache statistics
  getStats() {
    const meta = this.getStorageMeta();
    return {
      memorySize: this.memoryCache.size,
      storageSize: meta.keys.size,
      maxMemorySize: this.maxMemorySize,
      maxStorageSize: this.maxStorageSize
    };
  }
}
