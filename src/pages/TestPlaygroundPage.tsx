import React, { useState, useEffect } from 'react';
import {
  Play,
  Copy,
  Check,
  Upload,
  RefreshCw,
  Clock,
  Coins,
  Cpu,
  ArrowLeft,
  FileCode,
  AlertCircle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Connector } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface TestPlaygroundPageProps {
  connectorId: string;
  onNavigate: (path: string) => void;
}

export function TestPlaygroundPage({ connectorId, onNavigate }: TestPlaygroundPageProps) {
  const [connector, setConnector] = useState<Connector | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Form field state dynamically keyed by field name
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, File>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});

  // Execution Results
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<any | null>(null);
  const [executionMeta, setExecutionMeta] = useState<any | null>(null);

  // Playground Authentication key override
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [useAdminBypass, setUseAdminBypass] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');

  const { success, error, info } = useToast();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getConnector(connectorId);
        setConnector(data);
        if (data.model) {
          setSelectedModel(data.model);
        }

        // Pre-populate default values
        const defaults: Record<string, any> = {};
        (data.inputs || []).forEach((inp) => {
          if (inp.defaultValue !== undefined && inp.defaultValue !== '') {
            defaults[inp.name] = inp.defaultValue;
          } else if (inp.type === 'NUMBER') {
            defaults[inp.name] = 100;
          } else if (inp.type === 'BOOLEAN') {
            defaults[inp.name] = true;
          } else if (inp.type === 'JSON') {
            defaults[inp.name] = '{\n  "tone": "professional"\n}';
          } else if (inp.type === 'TEXT') {
            defaults[inp.name] = '';
          }
        });
        setFormValues(defaults);
      } catch (err: any) {
        error('Failed to load connector', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [connectorId]);

  const handleInputChange = (name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (name: string, file: File | null) => {
    if (!file) {
      setFileUploads((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      setFilePreviews((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      return;
    }

    setFileUploads((prev) => ({ ...prev, [name]: file }));

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews((prev) => ({ ...prev, [name]: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviews((prev) => ({ ...prev, [name]: `[File: ${file.name}]` }));
    }
  };

  // Sample Business Card Image Loader for convenience
  const handleLoadSampleCard = async (fieldName: string) => {
    // Generate a simple demo business card canvas image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 360);

      // Gold border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 570, 330);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('SARAH JENKINS', 45, 80);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px sans-serif';
      ctx.fillText('VP of Cloud Architecture & AI', 45, 115);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px sans-serif';
      ctx.fillText('CloudScale Systems Inc.', 45, 155);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px monospace';
      ctx.fillText('Phone:   +1 (415) 555-0199', 45, 220);
      ctx.fillText('Email:   sarah.jenkins@cloudscale.io', 45, 250);
      ctx.fillText('Website: https://cloudscale.io', 45, 280);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'sarah_jenkins_card.png', { type: 'image/png' });
          handleFileSelect(fieldName, file);
          success('Sample card loaded', 'Loaded synthetic business card for OCR testing.');
        }
      });
    }
  };

  const handleExecute = async () => {
    if (!connector) return;

    try {
      setExecuting(true);
      setExecutionResult(null);
      setExecutionError(null);
      setExecutionMeta(null);

      // Prepare payload
      const hasFiles = Object.keys(fileUploads).length > 0;
      let payload: any;

      if (hasFiles) {
        const formData = new FormData();
        Object.entries(formValues).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            formData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
          }
        });
        Object.entries(fileUploads).forEach(([k, file]) => {
          formData.append(k, file);
        });
        payload = formData;
      } else {
        const jsonBody: Record<string, any> = {};
        Object.entries(formValues).forEach(([k, v]) => {
          const inputDef = (connector.inputs || []).find((i) => i.name === k);
          if (inputDef?.type === 'NUMBER') {
            jsonBody[k] = Number(v);
          } else if (inputDef?.type === 'BOOLEAN') {
            jsonBody[k] = v === true || v === 'true';
          } else if (inputDef?.type === 'JSON' && typeof v === 'string') {
            try {
              jsonBody[k] = JSON.parse(v);
            } catch {
              jsonBody[k] = v;
            }
          } else {
            jsonBody[k] = v;
          }
        });
        payload = jsonBody;
      }

      const res = await api.testConnector(
        connector.id,
        payload,
        useAdminBypass ? undefined : apiKeyInput,
        selectedModel
      );

      setExecutionResult(res.data);
      setExecutionMeta(res.meta);
      success('Execution completed', `Response received in ${res.meta?.latencyMs}ms`);
    } catch (err: any) {
      setExecutionError({
        code: err.code || 'EXECUTION_FAILED',
        message: err.message,
        details: err.details,
      });
      error('API Execution Error', err.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading playground...</div>;
  }

  if (!connector) {
    return <div className="p-8 text-center text-zinc-400">Connector not found.</div>;
  }

  const endpointUrl = `${window.location.origin}/api/run/${connector.slug}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <button
            onClick={() => onNavigate(`/connectors/${connector.id}`)}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {connector.name}</span>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">{connector.name}</h2>
            <Badge variant="cyan" size="sm">{connector.provider.toUpperCase()}</Badge>
            <Badge variant={connector.status === 'active' ? 'success' : 'error'} size="sm">
              {connector.status}
            </Badge>
          </div>
          <p className="text-zinc-400 text-xs font-mono mt-1">
            POST /api/{connector.slug}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(`/connectors/${connector.id}/docs`)}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>API Docs</span>
          </button>
        </div>
      </div>

      {/* Main Playground Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Request Builder */}
        <div className="lg:col-span-6 space-y-6">
          {/* Authentication & Model Settings Panel */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Playground Authorization</span>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAdminBypass}
                  onChange={(e) => setUseAdminBypass(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-sky-500"
                />
                <span>Internal Admin Mode</span>
              </label>
            </div>

            {!useAdminBypass && (
              <div>
                <input
                  type="text"
                  placeholder="Paste Bearer API Key (aic_live_...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            )}

            {/* Model Override Selector */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400 font-medium">Model Selection:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-sky-500"
              >
                {connector.provider === 'gemini' ? (
                  <>
                    <option value="gemini-flash-latest">Gemini Flash Latest (Stable, Recommended)</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra-Fast)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Next-Gen)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Complex)</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="o3-mini">o3-mini</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Generated Input Parameters Form */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Dynamic Parameters</h3>
                <p className="text-xs text-zinc-400">Values passed into the AI prompt engine</p>
              </div>
            </div>

            <div className="space-y-4">
              {(connector.inputs || []).map((inp) => (
                <div key={inp.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                      <span>{inp.label || inp.name}</span>
                      {inp.required && <span className="text-rose-400 text-[10px]">*</span>}
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">{inp.type}</span>
                  </div>

                  {/* Render based on dynamic type */}
                  {inp.type === 'IMAGE' || inp.type === 'FILE' ? (
                    <div className="space-y-2">
                      <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                        <input
                          type="file"
                          accept={inp.type === 'IMAGE' ? 'image/*' : undefined}
                          onChange={(e) => handleFileSelect(inp.name, e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-1.5 text-xs text-zinc-400">
                          {inp.type === 'IMAGE' ? (
                            <ImageIcon className="w-6 h-6 text-sky-400" />
                          ) : (
                            <Upload className="w-6 h-6 text-indigo-400" />
                          )}
                          <span>
                            {fileUploads[inp.name]
                              ? fileUploads[inp.name].name
                              : 'Click or drop file to upload'}
                          </span>
                          <span className="text-[10px] text-zinc-400">Max size 20MB</span>
                        </div>
                      </div>

                      {/* Sample Card shortcut if this is card scanner */}
                      {inp.type === 'IMAGE' && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Need a sample card?</span>
                          <button
                            type="button"
                            onClick={() => handleLoadSampleCard(inp.name)}
                            className="text-sky-400 hover:text-sky-300 font-medium"
                          >
                            Load Synthetic Business Card
                          </button>
                        </div>
                      )}

                      {filePreviews[inp.name] && inp.type === 'IMAGE' && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800 max-h-48 bg-zinc-950 flex items-center justify-center">
                          <img
                            src={filePreviews[inp.name]}
                            alt="Upload preview"
                            className="max-h-48 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : inp.type === 'JSON' ? (
                    <textarea
                      rows={4}
                      value={formValues[inp.name] || ''}
                      onChange={(e) => handleInputChange(inp.name, e.target.value)}
                      placeholder='{ "key": "value" }'
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-sky-500"
                    />
                  ) : inp.type === 'NUMBER' ? (
                    <input
                      type="number"
                      value={formValues[inp.name] ?? ''}
                      onChange={(e) => handleInputChange(inp.name, e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-sky-500"
                    />
                  ) : inp.type === 'BOOLEAN' ? (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="radio"
                          name={inp.name}
                          checked={formValues[inp.name] === true}
                          onChange={() => handleInputChange(inp.name, true)}
                          className="text-sky-500 bg-zinc-950 border-zinc-800"
                        />
                        <span>True</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="radio"
                          name={inp.name}
                          checked={formValues[inp.name] === false}
                          onChange={() => handleInputChange(inp.name, false)}
                          className="text-sky-500 bg-zinc-950 border-zinc-800"
                        />
                        <span>False</span>
                      </label>
                    </div>
                  ) : (
                    <textarea
                      rows={inp.name.includes('prompt') || inp.name.includes('text') ? 3 : 1}
                      value={formValues[inp.name] || ''}
                      onChange={(e) => handleInputChange(inp.name, e.target.value)}
                      placeholder={`Enter ${inp.label || inp.name}...`}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500 leading-relaxed"
                    />
                  )}

                  {inp.description && (
                    <p className="text-[10px] text-zinc-400">{inp.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleExecute}
                disabled={executing}
                className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing with {connector.provider.toUpperCase()}...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-zinc-950" />
                    <span>Execute Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Output & Request Inspector */}
        <div className="lg:col-span-6 space-y-6">
          {/* Status and Latency Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Status:</span>
              {executing ? (
                <span className="text-sky-400 font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </span>
              ) : executionError ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Failed
                </span>
              ) : executionResult ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  200 OK
                </span>
              ) : (
                <span className="text-zinc-400">Idle / Ready</span>
              )}
            </div>

            {executionMeta && (
              <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                <span className="flex items-center gap-1 text-amber-400">
                  <Clock className="w-3 h-3" />
                  {executionMeta.latencyMs}ms
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-sky-400">
                  <Coins className="w-3 h-3" />
                  {executionMeta.tokens?.total || 0} tokens
                </span>
              </div>
            )}
          </div>

          {/* Response Viewer */}
          <div className="space-y-4">
            {executionError ? (
              <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>{executionError.code}</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                  {executionError.message}
                </p>
                {executionError.details && (
                  <pre className="text-[11px] text-rose-300 font-mono pt-2 overflow-x-auto">
                    {JSON.stringify(executionError.details, null, 2)}
                  </pre>
                )}
                {(executionError.code === 'UPSTREAM_HIGH_DEMAND' ||
                  executionError.message?.includes('503') ||
                  executionError.message?.includes('high demand') ||
                  executionError.message?.includes('UNAVAILABLE')) && (
                  <div className="pt-3 border-t border-rose-900/50 space-y-2">
                    <span className="text-[11px] text-zinc-300 font-medium block">
                      Google's preview server is experiencing high traffic. Quick switch model:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('gemini-flash-latest');
                          setTimeout(() => handleExecute(), 50);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
                      >
                        Retry with Gemini Flash Latest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('gemini-3.1-flash-lite');
                          setTimeout(() => handleExecute(), 50);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors"
                      >
                        Retry with Gemini 3.1 Flash Lite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : executionResult ? (
              <CodeBlock
                code={JSON.stringify(executionResult, null, 2)}
                title="STRUCTURED JSON RESPONSE (200 OK)"
                language="json"
              />
            ) : (
              <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-xs space-y-2">
                <Cpu className="w-8 h-8 mx-auto text-zinc-400" />
                <p className="font-medium text-zinc-400">No execution run yet</p>
                <p className="text-[11px] text-zinc-400">
                  Fill in the input parameters and click "Execute Request" to test your live API.
                </p>
              </div>
            )}
          </div>

          {/* Working cURL Example snippet for this exact test */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-300 block">External cURL Command</span>
            <CodeBlock
              code={`curl -X POST "${endpointUrl}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(formValues, null, 2)}'`}
              language="bash"
              title="CURL REQUEST"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
