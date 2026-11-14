import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const QUICK_PROMPTS = [
  '🍽️ Rekomendasi menu favorit',
  '⭐ Ringkasan review pelanggan',
  '💸 Menu hemat di bawah Rp 25.000',
  '🍰 Rekomendasi dessert & minuman',
  '👨‍🍳 Request khusus / Tanya Chef',
];

function formatSimpleMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <span key={lineIdx} style={{ display: 'block', minHeight: line.trim() ? 'auto' : '8px' }}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={partIdx}>{part.slice(1, -1)}</em>;
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </span>
    );
  });
}

export default function AiConcierge({ user, token, addToCart }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [escalatingId, setEscalatingId] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [guestInquiryIds, setGuestInquiryIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bistroGuestInquiries') || '[]');
    } catch {
      return [];
    }
  });
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Halo! Saya **Bistro Eleven AI Assistant** 🤖🍽️\nKamu bisa tanya rekomendasi menu, detail komposisi bahan, atau **ringkasan review pelanggan**. Jika ada pertanyaan khusus yang tidak bisa saya jawab, saya akan menghubungkanmu langsung ke **Head Chef** kami!',
      recommendedDishes: [],
      needsChef: false,
    },
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, inquiries, isOpen]);

  // Poll Chef inquiries so customer receives Chef's live reply from Admin Dashboard
  useEffect(() => {
    let active = true;
    const loadInquiries = async () => {
      try {
        if (token) {
          const data = await api('/api/ai/inquiries', { token });
          if (active && Array.isArray(data)) setInquiries(data);
        } else if (guestInquiryIds.length > 0) {
          const results = await Promise.all(
            guestInquiryIds.map((id) => api(`/api/ai/inquiries/${id}`).catch(() => null))
          );
          if (active) setInquiries(results.filter(Boolean));
        }
      } catch {
        // ignore polling error
      }
    };

    loadInquiries();
    const timer = window.setInterval(loadInquiries, 6000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, guestInquiryIds]);

  if (user?.role === 'administrator') return null;

  const answeredCount = inquiries.filter((inq) => inq.status === 'Answered').length;

  const sendQuestion = async (questionText) => {
    const trimmed = questionText.trim();
    if (!trimmed || busy) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const historyPayload = messages
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await api('/api/ai/chat', {
        method: 'POST',
        token,
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          recommendedDishes: response.recommendedDishes || [],
          needsChef: Boolean(response.needsChef),
          originalQuestion: trimmed,
          escalated: false,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text:
            error.message ||
            'Maaf, asisten AI sedang tidak dapat dijangkau. Kamu bisa langsung mengalihkan pertanyaan ini ke Head Chef kami.',
          recommendedDishes: [],
          needsChef: true,
          originalQuestion: trimmed,
          escalated: false,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleEscalateToChef = async (msg) => {
    if (!msg?.originalQuestion || escalatingId) return;
    setEscalatingId(msg.id);
    try {
      const created = await api('/api/ai/escalate', {
        method: 'POST',
        token,
        body: JSON.stringify({
          question: msg.originalQuestion,
          aiContext: msg.text,
          customerName: user?.name || 'Pelanggan Tamu',
        }),
      });

      setMessages((prev) =>
        prev.map((item) =>
          item.id === msg.id ? { ...item, escalated: true, inquiryId: created.id } : item
        )
      );

      setInquiries((prev) => {
        if (prev.some((i) => i.id === created.id)) return prev;
        return [...prev, created];
      });

      if (!token && created?.id) {
        const updatedIds = [...new Set([...guestInquiryIds, created.id])];
        setGuestInquiryIds(updatedIds);
        localStorage.setItem('bistroGuestInquiries', JSON.stringify(updatedIds));
      }
    } catch (error) {
      alert(error.message || 'Gagal mengalihkan pertanyaan ke Chef.');
    } finally {
      setEscalatingId(null);
    }
  };

  return (
    <div className="ai-concierge-root">
      {!isOpen && (
        <button
          type="button"
          className="ai-fab-button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Asisten AI & Tanya Chef"
        >
          <span className="ai-fab-icon">🤖</span>
          <span className="ai-fab-text">Tanya AI &amp; Chef</span>
          {answeredCount > 0 && (
            <span className="ai-fab-badge" title="Ada balasan dari Head Chef">
              {answeredCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <aside className="ai-chat-window" aria-label="Bistro Eleven AI & Chef Concierge">
          <header className="ai-chat-header">
            <div>
              <p className="ai-chat-eyebrow">BISTRO ELEVEN CONCIERGE</p>
              <h3>🤖 Asisten AI &amp; Live Chef</h3>
            </div>
            <button
              type="button"
              className="ai-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup chat"
            >
              &times;
            </button>
          </header>

          <div className="ai-quick-chips">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ai-chip"
                disabled={busy}
                onClick={() => sendQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-msg-row ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant'}`}
              >
                <div className="ai-msg-bubble">
                  <div className="ai-msg-content">{formatSimpleMarkdown(msg.text)}</div>

                  {Array.isArray(msg.recommendedDishes) && msg.recommendedDishes.length > 0 && (
                    <div className="ai-dish-recommendations">
                      {msg.recommendedDishes.map((dish) => (
                        <div key={dish.id} className="ai-mini-dish-card">
                          <img src={dish.image} alt={dish.name} />
                          <div className="ai-mini-dish-info">
                            <b>{dish.name}</b>
                            <span>Rp {Number(dish.price).toLocaleString('id-ID')}</span>
                          </div>
                          <button
                            type="button"
                            className="ai-mini-add-btn"
                            onClick={() => addToCart(dish.id)}
                          >
                            + Pesan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.originalQuestion && (
                    <div className="ai-escalate-bar">
                      {msg.escalated ? (
                        <span className="ai-escalated-status">
                          ✅ Dialihkan ke Head Chef — balasan Chef akan muncul di bawah.
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={`ai-escalate-btn ${msg.needsChef ? 'ai-escalate-highlight' : ''}`}
                          disabled={escalatingId === msg.id}
                          onClick={() => handleEscalateToChef(msg)}
                        >
                          {escalatingId === msg.id
                            ? 'Mengirim ke dapur...'
                            : msg.needsChef
                              ? '👨‍🍳 Alihkan & Tanya Langsung ke Chef'
                              : '👨‍🍳 Kurang puas? Tanya ke Chef'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {inquiries.length > 0 && (
              <div className="ai-chef-threads">
                <p className="ai-chef-threads-title">👨‍🍳 Status Pertanyaan ke Head Chef</p>
                {inquiries.map((inq) => (
                  <div key={inq.id} className="ai-chef-card">
                    <div className="ai-chef-card-header">
                      <span>
                        <b>Pertanyaanmu:</b> &ldquo;{inq.question}&rdquo;
                      </span>
                      <span
                        className={`ai-chef-badge ${
                          inq.status === 'Answered' ? 'answered' : 'pending'
                        }`}
                      >
                        {inq.status === 'Answered' ? 'Dijawab Chef' : 'Menunggu Chef'}
                      </span>
                    </div>
                    {inq.status === 'Answered' && inq.chefReply ? (
                      <div className="ai-chef-reply-box">
                        <b>👨‍🍳 Balasan Head Chef:</b>
                        <p>{inq.chefReply}</p>
                      </div>
                    ) : (
                      <p className="ai-chef-waiting">
                        Sedang diteruskan ke portal Admin/Chef di dapur...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {busy && (
              <div className="ai-msg-row ai-msg-assistant">
                <div className="ai-msg-bubble ai-typing">
                  Asisten AI sedang menyiapkan jawaban...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            className="ai-chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
          >
            <input
              type="text"
              placeholder="Tanya menu, review, atau request ke Chef..."
              value={input}
              maxLength={600}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="button button-red" disabled={busy || !input.trim()}>
              Kirim
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}
