'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch — solo renderizar después de montar en el cliente
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 bg-glass-2 border border-border-glass ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Cambiar tema"
    >
      {isDark
        ? <Sun  className="w-4 h-4 text-amber-400" />
        : <Moon className="w-4 h-4 text-indigo-500" />
      }
    </button>
  );
}
