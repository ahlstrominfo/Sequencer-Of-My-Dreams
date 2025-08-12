const Sequencer = require('./core/sequencer');
const TerminalUI = require('./ui/terminalUI');
const Logger = require('./utils/logger');
const RealTimeKeeper = require('./core/realTimeKeeper');

const timeKeeper = new RealTimeKeeper();
// Initialize sequencer
const logger = new Logger();

const sequencer = new Sequencer(120, 24, timeKeeper);
const ui = new TerminalUI(sequencer);

// sequencer.logger = logger;
// ui.logger = logger;
ui.views.sequencerSettings.loadFromTmp();
ui.start();

console.log('Sequencer is booting. Press Ctrl+C to stop.');