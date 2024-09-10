const UITableView = require("./uiTableView");
const { findMultiplierPreset } = require("../utils/utils");
const { ARP_MODES_NAMES } = require("../utils/arps");

class UINoteSeries extends UITableView {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
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
                    name: 'NrNotes',
                    value: () => series.numberOfNotes,
                    handle: (delta, step) => {
                        series.numberOfNotes = series.numberOfNotes + delta * step;
                        this.updateTrackSettingsAndReload({
                            noteSeries: track.settings.noteSeries
                        });
                    }
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
                    name: 'Spread',
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
                    name: 'Prob',
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
                            series.aValue = series.aValue + delta;
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
                    name: 'Arp',
                    value: () => ARP_MODES_NAMES[series.arpMode],
                    handle: (delta) => {
                        series.arpMode = series.arpMode + delta;
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Play Mult',
                    value: () => series.playMultiplier,
                    handle: (delta) => {
                        series.playMultiplier = findMultiplierPreset(series.playMultiplier, delta);
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Wonky Arp',
                    value: () => series.wonkyArp ? 'Yes' : 'No',
                    enter: () => {
                        series.wonkyArp = !series.wonkyArp;
                        this.updateTrackSettingsAndReload({ noteSeries: track.settings.noteSeries });
                    }
                },
                {
                    name: 'Delete',
                    value: 'Delete',
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

    }

    updateTrackSettingsAndReload(trackSettings){
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        track.updateSettings(trackSettings);
        this.openView();
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