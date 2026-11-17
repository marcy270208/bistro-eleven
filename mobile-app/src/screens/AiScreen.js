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

export default function AiScreen({ token, user, lang, onAddToCart, colors: propColors }) {
  const colors = propColors || COLORS;
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
        style={[styles.flex, { backgroundColor: colors.paper }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 85}
      >
        <ScrollView
          style={[styles.flex, { backgroundColor: colors.paper }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loadingInq}
              onRefresh={loadInquiries}
              tintColor={colors.accent}
            />
          }
        >
          <View
            style={[
              styles.headerCard,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={styles.inqHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                  KITCHEN DESK · HEAD CHEF
                </Text>
                <Text style={[styles.title, { color: colors.ink }]}>
                  {isId ? 'Pertanyaan Pelanggan' : 'Customer Inquiries'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.refreshBtn,
                  { backgroundColor: colors.soft, borderColor: colors.line },
                ]}
                onPress={loadInquiries}
              >
                <Text style={[styles.refreshBtnText, { color: colors.ink }]}>
                  {isId ? 'Muat ulang' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.disclaimer, { color: colors.muted }]}>
              {isId
                ? 'Pertanyaan dari pelanggan yang diteruskan dari AI Concierge muncul di sini untuk dibalas langsung oleh Chef.'
                : 'Customer questions escalated from the AI Concierge appear here for the Head Chef to answer.'}
            </Text>
          </View>

          <View style={styles.chipRow}>
            {['Pending', 'Answered', 'All'].map((f) => {
              const active = inqFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.line,
                    },
                  ]}
                  onPress={() => setInqFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: active ? '#ffffff' : colors.ink },
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {chefError ? <Text style={[styles.errorText, { color: colors.danger }]}>{chefError}</Text> : null}

          {loadingInq ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
          ) : null}

          {!loadingInq && filteredInquiries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.mutedText, { color: colors.muted }]}>
                {isId ? 'Tidak ada pertanyaan di filter ini.' : 'No inquiries in this filter.'}
              </Text>
            </View>
          ) : null}

          {filteredInquiries.map((inq) => {
            const answered = inq.status === 'Answered';
            return (
              <View
                key={inq.id}
                style={[
                  styles.chefCard,
                  { backgroundColor: colors.surface, borderColor: colors.line },
                ]}
              >
                <View style={styles.inqHeader}>
                  <Text style={[styles.chefCustomer, { color: colors.ink }]}>
                    {inq.customerName || 'Guest'}
                    {inq.username ? ` (@${inq.username})` : ''}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: answered ? colors.successBg : colors.warningBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: answered ? colors.success : colors.warning },
                      ]}
                    >
                      {inq.status || 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.inqDate, { color: colors.muted }]}>
                  {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : ''}
                </Text>
                <Text style={[styles.chefQuestion, { color: colors.ink }]}>{inq.question}</Text>

                {inq.chefReply ? (
                  <View style={[styles.replyBox, { backgroundColor: colors.soft }]}>
                    <Text style={[styles.replyLabel, { color: colors.accent }]}>Chef Reply:</Text>
                    <Text style={[styles.replyBody, { color: colors.ink }]}>{inq.chefReply}</Text>
                  </View>
                ) : null}

                <TextInput
                  style={[
                    styles.chefInput,
                    {
                      backgroundColor: colors.paper,
                      borderColor: colors.line,
                      color: colors.ink,
                    },
                  ]}
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
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.chefSendBtn,
                    { backgroundColor: colors.accent },
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
            );
          })}
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
      style={[styles.flex, { backgroundColor: colors.paper }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 85}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.flex, { backgroundColor: colors.paper }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}
      >
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            AI CONCIERGE & LIVE CHEF
          </Text>
          <Text style={[styles.title, { color: colors.ink }]}>
            {isId ? 'Tanya AI & Kepala Koki' : 'Ask AI & Head Chef'}
          </Text>
          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            {isId
              ? 'Jawaban AI dibuat otomatis dari data menu & ulasan. Pertanyaan khusus dapat diteruskan ke Chef.'
              : 'AI replies are generated automatically from menu & reviews. Special requests can be escalated to our Chef.'}
          </Text>
        </View>

        <View style={styles.chipRow}>
          {quickChips.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.chip,
                { backgroundColor: colors.soft, borderColor: colors.line },
              ]}
              onPress={() => sendMessage(chip)}
              disabled={sending}
            >
              <Text style={[styles.chipText, { color: colors.ink }]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={idx}
              style={[
                styles.bubble,
                isUser
                  ? { alignSelf: 'flex-end', backgroundColor: colors.accent }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.line,
                    },
              ]}
            >
              <Text
                style={[
                  styles.bubbleRole,
                  { color: isUser ? '#ffedd5' : colors.accent },
                ]}
              >
                {isUser ? (isId ? 'Anda' : 'You') : 'AI Concierge'}
              </Text>
              <Text
                style={[
                  styles.bubbleText,
                  { color: isUser ? '#ffffff' : colors.ink },
                ]}
              >
                {msg.text}
              </Text>

              {Array.isArray(msg.dishes) && msg.dishes.length > 0 ? (
                <View style={styles.dishList}>
                  {msg.dishes.map((dish) => (
                    <View
                      key={dish.id}
                      style={[
                        styles.dishCard,
                        { backgroundColor: colors.paper, borderColor: colors.line },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.dishName, { color: colors.ink }]}>{dish.name}</Text>
                        <Text style={[styles.dishPrice, { color: colors.accent }]}>
                          {formatRupiah(dish.price)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.accent }]}
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
                  style={[
                    styles.escalateBtn,
                    {
                      backgroundColor: msg.escalated ? colors.successBg : colors.soft,
                      borderColor: msg.escalated ? colors.success : colors.line,
                    },
                  ]}
                  onPress={() => handleEscalate(msg, idx)}
                  disabled={msg.escalated || escalatingIdx === idx}
                >
                  <Text
                    style={[
                      styles.escalateText,
                      { color: msg.escalated ? colors.success : colors.ink },
                    ]}
                  >
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
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.mutedText, { color: colors.muted }]}>
              {isId ? 'AI sedang mengetik...' : 'AI is thinking...'}
            </Text>
          </View>
        ) : null}

        {token ? (
          <View
            style={[
              styles.inqSection,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={styles.inqHeader}>
              <Text style={[styles.inqTitle, { color: colors.ink }]}>
                {isId ? 'Balasan Langsung dari Koki' : 'Live Chef Replies'}
              </Text>
              <TouchableOpacity style={styles.inqRefresh} onPress={loadInquiries}>
                <Text style={[styles.inqRefreshText, { color: colors.accent }]}>
                  {loadingInq ? '...' : isId ? 'Muat ulang' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {inquiries.length === 0 ? (
              <Text style={[styles.mutedText, { color: colors.muted }]}>
                {isId ? 'Belum ada pertanyaan yang diteruskan.' : 'No escalated questions yet.'}
              </Text>
            ) : (
              inquiries.slice(0, 5).map((inq) => (
                <View
                  key={inq.id}
                  style={[
                    styles.inqCard,
                    { backgroundColor: colors.paper, borderColor: colors.line },
                  ]}
                >
                  <Text style={[styles.inqQ, { color: colors.ink }]}>Q: {inq.question}</Text>
                  <Text style={[styles.inqA, { color: colors.muted }]}>
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

      <View
        style={[
          styles.inputBar,
          { backgroundColor: colors.surface, borderTopColor: colors.line },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.paper,
              borderColor: colors.line,
              color: colors.ink,
            },
          ]}
          value={input}
          onChangeText={setInput}
          onFocus={scrollToBottom}
          placeholder={isId ? 'Tanya tentang menu...' : 'Ask about our menu...'}
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.accent },
            (!input.trim() || sending) && styles.btnDisabled,
          ]}
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
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  disclaimer: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  refreshBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  filterPill: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  emptyBox: { paddingVertical: 32, alignItems: 'center' },
  errorText: { fontSize: 13, marginBottom: 10 },
  chefCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  chefCustomer: { fontSize: 14, fontWeight: '700', flex: 1, paddingRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  inqDate: { fontSize: 11, marginTop: 2, marginBottom: 8 },
  chefQuestion: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  replyBox: { borderRadius: 10, padding: 10, marginBottom: 10 },
  replyLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  replyBody: { fontSize: 13 },
  chefInput: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  chefSendBtn: {
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '92%' },
  bubbleRole: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  dishList: { marginTop: 10, gap: 8 },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  dishName: { fontSize: 14, fontWeight: '700' },
  dishPrice: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  escalateBtn: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  escalateText: { fontSize: 12, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mutedText: { fontSize: 13 },
  inqSection: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  inqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inqTitle: { fontSize: 15, fontWeight: '700' },
  inqRefresh: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center' },
  inqRefreshText: { fontWeight: '700', fontSize: 13 },
  inqCard: {
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  inqQ: { fontSize: 13, fontWeight: '700' },
  inqA: { fontSize: 13, marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
