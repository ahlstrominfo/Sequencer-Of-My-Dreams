const MidiView = require('./midiView');
const midiSettings = require('../../data/midiDeviceSettings.json');
const { TRIGGER_TYPES } = require('../patterns/triggerPatterns');
const { scaleNumber, findMultiplierPreset, findMultiplierIndex,  MULTIPLIER_PRESETS } = require('../utils/utils');
const { ARP_MODES } = require('../utils/arps');

class MidiTrackView extends MidiView {
    constructor(controller) {
        super(controller);
        this.trackIndex = null;
    }

    activate(trackIndex) {
        // Set up track view
        if (this.controller.terminalUI) {
            this.controller.terminalUI.currentTrack = trackIndex;
            this.controller.terminalUI.setView('track');
        }
        this.trackIndex = trackIndex;
        this.midiButtons = midiSettings.trackButtonNotes;

        this.modifyBinaryPattern = false;
        this.modifyEuclideanPattern = false;
    }

    handleButtonPress(note) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        const track = this.controller.sequencer.tracks[this.trackIndex];

        if (this.modifyBinaryPattern) {
            if (note > 32 && note < 40) { //knob press is from 32 to 39
                const step = note - 32;
                const triggerSettings = track.settings.triggerSettings;

                if (step >= triggerSettings.numbers.length) {
                    triggerSettings.numbers.push(0);
                } else if (step <= triggerSettings.numbers.length ) {
                    triggerSettings.numbers.splice(step, 1);
                }
                track.updateSettings({
                    triggerSettings: triggerSettings
                });
            }
            return;
        }


