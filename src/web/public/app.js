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
        
        // Track which patterns are being actively edited to prevent redraws
        this.activelyEditingPattern = {};
        
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
                triggerType: data.settings?.triggerType ?? 0,
                triggerSettings: data.settings?.triggerSettings ?? { steps: 16 },
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
            speedMultiplier: 1,
            probability: 100,
            triggerType: 0,
            triggerSettings: { steps: 16 },
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
            
            <div class="track-patterns">
                <div class="pattern-type-selector">
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
            
            <div class="track-status">
                Speed: ${track.speedMultiplier || 1}x | 
                Prob: ${track.probability || 100}%
            </div>
        `;
        
        this.elements.tracksGrid.appendChild(trackElement);
        
        // Initialize pattern controls after creating the element
        this.updateTrackPatternControls(trackId, track);
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
                statusElement.textContent = `Speed: ${track.speedMultiplier || 1}x | Prob: ${track.probability || 100}%`;
            }
            
            // Update pattern type selector and controls if they exist (but not during active editing)
            if (!this.activelyEditingPattern[trackId]) {
                const patternTypeSelect = existingElement.querySelector('select[onchange*="updateTrackPatternType"]');
                if (patternTypeSelect) {
                    patternTypeSelect.value = track.triggerType || 0;
                }
            }
            
            // Update pattern controls if they exist
            this.updateTrackPatternControls(trackId, track);
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
            speedMultiplier: 1,
            probability: 100,
            triggerType: 0,
            triggerSettings: { steps: 16 },
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
            
            <div class="track-patterns">
                <div class="pattern-type-selector">
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
            
            <div class="track-status">
                Speed: ${track.speedMultiplier || 1}x | 
                Prob: ${track.probability || 100}%
            </div>
        `;
        
        // Insert at the correct position
        const nextTrackElement = document.getElementById(`track-${trackId + 1}`);
        if (nextTrackElement) {
            this.elements.tracksGrid.insertBefore(trackElement, nextTrackElement);
        } else {
            this.elements.tracksGrid.appendChild(trackElement);
        }
        
        // Initialize pattern controls after creating the element
        this.updateTrackPatternControls(trackId, track);
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
    
    updateTrackPatternType(trackId, patternType) {
        if (trackId >= 0 && trackId < 16) {
            // Mark this pattern as being actively edited
            this.activelyEditingPattern[trackId] = true;
            
            // Update the track's trigger type
            const settings = { 
                triggerType: patternType,
                triggerSettings: this.getDefaultPatternSettings(patternType)
            };
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Update the state and controls immediately for responsiveness
            if (!this.state.tracks[trackId]) {
                this.state.tracks[trackId] = {};
            }
            this.state.tracks[trackId].triggerType = patternType;
            this.state.tracks[trackId].triggerSettings = this.getDefaultPatternSettings(patternType);
            
            // For pattern type changes, we DO want to recreate controls
            this.activelyEditingPattern[trackId] = false;
            this.updateTrackPatternControls(trackId, this.state.tracks[trackId]);
            
            // Clear the editing flag after a longer delay for pattern type changes
            setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 1000);
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
        
        // Skip updates if this pattern is being actively edited
        if (this.activelyEditingPattern[trackId]) {
            // Only update visualization, not controls
            this.updatePatternVisualization(trackId, triggerType, triggerSettings);
            return;
        }
        
        // Check if we need to recreate controls (pattern type changed)
        const currentPatternType = controlsElement.getAttribute('data-pattern-type');
        const needsRecreate = currentPatternType !== triggerType.toString();
        
        if (needsRecreate) {
            // Clear existing controls and recreate
            controlsElement.innerHTML = '';
            controlsElement.setAttribute('data-pattern-type', triggerType.toString());
            
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
        } else {
            // Update existing controls without recreating
            this.updateExistingPatternControls(controlsElement, trackId, triggerType, triggerSettings);
        }
        
        // Update visualization
        this.updatePatternVisualization(trackId, triggerType, triggerSettings);
    }
    
    createInitControls(container, trackId, settings) {
        container.innerHTML = `
            <div class="pattern-control">
                <label>Steps</label>
                <input type="number" min="1" max="64" value="${settings.steps || 16}" 
                       onchange="sequencerClient.updatePatternSetting(${trackId}, 'steps', parseInt(this.value))">
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
                       onchange="sequencerClient.updateBinaryNumber(${trackId}, ${i}, parseInt(this.value))">
            `;
        }
        
        container.innerHTML = `
            <div class="pattern-control">
                <label>Length</label>
                <input type="number" min="4" max="64" step="4" value="${length}" 
                       onchange="sequencerClient.updatePatternSetting(${trackId}, 'length', parseInt(this.value))">
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
                       onchange="sequencerClient.updatePatternSetting(${trackId}, 'length', parseInt(this.value))">
            </div>
            <div class="pattern-control">
                <label>Hits</label>
                <input type="number" min="0" max="${length}" value="${hits}" 
                       onchange="sequencerClient.updatePatternSetting(${trackId}, 'hits', parseInt(this.value))">
            </div>
            <div class="pattern-control">
                <label>Shift</label>
                <input type="number" min="0" max="${length - 1}" value="${shift}" 
                       onchange="sequencerClient.updatePatternSetting(${trackId}, 'shift', parseInt(this.value))">
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
    
    updateExistingPatternControls(container, trackId, triggerType, triggerSettings) {
        // Update existing input values without recreating the controls
        const inputs = container.querySelectorAll('input');
        
        switch (triggerType) {
            case 0: // Init
                const stepsInput = inputs[0];
                if (stepsInput) stepsInput.value = triggerSettings.steps || 16;
                break;
                
            case 1: // Binary
                const lengthInput = inputs[0];
                if (lengthInput) lengthInput.value = triggerSettings.length || 16;
                
                const numbers = triggerSettings.numbers || [8];
                for (let i = 1; i < inputs.length && i - 1 < numbers.length; i++) {
                    inputs[i].value = numbers[i - 1] || 0;
                }
                break;
                
            case 2: // Euclidean
                if (inputs[0]) inputs[0].value = triggerSettings.length || 16;
                if (inputs[1]) inputs[1].value = triggerSettings.hits || 4;
                if (inputs[2]) inputs[2].value = triggerSettings.shift || 0;
                break;
                
            case 3: // Step
                // For step patterns, update button states
                const steps = triggerSettings.steps || [];
                const stepButtons = container.querySelectorAll('.step-button');
                stepButtons.forEach((button, index) => {
                    const isActive = steps.includes(index);
                    button.className = `step-button ${isActive ? 'active' : ''}`;
                });
                break;
        }
    }
    
    updatePatternSetting(trackId, setting, value) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.tracks[trackId];
            if (!track) return;
            
            // Mark this pattern as being actively edited
            this.activelyEditingPattern[trackId] = true;
            
            const triggerSettings = { ...track.triggerSettings, [setting]: value };
            const settings = { triggerSettings };
            
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Update local state
            track.triggerSettings = triggerSettings;
            this.updatePatternVisualization(trackId, track.triggerType, triggerSettings);
            
            // Clear the editing flag after a short delay
            setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 500);
        }
    }
    
    updateBinaryNumber(trackId, index, value) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.tracks[trackId];
            if (!track) return;
            
            // Mark this pattern as being actively edited
            this.activelyEditingPattern[trackId] = true;
            
            const numbers = [...(track.triggerSettings?.numbers || [8])];
            while (numbers.length <= index) {
                numbers.push(0);
            }
            numbers[index] = Math.max(0, Math.min(15, value));
            
            const triggerSettings = { ...track.triggerSettings, numbers };
            const settings = { triggerSettings };
            
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Update local state
            track.triggerSettings = triggerSettings;
            this.updatePatternVisualization(trackId, track.triggerType, triggerSettings);
            
            // Clear the editing flag after a short delay
            setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 500);
        }
    }
    
    toggleStepButton(trackId, step) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.tracks[trackId];
            if (!track) return;
            
            // Mark this pattern as being actively edited
            this.activelyEditingPattern[trackId] = true;
            
            const steps = [...(track.triggerSettings?.steps || [])];
            const stepIndex = steps.indexOf(step);
            
            if (stepIndex >= 0) {
                steps.splice(stepIndex, 1);
            } else {
                steps.push(step);
                steps.sort((a, b) => a - b);
            }
            
            const triggerSettings = { ...track.triggerSettings, steps };
            const settings = { triggerSettings };
            
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Update local state and UI immediately
            track.triggerSettings = triggerSettings;
            
            // Update the button state immediately
            const controlsElement = document.getElementById(`pattern-controls-${trackId}`);
            if (controlsElement) {
                const stepButton = controlsElement.querySelector(`.step-button:nth-child(${step + 1})`);
                if (stepButton) {
                    const isActive = steps.includes(step);
                    stepButton.className = `step-button ${isActive ? 'active' : ''}`;
                }
            }
            
            // Update visualization
            this.updatePatternVisualization(trackId, track.triggerType, triggerSettings);
            
            // Clear the editing flag after a short delay
            setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 500);
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