/* eslint-disable no-undef */
const Sequencer = require('../src/core/sequencer');
const { TRIGGER_TYPES } = require('../src/patterns/triggerPatterns');
const { ARP_MODES, ARP_MODES_NAMES } = require('../src/utils/arps');
const RealTimeKeeper = require('../src/core/realTimeKeeper');

// Mock RealTimeKeeper
jest.mock('../src/core/realTimeKeeper');

describe('Arpeggiator Tests', () => {
    let sequencer;
    let mockRealTimeKeeper;
    let currentTime;

    beforeEach(() => {
        jest.clearAllMocks();
        currentTime = 0;

        mockRealTimeKeeper = new RealTimeKeeper();
        
        mockRealTimeKeeper.getHighResolutionTime.mockImplementation(() => BigInt(currentTime));
        mockRealTimeKeeper.getCurrentTime.mockImplementation(() => currentTime / 1e6);
        mockRealTimeKeeper.nanoToMs.mockImplementation((nano) => Number(nano) / 1e6);
        mockRealTimeKeeper.msToNano.mockImplementation((ms) => BigInt(Math.round(ms * 1e6)));
        
        sequencer = new Sequencer(120, 96, mockRealTimeKeeper);
    });

    const runSequencer = (totalTime, stepSize) => {
        sequencer.tracks.forEach(track => track.trackScheduler.resyncTrack());
    
        for (let time = 0; time < totalTime; time += stepSize) {
            currentTime = time * 1e6; // Convert to nanoseconds
            sequencer.tracks.forEach(track => {
                track.trackScheduler.scheduleEvents(time + sequencer.scheduleAheadTime);
            });
            sequencer.midi.processEventQueue(time);
        }
    };    

    const createTrack = (modifyTrack) => ({
        channel: 1,
        steps: 16,
        noteSeries: [{
            rootNote: 60,
            numberOfNotes: 4,
            inversion: 0,
            velocity: 100,
            pitchSpan: 0,
            velocitySpan: 0,
            probability: 100,
            aValue: 1,
            bValue: 1,
            arpMode: ARP_MODES.USE_TRACK,
            spread: 0,
            playMultiplier: 1,
            wonkyArp: false
        }],
        triggerType: TRIGGER_TYPES.BINARY,
        triggerSettings: {
            numbers: [8, 0],
        },
        groove: [],
        grooveName: "Steady",
        resyncInterval: 0,
        speedMultiplier: 1,
        swingAmount: 0,
        playOrder: 0,
        probability: 100,
        conformNotes: false,
        arpMode: ARP_MODES.UP,
        wonkyArp: false,
        playMultiplier: 1,
        useMaxDuration: true,
        maxDurationFactor: 1,
        isActive: true,
        volume: 100,
        tieNoteSeriestoPattern: false,
        ...modifyTrack
    });

    const testArpMode = (arpMode, expectedNotes) => {
        test(`Arpeggiator mode: ${ARP_MODES_NAMES[arpMode]}`, () => {
            sequencer.addTrack(createTrack({ arpMode }));

            const mockMidiOutput = jest.fn();
            sequencer.midi.queueNoteEvent = mockMidiOutput;

            runSequencer(2000, 100); // Run for 2 seconds

            // Check if the number of notes played matches the expected count
            expect(mockMidiOutput).toHaveBeenCalledTimes(expectedNotes.length);
            // console.log(JSON.stringify(mockMidiOutput.mock.calls, null, 2));

            // Check if each note matches the expected note
            expectedNotes.forEach((expectedNote, index) => {
                expect(mockMidiOutput).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
                    message: expect.objectContaining({ note: expectedNote })
                }));
            });
        });
    };

    // Test cases for each arpeggiator mode
    testArpMode(ARP_MODES.UP, [60, 61, 62, 63, 60, 61, 62, 63, 60, 61, 62, 63, 60, 61, 62, 63]);
    testArpMode(ARP_MODES.DOWN, [63, 62, 61, 60, 63, 62, 61, 60, 63, 62, 61, 60, 63, 62, 61, 60]);
    testArpMode(ARP_MODES.UP_DOWN, [60, 61, 62, 63, 62, 61, 60, 61, 60, 61, 62, 63, 62, 61, 60, 61]);
    testArpMode(ARP_MODES.DOWN_UP, [63, 62, 61, 60, 61, 62, 63, 62, 63, 62, 61, 60, 61, 62, 63, 62]);
    testArpMode(ARP_MODES.UP_AND_DOWN, [60, 61, 62, 63, 63, 62, 61, 60, 60, 61, 62, 63, 63, 62, 61, 60]);
    testArpMode(ARP_MODES.DOWN_AND_UP, [63, 62, 61, 60, 60, 61, 62, 63, 63, 62, 61, 60, 60, 61, 62, 63]);
    testArpMode(ARP_MODES.ORDER, [60, 61, 62, 63, 60, 61, 62, 63, 60, 61, 62, 63, 60, 61, 62, 63]);
    testArpMode(ARP_MODES.OUTSIDE_IN, [63, 60, 62, 61, 63, 60, 62, 61, 63, 60, 62, 61, 63, 60, 62, 61]);
    testArpMode(ARP_MODES.INSIDE_OUT, [62, 61, 63, 60, 62, 61, 63, 60, 62, 61, 63, 60, 62, 61, 63, 60]);
    testArpMode(ARP_MODES.CONVERGE, [60, 63, 61, 62, 60, 63, 61, 62, 60, 63, 61, 62, 60, 63, 61, 62]);
});