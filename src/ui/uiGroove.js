const { musicalGrooves } = require("../utils/utils");
const UIBase = require("./uiBase");

class UIGroove extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);

        this.selectedGroove = 0;
        this.inSelectGroove = false;
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        track.settings.groove.forEach((grooveStep, index) => {
            const cols = [
                {
                    name: 'Time',
                    value: () => grooveStep.timeOffset,
                    handle: (delta, step) => {
                        grooveStep.timeOffset = grooveStep.timeOffset + delta * step;
                        track.updateSettings({
                            groove: track.settings.groove
                        });
                    }
                },
                {
                    name: 'Velocity',
                    value: () => grooveStep.velocityOffset,
                    handle: (delta, step) => {
                        grooveStep.velocityOffset = grooveStep.velocityOffset + delta * step;
                        track.updateSettings({
                            groove: track.settings.groove
                        });
                    }
                },
                {
                    name: 'Delete',
                    enter: () => {
                        if (track.settings.groove.length <= 1) {
                            return;
                        }
                        track.settings.groove.splice(index, 1);
                        this.openView();
                    }
                }
            ];
            this.rows.push({
                name: index + 1 + ': ',
                layout: 1,
                cols: cols,
                rowRender: ({formattedValue}) => {
                    return `${formattedValue !== undefined ? formattedValue : ''}`;
                }
            });
        });
        this.rows.push({
            name: ' ',
            selectable: false
        });

        this.rows.push({
            name: 'Add new groove step',
            enter: () => {
                const lastGrooveStep = track.settings.groove[track.settings.groove.length - 1];
                const newGrooveStep = { ...lastGrooveStep };
                track.settings.groove.push(newGrooveStep);
                this.editRow = track.settings.groove.length - 1;
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new groove step <`;
                }
                return ` Add new groove step`;
            }
        });
        this.rows.push({
            name: '------------------',
            selectable: false
        });

        this.rows.push({
            name: 'Apply Groove',
            value: () => musicalGrooves[this.selectedGroove].name,
            handle: (delta, step) => {
                this.selectedGroove = Math.max(0, Math.min(musicalGrooves.length - 1, this.selectedGroove + delta * step));
                this.openView();
            },
            enter: () => {
                if (this.isEditingField) {
                    const groove = [];
                    musicalGrooves[this.selectedGroove].groove.forEach((grooveStep) => {
                        groove.push({
                            timeOffset: grooveStep[0],
                            velocityOffset: grooveStep[1],
                        });
                    });
                    track.updateSettings({
                        groove: groove,
                        grooveName: musicalGrooves[this.selectedGroove].name
                    });


                    this.editRow = 0;
                    this.openView();
                }
                this.isEditingField = !this.isEditingField;

            }
        });        
    }

    render() {
        console.log('Groove Settings');
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

module.exports = UIGroove;