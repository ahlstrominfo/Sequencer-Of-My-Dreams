// const GrooveManager = require('./grooveManager');
// const {triggerPatternFromSettings} = require('../patterns/triggerPatterns');
// const { PLAY_ORDER } = require('../utils/utils');
// const { generateChord, conformNoteToScale, SCALES} = require('../utils/scales');
// const { ARP_MODES, generateArpeggioPattern} = require('../utils/arps');

// // Constants
// const MILLISECONDS_PER_MINUTE = 60000;

// class TrackScheduler {
//     constructor(track, sequencer) {
//         this.track = track;
//         this.sequencer = sequencer;
//         this.currentStep = 0;
//         this.currentNoteIndex = 0;
//         this.nextScheduleTime = 0;
//         this.activeNotes = new Set();
//         this.grooveManager = new GrooveManager(track.settings.groove, track.settings.swingAmount);
//         this.noteSeriesCounter = new Array(track.settings.noteSeries.length).fill(1);
//         this.pendingResync = false;
//         this.pendingResyncBar = false;
//         this.updateTriggerPattern();
//     }

//     onTrackSettingsUpdate(newSettings) {
//         let shouldResync = false;
//         if ('triggerType' in newSettings || 'triggerSettings' in newSettings || 'resyncInterval' in newSettings) {
//             this.updateTriggerPattern();
//         }

//         if ('noteSeries' in newSettings) {
//             this.ensureValidNoteIndex();
//             this.noteSeriesCounter = new Array(newSettings.noteSeries.length).fill(1);
//         }

//         if ('groove' in newSettings) {
//             this.grooveManager.updateGroove(newSettings.groove);
//         }
//         if ('swingAmount' in newSettings) {
//             this.grooveManager.updateSwing(newSettings.swingAmount);
//         }
        
//         ['speedMultiplier', 'wonkyArp', 'playMultiplier', 'triggerSettings', 'triggerType'].forEach(setting => {
//             if (newSettings[setting] !== undefined) {
//                 shouldResync = true;
//             }
//         });
//         if (shouldResync) {
//             this.requestResync(); // Resync on next bar
//         }
//     }

//     updateTriggerPattern() {
//         this.triggerPattern = triggerPatternFromSettings(this.track.settings);
//         this.triggerSteps = this.triggerPattern.triggerSteps;
//         this.durations = this.triggerPattern.durations;
//         this.currentStep = 0;
//         this.currentNoteIndex = 0;
//     }

//     resetTrackState() {
//         this.currentStep = 0;
//         this.currentNoteIndex = 0;
//         this.nextScheduleTime = 0;
//         this.activeNotes = new Set();
//         this.noteSeriesCounter = new Array(this.track.settings.noteSeries.length).fill(1);
//         this.pendingResync = false;
//         this.pendingResyncBar = false;
//     }
    
//     resyncTrack() {
//         const currentPosition = this.sequencer.clock.getPosition();
//         const { bar, beat, tick } = currentPosition;
//         if (tick !== 0 || beat !== 0) { 
//             this.pendingResync = true;
//             return;
//         }
        
//         this.currentStep = currentPosition.totalSteps % this.triggerPattern.length;
//         this.nextScheduleTime = this.sequencer.clock.getCurrentTime();
        
//         // Reset note index and series counter
//         this.currentNoteIndex = 0;
//         this.noteSeriesCounter = new Array(this.track.settings.noteSeries.length).fill(1);
    
//         this.pendingResync = false;
//     }

//     scheduleEvents(lookAheadEnd) {
//         const stepDuration = this.getStepDuration(); //this.sequencer.getStepDuration();
//         if (this.pendingResync) {
//             this.resyncTrack();
//         }

//         while (this.nextScheduleTime < lookAheadEnd) {
//             const globalStepAtTime = Math.floor(this.nextScheduleTime / stepDuration);
//             const currentStep = globalStepAtTime % this.triggerPattern.length;
//             const triggerIndex = this.triggerSteps.indexOf(currentStep);

//             if (triggerIndex !== -1) {
//                 const globalStepAtTime = this.sequencer.clock.getGlobalStepAtTime(this.nextScheduleTime);
//                 this.scheduleNote(this.nextScheduleTime, globalStepAtTime, this.durations[triggerIndex]);
//             }
            
//             this.advanceStep();
//             this.nextScheduleTime += this.getStepDuration();
//         }
//     }

//     scheduleNote(time, globalStep, stepCount) {
//         if (!this.shouldTriggerNote()) return;
        
