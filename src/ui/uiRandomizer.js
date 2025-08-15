const UIBase = require("./uiBase");

class UIRandomizer extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.randomizer = sequencer.randomizer;
    }

    openView() {
        const availableStyles = this.randomizer.getAvailableStyles();
        this.rows = [];
        
        // Add "Random Style" option at the top
        this.rows.push({
            name: 'Random Style',
            value: () => 'Any genre',
            enter: () => {
                try {
                    const result = this.randomizer.randomizeTrack();
                    this.terminalUI.setView('main');
                    console.log(result.message);
                } catch (error) {
                    console.log(`Error generating random track: ${error.message}`);
                }
            }
        });

        this.rows.push({ name: '------------------', selectable: false });

        // Add each specific style
        availableStyles.forEach((styleName) => {
            const styleInfo = this.randomizer.getStyleInfo(styleName);
            this.rows.push({
                name: styleInfo.name,
                value: () => `${styleInfo.bpmRange} BPM`,
                enter: () => {
                    try {
                        const result = this.randomizer.randomizeTrack(styleName);
                        this.terminalUI.setView('main');
                        console.log(result.message);
                    } catch (error) {
                        console.log(`Error generating ${styleInfo.name} track: ${error.message}`);
                    }
                }
            });
        });

        this.rows.push({ name: '------------------', selectable: false });
        
        // Add options for different randomization modes
        this.rows.push({
            name: 'Random Melodic Only',
            value: () => 'No drums',
            enter: () => {
                try {
                    const result = this.randomizer.randomizeTrack(null, { 
                        excludeTrackTypes: ['kick', 'hihat', 'snare'] 
                    });
                    this.terminalUI.setView('main');
                    console.log(result.message + ' (Melodic only)');
                } catch (error) {
                    console.log(`Error generating melodic track: ${error.message}`);
                }
            }
        });

        this.rows.push({
            name: 'Random Drums Only',
            value: () => 'Percussion',
            enter: () => {
                try {
                    const result = this.randomizer.randomizeTrack(null, { 
                        excludeTrackTypes: ['bass', 'chords', 'lead', 'perc', 'bells', 'pad1', 'pad2', 'texture'] 
                    });
                    this.terminalUI.setView('main');
                    console.log(result.message + ' (Drums only)');
                } catch (error) {
                    console.log(`Error generating drum track: ${error.message}`);
                }
            }
        });
    }

    render() {
        console.log('Generate Random Track');
        console.log('------------------');
        super.render();
        console.log('------------------');
        console.log('Select a style to generate a complete random track with:');
        console.log('• Chord progressions • Rhythmic patterns • Drum beats');
        console.log('• Genre-appropriate BPM and swing • Active states for song structure');
    }

    handleEscape() {
        this.terminalUI.setView('sequencerSettings');        
    }
}

module.exports = UIRandomizer;