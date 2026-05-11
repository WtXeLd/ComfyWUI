import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/common/Button';
import { Dialog } from './components/common/Dialog';
import { ScrollToTop } from './components/common/ScrollToTop';
import { WorkflowEditor } from './components/configuration/WorkflowEditor';
import { ImageModal } from './components/generation/ImageModal';
import { ApiKeyScreen } from './components/auth/ApiKeyScreen';
import { GenerationControls } from './components/generation/GenerationControls';
import { BatchActionBar } from './components/generation/BatchActionBar';
import { ImageGrid } from './components/generation/ImageGrid';
import { workflowService } from './services/workflowService';
import { imageService } from './services/imageService';
import { authService } from './services/authService';
import { cloudService } from './services/cloudService';
import apiService from './services/api';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';
import { useWebSocketManager } from './hooks/useWebSocketManager';
import { useImageSelection } from './hooks/useImageSelection';
import { useImageUpload } from './hooks/useImageUpload';
import { useLocalGeneration } from './hooks/useLocalGeneration';
import { useCloudGeneration } from './hooks/useCloudGeneration';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import type { Language } from './locales';
import type { WorkflowConfig } from './types/workflow';
import type { ImageMetadata } from './types/image';
import type { CloudModel } from './services/cloudService';
import iconImage from '/icon_small.png';
import './App.css';

type Tab = 'configuration' | 'generation';
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

