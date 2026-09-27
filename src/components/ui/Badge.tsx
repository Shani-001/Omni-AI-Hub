import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const variantClasses = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
    error: 'bg-rose-950/60 text-rose-300 border-rose-800/50',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-800/50',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50',
    outline: 'bg-transparent text-zinc-400 border-zinc-700',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono rounded-md border font-medium transition-colors ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}
