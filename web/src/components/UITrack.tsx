import React from 'react';
import { ViewState } from '../types';
import { MockSequencerService } from '../mockSequencer';

interface UITrackProps {
  sequencer: MockSequencerService;
  trackId: number;
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
  onViewChange: (view: string) => void;
}

export const UITrack: React.FC<UITrackProps> = ({
  sequencer,
  trackId,
  viewState,
  setViewState,
  onViewChange,
}) => {
  const track = sequencer.getSequencer().tracks[trackId];
  const trackLabels = '0123456789abcdefghijklmnopqrstuvwxz'.split('');

  if (!track) {
    return <div>Track not found</div>;
  }

  const settings = [
    {
      label: 'Active',
      value: track.settings.isActive ? 'Yes' : 'No',
      onClick: () => {
        sequencer.updateTrackSettings(trackId, { 
          isActive: !track.settings.isActive 
        });
      },
    },
    {
      label: 'Volume',
      value: track.settings.volume.toString(),
      onClick: () => {
        // This could open a volume editor
        console.log('Edit volume');
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
        Track {trackLabels[trackId]} Settings
      </div>
      
      {settings.map((setting, index) => (
        <div
          key={index}
          className={`row ${index === viewState.editRow ? 'selected' : ''}`}
          onClick={() => {
            setViewState({ ...viewState, editRow: index });
            setting.onClick();
          }}
          style={{ cursor: 'pointer', padding: '2px 0' }}
        >
          <span className="cell">
            {index === viewState.editRow ? '>' : ' '}
            {setting.label}
            {setting.value && `: ${setting.value}`}
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