function AppContent() {
  // ==================== LANGUAGE ====================
  const { language, setLanguage: _setLanguage, t, toggleLanguage } = useLanguage();

  // ==================== STATE ====================
  // Navigation
  const [currentTab, setCurrentTab] = useState<Tab>('generation');

  // Authentication
  const [_apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  // Workflows
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useLocalStorageSync<string | null>('lastSelectedWorkflow', null);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowConfig | null>(null);

  // Images
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Generation
  const [prompt, setPrompt] = useLocalStorageSync('lastPrompt', 'a beautiful landscape');
  const [generatingImages, setGeneratingImages] = useLocalStorageSync<any[]>('generatingImages', []);
  const [generationMode, setGenerationMode] = useLocalStorageSync<GenerationMode>('generationMode', 'local');
  const [nsfwMode, setNsfwMode] = useLocalStorageSync('nsfwMode', false);

  // Cloud (Google AI, Runware, etc.)
  const [cloudModels, setCloudModels] = useState<CloudModel[]>([]);
  const [selectedCloudModel, setSelectedCloudModel] = useLocalStorageSync('selectedCloudModel', 'google-gemini-2.5-flash');
  const [cloudAspectRatio, setCloudAspectRatio] = useLocalStorageSync('cloudAspectRatio', '1:1');
  const [cloudResolutionTier, setCloudResolutionTier] = useLocalStorageSync('cloudResolutionTier', '1K');
  const [cloudWidth, setCloudWidth] = useLocalStorageSync('cloudWidth', 1920);
  const [cloudHeight, setCloudHeight] = useLocalStorageSync('cloudHeight', 1920);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title?: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
  }>({
    message: '',
    type: 'alert',
    onConfirm: () => {},
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const isInitialRenderRef = useRef(true);

  // Prompt input height management
  const [promptInputHeight, setPromptInputHeight] = useState(() => {
    const savedHeight = localStorage.getItem('promptInputHeight');
    return savedHeight || 'auto';
  });

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-toggle')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Infinite scroll - load more images when scrolling near bottom
  useEffect(() => {
    if (currentTab !== 'generation') return;

    const mainElement = document.querySelector('.main');
    if (!mainElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainElement;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 300; // Trigger 300px before bottom

      if (scrolledToBottom && hasMoreImages && !isLoadingMore) {
        if (isLoadingMore || !hasMoreImages) return;

        setIsLoadingMore(true);
        const nextPage = currentPage + 1;
        loadImages(nextPage, true).then(() => {
          setCurrentPage(nextPage);
          setIsLoadingMore(false);
        });
      }
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [currentTab, hasMoreImages, isLoadingMore, currentPage]);

  // ==================== CUSTOM HOOKS ====================
  // WebSocket Manager
  const wsManager = useWebSocketManager({
    onProgress: (promptId, data) => {
      setGeneratingImages(prev =>
        prev.map(img =>
          img.id === promptId
            ? {
                ...img,
                status: data.status || img.status,
                progress: data.progress_percent || img.progress
              }
            : img
        )
      );
    },
    onComplete: async (promptId, _data) => {
      // Backend saves immediately, fetch the new image directly
      try {
        const newImages = await imageService.list({ page: 1, page_size: 50 });
        const newImage = newImages.images.find(img => img.prompt_id === promptId);

        if (newImage) {
          // Successfully found the image
          setGeneratingImages(prev =>
            prev.map(img =>
              img.id === promptId
                ? { ...img, status: 'completed', imageData: newImage }
                : img
            )
          );

          // Add the new image to the completed images list, sorted by created_at
          setImages(prev => {
            const newList = [newImage, ...prev];
            // Sort by created_at descending (newest first)
            return newList.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });

          // Remove from generating images after smooth transition
          setTimeout(() => {
            setGeneratingImages(prev => prev.filter(img => img.id !== promptId));
          }, 5000);
        } else {
          // Image not found
          console.error(`Image not found for prompt ${promptId}`);
          setGeneratingImages(prev =>
            prev.map(img =>
              img.id === promptId
                ? { ...img, status: 'failed' }
                : img
            )
          );
          setError('Failed to retrieve generated image. Please check your images list.');

          setTimeout(() => {
            setGeneratingImages(prev => prev.filter(img => img.id !== promptId));
          }, 3000);
        }
      } catch (err) {
        console.error(`Error fetching image for prompt ${promptId}:`, err);
        setGeneratingImages(prev => prev.filter(img => img.id !== promptId));
      }
    },
    onError: (promptId, error) => {
      setGeneratingImages(prev =>
        prev.map(img =>
          img.id === promptId ? { ...img, status: 'failed' } : img
        )
      );
      setError(`Generation failed: ${error}`);

      setTimeout(() => {
        setGeneratingImages(prev => prev.filter(img => img.id !== promptId));
      }, 2000);
    },
  });

  // Image Selection
  const imageSelection = useImageSelection({
    images,
    currentTab,
  });

  // Local Image Upload
  const localImageUpload = useImageUpload({
    uploadEndpoint: '/api/generate/upload-image',
    onError: setError,
  });

  // Local Generation
  const localGeneration = useLocalGeneration({
    workflows,
    onGenerationStart: (generatingImage) => {
      setGeneratingImages(prev => [generatingImage, ...prev]);
    },
    onError: setError,
  });

  // Cloud Generation
  const cloudGeneration = useCloudGeneration({
    models: cloudModels,
    onGenerationStart: (generatingImage) => {
      setGeneratingImages(prev => [generatingImage, ...prev]);
    },
    onGenerationComplete: (tempId, imageData) => {
      // Update the generating image with completed status and image data
      setGeneratingImages(prev =>
        prev.map(img =>
          img.id === tempId
            ? { ...img, status: 'completed', imageData }
            : img
        )
      );

      // Add the new image to the completed images list, sorted by created_at
      setImages(prev => {
        const newList = [imageData, ...prev];
        // Sort by created_at descending (newest first)
        return newList.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Remove from generating images after a longer delay to show smooth transition
      setTimeout(() => {
        setGeneratingImages(prev => prev.filter(img => img.id !== tempId));
      }, 5000);
    },
    onGenerationFailed: (tempId, _error) => {
      setGeneratingImages(prev =>
        prev.map(img =>
          img.id === tempId ? { ...img, status: 'failed' } : img
        )
      );

      setTimeout(() => {
        setGeneratingImages(prev => prev.filter(img => img.id !== tempId));
      }, 2000);
    },
    onError: setError,
  });

  const selectedCloudModelData = cloudModels.find(model => model.id === selectedCloudModel);
  const isRunwareModel = selectedCloudModelData?.provider === 'runware';

  // ==================== EFFECTS ====================
  // Initial load
  useEffect(() => {
    const key = apiService.getApiKey();
    if (key) {
      setApiKey(key);
      loadWorkflows();
      loadImages();
      loadGeneratingImages();
      loadCloudModels();
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  // Load generating images from localStorage
  const loadGeneratingImages = () => {
    const saved = localStorage.getItem('generatingImages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out failed tasks and old tasks (older than 1 hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const validImages = parsed.filter((img: any) => {
          // Remove failed tasks
          if (img.status === 'failed') {
            return false;
          }
          // Remove very old tasks (might be stuck)
          if (img.timestamp && img.timestamp < oneHourAgo) {
            return false;
          }
          return true;
        });

        setGeneratingImages(validImages);
        // Reconnect WebSockets for valid tasks
        validImages.forEach((img: any) => {
          if (img.status === 'processing' || img.status === 'queued') {
            wsManager.connect(img.id, img.workflow_id, img.prompt, img.override_params);
          }
        });
      } catch (e) {
        console.error('Failed to load generating images:', e);
      }
    }
  };

  useEffect(() => {
    if (!isRunwareModel) return;

    const nextRatio = RUNWARE_2K_SIZES[cloudAspectRatio]
      ? cloudAspectRatio
      : selectedCloudModelData?.aspect_ratios.find(ratio => RUNWARE_2K_SIZES[ratio]) || '1:1';
    const size = RUNWARE_2K_SIZES[nextRatio];

    if (nextRatio !== cloudAspectRatio) {
      setCloudAspectRatio(nextRatio);
    }
    if (cloudWidth !== size.width) {
      setCloudWidth(size.width);
    }
    if (cloudHeight !== size.height) {
      setCloudHeight(size.height);
    }
  }, [isRunwareModel, selectedCloudModelData, cloudAspectRatio, cloudWidth, cloudHeight, setCloudAspectRatio, setCloudWidth, setCloudHeight]);

  // Monitor prompt input height
  useEffect(() => {
    const textarea = promptInputRef.current;
    if (!textarea) return;

    const timer = setTimeout(() => {
      isInitialRenderRef.current = false;
    }, 100);

    const resizeObserver = new ResizeObserver((entries) => {
      if (isInitialRenderRef.current) return;

      for (const entry of entries) {
        const height = entry.target.clientHeight;
        const heightStr = `${height}px`;
        setPromptInputHeight(heightStr);
        localStorage.setItem('promptInputHeight', heightStr);
      }
    });

    resizeObserver.observe(textarea);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  // ==================== HANDLERS ====================
  // Authentication
  const handleSetApiKey = async () => {
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) return;

    setIsValidatingKey(true);
    setError(null);

    try {
      const isValid = await authService.validateKey(trimmedKey);

      if (isValid) {
        apiService.setApiKey(trimmedKey);
        setApiKey(trimmedKey);
        setShowApiKeyInput(false);
        setApiKeyInput('');
        loadWorkflows();
        loadImages();
      } else {
        setError(t.errors.invalidApiKey);
      }
    } catch (err) {
      console.error('Failed to validate API key:', err);
      setError(t.errors.invalidApiKey);
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleLogout = () => {
    apiService.clearApiKey();
    setApiKey('');
    setApiKeyInput('');
    setShowApiKeyInput(true);
    setWorkflows([]);
    setImages([]);
    setGeneratingImages([]);
    setSelectedWorkflow(null);
    setPrompt('');
    setError(null);
    wsManager.disconnectAll();
  };

  // Dialog helpers
  const showAlert = (message: string, title?: string) => {
    setDialogConfig({
      title,
      message,
      type: 'alert',
      onConfirm: () => setDialogOpen(false),
    });
    setDialogOpen(true);
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setDialogConfig({
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        setDialogOpen(false);
        onConfirm();
      },
    });
    setDialogOpen(true);
  };

  // Data loading
  const loadWorkflows = async () => {
    try {
      const response = await workflowService.list();
      setWorkflows(response.workflows);

      if (selectedWorkflow) {
        const workflowExists = response.workflows.some(w => w.id === selectedWorkflow);
        if (!workflowExists) {
          setSelectedWorkflow(null);
        }
      }

      if (!selectedWorkflow && response.workflows.length > 0) {
        setSelectedWorkflow(response.workflows[0].id);
      }
    } catch (err: any) {
      setError(`${t.errors.loadFailed}: ${err.message}`);
    }
  };

  const loadImages = async (page: number = 1, append: boolean = false) => {
    try {
      const response = await imageService.list({ page, page_size: 20 });

      if (append) {
        setImages(prev => [...prev, ...response.images]);
      } else {
        setImages(response.images);
        setCurrentPage(1);
      }

      // Check if there are more images to load
      setHasMoreImages(response.images.length === 20);
    } catch (err: any) {
      console.error('Failed to load images:', err);
    }
  };

  const loadCloudModels = async () => {
    try {
      const response = await cloudService.listModels();
      setCloudModels(response.models);
    } catch (err: any) {
      console.error('Failed to load cloud models:', err);
    }
  };

  // Workflow operations
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workflow = await workflowService.import(file);
      setWorkflows([workflow, ...workflows]);
      setSelectedWorkflow(workflow.id);
      setError(null);
      showAlert(`${workflow.name} ${t.workflows.importSuccess}`, t.success);
      event.target.value = '';
    } catch (err: any) {
      setError(`${t.workflows.importFailed}: ${err.message}`);
    }
  };

  const handleSaveWorkflow = async (workflow: WorkflowConfig) => {
    try {
      await workflowService.update(workflow.id, workflow);
      await loadWorkflows();
      setEditingWorkflow(null);
      setError(null);
    } catch (err: any) {
      setError(`Failed to save workflow: ${err.message}`);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await workflowService.delete(id);
      await loadWorkflows();
      setEditingWorkflow(null);
      if (selectedWorkflow === id) {
        setSelectedWorkflow(null);
      }
      setError(null);
    } catch (err: any) {
      setError(`Failed to delete workflow: ${err.message}`);
    }
  };

  // Image operations
  const handleImageClick = (image: ImageMetadata) => {
    setSelectedImage(image);
  };

  const handleDownloadImage = () => {
    if (!selectedImage) return;
    window.open(imageService.getDownloadUrl(selectedImage.id), '_blank');
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  const handlePreviousImage = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    }
  };

  const getCurrentImageIndex = () => {
    if (!selectedImage) return -1;
    return images.findIndex(img => img.id === selectedImage.id);
  };

  const handleBatchDownload = async () => {
    const selectedImages = images.filter(img => imageSelection.selectedIds.has(img.id));
    for (const image of selectedImages) {
      window.open(imageService.getDownloadUrl(image.id), '_blank');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const handleBatchDelete = () => {
    if (imageSelection.selectedIds.size === 0) return;

    const confirmMessage = language === 'zh'
      ? `确定要删除 ${imageSelection.selectedIds.size} 张图片吗？`
      : `Are you sure you want to delete ${imageSelection.selectedIds.size} image(s)?`;

    showConfirm(confirmMessage, async () => {
      try {
        await Promise.all(
          Array.from(imageSelection.selectedIds).map(id => imageService.delete(id))
        );
        await loadImages();
        imageSelection.clearSelection();
      } catch (err: any) {
        setError(err.message || 'Failed to delete images');
      }
    }, t.workflows.deleteConfirm);
  };

  const handleRemoveGenerating = (imageId: string) => {
    setGeneratingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleDownloadSingleImage = (image: ImageMetadata) => {
    window.open(imageService.getDownloadUrl(image.id), '_blank');
  };

  const handleDeleteSingleImage = (image: ImageMetadata) => {
    const confirmMessage = language === 'zh'
      ? '确定要删除这张图片吗？'
      : 'Are you sure you want to delete this image?';

    showConfirm(confirmMessage, async () => {
      try {
        await imageService.delete(image.id);
        await loadImages();
        // Clear selection if deleted image was selected
        if (selectedImage?.id === image.id) {
          setSelectedImage(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to delete image');
      }
    }, t.workflows.deleteConfirm);
  };

  const handleSelectImage = (imageId: string) => {
    imageSelection.toggleSelection(imageId, { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
  };

  const handleSelectAll = () => {
    imageSelection.selectAll();
  };

  const handleClearSelection = () => {
    imageSelection.clearSelection();
  };

  // Generation
  const handleGenerate = async () => {
    if (generationMode === 'local') {
      if (!selectedWorkflow) {
        setError(t.errors.generationFailed + ': Please select a workflow');
        return;
      }

      const promptId = await localGeneration.generate({
        workflowId: selectedWorkflow,
        prompt,
        uploadedImageFile: localImageUpload.uploadedFile || undefined,
      });

      if (promptId) {
        const savedOverrides = localStorage.getItem('parameterOverrides');
        let overrideParams: any = null;

        if (savedOverrides) {
          try {
            const allOverrides = JSON.parse(savedOverrides);
            const workflowOverrides = allOverrides[selectedWorkflow];
            if (workflowOverrides) {
              overrideParams = {};
              for (const [key, value] of Object.entries(workflowOverrides)) {
                if (value !== '' && value !== null && value !== undefined) {
                  overrideParams[key] = value;
                }
              }
              if (Object.keys(overrideParams).length === 0) {
                overrideParams = null;
              }
            }
          } catch (e) {
            console.error('Failed to parse parameter overrides:', e);
          }
        }

        wsManager.connect(promptId, selectedWorkflow, prompt, overrideParams);
      }
    } else {
      const runwareSize = RUNWARE_2K_SIZES[cloudAspectRatio] || RUNWARE_2K_SIZES['1:1'];
      const width = isRunwareModel ? runwareSize.width : cloudWidth;
      const height = isRunwareModel ? runwareSize.height : cloudHeight;
      const aspectRatio = isRunwareModel && !RUNWARE_2K_SIZES[cloudAspectRatio] ? '1:1' : cloudAspectRatio;

      await cloudGeneration.generate({
        prompt,
        modelId: selectedCloudModel,
        aspectRatio,
        resolutionTier: cloudResolutionTier,
        width,
        height,
      });
    }
  };

  // Derived state
  const canGenerate = generationMode === 'local' ? !!selectedWorkflow : !!prompt.trim();

  // ==================== RENDER ====================
  if (showApiKeyInput) {
    return (
      <ApiKeyScreen
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        isValidatingKey={isValidatingKey}
        error={error}
        onSubmit={handleSetApiKey}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <img src={iconImage} alt="ComfyWUI Logo" className="header-logo" />
          <h1>{t.title}</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="tabs">
          <button
            className={`tab ${currentTab === 'configuration' ? 'active' : ''}`}
            onClick={() => setCurrentTab('configuration')}
          >
            {t.tabs.configuration}
          </button>
          <button
            className={`tab ${currentTab === 'generation' ? 'active' : ''}`}
            onClick={() => setCurrentTab('generation')}
          >
            {t.tabs.generation}
          </button>
        </div>
        <div className="header-actions">
          <button onClick={toggleLanguage} className="language-toggle">
            {language === 'en' ? '中文' : 'English'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            {t.header.logout}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button
              className={`mobile-menu-item ${currentTab === 'configuration' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab('configuration');
                setMobileMenuOpen(false);
              }}
            >
              {t.tabs.configuration}
            </button>
            <button
              className={`mobile-menu-item ${currentTab === 'generation' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab('generation');
                setMobileMenuOpen(false);
              }}
            >
              {t.tabs.generation}
            </button>
            <div className="mobile-menu-divider" />
            <button
              className="mobile-menu-item"
              onClick={() => {
                toggleLanguage();
                setMobileMenuOpen(false);
              }}
            >
              {language === 'en' ? '中文' : 'English'}
            </button>
            <button
              className="mobile-menu-item"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
            >
              {t.header.logout}
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {currentTab === 'configuration' && (
          <div className="configuration-page">
            {editingWorkflow ? (
              <WorkflowEditor
                workflow={editingWorkflow}
                onSave={handleSaveWorkflow}
                onCancel={() => setEditingWorkflow(null)}
                onDelete={handleDeleteWorkflow}
                language={language}
                showConfirm={showConfirm}
              />
            ) : (
              <>
                <div className="page-header">
                  <h2>{t.workflows.title}</h2>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                  <Button onClick={handleImportClick}>{t.workflows.import}</Button>
                </div>

                <div className="workflow-list">
                  {workflows.length === 0 ? (
                    <div className="empty-state">
                      <p>{t.workflows.noWorkflows}</p>
                      <p className="text-secondary">{t.workflows.importFirst}</p>
                    </div>
                  ) : (
                    workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="workflow-card"
                        onClick={() => setEditingWorkflow(workflow)}
                      >
                        <h3>{workflow.name}</h3>
                        {workflow.description && (
                          <p className="text-secondary">{workflow.description}</p>
                        )}
                        <div className="workflow-meta">
                          <span>{t.workflows.promptNode}: {workflow.prompt_node_id}</span>
                          <span>{t.workflows.created}: {new Date(workflow.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {currentTab === 'generation' && (
          <div className="generation-page">
            <GenerationControls
              generationMode={generationMode}
              onModeChange={setGenerationMode}
              workflows={workflows}
              selectedWorkflow={selectedWorkflow}
              onWorkflowChange={setSelectedWorkflow}
              uploadedImageFile={localImageUpload.uploadedFile}
              uploadedImagePreview={localImageUpload.previewUrl}
              isUploading={localImageUpload.isUploading}
              onImageUpload={(e) => {
                const file = e.target.files?.[0];
                if (file) localImageUpload.handleUpload(file);
              }}
              onImageRemove={localImageUpload.handleRemove}
              cloudModels={cloudModels}
              selectedCloudModel={selectedCloudModel}
              onCloudModelChange={setSelectedCloudModel}
              cloudAspectRatio={cloudAspectRatio}
              onCloudAspectRatioChange={setCloudAspectRatio}
              cloudResolutionTier={cloudResolutionTier}
              onCloudResolutionTierChange={setCloudResolutionTier}
              cloudWidth={cloudWidth}
              onCloudWidthChange={setCloudWidth}
              cloudHeight={cloudHeight}
              onCloudHeightChange={setCloudHeight}
              cloudReferenceImage={cloudGeneration.referenceImage}
              cloudReferencePreview={cloudGeneration.referencePreview}
              onCloudReferenceUpload={(e) => {
                const file = e.target.files?.[0];
                if (file) cloudGeneration.handleReferenceUpload(file);
              }}
              onCloudReferenceRemove={cloudGeneration.handleReferenceRemove}
              prompt={prompt}
              onPromptChange={setPrompt}
              promptInputHeight={promptInputHeight}
              promptInputRef={promptInputRef}
              onGenerate={handleGenerate}
              canGenerate={canGenerate}
            />

            <div className="image-playground">
              <BatchActionBar
                totalImages={images.length + generatingImages.length}
                selectedCount={imageSelection.selectedIds.size}
                nsfwMode={nsfwMode}
                onNsfwToggle={setNsfwMode}
                onBatchDownload={handleBatchDownload}
                onBatchDelete={handleBatchDelete}
                onClearSelection={imageSelection.clearSelection}
              />

              <ImageGrid
                generatingImages={generatingImages}
                completedImages={images}
                selectedImageIds={imageSelection.selectedIds}
                nsfwMode={nsfwMode}
                onImageClick={handleImageClick}
                onToggleSelection={imageSelection.toggleSelection}
                onRemoveGenerating={handleRemoveGenerating}
                onDownloadImage={handleDownloadSingleImage}
                onDeleteImage={handleDeleteSingleImage}
                onSelectImage={handleSelectImage}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                isLoadingMore={isLoadingMore}
                hasMore={hasMoreImages}
              />
            </div>
          </div>
        )}

        {selectedImage && (
          <ImageModal
            image={selectedImage}
            imageUrl={imageService.getDownloadUrl(selectedImage.id)}
            onClose={() => setSelectedImage(null)}
            onDownload={handleDownloadImage}
            onNext={handleNextImage}
            onPrevious={handlePreviousImage}
            hasNext={getCurrentImageIndex() < images.length - 1}
            hasPrevious={getCurrentImageIndex() > 0}
            language={language}
          />
        )}

        <Dialog
          isOpen={dialogOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          confirmText={t.ok}
          cancelText={t.cancel}
          onConfirm={dialogConfig.onConfirm}
          onCancel={() => setDialogOpen(false)}
        />

        <ScrollToTop threshold={300} />
      </main>
    </div>
  );
}

// App wrapper with LanguageProvider
function App() {
  const [language, setLanguage] = useLocalStorageSync<Language>('language', 'en');

  return (
    <LanguageProvider language={language} setLanguage={setLanguage}>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
