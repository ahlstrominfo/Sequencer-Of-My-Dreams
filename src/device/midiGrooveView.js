const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');
const { scaleNumber, musicalGrooves } = require('../utils/utils');

class MidiGrooveView extends MidiView {
    constructor(controller) {
        super(controller);
        this.selectedGroove = 0;
    }

    activate(trackIndex) {
        if (this.controller.terminalUI) {
            this.controller.terminalUI.currentTrack = trackIndex;
            this.controller.terminalUI.setView('groove');
        }
        this.trackIndex = trackIndex;
        this.midiButtons = midiSettings.trackButtonNotes;
        this.currentStep = 0;
    }

    handleButtonPress(note, shiftMode) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
    
        if (buttonIndex !== -1) {
            if (shiftMode !== 0 && trackSettings.groove.length > 1) {
                // Remove groove step
                trackSettings.groove.splice(this.currentStep, 1);
                this.currentStep = Math.min(this.currentStep, trackSettings.groove.length - 1);
                track.updateSettings({ groove: trackSettings.groove });
            } else if (buttonIndex < trackSettings.groove.length) {
                // Select groove step
                this.currentStep = buttonIndex;
            } else {
                // Add new groove step
                const lastStep = trackSettings.groove[trackSettings.groove.length - 1];
                const newStep = { ...lastStep };
                trackSettings.groove.push(newStep);
                track.updateSettings({ groove: trackSettings.groove });
                this.currentStep = trackSettings.groove.length - 1;
            }
        } else if (note === 39) {
            // Apply selected groove
            const groove = musicalGrooves[this.selectedGroove].groove.map(step => ({
                timeOffset: step[0],
                velocityOffset: step[1],
            }));
            track.updateSettings({
                groove: groove,
                grooveName: musicalGrooves[this.selectedGroove].name
            });
        }
    }
    handleKnobTurn(cc, value, shiftMode) {
        const currentKnobValue = cc - 16 + (shiftMode !== 0 ? 8 : 0);
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
        const currentGrooveStep = trackSettings.groove[this.currentStep];
    
        switch (currentKnobValue) {
            case 0:
                // Time offset
                currentGrooveStep.timeOffset = this.knobValue(currentGrooveStep.timeOffset, value);
                track.updateSettings({ groove: trackSettings.groove });
                this.showNumber(currentGrooveStep.timeOffset);
                break;
            case 1:
                // Velocity offset
                currentGrooveStep.velocityOffset = this.knobValue(currentGrooveStep.velocityOffset, value);
                track.updateSettings({ groove: trackSettings.groove });
                this.showNumber(currentGrooveStep.velocityOffset);
                break;
            case 7:
                // Select preset groove
                this.selectedGroove = Math.max(0, Math.min(musicalGrooves.length - 1, this.selectedGroove + (this.knobValueUp(value) ? 1 : -1)));
                this.showNumber(this.selectedGroove);
                break;
        }
    }
    
    updateLights() {
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
        const midiOutput = this.controller.midiOutput;
    
        this.turnOffAllEncoderLights();
        this.turnOffAllButtonLights();
    
        const currentGrooveStep = trackSettings.groove[this.currentStep];
        
        midiOutput.setEncoderRingValue(0, scaleNumber(-100, 100, 1, 11, currentGrooveStep.timeOffset));
        midiOutput.setEncoderRingValue(1, scaleNumber(-100, 100, 1, 11, currentGrooveStep.velocityOffset));
        midiOutput.setEncoderRingValue(7, scaleNumber(0, musicalGrooves.length - 1, 1, 11, this.selectedGroove));
    
        if (this.isShowingNumber) {
            return;
        }
    
        trackSettings.groove.forEach((step, index) => {
            if (this.currentStep === index) {
                midiOutput.setButtonLight(this.midiButtons[index], 1);
            } else {
                midiOutput.setButtonLight(this.midiButtons[index], step ? 127 : 0);
            }
        });
    }
}

module.exports = MidiGrooveView;