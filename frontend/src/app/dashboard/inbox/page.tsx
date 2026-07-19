'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Conversation {
  _id: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  aiHandled?: boolean;
  channel: string;
  customerId?: {
    _id: string;
    name: string;
    phone?: string;
  };
}

interface Message {
  _id: string;
  direction: string;
  type: string;
  content?: string;
  status: string;
  isAiGenerated?: boolean;
  createdAt: string;
  media?: { filename?: string; caption?: string };
}

function InboxContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(searchParams.get('id'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c._id === selected);

  const loadConversations = () => {
    api.get<Conversation[]>('/conversations')
      .then((data) => {
        setConversations(data);
        setSelected((prev) => {
          if (prev) return prev;
          const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
          return wide && data.length ? data[0]._id : prev;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadMessages = (id: string) => {
    api.get<{ data: Message[] }>(`/conversations/${id}/messages`)
      .then((res) => setMessages(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selected) {
      loadMessages(selected);
      const interval = setInterval(() => loadMessages(selected), 5000);
      return () => clearInterval(interval);
    }
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedConv?.customerId?.phone) return;
    setSending(true);
    try {
      await api.post('/whatsapp/send', {
        to: selectedConv.customerId.phone,
        type: 'text',
        text: text.trim(),
      });
      setText('');
      loadMessages(selected!);
      loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="page-wrap empty-state">جاري تحميل المحادثات...</div>;
  }

  return (
    <div className={`inbox-shell ${selected ? 'has-selection' : ''}`}>
      <div className="inbox-list flex flex-col min-h-0 border-l border-[var(--border)] bg-white">
        <div className="p-3 sm:p-4 border-b border-[var(--border)] shrink-0">
          <h1 className="page-title text-base sm:text-lg">صندوق الرسائل</h1>
          <p className="page-sub text-xs">{conversations.length} محادثة</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversations.length === 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-sm text-[var(--muted)] leading-relaxed m-0">
                لا محادثات بعد. اربط واتساب أو فعّل التجربة ثم أرسل رسالة اختبار.
              </p>
              <Link href="/dashboard/whatsapp" className="btn-orange text-sm w-full justify-center">
                إعداد واتساب
              </Link>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setSelected(c._id)}
                className={`w-full text-right p-3 sm:p-4 border-b border-[var(--border)] hover:bg-[var(--teal-soft)]/35 transition ${
                  selected === c._id ? 'bg-[var(--teal-soft)]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="icon-badge teal font-bold shrink-0">
                    {(c.customerId?.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{c.customerId?.name}</p>
                      {c.unreadCount > 0 && (
                        <span className="badge badge-ok shrink-0">{c.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate">{c.lastMessage || '—'}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.aiHandled && <span className="chip chip-orange text-[10px] !py-0.5 !px-1.5">AI</span>}
                      <span className="chip chip-soft text-[10px] !py-0.5 !px-1.5">{c.channel}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="inbox-chat flex flex-col min-h-0 min-w-0 bg-[var(--teal-soft)]/30">
        {selectedConv ? (
          <>
            <div className="bg-white border-b border-[var(--border)] px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
              <button
                type="button"
                className="inbox-back app-menu-btn shrink-0"
                aria-label="العودة للمحادثات"
                onClick={() => setSelected(null)}
              >
                →
              </button>
              <div className="icon-badge teal font-bold shrink-0">
                {(selectedConv.customerId?.name || '?').charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{selectedConv.customerId?.name}</p>
                <p className="text-xs text-[var(--muted)] truncate" dir="ltr">{selectedConv.customerId?.phone}</p>
              </div>
              <select
                value={selectedConv.status}
                onChange={(e) => {
                  api.put(`/conversations/${selectedConv._id}/status`, { status: e.target.value })
                    .then(loadConversations);
                }}
                className="select-field text-xs !min-w-0 !w-auto !py-1"
              >
                <option value="open">مفتوحة</option>
                <option value="pending">معلّقة</option>
                <option value="resolved">تم الحل</option>
                <option value="closed">مغلقة</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 min-h-0">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[min(85%,28rem)] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm break-words ${
                      m.direction === 'outbound'
                        ? 'bg-[var(--teal)] text-white rounded-br-md'
                        : 'surface-card rounded-bl-md !shadow-none'
                    }`}
                  >
                    {m.isAiGenerated && (
                      <span className={`text-[10px] ${m.direction === 'outbound' ? 'text-white/70' : 'text-[var(--orange)]'}`}>
                        🤖 AI ·{' '}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.content || `[${m.type}]`}</p>
                    <div className={`text-[10px] mt-1 ${m.direction === 'outbound' ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'outbound' && ` · ${m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}`}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="bg-white border-t border-[var(--border)] p-3 sm:p-4 shrink-0">
              <div className="flex gap-2 sm:gap-3 items-stretch">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="اكتب رسالة واتساب..."
                  className="input-field flex-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !text.trim()}
                  className="btn-teal disabled:opacity-50 shrink-0 !w-auto"
                >
                  {sending ? '...' : 'إرسال'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center empty-state p-6">
            اختر محادثة للبدء
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="page-wrap empty-state">جاري التحميل...</div>}>
      <InboxContent />
    </Suspense>
  );
}
