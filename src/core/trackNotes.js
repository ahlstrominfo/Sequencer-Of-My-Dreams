const { ARP_MODES, generateArpeggioPattern} = require('../utils/arps');
const { generateChord, conformNoteToScale } = require('../utils/scales');
const { PLAY_ORDER } = require('../utils/utils');

class TrackNotes {
    constructor(track) {
        this.track = track;
        this.ticker = this.track.sequencer.ticker;
        this.midi = this.track.sequencer.midi;
        this.currentNoteSeriesStep = 0;
        this.noteSeriesCounter = new Array(track.settings.noteSeries.length).fill(1);
        this.individualNoteCounter = new Array(track.settings.noteSeries.length).fill(0);
    }

    onTrackSettingsUpdate(newSettings) {
        if ('noteSeries' in newSettings) {
            this.noteSeriesCounter = new Array(newSettings.noteSeries.length).fill(1);
            this.individualNoteCounter = new Array(newSettings.noteSeries.length).fill(0);
            // this.currentNoteSeriesStep = 0;
            this.updateCurrentNoteSeriesStep();
        }
    }

    scheduleNotes({startPulse, maxDuration, defaultDuration, currentTriggerStep}) {
        if (this.checkTrackProbability()) {
            const trackSettings = this.track.settings;
            let noteDuration = defaultDuration;

            let currentNoteSeriesStep = this.currentNoteSeriesStep;
            if (trackSettings.tieNoteSeriestoPattern) {
                currentNoteSeriesStep = currentTriggerStep % trackSettings.noteSeries.length;
            }

            let noteSettings = trackSettings.noteSeries[currentNoteSeriesStep];
            if (trackSettings.useMaxDuration) {
                noteDuration = trackSettings.maxDurationFactor * maxDuration;
            }
            if (noteSettings.useMaxDuration) {
                noteDuration = noteSettings.maxDurationFactor * maxDuration;
            }

            if ((this.track.settings.arpMode === ARP_MODES.OFF 
                && (noteSettings.arpMode === ARP_MODES.USE_TRACK || noteSettings.arpMode === undefined))
                || noteSettings.arpMode === ARP_MODES.OFF) {
                    this.schedueldChord(currentNoteSeriesStep, startPulse, noteDuration);
            } else {
                this.scheduleArpeggio(currentNoteSeriesStep, startPulse, noteDuration, defaultDuration);
            }            
        }

        this.updateCurrentNoteSeriesStep();
    }

    schedueldChord(currentNoteSeriesStep, startPulse, notesDuration) {
        if (this.checkNoteSeriesCounter(currentNoteSeriesStep)) {
            const trackSettings = this.track.settings;
            const noteSettings = trackSettings.noteSeries[currentNoteSeriesStep];
            const { timeOffset: swingOffset, velocityOffset } = this.calculateGrooveOffset(startPulse);
            const { bar, beat } = this.ticker.getPositionFromPulse(startPulse + swingOffset);


            const chord = this.chordMakerForProgression(noteSettings, bar, beat);
            chord.forEach((note) => {
                if (Math.random() * 100 < noteSettings.probability && this.shouldPlayIndividualNote(currentNoteSeriesStep)) {
                    if (trackSettings.conformNotes) {
                        note = this.pitchForProgression(note, bar, beat);
                    }
                    const adjustedVelocity = this.calculateAdjustedVelocity(noteSettings.velocity, noteSettings.velocitySpan, trackSettings.volume, velocityOffset);
                    this.scheduleNote(note, trackSettings.channel - 1, startPulse + swingOffset, (startPulse + notesDuration) - swingOffset, adjustedVelocity);
                }
            });
        }
        this.advanceNoteSeriesCounter(currentNoteSeriesStep);
    }

