const Sequencer = require('./core/sequencer');
const TerminalUI = require('./ui/terminalUI');
const WebServer = require('./web/webServer');
const Logger = require('./utils/logger');
const RealTimeKeeper = require('./core/realTimeKeeper');

const timeKeeper = new RealTimeKeeper();
// Initialize sequencer
const logger = new Logger();

const sequencer = new Sequencer(120, 24, timeKeeper);
const webServer = new WebServer(sequencer, 3000);

// Check if we should run in web-only mode (when stdin is not a TTY)
const isWebOnly = !process.stdin.isTTY || process.argv.includes('--web-only');

let ui;
if (!isWebOnly) {
    ui = new TerminalUI(sequencer);
    // sequencer.logger = logger;
    // ui.logger = logger;
    ui.views.sequencerSettings.loadFromTmp();
    ui.start();
}

// Start web server
webServer.start().then(() => {
    console.log('Web interface started successfully');
    console.log('Visit http://localhost:3000 to access the web interface');
    if (isWebOnly) {
        console.log('Running in web-only mode. Press Ctrl+C to stop.');
    }
}).catch((error) => {
    console.error('Failed to start web interface:', error);
});

console.log('Sequencer is booting. Press Ctrl+C to stop.');