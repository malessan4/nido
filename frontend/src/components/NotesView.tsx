'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.post('/notes', { title, content });
      setNotes([res.data, ...notes]);
      setTitle('');
      setContent('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
    try {
      await api.delete(`/notes/${id}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      fetchNotes();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] rounded-2xl overflow-hidden bg-glass-1"
      style={{ border: '1px solid var(--border-glass)' }}>
      
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <StickyNote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-t-primary">Notas Fijas</h2>
            <p className="text-xs text-t-muted">Información importante</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 rounded-xl text-white transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Formulario para agregar */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={addNote}
              className="bg-glass-2 p-4 rounded-xl flex flex-col gap-3 overflow-hidden"
              style={{ border: '1px solid var(--border-glass)' }}
            >
              <input
                type="text"
                placeholder="Título (ej: Horario Colegio)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-2 rounded-lg text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-glass-1"
                autoFocus
              />
              <textarea
                placeholder="Escribí la información importante acá..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="px-4 py-2 rounded-lg text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-glass-1 resize-none"
              />
              <button
                type="submit"
                disabled={!title.trim() || !content.trim() || isLoading}
                className="py-2 rounded-lg text-white text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {isLoading ? 'Guardando...' : 'Pegar Nota'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Grid de Notas */}
        {notes.length === 0 ? (
          <div className="text-center text-t-muted text-sm py-12 m-auto">
            📌 No hay notas fijas aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative p-4 rounded-xl flex flex-col gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05))',
                    border: '1px solid rgba(245, 158, 11, 0.2)' 
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-t-primary text-sm">{note.title}</h3>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-t-muted hover:text-red-500 transition-all absolute top-2 right-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-t-secondary whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
