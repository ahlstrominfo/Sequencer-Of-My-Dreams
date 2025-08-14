class SequencerVisualMonitor {
    constructor() {
        this.socket = io();
        this.state = window.reactiveState;
        this.trackPatternPositions = {}; // trackId -> current step position
        this.currentlyPlayingNotes = {}; // trackId -> Set of note numbers
        
        this.initializeElements();
        this.setupSocketListeners();
        this.setupStateSubscriptions();
    }
    
    initializeElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            currentBPM: document.getElementById('currentBPM'),
            playStatus: document.getElementById('playStatus'),
            currentActiveState: document.getElementById('currentActiveState'),
            timeSignature: document.getElementById('timeSignature'),
            tracksDisplay: document.getElementById('tracksDisplay')
        };
    }
    
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('🔌 Connected to sequencer');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from sequencer');
            this.updateConnectionStatus(false);
        });
        
        // Listen for state updates
        this.socket.on('pathUpdate', (data) => {
            this.state.set(data.path, data.value);
        });
        
        // Full state sync
        this.socket.on('fullState', (state) => {
            this.state.batch(this.flattenToPathsAndValues(state));
            this.renderAllTracks();
        });
        
        // Listen for real-time events
        this.socket.on('noteOn', (data) => {
            this.handleNoteOn(data.trackId, data.note, data.velocity);
        });
        
        this.socket.on('noteOff', (data) => {
            this.handleNoteOff(data.trackId, data.note);
        });
        
        this.socket.on('trackPatternStep', (data) => {
            // Only log for tracks 1 and 2 (trackId 0 and 1)
            if (data.trackId === 0 || data.trackId === 1) {
                console.log(`🎯 Track ${data.trackId + 1}: Step ${data.currentStep} / ${data.patternLength}`);
            }
            this.trackPatternPositions[data.trackId] = data.currentStep;
            this.updateTrackPatternHighlight(data.trackId);
        });
    }
    
    setupStateSubscriptions() {
        this.state.subscribe('bpm', () => this.updateBPMDisplay());
        this.state.subscribe('isPlaying', () => this.updatePlayStateDisplay());
        this.state.subscribe('activeState', () => this.updateActiveStateDisplay());
        this.state.subscribe('timeSignature', () => this.updateTimeSignatureDisplay());
        this.state.subscribe('tracks', () => this.renderAllTracks());
        
        // Subscribe to individual track changes
        for (let i = 0; i < 16; i++) {
            this.state.subscribe(`tracks.${i}`, () => this.renderTrack(i));
        }
    }
    
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
    
    updateConnectionStatus(connected) {
        this.elements.connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
        this.elements.connectionStatus.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    updateBPMDisplay() {
        const bpm = this.state.get('bpm') || 120;
        this.elements.currentBPM.textContent = bpm;
    }
    
    updatePlayStateDisplay() {
        const isPlaying = this.state.get('isPlaying');
        this.elements.playStatus.textContent = isPlaying ? 'Playing' : 'Stopped';
    }
    
    updateActiveStateDisplay() {
        const activeState = this.state.get('activeState') || 0;
        this.elements.currentActiveState.textContent = activeState;
    }
    
    updateTimeSignatureDisplay() {
        const timeSignature = this.state.get('timeSignature');
        if (timeSignature) {
            this.elements.timeSignature.textContent = `${timeSignature[0]}/${timeSignature[1]}`;
        }
    }
    
    renderAllTracks() {
        this.elements.tracksDisplay.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            this.renderTrack(i);
        }
    }
    
    renderTrack(trackId) {
        const track = this.state.getTrack(trackId);
        
        if (!track) {
            return;
        }
        
        let trackElement = document.getElementById(`track-${trackId}`);
        if (!trackElement) {
            trackElement = document.createElement('div');
            trackElement.id = `track-${trackId}`;
            trackElement.className = 'track-row';
            this.elements.tracksDisplay.appendChild(trackElement);
        }
        
        // Update track state classes
        trackElement.className = `track-row ${track.isActive ? 'active' : 'inactive'}`;
        
        // Generate pattern visualization
        const patternHtml = this.generatePatternVisualization(track, trackId);
        const notesHtml = this.generateNotesDisplay(trackId);
        const infoHtml = this.generateTrackInfo(track);
        
        trackElement.innerHTML = `
            <div class="track-id">T${trackId + 1}</div>
            <div class="track-pattern">
                <div class="pattern-info">${this.getPatternTypeName(track.triggerType)} Pattern</div>
                ${patternHtml}
            </div>
            <div class="track-notes">
                <div class="notes-label">Playing Notes</div>
                ${notesHtml}
            </div>
            <div class="track-info">
                ${infoHtml}
            </div>
        `;
    }
    
    generatePatternVisualization(track, trackId) {
        const pattern = this.generatePatternFromSettings(track.triggerType, track.triggerSettings);
        const beatsHtml = this.generateBeatIndicators(pattern.length);
        
        let patternHtml = '';
        const currentPosition = this.trackPatternPositions[trackId] || 0;
        
        for (let i = 0; i < pattern.length; i++) {
            const isHit = pattern[i];
            const isCurrent = i === currentPosition;
            
            patternHtml += `<span class="pattern-beat ${isHit ? 'hit' : 'empty'} ${isCurrent ? 'current' : ''}">${isHit ? '●' : '○'}</span>`;
        }
        
        return `
            <div class="beat-indicators">${beatsHtml}</div>
            <div class="pattern-visualization">${patternHtml}</div>
        `;
    }
    
    generateBeatIndicators(length) {
        let indicators = '';
        for (let i = 0; i < Math.ceil(length / 4); i++) {
            indicators += `<span style="margin-right: 15px;">${(i * 4 + 1).toString().padStart(2, ' ')}</span>`;
        }
        return indicators;
    }
    
    generatePatternFromSettings(triggerType, triggerSettings) {
        switch (triggerType) {
            case 0: // Init
                return new Array(triggerSettings.steps || 16).fill(false);
                
            case 1: // Binary
                const numbers = triggerSettings.numbers || [8];
                const length = triggerSettings.length || 16;
                let pattern = [];
                for (let i = 0; i < Math.ceil(length / 4); i++) {
                    const num = numbers[i] || 0;
                    const binary = num.toString(2).padStart(4, '0');
                    pattern.push(...binary.split('').map(bit => bit === '1'));
                }
                return pattern.slice(0, length);
                
            case 2: // Euclidean
                const eucLength = triggerSettings.length || 16;
                const hits = triggerSettings.hits || 4;
                const shift = triggerSettings.shift || 0;
                
                const eucPattern = new Array(eucLength).fill(false);
                for (let i = 0; i < hits; i++) {
                    const pos = Math.floor(i * eucLength / hits);
                    eucPattern[pos] = true;
                }
                
                // Apply shift
                return [...eucPattern.slice(shift), ...eucPattern.slice(0, shift)];
                
            case 3: // Step
                const steps = triggerSettings.steps || [];
                const stepPattern = new Array(16).fill(false);
                steps.forEach(step => {
                    if (step >= 0 && step < 16) {
                        stepPattern[step] = true;
                    }
                });
                return stepPattern;
                
            default:
                return new Array(16).fill(false);
        }
    }
    
    generateNotesDisplay(trackId) {
        const playingNotes = this.currentlyPlayingNotes[trackId] || new Set();
        
        if (playingNotes.size === 0) {
            return '<div class="playing-notes"><span class="empty-notes">No notes playing</span></div>';
        }
        
        const notesHtml = Array.from(playingNotes)
            .sort((a, b) => a - b)
            .map(note => `<span class="note">${this.noteToName(note)}</span>`)
            .join('');
            
        return `<div class="playing-notes">${notesHtml}</div>`;
    }
    
    generateTrackInfo(track) {
        return `
            <div class="info-line">
                <span class="info-label">Channel:</span>
                <span class="info-value">${track.channel}</span>
            </div>
            <div class="info-line">
                <span class="info-label">Velocity:</span>
                <span class="info-value">${track.velocity}</span>
            </div>
            <div class="info-line">
                <span class="info-label">Speed:</span>
                <span class="info-value">${track.speedMultiplier}x</span>
            </div>
            <div class="info-line">
                <span class="info-label">Volume:</span>
                <span class="info-value">${track.volume}%</span>
            </div>
        `;
    }
    
    getPatternTypeName(triggerType) {
        const typeNames = { 0: 'Init', 1: 'Binary', 2: 'Euclidean', 3: 'Step' };
        return typeNames[triggerType] || 'Init';
    }
    
    noteToName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }
    
    handleNoteOn(trackId, note, velocity) {
        if (!this.currentlyPlayingNotes[trackId]) {
            this.currentlyPlayingNotes[trackId] = new Set();
        }
        this.currentlyPlayingNotes[trackId].add(note);
        
        // Update the notes display for this track
        const trackElement = document.getElementById(`track-${trackId}`);
        if (trackElement) {
            const notesContainer = trackElement.querySelector('.playing-notes');
            if (notesContainer) {
                notesContainer.innerHTML = Array.from(this.currentlyPlayingNotes[trackId])
                    .sort((a, b) => a - b)
                    .map(note => `<span class="note">${this.noteToName(note)}</span>`)
                    .join('');
            }
        }
    }
    
    handleNoteOff(trackId, note) {
        if (this.currentlyPlayingNotes[trackId]) {
            this.currentlyPlayingNotes[trackId].delete(note);
            
            // Update the notes display for this track
            const trackElement = document.getElementById(`track-${trackId}`);
            if (trackElement) {
                const notesContainer = trackElement.querySelector('.playing-notes');
                if (notesContainer) {
                    if (this.currentlyPlayingNotes[trackId].size === 0) {
                        notesContainer.innerHTML = '<span class="empty-notes">No notes playing</span>';
                    } else {
                        notesContainer.innerHTML = Array.from(this.currentlyPlayingNotes[trackId])
                            .sort((a, b) => a - b)
                            .map(note => `<span class="note">${this.noteToName(note)}</span>`)
                            .join('');
                    }
                }
            }
        }
    }
    
    updateTrackPatternHighlight(trackId) {
        // Update the current beat highlight for a specific track
        const trackElement = document.getElementById(`track-${trackId}`);
        if (!trackElement) return;
        
        // Remove existing highlights for this track
        trackElement.querySelectorAll('.pattern-beat.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // Add highlight to current position
        const patternBeats = trackElement.querySelectorAll('.pattern-beat');
        const currentPosition = this.trackPatternPositions[trackId] || 0;
        if (patternBeats[currentPosition]) {
            patternBeats[currentPosition].classList.add('current');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sequencerMonitor = new SequencerVisualMonitor();
});