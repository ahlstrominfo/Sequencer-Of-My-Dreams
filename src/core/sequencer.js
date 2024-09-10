const MidiCommunicator = require('./midiCommunicator');
const SequenceManager = require('./sequenceManager');
const SongClock = require('./songClock');
const SequenceScheduler = require('./sequenceScheduler');
const { Track } = require('./track');
const { conformNoteToScale, SCALE_NAMES, KEYS } = require('../utils/scales');
const Logger = require('../utils/logger');

class Sequencer {
    constructor(bpm = 120, ppq = 96) {
        this.settings = {
            bpm: bpm,
            ppq: ppq,
            key: 0, // C
            scale: 0, // Major
            transposition: 0,
            timeSignature: [4, 4],
            swing: 0,
            progressions: null,
            currentProgressionIndex: null,
            activeStates: Array(16).fill().map(() => Array(16).fill(true)),
            currentActiveState: 0
        };

        this.beatCounter = 0;
        this.tracks = [];
        this.isPlaying = false;
        this.midi = new MidiCommunicator(this);
        this.clock = new SongClock(bpm, ppq, this.settings.timeSignature);
        this.sequenceManager = new SequenceManager(this);
        this.scheduler = new SequenceScheduler(this);

        this.scheduleAheadTime = 100; // Schedule 100ms ahead
        this.tickDuration = this.calculateTickDuration();

        this.logger = new Logger();

        this.loadActiveStates = false;

        this.cleanSequencer();
        this.setupClockCallbacks();

        this.listeners = {};

        this.maxBeats = 0;
        this.progressionSteps = [];
    }

    setupClockCallbacks() {
        
        this.clock.setOnClockTickCallback(() => {
            this.midi.sendClock();
        });
        this.clock.setOnBarChangeCallback(() => {
            if(this.loadActiveStates) {
                this.setActiveState();
                this.loadActiveStates = false;
            }
        });
    }

    addTrack(trackSettings) {
        const trackId = this.tracks.length;
        const track = new Track(trackSettings, this, trackId);
        this.tracks.push(track);
        return track;
    }

    removeTrack(track) {
        const index = this.tracks.indexOf(track);
        if (index !== -1) {
            this.tracks.splice(index, 1);
        }
    }

    start() {
        if (!this.isPlaying) {
            this.isPlaying = true;

            // Pre-calculate initial events
            const initialTime = this.clock.getCurrentTime();
            const initialLookAhead = initialTime + this.scheduleAheadTime;
            this.tracks.forEach(track => {
                track.trackScheduler.resyncTrack();
                track.trackScheduler.scheduleEvents(initialLookAhead);
            });

            // Start MIDI and clock
            this.midi.sendStart();
            this.clock.start();
            
            // Start the main scheduling loop
            this.scheduleLoop();
        }
    }

