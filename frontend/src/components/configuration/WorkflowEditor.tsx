import React, { useState } from 'react';
import { Button } from '../common/Button';
import type { WorkflowConfig } from '../../types/workflow';
import './WorkflowEditor.css';

interface WorkflowEditorProps {
  workflow: WorkflowConfig;
  onSave: (workflow: WorkflowConfig) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  language: 'en' | 'zh';
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
}

const translations = {
  en: {
    editWorkflow: 'Edit Workflow',
    workflowName: 'Workflow Name',
    description: 'Description',
    promptNode: 'Prompt Node',
    imageNode: 'Image Node',
    autoDetected: 'Auto-detected',
    manualSelect: 'Select manually',
    none: 'None',
    optional: 'Optional',
    nodeParameters: 'Node Parameters',
    node: 'Node',
    parameter: 'Parameter',
    value: 'Value',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete Workflow',
    confirmDelete: 'Are you sure you want to delete this workflow?',
  },
  zh: {
    editWorkflow: '编辑工作流',
    workflowName: '工作流名称',
    description: '描述',
    promptNode: '提示词节点',
    imageNode: '图片节点',
    autoDetected: '自动检测',
    manualSelect: '手动选择',
    none: '无',
    optional: '可选',
    nodeParameters: '节点参数',
    node: '节点',
    parameter: '参数',
    value: '值',
    save: '保存',
    cancel: '取消',
    delete: '删除工作流',
    confirmDelete: '确定要删除此工作流吗？',
  },
};

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  onSave,
  onCancel,
  onDelete,
  language,
  showConfirm,
}) => {
  const t = translations[language];
  const [editedWorkflow, setEditedWorkflow] = useState<WorkflowConfig>(workflow);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const updateNodeParameter = (nodeId: string, inputKey: string, value: any) => {
    const newWorkflowJson = { ...editedWorkflow.workflow_json };
    if (newWorkflowJson[nodeId] && newWorkflowJson[nodeId].inputs) {
      newWorkflowJson[nodeId].inputs[inputKey] = value;
    }
    setEditedWorkflow({
      ...editedWorkflow,
      workflow_json: newWorkflowJson,
    });
  };

  const handleDelete = () => {
    showConfirm(t.confirmDelete, () => {
      onDelete(workflow.id);
    });
  };

  const renderParameterInput = (nodeId: string, key: string, value: any) => {
    const inputType = typeof value;

    if (inputType === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => updateNodeParameter(nodeId, key, e.target.checked)}
          className="param-checkbox"
        />
      );
    }

    if (inputType === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => updateNodeParameter(nodeId, key, parseFloat(e.target.value))}
          className="param-input"
        />
      );
    }

    if (Array.isArray(value)) {
      return (
        <select
          value={value[0]}
          onChange={(e) => updateNodeParameter(nodeId, key, [e.target.value])}
          className="param-select"
        >
          {value.map((opt: any) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => updateNodeParameter(nodeId, key, e.target.value)}
        className="param-input"
      />
    );
  };

  const availablePromptNodes = Object.entries(editedWorkflow.workflow_json)
    .filter(([_, node]: [string, any]) => node.class_type === 'CLIPTextEncode')
    .map(([id, _]) => id);

  const availableImageNodes = Object.entries(editedWorkflow.workflow_json)
    .filter(([_, node]: [string, any]) => node.class_type === 'LoadImage')
    .map(([id, _]) => id);

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <h2>{t.editWorkflow}</h2>
        <div className="editor-actions">
          <Button onClick={onCancel} variant="secondary">
            {t.cancel}
          </Button>
          <Button onClick={() => onSave(editedWorkflow)} variant="primary">
            {t.save}
          </Button>
        </div>
      </div>

      <div className="editor-content">
        <div className="form-group">
          <label>{t.workflowName}</label>
          <input
            type="text"
            value={editedWorkflow.name}
            onChange={(e) =>
              setEditedWorkflow({ ...editedWorkflow, name: e.target.value })
            }
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>{t.description}</label>
          <textarea
            value={editedWorkflow.description || ''}
            onChange={(e) =>
              setEditedWorkflow({ ...editedWorkflow, description: e.target.value })
            }
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>
            {t.promptNode} <span className="badge">{t.autoDetected}</span>
          </label>
          <select
            value={editedWorkflow.prompt_node_id}
            onChange={(e) =>
              setEditedWorkflow({ ...editedWorkflow, prompt_node_id: e.target.value })
            }
            className="form-select"
          >
            {availablePromptNodes.map((nodeId) => (
              <option key={nodeId} value={nodeId}>
                {t.node} {nodeId} -{' '}
                {editedWorkflow.workflow_json[nodeId]._meta?.title || 'CLIPTextEncode'}
              </option>
            ))}
          </select>
          <p className="form-hint">{t.manualSelect}</p>
        </div>

        <div className="form-group">
          <label>
            {t.imageNode} <span className="badge">{availableImageNodes.length > 0 ? t.autoDetected : t.optional}</span>
          </label>
          {availableImageNodes.length > 0 ? (
            <select
              value={editedWorkflow.image_node_id || ''}
              onChange={(e) =>
                setEditedWorkflow({ ...editedWorkflow, image_node_id: e.target.value || undefined })
              }
              className="form-select"
            >
              <option value="">{t.none}</option>
              {availableImageNodes.map((nodeId) => (
                <option key={nodeId} value={nodeId}>
                  {t.node} {nodeId} -{' '}
                  {editedWorkflow.workflow_json[nodeId]._meta?.title || 'LoadImage'}
                </option>
              ))}
            </select>
          ) : (
            <p className="form-text">{t.none}</p>
          )}
          <p className="form-hint">{t.manualSelect}</p>
        </div>

        <div className="node-list">
          <h3>{t.nodeParameters}</h3>
          {Object.entries(editedWorkflow.workflow_json).map(([nodeId, node]: [string, any]) => (
            <div key={nodeId} className="node-item">
              <div className="node-header" onClick={() => toggleNode(nodeId)}>
                <span className="node-toggle">
                  {expandedNodes.has(nodeId) ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  )}
                </span>
                <span className="node-title">
                  {t.node} {nodeId}: {node.class_type}
                  {node._meta?.title && ` - ${node._meta.title}`}
                </span>
              </div>

              {expandedNodes.has(nodeId) && node.inputs && (
                <div className="node-params">
                  {Object.entries(node.inputs).map(([key, value]: [string, any]) => {
                    // Skip if value is an array with node reference (connection)
                    if (Array.isArray(value) && typeof value[0] === 'string' && value.length === 2) {
                      return null;
                    }

                    return (
                      <div key={key} className="param-row">
                        <label className="param-label">{key}</label>
                        {renderParameterInput(nodeId, key, value)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="editor-footer">
          <Button onClick={handleDelete} variant="secondary" className="delete-button">
            {t.delete}
          </Button>
        </div>
      </div>
    </div>
  );
};
