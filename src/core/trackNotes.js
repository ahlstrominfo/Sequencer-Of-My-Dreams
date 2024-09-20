const { generateChord, conformNoteToScale } = require('../utils/scales');

class TrackNotes {
    constructor(track) {
        this.track = track;
        this.currentNoteSeriesStep = 0;

    }

    scheduleNotes({startPulse, maxDuration, defaultDuration, currentTriggerStep}) {
        
        if (this.checkTrackProbability()) {
            const trackSettings = this.track.settings;
            const noteSettings = trackSettings.noteSeries[this.currentNoteSeriesStep];
            if (trackSettings.useMaxDuration) {
                defaultDuration = trackSettings.maxDurationFactor * maxDuration;
            }

            

            this.track.sequencer.logger.log(`Track: ${this.track.trackId} pulse: ${startPulse} maxD: ${maxDuration} smallest: ${defaultDuration} noteSeriesStep: ${noteSettings.rootNote} currentTriggerStep: ${currentTriggerStep}`);     
        }

        this.updateCurrentNoteSeriesStep();
    }

    updateCurrentNoteSeriesStep() {
        this.currentNoteSeriesStep = (this.currentNoteSeriesStep + 1) % this.track.settings.noteSeries.length;
    }

    checkTrackProbability() {
        return Math.random() * 100 < this.track.settings.probability;
    }

    pitchForProgression(pitch, bar, beat) {
        const progressionInfo = this.getProgressionInfo(bar, beat);
        return conformNoteToScale(
            pitch, 
            progressionInfo.key,
            progressionInfo.scale,
            progressionInfo.transposition
        ); 
    }

    chordMakerForProgression(noteSettings, bar, beat) {
        const progressionInfo = this.getProgressionInfo(bar, beat);
        return generateChord(noteSettings.rootNote, {
            numberOfNotes: noteSettings.numberOfNotes,
            inversion: noteSettings.inversion,
            spread: noteSettings.spread,
            scaleType: this.track.settings.conformNotes ? progressionInfo.scale : 13,
            pitchSpan: noteSettings.pitchSpan
        });
    }    

    getProgressionInfo(bar, beat) {
        return this.sequencer.getProgressionAtPosition(bar, beat);
    }    
}

module.exports = TrackNotes;