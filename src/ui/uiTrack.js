const UIBase = require("./uiBase");
const { PLAY_ORDER_NAMES, ARP_MODES, ARP_MODES_NAMES, findMultiplierPreset } = require('../utils/utils');
const { EuclideanTriggerPattern, TRIGGER_TYPES, TRIGGER_TYPE_NAMES } = require('../patterns/triggerPatterns');

class UITrack extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.trackLabels = "0123456789abcdef".split('');
    }

    openViewEuclidean() {
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;

        if (settings.triggerType === TRIGGER_TYPES.EUCLIDEAN) {
            settings.triggerSettings = Object.assign({ length: 16, hits: 4, shift: 0 }, settings.triggerSettings);
            this.rows.push({
                name: 'Trigger Settings',
                cols: [
                    {
                        name: 'Length',
                        value: () => settings.triggerSettings.length,
                        handle: (delta, step) => {
                            settings.triggerSettings.length = Math.max(1, Math.min(100, settings.triggerSettings.length + delta * step));
                            track.updateSettings({
                                triggerSettings: settings.triggerSettings
                            });
                        }
                    },
                    {
                        name: 'Hits',
                        value: () => settings.triggerSettings.hits,
                        handle: (delta, step) => {
                            settings.triggerSettings.hits = Math.max(0, Math.min(settings.triggerSettings.length, settings.triggerSettings.hits + delta));
                            track.updateSettings({
                                triggerSettings: settings.triggerSettings
                            });
                        }
                    },
                    {
                        name: 'Shift',
                        value: () => settings.triggerSettings.shift,
                        handle: (delta, step) => {
                            settings.triggerSettings.shift = Math.max(0, Math.min(settings.triggerSettings.length - 1, settings.triggerSettings.shift + delta));
                            track.updateSettings({
                                triggerSettings: settings.triggerSettings
                            });
                        }
                    },
                    {
                        value: () => {
                            const triggerSettings = settings.triggerSettings;
                            const pattern = new EuclideanTriggerPattern(triggerSettings.length, triggerSettings.hits, triggerSettings.shift);
                            const patternString = Array.from({ length: triggerSettings.length }, (_, i) => pattern.shouldTrigger(i) ? '■' : '□').join('');
                            return patternString;
                        },
                        selectable: false,
                        }
                ]
            });
        }
    }

    openView() {
        this.rows = [];

        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;

        this.rows.push({
            name: 'TriggerType',
            value: () => TRIGGER_TYPE_NAMES[settings.triggerType],
            handle: (delta, step) => {
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

        this.openViewEuclidean();

        if (settings.triggerType === TRIGGER_TYPES.BINARY) {
            this.rows.push({
                name: 'Binary Pattern',
                value: () => {
                    const numbers = settings.triggerSettings.numbers;
                    const print = numbers.reduce((acc, number) => {
                        acc.push(number.toString(2).padStart(4, '0').split('').map(bit => bit === '1' ? '■' : '□').join(''));
                        return acc;
                    }, []);
                    return print.join('');
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
                    const pattern = new Array(16).fill('□');
                    settings.triggerSettings.steps.forEach(step => pattern[step] = '■');
                    const patternString = pattern.join('');
                    return patternString;
                },
                enter: () => {
                    this.terminalUI.setView('stepPattern');
                }
            });
        }
        
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
            name: 'Groove Settings',
            value: () => {
                if (settings.grooveName) { 
                    return settings.grooveName;
                }
                return `Nr Groove Steps: ${settings.groove.length}`
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
            name: 'Note Series',
            value: () => {
                return `Nr Note Series: ${settings.noteSeries.length}`
            },
            enter: () => {
                this.terminalUI.setView('noteSeries');
            }
        });
        this.rows.push({
            name: 'Conform Notes',
            value: () => settings.conformNotes ? 'Yes' : 'No',
            handle: (delta, step) => {
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
            handle: (delta, step) => {
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
            name: 'Play Order',
            value: () => PLAY_ORDER_NAMES[settings.playOrder],
            handle: (delta, step) => {
                track.updateSettings({
                    playOrder: settings.playOrder + delta
                });
            }
        });        

        this.rows.push({
            name: 'Arp Mode',
            value: () => ARP_MODES_NAMES[settings.arpMode],
            handle: (delta, step) => {
                track.updateSettings({
                    arpMode: settings.arpMode + delta
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
            name: 'Probability',
            value: () => settings.probability,
            handle: (delta, step) => {
                track.updateSettings({
                    probability: settings.probability + delta * step
                });
            }
        });

        this.rows.push({
            name: 'Speed Multiplier',
            value: () => settings.speedMultiplier,
            handle: (delta, step) => {
                track.updateSettings({
                    speedMultiplier: findMultiplierPreset(settings.speedMultiplier, delta)
                });
            }
        });
        this.rows.push({
            name: 'Play Multiplier',
            value: () => settings.playMultiplier,
            handle: (delta, step) => {
                track.updateSettings({
                    playMultiplier: findMultiplierPreset(settings.playMultiplier, delta)
                });
            }
        });
        this.rows.push({
            name: '  ----------------',
            selectable: false
        });

        this.rows.push({
            name: 'Use Max Duration',
            value: () => settings.useMaxDuration ? 'Yes' : 'No',
            handle: (delta, step) => {
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
            handle: (delta, step) => {
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
            name: 'Channel',
            value: () => settings.channel,
            handle: (delta, step) => {
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
            handle: (delta, step) => {
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

    updateSettings(settings) {
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        track.updateSettings(settings);
        this.openView();
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