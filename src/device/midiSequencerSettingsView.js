const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');
const { scaleNumber } = require('../utils/scales');
const BPMCalculator = require('../utils/bpmCalculator');

class MidiSequencerSettingsView extends MidiView {
    constructor(controller) {
        super(controller);
        this.bpmCalculator = new BPMCalculator();
    }

    activate() {
        if (this.controller.terminalUI) {
            this.controller.terminalUI.setView('sequencerSettings');
        }
        this.midiButtons = midiSettings.trackButtonNotes;
    }

    handleButtonPress(note) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);

        switch (buttonIndex) {
            case 0:
                // Tap tempo button
                this.bpmCalculator.addTimestamp();
                if (this.bpmCalculator.getCurrentBPM()) {
                    this.controller.sequencer.updateSettings({ bpm: Math.round(this.bpmCalculator.getCurrentBPM()) });
                }
                break;
            case 1:
                // Go to Progression View
                this.controller.setView('progression');
                break;
            // Add more buttons here if needed
        }
    }

    handleKnobTurn(cc, value, shiftMode) {
        const currentKnobValue = cc - 16 + (shiftMode !== 0 ? 8 : 0);
        const currentBPM = this.controller.sequencer.settings.bpm;
        const newBPM = Math.round(this.knobValue(currentBPM, value));

        switch (currentKnobValue) {
            case 0:
                // BPM control
                this.controller.sequencer.updateSettings({ bpm: Math.min(300, Math.max(30, newBPM)) });
                this.showNumber(this.controller.sequencer.settings.bpm);
                break;
            // Add more knob controls here if needed
        }
    }

    updateLights() {
        const midiOutput = this.controller.midiOutput;

        this.turnOffAllEncoderLights();
        this.turnOffAllButtonLights();

        // BPM Encoder Light
        midiOutput.setEncoderRingValue(0, scaleNumber(30, 300, 1, 11, this.controller.sequencer.settings.bpm));

        // Tap Tempo Button Light
        midiOutput.setButtonLight(this.midiButtons[0], 127);

        // Progression View Button Light
        midiOutput.setButtonLight(this.midiButtons[1], 127);

        if (this.isShowingNumber) {
            return;
        }

        // Add more light updates here if needed
    }
}

module.exports = MidiSequencerSettingsView;