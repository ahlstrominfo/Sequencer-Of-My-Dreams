const { hrtime } = require('process');

class SongClock {
    constructor(bpm = 120, ppq = 96, timeSignature = [4, 4]) {
        this.bpm = bpm;
        this.ppq = ppq;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.startTime = 0n;
        this.clockTick = 0;
        this.lastClockTime = 0n;
        this.midiClockInterval = this.calculateMidiClockInterval(bpm);
        this.clockAccumulator = 0n;
        this.onClockTickCallback = null;
        this.onQuarterNoteCallback = null;
        this.onBarChangeCallback = null;
    }

    calculateMidiClockInterval(bpm) {
        return BigInt(Math.floor((60 * 1e9) / (bpm * 24))); // MIDI clock is 24 ppq
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = hrtime.bigint();
            this.lastClockTime = this.startTime;
            this.clockAccumulator = 0n;
            this.clockTick = 0;
            this.clockLoop();
        }
    }

    stop() {
        this.isRunning = false;
        this.startTime = 0n;
        this.clockTick = 0;
        this.clockAccumulator = 0n;
    }

    getCurrentTime() {
        if (!this.isRunning) return 0;
        return Number(hrtime.bigint() - this.startTime) / 1e6;
    }

    setBPM(bpm) {
        this.bpm = bpm;
        this.midiClockInterval = this.calculateMidiClockInterval(bpm);
    }

    setTimeSignature(numerator, denominator) {
        this.timeSignature = [numerator, denominator];
    }

    setOnClockTickCallback(callback) {
        this.onClockTickCallback = callback;
    }

    setOnQuarterNoteCallback(callback) {
        this.onQuarterNoteCallback = callback;
    }

    setOnBarChangeCallback(callback) {
        this.onBarChangeCallback = callback;
    }

    getPosition() {
        const currentTime = this.getCurrentTime();
        const beatsPerMinute = this.bpm * (this.timeSignature[1] / 4);
        const totalBeats = (currentTime / 60000) * beatsPerMinute;
        const totalBars = totalBeats / this.timeSignature[0];

        const bar = Math.floor(totalBars);
        const beat = Math.floor(totalBeats % this.timeSignature[0]);
        const tick = Math.floor((totalBeats % 1) * this.ppq);

        return { bar, beat, tick };
    }

    getTimeAtPosition(position) {
        const { bar, beat, tick } = position;
        const beatsPerBar = this.timeSignature[0];
        const totalBeats = (bar * beatsPerBar) + beat + (tick / this.ppq);
        const timeInSeconds = (totalBeats * 60) / this.bpm;
        return timeInSeconds * 1000; // Convert to milliseconds
    }

    getPositionAtTime(time) {
        const beatTime = 60 / this.bpm; // Time for one beat in seconds
        const totalBeats = time / (beatTime * 1000); // Convert time to beats

        const beatsPerBar = this.timeSignature[0];
        const bar = Math.floor(totalBeats / beatsPerBar);
        const beat = Math.floor(totalBeats % beatsPerBar);
        const tick = Math.round((totalBeats % 1) * this.ppq);

        return { bar, beat, tick };
    }

    getMidiBeats() {
        const { bar, beat, tick } = this.getPosition();
        const beatsPerBar = this.timeSignature[0];
        const ticksPerBeat = this.ppq;
        return ((bar * beatsPerBar + beat) * 4) + Math.floor(tick / (ticksPerBeat / 4));
    }

    getPositionAtMidiBeats(midiBeats) {
        const beatsPerBar = this.timeSignature[0];
        const ticksPerBeat = this.ppq;

        const totalBeats = midiBeats / 4;
        const bar = Math.floor(totalBeats / beatsPerBar);
        const beat = Math.floor(totalBeats % beatsPerBar);
        const tick = Math.round((totalBeats % 1) * ticksPerBeat);

        return { bar, beat, tick };
    }

    clockLoop() {
        if (!this.isRunning) return;

        const currentTime = hrtime.bigint();
        const elapsed = currentTime - this.lastClockTime;
        this.clockAccumulator += elapsed;

        while (this.clockAccumulator >= this.midiClockInterval) {
            this.clockTick++;
            this.clockAccumulator -= this.midiClockInterval;

            if (this.onClockTickCallback) {
                this.onClockTickCallback(this.clockTick);
            }

            // Every 24 clock ticks is a quarter note (MIDI standard)
            if (this.clockTick % 24 === 0) {
                const actualInterval = Number(currentTime - this.lastClockTime) / 24 / 1e6;
                const drift = actualInterval - Number(this.midiClockInterval) / 1e6;
                if (this.onQuarterNoteCallback) {
                    this.onQuarterNoteCallback(this.getCurrentTime(), (60000 / (actualInterval * 24)), drift);
                }
            }

            // Check for bar change
            const { bar, beat } = this.getPosition();
            if (beat === 0 && this.clockTick % 24 === 0 && this.onBarChangeCallback) {
                this.onBarChangeCallback(bar);
            }
        }

        this.lastClockTime = currentTime;

        // Schedule next clock check
        setImmediate(() => this.clockLoop());
    }
}

module.exports = SongClock;