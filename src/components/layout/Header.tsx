import React, { useEffect, useState } from 'react';
import { Menu, Plus, Sparkles, Activity } from 'lucide-react';
import { api } from '../../services/api.ts';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMobileMenu: () => void;
}

export function Header({ currentPath, onNavigate, onOpenMobileMenu }: HeaderProps) {
  const [health, setHealth] = useState<{ status: string; providers: Record<string, boolean> } | null>(null);

  useEffect(() => {
    api.checkHealth()
      .then(setHealth)
      .catch(() => {});
  }, []);

  const getBreadcrumb = () => {
    if (currentPath === '/dashboard' || currentPath === '/') return 'Dashboard';
    if (currentPath === '/connectors') return 'Connectors';
    if (currentPath === '/connectors/new') return 'New Connector';
    if (currentPath.includes('/test')) return 'API Testing Playground';
    if (currentPath.includes('/docs')) return 'Developer Documentation';
    if (currentPath.includes('/logs')) return 'Request Logs';
    if (currentPath.includes('/edit')) return 'Edit Connector';
    if (currentPath.startsWith('/connectors/')) return 'Connector Details';
    if (currentPath === '/analytics') return 'Analytics & Insights';
    if (currentPath === '/settings') return 'Settings & Providers';
    return 'Platform';
  };

  return (
    <header className="h-16 shrink-0 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 md:hidden transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400 hidden sm:inline">Universal AI Hub</span>
          <span className="text-zinc-400 hidden sm:inline">/</span>
          <h1 className="font-semibold text-zinc-100">{getBreadcrumb()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real Provider Status Badges */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-full text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.providers?.gemini ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'
              }`}
            />
            <span className="text-zinc-300 font-medium">Gemini</span>
          </div>
          <span className="text-zinc-400">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.providers?.openai ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-400'
              }`}
            />
            <span className="text-zinc-400 font-medium">OpenAI</span>
          </div>
        </div>

        {currentPath !== '/connectors/new' && (
          <button
            onClick={() => onNavigate('/connectors/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Connector</span>
          </button>
        )}
      </div>
    </header>
  );
}
