/* eslint-disable no-undef */
const {ARP_MODES} = require("../src/utils/arps");
const {TRIGGER_TYPES} = require("../src/patterns/triggerPatterns");

const generateTestCases = () => [
    {
      name: "4/4 track plays every quarter note",
      track: {
        triggerType: TRIGGER_TYPES.BINARY,
        triggerSettings: {
          numbers: [8],
          length: 16,
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
            bValue: 1,
            arpMode: 16,
            spread: 0,
            playMultiplier: 1,
            wonkyArp: false
        }],
      },
      nrNotes: 8,
      notes: Array(8).fill(36),
      expectedTimes: Array(8).fill().map((_, i) => i * 500),
    },
    {
      name: "16/4 track plays every 16th note",
      track: {
        triggerType: TRIGGER_TYPES.BINARY,
        triggerSettings: {
          numbers: [15],
          length: 16,
        },
        noteSeries: [{
          rootNote: 48,
          numberOfNotes: 1,
          aValue:1,
          bValue: 1,
        }],
      },
      nrNotes: 32,
      notes: Array(32).fill(48),
      expectedTimes: Array(32).fill().map((_, i) => i * 125),
    },
    {
      name: "4/4 track with a:b ratio of 1:2",
      track: {
        triggerType: TRIGGER_TYPES.BINARY,
        triggerSettings: {
          numbers: [15],
          length: 16,
        },
        noteSeries: [{
          rootNote: 60,
          numberOfNotes: 1,
          aValue: 1,
          bValue: 2,
        }],
      },
      nrNotes: 16,
      notes: Array(16).fill(60),
      expectedTimes: Array(16).fill().map((_, i) => i * 250),
    },
    {
      name: "4/4 track alternating between two notes",
      track: {
        triggerType: TRIGGER_TYPES.BINARY,
        triggerSettings: {
          numbers: [15],
          length: 16,
        },
        noteSeries: [
          { rootNote: 36, numberOfNotes: 1 },
          { rootNote: 48, numberOfNotes: 1 },
        ],
      },
      nrNotes: 32,
      notes: Array(32).fill().map((_, i) => i % 2 === 0 ? 36 : 48),
      expectedTimes: Array(32).fill().map((_, i) => i * 125),
    },
    {
        name: "4/4 track alternating between two notes and ab ratio 1:2 on the first note",
        track: {
          triggerType: TRIGGER_TYPES.BINARY,
          triggerSettings: {
            numbers: [15],
            length: 16,
          },
          noteSeries: [
            { rootNote: 36, numberOfNotes: 1, aValue: 1, bValue: 2},
            { rootNote: 48, numberOfNotes: 1 },
          ],
          speedMultiplier: 0.5,
        },
        nrNotes: 12,
        notes: [36,48,48,36,48,48,36,48,48,36,48,48],
        expectedTimes: [0, 250, 750, 1000, 1250, 1750, 2000, 2250, 2750, 3000, 3250, 3750],
      },
      {
        name: "4/4 track with arpeggiator settings",
        track: {
          triggerType: TRIGGER_TYPES.BINARY,
          triggerSettings: {
            numbers: [8],
          },
          noteSeries: [{
            rootNote: 60,
            numberOfNotes: 3,
            velocity: 100,
          }],
            speedMultiplier: 1,
            playMultiplier: 1,
          arpMode: ARP_MODES.UP,
          useMaxDuration: true,
          wonkyArp: true,
        },
        nrNotes: 24,  // 16 steps * 3 notes per step
        notes: [60, 62, 64, 60, 62, 64, 60, 62, 64, 60, 62, 64, 60, 62, 64, 60, 62, 64, 60, 62, 64, 60, 62, 64, ],
        expectedTimes: Array(48).fill().map((_, i) => i * (125*4/3)),
      },
      {
        name: "4/4 track alternating between chord and wonky arp",
        track: {
          triggerType: TRIGGER_TYPES.BINARY,
          triggerSettings: {
            numbers: [8],
          },
          noteSeries: [
            {
              rootNote: 60,
              numberOfNotes: 3,
              velocity: 100,
            },
            {
              rootNote: 60,
              numberOfNotes: 3,
              velocity: 100,
              arpMode: ARP_MODES.UP,
              wonkyArp: true,
            }
          ],
          useMaxDuration: true,
          wonkyArp: false,
        },
        nrNotes: 24,  // 4 chords (12 notes) + 4 wonky arps (12 notes)
        notes: [
          // Alternating pattern repeated 4 times
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
          60, 62, 64, 
        ],
        expectedTimes: [
          // First iteration
          0, 0, 0,  // chord
          500, 666.6667, 833.3333,  // wonky arp
          // Second iteration
          1000, 1000, 1000,  // chord
          1500, 1666.6667, 1833.3333,  // wonky arp
          // Third iteration
          2000, 2000, 2000,  // chord
          2500, 2666.6667, 2833.3333,  // wonky arp
          // Fourth iteration
          3000, 3000, 3000,  // chord
          3500, 3666.6667, 3833.3333,  // wonky arp
        ],
      },
      {
        name: "4/4 track alternating between chord and wonky arp",
        track:     {
          "channel": 1,
          "steps": 16,
          "noteSeries": [
            {
              "rootNote": 60,
              "numberOfNotes": 1,
              "inversion": 0,
              "velocity": 80,
              "pitchSpan": 0,
              "velocitySpan": 0,
              "probability": 100,
              "aValue": 1,
              "bValue": 1,
              "arpMode": 16,
              "spread": 0,
              "playMultiplier": 1,
              "wonkyArp": false
            },
            {
              "rootNote": 60,
              "numberOfNotes": 3,
              "inversion": 0,
              "velocity": 100,
              "pitchSpan": 0,
              "velocitySpan": 0,
              "probability": 100,
              "aValue": 1,
              "bValue": 1,
              "arpMode": 9,
              "spread": 0,
              "playMultiplier": 0.5,
              "wonkyArp": false
            }
          ],
          "triggerType": 1,
          "triggerSettings": {
            "numbers": [
              8,
              8
            ],
            "length": 16,
            "hits": 4,
            "shift": 0,
            "steps": []
          },
          "groove": [],
          "grooveName": "Steady",
          "resyncInterval": 0,
          "speedMultiplier": 1,
          "swingAmount": 0,
          "playOrder": 0,
          "probability": 100,
          "conformNotes": true,
          "arpMode": 0,
          "wonkyArp": false,
          "playMultiplier": 1,
          "useMaxDuration": true,
          "maxDurationFactor": 1,
          "isActive": true,
          "volume": 100,
          "tieNoteSeriestoPattern": false
        },
        nrNotes: 28, 
        notes: [
          60,
          60, 62, 64,
          60, 62, 64, 
          60,
          60, 62, 64,
          60, 62, 64, 
          60,
          60, 62, 64,
          60, 62, 64, 
          60,
          60, 62, 64,
          60, 62, 64,
        ],
        expectedTimes: [
          0,
          500, 500, 500,
          750, 750, 750,
          1000,
          1500, 1500, 1500,
          1750, 1750, 1750,
          2000,
          2500, 2500, 2500,
          2750, 2750, 2750,
          3000,
          3500, 3500, 3500,
          3750, 3750, 3750,
        ],
      }      
  ];
  
// 

/*

*/


  module.exports = generateTestCases;