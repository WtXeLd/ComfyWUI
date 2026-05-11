import React from 'react';
import { Button } from '../common/Button';
import { GenerationModeSelector } from './GenerationModeSelector';
import { AdvancedSettings } from './AdvancedSettings';
import { useTranslation } from '../../hooks/useTranslation';
import type { WorkflowConfig } from '../../types/workflow';
import type { CloudModel } from '../../services/cloudService';
import './GenerationControls.css';

type GenerationMode = 'local' | 'cloud';

const RUNWARE_2K_SIZES: Record<string, { width: number; height: number }> = {
  '1:1': { width: 2048, height: 2048 },
  '4:3': { width: 2304, height: 1728 },
  '3:4': { width: 1728, height: 2304 },
  '16:9': { width: 2560, height: 1440 },
  '9:16': { width: 1440, height: 2560 },
  '3:2': { width: 2496, height: 1664 },
  '2:3': { width: 1664, height: 2496 },
  '21:9': { width: 3024, height: 1296 },
};

interface GenerationControlsProps {
  // Mode
  generationMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;

  // Local mode
  workflows: WorkflowConfig[];
  selectedWorkflow: string | null;
  onWorkflowChange: (id: string) => void;
  uploadedImageFile: string | null;
  uploadedImagePreview: string | null;
  isUploading: boolean;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;

  // Cloud mode
  cloudModels: CloudModel[];
  selectedCloudModel: string;
  onCloudModelChange: (id: string) => void;
  cloudAspectRatio: string;
  onCloudAspectRatioChange: (ratio: string) => void;
  cloudResolutionTier: string;
  onCloudResolutionTierChange: (tier: string) => void;
  cloudWidth: number;
  onCloudWidthChange: (width: number) => void;
  cloudHeight: number;
  onCloudHeightChange: (height: number) => void;
  cloudReferenceImage: string | null;
  cloudReferencePreview: string | null;
  onCloudReferenceUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCloudReferenceRemove: () => void;

  // Common
  prompt: string;
  onPromptChange: (value: string) => void;
  promptInputHeight: string;
  promptInputRef: React.RefObject<HTMLTextAreaElement>;
  onGenerate: () => void;
  canGenerate: boolean;
}

