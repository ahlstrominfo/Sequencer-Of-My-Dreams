const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const ValidationUtils = require('../utils/validation');

class WebServer {
    constructor(sequencer, port = 3000) {
        this.sequencer = sequencer;
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
        
        this.setupRoutes();
        this.setupWebsockets();
        this.setupSequencerListeners();
    }

    setupRoutes() {
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        this.app.get('/api/sequencer/state', (req, res) => {
            res.json(this.getSequencerState());
        });

        // Path-based REST API endpoint
        this.app.post('/api/updatePath', (req, res) => {
            const { path, value } = req.body;
            try {
                this.handlePathUpdate(path, value);
                res.json({ success: true, path, value });
            } catch (error) {
                res.status(400).json({ error: error.message, path });
            }
        });
    }

    setupWebsockets() {
        this.io.on('connection', (socket) => {
            console.log('Web client connected:', socket.id);
            
            // Send full state on connection
            socket.emit('fullState', this.getSequencerState());

            // Handle path-based updates
            socket.on('updatePath', (data) => {
                try {
                    this.handlePathUpdate(data.path, data.value);
                } catch (error) {
                    socket.emit('error', { message: error.message, path: data.path });
                }
            });

            // Legacy support for existing commands
            socket.on('setBPM', (bpm) => {
                this.handlePathUpdate('bpm', bpm);
            });

            socket.on('play', () => {
                this.handlePathUpdate('isPlaying', true);
            });

            socket.on('stop', () => {
                this.handlePathUpdate('isPlaying', false);
            });

            socket.on('setActiveState', (state) => {
                this.handlePathUpdate('activeState', state);
            });

            socket.on('disconnect', () => {
                console.log('Web client disconnected:', socket.id);
            });
        });
    }

    setupSequencerListeners() {
        // Listen for sequencer events and broadcast as path updates
        this.sequencer.on('bpmChanged', (data) => {
            this.broadcastPathUpdate('bpm', data.bpm);
        });

        this.sequencer.on('playStateChanged', (data) => {
            this.broadcastPathUpdate('isPlaying', data.isPlaying);
        });

        this.sequencer.on('activeStateChanged', (data) => {
            this.broadcastPathUpdate('activeState', data.activeState);
        });

        this.sequencer.on('trackUpdated', (data) => {
            // Convert track update to path updates
            this.broadcastTrackUpdate(data.trackId, data.settings);
        });

        this.sequencer.on('activeStatesUpdated', (data) => {
            this.broadcastPathUpdate('activeStates', data.activeStates);
            // Also broadcast the specific update event for UI feedback
            this.io.emit('activeStateStored', { activeStateIndex: data.activeStateIndex });
        });

        // Listen for note events from the sequencer
        this.sequencer.on('noteOn', (data) => {
            this.io.emit('noteOn', {
                trackId: data.trackId,
                note: data.note,
                velocity: data.velocity,
                channel: data.channel
            });
        });

        this.sequencer.on('noteOff', (data) => {
            this.io.emit('noteOff', {
                trackId: data.trackId,
                note: data.note,
                channel: data.channel
            });
        });

        // Listen for track-specific pattern step updates
        this.sequencer.on('trackPatternStep', (data) => {
            this.io.emit('trackPatternStep', {
                trackId: data.trackId,
                currentStep: data.currentStep,
                patternLength: data.patternLength
            });
        });
    }

    handlePathUpdate(path, value) {
        const pathParts = path.split('.');
        console.log(`Path update: ${path} = ${JSON.stringify(value)}`);
        
        try {
            // Route to appropriate handler based on path
            if (path === 'bpm') {
                const validatedBPM = ValidationUtils.validateBPM(value);
                this.sequencer.setBPM(validatedBPM);
            } else if (path === 'isPlaying') {
                if (value) {
                    this.sequencer.start();
                } else {
                    this.sequencer.stop();
                }
            } else if (path === 'activeState') {
                const validatedState = ValidationUtils.validateActiveState(value);
                this.sequencer.switchToActiveState(validatedState);
            } else if (path.startsWith('tracks.')) {
                this.handleTrackPathUpdate(pathParts, value);
            } else {
                throw new Error(`Unknown path: ${path}`);
            }
            
            // Broadcast the change to all clients
            this.broadcastPathUpdate(path, value);
            
        } catch (error) {
            console.error(`Error updating path ${path}:`, error.message);
            throw error;
        }
    }

    handleTrackPathUpdate(pathParts, value) {
        const trackId = parseInt(pathParts[1]);
        
        if (isNaN(trackId) || trackId < 0 || trackId >= 16) {
            throw new Error(`Invalid track ID: ${pathParts[1]}`);
        }
        
        // Get current track for context-aware validation
        const currentTrack = this.sequencer.tracks[trackId];
        const currentSettings = currentTrack ? currentTrack.getSettings() : {};
        
        // Reconstruct full path for validation
        const fullPath = pathParts.join('.');
        
        // Validate the value using shared validation
        const validatedValue = ValidationUtils.validateByPath(fullPath, value, currentSettings);
        
        // Convert path update to settings object that track.updateSettings() expects
        const settings = this.convertPathToSettings(pathParts.slice(2), validatedValue);
        
        console.log(`Updating track ${trackId} with settings:`, JSON.stringify(settings));
        
        // Use sequencer's existing updateTrackSettings method
        this.sequencer.updateTrackSettings(trackId, settings);
    }

