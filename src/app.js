const Sequencer = require('./core/sequencer');
const TerminalUI = require('./ui/terminalUI');
const MidiControllerUI = require('./device/midiControllerUI');
const Logger = require('./utils/logger');
// const midiSettings = require('../data/midiDeviceSettings.json');

let midiSettings;
try {
    midiSettings = require('../data/midiDeviceSettings.json');
} catch {
    console.warn("midiDeviceSettings.json not found. Using default settings.");
    midiSettings = {
        enabled: false,
        input: null,
        output: null
    };
}

// Initialize sequencer
const logger = new Logger();

const sequencer = new Sequencer(120, 24);
const ui = new TerminalUI(sequencer);

sequencer.logger = logger;
ui.logger = logger;
ui.views.sequencerSettings.loadFromTmp();
ui.start();

if (midiSettings.enabled) {
    try {
        const midiController = new MidiControllerUI(sequencer);
        ui.registerMidiController(midiController);
        midiController.start();
    } catch (error) {
        console.error("Failed to initialize MIDI controller:", error.message);
        midiSettings.enabled = false;
    }
}

console.log('Sequencer is booting. Press Ctrl+C to stop.');