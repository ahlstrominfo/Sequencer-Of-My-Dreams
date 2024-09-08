const GrooveManager = require('./grooveManager');
const {triggerPatternFromSettings} = require('../patterns/triggerPatterns');
const { generateChord, PLAY_ORDER, ARP_MODES, getArpeggiatedNotes} = require('../utils/utils');

// Constants
const MIDI_MAX_VELOCITY = 127;
const MIDI_MIN_VELOCITY = 0;
const MILLISECONDS_PER_MINUTE = 60000;

class TrackScheduler {
    constructor(track, sequencer) {
        this.track = track;
        this.sequencer = sequencer;
        this.currentStep = 0;
        this.currentNoteIndex = 0;
        this.globalStep = 0;
        this.nextScheduleTime = 0;
        this.activeNotes = new Set();
        this.grooveManager = new GrooveManager(track.settings.groove, track.settings.swingAmount);
        this.noteSeriesCounter = new Array(track.settings.noteSeries.length).fill(1);
        this.pendingResync = false;
        this.pendingResyncBar = false;
        this.pendingReyncTriggerPattern = false;
        this.updateTriggerPattern();
    }

    onTrackSettingsUpdate(newSettings) {
        let shouldResync = false;
        if ('triggerType' in newSettings || 'triggerSettings' in newSettings) {
            // this.updateTriggerPattern();
            this.pendingReyncTriggerPattern = true;
            shouldResync = true;
        }

        if ('noteSeries' in newSettings) {
            this.ensureValidNoteIndex();
            this.noteSeriesCounter = new Array(newSettings.noteSeries.length).fill(1);
        }

        if ('groove' in newSettings) {
            this.grooveManager.updateGroove(newSettings.groove);
        }
        if ('swingAmount' in newSettings) {
            this.grooveManager.updateSwing(newSettings.swingAmount);
        }
        
        ['speedMultiplier', 'wonkyArp', 'playMultiplier', 'noteSeries', 'triggerSettings'].forEach(setting => {
            if (newSettings[setting] !== undefined) {
                shouldResync = true;
            }
        });
        if (shouldResync) {
            this.requestResync(); // Resync on next bar
        }
    }

    updateTriggerPattern() {
        const oldPattern = this.triggerPattern;
        const oldLength = oldPattern ? oldPattern.length : 0;
        
        // Create the new trigger pattern
        this.triggerPattern = triggerPatternFromSettings(this.track.settings);
        
        // Recalculate durations
        this.precalculateDurations();
        
        // Adjust the current step to the equivalent position in the new pattern
        if (oldLength > 0) {
            this.currentStep = this.currentStep % oldLength;
            const oldPosition = this.currentStep / oldLength;
            this.currentStep = Math.floor(oldPosition * this.triggerPattern.length);
        }
        
        // Adjust global step if necessary (this might not always be needed)
        // this.globalStep = Math.floor(this.globalStep / oldLength) * this.triggerPattern.length + this.currentStep;
        
        // Recalculate the next schedule time based on the current global step
        this.recalculateNextScheduleTime();
    }
    
    recalculateNextScheduleTime() {
        const currentTime = this.sequencer.clock.getCurrentTime();
        const stepDuration = this.getStepDuration();
        this.nextScheduleTime = currentTime + (stepDuration * (this.currentStep + 1));
    }

    precalculateDurations() {
        this.triggerSteps = [];
        this.durations = [];
        let lastTriggerStep = -1;

        for (let i = 0; i < this.triggerPattern.length; i++) {
            if (this.triggerPattern.shouldTrigger(i)) {
                if (lastTriggerStep !== -1) {
                    this.durations.push(i - lastTriggerStep);
                }
                this.triggerSteps.push(i);
                lastTriggerStep = i;
            }
        }

        // Handle the wrap-around case
        if (lastTriggerStep !== -1) {
            this.durations.push(this.triggerPattern.length + this.triggerSteps[0] - lastTriggerStep);
        }
    }

    resetTrackState() {
        this.currentStep = 0;
        this.globalStep = 0;
        this.nextScheduleTime = this.sequencer.clock.getCurrentTime();
    }
    
    resyncTrack() {
        const currentPosition = this.sequencer.clock.getPosition();
        const { bar, beat, tick } = currentPosition;
        if (tick !== 0 || beat !== 0) { 
            this.pendingResync = true;
            return;
        }
        if (this.pendingReyncTriggerPattern) {
            this.updateTriggerPattern();
            this.pendingReyncTriggerPattern = false;
        }

        // Calculate the current step based on the SongClock's position
        const stepsPerBeat = this.sequencer.settings.ppq / 24;
        const totalSteps = (bar * this.sequencer.settings.timeSignature[0] + beat) * stepsPerBeat + Math.floor(tick / 24);
        
        this.currentStep = totalSteps % this.triggerPattern.length;
        this.globalStep = totalSteps;
        this.nextScheduleTime = this.sequencer.clock.getCurrentTime();
        
        // Reset note index and series counter
        this.currentNoteIndex = 0;
        this.noteSeriesCounter = new Array(this.track.settings.noteSeries.length).fill(1);
    
        this.pendingResync = false;
    }

