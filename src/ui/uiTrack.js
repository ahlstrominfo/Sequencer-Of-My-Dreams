const UIBase = require("./uiBase");
const { PLAY_ORDER_NAMES, findMultiplierPreset } = require('../utils/utils');
const { ARP_MODES_NAMES } = require('../utils/arps');
const { EuclideanTriggerPattern, BinaryTriggerPattern, TRIGGER_TYPES, TRIGGER_TYPE_NAMES, StepTriggerPattern } = require('../patterns/triggerPatterns');

class UITrack extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.trackLabels = "0123456789abcdef".split('');
    }

    openView() {
        this.rows = [];

        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;

        this.rows.push({
            name: 'TriggerType',
            value: () => TRIGGER_TYPE_NAMES[settings.triggerType],
            handle: (delta) => {
                const oldTriggerType = settings.triggerType;
                const newTriggerType = Math.max(0, Math.min(Object.entries(TRIGGER_TYPES).length - 1, settings.triggerType + delta));
                track.updateSettings({
                    triggerType: newTriggerType
                });
                if (oldTriggerType !== newTriggerType) {
                    this.openView();
                }
            }
        });

        if (settings.triggerType === TRIGGER_TYPES.EUCLIDEAN) {
            this.rows.push({
                name: 'Euclidean Pattern',
                value: () => {
                    const triggerSettings = settings.triggerSettings;
                    const pattern = new EuclideanTriggerPattern(triggerSettings.length, triggerSettings.hits, triggerSettings.shift);
                    // Use pattern length setting if > 0, otherwise use the euclidean length (all)
                    const vizLength = triggerSettings.patternLength > 0 ? triggerSettings.patternLength : triggerSettings.length;
                    return pattern.getVisualization(vizLength);
                },
                enter: () => {
                    this.terminalUI.setView('euclideanPattern');
                }
            });
        }

        if (settings.triggerType === TRIGGER_TYPES.BINARY) {
            this.rows.push({
                name: 'Binary Pattern',
                value: () => {
                    const pattern = BinaryTriggerPattern.fromNumbers(settings.triggerSettings.numbers);
                    // Use pattern length setting if > 0, otherwise use full binary length (all)
                    const fullBinaryLength = settings.triggerSettings.numbers.length * 4;
                    const vizLength = settings.triggerSettings.patternLength > 0 ? settings.triggerSettings.patternLength : fullBinaryLength;
                    return pattern.getVisualization(vizLength);
                },
                enter: () => {
                    this.terminalUI.setView('binaryPattern');
                }
            });
        }

        if (settings.triggerType === TRIGGER_TYPES.STEP) {
            this.rows.push({
                name: 'Step Pattern',
                value: () => {
                    const triggerSettings = settings.triggerSettings;
                    const pattern = new StepTriggerPattern(triggerSettings.steps);
                    // Use pattern length setting if > 0, otherwise use 16 (all)
                    const vizLength = triggerSettings.patternLength > 0 ? triggerSettings.patternLength : 16;
                    return pattern.getVisualization(vizLength);
                },
                enter: () => {
                    this.terminalUI.setView('stepPattern');
                }
            });
        }

        // Add pattern length control for all pattern types
        this.rows.push({
            name: 'Pattern Length',
            value: () => {
                // Default to 0 (use all), show "all" for 0
                const patternLength = settings.triggerSettings.patternLength || 0;
                return patternLength === 0 ? 'all' : patternLength;
            },
            handle: (delta) => {
                const maxLength = this.getMaxPatternLength(settings);
                const currentLength = settings.triggerSettings.patternLength || 0;
                const newLength = Math.max(0, Math.min(maxLength, currentLength + delta));
                
                const newTriggerSettings = { ...settings.triggerSettings, patternLength: newLength };
                track.updateSettings({
                    triggerSettings: newTriggerSettings
                });
            }
        });
      
        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Nr Note Series',
            value: () => {
                return `${settings.noteSeries.length}`;
            },
            enter: () => {
                this.terminalUI.setView('noteSeries');
            }
        });


        this.rows.push({
            name: 'Conform Notes',
            value: () => settings.conformNotes ? 'Yes' : 'No',
            handle: () => {
                track.updateSettings({
                    conformNotes: !settings.conformNotes
                });
            },
            enter: () => {
                track.updateSettings({
                    conformNotes: !settings.conformNotes
                });
            }
        });
        this.rows.push({
            name: 'Tie NoteSeries to Pattern',
            value: () => settings.tieNoteSeriestoPattern ? 'Yes' : 'No',
            handle: () => {
                track.updateSettings({
                    tieNoteSeriestoPattern: !settings.tieNoteSeriestoPattern
                });
            },
            enter: () => {
                track.updateSettings({
                    tieNoteSeriestoPattern: !settings.tieNoteSeriestoPattern
                });
            }
        });
        
        
        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Speed Multiplier',
            value: () => settings.speedMultiplier,
            handle: (delta) => {
                track.updateSettings({
                    speedMultiplier: findMultiplierPreset(settings.speedMultiplier, delta)
                });
            }
        });

        this.rows.push({
            name: 'Probability',
            value: () => settings.probability,
            handle: (delta, step) => {
                track.updateSettings({
                    probability: settings.probability + delta * step
                });
            }
        });


        this.rows.push({
            name: 'Resync Interval',
            value: () => settings.resyncInterval,
            handle: (delta, step) => {
                track.updateSettings({
                    resyncInterval: settings.resyncInterval + delta * step
                });
            }
        });

        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Swing Amount',
            value: () => settings.swingAmount,
            handle: (delta, step) => {
                track.updateSettings({
                    swingAmount: settings.swingAmount + delta * step
                });
            }
        });
        this.rows.push({
            name: 'Grooves',
            value: () => {
                return `${settings.groove.length}`;
            },
            enter: () => {
                this.terminalUI.setView('groove');
            }
        });
        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Play Order',
            value: () => PLAY_ORDER_NAMES[settings.playOrder],
            handle: (delta) => {
                track.updateSettings({
                    playOrder: settings.playOrder + delta
                });
            }
        });

        this.rows.push({
            name: '  ----------------',
            selectable: false
        });
        this.rows.push({
            name: 'Channel',
            value: () => settings.channel,
            handle: (delta) => {
                track.updateSettings({
                    channel: settings.channel + delta
                });
            }
        });
        this.rows.push({
            name: 'Volume',
            value: () => settings.volume,
            handle: (delta, step) => {
                track.updateSettings({
                    volume: settings.volume + delta * step
                });
            }
        });
        this.rows.push({
            name: 'Active',
            value: () => settings.isActive ? 'Yes' : 'No',
            handle: () => {
                track.updateSettings({
                    isActive: !settings.isActive
                });
            },
            enter: () => {
                track.updateSettings({
                    isActive: !settings.isActive
                });
            }
        });

        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Edit',
            value: 'Edit',
            enter: () => {
                this.terminalUI.setView('trackEdit');
            }
        });

    }

    handleTab() {
        if (!this.isEditingField) {
            // Look for the next non-selectable row starting from current position
            let foundSeparator = false;
            let separatorRow = -1;
            
            for (let i = 1; i < this.rows.length; i++) {
                const checkRow = this.editRow + i;
                if (checkRow >= this.rows.length) {
                    // We've reached the end without finding a separator
                    break;
                }
                if (this.rows[checkRow].selectable === false) {
                    foundSeparator = true;
                    separatorRow = checkRow;
                    break;
                }
            }
            
            if (foundSeparator) {
                // Find the next selectable row after the separator
                for (let i = 1; i < this.rows.length; i++) {
                    const candidateRow = separatorRow + i;
                    if (candidateRow >= this.rows.length) break;
                    if (this.rows[candidateRow].selectable !== false) {
                        this.editRow = candidateRow;
                        this.editCol = 0;
                        break;
                    }
                }
            } else {
                // No separator found ahead, we're in the last section - go to first selectable row
                for (let i = 0; i < this.rows.length; i++) {
                    if (this.rows[i].selectable !== false) {
                        this.editRow = i;
                        this.editCol = 0;
                        break;
                    }
                }
            }
        }
    }

    handleEscape() {
        if (this.isEditingField) {
            this.isEditingField = false;
        } else {
            super.handleLeave();
            this.terminalUI.setView('main');
        }
    }

    render() {
        this.openView();
        console.log('Track Settings: ' + this.trackLabels[this.terminalUI.currentTrack]);
        console.log('------------------');
        super.render();
        console.log('------------------');
    }

    getDefaultPatternLength(settings) {
        switch (settings.triggerType) {
            case TRIGGER_TYPES.EUCLIDEAN:
                return settings.triggerSettings.length;
            case TRIGGER_TYPES.BINARY:
                return settings.triggerSettings.numbers.length * 4;
            case TRIGGER_TYPES.STEP:
                return 16;
            default:
                return settings.triggerSettings.length || 16;
        }
    }

    getMaxPatternLength(settings) {
        switch (settings.triggerType) {
            case TRIGGER_TYPES.EUCLIDEAN:
                return settings.triggerSettings.length;
            case TRIGGER_TYPES.BINARY:
                return settings.triggerSettings.numbers.length * 4;
            case TRIGGER_TYPES.STEP:
                return 16;
            default:
                return 64;
        }
    }
}

module.exports = UITrack;