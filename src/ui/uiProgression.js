const UIBase = require("./uiBase");
const { SCALE_NAMES, KEYS } = require('../utils/scales');


class UIProgression extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const progressions = this.sequencer.settings.progressions;
        this.rows.push({
            name: 'Current progression',
            value : () => this.sequencer.settings.currentProgressionIndex,
            handle: (delta) => {
                const currentProgressionIndex = this.sequencer.settings.currentProgressionIndex + delta;
                this.sequencer.updateSettings({ currentProgressionIndex });
                this.openView();
            },
        });
        this.rows.push({ name: '------------------', selectable: false });

        progressions.forEach((progression, progressionIndex) => {

            this.rows.push({ name: ` Progression Group: ${progressionIndex}`, selectable: false });
            
            progression.forEach((chord, chordIndex) => {
                const cols = [
                    {
                        name: 'Bars',
                        value: () => chord.bars,
                        handle: (delta, step) => {
                            chord.bars = chord.bars + delta * step;
                            const updatedProgressions = [...this.sequencer.settings.progressions];
                            updatedProgressions[progressionIndex] = [...progression];
                            this.sequencer.updateSettings({ progressions: updatedProgressions });
                        }
                    },
                    {
                        name: 'Beats',
                        value: () => chord.beats,
                        handle: (delta, step) => {
                            chord.beats = chord.beats + delta * step;
                            const updatedProgressions = [...this.sequencer.settings.progressions];
                            updatedProgressions[progressionIndex] = [...progression];
                            this.sequencer.updateSettings({ progressions: updatedProgressions });
                        }
                    },
                    {
                        name: 'Key',
                        value: () => KEYS[chord.key],
                        handle: (delta) => {
                            chord.key = chord.key + delta;
                            const updatedProgressions = [...this.sequencer.settings.progressions];
                            updatedProgressions[progressionIndex] = [...progression];
                            this.sequencer.updateSettings({ progressions: updatedProgressions });
                        }
                    },
                    {
                        name: 'Scale',
                        value: () => SCALE_NAMES[chord.scale],
                        handle: (delta) => {
                            chord.scale = chord.scale + delta;
                            const updatedProgressions = [...this.sequencer.settings.progressions];
                            updatedProgressions[progressionIndex] = [...progression];
                            this.sequencer.updateSettings({ progressions: updatedProgressions });
                        }
                    },
                    {
                        name: 'Transposition',
                        value: () => chord.transposition,
                        handle: (delta, step) => {
                            chord.transposition = chord.transposition + delta * step;
                            const updatedProgressions = [...this.sequencer.settings.progressions];
                            updatedProgressions[progressionIndex] = [...progression];
                            this.sequencer.updateSettings({ progressions: updatedProgressions });
                        }
                    },
                    {
                        name: 'Delete',
                        enter: () => {
                            // Ensure we're not deleting the last chord in the entire progression
                            if (this.sequencer.settings.progressions.flat().length <= 1) {
                                return;
                            }
                    
                            // Remove the chord from the current progression
                            progression.splice(chordIndex, 1);
                    
                            // If the progression is now empty, remove it
                            if (progression.length === 0) {
                                this.sequencer.settings.progressions.splice(progressionIndex, 1);
                            }
                    
                            // Update the sequencer settings and refresh the view
                            this.sequencer.updateSettings({ progressions: this.sequencer.settings.progressions });
                            this.openView();
                        }
                    }];
    
    
    
                this.rows.push({
                    name: chordIndex + 1 + ': ',
                    layout: 1,
                    cols: cols,
                    rowRender: ({formattedValue}) => {
                        return `${formattedValue !== undefined ? formattedValue : ''}`;
                    }
                });
            });
    

      
            

            const editCols = [];

            editCols.push({
                name: 'Add new progression step',
                enter: () => {
                    const lastChord = progression[progression.length - 1];
                    const newChord = { ...lastChord };
                    
                    const updatedProgressions = [...this.sequencer.settings.progressions];
                    updatedProgressions[progressionIndex] = [...progression, newChord];
                    
                    this.sequencer.updateSettings({ progressions: updatedProgressions });
                    this.openView();
                },
                rowRender: ({isSelected}) => {
                    if (isSelected) {
                        return `> Add new progression step <`;
                    }
                    return ` Add new progression step`;
                }
            });

            editCols.push({
                name: 'Remove progression group',
                enter: () => {
                    if (this.sequencer.settings.progressions.length <= 1) {
                        return;
                    }
                    this.sequencer.settings.progressions.splice(progressionIndex, 1);
                    this.sequencer.updateSettings({ progressions });
                    this.openView();
                }
            }); 
            this.rows.push({
                name: 'Edit',
                layout: 1,
                cols:editCols,
                rowRender: ({formattedValue}) => {
                    return `${formattedValue !== undefined ? formattedValue : ''}`;
                }
            });
            
            this.rows.push({ name: ' ------------------', selectable: false });

        });

    
        // this.rows.push({ name: '------------------', selectable: false });
        this.rows.push({ name: '', selectable: false });
        this.rows.push({
            name: 'Add new progression group',
            enter: () => {
                const progressions = this.sequencer.settings.progressions;
                const lastProgression = progressions[progressions.length - 1];
                // Create a deep copy of the last progression
                const newProgression = JSON.parse(JSON.stringify(lastProgression));
                
                // Add the new progression to the existing array
                const updatedProgressions = [...progressions, newProgression];
                
                this.sequencer.updateSettings({ progressions: updatedProgressions });
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new progression group <`;
                }
                return ` Add new progression group`;
            }
        });

    }

    render() {
        console.log('Progression');
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

module.exports = UIProgression;