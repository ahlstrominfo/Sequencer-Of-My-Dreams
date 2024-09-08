
const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');
const { scaleNumber } = require('../utils/scales');

class MidiNoteSeriesView extends MidiView {
    activate(trackIndex) {
        if (this.controller.terminalUI) {
            this.controller.terminalUI.currentTrack = trackIndex;
            this.controller.terminalUI.setView('noteSeries');
        }
        this.trackIndex = trackIndex;
        this.midiButtons = midiSettings.trackButtonNotes;
        this.currentNoteIndex = 0;
        this.modifyAB = false;
    }

    handleButtonPress(note, shiftMode) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;

        if (buttonIndex !== -1) {
            if (shiftMode !== 0 && trackSettings.noteSeries.length > 1) {
                track.updateSettings({
                    noteSeries: trackSettings.noteSeries.filter((note, index) => index !== this.currentNoteIndex)
                });
                this.currentNoteIndex = Math.min(this.currentNoteIndex, trackSettings.noteSeries.length - 1);                
            } else if (buttonIndex < trackSettings.noteSeries.length) {
                this.currentNoteIndex = buttonIndex;
            } else {
                const noteSeries = trackSettings.noteSeries;
                const lastNoteSeries = noteSeries[noteSeries.length - 1];
                const newNoteSeries = { ...lastNoteSeries };
                const newestNoteSeries = [...noteSeries, newNoteSeries];

                track.updateSettings({
                    noteSeries: newestNoteSeries
                });

                this.currentNoteIndex = trackSettings.noteSeries.length - 1;
            }
        } else if (shiftMode !== 0) {
            this.modifyAB = true;
        } else if (shiftMode === 0 && note === null) {
            this.modifyAB = false;
        }
    }

    handleKnobTurn(cc, value, shiftMode) {
        const currentKnobValue = cc - 16 + (shiftMode !== 0 ? 8 : 0);
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
        const currentNoteSeries = trackSettings.noteSeries[this.currentNoteIndex];

        switch (currentKnobValue) {
            case 0:
                currentNoteSeries.rootNote = this.knobValue(currentNoteSeries.rootNote, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.rootNote);
                break;
            case 1:
                currentNoteSeries.numberOfNotes = this.knobValue(currentNoteSeries.numberOfNotes, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.numberOfNotes);
                break;
            case 2:
                currentNoteSeries.inversion = this.knobValue(currentNoteSeries.inversion, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.inversion);
                break;
            case 3:
                currentNoteSeries.velocity = this.knobValue(currentNoteSeries.velocity, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.velocity);
                break;
            case 4: 
                currentNoteSeries.velocitySpan = this.knobValue(currentNoteSeries.velocitySpan, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.velocitySpan);
                break;

            case 5:
                currentNoteSeries.pitchSpan = this.knobValue(currentNoteSeries.pitchSpan, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.pitchSpan);
                break;

            case 6:
                currentNoteSeries.probability = this.knobValue(currentNoteSeries.probability, value);
                this.showNumber(currentNoteSeries.probability);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                break;
                
            case 14:
                currentNoteSeries.aValue = this.knobValue(currentNoteSeries.aValue, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.aValue);
                break;                

            case 15:
                currentNoteSeries.bValue = this.knobValue(currentNoteSeries.bValue, value);
                track.updateSettings({ noteSeries: trackSettings.noteSeries });
                this.showNumber(currentNoteSeries.bValue);
                break;
        }

    }

    updateLights() {
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
        const midiOutput = this.controller.midiOutput;

        this.turnOffAllEncoderLights();
        this.turnOffAllButtonLights();

        const currentNoteSeries = trackSettings.noteSeries[this.currentNoteIndex];
        if (this.modifyAB) {
            midiOutput.setEncoderRingValue(6, scaleNumber(1, 8, 1, 11, currentNoteSeries.aValue));
            midiOutput.setEncoderRingValue(7, scaleNumber(1, 8, 1, 11, currentNoteSeries.bValue));
        } else {
            midiOutput.setEncoderRingValue(0, scaleNumber(0, 127, 1, 11, currentNoteSeries.rootNote));
            midiOutput.setEncoderRingValue(1, scaleNumber(0, 8, 1, 11, currentNoteSeries.numberOfNotes));
            midiOutput.setEncoderRingValue(2, scaleNumber(-5, 5, 1, 11, currentNoteSeries.inversion));
            midiOutput.setEncoderRingValue(3, scaleNumber(0, 127, 1, 11, currentNoteSeries.velocity));
            midiOutput.setEncoderRingValue(4, scaleNumber(0, 127, 1, 11, currentNoteSeries.velocitySpan));
            midiOutput.setEncoderRingValue(5, scaleNumber(-24, 24, 1, 11, currentNoteSeries.pitchSpan));
            midiOutput.setEncoderRingValue(6, scaleNumber(0, 100, 1, 11, currentNoteSeries.probability));
        }

        if (this.isShowingNumber) {
            return;
        }

        trackSettings.noteSeries.forEach((note, index) => {
            if (this.currentNoteIndex === index) {
                midiOutput.setButtonLight(this.midiButtons[index], 1);
            } else {
                midiOutput.setButtonLight(this.midiButtons[index], note ? 127 : 0);
            }
        });
    }

}

module.exports = MidiNoteSeriesView;