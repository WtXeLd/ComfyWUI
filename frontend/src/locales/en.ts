export const en = {
  // Common
  title: 'ComfyWUI',
  cancel: 'Cancel',
  confirm: 'Confirm',
  ok: 'OK',
  delete: 'Delete',
  save: 'Save',
  edit: 'Edit',
  close: 'Close',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',

  // Auth
  auth: {
    apiKeyPlaceholder: 'Enter your API Key',
    submit: 'Submit',
    validating: 'Validating...',
    title: 'API Key Required',
    subtitle: 'Please enter your API key to continue',
  },

  // Tabs
  tabs: {
    configuration: 'Configuration',
    generation: 'Generation',
  },

  // Header
  header: {
    logout: 'Logout',
  },

  // Workflows
  workflows: {
    title: 'Workflow',
    import: 'Import Workflow JSON',
    noWorkflows: 'No workflows found',
    importFirst: 'Import a ComfyUI workflow JSON to get started',
    name: 'Name',
    promptNode: 'Prompt Node',
    created: 'Created',
    actions: 'Actions',
    deleteConfirm: 'Confirm Delete',
    deleteMessage: 'Are you sure you want to delete',
    deleteWarning: 'This action cannot be undone.',
    saveSuccess: 'Workflow saved successfully',
    importSuccess: 'imported successfully!',
    importFailed: 'Failed to import workflow',
    deleteSuccess: 'Workflow deleted successfully',
    backToList: 'Back to Workflow List',
  },

  // Generation
  generation: {
    modeLocal: 'Local',
    modeGoogle: 'Google',
    model: 'Model',
    aspectRatio: 'Aspect Ratio',
    resolution: 'Resolution',
    referenceImage: 'Reference Image (Optional)',
    workflow: 'Workflow',
    prompt: 'Prompt',
    promptPlaceholder: 'Enter your prompt here...',
    generateImage: 'Generate Image',
    noWorkflowsAvailable: 'No workflows available',
    uploadImage: 'Upload Image',
    imageUploaded: 'Image Uploaded',
    removeImage: 'Remove',
    uploadingImage: 'Uploading...',
    advancedSettings: 'Advanced Settings',
  },

  // Image Grid
  imageGrid: {
    queued: 'Queued...',
    generating: 'Generating...',
    failed: 'Failed',
    noImages: 'No images generated yet',
    generateFirst: 'Generate your first image above',
    loadingMore: 'Loading more images...',
    noMoreImages: 'No more images',
    select: 'Select',
    unselect: 'Unselect',
    selectAll: 'Select All',
    clearSelection: 'Clear Selection',
    download: 'Download',
    delete: 'Delete',
  },

  // Batch Actions
  batchActions: {
    generatedImages: 'Generated Images',
    totalImages: 'Total Images',
    selected: 'selected',
    nsfwMode: 'NSFW',
    download: 'Download',
    deleteSelected: 'Delete',
    clearSelection: 'Cancel',
    deleteConfirm: 'Are you sure you want to delete {{count}} image(s)?',
    deleteWarning: 'This action cannot be undone.',
  },

  // Image Modal
  imageModal: {
    download: 'Download',
    delete: 'Delete',
    previous: 'Previous',
    next: 'Next',
    deleteConfirm: 'Are you sure you want to delete this image?',
  },

  // Advanced Settings
  advancedSettings: {
    title: 'Advanced Settings',
    resetDefaults: 'Reset to Defaults',
    description: 'Note: These settings temporarily override workflow defaults.',
    noParameters: 'No configurable parameters available for this workflow',
    selectWorkflow: 'Select a workflow to configure parameters',
  },

  // Errors
  errors: {
    generic: 'An error occurred',
    networkError: 'Network error. Please check your connection.',
    invalidApiKey: 'Invalid API Key. Please check and try again.',
    uploadFailed: 'Upload failed',
    generationFailed: 'Generation failed',
    loadFailed: 'Failed to load workflows',
  },
};

export type TranslationKeys = typeof en;
