const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

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

        this.app.post('/api/sequencer/bpm', (req, res) => {
            const { bpm } = req.body;
            if (bpm >= 60 && bpm <= 200) {
                this.sequencer.setBPM(bpm);
                res.json({ success: true, bpm: this.sequencer.settings.bpm });
            } else {
                res.status(400).json({ error: 'BPM must be between 60 and 200' });
            }
        });

        this.app.post('/api/sequencer/play', (req, res) => {
            this.sequencer.start();
            res.json({ success: true, isPlaying: this.sequencer.isPlaying });
        });

        this.app.post('/api/sequencer/stop', (req, res) => {
            this.sequencer.stop();
            res.json({ success: true, isPlaying: this.sequencer.isPlaying });
        });

        this.app.post('/api/sequencer/activeState', (req, res) => {
            const { state } = req.body;
            if (state >= 0 && state < 16) {
                this.sequencer.switchToActiveState(state);
                res.json({ success: true, activeState: this.sequencer.settings.currentActiveState });
            } else {
                res.status(400).json({ error: 'Active state must be between 0 and 15' });
            }
        });

        this.app.post('/api/track/:trackId/settings', (req, res) => {
            const trackId = parseInt(req.params.trackId);
            const settings = req.body;
            
            if (trackId >= 0 && trackId < 16) {
                try {
                    this.sequencer.updateTrackSettings(trackId, settings);
                    res.json({ success: true, trackId: trackId, settings: settings });
                } catch (error) {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(400).json({ error: 'Track ID must be between 0 and 15' });
            }
        });

        this.app.get('/api/track/:trackId', (req, res) => {
            const trackId = parseInt(req.params.trackId);
            if (trackId >= 0 && trackId < 16 && this.sequencer.tracks[trackId]) {
                res.json({ 
                    trackId: trackId,
                    settings: this.sequencer.tracks[trackId].getSettings()
                });
            } else {
                res.status(404).json({ error: 'Track not found' });
            }
        });

        this.app.post('/api/sequencer/storeActiveState', (req, res) => {
            const { activeStateIndex } = req.body;
            if (activeStateIndex >= 0 && activeStateIndex < 16) {
                this.sequencer.storeCurrentTrackStates(activeStateIndex);
                res.json({ success: true, activeStateIndex: activeStateIndex });
            } else {
                res.status(400).json({ error: 'Active state index must be between 0 and 15' });
            }
        });
    }

    setupWebsockets() {
        this.io.on('connection', (socket) => {
            console.log('Web client connected:', socket.id);
            
            socket.emit('sequencerState', this.getSequencerState());

            socket.on('setBPM', (bpm) => {
                if (bpm >= 60 && bpm <= 200) {
                    this.sequencer.setBPM(bpm);
                }
            });

            socket.on('play', () => {
                this.sequencer.start();
            });

            socket.on('stop', () => {
                this.sequencer.stop();
            });

            socket.on('setActiveState', (state) => {
                if (state >= 0 && state < 16) {
                    this.sequencer.switchToActiveState(state);
                }
            });

            socket.on('updateTrackSettings', (data) => {
                const { trackId, settings } = data;
                if (trackId >= 0 && trackId < 16) {
                    try {
                        this.sequencer.updateTrackSettings(trackId, settings);
                        this.io.emit('trackUpdated', { trackId, settings });
                    } catch (error) {
                        socket.emit('error', { message: error.message, trackId });
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('Web client disconnected:', socket.id);
            });
        });
    }

    setupSequencerListeners() {
        this.sequencer.on('bpmChanged', (data) => {
            this.broadcastUpdate('bpmChanged', data);
        });

        this.sequencer.on('playStateChanged', (data) => {
            this.broadcastUpdate('playStateChanged', data);
        });

        this.sequencer.on('activeStateChanged', (data) => {
            this.broadcastUpdate('activeStateChanged', data);
        });

        this.sequencer.on('trackUpdated', (data) => {
            this.broadcastUpdate('trackUpdated', data);
        });

        this.sequencer.on('activeStatesUpdated', (data) => {
            this.broadcastUpdate('activeStatesUpdated', data);
        });
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
                const settings = track ? track.getSettings() : null;
                return {
                    id: index,
                    isActive: settings?.isActive ?? true,
                    channel: settings?.channel ?? (index + 1),
                    velocity: settings?.noteSeries?.[0]?.velocity ?? 100,
                    volume: settings?.volume ?? 100,
                    speedMultiplier: settings?.speedMultiplier ?? 1,
                    probability: settings?.probability ?? 100,
                    triggerType: settings?.triggerType ?? 0,
                    triggerSettings: settings?.triggerSettings ?? { steps: 16 },
                    hasPattern: !!settings
                };
            })
        };
    }

    broadcastUpdate(event, data) {
        this.io.emit(event, data);
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