import React, { useState, useEffect } from 'react';
import { ViewState, Row, Column } from '../types';
import { MockSequencerService } from '../mockSequencer';

interface UIMainProps {
  sequencer: MockSequencerService;
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
  onViewChange: (view: string, trackId?: number) => void;
}

export const UIMain: React.FC<UIMainProps> = ({
  sequencer,
  viewState,
  setViewState,
  onViewChange,
}) => {
  const [, forceUpdate] = useState({});
  const trackLabels = '0123456789abcdefghijklmnopqrstuvwxz'.split('');

  useEffect(() => {
    const updateComponent = () => forceUpdate({});
    
    sequencer.on('beat', updateComponent);
    sequencer.on('trackPlaying', updateComponent);
    sequencer.on('trackSettingsUpdated', updateComponent);
    sequencer.on('sequencerSettingsUpdated', updateComponent);
    
    return () => {
      // Note: In a real app, you'd want to properly remove listeners
    };
  }, [sequencer]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setViewState({
      ...viewState,
      editRow: rowIndex,
      editCol: colIndex,
    });
  };

  const handleCellEnter = (row: Row, col?: Column) => {
    if (col && col.enter) {
      col.enter();
    } else if (row.enter) {
      row.enter();
    }
  };

  const handleVolumeChange = (trackId: number, delta: number) => {
    const track = sequencer.getSequencer().tracks[trackId];
    let newVolume = Math.round(track.settings.volume / 10) * 10;
    newVolume = Math.max(0, Math.min(100, newVolume + (delta * 10)));
    sequencer.updateTrackSettings(trackId, { volume: newVolume });
  };

  const createRows = (): Row[] => {
    const seq = sequencer.getSequencer();
    const rows: Row[] = [];

    // Labels row
    const labelCols: Column[] = [
      {
        value: () => 'S',
        enter: () => onViewChange('sequencerSettings'),
      },
      ...seq.tracks.map((track, index) => ({
        value: () => trackLabels[index],
        enter: () => onViewChange('track', index),
      })),
    ];

    rows.push({
      cols: labelCols,
      layout: 1,
      colsLayout: 0,
    });

    // Active notes row (playing indicators)
    rows.push({
      cols: [
        { value: () => ' ' },
        ...seq.tracks.map((track) => ({
          value: () => sequencer.getTrackPlayingState(track.trackId) ? '■' : '□',
          enter: () => sequencer.updateTrackSettings(track.trackId, { 
            isActive: !track.settings.isActive 
          }),
        })),
      ],
      layout: 1,
      colsLayout: 0,
      selectable: false,
    });

    // Active tracks row
    const activeCols: Column[] = [
      {
        value: () => sequencer.getHeartBeat() ? '♥' : '❤',
        enter: () => {
          // BPM tap functionality could be implemented here
          console.log('BPM tap');
        },
      },
      ...seq.tracks.map((track) => ({
        value: () => track.settings.isActive ? '■' : '□',
        enter: () => sequencer.updateTrackSettings(track.trackId, { 
          isActive: !track.settings.isActive 
        }),
      })),
    ];

    rows.push({
      cols: activeCols,
      layout: 1,
      colsLayout: 0,
    });

    // Volume row
    const volumeCols: Column[] = [
      {
        value: () => seq.isPlaying ? '▶' : '■',
        enter: () => sequencer.togglePlay(),
      },
      ...seq.tracks.map((track) => ({
        value: () => sequencer.getBoxDrawingCharacter(track.settings.volume),
        handle: (delta: number) => handleVolumeChange(track.trackId, delta),
      })),
    ];

    rows.push({
      cols: volumeCols,
      layout: 1,
      colsLayout: 0,
    });

    // Active states row
    const activeStateRows: Column[] = [
      {
        value: () => seq.settings.currentProgressionIndex.toString(),
        handle: (delta: number) => {
          const newIndex = Math.max(0, Math.min(
            seq.settings.progressions.length - 1,
            seq.settings.currentProgressionIndex + delta
          ));
          sequencer.updateSequencerSettings({ currentProgressionIndex: newIndex });
        },
      },
      ...seq.settings.activeStates.map((_, index) => ({
        value: () => index === seq.settings.currentActiveState ? '■' : '□',
        enter: () => sequencer.updateActiveState(index),
      })),
    ];

    rows.push({
      cols: activeStateRows,
      layout: 1,
      colsLayout: 0,
    });

    return rows;
  };

  const renderCell = (
    content: string,
    rowIndex: number,
    colIndex: number,
    isSelected: boolean,
    isEditing: boolean,
    onClick: () => void
  ) => {
    let className = 'cell';
    if (isSelected) className += ' selected';
    if (isEditing) className += ' editing';

    return (
      <span
        key={colIndex}
        className={className}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        {isSelected ? `>${content}<` : content}
      </span>
    );
  };

  const rows = createRows();

  return (
    <div className="view-container">
      <div className="bpm-display">
        BPM: {sequencer.getSequencer().settings.bpm}
      </div>
      
      {rows.map((row, rowIndex) => {
        const isSelectedRow = rowIndex === viewState.editRow;
        const isEditingRow = viewState.isEditingField && isSelectedRow;

        if (row.cols) {
          return (
            <div key={rowIndex} className="grid-row">
              {row.cols.map((col, colIndex) => {
                const isSelectedCol = colIndex === viewState.editCol && isSelectedRow;
                const isEditingCol = isEditingRow && isSelectedCol;
                const content = col.value();

                return renderCell(
                  content.toString(),
                  rowIndex,
                  colIndex,
                  isSelectedCol,
                  isEditingCol,
                  () => {
                    handleCellClick(rowIndex, colIndex);
                    handleCellEnter(row, col);
                  }
                );
              })}
            </div>
          );
        }

        return (
          <div key={rowIndex} className="row">
            <span
              className={`cell ${isSelectedRow ? 'selected' : ''}`}
              onClick={() => {
                handleCellClick(rowIndex, 0);
                handleCellEnter(row);
              }}
            >
              {row.value ? row.value() : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export {};
