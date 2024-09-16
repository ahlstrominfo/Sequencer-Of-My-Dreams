# Sequencer of My Dreams

Sequencer of My Dreams is a powerful and flexible MIDI sequencer with a Terminal User Interface (TUI). This guide will walk you through all the features accessible via the TUI.

# Disclamier
It might work on your computer. 

I used AI to do a lot of the heavy lifting coding.

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

# Sequencer of My Dreams User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Main View](#main-view)
3. [Sequencer Settings](#sequencer-settings)
4. [Track Settings](#track-settings)
5. [Note Series](#note-series)
6. [Trigger Patterns](#trigger-patterns)
   - [Euclidean Pattern](#euclidean-pattern)
   - [Binary Pattern](#binary-pattern)
   - [Step Pattern](#step-pattern)
7. [Groove Settings](#groove-settings)
8. [Chord Progression](#chord-progression)
9. [Song Mode](#song-mode)
10. [Saving and Loading Sequences](#saving-and-loading-sequences)

## Introduction

Welcome to the Sequencer of My Dreams! This manual will guide you through the various features and settings available in the user interface. The sequencer is designed to be highly customizable, allowing you to create complex and evolving musical patterns.

## Main View

The main view provides an overview of all tracks and global sequencer controls.

- **BPM**: Adjust the tempo of the sequencer.
- **Play/Stop**: Toggle between playing and stopping the sequencer.
- **Track Labels**: Each track is represented by a label (0-9, a-f).
- **Active Notes**: Shows which tracks currently have active notes.
- **Active Tracks**: Toggle tracks on/off.
- **Volume**: Adjust the volume for each track.
- **Active States**: Switch between different active states for more complex arrangements.
- **Progression Change**: Change the current progression in real-time.

## Sequencer Settings

Access these settings by selecting 'S' in the main view.

- **BPM**: Adjust the global tempo.
- **State**: Start or stop the sequencer.
- **Chord Progression**: Access the chord progression manager.
- **Song Mode**: Toggle and manage song mode.
- **Save Sequence**: Save the current sequence.
- **Load Sequence**: Load a previously saved sequence.
- **New Sequence**: Start a new, blank sequence.

## Track Settings

Access these settings by selecting a track label in the main view.

- **Trigger Type**: Choose between Euclidean, Binary, or Step trigger patterns.
- **Number of Note Series**: View and edit note series.
- **Conform Notes**: Toggle whether notes should conform to the current scale.
- **Tie Note Series to Pattern**: Link note series progression to the trigger pattern.
- **Speed Multiplier**: Adjust the speed of the track relative to the global tempo.
- **Probability**: Set the likelihood of a note being played when triggered.
- **Resync Interval**: Set how often the track resyncs with the global clock.
- **Swing Amount**: Add swing feel to the track.
- **Grooves**: Access groove settings for micro-timing adjustments.
- **Use Max Duration**: Toggle whether to use a maximum note duration.
- **Max Duration Factor**: Set the maximum duration as a factor of the note's original length.
- **Play Order**: Choose how notes are selected from the note series.
- **Arp Mode**: Select an arpeggiator mode for the track.
- **Play Multiplier**: Adjust how many notes are played per trigger.
- **Wonky Arp**: Toggle a more unpredictable arpeggiator behavior.
- **Channel**: Set the MIDI channel for the track.
- **Volume**: Adjust the track's volume.
- **Active**: Toggle the track on/off.

## Note Series

Each track can have multiple note series. Access this view from the Track Settings.

- **Note**: Set the root note of the series.
- **Number of Notes**: Set how many notes are in the series.
- **Spread**: Adjust the interval between notes.
- **Inversion**: Set the inversion of the chord.
- **Velocity**: Set the base velocity of the notes.
- **Velocity Span**: Add variety to note velocities.
- **Pitch Span**: Add slight pitch variations to notes.
- **Probability**: Set the likelihood of this series being selected.
- **A:B Ratio**: Adjust the timing ratio for rhythm variations.
- **Arp Mode**: Set a specific arpeggiator mode for this series.
- **Play Multiplier**: Set how many notes are played from this series per trigger.
- **Wonky Arp**: Toggle unpredictable arpeggiator behavior for this series.
- **Use Max Duration**: Toggle maximum note duration for this series.
- **Max Duration Factor**: Set the maximum duration factor for this series.

## Trigger Patterns

### Euclidean Pattern

- **Length**: Set the total length of the pattern.
- **Hits**: Set the number of triggers within the pattern.
- **Shift**: Rotate the pattern by a number of steps.

### Binary Pattern

- Define a series of binary numbers to create complex rhythmic patterns.
- Each number in the series represents a rhythmic subdivision.

### Step Pattern

- Manually set which steps in the sequence should trigger notes.

## Groove Settings

Access groove settings from the Track Settings.

- **Time Offset**: Adjust the timing of notes forward or backward.
- **Velocity Offset**: Increase or decrease the velocity of notes at specific points.
- **Apply Groove**: Choose from preset grooves or create your own.

## Chord Progression

Manage chord progressions in the sequencer settings.

- **Current Progression**: Select the active progression.
- **Progression Group**: Create multiple progression groups.
- **Bars**: Set how many bars each chord lasts.
- **Beats**: Fine-tune chord duration with beats.
- **Key**: Set the key of the chord.
- **Scale**: Choose the scale for the chord.
- **Transposition**: Transpose the entire progression.

## Song Mode

Create longer form compositions by chaining different sections.

- **Progression**: Choose which progression to use for each part.
- **Bars**: Set the duration of each part in bars.
- **Active State**: Choose which combination of active tracks to use for each part.

## Saving and Loading Sequences

- **Save Sequence**: Save your current setup with all track and global settings.
- **Save Sequence (as new)**: Create a new save file instead of overwriting.
- **Load Sequence**: Choose from previously saved sequences to load.
- **New Sequence**: Start fresh with a blank sequence.

Remember, you can always use the escape key to go back to the previous menu, and enter to select or modify a setting. Experiment with different combinations of settings to create unique and evolving sequences!
