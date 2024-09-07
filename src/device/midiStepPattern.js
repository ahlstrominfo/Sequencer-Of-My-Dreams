const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');

class MidiStepPattern extends MidiView {
    activate(trackIndex) {
        // Set up track view
        if (this.controller.terminalUI) {
            this.controller.terminalUI.currentTrack = trackIndex;
            this.controller.terminalUI.setView('stepPattern');
        }
        this.trackIndex = trackIndex;
        this.midiButtons = midiSettings.trackButtonNotes;
    }

    handleButtonPress(note) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const triggerSettings = track.settings.triggerSettings;

        if (buttonIndex !== -1) {

            const stepIndex = triggerSettings.steps.indexOf(buttonIndex);
            if (stepIndex === -1) {
                triggerSettings.steps.push(buttonIndex);
            } else {
                triggerSettings.steps.splice(stepIndex, 1);
            }
            triggerSettings.steps.sort((a, b) => a - b);
            track.updateSettings({
                triggerSettings: triggerSettings
            });
        }
    }


    updateLights() {
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const triggerSettings = track.settings.triggerSettings;
        const midiOutput = this.controller.midiOutput;

        this.turnOffAllEncoderLights();
        this.turnOffAllButtonLights();

        const pattern = new Array(16).fill(false);
        triggerSettings.steps.forEach(step => pattern[step] = true);

        pattern.forEach((step, index) => {
            midiOutput.setButtonLight(this.midiButtons[index], step ? 127 : 0);
        });
    }
}

module.exports = MidiStepPattern;