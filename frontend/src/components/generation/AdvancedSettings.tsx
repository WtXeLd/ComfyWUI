import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { useTranslation } from '../../hooks/useTranslation';
import type { WorkflowConfig, ConfigurableParameter } from '../../types/workflow';
import './AdvancedSettings.css';

interface AdvancedSettingsProps {
  workflowId: string | null;
  workflows: WorkflowConfig[];
}

interface ParameterOverrides {
  [workflowId: string]: {
    [key: string]: any;
  };
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  workflowId,
  workflows,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [overrides, setOverrides] = useState<ParameterOverrides>({});

  // Find current workflow
  const currentWorkflow = workflows.find(w => w.id === workflowId);
  const configurableParams = currentWorkflow?.configurable_params || {};
  const hasParameters = Object.keys(configurableParams).length > 0;

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('parameterOverrides');
    if (saved) {
      try {
        setOverrides(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load parameter overrides:', e);
      }
    }

    const savedExpanded = localStorage.getItem('advancedSettingsExpanded');
    if (savedExpanded) {
      setIsExpanded(savedExpanded === 'true');
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('parameterOverrides', JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    localStorage.setItem('advancedSettingsExpanded', String(isExpanded));
  }, [isExpanded]);

  const currentOverrides = workflowId ? overrides[workflowId] || {} : {};

  const updateOverride = (key: string, value: any) => {
    if (!workflowId) return;

    setOverrides({
      ...overrides,
      [workflowId]: {
        ...currentOverrides,
        [key]: value,
      },
    });
  };

  const resetOverrides = () => {
    if (!workflowId) return;

    const newOverrides = { ...overrides };
    delete newOverrides[workflowId];
    setOverrides(newOverrides);
  };

  const renderParameterInput = (paramKey: string, param: ConfigurableParameter) => {
    const value = currentOverrides[paramKey] !== undefined ? currentOverrides[paramKey] : '';
    // For seed parameters, show "Random" as placeholder
    const isSeedParam = paramKey.toLowerCase().includes('seed');
    const placeholder = isSeedParam && param.default === -1 ? 'Random' : String(param.default);

    if (param.param_type === 'dropdown' && param.options) {
      return (
        <select
          value={value || param.default}
          onChange={(e) => updateOverride(paramKey, e.target.value)}
          className="setting-select"
        >
          {param.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (param.param_type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const numValue = parseFloat(e.target.value);
            if (!isNaN(numValue)) {
              updateOverride(paramKey, numValue);
            } else if (e.target.value === '') {
              updateOverride(paramKey, '');
            }
          }}
          placeholder={placeholder}
          min={param.min_value}
          max={param.max_value}
          step={paramKey.includes('denoise') || paramKey.includes('cfg') ? '0.1' : '1'}
          className="setting-input"
        />
      );
    }

    // Default: text input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => updateOverride(paramKey, e.target.value)}
        placeholder={placeholder}
        className="setting-input"
      />
    );
  };

  return (
    <div className="advanced-settings">
      <button
        className="settings-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={!workflowId || !hasParameters}
      >
        <span className="toggle-icon">
          {isExpanded ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          )}
        </span>
        {t.advancedSettings.title}
        {hasParameters && ` (${Object.keys(configurableParams).length})`}
      </button>

      {isExpanded && workflowId && hasParameters && (
        <div className="settings-content">
          <p className="settings-note">{t.advancedSettings.description}</p>

          <div className="settings-grid">
            {Object.entries(configurableParams).map(([paramKey, param]) => (
              <div key={paramKey} className="setting-item">
                <label title={`Node: ${param.node_id}, Path: ${param.path}`}>
                  {param.label}
                </label>
                {renderParameterInput(paramKey, param)}
              </div>
            ))}
          </div>

          <Button onClick={resetOverrides} variant="secondary" size="sm">
            {t.advancedSettings.resetDefaults}
          </Button>
        </div>
      )}

      {isExpanded && workflowId && !hasParameters && (
        <div className="settings-content">
          <p className="settings-note">{t.advancedSettings.noParameters}</p>
        </div>
      )}
    </div>
  );
};
