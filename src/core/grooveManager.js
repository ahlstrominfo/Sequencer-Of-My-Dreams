const MIDI_MAX_VELOCITY = 127;
const MIDI_MIN_VELOCITY = 0;

class GrooveManager {
    constructor(initialGroove, initialSwingAmount = 0) {
        this.groove = this.validateGroove(initialGroove);
        this.swingAmount = this.clampPercentage(initialSwingAmount);
        this.log = false;
    }

    validateGroove(groove) {
        return groove.map(step => ({
            timeOffset: this.clampPercentage(step.timeOffset),
            velocityOffset: this.clampPercentage(step.velocityOffset)
        }));
    }

    clampPercentage(value) {
        return Math.max(-50, Math.min(50, value));
    }

    updateGroove(newGroove) {
        this.groove = this.validateGroove(newGroove);
    }

    updateSwing(newSwingAmount) {
        this.swingAmount = this.clampPercentage(newSwingAmount);
    }

    getGrooveStep(globalStep) {
        if (this.groove.length === 0) {
            return false;
        }
        return this.groove[globalStep % this.groove.length];
    }

    applyGrooveAndSwing(noteStartTime, noteSettings, globalStep, duration, trackVolume) {
        const grooveStep = this.getGrooveStep(globalStep);
        
        let timeOffsetPercentage = 0;
        let velocityOffsetPercentage = 0;

        if (grooveStep) {
            // Apply groove step-by-step
            timeOffsetPercentage = grooveStep.timeOffset;
            velocityOffsetPercentage = grooveStep.velocityOffset;
        } else {
            // Use swing if no groove is defined
            timeOffsetPercentage = this.calculateSwingOffsetPercentage(globalStep);
        }

        const timeOffset = (duration * timeOffsetPercentage) / 100;
        const adjustedTime = noteStartTime + timeOffset;
        let adjustedVelocity = this.calculateAdjustedVelocity(noteSettings, velocityOffsetPercentage);

        // Adjust duration based on time offset
        const adjustedDuration = duration - timeOffset;

        // Adjust velocity based on track volume
        adjustedVelocity = Math.max(MIDI_MIN_VELOCITY, Math.min(MIDI_MAX_VELOCITY, adjustedVelocity * (trackVolume / 100)));

        return { 
            time: adjustedTime, 
            velocity: adjustedVelocity, 
            duration: Math.max(0, adjustedDuration) // Ensure duration is not negative
        };
    }

    calculateSwingOffsetPercentage(globalStep) {
        // Apply swing to even-numbered steps (0-indexed)
        if (globalStep % 2 === 1) {
            return this.swingAmount;
        }
        return 0;
    }

    calculateAdjustedVelocity(noteSettings, velocityOffsetPercentage) {
        const { velocity, velocitySpan } = noteSettings;
        const baseVelocity = velocity + Math.floor(Math.random() * (velocitySpan + 1));
        const velocityOffset = Math.round((baseVelocity * velocityOffsetPercentage) / 100);
        return Math.max(1, Math.min(127, baseVelocity + velocityOffset));
    }
}

module.exports = GrooveManager;