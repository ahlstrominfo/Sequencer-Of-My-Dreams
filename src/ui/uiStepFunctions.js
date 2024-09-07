const uiBase = require('./uiBase');

class UIStepFunctions extends uiBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;
        const stepFunctions = track.settings.stepFunctions;

        this.rows = Object.keys(stepFunctions).map((key, index) => {
            return {
                name: key.padEnd(10),
                layout: 1,
                colsLayout: 0,
                cols: stepFunctions[key].map((stepFunction, index) => {
                    return {
                        value: () => {
                            const fun = track.settings.stepFunctions[key][index];
                            if (fun === null || fun === -1) {
                                return ' - ';
                            }
                            return ' ' + fun + ' ';
                        },
                        handle: (delta, step) => {
                            track.settings.stepFunctions[key][index] = Math.max(-1, Math.min(9, track.settings.stepFunctions[key][index] + delta * step));
                            track.updateSettings({
                                stepFunctions: track.settings.stepFunctions
                            });
                        }
                    }
                }),
            };
        });
    }

    render() {
        console.log('StepFunctions');
        console.log('------------------');
        super.render();
        console.log('------------------');
    }

    handleEscape() {
        if (this.isEditingField) {
            this.isEditingField = false;
        } else {
            super.handleLeave();
            this.terminalUI.setView('track');
        }
    }      
}
module.exports = UIStepFunctions;