'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock } from 'lucide-react';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (e) { console.error(e); }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedDay) return;
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const start = `${dateStr}T${newTime || '09:00'}:00`;
    const end = `${dateStr}T${newTime || '09:00'}:00`;
    try {
      const res = await api.post('/events', { title: newTitle, description: '', startTime: start, endTime: end });
      setEvents(prev => [...prev, res.data]);
      setNewTitle(''); setNewTime(''); setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const deleteEvent = async (id: number) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (e) { console.error(e); }
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad = startOfMonth(currentMonth).getDay();
  const selectedEvents = selectedDay ? events.filter(ev => isSameDay(new Date(ev.startTime), selectedDay)) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar grid */}
      <div className="lg:col-span-2 rounded-2xl p-5 bg-glass-1" style={{ border: '1px solid var(--border-glass)' }}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl text-t-muted hover:text-t-primary hover:bg-glass-1 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-t-primary font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl text-t-muted hover:text-t-primary hover:bg-glass-1 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-2">
          {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-t-muted py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const hasEvent = events.some(ev => isSameDay(new Date(ev.startTime), day));
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const todayDay = isToday(day);
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all hover:scale-105 ${
                  isSelected ? 'text-white' : todayDay ? 'text-indigo-500' : 'text-t-secondary hover:bg-glass-1'
                }`}
                style={isSelected ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : todayDay ? { background: 'rgba(99,102,241,0.15)' } : {}}
              >
                {format(day, 'd')}
                {hasEvent && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: isSelected ? 'white' : '#6366f1' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events panel */}
      <div className="rounded-2xl p-5 flex flex-col bg-glass-1" style={{ border: '1px solid var(--border-glass)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-t-primary font-bold text-sm">
              {selectedDay ? format(selectedDay, "d 'de' MMMM", { locale: es }) : 'Seleccioná un día'}
            </h3>
            <p className="text-t-muted text-xs">{selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}</p>
          </div>
          {selectedDay && (
            <button onClick={() => setShowForm(!showForm)} className="p-2 rounded-xl text-white transition-all hover:scale-110" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={createEvent}
              className="mb-4 space-y-2 overflow-hidden"
            >
              <input
                type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Nombre del evento..."
                className="w-full px-3 py-2 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
                style={{ border: '1px solid var(--border-glass)' }}
                autoFocus
              />
              <input
                type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-t-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
                style={{ border: '1px solid var(--border-glass)' }}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: '#6366f1' }}>Guardar</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-t-secondary text-xs bg-glass-1">Cancelar</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex-1 space-y-2 overflow-auto">
          {selectedEvents.length === 0 ? (
            <div className="text-center py-12 text-t-muted text-sm">Sin eventos este día</div>
          ) : (
            selectedEvents.map(ev => (
              <motion.div key={ev.id} layout className="group p-3 rounded-xl flex items-start gap-3 bg-glass-1"
                style={{ border: '1px solid var(--border-glass)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-t-primary text-sm font-medium">{ev.title}</p>
                  <p className="text-indigo-500 text-xs">{ev.startTime ? format(new Date(ev.startTime), 'HH:mm') : ''}</p>
                </div>
                <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 text-t-muted hover:text-red-500 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
