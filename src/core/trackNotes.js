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
    }

    onTrackSettingsUpdate(newSettings) {
        if ('noteSeries' in newSettings) {
            this.noteSeriesCounter = new Array(newSettings.noteSeries.length).fill(1);
            this.currentNoteSeriesStep = 0;
        }
    }

    scheduleNotes({startPulse, maxDuration, defaultDuration, currentTriggerStep}) {
        if (this.checkTrackProbability()) {
            const trackSettings = this.track.settings;
            const { bar, beat } = this.ticker.getPositionFromPulse(startPulse);
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
                    this.schedueldChord(currentNoteSeriesStep, noteSettings, bar, beat, trackSettings, startPulse, noteDuration, defaultDuration);
            } else {
                this.scheduleArpeggio(currentNoteSeriesStep, noteSettings, bar, beat, startPulse, noteDuration, defaultDuration);
            }            
        }

        this.updateCurrentNoteSeriesStep();
    }

    schedueldChord(currentNoteSeriesStep, noteSettings, bar, beat, trackSettings, startPulse, notesDuration) {
        if (this.checkNoteSeriesCounter(currentNoteSeriesStep)) {
            const { timeOffset: swingOffset, velocityOffset } = this.calculateGrooveOffset(startPulse);
            const chord = this.chordMakerForProgression(noteSettings, bar, beat);
            chord.forEach((note) => {
                if (Math.random() * 100 < noteSettings.probability) {
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

    scheduleArpeggio(currentNoteSeriesStep, noteSettings, bar, beat, startPulse, durationPulses, defaultDuration, maxDuration) {
        let { wonkyArp, playMultiplier, arpMode } = this.track.settings;

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
            
            // this.ticker.getPositionFromPulse()
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
                        if (this.track.settings.conformNotes) {
                            pitch = this.pitchForProgression(pitch, bar, beat);
                        }    
                        this.scheduleNote(pitch, this.track.settings.channel - 1, arpStartPulse,  (arpStartPulse + durationPulses) - (swingOffset + 1), adjustedVelocity);
                    });

                } else {
                    let pitch = chord[arpPattern[arpPatternIndex]];
                    if (this.track.settings.conformNotes) {
                        pitch = this.pitchForProgression(pitch, bar, beat);
                    }    
                    this.scheduleNote(pitch, this.track.settings.channel - 1, arpStartPulse,  (arpStartPulse + durationPulses) - (swingOffset + 1), adjustedVelocity);
                }

            }

            arpStartPulse = arpStartPulse + durationPulses;
            stepsIterator--;
            arpPatternIndex = (arpPatternIndex + 1) % arpPattern.length;
            this.advanceNoteSeriesCounter(currentNoteSeriesStep);
        }
    }

    scheduleNote(note, channel, startPulse, endPulse, velocity) {
        // this.track.trackId === 1 && this.track.sequencer.logger.log(`pitch ${note} from ${startPulse} to ${endPulse}`);

        // this.ticker.removeScheduledEvents({ type: 'noteoff', channel: channel, note: note });
        this.ticker.removeFutureNoteOffFromScheduledEvents(startPulse, note, channel);
        this.ticker.scheduleEvent(
            startPulse,
            (position) => {
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
            (position) => {
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