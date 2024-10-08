const UIBase = require("./uiBase");
const { KEYS } = require('../utils/scales');

class UISequencerSettings extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.sequenceManager = sequencer.sequenceManager;
        // this.availableSequences = [];
        // this.selectedSequenceIndex = 0;
        
        this.rows = [
            { name: 'BPM', 
                value: () => this.sequencer.settings.bpm, 
                handle: (delta, step) => {
                    const newBPM = this.terminalUI.sequencer.settings.bpm + delta * step;
                    this.terminalUI.sequencer.updateSettings({ bpm: newBPM});
                }
            },
            { 
                name: 'State', 
                value: () => {
                    return this.sequencer.isPlaying ? 'Playing' : 'Stopped'; 
                }, 
                enter: () => {
                    if (!this.sequencer.isPlaying) {
                        this.sequencer.start();
                    } else {
                        this.sequencer.stop();
                    }
                    
                }
            },
            { name: '------------------', selectable: false },
            { 
                name: 'Chord Progression',
                value: 'Manage', 
                enter: () => {
                    // this.terminalUI.mode = 'progression';
                    this.terminalUI.setView('progression');
                }
            },
            { name: '------------------', selectable: false },
            {
                name: 'Song Mode',
                value: () => this.sequencer.settings.song.active ? 'ON' : 'OFF',
                enter: () => {
                    const song = this.sequencer.settings.song;
                    song.active = !song.active;
                    this.sequencer.updateSettings({ song });
                }
            },
            {
                name: 'Song Mode',
                value: 'Manage',
                enter: () => {
                    this.terminalUI.setView('songMode');
                }
            },
            // { name: '------------------', selectable: false },
            // { 
            //     name: 'Add Track',
            //     value: 'Add',
            //     enter: () => {
            //         this.sequencer.addTrack();
            //         //this.sequencer.copySettingsToTrack(this.sequencer.tracks[this.sequencer.tracks.length - 1], this.sequencer.tracks[this.sequencer.tracks.length - 2]);
            //     }

            // },
            { name: '------------------', selectable: false },
            { name: 'Save Sequence', 
                value: 'Save',
                enter: () => {
                    this.saveSequence();
                }
            },
            { name: 'Save Sequence (as new)', 
                value: 'Save',
                enter: () => {
                    this.saveSequence(true);
                }
            },            
            { name: 'Load Sequence', 
                value: 'Load',
                enter: () => {
                    this.terminalUI.setView('loadSequence');
                }
            },
            { name: 'New Sequence', 
                value: 'New',
                enter: () => {
                    this.sequencer.cleanSequencer();
                    this.sequenceManager.clearCurrentFileName();
                    this.terminalUI.setView('main');
                }
            }
        ];
    }

    saveSequence(asNew = false) {
        this.sequenceManager.saveSequence(asNew);
        console.log(`Sequence saved as: ${this.sequenceManager.getCurrentTrackName()}`);
        this.sequenceManager.saveToTmp();
    }

    render() {
        const trackName = this.sequenceManager.getCurrentTrackName();
        console.log('Sequencer Settings ' + (trackName? ' : ' + trackName : ''));
        console.log('------------------');
        super.render();
        console.log('------------------');
    }

    saveToTmp() {
        this.sequenceManager.saveToTmp();
    }

    loadFromTmp() {
        if(!this.sequenceManager.loadFromTmp()) {
            this.sequencer.cleanSequencer();
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
}

module.exports = UISequencerSettings;