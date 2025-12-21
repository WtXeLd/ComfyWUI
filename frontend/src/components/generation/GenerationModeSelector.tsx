import React from 'react';
import './GenerationModeSelector.css';

type GenerationMode = 'local' | 'google';

interface GenerationModeSelectorProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  localLabel: string;
  googleLabel: string;
}

export const GenerationModeSelector: React.FC<GenerationModeSelectorProps> = ({
  mode,
  onChange,
  localLabel,
  googleLabel,
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
        className={`mode-button ${mode === 'google' ? 'active' : ''}`}
        onClick={() => onChange('google')}
      >
        {googleLabel}
      </button>
    </div>
  );
};
