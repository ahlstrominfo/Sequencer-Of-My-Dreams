const easymidi = require('easymidi');

class MidiCommunicator {
    constructor(sequencer, outputName = 'Sequencer of my dreams') {
        this.sequencer = sequencer;
        this.output = new easymidi.Output(outputName, true);
        this.eventQueue = [];
        this.activeNotes = new Map(); // Map of trackId to Set of active notes
        this.clockCount = 0;
        this.lastSentPosition = -1;  // To track the last sent position
    }

    queueNoteEvent(event) {
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => a.time - b.time);   
    }

    processEventQueue(currentTime) {
        while (this.eventQueue.length > 0 && this.eventQueue[0].time <= currentTime) {
            const event = this.eventQueue.shift();
            
            if (event.type === 'note') {
                if (event.conformNotes) {
                    event.message.note = this.sequencer.conformNoteToScale(event.message.note);
                }
                this.sendMidiMessage({ type: 'noteon', message: event.message });
                this.eventQueue = this.eventQueue.filter(e => !(e.type === 'noteoff' 
                    && e.message.note === event.message.note 
                    && e.message.channel === event.message.channel)); 

                this.queueNoteEvent({
                    type: 'noteoff',
                    message: event.message,
                    time: currentTime + event.duration - 1 // just remove a ms to avoid overlapping notes
                });
            } else if (event.type === 'noteoff') {
                this.sendMidiMessage(event);
            }
        }
    }

    sendMidiMessage(event) {
        this.output.send(event.type, event.message);
        
        if (event.type === 'noteon') {
            if (!this.activeNotes.has(event.message.channel)) {
                this.activeNotes.set(event.message.channel, new Set());
            }
            this.activeNotes.get(event.message.channel).add(event.message.note);
        } else if (event.type === 'noteoff') {
            if (this.activeNotes.has(event.message.channel)) {
                this.activeNotes.get(event.message.channel).delete(event.message.note);
            }
        }
    }

    stopAllNotesForTrack(trackId) {
        if (this.activeNotes.has(trackId)) {
          for (const note of this.activeNotes.get(trackId)) {
            this.output.send('noteoff', {
              channel: trackId,
              note: note,
              velocity: 0
            });
          }
          this.activeNotes.get(trackId).clear();
        }
    }

    sendSongPositionPointer() {
        const midiBeats = this.sequencer.clock.getMidiBeats();
        if (midiBeats !== this.lastSentPosition) {
            this.output.send('position', { value: midiBeats });
            this.lastSentPosition = midiBeats;
        }
    }

    sendClock() {
        this.output.send('clock');
        this.clockCount++;
    }

    sendStart() {
        this.sendSongPositionPointer();
        this.output.send('start');
    }

    sendStop() {
        this.sendSongPositionPointer();
        this.output.send('stop');
    }

    stopAllActiveNotes() {
        for (const [trackId, notes] of this.activeNotes) {
            for (const note of notes) {
                this.output.send('noteoff', {
                    channel: trackId,
                    note: note,
                    velocity: 0
                });
            }
            notes.clear();
        }
    }

    close() {
        this.output.close();
    }
}

module.exports = MidiCommunicator;