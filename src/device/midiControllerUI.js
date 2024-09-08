const midiSettings = require('../../data/midiDeviceSettings.json');
const easymidi = require('easymidi');
const MidiOutput = require('./midiOutput');
const MidiMainView = require('./midiMainView');
const MidiTrackView = require('./midiTrackView');
const MidiStepPattern = require('./midiStepPattern');
const MidiNoteSeriesView = require('./midiNoteSeriesView');
const MidiGrooveView = require('./midiGrooveView');
const MidiProgressionView = require('./midiProgressionView');
const MidiSequencerSettingsView = require('./midiSequencerSettingsView');

class MidiControllerUI {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.terminalUI = null;
        this.input = null;
        this.output = null;
        
        this.shiftPressed = false;
        this.shiftMode = 0; // 0: none, 1: short, 2: long
        this.shiftLongThreshold = 1000; // 1 second for long shift
        this.shiftTimer = null;

        this.shiftPressCount = 0;
        this.shiftPressTimer = null;
        this.tripleShiftThreshold = 500; // 500ms for triple press detection
        
        this.lastShiftPressTime = 0;
        this.doublePressThreshold = 300; // 300ms for double press detection

        
        this.currentView = null;
        this.previousView = null;
        this.views = {
            main: new MidiMainView(this),
            track: new MidiTrackView(this),
            stepPattern: new MidiStepPattern(this),
            noteSeries: new MidiNoteSeriesView(this),
            groove: new MidiGrooveView(this),
            progression: new MidiProgressionView(this),
            sequencerSettings: new MidiSequencerSettingsView(this),
            // // Add more views as needed
        };

        this.connectMidiController();
        this.setupInputEvents();
        this.setView('main');
        this.currentViewName = 'main';
        this.viewHistory = [];
        this.goingBack = false;
    }

    connectMidiController() {
        const inputs = easymidi.getInputs();
        const outputs = easymidi.getOutputs();

        if (midiSettings.input === undefined || midiSettings.output === undefined) {
            console.log('Available MIDI Input Ports:', inputs);
            console.log('Available MIDI Output Ports:', outputs);
            process.exit(0);   
        }

        this.input = new easymidi.Input(midiSettings.input);
        this.midiOutput = new MidiOutput(midiSettings.output);
    }

    registerTerminalUI(terminalUI) {
        this.terminalUI = terminalUI;
    }

    updateTerminalUIView(mode) {
        if (this.terminalUI) {
            this.terminalUI.setView(mode);
        }
    }

    setupInputEvents() {
        this.input.on('noteon', (msg) => this.handleNoteOn(msg));
        this.input.on('noteoff', (msg) => this.handleNoteOff(msg));
        this.input.on('cc', (msg) => this.handleCC(msg));
    }

    setView(viewName, ...args) {
        if (this.currentView && !this.goingBack) {
            this.currentView.deactivate();
            this.viewHistory.push({ 
                name: this.currentViewName, 
                args: this.currentViewArgs
            });
        }
        this.currentViewName = viewName;
        this.currentView = this.views[viewName];
        this.currentViewArgs = args;
        this.currentView.activate(...args);
        this.updateLights();

        if (this.terminalUI) {
            this.terminalUI.setView(viewName, ...args);
        }

        if (viewName === 'main') {
            this.viewHistory = []; // Clear history when reaching main view
        }
    }

    goBackOneLevel() {
        try {
            if (this.viewHistory.length === 0 || this.currentView === this.views.main) {
                return; // Already at main view or no history, do nothing
            }
            const previousView = this.viewHistory.pop();
            const viewName = previousView.name;
            this.goingBack = true;
            this.setView(viewName, ...previousView.args);
            this.goingBack = false;
        } catch (error) {
            console.log(error);
        }

    }

    handleNoteOn(msg) {
        if (msg.velocity === 0) {
            this.handleNoteOff(msg);
            return;
        }

        if (msg.note === midiSettings.shiftButtonNote) {
            this.handleShiftPress();
        } else if(msg.note === midiSettings.playButtonNote && this.shiftMode === 0) {
            this.sequencer.tooglePlay();
            this.midiOutput.setPlayButtonLight(this.sequencer.isPlaying);
            
        } else {
            this.currentView.handleButtonPress(msg.note, this.shiftMode);
        }
    }

    handleNoteOff(msg) {
        if (msg.note === midiSettings.shiftButtonNote) {
            this.handleShiftRelease();
        } else {
            this.currentView.handleButtonRelease(msg.note);
        }
    }

    handleCC(msg) {
        this.currentView.handleKnobTurn(msg.controller, msg.value, this.shiftMode);
    }

    handleShiftPress() {
        const currentTime = Date.now();
        this.shiftPressCount++;

        if (this.shiftPressCount === 1) {
            this.shiftPressTimer = setTimeout(() => {
                this.shiftPressCount = 0;
            }, this.tripleShiftThreshold);
        }

        if (this.shiftPressCount === 3) {
            clearTimeout(this.shiftPressTimer);
            this.handleTripleShiftPress();
            return;
        }

        this.shiftPressed = true;
        this.shiftMode = 1; // Start in short shift mode
        this.currentView.handleButtonPress(null, this.shiftMode);
        this.midiOutput.setShiftButtonLight(1);
        
        this.shiftTimer = setTimeout(() => {
            if (this.shiftPressed) {
                this.shiftMode = 2;
                this.currentView.handleButtonPress(null, this.shiftMode);
                this.midiOutput.setShiftButtonLight(2);
            }
        }, this.shiftLongThreshold);

        this.lastShiftPressTime = currentTime;
    }

    handleShiftRelease() {
        this.shiftPressed = false;
        clearTimeout(this.shiftTimer);
        this.shiftMode = 0;
        this.currentView.handleButtonPress(null, this.shiftMode);
        this.midiOutput.setShiftButtonLight(0);

        if (this.shiftPressCount == 2) {
            this.goBackOneLevel();
        }
    }

    // handleDoubleShiftPress() {
    //     clearTimeout(this.shiftTimer);
    //     this.shiftMode = 0;
    //     this.shiftPressed = false;
    //     this.setView('main');
    //     if (this.terminalUI) {
    //         this.terminalUI.setView('main');
    //     }
    //     this.midiOutput.setShiftButtonLight(0);
    // }

    handleTripleShiftPress() {
        this.shiftPressCount = 0;
        this.shiftMode = 0;
        this.shiftPressed = false;
        this.setView('main');
        this.midiOutput.setShiftButtonLight(0);
    }

    updateLights() {
        this.midiOutput.startUpdate();
        this.currentView.updateLights();
        this.midiOutput.commitUpdate();
    }

    start() {
        setInterval(() => {
            this.currentView.updateLights();
        }, 100);
    }

    exit() {
        console.log('Shutting down midiDevice. Goodbye!');
        this.midiOutput.close();
        this.input.close();
        this.midiOutput.close();
    }

    noteButtonToTrack(note) {
        return midiSettings.trackButtonNotes.indexOf(note);
    }
}

module.exports = MidiControllerUI;