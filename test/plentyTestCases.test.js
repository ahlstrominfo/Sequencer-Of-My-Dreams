/* eslint-disable no-undef */
const Sequencer = require('../src/core/sequencer');
const RealTimeKeeper = require('../src/core/realTimeKeeper');
const generateTestCases = require('./sequencerTestCases');

jest.mock('../src/core/realTimeKeeper');

describe('Sequencer', () => {
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

  const testCases = generateTestCases();

  testCases.forEach(testCase => {
    test(testCase.name, () => {
      sequencer.addTrack(testCase.track);

      const mockMidiOutput = jest.fn();
      sequencer.midi.queueNoteEvent = mockMidiOutput;

      runSequencer(4000, 100);
      
      expect(mockMidiOutput).toHaveBeenCalledTimes(testCase.nrNotes);


      for (let i = 0; i < testCase.nrNotes; i++) {
        expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
          type: 'note',
          message: expect.objectContaining({
            note: testCase.notes[i],
          }),
        }));
        expect(mockMidiOutput.mock.calls[i][0].time).toBeCloseTo(testCase.expectedTimes[i], 4);
      }
    });
  });
});