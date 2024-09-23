const MidiCommunicator = require('./midiCommunicator');
const SequenceManager = require('./sequenceManager');
const SequenceScheduler = require('./sequenceScheduler');
const { Track } = require('./track');
const { SCALE_NAMES, KEYS } = require('../utils/scales');
const Logger = require('../utils/logger');
const Ticker = require('./ticker');

class Sequencer {
    constructor(bpm = 120, ppq = 96, realTimeKeeper) {
        this.settings = {
            bpm: bpm,
            ppq: ppq,
            timeSignature: [4, 4],
            swing: 0,
            progressions: null,
            currentProgressionIndex: null,
            activeStates: Array(16).fill().map(() => Array(16).fill(true)),
            currentActiveState: 0
        };

        this.realTimeKeeper = realTimeKeeper;
        this.tracks = [];
        this.isPlaying = false;
        this.midi = new MidiCommunicator(this);
        this.sequenceManager = new SequenceManager(this);
        this.scheduler = new SequenceScheduler(this);
        this.ticker = new Ticker(bpm, this.settings.timeSignature, this);

        this.logger = new Logger();

        this.loadActiveStates = false;

        this.cleanSequencer();
        this.setupClockCallbacks();

        this.listeners = {};

        this.maxBeats = 0;
        this.progressionSteps = [];

        this.loopIsRunning = false;
    }

    setupClockCallbacks() {
        this.ticker.registerListener('bar', () => {
            if(this.loadActiveStates) {
                this.setActiveState();
                this.loadActiveStates = false;
            }
        });
        this.ticker.registerListener('pulse', (position) => {
            if (position.pulse % (this.ticker.pulsesPerBeat / 24) === 0) {
                this.midi.sendClock();
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
            this.ticker.start();

            if (this.settings.song.active) {
                this.planSong();
            }
    
            this.isPlaying = true;
    
            if (!this.loopIsRunning) {
                this.scheduleLoop();
            }
        }
    }
    
    stop() {
        if (this.isPlaying) {
            this.ticker.stop();
            this.isPlaying = false;
            this.scheduler.clearEvents();

        }
    }
    
    planSong() {
        const song = this.settings.song;
        let nrBars = 0;
    
        const currentBar = this.ticker.getPosition().bar;
    
        // Set initial progression and active state
        this.updateSettings({
            currentProgressionIndex: song.parts[0].progression,
            currentActiveState: song.parts[0].activeState
        });
    
        // Start from the second part (index 1)
        for (let i = 1; i < song.parts.length; i++) {
            const part = song.parts[i];
            nrBars += song.parts[i - 1].bars; // Add bars from the previous part
    
            // Schedule progression change
            this.scheduler.scheduleEvent(currentBar + nrBars, 0, () => {
                this.updateSettings({ 
                    currentProgressionIndex: part.progression,
                });
            }, {
                type: 'progressionChange',
                progressionIndex: part.progression
            });
    
            // Schedule active state change
            this.scheduler.scheduleEvent(currentBar + nrBars, 0, () => {
                this.updateSettings({ 
                    currentActiveState: part.activeState,
                });
            }, {
                type: 'activeStateChange',
                activeState: part.activeState
            });
        }
    
        // Add the bars from the last part
        nrBars += song.parts[song.parts.length - 1].bars;
    
        // Schedule the next planSong call
        this.scheduler.scheduleEvent(currentBar + nrBars, 0, () => {
            this.planSong();
        }, {
            type: 'planSong'
        });
    } 

    tooglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }   
    }

    updateSettings(newSettings, shouldSaveToTmp = true) {
        const oldActiveState = this.settings.currentActiveState;

        if ('song' in newSettings) {
            newSettings.song.parts.forEach((part) => {
                part.progression = Math.max(0, Math.min(this.settings.progressions.length - 1, part.progression));
                part.bars = Math.max(1, Math.min(1000, part.bars));
                part.activeState = Math.max(0, Math.min(15, part.activeState));
            });
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

        if ('bpm' in newSettings){
            this.logger.log('BPM changed to ' + newSettings.bpm);
            newSettings.bpm = Math.min(300, Math.max(30, newSettings.bpm));
            this.ticker.setBPM(newSettings.bpm);
        }



        Object.assign(this.settings, newSettings);

        if (oldActiveState !== this.settings.currentActiveState) {
            if (this.isPlaying && this.settings.song.active === false) {
                this.loadActiveStates = true;
            } else {
                this.setActiveState();
            }
        }

        if ('progressions' in newSettings || 'currentProgressionIndex' in newSettings) {
            this.calculateProgressionSteps();
        }

        shouldSaveToTmp && this.sequenceManager.saveToTmp();
    }

    updateTrackSettings(index, trackSettings) {
        if (index >= 0 && index < this.tracks.length) {
            this.tracks[index].updateSettings(trackSettings, false);
        } else {
            this.tracks.push(new Track(trackSettings, this, index));        
        }
    }    

    scheduleLoop() {
        if (this.isPlaying) {
            this.scheduler.processEvents();
        }         
        this.realTimeKeeper.setImmediate(() => this.scheduleLoop());
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
    
    gracefulShutdown() {
        this.stop();
        this.ticker.sendAllEventsNoteOff();
        this.midi.close();
    }

    cleanSequencer() {
        this.stop();
        this.ticker.sendAllNoteOffEvents();
        this.tracks.forEach(track => {
            track.trackPlan.teardownTickerListeners();
        });

        // this.ticker.clearAllListeners();
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
        this.settings.song = {
            active: false,
            parts: []
        };
        this.settings.currentProgressionIndex = 0;
        this.updateSettings(this.settings, false);
        
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
        this.updateSettings({ currentActiveState: index }, true);   
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

    getProgressionAtPosition(bar, beat) {
        const firstEvent = this.scheduler.scheduledEvents
            .filter(event => (event.bar === bar && event.beat <= beat && event.type === 'progressionChange'));

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