const UIBase = require("./uiBase");

class UIStepPattern extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;
        const triggerSettings = track.settings.triggerSettings;


        const pattern = new Array(16).fill(false);
        triggerSettings.steps.forEach(step => pattern[step] = true);

        this.rows = [
            {
                name: 'Steps',
                layout: 1,
                colsLayout: 0,
                cols: pattern.map((_, i) => {
                    return {
                        name: i + 1,
                        value: () => {
                            return pattern[i] === true ? '■' : '□';
                        },
                        enter : () => {
                            const stepIndex = triggerSettings.steps.indexOf(i);
                            if (stepIndex === -1) {
                                triggerSettings.steps.push(i);
                            } else {
                                triggerSettings.steps.splice(stepIndex, 1);
                            }
                            
                            triggerSettings.steps.sort((a, b) => a - b);
                            track.updateSettings(settings);
                            this.openView();
                        }
                    }
                })
            },
        ];
    }

    render() {
        this.openView();
        console.log('Step Pattern');
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
module.exports = UIStepPattern;