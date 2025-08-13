class SequencerWebClient {
    constructor() {
        this.socket = io();
        this.state = window.reactiveState;
        
        // Track selection state
        this.selectedTrackId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.setupStateSubscriptions();
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
            tracksOverview: document.getElementById('tracksOverview'),
            trackEditor: document.getElementById('trackEditor')
        };
        
        this.createActiveStateButtons();
    }
    
    createActiveStateButtons() {
        for (let i = 0; i < 16; i++) {
            const button = document.createElement('div');
            button.className = 'active-state';
            button.textContent = i.toString();
            button.addEventListener('click', () => this.updatePath('activeState', i));
            this.elements.activeStates.appendChild(button);
        }
    }
    
    setupEventListeners() {
        this.elements.playBtn.addEventListener('click', () => this.updatePath('isPlaying', true));
        this.elements.stopBtn.addEventListener('click', () => this.updatePath('isPlaying', false));
        
        this.elements.bpmSlider.addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value);
            this.elements.bpmValue.textContent = bpm;
            this.updatePath('bpm', bpm);
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
        
        // Path-based updates
        this.socket.on('pathUpdate', (data) => {
            console.log(`Path update: ${data.path} =`, data.value);
            this.state.set(data.path, data.value);
        });
        
        // Full state sync
        this.socket.on('fullState', (state) => {
            console.log('Full state sync:', state);
            this.state.batch(this.flattenToPathsAndValues(state));
        });
        
        // Special event handlers
        this.socket.on('activeStateStored', (data) => {
            this.flashActiveStateButton(data.activeStateIndex);
            console.log(`Active state ${data.activeStateIndex} stored`);
        });
        
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
        });
    }
    
    setupStateSubscriptions() {
        // Subscribe to global state changes
        this.state.subscribe('bpm', () => this.updateBPMDisplay());
        this.state.subscribe('isPlaying', () => this.updatePlayStateDisplay());
        this.state.subscribe('activeState', () => this.updateActiveStateDisplay());
        this.state.subscribe('timeSignature', () => this.updateTimeSignatureDisplay());
        this.state.subscribe('tracks', () => this.updateTracksOverview());
        
        // Subscribe to individual track changes
        for (let i = 0; i < 16; i++) {
            this.state.subscribe(`tracks.${i}`, () => {
                this.updateTrackOverview(i);
                
                // If this is the selected track, update the editor
                if (this.selectedTrackId === i) {
                    this.updateTrackEditor();
                }
            });
        }
    }
    
    // Path-based update system
    updatePath(path, value) {
        console.log(`Sending path update: ${path} =`, value);
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
    
    updateConnectionStatus(connected) {
        this.elements.connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
        this.elements.connectionStatus.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    updateBPMDisplay() {
        const bpm = this.state.get('bpm');
        this.elements.bpmSlider.value = bpm;
        this.elements.bpmValue.textContent = bpm;
        this.elements.currentBPM.textContent = bpm;
    }
    
    updatePlayStateDisplay() {
        const isPlaying = this.state.get('isPlaying');
        this.elements.playStatus.textContent = isPlaying ? 'Playing' : 'Stopped';
        this.elements.playBtn.className = isPlaying ? 'playing' : '';
        this.elements.playBtn.textContent = isPlaying ? 'Playing' : 'Play';
    }
    
    updateActiveStateDisplay() {
        const activeState = this.state.get('activeState');
        this.elements.currentActiveState.textContent = activeState;
        
        const activeStateButtons = this.elements.activeStates.children;
        for (let i = 0; i < activeStateButtons.length; i++) {
            activeStateButtons[i].className = 'active-state' + 
                (i === activeState ? ' current' : '');
        }
    }
    
    updateTimeSignatureDisplay() {
        const timeSignature = this.state.get('timeSignature');
        if (timeSignature) {
            this.elements.timeSignature.textContent = 
                `${timeSignature[0]}/${timeSignature[1]}`;
        }
    }
    
    updateTracksOverview() {
        this.elements.tracksOverview.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            this.createTrackOverview(i);
        }
    }
    
    createTrackOverview(trackId) {
        const track = this.state.getTrack(trackId);
        
        const trackElement = document.createElement('div');
        trackElement.className = `track-overview ${track.isActive ? '' : 'inactive'} ${this.selectedTrackId === trackId ? 'selected' : ''}`;
        trackElement.id = `track-overview-${trackId}`;
        trackElement.addEventListener('click', () => this.selectTrack(trackId));
        
        // Generate pattern visualization
        const patternViz = this.generatePatternMiniVisualization(track.triggerType, track.triggerSettings);
        const patternTypeName = this.getPatternTypeName(track.triggerType);
        
        trackElement.innerHTML = `
            <div class="track-number">Track ${trackId + 1}</div>
            <div class="track-info">Ch ${track.channel} | ${patternTypeName}</div>
            <div class="pattern-mini-viz">${patternViz}</div>
            <div class="track-status">
                ${track.isActive ? 'ACTIVE' : 'MUTED'} | 
                V${track.velocity} | 
                ${track.speedMultiplier}x
            </div>
        `;
        
        this.elements.tracksOverview.appendChild(trackElement);
    }
    
    updateTrackOverview(trackId) {
        const existingElement = document.getElementById(`track-overview-${trackId}`);
        if (existingElement) {
            // Re-create the track overview to ensure it's up to date
            const track = this.state.getTrack(trackId);
            const patternViz = this.generatePatternMiniVisualization(track.triggerType, track.triggerSettings);
            const patternTypeName = this.getPatternTypeName(track.triggerType);
            
            // Update classes
            existingElement.className = `track-overview ${track.isActive ? '' : 'inactive'} ${this.selectedTrackId === trackId ? 'selected' : ''}`;
            
            // Update content
            existingElement.innerHTML = `
                <div class="track-number">Track ${trackId + 1}</div>
                <div class="track-info">Ch ${track.channel} | ${patternTypeName}</div>
                <div class="pattern-mini-viz">${patternViz}</div>
                <div class="track-status">
                    ${track.isActive ? 'ACTIVE' : 'MUTED'} | 
                    V${track.velocity} | 
                    ${track.speedMultiplier}x
                </div>
            `;
        } else {
            this.createTrackOverview(trackId);
        }
    }
    
    selectTrack(trackId) {
        // Update selection state
        this.selectedTrackId = trackId;
        
        // Update visual selection in overview
        const overviewElements = this.elements.tracksOverview.querySelectorAll('.track-overview');
        overviewElements.forEach((el, index) => {
            el.classList.toggle('selected', index === trackId);
        });
        
        // Update track editor
        this.updateTrackEditor();
    }
    
    updateTrackEditor() {
        if (this.selectedTrackId === null) {
            this.elements.trackEditor.innerHTML = '<div class="no-selection">Select a track above to edit its settings</div>';
            return;
        }
        
        const track = this.state.getTrack(this.selectedTrackId);
        const trackId = this.selectedTrackId;
        
        // Check if editor already exists for this track
        const existingEditor = this.elements.trackEditor.querySelector('.track-editor-content');
        const existingTrackId = existingEditor ? parseInt(existingEditor.getAttribute('data-track-id')) : null;
        
        if (existingEditor && existingTrackId === trackId) {
            // Update existing editor values without recreating
            this.updateExistingTrackEditor(track, trackId);
            return;
        }
        
        // Create new editor
        this.elements.trackEditor.innerHTML = `
            <div class="track-editor-content active" data-track-id="${trackId}">
                <div class="track-editor-header">
                    <div class="track-editor-title">Track ${trackId + 1} Editor</div>
                    <button class="mute-button ${track.isActive ? '' : 'muted'}" 
                            onclick="sequencerClient.updatePath('tracks.${trackId}.isActive', ${!track.isActive})">
                        ${track.isActive ? 'MUTE' : 'MUTED'}
                    </button>
                </div>
                
                <div class="track-editor-sections">
                    <!-- Basic Settings -->
                    <div class="track-section">
                        <h4>Basic Settings</h4>
                        <div class="track-settings-grid">
                            <div class="setting-group">
                                <label>MIDI Channel</label>
                                <input type="number" min="1" max="16" value="${track.channel}" 
                                       onchange="sequencerClient.updatePath('tracks.${trackId}.channel', parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Velocity</label>
                                <input type="number" min="1" max="127" value="${track.velocity}" 
                                       onchange="sequencerClient.updatePath('tracks.${trackId}.noteSeries.0.velocity', parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Volume</label>
                                <input type="number" min="0" max="200" value="${track.volume}" 
                                       onchange="sequencerClient.updatePath('tracks.${trackId}.volume', parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Speed Multiplier</label>
                                <input type="number" min="0.25" max="4" step="0.25" value="${track.speedMultiplier}" 
                                       onchange="sequencerClient.updatePath('tracks.${trackId}.speedMultiplier', parseFloat(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Probability (%)</label>
                                <input type="number" min="0" max="100" value="${track.probability || 100}" 
                                       onchange="sequencerClient.updatePath('tracks.${trackId}.probability', parseInt(this.value))">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pattern Settings -->
                    <div class="track-section">
                        <h4>Pattern Settings</h4>
                        <div class="setting-group" style="margin-bottom: 15px;">
                            <label>Pattern Type</label>
                            <select onchange="sequencerClient.updateTrackPatternType(${trackId}, parseInt(this.value))">
                                <option value="0" ${track.triggerType === 0 ? 'selected' : ''}>Init</option>
                                <option value="1" ${track.triggerType === 1 ? 'selected' : ''}>Binary</option>
                                <option value="2" ${track.triggerType === 2 ? 'selected' : ''}>Euclidean</option>
                                <option value="3" ${track.triggerType === 3 ? 'selected' : ''}>Step</option>
                            </select>
                        </div>
                        
                        <div class="pattern-controls" id="pattern-controls-${trackId}">
                            <!-- Pattern-specific controls will be inserted here -->
                        </div>
                        
                        <div class="pattern-visualization" id="pattern-viz-${trackId}">
                            <!-- Pattern visualization will be shown here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize pattern controls after creating the editor
        this.updateTrackPatternControls(trackId, track);
    }
    
    updateExistingTrackEditor(track, trackId) {
        // Update values in the existing editor without recreating the DOM
        
        // Update mute button
        const muteButton = this.elements.trackEditor.querySelector('.mute-button');
        if (muteButton) {
            muteButton.className = `mute-button ${track.isActive ? '' : 'muted'}`;
            muteButton.textContent = track.isActive ? 'MUTE' : 'MUTED';
            muteButton.setAttribute('onclick', `sequencerClient.updatePath('tracks.${trackId}.isActive', ${!track.isActive})`);
        }
        
        // Update input values only if they don't have focus (to avoid interrupting user input)
        const inputs = this.elements.trackEditor.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (document.activeElement !== input) {
                // Update the value based on the input's onchange attribute to determine what it controls
                const onChangeAttr = input.getAttribute('onchange');
                if (onChangeAttr) {
                    if (onChangeAttr.includes('channel')) {
                        input.value = track.channel;
                    } else if (onChangeAttr.includes('noteSeries.0.velocity')) {
                        input.value = track.velocity;
                    } else if (onChangeAttr.includes('volume')) {
                        input.value = track.volume;
                    } else if (onChangeAttr.includes('speedMultiplier')) {
                        input.value = track.speedMultiplier;
                    } else if (onChangeAttr.includes('probability')) {
                        input.value = track.probability || 100;
                    }
                }
            }
        });
        
        // Update pattern type selector (only if not focused)
        const patternSelect = this.elements.trackEditor.querySelector('select[onchange*="updateTrackPatternType"]');
        if (patternSelect && document.activeElement !== patternSelect) {
            patternSelect.value = track.triggerType || 0;
        }
        
        // Always update pattern controls and visualization (these don't cause focus issues)
        this.updateTrackPatternControls(trackId, track);
    }
    
    getPatternTypeName(triggerType) {
        const typeNames = { 0: 'Init', 1: 'Binary', 2: 'Euclidean', 3: 'Step' };
        return typeNames[triggerType] || 'Init';
    }
    
    generatePatternMiniVisualization(triggerType, triggerSettings) {
        // Generate a compact 8-step visualization for overview
        let pattern = '';
        
        switch (triggerType) {
            case 0: // Init
                pattern = '□□□□□□□□';
                break;
                
            case 1: // Binary
                const numbers = triggerSettings.numbers || [8];
                let binaryPattern = '';
                for (let i = 0; i < Math.min(2, numbers.length); i++) {
                    const num = numbers[i] || 0;
                    const binary = num.toString(2).padStart(4, '0');
                    binaryPattern += binary;
                }
                pattern = binaryPattern.substring(0, 8).split('').map(bit => bit === '1' ? '■' : '□').join('');
                break;
                
            case 2: // Euclidean
                const length = Math.min(8, triggerSettings.length || 16);
                const hits = Math.min(length, triggerSettings.hits || 4);
                const eucPattern = new Array(8).fill('□');
                for (let i = 0; i < hits; i++) {
                    const pos = Math.floor(i * 8 / hits);
                    if (pos < 8) eucPattern[pos] = '■';
                }
                pattern = eucPattern.join('');
                break;
                
            case 3: // Step
                const steps = triggerSettings.steps || [];
                const stepPattern = new Array(8).fill('□');
                steps.forEach(step => {
                    const scaledStep = Math.floor(step * 8 / 16);
                    if (scaledStep < 8) stepPattern[scaledStep] = '■';
                });
                pattern = stepPattern.join('');
                break;
        }
        
        return pattern || '□□□□□□□□';
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
    
    updateTrackPatternType(trackId, patternType) {
        if (trackId >= 0 && trackId < 16) {
            const currentTrack = this.state.getTrack(trackId);
            
            // Update pattern type
            this.updatePath(`tracks.${trackId}.triggerType`, patternType);
            
            // Reset trigger settings to defaults for new pattern type
            const defaultSettings = this.getDefaultPatternSettings(patternType);
            this.updatePath(`tracks.${trackId}.triggerSettings`, defaultSettings);
            
            // Update the editor immediately if this is the selected track
            if (this.selectedTrackId === trackId) {
                setTimeout(() => {
                    const updatedTrack = this.state.getTrack(trackId);
                    this.updateTrackPatternControls(trackId, updatedTrack);
                }, 100);
            }
        }
    }
    
    getDefaultPatternSettings(patternType) {
        switch (patternType) {
            case 0: // Init
                return { steps: 16 };
            case 1: // Binary
                return { numbers: [8], length: 16 };
            case 2: // Euclidean
                return { length: 16, hits: 4, shift: 0 };
            case 3: // Step
                return { steps: [] };
            default:
                return { steps: 16 };
        }
    }
    
    updateTrackPatternControls(trackId, track) {
        const controlsElement = document.getElementById(`pattern-controls-${trackId}`);
        const vizElement = document.getElementById(`pattern-viz-${trackId}`);
        
        if (!controlsElement || !vizElement) return;
        
        const triggerType = track.triggerType || 0;
        const triggerSettings = track.triggerSettings || this.getDefaultPatternSettings(triggerType);
        
        // Always recreate controls for simplicity with path-based system
        controlsElement.innerHTML = '';
        
        // Create pattern-specific controls
        switch (triggerType) {
            case 0: // Init
                this.createInitControls(controlsElement, trackId, triggerSettings);
                break;
            case 1: // Binary
                this.createBinaryControls(controlsElement, trackId, triggerSettings);
                break;
            case 2: // Euclidean
                this.createEuclideanControls(controlsElement, trackId, triggerSettings);
                break;
            case 3: // Step
                this.createStepControls(controlsElement, trackId, triggerSettings);
                break;
        }
        
        // Update visualization
        this.updatePatternVisualization(trackId, triggerType, triggerSettings);
    }
    
    createInitControls(container, trackId, settings) {
        container.innerHTML = `
            <div class="pattern-control">
                <label>Steps</label>
                <input type="number" min="1" max="64" value="${settings.steps || 16}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.steps', parseInt(this.value))">
            </div>
        `;
    }
    
    createBinaryControls(container, trackId, settings) {
        const numbers = settings.numbers || [8];
        const length = settings.length || 16;
        
        let binaryInputs = '';
        for (let i = 0; i < Math.min(4, Math.ceil(length / 4)); i++) {
            binaryInputs += `
                <input type="number" min="0" max="15" value="${numbers[i] || 0}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.numbers.${i}', parseInt(this.value))">
            `;
        }
        
        container.innerHTML = `
            <div class="pattern-control">
                <label>Length</label>
                <input type="number" min="4" max="64" step="4" value="${length}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.length', parseInt(this.value))">
            </div>
            <div class="pattern-control">
                <label>Binary Numbers (0-15)</label>
                <div class="binary-numbers">
                    ${binaryInputs}
                </div>
            </div>
        `;
    }
    
    createEuclideanControls(container, trackId, settings) {
        const length = settings.length || 16;
        const hits = settings.hits || 4;
        const shift = settings.shift || 0;
        
        container.innerHTML = `
            <div class="pattern-control">
                <label>Length</label>
                <input type="number" min="1" max="64" value="${length}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.length', parseInt(this.value))">
            </div>
            <div class="pattern-control">
                <label>Hits</label>
                <input type="number" min="0" max="${length}" value="${hits}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.hits', parseInt(this.value))">
            </div>
            <div class="pattern-control">
                <label>Shift</label>
                <input type="number" min="0" max="${length - 1}" value="${shift}" 
                       onchange="sequencerClient.updatePath('tracks.${trackId}.triggerSettings.shift', parseInt(this.value))">
            </div>
        `;
    }
    
    createStepControls(container, trackId, settings) {
        const steps = settings.steps || [];
        
        let stepButtons = '';
        for (let i = 0; i < 16; i++) {
            const isActive = steps.includes(i);
            stepButtons += `
                <div class="step-button ${isActive ? 'active' : ''}" 
                     onclick="sequencerClient.toggleStepButton(${trackId}, ${i})">
                    ${i + 1}
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="pattern-control" style="grid-column: 1 / -1;">
                <label>Steps (Click to toggle)</label>
                <div class="step-pattern">
                    ${stepButtons}
                </div>
            </div>
        `;
    }
    
    toggleStepButton(trackId, step) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.getTrack(trackId);
            if (!track) return;
            
            const steps = [...(track.triggerSettings?.steps || [])];
            const stepIndex = steps.indexOf(step);
            
            if (stepIndex >= 0) {
                steps.splice(stepIndex, 1);
            } else {
                steps.push(step);
                steps.sort((a, b) => a - b);
            }
            
            this.updatePath(`tracks.${trackId}.triggerSettings.steps`, steps);
            
            // Update button state immediately
            const controlsElement = document.getElementById(`pattern-controls-${trackId}`);
            if (controlsElement) {
                const stepButton = controlsElement.querySelector(`[onclick*="toggleStepButton(${trackId}, ${step})"]`);
                if (stepButton) {
                    const isActive = steps.includes(step);
                    stepButton.className = `step-button ${isActive ? 'active' : ''}`;
                }
            }
        }
    }
    
    updatePatternVisualization(trackId, triggerType, triggerSettings) {
        const vizElement = document.getElementById(`pattern-viz-${trackId}`);
        if (!vizElement) return;
        
        let visualization = '';
        let beatIndicators = '';
        
        switch (triggerType) {
            case 0: // Init
                const initLength = triggerSettings.steps || 16;
                visualization = '□'.repeat(initLength);
                beatIndicators = Array.from({ length: Math.ceil(initLength / 4) }, (_, i) => (i * 4 + 1).toString().padStart(2)).join('   ');
                break;
                
            case 1: // Binary
                const numbers = triggerSettings.numbers || [8];
                const binLength = triggerSettings.length || 16;
                let binaryPattern = '';
                for (let i = 0; i < Math.ceil(binLength / 4); i++) {
                    const num = numbers[i] || 0;
                    const binary = num.toString(2).padStart(4, '0');
                    binaryPattern += binary.split('').map(bit => bit === '1' ? '■' : '□').join('');
                }
                visualization = binaryPattern.substring(0, binLength);
                beatIndicators = Array.from({ length: Math.ceil(binLength / 4) }, (_, i) => (i * 4 + 1).toString().padStart(2)).join('   ');
                break;
                
            case 2: // Euclidean
                const eucLength = triggerSettings.length || 16;
                const hits = triggerSettings.hits || 4;
                const shift = triggerSettings.shift || 0;
                
                // Generate Euclidean pattern
                const pattern = new Array(eucLength).fill('□');
                for (let i = 0; i < hits; i++) {
                    const pos = Math.floor(i * eucLength / hits);
                    pattern[pos] = '■';
                }
                
                // Apply shift
                const shiftedPattern = [...pattern.slice(shift), ...pattern.slice(0, shift)];
                visualization = shiftedPattern.join('');
                beatIndicators = Array.from({ length: Math.ceil(eucLength / 4) }, (_, i) => (i * 4 + 1).toString().padStart(2)).join('   ');
                break;
                
            case 3: // Step
                const steps = triggerSettings.steps || [];
                const stepPattern = new Array(16).fill('□');
                steps.forEach(step => {
                    if (step >= 0 && step < 16) {
                        stepPattern[step] = '■';
                    }
                });
                visualization = stepPattern.join('');
                beatIndicators = Array.from({ length: 4 }, (_, i) => (i * 4 + 1).toString().padStart(2)).join('   ');
                break;
        }
        
        vizElement.innerHTML = `
            <div class="beat-indicator">${beatIndicators}</div>
            <div>${visualization}</div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sequencerClient = new SequencerWebClient();
});