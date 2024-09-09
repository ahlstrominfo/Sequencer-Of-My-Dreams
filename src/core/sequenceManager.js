const fs = require('fs');
const path = require('path');
const { generateTrackName } = require('../utils/utils');

class SequenceManager {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.songsDirectory = './songs';
        this.currentFileName = null;
        this.tmpFileName = 'tmp.json';
        this.ensureSongsDirectoryExists();
    }

    ensureSongsDirectoryExists() {
        if (!fs.existsSync(this.songsDirectory)) {
            fs.mkdirSync(this.songsDirectory);
        }
    }

    saveSequence(saveAsNew = false) {
        let fileName;
        if (!saveAsNew && this.currentFileName) {
            fileName = this.currentFileName;
        } else {
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const trackName = generateTrackName();
            fileName = `${date}-${trackName.replace(/\s+/g, '-').toLowerCase()}.json`;
        }
        const filePath = path.join(this.songsDirectory, fileName);

        const sequenceData = {
            settings: this.sequencer.settings,
            tracks: this.sequencer.tracks.map(track => track.settings),
            currentFileName: fileName
        };

        fs.writeFileSync(filePath, JSON.stringify(sequenceData, null, 2));
        this.currentFileName = fileName;
        this.updateTmpWithCurrentFileName();
        return fileName;
    }

    saveAsNew() {
        return this.saveSequence(true);
    }

    updateTmpWithCurrentFileName() {
        const tmpFilePath = path.join(this.songsDirectory, this.tmpFileName);
        const tmpData = {
            currentFileName: this.currentFileName
        };
        fs.writeFileSync(tmpFilePath, JSON.stringify(tmpData, null, 2));
    }

    loadSequence(fileName) {
        const filePath = path.join(this.songsDirectory, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const sequenceData = JSON.parse(fileContent);

        this.sequencer.midi.stopAllActiveNotes();
        this.sequencer.updateSettings(sequenceData.settings);
        sequenceData.tracks.forEach((trackSettings, index) => {
            this.sequencer.updateTrackSettings(index, trackSettings);
        });

        this.currentFileName = fileName;
        this.updateTmpWithCurrentFileName();
    }

    getAvailableSequences() {
        return fs.readdirSync(this.songsDirectory)
            .filter(file => file.endsWith('.json') && file !== this.tmpFileName)
            .sort((a, b) => {
                return fs.statSync(path.join(this.songsDirectory, b)).mtime.getTime() - 
                       fs.statSync(path.join(this.songsDirectory, a)).mtime.getTime();
            });
    }

    getCurrentTrackName() {
        if (this.currentFileName) {
            // Remove the date prefix and file extension
            return this.currentFileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.json', '');
        }
        return null;
    }

    clearCurrentFileName() {
        this.currentFileName = null;
        this.updateTmpWithCurrentFileName();
    }    

    saveToTmp() {
        const filePath = path.join(this.songsDirectory, this.tmpFileName);
        const sequenceData = {
            settings: this.sequencer.settings,
            tracks: this.sequencer.tracks.map(track => track.settings),
            currentFileName: this.currentFileName
        };
        fs.writeFileSync(filePath, JSON.stringify(sequenceData, null, 2));
    }

    loadFromTmp() {
        const filePath = path.join(this.songsDirectory, this.tmpFileName);
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const sequenceData = JSON.parse(fileContent);
            this.sequencer.updateSettings(sequenceData.settings, false);
            sequenceData.tracks.forEach((trackSettings, index) => {
                this.sequencer.updateTrackSettings(index, trackSettings);
            });
            this.currentFileName = sequenceData.currentFileName;
        }
    }
}

module.exports = SequenceManager;