const RealTimeKeeper = require('./realTimeKeeper');

class Ticker {
    constructor(bpm = 120, timeSignature = [4, 4], sequencer) {
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.isRunning = false;
        this.currentPulse = 0;
        this.listeners = new Map();
        this.listenerIdCounter = 0;
        this.scheduledEvents = [];
        this.pulsesPerBeat = 24;
        this.pulsesPerSixteenth = 6; // or 24 pleeeeese    
        this.sixteenthsPerBeat = 4;
        this.pulsesPerBeat = this.pulsesPerSixteenth * this.sixteenthsPerBeat;
        this.timeKeeper = new RealTimeKeeper();
        this.lastPulseTime = 0;

        this.postionFromPulseData = new Set();

        this.positionCache = new Map();

        this.lastPosition = 0;
        this.lastPositionData = null;
    
        this.pulseInterval = this.calculatePulseInterval();

        this.sequencer = sequencer;

        // Timing precision improvements
        this.startTime = 0;
        this.expectedPulseTime = 0;
        this.timingDrift = 0;
        this.maxTimingDrift = 5; // Maximum acceptable drift in milliseconds
        
        // Event ordering improvements
        this.eventCounter = 0; // For stable sorting when events have same pulse
        this.sortedEventCache = new Map(); // Cache sorted events by pulse
        this.lastSortedPulse = -1;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = this.timeKeeper.getCurrentTime();
            this.lastPulseTime = this.startTime;
            this.expectedPulseTime = this.startTime;
            this.currentPulse = 0;
            this.timingDrift = 0;
            
            // Reset event ordering counter
            this.eventCounter = 0;
            this.sortedEventCache.clear();
            this.lastSortedPulse = -1;
            
            // Send initial plan message for beat 0
            this.notifyListeners('plan', {
                planStartPulse: 0,
                planEndPulse: this.pulsesPerBeat,
            });
            
            this.pulse();
        }
    }

    stop() {
        this.isRunning = false;
        this.reset();
    }

    reset() {
        this.sendAllNoteOffEvents();
        this.currentPulse = 0;
        this.scheduledEvents = [];
        
        // Reset timing precision tracking
        this.startTime = 0;
        this.expectedPulseTime = 0;
        this.timingDrift = 0;
        this.eventCounter = 0;
        this.sortedEventCache.clear();
        this.lastSortedPulse = -1;
        
        this.notifyListeners('reset');
    }

    setPosition(bar, beat, sixteenth, pulse) {
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        this.currentPulse = (bar * pulsesPerBar) +
                            (beat * this.pulsesPerBeat) +
                            (sixteenth * this.pulsesPerSixteenth) +
                            pulse;
    }

    setBPM(bpm) {
        const oldBpm = this.bpm;
        this.bpm = bpm;
        this.pulseInterval = this.calculatePulseInterval();
        
        // If ticker is running, adjust timing to maintain sync
        if (this.isRunning) {
            const currentTime = this.timeKeeper.getCurrentTime();
            
            // Adjust start time to maintain phase alignment
            this.startTime = currentTime - (this.currentPulse * this.pulseInterval);
            this.expectedPulseTime = this.startTime + (this.currentPulse * this.pulseInterval);
            
            this.sequencer.logger.log(`BPM changed from ${oldBpm} to ${bpm}, adjusted timing`);
        }
    }

    setTimeSignature(numerator, denominator) {
        this.timeSignature = [numerator, denominator];
    }

    registerListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Map());
        }
        const id = this.generateListenerId();
        this.listeners.get(type).set(id, callback);
        return id;
    }

    unregisterListener(type, id) {
        if (this.listeners.has(type)) {
            return this.listeners.get(type).delete(id);
        }
        return false;
    }

    generateListenerId() {
        return `listener_${++this.listenerIdCounter}`;
    }

    scheduleEvent(pulse, callback, data = {}) {
        if (pulse < this.currentPulse) {
            this.sequencer.logger.log('Attempted to schedule an event in the past. Event will not be scheduled.');
            return;
        }

        // Add event with ordering information for stable sorting
        this.scheduledEvents.push({
            pulse: pulse,
            callback,
            data,
            eventId: ++this.eventCounter, // Ensures stable sort order for same-pulse events
            scheduledAt: this.timeKeeper.getCurrentTime() // Track when event was scheduled
        });

        // Invalidate cache if we're adding events before or at the last sorted pulse
        if (pulse <= this.lastSortedPulse) {
            this.sortedEventCache.clear();
            this.lastSortedPulse = -1;
        }

        // Sort events by pulse, then by eventId for deterministic ordering
        this.scheduledEvents.sort((a, b) => {
            if (a.pulse !== b.pulse) {
                return a.pulse - b.pulse;
            }
            // For same pulse, maintain insertion order via eventId
            return a.eventId - b.eventId;
        });
    }

    processScheduledEvents() {
        let processedCount = 0;
        const maxEventsPerPulse = 100; // Prevent infinite loops with too many events
        
        while (this.scheduledEvents.length > 0 && 
               this.scheduledEvents[0].pulse <= this.currentPulse &&
               processedCount < maxEventsPerPulse) {
            
            const event = this.scheduledEvents.shift();
            
            try {
                // Call event callback with position and timing information
                const eventPosition = this.getPositionFromPulse(event.pulse);
                eventPosition.eventId = event.eventId;
                eventPosition.scheduledAt = event.scheduledAt;
                
                event.callback(eventPosition);
                
                // Notify listeners that an event occurred
                this.notifyListeners('eventHappening', {
                    ...event,
                    processedAt: this.timeKeeper.getCurrentTime(),
                    position: eventPosition
                });
                
            } catch (error) {
                this.sequencer.logger.log(`Error processing scheduled event: ${error.message}`);
            }
            
            processedCount++;
        }
        
        // Log if we hit the event limit
        if (processedCount >= maxEventsPerPulse && this.scheduledEvents.length > 0) {
            this.sequencer.logger.log(`Event processing limit reached (${maxEventsPerPulse}), ${this.scheduledEvents.length} events remaining`);
        }
        
        // Update cache tracking
        this.lastSortedPulse = this.currentPulse;
    }

     pulse() {
        if (!this.isRunning) return;

        const currentTime = this.timeKeeper.getCurrentTime();
        
        // Calculate expected time for this pulse (ideal timing)
        this.expectedPulseTime = this.startTime + (this.currentPulse * this.pulseInterval);
        
        // Calculate timing drift
        this.timingDrift = currentTime - this.expectedPulseTime;

        // Only process pulse if we're at or past the expected time
        if (currentTime >= this.expectedPulseTime) {
            // Process scheduled events BEFORE advancing pulse
            this.processScheduledEvents();

            const position = this.getPosition();

            // Notify listeners with precise timing information
            this.notifyListeners('pulse', {
                ...position,
                actualTime: currentTime,
                expectedTime: this.expectedPulseTime,
                timingDrift: this.timingDrift
            });

            // Clean position cache periodically to prevent memory bloat
            if (this.positionCache.size > 100) {
                this.positionCache.clear();
            }

            // Handle hierarchical timing events with stable ordering
            if (position.pulse === 0) {
                this.notifyListeners('16th', position);

                if (position.sixteenth === 0) {
                    this.notifyListeners('beat', position);
                    this.handleBeatPlanning();

                    if (position.beat === 0) {
                        this.notifyListeners('bar', position);
                    }
                }
            }

            // Advance pulse counter
            this.currentPulse++;
            
            // Update last pulse time to current expected time for drift compensation
            this.lastPulseTime = this.expectedPulseTime;
        }

        // Calculate next timeout with drift compensation
        const nextExpectedTime = this.startTime + ((this.currentPulse + 1) * this.pulseInterval);
        const timeUntilNext = Math.max(1, nextExpectedTime - currentTime);
        
        // Log significant timing drift for debugging
        if (Math.abs(this.timingDrift) > this.maxTimingDrift) {
            this.sequencer.logger.log(`Timing drift detected: ${this.timingDrift.toFixed(2)}ms`);
        }

        // Schedule next pulse check
        this.timeKeeper.setTimeout(() => this.pulse(), timeUntilNext);
    }

    notifyListeners(type, position) {
        if (this.listeners.has(type)) {
            for (const callback of this.listeners.get(type).values()) {
                callback(position);
            }
        }
    }

    getPulsesPerBeat() {
        return this.pulsesPerBeat;
    }

    handleBeatPlanning() {
        const nextBeatPulse = this.currentPulse + this.pulsesPerBeat;
        const planPosition = this.getPositionFromPulse(nextBeatPulse);
        
        planPosition.planStartPulse = nextBeatPulse;
        planPosition.planEndPulse = nextBeatPulse + this.pulsesPerBeat;

        this.notifyListeners('plan', planPosition);
    }

    getPosition() {
        if (this.lastPosition !== this.currentPulse || !this.lastPositionData) {
            const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
            const bar = Math.floor(this.currentPulse / pulsesPerBar);
            const beatInBar = Math.floor((this.currentPulse % pulsesPerBar) / this.pulsesPerBeat);
            const sixteenthInBeat = Math.floor((this.currentPulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
            const pulseInSixteenth = this.currentPulse % this.pulsesPerSixteenth;
            this.lastPositionData = { 
                bar, 
                beat: beatInBar, 
                sixteenth: sixteenthInBeat, 
                pulse: pulseInSixteenth,
                currentPulse: this.currentPulse 
            };
            this.lastPosition = this.currentPulse;
        }
        return this.lastPositionData;
    }

    calculatePulseInterval() {
        const millisecondsPerMinute = 60000;
        const pulsesPerMinute = this.bpm * this.pulsesPerBeat;
        const interval = millisecondsPerMinute / pulsesPerMinute;
        console.log(`BPM: ${this.bpm}, Pulses per beat: ${this.pulsesPerBeat}, Calculated interval: ${interval}ms`);
        return interval;
    }

    getPositionFromPulse(pulse) {
        if (this.positionCache.has(pulse)) {
            return this.positionCache.get(pulse);
        }
    
        const pulsesPerBar = this.pulsesPerBeat * this.timeSignature[0];
        const bar = Math.floor(pulse / pulsesPerBar);
        const beatInBar = Math.floor((pulse % pulsesPerBar) / this.pulsesPerBeat);
        const sixteenthInBeat = Math.floor((pulse % this.pulsesPerBeat) / this.pulsesPerSixteenth);
        const pulseInSixteenth = pulse % this.pulsesPerSixteenth;
        
        const position = { 
            bar, 
            beat: beatInBar, 
            sixteenth: sixteenthInBeat, 
            pulse: pulseInSixteenth,
            currentPulse: pulse 
        };
    
        this.positionCache.set(pulse, position);
        return position;
    }

    getPulsesForSpeedMultiplier(speedMultiplier) {
        const basePulsesPerEvent = this.pulsesPerBeat / 4; // 16th notes
        return Math.round(basePulsesPerEvent / speedMultiplier);
    }

    removeFutureNoteOffFromScheduledEvents(pulse, note, channel) {
        this.scheduledEvents = this.scheduledEvents.filter(event => {
            if (event.data.type === 'noteOff' 
                && event.pulse > pulse
                && event.data.note === note
                && event.data.channel === channel) {
                return false;
            }
            return true;
        });
    }

    sendAllNoteOffEvents() {
        const noteOffEvents = this.scheduledEvents.filter(event => 
            event.data.type === 'noteoff'
        );

        noteOffEvents.forEach(event => {
            // Call the callback immediately
            event.callback(this.getPosition());
        });

        // Notify listeners that note off events have been sent
        this.notifyListeners('allNoteOffSent', this.getPosition());
    }
    
    clearAllListeners() {
        this.listeners.clear();
    }

    // Timing precision monitoring
    getTimingStats() {
        return {
            currentPulse: this.currentPulse,
            timingDrift: this.timingDrift,
            maxTimingDrift: this.maxTimingDrift,
            pulseInterval: this.pulseInterval,
            scheduledEventsCount: this.scheduledEvents.length,
            isRunning: this.isRunning,
            bpm: this.bpm
        };
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            positionCacheSize: this.positionCache.size,
            sortedEventCacheSize: this.sortedEventCache.size,
            eventCounter: this.eventCounter,
            lastSortedPulse: this.lastSortedPulse
        };
    }
}

module.exports = Ticker;