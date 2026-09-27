import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  ArrowLeft,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ApiRequestLog, Connector } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface LogsPageProps {
  connectorId?: string;
  onNavigate: (path: string) => void;
}

export function LogsPage({ connectorId, onNavigate }: LogsPageProps) {
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  // Filter states
  const [selectedConnectorId, setSelectedConnectorId] = useState(connectorId || 'all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspection modal
  const [inspectLog, setInspectLog] = useState<ApiRequestLog | null>(null);

  const { error } = useToast();

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (selectedConnectorId !== 'all') params.connectorId = selectedConnectorId;
      if (providerFilter !== 'all') params.provider = providerFilter;
      if (statusFilter === 'success') params.success = true;
      if (statusFilter === 'failed') params.success = false;

      const [logsRes, connsRes] = await Promise.all([
        api.getLogs(params),
        api.getConnectors(),
      ]);

      setLogs(logsRes.data);
      setTotal(logsRes.total);
      setConnectors(connsRes);
    } catch (err: any) {
      error('Failed to load logs', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedConnectorId, providerFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          {connectorId && (
            <button
              onClick={() => onNavigate(`/connectors/${connectorId}`)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Connector</span>
            </button>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-white">API Request Logs</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time auditable request traces, token usage, latency, and error diagnoses.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mr-2">
          <Filter className="w-4 h-4" />
          <span>Filter By:</span>
        </div>

        {/* Connector Select */}
        <select
          value={selectedConnectorId}
          onChange={(e) => setSelectedConnectorId(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-sky-500"
        >
          <option value="all">All Connectors</option>
          {connectors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Provider Select */}
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-sky-500"
        >
          <option value="all">All Providers</option>
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
        </select>

        {/* Status Select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-sky-500"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success (200 OK)</option>
          <option value="failed">Errors / Failures</option>
        </select>

        <span className="ml-auto text-xs text-zinc-400 font-mono">
          Showing {logs.length} of {total} events
        </span>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse border border-zinc-800" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs">
          No logs match the selected filter criteria.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-medium">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Connector</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Tokens</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={log.success ? 'success' : 'error'} size="sm">
                        {log.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 font-semibold text-zinc-200">
                      {log.connectorName || 'API Execution'}
                      {log.errorMessage && (
                        <span className="block text-[10px] text-rose-400 truncate max-w-xs font-normal">
                          {log.errorMessage}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-zinc-300 font-medium">{log.provider}</span>
                      <span className="block text-[10px] font-mono text-zinc-400">{log.model}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {log.responseTimeMs}ms
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {log.totalTokens > 0 ? log.totalTokens.toLocaleString() : '-'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Log Modal */}
      <Modal
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title="Audit Log Details"
        description={`Log Record ID: ${inspectLog?.id}`}
        maxWidth="xl"
      >
        {inspectLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-400">Status</span>
                <div className="font-semibold text-zinc-200 mt-0.5">
                  <Badge variant={inspectLog.success ? 'success' : 'error'}>
                    {inspectLog.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400">Response Latency</span>
                <div className="font-mono text-zinc-200 mt-0.5">{inspectLog.responseTimeMs}ms</div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400">Total Tokens</span>
                <div className="font-mono text-zinc-200 mt-0.5">{inspectLog.totalTokens}</div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400">Estimated Cost</span>
                <div className="font-mono text-emerald-400 mt-0.5">
                  ${inspectLog.estimatedCost.toFixed(5)}
                </div>
              </div>
            </div>

            {inspectLog.errorMessage && (
              <div className="p-3 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 space-y-1">
                <span className="font-bold text-rose-200">Error [{inspectLog.errorType}]:</span>
                <p className="font-mono text-xs">{inspectLog.errorMessage}</p>
              </div>
            )}

            {inspectLog.requestMetadata && (
              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Request Metadata (Sanitized):</span>
                <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  {JSON.stringify(inspectLog.requestMetadata, null, 2)}
                </pre>
              </div>
            )}

            {inspectLog.responseMetadata && (
              <div className="space-y-1">
                <span className="text-zinc-400 font-semibold">Response Metadata:</span>
                <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  {JSON.stringify(inspectLog.responseMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
