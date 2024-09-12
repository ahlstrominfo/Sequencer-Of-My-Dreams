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
                    const triggerLength = settings.resyncInterval || settings.triggerSettings.length;
                    const patternString = Array.from({ length: triggerLength }, (_, i) => pattern.shouldTrigger(i) ? '■' : '□').join('');
                    return patternString;
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
                    const triggerLength = settings.resyncInterval || settings.triggerSettings.length;
                    const patternString = Array.from({ length: triggerLength }, (_, i) => pattern.shouldTrigger(i) ? '■' : '□').join('');
                    return patternString;
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
                    const triggerLength = settings.resyncInterval || settings.triggerSettings.length;
                    const patternString = Array.from({ length: triggerLength }, (_, i) => pattern.shouldTrigger(i) ? '■' : '□').join('');
                    return patternString;
                },
                enter: () => {
                    this.terminalUI.setView('stepPattern');
                }
            });
        }
      
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
            name: 'Use Max Duration',
            value: () => settings.useMaxDuration ? 'Yes' : 'No',
            handle: () => {
                track.updateSettings({
                    useMaxDuration: !settings.useMaxDuration
                });
            },
            enter: () => {
                track.updateSettings({
                    useMaxDuration: !settings.useMaxDuration
                });
            }
        });

        this.rows.push({
            name: 'Max Duration Factor',
            value: () => settings.maxDurationFactor,
            handle: (delta) => {
                track.updateSettings({
                    maxDurationFactor: findMultiplierPreset(settings.maxDurationFactor, delta)
                });
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
            name: 'Arp Mode',
            value: () => ARP_MODES_NAMES[settings.arpMode],
            handle: (delta) => {
                track.updateSettings({
                    arpMode: settings.arpMode + delta
                });
            }
        });

        this.rows.push({
            name: 'Play Multiplier',
            value: () => settings.playMultiplier,
            handle: (delta) => {
                track.updateSettings({
                    playMultiplier: findMultiplierPreset(settings.playMultiplier, delta)
                });
            }
        });

        this.rows.push({
            name: 'Wonky Arp',
            value: () => settings.wonkyArp ? 'Yes' : 'No',
            enter: () => {
                track.updateSettings({
                    wonkyArp: !settings.wonkyArp
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
}

module.exports = UITrack;