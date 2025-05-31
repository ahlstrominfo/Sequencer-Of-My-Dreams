import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { MockSequencerService } from './mockSequencer';
import { ViewState } from './types';
import { UIMain } from './components/UIMain';
import { UITrack } from './components/UITrack';
import { UISequencerSettings } from './components/UISequencerSettings';

function App() {
  const [sequencer] = useState(() => new MockSequencerService());
  const [currentView, setCurrentView] = useState<string>('main');
  const [currentTrack, setCurrentTrack] = useState<number>(0);
  const [viewState, setViewState] = useState<ViewState>({
    editRow: 0,
    editCol: 0,
    isEditingField: false,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setViewState(prev => ({
            ...prev,
            editRow: Math.max(0, prev.editRow - 1),
          }));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setViewState(prev => ({
            ...prev,
            editRow: prev.editRow + 1, // We should add bounds checking based on current view
          }));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (viewState.isEditingField) {
            // Handle field editing
          } else {
            setViewState(prev => ({
              ...prev,
              editCol: Math.max(0, prev.editCol - 1),
            }));
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (viewState.isEditingField) {
            // Handle field editing
          } else {
            setViewState(prev => ({
              ...prev,
              editCol: prev.editCol + 1,
            }));
          }
          break;
        case 'Enter':
          event.preventDefault();
          setViewState(prev => ({
            ...prev,
            isEditingField: !prev.isEditingField,
          }));
          break;
        case 'Escape':
          event.preventDefault();
          if (viewState.isEditingField) {
            setViewState(prev => ({ ...prev, isEditingField: false }));
          } else {
            setCurrentView('main');
            setViewState({ editRow: 0, editCol: 0, isEditingField: false });
          }
          break;
        case ' ':
          event.preventDefault();
          sequencer.togglePlay();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sequencer, viewState.isEditingField]);

  const handleViewChange = useCallback((view: string, trackId?: number) => {
    setCurrentView(view);
    if (trackId !== undefined) {
      setCurrentTrack(trackId);
    }
    setViewState({ editRow: 0, editCol: 0, isEditingField: false });
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'main':
        return (
          <UIMain
            sequencer={sequencer}
            viewState={viewState}
            setViewState={setViewState}
            onViewChange={handleViewChange}
          />
        );
      case 'track':
        return (
          <UITrack
            sequencer={sequencer}
            trackId={currentTrack}
            viewState={viewState}
            setViewState={setViewState}
            onViewChange={handleViewChange}
          />
        );
      case 'sequencerSettings':
        return (
          <UISequencerSettings
            sequencer={sequencer}
            viewState={viewState}
            setViewState={setViewState}
            onViewChange={handleViewChange}
          />
        );
      default:
        return <div>Unknown view: {currentView}</div>;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sequencer.destroy();
    };
  }, [sequencer]);

  return (
    <div className="App">
      <div className="terminal-container">
        <div className="header">
          Sequencer Of My Dreams &gt; &gt; &gt; &gt;
        </div>
        
        <div className="view-switcher">
          <button 
            className={`view-button ${currentView === 'main' ? 'active' : ''}`}
            onClick={() => handleViewChange('main')}
          >
            Main
          </button>
          <button 
            className={`view-button ${currentView === 'sequencerSettings' ? 'active' : ''}`}
            onClick={() => handleViewChange('sequencerSettings')}
          >
            Settings
          </button>
          <button 
            className={`view-button ${currentView === 'track' ? 'active' : ''}`}
            onClick={() => handleViewChange('track', 0)}
          >
            Track 0
          </button>
        </div>

        {renderCurrentView()}
        
        <div className="navigation-hint">
          Use arrow keys to navigate, Enter to select/edit, Space to play/stop, Escape to go back
        </div>
      </div>
    </div>
  );
}

export default App;
