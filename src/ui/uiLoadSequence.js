const UIBase = require("./uiBase");
const SequenceManager = require("../core/sequenceManager");


class UILoadSequence extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.sequenceManager = sequencer.sequenceManager;
    }

    openView() {
        const availableSequences = this.sequenceManager.getAvailableSequences();
        this.rows = [];
        availableSequences.forEach((seq, index) => {
            this.rows.push({
                name: seq.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.json', ''),
                value: () => seq,
                enter: () => {
                    this.sequenceManager.loadSequence(seq);
                    this.terminalUI.setView('sequencerSettings');
                    console.log(`Loaded sequence: ${this.sequenceManager.getCurrentTrackName()}`);
                }
            });
        })
    }

    render () {
        console.log('Load Sequence');
        console.log('------------------');
        super.render();
        console.log('------------------');
    }

    handleEscape() {
        this.terminalUI.setView('sequencerSettings')        
    }
}

module.exports = UILoadSequence;