class SequenceScheduler {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.scheduledEvents = [];
        this.lastPositionHandeled = 0;
        
        // Event ordering improvements
        this.eventCounter = 0;
    }

    scheduleEvent(bar, beat, callback, data = {}) {
        // Add stable ordering for events at same bar/beat
        this.scheduledEvents.push({ 
            bar, 
            beat, 
            callback, 
            data,
            eventId: ++this.eventCounter, // Ensure deterministic ordering
            scheduledAt: Date.now()
        });
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
        let processedCount = 0;
        const maxEventsPerBeat = 50; // Prevent runaway event processing

        while (this.scheduledEvents.length > 0 &&
               (this.scheduledEvents[0].bar < currentBar ||
               (this.scheduledEvents[0].bar === currentBar && this.scheduledEvents[0].beat <= currentBeat)) &&
               processedCount < maxEventsPerBeat) {
            
            const event = this.scheduledEvents.shift();
            
            try {
                event.callback();
            } catch (error) {
                this.sequencer.logger.log(`Error processing scheduled sequence event: ${error.message}`);
            }
            
            processedCount++;
        }
        
        if (processedCount >= maxEventsPerBeat && this.scheduledEvents.length > 0) {
            this.sequencer.logger.log(`Sequence event processing limit reached, ${this.scheduledEvents.length} events remaining`);
        }
        
        this.lastPositionHandeled = currentPosition.pulse;
    }

    sortEvents() {
        this.scheduledEvents.sort((a, b) => {
            if (a.bar !== b.bar) return a.bar - b.bar;
            if (a.beat !== b.beat) return a.beat - b.beat;
            // For same bar/beat, maintain insertion order via eventId
            return a.eventId - b.eventId;
        });
    }

    clearEvents() {
        this.scheduledEvents = [];
        this.eventCounter = 0;
    }

    // Performance monitoring
    getStats() {
        return {
            scheduledEventsCount: this.scheduledEvents.length,
            eventCounter: this.eventCounter,
            lastPositionHandeled: this.lastPositionHandeled
        };
    }
}

module.exports = SequenceScheduler;