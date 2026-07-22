'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: number;
  content: string;
  timestamp: string;
  sender: { username: string; displayName?: string; };
}

interface ChatViewProps {
  username: string;
  displayName: string;
}

export default function ChatView({ username }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (e) { console.error(e); }
  };

  // Polling para simular tiempo real (cada 3s) hasta implementar WS en el cliente
  useEffect(() => {
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      // Usamos el endpoint REST por ahora (el WS lo conectamos en la próxima iteración)
      const res = await api.post('/messages/send', { content: input, senderUsername: username });
      setMessages(prev => [...prev, res.data]);
      setInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';
  const avatarColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const getColor = (name: string) => avatarColors[name?.charCodeAt(0) % avatarColors.length];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] rounded-2xl overflow-hidden bg-glass-1"
      style={{ border: '1px solid var(--border-glass)' }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-t-muted text-sm py-12">
            💬 Sé el primero en escribir un mensaje familiar
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender?.username === username;
          const prevSender = i > 0 ? messages[i - 1].sender?.username : null;
          const showAvatar = !isMe && prevSender !== msg.sender?.username;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {!isMe && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mb-0.5"
                  style={{ background: getColor(msg.sender?.username), opacity: showAvatar ? 1 : 0 }}>
                  {getInitial(msg.sender?.username)}
                </div>
              )}

              <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {showAvatar && !isMe && (
                  <span className="text-xs text-t-muted ml-1 font-medium">{msg.sender?.displayName || msg.sender?.username}</span>
                )}
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm break-words"
                  style={isMe
                    ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderBottomRightRadius: '4px' }
                    : { background: 'var(--bg-glass-2)', color: 'var(--text-primary)', borderBottomLeftRadius: '4px' }
                  }
                >
                  {msg.content}
                </div>
                <span className="text-xs text-t-muted px-1 capitalize">
                  {msg.timestamp ? format(new Date(msg.timestamp), 'EEEE HH:mm', { locale: es }) : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-3 p-4"
        style={{ borderTop: '1px solid var(--border-glass)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí un mensaje para tu familia..."
          className="flex-1 px-4 py-3 rounded-2xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2"
          style={{ border: '1px solid var(--border-glass)' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40 disabled:scale-100"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
