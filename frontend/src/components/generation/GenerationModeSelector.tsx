import React from 'react';
import './GenerationModeSelector.css';

type GenerationMode = 'local' | 'cloud';

interface GenerationModeSelectorProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  localLabel: string;
  cloudLabel: string;
}

export const GenerationModeSelector: React.FC<GenerationModeSelectorProps> = ({
  mode,
  onChange,
  localLabel,
  cloudLabel,
}) => {
  return (
    <div className="mode-selector">
      <button
        className={`mode-button ${mode === 'local' ? 'active' : ''}`}
        onClick={() => onChange('local')}
      >
        {localLabel}
      </button>
      <button
        className={`mode-button ${mode === 'cloud' ? 'active' : ''}`}
        onClick={() => onChange('cloud')}
      >
        {cloudLabel}
      </button>
    </div>
  );
};