    scheduleEvents(lookAheadEnd) {
        if (this.pendingResync) {
            this.resyncTrack();
        }

        while (this.nextScheduleTime < lookAheadEnd) {
            const triggerIndex = this.triggerSteps.indexOf(this.currentStep);
            if (triggerIndex !== -1) {
                this.scheduleNote(this.nextScheduleTime, this.globalStep, this.durations[triggerIndex]);
            }
            
            this.advanceStep();
            this.nextScheduleTime += this.getStepDuration();
            this.globalStep++;
        }
    }

    scheduleNote(time, globalStep, stepCount) {
        if (!this.shouldTriggerNote()) return;

        const noteIndex = this.getNoteIndex();
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        const chord = this.getNextNote(noteIndex);

        if (chord && chord.length > 0) {
            const { noteStartTime, noteDuration } = this.calculateNoteTimings(time, globalStep, stepCount);

            if ((this.track.settings.arpMode === ARP_MODES.OFF && noteSettings.arpMode === ARP_MODES.USE_TRACK)
                || noteSettings.arpMode === ARP_MODES.OFF) {
                this.scheduleChord(chord, noteStartTime, noteDuration, globalStep, noteSettings, noteIndex);
            } else {
                this.scheduleArpeggio(chord, noteStartTime, noteDuration, globalStep, noteSettings, noteIndex);
            }
        }

        this.advanceNoteIndex();
    }

    shouldTriggerNote() {
        return Math.random() * 100 < this.track.settings.probability;
    }

    getNoteIndex() {
        if (this.track.settings.tieNoteSeriestoPattern) {
            const currentPatternIndex = this.triggerSteps.indexOf(this.currentStep);
            return currentPatternIndex % this.track.settings.noteSeries.length;
        }
        return this.currentNoteIndex;
    }

    calculateNoteTimings(time, globalStep, stepCount) {
        const baseStepDuration = this.getStepDuration();
        let noteDuration = this.track.settings.useMaxDuration
            ? baseStepDuration * stepCount * this.track.settings.maxDurationFactor
            : baseStepDuration;

        if (this.track.settings.useMaxDuration && this.track.settings.maxDurationFactor === 1) {
            noteDuration -= this.sequencer.tickDuration;
        }

        const appliedGrooveAndSwing = this.grooveManager.applyGrooveAndSwing(
            time,
            {},
            globalStep,
            noteDuration
        );

        return { noteStartTime: appliedGrooveAndSwing.time, noteDuration: appliedGrooveAndSwing.duration };
    }

    scheduleChord(chord, time, duration, globalStep, noteSettings, noteIndex) {
        const shouldPlay = this.checkNoteSeriesCounter(noteIndex);

        if (shouldPlay) {
            const { time: adjustedTime, velocity: adjustedVelocity } = this.grooveManager.applyGrooveAndSwing(
                time,
                noteSettings,
                globalStep,
                duration
            );

            chord.forEach(pitch => {
                if (Math.random() * 100 < noteSettings.probability) {
                    this.queueNoteEvents(pitch, adjustedTime, duration, this.track.settings.channel - 1, adjustedVelocity);
                }
            });
        }
        this.advanceNoteSeriesCounter(noteIndex);
    }

    scheduleArpeggio(chord, time, duration, globalStep, noteSettings, noteIndex) {
        const { arpMode, channel, wonkyArp } = this.track.settings;
        let playMultiplier = this.track.settings.playMultiplier;

        if (noteSettings.arpMode !== ARP_MODES.OFF) {
            playMultiplier = noteSettings.playMultiplier;
        }

        duration += this.sequencer.tickDuration;
        const baseStepDuration = this.getStepDuration();
        let arpStepDuration = baseStepDuration / playMultiplier;
        let nrSteps = Math.floor(duration / arpStepDuration);
        const chordToArp = getArpeggiatedNotes(chord, ARP_MODES.USE_TRACK === noteSettings.arpMode ? arpMode : noteSettings.arpMode);

        if (wonkyArp || noteSettings.wonkyArp) {
            nrSteps = chordToArp.length * playMultiplier;
            arpStepDuration = duration / nrSteps;   
        }

        for (let i = 0; i < nrSteps; i++) {
            const shouldPlay = this.checkNoteSeriesCounter(noteIndex);

            if (shouldPlay && Math.random() * 100 < noteSettings.probability) {
                const noteStartTime = time + (i * arpStepDuration);
                const { time: adjustedTime, velocity: adjustedVelocity } = this.grooveManager.applyGrooveAndSwing(
                    noteStartTime,
                    noteSettings,
                    globalStep + i,
                    arpStepDuration
                );
    
                const noteDuration = arpStepDuration - this.sequencer.tickDuration;
    
                if (arpMode === ARP_MODES.CHORD) {
                    // For CHORD mode, play all notes in the chord
                    chordToArp[0].forEach(pitch => {
                        this.queueNoteEvents(pitch, adjustedTime, noteDuration, channel - 1, adjustedVelocity);
                    });
                } else {
                    // For other modes, play a single note
                    const pitch = chordToArp[i % chordToArp.length];
                    this.queueNoteEvents(pitch, adjustedTime, noteDuration, channel - 1, adjustedVelocity);
                }
            }
            this.advanceNoteSeriesCounter(noteIndex);
        }
    }

