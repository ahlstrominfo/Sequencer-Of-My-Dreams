const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');
const { scaleNumber, SCALE_NAMES } = require('../utils/scales');

class MidiProgressionView extends MidiView {
    constructor(controller) {
        super(controller);
        this.currentStep = 0;
    }

    activate() {
        if (this.controller.terminalUI) {
            this.controller.terminalUI.setView('progression');
        }
        this.midiButtons = midiSettings.trackButtonNotes;
    }

    handleButtonPress(note, shiftMode) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        const progression = this.controller.sequencer.settings.progression;

        if (buttonIndex !== -1) {
            if (shiftMode !== 0 && progression.length > 1) {
                // Remove progression step
                progression.splice(this.currentStep, 1);
                this.currentStep = Math.min(this.currentStep, progression.length - 1);
                this.controller.sequencer.updateSettings({ progression });
            } else if (buttonIndex < progression.length) {
                // Select progression step
                this.currentStep = buttonIndex;
            } else {
                // Add new progression step
                const lastStep = progression[progression.length - 1];
                const newStep = { ...lastStep };
                progression.push(newStep);
                this.controller.sequencer.updateSettings({ progression });
                this.currentStep = progression.length - 1;
            }
        }
    }

    handleKnobTurn(cc, value, shiftMode) {
        const currentKnobValue = cc - 16 + (shiftMode !== 0 ? 8 : 0);
        const progression = this.controller.sequencer.settings.progression;
        const currentProgressionStep = progression[this.currentStep];

        switch (currentKnobValue) {
            case 0:
                // Bars
                currentProgressionStep.bars = this.knobValue(currentProgressionStep.bars, value);
                this.controller.sequencer.updateSettings({ progression });
                this.showNumber(currentProgressionStep.bars);
                break;
            case 1:
                // Scale
                currentProgressionStep.scale = Math.max(0, Math.min(Object.keys(SCALE_NAMES).length - 1, this.knobValue(currentProgressionStep.scale, value, true)));
                this.controller.sequencer.updateSettings({ progression });
                this.showNumber(currentProgressionStep.scale);
                break;
            case 2:
                // Transposition
                currentProgressionStep.transposition = this.knobValue(currentProgressionStep.transposition, value);
                this.controller.sequencer.updateSettings({ progression });
                this.showNumber(currentProgressionStep.transposition);
                break;
        }
    }

    updateLights() {
        const progression = this.controller.sequencer.settings.progression;
        const midiOutput = this.controller.midiOutput;

        this.turnOffAllEncoderLights();
        this.turnOffAllButtonLights();

        const currentProgressionStep = progression[this.currentStep];

        midiOutput.setEncoderRingValue(0, scaleNumber(1, 8, 1, 11, currentProgressionStep.bars));
        midiOutput.setEncoderRingValue(1, scaleNumber(0, Object.keys(SCALE_NAMES).length - 1, 1, 11, currentProgressionStep.scale));
        midiOutput.setEncoderRingValue(2, scaleNumber(-24, 24, 1, 11, currentProgressionStep.transposition));

        if (this.isShowingNumber) {
            return;
        }

        progression.forEach((step, index) => {
            if (this.currentStep === index) {
                midiOutput.setButtonLight(this.midiButtons[index], 1);
            } else {
                midiOutput.setButtonLight(this.midiButtons[index], 127);
            }
        });
    }
}

module.exports = MidiProgressionView;