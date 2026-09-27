import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  Plus,
  Terminal,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AnalyticsData, Connector, ApiRequestLog } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [recentLogs, setRecentLogs] = useState<ApiRequestLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [anData, conns, logsRes] = await Promise.all([
          api.getAnalytics(30),
          api.getConnectors(),
          api.getLogs({ limit: 8 }),
        ]);
        setAnalytics(anData);
        setConnectors(conns);
        setRecentLogs(logsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded-md w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-xl border border-zinc-800" />
          ))}
        </div>
        <div className="h-72 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">API Gateway & Hub</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Build, test, secure, and monitor reusable AI microservice endpoints in production.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/connectors')}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>All Connectors ({connectors.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('/connectors/new')}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Connector</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Connectors */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Connectors</span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{analytics?.totalConnectors ?? 0}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {analytics?.activeConnectors ?? 0} active
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Automated JSON endpoints live
          </div>
        </div>

        {/* Total API Requests */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Requests</span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {analytics?.totalRequests.toLocaleString() ?? 0}
            </span>
            <span className="text-xs text-zinc-400 font-mono">Last 30d</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">
              {analytics?.successfulRequests} success
            </span>
            <span>•</span>
            <span className="text-rose-400 font-medium">
              {analytics?.failedRequests} failed
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Success Rate</span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {analytics?.successRate ?? 100}%
            </span>
            <span className="text-xs text-emerald-400">Reliable</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            Validated against output schemas
          </div>
        </div>

        {/* Avg Response Time & Cost */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Avg Response Time</span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {analytics?.averageResponseTimeMs ?? 0}ms
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ${(analytics?.estimatedCost ?? 0).toFixed(4)} est.
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            {((analytics?.totalTokens ?? 0) / 1000).toFixed(1)}k total tokens processed
          </div>
        </div>
      </div>

      {/* Traffic Trend Chart Preview */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">API Traffic Activity</h3>
            <p className="text-xs text-zinc-400">Daily API call volume and success trends</p>
          </div>
          <button
            onClick={() => onNavigate('/analytics')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            <span>Deep Dive Analytics</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-60 w-full pt-2">
          {analytics?.timeline && analytics.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(val) => val.slice(5)}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={{ stroke: '#27272a' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f4f4f5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trafficGradient)"
                  name="Requests"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
              No request traffic data recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Featured Demonstrations & Active Connectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launchpad */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Demonstration Connectors</h3>
            <p className="text-xs text-zinc-400">Preconfigured endpoints ready to test</p>
          </div>

          <div className="space-y-3">
            {/* Demo 1: Card Scanner */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  Card Scanner
                </span>
                <Badge variant="cyan" size="sm">Gemini Vision</Badge>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Extracts contact name, email, phone, company from business card photos.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/connectors/conn_card_scanner_01/test')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium transition-colors"
                >
                  Test Playground
                </button>
                <button
                  onClick={() => onNavigate('/connectors/conn_card_scanner_01/docs')}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  View Docs
                </button>
              </div>
            </div>

            {/* Demo 2: Article Writer */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  Article Writer
                </span>
                <Badge variant="purple" size="sm">Gemini / OpenAI</Badge>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Generates complete SEO articles with structured summaries and keyword tags.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/connectors/conn_article_writer_02/test')}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-medium transition-colors"
                >
                  Test Playground
                </button>
                <button
                  onClick={() => onNavigate('/connectors/conn_article_writer_02/docs')}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  View Docs
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent API Requests</h3>
              <p className="text-xs text-zinc-400">Live feed from persistent database audit log</p>
            </div>
            <button
              onClick={() => onNavigate('/analytics')}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <span>View All Logs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Connector</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Latency</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Tokens</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <Badge variant={log.success ? 'success' : 'error'} size="sm">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-200">
                        {log.connectorName || 'API Request'}
                        {log.errorMessage && (
                          <span className="block text-[10px] text-rose-400 truncate max-w-xs">
                            {log.errorMessage}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 font-mono hidden sm:table-cell">
                        {log.responseTimeMs}ms
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 font-mono hidden md:table-cell">
                        {log.totalTokens > 0 ? log.totalTokens : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-right font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-400">
                      No request logs recorded yet. Run a test in the Playground!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
