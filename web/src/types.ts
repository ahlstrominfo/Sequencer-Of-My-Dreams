export interface Track {
  trackId: number;
  settings: {
    isActive: boolean;
    volume: number;
  };
}

export interface SequencerSettings {
  bpm: number;
  isPlaying: boolean;
  activeStates: boolean[];
  currentActiveState: number;
  progressions: any[];
  currentProgressionIndex: number;
}

export interface MockSequencer {
  tracks: Track[];
  settings: SequencerSettings;
  isPlaying: boolean;
}

export interface ViewState {
  editRow: number;
  editCol: number;
  isEditingField: boolean;
}

export interface Column {
  value: () => string | number;
  enter?: () => void;
  handle?: (delta: number) => void;
  selectable?: boolean;
}

export interface Row {
  cols?: Column[];
  value?: () => string | number;
  enter?: () => void;
  handle?: (delta: number) => void;
  layout?: number;
  colsLayout?: number;
  selectable?: boolean;
}
