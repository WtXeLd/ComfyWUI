import React, { useState } from 'react';
import { imageService } from '../../services/imageService';
import { useTranslation } from '../../hooks/useTranslation';
import { ContextMenu } from '../common/ContextMenu';
import type { ImageMetadata } from '../../types/image';
import './ImageGrid.css';

interface GeneratingImage {
  id: string;
  prompt: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  progress?: number;
  imageData?: ImageMetadata;
}

interface ImageGridProps {
  generatingImages: GeneratingImage[];
  completedImages: ImageMetadata[];
  selectedImageIds: Set<string>;
  nsfwMode: boolean;
  onImageClick: (image: ImageMetadata) => void;
  onToggleSelection: (imageId: string, event: React.MouseEvent) => void;
  onRemoveGenerating?: (imageId: string) => void;
  onDownloadImage?: (image: ImageMetadata) => void;
  onDeleteImage?: (image: ImageMetadata) => void;
  onSelectImage?: (imageId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  generatingImages,
  completedImages,
  selectedImageIds,
  nsfwMode,
  onImageClick,
  onToggleSelection,
  onRemoveGenerating,
  onDownloadImage,
  onDeleteImage,
  onSelectImage,
  onSelectAll,
  onClearSelection,
  isLoadingMore = false,
  // hasMore = false,
}) => {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    image: ImageMetadata;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, image: ImageMetadata) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      image,
    });
  };

  // Filter out images already shown in generatingImages as completed
  const filteredImages = completedImages.filter(img => {
    return !generatingImages.some(genImg =>
      genImg.status === 'completed' && genImg.imageData?.id === img.id
    );
  });

  return (
    <div className="image-grid">
      {/* Loading placeholders and completed images for generating tasks */}
      {generatingImages.map((img) => {
        // If completed and has image data, render as image card
        if (img.status === 'completed' && img.imageData) {
          return (
            <div
              key={img.id}
              className={`image-card ${selectedImageIds.has(img.imageData.id) ? 'selected' : ''} ${nsfwMode ? 'nsfw-mode' : ''}`}
              onClick={() => onImageClick(img.imageData!)}
              onContextMenu={(e) => handleContextMenu(e, img.imageData!)}
            >
              <div
                className="image-checkbox"
                onClick={(e) => onToggleSelection(img.imageData!.id, e)}
              >
                <input
                  type="checkbox"
                  checked={selectedImageIds.has(img.imageData.id)}
                  onChange={() => {}}
                />
              </div>
              <div className="image-thumbnail-container">
                <img
                  src={imageService.getDownloadUrl(img.imageData.id)}
                  alt={img.imageData.prompt}
                  className="image-thumbnail"
                />
                <div className="nsfw-overlay">NSFW</div>
              </div>
              <div className="image-info">
                <p className="image-prompt">{img.imageData.prompt}</p>
                <p className="text-secondary image-meta">
                  {img.imageData.workflow_name} • {new Date(img.imageData.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        }

        // Otherwise render as loading/failed card
        return (
          <div key={img.id} className="loading-card">
            {img.status === 'failed' && onRemoveGenerating && (
              <button
                className="loading-card-close"
                onClick={() => onRemoveGenerating(img.id)}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            )}
            <div className="loading-placeholder">
              {img.status !== 'failed' && <div className="loading-spinner"></div>}
              <span className="loading-text">
                {img.status === 'queued' ? t.imageGrid.queued :
                 img.status === 'processing' ? t.imageGrid.generating :
                 img.status === 'failed' ? t.imageGrid.failed :
                 img.status}
              </span>
              {img.progress !== undefined && img.progress > 0 && (
                <span className="loading-text">{img.progress}%</span>
              )}
            </div>
            <div className="loading-info">
              <p className="loading-prompt">{img.prompt}</p>
              <p className="loading-status">{img.workflow_name}</p>
            </div>
          </div>
        );
      })}

      {/* Actual generated images */}
      {filteredImages.length === 0 && generatingImages.length === 0 ? (
        <div className="empty-state">
          <p>{t.imageGrid.noImages}</p>
          <p className="text-secondary">{t.imageGrid.generateFirst}</p>
        </div>
      ) : (
        filteredImages.map((img) => (
          <div
            key={img.id}
            className={`image-card ${selectedImageIds.has(img.id) ? 'selected' : ''} ${nsfwMode ? 'nsfw-mode' : ''}`}
            onClick={() => onImageClick(img)}
            onContextMenu={(e) => handleContextMenu(e, img)}
          >
            <div
              className="image-checkbox"
              onClick={(e) => onToggleSelection(img.id, e)}
            >
              <input
                type="checkbox"
                checked={selectedImageIds.has(img.id)}
                onChange={() => {}}
              />
            </div>
            <div className="image-thumbnail-container">
              <img
                src={imageService.getDownloadUrl(img.id)}
                alt={img.prompt}
                className="image-thumbnail"
              />
              <div className="nsfw-overlay">NSFW</div>
            </div>
            <div className="image-info">
              <p className="image-prompt">{img.prompt}</p>
              <p className="text-secondary image-meta">
                {img.workflow_name} • {new Date(img.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="loading-more-indicator">
          <div className="loading-spinner"></div>
          <p className="loading-text">{t.imageGrid.loadingMore || 'Loading more images...'}</p>
        </div>
      )}

      {/* No more images indicator */}
      {/* {!hasMore && completedImages.length > 0 && !isLoadingMore && (
        <div className="no-more-indicator">
          <p className="text-secondary">{t.imageGrid.noMoreImages || 'No more images'}</p>
        </div>
      )} */}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            // 选择操作
            {
              label: selectedImageIds.has(contextMenu.image.id)
                ? (t.imageGrid?.unselect || 'Unselect')
                : (t.imageGrid?.select || 'Select'),
              icon: selectedImageIds.has(contextMenu.image.id) ? '☐' : '☑',
              onClick: () => {
                if (onSelectImage) {
                  onSelectImage(contextMenu.image.id);
                }
              },
            },
            {
              label: t.imageGrid?.selectAll || 'Select All',
              icon: '☑',
              onClick: () => {
                if (onSelectAll) {
                  onSelectAll();
                }
              },
            },
            {
              label: t.imageGrid?.clearSelection || 'Clear Selection',
              icon: '☐',
              onClick: () => {
                if (onClearSelection) {
                  onClearSelection();
                }
              },
            },
            // 分隔线
            {
              label: '',
              onClick: () => {},
              divider: true,
            },
            // 图片操作
            {
              label: t.imageGrid?.download || 'Download',
              icon: '↓',
              onClick: () => {
                if (onDownloadImage) {
                  onDownloadImage(contextMenu.image);
                }
              },
            },
            {
              label: t.imageGrid?.delete || 'Delete',
              icon: '×',
              danger: true,
              onClick: () => {
                if (onDeleteImage) {
                  onDeleteImage(contextMenu.image);
                }
              },
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
