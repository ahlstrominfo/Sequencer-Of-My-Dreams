const UIBase = require('./uiBase');

class UITrackEdit extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.copyToTrackNumber = 1; // Default to track 1
    }

    openView() {
        // Set default copy target to a different track
        this.copyToTrackNumber = this.terminalUI.currentTrack === 0 ? 2 : 1;
        
        this.rows = [
            {
                name: 'Clear',
                value: () => '(Reset track to defaults)',
                enter: () => this.executeClear()
            },
            {
                name: 'Copy Track: ',
                layout: 1,
                cols: [
                    {
                        name: 'To Track',
                        value: () => this.copyToTrackNumber,
                        handle: (delta, step) => {
                            const newValue = this.copyToTrackNumber + delta * step;
                            this.copyToTrackNumber = Math.max(1, Math.min(this.sequencer.tracks.length, newValue));
                        }
                    },
                    {
                        name: 'Execute',
                        enter: () => this.executeCopyTo()
                    }
                ]
            }
        ];
    }

    render() {
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        console.log(`=== Edit Track ${this.terminalUI.currentTrack + 1}: ${track.name || 'Track ' + (this.terminalUI.currentTrack + 1)} ===`);
        console.log('');
        
        // Call parent render to handle rows
        super.render();
        
        console.log('');
        console.log('Controls:');
        console.log('↑/↓ - Navigate options');
        console.log('Enter - Select/Edit option');
        console.log('←/→ - Adjust values (when editing)');
        console.log('Escape - Back to track view');
    }

    executeClear() {
        const track = this.sequencer.tracks[this.terminalUI.currentTrack];
        
        // Reset track to default settings
        track.reset();
        
        // Show confirmation and go back to track view
        console.log(`Track ${this.terminalUI.currentTrack + 1} cleared successfully!`);
        this.terminalUI.setView('track');
        return true;
    }

    executeCopyTo() {
        const targetTrackIndex = this.copyToTrackNumber - 1;
        
        // Validate the target track number
        if (targetTrackIndex < 0 || targetTrackIndex >= this.sequencer.tracks.length) {
            console.log(`Invalid track number. Please select a track between 1 and ${this.sequencer.tracks.length}`);
            return true;
        }

        if (targetTrackIndex === this.terminalUI.currentTrack) {
            console.log('Cannot copy track to itself');
            return true;
        }

        // Copy current track settings to target track
        const sourceTrack = this.sequencer.tracks[this.terminalUI.currentTrack];
        const targetTrack = this.sequencer.tracks[targetTrackIndex];
        
        // Copy all relevant properties
        targetTrack.copyFrom(sourceTrack);
        
        // Show confirmation and go back to track view
        console.log(`Track ${this.terminalUI.currentTrack + 1} copied to Track ${this.copyToTrackNumber} successfully!`);
        this.terminalUI.setView('track');
        return true;
    }

    handleEscape() {
        if (this.isEditingField) {
            this.isEditingField = false;
        } else {
            this.terminalUI.setView('track');
        }
    }
}

module.exports = UITrackEdit;