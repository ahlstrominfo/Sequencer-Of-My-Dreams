const RealTimeKeeper = require('./realTimeKeeper');

class Ticker {
    constructor(bpm = 120, timeSignature = [4, 4], sequencer) {
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.currentPulse = 0;
        this.listeners = new Map();
        this.scheduledEvents = [];
        this.pulsesPerSixteenth = 24;
        this.sixteenthsPerBeat = 4;
        this.pulsesPerBeat = this.pulsesPerSixteenth * this.sixteenthsPerBeat;
        this.timeKeeper = new RealTimeKeeper();
        this.lastPulseTime = 0;
        this.sequencer = sequencer;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastPulseTime = this.timeKeeper.getCurrentTime();
            this.currentPulse = 0;
            
            // Send initial plan message for beat 0
            this.notifyListeners('plan', {
                planStartPulse: 0,
                planEndPulse: this.pulsesPerBeat,
            });
            
            this.pulse();
        }
    }

    stop() {
        this.isRunning = false;
        this.reset();
    }

    reset() {
        this.currentPulse = 0;
        this.scheduledEvents = [];
        this.notifyListeners('reset');
    }

    setPosition(bar, beat, sixteenth, pulse) {
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        this.currentPulse = (bar * pulsesPerBar) +
                            (beat * this.pulsesPerBeat) +
                            (sixteenth * this.pulsesPerSixteenth) +
                            pulse;
    }

    setBPM(bpm) {
        this.bpm = bpm;
    }

    setTimeSignature(numerator, denominator) {
        this.timeSignature = [numerator, denominator];
    }

    registerListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(callback);
    }

    unregisterListener(type, callback) {
        if (this.listeners.has(type)) {
            this.listeners.get(type).delete(callback);
        }
    }

    scheduleEvent(pulse, callback, data = {}) {
        if (pulse < this.currentPulse) {
            this.sequencer.logger.log('Attempted to schedule an event in the past. Event will not be scheduled.');
            return;
        }

        this.scheduledEvents.push({
            pulse: pulse,
            callback,
            data
        });

        // Sort events by pulse to ensure they're processed in the correct order
        this.scheduledEvents.sort((a, b) => a.pulse - b.pulse);
    }

    processScheduledEvents() {
        while (this.scheduledEvents.length > 0 && this.scheduledEvents[0].pulse <= this.currentPulse) {
            const event = this.scheduledEvents.shift();
            event.callback(this.getPositionFromPulse(event.pulse));
        }
    }

    sendAllEventsNoteOff() {
        this.scheduleEvent.filter(event => event.data.type === 'noteOff').forEach(event => {
            event.callback(this.getPositionFromPulse(event.pulse));
        });
    }


    pulse() {
        if (!this.isRunning) return;

        const currentTime = this.timeKeeper.getCurrentTime();
        const pulseInterval = this.calculatePulseInterval();

        // Check if it's time for the next pulse
        if (currentTime - this.lastPulseTime >= pulseInterval) {
            this.lastPulseTime = currentTime;

            // Process scheduled events
            this.processScheduledEvents();

            const position = this.getPosition();

            // Notify listeners
            this.notifyListeners('pulse', position);

            if (position.pulse === 0) {
                this.notifyListeners('16th', position);
                if (position.sixteenth === 0) {
                    this.notifyListeners('beat', position);
                    this.handleBeatPlanning();
                    
                    if (position.beat === 0) {
                        this.notifyListeners('bar', position);
                    }
                }
            }

            this.currentPulse++;
        }

        // Schedule next pulse check
        this.timeKeeper.setImmediate(() => this.pulse());
    }

    notifyListeners(type, position) {
        if (this.listeners.has(type)) {
            for (const callback of this.listeners.get(type)) {
                callback(position);
            }
        }
    }

    getPulsesPerBeat() {
        return this.pulsesPerBeat;
    }

    handleBeatPlanning() {
        const nextBeatPulse = this.currentPulse + this.pulsesPerBeat;
        const planPosition = this.getPositionFromPulse(nextBeatPulse);
        
        planPosition.planStartPulse = nextBeatPulse;
        planPosition.planEndPulse = nextBeatPulse + this.pulsesPerBeat;

        this.notifyListeners('plan', planPosition);
    }

    getPosition() {
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        const bar = Math.floor(this.currentPulse / pulsesPerBar);
        const beatInBar = Math.floor((this.currentPulse % pulsesPerBar) / this.pulsesPerBeat);
        const sixteenthInBeat = Math.floor((this.currentPulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
        const pulseInSixteenth = this.currentPulse % this.pulsesPerSixteenth;
        return { 
            bar, 
            beat: beatInBar, 
            sixteenth: sixteenthInBeat, 
            pulse: pulseInSixteenth,
            currentPulse: this.currentPulse 
        };
    }

    calculatePulseInterval() {
        const millisecondsPerMinute = 60000;
        const pulsesPerMinute = this.bpm * this.pulsesPerBeat;
        return millisecondsPerMinute / pulsesPerMinute;
    }

    getStepsPerBeat() {
        return this.sixteenthsPerBeat;
    }

    getPulsesPerStep() {
        return this.pulsesPerSixteenth;
    }

    getGlobalStep(bar, beat, step) {
        return (bar * this.timeSignature[0] * this.getStepsPerBeat()) + (beat * this.getStepsPerBeat()) + step;
    }

    getScheduledPulse(bar, beat, step) {
        return (bar * this.timeSignature[0] * this.pulsesPerBeat) + 
               (beat * this.pulsesPerBeat) + 
               (step * this.getPulsesPerStep());
    }

    getStepDuration(speedMultiplier = 1) {
        const beatsPerSecond = this.bpm / 60;
        const secondsPerBeat = 1 / beatsPerSecond;
        const secondsPerStep = secondsPerBeat / this.getStepsPerBeat();
        return (secondsPerStep * 1000) / speedMultiplier; // Convert to milliseconds
    }

    getPulseFromTime(time) {
        const elapsedTime = time - this.lastPulseTime;
        const pulseInterval = this.calculatePulseInterval();
        return Math.floor(elapsedTime / pulseInterval);
    }

    getTimeFromPulse(pulse) {
        const pulseInterval = this.calculatePulseInterval();
        return this.lastPulseTime + (pulse * pulseInterval);
    }   
    

    getPositionFromPulse(pulse) {
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        const bar = Math.floor(pulse / pulsesPerBar);
        const beatInBar = Math.floor((pulse % pulsesPerBar) / this.pulsesPerBeat);
        const sixteenthInBeat = Math.floor((pulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
        const pulseInSixteenth = pulse % this.pulsesPerSixteenth;
        return { 
            bar, 
            beat: beatInBar, 
            sixteenth: sixteenthInBeat, 
            pulse: pulseInSixteenth,
            currentPulse: pulse 
        };
    }

    getPulsesForSpeedMultiplier(speedMultiplier) {
        const basePulsesPerEvent = this.pulsesPerBeat / 4; // 16th notes
        return Math.round(basePulsesPerEvent / speedMultiplier);
    }
}

module.exports = Ticker;