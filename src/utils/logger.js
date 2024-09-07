

class Logger {
    constructor() {
        this.logs = [];
    }
    
    get count() {
        return this.logs.length;
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        this.logs.unshift({ message, timestamp });
    }

    clear() {
        this.logs = [];
    }
}

module.exports = Logger;