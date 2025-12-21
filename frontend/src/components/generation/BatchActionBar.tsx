import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './BatchActionBar.css';

interface BatchActionBarProps {
  totalImages: number;
  selectedCount: number;
  nsfwMode: boolean;
  onNsfwToggle: (enabled: boolean) => void;
  onBatchDownload: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  totalImages,
  selectedCount,
  nsfwMode,
  onNsfwToggle,
  onBatchDownload,
  onBatchDelete,
  onClearSelection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="image-playground-header">
      <h3>{t.batchActions.generatedImages} ({totalImages})</h3>
      <div className="header-controls">
        <label className="nsfw-toggle">
          <input
            type="checkbox"
            checked={nsfwMode}
            onChange={(e) => onNsfwToggle(e.target.checked)}
          />
          <span>{t.batchActions.nsfwMode}</span>
        </label>
        {selectedCount > 0 && (
          <div className="batch-actions">
            <span className="selection-count">
              {selectedCount} {t.batchActions.selected}
            </span>
            <button
              className="batch-action-btn"
              onClick={onBatchDownload}
              title={t.batchActions.download}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {t.batchActions.download}
            </button>
            <button
              className="batch-action-btn batch-action-delete"
              onClick={onBatchDelete}
              title={t.batchActions.deleteSelected}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              {t.batchActions.deleteSelected}
            </button>
            <button
              className="batch-action-btn"
              onClick={onClearSelection}
              title={t.batchActions.clearSelection}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              {t.batchActions.clearSelection}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
