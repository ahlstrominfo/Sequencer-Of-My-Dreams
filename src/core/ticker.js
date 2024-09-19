class Ticker {
    constructor(bpm = 120, timeSignature = [4, 4]) {
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.currentPulse = 0;
        this.listeners = new Map();
        this.scheduledEvents = [];
        this.pulsesPerSixteenth = 24;
        this.sixteenthsPerBeat = 4;
        this.pulsesPerBeat = this.pulsesPerSixteenth * this.sixteenthsPerBeat;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
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

    scheduleEvent(pulse, callback) {
        this.scheduledEvents.push({ pulse, callback });
        this.scheduledEvents.sort((a, b) => a.pulse - b.pulse);
    }

    pulse() {
        if (!this.isRunning) return;

        // Process scheduled events
        while (this.scheduledEvents.length > 0 && this.scheduledEvents[0].pulse <= this.currentPulse) {
            const event = this.scheduledEvents.shift();
            event.callback(this.getPosition());
        }

        const position = this.getPosition();

        // Notify listeners
        this.notifyListeners('pulse', position);

        if (position.pulse === 0) {
            this.notifyListeners('16th', position);
            if (position.sixteenth === 0) {
                this.notifyListeners('beat', position);
                if (position.beat === 0) {
                    this.notifyListeners('bar', position);
                }
            }
        }

        // Schedule next planning message at the start of each beat
        if (position.pulse === 0 && position.sixteenth === 0) {
            const nextBeat = {...position};
            nextBeat.beat += 1;
            if (nextBeat.beat >= this.timeSignature[0]) {
                nextBeat.bar += 1;
                nextBeat.beat = 0;
            }
            this.notifyListeners('plan', nextBeat);
        }

        this.currentPulse++;

        // Schedule next pulse
        setTimeout(() => this.pulse(), this.calculatePulseInterval());
    }

    notifyListeners(type, position) {
        if (this.listeners.has(type)) {
            for (const callback of this.listeners.get(type)) {
                callback(position);
            }
        }
    }

    getPosition() {
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        const bar = Math.floor(this.currentPulse / pulsesPerBar);
        const beat = Math.floor((this.currentPulse % pulsesPerBar) / this.pulsesPerBeat);
        const sixteenth = Math.floor((this.currentPulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
        const pulse = this.currentPulse % this.pulsesPerSixteenth;
        return { bar, beat, sixteenth, pulse };
    }

    calculatePulseInterval() {
        const millisecondsPerMinute = 60000;
        const pulsesPerMinute = this.bpm * this.pulsesPerBeat;
        return millisecondsPerMinute / pulsesPerMinute;
    }
}

module.exports = Ticker;