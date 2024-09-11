const UITableView = require("./uiTableView");


class UISongMode extends UITableView {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const song = this.sequencer.settings.song;

        song.parts.forEach((part, partIndex) => {
            const cols = [];
            cols.push({
                name: `Progression`,
                value: () => part.progression,
                handle: (delta) => {
                    part.progression = part.progression + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                    this.openView();
                }
            });
            cols.push({
                name: `Bars`,
                value: () => part.bars,
                handle: (delta) => {
                    part.bars = part.bars + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                    this.openView();
                }
            });
            cols.push({
                name: `Active State`,
                value: () => part.activeState,
                handle: (delta) => {
                    part.activeState = part.activeState + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                    this.openView();
                }
            });
            cols.push({
                name: 'Delete',
                value: 'Delete',
                enter: () => {
                    if (song.parts.length > 1) {
                        return;
                    }
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts.splice(partIndex, 1);
                    this.sequencer.updateSettings({ song: updatedSong });
                }
            });

            this.rows.push({
                name: `Part ${partIndex}`,
                cols: cols
            }); 
        });

        this.rows.push({
            name: 'Add Part',
            enter: () => {
                const updatedSong = { ...this.sequencer.settings.song };
                updatedSong.parts.push({ progression: 0, bars: 4, activeState: 0 });
                this.sequencer.updateSettings({ song: updatedSong });
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new part <`;
                }
                return ` Add new part`;
            }
        });
    }

    render() {
        console.log('SongMode');
         console.log('------------------');
         super.render();
     }

     handleEscape() {
        if (this.isEditingField) {
            this.isEditingField = false;
        } else {
            this.terminalUI.setView('sequencerSettings');
        }
    }
}
module.exports = UISongMode;