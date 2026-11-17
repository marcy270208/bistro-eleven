import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { COLORS } from '../theme';

export default function ReviewsScreen({ token, user, lang, onGoLogin, colors: propColors }) {
  const colors = propColors || COLORS;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  const isId = lang === 'id';
  const isAdmin = user?.role === 'administrator';

  const loadReviews = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await api('/api/reviews');
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || (isId ? 'Gagal memuat ulasan' : 'Failed to load reviews'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isId]
  );

  useEffect(() => {
    loadReviews(false);
  }, [loadReviews]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleSubmit = async () => {
    if (!token) {
      onGoLogin();
      return;
    }
    const clean = text.trim();
    if (!clean) {
      setFormMsg({
        type: 'error',
        text: isId ? 'Tulis ulasan terlebih dahulu.' : 'Please write your review first.',
      });
      return;
    }
    setSubmitting(true);
    setFormMsg({ type: '', text: '' });
    try {
      await api('/api/reviews', {
        token,
        method: 'POST',
        body: JSON.stringify({ rating, text: clean }),
      });
      setText('');
      setRating(5);
      setFormMsg({
        type: 'success',
        text: isId ? 'Terima kasih! Ulasan berhasil dikirim.' : 'Thank you! Review posted.',
      });
      await loadReviews(true);
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal mengirim ulasan' : 'Failed to post review'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteReview = (rev) => {
    Alert.alert(
      isId ? 'Hapus Ulasan?' : 'Delete Review?',
      isId
        ? `Hapus ulasan dari ${rev.name || 'Guest'}?`
        : `Delete this review by ${rev.name || 'Guest'}?`,
      [
        { text: isId ? 'Batal' : 'Cancel', style: 'cancel' },
        {
          text: isId ? 'Hapus' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(rev.id);
            try {
              await api(`/api/reviews/${rev.id}`, { token, method: 'DELETE' });
              setReviews((prev) => prev.filter((r) => r.id !== rev.id));
            } catch (err) {
              setError(err.message || (isId ? 'Gagal menghapus ulasan' : 'Failed to delete review'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.paper }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.paper }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReviews(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <Text style={styles.eyebrow}>{isId ? 'BUKU TAMU' : 'GUESTBOOK'}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {isId ? 'Ulasan Pelanggan' : 'Customer Reviews'}
        </Text>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.avgNumber, { color: colors.ink }]}>{avgRating}</Text>
          <View>
            <Text style={styles.stars}>{'★'.repeat(Math.round(Number(avgRating)))}</Text>
            <Text style={styles.mutedText}>
              {reviews.length} {isId ? 'ulasan' : 'reviews'}
            </Text>
          </View>
        </View>

        {!isAdmin ? (
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.ink }]}>
              {isId ? 'Bagikan pengalaman Anda' : 'Share your experience'}
            </Text>

            {!token ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.mutedText}>
                  {isId
                    ? 'Masuk sebagai pelanggan untuk menulis ulasan.'
                    : 'Sign in as a customer to post a review.'}
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={onGoLogin}>
                  <Text style={styles.primaryBtnText}>{isId ? 'Masuk' : 'Sign In'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{isId ? 'Peringkat' : 'Rating'}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[styles.starBtn, rating === num && styles.starBtnActive]}
                      onPress={() => setRating(num)}
                    >
                      <Text
                        style={[styles.starBtnText, rating === num && styles.starBtnTextActive]}
                      >
                        {num} ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{isId ? 'Ulasan Anda' : 'Your review'}</Text>
                <TextInput
                  style={styles.textarea}
                  value={text}
                  onChangeText={setText}
                  placeholder={
                    isId ? 'Ceritakan tentang kunjungan Anda...' : 'Tell us about your visit...'
                  }
                  placeholderTextColor={COLORS.muted}
                  multiline
                  textAlignVertical="top"
                />

                {formMsg.text ? (
                  <Text
                    style={[
                      styles.feedbackText,
                      formMsg.type === 'error' ? styles.errorText : styles.successText,
                    ]}
                  >
                    {formMsg.text}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>
                    {submitting
                      ? isId
                        ? 'Mengirim...'
                        : 'Posting...'
                      : isId
                      ? 'Posting ulasan'
                      : 'Post review'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.adminBanner}>
            <Text style={styles.adminBannerText}>
              {isId
                ? 'Mode Admin: ketuk tombol Hapus pada ulasan yang ingin dimoderasi.'
                : 'Admin Mode: tap Delete on any review to moderate.'}
            </Text>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadReviews(false)}>
              <Text style={styles.retryBtnText}>{isId ? 'Coba Lagi' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && reviews.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.mutedText}>
              {isId ? 'Belum ada ulasan.' : 'No reviews yet.'}
            </Text>
          </View>
        ) : null}

        {reviews.map((rev) => (
          <View
            key={rev.id}
            style={[
              styles.reviewCard,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={styles.reviewTop}>
              <Text style={[styles.reviewerName, { color: colors.ink }]}>
                {rev.name || 'Guest'}
              </Text>
              <Text style={styles.stars}>{'★'.repeat(Number(rev.rating) || 5)}</Text>
            </View>
            <Text style={[styles.reviewDate, { color: colors.muted }]}>
              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
            </Text>
            <Text style={[styles.reviewBody, { color: colors.ink }]}>{rev.text}</Text>
            {isAdmin ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDeleteReview(rev)}
                disabled={deletingId === rev.id}
              >
                <Text style={styles.deleteBtnText}>
                  {deletingId === rev.id
                    ? isId
                      ? 'Menghapus...'
                      : 'Deleting...'
                    : isId
                    ? 'Hapus Ulasan'
                    : 'Delete Review'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { padding: 16, paddingBottom: 88 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.accent,
    marginBottom: 2,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 14 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 16,
  },
  avgNumber: { fontSize: 36, fontWeight: '800', color: COLORS.ink },
  stars: { fontSize: 16, color: '#d97706' },
  mutedText: { fontSize: 13, color: COLORS.muted },
  adminBanner: {
    backgroundColor: COLORS.soft,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 14,
  },
  adminBannerText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  formCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 18,
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  starBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  starBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  starBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  starBtnTextActive: { color: '#fff' },
  textarea: {
    minHeight: 88,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.ink,
    marginBottom: 12,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  feedbackText: { fontSize: 13, marginBottom: 10, fontWeight: '600' },
  errorText: { color: COLORS.danger },
  successText: { color: COLORS.success },
  stateBox: { paddingVertical: 28, alignItems: 'center' },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  reviewDate: { fontSize: 12, color: COLORS.muted, marginTop: 2, marginBottom: 6 },
  reviewBody: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  deleteBtn: {
    marginTop: 10,
    minHeight: 40,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
});
