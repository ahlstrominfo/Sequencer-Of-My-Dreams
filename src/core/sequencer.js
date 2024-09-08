const MidiCommunicator = require('./midiCommunicator');
const SequenceManager = require('./sequenceManager');
const SongClock = require('./songClock');
const { Track } = require('./track');
const { conformNoteToScale, SCALE_NAMES } = require('../utils/scales');
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
            progression: [{ bars: 4, scale: 0, transposition: 0 }],
            activeStates: Array(16).fill().map(() => Array(16).fill(true)),
            currentActiveState: 0
        };

        this.tracks = [];
        this.isPlaying = false;
        this.midi = new MidiCommunicator(this);
        this.clock = new SongClock(bpm, ppq, this.settings.timeSignature);
        this.sequenceManager = new SequenceManager(this);

        this.scheduleAheadTime = 100; // Schedule 100ms ahead
        this.tickDuration = this.calculateTickDuration();

        this.log = new Logger();

        this.loadActiveStates = false;

        this.cleanSequencer();

        this.setupClockCallbacks();
    }

    setupClockCallbacks() {
        this.clock.setOnClockTickCallback(() => {
            this.midi.sendClock();
        });
        this.updateProgressionIfNeeded(0); // to fix the first bar.
        this.clock.setOnBarChangeCallback((bar) => {
            if(this.loadActiveStates) {
                this.setActiveState();
                this.loadActiveStates = false;
            }
            this.updateProgressionIfNeeded(bar);
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
            this.updateProgressionIfNeeded(0); // to fix the first bar.
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

    sendCurrentPosition() {
        this.midi.sendCurrentPosition();
    }

    updateSettings(newSettings) {
        const oldActiveState = this.settings.currentActiveState;

        const oldBpm = this.settings.bpm;
        const oldTimeSignature = this.settings.timeSignature;

        if ('progression' in newSettings) {
            newSettings.progression.forEach((step) => {
                step.bars = Math.max(1, Math.min(16, step.bars));
                step.scale = Math.max(0, Math.min(Object.keys(SCALE_NAMES).length, step.scale));
                step.transposition = Math.max(-24, Math.min(24, step.transposition));
            });
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



        this.settings.scale = this.settings.progression[0].scale;
        this.settings.transposition = this.settings.progression[0].transposition;
        this.sequenceManager.saveToTmp();
    }
    
    calculateTickDuration() {
        return (60 / this.settings.bpm / this.settings.ppq) * 1000;
    }

    updateTrackSettings(index, trackSettings) {
        if (index >= 0 && index < this.tracks.length) {
            this.tracks[index].updateSettings(trackSettings);
        } else {
            this.tracks.push(new Track(trackSettings, this, index));
            // console.error(`Invalid track index: ${index}`);
        }
    }    

    scheduleLoop() {
        if (!this.isPlaying) return;

        const currentTime = this.clock.getCurrentTime();
        const lookAheadEnd = currentTime + this.scheduleAheadTime;

        this.tracks.forEach(track => {
            track.trackScheduler.scheduleEvents(lookAheadEnd);
        });

        this.midi.processEventQueue(currentTime);

         
        setImmediate(() => this.scheduleLoop());
    }

    updateProgressionIfNeeded(currentBar) {
        let totalBars = 0;
        let maxBars = this.settings.progression.reduce((acc, val) => acc + val.bars, 0);
        currentBar = currentBar % maxBars;

        for (const step of this.settings.progression) {
            totalBars += step.bars;
            
            if (currentBar < totalBars) {
                this.settings.scale = step.scale;
                this.settings.transposition = step.transposition;
                break;
            }
        }
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
        this.settings.progression = [{ bars: 4, scale: 0, transposition: 0 }];
        this.settings.currentActiveState = 0;
        this.settings.activeStates = Array(16).fill().map(() => Array(16).fill(true));
        this.settings.bpm = 120;
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
}

module.exports = Sequencer;