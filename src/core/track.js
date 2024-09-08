const { TRIGGER_TYPES } = require('../patterns/triggerPatterns');
const { PLAY_ORDER, ARP_MODES } = require('../utils/utils');
const TrackScheduler = require('./trackScheduler');

class Track {
    constructor(initialSettings = {}, sequencer, trackId) {
        this.sequencer = sequencer;
        this.trackId = trackId;
        this.settings = {
            channel: 1,
            steps: 16,
            noteSeries: [{
                rootNote: 60,
                numberOfNotes: 1,
                inversion: 0,
                velocity: 100,
                pitchSpan: 0,
                velocitySpan: 0,
                spread: 0,
                probability: 100,
                aValue: 1,
                bValue: 1,
                arpMode: ARP_MODES.USE_TRACK,
                playMultiplier: 1,
                wonkyArp: false,
            }],
            triggerType: TRIGGER_TYPES.INIT,
            triggerSettings: {
                numbers: [8],
                length: 16,
                hits: 4,
                shift: 0,
                steps: [],
            },
            groove: [{
               timeOffset: 0,
               velocityOffset: 0 
            }],
            grooveName: 'Steady',
            resyncInterval: 0,
            speedMultiplier: 1,
            swingAmount: 0,
            playOrder: PLAY_ORDER.FORWARD,
            probability: 100,
            conformNotes: true,
            arpMode: ARP_MODES.OFF,
            wonkyArp: false,
            playMultiplier: 1,
            useMaxDuration: false,
            // : true,
            maxDurationFactor: 1,
            isActive: true,
            volume: 100,
            tieNoteSeriestoPattern: false,
            ...initialSettings
        };
        this.trackScheduler = new TrackScheduler(this, this.sequencer);
        this.trackScheduler.updateTriggerPattern();
    }

    updateSettings(newSettings) {
        if ('triggerSettings' in newSettings) {
            newSettings.triggerSettings = {
                ...this.settings.triggerSettings,
                ...newSettings.triggerSettings
            };

            if ('numbers' in newSettings.triggerSettings) {
                newSettings.triggerSettings.numbers = newSettings.triggerSettings.numbers.map(number => Math.max(0, Math.min(15, number)));
            }
        }

        if ('noteSeries' in newSettings) { 
            newSettings.noteSeries = newSettings.noteSeries.map(noteSeries => ({
                rootNote: Math.max(0, Math.min(127, noteSeries.rootNote)),
                numberOfNotes: Math.max(1, Math.min(8, noteSeries.numberOfNotes)),
                inversion: Math.max(-5, Math.min(5, noteSeries.inversion)),
                velocity: Math.max(1, Math.min(127, noteSeries.velocity)),
                pitchSpan: Math.max(-24, Math.min(24, noteSeries.pitchSpan)),
                velocitySpan: Math.max(0, Math.min(127, noteSeries.velocitySpan)),
                probability: Math.max(0, Math.min(100, noteSeries.probability)),
                aValue: Math.max(1, Math.min(8, noteSeries.aValue)),
                bValue: Math.max(1, Math.min(8, noteSeries.bValue)),
                arpMode: Math.max(0, Math.min(Object.keys(ARP_MODES).length - 1, noteSeries.arpMode)),
                spread: Math.max(-9, Math.min(9, noteSeries.spread)),
                playMultiplier: noteSeries.playMultiplier,
                wonkyArp: noteSeries.wonkyArp,
            }));
        }

        if ('groove' in newSettings) {
            newSettings.groove = newSettings.groove.map(grooveStep => ({
                timeOffset: Math.max(-100, Math.min(100, grooveStep.timeOffset)),
                velocityOffset: Math.max(-100, Math.min(100, grooveStep.velocityOffset))
            }));
        }

        if ('volume' in newSettings) {
            newSettings.volume = Math.max(0, Math.min(200, newSettings.volume));
        }

        if ('swingAmount' in newSettings) {
            newSettings.swingAmount = Math.max(0, Math.min(100, newSettings.swingAmount));
        }

        if ('probability' in newSettings) {
            newSettings.probability = Math.max(0, Math.min(100, newSettings.probability));
        }

        if ('channel' in newSettings) {
            newSettings.channel = Math.max(1, Math.min(16, newSettings.channel));
        }

        if ('playOrder' in newSettings) {
            newSettings.playOrder = Math.max(0, Math.min(3, newSettings.playOrder));
        }

        if ('arpMode' in newSettings) {
            newSettings.arpMode = Math.max(0, Math.min(Object.keys(ARP_MODES).length - 1, newSettings.arpMode));
        }   

        if ('resyncInterval' in newSettings) {
            newSettings.resyncInterval = Math.max(0, Math.min(100, newSettings.resyncInterval));
        }

        if ('isActive' in newSettings) {
            if (newSettings.isActive === false && this.settings.isActive === true) {
              // Track is being deactivated
              this.sequencer.midi.stopAllNotesForTrack(this.trackId);
            }
          }

        // Update the settings
        Object.assign(this.settings, newSettings);

        // Additional logic after updating settings
        this.trackScheduler.onTrackSettingsUpdate(newSettings, this.settings);
        this.sequencer.sequenceManager.saveToTmp();
    }
}

module.exports = { Track };