const RealTimeKeeper = require('./realTimeKeeper');

class Ticker {
    constructor(bpm = 120, timeSignature = [4, 4], sequencer) {
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.currentPulse = 0;
        this.listeners = new Map();
        this.listenerIdCounter = 0;
        this.scheduledEvents = [];
        this.pulsesPerBeat = 24;
        this.pulsesPerSixteenth = 6; // or 24 pleeeeese    
        this.sixteenthsPerBeat = 4;
        this.pulsesPerBeat = this.pulsesPerSixteenth * this.sixteenthsPerBeat;
        this.timeKeeper = new RealTimeKeeper();
        this.lastPulseTime = 0;

        this.postionFromPulseData = new Set();

        this.positionCache = new Map();

        this.lastPosition = 0;
        this.lastPositionData = null;
    
        this.pulseInterval = this.calculatePulseInterval();

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
        this.sendAllNoteOffEvents();
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
        this.pulseInterval = this.calculatePulseInterval();
    }

    setTimeSignature(numerator, denominator) {
        this.timeSignature = [numerator, denominator];
    }

    registerListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Map());
        }
        const id = this.generateListenerId();
        this.listeners.get(type).set(id, callback);
        return id;
    }

    unregisterListener(type, id) {
        if (this.listeners.has(type)) {
            return this.listeners.get(type).delete(id);
        }
        return false;
    }

    generateListenerId() {
        return `listener_${++this.listenerIdCounter}`;
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

            this.notifyListeners('eventHappening', event);
        }
    }

     pulse() {
        if (!this.isRunning) return;

        const currentTime = this.timeKeeper.getCurrentTime();
        const pulseInterval = this.pulseInterval;

        // Check if it's time for the next pulse
        if (currentTime - this.lastPulseTime >= pulseInterval) {
            // this.sequencer.logger.log(`Current time: ${currentTime}, last pulse time: ${this.lastPulseTime}, pulse interval: ${pulseInterval}`);    
            this.lastPulseTime = currentTime;

            // Process scheduled events
            this.processScheduledEvents();

            const position = this.getPosition();

            // Notify listeners
            this.notifyListeners('pulse', position);
            // this.sequencer.midi.sendClock();

            if (this.positionCache.size > 100) {
                this.positionCache.clear();
            }

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
        this.timeKeeper.setTimeout(() => this.pulse(), 1);
    }

    notifyListeners(type, position) {
        if (this.listeners.has(type)) {
            for (const callback of this.listeners.get(type).values()) {
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
        if (this.lastPosition !== this.currentPulse || !this.lastPositionData) {
            const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
            const bar = Math.floor(this.currentPulse / pulsesPerBar);
            const beatInBar = Math.floor((this.currentPulse % pulsesPerBar) / this.pulsesPerBeat);
            const sixteenthInBeat = Math.floor((this.currentPulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
            const pulseInSixteenth = this.currentPulse % this.pulsesPerSixteenth;
            this.lastPositionData = { 
                bar, 
                beat: beatInBar, 
                sixteenth: sixteenthInBeat, 
                pulse: pulseInSixteenth,
                currentPulse: this.currentPulse 
            };
            this.lastPosition = this.currentPulse;
        }
        return this.lastPositionData;
    }

    calculatePulseInterval() {
        const millisecondsPerMinute = 60000;
        const pulsesPerMinute = this.bpm * this.pulsesPerBeat;
        const interval = millisecondsPerMinute / pulsesPerMinute;
        console.log(`BPM: ${this.bpm}, Pulses per beat: ${this.pulsesPerBeat}, Calculated interval: ${interval}ms`);
        return interval;
    }

    getPositionFromPulse(pulse) {
        if (this.positionCache.has(pulse)) {
            return this.positionCache.get(pulse);
        }
    
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        const bar = Math.floor(pulse / pulsesPerBar);
        const beatInBar = Math.floor((pulse % pulsesPerBar) / this.pulsesPerBeat);
        const sixteenthInBeat = Math.floor((pulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
        const pulseInSixteenth = pulse % this.pulsesPerSixteenth;
        
        const position = { 
            bar, 
            beat: beatInBar, 
            sixteenth: sixteenthInBeat, 
            pulse: pulseInSixteenth,
            currentPulse: pulse 
        };
    
        this.positionCache.set(pulse, position);
        return position;
    }

    getPulsesForSpeedMultiplier(speedMultiplier) {
        const basePulsesPerEvent = this.pulsesPerBeat / 4; // 16th notes
        return Math.round(basePulsesPerEvent / speedMultiplier);
    }

    removeFutureNoteOffFromScheduledEvents(pulse, note, channel) {
        this.scheduledEvents = this.scheduledEvents.filter(event => {
            if (event.data.type === 'noteOff' 
                && event.pulse > pulse
                && event.data.note === note
                && event.data.channel === channel) {
                return false;
            }
            return true;
        });
    }

    sendAllNoteOffEvents() {
        const noteOffEvents = this.scheduledEvents.filter(event => 
            event.data.type === 'noteoff'
        );

        noteOffEvents.forEach(event => {
            // Call the callback immediately
            event.callback(this.getPosition());
        });

        // Notify listeners that note off events have been sent
        this.notifyListeners('allNoteOffSent', this.getPosition());
    }
    
    clearAllListeners() {
        this.listeners.clear();
    }
}

module.exports = Ticker;