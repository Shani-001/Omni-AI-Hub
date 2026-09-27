import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Play,
  FileCode,
  ListOrdered,
  Edit,
  Trash2,
  Key,
  Plus,
  Copy,
  Check,
  Cpu,
  Layers,
  Shield,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Connector, ApiKey } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface ConnectorDetailPageProps {
  connectorId: string;
  onNavigate: (path: string) => void;
}

export function ConnectorDetailPage({ connectorId, onNavigate }: ConnectorDetailPageProps) {
  const [connector, setConnector] = useState<Connector | null>(null);
  const [loading, setLoading] = useState(true);

  // New key generation modal state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('New Production Key');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { success, error, info } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getConnector(connectorId);
      setConnector(data);
    } catch (err: any) {
      error('Failed to load connector', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [connectorId]);

  const handleToggleStatus = async () => {
    if (!connector) return;
    try {
      const updated = await api.toggleStatus(connector.id);
      setConnector((prev) => (prev ? { ...prev, status: updated.status } : null));
      success(
        `Status updated`,
        `Connector is now ${updated.status === 'active' ? 'active' : 'disabled'}.`
      );
    } catch (err: any) {
      error('Failed to toggle status', err.message);
    }
  };

  const handleGenerateKey = async () => {
    if (!connector) return;
    try {
      setIsGeneratingKey(true);
      const res = await api.generateApiKey(connector.id, keyName);
      setGeneratedKey(res.rawKey);
      await loadData();
      success('Key generated', 'Please copy your new API key immediately.');
    } catch (err: any) {
      error('Failed to generate key', err.message);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!connector) return;
    try {
      await api.revokeApiKey(connector.id, keyId);
      success('Key revoked', 'The API key has been revoked and can no longer be used.');
      await loadData();
    } catch (err: any) {
      error('Failed to revoke key', err.message);
    }
  };

  const handleDeleteConnector = async () => {
    if (!connector) return;
    try {
      await api.deleteConnector(connector.id);
      success('Connector deleted', `"${connector.name}" was permanently removed.`);
      onNavigate('/connectors');
    } catch (err: any) {
      error('Delete failed', err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading connector details...</div>;
  }

  if (!connector) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Connector not found.{' '}
        <button onClick={() => onNavigate('/connectors')} className="text-sky-400 underline">
          Return to list
        </button>
      </div>
    );
  }

  const endpointUrl = `${window.location.origin}/api/run/${connector.slug}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back and Title Header */}
      <div>
        <button
          onClick={() => onNavigate('/connectors')}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Connectors</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">{connector.name}</h2>
              <Badge variant={connector.provider === 'gemini' ? 'cyan' : 'purple'}>
                {connector.provider.toUpperCase()}
              </Badge>
              <button
                onClick={handleToggleStatus}
                className="focus:outline-hidden"
                title="Click to toggle status"
              >
                <Badge variant={connector.status === 'active' ? 'success' : 'error'}>
                  {connector.status.toUpperCase()}
                </Badge>
              </button>
            </div>
            <p className="text-zinc-400 text-xs">{connector.description || 'No description provided.'}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate(`/connectors/${connector.id}/test`)}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Test Playground</span>
            </button>

            <button
              onClick={() => onNavigate(`/connectors/${connector.id}/docs`)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => onNavigate(`/connectors/${connector.id}/logs`)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Logs</span>
            </button>

            <button
              onClick={() => onNavigate(`/connectors/${connector.id}/edit`)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="Delete connector"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Endpoint URL and Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="md:col-span-2 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <span className="font-semibold text-zinc-300">Generated Public Endpoint</span>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
            <span className="text-emerald-400 font-bold">POST</span>
            <span className="text-zinc-200 truncate flex-1">{endpointUrl}</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Accepts both <code className="text-sky-300">application/json</code> and{' '}
            <code className="text-sky-300">multipart/form-data</code> with dynamic schema enforcement.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <span className="font-semibold text-zinc-300">AI Model & Settings</span>
          <div className="text-zinc-200 font-mono font-medium">{connector.model}</div>
          <div className="text-zinc-400 text-[11px]">
            Temperature: <strong className="text-zinc-200">{connector.temperature}</strong>
          </div>
          <div className="text-zinc-400 text-[11px]">
            Max Tokens: <strong className="text-zinc-200">{connector.maxTokens}</strong>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              <span>Connector API Keys</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Secure keys for authenticating calls to this specific connector endpoint.
            </p>
          </div>

          <button
            onClick={() => {
              setKeyName(`Key ${((connector.apiKeys || []).length + 1)}`);
              setGeneratedKey(null);
              setShowKeyModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New Key</span>
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-medium">
                <th className="py-2.5 px-4">Key Name</th>
                <th className="py-2.5 px-4">Key Hint</th>
                <th className="py-2.5 px-4">Created Date</th>
                <th className="py-2.5 px-4">Last Used</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(connector.apiKeys || []).map((k) => (
                <tr key={k.id} className="hover:bg-zinc-900/40">
                  <td className="py-2.5 px-4 font-semibold text-zinc-200">{k.name}</td>
                  <td className="py-2.5 px-4 font-mono text-zinc-400">{k.keyPrefix}...{k.hint}</td>
                  <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant={k.isRevoked ? 'error' : 'success'} size="sm">
                      {k.isRevoked ? 'REVOKED' : 'ACTIVE'}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!k.isRevoked && (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configured Input Parameters */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Configured Input Parameters ({connector.inputs?.length || 0})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(connector.inputs || []).map((inp) => (
            <div key={inp.name} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-sky-300 text-xs">{inp.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {inp.type}
                </span>
              </div>
              <div className="text-xs text-zinc-300">{inp.label}</div>
              {inp.description && (
                <p className="text-[11px] text-zinc-400 line-clamp-2">{inp.description}</p>
              )}
              <div className="text-[10px] text-zinc-400 pt-1">
                {inp.required ? (
                  <span className="text-rose-400 font-medium">Required</span>
                ) : (
                  <span>Optional</span>
                )}
                {inp.defaultValue !== undefined && ` • Default: ${String(inp.defaultValue)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output Schema */}
      {connector.outputSchema?.rawSchemaJson && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Expected Output JSON Schema</h3>
          <CodeBlock
            code={connector.outputSchema.rawSchemaJson}
            language="json"
            title="OUTPUT SCHEMA SPECIFICATION"
          />
        </div>
      )}

      {/* Generate API Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title={generatedKey ? 'API Key Created' : 'Generate New API Key'}
        description={
          generatedKey
            ? 'Copy your secret API key now. It will not be shown again.'
            : 'Create a new secret credential for this connector.'
        }
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-xs text-emerald-300">
              Your key is active immediately. Store it securely in your client's environment variables.
            </div>
            <CodeBlock code={generatedKey} title="SECRET KEY" language="text" />
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Key Description / Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Staging Server, Client App"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                disabled={isGeneratingKey}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold shadow-md shadow-sky-500/20"
              >
                {isGeneratingKey ? 'Generating...' : 'Generate Key'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        description={`Permanently delete connector "${connector.name}"?`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-300">
            This action cannot be undone. The endpoint <code className="text-rose-400">/api/{connector.slug}</code> will be deleted and any client relying on it will immediately fail.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConnector}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
