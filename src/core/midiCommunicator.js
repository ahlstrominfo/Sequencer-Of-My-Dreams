const easymidi = require('easymidi');

class MidiCommunicator {
    constructor(sequencer, outputName = 'Sequencer of my dreams') {
        this.sequencer = sequencer;
        this.output = new easymidi.Output(outputName, true);
    }

    sendClock() {
        this.output.send('clock');
    }

    sendStart() {
        this.output.send('start');
    }

    sendSongPosition(position) {
        position = Math.min(position, 16383);

        this.output.send('position', {
            value: position
        });
    }

    close() {
        this.output.close();
    }
}

module.exports = MidiCommunicator;