//         const noteIndex = this.getNoteIndex();
//         const noteSettings = this.track.settings.noteSeries[noteIndex];
//         const chord = this.getNextNote(noteIndex);
        
//         if (chord && chord.length > 0) {
//             if ((this.track.settings.arpMode === ARP_MODES.OFF 
//                 && (noteSettings.arpMode === ARP_MODES.USE_TRACK || noteSettings.arpMode === undefined))
//                 || noteSettings.arpMode === ARP_MODES.OFF) {
//                 this.scheduleChord(time, stepCount, globalStep, noteSettings, noteIndex);
//             } else {
//                 this.scheduleArpeggio(time, stepCount, globalStep, noteSettings, noteIndex);
//             }
//         }

//         this.advanceNoteIndex();
//     }

//     shouldTriggerNote() {
//         return Math.random() * 100 < this.track.settings.probability;
//     }

//     getNoteIndex() {
//         if (this.track.settings.tieNoteSeriestoPattern) {
//             const currentPatternIndex = this.triggerSteps.indexOf(this.currentStep);
//             return currentPatternIndex ===-1 ? 0 : currentPatternIndex % this.track.settings.noteSeries.length;
//         }
//         return this.currentNoteIndex;
//     }

//     calculateNoteTimings(time, stepCount, speedMultiplier, maxDurationFactor, useMaxDuration) {
//         const adjustedStepCount = stepCount * speedMultiplier;        
//         const baseStepDuration = this.getStepDuration();
//         let noteDuration = useMaxDuration
//             ? baseStepDuration * adjustedStepCount * maxDurationFactor / speedMultiplier
//             : baseStepDuration / speedMultiplier;
    
//         if (useMaxDuration && maxDurationFactor === 1) {
//             noteDuration -= this.sequencer.tickDuration;
//         }
    
//         return { noteStartTime: time, noteDuration: noteDuration };
//     }

//     pitchForProgression(pitch, adjustedTime) {
//         const progressionInfo = this.getProgressionInfo(adjustedTime);
//         return conformNoteToScale(
//             pitch, 
//             progressionInfo.key,
//             progressionInfo.scale,
//             progressionInfo.transposition
//         ); 
//     }

//     chordMakerForProgression(noteSettings, adjustedTime) {
//         const progressionInfo = this.getProgressionInfo(adjustedTime);
//         return generateChord(noteSettings.rootNote, {
//             numberOfNotes: noteSettings.numberOfNotes,
//             inversion: noteSettings.inversion,
//             spread: noteSettings.spread,
//             scaleType: this.track.settings.conformNotes ? progressionInfo.scale : 13,
//             pitchSpan: noteSettings.pitchSpan
//         });
//     }

//     scheduleChord(time, stepCount, globalStep, noteSettings, noteIndex) {
//         const shouldPlay = this.checkNoteSeriesCounter(noteIndex);
//         const { speedMultiplier, maxDurationFactor, useMaxDuration } = this.track.settings;
//         const { noteStartTime, noteDuration } = this.calculateNoteTimings(time, stepCount, speedMultiplier, maxDurationFactor, useMaxDuration);

//         if (shouldPlay) {
//             const { time: adjustedTime } = this.grooveManager.applyGrooveAndSwing(
//                 noteStartTime,
//                 noteSettings,
//                 globalStep,
//                 noteDuration
//             );
//             let chord = this.chordMakerForProgression(noteSettings, adjustedTime);

//             chord.forEach(pitch => {
//                 if (this.track.settings.conformNotes) {
//                     pitch = this.pitchForProgression(pitch, adjustedTime);
//                 }             
//                 if (Math.random() * 100 < noteSettings.probability || noteSettings.probability === undefined) {
//                     const { time: adjustedTime, velocity: adjustedVelocity } = this.grooveManager.applyGrooveAndSwing(
//                         noteStartTime,
//                         noteSettings,
//                         globalStep,
//                         noteDuration,
//                         this.track.settings.volume
//                     );

//                     this.sequencer.midi.queueNoteEvent({
//                         time: adjustedTime,
//                         type: 'note',
//                         duration: noteDuration,
//                         message: { channel: this.track.settings.channel - 1, note: pitch, velocity: adjustedVelocity },
//                         trackId: this.track.trackId
//                     });
            
//                     this.updateActiveNotes(pitch, adjustedTime, noteDuration);
//                 }
//             });
            
