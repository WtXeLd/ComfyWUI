import React from 'react';
import { Button } from '../common/Button';
import { GenerationModeSelector } from './GenerationModeSelector';
import { AdvancedSettings } from './AdvancedSettings';
import { useTranslation } from '../../hooks/useTranslation';
import type { WorkflowConfig } from '../../types/workflow';
import type { GoogleAIModel } from '../../services/googleAiService';
import './GenerationControls.css';

type GenerationMode = 'local' | 'google';

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

  // Google mode
  googleModels: GoogleAIModel[];
  selectedGoogleModel: string;
  onGoogleModelChange: (id: string) => void;
  googleAspectRatio: string;
  onGoogleAspectRatioChange: (ratio: string) => void;
  googleResolutionTier: string;
  onGoogleResolutionTierChange: (tier: string) => void;
  googleReferenceImage: string | null;
  googleReferencePreview: string | null;
  onGoogleReferenceUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGoogleReferenceRemove: () => void;

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

  const selectedGoogleModelData = props.googleModels.find(m => m.id === props.selectedGoogleModel);
  const selectedWorkflowData = props.workflows.find(w => w.id === props.selectedWorkflow);

  return (
    <div className="generation-controls">
      <div className="generation-controls-scroll">
        {/* Generation Mode Selector */}
        <GenerationModeSelector
          mode={props.generationMode}
          onChange={props.onModeChange}
          localLabel={t.generation.modeLocal}
          googleLabel={t.generation.modeGoogle}
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

        {/* Google Mode - Model Selection */}
        {props.generationMode === 'google' && (
          <div className="control-group">
            <label>{t.generation.model}</label>
            <select
              value={props.selectedGoogleModel}
              onChange={(e) => props.onGoogleModelChange(e.target.value)}
              className="workflow-select"
            >
              {props.googleModels.map((model) => (
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

        {/* Google Mode - Reference Image Upload */}
        {props.generationMode === 'google' && (
          <div className="control-group image-upload-section">
            <label>{t.generation.referenceImage}</label>
            {!props.googleReferenceImage ? (
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  onChange={props.onGoogleReferenceUpload}
                  style={{ display: 'none' }}
                  id="google-image-upload"
                />
                <label htmlFor="google-image-upload" className="image-upload-button">
                  {t.generation.uploadImage}
                </label>
              </div>
            ) : (
              <div className="image-uploaded">
                {props.googleReferencePreview && (
                  <img src={props.googleReferencePreview} alt="Reference" className="image-preview" />
                )}
                <div className="image-uploaded-info">
                  <span className="image-uploaded-label">{t.generation.imageUploaded}</span>
                  <button
                    className="image-remove-button"
                    onClick={props.onGoogleReferenceRemove}
                    type="button"
                  >
                    {t.generation.removeImage}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Mode - Aspect Ratio */}
        {props.generationMode === 'google' && (
          <div className="control-group">
            <label>{t.generation.aspectRatio}</label>
            <select
              value={props.googleAspectRatio}
              onChange={(e) => props.onGoogleAspectRatioChange(e.target.value)}
              className="workflow-select"
            >
              {selectedGoogleModelData?.aspect_ratios.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Google Mode - Resolution Tier */}
        {props.generationMode === 'google' && props.selectedGoogleModel === 'gemini-3-pro-image-preview' && (
          <div className="control-group">
            <label>{t.generation.resolution}</label>
            <select
              value={props.googleResolutionTier}
              onChange={(e) => props.onGoogleResolutionTierChange(e.target.value)}
              className="workflow-select"
            >
              {selectedGoogleModelData?.resolution_tiers?.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
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
