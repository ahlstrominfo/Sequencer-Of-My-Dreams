const {triggerPatternFromSettings} = require('../patterns/triggerPatterns');
const TrackNotes = require('./trackNotes');

class TrackPlan {
    constructor(track, sequencer) {
        this.track = track;
        this.trackNotes = new TrackNotes(track);
        this.sequencer = sequencer;
        this.currentTriggerStep = 0;
        this.currentVisualStep = 0; // Sequential step for UI visualization
        this.registeredListeners = {};
        this.cachedDurations = [];
        
        // Pattern caching optimization
        this._patternCacheKey = null;
        this._lastSpeedMultiplier = null;
        this._lastPulsesPerSixteenth = null;
        
        // Memory management
        this._isDestroyed = false;
        
        this.setupTickerListeners();
        this.setTriggerPattern();
    }

    onTrackSettingsUpdate(newSettings) {
        // Only regenerate pattern if trigger-related settings changed
        const needsPatternUpdate = this._shouldUpdatePattern(newSettings);
        
        if (needsPatternUpdate) {
            this.setTriggerPattern();
        } else if (this._shouldUpdateDurations(newSettings)) {
            // Only recalculate durations if speed changed but pattern stays the same
            this._updateCachedDurations();
        }

        this.trackNotes.onTrackSettingsUpdate(newSettings);
    }

    _shouldUpdatePattern(newSettings) {
        return 'triggerType' in newSettings || 
               'triggerSettings' in newSettings || 
               'resyncInterval' in newSettings;
    }

    _shouldUpdateDurations(newSettings) {
        return 'speedMultiplier' in newSettings;
    }

    _generatePatternCacheKey() {
        const { triggerType, triggerSettings, resyncInterval } = this.track.settings;
        return JSON.stringify({
            type: triggerType,
            settings: triggerSettings,
            resync: resyncInterval || 0
        });
    }

    _updateCachedDurations() {
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerSixteenth = this.sequencer.ticker.pulsesPerSixteenth;
        
        // Cache these values to avoid repeated calculations
        this._lastSpeedMultiplier = speedMultiplier;
        this._lastPulsesPerSixteenth = pulsesPerSixteenth;
        
        this.cachedDurations = this.durations.map(stepDuration => 
            Math.round((stepDuration * pulsesPerSixteenth) / speedMultiplier)
        );
    }

    setTriggerPattern() {
        // Check if pattern actually needs to be regenerated
        const newCacheKey = this._generatePatternCacheKey();
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerSixteenth = this.sequencer.ticker.pulsesPerSixteenth;
        
        const patternChanged = this._patternCacheKey !== newCacheKey;
        const speedChanged = this._lastSpeedMultiplier !== speedMultiplier;
        const pulsesChanged = this._lastPulsesPerSixteenth !== pulsesPerSixteenth;
        
        if (patternChanged) {
            // Pattern actually changed, regenerate
            this.triggerPattern = triggerPatternFromSettings(this.track.settings);
            this.triggerSteps = this.triggerPattern.triggerSteps;
            this.durations = this.triggerPattern.durations;
            this.currentTriggerStep = this.currentTriggerStep >= this.triggerPattern.length ? 0 : this.currentTriggerStep;
            this.currentVisualStep = 0; // Reset visual step when pattern changes
            this._patternCacheKey = newCacheKey;
        }
        
        if (patternChanged || speedChanged || pulsesChanged) {
            // Recalculate durations
            this._updateCachedDurations();
        }
    }

    setupTickerListeners() {
        this.registeredListeners.plan = this.sequencer.ticker.registerListener('plan', (position) => {
            this.planEvents(position);
        });

        this.registeredListeners.reset = this.sequencer.ticker.registerListener('reset', () => {
            this.currentTriggerStep = 0;
            this.currentVisualStep = 0;
        });

    }

    teardownTickerListeners() {
        if (this.registeredListeners.plan) {
            this.sequencer.ticker.unregisterListener('plan', this.registeredListeners.plan);
            this.registeredListeners.plan = null;
        }
        if (this.registeredListeners.reset) {
            this.sequencer.ticker.unregisterListener('reset', this.registeredListeners.reset);
            this.registeredListeners.reset = null;
        }
    }

