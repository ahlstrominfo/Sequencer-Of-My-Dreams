const musicalGrooves = require('../../data/grooves.json');

const ARP_MODES = {
    OFF: 0,
    UP: 1,
    DOWN: 2,
    UP_DOWN: 3,
    DOWN_UP: 4,
    UP_AND_DOWN: 5,
    DOWN_AND_UP: 6,
    RANDOM: 7,
    ORDER: 8,
    CHORD: 9,
    OUTSIDE_IN: 10,
    INSIDE_OUT: 11,
    CONVERGE: 12,
    DIVERGE: 13,
    THUMB: 14,
    PINKY: 15,
    USE_TRACK: 16
};

const ARP_MODES_NAMES = {
    [ARP_MODES.OFF]: 'Off',
    [ARP_MODES.UP]: 'Up',
    [ARP_MODES.DOWN]: 'Down',
    [ARP_MODES.UP_DOWN]: 'Up-Down (Inc)',
    [ARP_MODES.DOWN_UP]: 'Down-Up (Inc)',
    [ARP_MODES.UP_AND_DOWN]: 'Up & Down (Exc)',
    [ARP_MODES.DOWN_AND_UP]: 'Down & Up (Exc)',
    [ARP_MODES.RANDOM]: 'Random',
    [ARP_MODES.ORDER]: 'As Played',
    [ARP_MODES.CHORD]: 'Chord',
    [ARP_MODES.OUTSIDE_IN]: 'Outside-In',
    [ARP_MODES.INSIDE_OUT]: 'Inside-Out',
    [ARP_MODES.CONVERGE]: 'Converge',
    [ARP_MODES.DIVERGE]: 'Diverge',
    [ARP_MODES.THUMB]: 'Thumb (Pedal)',
    [ARP_MODES.PINKY]: 'Pinky',
    [ARP_MODES.USE_TRACK]: 'Use Track'
};

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


function generateChord(rootNote, options = {}) {
    const {
        numberOfNotes = 3,
        inversion = 0,
        spread = 'close',
        scaleType = 0  // Default to Major scale
    } = options;

    const scale = scales[scaleType];
    
    // Generate chord intervals based on scale
    const chordIntervals = Array.from({length: numberOfNotes}, (_, i) => scale[i * 2 % scale.length]);

    // Generate chord
    let chord = chordIntervals.map(interval => rootNote + interval);

    // Apply inversion
    const invertChord = (arr, inv) => {
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

    chord = invertChord(chord, inversion);

    // Apply spread
    if (spread === 'wide') {
        for (let i = 1; i < chord.length; i++) {
            chord[i] += 12 * i;
        }
    }

    return chord;
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


function getArpeggiatedNotes(chord, arpMode) {
    let notes = [...chord];
    let result = [];

    // Sort notes by pitch for most modes
    if (arpMode !== ARP_MODES.ORDER && arpMode !== ARP_MODES.CHORD) {
        notes.sort((a, b) => a - b);
    }

    switch (arpMode) {
        case ARP_MODES.UP: // 1. Up
            result = [...notes];
            break;
        case ARP_MODES.DOWN: // 2. Down
            result = [...notes].reverse();
            break;
        case ARP_MODES.UP_DOWN: // 3. Up-Down (Inclusive)
            result = [...notes, ...notes.slice(1, -1).reverse()];
            break;
        case ARP_MODES.DOWN_UP: // 4. Down-Up (Inclusive)
            result = [...notes.reverse(), ...notes.slice(1, -1)];
            break;
        case ARP_MODES.UP_AND_DOWN: // 5. Up & Down (Exclusive)
            result = [...notes, ...notes.slice(1, -1).reverse()];
            break;
        case ARP_MODES.DOWN_AND_UP: // 6. Down & Up (Exclusive)
            result = [...notes.reverse(), ...notes.slice(1, -1)];
            break;
        case ARP_MODES.RANDOM: // 7. Random
            result = notes.sort(() => Math.random() - 0.5);
            break;
        case ARP_MODES.ORDER: // 8. As Played
            result = [...chord]; // Use original chord order
            break;
        case ARP_MODES.CHORD: // 9. Chord
            result = [chord]; // Return the whole chord as a single element
            break;
        case ARP_MODES.OUTSIDE_IN: // 10. Outside-In
            for (let i = 0; i < Math.ceil(notes.length / 2); i++) {
                result.push(notes[notes.length - 1 - i], notes[i]);
            }
            if (notes.length % 2 !== 0) result.pop(); // Remove last duplicate for odd number of notes
            break;
        case ARP_MODES.INSIDE_OUT: // 11. Inside-Out
            {
                const mid = Math.floor(notes.length / 2);
                for (let i = 0; i < Math.ceil(notes.length / 2); i++) {
                    result.push(notes[mid - i] || notes[mid + i], notes[mid + i + 1] || notes[mid - i - 1]);
                }
                if (notes.length % 2 !== 0) result.pop(); // Remove last duplicate for odd number of notes
                break;
            }
        case ARP_MODES.CONVERGE: // 12. Converge
            for (let i = 0; i < Math.ceil(notes.length / 2); i++) {
                result.push(notes[i], notes[notes.length - 1 - i]);
            }
            if (notes.length % 2 !== 0) result.pop(); // Remove last duplicate for odd number of notes
            break;
        case ARP_MODES.DIVERGE: // 13. Diverge
            { 
                const midPoint = Math.floor(notes.length / 2);
                result = [notes[midPoint]];
                for (let i = 1; i <= midPoint; i++) {
                    if (midPoint + i < notes.length) result.push(notes[midPoint + i]);
                    if (midPoint - i >= 0) result.push(notes[midPoint - i]);
                }
                break; 
            }
        case ARP_MODES.THUMB: // 14. Thumb (Pedal)
            result = [notes[0]];
            for (let i = 1; i < notes.length; i++) {
                result.push(notes[0], notes[i]);
            }
            break;
        case ARP_MODES.PINKY: // 15. Pinky
            result = [notes[notes.length - 1]];
            for (let i = notes.length - 2; i >= 0; i--) {
                result.push(notes[notes.length - 1], notes[i]);
            }
            break;
        default:
            result = notes;
    }

    return result;
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
    getArpeggiatedNotes,
    ARP_MODES,
    ARP_MODES_NAMES,
};

