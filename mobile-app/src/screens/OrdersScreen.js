import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../lib/api';
import { COLORS, formatRupiah } from '../theme';

function getStatusColors(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return { bg: COLORS.successBg, fg: COLORS.success };
  if (s === 'ready') return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (s === 'preparing') return { bg: COLORS.warningBg, fg: COLORS.warning };
  return { bg: COLORS.soft, fg: COLORS.ink };
}

export default function OrdersScreen({ token, lang, onGoLogin }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isId = lang === 'id';

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setOrders([]);
        setError('');
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await api('/api/orders', { token });
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || (isId ? 'Gagal memuat pesanan' : 'Failed to load orders'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, isId]
  );

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  if (!token) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.title}>{isId ? 'Pesanan Saya' : 'My Orders'}</Text>
        <Text style={styles.mutedText}>
          {isId
            ? 'Silakan masuk untuk melihat riwayat dan status pesanan Anda.'
            : 'Please sign in to view your order history and live status.'}
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onGoLogin} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>{isId ? 'Masuk Sekarang' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadOrders(true)}
          tintColor={COLORS.accent}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>{isId ? 'RIWAYAT PESANAN' : 'ORDER HISTORY'}</Text>
          <Text style={styles.title}>{isId ? 'Pesanan Saya' : 'My Orders'}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadOrders(true)}
          disabled={loading || refreshing}
        >
          <Text style={styles.refreshBtnText}>{isId ? 'Muat ulang' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.mutedText}>{isId ? 'Memuat pesanan...' : 'Loading orders...'}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadOrders(false)}>
            <Text style={styles.retryBtnText}>{isId ? 'Coba Lagi' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.emptyTitle}>
            {isId ? 'Belum ada pesanan' : 'No orders yet'}
          </Text>
          <Text style={styles.mutedText}>
            {isId
              ? 'Pesanan yang Anda buat dari menu akan muncul di sini.'
              : 'Orders you place from the menu will appear here.'}
          </Text>
        </View>
      ) : null}

      {orders.map((order) => {
        const badge = getStatusColors(order.status);
        const items = Array.isArray(order.items) ? order.items : [];
        return (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.orderCode}>{order.id}</Text>
                <Text style={styles.orderMeta}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.fg }]}>
                  {order.status || 'New'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {items.map((item, idx) => (
              <View key={`${order.id}-${item.id || idx}`} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.qty}x {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatRupiah((Number(item.price) || 0) * (Number(item.qty) || 1))}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.metaGrid}>
              <Text style={styles.metaLine}>
                {isId ? 'Tipe' : 'Type'}: {order.type || '-'}
                {order.location ? ` (${order.location})` : ''}
              </Text>
              <Text style={styles.metaLine}>
                {isId ? 'Pembayaran' : 'Payment'}: {order.payment || '-'}
              </Text>
              {order.notes ? (
                <Text style={styles.metaLine}>
                  {isId ? 'Catatan' : 'Notes'}: {order.notes}
                </Text>
              ) : null}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{isId ? 'Total' : 'Total'}</Text>
              <Text style={styles.totalValue}>{formatRupiah(order.total)}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  content: { padding: 16, paddingBottom: 32 },
  centerBox: {
    flex: 1,
    backgroundColor: COLORS.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.accent,
    marginBottom: 2,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.ink },
  refreshBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  refreshBtnText: { color: COLORS.ink, fontWeight: '600', fontSize: 13 },
  stateBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  mutedText: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 6 },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  primaryBtn: {
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderCode: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  orderMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 14, color: COLORS.ink, flex: 1, paddingRight: 8 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  metaGrid: { gap: 3 },
  metaLine: { fontSize: 13, color: COLORS.muted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
});
