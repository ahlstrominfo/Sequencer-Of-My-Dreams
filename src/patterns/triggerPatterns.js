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

class InitTriggerPattern {
    constructor(steps) {
        this.steps = steps;
        this.pattern = [];
    }

    shouldTrigger() {
        return false;
    }

    get length() {
        return 0;
    }
}

class BinaryTriggerPattern {
    constructor(pattern) {
        this.pattern = pattern;
    }

    shouldTrigger(step) {
        return this.pattern[step % this.pattern.length] === 1;
    }

    static patternGenerate(numbers) {
        const pattern = new Array(numbers.length * 4).fill(0);
        numbers.forEach((num, index) => {
            const binary = num.toString(2).padStart(4, '0');
            binary.split('').forEach((bit, bitIndex) => {
                pattern[index * 4 + bitIndex] = bit === '1' ? 1 : null;
            });
        });
        return pattern;
    }

    static fromNumbers(numbers) {
        return new BinaryTriggerPattern(this.patternGenerate(numbers));
    }

    get length() {
        return this.pattern.length;
    }
}

class EuclideanTriggerPattern {
    constructor(length, hits, shift = 0) {
        this.pattern = this.generatePattern(length, hits, shift);
        this.length = length;
    }

    generatePattern(length, hits, shift) {
        const pattern = new Array(length).fill(0);
        for (let i = 0; i < hits; i++) {
            pattern[Math.floor(i * length / hits)] = 1;
        }
        return pattern.slice(shift).concat(pattern.slice(0, shift));
    }

    shouldTrigger(step) {
        return this.pattern[step % this.length] === 1;
    }
}

class StepTriggerPattern {
    constructor(steps) {
        this.pattern = new Array(16).fill(0);
        steps.forEach(step => this.pattern[step] = 1);
    }

    shouldTrigger(step) {
        return this.pattern[step % this.pattern.length] === 1;
    }

    get length() {
        return this.pattern.length;
    }
}

const triggerPatternFromSettings = (settings) => {
    const { triggerType, triggerSettings, steps, resyncInterval } = settings;

    let triggerClass = null;
    switch (triggerType) {
        case TRIGGER_TYPES.BINARY:
            triggerClass = BinaryTriggerPattern.fromNumbers(triggerSettings.numbers || []);
            break;
        case TRIGGER_TYPES.EUCLIDEAN:
            triggerClass = new EuclideanTriggerPattern(
                triggerSettings.length || steps,
                triggerSettings.hits || 4,
                triggerSettings.shift || 0
            );
            break;
        case TRIGGER_TYPES.STEP:
            triggerClass = new StepTriggerPattern(triggerSettings.steps || []);
            break;
        default:
            triggerClass = new InitTriggerPattern(steps);
    }

    if (resyncInterval && resyncInterval > 0 && triggerClass.pattern.length > 0) {
        const originalPattern = triggerClass.pattern;
        let newPattern = [];

        if (resyncInterval > originalPattern.length) {
            // Repeat the pattern
            while (newPattern.length < resyncInterval) {
                newPattern = newPattern.concat(originalPattern);
            }
            // Cut if it's now longer than resyncInterval
            newPattern = newPattern.slice(0, resyncInterval);
        } else {
            // Cut the original pattern
            newPattern = originalPattern.slice(0, resyncInterval);
        }

        triggerClass.pattern = newPattern;
        triggerClass.length = newPattern.length;
    }

    return triggerClass;
};

module.exports = { 
    TRIGGER_TYPES,
    TRIGGER_TYPE_NAMES,
    InitTriggerPattern, 
    BinaryTriggerPattern, 
    EuclideanTriggerPattern, 
    StepTriggerPattern,
    triggerPatternFromSettings
};