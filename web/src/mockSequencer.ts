import { MockSequencer, Track } from './types';

export class MockSequencerService {
  private sequencer: MockSequencer;
  private listeners: { [event: string]: (() => void)[] } = {};
  private trackPlayingStates: boolean[] = Array(16).fill(false);
  private heartBeat: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize 16 tracks like in the original
    this.sequencer = {
      tracks: Array.from({ length: 16 }, (_, index): Track => ({
        trackId: index,
        settings: {
          isActive: index < 4, // First 4 tracks active by default
          volume: 80, // Default volume
        },
      })),
      settings: {
        bpm: 120,
        isPlaying: false,
        activeStates: Array(8).fill(false),
        currentActiveState: 0,
        progressions: ['C', 'F', 'G', 'Am'],
        currentProgressionIndex: 0,
      },
      isPlaying: false,
    };

    this.startHeartBeat();
  }

  private startHeartBeat() {
    this.intervalId = setInterval(() => {
      this.heartBeat = !this.heartBeat;
      this.emit('beat');
      
      // Simulate some tracks playing occasionally
      if (this.sequencer.isPlaying && Math.random() > 0.7) {
        const trackId = Math.floor(Math.random() * 16);
        this.trackPlayingStates[trackId] = true;
        this.emit('trackPlaying', { trackId });
        
        setTimeout(() => {
          this.trackPlayingStates[trackId] = false;
        }, 100);
      }
    }, 500); // Beat every 500ms for visual effect
  }

  public getSequencer(): MockSequencer {
    return this.sequencer;
  }

  public getTrackPlayingState(trackId: number): boolean {
    return this.trackPlayingStates[trackId];
  }

  public getHeartBeat(): boolean {
    return this.heartBeat;
  }

  public updateTrackSettings(trackId: number, settings: Partial<Track['settings']>) {
    const track = this.sequencer.tracks[trackId];
    if (track) {
      track.settings = { ...track.settings, ...settings };
      this.emit('trackSettingsUpdated');
    }
  }

  public updateSequencerSettings(settings: Partial<MockSequencer['settings']>) {
    this.sequencer.settings = { ...this.sequencer.settings, ...settings };
    if (settings.isPlaying !== undefined) {
      this.sequencer.isPlaying = settings.isPlaying;
    }
    this.emit('sequencerSettingsUpdated');
  }

  public togglePlay() {
    this.sequencer.isPlaying = !this.sequencer.isPlaying;
    this.sequencer.settings.isPlaying = this.sequencer.isPlaying;
    this.emit('playStateChanged');
  }

  public updateActiveState(index: number) {
    this.sequencer.settings.currentActiveState = index;
    this.emit('sequencerSettingsUpdated');
  }

  public getBoxDrawingCharacter(number: number): string {
    const roundedNumber = Math.round(number / 10) * 10;
    const clampedNumber = Math.max(0, Math.min(100, roundedNumber));
    
    const characterMap: { [key: number]: string } = {
      0: '─',
      10: '┌',
      20: '┐',
      30: '└',
      40: '┘',
      50: '├',
      60: '┤',
      70: '┬',
      80: '┴',
      90: '┼',
      100: '═'
    };
    
    return characterMap[clampedNumber];
  }

  public on(event: string, callback: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback());
    }
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
