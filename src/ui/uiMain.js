const BPMCalculator = require("../utils/bpmCalculator");
const UIBase = require("./uiBase");
const { TRIGGER_TYPES } = require("../patterns/triggerPatterns");
const colors = require("../utils/colors");

class UIMain extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.bpmCalculator = new BPMCalculator();
        this.trackLabels = '0123456789abcdefghijklmnopqrstuvwxz'.split('');
        this.trackPlaying = Array(16).fill(false);
        this.trackPlayingTimeout = Array(16);
        this.registerEvents();
        this.bigHeart = false;
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

        this.sequencer.ticker.registerListener('beat', () => {
            this.bigHeart = !this.bigHeart;
        });
    }

    isActiveStateStored(activeStateData) {
        // Check if the active state has been modified from the default (all true)
        const defaultState = Array(16).fill(true);
        return !this.arraysEqual(activeStateData, defaultState);
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
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

    getTrackPatternVisualization(track, maxDisplayLength = null) {
        if (!track.trackPlan || !track.trackPlan.triggerPattern) {
            return '';
        }
        
        const settings = track.settings;
        
        // INIT tracks should not show any pattern steps
        if (settings.triggerType === TRIGGER_TYPES.INIT) {
            return '';
        }
        
        // Determine the visualization length based on track settings (same logic as track view)
        const triggerSettings = settings.triggerSettings;
        let vizLength;
        
        if (triggerSettings.patternLength && triggerSettings.patternLength > 0) {
            // Use the specific pattern length setting
            vizLength = triggerSettings.patternLength;
        } else {
            // Use "all" - full pattern length based on pattern type
            switch (settings.triggerType) {
                case TRIGGER_TYPES.EUCLIDEAN:
                    vizLength = triggerSettings.length;
                    break;
                case TRIGGER_TYPES.BINARY:
                    vizLength = triggerSettings.numbers.length * 4;
                    break;
                case TRIGGER_TYPES.STEP:
                    vizLength = 16;
                    break;
                default:
                    vizLength = 16;
                    break;
            }
        }
        
        // If resync interval is set and shorter than pattern, limit visualization to that length
        if (settings.resyncInterval && settings.resyncInterval > 0 && settings.resyncInterval < vizLength) {
            vizLength = settings.resyncInterval;
        }
        
        const visualization = track.trackPlan.triggerPattern.getVisualization(vizLength);
        
        // If no maxDisplayLength specified, use a reasonable maximum based on terminal width
        if (maxDisplayLength === null) {
            maxDisplayLength = Math.min(vizLength, 80); // Show full pattern up to 80 characters
        }
        
        // Truncate if it exceeds the display length
        let displayPattern = visualization;
        if (visualization.length > maxDisplayLength) {
            displayPattern = visualization.substring(0, maxDisplayLength);
        }
        
        // Calculate current step position based on sequencer timing
        let currentStep = 0;
        if (this.sequencer.isPlaying && track.trackPlan.triggerPattern) {
            const position = this.sequencer.ticker.getPosition();
            const speedMultiplier = track.settings.speedMultiplier;
            const pulsesPerEvent = this.sequencer.ticker.getPulsesForSpeedMultiplier(speedMultiplier);
            
            let pulsesToUse = position.currentPulse;
            
            // If resync interval is set, calculate position within the resync cycle
            if (settings.resyncInterval && settings.resyncInterval > 0) {
                const pulsesPerSixteenth = this.sequencer.ticker.pulsesPerSixteenth;
                const pulsesPerResyncCycle = settings.resyncInterval * pulsesPerSixteenth;
                pulsesToUse = position.currentPulse % pulsesPerResyncCycle;
            }
            
            // Calculate which step we're currently on
            currentStep = Math.floor(pulsesToUse / pulsesPerEvent) % vizLength;
        }

        // Apply colors: dim gray for all steps, bright white for current step
        const coloredPattern = displayPattern.split('').map((char, index) => {
            if (index === currentStep && index < displayPattern.length) {
                return colors.brightWhite(char);
            } else {
                return colors.dimGray(char);
            }
        }).join('');
        
        return coloredPattern;
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
        this.rows = [];
        this.createVerticalLayout();
        
        // Adjust cursor positioning for vertical layout
        if (this.terminalUI.currentTrack !== null) {
            this.editRow = this.terminalUI.currentTrack + 2; // +2 for header row and separator row
            this.editCol = 0; // Start at track label column
        } else {
            this.editRow = 0; // Header row
            this.editCol = 0;
        }
    }


    createVerticalLayout() {
        // Header row with global controls
        this.rows.push({
            cols: [
                {
                    value: () => this.sequencer.isPlaying ? '▶' : '■',
                    enter: () => {
                        if (this.sequencer.isPlaying) {
                            this.sequencer.stop();
                        } else {
                            this.sequencer.start();
                        }
                    }
                },
                {
                    value: () => this.bigHeart ? '♥' : '❤',
                    enter: () => {
                        this.bpmCalculator.addTimestamp();
                        if (this.bpmCalculator.getCurrentBPM()) {
                            this.sequencer.updateSettings({ bpm: this.bpmCalculator.getCurrentBPM() });
                        }
                    }
                },
                {
                    value: () => `B:${this.sequencer.settings.bpm}`,
                    handle: (delta) => {
                        const newBPM = this.sequencer.settings.bpm + delta;
                        this.sequencer.updateSettings({ bpm: Math.max(40, Math.min(300, newBPM)) });
                    }
                },
                this.createProgressionChangeColumn(),
                {
                    value: () => 'S',
                    enter: () => {
                        this.terminalUI.currentTrack = null;
                        this.terminalUI.setView('sequencerSettings');
                    }
                }
            ],
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender
        });

        // Separator row with dashes
        this.rows.push({
            cols: [
                { value: () => '----', selectable: false }
            ],
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender,
            selectable: false
        });

        // Create a row for each track
        this.sequencer.tracks.forEach((track, index) => {
            this.rows.push({
                cols: [
                    {
                        value: () => this.trackLabels[index],
                        enter: () => {
                            this.terminalUI.currentTrack = index;
                            this.terminalUI.setView('track');
                        }
                    },
                    {
                        value: () => track.settings.isActive ? '■' : '□',
                        enter: () => {
                            track.updateSettings({ isActive: !track.settings.isActive });
                        }
                    },
                    {
                        value: () => this.getBoxDrawingCharacter(track.settings.volume),
                        handle: (delta) => {                        
                            let newVolume = Math.round(track.settings.volume / 10) * 10;
                            newVolume = newVolume + (delta * 10);
                            track.updateSettings({ volume: newVolume });
                        }
                    },
                    {
                        value: () => this.getTrackPatternVisualization(track),
                        selectable: false
                    }
                ],
                layout: 1,
                colsLayout: 0,
                rowRender: this.rowRender,
                colRender: this.colRender
            });
        });

        // Spacing row before active states
        this.rows.push({
            cols: [
                { value: () => '----', selectable: false }
            ],
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: this.colRender,
            selectable: false
        });

        // Active states row
        const activeStateRows = this.sequencer.settings.activeStates.map((track, index) => ({
            value: () => {
                const isCurrent = index === this.sequencer.settings.currentActiveState;
                const isStored = this.isActiveStateStored(track);
                
                if (isCurrent && isStored) {
                    return '■';  // Current and stored
                } else if (isCurrent && !isStored) {
                    return '▣';  // Current but not stored (outlined square)
                } else if (!isCurrent && isStored) {
                    return '▪';  // Stored but not current (small square)
                } else {
                    return '□';  // Not current and not stored (empty square)
                }
            },
            enter: () => {
                this.sequencer.updateActiveState(index);
            },
        }));

        this.rows.push({
            cols: [
                {
                    value: () => ' m  ',
                    selectable: false
                },
                ...activeStateRows
            ],
            layout: 1,
            colsLayout: 0,
            rowRender: this.rowRender,
            colRender: ({value, isSelected, colIndex}) => {
                if (colIndex === 0) {
                    // "m" - make it bright white
                    return colors.brightWhite(value);
                } else {
                    // Active state symbols
                    if (isSelected) {
                        // Current cursor position - make it bright white
                        return colors.brightWhite(value);
                    } else {
                        // Other active state symbols - make them gray
                        return colors.dimGray(value);
                    }
                }
            },
        });
    }


    handleStoreActiveState() {
        // Store current track states - either to selected slot or next available
        this.sequencer.logger.log(`C key pressed: editRow=${this.editRow}, editCol=${this.editCol}`);
        
        // Check if we're on the active states row and on a valid active state column
        const activeStatesRowIndex = this.rows.length - 1; 
        const isActiveStatesRow = this.editRow === activeStatesRowIndex;
        const activeStateIndex = this.editCol - 1; // Subtract 1 for "m" column
        const isOnActiveStateSlot = isActiveStatesRow && activeStateIndex >= 0 && activeStateIndex < 16;
            
        if (isOnActiveStateSlot) {
            // Original behavior: store to selected slot
            this.sequencer.storeCurrentTrackStates(activeStateIndex);
            this.sequencer.logger.log(`C key: Stored current track states to active state ${activeStateIndex}`);
            // Force UI refresh while preserving cursor position
            const savedRow = this.editRow;
            const savedCol = this.editCol;
            this.openView();
            this.editRow = savedRow;
            this.editCol = savedCol;
        } else {
            // New behavior: store to next available slot
            const nextAvailableSlot = this.sequencer.findNextAvailableActiveState();
            
            if (nextAvailableSlot !== null) {
                this.sequencer.storeCurrentTrackStates(nextAvailableSlot);
                this.sequencer.logger.log(`C key: Stored current track states to next available slot ${nextAvailableSlot}`);
                // Force UI refresh while preserving cursor position
                const savedRow = this.editRow;
                const savedCol = this.editCol;
                this.openView();
                this.editRow = savedRow;
                this.editCol = savedCol;
            } else {
                this.sequencer.logger.log(`C key: No available active state slots found`);
            }
        }
    }

    handleClearActiveState() {
        // Clear the selected active state to default (all tracks active)
        this.sequencer.logger.log(`X key pressed: editRow=${this.editRow}, editCol=${this.editCol}`);
        
        // Check if we're on the active states row (last row)
        const activeStatesRowIndex = this.rows.length - 1; // Last row is active states
        const isActiveStatesRow = this.editRow === activeStatesRowIndex;
            
        if (isActiveStatesRow) {
            const activeStateIndex = this.editCol - 1; // Subtract 1 for "m" column
            
            if (activeStateIndex >= 0 && activeStateIndex < 16) {
                // Reset to default state (all tracks active)
                this.sequencer.settings.activeStates[activeStateIndex] = Array(16).fill(true);
                this.sequencer.logger.log(`X key: Cleared active state ${activeStateIndex} to default`);
                // Force UI refresh while preserving cursor position
                const savedRow = this.editRow;
                const savedCol = this.editCol;
                this.openView();
                this.editRow = savedRow;
                this.editCol = savedCol;
            } else {
                this.sequencer.logger.log(`X key: Invalid activeStateIndex ${activeStateIndex}`);
            }
        } else {
            this.sequencer.logger.log(`X key: Not on active states row (row ${this.editRow})`);
        }
    }

    handleNavigation(direction, step = 1) {
        // Call parent navigation
        super.handleNavigation(direction, step);
        
        // After navigation, adjust column position if needed
        if (!this.isEditingField) {
            const currentRow = this.rows[this.editRow];
            if (currentRow && currentRow.cols) {
                const maxCol = currentRow.cols.length - 1;
                
                // If current column is beyond available columns, adjust to a good default
                if (this.editCol > maxCol) {
                    // Find the active column (index 1 for track rows) or fall back to first available
                    if (maxCol >= 1 && currentRow.cols[1].selectable !== false) {
                        this.editCol = 1; // Active column
                    } else {
                        this.editCol = 0; // First column
                    }
                }
                
                // Ensure we're on a selectable column
                while (currentRow.cols[this.editCol].selectable === false && this.editCol < maxCol) {
                    this.editCol++;
                }
            }
        }
    }

    createProgressionChangeColumn() {
        this.progressionChangeNumber = null;
        this.progressionChangeBlinking = false;
        this.progressionChangeBlinkingState = true;
        return {
            value: () => {
                this.progressionChangeBlinkingState = !this.progressionChangeBlinkingState;
                if (this.progressionChangeBlinking && this.progressionChangeBlinkingState) {
                    return 'C: ';
                }
                if (this.progressionChangeNumber === null) {
                    this.progressionChangeNumber = this.sequencer.settings.currentProgressionIndex;
                    return `C:${this.sequencer.settings.currentProgressionIndex}`;
                }
                return `C:${this.progressionChangeNumber}`;
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