//         }
//         this.advanceNoteSeriesCounter(noteIndex);        
//     }

//     scheduleArpeggio(time, stepCount, globalStep, noteSettings, noteIndex) {
//         const { channel, wonkyArp, speedMultiplier, maxDurationFactor: trackMaxDurationFactor, useMaxDuration: trackUseMaxDuration } = this.track.settings;

//         let maxDurationFactor = trackMaxDurationFactor;
//         let useMaxDuration = trackUseMaxDuration;


//         if (noteSettings.arpMode !== ARP_MODES.USE_TRACK) {
//             maxDurationFactor = noteSettings.maxDurationFactor !== undefined ? noteSettings.maxDurationFactor : trackMaxDurationFactor;
//             useMaxDuration = noteSettings.useMaxDuration !== undefined ? noteSettings.useMaxDuration : trackUseMaxDuration;
//         }

//         const { noteStartTime, noteDuration: calculatedNoteDuration } = this.calculateNoteTimings(time, stepCount, speedMultiplier, maxDurationFactor, useMaxDuration);

//         let noteDuration = calculatedNoteDuration;
        
//         let playMultiplier = this.track.settings.playMultiplier;

//         let arpMode = this.track.settings.arpMode;
//         if (noteSettings.arpMode !== ARP_MODES.USE_TRACK) {
//             arpMode = noteSettings.arpMode;
//         }

//         if (noteSettings.arpMode !== ARP_MODES.OFF 
//             && noteSettings.arpMode !== ARP_MODES.USE_TRACK 
//             && noteSettings.playMultiplier !== undefined) {
//             playMultiplier = noteSettings.playMultiplier;
//         }

//         noteDuration += this.sequencer.tickDuration;
//         const baseStepDuration = this.getStepDuration();
//         let arpStepDuration = baseStepDuration / playMultiplier;
//         let nrSteps = Math.floor(noteDuration / arpStepDuration);
//         const arpPattern = generateArpeggioPattern(
//             noteSettings.numberOfNotes, 
//             arpMode
//         );

//         if (wonkyArp || noteSettings.wonkyArp) {
//             nrSteps = arpPattern.length * playMultiplier;
//             arpStepDuration = noteDuration / nrSteps;   
//         }

//         for (let i = 0; i < nrSteps; i++) {
//             const shouldPlay = this.checkNoteSeriesCounter(noteIndex)
//                 && (Math.random() * 100 < noteSettings.probability || noteSettings.probability === undefined);

//             if (shouldPlay) {
//                 const noteStepStartTime = noteStartTime + (i * arpStepDuration);
//                 const { time: adjustedTime, velocity: adjustedVelocity } = this.grooveManager.applyGrooveAndSwing(
//                     noteStepStartTime,
//                     noteSettings,
//                     globalStep + i,
//                     arpStepDuration,
//                     this.track.settings.volume
//                 );
//                 let chord = this.chordMakerForProgression(noteSettings, adjustedTime);


//                 const sendChords = [];
//                 if (arpMode === ARP_MODES.CHORD 
//                     || (this.track.settings.arpMode === ARP_MODES.CHORD && noteSettings.arpMode === ARP_MODES.USE_TRACK)) 
//                 {
//                     chord.forEach(pitch => {
//                         const { velocity: adjustedVelocity } = this.grooveManager.applyGrooveAndSwing(
//                             noteStartTime,
//                             noteSettings,
//                             globalStep,
//                             noteDuration,
//                             this.track.settings.volume
//                         );

//                         if (this.track.settings.conformNotes) {
//                             pitch = this.pitchForProgression(pitch, adjustedTime);
//                         }             
//                         const noteStepDuration = arpStepDuration - this.sequencer.tickDuration;        
    
//                         sendChords.push({
//                             time: adjustedTime,
//                             type: 'note',
//                             duration: noteStepDuration,
//                             message: { 
//                                 channel: channel - 1, 
//                                 note: pitch, 
//                                 velocity: adjustedVelocity
//                             },
//                             trackId: this.track.trackId
//                         });
        
//                         this.updateActiveNotes(pitch, adjustedTime, noteDuration);                
//                     });
//                 } else {
//                     const positionInNotes = arpPattern[i % arpPattern.length];
//                     let pitch = chord[positionInNotes];
    
//                     if (this.track.settings.conformNotes) {
//                         pitch = this.pitchForProgression(pitch, adjustedTime);
//                     }             
//                     const noteStepDuration = arpStepDuration - this.sequencer.tickDuration;
    
