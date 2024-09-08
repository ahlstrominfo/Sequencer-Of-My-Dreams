const musicalGrooves = require('../../data/grooves.json');

const PLAY_ORDER = {
    FORWARD: 0,
    BACKWARD: 1,
    RANDOM: 2,
    RANDOM_ADJACENT: 3
};
const PLAY_ORDER_NAMES = {
    [PLAY_ORDER.FORWARD]: 'Forward',
    [PLAY_ORDER.BACKWARD]: 'Backward',
    [PLAY_ORDER.RANDOM]: 'Random',
    [PLAY_ORDER.RANDOM_ADJACENT]: 'Random Adjacent'
};

const scales = {
    0: [0, 2, 4, 5, 7, 9, 11],           // Major
    1: [0, 2, 3, 5, 7, 8, 10],           // Minor
    2: [0, 2, 3, 5, 7, 9, 10],           // Dorian
    3: [0, 1, 3, 5, 7, 8, 10],           // Phrygian
    4: [0, 2, 4, 6, 7, 9, 11],           // Lydian
    5: [0, 2, 4, 5, 7, 9, 10],           // Mixolydian
    6: [0, 1, 3, 5, 6, 8, 10],           // Locrian
    7: [0, 2, 3, 5, 7, 8, 11],           // Harmonic Minor
    8: [0, 2, 3, 5, 7, 9, 11],           // Melodic Minor
    9: [0, 2, 4, 6, 8, 10],              // Whole Tone
    10: [0, 2, 4, 7, 9],                 // Pentatonic Major
    11: [0, 3, 5, 7, 10],                // Pentatonic Minor
    12: [0, 3, 5, 6, 7, 10],             // Blues
    13: Array.from({length: 12}, (_, i) => i), // Chromatic
    14: [0, 2, 3, 5, 6, 8, 9, 11]        // Diminished
};

const scaleNames = {
    0: 'Major',
    1: 'Minor',
    2: 'Dorian',
    3: 'Phrygian',
    4: 'Lydian',
    5: 'Mixolydian',
    6: 'Locrian',
    7: 'Harmonic Minor',
    8: 'Melodic Minor',
    9: 'Whole Tone',
    10: 'Pentatonic Major',
    11: 'Pentatonic Minor',
    12: 'Blues',
    13: 'Chromatic',
    14: 'Diminished'
};

const conformNoteToScale = (note, key, scaleNumber, semitones) => {
    if (scales[scaleNumber] === undefined) {
        throw new Error('Scale not recognized');
    }

    const transposedNote = (note + semitones) % 12;
    const scaleNotes = scales[scaleNumber].map(n => (n + key) % 12);

    let closestNote = scaleNotes.reduce((prev, curr) => {
        return (Math.abs(curr - transposedNote) < Math.abs(prev - transposedNote) ? curr : prev);
    });

    // Adjust the octave
    const octave = Math.floor((note + semitones) / 12);
    return closestNote + (octave * 12);
};

function invertChord(arr, inv) {
    if (inv > 0) {
        for (let i = 0; i < inv; i++) {
            arr.push(arr.shift() + 12);
        }
    } else if (inv < 0) {
        for (let i = 0; i > inv; i--) {
            arr.unshift(arr.pop() - 12);
        }
    }
    return arr;
};

function generateChord(rootNote, options = {}) {
    const {
        numberOfNotes = 3,
        inversion = 0,
        spread = 0,
        scaleType = 0
    } = options;

    const scale = scales[scaleType];
    
    // Generate chord intervals based on scale
    const chordIntervals = Array.from({length: numberOfNotes}, (_, i) => scale[i * 2 % scale.length]);

    // Generate chord
    let chord = chordIntervals.map(interval => rootNote + interval);

    // Apply inversion
    chord = invertChord(chord, inversion);

    // Apply spread
    if (spread !== 0) {
        chord = applySpread(chord, spread);
    }

    return chord;
}

function applySpread(chord, spread) {
    const spreadAmount = Math.abs(spread) / 9;  // Normalize to 0-1
    const direction = Math.sign(spread);

    return chord.map((note, index) => {
        const normalizedIndex = index / (chord.length - 1);
        let spreadOffset;
        
        if (direction > 0) {
            // Positive spread: emphasize higher notes
            spreadOffset = normalizedIndex * 24 * spreadAmount;
        } else {
            // Negative spread: emphasize lower notes
            spreadOffset = (1 - normalizedIndex) * 24 * spreadAmount;
        }
        
        return Math.round(note + (spreadOffset * direction));
    });
}