    convertPathToSettings(pathParts, value) {
        // Convert a path like ['triggerSettings', 'length'] to {triggerSettings: {length: value}}
        const settings = {};
        let current = settings;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
            const key = pathParts[i];
            
            // Handle array indices for nested properties
            if (!isNaN(parseInt(key))) {
                // This is an array index, skip for now as it needs special handling
                continue;
            }
            
            current[key] = {};
            current = current[key];
        }
        
        const finalKey = pathParts[pathParts.length - 1];
        const parentPath = pathParts[pathParts.length - 2];
        
        // Handle special cases for arrays
        if (pathParts.includes('numbers') && !isNaN(parseInt(finalKey))) {
            // Handle triggerSettings.numbers.index updates
            const index = parseInt(finalKey);
            if (!settings.triggerSettings) settings.triggerSettings = {};
            if (!settings.triggerSettings.numbers) settings.triggerSettings.numbers = [];
            settings.triggerSettings.numbers[index] = value;
        } else if (pathParts.includes('steps') && Array.isArray(value)) {
            // Handle full steps array updates
            if (!settings.triggerSettings) settings.triggerSettings = {};
            settings.triggerSettings.steps = value;
        } else if (pathParts.includes('noteSeries') && !isNaN(parseInt(pathParts[1]))) {
            // Handle noteSeries.index.property updates
            const seriesIndex = parseInt(pathParts[1]);
            const property = pathParts[2];
            if (!settings.noteSeries) settings.noteSeries = [];
            if (!settings.noteSeries[seriesIndex]) settings.noteSeries[seriesIndex] = {};
            settings.noteSeries[seriesIndex][property] = value;
        } else {
            // Handle simple property updates
            current[finalKey] = value;
        }
        
        return settings;
    }


    broadcastPathUpdate(path, value) {
        this.io.emit('pathUpdate', { path, value });
    }

    broadcastTrackUpdate(trackId, settings) {
        // Convert track settings to path updates for the frontend
        const paths = this.flattenTrackSettings(trackId, settings);
        for (const [path, value] of Object.entries(paths)) {
            this.broadcastPathUpdate(path, value);
        }
    }

    flattenTrackSettings(trackId, settings) {
        const paths = {};
        
        for (const [key, value] of Object.entries(settings)) {
            if (key === 'triggerSettings' && typeof value === 'object') {
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (Array.isArray(subValue)) {
                        paths[`tracks.${trackId}.${key}.${subKey}`] = subValue;
                        subValue.forEach((item, index) => {
                            paths[`tracks.${trackId}.${key}.${subKey}.${index}`] = item;
                        });
                    } else {
                        paths[`tracks.${trackId}.${key}.${subKey}`] = subValue;
                    }
                }
            } else if (key === 'noteSeries' && Array.isArray(value)) {
                paths[`tracks.${trackId}.${key}`] = value;
                value.forEach((series, seriesIndex) => {
                    if (typeof series === 'object') {
                        for (const [prop, propValue] of Object.entries(series)) {
                            paths[`tracks.${trackId}.${key}.${seriesIndex}.${prop}`] = propValue;
                        }
                    }
                });
            } else {
                paths[`tracks.${trackId}.${key}`] = value;
            }
        }
        
        return paths;
    }

    getSequencerState() {
        return {
            bpm: this.sequencer.settings.bpm,
            isPlaying: this.sequencer.isPlaying,
            activeState: this.sequencer.settings.currentActiveState,
            activeStates: this.sequencer.settings.activeStates,
            timeSignature: this.sequencer.settings.timeSignature,
            swing: this.sequencer.settings.swing,
            tracks: this.sequencer.tracks.map((track, index) => {
                if (!track) {
                    return {
                        id: index,
                        isActive: true,
                        channel: index + 1,
                        velocity: 100,
                        volume: 100,
                        speedMultiplier: 1,
                        probability: 100,
                        triggerType: 0,
                        triggerSettings: { steps: 16 },
                        noteSeries: [{
                            rootNote: 60,
                            numberOfNotes: 1,
                            velocity: 100,
                            inversion: 0,
                            pitchSpan: 0,
                            velocitySpan: 0,
                            probability: 100,
                            aValue: 1,
                            bValue: 1,
                            aValueIndividualNote: 1,
                            bValueIndividualNote: 1,
                            arpMode: 0,
                            spread: 0,
                            maxDurationFactor: 1,
                            useMaxDuration: false,
                            playMultiplier: 1,
                            wonkyArp: false
                        }],
                        hasPattern: false
                    };
                }
                
                const settings = track.getSettings();
                return {
                    id: index,
                    isActive: settings.isActive ?? true,
                    channel: settings.channel ?? (index + 1),
                    velocity: settings.noteSeries?.[0]?.velocity ?? 100,
                    volume: settings.volume ?? 100,
                    speedMultiplier: settings.speedMultiplier ?? 1,
                    probability: settings.probability ?? 100,
                    triggerType: settings.triggerType ?? 0,
                    triggerSettings: settings.triggerSettings ?? { steps: 16 },
                    noteSeries: settings.noteSeries ?? [{
                        rootNote: 60,
                        numberOfNotes: 1,
                        velocity: 100,
                        inversion: 0,
                        pitchSpan: 0,
                        velocitySpan: 0,
                        probability: 100,
                        aValue: 1,
                        bValue: 1,
                        aValueIndividualNote: 1,
                        bValueIndividualNote: 1,
                        arpMode: 0,
                        spread: 0,
                        maxDurationFactor: 1,
                        useMaxDuration: false,
                        playMultiplier: 1,
                        wonkyArp: false
                    }],
                    hasPattern: !!settings
                };
            })
        };
    }

    start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(`Web interface available at http://localhost:${this.port}`);
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log('Web server stopped');
                resolve();
            });
        });
    }
}

module.exports = WebServer;