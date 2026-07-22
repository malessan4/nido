'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Calendar, MessageCircle, LogOut, Users, Menu, Copy, Check } from 'lucide-react';
import KanbanBoard from '@/components/KanbanBoard';
import CalendarView from '@/components/CalendarView';
import ChatView from '@/components/ChatView';
import { ThemeToggle } from '@/components/ThemeToggle';

const tabs = [
  { id: 'kanban', label: 'Tareas', icon: CheckSquare },
  { id: 'calendar', label: 'Agenda', icon: Calendar },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('kanban');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [username, setUsername] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }
    setUsername(localStorage.getItem('username') || '');
    setDisplayName(localStorage.getItem('displayName') || localStorage.getItem('username') || 'Usuario');
    setFamilyName(localStorage.getItem('familyName') || 'Mi Familia');
    setFamilyCode(localStorage.getItem('familyCode') || '');
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(familyCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="h-[100dvh] overflow-hidden flex text-t-primary" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar overlay mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--bg-panel)', borderRight: '1px solid var(--border-glass)' }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--border-glass)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-t-primary font-bold text-sm truncate">{familyName}</p>
              <p className="text-t-muted text-xs">Family Organizer</p>
            </div>
          </div>
        </div>

        {/* Código de familia */}
        {familyCode && (
          <div className="mx-4 mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-xs text-indigo-500 mb-1.5 font-medium">Código familiar</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-indigo-600 dark:text-indigo-300 text-xs font-mono font-bold truncate">{familyCode}</code>
              <button
                onClick={copyCode}
                className="shrink-0 p-1.5 rounded-lg transition-all hover:scale-110"
                style={{ background: codeCopied ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)' }}
                title="Copiar código"
              >
                {codeCopied
                  ? <Check className="w-3 h-3 text-emerald-500" />
                  : <Copy className="w-3 h-3 text-indigo-500" />
                }
              </button>
            </div>
            <p className="text-xs text-t-muted mt-1.5">Compartilo para que tu familia se una</p>
          </div>
        )}

        {/* User info */}
        <div className="px-4 py-4 mt-2 mx-4 rounded-xl bg-glass-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {getInitial(displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-t-primary text-sm font-semibold truncate">{displayName}</p>
              <p className="text-t-muted text-xs truncate">@{username}</p>
            </div>
          </div>
        </div>

        {/* Navigation (Desktop) */}
        <nav className="hidden lg:flex flex-1 p-4 mt-2 space-y-1 flex-col">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === id ? 'text-t-primary' : 'text-t-secondary hover:text-t-primary bg-transparent hover:bg-glass-1'
              }`}
              style={activeTab === id ? { background: 'rgba(99,102,241,0.15)', borderLeft: '3px solid #6366f1', paddingLeft: '13px' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-glass)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-t-secondary hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <header className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-glass)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-t-muted hover:text-t-primary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-t-primary font-bold text-lg">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-t-muted text-xs">
                Hola, {displayName} 👋 — {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 pb-24 lg:pb-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'kanban' && <KanbanBoard />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'chat' && <ChatView username={username} displayName={displayName} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="lg:hidden absolute bottom-0 left-0 right-0 bg-glass-1 border-t flex items-center justify-around pb-safe pt-2 px-2"
          style={{ borderColor: 'var(--border-glass)', backdropFilter: 'blur(20px)', zIndex: 40 }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 rounded-xl transition-all ${
                activeTab === id ? 'text-indigo-500' : 'text-t-muted hover:text-t-primary'
              }`}
            >
              <Icon className={`w-6 h-6 transition-transform ${activeTab === id ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
