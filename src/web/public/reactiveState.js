class ReactiveState {
    constructor() {
        this.state = {
            bpm: 120,
            isPlaying: false,
            activeState: 0,
            activeStates: [],
            timeSignature: [4, 4],
            swing: 0,
            tracks: []
        };
        
        this.subscribers = {};
        this.updateQueue = new Map();
        this.isUpdating = false;
        
        // Batch updates using requestAnimationFrame
        this.scheduleUpdate = this.scheduleUpdate.bind(this);
        this.processUpdates = this.processUpdates.bind(this);
    }
    
    // Subscribe to state changes
    subscribe(path, callback) {
        if (!this.subscribers[path]) {
            this.subscribers[path] = new Set();
        }
        this.subscribers[path].add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers[path].delete(callback);
        };
    }
    
    // Get current state value
    get(path) {
        return this.getNestedValue(this.state, path);
    }
    
    // Set state value and notify subscribers
    set(path, value) {
        const oldValue = this.getNestedValue(this.state, path);
        
        // Only update if value actually changed
        if (!this.deepEqual(oldValue, value)) {
            this.setNestedValue(this.state, path, value);
            this.queueUpdate(path, value, oldValue);
        }
    }
    
    // Batch multiple updates
    batch(updates) {
        const changes = {};
        
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getNestedValue(this.state, path);
            if (!this.deepEqual(oldValue, value)) {
                this.setNestedValue(this.state, path, value);
                changes[path] = { value, oldValue };
            }
        }
        
        // Queue all changes
        for (const [path, change] of Object.entries(changes)) {
            this.queueUpdate(path, change.value, change.oldValue);
        }
    }
    
    // Queue an update to be processed
    queueUpdate(path, value, oldValue) {
        this.updateQueue.set(path, { value, oldValue });
        this.scheduleUpdate();
    }
    
    // Schedule update processing
    scheduleUpdate() {
        if (!this.isUpdating) {
            this.isUpdating = true;
            requestAnimationFrame(this.processUpdates);
        }
    }
    
    // Process all queued updates
    processUpdates() {
        const updates = new Map(this.updateQueue);
        this.updateQueue.clear();
        this.isUpdating = false;
        
        // Group updates by component type
        const trackUpdates = new Map();
        const globalUpdates = new Map();
        
        for (const [path, change] of updates) {
            if (path.startsWith('tracks.')) {
                const [, trackId, property] = path.split('.');
                if (!trackUpdates.has(trackId)) {
                    trackUpdates.set(trackId, new Map());
                }
                trackUpdates.get(trackId).set(property, change);
            } else {
                globalUpdates.set(path, change);
            }
        }
        
        // Notify subscribers
        for (const [path, change] of updates) {
            this.notify(path, change.value, change.oldValue);
        }
        
        // Notify grouped updates
        for (const [trackId, changes] of trackUpdates) {
            this.notify(`track.${trackId}`, changes);
        }
        
        if (globalUpdates.size > 0) {
            this.notify('global', globalUpdates);
        }
    }
    
    // Notify subscribers of changes
    notify(path, value, oldValue) {
        if (this.subscribers[path]) {
            this.subscribers[path].forEach(callback => {
                try {
                    callback(value, oldValue, path);
                } catch (error) {
                    console.error(`Error in subscriber for ${path}:`, error);
                }
            });
        }
        
        // Also notify parent paths
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.subscribers[parentPath]) {
                this.subscribers[parentPath].forEach(callback => {
                    try {
                        callback(this.getNestedValue(this.state, parentPath), undefined, parentPath);
                    } catch (error) {
                        console.error(`Error in parent subscriber for ${parentPath}:`, error);
                    }
                });
            }
        }
    }
    
    // Helper methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (current[key] === undefined) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    
    deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }
    
    // Debug helpers
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    getSubscribers() {
        const result = {};
        for (const [path, subscribers] of Object.entries(this.subscribers)) {
            result[path] = subscribers.size;
        }
        return result;
    }
    
    // Track-specific helpers
    getTrack(trackId) {
        return this.get(`tracks.${trackId}`) || this.getDefaultTrack(trackId);
    }
    
    setTrack(trackId, trackData) {
        // Ensure tracks array is large enough
        const tracks = this.get('tracks') || [];
        while (tracks.length <= trackId) {
            tracks.push(this.getDefaultTrack(tracks.length));
        }
        
        this.set('tracks', tracks);
        this.set(`tracks.${trackId}`, { ...this.getDefaultTrack(trackId), ...trackData });
    }
    
    updateTrack(trackId, updates) {
        const currentTrack = this.getTrack(trackId);
        const updatedTrack = { ...currentTrack, ...updates };
        this.setTrack(trackId, updatedTrack);
    }
    
    getDefaultTrack(trackId) {
        return {
            id: trackId,
            isActive: true,
            channel: trackId + 1,
            velocity: 100,
            volume: 100,
            speedMultiplier: 1,
            probability: 100,
            triggerType: 0,
            triggerSettings: { steps: 16 },
            hasPattern: false
        };
    }
}

// Create global instance
window.reactiveState = new ReactiveState();