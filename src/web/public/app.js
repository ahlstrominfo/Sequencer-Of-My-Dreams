class SequencerWebClient {
    constructor() {
        this.socket = io();
        this.state = {
            bpm: 120,
            isPlaying: false,
            activeState: 0,
            activeStates: [],
            timeSignature: [4, 4],
            tracks: []
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
    }
    
    initializeElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            playBtn: document.getElementById('playBtn'),
            stopBtn: document.getElementById('stopBtn'),
            bpmSlider: document.getElementById('bpmSlider'),
            bpmValue: document.getElementById('bpmValue'),
            currentBPM: document.getElementById('currentBPM'),
            playStatus: document.getElementById('playStatus'),
            currentActiveState: document.getElementById('currentActiveState'),
            timeSignature: document.getElementById('timeSignature'),
            activeStates: document.getElementById('activeStates'),
            tracksGrid: document.getElementById('tracksGrid')
        };
        
        this.createActiveStateButtons();
    }
    
    createActiveStateButtons() {
        for (let i = 0; i < 16; i++) {
            const button = document.createElement('div');
            button.className = 'active-state';
            button.textContent = i.toString();
            button.addEventListener('click', () => this.setActiveState(i));
            this.elements.activeStates.appendChild(button);
        }
    }
    
    setupEventListeners() {
        this.elements.playBtn.addEventListener('click', () => this.play());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
        
        this.elements.bpmSlider.addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value);
            this.elements.bpmValue.textContent = bpm;
            this.setBPM(bpm);
        });
        
        this.elements.bpmSlider.addEventListener('change', (e) => {
            const bpm = parseInt(e.target.value);
            this.setBPM(bpm);
        });
    }
    
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to sequencer');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from sequencer');
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('sequencerState', (state) => {
            console.log('Received sequencer state:', state);
            this.updateState(state);
        });
        
        this.socket.on('bpmChanged', (data) => {
            console.log('BPM changed:', data.bpm);
            this.state.bpm = data.bpm;
            this.updateBPMDisplay();
        });
        
        this.socket.on('playStateChanged', (data) => {
            console.log('Play state changed:', data.isPlaying);
            this.state.isPlaying = data.isPlaying;
            this.updatePlayStateDisplay();
        });
        
        this.socket.on('activeStateChanged', (data) => {
            console.log('Active state changed:', data.activeState);
            this.state.activeState = data.activeState;
            this.updateActiveStateDisplay();
        });
        
        this.socket.on('trackUpdated', (data) => {
            console.log('Track updated:', data);
            const trackData = {
                id: data.trackId,
                isActive: data.settings?.isActive ?? true,
                channel: data.settings?.channel ?? (data.trackId + 1),
                velocity: data.settings?.noteSeries?.[0]?.velocity ?? 100,
                volume: data.settings?.volume ?? 100,
                speedMultiplier: data.settings?.speedMultiplier ?? 1,
                probability: data.settings?.probability ?? 100,
                triggerType: data.settings?.triggerType ?? 'INIT',
                hasPattern: !!data.settings
            };
            
            // Ensure tracks array exists and has enough elements
            if (!this.state.tracks) {
                this.state.tracks = [];
            }
            while (this.state.tracks.length <= data.trackId) {
                this.state.tracks.push({});
            }
            
            Object.assign(this.state.tracks[data.trackId], trackData);
            this.updateSingleTrackDisplay(data.trackId);
        });
        
        this.socket.on('activeStatesUpdated', (data) => {
            console.log('Active states updated:', data);
            this.state.activeStates = data.activeStates;
            
            // Show visual feedback for the updated active state
            this.flashActiveStateButton(data.activeStateIndex);
            console.log(`Active state ${data.activeStateIndex} updated with current track states`);
        });
        
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
        });
    }
    
    updateConnectionStatus(connected) {
        this.elements.connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
        this.elements.connectionStatus.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    updateState(state) {
        this.state = { ...this.state, ...state };
        this.updateAllDisplays();
    }
    
    updateAllDisplays() {
        this.updateBPMDisplay();
        this.updatePlayStateDisplay();
        this.updateActiveStateDisplay();
        this.updateTimeSignatureDisplay();
        this.updateTracksDisplay();
    }
    
    updateBPMDisplay() {
        this.elements.bpmSlider.value = this.state.bpm;
        this.elements.bpmValue.textContent = this.state.bpm;
        this.elements.currentBPM.textContent = this.state.bpm;
    }
    
    updatePlayStateDisplay() {
        this.elements.playStatus.textContent = this.state.isPlaying ? 'Playing' : 'Stopped';
        this.elements.playBtn.className = this.state.isPlaying ? 'playing' : '';
        this.elements.playBtn.textContent = this.state.isPlaying ? 'Playing' : 'Play';
    }
    
    updateActiveStateDisplay() {
        this.elements.currentActiveState.textContent = this.state.activeState;
        
        const activeStateButtons = this.elements.activeStates.children;
        for (let i = 0; i < activeStateButtons.length; i++) {
            activeStateButtons[i].className = 'active-state' + 
                (i === this.state.activeState ? ' current' : '');
        }
    }
    
    updateTimeSignatureDisplay() {
        if (this.state.timeSignature) {
            this.elements.timeSignature.textContent = 
                `${this.state.timeSignature[0]}/${this.state.timeSignature[1]}`;
        }
    }
    
    updateTracksDisplay() {
        if (!this.state.tracks) return;
        
        this.elements.tracksGrid.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            this.createTrackElement(i);
        }
    }
    
    createTrackElement(trackId) {
        const track = this.state.tracks[trackId] || { 
            id: trackId, 
            isActive: true,
            channel: trackId + 1,
            velocity: 100,
            volume: 100,
            hasPattern: false
        };
        
        const trackElement = document.createElement('div');
        trackElement.className = `track ${track.isActive ? 'active' : 'inactive'}`;
        trackElement.id = `track-${trackId}`;
        
        trackElement.innerHTML = `
            <div class="track-header">
                <div class="track-number">Track ${trackId + 1}</div>
                <button class="mute-button ${track.isActive ? '' : 'muted'}" 
                        onclick="sequencerClient.toggleTrackMute(${trackId})">
                    ${track.isActive ? 'MUTE' : 'MUTED'}
                </button>
            </div>
            
            <div class="track-controls">
                <div class="track-control">
                    <label>MIDI Ch</label>
                    <input type="number" min="1" max="16" value="${track.channel}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'channel', parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Velocity</label>
                    <input type="number" min="1" max="127" value="${track.velocity}" 
                           onchange="sequencerClient.updateTrackVelocity(${trackId}, parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Volume</label>
                    <input type="number" min="0" max="100" value="${track.volume}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'volume', parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Probability</label>
                    <input type="number" min="0" max="100" value="${track.probability || 100}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'probability', parseInt(this.value))">
                </div>
            </div>
            
            <div class="track-status">
                Pattern: ${track.hasPattern ? track.triggerType || 'Set' : 'None'} | 
                Speed: ${track.speedMultiplier || 1}x
            </div>
        `;
        
        this.elements.tracksGrid.appendChild(trackElement);
    }
    
    updateSingleTrackDisplay(trackId) {
        const existingElement = document.getElementById(`track-${trackId}`);
        if (existingElement) {
            const track = this.state.tracks[trackId] || { 
                id: trackId, 
                isActive: true,
                channel: trackId + 1,
                velocity: 100,
                volume: 100,
                hasPattern: false
            };
            
            // Update existing element instead of recreating
            existingElement.className = `track ${track.isActive ? 'active' : 'inactive'}`;
            
            // Update mute button
            const muteButton = existingElement.querySelector('.mute-button');
            if (muteButton) {
                muteButton.className = `mute-button ${track.isActive ? '' : 'muted'}`;
                muteButton.textContent = track.isActive ? 'MUTE' : 'MUTED';
            }
            
            // Update input values
            const channelInput = existingElement.querySelector('input[onchange*="channel"]');
            if (channelInput) channelInput.value = track.channel;
            
            const velocityInput = existingElement.querySelector('input[onchange*="Velocity"]');
            if (velocityInput) velocityInput.value = track.velocity;
            
            const volumeInput = existingElement.querySelector('input[onchange*="volume"]');
            if (volumeInput) volumeInput.value = track.volume;
            
            const probabilityInput = existingElement.querySelector('input[onchange*="probability"]');
            if (probabilityInput) probabilityInput.value = track.probability || 100;
            
            // Update status text
            const statusElement = existingElement.querySelector('.track-status');
            if (statusElement) {
                statusElement.textContent = `Pattern: ${track.hasPattern ? track.triggerType || 'Set' : 'None'} | Speed: ${track.speedMultiplier || 1}x`;
            }
        } else {
            // Element doesn't exist, create it at the correct position
            this.insertTrackElementAtPosition(trackId);
        }
    }
    
    insertTrackElementAtPosition(trackId) {
        const track = this.state.tracks[trackId] || { 
            id: trackId, 
            isActive: true,
            channel: trackId + 1,
            velocity: 100,
            volume: 100,
            hasPattern: false
        };
        
        const trackElement = document.createElement('div');
        trackElement.className = `track ${track.isActive ? 'active' : 'inactive'}`;
        trackElement.id = `track-${trackId}`;
        
        trackElement.innerHTML = `
            <div class="track-header">
                <div class="track-number">Track ${trackId + 1}</div>
                <button class="mute-button ${track.isActive ? '' : 'muted'}" 
                        onclick="sequencerClient.toggleTrackMute(${trackId})">
                    ${track.isActive ? 'MUTE' : 'MUTED'}
                </button>
            </div>
            
            <div class="track-controls">
                <div class="track-control">
                    <label>MIDI Ch</label>
                    <input type="number" min="1" max="16" value="${track.channel}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'channel', parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Velocity</label>
                    <input type="number" min="1" max="127" value="${track.velocity}" 
                           onchange="sequencerClient.updateTrackVelocity(${trackId}, parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Volume</label>
                    <input type="number" min="0" max="100" value="${track.volume}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'volume', parseInt(this.value))">
                </div>
                <div class="track-control">
                    <label>Probability</label>
                    <input type="number" min="0" max="100" value="${track.probability || 100}" 
                           onchange="sequencerClient.updateTrackSetting(${trackId}, 'probability', parseInt(this.value))">
                </div>
            </div>
            
            <div class="track-status">
                Pattern: ${track.hasPattern ? track.triggerType || 'Set' : 'None'} | 
                Speed: ${track.speedMultiplier || 1}x
            </div>
        `;
        
        // Insert at the correct position
        const nextTrackElement = document.getElementById(`track-${trackId + 1}`);
        if (nextTrackElement) {
            this.elements.tracksGrid.insertBefore(trackElement, nextTrackElement);
        } else {
            this.elements.tracksGrid.appendChild(trackElement);
        }
    }
    
    setBPM(bpm) {
        if (bpm >= 60 && bpm <= 200) {
            this.socket.emit('setBPM', bpm);
        }
    }
    
    play() {
        this.socket.emit('play');
    }
    
    stop() {
        this.socket.emit('stop');
    }
    
    setActiveState(state) {
        if (state >= 0 && state < 16) {
            this.socket.emit('setActiveState', state);
        }
    }
    
    toggleTrackMute(trackId) {
        const track = this.state.tracks[trackId];
        if (track) {
            const newActiveState = !track.isActive;
            this.updateTrackSetting(trackId, 'isActive', newActiveState);
        }
    }
    
    updateTrackSetting(trackId, setting, value) {
        if (trackId >= 0 && trackId < 16) {
            const settings = { [setting]: value };
            this.socket.emit('updateTrackSettings', { trackId, settings });
        }
    }
    
    updateTrackVelocity(trackId, velocity) {
        if (trackId >= 0 && trackId < 16 && velocity >= 1 && velocity <= 127) {
            const settings = { 
                noteSeries: [{ 
                    ...this.state.tracks[trackId]?.noteSeries?.[0],
                    velocity: velocity 
                }] 
            };
            this.socket.emit('updateTrackSettings', { trackId, settings });
        }
    }
    
    flashActiveStateButton(activeStateIndex) {
        const activeStateButtons = this.elements.activeStates.children;
        if (activeStateButtons[activeStateIndex]) {
            const button = activeStateButtons[activeStateIndex];
            button.classList.add('updated');
            
            // Remove the flash class after animation completes
            setTimeout(() => {
                button.classList.remove('updated');
            }, 500);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sequencerClient = new SequencerWebClient();
});