'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Circle, Trash2, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';

interface ShoppingItem {
  id: number;
  name: string;
  isCompleted: boolean;
}

export default function ShoppingListView() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/shopping');
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching shopping items:', error);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.post('/shopping', { name: newItemName });
      setItems([res.data, ...items]);
      setNewItemName('');
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    
    // Optimistic
    setItems(items.map(item => item.id === id ? { ...item, name: editName } : item));
    setEditingId(null);

    try {
      await api.put(`/shopping/${id}`, { name: editName });
    } catch (error) {
      console.error('Error updating item:', error);
      fetchItems();
    }
  };

  const toggleItem = async (id: number) => {
    // Optimistic update
    setItems(items.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
    try {
      await api.patch(`/shopping/${id}/toggle`);
    } catch (error) {
      // Revert on error
      console.error('Error toggling item:', error);
      fetchItems();
    }
  };

  const deleteItem = async (id: number) => {
    setItems(items.filter(item => item.id !== id));
    try {
      await api.delete(`/shopping/${id}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      fetchItems();
    }
  };

  const activeItems = items.filter(item => !item.isCompleted);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] rounded-2xl overflow-hidden bg-glass-1"
      style={{ border: '1px solid var(--border-glass)' }}>
      
      {/* Encabezado */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-t-primary">Lista de Compras</h2>
            <p className="text-xs text-t-muted">{activeItems.length} por comprar</p>
          </div>
        </div>

        {/* Input para agregar */}
        <form onSubmit={addItem} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Ej. Arroz, Papel Higiénico..."
            className="flex-1 px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-glass-2"
            style={{ border: '1px solid var(--border-glass)' }}
          />
          <button
            type="submit"
            disabled={!newItemName.trim() || isLoading}
            className="px-4 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-t-muted text-sm py-12">
            🛒 Tu lista está vacía. Empezá a agregar cosas.
          </div>
        ) : (
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${
                  item.isCompleted ? 'bg-glass-2 opacity-60' : 'bg-glass-1'
                }`}
                style={{ border: '1px solid var(--border-glass)' }}
              >
                {/* Check button */}
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                    item.isCompleted 
                      ? 'bg-emerald-500 text-white' 
                      : 'border-2 border-t-muted text-transparent hover:border-emerald-500'
                  }`}
                >
                  {item.isCompleted ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-0" />}
                </button>

                {/* Name */}
                {editingId === item.id ? (
                  <input 
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => saveEdit(item.id)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                    className="flex-1 px-2 py-1 rounded bg-glass-2 text-t-primary text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                ) : (
                  <span 
                    onClick={() => toggleItem(item.id)}
                    className={`flex-1 text-sm font-medium cursor-pointer select-none transition-all ${
                      item.isCompleted ? 'line-through text-t-muted' : 'text-t-primary'
                    }`}
                  >
                    {item.name}
                  </span>
                )}

                {/* Edit & Delete buttons */}
                <button
                  onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-t-muted hover:text-indigo-500 transition-all focus:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-t-muted hover:text-red-500 transition-all focus:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
