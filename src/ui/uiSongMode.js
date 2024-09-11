const UITableView = require("./uiTableView");


class UISongMode extends UITableView {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const song = this.sequencer.settings.song;

        /*
        
                    song: {
                'active': false,
                'parts': [
                    {
                        progression: 0,
                        bars: 4,
                        activeState: 0
                    }
                ],
            }
                */

        this.rows.push({
            name: 'Song Mode ON',
            value: () => song.active ? 'ON' : 'OFF',
            enter: () => {
                this.sequencer.updateSettings({ song: { active: !song.active } });
            }
        });

        song.parts.forEach((part, partIndex) => {
            const cols = [];
            cols.push({
                name: `Part ${partIndex}`,
                value: () => part.progression,
                handle: (delta) => {
                    part.progression = part.progression + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                }
            });
            cols.push({
                name: `Bars ${partIndex}`,
                value: () => part.bars,
                handle: (delta) => {
                    part.bars = part.bars + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                }
            });
            cols.push({
                name: `Active State ${partIndex}`,
                value: () => part.activeState,
                handle: (delta) => {
                    part.activeState = part.activeState + delta;
                    const updatedSong = { ...this.sequencer.settings.song };
                    updatedSong.parts[partIndex] = { ...part };
                    this.sequencer.updateSettings({ song: updatedSong });
                }
            });

            this.rows.push({
                name: `Part ${partIndex}`,
                cols: cols
            }); 
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