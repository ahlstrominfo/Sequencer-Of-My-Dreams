const UIBase = require("./uiBase");

class UILoadTemplate extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.sequenceManager = sequencer.sequenceManager;
    }

    openView() {
        const availableTemplates = this.sequenceManager.getAvailableTemplates();
        this.rows = [];
        availableTemplates.forEach((template) => {
            this.rows.push({
                name: template.replace('.json', ''),
                value: () => template,
                enter: () => {
                    this.sequenceManager.loadTemplate(template);
                    this.terminalUI.setView('sequencerSettings');
                    console.log(`Loaded template: ${template.replace('.json', '')}`);
                }
            });
        });

        if (availableTemplates.length === 0) {
            this.rows.push({
                name: 'No templates available',
                selectable: false
            });
        }
    }

    render() {
        console.log('Load Template');
        console.log('------------------');
        super.render();
        console.log('------------------');
    }

    handleEscape() {
        this.terminalUI.setView('sequencerSettings');        
    }
}

module.exports = UILoadTemplate;