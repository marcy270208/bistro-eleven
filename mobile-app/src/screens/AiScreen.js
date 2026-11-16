import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
  const isAdmin = user?.role === 'administrator';
  const scrollRef = useRef(null);

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
  const [inqFilter, setInqFilter] = useState('Pending');
  const [chefDrafts, setChefDrafts] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [chefError, setChefError] = useState('');

  const loadInquiries = useCallback(async () => {
    if (!token) {
      setInquiries([]);
      return;
    }
    setLoadingInq(true);
    setChefError('');
    try {
      const data = await api('/api/ai/inquiries', { token });
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAdmin) {
        setChefError(err.message || (isId ? 'Gagal memuat pertanyaan' : 'Failed to load inquiries'));
      }
    } finally {
      setLoadingInq(false);
    }
  }, [token, isAdmin, isId]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

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
    scrollToBottom();

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
      scrollToBottom();
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
      scrollToBottom();
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

  const handleChefReply = async (inq) => {
    const reply = (chefDrafts[inq.id] || '').trim();
    if (!reply) return;
    setReplyingId(inq.id);
    setChefError('');
    try {
      const updated = await api(`/api/ai/inquiries/${inq.id}/reply`, {
        token,
        method: 'POST',
        body: JSON.stringify({ reply }),
      });
      setInquiries((prev) => prev.map((item) => (item.id === inq.id ? updated : item)));
      setChefDrafts((prev) => ({ ...prev, [inq.id]: '' }));
    } catch (err) {
      setChefError(err.message || (isId ? 'Gagal mengirim balasan' : 'Failed to send reply'));
    } finally {
      setReplyingId(null);
    }
  };

  // ADMIN / HEAD CHEF VIEW
  if (isAdmin) {
    const filteredInquiries = inquiries.filter((inq) => {
      if (inqFilter === 'Pending') return inq.status !== 'Answered';
      if (inqFilter === 'Answered') return inq.status === 'Answered';
      return true;
    });

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 85}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loadingInq}
              onRefresh={loadInquiries}
              tintColor={COLORS.accent}
            />
          }
        >
          <View style={styles.headerCard}>
            <View style={styles.inqHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.eyebrow}>KITCHEN DESK · HEAD CHEF</Text>
                <Text style={styles.title}>
                  {isId ? 'Pertanyaan Pelanggan' : 'Customer Inquiries'}
                </Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadInquiries}>
                <Text style={styles.refreshBtnText}>{isId ? 'Muat ulang' : 'Refresh'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>
              {isId
                ? 'Pertanyaan dari pelanggan yang diteruskan dari AI Concierge muncul di sini untuk dibalas langsung oleh Chef.'
                : 'Customer questions escalated from the AI Concierge appear here for the Head Chef to answer.'}
            </Text>
          </View>

          <View style={styles.chipRow}>
            {['Pending', 'Answered', 'All'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, inqFilter === f && styles.filterPillActive]}
                onPress={() => setInqFilter(f)}
              >
                <Text style={[styles.filterText, inqFilter === f && styles.filterTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {chefError ? <Text style={styles.errorText}>{chefError}</Text> : null}

          {loadingInq ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
          ) : null}

          {!loadingInq && filteredInquiries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.mutedText}>
                {isId ? 'Tidak ada pertanyaan di filter ini.' : 'No inquiries in this filter.'}
              </Text>
            </View>
          ) : null}

          {filteredInquiries.map((inq) => (
            <View key={inq.id} style={styles.chefCard}>
              <View style={styles.inqHeader}>
                <Text style={styles.chefCustomer}>
                  {inq.customerName || 'Guest'}
                  {inq.username ? ` (@${inq.username})` : ''}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    inq.status === 'Answered' ? styles.badgeDone : styles.badgePending,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{inq.status || 'Pending'}</Text>
                </View>
              </View>
              <Text style={styles.inqDate}>
                {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : ''}
              </Text>
              <Text style={styles.chefQuestion}>{inq.question}</Text>

              {inq.chefReply ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Chef Reply:</Text>
                  <Text style={styles.replyBody}>{inq.chefReply}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.chefInput}
                value={chefDrafts[inq.id] ?? ''}
                onChangeText={(val) => setChefDrafts((prev) => ({ ...prev, [inq.id]: val }))}
                placeholder={
                  inq.chefReply
                    ? isId
                      ? 'Perbarui balasan Chef...'
                      : 'Update Chef reply...'
                    : isId
                    ? 'Tulis balasan dari Kepala Koki...'
                    : 'Write Head Chef reply...'
                }
                placeholderTextColor={COLORS.muted}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.chefSendBtn,
                  (!(chefDrafts[inq.id] || '').trim() || replyingId === inq.id) &&
                    styles.btnDisabled,
                ]}
                onPress={() => handleChefReply(inq)}
                disabled={!(chefDrafts[inq.id] || '').trim() || replyingId === inq.id}
              >
                <Text style={styles.sendBtnText}>
                  {replyingId === inq.id
                    ? isId
                      ? 'Mengirim...'
                      : 'Sending...'
                    : isId
                    ? 'Kirim Balasan Chef'
                    : 'Send Chef Reply'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // CLIENT AI CONCIERGE VIEW
  const quickChips = isId
    ? ['Rekomendasi best seller?', 'Ada menu pedas?', 'Menu vegetarian?']
    : ['Best seller dish?', 'Any spicy options?', 'Vegetarian choices?'];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 85}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}
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
          onFocus={scrollToBottom}
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
  refreshBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
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
  filterPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  filterTextActive: { color: '#fff' },
  emptyBox: { paddingVertical: 32, alignItems: 'center' },
  errorText: { color: COLORS.danger, fontSize: 13, marginBottom: 10 },
  chefCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chefCustomer: { fontSize: 14, fontWeight: '700', color: COLORS.ink, flex: 1, paddingRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgePending: { backgroundColor: COLORS.warningBg },
  badgeDone: { backgroundColor: COLORS.successBg },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.ink },
  inqDate: { fontSize: 11, color: COLORS.muted, marginTop: 2, marginBottom: 8 },
  chefQuestion: { fontSize: 14, color: COLORS.ink, fontWeight: '600', marginBottom: 10 },
  replyBox: {
    backgroundColor: COLORS.soft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  replyLabel: { fontSize: 11, fontWeight: '700', color: COLORS.accent, marginBottom: 2 },
  replyBody: { fontSize: 13, color: COLORS.ink },
  chefInput: {
    minHeight: 68,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: COLORS.ink,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  chefSendBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
