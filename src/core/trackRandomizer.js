const { TRIGGER_TYPES } = require('../patterns/triggerPatterns');

class TrackRandomizer {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.styleDefinitions = this.initializeStyleDefinitions();
    }

    initializeStyleDefinitions() {
        return {
            house: {
                name: "House",
                bpm: { min: 120, max: 130 },
                swing: { min: 3, max: 8 },
                scale: [0], // Major
                chordProgressions: [
                    [0, 9, 5, 7], // I-vi-IV-V
                    [0, 7, 9, 5], // I-V-vi-IV
                    [0, 5, 9, 7]  // I-IV-vi-V
                ],
                trackTypes: {
                    bass: {
                        tracks: [0],
                        rootNote: { min: 36, max: 48 },
                        numberOfNotes: 1,
                        velocity: { min: 100, max: 120 },
                        patterns: { euclidean: { hits: [4, 5, 6], length: [16] } },
                        speedMultiplier: [1],
                        conformNotes: true,
                        maxDurationFactor: { min: 0.8, max: 1.0 }
                    },
                    chords: {
                        tracks: [1],
                        rootNote: { min: 60, max: 72 },
                        numberOfNotes: [3, 4],
                        velocity: { min: 70, max: 90 },
                        patterns: { euclidean: { hits: [6, 7, 8], length: [16] } },
                        speedMultiplier: [0.5, 1],
                        conformNotes: true,
                        pitchSpan: { min: 8, max: 15 },
                        spread: [2, 3],
                        maxDurationFactor: { min: 1.2, max: 2.0 }
                    },
                    lead: {
                        tracks: [2],
                        rootNote: { min: 72, max: 84 },
                        numberOfNotes: [1, 2, 3],
                        velocity: { min: 75, max: 95 },
                        patterns: { euclidean: { hits: [5, 6, 7, 8], length: [16] } },
                        speedMultiplier: [1, 2],
                        conformNotes: true,
                        pitchSpan: { min: 5, max: 12 },
                        arpMode: [0, 1, 2],
                        maxDurationFactor: { min: 0.6, max: 1.0 }
                    },
                    perc: {
                        tracks: [3],
                        rootNote: { min: 84, max: 96 },
                        numberOfNotes: 1,
                        velocity: { min: 70, max: 100 },
                        patterns: { euclidean: { hits: [3, 4, 5], length: [16] } },
                        speedMultiplier: [2, 4],
                        conformNotes: true,
                        probability: { min: 60, max: 90 },
                        maxDurationFactor: { min: 0.2, max: 0.5 }
                    },
                    kick: {
                        tracks: [10],
                        rootNote: [36],
                        patterns: { init: { numbers: [8] } },
                        velocity: { min: 115, max: 127 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.1, max: 0.15 }
                    },
                    hihat: {
                        tracks: [11],
                        rootNote: [42],
                        patterns: { euclidean: { hits: [6, 8, 10], length: [16] } },
                        velocity: { min: 80, max: 105 },
                        conformNotes: false,
                        swingAmount: { min: 3, max: 8 },
                        maxDurationFactor: { min: 0.05, max: 0.1 }
                    },
                    snare: {
                        tracks: [12],
                        rootNote: [38],
                        patterns: { binary: { numbers: [[0, 8]] } },
                        velocity: { min: 100, max: 115 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.1, max: 0.15 }
                    }
                }
            },
            techno: {
                name: "Techno",
                bpm: { min: 128, max: 136 },
                swing: { min: 0, max: 3 },
                scale: [1], // Minor
                chordProgressions: [
                    [0, 7, 3, 10], // i-VII-iv-bVII
                    [0, 3, 7, 0],  // i-iv-VII-i
                    [0, 10, 7, 3]  // i-bVII-VII-iv
                ],
                trackTypes: {
                    bass: {
                        tracks: [0, 1],
                        rootNote: { min: 36, max: 60 },
                        numberOfNotes: [1, 2],
                        velocity: { min: 90, max: 110 },
                        patterns: { euclidean: { hits: [8, 11, 13], length: [16] } },
                        speedMultiplier: [1, 2],
                        conformNotes: true,
                        maxDurationFactor: { min: 0.8, max: 1.5 }
                    },
                    lead: {
                        tracks: [2],
                        rootNote: { min: 60, max: 84 },
                        numberOfNotes: [2, 3],
                        velocity: { min: 70, max: 90 },
                        patterns: { euclidean: { hits: [9, 11, 13], length: [16] } },
                        speedMultiplier: [2, 4],
                        conformNotes: true,
                        arpMode: [2, 3],
                        pitchSpan: { min: 5, max: 10 },
                        maxDurationFactor: { min: 0.7, max: 1.2 }
                    },
                    perc: {
                        tracks: [3],
                        rootNote: { min: 72, max: 96 },
                        numberOfNotes: 1,
                        velocity: { min: 60, max: 85 },
                        patterns: { euclidean: { hits: [5, 7, 9], length: [16] } },
                        speedMultiplier: [4, 8],
                        conformNotes: true,
                        probability: { min: 50, max: 80 },
                        maxDurationFactor: { min: 0.1, max: 0.3 }
                    },
                    kick: {
                        tracks: [10],
                        rootNote: [36],
                        patterns: { init: { numbers: [8] } },
                        velocity: { min: 120, max: 127 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    },
                    hihat: {
                        tracks: [11],
                        rootNote: [42],
                        patterns: { euclidean: { hits: [10, 12, 14], length: [16] } },
                        velocity: { min: 85, max: 110 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.05, max: 0.1 }
                    },
                    snare: {
                        tracks: [12],
                        rootNote: [38],
                        patterns: { binary: { numbers: [[0, 8]] } },
                        velocity: { min: 105, max: 120 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    }
                }
            },
            hiphop: {
                name: "Hip-Hop",
                bpm: { min: 85, max: 95 },
                swing: { min: 12, max: 20 },
                scale: [1, 2], // Minor, Dorian
                chordProgressions: [
                    [0, 5, 3, 7], // i-IV-ii-V
                    [0, 7, 0, 5], // i-V-i-IV
                    [0, 3, 7, 0]  // i-ii-V-i
                ],
                trackTypes: {
                    bass: {
                        tracks: [0],
                        rootNote: { min: 36, max: 48 },
                        numberOfNotes: 1,
                        velocity: { min: 100, max: 120 },
                        patterns: { euclidean: { hits: [5, 7], length: [16] } },
                        speedMultiplier: [1],
                        conformNotes: true,
                        maxDurationFactor: { min: 0.9, max: 1.2 }
                    },
                    chords: {
                        tracks: [1],
                        rootNote: { min: 60, max: 72 },
                        numberOfNotes: [3, 4],
                        velocity: { min: 70, max: 90 },
                        patterns: { euclidean: { hits: [4, 5, 6], length: [16] } },
                        speedMultiplier: [0.5],
                        conformNotes: true,
                        pitchSpan: { min: 10, max: 18 },
                        spread: [3, 4],
                        swingAmount: { min: 15, max: 25 },
                        maxDurationFactor: { min: 1.5, max: 2.5 }
                    },
                    lead: {
                        tracks: [2],
                        rootNote: { min: 72, max: 84 },
                        numberOfNotes: [1, 2],
                        velocity: { min: 65, max: 85 },
                        patterns: { euclidean: { hits: [4, 6, 8], length: [16] } },
                        speedMultiplier: [1, 2],
                        conformNotes: true,
                        probability: { min: 70, max: 90 },
                        swingAmount: { min: 20, max: 35 },
                        maxDurationFactor: { min: 0.6, max: 1.0 }
                    },
                    kick: {
                        tracks: [10],
                        rootNote: [36],
                        patterns: { binary: { numbers: [[0]] } },
                        velocity: { min: 115, max: 127 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    },
                    hihat: {
                        tracks: [11],
                        rootNote: [42],
                        patterns: { euclidean: { hits: [5, 6, 7], length: [16] } },
                        velocity: { min: 75, max: 100 },
                        conformNotes: false,
                        swingAmount: { min: 20, max: 30 },
                        maxDurationFactor: { min: 0.05, max: 0.1 }
                    },
                    snare: {
                        tracks: [12],
                        rootNote: [38],
                        patterns: { binary: { numbers: [[8]] } },
                        velocity: { min: 100, max: 115 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    }
                }
            },
            ambient: {
                name: "Ambient",
                bpm: { min: 55, max: 70 },
                swing: { min: 0, max: 2 },
                scale: [0, 4], // Major, Lydian
                chordProgressions: [
                    [0, 9, 5, 0], // I-vi-IV-I
                    [0, 5, 9, 7], // I-IV-vi-V
                    [0, 7, 5, 0]  // I-V-IV-I
                ],
                trackTypes: {
                    pad1: {
                        tracks: [0],
                        rootNote: { min: 48, max: 60 },
                        numberOfNotes: [2, 3],
                        velocity: { min: 40, max: 60 },
                        patterns: { euclidean: { hits: [3, 5, 7], length: [32, 48, 64] } },
                        speedMultiplier: [0.125, 0.25],
                        conformNotes: true,
                        pitchSpan: { min: 12, max: 24 },
                        probability: { min: 30, max: 60 },
                        maxDurationFactor: { min: 4.0, max: 8.0 }
                    },
                    pad2: {
                        tracks: [1],
                        rootNote: { min: 60, max: 72 },
                        numberOfNotes: [2, 4],
                        velocity: { min: 35, max: 55 },
                        patterns: { euclidean: { hits: [5, 7, 11], length: [48, 64, 80] } },
                        speedMultiplier: [0.125, 0.25],
                        conformNotes: true,
                        pitchSpan: { min: 18, max: 30 },
                        probability: { min: 25, max: 50 },
                        spread: [4, 6],
                        maxDurationFactor: { min: 6.0, max: 12.0 }
                    },
                    texture: {
                        tracks: [2],
                        rootNote: { min: 72, max: 96 },
                        numberOfNotes: 1,
                        velocity: { min: 30, max: 50 },
                        patterns: { euclidean: { hits: [7, 11, 13], length: [32, 48] } },
                        speedMultiplier: [0.5, 1],
                        conformNotes: true,
                        pitchSpan: { min: 12, max: 24 },
                        probability: { min: 15, max: 40 },
                        maxDurationFactor: { min: 3.0, max: 10.0 }
                    }
                }
            },
            pop: {
                name: "Pop",
                bpm: { min: 110, max: 120 },
                swing: { min: 5, max: 12 },
                scale: [0], // Major
                chordProgressions: [
                    [0, 7, 9, 5], // I-V-vi-IV (most common pop progression)
                    [0, 9, 5, 7], // I-vi-IV-V
                    [9, 5, 0, 7]  // vi-IV-I-V
                ],
                trackTypes: {
                    bass: {
                        tracks: [0],
                        rootNote: { min: 36, max: 48 },
                        numberOfNotes: 1,
                        velocity: { min: 95, max: 115 },
                        patterns: { euclidean: { hits: [5, 6, 7], length: [16] } },
                        speedMultiplier: [1],
                        conformNotes: true,
                        maxDurationFactor: { min: 0.8, max: 1.1 }
                    },
                    chords: {
                        tracks: [1],
                        rootNote: { min: 60, max: 72 },
                        numberOfNotes: [3, 4],
                        velocity: { min: 70, max: 85 },
                        patterns: { euclidean: { hits: [6, 8], length: [16] } },
                        speedMultiplier: [0.5, 1],
                        conformNotes: true,
                        pitchSpan: { min: 8, max: 15 },
                        spread: [2],
                        swingAmount: { min: 8, max: 15 },
                        maxDurationFactor: { min: 1.2, max: 1.8 }
                    },
                    lead: {
                        tracks: [2],
                        rootNote: { min: 72, max: 84 },
                        numberOfNotes: [1, 2],
                        velocity: { min: 80, max: 95 },
                        patterns: { euclidean: { hits: [6, 8, 9], length: [16] } },
                        speedMultiplier: [1, 2],
                        conformNotes: true,
                        arpMode: [0, 1],
                        pitchSpan: { min: 8, max: 15 },
                        swingAmount: { min: 10, max: 18 },
                        maxDurationFactor: { min: 0.6, max: 1.0 }
                    },
                    bells: {
                        tracks: [3],
                        rootNote: { min: 84, max: 96 },
                        numberOfNotes: 1,
                        velocity: { min: 70, max: 90 },
                        patterns: { euclidean: { hits: [4, 5, 6], length: [16] } },
                        speedMultiplier: [2, 4],
                        conformNotes: true,
                        probability: { min: 70, max: 90 },
                        pitchSpan: { min: 5, max: 12 },
                        swingAmount: { min: 12, max: 20 },
                        maxDurationFactor: { min: 0.3, max: 0.6 }
                    },
                    kick: {
                        tracks: [10],
                        rootNote: [36],
                        patterns: { init: { numbers: [8] } },
                        velocity: { min: 110, max: 120 },
                        conformNotes: false,
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    },
                    hihat: {
                        tracks: [11],
                        rootNote: [42],
                        patterns: { euclidean: { hits: [6, 8], length: [16] } },
                        velocity: { min: 75, max: 95 },
                        conformNotes: false,
                        swingAmount: { min: 8, max: 15 },
                        maxDurationFactor: { min: 0.05, max: 0.1 }
                    },
                    snare: {
                        tracks: [12],
                        rootNote: [38],
                        patterns: { binary: { numbers: [[0, 8]] } },
                        velocity: { min: 100, max: 115 },
                        conformNotes: false,
                        swingAmount: { min: 0, max: 5 },
                        maxDurationFactor: { min: 0.08, max: 0.12 }
                    }
                }
            }
        };
    }

    randomInRange(min, max) {
        if (typeof min === 'number' && typeof max === 'number') {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return min;
    }

    randomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    randomFromRange(range) {
        if (Array.isArray(range)) {
            return this.randomFromArray(range);
        }
        if (range && typeof range === 'object' && 'min' in range && 'max' in range) {
            return this.randomInRange(range.min, range.max);
        }
        return range;
    }

    generateProgressionSettings(style) {
        const progressionData = this.randomFromArray(style.chordProgressions);
        const scale = this.randomFromArray(style.scale);
        
        return {
            progressions: [progressionData.map(transposition => ({
                bars: 4,
                beats: 0,
                scale: scale,
                transposition: transposition,
                key: 0
            }))],
            currentProgressionIndex: 0
        };
    }

    generateTrackSettings(trackType, trackDefinition, trackId) {
        const settings = {
            channel: trackId < 10 ? trackId + 1 : 10, // Tracks 10+ use channel 10 (drums)
            steps: 16,
            noteSeries: [{
                rootNote: this.randomFromRange(trackDefinition.rootNote),
                numberOfNotes: this.randomFromRange(trackDefinition.numberOfNotes || 1),
                inversion: this.randomFromRange(trackDefinition.inversion || 0),
                velocity: this.randomFromRange(trackDefinition.velocity || { min: 80, max: 100 }),
                pitchSpan: this.randomFromRange(trackDefinition.pitchSpan || 0),
                velocitySpan: this.randomFromRange(trackDefinition.velocitySpan || { min: 5, max: 20 }),
                spread: this.randomFromRange(trackDefinition.spread || 0),
                probability: this.randomFromRange(trackDefinition.probability || 100),
                aValue: 1,
                bValue: 1,
                aValueIndividualNote: 1,
                bValueIndividualNote: 1,
                arpMode: this.randomFromRange(trackDefinition.arpMode || 16),
                playMultiplier: 1,
                wonkyArp: false,
                maxDurationFactor: this.randomFromRange(trackDefinition.maxDurationFactor || 1),
                useMaxDuration: trackDefinition.maxDurationFactor ? true : false
            }],
            triggerType: TRIGGER_TYPES.EUCLIDEAN, // Default, will be set based on pattern
            triggerSettings: this.generateTriggerSettings(trackDefinition.patterns),
            groove: [],
            grooveName: "Steady",
            resyncInterval: 0,
            speedMultiplier: this.randomFromRange(trackDefinition.speedMultiplier || 1),
            swingAmount: this.randomFromRange(trackDefinition.swingAmount || 0),
            playOrder: 0,
            probability: this.randomFromRange(trackDefinition.probability || 100),
            conformNotes: trackDefinition.conformNotes !== undefined ? trackDefinition.conformNotes : true,
            arpMode: this.randomFromRange(trackDefinition.arpMode || 0),
            wonkyArp: false,
            playMultiplier: 1,
            useMaxDuration: trackDefinition.maxDurationFactor ? true : false,
            maxDurationFactor: this.randomFromRange(trackDefinition.maxDurationFactor || 1),
            isActive: false,
            volume: 100,
            tieNoteSeriestoPattern: false
        };

        return settings;
    }

    generateTriggerSettings(patterns) {
        const patternTypes = Object.keys(patterns);
        const selectedPatternType = this.randomFromArray(patternTypes);
        const patternDef = patterns[selectedPatternType];

        switch (selectedPatternType) {
            case 'euclidean':
                return {
                    triggerType: TRIGGER_TYPES.EUCLIDEAN,
                    settings: {
                        numbers: [8],
                        length: this.randomFromArray(patternDef.length || [16]),
                        hits: this.randomFromArray(patternDef.hits || [4]),
                        shift: this.randomInRange(0, 3),
                        steps: []
                    }
                };
            case 'binary':
                return {
                    triggerType: TRIGGER_TYPES.BINARY,
                    settings: {
                        numbers: this.randomFromArray(patternDef.numbers || [[8]]),
                        length: 16,
                        hits: 4,
                        shift: 0,
                        steps: []
                    }
                };
            case 'init':
                return {
                    triggerType: TRIGGER_TYPES.INIT,
                    settings: {
                        numbers: patternDef.numbers || [8],
                        length: 16,
                        hits: 4,
                        shift: 0,
                        steps: []
                    }
                };
            default:
                return {
                    triggerType: TRIGGER_TYPES.EUCLIDEAN,
                    settings: {
                        numbers: [8],
                        length: 16,
                        hits: 4,
                        shift: 0,
                        steps: []
                    }
                };
        }
    }

    generateActiveStates() {
        // Generate 8 different active states for song arrangement
        const states = [];
        
        // State 0: Only drums
        states.push([false, false, false, false, false, false, false, false, false, false, true, true, true, false, false, false]);
        
        // State 1: Drums + bass
        states.push([true, false, false, false, false, false, false, false, false, false, true, true, true, false, false, false]);
        
        // State 2: Drums + bass + chords
        states.push([true, true, false, false, false, false, false, false, false, false, true, true, true, false, false, false]);
        
        // State 3: Drums + bass + chords + lead
        states.push([true, true, true, false, false, false, false, false, false, false, true, true, true, false, false, false]);
        
        // State 4: Full arrangement
        states.push([true, true, true, true, false, false, false, false, false, false, true, true, true, true, false, false]);
        
        // State 5: Break - only lead + light drums
        states.push([false, false, true, false, false, false, false, false, false, false, false, true, false, false, false, false]);
        
        // State 6: Build up - bass + lead + drums
        states.push([true, false, true, false, false, false, false, false, false, false, true, true, true, false, false, false]);
        
        // State 7: Outro - fade elements
        states.push([false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false]);
        
        // Fill remaining states with variations
        while (states.length < 16) {
            states.push([true, true, true, true, false, false, false, false, false, false, true, true, true, true, false, false]);
        }
        
        return states;
    }

    randomizeTrack(styleName = null, trackOptions = {}) {
        // If no style specified, pick a random one
        if (!styleName) {
            const styleNames = Object.keys(this.styleDefinitions);
            styleName = this.randomFromArray(styleNames);
        }

        const style = this.styleDefinitions[styleName];
        if (!style) {
            throw new Error(`Unknown style: ${styleName}`);
        }

        // Generate global settings
        const globalSettings = {
            bpm: this.randomFromRange(style.bpm),
            ppq: 24,
            timeSignature: [4, 4],
            swing: this.randomFromRange(style.swing),
            ...this.generateProgressionSettings(style),
            activeStates: this.generateActiveStates(),
            currentActiveState: 0,
            song: {
                active: false,
                parts: []
            }
        };

        // Clear existing tracks
        this.sequencer.cleanSequencer();

        // Generate tracks for each track type
        Object.entries(style.trackTypes).forEach(([trackType, trackDefinition]) => {
            const tracks = trackDefinition.tracks || [0];
            tracks.forEach(trackId => {
                if (trackOptions.excludeTrackTypes && trackOptions.excludeTrackTypes.includes(trackType)) {
                    return;
                }
                
                const trackSettings = this.generateTrackSettings(trackType, trackDefinition, trackId);
                
                // Apply the trigger settings to the track
                trackSettings.triggerType = trackSettings.triggerSettings.triggerType;
                trackSettings.triggerSettings = trackSettings.triggerSettings.settings;
                
                this.sequencer.updateTrackSettings(trackId, trackSettings);
            });
        });

        // Apply global settings
        this.sequencer.updateSettings(globalSettings, true);
        
        // Save to tmp for persistence
        this.sequencer.sequenceManager.saveToTmp();
        
        return {
            style: styleName,
            settings: globalSettings,
            message: `Generated random ${style.name} track at ${globalSettings.bpm} BPM`
        };
    }

    getAvailableStyles() {
        return Object.keys(this.styleDefinitions);
    }

    getStyleInfo(styleName) {
        const style = this.styleDefinitions[styleName];
        if (!style) return null;
        
        return {
            name: style.name,
            bpmRange: `${style.bpm.min}-${style.bpm.max}`,
            trackTypes: Object.keys(style.trackTypes)
        };
    }

    randomizeNoteSeries(noteSeries, trackId = 0, options = {}) {
        // Determine if this is a drum track (track 10+)
        const isDrumTrack = trackId >= 10;
        
        // Get current style context if available from sequencer settings
        const currentBpm = this.sequencer.settings.bpm;
        let currentStyle = 'house'; // default fallback
        
        // Try to determine current style based on BPM
        for (const [styleName, style] of Object.entries(this.styleDefinitions)) {
            if (currentBpm >= style.bpm.min && currentBpm <= style.bpm.max) {
                currentStyle = styleName;
                break;
            }
        }

        if (options.style) {
            currentStyle = options.style;
        }

        const style = this.styleDefinitions[currentStyle];
        
        // Define randomization ranges based on track type and style
        const ranges = isDrumTrack ? {
            rootNote: { min: 35, max: 50 }, // Drum notes range
            velocity: { min: 80, max: 127 },
            numberOfNotes: 1,
            pitchSpan: 0,
            velocitySpan: { min: 5, max: 25 },
            probability: { min: 70, max: 100 },
            spread: 0,
            inversion: 0,
            arpMode: 16, // No arp for drums
            playMultiplier: 1,
            wonkyArp: false,
            maxDurationFactor: { min: 0.05, max: 0.2 },
            useMaxDuration: true
        } : {
            // Melodic tracks
            rootNote: trackId === 0 ? { min: 36, max: 60 } : // Bass range
                     trackId <= 2 ? { min: 60, max: 84 } : // Mid range
                     { min: 72, max: 96 }, // High range
            velocity: { min: 60, max: 110 },
            numberOfNotes: { min: 1, max: 4 },
            pitchSpan: { min: 0, max: 24 },
            velocitySpan: { min: 5, max: 30 },
            probability: { min: 70, max: 100 },
            spread: { min: 0, max: 5 },
            inversion: { min: -2, max: 2 },
            arpMode: [0, 1, 2, 3, 16], // Various arp modes
            playMultiplier: [0.25, 0.5, 1, 2],
            wonkyArp: [true, false],
            maxDurationFactor: { min: 0.3, max: 3.0 },
            useMaxDuration: [true, false]
        };

        // Apply randomization with some intelligent constraints
        const randomizedSeries = {
            rootNote: this.randomFromRange(ranges.rootNote),
            numberOfNotes: this.randomFromRange(ranges.numberOfNotes),
            inversion: this.randomFromRange(ranges.inversion),
            velocity: this.randomFromRange(ranges.velocity),
            pitchSpan: this.randomFromRange(ranges.pitchSpan),
            velocitySpan: this.randomFromRange(ranges.velocitySpan),
            spread: this.randomFromRange(ranges.spread),
            probability: this.randomFromRange(ranges.probability),
            aValue: noteSeries.aValue || 1, // Keep existing or default
            bValue: noteSeries.bValue || 1,
            aValueIndividualNote: noteSeries.aValueIndividualNote || 1,
            bValueIndividualNote: this.randomInRange(1, 4),
            arpMode: this.randomFromRange(ranges.arpMode),
            playMultiplier: this.randomFromRange(ranges.playMultiplier),
            wonkyArp: this.randomFromRange(ranges.wonkyArp),
            maxDurationFactor: this.randomFromRange(ranges.maxDurationFactor),
            useMaxDuration: this.randomFromRange(ranges.useMaxDuration)
        };

        // Apply some musical intelligence
        
        // If numberOfNotes is 1, reduce spread and inversion
        if (randomizedSeries.numberOfNotes === 1) {
            randomizedSeries.spread = 0;
            randomizedSeries.inversion = 0;
        }

        // If it's a bass track (trackId 0), limit numberOfNotes and pitch span
        if (trackId === 0) {
            randomizedSeries.numberOfNotes = Math.min(randomizedSeries.numberOfNotes, 2);
            randomizedSeries.pitchSpan = Math.min(randomizedSeries.pitchSpan, 12);
        }

        // Ensure probability is within bounds
        randomizedSeries.probability = Math.max(20, Math.min(100, randomizedSeries.probability));

        // Ensure velocity is within MIDI bounds
        randomizedSeries.velocity = Math.max(1, Math.min(127, randomizedSeries.velocity));

        return randomizedSeries;
    }

    // Specialized randomization methods for different aspects
    randomizeNoteParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            rootNote: this.randomFromRange(ranges.rootNote),
            numberOfNotes: this.randomFromRange(ranges.numberOfNotes),
            inversion: this.randomFromRange(ranges.inversion),
            pitchSpan: this.randomFromRange(ranges.pitchSpan),
            spread: this.randomFromRange(ranges.spread)
        };
    }

    randomizeVelocityParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            velocity: this.randomFromRange(ranges.velocity),
            velocitySpan: this.randomFromRange(ranges.velocitySpan)
        };
    }

    randomizeTimingParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            arpMode: this.randomFromRange(ranges.arpMode),
            playMultiplier: this.randomFromRange(ranges.playMultiplier),
            wonkyArp: this.randomFromRange(ranges.wonkyArp)
        };
    }

    randomizeDurationParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            maxDurationFactor: this.randomFromRange(ranges.maxDurationFactor),
            useMaxDuration: this.randomFromRange(ranges.useMaxDuration)
        };
    }

    randomizeHarmonicParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            rootNote: this.randomFromRange(ranges.rootNote),
            numberOfNotes: this.randomFromRange(ranges.numberOfNotes),
            inversion: this.randomFromRange(ranges.inversion),
            pitchSpan: this.randomFromRange(ranges.pitchSpan),
            spread: this.randomFromRange(ranges.spread),
            arpMode: this.randomFromRange(ranges.arpMode)
        };
    }

    randomizeRhythmicParameters(noteSeries, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        return {
            ...noteSeries,
            playMultiplier: this.randomFromRange(ranges.playMultiplier),
            wonkyArp: this.randomFromRange(ranges.wonkyArp),
            probability: this.randomFromRange(ranges.probability),
            aValueIndividualNote: this.randomInRange(1, 4),
            bValueIndividualNote: this.randomInRange(1, 4)
        };
    }

    // Helper method to get ranges for a track type
    getRangesForTrack(trackId) {
        const isDrumTrack = trackId >= 10;
        
        return isDrumTrack ? {
            rootNote: { min: 35, max: 50 },
            velocity: { min: 80, max: 127 },
            numberOfNotes: 1,
            pitchSpan: 0,
            velocitySpan: { min: 5, max: 25 },
            probability: { min: 70, max: 100 },
            spread: 0,
            inversion: 0,
            arpMode: 16,
            playMultiplier: 1,
            wonkyArp: false,
            maxDurationFactor: { min: 0.05, max: 0.2 },
            useMaxDuration: true
        } : {
            rootNote: trackId === 0 ? { min: 36, max: 60 } :
                     trackId <= 2 ? { min: 60, max: 84 } :
                     { min: 72, max: 96 },
            velocity: { min: 60, max: 110 },
            numberOfNotes: { min: 1, max: 4 },
            pitchSpan: { min: 0, max: 24 },
            velocitySpan: { min: 5, max: 30 },
            probability: { min: 70, max: 100 },
            spread: { min: 0, max: 5 },
            inversion: { min: -2, max: 2 },
            arpMode: [0, 1, 2, 3, 16],
            playMultiplier: [0.25, 0.5, 1, 2],
            wonkyArp: [true, false],
            maxDurationFactor: { min: 0.3, max: 3.0 },
            useMaxDuration: [true, false]
        };
    }

    // Method to randomize a single parameter
    randomizeParameter(currentValue, parameterName, trackId = 0) {
        const ranges = this.getRangesForTrack(trackId);
        
        switch (parameterName) {
            case 'rootNote':
                return this.randomFromRange(ranges.rootNote);
            case 'numberOfNotes':
                return this.randomFromRange(ranges.numberOfNotes);
            case 'inversion':
                return this.randomFromRange(ranges.inversion);
            case 'velocity':
                return this.randomFromRange(ranges.velocity);
            case 'pitchSpan':
                return this.randomFromRange(ranges.pitchSpan);
            case 'velocitySpan':
                return this.randomFromRange(ranges.velocitySpan);
            case 'spread':
                return this.randomFromRange(ranges.spread);
            case 'probability':
                return this.randomFromRange(ranges.probability);
            case 'arpMode':
                return this.randomFromRange(ranges.arpMode);
            case 'playMultiplier': {
                // Use multiplier presets like the UI does
                const { findMultiplierPreset } = require('../utils/utils');
                const validMultipliers = this.randomFromRange(ranges.playMultiplier);
                return Array.isArray(validMultipliers) ? 
                    validMultipliers[Math.floor(Math.random() * validMultipliers.length)] : 
                    findMultiplierPreset(currentValue || 1, Math.floor(Math.random() * 5) - 2);
            }
            case 'wonkyArp':
                return this.randomFromRange(ranges.wonkyArp);
            case 'maxDurationFactor': {
                // Use multiplier presets like the UI does
                const { findMultiplierPreset: findMultPreset } = require('../utils/utils');
                return findMultPreset(currentValue || 1, Math.floor(Math.random() * 5) - 2);
            }
            case 'useMaxDuration':
                return this.randomFromRange(ranges.useMaxDuration);
            case 'aValueIndividualNote':
            case 'bValueIndividualNote':
                return this.randomInRange(1, 6);
            case 'aValueBValue':
                // This is a special case - we don't return a value, we handle it in the calling code
                return 'RANDOMIZE_A_B_PAIR';
            case 'aValueIndividualNoteBValue':
                // This is a special case - we don't return a value, we handle it in the calling code
                return 'RANDOMIZE_A_B_INDIVIDUAL_PAIR';
            default:
                return currentValue;
        }
    }

    // Get available randomization types
    getRandomizationTypes() {
        return [
            { name: 'RndAll', description: 'Randomize all parameters' },
            { name: 'RndNote', description: 'Randomize note parameters (pitch, count, inversion)' },
            { name: 'RndVel', description: 'Randomize velocity parameters' },
            { name: 'RndTime', description: 'Randomize timing parameters (arp, play multiplier)' },
            { name: 'RndHarm', description: 'Randomize harmonic parameters (notes + arp)' },
            { name: 'RndRhythm', description: 'Randomize rhythmic parameters (timing + probability)' },
            { name: 'RndDur', description: 'Randomize duration parameters' }
        ];
    }

    // Apply specific randomization type
    applyRandomizationType(noteSeries, type, trackId = 0) {
        switch (type) {
            case 'RndAll':
                return this.randomizeNoteSeries(noteSeries, trackId);
            case 'RndNote':
                return this.randomizeNoteParameters(noteSeries, trackId);
            case 'RndVel':
                return this.randomizeVelocityParameters(noteSeries, trackId);
            case 'RndTime':
                return this.randomizeTimingParameters(noteSeries, trackId);
            case 'RndHarm':
                return this.randomizeHarmonicParameters(noteSeries, trackId);
            case 'RndRhythm':
                return this.randomizeRhythmicParameters(noteSeries, trackId);
            case 'RndDur':
                return this.randomizeDurationParameters(noteSeries, trackId);
            default:
                return noteSeries;
        }
    }
}

module.exports = TrackRandomizer;