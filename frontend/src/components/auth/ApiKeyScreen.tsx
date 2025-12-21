import React from 'react';
import { Button } from '../common/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import './ApiKeyScreen.css';

interface ApiKeyScreenProps {
  apiKeyInput: string;
  setApiKeyInput: (value: string) => void;
  isValidatingKey: boolean;
  error: string | null;
  onSubmit: () => void;
}

export const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({
  apiKeyInput,
  setApiKeyInput,
  isValidatingKey,
  error,
  onSubmit,
}) => {
  const { t, language, toggleLanguage } = useLanguage();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidatingKey) {
      onSubmit();
    }
  };

  return (
    <div className="app api-key-screen">
      <div className="api-key-prompt">
        <div className="language-toggle-container">
          <button onClick={toggleLanguage} className="language-toggle">
            {language === 'en' ? '中文' : 'English'}
          </button>
        </div>
        <h1>{t.title}</h1>
        <p>{t.auth.subtitle}</p>
        <input
          type="text"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t.auth.apiKeyPlaceholder}
          className="api-key-input"
          disabled={isValidatingKey}
        />
        {error && (
          <div className="error-message" style={{
            color: 'var(--color-error)',
            marginTop: 'var(--spacing-sm)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        <Button
          onClick={onSubmit}
          variant="primary"
          disabled={isValidatingKey}
        >
          {isValidatingKey ? t.auth.validating : t.auth.submit}
        </Button>
      </div>
    </div>
  );
};
