const {triggerPatternFromSettings} = require('../patterns/triggerPatterns');
const TrackNotes = require('./trackNotes');

class TrackPlan {
    constructor(track, sequencer) {
        this.track = track;
        this.trackNotes = new TrackNotes(track);
        this.sequencer = sequencer;
        this.currentTriggerStep = 0;
        this.registeredListeners = {};
        this.cachedDurations = [];
        this.setupTickerListeners();
        this.setTriggerPattern();
    }

    onTrackSettingsUpdate(newSettings) {
        if ('triggerType' in newSettings || 'triggerSettings' in newSettings || 'resyncInterval' in newSettings || 'speedMultiplier' in newSettings) {
            this.setTriggerPattern();
        }

        this.trackNotes.onTrackSettingsUpdate(newSettings);
    }

    setTriggerPattern() {
        this.triggerPattern = triggerPatternFromSettings(this.track.settings);
        this.triggerSteps = this.triggerPattern.triggerSteps;
        this.durations = this.triggerPattern.durations;
        this.currentTriggerStep = this.currentTriggerStep >= this.triggerPattern.length ? 0 : this.currentTriggerStep;
        
        // Calculate and cache the durations
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerSixteenth = this.sequencer.ticker.pulsesPerSixteenth;
        this.cachedDurations = this.durations.map(stepDuration => 
            Math.round((stepDuration * pulsesPerSixteenth) / speedMultiplier)
        );
    }

    setupTickerListeners() {
        this.registeredListeners.plan = this.sequencer.ticker.registerListener('plan', (position) => {
            this.planEvents(position);
        });

        this.registeredListeners.reset = this.sequencer.ticker.registerListener('reset', () => {
            this.currentTriggerStep = 0;
        });
    }

    teardownTickerListeners() {
        this.sequencer.ticker.unregisterListener('plan', this.registeredListeners.plan);
        this.sequencer.ticker.unregisterListener('reset', this.registeredListeners.reset);
    }

    planEvents(position) {
        const { planStartPulse, planEndPulse } = position;
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerEvent = this.sequencer.ticker.getPulsesForSpeedMultiplier(speedMultiplier);

        
        for (let pulse = planStartPulse; pulse < planEndPulse; pulse++) {
            if (this.shouldTriggerEventAtPulse(pulse, pulsesPerEvent)) {
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

    shouldTriggerEventAtPulse(pulse, pulsesPerEvent) {
        // Check if this pulse should trigger an event based on the adjusted interval
        return pulse % pulsesPerEvent === 0;
    }
}

module.exports = TrackPlan;