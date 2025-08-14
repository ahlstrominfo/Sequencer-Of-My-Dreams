// Simple color utility for terminal formatting
class Colors {
    constructor() {
        // ANSI escape codes
        this.codes = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            white: '\x1b[37m',
            gray: '\x1b[90m'
        };
        
        // Check if colors are supported
        this.colorsSupported = process.stdout.isTTY !== false;
    }
    
    // Apply dim gray formatting
    dimGray(text) {
        if (!this.colorsSupported) return text;
        return this.codes.dim + this.codes.gray + text + this.codes.reset;
    }
    
    // Apply bright white formatting  
    brightWhite(text) {
        if (!this.colorsSupported) return text;
        return this.codes.bright + this.codes.white + text + this.codes.reset;
    }
    
    // Remove any existing color codes from text
    strip(text) {
        // eslint-disable-next-line no-control-regex
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }
}

// Export singleton instance
module.exports = new Colors();