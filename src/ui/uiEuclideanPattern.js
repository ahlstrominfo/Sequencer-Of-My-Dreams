const UIBase = require("./uiBase");
const { EuclideanTriggerPattern } = require('../patterns/triggerPatterns');

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
                    settings.triggerSettings.length = Math.max(1, Math.min(100, settings.triggerSettings.length + delta * step));
                    track.updateSettings({
                        triggerSettings: settings.triggerSettings
                    });
                }
            },
            {
                name: 'Hits',
                value: () => settings.triggerSettings.hits,
                handle: (delta) => {
                    settings.triggerSettings.hits = Math.max(0, Math.min(settings.triggerSettings.length, settings.triggerSettings.hits + delta));
                    track.updateSettings({
                        triggerSettings: settings.triggerSettings
                    });
                }
            },
            {
                name: 'Shift',
                value: () => settings.triggerSettings.shift,
                handle: (delta) => {
                    settings.triggerSettings.shift = Math.max(0, Math.min(settings.triggerSettings.length - 1, settings.triggerSettings.shift + delta));
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
        const triggerLength = triggerSettings.length;
        
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