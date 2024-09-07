# Sequencer of My Dreams

Sequencer of My Dreams is a powerful and flexible MIDI sequencer with a Terminal User Interface (TUI). This guide will walk you through all the features accessible via the TUI.

# Disclamier
It might work on your computer. 

I used AI to do a lot of the heavy lifting coding.

## Table of Contents

1. [Installation](#installation)
2. [Starting the Sequencer](#starting-the-sequencer)
3. [Navigation](#navigation)
4. [Main View](#main-view)
5. [Sequencer Settings](#sequencer-settings)
6. [Track View](#track-view)
7. [Trigger Patterns](#trigger-patterns)
   - [Binary Pattern](#binary-pattern)
   - [Euclidean Pattern](#euclidean-pattern)
   - [Step Pattern](#step-pattern)
8. [Note Series](#note-series)
9. [Groove Settings](#groove-settings)
10. [Chord Progression](#chord-progression)
11. [Saving and Loading Sequences](#saving-and-loading-sequences)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/ahlstrominfo/sequencer-of-my-dreams.git
   ```
2. Navigate to the project directory:
   ```
   cd sequencer-of-my-dreams
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Starting the Sequencer

To start the sequencer, run:

```
node src/app.js
```

## After you've started it...

... it will show up in your local DAW.

## Navigation

- Use arrow keys to navigate between options
- Press Enter to select or edit a value
- Use Left/Right arrow keys to adjust values when editing
- Press Escape to go back or exit edit mode

## Main View

The main view displays an overview of all tracks:

```
Sequencer Of My Dreams > > > >

0 1 2 3 4 5 6 7 8 9 a b c d e f S
□ □ □ □ □ □ □ □ □ □ □ □ □ □ □ □ ♥
■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ▶
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
■ □ □ □ □ □ □ □ □ □ □ □ □ □ □ □
```

- Top row: Track labels (0-f) and Sequencer Settings (S)
- Second row: Active notes indicator
- Third row: Track active/mute status and play/stop button
- Fourth row: Volume indicators
- Bottom row: Active states

- Select a track to enter Track View
- Select 'S' to enter Sequencer Settings
- Press Enter on the play/stop button (▶/■) to toggle playback

## Sequencer Settings

Access global sequencer settings:

- BPM: Adjust the tempo
- State: Toggle between Playing and Stopped
- Chord Progression: Enter the Chord Progression view
- Save Sequence: Save the current sequence
- Load Sequence: Load a saved sequence
- New Sequence: Start a new sequence

## Track View

Displays and allows editing of all settings for a specific track:

- Trigger Type: Choose between Init, Binary, Euclidean, and Step patterns
- Swing Amount: Add swing to the track
- Groove Settings: Enter the Groove Settings view
- Note Series: Enter the Note Series view
- Conform Notes: Toggle whether notes should conform to the current scale
- Tie NoteSeries to Pattern: Link note series to the trigger pattern
- Play Order: Set the order of note playback (Forward, Backward, Random, Random Adjacent)
- Arp Mode: Choose the arpeggiator mode
- Wonky Arp: Toggle "wonky" arpeggiation
- Probability: Set the likelihood of a note triggering
- Speed Multiplier: Adjust the speed of the track relative to the main tempo
- Play Multiplier: Control the rate of note playback within the track
- Use Max Duration: Toggle whether to use the maximum note duration
- Max Duration Factor: Set the factor for maximum note duration
- Resync Interval: Set how often the track should resync with the main clock
- Channel: Set the MIDI channel for the track
- Volume: Adjust the track volume
- Active: Toggle the track on/off

## Trigger Patterns

### Binary Pattern

Define a pattern using a series of 4-bit numbers:

```
Binary Pattern
------------------
1: 15 ■■■■ Delete
2: 9  ■□□■ Delete
3: 6  □■■□ Delete
4: 3  □□■■ Delete
Add new number
```

- Each number represents 4 steps in the sequence
- ■ indicates a trigger, □ indicates no trigger

### Euclidean Pattern

Create rhythmic patterns by evenly distributing hits over a length:

```
Trigger Settings
Length: 16 Hits: 4 Shift: 0
■□□□■□□□■□□□■□□□
```

- Length: Total steps in the pattern
- Hits: Number of triggers
- Shift: Rotate the pattern

### Step Pattern

Manually define which steps in the sequence should trigger:

```
Step Pattern
------------------
Steps 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16
      ■ □ □ □ ■ □ □ □ ■  □  □  □  ■  □  □  □
```

- ■ indicates a trigger, □ indicates no trigger

## Note Series

Define a series of notes to be played by the track:

```
Note Series
------------------
Note | NrNotes | Inv | Vel   | VSpn | PSpn | Prob  | A:B   | Arp           | Play Mult | Wonky Arp | Delete
-----------------------------------------------------------------------------------------------------------
<60> | 3       | 0   | 100   | 0    | 0    | 100   | 1:1   | Use Track     | 1         | No        | Delete
70   | 5       | 0   | 100   | 0    | 0    | 100   | 1:1   | Diverge       | 1         | No        | Delete
70   | 5       | 0   | 87    | 0    | 0    | 100   | 1:1   | Off           | 1         | No        | Delete
60   | 5       | 0   | 100   | 0    | 0    | 100   | 1:1   | Up-Down (Inc) | 2         | No        | Delete
60   | 3       | -2  | 100   | 0    | 0    | 100   | 1:1   | Up            | 1         | Yes       | Delete
```

- Note: Root note (MIDI note number)
- NrNotes: Number of notes in the chord
- Inv: Inversion of the chord
- Vel: Velocity
- VSpn: Velocity span (randomization)
- PSpn: Pitch span (randomization)
- Prob: Probability of playing
- A:B: Rhythm pattern (e.g., 1:2 means play every other time)
- Arp: Arpeggiator mode for this note series
- Play Mult: Playback speed multiplier
- Wonky Arp: Toggle "wonky" arpeggiation for this note series

## Groove Settings

Add feel to your sequences with groove patterns:

```
Groove Settings
------------------
1:  Time: 10 Velocity: 5  Delete
2:  Time: -5 Velocity: -10 Delete
3:  Time: 0  Velocity: 0   Delete
4:  Time: 5  Velocity: 10  Delete
Add new groove step
------------------
Apply Groove: Swing
```

- Time: Offset the timing of the step (positive or negative)
- Velocity: Adjust the velocity of the step (positive or negative)
- Apply Groove: Choose from preset groove patterns

## Chord Progression

Define a chord progression to automatically change scales and transpositions:

```
Progression
------------------
1:  Bars: 4 Scale: Major Transposition: 0  Delete
2:  Bars: 2 Scale: Mixolydian Transposition: 7  Delete
3:  Bars: 2 Scale: Minor Transposition: 9  Delete
Add new progression step
```

- Bars: Number of bars to play this chord
- Scale: The scale to use
- Transposition: Semitones to transpose the scale

## Saving and Loading Sequences

- In Sequencer Settings, choose 'Save Sequence' to save your work
- Choose 'Load Sequence' to see a list of saved sequences and load one