//                     sendChords.push({
//                         time: adjustedTime,
//                         type: 'note',
//                         duration: noteStepDuration,
//                         message: { 
//                             channel: channel - 1, 
//                             note: pitch, 
//                             velocity: adjustedVelocity
//                         },
//                         trackId: this.track.trackId
//                     });

//                     this.updateActiveNotes(pitch, adjustedTime, noteDuration);               
//                 }

//                 sendChords.forEach(chord => {
//                     this.sequencer.midi.queueNoteEvent(chord);
//                     this.updateActiveNotes(chord.message.pitch, chord.time, chord.duration);      
//                 });

//             }
//             this.advanceNoteSeriesCounter(noteIndex);
//         }        
//     }

//     requestResync() {
//         this.pendingResync = true;
//     }

//     advanceNoteSeriesCounter(noteIndex) {
//         const noteSettings = this.track.settings.noteSeries[noteIndex];
//         this.noteSeriesCounter[noteIndex] = (this.noteSeriesCounter[noteIndex] % noteSettings.bValue) + 1;
//     }

//     checkNoteSeriesCounter(noteIndex) {
//         const noteSettings = this.track.settings.noteSeries[noteIndex];
//         if (noteSettings.aValue === undefined) {
//             return true;
//         }
//         return this.noteSeriesCounter[noteIndex] === noteSettings.aValue;
//     }

//     updateActiveNotes(pitch, startTime, duration) {
//         const currentTime = this.sequencer.clock.getCurrentTime();
//         this.sequencer.realTimeKeeper.setTimeout(() => this.activeNotes.add(pitch), startTime - currentTime);
//         this.sequencer.realTimeKeeper.setTimeout(() => this.activeNotes.delete(pitch), startTime + duration - currentTime);
//     }
    
//     getNextNote(noteIndex) {
//         const noteSettings = this.track.settings.noteSeries[noteIndex];
//         const { rootNote, numberOfNotes, inversion, pitchSpan, spread } = noteSettings;
//         const currentScaleType = this.sequencer.getCurrentScale();
    
//         let chord = generateChord(rootNote, {
//             numberOfNotes,
//             inversion,
//             spread,
//             scaleType: currentScaleType
//         });
    
//         if (pitchSpan > 0) {
//             chord = chord.map(note => note + Math.floor(Math.random() * (pitchSpan + 1)));
//         }
//         return chord;
//     }

//     advanceNoteIndex() {
//         if (!this.track.settings.tieNoteSeriestoPattern) {
//             this.currentNoteIndex = this.getNextNoteIndex(this.track.settings.playOrder, this.track.settings.noteSeries.length);
//         }
//     }

//     getNextNoteIndex(playOrder, patternLength) {
//         switch (playOrder) {
//             case PLAY_ORDER.BACKWARD:
//                 return this.currentNoteIndex > 0 ? this.currentNoteIndex - 1 : patternLength - 1;
//             case PLAY_ORDER.RANDOM:
//                 return Math.floor(Math.random() * patternLength);
//             case PLAY_ORDER.RANDOM_ADJACENT:
//                 return (this.currentNoteIndex + (Math.random() < 0.5 ? 1 : -1) + patternLength) % patternLength;
//             case PLAY_ORDER.FORWARD:
//             default:
//                 return (this.currentNoteIndex + 1) % patternLength;
//         }
//     }

//     advanceStep() {
//         this.currentStep = (this.currentStep + 1) % this.triggerPattern.length;
//     }

//     getStepDuration() {
//         const beatsPerMinute = this.sequencer.settings.bpm;
//         const stepsPerBeat = 4 / (this.track.settings.steps / 16);
//         return (MILLISECONDS_PER_MINUTE / beatsPerMinute) * (1 / stepsPerBeat) / this.track.settings.speedMultiplier;
//     }

//     ensureValidNoteIndex() {
//         if (this.track.settings.noteSeries.length === 0) {
//             this.currentNoteIndex = 0;
//         } else {
//             this.currentNoteIndex = this.currentNoteIndex % this.track.settings.noteSeries.length;
//         }
//     }

//     getActiveNotes() {
//         return Array.from(this.activeNotes);
//     }

//     getProgressionInfo(time) {
//         const { bar, beat } = this.sequencer.clock.getPositionFromTime(time);
//         return this.sequencer.getProgressionAtPosition(bar, beat);
//     }
// }

// module.exports = TrackScheduler;