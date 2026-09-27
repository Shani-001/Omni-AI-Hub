import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ProviderInfo } from '../types/connector.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const loadHealth = async () => {
    try {
      setLoading(true);
      const [h, p] = await Promise.all([api.checkHealth(), api.getProviders()]);
      setHealth(h);
      setProviders(p);
    } catch (err: any) {
      error('Failed to load settings', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Settings & Providers</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Configure backend integrations, monitor provider availability, and verify security posture.
          </p>
        </div>
        <button
          onClick={loadHealth}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* AI Providers Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Registered AI Providers</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((prov) => (
            <div
              key={prov.id}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{prov.name}</span>
                  <Badge variant={prov.id === 'gemini' ? 'cyan' : 'purple'}>
                    {prov.id.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prov.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      prov.isConfigured ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {prov.isConfigured ? 'Connected' : 'Key Needed in .env'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {prov.id === 'gemini'
                  ? 'Official Google @google/genai TypeScript SDK. Multimodal vision and structured JSON support active.'
                  : 'OpenAI Chat Completions API adapter. Supports GPT-4o, GPT-4o-mini with structured JSON mode.'}
              </p>

              <div className="pt-2 text-xs text-zinc-300 space-y-1">
                <span className="text-[11px] text-zinc-400 block font-medium">Available Models:</span>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {prov.models.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300"
                    >
                      {m.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Security Architecture & Key Protection</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The system implements strict separation of duties between AI Provider secrets and client application tokens:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
            <span className="font-semibold text-zinc-200">1. Zero Provider Key Leaks</span>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              <code>GEMINI_API_KEY</code> and <code>OPENAI_API_KEY</code> reside strictly in server environment variables. They are never sent to browser bundles, client network responses, or client logs.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
            <span className="font-semibold text-zinc-200">2. Cryptographic API Key Hashes</span>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Generated connector credentials (<code>aic_live_...</code>) are salted and hashed using SHA-256 before persistence. Raw keys are revealed only once at creation time.
            </p>
          </div>
        </div>
      </div>

      {/* Database & Persistence Status */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>Database & Relational Models</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Production schema defined in <code>prisma/schema.prisma</code> and persisted with an ACID-compliant engine at <code>./data/database.json</code> with synchronous atomic renames.
        </p>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-300 space-y-1">
          <div>Prisma Schema: <span className="text-sky-400">/prisma/schema.prisma</span></div>
          <div>Database Location: <span className="text-emerald-400">./data/database.json</span></div>
          <div>Server Runtime: <span className="text-purple-400">Node.js + Express.js + Vite</span></div>
          <div>Uptime: <span className="text-zinc-400">{Math.round(health?.uptime || 0)}s</span></div>
        </div>
      </div>
    </div>
  );
}
