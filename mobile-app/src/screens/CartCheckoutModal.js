import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
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
}) {
  const [orderType, setOrderType] = useState('Delivery');
  const [address, setAddress] = useState(user?.address || '');
  const [tableNumber, setTableNumber] = useState('');
  const [payment, setPayment] = useState('QRIS');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bill, setBill] = useState(null);

  useEffect(() => {
    if (user?.address && !address) {
      setAddress(user.address);
    }
  }, [user?.address]);

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
    setError('');
    try {
      const createdOrder = await api('/api/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          items: cartItems.map((i) => ({ name: i.name, qty: i.qty })),
          type: orderType,
          location,
          notes: notes.trim(),
          payment,
        }),
      });
      onClearCart();
      setNotes('');
      setBill(createdOrder);
      onOrderCreated(createdOrder);
    } catch (err) {
      setError(err.message || (isId ? 'Gagal membuat pesanan.' : 'Could not place order.'));
    } finally {
      setBusy(false);
    }
  };

  const closeAndReset = () => {
    setBill(null);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeAndReset}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={closeAndReset}>
            <Text style={styles.backBtnText}>← {isId ? 'Tutup' : 'Close'}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>
            {bill ? (isId ? 'Struk Pesanan' : 'Order Bill') : isId ? 'Keranjang & Checkout' : 'Cart & Checkout'}
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
            {bill ? (
              <View style={styles.card}>
                <Text style={styles.eyebrow}>BISTRO ELEVEN</Text>
                <Text style={styles.billTitle}>
                  {isId ? 'Pesanan Berhasil!' : 'Order Confirmed!'}
                </Text>
                <Text style={styles.muted}>Order {bill.id}</Text>
                <View style={styles.divider} />
                <Text style={styles.detailLine}>
                  {bill.type}: {bill.location}
                </Text>
                <Text style={styles.detailLine}>
                  {isId ? 'Pembayaran' : 'Payment'}: {bill.payment}
                </Text>
                <Text style={styles.detailLine}>Status: {bill.status}</Text>
                <View style={styles.divider} />
                {bill.items?.map((item, idx) => (
                  <View key={idx} style={styles.billRow}>
                    <Text style={styles.billItemText}>
                      {item.qty}x {item.name}
                    </Text>
                    <Text style={styles.billItemPrice}>
                      {formatRupiah(item.price * item.qty)}
                    </Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.billRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatRupiah(bill.total)}</Text>
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={closeAndReset}>
                  <Text style={styles.primaryBtnText}>
                    {isId ? 'Kembali ke Menu' : 'Back to Menu'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>
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
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 12,
                            backgroundColor: COLORS.soft,
                            marginRight: 10,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 12,
                            backgroundColor: COLORS.soft,
                            marginRight: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="fast-food-outline" size={22} color={COLORS.muted} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.accent }}>
                          {formatRupiah(item.price)}
                        </Text>
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
                        placeholderTextColor={COLORS.muted}
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
                        placeholderTextColor={COLORS.muted}
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
                    placeholderTextColor={COLORS.muted}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.accent,
    marginBottom: 4,
  },
  billTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 12,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    gap: 10,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  qtyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billItemText: {
    fontSize: 14,
    color: COLORS.ink,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  detailLine: {
    fontSize: 14,
    color: COLORS.ink,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  pillTextActive: {
    color: '#fff',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 10,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  muted: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
