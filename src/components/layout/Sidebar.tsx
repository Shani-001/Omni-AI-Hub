import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  BarChart3,
  Settings,
  PlusCircle,
  Zap,
  Globe2,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ currentPath, onNavigate, isOpenMobile, onCloseMobile }: SidebarProps) {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Connectors', path: '/connectors', icon: Cpu },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleNav = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 text-zinc-300 w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800/80">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
          <Zap className="w-5 h-5 fill-white" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
            Omni<span className="text-sky-400">AI</span> Hub
          </span>
          <span className="block text-[10px] text-zinc-400 font-mono">UNIVERSAL CONNECTOR</span>
        </div>
      </div>

      {/* Primary Action */}
      <div className="p-4">
        <button
          onClick={() => handleNav('/connectors/new')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-md shadow-sky-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Connector</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.path ||
            (item.path === '/connectors' && currentPath.startsWith('/connectors') && currentPath !== '/connectors/new');

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-zinc-800/90 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-5 px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Featured Demos
        </div>
        <button
          onClick={() => handleNav('/connectors/conn_card_scanner_01/test')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 rounded-lg text-left"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate">Card Scanner API</span>
        </button>
        <button
          onClick={() => handleNav('/connectors/conn_article_writer_02/test')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 rounded-lg text-left"
        >
          <Globe2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="truncate">Article Writer API</span>
        </button>
      </div>

      {/* Bottom Status footer */}
      <div className="p-4 border-t border-zinc-800/80 text-xs">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Backend Active
          </span>
          <span className="font-mono text-[10px] text-zinc-400">v1.0.0</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-normal">
          Multi-Provider API Gateway with dynamic schema validation.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block shrink-0 sticky top-0 h-screen">{content}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
