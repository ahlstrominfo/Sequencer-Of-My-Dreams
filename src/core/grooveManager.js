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
        if (this.groove.length === 0) {
            return null;
        }
        return this.groove[globalStep % this.groove.length];
    }

    applyGrooveAndSwing(noteStartTime, noteSettings, globalStep, duration) {
        const grooveStep = this.getGrooveStep(globalStep);
        
        let timeOffset = 0;
        let velocityOffset = 0;

        if (grooveStep) {
            // Use groove if available
            timeOffset = grooveStep.timeOffset;
            velocityOffset = grooveStep.velocityOffset;
        } else {
            // Use swing if no groove is defined
            timeOffset = this.calculateSwingOffset(globalStep, duration);
        }

        const adjustedTime = noteStartTime + timeOffset;
        const adjustedVelocity = this.calculateAdjustedVelocity(noteSettings, velocityOffset);

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

    calculateAdjustedVelocity(noteSettings, velocityOffset) {
        const { velocity, velocitySpan } = noteSettings;
        const baseVelocity = velocity + Math.floor(Math.random() * (velocitySpan + 1));
        return Math.max(1, Math.min(127, Math.round(baseVelocity + velocityOffset)));
    }
}

module.exports = GrooveManager;