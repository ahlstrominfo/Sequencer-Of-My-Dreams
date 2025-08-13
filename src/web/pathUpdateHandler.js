// Backend path update handler example
class PathUpdateHandler {
    constructor(sequencer, io) {
        this.sequencer = sequencer;
        this.io = io;
    }
    
    setupSocketListeners(socket) {
        socket.on('updatePath', (data) => {
            try {
                this.handlePathUpdate(data.path, data.value);
            } catch (error) {
                socket.emit('error', { message: error.message, path: data.path });
            }
        });
    }
    
    handlePathUpdate(path, value) {
        const pathParts = path.split('.');
        console.log(`Updating path: ${path} = ${value}`);
        
        // Route to appropriate handler based on path
        if (path.startsWith('tracks.')) {
            this.handleTrackUpdate(pathParts, value);
        } else if (path === 'bpm') {
            this.sequencer.setBPM(value);
        } else if (path === 'activeState') {
            this.sequencer.switchToActiveState(value);
        } else {
            throw new Error(`Unknown path: ${path}`);
        }
        
        // Broadcast the change to all clients
        this.io.emit('stateUpdate', { path, value });
    }
    
    handleTrackUpdate(pathParts, value) {
        const trackId = parseInt(pathParts[1]);
        
        if (trackId < 0 || trackId >= 16) {
            throw new Error(`Invalid track ID: ${trackId}`);
        }
        
        const track = this.sequencer.tracks[trackId];
        if (!track) {
            throw new Error(`Track ${trackId} not found`);
        }
        
        // Handle different track property updates
        const property = pathParts[2];
        
        switch (property) {
            case 'channel':
                track.setChannel(value);
                break;
                
            case 'isActive':
                track.setActive(value);
                break;
                
            case 'volume':
                track.setVolume(value);
                break;
                
            case 'speedMultiplier':
                track.setSpeedMultiplier(value);
                break;
                
            case 'triggerType':
                track.setTriggerType(value);
                break;
                
            case 'triggerSettings':
                // Handle nested trigger settings
                const settingKey = pathParts[3];
                const currentSettings = track.getTriggerSettings();
                
                if (settingKey) {
                    // Single setting update: tracks.0.triggerSettings.length
                    track.setTriggerSettings({
                        ...currentSettings,
                        [settingKey]: value
                    });
                } else {
                    // Full settings update: tracks.0.triggerSettings
                    track.setTriggerSettings(value);
                }
                break;
                
            case 'noteSeries':
                // Handle note series updates
                const seriesIndex = parseInt(pathParts[3]);
                const noteProperty = pathParts[4];
                
                if (noteProperty) {
                    // Single note property: tracks.0.noteSeries.0.velocity
                    const currentSeries = track.getNoteSeries();
                    if (currentSeries[seriesIndex]) {
                        currentSeries[seriesIndex][noteProperty] = value;
                        track.setNoteSeries(currentSeries);
                    }
                } else {
                    // Full note series update: tracks.0.noteSeries.0
                    const currentSeries = track.getNoteSeries();
                    currentSeries[seriesIndex] = value;
                    track.setNoteSeries(currentSeries);
                }
                break;
                
            default:
                throw new Error(`Unknown track property: ${property}`);
        }
    }
    
    // Send full state to client
    sendFullState(socket) {
        const fullState = this.getFullSequencerState();
        socket.emit('fullState', fullState);
    }
    
    getFullSequencerState() {
        return {
            bpm: this.sequencer.settings.bpm,
            isPlaying: this.sequencer.isPlaying,
            activeState: this.sequencer.settings.currentActiveState,
            activeStates: this.sequencer.settings.activeStates,
            timeSignature: this.sequencer.settings.timeSignature,
            swing: this.sequencer.settings.swing,
            tracks: this.sequencer.tracks.map(track => track ? track.getSettings() : null)
        };
    }
}

module.exports = PathUpdateHandler;