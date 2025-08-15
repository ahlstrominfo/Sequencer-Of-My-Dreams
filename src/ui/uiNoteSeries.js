const UITableView = require("./uiTableView");
const { findMultiplierPreset } = require("../utils/utils");
const { ARP_MODES_NAMES } = require("../utils/arps");

class UINoteSeries extends UITableView {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.columnGroups = [5, 6, 7];
        this.nrPages = this.columnGroups.length;
        this.selectedRandomizationType = 0;
        this.randomizationTypes = sequencer.randomizer.getRandomizationTypes();
        
        // Map column indices to parameter names for 'r' key randomization
        this.columnParameterMap = [
            'rootNote', 'numberOfNotes', 'spread', 'inversion', 'velocity', // Page 1: 0-4
            'velocitySpan', 'velocitySpanIndividual', 'pitchSpan', 'probability', 'aValueBValue', 'aValueIndividualNoteBValue', // Page 2: 5-10
            'arpMode', 'playMultiplier', 'wonkyArp', 'useMaxDuration', 'maxDurationFactor', null, null // Page 3: 11-17 (null for Rnd and Del)
        ];
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        track.settings.noteSeries.forEach((series, index) => {
            const cols = [
                {
                    name: 'Note',
                    value: () => series.rootNote,
                    handle: (delta, step) => {
                        if (step === 1) {
                            series.rootNote = series.rootNote + delta; // move in semitone
                        } else {
                            series.rootNote = series.rootNote + (delta * 12); // move in octave
                        }
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'NrN',
                    value: () => series.numberOfNotes,
                    handle: (delta, step) => {
                        series.numberOfNotes = series.numberOfNotes + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'Sprd',
                    value: () => series.spread,
                    handle: (delta) => {
                        series.spread = series.spread + delta;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    },
                    padding: 5,
                },                
                {
                    name: 'Inv',
                    value: () => series.inversion,
                    handle: (delta) => {
                        series.inversion = series.inversion + delta;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'Vel',
                    value: () => series.velocity,
                    handle: (delta, step) => {
                        series.velocity = series.velocity + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    },
                    padding: 5,
                },
                {
                    name: 'VSpn',
                    value: () => series.velocitySpan,
                    handle: (delta, step) => {
                        series.velocitySpan = series.velocitySpan + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'Ind V',
                    value: () => series.velocitySpanIndividual ? 'Yes' : 'No',
                    enter: () => {
                        series.velocitySpanIndividual = !series.velocitySpanIndividual;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'PSpn',
                    value: () => series.pitchSpan,
                    handle: (delta, step) => {
                        series.pitchSpan = series.pitchSpan + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
                {
                    name: 'Prb',
                    value: () => series.probability !== undefined ? series.probability : 100,
                    handle: (delta, step) => {
                        series.probability = series.probability + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    },
                    padding: 5,
                },
                {
                    name: 'A:B',
                    value: () => `${series.aValue}:${series.bValue}`,
                    handle: (delta, step) => {
                        if (step === 1) {
                            series.aValue = Math.min(series.aValue + delta, series.bValue);
                        } else {
                            series.bValue = series.bValue + delta;
                        }
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    },
                    padding: 5,
                },
                {
                    name: 'Ind A:B',
                    value: () => `${series.aValueIndividualNote}:${series.bValueIndividualNote}`,
                    handle: (delta, step) => {
                        if (step === 1) {
                            series.aValueIndividualNote = Math.min(series.aValueIndividualNote + delta, series.bValueIndividualNote);
                        } else {
                            series.bValueIndividualNote = series.bValueIndividualNote + delta;
                        }
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    },
                    padding: 5,
                },                
                {
                    name: 'Arp',
                    value: () => ARP_MODES_NAMES[series.arpMode],
                    handle: (delta) => {
                        series.arpMode = series.arpMode + delta;
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Ply M',
                    value: () => series.playMultiplier,
                    handle: (delta) => {
                        series.playMultiplier = findMultiplierPreset(series.playMultiplier, delta);
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Wnky',
                    value: () => series.wonkyArp ? 'Yes' : 'No',
                    enter: () => {
                        series.wonkyArp = !series.wonkyArp;
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'useMaxDur',
                    value: () => series.useMaxDuration ? 'Yes' : 'No',
                    enter: () => {
                        series.useMaxDuration = !series.useMaxDuration;
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Mx Drtn Fctr',
                    value: () => series.maxDurationFactor,
                    handle: (delta) => {
                        if (series.maxDurationFactor === undefined || series.maxDurationFactor === null) {
                            this.terminalUI.logger.log(series.maxDurationFactor);
                            series.maxDurationFactor = 1;
                        }
                        series.maxDurationFactor = findMultiplierPreset(series.maxDurationFactor, delta);
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },                
                {
                    name: 'Rnd',
                    value: () => this.randomizationTypes[this.selectedRandomizationType].name,
                    handle: (delta, step) => {
                        this.selectedRandomizationType = Math.max(0, Math.min(this.randomizationTypes.length - 1, this.selectedRandomizationType + delta * step));
                        this.openView();
                    },
                    enter: () => {
                        if (this.isEditingField) {
                            // Apply the selected randomization type to this note series
                            const randomizedSeries = this.sequencer.randomizer.applyRandomizationType(
                                series,
                                this.randomizationTypes[this.selectedRandomizationType].name,
                                this.terminalUI.currentTrack
                            );
                            
                            // Apply the randomized values to the current series
                            Object.assign(series, randomizedSeries);
                            
                            this.updateTrackSettingsAndReload({
                                noteSeries: track.settings.noteSeries
                            });
                        }
                        this.isEditingField = !this.isEditingField;
                    }
                },
                {
                    name: 'Del',
                    value: 'X',
                    enter: () => {
                        if (track.settings.noteSeries.length <= 1) {
                            return;
                        }
                        // Delete note series
                        track.settings.noteSeries.splice(index, 1);
                        this.rows.splice(index, 1);
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
                },
            ];
            this.rows.push({
                name: index + 1 + ': ',
                layout: 1,
                cols: cols,
            });
        });
        this.rows.push({
            name: ' ',
            value: () => ' ',
            selectable: false,
            rowRender: () => '',
        });

        this.rows.push({
            name: 'Add new note series',
            enter: () => {
                const noteSeries = track.settings.noteSeries;
                const lastNoteSeries = noteSeries[noteSeries.length - 1];
                const newNoteSeries = { ...lastNoteSeries };
                const newestNoteSeries = [...noteSeries, newNoteSeries];

                track.updateSettings({
                    noteSeries: newestNoteSeries
                });
                this.editRow = track.settings.noteSeries.length - 1;
                this.openView();
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Add new note series <`;
                }
                return ` Add new note series`;
            }
        });

        this.rows.push({
            name: 'Randomize all note series',
            enter: () => {
                // Randomize all note series in this track
                track.settings.noteSeries.forEach((series) => {
                    const randomizedSeries = this.sequencer.randomizer.randomizeNoteSeries(
                        series, 
                        this.terminalUI.currentTrack
                    );
                    Object.assign(series, randomizedSeries);
                });
                
                this.updateTrackSettingsAndReload({
                    noteSeries: track.settings.noteSeries
                });
            },
            rowRender: ({isSelected}) => {
                if (isSelected) {
                    return `> Randomize all note series <`;
                }
                return ` Randomize all note series`;
            }
        });
    }

    render(renderComplete = true) {
       if (!renderComplete) {
            console.log('Note Series');
            return;
        }

        console.log('Note Series');
        console.log('------------------');
        super.render();
        console.log('------------------');
        console.log('Randomization: Select "Rnd" column and use ←→ to choose type, Enter to apply');
        console.log('Press "r" on any parameter column to randomize just that parameter');
        console.log('------------------');
    }

    updateTrackSettingsAndReload(trackSettings){
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        track.updateSettings(trackSettings);
        this.openView();
    }

    handleKey(key) {
        if (key === 'r') {
            // Randomize individual column parameter - works without editing mode
            const currentSeriesIndex = this.editRow;
            const currentColumnIndex = this.getGlobalColumnIndex();
            const parameterName = this.columnParameterMap[currentColumnIndex];
            
            if (parameterName && currentSeriesIndex < this.sequencer.tracks[this.terminalUI.currentTrack].settings.noteSeries.length) {
                const track = this.sequencer.tracks[this.terminalUI.currentTrack];
                const series = track.settings.noteSeries[currentSeriesIndex];
                
                // Randomize just this parameter
                const newValue = this.sequencer.randomizer.randomizeParameter(
                    series[parameterName],
                    parameterName,
                    this.terminalUI.currentTrack
                );
                
                // Handle special cases for A:B pairs
                if (newValue === 'RANDOMIZE_A_B_PAIR') {
                    // Randomize both aValue and bValue together
                    const newA = Math.floor(Math.random() * 4) + 1; // 1-4
                    const newB = Math.floor(Math.random() * 4) + 1; // 1-4
                    series.aValue = Math.min(newA, newB); // Ensure A <= B
                    series.bValue = Math.max(newA, newB);
                } else if (newValue === 'RANDOMIZE_A_B_INDIVIDUAL_PAIR') {
                    // Randomize both aValueIndividualNote and bValueIndividualNote together
                    const newA = Math.floor(Math.random() * 6) + 1; // 1-6
                    const newB = Math.floor(Math.random() * 6) + 1; // 1-6
                    series.aValueIndividualNote = Math.min(newA, newB); // Ensure A <= B
                    series.bValueIndividualNote = Math.max(newA, newB);
                } else {
                    // Apply the new value normally
                    series[parameterName] = newValue;
                }
                
                this.updateTrackSettingsAndReload({
                    noteSeries: track.settings.noteSeries
                });
            }
            return true; // Indicate we handled the key
        }
        
        // Let parent handle other keys
        return super.handleKey ? super.handleKey(key) : false;
    }

    getGlobalColumnIndex() {
        // Calculate the global column index based on current page and column position
        // Use editCol which is the actual column index used by UITableView
        return this.editCol || 0;
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

module.exports = UINoteSeries;