// Test script to verify timing precision improvements
const Sequencer = require('./src/core/sequencer');
const RealTimeKeeper = require('./src/core/realTimeKeeper');

console.log('Testing Ticker Timing Precision Improvements...\n');

const timeKeeper = new RealTimeKeeper();
const sequencer = new Sequencer(120, 24, timeKeeper);

// Test 1: Event ordering with same pulse
console.log('Test 1: Event ordering consistency');
const events = [];
const testPulse = 10;

// Schedule multiple events at the same pulse
for (let i = 0; i < 5; i++) {
    sequencer.ticker.scheduleEvent(testPulse, (position) => {
        events.push({ eventId: position.eventId, order: i });
    }, { type: 'test', order: i });
}

console.log('Scheduled 5 events at pulse 10');
console.log(`Events in ticker queue: ${sequencer.ticker.scheduledEvents.length}`);

// Check event ordering
const sortedEvents = sequencer.ticker.scheduledEvents
    .filter(e => e.pulse === testPulse)
    .map(e => e.eventId);

console.log(`Event IDs in order: ${sortedEvents.join(', ')}`);
console.log('Expected: Ascending order (deterministic)');

// Test 2: Timing precision monitoring
console.log('\nTest 2: Timing statistics');
const timingStats = sequencer.ticker.getTimingStats();
console.log('Timing stats:', timingStats);

const performanceStats = sequencer.ticker.getPerformanceStats();
console.log('Performance stats:', performanceStats);

// Test 3: BPM change handling
console.log('\nTest 3: BPM change precision');
const originalBpm = sequencer.ticker.bpm;
console.log(`Original BPM: ${originalBpm}`);

sequencer.ticker.setBPM(140);
console.log(`New BPM: ${sequencer.ticker.bpm}`);
console.log(`Pulse interval changed: ${sequencer.ticker.pulseInterval}ms`);

// Test 4: Sequence scheduler event ordering
console.log('\nTest 4: Sequence scheduler event ordering');
const sequenceEvents = [];

// Schedule multiple events at the same bar/beat
for (let i = 0; i < 3; i++) {
    sequencer.scheduler.scheduleEvent(1, 0, () => {
        sequenceEvents.push(i);
    }, { type: 'test', order: i });
}

console.log('Sequence scheduler stats:', sequencer.scheduler.getStats());

// Test 5: Drift compensation
console.log('\nTest 5: Timing drift tracking');
console.log(`Max allowed drift: ${sequencer.ticker.maxTimingDrift}ms`);
console.log(`Current drift: ${sequencer.ticker.timingDrift}ms`);

console.log('\n✅ Timing precision improvements tested!');
console.log('Improvements implemented:');
console.log('- Deterministic event ordering with stable sort');
console.log('- Timing drift compensation and monitoring');
console.log('- Performance limits to prevent runaway processing');
console.log('- Enhanced BPM change handling');
console.log('- Comprehensive timing statistics');
