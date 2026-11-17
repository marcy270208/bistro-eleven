import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS, formatRupiah } from '../theme';

export default function AdminPanelScreen({
  token,
  dishes,
  onDishesChanged,
  onGoOrders,
  onGoChef,
  lang,
  colors: propColors,
}) {
  const colors = propColors || COLORS;
  const isId = lang === 'id';

  const [orders, setOrders] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  const [exportRange, setExportRange] = useState('all'); // 'all' | 'last_year' | 'this_month'
  const [exportStatus, setExportStatus] = useState('Completed'); // 'Completed' | 'All'
  const [exporting, setExporting] = useState(false);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const data = await api('/api/orders', { token });
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // keep existing
    } finally {
      setLoadingStats(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const completedSales = orders
    .filter((o) => o.status === 'Completed')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const activeCount = orders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Cancelled'
  ).length;

  const matchedExportOrders = orders.filter((order) => {
    if (exportStatus === 'Completed' && order.status !== 'Completed') return false;
    if (exportRange === 'all') return true;
    const dt = order.createdAt ? new Date(order.createdAt) : null;
    if (!dt || Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    if (exportRange === 'last_year') {
      const cutoff = new Date(now);
      cutoff.setFullYear(now.getFullYear() - 1);
      return dt >= cutoff;
    }
    if (exportRange === 'this_month') {
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }
    return true;
  });

  const exportRevenue = matchedExportOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const handleExportSpreadsheet = async () => {
    if (matchedExportOrders.length === 0) {
      Alert.alert(
        isId ? 'Tidak Ada Data' : 'No Matching Orders',
        isId
          ? 'Tidak ada data pesanan yang cocok dengan filter tersebut.'
          : 'No orders match the selected filter.'
      );
      return;
    }

    setExporting(true);
    try {
      const cleanCell = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
      const headers = [
        'Order ID',
        'Date & Time',
        'Customer Name',
        'Username',
        'Order Type',
        'Location / Table',
        'Items Ordered',
        'Order Notes',
        'Payment Method',
        'Total (IDR)',
        'Status',
      ];

      const rows = matchedExportOrders.map((order) => {
        const dt = order.createdAt ? new Date(order.createdAt) : null;
        const formattedDate =
          dt && !Number.isNaN(dt.getTime())
            ? dt.toLocaleString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : cleanCell(order.createdAt);
        const itemsText = Array.isArray(order.items)
          ? order.items.map((i) => `${i.qty}x ${i.name}`).join('; ')
          : '';
        return [
          cleanCell(order.id),
          cleanCell(formattedDate),
          cleanCell(order.customer),
          cleanCell(order.username),
          cleanCell(order.type),
          cleanCell(order.location),
          cleanCell(itemsText),
          cleanCell(order.notes),
          cleanCell(order.payment),
          Number(order.total || 0),
          cleanCell(order.status),
        ];
      });

      rows.push([
        'TOTAL',
        `${matchedExportOrders.length} ${matchedExportOrders.length === 1 ? 'order' : 'orders'}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        Number(exportRevenue || 0),
        exportStatus,
      ]);

      const sheetData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = headers.map((h, idx) => {
        const maxLen = sheetData.reduce(
          (max, row) => Math.max(max, String(row[idx] ?? '').length),
          h.length
        );
        return { wch: Math.min(Math.max(maxLen + 3, 12), 42) };
      });
      ws['!autofilter'] = { ref: `A1:K${matchedExportOrders.length + 1}` };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `bistro-eleven-sales-${exportRange}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Saved', `File saved at: ${fileUri}`);
      } else {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: isId ? 'Simpan / Bagikan Excel (.xlsx)' : 'Save / Share Excel (.xlsx)',
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
        });
      }
    } catch (err) {
      Alert.alert(
        isId ? 'Gagal Export' : 'Export Failed',
        err.message || (isId ? 'Tidak dapat membuat file Excel.' : 'Could not generate Excel file.')
      );
    } finally {
      setExporting(false);
    }
  };

  const handlePickDishPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setFormMsg({
        type: 'error',
        text: isId ? 'Izin galeri ditolak.' : 'Photo library permission denied.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const dataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

    setUploading(true);
    setFormMsg({ type: '', text: '' });
    try {
      const up = await api('/api/upload', {
        token,
        method: 'POST',
        body: JSON.stringify({ image: dataUri }),
      });
      setImageUrl(up.url);
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal upload foto.' : 'Failed to upload photo.'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDish = async () => {
    const parsedPrice = Number(price);
    if (!name.trim() || !Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setFormMsg({
        type: 'error',
        text: isId
          ? 'Nama menu dan harga (angka bulat > 0) wajib diisi.'
          : 'Dish name and a positive integer price are required.',
      });
      return;
    }

    setSaving(true);
    setFormMsg({ type: '', text: '' });
    try {
      await api('/api/dishes', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          price: parsedPrice,
          description: description.trim(),
          ingredients,
          image: imageUrl || null,
        }),
      });
      setName('');
      setPrice('');
      setDescription('');
      setIngredients('');
      setImageUrl('');
      setFormMsg({
        type: 'success',
        text: isId ? 'Menu baru berhasil ditambahkan!' : 'New dish added to menu!',
      });
      await onDishesChanged();
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal menambah menu.' : 'Failed to create dish.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteDish = (dish) => {
    Alert.alert(
      isId ? 'Hapus Menu?' : 'Delete Dish?',
      isId ? `Hapus "${dish.name}" dari daftar menu?` : `Remove "${dish.name}" from the menu?`,
      [
        { text: isId ? 'Batal' : 'Cancel', style: 'cancel' },
        {
          text: isId ? 'Hapus' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(dish.id);
            try {
              await api(`/api/dishes/${dish.id}`, { token, method: 'DELETE' });
              await onDishesChanged();
            } catch (err) {
              setFormMsg({
                type: 'error',
                text: err.message || (isId ? 'Gagal menghapus menu.' : 'Failed to delete dish.'),
              });
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
            refreshing={loadingStats}
            onRefresh={() => {
              loadStats();
              onDishesChanged();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>ADMINISTRATOR</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {isId ? 'Panel Admin' : 'Admin Panel'}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {isId ? 'Penjualan Selesai' : 'Completed Sales'}
            </Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatRupiah(completedSales)}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {isId ? 'Pesanan Aktif' : 'Active Orders'}
            </Text>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {activeCount} / {orders.length}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={onGoOrders}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.accent} />
            <Text style={[styles.quickBtnText, { color: colors.ink }]}>
              {isId ? 'Kelola Pesanan' : 'Orders Queue'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={onGoChef}
          >
            <Ionicons name="flame-outline" size={18} color={colors.accent} />
            <Text style={[styles.quickBtnText, { color: colors.ink }]}>
              {isId ? 'Meja Koki' : 'Kitchen Desk'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Export Sales Spreadsheet (.xlsx) */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {isId ? 'Export Laporan Penjualan (.xlsx)' : 'Export Sales Spreadsheet (.xlsx)'}
          </Text>

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Periode Waktu' : 'Time Period'}
          </Text>
          <View style={styles.chipRow}>
            {[
              { key: 'all', label: isId ? 'Semua' : 'All Sales' },
              { key: 'last_year', label: isId ? '1 Tahun Terakhir' : 'Last 1 Year' },
              { key: 'this_month', label: isId ? 'Bulan Ini' : 'This Month' },
            ].map((opt) => {
              const active = exportRange === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active ? colors.accent : colors.paper,
                      borderColor: active ? colors.accent : colors.line,
                    },
                  ]}
                  onPress={() => setExportRange(opt.key)}
                >
                  <Text style={[styles.filterPillText, { color: active ? '#fff' : colors.ink }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Filter Status' : 'Status Filter'}
          </Text>
          <View style={styles.chipRow}>
            {[
              { key: 'Completed', label: isId ? 'Selesai Saja' : 'Completed Only' },
              { key: 'All', label: isId ? 'Semua Status' : 'All Statuses' },
            ].map((opt) => {
              const active = exportStatus === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active ? colors.accent : colors.paper,
                      borderColor: active ? colors.accent : colors.line,
                    },
                  ]}
                  onPress={() => setExportStatus(opt.key)}
                >
                  <Text style={[styles.filterPillText, { color: active ? '#fff' : colors.ink }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.exportSummary,
              { backgroundColor: colors.soft, borderColor: colors.line },
            ]}
          >
            <Text style={[styles.exportSummaryText, { color: colors.ink }]}>
              {matchedExportOrders.length} {isId ? 'pesanan' : 'orders'} ·{' '}
              <Text style={{ color: colors.accent, fontWeight: '800' }}>
                {formatRupiah(exportRevenue)}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.accent, flexDirection: 'row', gap: 8 },
              exporting && styles.btnDisabled,
            ]}
            onPress={handleExportSpreadsheet}
            disabled={exporting}
          >
            <Ionicons name="document-text-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>
              {exporting
                ? isId
                  ? 'Membuat File Excel...'
                  : 'Generating Excel...'
                : isId
                ? 'Download / Bagikan Excel (.xlsx)'
                : 'Download / Share Excel (.xlsx)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add New Menu Item */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {isId ? 'Tambah Menu Baru' : 'Add New Menu Item'}
          </Text>

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Nama Hidangan' : 'Dish Name'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.paper, borderColor: colors.line, color: colors.ink },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Truffle Mushroom Pasta"
            placeholderTextColor={colors.muted}
          />

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Harga (IDR)' : 'Price (IDR)'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.paper, borderColor: colors.line, color: colors.ink },
            ]}
            value={price}
            onChangeText={setPrice}
            placeholder="45000"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Deskripsi' : 'Description'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                minHeight: 68,
                backgroundColor: colors.paper,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder={isId ? 'Deskripsi singkat hidangan...' : 'Short description...'}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.ink }]}>
            {isId ? 'Bahan (pisahkan dengan koma)' : 'Ingredients (comma-separated)'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.paper, borderColor: colors.line, color: colors.ink },
            ]}
            value={ingredients}
            onChangeText={setIngredients}
            placeholder="Pasta, Mushroom, Cream"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[
                styles.photoBtn,
                { backgroundColor: colors.soft, borderColor: colors.line },
              ]}
              onPress={handlePickDishPhoto}
              disabled={uploading}
            >
              <Ionicons name="image-outline" size={18} color={colors.ink} />
              <Text style={[styles.photoBtnText, { color: colors.ink }]}>
                {uploading
                  ? isId
                    ? 'Mengunggah...'
                    : 'Uploading...'
                  : imageUrl
                  ? isId
                    ? 'Ganti Foto'
                    : 'Change Photo'
                  : isId
                  ? 'Pilih Foto Menu'
                  : 'Pick Dish Photo'}
              </Text>
            </TouchableOpacity>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImg} />
            ) : null}
          </View>

          {formMsg.text ? (
            <Text
              style={[
                styles.feedback,
                { color: formMsg.type === 'error' ? colors.danger : colors.success },
              ]}
            >
              {formMsg.text}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.accent },
              (saving || uploading) && styles.btnDisabled,
            ]}
            onPress={handleCreateDish}
            disabled={saving || uploading}
          >
            <Text style={styles.primaryBtnText}>
              {saving
                ? isId
                  ? 'Menyimpan...'
                  : 'Saving...'
                : isId
                ? 'Simpan Menu Baru'
                : 'Add Dish to Menu'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Menu List */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {isId ? `Daftar Menu (${dishes.length})` : `Menu Items (${dishes.length})`}
          </Text>

          {dishes.map((dish) => (
            <View
              key={dish.id}
              style={[styles.dishRow, { borderColor: colors.line, backgroundColor: colors.paper }]}
            >
              {dish.image ? (
                <Image source={{ uri: dish.image }} style={styles.dishThumb} />
              ) : (
                <View style={[styles.dishThumb, { backgroundColor: colors.soft }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.dishTitle, { color: colors.ink }]} numberOfLines={1}>
                  {dish.name}
                </Text>
                <Text style={[styles.dishPrice, { color: colors.accent }]}>
                  {formatRupiah(dish.price)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  { backgroundColor: colors.dangerBg, borderColor: colors.danger },
                ]}
                onPress={() => confirmDeleteDish(dish)}
                disabled={deletingId === dish.id}
              >
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                  {deletingId === dish.id ? '...' : isId ? 'Hapus' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 88 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 2, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  exportSummary: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  exportSummaryText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  photoBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoBtnText: { fontSize: 13, fontWeight: '600' },
  previewImg: { width: 46, height: 46, borderRadius: 10 },
  feedback: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dishThumb: { width: 46, height: 46, borderRadius: 10 },
  dishTitle: { fontSize: 14, fontWeight: '700' },
  dishPrice: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  deleteBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700' },
});