const adjectives = [
    'Cosmic', 'Electric', 'Neon', 'Mystic', 'Sonic', 'Distant', 'Dreamy', 'Stellar', 'Vibrant', 'Eternal',
    'Lunar', 'Solar', 'Astral', 'Quantum', 'Galactic', 'Ethereal', 'Radiant', 'Ambient', 'Hypnotic', 'Euphoric',
    'Cyber', 'Retro', 'Futuristic', 'Velvet', 'Crystal', 'Liquid', 'Frozen', 'Celestial', 'Parallel', 'Nanotech',
    'Holographic', 'Iridescent', 'Spectral', 'Chromatic', 'Kinetic', 'Luminous', 'Prismatic', 'Surreal', 'Zen', 'Atomic',
    'Bionic', 'Ethereal', 'Fractal', 'Glitch', 'Harmonic', 'Infinite', 'Kaleidoscopic', 'Magnetic', 'Nebulous', 'Optical',
    'Quantum', 'Resonant', 'Synesthetic', 'Temporal', 'Ultraviolet', 'Vortex', 'Warp', 'Xenon', 'Yonic', 'Zero-G',
    'Analog', 'Binary', 'Cryogenic', 'Dimensional', 'Entropic', 'Flux', 'Gravitational', 'Helical', 'Interstellar', 'Jovian',
    'Kinematic', 'Luminal', 'Metamorphic', 'Neutronic', 'Oscillating', 'Photonic', 'Quark', 'Relativistic', 'Subatomic', 'Tachyon',
    'Umbral', 'Void', 'Waveform', 'Xenomorphic', 'Yugen', 'Zwitterionic', 'Aetheric', 'Bioluminescent', 'Cosmogenic', 'Dyson',
    'Eigenstate', 'Ferromagnetic', 'Geodesic', 'Heisenberg', 'Ionospheric', 'Jungian', 'Kelvin', 'Lithospheric', 'Morphogenic', 'Noospheric',
    'Omnidirectional', 'Planck', 'Quintessential', 'Rhizomatic', 'Superluminal', 'Thermodynamic', 'Unifying', 'Vectorial', 'Wavelength', 'Yottabyte'
  ];
  
  const nouns = [
    'Wave', 'Echo', 'Pulse', 'Rhythm', 'Horizon', 'Whisper', 'Voyage', 'Nebula', 'Cascade', 'Mirage',
    'Oasis', 'Vortex', 'Paradox', 'Symmetry', 'Resonance', 'Flux', 'Aurora', 'Zenith', 'Odyssey', 'Infinity',
    'Prism', 'Solstice', 'Synapse', 'Abyss', 'Utopia', 'Labyrinth', 'Enigma', 'Eclipse', 'Nexus', 'Synthesis',
    'Spectrum', 'Oblivion', 'Fusion', 'Singularity', 'Matrix', 'Quasar', 'Dimension', 'Axiom', 'Cosmos', 'Paradigm',
    'Epoch', 'Pantheon', 'Helix', 'Nimbus', 'Revelation', 'Equinox', 'Twilight', 'Polaris', 'Zenith', 'Hypercube',
    'Continuum', 'Veil', 'Emergence', 'Crescendo', 'Neurosis', 'Parallax', 'Epiphany', 'Illusion', 'Catalyst', 'Mosaic',
    'Algorithm', 'Beacon', 'Cipher', 'Dynamo', 'Entropy', 'Fractal', 'Gyroscope', 'Hologram', 'Isotope', 'Juxtaposition',
    'Kinematics', 'Locus', 'Mandala', 'Neutron', 'Oscillation', 'Photon', 'Quantum', 'Refraction', 'Synergy', 'Tesseract',
    'Umbra', 'Vertex', 'Wormhole', 'Xenon', 'Yin-Yang', 'Zephyr', 'Archetype', 'Biomechanics', 'Cosmos', 'Duality',
    'Equilibrium', 'Fermion', 'Gestalt', 'Helix', 'Inertia', 'Juggernaut', 'Kinesis', 'Luminescence', 'Monolith', 'Neutrino',
    'Omnisphere', 'Plasma', 'Qubit', 'Resonator', 'Stasis', 'Torus', 'Umbra', 'Vacuole', 'Wavefunction', 'Yokai'
  ];
  
  // Function to generate a random track name
  function generateTrackName() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
  }

function scaleNumber(minValue, maxValue, minScale, maxScale, value) {
    return ((value - minValue) / (maxValue - minValue)) * (maxScale - minScale) + minScale;
}


const MULTIPLIER_PRESETS = [
    0.015625,
    0.03125, 
    0.0625, 
    0.125, 
    0.1666667, 
    0.25, 
    0.3333333, 
    0.5, 
    0.9999,
    1,
    1.5, 
    2, 
    3, 
    4, 
    5, 
    6, 
    7, 
    8, 
    9, 
    12, 16, 24, 32, 48, 64, 96, 128, 192, 256
];

function findMultiplierIndex(value) {
    return MULTIPLIER_PRESETS.findIndex(preset => preset === value);
}

function findMultiplierPreset(value, delta) {
    const currentIndex = findMultiplierIndex(value);
    let newIndex = currentIndex + delta;
    newIndex = Math.max(0, Math.min(newIndex, MULTIPLIER_PRESETS.length - 1));
    return MULTIPLIER_PRESETS[newIndex];
}

module.exports = {
    MULTIPLIER_PRESETS,
    findMultiplierPreset,
    findMultiplierIndex,
    PLAY_ORDER,
    PLAY_ORDER_NAMES,
    musicalGrooves,
    scaleNumber,
    scales,
    scaleNames,
    generateChord,
    conformNoteToScale,
    generateTrackName,
};

