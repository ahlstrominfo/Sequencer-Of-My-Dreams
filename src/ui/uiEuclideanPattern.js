const UIBase = require("./uiBase");
const { EuclideanTriggerPattern } = require('../patterns/triggerPatterns');
const ValidationUtils = require('../utils/validation');

class UIEuclideanPattern extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
    }

    openView() {
        this.rows = [];
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;

        this.rows =  [
            {
                name: 'Length',
                value: () => settings.triggerSettings.length,
                handle: (delta, step) => {
                    const newLength = settings.triggerSettings.length + delta * step;
                    settings.triggerSettings.length = ValidationUtils.validatePatternLength(newLength);
                    track.updateSettings({
                        triggerSettings: settings.triggerSettings
                    });
                }
            },
            {
                name: 'Hits',
                value: () => settings.triggerSettings.hits,
                handle: (delta) => {
                    const newHits = settings.triggerSettings.hits + delta;
                    settings.triggerSettings.hits = ValidationUtils.validateEuclideanHits(newHits, settings.triggerSettings.length);
                    track.updateSettings({
                        triggerSettings: settings.triggerSettings
                    });
                }
            },
            {
                name: 'Shift',
                value: () => settings.triggerSettings.shift,
                handle: (delta) => {
                    const newShift = settings.triggerSettings.shift + delta;
                    settings.triggerSettings.shift = ValidationUtils.validateEuclideanShift(newShift, settings.triggerSettings.length);
                    track.updateSettings({
                        triggerSettings: settings.triggerSettings
                    });
                }
            }
        ];
    }

    render() {
        console.log('Euclidean Pattern');
        console.log('------------------');
        super.render();
        
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        const settings = track.settings;

        const triggerSettings = settings.triggerSettings;
        const pattern = new EuclideanTriggerPattern(triggerSettings.length, triggerSettings.hits, triggerSettings.shift);
        const triggerLength = settings.resyncInterval || settings.triggerSettings.length;
        
        // Use cached visualization instead of generating pattern string
        const patternString = pattern.getVisualization(triggerLength);
        console.log('  Pattern:', patternString);

        console.log('------------------');
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


module.exports = UIEuclideanPattern;