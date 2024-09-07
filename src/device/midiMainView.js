const midiSettings = require('../../data/midiDeviceSettings.json');
const MidiView = require('./midiView');
const { scaleNumber } = require('../utils/utils');

class MidiMainView extends MidiView {
    constructor(controller) {
        super(controller);
        this.currentLightsMode = 0;
        this.knobTurnModeTimer = null;
        this.knobIsTurning = false;
        this.currentTrackKnob = null;
    }

    activate() {
        // Set up main view
    }

    /*
    * Handle button presses in the main view
    * Pressing trackButtons toogles activeState of the track (mute)
    * Holding short-shift and pressing trackButtons opens the track view for the track
    * Holding long-shift and pressing trackButtons changes the sequencers activeState
    * 
    * @param {number} note - MIDI note number
    * @param {number} shiftMode - 0: no shift, 1: short shift, 2: long shift
    * 
    * @returns {void}
    */
    handleButtonPress(note, shiftMode) {
        const trackIndex = midiSettings.trackButtonNotes.indexOf(note);

        if (midiSettings.playButtonNote === note && shiftMode !== 0) {
            this.controller.setView('sequencerSettings');
            return;
        }

        try {
            switch (shiftMode) {
                case 2:
                    if (trackIndex !== -1) { // track button pressed
                        this.controller.sequencer.updateActiveState(trackIndex);
                    }
                    this.currentLightsMode = 1;
                    break;
                case 1:
                    if (trackIndex !== -1) { // track button pressed
                        this.controller.setView('track', trackIndex);
                    } else {
                        this.currentLightsMode = 0;
                    }
                    break;
                default:
                    if (trackIndex !== -1) { // track button pressed
                        this.controller.sequencer.tracks[trackIndex].updateSettings({ isActive: !this.controller.sequencer.tracks[trackIndex].settings.isActive });
                    }
                    this.currentLightsMode = 0;
                    break;
            }
        } catch (error) {
            this.controller.sequencer.logger.log(`Error: ${error}`);
        }

    }

    handleButtonRelease() {
        this.currentLightsMode = 0;
    }

    handleKnobTurn(cc, value, shiftMode) {
        const currentTrackKnob = cc - 16 + (shiftMode !== 0 ? 8 : 0);
        const currentTrack = this.controller.sequencer.tracks[currentTrackKnob];
        const currentVolume = currentTrack.settings.volume;
        const newVolume = currentVolume + (value >= 64 ? - (value-64) : value);

        this.controller.sequencer.tracks[currentTrackKnob].updateSettings({ volume: newVolume });

        this.showNumber(newVolume);
    }


    /*
    * Update the lights in the main view
    *
    *  @param {number} mode - 0: which tracks are active 1: which sequencer active state is active
    * 
    * @returns {void}
    */
    updateLights() {
        if (this.isShowingNumber) {
            return;
        }

        if (this.currentLightsMode === 0) {
            midiSettings.trackButtonNotes.forEach((note, index) => {
                const track = this.controller.sequencer.tracks[index];
                const blink = track.trackScheduler.getActiveNotes().length > 0 ? 1 : 127;
                this.controller.midiOutput.setButtonLight(note, track.settings.isActive ? blink : 0);
            });
        } else if (this.currentLightsMode === 1) {
            midiSettings.trackButtonNotes.forEach((note, index) => {
                const light = this.controller.sequencer.settings.currentActiveState === index ? 127 : 0;
                this.controller.midiOutput.setButtonLight(note, light);
            });
        }

        midiSettings.trackButtonNotes.forEach((note, index) => {
            const track = this.controller.sequencer.tracks[index];
            const scaledVolume = scaleNumber(0, 200, 32, 43, track.settings.volume);
            this.controller.midiOutput.setEncoderRingValue(index, scaledVolume);
        });        
    }
}

module.exports = MidiMainView;