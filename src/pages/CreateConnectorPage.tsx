import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Sliders,
  Code,
  Key,
  Eye,
  Copy,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ConnectorInput, ProviderInfo, ProviderModelInfo, InputType } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface CreateConnectorPageProps {
  onNavigate: (path: string) => void;
  editId?: string; // If provided, edit mode!
}

export function CreateConnectorPage({ onNavigate, editId }: CreateConnectorPageProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: AI Config
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [availableModels, setAvailableModels] = useState<ProviderModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [refreshingModels, setRefreshingModels] = useState(false);

  // Step 3: Dynamic Inputs
  const [inputs, setInputs] = useState<ConnectorInput[]>([
    {
      name: 'input_text',
      label: 'Input Text',
      type: 'TEXT',
      required: true,
      description: 'Primary text input to process',
      defaultValue: '',
      orderIndex: 0,
    },
  ]);

  // Step 4: Output Schema
  const [schemaMode, setSchemaMode] = useState<'editor' | 'builder'>('editor');
  const [outputSchemaJson, setOutputSchemaJson] = useState(
    JSON.stringify(
      {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Extracted or generated outcome' },
          confidence: { type: 'number', description: 'Confidence score from 0 to 1' },
        },
        required: ['result'],
      },
      null,
      2
    )
  );
  const [schemaDescription, setSchemaDescription] = useState('Standard JSON response schema');

  // Step 5: Authentication & Completion
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [createdConnectorId, setCreatedConnectorId] = useState<string | null>(null);

  const { success, error, info } = useToast();

  // Load providers on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const provs = await api.getProviders();
        setProviders(provs);
        if (provs.length > 0 && !selectedProvider) {
          setSelectedProvider(provs[0].id);
        }

        // If edit mode, populate data
        if (editId) {
          const conn = await api.getConnector(editId);
          setName(conn.name);
          setSlug(conn.slug);
          setDescription(conn.description);
          setSelectedProvider(conn.provider);
          setSelectedModel(conn.model);
          setSystemPrompt(conn.systemPrompt);
          setTemperature(conn.temperature);
          setMaxTokens(conn.maxTokens);
          if (conn.inputs && conn.inputs.length > 0) setInputs(conn.inputs);
          if (conn.outputSchema?.rawSchemaJson) setOutputSchemaJson(conn.outputSchema.rawSchemaJson);
          if (conn.outputSchema?.description) setSchemaDescription(conn.outputSchema.description);
        }
      } catch (err: any) {
        error('Failed to initialize form', err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [editId]);

  // Update models when provider changes
  useEffect(() => {
    const prov = providers.find((p) => p.id === selectedProvider);
    if (prov) {
      setAvailableModels(prov.models || []);
      if (prov.models && prov.models.length > 0) {
        const hasDefault = prov.models.find((m) => m.isDefault);
        setSelectedModel(hasDefault ? hasDefault.id : prov.models[0].id);
      }
    }
  }, [selectedProvider, providers]);

  // Auto-slug generation from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editId) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleRefreshModels = async () => {
    try {
      setRefreshingModels(true);
      const models = await api.getProviderModels(selectedProvider);
      setAvailableModels(models);
      success('Models refreshed', `Retrieved ${models.length} models from ${selectedProvider}`);
    } catch (err: any) {
      error('Failed to refresh models', err.message);
    } finally {
      setRefreshingModels(false);
    }
  };

  // Dynamic input helpers
  const handleAddInput = () => {
    const nextIdx = inputs.length;
    setInputs([
      ...inputs,
      {
        name: `field_${nextIdx + 1}`,
        label: `Field ${nextIdx + 1}`,
        type: 'TEXT',
        required: true,
        description: '',
        defaultValue: '',
        orderIndex: nextIdx,
      },
    ]);
  };

  const handleUpdateInput = (index: number, patch: Partial<ConnectorInput>) => {
    setInputs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleDeleteInput = (index: number) => {
    if (inputs.length <= 1) {
      info('At least one input parameter is required.');
      return;
    }
    setInputs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveInput = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= inputs.length) return;
    setInputs((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((item, idx) => ({ ...item, orderIndex: idx }));
    });
  };

  // Validation before step transition
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!name.trim()) {
        error('Validation error', 'API Name is required.');
        return false;
      }
      if (!slug.trim()) {
        error('Validation error', 'Endpoint slug is required.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!systemPrompt.trim()) {
        error('Validation error', 'System instructions are required.');
        return false;
      }
    } else if (currentStep === 3) {
      for (const inp of inputs) {
        if (!inp.name.trim()) {
          error('Validation error', 'All input fields must have a parameter name.');
          return false;
        }
      }
    } else if (currentStep === 4) {
      try {
        JSON.parse(outputSchemaJson);
      } catch (err: any) {
        error('Invalid JSON Schema', `Please fix schema formatting: ${err.message}`);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveConnector = async () => {
    if (!validateStep(4)) return;

    try {
      setSaving(true);
      const payload = {
        name,
        slug,
        description,
        provider: selectedProvider,
        model: selectedModel,
        systemPrompt,
        temperature,
        maxTokens,
        status: 'active',
        inputs,
        outputSchemaJson,
        outputSchemaDescription: schemaDescription,
      };

      if (editId) {
        const updated = await api.updateConnector(editId, payload);
        success('Connector updated', `Successfully saved changes to "${updated.name}".`);
        onNavigate(`/connectors/${updated.id}`);
      } else {
        const result = await api.createConnector(payload);
        setCreatedConnectorId(result.connector.id);
        setGeneratedApiKey(result.generatedApiKey || null);
        success('Connector created!', `Your endpoint /api/${result.connector.slug} is live.`);
        setStep(6); // Final confirmation step
      }
    } catch (err: any) {
      error('Failed to save connector', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Preset Template loader
  const applyPreset = (preset: 'card-scanner' | 'article-writer' | 'sentiment') => {
    if (preset === 'card-scanner') {
      setName('Card Scanner AI');
      setSlug('card-scanner-ai');
      setDescription('Multimodal OCR extraction for physical and digital business cards');
      setSelectedProvider('gemini');
      setSelectedModel('gemini-3.8-flash');
      setSystemPrompt('You are an expert business card scanner. Analyze the provided image and extract contact information. Output strictly JSON.');
      setInputs([
        {
          name: 'image',
          label: 'Card Image',
          type: 'IMAGE',
          required: true,
          description: 'Image of the business card',
          orderIndex: 0,
        },
      ]);
      setOutputSchemaJson(
        JSON.stringify(
          {
            type: 'object',
            properties: {
              name: { type: 'string' },
              company: { type: 'string' },
              designation: { type: 'string' },
              phone: { type: 'string' },
              email: { type: 'string' },
              website: { type: 'string' },
            },
            required: ['name'],
          },
          null,
          2
        )
      );
      success('Template applied', 'Loaded Card Scanner configuration preset.');
    } else if (preset === 'article-writer') {
      setName('Content Article Writer');
      setSlug('content-article-writer');
      setDescription('Automated long-form article drafting with executive summary and SEO keywords');
      setSelectedProvider('gemini');
      setSelectedModel('gemini-3.8-flash');
      setSystemPrompt('You are a professional editorial writer. Write an engaging article based on the user topic, keywords, and word count. Output strictly JSON.');
      setInputs([
        { name: 'topic', label: 'Article Topic', type: 'TEXT', required: true, orderIndex: 0 },
        { name: 'keywords', label: 'SEO Keywords', type: 'TEXT', required: false, orderIndex: 1 },
        { name: 'word_count', label: 'Word Count', type: 'NUMBER', required: false, defaultValue: 800, orderIndex: 2 },
        { name: 'options', label: 'Options', type: 'JSON', required: false, orderIndex: 3 },
      ]);
      setOutputSchemaJson(
        JSON.stringify(
          {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              article: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'summary', 'article', 'keywords'],
          },
          null,
          2
        )
      );
      success('Template applied', 'Loaded Article Writer configuration preset.');
    }
  };

  const stepsList = [
    { num: 1, title: 'Basic Info' },
    { num: 2, title: 'AI Config' },
    { num: 3, title: 'Dynamic Inputs' },
    { num: 4, title: 'Output Schema' },
    { num: 5, title: 'Authentication' },
    { num: 6, title: 'Review & Finish' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading connector configuration...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header and Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('/connectors')}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Connectors</span>
        </button>

        {!editId && step === 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Quick Presets:</span>
            <button
              onClick={() => applyPreset('card-scanner')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-sky-400 border border-zinc-800"
            >
              Card Scanner
            </button>
            <button
              onClick={() => applyPreset('article-writer')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-purple-400 border border-zinc-800"
            >
              Article Writer
            </button>
          </div>
        )}
      </div>

      {/* Progress Steps Stepper */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between relative overflow-x-auto">
          {stepsList.map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div key={s.num} className="flex flex-col items-center flex-1 min-w-[70px]">
                <button
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  disabled={s.num > step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isCurrent
                      ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/30'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                </button>
                <span
                  className={`mt-2 text-[11px] font-medium text-center hidden sm:block ${
                    isCurrent ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">Step 1: Basic Information</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Name your connector and configure its unique HTTP endpoint slug.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Connector Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Card Scanner, Invoice Parser, Article Writer"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Endpoint Slug <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden focus-within:border-sky-500">
                  <span className="px-3 py-2.5 text-xs text-zinc-400 bg-zinc-900 border-r border-zinc-800 font-mono">
                    POST /api/
                  </span>
                  <input
                    type="text"
                    placeholder="my-connector-endpoint"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-xs text-zinc-100 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  This will generate both <code>POST /api/{slug || 'endpoint'}</code> and{' '}
                  <code>POST /api/run/{slug || 'endpoint'}</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what this AI API endpoint does, its inputs, and expected usage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-sky-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AI Configuration */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">Step 2: AI Provider & Engine</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Select your backend AI provider, choose the model, and define the core system instructions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  AI Provider <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.supportsVision ? '(Vision Supported)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Model Selection <span className="text-rose-400">*</span>
                  </label>
                  <button
                    onClick={handleRefreshModels}
                    disabled={refreshingModels}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingModels ? 'animate-spin' : ''}`} />
                    <span>Refresh Models</span>
                  </button>
                </div>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500 font-mono"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                System Instructions / Prompt <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="You are an expert system that extracts data and returns strict JSON..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-sky-500 leading-relaxed font-mono"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                The prompt engine will combine these system instructions with incoming validated user parameters and enforce JSON schema compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
                  <span>Temperature</span>
                  <span className="font-mono text-sky-400 font-bold">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Lower values (0.1 - 0.3) are best for structured data extraction; higher for creative writing.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  min="128"
                  max="8192"
                  step="128"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 font-mono focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Dynamic Input Parameters */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Step 3: Dynamic Input Parameters</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Define unlimited parameter fields (Text, Number, Boolean, Image, File, JSON).
                </p>
              </div>
              <button
                onClick={handleAddInput}
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-4">
              {inputs.map((inp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-400">#{idx + 1}</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {inp.label || inp.name || 'Unnamed Field'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveInput(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveInput(idx, 'down')}
                        disabled={idx === inputs.length - 1}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInput(idx)}
                        className="p-1 text-rose-400 hover:text-rose-300 ml-2"
                        title="Delete Field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Parameter Key</label>
                      <input
                        type="text"
                        placeholder="e.g. topic, image"
                        value={inp.name}
                        onChange={(e) => handleUpdateInput(idx, { name: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-hidden focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Human Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Topic of Article"
                        value={inp.label}
                        onChange={(e) => handleUpdateInput(idx, { label: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Data Type</label>
                      <select
                        value={inp.type}
                        onChange={(e) => handleUpdateInput(idx, { type: e.target.value as InputType })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
                      >
                        <option value="TEXT">TEXT (String)</option>
                        <option value="NUMBER">NUMBER (Integer/Float)</option>
                        <option value="BOOLEAN">BOOLEAN (True/False)</option>
                        <option value="IMAGE">IMAGE (Vision File/Upload)</option>
                        <option value="FILE">FILE (Document/Data)</option>
                        <option value="JSON">JSON (Nested Object/Array)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Description / Help</label>
                      <input
                        type="text"
                        placeholder="Instructions for the caller or consumer"
                        value={inp.description || ''}
                        onChange={(e) => handleUpdateInput(idx, { description: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Default Value</label>
                      <input
                        type="text"
                        placeholder="Optional fallback value"
                        value={inp.defaultValue || ''}
                        onChange={(e) => handleUpdateInput(idx, { defaultValue: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inp.required}
                        onChange={(e) => handleUpdateInput(idx, { required: e.target.checked })}
                        className="rounded border-zinc-800 bg-zinc-900 text-sky-500 focus:ring-0"
                      />
                      <span>Required field in API request</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Schema Preview Box */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2">
                Live Generated Request Schema Preview:
              </span>
              <pre className="text-xs font-mono text-sky-300 overflow-x-auto">
                {JSON.stringify(
                  inputs.reduce((acc, curr) => {
                    acc[curr.name || 'field'] = `${curr.type}${curr.required ? ' (required)' : ' (optional)'}`;
                    return acc;
                  }, {} as any),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* STEP 4: Output Schema */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">Step 4: Output JSON Schema</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Define the structured JSON schema that the connector must return.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-300">
                  JSON Schema Specification <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setOutputSchemaJson(
                        JSON.stringify(
                          {
                            type: 'object',
                            properties: {
                              summary: { type: 'string' },
                              score: { type: 'number' },
                            },
                            required: ['summary'],
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Simple Preset
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    onClick={() => {
                      setOutputSchemaJson(
                        JSON.stringify(
                          {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              company: { type: 'string' },
                              phone: { type: 'string' },
                              email: { type: 'string' },
                            },
                            required: ['name'],
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Contact Preset
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                value={outputSchemaJson}
                onChange={(e) => setOutputSchemaJson(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-sky-500 leading-relaxed"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                The gateway will validate the model's raw response against this schema, safely normalizing types before returning.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Schema Description
              </label>
              <input
                type="text"
                placeholder="e.g. Standard structured contact record"
                value={schemaDescription}
                onChange={(e) => setSchemaDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* STEP 5: Authentication & Key Generation */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">Step 5: API Authentication</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Connector security and key management policies.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-sky-900/40 bg-sky-950/20 text-xs text-sky-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sky-200">
                <Key className="w-4 h-4" />
                <span>Automatic Production API Key Generation</span>
              </div>
              <p className="text-sky-300/80 leading-relaxed">
                When you create this connector, a dedicated cryptographic API key (
                <code>aic_live_...</code>) will be generated. The secret key is hashed with SHA-256
                before storage. You will be provided the raw key on the next step to copy once.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-200">Supported Authentication Headers:</h4>
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-300 space-y-1">
                <div>
                  <span className="text-sky-400">Authorization:</span> Bearer &lt;YOUR_API_KEY&gt;
                </div>
                <div>
                  <span className="text-purple-400">x-api-key:</span> &lt;YOUR_API_KEY&gt;
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-200">Security Invariants</h4>
              <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
                <li>Underlying AI provider keys (Gemini / OpenAI) remain strictly backend-only.</li>
                <li>Requests without a valid active connector key receive an immediate 401 Unauthorized.</li>
                <li>Keys can be revoked or regenerated at any time from the Connector Settings.</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Finalize */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">
                {generatedApiKey ? 'Connector Created Successfully!' : 'Step 6: Review Configuration'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {generatedApiKey
                  ? 'Your AI connector is live. Make sure to copy your API key now.'
                  : 'Verify all parameters before deploying your live endpoint.'}
              </p>
            </div>

            {/* Reveal API Key Banner (If created) */}
            {generatedApiKey && (
              <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Check className="w-4 h-4" />
                  <span>New Production API Key Generated</span>
                </div>
                <p className="text-xs text-emerald-200/80">
                  Please copy this key now. For your security, this complete key will never be shown again.
                </p>
                <CodeBlock code={generatedApiKey} title="YOUR CONNECTOR API KEY" language="text" />
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onNavigate(`/connectors/${createdConnectorId}/test`)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
                  >
                    Open Playground & Test
                  </button>
                  <button
                    onClick={() => onNavigate(`/connectors/${createdConnectorId}/docs`)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                  >
                    View Documentation
                  </button>
                </div>
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                <span className="text-[11px] text-zinc-400 font-medium">Connector Info</span>
                <div className="font-semibold text-white text-sm">{name}</div>
                <div className="font-mono text-sky-400">/api/{slug}</div>
                <p className="text-zinc-400 text-[11px]">{description || 'No description provided.'}</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                <span className="text-[11px] text-zinc-400 font-medium">AI Engine Configuration</span>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedProvider === 'gemini' ? 'cyan' : 'purple'}>
                    {selectedProvider.toUpperCase()}
                  </Badge>
                  <span className="font-mono text-zinc-200">{selectedModel}</span>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Temperature: <strong className="text-zinc-200">{temperature}</strong> • Max Tokens:{' '}
                  <strong className="text-zinc-200">{maxTokens}</strong>
                </div>
              </div>
            </div>

            {/* Inputs & Schema Summary */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
              <span className="text-[11px] text-zinc-400 font-medium">Configured Parameters ({inputs.length})</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {inputs.map((inp, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300"
                  >
                    {inp.name} <span className="text-sky-400">({inp.type})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          {step > 1 && !generatedApiKey ? (
            <button
              onClick={prevStep}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={nextStep}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : step === 5 ? (
            <button
              onClick={handleSaveConnector}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? 'Creating...' : editId ? 'Save Changes' : 'Create Connector'}
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/connectors')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              Done & View All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
