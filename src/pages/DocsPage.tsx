import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  FileCode,
  Terminal,
  Cpu,
  Layers,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Badge } from '../components/ui/Badge.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { useToast } from '../components/ui/Toast.tsx';

interface DocsPageProps {
  connectorId: string;
  onNavigate: (path: string) => void;
}

export function DocsPage({ connectorId, onNavigate }: DocsPageProps) {
  const [docs, setDocs] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getDocs(connectorId);
        setDocs(data);
      } catch (err: any) {
        error('Failed to load documentation', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [connectorId]);

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading documentation...</div>;
  }

  if (!docs) {
    return <div className="p-8 text-center text-zinc-400">Documentation not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button & Title */}
      <div>
        <button
          onClick={() => onNavigate(`/connectors/${connectorId}`)}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Connector</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-sky-400 uppercase tracking-wider font-semibold">
                DEVELOPER API REFERENCE
              </span>
              <Badge variant="cyan" size="sm">{docs.provider.toUpperCase()}</Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{docs.name}</h2>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed max-w-2xl">
              {docs.description || 'Production AI microservice endpoint.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate(`/connectors/${connectorId}/test`)}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs transition-colors self-start sm:self-auto shadow-sm"
          >
            Launch Playground
          </button>
        </div>
      </div>

      {/* HTTP Endpoint Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">Endpoint URL</span>
          <span className="text-[11px] text-emerald-400 font-medium">Public / Authenticated</span>
        </div>

        <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/50">
            {docs.httpMethod}
          </span>
          <span className="text-zinc-200 font-medium">{docs.fullUrl}</span>
        </div>

        <div className="text-[11px] text-zinc-400">
          Also supports direct short route: <code className="text-sky-300">POST {docs.directEndpoint}</code>
        </div>
      </div>

      {/* Authentication */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          <span>Authentication</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Requests to this endpoint must include your connector API key. Pass it in either the{' '}
          <code className="text-sky-300 font-mono">Authorization</code> header with a Bearer token
          or in the custom <code className="text-sky-300 font-mono">x-api-key</code> header.
        </p>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1">
          <div>
            <span className="text-sky-400">Authorization:</span> Bearer &lt;YOUR_API_KEY&gt;
          </div>
          <div>
            <span className="text-purple-400">x-api-key:</span> &lt;YOUR_API_KEY&gt;
          </div>
        </div>
      </div>

      {/* Parameters Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Request Parameters</span>
        </h3>
        <p className="text-xs text-zinc-400">
          Content-Type: <code className="text-sky-300">{docs.contentType}</code>
        </p>

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 font-medium">
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Required</th>
                <th className="py-2.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(docs.parameters || []).map((param: any) => (
                <tr key={param.name} className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 font-mono font-medium text-sky-300">{param.name}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-300">{param.type}</td>
                  <td className="py-2.5 px-4">
                    {param.required ? (
                      <span className="text-rose-400 font-semibold">required</span>
                    ) : (
                      <span className="text-zinc-500">optional</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                    {param.description || '-'}
                    {param.defaultValue !== undefined && (
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        Default: {String(param.defaultValue)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* cURL Example */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Example cURL Request</span>
        </h3>
        <CodeBlock code={docs.curlExample} title="BASH CURL EXAMPLE" language="bash" />
      </div>

      {/* Success Response */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Expected Response (200 OK)</h3>
        <CodeBlock
          code={JSON.stringify(docs.sampleSuccessResponse, null, 2)}
          title="APPLICATION/JSON RESPONSE"
          language="json"
        />
      </div>

      {/* Error Codes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Error Responses</h3>
        <div className="space-y-3">
          {(docs.errorResponses || []).map((errResp: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="error" size="sm">{errResp.status}</Badge>
                <span className="text-xs font-semibold text-zinc-200">{errResp.description}</span>
              </div>
              <pre className="p-3 bg-zinc-950 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
                {JSON.stringify(errResp.example, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
