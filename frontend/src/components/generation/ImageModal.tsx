import React, { useEffect } from 'react';
import { Button } from '../common/Button';
import type { ImageMetadata } from '../../types/image';
import './ImageModal.css';

interface ImageModalProps {
  image: ImageMetadata;
  imageUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  language: 'en' | 'zh';
}

const translations = {
  en: {
    close: 'Close',
    download: 'Download',
    prompt: 'Prompt',
    workflow: 'Workflow',
    created: 'Created',
    filename: 'Filename',
    generationParams: 'Generation Parameters',
    seed: 'Seed',
    steps: 'Steps',
    cfg: 'CFG Scale',
    denoise: 'Denoise',
    width: 'Width',
    height: 'Height',
    batchSize: 'Batch Size',
    sampler: 'Sampler',
    scheduler: 'Scheduler',
    previous: 'Previous',
    next: 'Next',
  },
  zh: {
    close: '关闭',
    download: '下载',
    prompt: '提示词',
    workflow: '工作流',
    created: '创建时间',
    filename: '文件名',
    generationParams: '生成参数',
    seed: '随机种子',
    steps: '采样步数',
    cfg: 'CFG 比例',
    denoise: '去噪强度',
    width: '宽度',
    height: '高度',
    batchSize: '批次大小',
    sampler: '采样器',
    scheduler: '调度器',
    previous: '上一张',
    next: '下一张',
  },
};

export const ImageModal: React.FC<ImageModalProps> = ({
  image,
  imageUrl,
  onClose,
  onDownload,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  language,
}) => {
  const t = translations[language];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copySeed = () => {
    const seed = image.metadata?.generation_params?.seed;
    if (seed !== undefined) {
      navigator.clipboard.writeText(String(seed));
    }
  };

  const copyPrompt = () => {
    if (image.prompt) {
      navigator.clipboard.writeText(image.prompt);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Left or Up arrow: Previous image
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && hasPrevious && onPrevious) {
        e.preventDefault();
        onPrevious();
      }
      // Right or Down arrow: Next image
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
      // Escape: Close modal
      else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrevious, onNext, onPrevious, onClose]);

  return (
    <div className="image-modal-backdrop" onClick={handleBackdropClick}>
      <div className="image-modal">
        <div className="modal-header">
          <h2>{image.filename}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-image-container">
            {hasPrevious && onPrevious && (
              <button
                className="image-nav-button image-nav-prev"
                onClick={onPrevious}
                title={t.previous}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}
            <img src={imageUrl} alt={image.prompt} className="modal-image" />
            {hasNext && onNext && (
              <button
                className="image-nav-button image-nav-next"
                onClick={onNext}
                title={t.next}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            )}
          </div>

          <div className="modal-metadata">
            <div className="metadata-item prompt-item">
              <span className="metadata-label">{t.prompt}:</span>
              <span className="metadata-value prompt-value">
                {image.prompt}
                <button className="copy-prompt-btn" onClick={copyPrompt} title="Copy prompt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">{t.workflow}:</span>
              <span className="metadata-value">{image.workflow_name}</span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">{t.created}:</span>
              <span className="metadata-value">
                {new Date(image.created_at).toLocaleString()}
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">{t.filename}:</span>
              <span className="metadata-value">{image.filename}</span>
            </div>

            {image.metadata?.generation_params && (
              <>
                <div className="metadata-divider"></div>
                <div className="metadata-section">
                  <h4>{t.generationParams}</h4>
                  {image.metadata.generation_params.seed !== undefined && (
                    <div className="metadata-item seed-item">
                      <span className="metadata-label">{t.seed}:</span>
                      <span className="metadata-value seed-value">
                        {image.metadata.generation_params.seed}
                        <button className="copy-seed-btn" onClick={copySeed} title="Copy seed">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </span>
                    </div>
                  )}
                  {image.metadata.generation_params.steps !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.steps}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.steps}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.cfg !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.cfg}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.cfg}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.denoise !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.denoise}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.denoise}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.width !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.width}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.width}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.height !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.height}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.height}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.batch_size !== undefined && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.batchSize}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.batch_size}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.sampler && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.sampler}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.sampler}</span>
                    </div>
                  )}
                  {image.metadata.generation_params.scheduler && (
                    <div className="metadata-item">
                      <span className="metadata-label">{t.scheduler}:</span>
                      <span className="metadata-value">{image.metadata.generation_params.scheduler}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <Button onClick={onDownload} variant="primary">
            {t.download}
          </Button>
          <Button onClick={onClose} variant="secondary">
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
};
