import type { TranslationKeys } from './en';

export const zh: TranslationKeys = {
  // Common
  title: 'ComfyWUI',
  cancel: '取消',
  confirm: '确认',
  ok: '确定',
  delete: '删除',
  save: '保存',
  edit: '编辑',
  close: '关闭',
  loading: '加载中...',
  error: '错误',
  success: '成功',

  // Auth
  auth: {
    apiKeyPlaceholder: '请输入你的 API Key',
    submit: '提交',
    validating: '验证中...',
    title: '需要 API Key',
    subtitle: '请输入你的 API Key 以继续',
  },

  // Tabs
  tabs: {
    configuration: '配置',
    generation: '生成',
  },

  // Header
  header: {
    logout: '退出',
  },

  // Workflows
  workflows: {
    title: '工作流',
    import: '导入工作流 JSON',
    noWorkflows: '未找到工作流',
    importFirst: '导入 ComfyUI 工作流 JSON 文件以开始',
    name: '名称',
    promptNode: '提示词节点',
    created: '创建时间',
    actions: '操作',
    deleteConfirm: '确认删除',
    deleteMessage: '确定要删除',
    deleteWarning: '此操作无法撤销。',
    saveSuccess: '工作流保存成功',
    importSuccess: '导入成功！',
    importFailed: '导入工作流失败',
    deleteSuccess: '工作流删除成功',
    backToList: '返回工作流列表',
  },

  // Generation
  generation: {
    modeLocal: '本地',
    modeGoogle: 'Google',
    model: '模型',
    aspectRatio: '比例',
    resolution: '分辨率',
    referenceImage: '参考图片（可选）',
    workflow: '工作流',
    prompt: '提示词',
    promptPlaceholder: '在此输入你的提示词...',
    generateImage: '生成图像',
    noWorkflowsAvailable: '无可用工作流',
    uploadImage: '上传图片',
    imageUploaded: '已上传图片',
    removeImage: '移除',
    uploadingImage: '上传中...',
    advancedSettings: '高级设置',
  },

  // Image Grid
  imageGrid: {
    queued: '排队中...',
    generating: '生成中...',
    failed: '失败',
    noImages: '暂无图片',
    generateFirst: '在上方生成你的第一张图像',
    loadingMore: '加载更多图片中...',
    noMoreImages: '没有更多图片了',
    select: '选中',
    unselect: '取消选中',
    selectAll: '全选',
    clearSelection: '取消全选',
    download: '下载',
    delete: '删除',
  },

  // Batch Actions
  batchActions: {
    generatedImages: '生成的图像',
    totalImages: '总图片数',
    selected: '已选',
    nsfwMode: 'NSFW',
    download: '下载',
    deleteSelected: '删除',
    clearSelection: '取消',
    deleteConfirm: '确定要删除 {{count}} 张图片吗？',
    deleteWarning: '此操作无法撤销。',
  },

  // Image Modal
  imageModal: {
    download: '下载',
    delete: '删除',
    previous: '上一张',
    next: '下一张',
    deleteConfirm: '确定要删除这张图片吗？',
  },

  // Advanced Settings
  advancedSettings: {
    title: '高级设置',
    resetDefaults: '重置为默认值',
    description: '注意：这些设置临时覆盖工作流默认值。',
    noParameters: '此工作流没有可配置的参数',
    selectWorkflow: '选择工作流以配置参数',
  },

  // Errors
  errors: {
    generic: '发生错误',
    networkError: '网络错误。请检查连接。',
    invalidApiKey: '无效的 API Key，请检查后重试。',
    uploadFailed: '上传失败',
    generationFailed: '生成失败',
    loadFailed: '加载工作流失败',
  },
};
