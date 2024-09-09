const musicalGrooves = require('../../data/grooves.json');
const adjectives = require('../../data/adjectives.json');  
const nouns = require('../../data/nouns.json');

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
  
  // Function to generate a random track name
function generateTrackName() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
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
    0.75,
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
    generateTrackName,
};

