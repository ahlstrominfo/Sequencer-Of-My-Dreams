// triggerPatterns.js

const TRIGGER_TYPES = {
    INIT: 0,
    BINARY: 1,
    EUCLIDEAN: 2,
    STEP: 3,
};

const TRIGGER_TYPE_NAMES = {
    [TRIGGER_TYPES.INIT]: 'Init',
    [TRIGGER_TYPES.BINARY]: 'Binary',
    [TRIGGER_TYPES.EUCLIDEAN]: 'Euclidean',
    [TRIGGER_TYPES.STEP]: 'Step',
};

class TriggerPattern {
    constructor(pattern) {
        this.pattern = pattern;
        this.triggerSteps = [];
        this.durations = [];
        this.precalculateDurations();
    }

    shouldTrigger(step) {
        return this.pattern[step % this.pattern.length] === 1;
    }

    get length() {
        return this.pattern.length;
    }

    applyResyncInterval(resyncInterval) {
        if (resyncInterval && resyncInterval > 0 && this.pattern.length > 0) {
            let newPattern = [];
            while (newPattern.length < resyncInterval) {
                newPattern = newPattern.concat(this.pattern);
            }
            this.pattern = newPattern.slice(0, resyncInterval);
            this.precalculateDurations();
        }
    }

    precalculateDurations() {
        this.triggerSteps = [];
        this.durations = [];
        let lastTriggerStep = -1;

        for (let i = 0; i < this.pattern.length; i++) {
            if (this.shouldTrigger(i)) {
                if (lastTriggerStep !== -1) {
                    this.durations.push(i - lastTriggerStep);
                }
                this.triggerSteps.push(i);
                lastTriggerStep = i;
            }
        }

        // Handle the wrap-around case
        if (lastTriggerStep !== -1) {
            this.durations.push(this.pattern.length + this.triggerSteps[0] - lastTriggerStep);
        }
    }
}

class InitTriggerPattern extends TriggerPattern {
    constructor(steps) {
        super(new Array(steps).fill(0));
    }
}

class BinaryTriggerPattern extends TriggerPattern {
    static fromNumbers(numbers) {
        const pattern = new Array(numbers.length * 4).fill(0);
        numbers.forEach((num, index) => {
            const binary = num.toString(2).padStart(4, '0');
            binary.split('').forEach((bit, bitIndex) => {
                pattern[index * 4 + bitIndex] = bit === '1' ? 1 : 0;
            });
        });
        return new BinaryTriggerPattern(pattern);
    }
}

class EuclideanTriggerPattern extends TriggerPattern {
    constructor(length, hits, shift = 0) {
        const pattern = new Array(length).fill(0);
        for (let i = 0; i < hits; i++) {
            pattern[Math.floor(i * length / hits)] = 1;
        }
        super(pattern.slice(shift).concat(pattern.slice(0, shift)));
    }
}

class StepTriggerPattern extends TriggerPattern {
    constructor(steps) {
        const pattern = new Array(16).fill(0);
        steps.forEach(step => pattern[step] = 1);
        super(pattern);
    }
}

function createTriggerPattern(type, settings) {
    switch (type) {
        case TRIGGER_TYPES.BINARY:
            return BinaryTriggerPattern.fromNumbers(settings.numbers || []);
        case TRIGGER_TYPES.EUCLIDEAN:
            return new EuclideanTriggerPattern(
                settings.length || 16,
                settings.hits || 4,
                settings.shift || 0
            );
        case TRIGGER_TYPES.STEP:
            return new StepTriggerPattern(settings.steps || []);
        case TRIGGER_TYPES.INIT:
        default:
            return new InitTriggerPattern(settings.steps || 16);
    }
}

function triggerPatternFromSettings(settings) {
    const { triggerType, triggerSettings, resyncInterval } = settings;
    
    const pattern = createTriggerPattern(triggerType, triggerSettings);
    
    if (resyncInterval) {
        pattern.applyResyncInterval(resyncInterval);
    }
    
    return pattern;
}

module.exports = {
    BinaryTriggerPattern,
    EuclideanTriggerPattern,
    InitTriggerPattern,
    StepTriggerPattern,
    TRIGGER_TYPES,
    TRIGGER_TYPE_NAMES,
    triggerPatternFromSettings
};