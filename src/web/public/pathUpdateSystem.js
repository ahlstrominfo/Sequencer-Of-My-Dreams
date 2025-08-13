// Path-based update system example
class PathUpdateSystem {
    constructor(socket, reactiveState) {
        this.socket = socket;
        this.state = reactiveState;
        this.setupListeners();
    }
    
    setupListeners() {
        // Listen for path-based updates from server
        this.socket.on('stateUpdate', (data) => {
            const { path, value } = data;
            console.log(`Updating ${path} to:`, value);
            this.state.set(path, value);
        });
        
        // Listen for full state sync
        this.socket.on('fullState', (state) => {
            console.log('Full state sync:', state);
            this.state.batch(this.flattenToPathsAndValues(state));
        });
    }
    
    // Send path-based update to server
    updatePath(path, value) {
        console.log(`Sending update: ${path} =`, value);
        this.socket.emit('updatePath', { path, value });
        
        // Optimistic update
        this.state.set(path, value);
    }
    
    // Convert nested object to path/value pairs
    flattenToPathsAndValues(obj, prefix = '') {
        const result = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(result, this.flattenToPathsAndValues(value, path));
            } else {
                result[path] = value;
            }
        }
        
        return result;
    }
    
    // Helper methods for common updates
    updateTrackSetting(trackId, setting, value) {
        this.updatePath(`tracks.${trackId}.${setting}`, value);
    }
    
    updatePatternSetting(trackId, setting, value) {
        this.updatePath(`tracks.${trackId}.triggerSettings.${setting}`, value);
    }
    
    updateNoteSeriesSetting(trackId, seriesIndex, setting, value) {
        this.updatePath(`tracks.${trackId}.noteSeries.${seriesIndex}.${setting}`, value);
    }
    
    updateGlobalSetting(setting, value) {
        this.updatePath(setting, value);
    }
}

// Usage examples:
// pathUpdater.updateTrackSetting(2, 'channel', 5);
// pathUpdater.updatePatternSetting(2, 'length', 16);
// pathUpdater.updateNoteSeriesSetting(2, 0, 'velocity', 127);
// pathUpdater.updateGlobalSetting('bpm', 140);