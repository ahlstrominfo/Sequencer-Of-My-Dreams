class BPMCalculator {
    constructor() {
        this.timestamps = [];
        this.currentBPM = null;
        this.timeoutId = null;
        this.minEntries = 4;
        this.maxEntries = 20;
        this.timeoutDuration = 2000; // 2 seconds
    }

    addTimestamp() {
        const now = Date.now();
        this.timestamps.push(now);

        if (this.timestamps.length > this.maxEntries) {
            this.timestamps.shift();
        }

        this.calculateBPM();
        this.resetTimeout();
    }

    calculateBPM() {
        if (this.timestamps.length < this.minEntries) {
            return;
        }

        const intervals = [];
        for (let i = 1; i < this.timestamps.length; i++) {
            intervals.push(this.timestamps[i] - this.timestamps[i - 1]);
        }

        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        this.currentBPM = Math.round(60000 / averageInterval);
    }

    resetTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.timestamps = [];
            this.currentBPM = null;
        }, this.timeoutDuration);
    }

    getCurrentBPM() {
        return this.currentBPM;
    }
}

module.exports = BPMCalculator;