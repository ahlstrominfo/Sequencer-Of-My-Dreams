const UIBase = require("./uiBase");

class uiBinaryPattern extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;
        const triggerSettings = track.settings.triggerSettings;

        track.settings.triggerSettings.numbers.forEach((number, index) => {
            const cols = [
                {
                    name: 'number',
                    value: () => number,
                    handle: (delta, step) => {
                        triggerSettings.numbers[index] = number + delta * step;
                        track.updateSettings({
                            triggerSettings: triggerSettings
                        });
                        this.openView();
                    }
                },
                {
                    value: () => {
                        return number.toString(2).padStart(4, '0').split('').map(bit => bit === '1' ? '■' : '□').join('')
                    },
                    selectable: false,
                },
                {
                    name: 'Delete',
                    enter: () => {
                        if (triggerSettings.numbers.length <= 1) {
                            return;
                        }
                        // Delete note series
                        triggerSettings.numbers.splice(index, 1);
                        this.rows.splice(index, 1);
                        track.updateSettings({
                            triggerSettings: triggerSettings
                        });
                        this.openView();
                    }
                }
            ];
            this.rows.push({
                name: index + 1 + ': ',
                layout: 1,
                cols: cols,
                rowRender: ({prefix, formattedValue, isSelected, isEditing, row}) => {
                    return `${formattedValue !== undefined ? formattedValue : ''}`;
                }
            });
        });

        this.rows.push({
            name: 'Add new number',
            enter: () => {
                const lastNumber = triggerSettings.numbers[triggerSettings.numbers.length - 1];
                triggerSettings.numbers.push(lastNumber);
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new number <`;
                }
                return ` Add new number`;
            }
        });
    }

    render() {
        console.log('Binary Pattern');
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

module.exports = uiBinaryPattern;