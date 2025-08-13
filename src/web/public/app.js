class SequencerWebClient {
    constructor() {
        this.socket = io();
        this.state = window.reactiveState;
        
        // Track selection state
        this.selectedTrackId = null;
        this.activelyEditingPattern = {};
        
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
            this.state.batch({
                bpm: state.bpm,
                isPlaying: state.isPlaying,
                activeState: state.activeState,
                activeStates: state.activeStates,
                timeSignature: state.timeSignature,
                swing: state.swing,
                tracks: state.tracks
            });
        });
        
        this.socket.on('bpmChanged', (data) => {
            console.log('BPM changed:', data.bpm);
            this.state.set('bpm', data.bpm);
        });
        
        this.socket.on('playStateChanged', (data) => {
            console.log('Play state changed:', data.isPlaying);
            this.state.set('isPlaying', data.isPlaying);
        });
        
        this.socket.on('activeStateChanged', (data) => {
            console.log('Active state changed:', data.activeState);
            this.state.set('activeState', data.activeState);
        });
        
        this.socket.on('trackUpdated', (data) => {
            console.log('Track updated:', data);
            
            // Skip reactive state updates if this track is being actively edited
            if (this.activelyEditingPattern[data.trackId]) {
                console.log(`Skipping trackUpdated for track ${data.trackId} - actively editing`);
                return;
            }
            
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
            
            this.state.updateTrack(data.trackId, trackData);
        });
        
        this.socket.on('activeStatesUpdated', (data) => {
            console.log('Active states updated:', data);
            this.state.set('activeStates', data.activeStates);
            
            // Show visual feedback for the updated active state
            this.flashActiveStateButton(data.activeStateIndex);
            console.log(`Active state ${data.activeStateIndex} updated with current track states`);
        });
        
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
        });
    }
    
    setupStateSubscriptions() {
        // Subscribe to global state changes
        this.state.subscribe('bpm', (bpm) => this.updateBPMDisplay());
        this.state.subscribe('isPlaying', (isPlaying) => this.updatePlayStateDisplay());
        this.state.subscribe('activeState', (activeState) => this.updateActiveStateDisplay());
        this.state.subscribe('timeSignature', (timeSignature) => this.updateTimeSignatureDisplay());
        this.state.subscribe('tracks', () => this.updateTracksOverview());
        
        // Subscribe to individual track changes
        for (let i = 0; i < 16; i++) {
            this.state.subscribe(`tracks.${i}`, (trackData) => {
                this.updateTrackOverview(i);
                
                // If this is the selected track, update the editor
                if (this.selectedTrackId === i) {
                    this.updateTrackEditor();
                }
            });
        }
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
            this.createTrackOverview(trackId);
            const newElement = document.getElementById(`track-overview-${trackId}`);
            existingElement.parentNode.replaceChild(newElement, existingElement);
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
        
        this.elements.trackEditor.innerHTML = `
            <div class="track-editor-content active">
                <div class="track-editor-header">
                    <div class="track-editor-title">Track ${trackId + 1} Editor</div>
                    <button class="mute-button ${track.isActive ? '' : 'muted'}" 
                            onclick="sequencerClient.toggleTrackMute(${trackId})">
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
                                       onchange="sequencerClient.updateTrackSetting(${trackId}, 'channel', parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Velocity</label>
                                <input type="number" min="1" max="127" value="${track.velocity}" 
                                       onchange="sequencerClient.updateTrackVelocity(${trackId}, parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Volume</label>
                                <input type="number" min="0" max="200" value="${track.volume}" 
                                       onchange="sequencerClient.updateTrackSetting(${trackId}, 'volume', parseInt(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Speed Multiplier</label>
                                <input type="number" min="0.25" max="4" step="0.25" value="${track.speedMultiplier}" 
                                       onchange="sequencerClient.updateTrackSetting(${trackId}, 'speedMultiplier', parseFloat(this.value))">
                            </div>
                            <div class="setting-group">
                                <label>Probability (%)</label>
                                <input type="number" min="0" max="100" value="${track.probability || 100}" 
                                       onchange="sequencerClient.updateTrackSetting(${trackId}, 'probability', parseInt(this.value))">
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
        const track = this.state.getTrack(trackId);
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
            const track = this.state.getTrack(trackId);
            const settings = { 
                noteSeries: [{ 
                    ...(track.noteSeries?.[0] || {}),
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
            const currentTrack = this.state.getTrack(trackId);
            const currentSettings = currentTrack.triggerSettings || {};
            
            // Only use defaults for completely new pattern types, preserve existing values where possible
            let newSettings;
            if (patternType === currentTrack.triggerType) {
                // Same pattern type, keep all current settings
                newSettings = currentSettings;
            } else {
                // Different pattern type, migrate compatible settings and add defaults for missing ones
                newSettings = this.migratePatternSettings(currentSettings, patternType);
            }
            
            const settings = { 
                triggerType: patternType,
                triggerSettings: newSettings
            };
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Update the editor immediately if this is the selected track
            if (this.selectedTrackId === trackId) {
                const tempTrack = {
                    ...currentTrack,
                    triggerType: patternType,
                    triggerSettings: newSettings
                };
                this.updateTrackPatternControls(trackId, tempTrack);
            }
        }
    }
    
    migratePatternSettings(currentSettings, newPatternType) {
        // Preserve compatible settings and add defaults for missing ones
        const defaults = this.getDefaultPatternSettings(newPatternType);
        
        // Start with defaults and overlay existing compatible settings
        const newSettings = { ...defaults };
        
        // Preserve length if it exists (compatible across Binary and Euclidean)
        if (currentSettings.length && (newPatternType === 1 || newPatternType === 2)) {
            newSettings.length = currentSettings.length;
        }
        
        // Preserve steps array for Init and Step patterns
        if (currentSettings.steps && (newPatternType === 0 || newPatternType === 3)) {
            newSettings.steps = currentSettings.steps;
        }
        
        return newSettings;
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
            // Only update existing controls if not actively editing to prevent value resets
            if (!this.activelyEditingPattern[trackId]) {
                this.updateExistingPatternControls(controlsElement, trackId, triggerType, triggerSettings);
            }
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
            const track = this.state.getTrack(trackId);
            if (!track) return;
            
            // Mark this pattern as being actively edited
            this.activelyEditingPattern[trackId] = true;
            
            const triggerSettings = { ...track.triggerSettings, [setting]: value };
            const settings = { triggerSettings };
            
            this.socket.emit('updateTrackSettings', { trackId, settings });
            
            // Don't update reactive state during active editing - just update visualization
            this.updatePatternVisualization(trackId, track.triggerType, triggerSettings);
            
            // Clear the editing flag after a longer delay to allow for multiple rapid changes
            clearTimeout(this.activelyEditingPattern[trackId + '_timeout']);
            this.activelyEditingPattern[trackId + '_timeout'] = setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 1000);
        }
    }
    
    updateBinaryNumber(trackId, index, value) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.getTrack(trackId);
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
            
            // Don't update reactive state during active editing - just update visualization
            this.updatePatternVisualization(trackId, track.triggerType, triggerSettings);
            
            // Clear the editing flag after a longer delay to allow for multiple rapid changes
            clearTimeout(this.activelyEditingPattern[trackId + '_timeout']);
            this.activelyEditingPattern[trackId + '_timeout'] = setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 1000);
        }
    }
    
    toggleStepButton(trackId, step) {
        if (trackId >= 0 && trackId < 16) {
            const track = this.state.getTrack(trackId);
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
            
            // Update the button state immediately (don't use reactive state during editing)
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
            
            // Clear the editing flag after a longer delay to allow for multiple rapid changes
            clearTimeout(this.activelyEditingPattern[trackId + '_timeout']);
            this.activelyEditingPattern[trackId + '_timeout'] = setTimeout(() => {
                this.activelyEditingPattern[trackId] = false;
            }, 1000);
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