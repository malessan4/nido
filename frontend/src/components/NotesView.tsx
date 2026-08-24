'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Trash2, Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
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

  const [editingId, setEditingId] = useState<number | null>(null);

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
    
    if (editingId) {
      // Editar
      try {
        const res = await api.put(`/notes/${editingId}`, { title, content });
        setNotes(notes.map(n => n.id === editingId ? res.data : n));
        setTitle('');
        setContent('');
        setShowForm(false);
        setEditingId(null);
      } catch (error) {
        console.error('Error updating note:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Crear nuevo
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
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setShowForm(false);
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
          onClick={() => {
            if (showForm) cancelEdit();
            else setShowForm(true);
          }}
          className="p-2 rounded-xl text-white transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Grid de Notas */}
        {notes.length === 0 ? (
          <div className="text-center text-t-muted text-sm py-12 m-auto">
            📌 No hay notas fijas aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div className="flex justify-between items-start pr-12">
                    <h3 className="font-bold text-t-primary text-sm">{note.title}</h3>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 text-t-muted hover:text-indigo-500 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 text-t-muted hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-t-secondary whitespace-pre-wrap leading-relaxed mt-1">
                    {note.content}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Formulario usando Portal para escapar del overflow-hidden y transform del parent */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cancelEdit}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.form
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onSubmit={addNote}
                className="relative w-full max-w-lg bg-glass-2 p-6 rounded-2xl flex flex-col gap-4 shadow-2xl"
                style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-t-primary">
                    {editingId ? 'Editar Nota' : 'Nueva Nota Fija'}
                  </h3>
                  <button type="button" onClick={cancelEdit} className="text-t-muted hover:text-t-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Título (ej: Horarios Facultad Mati)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-glass-1"
                  autoFocus
                />
                <textarea
                  placeholder="Escribí la información importante acá..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-glass-1 resize-y"
                />
                
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-5 py-2.5 rounded-xl text-t-secondary text-sm font-medium hover:bg-glass-1 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || !content.trim() || isLoading}
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 hover:scale-105 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                  >
                    {isLoading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Pegar Nota')}
                  </button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