    requestResync() {
        this.pendingResync = true;
    }

    advanceNoteSeriesCounter(noteIndex) {
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        this.noteSeriesCounter[noteIndex] = (this.noteSeriesCounter[noteIndex] % noteSettings.bValue) + 1;
    }

    checkNoteSeriesCounter(noteIndex) {
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        return this.noteSeriesCounter[noteIndex] === noteSettings.aValue;
    }

    queueNoteEvents(pitch, startTime, duration, channel, velocity) {
        if (!this.track.settings.isActive) return;

        velocity = Math.max(MIDI_MIN_VELOCITY, Math.min(MIDI_MAX_VELOCITY, velocity * (this.track.settings.volume / 100)));

        this.sequencer.queueNoteEvent({
            time: startTime,
            type: 'note',
            duration: duration,
            conformNotes: this.track.settings.conformNotes,
            message: { channel, note: pitch, velocity }
        }, this.track.trackId);

        this.updateActiveNotes(pitch, startTime, duration);
    }

    updateActiveNotes(pitch, startTime, duration) {
        const currentTime = this.sequencer.clock.getCurrentTime();
        setTimeout(() => this.activeNotes.add(pitch), startTime - currentTime);
        setTimeout(() => this.activeNotes.delete(pitch), startTime + duration - currentTime);
    }

    // getNextNote(noteIndex) {
    //     const noteSettings = this.track.settings.noteSeries[noteIndex];
    //     const { rootNote, numberOfNotes, inversion, pitchSpan } = noteSettings;
    //     const currentScaleType = this.sequencer.getCurrentScale();

    //     let chord = generateChord(rootNote, {
    //         numberOfNotes,
    //         inversion,
    //         scaleType: currentScaleType
    //     });

    //     if (pitchSpan > 0) {
    //         chord = chord.map(note => note + Math.floor(Math.random() * (pitchSpan + 1)));
    //     }

    //     return chord;
    // }

    getNextNote(noteIndex) {
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        const { rootNote, numberOfNotes, inversion, pitchSpan, spread } = noteSettings;
        const currentScaleType = this.sequencer.getCurrentScale();
    
        let chord = generateChord(rootNote, {
            numberOfNotes,
            inversion,
            spread,
            scaleType: currentScaleType
        });
    
        if (pitchSpan > 0) {
            chord = chord.map(note => note + Math.floor(Math.random() * (pitchSpan + 1)));
        }
    
        return chord;
    }

    advanceNoteIndex() {
        if (!this.track.settings.tieNoteSeriestoPattern) {
            this.currentNoteIndex = this.getNextNoteIndex(this.track.settings.playOrder, this.track.settings.noteSeries.length);
        }
    }

    getNextNoteIndex(playOrder, patternLength) {
        switch (playOrder) {
            case PLAY_ORDER.BACKWARD:
                return this.currentNoteIndex > 0 ? this.currentNoteIndex - 1 : patternLength - 1;
            case PLAY_ORDER.RANDOM:
                return Math.floor(Math.random() * patternLength);
            case PLAY_ORDER.RANDOM_ADJACENT:
                return (this.currentNoteIndex + (Math.random() < 0.5 ? 1 : -1) + patternLength) % patternLength;
            case PLAY_ORDER.FORWARD:
            default:
                return (this.currentNoteIndex + 1) % patternLength;
        }
    }

    advanceStep() {
        this.currentStep = (this.currentStep + 1) % this.triggerPattern.length;
    }

    getStepDuration() {
        const beatsPerMinute = this.sequencer.settings.bpm;
        const stepsPerBeat = 4 / (this.track.settings.steps / 16);
        return (MILLISECONDS_PER_MINUTE / beatsPerMinute) * (1 / stepsPerBeat) / this.track.settings.speedMultiplier;
    }

    shouldResync() {
        return this.track.settings.resyncInterval > 0 && this.globalStep > 0 && this.globalStep % this.track.settings.resyncInterval === 0;
    }

    ensureValidNoteIndex() {
        if (this.track.settings.noteSeries.length === 0) {
            this.currentNoteIndex = 0;
        } else {
            this.currentNoteIndex = this.currentNoteIndex % this.track.settings.noteSeries.length;
        }
    }

    getActiveNotes() {
        return Array.from(this.activeNotes);
    }
}

module.exports = TrackScheduler;