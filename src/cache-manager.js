// src/cache-manager.js - 3-Layer Intelligent Cache System

class CacheManager {
    constructor(options = {}) {
        // Layer 1: Memory Cache (Fastest)
        this.memoryCache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 3600000; // 1 hour default

        // Layer 2: LRU Cache (Medium speed)
        this.lruCache = new Map();
        this.lruMaxSize = options.lruMaxSize || 500;

        // Layer 3: Pattern Cache (Optimized)
        this.patternCache = new Map();
        
        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            hitRate: 0,
            memorySize: 0,
            lruSize: 0,
            patternSize: 0
        };

        // Initialize
        this._setupCleanup();
    }

    // ============================================
    // CORE OPERATIONS
    // ============================================

    get(key) {
        // Check memory cache first (Layer 1)
        if (this.memoryCache.has(key)) {
            const entry = this.memoryCache.get(key);
            if (!this._isExpired(entry)) {
                this.stats.hits++;
                this._updateHitRate();
                return entry.value;
            } else {
                this.memoryCache.delete(key);
                this.stats.evictions++;
            }
        }

        // Check LRU cache (Layer 2)
        if (this.lruCache.has(key)) {
            const entry = this.lruCache.get(key);
            if (!this._isExpired(entry)) {
                this.stats.hits++;
                this._updateHitRate();
                // Promote to memory cache
                this._promoteToMemory(key, entry.value);
                return entry.value;
            } else {
                this.lruCache.delete(key);
                this.stats.evictions++;
            }
        }

        // Check pattern cache (Layer 3)
        const patternKey = this._extractPattern(key);
        if (patternKey && this.patternCache.has(patternKey)) {
            const entry = this.patternCache.get(patternKey);
            if (!this._isExpired(entry)) {
                this.stats.hits++;
                this._updateHitRate();
                // Generate from pattern
                const result = this._applyPattern(entry.value, key);
                // Cache in memory
                this._setMemory(key, result);
                return result;
            } else {
                this.patternCache.delete(patternKey);
                this.stats.evictions++;
            }
        }

        this.stats.misses++;
        this._updateHitRate();
        return null;
    }

    set(key, value, ttl = this.ttl) {
        // Store in memory cache (Layer 1)
        this._setMemory(key, value, ttl);
        
        // Store in LRU cache (Layer 2) if memory is full
        if (this.memoryCache.size >= this.maxSize) {
            this._setLRU(key, value, ttl);
        }

        // Extract and store pattern (Layer 3)
        const pattern = this._extractPattern(key);
        if (pattern && !this.patternCache.has(pattern)) {
            this.patternCache.set(pattern, {
                value: this._extractTemplate(value),
                timestamp: Date.now(),
                ttl: ttl * 2 // Pattern cache lasts longer
            });
            this.stats.patternSize = this.patternCache.size;
        }

        this.stats.sets++;
        this._updateStats();
    }

    clear() {
        this.memoryCache.clear();
        this.lruCache.clear();
        this.patternCache.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            hitRate: 0,
            memorySize: 0,
            lruSize: 0,
            patternSize: 0
        };
    }

    getStats() {
        return {
            ...this.stats,
            memorySize: this.memoryCache.size,
            lruSize: this.lruCache.size,
            patternSize: this.patternCache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
            memoryUsage: {
                hits: this.stats.hits,
                misses: this.stats.misses,
                hitRate: this.stats.hitRate,
                totalRequests: this.stats.hits + this.stats.misses
            }
        };
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    _setMemory(key, value, ttl = this.ttl) {
        // Evict oldest if at max
        if (this.memoryCache.size >= this.maxSize) {
            const oldestKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(oldestKey);
            this.stats.evictions++;
        }

        this.memoryCache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
        this.stats.memorySize = this.memoryCache.size;
    }

    _setLRU(key, value, ttl = this.ttl) {
        if (this.lruCache.size >= this.lruMaxSize) {
            const oldestKey = this.lruCache.keys().next().value;
            this.lruCache.delete(oldestKey);
            this.stats.evictions++;
        }

        this.lruCache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
        this.stats.lruSize = this.lruCache.size;
    }

    _promoteToMemory(key, value) {
        this._setMemory(key, value);
        this.lruCache.delete(key);
    }

    _isExpired(entry) {
        if (!entry) return true;
        return Date.now() - entry.timestamp > entry.ttl;
    }

    _extractPattern(key) {
        // Extract common patterns from cache keys
        const parts = key.split(':');
        if (parts.length >= 2) {
            const content = parts.slice(1).join(':');
            const patterns = [
                /express|server|api/i,
                /react|component|hook/i,
                /model|schema|database/i,
                /utility|function|helper/i,
                /auth|middleware|security/i
            ];
            for (const pattern of patterns) {
                if (pattern.test(content)) {
                    return pattern.source;
                }
            }
        }
        return null;
    }

    _extractTemplate(value) {
        if (typeof value === 'object' && value.code) {
            return value.code.slice(0, 100);
        }
        return typeof value === 'string' ? value.slice(0, 100) : null;
    }

    _applyPattern(pattern, key) {
        return {
            code: `// Generated from pattern: ${pattern}\n// Key: ${key}\n\n${pattern || '// Template code'}`,
            source: 'Pattern Cache',
            cached: true,
            generationTime: '0.001ms'
        };
    }

    _updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }

    _updateStats() {
        this.stats.memorySize = this.memoryCache.size;
        this.stats.lruSize = this.lruCache.size;
        this.stats.patternSize = this.patternCache.size;
    }

    _setupCleanup() {
        // Clean expired entries every 5 minutes
        setInterval(() => {
            const now = Date.now();
            
            // Clean memory cache
            for (const [key, entry] of this.memoryCache) {
                if (now - entry.timestamp > entry.ttl) {
                    this.memoryCache.delete(key);
                    this.stats.evictions++;
                }
            }

            // Clean LRU cache
            for (const [key, entry] of this.lruCache) {
                if (now - entry.timestamp > entry.ttl) {
                    this.lruCache.delete(key);
                    this.stats.evictions++;
                }
            }

            // Clean pattern cache
            for (const [key, entry] of this.patternCache) {
                if (now - entry.timestamp > (entry.ttl || this.ttl * 2)) {
                    this.patternCache.delete(key);
                    this.stats.evictions++;
                }
            }

            this._updateStats();
            this._updateHitRate();
        }, 300000); // 5 minutes
    }
}

module.exports = CacheManager;
