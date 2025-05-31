# Track System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Track Settings](#track-settings)
3. [Pattern Generation System](#pattern-generation-system)
4. [Note Generation Pipeline](#note-generation-pipeline)
5. [Timing and Rhythmic Processing](#timing-and-rhythmic-processing)
6. [Musical Intelligence](#musical-intelligence)

## Overview

This documentation describes how a single track in the Sequencer of My Dreams generates musical output. Each track is an independent note generator that processes rhythmic patterns through multiple layers to determine exactly which notes to play and when to play them.

### Core Processing Pipeline
1. **Pattern Generation**: Creates rhythmic trigger points based on algorithmic patterns
2. **Timing Calculation**: Converts pattern steps to precise timing with swing and groove
3. **Note Series Selection**: Determines which musical content to use
4. **Scale Conforming**: Applies harmonic rules based on current progression
5. **Arpeggio Generation**: Creates melodic sequences from chord tones
6. **Final Output**: Produces MIDI note events with precise timing and velocity

## Track Settings

A track's behavior is controlled by a comprehensive settings object that defines every aspect of its musical output. Here are the complete settings with their ranges and effects:

### Core Track Settings

```javascript
{
    // Basic Properties
    channel: 1,                    // MIDI channel (1-16)
    isActive: true,                // Track enabled/disabled state
    volume: 100,                   // Master volume (0-200)
    
    // Pattern Generation
    triggerType: 0,                // Pattern algorithm (0=INIT, 1=BINARY, 2=EUCLIDEAN, 3=STEP)
    triggerSettings: {
        numbers: [8],              // Binary pattern numbers (0-15 each)
        length: 16,                // Euclidean pattern length (1-100)
        hits: 4,                   // Euclidean pattern hits (0-length)
        shift: 0,                  // Euclidean pattern rotation (0-length)
        steps: []                  // Step pattern positions (0-15 each)
    },
    
    // Timing Control
    speedMultiplier: 1,            // Playback speed relative to global tempo
    resyncInterval: 0,             // Pattern length override (0=use natural length)
    swingAmount: 0,                // Track-specific swing (-50 to +50)
    probability: 100,              // Note trigger probability (0-100)
    
    // Musical Content
    noteSeries: [{               // Array of note generation rules
        rootNote: 60,              // Base MIDI note (0-127)
        numberOfNotes: 1,          // How many notes in chord/arpeggio (1-8)
        inversion: 0,              // Chord inversion (-5 to +5)
        velocity: 100,             // Note velocity (1-127)
        pitchSpan: 0,              // Pitch spread (-24 to +24 semitones)
        velocitySpan: 0,           // Velocity randomization (0-127)
        spread: 0,                 // Note timing spread
        probability: 100,          // Individual note probability (0-100)
        arpMode: 0,                // Arpeggio mode (0=USE_TRACK, 1=OFF, 2=UP, 3=DOWN, etc.)
        playMultiplier: 1,         // Arpeggio speed multiplier
        wonkyArp: false,           // Irregular arpeggio timing
        maxDurationFactor: 1,      // Maximum note length multiplier
        useMaxDuration: false,     // Use max duration override
        // Probability counters for complex patterns
        aValue: 1,                 // Note series probability numerator
        bValue: 1,                 // Note series probability denominator  
        aValueIndividualNote: 1,   // Individual note probability numerator
        bValueIndividualNote: 1    // Individual note probability denominator
    }],
    
    // Musical Behavior
    conformNotes: true,            // Conform to current scale/progression
    arpMode: 0,                    // Global arpeggio mode 
    wonkyArp: false,               // Global irregular arpeggio timing
    playMultiplier: 1,             // Global arpeggio speed
    useMaxDuration: false,         // Global max duration override
    maxDurationFactor: 1,          // Global max duration multiplier
    playOrder: 0,                  // Note selection order (0=FORWARD, 1=BACKWARD, 2=RANDOM, 3=RANDOM_ADJACENT)
    tieNoteSeriestoPattern: false, // Link note series progression to pattern steps
    
    // Micro-timing (Groove)
    groove: [],                    // Array of timing/velocity micro-adjustments
    grooveName: 'Steady'           // Groove preset name
}
```

### Pattern Types Explained

#### INIT (triggerType: 0)
Empty pattern initialization - no triggers by default.

#### BINARY (triggerType: 1) 
Patterns created from arrays of numbers (0-15), each converted to 4-bit binary:
- `numbers: [8]` → binary `1000` → pattern `[1,0,0,0]`
- `numbers: [15, 0]` → binary `1111 0000` → pattern `[1,1,1,1,0,0,0,0]`

#### EUCLIDEAN (triggerType: 2)
Mathematically distributed patterns:
- `length: 16, hits: 4` → evenly distributes 4 beats across 16 steps
- `shift: 2` → rotates the pattern by 2 steps

#### STEP (triggerType: 3)
Manual step specification:
- `steps: [0, 4, 8, 12]` → triggers on steps 0, 4, 8, and 12

### Groove System

Groove provides micro-timing adjustments:
```javascript
groove: [
    { timeOffset: 10, velocityOffset: 5 },    // Step 1: slightly late, slightly louder
    { timeOffset: -5, velocityOffset: -2 },   // Step 2: slightly early, slightly softer
    // ... one entry per groove subdivision
]
```

## Sequencer Integration

### Sequencer Architecture

The Sequencer class orchestrates multiple tracks and provides global timing:

```javascript
class Sequencer {
    constructor(bpm = 120, ppq = 96, realTimeKeeper) {
        this.settings = {
            bpm: 120,                    // Beats per minute
            ppq: 96,                     // Pulses per quarter note
            timeSignature: [4, 4],       // Time signature
            swing: 0,                    // Global swing amount
            progressions: [],            // Chord progressions
            currentProgressionIndex: 0,  // Active progression
            activeStates: Array(16).fill().map(() => Array(16).fill(true)),
            currentActiveState: 0        // Current active state
        };
        this.tracks = [];               // Array of Track instances
        // ... other components
    }
}
```

### Global Timing System

#### Ticker Component
The Ticker provides precise timing callbacks:
- **Bar callbacks**: Triggered at the start of each bar
- **Beat callbacks**: Triggered on each beat
- **Pulse callbacks**: High-resolution timing for smooth playback

#### Time Signatures and Swing
- Support for various time signatures (4/4, 3/4, 7/8, etc.)
- Global swing applied to all tracks
- Per-track swing overrides possible

### Track Synchronization

#### Active States
The sequencer maintains 16 different "active states", each defining which tracks are active:
```javascript
activeStates: [
    [true, true, false, true, ...],  // State 0: tracks 0,1,3 active
    [false, true, true, false, ...], // State 1: tracks 1,2 active
    // ... 14 more states
]
```

#### State Switching
- Manual switching via UI or MIDI controllers
- Automatic switching in song mode
- Smooth transitions without audio glitches

## Song Mode and Progressions

### Progression System

#### Chord Progressions
Progressions define the harmonic content for tracks:
```javascript
progressions: [
    [ // Progression 0
        {
            scale: 0,        // Scale index (Major, Minor, Dorian, etc.)
            key: 0,          // Root key (C, C#, D, etc.)
            transposition: 0, // Additional transposition
            bars: 2,         // Duration in bars
            beats: 0         // Additional beats
        },
        {
            scale: 0,
            key: 5,          // F major
            transposition: 0,
            bars: 2,
            beats: 0
        }
        // ... more steps
    ]
    // ... more progressions
]
```

#### Scales and Keys
Available scales (from `src/data/scales.json`):
- Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Locrian
- Harmonic Minor, Melodic Minor
- Pentatonic Major/Minor
- Blues scales
- Whole tone, Chromatic
- Various ethnic and modal scales

Keys are specified as MIDI note numbers:
- 0: C, 1: C#, 2: D, 3: D#, 4: E, 5: F, 6: F#, 7: G, 8: G#, 9: A, 10: A#, 11: B

### Song Mode Structure

#### Song Parts
Songs consist of multiple parts, each with:
```javascript
song: {
    active: true,
    parts: [
        {
            progression: 0,    // Which progression to use
            activeState: 0,    // Which tracks are active
            bars: 8           // Duration in bars
        },
        {
            progression: 1,
            activeState: 2,
            bars: 4
        }
        // ... more parts
    ]
}
```

#### Automatic Progression
- Song parts play in sequence
- Automatic progression and active state changes
- Seamless looping when song ends
- Real-time editing while playing

### Progression Calculation

The sequencer calculates progression steps for both song mode and regular mode:

#### Regular Mode
Steps through the current progression continuously:
```javascript
calculateProgressionSteps() {
    const progression = this.settings.progressions[this.settings.currentProgressionIndex];
    let totalBeats = 0;
    
    progression.forEach((step, stepIndex) => {
        const stepDuration = (step.bars * beatsPerBar) + step.beats;
        totalBeats += stepDuration;
        this.regularProgressionSteps.push({
            progressionIndex: this.settings.currentProgressionIndex,
            stepIndex,
            startBeat: totalBeats - stepDuration,
            endBeat: totalBeats,
            scale: step.scale,
            transposition: step.transposition,
            key: step.key
        });
    });
}
```

#### Song Mode
Calculates steps across all song parts:
- Each part uses its specified progression
- Transitions happen at part boundaries
- Total song length calculated for looping

## Track Pattern System

### Pattern Generation Pipeline

#### 1. Pattern Creation (TrackPlan)
The TrackPlan class generates the basic rhythm pattern:

```javascript
class TrackPlan {
    constructor(track) {
        this.track = track;
        this.plan = [];
    }
    
    generatePlan() {
        switch(this.track.settings.patternType) {
            case 'stepPattern':
                return this.generateStepPattern();
            case 'euclideanPattern':
                return this.generateEuclideanPattern();
            case 'binaryPattern':
                return this.generateBinaryPattern();
            case 'triggerPattern':
                return this.generateTriggerPattern();
        }
    }
}
```

#### 2. Timing Calculation
Converts pattern steps to actual timing:
- Considers pattern length and time signature
- Applies swing and humanization
- Calculates polyrhythmic relationships

#### 3. Note Generation (TrackNotes)
The TrackNotes class converts trigger points to MIDI notes:

```javascript
class TrackNotes {
    generateNotes(plan, currentProgression) {
        const notes = [];
        plan.forEach((trigger, stepIndex) => {
            if (trigger) {
                const note = this.generateNoteForStep(stepIndex, currentProgression);
                notes.push(note);
            }
        });
        return notes;
    }
}
```

### Advanced Pattern Features

#### Euclidean Rhythm Generation
Mathematical distribution of beats across steps:
```javascript
generateEuclideanPattern(steps, beats, offset = 0) {
    const pattern = new Array(steps).fill(0);
    const interval = steps / beats;
    
    for (let i = 0; i < beats; i++) {
        const index = Math.round(i * interval + offset) % steps;
        pattern[index] = 1;
    }
    
    return pattern;
}
```

#### Pattern Transformations
- **Reverse**: Play pattern backwards
- **Rotate**: Shift pattern start point
- **Invert**: Flip 0s and 1s
- **Stretch**: Change pattern length
- **Probability**: Random note triggering

#### Polyrhythmic Patterns
Tracks can run at different speeds:
- Multiplier affects pattern playback rate
- Independent of global sequencer timing
- Creates complex polyrhythmic relationships

## Note Generation and Playback

### Musical Intelligence

#### Scale-Aware Generation
Notes are generated based on current chord progression:
```javascript
generateNoteForStep(stepIndex, progression) {
    const currentStep = this.getCurrentProgressionStep(progression);
    const scale = SCALES[currentStep.scale];
    const rootNote = currentStep.key + currentStep.transposition;
    
    // Generate scale notes
    const scaleNotes = this.generateScaleNotes(scale, rootNote);
    
    // Apply play order and arpeggio mode
    const selectedNote = this.selectNote(scaleNotes, stepIndex);
    
    return {
        note: selectedNote,
        velocity: this.track.settings.velocity,
        duration: this.track.settings.noteLength,
        channel: this.track.settings.channel
    };
}
```

#### Intelligent Note Selection
- Considers previous notes to avoid repetition
- Respects note range constraints
- Applies musical voice leading principles
- Supports chord inversions and voicings

#### Arpeggio Algorithms
Different arpeggio modes provide musical variety:
- **UP**: C-E-G-C progression
- **DOWN**: C-G-E-C progression  
- **UPDOWN**: C-E-G-E-C pingpong
- **RANDOM**: Randomly selected chord tones
- **CHORD**: All notes simultaneously

### Note Timing and Humanization

#### Precise Timing
- High-resolution timing using Ticker system
- Swing applied at note level
- Supports complex time signatures

#### Humanization Features
- Slight timing variations
- Velocity variations
- Note length variations
- Probability-based triggering

#### Note Length Control
```javascript
{
    noteLength: 0.5,  // 0.1 to 4.0 (quarter note = 1.0)
    legato: false,    // Connect notes smoothly
    staccato: false   // Short, detached notes
}
```

## MIDI Output and Communication

### MIDI System Architecture

#### MidiCommunicator Class
Central MIDI management:
```javascript
class MidiCommunicator {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.outputDevices = new Map();
        this.inputDevices = new Map();
        this.activeNotes = new Map(); // Track playing notes
    }
}
```

#### Device Management
- Automatic MIDI device detection
- Per-track device assignment
- Real-time device switching
- Device-specific settings storage

### MIDI Output Features

#### Note Events
```javascript
{
    type: 'noteOn',
    channel: 1,        // MIDI channel (1-16)
    note: 60,          // MIDI note number (0-127)
    velocity: 100,     // Velocity (0-127)
    timestamp: 1234567 // Precise timing
}
```

#### Control Change Support
- Volume (CC 7)
- Pan (CC 10)  
- Expression (CC 11)
- Sustain pedal (CC 64)
- Custom CC mappings per track

#### Program Changes
- Instrument selection per track
- Bank select support
- Real-time program changes

### MIDI Input Integration

#### Real-time Control
MIDI controllers can control:
- Track muting/unmuting
- Active state switching
- Parameter automation
- Pattern triggering
- Transport control (play/stop)

#### Note Input
- Live note recording
- Real-time pattern override
- Chord detection and progression
- Scale constraint enforcement

## Real-time Control and UI

### User Interface System

#### Terminal UI (`src/ui/terminalUI.js`)
Text-based interface for all parameters:
- Track parameter editing
- Pattern visualization
- Real-time monitoring
- Performance controls

#### MIDI Controller UI (`src/device/midiControllerUI.js`)
Hardware controller integration:
- Knob and fader mapping
- Button assignments
- LED feedback
- Device-specific layouts

### Track Control Interface

#### UITrack Class (`src/ui/uiTrack.js`)
Provides comprehensive track control:
```javascript
class UITrack {
    constructor(track, ui) {
        this.track = track;
        this.ui = ui;
        this.setupControls();
    }
    
    setupControls() {
        // Volume, pan, mute controls
        // Pattern editing interface
        // Note range selectors
        // Arpeggio mode selection
        // Real-time parameter adjustment
    }
}
```

#### Real-time Parameter Changes
All track parameters can be modified during playback:
- Immediate effect (no audio glitches)
- Smooth parameter interpolation
- Undo/redo support
- Parameter automation recording

### Performance Features

#### Live Jamming
- Quick pattern switching
- Real-time muting/unmuting
- Active state performance
- Parameter morphing

#### Pattern Editing
- Visual pattern editors
- Step-by-step editing
- Copy/paste between tracks
- Pattern generation algorithms

#### Session Management
- Save/load complete sessions
- Template systems
- Auto-save functionality
- Version history

## Implementation Guidelines for Web Version

### Architecture Recommendations

#### Frontend Framework
Recommended stack for web implementation:
- **React/Vue.js**: Component-based UI
- **Web Audio API**: Audio processing
- **WebMIDI API**: MIDI device communication
- **Web Workers**: Background processing
- **TypeScript**: Type safety for complex algorithms

#### Core Components to Implement

##### 1. Timing Engine
```javascript
class WebTicker {
    constructor(bpm, timeSignature) {
        this.audioContext = new AudioContext();
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.scheduleAheadTime = 25.0; // 25ms lookahead
        this.nextNoteTime = 0.0;
    }
    
    start() {
        this.audioContext.resume();
        this.scheduler();
    }
    
    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote();
            this.nextNoteTime += this.noteDuration;
        }
        requestAnimationFrame(() => this.scheduler());
    }
}
```

##### 2. Track Management
```javascript
class WebTrack {
    constructor(settings, sequencer) {
        this.settings = settings;
        this.sequencer = sequencer;
        this.audioNode = null;
        this.midiOutput = null;
        this.pattern = new PatternGenerator(settings);
        this.noteGenerator = new NoteGenerator(settings);
    }
    
    async initialize() {
        await this.setupAudio();
        await this.setupMIDI();
        this.generatePattern();
    }
}
```

##### 3. MIDI Integration
```javascript
class WebMIDI {
    constructor() {
        this.inputs = new Map();
        this.outputs = new Map();
    }
    
    async initialize() {
        if (!navigator.requestMIDIAccess) {
            throw new Error('WebMIDI not supported');
        }
        
        const midiAccess = await navigator.requestMIDIAccess();
        this.setupDevices(midiAccess);
    }
    
    sendNoteOn(channel, note, velocity, timestamp) {
        const output = this.getActiveOutput();
        if (output) {
            output.send([0x90 + channel - 1, note, velocity], timestamp);
        }
    }
}
```

### Audio Implementation

#### Web Audio API Integration
```javascript
class AudioEngine {
    constructor() {
        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.tracks = [];
    }
    
    createTrackAudio(trackSettings) {
        const trackGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const delay = this.audioContext.createDelay();
        
        // Connect audio graph
        trackGain.connect(filter);
        filter.connect(delay);
        delay.connect(this.masterGain);
        
        return {
            gain: trackGain,
            filter: filter,
            delay: delay
        };
    }
}
```

#### Sample Playback
```javascript
class SamplePlayer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.samples = new Map();
    }
    
    async loadSample(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.samples.set(name, audioBuffer);
    }
    
    playSample(name, time, velocity = 1.0) {
        const buffer = this.samples.get(name);
        if (!buffer) return;
        
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        
        source.buffer = buffer;
        gain.gain.value = velocity;
        
        source.connect(gain);
        gain.connect(this.audioContext.destination);
        
        source.start(time);
    }
}
```

### UI Implementation

#### React Component Structure
```jsx
// Main sequencer component
function Sequencer() {
    const [tracks, setTracks] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBar, setCurrentBar] = useState(0);
    
    return (
        <div className="sequencer">
            <TransportControls 
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
            />
            <TrackGrid 
                tracks={tracks}
                onTrackUpdate={handleTrackUpdate}
            />
            <ProgressionEditor 
                progressions={progressions}
                onProgressionChange={handleProgressionChange}
            />
        </div>
    );
}

// Individual track component
function Track({ trackData, onUpdate }) {
    return (
        <div className="track">
            <TrackHeader 
                name={trackData.name}
                muted={trackData.muted}
                active={trackData.active}
            />
            <PatternEditor 
                pattern={trackData.pattern}
                onPatternChange={handlePatternChange}
            />
            <TrackControls 
                settings={trackData.settings}
                onSettingsChange={handleSettingsChange}
            />
        </div>
    );
}
```

#### Pattern Visualization
```jsx
function PatternEditor({ pattern, onPatternChange }) {
    const [selectedSteps, setSelectedSteps] = useState([]);
    
    return (
        <div className="pattern-editor">
            {pattern.map((step, index) => (
                <StepButton
                    key={index}
                    active={step === 1}
                    selected={selectedSteps.includes(index)}
                    onClick={() => handleStepClick(index)}
                />
            ))}
        </div>
    );
}
```

### State Management

#### Redux/Zustand Store Structure
```javascript
const useSequencerStore = create((set, get) => ({
    // Global state
    bpm: 120,
    isPlaying: false,
    currentBar: 0,
    timeSignature: [4, 4],
    
    // Track state
    tracks: [],
    activeStates: Array(16).fill().map(() => Array(16).fill(true)),
    currentActiveState: 0,
    
    // Progression state
    progressions: [],
    currentProgressionIndex: 0,
    
    // Song mode state
    song: {
        active: false,
        parts: []
    },
    
    // Actions
    updateTrack: (trackId, updates) => set((state) => ({
        tracks: state.tracks.map((track, index) => 
            index === trackId ? { ...track, ...updates } : track
        )
    })),
    
    togglePlay: () => set((state) => ({
        isPlaying: !state.isPlaying
    })),
    
    setBPM: (bpm) => set({ bpm }),
    
    updateProgression: (index, progression) => set((state) => ({
        progressions: state.progressions.map((prog, i) => 
            i === index ? progression : prog
        )
    }))
}));
```

### Performance Considerations

#### Optimization Strategies

##### 1. Audio Processing
- Use Web Workers for intensive calculations
- Implement audio worklets for low-latency processing
- Pre-calculate patterns when possible
- Use object pooling for note events

##### 2. UI Performance
- Virtual scrolling for large pattern grids
- Debounced parameter updates
- Memoized components for static elements
- Canvas-based visualization for complex patterns

##### 3. Memory Management
- Efficient audio buffer management
- Pattern caching and reuse
- Cleanup of scheduled events
- Proper event listener removal

#### Browser Compatibility
- Feature detection for Web Audio/MIDI APIs
- Polyfills for older browsers
- Graceful degradation for missing features
- Mobile-specific optimizations

### Testing Strategy

#### Unit Tests
```javascript
describe('TrackPlan', () => {
    test('generates correct euclidean pattern', () => {
        const track = new Track({
            patternType: 'euclideanPattern',
            euclideanSteps: 16,
            euclideanBeats: 4
        });
        
        const plan = track.trackPlan.generatePlan();
        const beatCount = plan.filter(step => step === 1).length;
        
        expect(beatCount).toBe(4);
        expect(plan.length).toBe(16);
    });
});
```

#### Integration Tests
```javascript
describe('Sequencer Integration', () => {
    test('tracks sync with global timing', async () => {
        const sequencer = new Sequencer();
        const track = sequencer.addTrack({
            patternType: 'stepPattern',
            stepPattern: [1, 0, 1, 0]
        });
        
        sequencer.start();
        
        // Test that notes are triggered at correct times
        await waitForNextBar();
        expect(track.getTriggeredNotes()).toHaveLength(2);
    });
});
```

#### Performance Tests
```javascript
describe('Performance', () => {
    test('maintains stable timing with 16 tracks', () => {
        const sequencer = new Sequencer();
        
        // Add 16 complex tracks
        for (let i = 0; i < 16; i++) {
            sequencer.addTrack(getComplexTrackSettings());
        }
        
        const timingAccuracy = measureTimingAccuracy(sequencer, 1000);
        expect(timingAccuracy).toBeGreaterThan(0.99); // 99% accuracy
    });
});
```

### Deployment Considerations

#### Build Process
- Bundle optimization for audio assets
- Service worker for offline functionality
- Progressive web app capabilities
- Code splitting for large applications

#### Browser Requirements
- Modern browsers with Web Audio API support
- MIDI access permissions
- High-resolution timer support
- Audio context resumption handling

#### Security Considerations
- MIDI device access permissions
- Audio recording permissions (if applicable)
- Content Security Policy for audio assets
- Cross-origin resource sharing for samples

This documentation provides a comprehensive foundation for implementing a web version of the Sequencer of My Dreams track system. The modular architecture and well-defined interfaces make it suitable for progressive implementation, starting with core functionality and adding advanced features incrementally.