    scheduleArpeggio(currentNoteSeriesStep, startPulse, durationPulses, defaultDuration) {
        const trackSettings = this.track.settings;
        const noteSettings = trackSettings.noteSeries[currentNoteSeriesStep];

        let { wonkyArp, playMultiplier, arpMode } = trackSettings;

        if (noteSettings.arpMode !== ARP_MODES.USE_TRACK) {
            arpMode = noteSettings.arpMode;
        }

        const arpPattern = generateArpeggioPattern(
            noteSettings.numberOfNotes, 
            arpMode
        );

        if (noteSettings.arpMode !== ARP_MODES.OFF 
            && noteSettings.arpMode !== ARP_MODES.USE_TRACK ) {
            playMultiplier = noteSettings.playMultiplier;
        }

        let arpStepDuration = Math.floor(defaultDuration / playMultiplier);
        let nrSteps = Math.max(1, (durationPulses / arpStepDuration));
        
        if (wonkyArp || noteSettings.wonkyArp) {
            nrSteps = arpPattern.length * playMultiplier;
            arpStepDuration = durationPulses / nrSteps;
        }
        
        let stepsIterator = nrSteps;
        let arpStartPulse = startPulse;
        let arpPatternIndex = 0;
        while(stepsIterator > 0) {
            const { timeOffset: swingOffset, velocityOffset } = this.calculateGrooveOffset(startPulse);
            const { bar, beat } = this.ticker.getPositionFromPulse(arpStartPulse + swingOffset);

            let durationPulses = arpStepDuration;
            if (stepsIterator < 1) {
                durationPulses = Math.floor(stepsIterator * durationPulses);
            }
            const chord = this.chordMakerForProgression(noteSettings, bar, beat);
            
            const adjustedVelocity = this.calculateAdjustedVelocity(noteSettings.velocity, noteSettings.velocitySpan, this.track.settings.volume, velocityOffset);
            if (this.checkNoteSeriesCounter(currentNoteSeriesStep) 
                && Math.random() * 100 < noteSettings.probability) 
            {             
                
                if (arpMode === ARP_MODES.CHORD 
                    || (this.track.settings.arpMode === ARP_MODES.CHORD && noteSettings.arpMode === ARP_MODES.USE_TRACK)) 
                {
                    chord.forEach((pitch) => {
                        if (this.shouldPlayIndividualNote(currentNoteSeriesStep)) {
                            if (this.track.settings.conformNotes) {
                                pitch = this.pitchForProgression(pitch, bar, beat);
                            }    
                            this.scheduleNote(pitch, this.track.settings.channel - 1, arpStartPulse,  (arpStartPulse + durationPulses) - (swingOffset + 1), adjustedVelocity);
                        }
                    });

                } else {
                    if (this.shouldPlayIndividualNote(currentNoteSeriesStep)) {
                        let pitch = chord[arpPattern[arpPatternIndex]];
                        if (this.track.settings.conformNotes) {
                            pitch = this.pitchForProgression(pitch, bar, beat);
                        }    
                        this.scheduleNote(pitch, this.track.settings.channel - 1, arpStartPulse,  (arpStartPulse + durationPulses) - (swingOffset + 1), adjustedVelocity);
                    }

                }

            }

            arpStartPulse = arpStartPulse + durationPulses;
            stepsIterator--;
            arpPatternIndex = (arpPatternIndex + 1) % arpPattern.length;
        }
        this.advanceNoteSeriesCounter(currentNoteSeriesStep);
    }

    scheduleNote(note, channel, startPulse, endPulse, velocity) {
        this.ticker.removeFutureNoteOffFromScheduledEvents(startPulse, note, channel);
        this.ticker.scheduleEvent(
            startPulse,
            () => {
                this.midi.output.send('noteon', 
                    {
                        note: note,
                        velocity: velocity,
                        channel: channel,
                    }
                );
            },
            {
                type: 'noteon',
                note: note,
                channel: channel,
                trackId: this.track.trackId,
            }
        );
        this.ticker.scheduleEvent(
            endPulse,
            () => {
                this.midi.output.send('noteoff', 
                    {
                        note: note,
                        velocity: 0,
                        channel: channel,
                    }
                );
            },
            {
                type: 'noteoff',
                note: note,
                channel: channel,
                trackId: this.track.trackId,
            }
        );        
    }

    updateCurrentNoteSeriesStep() {
        if (!this.track.settings.tieNoteSeriestoPattern) {
            this.currentNoteSeriesStep = this.getNextNoteIndex(
                this.currentNoteSeriesStep, 
                this.track.settings.playOrder, 
                this.track.settings.noteSeries.length
            );
        } else {
            this.currentNoteSeriesStep = (this.currentNoteSeriesStep + 1) % this.track.settings.noteSeries.length;
        }
    }

