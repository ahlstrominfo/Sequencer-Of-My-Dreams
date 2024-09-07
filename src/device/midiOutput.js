const easymidi = require('easymidi');
const midiSettings = require('../../data/midiDeviceSettings.json');

class MidiOutput {
    constructor(outputName) {
        this.output = new easymidi.Output(outputName);
        this.buttonLightStates = new Map();
        this.encoderRingStates = new Map();
        this.pendingButtonLightStates = new Map();
        this.pendingEncoderRingStates = new Map();
        this.isUpdating = false;

        this.trackButtonNotes = midiSettings.trackButtonNotes;
        this.shiftButtonNote = midiSettings.shiftButtonNote;
        this.playButtonNote = midiSettings.playButtonNote;
        this.encoderCCs = midiSettings.encoderCCs;
    }

    startUpdate() {
        this.isUpdating = true;
        this.pendingButtonLightStates.clear();
        this.pendingEncoderRingStates.clear();
    }

    setButtonLight(note, state) {
        if (this.isUpdating) {
            this.pendingButtonLightStates.set(note, state);
        } else {
            this._setButtonLightImmediate(note, state);
        }
    }

    // 32 - 43 : fill up like volume
    // 0 - 11 : single bar moving
    setEncoderRingValue(encoderIndex, value) {
        if (this.isUpdating) {
            this.pendingEncoderRingStates.set(encoderIndex, value);
        } else {
            this._setEncoderRingValueImmediate(encoderIndex, value);
        }
    }

    commitUpdate() {
        if (!this.isUpdating) return;

        for (const [note, state] of this.pendingButtonLightStates) {
            if (this.buttonLightStates.get(note) !== state) {
                this._setButtonLightImmediate(note, state);
            }
        }

        for (const [encoderIndex, value] of this.pendingEncoderRingStates) {
            if (this.encoderRingStates.get(encoderIndex) !== value) {
                this._setEncoderRingValueImmediate(encoderIndex, value);
            }
        }

        this.isUpdating = false;
    }

    _setButtonLightImmediate(note, state) {
        this.output.send('noteon', {
            note: note,
            velocity: state,
            channel: 0
        });
        this.buttonLightStates.set(note, state);
    }

    _setEncoderRingValueImmediate(encoderIndex, value) {
        if (encoderIndex >= 0 && encoderIndex < this.encoderCCs.count) {
            this.output.send('cc', {
                controller: this.encoderCCs.start + encoderIndex,
                value: value,
                channel: 0
            });
            this.encoderRingStates.set(encoderIndex, value);
        }
    }

    // setButtonLight(note, state) {
    //     // state: 0 = off, 127 = on, 1 = blinking
    //     this.output.send('noteon', {
    //         note: note,
    //         velocity: state,
    //         channel: 0
    //     });
    //     this.buttonLightStates.set(note, state);
    // }



    // setEncoderRingValue(encoderIndex, value) {
    //     if (encoderIndex >= 0 && encoderIndex < this.encoderCCs.count) {
    //         this.output.send('cc', {
    //             controller: this.encoderCCs.start + encoderIndex,
    //             value: value,
    //             channel: 0
    //         });
    //     }
    // }
    
    setShiftButtonLight(state) {
        let velocity = state === 1 ? 127 : state === 2 ? 1 : state;
        this.setButtonLight(this.shiftButtonNote, velocity);
    }

    setPlayButtonLight(state) {
        this.setButtonLight(this.playButtonNote, state ? 127 : 0);
    }

    close() {
        this.trackButtonNotes.forEach((note) => {
            this._setButtonLightImmediate(note,  0);
        });

        for (let i = 0; i < 8; i++) {
            this._setEncoderRingValueImmediate(i, 0);
        }
        this.output.close();
    }
}

module.exports = MidiOutput;