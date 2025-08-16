# Sequencer of My Dreams

Sequencer of My Dreams is a powerful and flexible MIDI sequencer with a Terminal User Interface (TUI). This guide will walk you through all the features accessible via the TUI.

# Disclaimer
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
npm start
```

Or alternatively:

```
node src/app.js
```

## After you've started it...

... it will show up in your local DAW.

# Sequencer of My Dreams User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Main View](#main-view)
3. [Keyboard Shortcuts](#keyboard-shortcuts)
4. [Sequencer Settings](#sequencer-settings)
5. [Track Settings](#track-settings)
6. [Track Editing](#track-editing)
7. [Note Series](#note-series)
8. [Trigger Patterns](#trigger-patterns)
   - [Euclidean Pattern](#euclidean-pattern)
   - [Binary Pattern](#binary-pattern)
   - [Step Pattern](#step-pattern)
9. [Groove Settings](#groove-settings)
10. [Chord Progression](#chord-progression)
11. [Song Mode](#song-mode)
12. [Templates](#templates)
13. [Randomizer](#randomizer)
14. [Saving and Loading Sequences](#saving-and-loading-sequences)

## Introduction

Welcome to the Sequencer of My Dreams! This manual will guide you through the various features and settings available in the user interface. The sequencer is designed to be highly customizable, allowing you to create complex and evolving musical patterns.

## Getting Started Tutorial

Here's a quick tutorial to get you making music right away:

### Step 1: Start the Sequencer
```bash
npm start
```

### Step 2: Basic Playback
- Press **Space** to start/stop playback
- You should hear a basic pattern playing through your DAW

### Step 3: Try a Template
- Press **S** to enter Sequencer Settings
- Select **Load Template**
- Choose **house** or **techno** for an immediate musical experience
- Press **Escape** to return to the main view
- Press **Space** to hear your template

### Step 4: Edit a Track
- Press **0** (zero) to edit Track 0
- Try changing the **Speed Multiplier** (use arrow keys to adjust)
- Press **Escape** to return to main view and hear the changes

### Step 5: Change the Pattern
- Press **0** again to edit Track 0
- Select **Trigger Type** and change it to **euclidean**
- Press **Enter** to access the Euclidean Pattern editor
- Adjust **Hits** and **Length** to create different rhythms
- Press **Escape** twice to return to main view

### Step 6: Active States
- In the main view, try pressing **1**, **2**, **3** etc. to switch between different track combinations
- This lets you create verse/chorus arrangements

### Step 7: BPM and Global Controls
- Adjust **BPM** in the main view to change tempo
- Try the **Randomizer** (Sequencer Settings → Randomizer) for instant inspiration

That's it! You're now ready to explore the full feature set described below.

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
- **Track Selection**: Press number keys (0-9) or letter keys (a-f) to directly select and edit tracks.

## Keyboard Shortcuts

The sequencer includes several convenient keyboard shortcuts:

- **Space Bar**: Toggle play/pause from anywhere in the interface
- **0-9, a-f**: Direct track selection and editing from the main view
- **Escape**: Return to previous menu/view
- **Enter**: Select or modify the current setting
- **Arrow Keys**: Navigate through menus and adjust values

## Sequencer Settings

Access these settings by selecting 'S' in the main view.

- **BPM**: Adjust the global tempo.
- **State**: Start or stop the sequencer.
- **Chord Progression**: Access the chord progression manager.
- **Song Mode**: Toggle and manage song mode.
- **Save Sequence**: Save the current sequence.
- **Load Sequence**: Load a previously saved sequence.
- **Load Template**: Load pre-built musical templates (house, techno, hip-hop, etc.)
- **Randomizer**: Generate random track configurations using AI-powered style detection
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
- **Track Edit**: Access advanced track editing options including copy, clear, and duplication functions.

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

## Track Editing

Access the track editing menu from Track Settings for advanced track manipulation:

- **Clear**: Reset the current track to default settings
- **Copy Track**: Copy all settings from the current track to another track
- **Duplicate**: Create an exact copy of the current track
- **Track Operations**: Advanced track management and manipulation tools

## Templates

The sequencer includes pre-built musical templates to get you started quickly:

- **House**: Classic house music patterns and progressions
- **Melodic House**: More melodic and atmospheric house variations
- **Techno**: Driving techno rhythms and bass patterns
- **Hip-Hop**: Hip-hop drum patterns and musical elements
- **Pop**: Pop music structures and chord progressions
- **Glass**: Minimalist, glass-like repetitive patterns (inspired by Steve Reich/Philip Glass)
- **Eno**: Ambient and generative music patterns (inspired by Brian Eno)

Access templates through Sequencer Settings → Load Template.

## Randomizer

The AI-powered randomizer can generate new track configurations automatically:

- **Random Style**: Generate a completely random track using any musical style
- **Genre-Specific**: Choose from specific musical genres for more targeted randomization
- **Smart Generation**: Uses pattern analysis to create musically coherent random tracks
- **Instant Creativity**: Perfect for breaking creative blocks or exploring new musical ideas

Access the randomizer through Sequencer Settings → Randomizer.

## Saving and Loading Sequences

- **Save Sequence**: Save your current setup with all track and global settings.
- **Save Sequence (as new)**: Create a new save file instead of overwriting.
- **Load Sequence**: Choose from previously saved sequences to load.
- **New Sequence**: Start fresh with a blank sequence.

Remember, you can always use the escape key to go back to the previous menu, and enter to select or modify a setting. Experiment with different combinations of settings to create unique and evolving sequences!