    stop() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.beatCounter = 0;
            this.clock.stop();
            this.midi.sendStop();
            this.midi.stopAllActiveNotes();
        }
    }

    tooglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }   
    }
    
    getCurrentPosition() {
        return this.clock.getPosition();
    }

    getCurrentScale() {
        return this.settings.scale;
    }

    updateSettings(newSettings, shouldSaveToTmp = true) {
        const oldActiveState = this.settings.currentActiveState;
        const oldBpm = this.settings.bpm;
        const oldTimeSignature = this.settings.timeSignature;   
        
        if (newSettings['key'] !== undefined) {
            newSettings.key = Math.max(0, Math.min(KEYS.length - 1, newSettings.key));
        } else if (newSettings['key'] === null) {
            newSettings.key = 0;
        }

        if ('progression' in newSettings) {
            if (newSettings['progressions'] === undefined) { // this is for the old format
                newSettings['progressions'] = [newSettings.progression];
            }
            delete newSettings.progression;
            delete this.progressionSteps;
        }

        if ('progressions' in newSettings) {
            newSettings.progressions.forEach(progression => {
                progression.forEach((step) => {
                
                    if (step.beats === null) {
                        step.beats = 0;
                    }
                    step.beats = Math.max(0, Math.min(this.settings.timeSignature[0], step.beats));
    
                    step.bars = Math.max(0, Math.min(16, step.bars));
                    if (step.beats === 0 && step.bars === 0) {
                        step.bars = 1;
                    }
    
                    step.scale = Math.max(0, Math.min(Object.keys(SCALE_NAMES).length, step.scale));
                    if (step.key === null) {
                        step.key = 0;
                    }
                    step.key = Math.max(0, Math.min(KEYS.length - 1, step.key));
                    step.transposition = Math.max(-24, Math.min(24, step.transposition));
                });
            });

            if (!('currentProgressionIndex' in newSettings)) {
                newSettings.currentProgressionIndex = Math.max(0, Math.min(newSettings.progressions.length - 1, this.settings.currentProgressionIndex));
                newSettings.currentProgressionIndex = this.settings.currentProgressionIndex || 0;
            }
        }

        if ('currentProgressionIndex' in newSettings) {
            const progressionLength = (newSettings.progressions || this.settings.progressions || []).length;
            newSettings.currentProgressionIndex = Math.max(0, Math.min(progressionLength - 1, newSettings.currentProgressionIndex));
        }

        Object.assign(this.settings, newSettings);

        if (this.settings.bpm !== oldBpm) {
            this.settings.bpm = Math.min(300, Math.max(30, this.settings.bpm));
            this.clock.setBPM(this.settings.bpm);
            this.tickDuration = this.calculateTickDuration();
        }
        if (this.settings.timeSignature !== oldTimeSignature) {
            this.clock.setTimeSignature(...this.settings.timeSignature);
        }

        if (oldActiveState !== this.settings.currentActiveState) {
            if (this.isPlaying) {
                this.loadActiveStates = true;
            } else {
                this.setActiveState();
            }
        }

        if ('progressions' in newSettings || 'currentProgressionIndex' in newSettings) {
            this.calculateProgressionSteps();
        }

        this.beatCounter = 0;
        shouldSaveToTmp && this.sequenceManager.saveToTmp();
    }
    
    calculateTickDuration() {
        return (60 / this.settings.bpm / this.settings.ppq) * 1000;
    }

    updateTrackSettings(index, trackSettings) {
        if (index >= 0 && index < this.tracks.length) {
            this.tracks[index].updateSettings(trackSettings, false);
        } else {
            this.tracks.push(new Track(trackSettings, this, index));        }
    }    

    scheduleLoop() {
        if (!this.isPlaying) return;

        this.scheduler.processEvents();

        const currentTime = this.clock.getCurrentTime();
        const lookAheadEnd = currentTime + this.scheduleAheadTime;

        this.tracks.forEach(track => {
            track.trackScheduler.scheduleEvents(lookAheadEnd);
        });

        this.midi.processEventQueue(currentTime);

         
        setImmediate(() => this.scheduleLoop());
    }

    calculateProgressionSteps() {
        const beatsPerBar = this.settings.timeSignature[0];
        this.maxBeats = 0;
        this.progressionSteps = [];

        const currentProgression = this.settings.progressions[this.settings.currentProgressionIndex];
        currentProgression.forEach((step) => {
            const stepBeats = step.bars * beatsPerBar + step.beats;
            this.maxBeats += stepBeats;
            this.progressionSteps.push({
                endBeat: this.maxBeats,
                scale: step.scale,
                transposition: step.transposition
            });
        });
    }

    getCurrentScaleName() {
        return SCALE_NAMES[this.settings.scale];
    }

    getCurrentTransposition() {
        return this.settings.transposition;
    }

    conformNoteToScale(note) {
        return conformNoteToScale(
            note,
            this.settings.key,
            this.getCurrentScale(),
            this.getCurrentTransposition()
        );
    }

    queueNoteEvent(event, trackId) {
        event.trackId = trackId;
        this.midi.queueNoteEvent(event);
    }

    gracefulShutdown() {
        this.stop();
        this.midi.close();
    }

    cleanSequencer() {
        this.tracks = [];
        for (let i = 0; i < 16; i++) {
            let defaultTrackSettings = { channel: i + 1 };
            if (i > 9) { // 10 and above will be drums by default
                defaultTrackSettings.channel = 10;
                defaultTrackSettings.conformNotes = false;
            }
            this.addTrack(defaultTrackSettings);
        }
        this.settings.currentActiveState = 0;
        this.settings.activeStates = Array(16).fill().map(() => Array(16).fill(true));
        this.settings.bpm = 120;
        this.settings.progressions = [
            [
                { bars: 1, beats: 0, scale: 0, transposition: 0, key: 0 }
            ]
        ];
        this.settings.currentProgressionIndex = 0;    
    }

    copySettingsToTrack(fromTrackIndex, toTrackIndex) {
        if (fromTrackIndex >= 0 && fromTrackIndex < this.tracks.length &&
            toTrackIndex >= 0 && toTrackIndex < this.tracks.length) {
            const fromTrack = this.tracks[fromTrackIndex];
            const toTrack = this.tracks[toTrackIndex];
            toTrack.updateSettings(fromTrack.getSettings());
        }
    }

    updateActiveState(index) {
        this.settings.activeStates[this.settings.currentActiveState] = this.tracks.map(track => track.settings.isActive);
        this.updateSettings({ currentActiveState: index });   
    }

    setActiveState() {
        const index = this.settings.currentActiveState;
        this.tracks.forEach((track, i) => {
            track.updateSettings({ isActive: this.settings.activeStates[index][i] });
        });
    }

    registerListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    ffw(bars) {
        if (!this.isPlaying) return;
        this.clock.fastForward(bars);
        this.updateSequencerState();
    }

    rwd(bars) {
        if (!this.isPlaying) return;
        this.clock.rewind(bars);
        this.updateSequencerState();
    }

    updateSequencerState() {
        const newPosition = this.clock.getPosition();
        this.beatCounter = (newPosition.bar * this.settings.timeSignature[0] + newPosition.beat) % this.maxBeats;

        this.tracks.forEach(track => {
            track.trackScheduler.resyncTrack();
        });

        this.midi.stopAllActiveNotes();
    }

    getProgressionAtPosition(bar, beat) {

        const firstEvent = this.scheduler.scheduledEvents
            .filter(event => (event.bar === bar && event.beat <= beat));
            // .forEach(event => {
            //     this.logger.log(`Event at ${event.bar}:${event.beat}`);
            // });

        let currentProgressionIndex = this.settings.currentProgressionIndex;;
        if (firstEvent.length > 0) {
            currentProgressionIndex = firstEvent[firstEvent.length - 1].data.progressionIndex;
        }

        const beatsPerBar = this.settings.timeSignature[0];
        let totalBeats = (bar * beatsPerBar) + beat;
        
        const currentProgression = this.settings.progressions[currentProgressionIndex];
        let totalProgressionBeats = 0;
        
        // Calculate total beats in the progression
        currentProgression.forEach(step => {
            totalProgressionBeats += (step.bars * beatsPerBar) + step.beats;
        });
    
        // Wrap around if necessary
        totalBeats = totalBeats % totalProgressionBeats;
    
        let accumulatedBeats = 0;
        
        for (let i = 0; i < currentProgression.length; i++) {
            const step = currentProgression[i];
            const stepDuration = (step.bars * beatsPerBar) + step.beats;
            accumulatedBeats += stepDuration;
    
            if (totalBeats < accumulatedBeats) {
                return {
                    progressionIndex: this.settings.currentProgressionIndex,
                    stepIndex: i,
                    scale: step.scale,
                    transposition: step.transposition,
                    key: step.key
                };
            }
        }
    
        // This should never happen if the calculations are correct, but let's handle it just in case
        console.warn("Unexpected state in getProgressionAtPosition. Returning first step.");
        return {
            progressionIndex: this.settings.currentProgressionIndex,
            stepIndex: 0,
            scale: currentProgression[0].scale,
            transposition: currentProgression[0].transposition
        };
    }
}

module.exports = Sequencer;