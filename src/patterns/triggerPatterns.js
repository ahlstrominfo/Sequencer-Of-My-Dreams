// triggerPatterns.js

const TRIGGER_TYPES = {
    INIT: 0,
    BINARY: 1,
    EUCLIDEAN: 2,
    STEP: 3,
};

const TRIGGER_TYPE_NAMES = {
    [TRIGGER_TYPES.INIT]: 'Init',
    [TRIGGER_TYPES.BINARY]: 'Binary',
    [TRIGGER_TYPES.EUCLIDEAN]: 'Euclidean',
    [TRIGGER_TYPES.STEP]: 'Step',
};

class TriggerPattern {
    constructor(pattern) {
        this.pattern = pattern;
        this.triggerSteps = [];
        this.durations = [];
        this._cachedVisualizations = new Map(); // Cache for pattern visualizations
        this.precalculateDurations();
    }

    shouldTrigger(step) {
        return this.pattern[step % this.pattern.length] === 1;
    }

    get length() {
        return this.pattern.length;
    }

    // Optimized pattern visualization with caching
    getVisualization(length = this.pattern.length) {
        const cacheKey = `viz_${length}`;
        if (this._cachedVisualizations.has(cacheKey)) {
            return this._cachedVisualizations.get(cacheKey);
        }
        
        const visualization = Array.from({ length }, (_, i) => 
            this.shouldTrigger(i) ? '■' : '□'
        ).join('');
        
        // Cache the visualization (limit cache size)
        if (this._cachedVisualizations.size >= 10) {
            const firstKey = this._cachedVisualizations.keys().next().value;
            this._cachedVisualizations.delete(firstKey);
        }
        this._cachedVisualizations.set(cacheKey, visualization);
        
        return visualization;
    }

    applyResyncInterval(resyncInterval) {
        if (resyncInterval && resyncInterval > 0 && this.pattern.length > 0) {
            let newPattern = [];
            while (newPattern.length < resyncInterval) {
                newPattern = newPattern.concat(this.pattern);
            }
            this.pattern = newPattern.slice(0, resyncInterval);
            this._cachedVisualizations.clear(); // Clear cache when pattern changes
            this.precalculateDurations();
        }
    }

    precalculateDurations() {
        this.triggerSteps = [];
        this.durations = [];
        let lastTriggerStep = -1;

        for (let i = 0; i < this.pattern.length; i++) {
            if (this.shouldTrigger(i)) {
                if (lastTriggerStep !== -1) {
                    this.durations.push(i - lastTriggerStep);
                }
                this.triggerSteps.push(i);
                lastTriggerStep = i;
            }
        }

        // Handle the wrap-around case
        if (lastTriggerStep !== -1) {
            this.durations.push(this.pattern.length + this.triggerSteps[0] - lastTriggerStep);
        }
    }
}

class InitTriggerPattern extends TriggerPattern {
    constructor(steps) {
        super(new Array(steps).fill(0));
    }
}

class BinaryTriggerPattern extends TriggerPattern {
    static fromNumbers(numbers) {
        const pattern = new Array(numbers.length * 4).fill(0);
        numbers.forEach((num, index) => {
            const binary = num.toString(2).padStart(4, '0');
            binary.split('').forEach((bit, bitIndex) => {
                pattern[index * 4 + bitIndex] = bit === '1' ? 1 : 0;
            });
        });
        return new BinaryTriggerPattern(pattern);
    }
}

class EuclideanTriggerPattern extends TriggerPattern {
    constructor(length, hits, shift = 0) {
        const pattern = new Array(length).fill(0);
        for (let i = 0; i < hits; i++) {
            pattern[Math.floor(i * length / hits)] = 1;
        }
        super(pattern.slice(shift).concat(pattern.slice(0, shift)));
    }
}

class StepTriggerPattern extends TriggerPattern {
    constructor(steps) {
        const pattern = new Array(16).fill(0);
        steps.forEach(step => pattern[step] = 1);
        super(pattern);
    }
}

function createTriggerPattern(type, settings) {
    switch (type) {
        case TRIGGER_TYPES.BINARY:
            return BinaryTriggerPattern.fromNumbers(settings.numbers || []);
        case TRIGGER_TYPES.EUCLIDEAN:
            return new EuclideanTriggerPattern(
                settings.length || 16,
                settings.hits || 4,
                settings.shift || 0
            );
        case TRIGGER_TYPES.STEP:
            return new StepTriggerPattern(settings.steps || []);
        case TRIGGER_TYPES.INIT:
        default:
            return new InitTriggerPattern(settings.steps || 16);
    }
}

// Pattern cache to avoid recreating identical patterns
const patternCache = new Map();

function generateCacheKey(triggerType, triggerSettings, resyncInterval) {
    return JSON.stringify({
        type: triggerType,
        settings: triggerSettings,
        resync: resyncInterval || 0
    });
}

function triggerPatternFromSettings(settings) {
    const { triggerType, triggerSettings, resyncInterval } = settings;
    
    // Check cache first
    const cacheKey = generateCacheKey(triggerType, triggerSettings, resyncInterval);
    if (patternCache.has(cacheKey)) {
        return patternCache.get(cacheKey);
    }
    
    const pattern = createTriggerPattern(triggerType, triggerSettings);
    
    if (resyncInterval) {
        pattern.applyResyncInterval(resyncInterval);
    }
    
    // Cache the pattern (limit cache size to prevent memory leaks)
    if (patternCache.size >= 100) {
        // Remove oldest entry
        const firstKey = patternCache.keys().next().value;
        patternCache.delete(firstKey);
    }
    patternCache.set(cacheKey, pattern);
    
    return pattern;
}

// Clear pattern cache (useful for memory management)
function clearPatternCache() {
    patternCache.clear();
}

// Get cache statistics for monitoring
function getPatternCacheStats() {
    return {
        size: patternCache.size,
        keys: Array.from(patternCache.keys())
    };
}

module.exports = {
    BinaryTriggerPattern,
    EuclideanTriggerPattern,
    InitTriggerPattern,
    StepTriggerPattern,
    TRIGGER_TYPES,
    TRIGGER_TYPE_NAMES,
    triggerPatternFromSettings,
    clearPatternCache,
    getPatternCacheStats
};