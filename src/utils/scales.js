const scalesData = require('../../data/scales.json');

const KEYS = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const SCALES = {};
const SCALE_NAMES = {};

scalesData.scales.forEach(scale => {
    SCALES[scale.id] = scale.intervals;
    SCALE_NAMES[scale.id] = scale.name;
});

const conformNoteToScale = (note, key, scaleNumber, semitones) => {
    if (SCALES[scaleNumber] === undefined) {
        throw new Error('Scale not recognized');
    }

    const transposedNote = (note + semitones) % 12;
    const scaleNotes = SCALES[scaleNumber].map(n => (n + key) % 12);

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

    const scale = SCALES[scaleType];
    
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


function scaleNumber(minValue, maxValue, minScale, maxScale, value) {
    return ((value - minValue) / (maxValue - minValue)) * (maxScale - minScale) + minScale;
}

module.exports = {
    KEYS,
    SCALES,
    SCALE_NAMES,
    scaleNumber,
    conformNoteToScale,
    generateChord
};