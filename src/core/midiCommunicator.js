const easymidi = require('easymidi');

class MidiCommunicator {
    constructor(sequencer, outputName = 'Sequencer of my dreams') {
        this.sequencer = sequencer;
        this.output = new easymidi.Output(outputName, true);
    }

    sendClock() {
        this.output.send('clock');
    }

    close() {
        this.output.close();
    }
}

module.exports = MidiCommunicator;