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
                this.sequencer.setActiveState(state);
                res.json({ success: true, activeState: this.sequencer.settings.currentActiveState });
            } else {
                res.status(400).json({ error: 'Active state must be between 0 and 15' });
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
                    this.sequencer.setActiveState(state);
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
    }

    getSequencerState() {
        return {
            bpm: this.sequencer.settings.bpm,
            isPlaying: this.sequencer.isPlaying,
            activeState: this.sequencer.settings.currentActiveState,
            timeSignature: this.sequencer.settings.timeSignature,
            swing: this.sequencer.settings.swing,
            tracks: this.sequencer.tracks.map((track, index) => ({
                id: index,
                active: track.active,
                midiChannel: track.midiChannel,
                velocity: track.velocity,
                pattern: track.pattern
            }))
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