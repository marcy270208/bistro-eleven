import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS, formatRupiah } from '../theme';

export default function CartCheckoutModal({
  visible,
  onClose,
  cart,
  dishes,
  onUpdateQty,
  onClearCart,
  user,
  token,
  onRequireLogin,
  onOrderCreated,
  isId,
  colors: propColors,
}) {
  const colors = propColors || COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [orderType, setOrderType] = useState('Delivery');
  const [address, setAddress] = useState(user?.address || '');
  const [tableNumber, setTableNumber] = useState('');
  const [payment, setPayment] = useState('QRIS');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [bill, setBill] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.address && !address) {
      setAddress(user.address);
    }
  }, [user?.address]);

  useEffect(() => {
    if (!preparing) return undefined;
    progressAnim.setValue(0);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 420, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      ])
    );
    const bar = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    });
    pulse.start();
    bar.start();
    return () => {
      pulse.stop();
      bar.stop();
    };
  }, [preparing, pulseAnim, progressAnim]);

  const cartItems = cart
    .map((item) => {
      const dish = dishes.find((d) => d.id === item.id);
      return dish ? { ...item, ...dish } : null;
    })
    .filter(Boolean);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (!user || !token) {
      onClose();
      onRequireLogin();
      return;
    }
    if (cartItems.length === 0) return;

    const location =
      orderType === 'Delivery' ? address.trim() : `Table ${tableNumber.trim()}`;
    if (
      (orderType === 'Delivery' && !address.trim()) ||
      (orderType === 'Dine-in' && !tableNumber.trim())
    ) {
      setError(
        orderType === 'Delivery'
          ? isId
            ? 'Alamat pengiriman wajib diisi.'
            : 'Delivery address is required.'
          : isId
          ? 'Nomor meja wajib diisi.'
          : 'Table number is required.'
      );
      return;
    }

    setBusy(true);
    setPreparing(true);
    setError('');
    try {
      const [createdOrder] = await Promise.all([
        api('/api/orders', {
          method: 'POST',
          token,
          body: JSON.stringify({
            items: cartItems.map((i) => ({ name: i.name, qty: i.qty })),
            type: orderType,
            location,
            notes: notes.trim(),
            payment,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1450)),
      ]);
      onClearCart();
      setNotes('');
      setBill(createdOrder);
    } catch (err) {
      setError(err.message || (isId ? 'Gagal membuat pesanan.' : 'Could not place order.'));
    } finally {
      setPreparing(false);
      setBusy(false);
    }
  };

  const closeAndReset = () => {
    setBill(null);
    setError('');
    setPreparing(false);
    onClose();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeAndReset}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={closeAndReset} disabled={preparing}>
            <Text style={styles.backBtnText}>← {isId ? 'Tutup' : 'Close'}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>
            {preparing
              ? isId
                ? 'Memproses Pesanan'
                : 'Preparing Order'
              : bill
              ? isId
                ? 'Struk Pesanan'
                : 'Order Bill'
              : isId
              ? 'Keranjang & Checkout'
              : 'Cart & Checkout'}
          </Text>
          <View style={{ width: 64 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {preparing ? (
              <View style={styles.kitchenCard}>
                <Animated.View
                  style={[styles.kitchenIconWrap, { transform: [{ scale: pulseAnim }] }]}
                >
                  <Ionicons name="flame" size={44} color="#ffffff" />
                </Animated.View>
                <Text style={styles.eyebrow}>BISTRO ELEVEN KITCHEN</Text>
                <Text style={styles.kitchenTitle}>
                  {isId ? 'Pesanan dikirim ke dapur...' : 'Firing up the kitchen...'}
                </Text>
                <Text style={styles.kitchenSub}>
                  {isId
                    ? 'Chef kami sedang menerima dan mencatat pesanan Anda.'
                    : 'Our chefs are receiving and queuing your dishes.'}
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
              </View>
            ) : bill ? (
              <View style={styles.card}>
                <Text style={styles.eyebrow}>BISTRO ELEVEN</Text>
                <Text style={styles.billTitle}>
                  {isId ? 'Pesanan Berhasil!' : 'Order Confirmed!'}
                </Text>
                <Text style={styles.muted}>Order {bill.id}</Text>
                <View style={styles.divider} />
                {(bill.items || []).map((item, idx) => (
                  <View key={`${item.name}-${idx}`} style={styles.billRow}>
                    <Text style={styles.billText}>
                      {item.qty}x {item.name}
                    </Text>
                    <Text style={styles.billText}>
                      {formatRupiah((item.price || 0) * item.qty)}
                    </Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.billRow}>
                  <Text style={styles.muted}>{isId ? 'Tipe' : 'Type'}</Text>
                  <Text style={styles.billText}>
                    {bill.type} · {bill.location}
                  </Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.muted}>{isId ? 'Pembayaran' : 'Payment'}</Text>
                  <Text style={styles.billText}>{bill.payment}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatRupiah(bill.total)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    const created = bill;
                    setBill(null);
                    onOrderCreated(created);
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isId ? 'Lihat Pesanan Saya' : 'View My Orders'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cart-outline" size={44} color={colors.muted} />
                <Text style={[styles.muted, { textAlign: 'center', marginTop: 10 }]}>
                  {isId
                    ? 'Keranjangmu masih kosong. Pilih menu untuk mulai memesan.'
                    : 'Your cart is empty. Add a dish from the menu to get started.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    {isId ? 'Daftar Menu' : 'Order Items'}
                  </Text>
                  {cartItems.map((item) => (
                    <View key={item.id} style={styles.cartRow}>
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.cartThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.cartThumbPlaceholder}>
                          <Ionicons name="fast-food-outline" size={22} color={colors.muted} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>{formatRupiah(item.price)}</Text>
                      </View>
                      <View style={styles.qtyGroup}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQty(item.id, item.qty - 1)}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQty(item.id, item.qty + 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <View style={styles.billRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    {isId ? 'Detail Pengiriman / Meja' : 'Order Details'}
                  </Text>
                  <View style={styles.pillRow}>
                    {['Delivery', 'Dine-in'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.pill, orderType === type && styles.pillActive]}
                        onPress={() => setOrderType(type)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            orderType === type && styles.pillTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {orderType === 'Delivery' ? (
                    <>
                      <Text style={styles.label}>
                        {isId ? 'Alamat Pengiriman' : 'Delivery Address'}
                      </Text>
                      <TextInput
                        style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                        multiline
                        placeholder={isId ? 'Masukkan alamat lengkap' : 'Full delivery address'}
                        placeholderTextColor={colors.muted}
                        value={address}
                        onChangeText={setAddress}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>
                        {isId ? 'Nomor Meja' : 'Table Number'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder={isId ? 'Contoh: 12' : 'e.g. 12'}
                        placeholderTextColor={colors.muted}
                        value={tableNumber}
                        onChangeText={setTableNumber}
                      />
                    </>
                  )}

                  <Text style={styles.label}>
                    {isId ? 'Metode Pembayaran' : 'Payment Method'}
                  </Text>
                  <View style={styles.pillRow}>
                    {['Cash', 'QRIS', 'Bank transfer'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.pill, payment === method && styles.pillActive]}
                        onPress={() => setPayment(method)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            payment === method && styles.pillTextActive,
                          ]}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>
                    {isId ? 'Catatan (opsional)' : 'Order Notes (optional)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isId ? 'Contoh: tanpa cabai' : 'e.g. no chili'}
                    placeholderTextColor={colors.muted}
                    value={notes}
                    onChangeText={setNotes}
                  />

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={handleCheckout}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {user
                          ? isId
                            ? `Buat Pesanan · ${formatRupiah(total)}`
                            : `Place Order · ${formatRupiah(total)}`
                          : isId
                          ? 'Masuk untuk Memesan'
                          : 'Sign In to Place Order'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.paper },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    backBtn: { minHeight: 44, justifyContent: 'center' },
    backBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent },
    topTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    scrollContent: { padding: 16, paddingBottom: 32 },
    kitchenCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 28,
      alignItems: 'center',
      marginTop: 40,
    },
    kitchenIconWrap: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    kitchenTitle: {
      fontSize: 21,
      fontWeight: '800',
      color: colors.ink,
      textAlign: 'center',
      marginTop: 4,
    },
    kitchenSub: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 19,
    },
    progressTrack: {
      width: '100%',
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.soft,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 16,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colors.accent,
      marginBottom: 4,
    },
    billTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 12,
    },
    cartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      gap: 10,
    },
    cartThumb: {
      width: 54,
      height: 54,
      borderRadius: 12,
      backgroundColor: colors.soft,
    },
    cartThumbPlaceholder: {
      width: 54,
      height: 54,
      borderRadius: 12,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartItemName: { fontSize: 15, fontWeight: '600', color: colors.ink },
    cartItemPrice: { fontSize: 13, fontWeight: '700', color: colors.accent, marginTop: 2 },
    qtyGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.ink },
    qtyValue: { fontSize: 15, fontWeight: '700', color: colors.ink, minWidth: 20, textAlign: 'center' },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
    billRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    billText: { fontSize: 14, color: colors.ink, fontWeight: '500' },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: colors.accent },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    pill: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.line,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.ink },
    pillTextActive: { color: '#ffffff', fontWeight: '700' },
    label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
    input: {
      minHeight: 46,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.ink,
      marginBottom: 12,
    },
    muted: { fontSize: 13, color: colors.muted },
    errorText: { fontSize: 13, color: colors.danger, fontWeight: '600', marginBottom: 10 },
    primaryBtn: {
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      paddingHorizontal: 16,
    },
    primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    emptyBox: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  });
