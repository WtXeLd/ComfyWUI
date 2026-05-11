import React from 'react';
import { Button } from '../common/Button';
import { CustomSelect } from '../common/CustomSelect';
import { GenerationModeSelector } from './GenerationModeSelector';
import { AdvancedSettings } from './AdvancedSettings';
import { useTranslation } from '../../hooks/useTranslation';
import type { WorkflowConfig } from '../../types/workflow';
import type { CloudModel } from '../../services/cloudService';
import './GenerationControls.css';

type GenerationMode = 'local' | 'cloud';

const RUNWARE_MODEL_SIZES: Record<string, Record<string, { width: number; height: number }>> = {
  'bytedance:seedream@4.5': {
    '1:1': { width: 2048, height: 2048 },
    '4:3': { width: 2304, height: 1728 },
    '3:4': { width: 1728, height: 2304 },
    '16:9': { width: 2560, height: 1440 },
    '9:16': { width: 1440, height: 2560 },
    '3:2': { width: 2496, height: 1664 },
    '2:3': { width: 1664, height: 2496 },
    '21:9': { width: 3024, height: 1296 },
  },
  'openai:1@1': {
    '3:2': { width: 1536, height: 1024 },
  },
  'openai:gpt-image@2': {
    '3:2': { width: 1536, height: 1024 },
    '4:3': { width: 1024, height: 768 },
  },
  'openai:1@2': {
    '1:1': { width: 1024, height: 1024 },
    '2:3': { width: 1024, height: 1536 },
    '3:2': { width: 1536, height: 1024 },
  },
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
  const runwareSizes = selectedCloudModelData ? RUNWARE_MODEL_SIZES[selectedCloudModelData.model_id] : undefined;
  const runwareAspectRatios = selectedCloudModelData?.aspect_ratios?.filter(ratio => runwareSizes?.[ratio]) || [];

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
            <CustomSelect
              value={props.selectedWorkflow || ''}
              onChange={props.onWorkflowChange}
              disabled={props.workflows.length === 0}
              placeholder={t.generation.noWorkflowsAvailable}
              options={props.workflows.map((w) => ({
                value: w.id,
                label: w.name,
              }))}
            />
          </div>
        )}

        {/* Cloud Mode - Model Selection */}
        {props.generationMode === 'cloud' && (
          <div className="control-group">
            <label>{t.generation.model}</label>
            <CustomSelect
              value={props.selectedCloudModel}
              onChange={props.onCloudModelChange}
              options={props.cloudModels.map((model) => ({
                value: model.id,
                label: model.name,
              }))}
            />
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
            <CustomSelect
              value={props.cloudAspectRatio}
              onChange={props.onCloudAspectRatioChange}
              options={selectedCloudModelData.aspect_ratios.map((ratio) => ({
                value: ratio,
                label: ratio,
              }))}
            />
          </div>
        )}

        {/* Cloud Mode - Resolution Tier (for models that support it) */}
        {props.generationMode === 'cloud' && selectedCloudModelData?.supports_resolution_tiers && selectedCloudModelData.resolution_tiers && (
          <div className="control-group">
            <label>{t.generation.resolution}</label>
            <CustomSelect
              value={props.cloudResolutionTier}
              onChange={props.onCloudResolutionTierChange}
              options={selectedCloudModelData.resolution_tiers.map((tier) => ({
                value: tier,
                label: tier,
              }))}
            />
          </div>
        )}

        {/* Cloud Mode - Runware specific parameters */}
        {props.generationMode === 'cloud' && isRunwareModel && runwareAspectRatios.length > 0 && (
          <div className="control-group">
            <label>{t.generation.aspectRatio}</label>
            <CustomSelect
              value={runwareSizes?.[props.cloudAspectRatio] ? props.cloudAspectRatio : runwareAspectRatios[0]}
              onChange={(ratio) => {
                const size = runwareSizes?.[ratio];
                props.onCloudAspectRatioChange(ratio);
                if (size) {
                  props.onCloudWidthChange(size.width);
                  props.onCloudHeightChange(size.height);
                }
              }}
              options={runwareAspectRatios.map((ratio) => {
                const size = runwareSizes?.[ratio];
                return {
                  value: ratio,
                  label: size ? `${ratio} - ${size.width}×${size.height}` : ratio,
                };
              })}
            />
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
