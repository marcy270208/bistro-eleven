import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../lib/api';
import { COLORS, formatRupiah } from '../theme';

export default function AiScreen({ token, user, lang, onAddToCart }) {
  const isId = lang === 'id';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: isId
        ? 'Halo! Saya Asisten AI Bistro Eleven. Tanyakan rekomendasi menu, bahan makanan, atau ulasan pelanggan.'
        : 'Hi! I am the Bistro Eleven AI Concierge. Ask about dish recommendations, ingredients, or guest reviews.',
      dishes: [],
      needsChef: false,
      question: '',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalatingIdx, setEscalatingIdx] = useState(-1);
  const [inquiries, setInquiries] = useState([]);
  const [loadingInq, setLoadingInq] = useState(false);

  const loadInquiries = useCallback(async () => {
    if (!token) {
      setInquiries([]);
      return;
    }
    setLoadingInq(true);
    try {
      const data = await api('/api/ai/inquiries', { token });
      setInquiries(Array.isArray(data) ? data : []);
    } catch {
      // Ignore quietly so chat remains usable
    } finally {
      setLoadingInq(false);
    }
  }, [token]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const sendMessage = async (preset) => {
    const query = (preset ?? input).trim();
    if (!query || sending) return;

    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    if (!preset) setInput('');
    setSending(true);

    try {
      const data = await api('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: query, history, lang }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || (isId ? 'Maaf, tidak ada jawaban.' : 'Sorry, no reply received.'),
          dishes: Array.isArray(data.recommendedDishes) ? data.recommendedDishes : [],
          needsChef: Boolean(data.needsChef),
          question: data.originalQuestion || query,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            err.message ||
            (isId ? 'Terjadi kesalahan saat menghubungi AI.' : 'Failed to reach AI Concierge.'),
          dishes: [],
          needsChef: true,
          question: query,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async (msg, idx) => {
    setEscalatingIdx(idx);
    try {
      await api('/api/ai/escalate', {
        token,
        method: 'POST',
        body: JSON.stringify({
          question: msg.question || msg.text,
          aiContext: msg.text,
          customerName: user?.name || 'Guest',
        }),
      });
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, escalated: true } : m))
      );
      await loadInquiries();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.message || (isId ? 'Gagal mengirim ke Chef.' : 'Failed to escalate to Chef.'),
        },
      ]);
    } finally {
      setEscalatingIdx(-1);
    }
  };

  const quickChips = isId
    ? ['Rekomendasi best seller?', 'Ada menu pedas?', 'Menu vegetarian?']
    : ['Best seller dish?', 'Any spicy options?', 'Vegetarian choices?'];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>AI CONCIERGE & LIVE CHEF</Text>
          <Text style={styles.title}>
            {isId ? 'Tanya AI & Kepala Koki' : 'Ask AI & Head Chef'}
          </Text>
          <Text style={styles.disclaimer}>
            {isId
              ? 'Jawaban AI dibuat otomatis dari data menu & ulasan. Pertanyaan khusus dapat diteruskan ke Chef.'
              : 'AI replies are generated automatically from menu & reviews. Special requests can be escalated to our Chef.'}
          </Text>
        </View>

        <View style={styles.chipRow}>
          {quickChips.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => sendMessage(chip)}
              disabled={sending}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={idx}
              style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={[styles.bubbleRole, isUser && styles.userBubbleRole]}>
                {isUser ? (isId ? 'Anda' : 'You') : 'AI Concierge'}
              </Text>
              <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                {msg.text}
              </Text>

              {Array.isArray(msg.dishes) && msg.dishes.length > 0 ? (
                <View style={styles.dishList}>
                  {msg.dishes.map((dish) => (
                    <View key={dish.id} style={styles.dishCard}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.dishName}>{dish.name}</Text>
                        <Text style={styles.dishPrice}>{formatRupiah(dish.price)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => onAddToCart(dish)}
                      >
                        <Text style={styles.addBtnText}>+ {isId ? 'Tambah' : 'Add'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              {!isUser && idx > 0 ? (
                <TouchableOpacity
                  style={[styles.escalateBtn, msg.escalated && styles.escalatedDone]}
                  onPress={() => handleEscalate(msg, idx)}
                  disabled={msg.escalated || escalatingIdx === idx}
                >
                  <Text style={styles.escalateText}>
                    {msg.escalated
                      ? isId
                        ? 'Terkirim ke Chef'
                        : 'Sent to Head Chef'
                      : escalatingIdx === idx
                      ? isId
                        ? 'Mengirim...'
                        : 'Sending...'
                      : isId
                      ? 'Teruskan ke Kepala Koki'
                      : 'Escalate & Ask Head Chef'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {sending ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.mutedText}>
              {isId ? 'AI sedang mengetik...' : 'AI is thinking...'}
            </Text>
          </View>
        ) : null}

        {token ? (
          <View style={styles.inqSection}>
            <View style={styles.inqHeader}>
              <Text style={styles.inqTitle}>
                {isId ? 'Balasan Langsung dari Koki' : 'Live Chef Replies'}
              </Text>
              <TouchableOpacity style={styles.inqRefresh} onPress={loadInquiries}>
                <Text style={styles.inqRefreshText}>
                  {loadingInq ? '...' : isId ? 'Muat ulang' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {inquiries.length === 0 ? (
              <Text style={styles.mutedText}>
                {isId ? 'Belum ada pertanyaan yang diteruskan.' : 'No escalated questions yet.'}
              </Text>
            ) : (
              inquiries.slice(0, 5).map((inq) => (
                <View key={inq.id} style={styles.inqCard}>
                  <Text style={styles.inqQ}>Q: {inq.question}</Text>
                  <Text style={styles.inqA}>
                    {inq.chefReply
                      ? `Chef: ${inq.chefReply}`
                      : isId
                      ? 'Menunggu balasan Chef...'
                      : 'Waiting for Chef reply...'}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isId ? 'Tanya tentang menu...' : 'Ask about our menu...'}
          placeholderTextColor={COLORS.muted}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.btnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{isId ? 'Kirim' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { padding: 16, paddingBottom: 24 },
  headerCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 12,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: COLORS.accent },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.ink, marginTop: 2 },
  disclaimer: { fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 17 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '92%' },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.accent },
  bubbleRole: { fontSize: 11, fontWeight: '700', color: COLORS.accent, marginBottom: 4 },
  userBubbleRole: { color: '#ffedd5' },
  bubbleText: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  userBubbleText: { color: '#fff' },
  dishList: { marginTop: 10, gap: 8 },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  dishName: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  dishPrice: { fontSize: 12, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  escalateBtn: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  escalatedDone: { backgroundColor: COLORS.successBg, borderColor: COLORS.success },
  escalateText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mutedText: { fontSize: 13, color: COLORS.muted },
  inqSection: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  inqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inqTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  inqRefresh: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center' },
  inqRefreshText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
  inqCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  inqQ: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  inqA: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  input: {
    flex: 1,
    minHeight: 46,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    color: COLORS.ink,
    fontSize: 14,
  },
  sendBtn: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
