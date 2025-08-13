class SequencerWebClient {
    constructor() {
        this.socket = io();
        this.state = {
            bpm: 120,
            isPlaying: false,
            activeState: 0,
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
            const track = this.state.tracks[i] || { id: i, active: false };
            const trackElement = document.createElement('div');
            trackElement.className = `track ${track.active ? 'active' : ''}`;
            
            trackElement.innerHTML = `
                <div class="track-number">Track ${i + 1}</div>
                <div>Ch: ${track.midiChannel || i + 1}</div>
                <div>Vel: ${track.velocity || 100}</div>
                <div>Status: ${track.active ? 'Active' : 'Inactive'}</div>
            `;
            
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.sequencerClient = new SequencerWebClient();
});