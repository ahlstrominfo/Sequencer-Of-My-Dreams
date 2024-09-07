const midiSettings = require('../../data/midiDeviceSettings.json');

class MidiView {
    constructor(controller) {
        this.controller = controller;
        this.isShowingNumber = false;
        this.showNumberTimeout = null;
        this.showNumberDelayTimer = null;
    }

    // eslint-disable-next-line no-unused-vars
    activate(...args) {
        // Override in subclasses
    }

    deactivate() {
        // Override in subclasses
    }

    // eslint-disable-next-line no-unused-vars
    handleButtonPress(note, shiftMode) {
        // Override in subclasses
    }

    // eslint-disable-next-line no-unused-vars
    handleButtonRelease(note) {
        // Override in subclasses
    }

    // eslint-disable-next-line no-unused-vars
    handleKnobTurn(cc, value, shiftMode) {
        // Override in subclasses
    }

    updateLightsView() {
        if (this.isShowingNumber) return;

        this.controller.midiOutput.startUpdate();
        this.updateLights();
        this.controller.midiOutput.commitUpdate();
    }

    updateLights() {
        // Override in subclasses
    }

    knobValueUp(knobValue) {
        return knobValue <= 64;
    }

    knobValue(currentValue, knobValue, small = false) {
        if (small) {
            const newValue = currentValue + (knobValue >= 64 ? -1 : 1);
            return newValue;
        }
        const newValue = currentValue + (knobValue >= 64 ? - (knobValue-64) : knobValue);
        return newValue;
    }

    showNumber(number) {
        // Clear any existing timers
        if (this.showNumberTimeout) {
            clearTimeout(this.showNumberTimeout);
        }
        if (this.showNumberDelayTimer) {
            clearTimeout(this.showNumberDelayTimer);
        }

        const digits = number.toString().split('');

        // Immediately show the first digit
        this.isShowingNumber = true;
        this.showDigit(parseInt(digits[0]));

        // Set a delay before showing the full number
        this.showNumberDelayTimer = setTimeout(() => {
            const showRemainingDigits = (index) => {
                if (index < digits.length) {
                    const digit = parseInt(digits[index]);
                    
                    // Show the digit
                    setTimeout(() => {
                        this.showDigit(digit);
                    }, 0);

                    // Turn off lights after showing the digit
                    setTimeout(() => {
                        this.turnOffAllButtonLights();
                    }, 300);

                    // Show next digit after a blank interval
                    setTimeout(() => {
                        showRemainingDigits(index + 1);
                    }, 400); // 300ms display + 100ms blank
                } else {
                    // All digits shown, update lights
                    setTimeout(() => {
                        this.isShowingNumber = false;
                        this.updateLightsView();
                    }, 200);
                }
            };

            // Start showing from the second digit (if it exists)
            if (digits.length > 1) {
                this.turnOffAllButtonLights();
                showRemainingDigits(1);
            } else {
                // If there's only one digit, we've already shown it, so just set a timer to end
                this.showNumberTimeout = setTimeout(() => {
                    this.isShowingNumber = false;
                    this.updateLightsView();
                }, 300);
            }
        }, 500); // 500ms delay before showing the full number
    }

    showDigit(digit) {
        this.controller.midiOutput.startUpdate();
        this.turnOffAllButtonLights();
        
        if (digit === 0) {
            for (let i = 9; i < 16; i++) {
                this.controller.midiOutput.setButtonLight(midiSettings.trackButtonNotes[i], 127);
            }
        } else {
            this.controller.midiOutput.setButtonLight(midiSettings.trackButtonNotes[digit - 1], 127);
        }
        this.controller.midiOutput.commitUpdate();
    }

    turnOffAllButtonLights() {
        this.controller.midiOutput.startUpdate();
        midiSettings.trackButtonNotes.forEach(note => {
            this.controller.midiOutput.setButtonLight(note, 0);
        });
        this.controller.midiOutput.commitUpdate();
    }

    turnOffAllEncoderLights() {
        this.controller.midiOutput.startUpdate();
        for (let i = 0; i < 8; i++) {
            this.controller.midiOutput.setEncoderRingValue(i, 0);
        }
        this.controller.midiOutput.commitUpdate();
    }
}

module.exports = MidiView;