        try {
            switch (buttonIndex) {
                case 0:
                    // Groove
                    this.controller.setView('groove', this.trackIndex);
                    break;
                case 1:
                    // Note Series
                    this.controller.setView('noteSeries', this.trackIndex);
                    break;
                case 3:
                    // Tie note series to pattern
                    track.updateSettings({ tieNoteSeriestoPattern: !track.settings.tieNoteSeriestoPattern });
                    break;
                case 4:
                    // Use max duration
                    track.updateSettings({ useMaxDuration: !track.settings.useMaxDuration });
                    break;
                case 6:
                    // Wonky Arp
                    track.updateSettings({ wonkyArp: !track.settings.wonkyArp });
                    break;
                case 8:
                    // init
                    track.updateSettings({
                        triggerType: TRIGGER_TYPES.INIT
                    });
                    break;
                case 9:
                    // binary
                    if (track.settings.triggerType === TRIGGER_TYPES.BINARY) {
                        this.modifyBinaryPattern = true;
                    } else {
                        track.updateSettings({
                            triggerType: TRIGGER_TYPES.BINARY
                        });
                    }
                    break;
                case 10:
                    // eucl
                    if (track.settings.triggerType === TRIGGER_TYPES.EUCLIDEAN) {
                        this.modifyEuclideanPattern = true;
                    } else {
                        track.updateSettings({
                            triggerType: TRIGGER_TYPES.EUCLIDEAN
                        });
                    }
                    break;
                case 11:
                    // step
                    if (track.settings.triggerType === TRIGGER_TYPES.STEP) {
                        this.controller.setView('stepPattern', this.trackIndex);
                    } else {
                        track.updateSettings({
                            triggerType: TRIGGER_TYPES.STEP
                        });
                    }
                    break;
                case 14:
                    // Conform note
                    track.updateSettings({ conformNotes: !track.settings.conformNotes });
    
                    break;
                case 15:
                    // Active
                    track.updateSettings({ isActive: !track.settings.isActive });
    
                    break;
                default:
                    break;
            }
        } catch (error) {
            this.controller.sequencer.logger.log(`Error: ${error}`);
        }
        
    }

    handleKnobTurn(cc, value, shiftMode) {
        try {
            const currentKnobValue = cc - 16 + (shiftMode !== 0 ? 8 : 0);
            const track = this.controller.sequencer.tracks[this.trackIndex];
            const settings = track.settings;

            if (this.modifyBinaryPattern) {
                const triggerSettings = track.settings.triggerSettings;

                if (currentKnobValue < triggerSettings.numbers.length) {
                    triggerSettings.numbers[currentKnobValue] = Math.max(0, Math.min(15, this.knobValue(triggerSettings.numbers[currentKnobValue], value, true)));
                    this.showNumber(triggerSettings.numbers[currentKnobValue]);
                    track.updateSettings({ triggerSettings });
                }
                return;
            }

            if (this.modifyEuclideanPattern) {
                const triggerSettings = track.settings.triggerSettings;
                switch (currentKnobValue) {
                    case 0:
                        // Length
                        triggerSettings.length = Math.max(1, Math.min(100, this.knobValue(triggerSettings.length, value)));
                        this.showNumber(triggerSettings.length);
                        break;
                    case 1:
                        // Hits
                        triggerSettings.hits = Math.max(1, Math.min(triggerSettings.length, this.knobValue(triggerSettings.hits, value)));
                        this.showNumber(triggerSettings.hits);
                        break;
                    case 2:
                        // Shift
                        triggerSettings.shift = Math.max(1, Math.min(triggerSettings.length, this.knobValue(triggerSettings.shift, value)));
                        this.showNumber(triggerSettings.shift);
                        break;
                    default:
                        break;
                }
                track.updateSettings({ triggerSettings });
                return;
            }


            switch (currentKnobValue) {
                case 0:
                    track.updateSettings({ swingAmount: this.knobValue(settings.swingAmount, value) });
                    this.showNumber(settings.swingAmount);
                    // Swing
                    break;
                case 1:
                    // Probability
                    track.updateSettings({ probability: this.knobValue(settings.probability, value) });
                    this.showNumber(settings.probability);
                    break;
                case 2:
                    // Speed
                    track.updateSettings({ speedMultiplier: findMultiplierPreset(settings.speedMultiplier, this.knobValueUp(value) ? 1 : -1) });
                    this.showNumber(findMultiplierIndex(settings.speedMultiplier));
                    break;
                case 3:
                    // Play Speed
                    track.updateSettings({ playMultiplier: findMultiplierPreset(settings.playMultiplier, this.knobValueUp(value) ? 1 : -1) });
                    this.showNumber(findMultiplierIndex(settings.playMultiplier));
                    break;
                case 4:
                    // Max duration factor
                    track.updateSettings({ maxDurationFactor: findMultiplierPreset(settings.maxDurationFactor, this.knobValueUp(value) ? 1 : -1) });
                    this.showNumber(findMultiplierIndex(settings.maxDurationFactor));
                    break;
                case 5:
                    // Resync Interval
                    track.updateSettings({
                        resyncInterval: this.knobValue(settings.resyncInterval, value)
                    });
                    this.showNumber(settings.resyncInterval);
                    break;
                case 6:
                    // Arp Mode
                    track.updateSettings({
                        arpMode: this.knobValue(settings.arpMode, value, true)
                    });
                    this.showNumber(settings.arpMode);
                    break;
                case 7:
                    // Vol
                    track.updateSettings({
                        volume: this.knobValue(settings.volume, value)
                    });
                    this.showNumber(settings.volume);
                    break;
                case 15:
                    // Channel
                    track.updateSettings({
                        channel: this.knobValue(settings.channel, value)
                    });    
                    this.showNumber(settings.channel);            
                    break;
                default:
                    break;
            }
        } catch (error) {
            this.controller.sequencer.logger.log(`Error: ${error}`);
        }
    }

    handleButtonRelease(note) {
        const buttonIndex = midiSettings.trackButtonNotes.indexOf(note);
        if (buttonIndex === 10) {
            this.modifyEuclideanPattern = false;
        }
        if (buttonIndex === 9) {
            this.modifyBinaryPattern = false;
        }
    }

    updateLights() {
        const track = this.controller.sequencer.tracks[this.trackIndex];
        const trackSettings = track.settings;
        const midiOutput = this.controller.midiOutput;


        this.turnOffAllEncoderLights();

        if (this.modifyBinaryPattern) {
            trackSettings.triggerSettings.numbers.forEach((number, index) => {
                midiOutput.setEncoderRingValue(index, scaleNumber(0, 15, 1, 11, number));
            });


        } else if (this.modifyEuclideanPattern) {
            //
            midiOutput.setEncoderRingValue(0, scaleNumber(0, 100, 1, 11, trackSettings.triggerSettings.length));
            midiOutput.setEncoderRingValue(1, scaleNumber(0, 100, 1, 11, trackSettings.triggerSettings.hits));
            midiOutput.setEncoderRingValue(2, scaleNumber(0, 100, 1, 11, trackSettings.triggerSettings.shift));
            // settings.triggerSettings.length = Math.max(1, Math.min(100, settings.triggerSettings.length + delta * step));


        } else {
            midiOutput.setEncoderRingValue(0, scaleNumber(0, 100, 1, 11, track.settings.swingAmount));
            midiOutput.setEncoderRingValue(1, scaleNumber(0, 100, 1, 11, track.settings.probability));
            midiOutput.setEncoderRingValue(2, scaleNumber(0, Object.keys(MULTIPLIER_PRESETS).length -1 , 1, 11, findMultiplierIndex(track.settings.speedMultiplier)));
            midiOutput.setEncoderRingValue(3, scaleNumber(0, Object.keys(MULTIPLIER_PRESETS).length -1 , 1, 11, findMultiplierIndex(track.settings.playMultiplier)));
            midiOutput.setEncoderRingValue(4, scaleNumber(0, Object.keys(MULTIPLIER_PRESETS).length -1 , 1, 11, findMultiplierIndex(track.settings.maxDurationFactor)));
            midiOutput.setEncoderRingValue(5, scaleNumber(0, 100, 1, 11, track.settings.resyncInterval));
            midiOutput.setEncoderRingValue(6, scaleNumber(0, Object.keys(ARP_MODES).length - 1, 1, 11, track.settings.arpMode));

            if (midiOutput.shiftMode !== 0) {
                midiOutput.setEncoderRingValue(7, scaleNumber(0, 15, 1, 11, track.settings.channel));
            } else {
                midiOutput.setEncoderRingValue(7, scaleNumber(0, 200, 1, 11, track.settings.volume));
            }
        }

        if (this.isShowingNumber) {
            return;
        }

    
        this.turnOffAllButtonLights();

        midiOutput.setButtonLight(this.midiButtons[0], track.settings.groove.length > 1 ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[1], track.settings.noteSeries.length > 0 ? 127 : 0);

        midiOutput.setButtonLight(this.midiButtons[3], track.settings.tieNoteSeriestoPattern ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[4], track.settings.useMaxDuration ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[6], track.settings.wonkyArp ? 127 : 0);

        midiOutput.setButtonLight(this.midiButtons[8], track.settings.triggerType === TRIGGER_TYPES.INIT ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[9], track.settings.triggerType === TRIGGER_TYPES.BINARY ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[10], track.settings.triggerType === TRIGGER_TYPES.EUCLIDEAN ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[11], track.settings.triggerType === TRIGGER_TYPES.STEP ? 127 : 0);

        midiOutput.setButtonLight(this.midiButtons[14], track.settings.conformNotes ? 127 : 0);
        midiOutput.setButtonLight(this.midiButtons[15], track.settings.isActive ? 127 : 0);
    }
}

module.exports = MidiTrackView;