    calculateSwingOffset(pulse) {
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerSwingUnit = this.ticker.pulsesPerSixteenth / speedMultiplier;
        
        // Determine if this is an even or odd swing unit
        const swingUnitIndex = Math.floor(pulse / pulsesPerSwingUnit);
        
        // Only apply swing to odd swing units
        if (swingUnitIndex % 2 === 1) {
            // Calculate the swing offset
            // swingAmount is a percentage (0-100) of a full swing unit
            const swingOffset = Math.round(pulsesPerSwingUnit * (this.track.settings.swingAmount / 100));
            
            return swingOffset;
        }
        
        return 0;
    }

    calculateGrooveOffset(pulse) {
        const groove = this.track.settings.groove;
        if (!groove || groove.length === 0) {
            return { timeOffset: this.calculateSwingOffset(pulse), velocityOffset: 0 };
        }
    
        const speedMultiplier = this.track.settings.speedMultiplier;
        const pulsesPerGrooveUnit = this.ticker.pulsesPerSixteenth / speedMultiplier;
        
        const grooveIndex = Math.floor(pulse / pulsesPerGrooveUnit) % groove.length;
        const grooveStep = groove[grooveIndex];
        
        const timeOffset = Math.round(pulsesPerGrooveUnit * (grooveStep.timeOffset / 100));
        const velocityOffset = grooveStep.velocityOffset;
        
        return { timeOffset, velocityOffset };
    }
    
    checkNoteSeriesCounter(noteIndex) {
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        if (noteSettings.aValue === undefined) {
            return true;
        }
        return this.noteSeriesCounter[noteIndex] === noteSettings.aValue;
    }

    advanceNoteSeriesCounter(noteIndex) {
        const noteSettings = this.track.settings.noteSeries[noteIndex];
        this.noteSeriesCounter[noteIndex] = (this.noteSeriesCounter[noteIndex] % noteSettings.bValue) + 1;
    }

    shouldPlayIndividualNote(noteSeriesIndex) {
        const noteSettings = this.track.settings.noteSeries[noteSeriesIndex];
        const { aValueIndividualNote, bValueIndividualNote } = noteSettings;
        
        // Increment the counter
        this.individualNoteCounter[noteSeriesIndex] = 
            (this.individualNoteCounter[noteSeriesIndex] + 1) % bValueIndividualNote;
        
        // Check if this note should be played
        return (this.individualNoteCounter[noteSeriesIndex] + 1) === aValueIndividualNote;
    }

    checkTrackProbability() {
        return Math.random() * 100 < this.track.settings.probability;
    }

    getNextNoteIndex(currentIndex, playOrder, patternLength) {
        switch (playOrder) {
            case PLAY_ORDER.BACKWARD:
                return currentIndex > 0 ? currentIndex - 1 : patternLength - 1;
            case PLAY_ORDER.RANDOM:
                return Math.floor(Math.random() * patternLength);
            case PLAY_ORDER.RANDOM_ADJACENT:
                return (currentIndex + (Math.random() < 0.5 ? 1 : -1) + patternLength) % patternLength;
            case PLAY_ORDER.FORWARD:
            default:
                return (currentIndex + 1) % patternLength;
        }
    }

    pitchForProgression(pitch, bar, beat) {
        const progressionInfo = this.getProgressionInfo(bar, beat);
        return conformNoteToScale(
            pitch, 
            progressionInfo.key,
            progressionInfo.scale,
            progressionInfo.transposition
        ); 
    }

    chordMakerForProgression(noteSettings, bar, beat) {
        const progressionInfo = this.getProgressionInfo(bar, beat);
        return generateChord(noteSettings.rootNote, {
            numberOfNotes: noteSettings.numberOfNotes,
            inversion: noteSettings.inversion,
            spread: noteSettings.spread,
            scaleType: this.track.settings.conformNotes ? progressionInfo.scale : 13,
            pitchSpan: noteSettings.pitchSpan
        });
    }    

    getProgressionInfo(bar, beat) {
        return this.track.sequencer.getProgressionAtPosition(bar, beat);
    }   
    
    calculateAdjustedVelocity(velocity, velocitySpan, volume = 100, velocityOffsetPercentage = 0) {
        const baseVelocity = velocity + Math.floor(Math.random() * (velocitySpan + 1));
        const velocityOffset = Math.round((baseVelocity * velocityOffsetPercentage) / 100);
        const adjustedVelocity = Math.max(1, Math.min(127, baseVelocity + velocityOffset));
        return Math.round(adjustedVelocity * (volume / 100));
    }
}

module.exports = TrackNotes;