export const GenerationControls: React.FC<GenerationControlsProps> = (props) => {
  const { t } = useTranslation();

  const selectedCloudModelData = props.cloudModels.find(m => m.id === props.selectedCloudModel);
  const selectedWorkflowData = props.workflows.find(w => w.id === props.selectedWorkflow);

  // Check if selected model is Runware
  const isRunwareModel = selectedCloudModelData?.provider === 'runware';
  const runwareAspectRatios = selectedCloudModelData?.aspect_ratios?.filter(ratio => RUNWARE_2K_SIZES[ratio]) || [];

  return (
    <div className="generation-controls">
      <div className="generation-controls-scroll">
        {/* Generation Mode Selector */}
        <GenerationModeSelector
          mode={props.generationMode}
          onChange={props.onModeChange}
          localLabel={t.generation.modeLocal}
          cloudLabel={t.generation.modeCloud || 'Cloud'}
        />

        {/* Local Mode - Workflow Selection */}
        {props.generationMode === 'local' && (
          <div className="control-group">
            <label>{t.generation.workflow}</label>
            <select
              value={props.selectedWorkflow || ''}
              onChange={(e) => props.onWorkflowChange(e.target.value)}
              className="workflow-select"
              disabled={props.workflows.length === 0}
            >
              {props.workflows.length === 0 ? (
                <option value="">{t.generation.noWorkflowsAvailable}</option>
              ) : (
                props.workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Cloud Mode - Model Selection */}
        {props.generationMode === 'cloud' && (
          <div className="control-group">
            <label>{t.generation.model}</label>
            <select
              value={props.selectedCloudModel}
              onChange={(e) => props.onCloudModelChange(e.target.value)}
              className="workflow-select"
            >
              {props.cloudModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Prompt Textarea */}
        <div className="control-group">
          <label>{t.generation.prompt}</label>
          <textarea
            ref={props.promptInputRef}
            value={props.prompt}
            onChange={(e) => props.onPromptChange(e.target.value)}
            placeholder={t.generation.promptPlaceholder}
            className="prompt-input"
            rows={4}
            style={{ height: props.promptInputHeight }}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={props.onGenerate}
          disabled={!props.canGenerate}
          variant="primary"
          size="lg"
        >
          {t.generation.generateImage}
        </Button>

        {/* Cloud Mode - Reference Image Upload */}
        {props.generationMode === 'cloud' && selectedCloudModelData?.supports_reference_image && (
          <div className="control-group image-upload-section">
            <label>{t.generation.referenceImage}</label>
            {!props.cloudReferenceImage ? (
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={props.onCloudReferenceUpload}
                  style={{ display: 'none' }}
                  id="cloud-image-upload"
                />
                <label htmlFor="cloud-image-upload" className="image-upload-button">
                  {t.generation.uploadImage}
                </label>
              </div>
            ) : (
              <div className="image-uploaded">
                {props.cloudReferencePreview && (
                  <img src={props.cloudReferencePreview} alt="Reference" className="image-preview" />
                )}
                <div className="image-uploaded-info">
                  <span className="image-uploaded-label">{t.generation.imageUploaded}</span>
                  <button
                    className="image-remove-button"
                    onClick={props.onCloudReferenceRemove}
                    type="button"
                  >
                    {t.generation.removeImage}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cloud Mode - Aspect Ratio (for non-Runware models) */}
        {props.generationMode === 'cloud' && !isRunwareModel && selectedCloudModelData?.aspect_ratios && selectedCloudModelData.aspect_ratios.length > 0 && (
          <div className="control-group">
            <label>{t.generation.aspectRatio}</label>
            <select
              value={props.cloudAspectRatio}
              onChange={(e) => props.onCloudAspectRatioChange(e.target.value)}
              className="workflow-select"
            >
              {selectedCloudModelData.aspect_ratios.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cloud Mode - Resolution Tier (for models that support it) */}
        {props.generationMode === 'cloud' && selectedCloudModelData?.supports_resolution_tiers && selectedCloudModelData.resolution_tiers && (
          <div className="control-group">
            <label>{t.generation.resolution}</label>
            <select
              value={props.cloudResolutionTier}
              onChange={(e) => props.onCloudResolutionTierChange(e.target.value)}
              className="workflow-select"
            >
              {selectedCloudModelData.resolution_tiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cloud Mode - Runware specific parameters */}
        {props.generationMode === 'cloud' && isRunwareModel && runwareAspectRatios.length > 0 && (
          <div className="control-group">
            <label>{t.generation.aspectRatio}</label>
            <select
              value={RUNWARE_2K_SIZES[props.cloudAspectRatio] ? props.cloudAspectRatio : runwareAspectRatios[0]}
              onChange={(e) => {
                const size = RUNWARE_2K_SIZES[e.target.value];
                props.onCloudAspectRatioChange(e.target.value);
                props.onCloudWidthChange(size.width);
                props.onCloudHeightChange(size.height);
              }}
              className="workflow-select"
            >
              {runwareAspectRatios.map((ratio) => {
                const size = RUNWARE_2K_SIZES[ratio];
                return (
                  <option key={ratio} value={ratio}>
                    {ratio} - {size.width}×{size.height}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Local Mode - Image Upload (if workflow requires it) */}
        {props.generationMode === 'local' && props.selectedWorkflow && selectedWorkflowData?.image_node_id && (
          <div className="control-group image-upload-section">
            {!props.uploadedImageFile ? (
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={props.onImageUpload}
                  disabled={props.isUploading}
                  style={{ display: 'none' }}
                  id="image-upload-input"
                />
                <label htmlFor="image-upload-input" className="image-upload-button">
                  {props.isUploading ? t.generation.uploadingImage : t.generation.uploadImage}
                </label>
              </div>
            ) : (
              <div className="image-uploaded">
                {props.uploadedImagePreview && (
                  <img src={props.uploadedImagePreview} alt="Uploaded" className="image-preview" />
                )}
                <div className="image-uploaded-info">
                  <span className="image-uploaded-label">{t.generation.imageUploaded}</span>
                  <button
                    className="image-remove-button"
                    onClick={props.onImageRemove}
                    type="button"
                  >
                    {t.generation.removeImage}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local Mode - Advanced Settings */}
        {props.generationMode === 'local' && (
          <AdvancedSettings workflowId={props.selectedWorkflow} workflows={props.workflows} />
        )}
      </div>
    </div>
  );
};
