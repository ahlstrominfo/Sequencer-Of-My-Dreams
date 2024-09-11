const UISequencerSettings = require('./uiSequencerSettings');
const UIBinaryPattern = require('./uiBinaryPattern');
const UINoteSeries = require('./uiNoteSeries');
const UIStepPattern = require('./uiStepPattern');
const UILoadSequence = require('./uiLoadSequence');
const UIProgression = require('./uiProgression');
const UITrack = require('./uiTrack');
const UIGroove = require('./uiGroove');
const UIMain = require('./uiMain');
const UIStepFunctions = require('./uiStepFunctions');
const UISongMode = require('./uiSongMode');
const Logger = require('../utils/logger');
const readline = require('readline');

class TerminalUI {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.midiController = null;
        this.currentTrack = 0;
        this.logger = new Logger();
        this.useLogRecording = true;
        this.viewPositions = {};

        this.views = {
            main: new UIMain(this, sequencer),
            sequencerSettings: new UISequencerSettings(this, sequencer),
            binaryPattern: new UIBinaryPattern(this, sequencer),
            stepFunctions: new UIStepFunctions(this, sequencer),
            stepPattern: new UIStepPattern(this, sequencer),
            noteSeries: new UINoteSeries(this, sequencer),
            loadSequence: new UILoadSequence(this, sequencer),
            progression: new UIProgression(this, sequencer),
            track: new UITrack(this, sequencer),
            groove: new UIGroove(this, sequencer),
            songMode: new UISongMode(this, sequencer),
        };

        this.currentView = null;
        this.setView('main');

        this.setupKeyListeners();

        setInterval(() => {
            if (this.useLogRecording) {
                this.logger.clear();
            }
        }, 10000);

        this.sequencer.registerListener('trackSettingsUpdated', () => {
            const currentViewCopy = Object.assign({}, this.currentView);

            this.currentView.openView();
            this.currentView.editRow = currentViewCopy.editRow;
            this.currentView.editCol = currentViewCopy.editCol;
        });

        this.sequencer.registerListener('sequencerSettingsUpdated', () => {
            const currentViewCopy = Object.assign({}, this.currentView);

            this.currentView.openView();
            this.currentView.editRow = currentViewCopy.editRow;
            this.currentView.editCol = currentViewCopy.editCol;
        });
    }

    // setView(viewName, ...args) {
    //     if (this.currentView) {
    //         this.currentView.handleLeave();
    //     }
    //     this.currentView = this.views[viewName];
    //     this.currentView.openView(viewName, ...args);
    // }

    setView(viewName, ...args) {
        if (this.currentView) {
            // Store the current position before leaving the view
            this.viewPositions[this.currentView.constructor.name] = {
                editRow: this.currentView.editRow,
                editCol: this.currentView.editCol
            };
            this.currentView.handleLeave();
        }
        this.currentView = this.views[viewName];
        
        // Restore the previous position if it exists
        const savedPosition = this.viewPositions[this.currentView.constructor.name];
        if (savedPosition) {
            this.currentView.editRow = savedPosition.editRow;
            this.currentView.editCol = savedPosition.editCol;
        } else {
            // Reset to default if no saved position
            this.currentView.editRow = 0;
            this.currentView.editCol = 0;
        }

        this.currentView.openView(viewName, ...args);
    }

    render() {
        console.clear();
        console.log('Sequencer Of My Dreams > > > >\n');
        this.currentView.render();
        if (this.useLogRecording) {
            console.log(this.logger.logs.map(({message}) => message).join('\n'));
        }
    }

    start() {
        this.setView('main');
        this.updateInterval = setInterval(() => this.render(), 100);
    }


    registerMidiController(midiController) {
        this.midiController = midiController;
        this.midiController.registerTerminalUI(this);
    }

    exit() {
        clearInterval(this.updateInterval);
        process.stdin.setRawMode(false);
        if (this.midiController) {
            this.midiController.exit();
        }
        this.sequencer.gracefulShutdown();
        console.log('Shutting down sequencer. Goodbye!');
        process.exit(0);
    }

    setupKeyListeners() {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        process.stdin.on('keypress', (key, data) => {
            if (data.shift && this.currentView === this.views.track) {
                if (data.name === 'left') {
                    this.currentTrack = (this.currentTrack - 1 + 16) % 16;
                    this.setView('track');
                } else if (data.name === 'right') {
                    this.currentTrack = (this.currentTrack + 1 + 16) % 16;
                    this.setView('track');
                }
            } else if (data.ctrl && data.name === 'c') {
                this.exit();
            } else if (data.name === 'escape' || (data.meta && data.name === 'b')) {
                this.handleEscape();
            } else if (data.name === 'return') {
                this.handleEnter();
            } else if (data.name === 'up' || data.name === 'down') {
                this.handleUpDown(data.name);
            } else if (data.name === 'left' || data.name === 'right') {
                this.handleLeftRight(data.name);
            }
            this.render();
        });
    }

    handleEnter() {
        this.currentView.handleEnter();
    }

    handleEscape() {
        this.currentView.handleEscape();
    }

    handleUpDown(direction) {
        const delta = direction === 'up' ? 1 : -1;
        this.currentView.handleNavigation(delta, 1);
    }

    handleLeftRight(direction) {
        const delta = direction === 'right' ? 1 : -1;
        this.currentView.handleLeftRight(delta);
    }

    print(message) {
        console.log(message);
    }
}

module.exports = TerminalUI;