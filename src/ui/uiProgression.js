const UIBase = require("./uiBase");
const { scaleNames } = require('../utils/utils');


class UIProgression extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const progression = this.sequencer.settings.progression;
        progression.forEach((chord, index) => {
            const cols = [
                {
                    name: 'Bars',
                    value: () => chord.bars,
                    handle: (delta, step) => {
                        chord.bars = chord.bars + delta * step;
                        this.sequencer.updateSettings({ progression });
                    }
                },
                {
                    name: 'Scale',
                    value: () => scaleNames[chord.scale],
                    handle: (delta, step) => {
                        chord.scale = chord.scale + delta;
                        this.sequencer.updateSettings({ progression });
                    }
                },
                {
                    name: 'Transposition',
                    value: () => chord.transposition,
                    handle: (delta, step) => {
                        chord.transposition = chord.transposition + delta * step;
                        this.sequencer.updateSettings({ progression });
                    }
                },
                {
                    name: 'Delete',
                    enter: () => {
                        if (progression.length <= 1) {
                            return;
                        }
                        // Delete note series
                        progression.splice(index, 1);
                        this.rows.splice(index, 1);
                        this.openView();
                    }
                }];



            this.rows.push({
                name: index + 1 + ': ',
                layout: 1,
                cols: cols,
                rowRender: ({formattedValue}) => {
                    return `${formattedValue !== undefined ? formattedValue : ''}`;
                }
            });
        });

        this.rows.push({ name: '------------------', selectable: false });
        this.rows.push({
            name: 'Add new progression step',
            enter: () => {
                const lastChord = progression[progression.length - 1];
                const newChord = { ...lastChord };
                progression.push(newChord);
                this.editRow = progression.length - 1;
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new progression step <`;
                }
                return ` Add new progression step`;
            }
        });
    }

    render() {
        console.log('Progression');
         console.log('------------------');
         super.render();
         console.log('------------------');
 
     }

     handleEscape() {
        if (this.isEditingField) {
            this.isEditingField = false;
        } else {
            this.terminalUI.setView('sequencerSettings')
        }
    }
}

module.exports = UIProgression;