/* eslint-disable no-undef */
const Sequencer = require('../src/core/sequencer');
const {TRIGGER_TYPES} = require('../src/patterns/triggerPatterns');
const RealTimeKeeper = require('../src/core/realTimeKeeper');

// Mock RealTimeKeeper
jest.mock('../src/core/realTimeKeeper');

describe('TrackSceduler', () => {
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

    const createTrack = (modifyTrack) => ({...{
        channel: 10,
        steps: 16,
        noteSeries: [{
          rootNote: 36,
          numberOfNotes: 1,
          inversion: 0,
          velocity: 100,
          pitchSpan: 0,
          velocitySpan: 0,
          probability: 100,
          aValue: 1,
          bValue: 1,
          arpMode: 16,
          spread: 0,
          playMultiplier: 1,
          wonkyArp: false
        }],
        triggerType: TRIGGER_TYPES.INIT,
        triggerSettings: {
          numbers: [8],
          length: 16,
          hits: 4,
          shift: 0,
          steps: []
        },
        groove: [],
        grooveName: "Steady",
        resyncInterval: 0,
        speedMultiplier: 1,
        swingAmount: 0,
        playOrder: 0,
        probability: 100,
        conformNotes: false,
        arpMode: 0,
        wonkyArp: false,
        playMultiplier: 1,
        useMaxDuration: false,
        maxDurationFactor: 1,
        isActive: true,
        volume: 100,
        tieNoteSeriestoPattern: false
      }, ...modifyTrack});


  
    test('4/4 track plays note 36 at velocity 100 every quarter note', () => {

      sequencer.addTrack(createTrack({
        triggerType: TRIGGER_TYPES.BINARY,
        }));
  
      const mockMidiOutput = jest.fn();
      sequencer.midi.queueNoteEvent = mockMidiOutput;
  
      runSequencer(4000, 100);

      // We expect 4 notes per second at 120 BPM, so 8 notes in 2 seconds
      expect(mockMidiOutput).toHaveBeenCalledTimes(8);
  
      for (let i = 0; i < 8; i++) {
        expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
        duration: 125,
          time: i * 500, // Every 500ms (quarter note at 120 BPM)
          type: 'note',
          message: { channel: 9, note: 36, velocity: 100 },
          trackId: 16,
        }));
      }
    });

    test('4/4 track plays note 36 at velocity 100 every quarter note but uses Max Duration', () => {
        sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            useMaxDuration: true,
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;

        runSequencer(4000, 100);

        // We expect 4 notes per second at 120 BPM, so 8 notes in 2 seconds
        expect(mockMidiOutput).toHaveBeenCalledTimes(8);
    
        for (let i = 0; i < 8; i++) {
          expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
            duration: 500 - sequencer.tickDuration,
            time: i * 500, // Every 500ms (quarter note at 120 BPM)
            type: 'note',
            message: { channel: 9, note: 36, velocity: 100 },
            trackId: 16,
          }));
        }
      });

      test('16/4 track plays note 36 at velocity 100 every quarter note but uses Max Duration', () => {
        sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            triggerSettings: {
                numbers: [15],
            }
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;

        runSequencer(4000, 100);

        // We expect 4 notes per second at 120 BPM, so 8 notes in 2 seconds
        expect(mockMidiOutput).toHaveBeenCalledTimes(32);
    
        for (let i = 0; i < 8; i++) {
          expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
            duration: 125,
            time: i * 125, // Every 500ms (quarter note at 120 BPM)
            type: 'note',
            message: { channel: 9, note: 36, velocity: 100 },
            trackId: 16,
          }));
        }
      });    

    test('16/4 track plays note 36 at velocity 100 every quarter note but with swing', () => {
        sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            triggerSettings: {
                numbers: [15],
            },
            swingAmount: 10,
            useMaxDuration: false,
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;

        runSequencer(4000, 100);

        // We expect 4 notes per second at 120 BPM, so 8 notes in 2 seconds
        expect(mockMidiOutput).toHaveBeenCalledTimes(32);
    
        for (let i = 0; i < 8; i++) {
            const expectedTime = i % 2 === 0 ? i * 125 : i * 125 + 12.5;


          expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
            duration: 125,
            time: expectedTime, // Every 500ms (quarter note at 120 BPM)
            type: 'note',
            message: { channel: 9, note: 36, velocity: 100 },
            trackId: 16,
          }));
        }
      });      


      test('16/4 track plays note 36 with velocity 100 every quarter note but with Groove', () => {
        const track = sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            triggerSettings: {
                numbers: [15],
            },
            groove: [
                { timeOffset: 10, velocityOffset: 5 },
                { timeOffset: -5, velocityOffset: -10 },
                { timeOffset: 0, velocityOffset: 0 },
                { timeOffset: 15, velocityOffset: 15 },
            ],
            useMaxDuration: false,
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;
    
        runSequencer(4000, 100);
    
        // We expect 4 notes per second at 120 BPM, so 32 notes in 2 seconds
        expect(mockMidiOutput).toHaveBeenCalledTimes(32);
    
        for (let i = 0; i < 32; i++) {
            const grooveStep = i % 4;
            const baseTime = i * 125;
            const expectedTime = baseTime + (125 * track.settings.groove[grooveStep].timeOffset / 100);
            const expectedVelocity = 100 + (100 * track.settings.groove[grooveStep].velocityOffset / 100);
    
            expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
                duration: 125,
                time: expectedTime,
                type: 'note',
                message: { 
                    channel: 9, 
                    note: 36, 
                    velocity: Math.round(expectedVelocity)
                },
                trackId: 16,
            }));
        }
    });
    
    test('4/4 track plays note 36 with a:b ratio of 1:2', () => {
        sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            triggerSettings: {
                numbers: [15], // This will give us 16 steps per bar
            },
            noteSeries: [{
                rootNote: 36,
                numberOfNotes: 1,
                inversion: 0,
                velocity: 100,
                pitchSpan: 0,
                velocitySpan: 0,
                probability: 100,
                aValue: 1,
                bValue: 2,
                arpMode: 0,
                spread: 0,
                playMultiplier: 1,
                wonkyArp: false
            }],
            useMaxDuration: false,
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;
    
        runSequencer(2000, 100); // Run for 2 seconds
    
        // At 120 BPM, with 16 steps per bar, and a 1:2 ratio,
        // we expect 4 notes per second, so 8 notes in 2 seconds
        expect(mockMidiOutput).toHaveBeenCalledTimes(8);
    
        const stepDuration = 125; // 16th note duration at 120 BPM
    
        for (let i = 0; i < 8; i++) {
            expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
                duration: stepDuration,
                time: i * stepDuration * 2, // Every other step
                type: 'note',
                message: { channel: 9, note: 36, velocity: 100 },
                trackId: 16,
            }));
        }
    
        // Check that there are no notes on the off-steps
        for (let i = 0; i < 8; i++) {
            const offStepTime = (i * 2 + 1) * stepDuration;
            expect(mockMidiOutput.mock.calls).not.toContainEqual([
                expect.objectContaining({
                    time: offStepTime,
                })
            ]);
        }
    });

    test('4/4 track alternates between two noteSeries with ratios 1:2 and 2:2', () => {
        sequencer.addTrack(createTrack({
            triggerType: TRIGGER_TYPES.BINARY,
            triggerSettings: {
                numbers: [15], // This will give us 16 steps per bar
            },
            noteSeries: [
                {
                    rootNote: 36,
                    numberOfNotes: 1,
                    inversion: 0,
                    velocity: 100,
                    pitchSpan: 0,
                    velocitySpan: 0,
                    probability: 100,
                    aValue: 1,
                    bValue: 2,
                    arpMode: 0,
                    spread: 0,
                    playMultiplier: 1,
                    wonkyArp: false
                },
                {
                    rootNote: 48,
                    numberOfNotes: 1,
                    inversion: 0,
                    velocity: 100,
                    pitchSpan: 0,
                    velocitySpan: 0,
                    probability: 100,
                    aValue: 2,
                    bValue: 2,
                    arpMode: 0,
                    spread: 0,
                    playMultiplier: 1,
                    wonkyArp: false
                }
            ],
            useMaxDuration: false,
        }));
    
        const mockMidiOutput = jest.fn();
        sequencer.midi.queueNoteEvent = mockMidiOutput;
    
        runSequencer(2000, 100); // Run for 1 second
    
        const stepDuration = 125; // 16th note duration at 120 BPM


        expect(mockMidiOutput).toHaveBeenCalledTimes(8); // 4 'one' notes and 4 'two' notes

        const timePattern = [0, 375, 500, 875];

        for (let i = 0; i < 8; i++) {
            const noteSeries = i % 2 === 0 ? 36 : 48;
            const timeIndex = i % 4;
            const cycleOffset = Math.floor(i / 4) * 1000; // Add 1000ms for each full cycle
        
            expect(mockMidiOutput).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
                duration: stepDuration,
                time: cycleOffset + timePattern[timeIndex],
                type: 'note',
                message: { channel: 9, note: noteSeries, velocity: 100 },
                trackId: 16,
            }));
        }
       
    });
  });