    planEvents(position) {
        const { planStartPulse, planEndPulse } = position;
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerEvent = this.sequencer.ticker.getPulsesForSpeedMultiplier(speedMultiplier);

        
        for (let pulse = planStartPulse; pulse < planEndPulse; pulse++) {
            if (this.shouldTriggerEventAtPulse(pulse, pulsesPerEvent)) {
                // Always advance visual step on each timing event (for UI display)
                this.updateCurrentVisualStep();
                
                // Handle trigger logic
                if (this.hasTriggerStepAt()) {
                    if (this.track.settings.isActive) {
                        this.trackNotes.scheduleNotes({
                            startPulse: pulse,
                            endPulse: pulse + this.durationForTriggerStep(),
                            maxDuration: this.durationForTriggerStep(), 
                            defaultDuration: pulsesPerEvent,
                            currentTriggerStep: this.getTriggerStep(),
                        });
                    }
                }
                
                // Advance trigger step (this determines which pattern position we're checking)
                this.updateCurrentTriggerStep();
            }
        }
    }

    durationForTriggerStep() {
        const triggerStep = this.getTriggerStep();
        return triggerStep === -1 ? 0 : this.cachedDurations[triggerStep];
    }

    hasTriggerStepAt() {
        return this.getTriggerStep() !== -1;
    }

    getTriggerStep() {
        return this.triggerSteps.indexOf(this.currentTriggerStep);
    };

    updateCurrentTriggerStep() {
        this.currentTriggerStep = (this.currentTriggerStep + 1);
        if (this.currentTriggerStep >= this.triggerPattern.length) {
            this.currentTriggerStep = 0;
        }
    }

    updateCurrentVisualStep() {
        this.currentVisualStep = (this.currentVisualStep + 1);
        if (this.currentVisualStep >= this.triggerPattern.length) {
            this.currentVisualStep = 0;
        }
    }

    shouldTriggerEventAtPulse(pulse, pulsesPerEvent) {
        // Check if this pulse should trigger an event based on the adjusted interval
        return pulse % pulsesPerEvent === 0;
    }

    // Performance monitoring for pattern optimization
    getPatternStats() {
        return {
            trackId: this.track.trackId,
            patternCacheKey: this._patternCacheKey,
            patternLength: this.triggerPattern ? this.triggerPattern.length : 0,
            triggerStepsCount: this.triggerSteps ? this.triggerSteps.length : 0,
            cachedDurationsCount: this.cachedDurations ? this.cachedDurations.length : 0,
            lastSpeedMultiplier: this._lastSpeedMultiplier,
            lastPulsesPerSixteenth: this._lastPulsesPerSixteenth
        };
    }

    // Clean up method to prevent memory leaks
    cleanup() {
        if (this._isDestroyed) {
            return; // Already cleaned up
        }
        
        this._isDestroyed = true;
        
        // Clean up ticker listeners
        this.teardownTickerListeners();
        
        // Clean up trackNotes
        if (this.trackNotes) {
            this.trackNotes.cleanup();
            this.trackNotes = null;
        }
        
        // Clear cached data
        this.cachedDurations = [];
        this.triggerSteps = null;
        this.durations = null;
        this.triggerPattern = null;
        
        // Clear cache keys
        this._patternCacheKey = null;
        this._lastSpeedMultiplier = null;
        this._lastPulsesPerSixteenth = null;
        
        // Clear references
        this.track = null;
        this.sequencer = null;
        this.registeredListeners = {};
    }

    // Ensure cleanup is called before destruction
    destroy() {
        this.cleanup();
    }

    // Get memory usage statistics
    getMemoryStats() {
        return {
            trackId: this.track ? this.track.trackId : 'destroyed',
            isDestroyed: this._isDestroyed,
            cachedDurationsLength: this.cachedDurations ? this.cachedDurations.length : 0,
            hasPatternCacheKey: Boolean(this._patternCacheKey),
            hasTriggerPattern: Boolean(this.triggerPattern),
            registeredListenersCount: Object.keys(this.registeredListeners).length,
            trackNotesStats: this.trackNotes ? this.trackNotes.getMemoryStats() : null
        };
    }
}

module.exports = TrackPlan;