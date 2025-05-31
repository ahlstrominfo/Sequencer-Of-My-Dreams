import React from 'react';
import { ViewState } from '../types';
import { MockSequencerService } from '../mockSequencer';

interface UISequencerSettingsProps {
  sequencer: MockSequencerService;
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
  onViewChange: (view: string) => void;
}

export const UISequencerSettings: React.FC<UISequencerSettingsProps> = ({
  sequencer,
  viewState,
  setViewState,
  onViewChange,
}) => {
  const settings = sequencer.getSequencer().settings;

  const settingsItems = [
    {
      label: 'BPM',
      value: settings.bpm.toString(),
      onClick: () => {
        const newBpm = prompt('Enter new BPM:', settings.bpm.toString());
        if (newBpm && !isNaN(Number(newBpm))) {
          sequencer.updateSequencerSettings({ bpm: Number(newBpm) });
        }
      },
    },
    {
      label: 'Playing',
      value: settings.isPlaying ? 'Yes' : 'No',
      onClick: () => {
        sequencer.togglePlay();
      },
    },
    {
      label: 'Current Progression',
      value: settings.currentProgressionIndex.toString(),
      onClick: () => {
        const newIndex = prompt(
          'Enter progression index (0-' + (settings.progressions.length - 1) + '):',
          settings.currentProgressionIndex.toString()
        );
        if (newIndex && !isNaN(Number(newIndex))) {
          const index = Math.max(0, Math.min(settings.progressions.length - 1, Number(newIndex)));
          sequencer.updateSequencerSettings({ currentProgressionIndex: index });
        }
      },
    },
    {
      label: 'Back to Main',
      value: '',
      onClick: () => onViewChange('main'),
    },
  ];

  return (
    <div className="view-container">
      <div className="header">
        Sequencer Settings
      </div>
      
      {settingsItems.map((item, index) => (
        <div
          key={index}
          className={`row ${index === viewState.editRow ? 'selected' : ''}`}
          onClick={() => {
            setViewState({ ...viewState, editRow: index });
            item.onClick();
          }}
          style={{ cursor: 'pointer', padding: '2px 0' }}
        >
          <span className="cell">
            {index === viewState.editRow ? '>' : ' '}
            {item.label}
            {item.value && `: ${item.value}`}
          </span>
        </div>
      ))}
      
      <div className="navigation-hint">
        Use arrow keys to navigate, Enter to select, Escape to go back
      </div>
    </div>
  );
};

export {};
