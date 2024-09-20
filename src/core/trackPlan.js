const {triggerPatternFromSettings} = require('../patterns/triggerPatterns');
class TrackPlan {
    constructor(track, sequencer) {
        this.track = track;
        this.sequencer = sequencer;
        this.currentTriggerStep = 0;
        this.setupTickerListeners();
        this.setTriggerPattern();
    }

    onTrackSettingsUpdate(newSettings) {
        if ('triggerType' in newSettings || 'triggerSettings' in newSettings || 'resyncInterval' in newSettings) {
            this.setTriggerPattern();
        }
    }

    setTriggerPattern() {
        this.triggerPattern = triggerPatternFromSettings(this.track.settings);
        this.triggerSteps = this.triggerPattern.triggerSteps;
        this.durations = this.triggerPattern.durations;
        this.currentTriggerStep = 0;
    }

    setupTickerListeners() {
        this.sequencer.ticker.registerListener('plan', (position) => {
            this.planEvents(position);
        });

        this.sequencer.ticker.registerListener('reset', () => {
            this.currentTriggerStep = 0;
        });
    }

    planEvents(position) {
        const { planStartPulse, planEndPulse } = position;
        const speedMultiplier = this.track.settings.speedMultiplier;

        // Get pulses per event from Ticker
        const pulsesPerEvent = this.sequencer.ticker.getPulsesForSpeedMultiplier(speedMultiplier);

        for (let pulse = planStartPulse; pulse < planEndPulse; pulse++) {
            if (this.shouldTriggerEventAtPulse(pulse, pulsesPerEvent)) {
                if (this.hasTriggerStepAt() && this.checkTrackProbability()) {
                    this.scheduleEvent(pulse);
                }
                this.updateCurrentTriggerStep();
            }
        }
    }

    checkTrackProbability() {
        return Math.random() * 100 < this.track.settings.probability;
    }

    durationForTriggerStep() {
        if (this.getTriggerStep() === -1) {
            return 0;
        }
        return this.durations[this.getTriggerStep()];
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

    scheduleEvent(plannedPulse) {
        let note = null;

        switch (this.track.trackId) {
            case 0:
                note = 36;
                break;
            case 1:
                note = 38;
                break;
            case 2:
                note = 42;
                break;
            case 3:
                note = 46;
                break;
        }


        if (note !== null) {
            
            // this.sequencer.logger.log(`I'm at currentPulse: ${this.sequencer.ticker.getPosition().currentPulse} and planning for: ${plannedPulse}`);   
            this.sequencer.ticker.scheduleEvent(
                { pulse: plannedPulse },
                (position) => {
                    
                        // this.sequencer.logger.log(`Now I run a planned event at ${position.currentPulse}`); // ${JSON.stringify(position)}

                        this.sequencer.midi.output.send('noteon', 
                            {
                                note: note,
                                velocity: 127,
                                channel: 1,
                            }
                        );

                        setTimeout(() => {
                            this.sequencer.midi.output.send('noteoff', 
                                {
                                    note: note  ,
                                    velocity: 0,
                                    channel: 1,
                                }
                            );
                        }, 10);
       
                    
                },
                {
                    type: 'noteOn',
                }
            );
        }
    }
}

module.exports = TrackPlan;