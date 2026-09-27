import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AnalyticsData } from '../types/connector.ts';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getAnalytics(days);
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  // Provider chart data
  const providerData = analytics?.requestsByProvider
    ? Object.entries(analytics.requestsByProvider).map(([name, count]) => ({
        name: name.toUpperCase(),
        count,
      }))
    : [];

  const pieData = analytics
    ? [
        { name: 'Success', value: analytics.successfulRequests, color: '#10b981' },
        { name: 'Failed', value: analytics.failedRequests, color: '#f43f5e' },
      ]
    : [];

  const COLORS = ['#38bdf8', '#a855f7', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8">
      {/* Header and Date Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Analytics & Usage</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Production metrics aggregated directly from backend database records.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          {[
            { label: 'Today', value: 1 },
            { label: '7 Days', value: 7 },
            { label: '30 Days', value: 30 },
            { label: '90 Days', value: 90 },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDays(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                days === tab.value
                  ? 'bg-sky-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs text-zinc-400 font-medium">Total API Volume</span>
          <div className="mt-2 text-3xl font-bold text-white">
            {analytics?.totalRequests.toLocaleString() ?? 0}
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-medium">
            {analytics?.successRate ?? 100}% Success Rate
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs text-zinc-400 font-medium">Average Response Latency</span>
          <div className="mt-2 text-3xl font-bold text-white">
            {analytics?.averageResponseTimeMs ?? 0}ms
          </div>
          <div className="mt-1 text-xs text-zinc-400">Across all providers</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs text-zinc-400 font-medium">Total AI Tokens</span>
          <div className="mt-2 text-3xl font-bold text-white">
            {analytics?.totalTokens.toLocaleString() ?? 0}
          </div>
          <div className="mt-1 text-xs text-zinc-400">Prompt & completion</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs text-zinc-400 font-medium">Estimated Provider Cost</span>
          <div className="mt-2 text-3xl font-bold text-white font-mono">
            ${(analytics?.estimatedCost ?? 0).toFixed(4)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">Model inference rates</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Requests Timeline Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-white">Daily Requests & Latency</h3>
          <div className="h-72 w-full pt-2">
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline}>
                  <defs>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                    stroke="#27272a"
                  />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} stroke="#27272a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="url(#reqGrad)"
                    name="Total Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill="transparent"
                    name="Successful"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No data recorded.
              </div>
            )}
          </div>
        </div>

        {/* Success vs Failure Donut */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-white">Success vs Failure Breakdown</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {pieData.some((p) => p.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400">No requests yet.</div>
            )}
          </div>
        </div>

        {/* Requests by Provider */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-white">Requests by AI Provider</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerData}>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} stroke="#27272a" />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} stroke="#27272a" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connector Breakdown Table */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-white">Requests by Connector</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                  <th className="py-2 px-3">Connector</th>
                  <th className="py-2 px-3">Requests</th>
                  <th className="py-2 px-3">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {analytics?.requestsByConnector && analytics.requestsByConnector.length > 0 ? (
                  analytics.requestsByConnector.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-semibold text-zinc-200">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300">{c.count}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-semibold">{c.successRate}%</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-zinc-400">
                      No connector activity found.
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
