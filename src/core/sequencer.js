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
        this.logger = new Logger();
        this.ticker = new Ticker(bpm, this.settings.timeSignature, this);

        this.loadActiveStates = false;

        // Race condition and state management protection
        this.isInitialized = false;
        this.isStarting = false;
        this.isStopping = false;
        this.loopIsRunning = false;
        this.lastToggleTime = 0;
        this.toggleDebounceMs = 50; // Prevent rapid toggles within 50ms

        this.cleanSequencer();
        this.setupClockCallbacks();

        this.listeners = {};

        this.maxBeats = 0;
        this.progressionSteps = [];

        // Mark as initialized after all components are set up
        this.isInitialized = true;
    }

    setupClockCallbacks() {
        this.ticker.registerListener('bar', () => {
            if(this.loadActiveStates) {
                this.setActiveState();
                this.loadActiveStates = false;
            }
        });
        this.ticker.registerListener('pulse', (position) => {
            if (position.currentPulse === 0) {
                this.midi.sendStart();
                const songPosition = Math.floor(position.currentPulse / this.ticker.pulsesPerSixteenth);
                this.midi.sendSongPosition(songPosition);
            }

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
        // Check if sequencer is properly initialized
        if (!this.isInitialized) {
            this.logger.log('Cannot start sequencer: not fully initialized');
            return false;
        }

        // Prevent race conditions during start/stop operations
        if (this.isStarting || this.isStopping) {
            this.logger.log('Cannot start sequencer: start/stop operation already in progress');
            return false;
        }

        // Already playing
        if (this.isPlaying) {
            return true;
        }

        // Set starting flag to prevent race conditions
        this.isStarting = true;

        try {
            // Verify all required components are ready
            if (!this.ticker || !this.scheduler || !this.midi) {
                throw new Error('Required components not available');
            }

            // Verify tracks are initialized
            if (this.tracks.length === 0) {
                throw new Error('No tracks available');
            }

            // Start the ticker
            this.ticker.start();

            // Plan song if active
            if (this.settings.song && this.settings.song.active) {
                this.planSong();
            }

            // Set playing state
            this.isPlaying = true;

            // Start the schedule loop if not already running
            if (!this.loopIsRunning) {
                this.loopIsRunning = true;
                this.scheduleLoop();
            }

            this.logger.log('Sequencer started successfully');
            return true;

        } catch (error) {
            this.logger.log(`Failed to start sequencer: ${error.message}`);
            this.isPlaying = false;
            return false;
        } finally {
            // Clear starting flag
            this.isStarting = false;
        }
    }
    
    stop() {
        // Prevent race conditions during start/stop operations
        if (this.isStarting || this.isStopping) {
            this.logger.log('Cannot stop sequencer: start/stop operation already in progress');
            return false;
        }

        // Already stopped
        if (!this.isPlaying) {
            return true;
        }

        // Set stopping flag to prevent race conditions
        this.isStopping = true;

        try {
            // Stop the ticker
            if (this.ticker) {
                this.ticker.stop();
            }

            // Clear scheduled events
            if (this.scheduler) {
                this.scheduler.clearEvents();
            }

            // Set playing state to false
            this.isPlaying = false;

            // Note: loopIsRunning will naturally stop when isPlaying becomes false
            // We don't force-stop it here to avoid race conditions in scheduleLoop

            this.logger.log('Sequencer stopped successfully');
            return true;

        } catch (error) {
            this.logger.log(`Error stopping sequencer: ${error.message}`);
            return false;
        } finally {
            // Clear stopping flag
            this.isStopping = false;
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
        const currentTime = Date.now();
        
        // Debounce rapid toggle requests
        if (currentTime - this.lastToggleTime < this.toggleDebounceMs) {
            this.logger.log('Toggle request ignored: too rapid');
            return false;
        }
        
        this.lastToggleTime = currentTime;

        // Prevent toggles during start/stop operations
        if (this.isStarting || this.isStopping) {
            this.logger.log('Toggle request ignored: operation in progress');
            return false;
        }

        if (this.isPlaying) {
            return this.stop();
        } else {
            return this.start();
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
        if (this.isPlaying && this.loopIsRunning) {
            this.scheduler.processEvents();
            // Schedule next iteration
            this.realTimeKeeper.setTimeout(() => this.scheduleLoop(), 1);
        } else {
            // Loop is stopping
            this.loopIsRunning = false;
        }
    }

    calculateProgressionSteps() {
        const beatsPerBar = this.settings.timeSignature[0];
        this.songProgressionSteps = [];
        this.regularProgressionSteps = [];
        let songTotalBeats = 0;
        let regularTotalBeats = 0;
    
        // Calculate song mode steps
        if (this.settings.song.parts && this.settings.song.parts.length > 0) {
            this.settings.song.parts.forEach((part, partIndex) => {
                const progression = this.settings.progressions[part.progression];
                const partDuration = part.bars * beatsPerBar;
                let partBeat = 0;
    
                while (partBeat < partDuration) {
                    for (let stepIndex = 0; stepIndex < progression.length; stepIndex++) {
                        const step = progression[stepIndex];
                        const stepDuration = (step.bars * beatsPerBar) + step.beats;
                        const endBeat = Math.min(partBeat + stepDuration, partDuration);
                        this.songProgressionSteps.push({
                            partIndex,
                            progressionIndex: part.progression,
                            stepIndex,
                            startBeat: songTotalBeats,
                            endBeat: songTotalBeats + (endBeat - partBeat),
                            scale: step.scale,
                            transposition: step.transposition,
                            key: step.key,
                            activeState: part.activeState
                        });
                        const actualStepDuration = endBeat - partBeat;
                        partBeat += actualStepDuration;
                        songTotalBeats += actualStepDuration;
    
                        if (partBeat >= partDuration) {
                            break;  // This break is now correctly within the for loop
                        }
                    }
                }
            });
        }
    
        // Calculate regular progression steps
        this.settings.progressions[this.settings.currentProgressionIndex].forEach((step, stepIndex) => {
            const stepDuration = (step.bars * beatsPerBar) + step.beats;
            regularTotalBeats += stepDuration;
            this.regularProgressionSteps.push({
                progressionIndex: this.settings.currentProgressionIndex,
                stepIndex,
                startBeat: regularTotalBeats - stepDuration,
                endBeat: regularTotalBeats,
                scale: step.scale,
                transposition: step.transposition,
                key: step.key
            });
        });
    
        this.songTotalLength = songTotalBeats;
        this.regularTotalLength = regularTotalBeats;
    }
    
    gracefulShutdown() {
        this.stop();
        
        // Wait a moment for any pending operations to complete
        setTimeout(() => {
            this.ticker.sendAllNoteOffEvents();
            this.midi.close();
        }, 10);
    }

    cleanSequencer() {
        this.stop();
        this.ticker.sendAllNoteOffEvents();
        this.tracks.forEach(track => {
            track.trackPlan.teardownTickerListeners();
        });

        // Reset state flags
        this.isStarting = false;
        this.isStopping = false;
        this.loopIsRunning = false;
        this.lastToggleTime = 0;

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
        const beatsPerBar = this.settings.timeSignature[0];
        let totalBeats = (bar * beatsPerBar) + beat;
    
        if (this.settings.song.active && this.songProgressionSteps.length > 0) {
            // Use song mode progression
            totalBeats = totalBeats % this.songTotalLength;
            const step = this.songProgressionSteps.find(step => 
                step.startBeat <= totalBeats && totalBeats < step.endBeat
            );
    
            if (step) {
                this.updateSettings({
                    currentProgressionIndex: step.progressionIndex,
                    currentActiveState: step.activeState
                }, false);  // false to prevent recursive saving
                return step;
            }
        } else {
            // Use regular progression
            totalBeats = totalBeats % this.regularTotalLength;
            const step = this.regularProgressionSteps.find(step => 
                step.startBeat <= totalBeats && totalBeats < step.endBeat
            );
    
            if (step) {
                return step;
            }
        }
    
        // Fallback to first step if not found (shouldn't happen if calculations are correct)
        return this.settings.song.active ? this.songProgressionSteps[0] : this.regularProgressionSteps[0];
    }
}

module.exports = Sequencer;