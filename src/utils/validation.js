const { TRIGGER_TYPES } = require('../patterns/triggerPatterns');

class ValidationUtils {
    
    // Track property validations
    static validateChannel(value) {
        return Math.max(1, Math.min(16, parseInt(value) || 1));
    }
    
    static validateVolume(value) {
        return Math.max(0, Math.min(200, parseInt(value) || 100));
    }
    
    static validateSpeedMultiplier(value) {
        return Math.max(0.25, Math.min(4, parseFloat(value) || 1));
    }
    
    static validateProbability(value) {
        return Math.max(0, Math.min(100, parseInt(value) || 100));
    }
    
    static validateTriggerType(value) {
        const triggerTypeCount = Object.keys(TRIGGER_TYPES).length;
        return Math.max(0, Math.min(triggerTypeCount - 1, parseInt(value) || 0));
    }
    
    static validateVelocity(value) {
        return Math.max(1, Math.min(127, parseInt(value) || 100));
    }
    
    static validateRootNote(value) {
        return Math.max(0, Math.min(127, parseInt(value) || 60));
    }
    
    static validateNumberOfNotes(value) {
        return Math.max(1, Math.min(20, parseInt(value) || 1));
    }
    
    static validateInversion(value) {
        return Math.max(-12, Math.min(12, parseInt(value) || 0));
    }
    
    static validateSpread(value) {
        return Math.max(0, Math.min(127, parseInt(value) || 0));
    }
    
    // Pattern-specific validations
    static validatePatternLength(value) {
        return Math.max(1, Math.min(100, parseInt(value) || 16));
    }
    
    static validateEuclideanHits(value, maxLength) {
        return Math.max(0, Math.min(maxLength || 16, parseInt(value) || 0));
    }
    
    static validateEuclideanShift(value, maxLength) {
        return Math.max(0, Math.min((maxLength || 16) - 1, parseInt(value) || 0));
    }
    
    static validateBinaryNumber(value) {
        return Math.max(0, Math.min(15, parseInt(value) || 0));
    }
    
    // Global sequencer validations
    static validateBPM(value) {
        return Math.max(60, Math.min(200, parseInt(value) || 120));
    }
    
    static validateActiveState(value) {
        return Math.max(0, Math.min(15, parseInt(value) || 0));
    }
    
    static validateSwing(value) {
        return Math.max(-50, Math.min(50, parseInt(value) || 0));
    }
    
    // A/B value validations (ensuring A <= B)
    static validateABValues(aValue, bValue) {
        const validA = Math.max(1, parseInt(aValue) || 1);
        const validB = Math.max(validA, parseInt(bValue) || 1);
        return { aValue: validA, bValue: validB };
    }
    
    // Validation based on path
    static validateByPath(path, value, currentSettings = {}) {
        // Ensure path is a string
        if (typeof path !== 'string') {
            console.error('validateByPath called with non-string path:', path);
            return value;
        }
        
        const pathParts = path.split('.');
        
        if (path === 'bpm') {
            return this.validateBPM(value);
        }
        
        if (path === 'activeState') {
            return this.validateActiveState(value);
        }
        
        if (path === 'swing') {
            return this.validateSwing(value);
        }
        
        // Track-specific validations
        if (pathParts[0] === 'tracks' && pathParts.length >= 3) {
            const property = pathParts[2];
            
            switch (property) {
                case 'channel':
                    return this.validateChannel(value);
                case 'volume':
                    return this.validateVolume(value);
                case 'speedMultiplier':
                    return this.validateSpeedMultiplier(value);
                case 'probability':
                    return this.validateProbability(value);
                case 'triggerType':
                    return this.validateTriggerType(value);
                case 'isActive':
                    return Boolean(value);
                    
                case 'triggerSettings':
                    return this.validateTriggerSettings(pathParts.slice(3), value, currentSettings);
                    
                case 'noteSeries':
                    return this.validateNoteSeries(pathParts.slice(3), value, currentSettings);
                    
                default:
                    return value; // No validation needed
            }
        }
        
        return value; // No validation needed
    }
    
    static validateTriggerSettings(pathParts, value, currentSettings) {
        if (pathParts.length === 0) {
            // Full triggerSettings object
            return value;
        }
        
        const property = pathParts[0];
        const currentTriggerSettings = currentSettings.triggerSettings || {};
        
        switch (property) {
            case 'length':
                return this.validatePatternLength(value);
                
            case 'hits':
                const length = currentTriggerSettings.length || 16;
                return this.validateEuclideanHits(value, length);
                
            case 'shift':
                const shiftLength = currentTriggerSettings.length || 16;
                return this.validateEuclideanShift(value, shiftLength);
                
            case 'numbers':
                if (pathParts.length > 1) {
                    // Individual number in array
                    return this.validateBinaryNumber(value);
                } else {
                    // Full numbers array
                    return Array.isArray(value) ? value.map(n => this.validateBinaryNumber(n)) : value;
                }
                
            case 'steps':
                // Steps array - validate each step is within 0-15 range
                if (Array.isArray(value)) {
                    return value.filter(step => step >= 0 && step < 16).sort((a, b) => a - b);
                }
                return value;
                
            default:
                return value;
        }
    }
    
    static validateNoteSeries(pathParts, value, currentSettings) {
        if (pathParts.length === 0) {
            // Full noteSeries array
            return value;
        }
        
        if (pathParts.length === 1) {
            // Full note series object at index
            return value;
        }
        
        const property = pathParts[1];
        const seriesIndex = parseInt(pathParts[0]);
        const currentNoteSeries = currentSettings.noteSeries?.[seriesIndex] || {};
        
        switch (property) {
            case 'rootNote':
                return this.validateRootNote(value);
            case 'numberOfNotes':
                return this.validateNumberOfNotes(value);
            case 'velocity':
                return this.validateVelocity(value);
            case 'inversion':
                return this.validateInversion(value);
            case 'spread':
                return this.validateSpread(value);
            case 'pitchSpan':
            case 'velocitySpan':
                return Math.max(0, Math.min(127, parseInt(value) || 0));
            case 'probability':
                return this.validateProbability(value);
            case 'aValue':
            case 'bValue':
                // Handle A/B value relationship
                if (property === 'aValue') {
                    const bValue = currentNoteSeries.bValue || 1;
                    return Math.min(parseInt(value) || 1, bValue);
                } else {
                    const aValue = currentNoteSeries.aValue || 1;
                    return Math.max(parseInt(value) || 1, aValue);
                }
            case 'aValueIndividualNote':
            case 'bValueIndividualNote':
                // Handle A/B individual note relationship
                if (property === 'aValueIndividualNote') {
                    const bValue = currentNoteSeries.bValueIndividualNote || 1;
                    return Math.min(parseInt(value) || 1, bValue);
                } else {
                    const aValue = currentNoteSeries.aValueIndividualNote || 1;
                    return Math.max(parseInt(value) || 1, aValue);
                }
            case 'playMultiplier':
                return Math.max(0.25, Math.min(4, parseFloat(value) || 1));
            case 'maxDurationFactor':
                return Math.max(0.1, Math.min(4, parseFloat(value) || 1));
            case 'arpMode':
                return Math.max(0, Math.min(10, parseInt(value) || 0)); // Assuming 10 arp modes
            case 'useMaxDuration':
            case 'wonkyArp':
                return Boolean(value);
            default:
                return value;
        }
    }
}

module.exports = ValidationUtils;