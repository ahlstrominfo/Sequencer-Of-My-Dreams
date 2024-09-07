class GrooveManager {
    constructor(initialGroove, initialSwingAmount = 0) {
        this.groove = initialGroove;
        this.swingAmount = initialSwingAmount;
    }

    updateGroove(newGroove) {
        this.groove = newGroove;
    }

    updateSwing(newSwingAmount) {
        this.swingAmount = newSwingAmount;
    }

    getGrooveStep(globalStep) {
        return this.groove[globalStep % this.groove.length];
    }

    applyGrooveAndSwing(noteStartTime, noteSettings, globalStep, duration) {
        const grooveStep = this.getGrooveStep(globalStep);
        const swingOffset = this.calculateSwingOffset(globalStep, duration);

        const timeOffset = grooveStep.timeOffset + swingOffset;
        const adjustedTime = noteStartTime + timeOffset;
        const adjustedVelocity = this.calculateAdjustedVelocity(noteSettings, grooveStep);

        // Adjust duration based on time offset
        const adjustedDuration = duration - timeOffset;

        return { 
            time: adjustedTime, 
            velocity: adjustedVelocity, 
            duration: Math.max(0, adjustedDuration) // Ensure duration is not negative
        };
    }

    calculateSwingOffset(globalStep, duration) {
        // Apply swing to even-numbered steps (0-indexed)
        if (globalStep % 2 === 1) {
            return (duration * this.swingAmount) / 100;
        }
        return 0;
    }

    calculateAdjustedVelocity(noteSettings, grooveStep) {
        const { velocity, velocitySpan } = noteSettings;
        const baseVelocity = velocity + Math.floor(Math.random() * (velocitySpan + 1));
        return Math.max(1, Math.min(127, Math.round(baseVelocity + grooveStep.velocityOffset)));
    }
}

module.exports = GrooveManager;