
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

function generateArpeggioPattern(numberOfNotes, arpMode) {
    let notes = Array.from({length: numberOfNotes}, (_, i) => i);
    let result = [];

    switch (arpMode) {
        case ARP_MODES.UP:
            result = [...notes];
            break;
        case ARP_MODES.DOWN:
            result = [...notes].reverse();
            break;
        case ARP_MODES.UP_DOWN:
            result = [...notes, ...notes.slice(1, -1).reverse()];
            break;
        case ARP_MODES.DOWN_UP:
            result = [...notes.reverse(), ...notes.slice(1, -1)];
            break;
        case ARP_MODES.UP_AND_DOWN:
            result = [...notes, ...notes.slice(1).reverse()];
            break;
        case ARP_MODES.DOWN_AND_UP:
            result = [...notes.reverse(), ...notes.slice(1)];
            break;
        case ARP_MODES.RANDOM:
            result = notes.sort(() => Math.random() - 0.5);
            break;
        case ARP_MODES.ORDER:
            result = [...notes];
            break;
        case ARP_MODES.CHORD:
            result = [notes];
            break;
        case ARP_MODES.OUTSIDE_IN:
            for (let i = 0; i < Math.ceil(numberOfNotes / 2); i++) {
                result.push(numberOfNotes - 1 - i, i);
            }
            if (numberOfNotes % 2 !== 0) result.pop();
            break;
        case ARP_MODES.INSIDE_OUT:
            {
                const mid = Math.floor(numberOfNotes / 2);
                for (let i = 0; i < Math.ceil(numberOfNotes / 2); i++) {
                    result.push(mid - i, mid + i + 1);
                }
                if (numberOfNotes % 2 !== 0) result.pop();
                result = result.filter(n => n >= 0 && n < numberOfNotes);
            }
            break;
        case ARP_MODES.CONVERGE:
            for (let i = 0; i < Math.ceil(numberOfNotes / 2); i++) {
                result.push(i, numberOfNotes - 1 - i);
            }
            if (numberOfNotes % 2 !== 0) result.pop();
            break;
        case ARP_MODES.DIVERGE:
            {
                const midPoint = Math.floor(numberOfNotes / 2);
                result = [midPoint];
                for (let i = 1; i <= midPoint; i++) {
                    if (midPoint + i < numberOfNotes) result.push(midPoint + i);
                    if (midPoint - i >= 0) result.push(midPoint - i);
                }
            }
            break;
        case ARP_MODES.THUMB:
            result = [0];
            for (let i = 1; i < numberOfNotes; i++) {
                result.push(0, i);
            }
            break;
        case ARP_MODES.PINKY:
            result = [numberOfNotes - 1];
            for (let i = numberOfNotes - 2; i >= 0; i--) {
                result.push(numberOfNotes - 1, i);
            }
            break;
        default:
            result = notes;
    }

    return result;
}

module.exports = {
    ARP_MODES,
    ARP_MODES_NAMES,
    getArpeggiatedNotes,
    generateArpeggioPattern
};