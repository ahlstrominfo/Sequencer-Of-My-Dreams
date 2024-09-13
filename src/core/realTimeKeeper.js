const { hrtime } = require('process');

class RealTimeKeeper {
    constructor() {
        this.startTime = hrtime.bigint();
    }

    getHighResolutionTime() {
        return hrtime.bigint();
    }

    getCurrentTime() {
        return Number(hrtime.bigint() - this.startTime) / 1e6; // Convert to milliseconds
    }

    setCurrentTime(time) {
        // In a real-time scenario, we can't actually set the time
        // This method is here for compatibility with the MockTimeKeeper
        console.warn('Attempt to set current time in RealTimeKeeper. This operation does nothing in real-time mode.');
    }

    setTimeout(callback, delay) {
        return setTimeout(callback, delay);
    }

    setImmediate(callback) {
        return setImmediate(callback);
    }

    // This method is useful for measuring elapsed time in high resolution
    getElapsedTime() {
        return hrtime.bigint() - this.startTime;
    }

    // Convert nanoseconds to milliseconds
    nanoToMs(nanoseconds) {
        return Number(nanoseconds) / 1e6;
    }

    // Convert milliseconds to nanoseconds
    msToNano(milliseconds) {
        return BigInt(Math.round(milliseconds * 1e6));
    }
}

module.exports = RealTimeKeeper;