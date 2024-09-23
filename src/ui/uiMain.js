const BPMCalculator = require("../utils/bpmCalculator");
const UIBase = require("./uiBase");

class UIMain extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.bpmCalculator = new BPMCalculator();
        this.trackLabels = '0123456789abcdefghijklmnopqrstuvwxz'.split('');
        this.trackPlaying = Array(16).fill(false);
        this.trackPlayingTimeout = Array(16);
        this.registerEvents();
    }

    registerEvents() {
        this.sequencer.ticker.registerListener('eventHappening', (event) => {
            this.trackPlaying[event.data.trackId] = true;
            if (this.trackPlayingTimeout[event.data.trackId]) {
                clearTimeout(this.trackPlayingTimeout[event.data.trackId]);
            }
            this.trackPlayingTimeout[event.data.trackId] = setTimeout(() => {
                this.trackPlaying[event.data.trackId] = false;
            }, 100);
        });

    }

    getBoxDrawingCharacter(number) {
        // Round to nearest 10
        const roundedNumber = Math.round(number / 10) * 10;
        
        // Clamp the number between 0 and 100
        const clampedNumber = Math.max(0, Math.min(100, roundedNumber));
        
        // Map of numbers to box drawing characters
        const characterMap = {
          0: '─',
          10: '┌',
          20: '┐',
          30: '└',
          40: '┘',
          50: '├',
          60: '┤',
          70: '┬',
          80: '┴',
          90: '┼',
          100: '═'
        };
        
        // Return the corresponding character
        return characterMap[clampedNumber];
      }

    rowRender({formattedValue}) {
        return `${formattedValue !== undefined ? formattedValue : ''}`;
    }

    colRender({value, isSelected}) {
        if (isSelected) {
            return `[${value !== undefined ? value : ''}]`;
        }
        return ` ${value !== undefined ? value : ''} `;
    }

    openView() {
        this.editCol = 0;
        if (this.terminalUI.currentTrack !== null) {
             this.editCol = this.terminalUI.currentTrack + 1; // Adjusted for Sequencer column
        }

        this.rows = [];

        // Create Sequencer column
        const sequencerColumn = {
            value: () => {
                return 'S';
            },
            enter: () => {
                this.terminalUI.currentTrack = null;
                this.terminalUI.setView('sequencerSettings');
            }
        };

        // Labels row
        const labelCols = [sequencerColumn, ...this.sequencer.tracks.map((track, index) => {
            return {
                value: () => {
                    return this.trackLabels[index];
                },
                enter: () => {
                    this.terminalUI.currentTrack = index;
                    this.terminalUI.setView('track');
                }
            };
        })];

        this.rows.push({
            cols: labelCols,
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender
        });

        // Active notes row
        this.rows.push({
            cols: [
                { value: () => ' ' }, // Placeholder for Sequencer column
                ...this.sequencer.tracks.map((track) => ({
                    value: () => {
                        return this.trackPlaying[track.trackId] ? '■' : '□';
                    },
                    enter: () => {
                        track.updateSettings({ isActive: !track.settings.isActive });
                    }
                }))
            ],
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender,
            selectable: false
        });   

        // Active tracks row
        const activeCols = [
            {
                value: () => {
                    return ' ';//this.sequencer.getCurrentPosition().beat % 2 === 0 ? '♥' : '❤';
                },
                enter: () => {
                    this.bpmCalculator.addTimestamp();
                    if (this.bpmCalculator.getCurrentBPM()) {
                        this.sequencer.updateSettings({ bpm: this.bpmCalculator.getCurrentBPM() });
                    }
                }
            },
            ...this.sequencer.tracks.map((track) => ({
                value: () => {
                    return track.settings.isActive ? '■' : '□';
                },
                enter: () => {
                    track.updateSettings({ isActive: !track.settings.isActive });
                }
            }))
        ];

        this.rows.push({
            cols: activeCols,
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender
        });   
        
        // Volume row
        const volumeCols = [
            {
                value: () => {
                    return this.sequencer.isPlaying ? '▶' : '■';
                },
                enter: () => {
                    if (this.sequencer.isPlaying) {
                        this.sequencer.stop();
                    } else {
                        this.sequencer.start();
                    }
                }
            },
            ...this.sequencer.tracks.map((track) => ({
                value: () => {
                    return this.getBoxDrawingCharacter(track.settings.volume);
                },
                handle: (delta) => {                        
                    let newVolume = Math.round(track.settings.volume / 10) * 10;
                    newVolume = newVolume + (delta * 10);
                    track.updateSettings({ volume: newVolume });
                }
            }))
        ];

        this.rows.push({
            cols: volumeCols,
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender,
        });
        
        // Active states row
        const activeStateRows = [
            this.createProgressionChangeColumn(),
            ...this.sequencer.settings.activeStates.map((track, index) => ({
                value: () => {
                    return index === this.sequencer.settings.currentActiveState ? '■' : '□';
                },
                enter: () => {
                    this.sequencer.updateActiveState(index);
                },
            }))
        ];

        this.rows.push({
            cols: activeStateRows,
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender,            
        });
    }


    createProgressionChangeColumn() {
        this.progressionChangeNumber = null;
        this.progressionChangeBlinking = false;
        this.progressionChangeBlinkingState = true;
        return {
            value: () => {
                this.progressionChangeBlinkingState = !this.progressionChangeBlinkingState;
                if (this.progressionChangeBlinking && this.progressionChangeBlinkingState) {
                    return ' ';
                }
                if (this.progressionChangeNumber === null) {
                    this.progressionChangeNumber = this.sequencer.settings.currentProgressionIndex;
                    return this.sequencer.settings.currentProgressionIndex;
                }
                return this.progressionChangeNumber;
            },
            handle: (delta) => {
                this.progressionChangeNumber = this.progressionChangeNumber + delta;
                this.progressionChangeNumber = Math.max(0, Math.min(this.progressionChangeNumber, this.sequencer.settings.progressions.length -1)); 
            },
            enter: () => {
                if (this.isEditingField) {
                    const newProgression = this.progressionChangeNumber;
                    this.progressionChangeBlinking = true;
                    this.sequencer.scheduler.scheduleNextBar(() => {
                        this.sequencer.updateSettings({ currentProgressionIndex: newProgression });
                        this.progressionChangeBlinking = false;
                    }, {
                        type: 'progressionChange',
                        progressionIndex : newProgression
                    });
                }
                this.isEditingField = !this.isEditingField;
            }
        };
    }
}

module.exports = UIMain;