class SequenceScheduler {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.scheduledEvents = [];

        this.lastPositionHandeled = 0;
        
    }

    scheduleEvent(bar, beat, callback, data = {}) {
        this.scheduledEvents.push({ bar, beat, callback, data});
        this.sortEvents();
    }

    scheduleNextBar(callback, data = {}) {
        const nextBar = this.sequencer.ticker.getPosition().bar + 1;
        this.scheduleEvent(nextBar, 0, callback, data);
    }

    processEvents() {
        const currentPosition = this.sequencer.ticker.getPosition();
        if (this.lastPositionHandeled === currentPosition.pulse) return;
        const currentBar = currentPosition.bar;
        const currentBeat = currentPosition.beat;

        while (this.scheduledEvents.length > 0 &&
               (this.scheduledEvents[0].bar < currentBar ||
               (this.scheduledEvents[0].bar === currentBar && this.scheduledEvents[0].beat <= currentBeat))) {
            const event = this.scheduledEvents.shift();
            event.callback();
        }
        this.lastPositionHandeled = currentPosition.pulse;
    }

    sortEvents() {
        this.scheduledEvents.sort((a, b) => {
            if (a.bar !== b.bar) return a.bar - b.bar;
            return a.beat - b.beat;
        });
    }

    clearEvents() {
        this.scheduledEvents = [];
    }
}

module.exports = SequenceScheduler;