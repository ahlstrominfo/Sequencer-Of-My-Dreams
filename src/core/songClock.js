const { hrtime } = require('process');

class SongClock {
    constructor(bpm = 120, ppq = 96, timeSignature = [4, 4], timeKeeper) {
        this.bpm = bpm;
        this.ppq = ppq;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.startTime = 0n;
        this.clockTick = 0;
        this.lastClockTime = 0n;
        this.clockAccumulator = 0n;
        this.onClockTickCallback = null;
        this.onQuarterNoteCallback = null;
        this.onBarChangeCallback = null;
        this.lastQuarterNoteTime = 0n;
        this.stepsPerBeat = ppq / 24;
        this.timeKeeper = timeKeeper;
        this.midiClockInterval = this.calculateMidiClockInterval(bpm);
    }

    // calculateMidiClockInterval(bpm) {
    //     return BigInt(Math.floor((60 * 1e9) / (bpm * 24))); // MIDI clock is 24 ppq
    // }
    calculateMidiClockInterval(bpm) {
        return this.timeKeeper.msToNano(60000 / (bpm * 24));
    }    

    reset() {
        const now = this.timeKeeper.getHighResolutionTime();
        this.startTime = now;
        this.lastClockTime = now;
        this.lastQuarterNoteTime = now;
        this.clockAccumulator = 0n;
        this.clockTick = 0;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.reset();
            
            // Trigger the first quarter note immediately
            if (this.onQuarterNoteCallback) {
                this.onQuarterNoteCallback(this.getCurrentTime(), this.bpm, 0);
            }
            
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
        return this.timeKeeper.nanoToMs(this.timeKeeper.getHighResolutionTime() - this.startTime);
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
        const currentTime = this.timeKeeper.getHighResolutionTime();
        const elapsedNanos = currentTime - this.startTime;
        const elapsedSeconds = this.timeKeeper.nanoToMs(elapsedNanos) / 1000;

        const beatsPerSecond = this.bpm / 60;
        const totalBeats = elapsedSeconds * beatsPerSecond;

        const bar = Math.floor(totalBeats / this.timeSignature[0]);
        const beat = Math.floor(totalBeats % this.timeSignature[0]);
        const tick = Math.floor((totalBeats % 1) * this.ppq);

        const fullBeats = bar * this.timeSignature[0] + beat;
        const totalSteps = fullBeats * this.stepsPerBeat + Math.floor(tick / 24);
        const globalStep = totalSteps;

        return { bar, beat, tick, totalSteps, globalStep };
    }

    getTimeAtPosition(position) {
        const { bar, beat, tick } = position;
        const beatsPerBar = this.timeSignature[0];
        const totalBeats = (bar * beatsPerBar) + beat + (tick / this.ppq);
        const timeInSeconds = (totalBeats * 60) / this.bpm;
        return timeInSeconds * 1000; // Convert to milliseconds
    }

    getPositionFromTime(time) {
        const beatsElapsed = (time / 60000) * this.bpm;
        const bar = Math.floor(beatsElapsed / this.timeSignature[0]);
        const beat = Math.floor(beatsElapsed % this.timeSignature[0]);
        const tick = Math.floor((beatsElapsed % 1) * this.ppq);
        return { bar, beat, tick };
    }

    getGlobalStepAtTime(time) {
        const { bar, beat, tick } = this.getPositionFromTime(time);
        const beatsPerBar = this.timeSignature[0];
        const stepsPerBeat = this.timeSignature[1]; // Assuming 16th note resolution
        const totalBeats = (bar * beatsPerBar) + beat;
        const stepsFromBeats = totalBeats * stepsPerBeat;
        const stepsFromTicks = Math.floor(tick / (this.ppq / stepsPerBeat));
        return stepsFromBeats + stepsFromTicks;
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
    
        const currentTime = this.timeKeeper.getHighResolutionTime();
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
                const actualInterval = this.timeKeeper.nanoToMs(currentTime - this.lastQuarterNoteTime);
                const expectedInterval = 60000 / this.bpm;
                const drift = actualInterval - expectedInterval;
                
                //console.log(`Quarter note at tick ${this.clockTick}. Actual interval: ${actualInterval.toFixed(2)}ms, Expected: ${expectedInterval.toFixed(2)}ms, Drift: ${drift.toFixed(2)}ms`);
                
                if (this.onQuarterNoteCallback) {
                    this.onQuarterNoteCallback(this.getCurrentTime(), this.bpm, drift);
                }
                
                this.lastQuarterNoteTime = currentTime;
            }
    
            // Check for bar change
            const { bar, beat } = this.getPosition();
            if (beat === 0 && this.clockTick % 24 === 0 && this.onBarChangeCallback) {
                this.onBarChangeCallback(bar);
            }
        }
    
        this.lastClockTime = currentTime;
    
        // Schedule next clock check
        this.timeKeeper.setImmediate(() => this.clockLoop());
    }

    fastForward(bars) {
        if (!this.isRunning) return;
        const currentPosition = this.getPosition();
        const newPosition = {
            bar: currentPosition.bar + bars,
            beat: currentPosition.beat,
            tick: currentPosition.tick
        };
        this.setPosition(newPosition);
    }

    rewind(bars) {
        if (!this.isRunning) return;
        const currentPosition = this.getPosition();
        const newPosition = {
            bar: Math.max(0, currentPosition.bar - bars),
            beat: currentPosition.beat,
            tick: currentPosition.tick
        };
        this.setPosition(newPosition);
    }

    setPosition(position) {
        const newTime = this.getTimeAtPosition(position);
        const elapsed = newTime - this.getCurrentTime();
        this.startTime -= this.timeKeeper.msToNano(elapsed);
        this.clockTick = Math.floor((newTime / 1000) * 24 * (this.bpm / 60));
        this.lastClockTime = this.timeKeeper.getHighResolutionTime() - this.timeKeeper.msToNano(newTime % (1000 / 24));
        this.clockAccumulator = 0n;

        if (this.onBarChangeCallback) {
            this.onBarChangeCallback(position.bar);
        }
    }

    calculateTickDuration() {
        return (60 / this.bpm / this.ppq) * 1000;
    }    
}

module.exports = SongClock;