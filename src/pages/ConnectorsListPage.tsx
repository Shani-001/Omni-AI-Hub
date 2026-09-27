import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  FileCode,
  ListOrdered,
  Edit,
  Trash2,
  Power,
  ExternalLink,
  Cpu,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Connector } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface ConnectorsListPageProps {
  onNavigate: (path: string) => void;
}

export function ConnectorsListPage({ onNavigate }: ConnectorsListPageProps) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'requests' | 'created'>('created');

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Connector | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error } = useToast();

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const data = await api.getConnectors();
      setConnectors(data);
    } catch (err: any) {
      error('Failed to load connectors', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectors();
  }, []);

  const handleToggleStatus = async (connector: Connector) => {
    try {
      const updated = await api.toggleStatus(connector.id);
      setConnectors((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)));
      success(
        `Connector ${updated.status === 'active' ? 'Activated' : 'Deactivated'}`,
        `"${connector.name}" is now ${updated.status}.`
      );
    } catch (err: any) {
      error('Failed to update status', err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteConnector(deleteTarget.id);
      setConnectors((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      success('Connector Deleted', `"${deleteTarget.name}" has been permanently removed.`);
      setDeleteTarget(null);
    } catch (err: any) {
      error('Deletion failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort connectors
  const filtered = connectors
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProvider =
        providerFilter === 'all' || c.provider.toLowerCase() === providerFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === 'all' ||
        (c.inputs || []).some((i) => i.type.toLowerCase() === typeFilter.toLowerCase());

      return matchesSearch && matchesProvider && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'requests') return (b.requestsCount || 0) - (a.requestsCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">AI Connectors</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your AI endpoints, dynamic schemas, and authentication keys.
          </p>
        </div>
        <button
          onClick={() => onNavigate('/connectors/new')}
          className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Connector</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, slug, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">All Providers</option>
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          {/* Input Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">All Input Types</option>
            <option value="image">Image (Vision)</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="json">JSON</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-hidden focus:border-sky-500"
          >
            <option value="created">Sort: Newest First</option>
            <option value="name">Sort: Alphabetical</option>
            <option value="requests">Sort: Most Requests</option>
          </select>
        </div>
      </div>

      {/* Connectors Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse border border-zinc-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200">No Connectors Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm || providerFilter !== 'all' || statusFilter !== 'all'
              ? 'No connectors match your active search or filter criteria.'
              : 'Get started by creating your first AI-powered microservice endpoint.'}
          </p>
          <button
            onClick={() => onNavigate('/connectors/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-zinc-950 text-xs font-semibold rounded-xl hover:bg-sky-400 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Connector</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-900/80">
                  <th className="py-3 px-4">Connector</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Inputs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requests</th>
                  <th className="py-3 px-4 hidden md:table-cell">Last Used</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((conn) => {
                  const inputTypes = Array.from(new Set((conn.inputs || []).map((i) => i.type)));
                  return (
                    <tr key={conn.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onNavigate(`/connectors/${conn.id}`)}
                          className="font-semibold text-zinc-100 hover:text-sky-400 transition-colors text-left flex flex-col"
                        >
                          <span>{conn.name}</span>
                          <span className="font-mono text-[10px] text-zinc-400 font-normal">
                            /api/{conn.slug}
                          </span>
                        </button>
                      </td>

                      {/* Provider & Model */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={conn.provider.toLowerCase() === 'gemini' ? 'cyan' : 'purple'}
                            size="sm"
                          >
                            {conn.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                          </Badge>
                          <span className="font-mono text-[10px] text-zinc-400">{conn.model}</span>
                        </div>
                      </td>

                      {/* Inputs */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {inputTypes.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(conn)}
                          className="flex items-center gap-1.5 focus:outline-hidden group"
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              conn.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-400'
                            }`}
                          />
                          <span
                            className={`capitalize text-xs font-medium group-hover:underline ${
                              conn.status === 'active' ? 'text-emerald-400' : 'text-zinc-400'
                            }`}
                          >
                            {conn.status}
                          </span>
                        </button>
                      </td>

                      {/* Request count */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {conn.requestsCount ?? 0}
                      </td>

                      {/* Last used */}
                      <td className="py-3.5 px-4 text-zinc-400 text-[11px] hidden md:table-cell">
                        {conn.lastUsedAt
                          ? new Date(conn.lastUsedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test Playground */}
                          <button
                            onClick={() => onNavigate(`/connectors/${conn.id}/test`)}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors"
                            title="Test API in Playground"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          {/* Docs */}
                          <button
                            onClick={() => onNavigate(`/connectors/${conn.id}/docs`)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="View Developer Documentation"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Logs */}
                          <button
                            onClick={() => onNavigate(`/connectors/${conn.id}/logs`)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="View Request Logs"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onNavigate(`/connectors/${conn.id}/edit`)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            title="Edit Connector"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(conn)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete Connector"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
        description="Are you sure you want to permanently delete this AI connector?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Warning:</span> Deleting{' '}
              <strong className="text-white">"{deleteTarget?.name}"</strong> will revoke all its API
              keys and permanently remove its endpoint (<code>/api/{deleteTarget?.slug}</code>). Any
              external applications relying on it will immediately fail.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Connector'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
