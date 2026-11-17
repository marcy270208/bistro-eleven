import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatRupiah } from '../theme';

export default function MenuScreen({
  dishes,
  loading,
  error,
  onRetry,
  onSelectDish,
  onAddToCart,
  favorites,
  onToggleFavorite,
  isId,
  colors: propColors,
}) {
  const colors = propColors || COLORS;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'favorites' | 'budget'

  const filtered = dishes.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === 'favorites'
        ? favorites.includes(d.id)
        : activeFilter === 'budget'
        ? Number(d.price) <= 30000
        : true;
    return matchesSearch && matchesFilter;
  });

  const featuredDish = dishes[0] || null;

  if (loading && dishes.length === 0) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.stateText}>{isId ? 'Memuat menu...' : 'Loading menu...'}</Text>
      </View>
    );
  }

  const filterChips = [
    { key: 'all', label: isId ? 'Semua Menu' : 'All Dishes' },
    { key: 'favorites', label: isId ? 'Favorit' : 'Favorites' },
    { key: 'budget', label: isId ? 'Di Bawah 30rb' : 'Under Rp 30k' },
  ];

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRetry} tintColor={COLORS.accent} />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}
          </Text>
          <Text style={[styles.title, { color: colors.ink }]}>
            {isId ? 'Menu Pilihan' : 'House Favorites'}
          </Text>

          {/* Search Row */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.ink }]}
                value={search}
                onChangeText={setSearch}
                placeholder={isId ? 'Cari menu favoritmu...' : 'Search dishes, flavors...'}
                placeholderTextColor={colors.muted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={18} color={COLORS.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.favFilterBtn,
                activeFilter === 'favorites' && styles.favFilterBtnActive,
              ]}
              onPress={() =>
                setActiveFilter((prev) => (prev === 'favorites' ? 'all' : 'favorites'))
              }
              accessibilityLabel="Toggle favorites filter"
            >
              <Ionicons
                name={activeFilter === 'favorites' ? 'heart' : 'heart-outline'}
                size={20}
                color={activeFilter === 'favorites' ? '#ffffff' : COLORS.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Featured Dark Espresso Promo Banner (Foodie Express style) */}
          {featuredDish && !search ? (
            <TouchableOpacity
              style={styles.promoCard}
              activeOpacity={0.9}
              onPress={() => onSelectDish(featuredDish)}
            >
              <View style={styles.promoLeft}>
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>
                    {isId ? 'SPESIAL HARI INI' : "CHEF'S SPECIAL"}
                  </Text>
                </View>
                <Text style={styles.promoTitle} numberOfLines={2}>
                  {featuredDish.name}
                </Text>
                <Text style={styles.promoSub}>
                  {isId ? 'Dimasak segar setiap hari' : 'Freshly made every day'} ·{' '}
                  {formatRupiah(featuredDish.price)}
                </Text>
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText}>
                    {isId ? 'Pesan Sekarang' : 'Order Now'}
                  </Text>
                </View>
              </View>
              {featuredDish.image ? (
                <Image
                  source={{ uri: featuredDish.image }}
                  style={styles.promoImage}
                  resizeMode="cover"
                />
              ) : null}
            </TouchableOpacity>
          ) : null}

          {/* Filter Pills */}
          <View style={styles.chipRow}>
            {filterChips.map((chip) => {
              const active = activeFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(chip.key)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryText}>{isId ? 'Coba lagi' : 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.centerBox}>
          <Ionicons name="restaurant-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>
            {activeFilter === 'favorites'
              ? isId
                ? 'Belum ada menu favorit.'
                : 'No favorite dishes yet.'
              : isId
              ? 'Menu tidak ditemukan.'
              : 'No dishes found.'}
          </Text>
          {activeFilter !== 'all' ? (
            <TouchableOpacity style={styles.resetBtn} onPress={() => setActiveFilter('all')}>
              <Text style={styles.resetBtnText}>
                {isId ? 'Lihat semua menu' : 'Browse full menu'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const isFav = favorites.includes(item.id);
        return (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            activeOpacity={0.88}
            onPress={() => onSelectDish(item)}
          >
            <View style={[styles.thumbWrap, { backgroundColor: colors.soft }]}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
              ) : (
                <Ionicons name="fast-food-outline" size={30} color={colors.muted} />
              )}
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.dishName, { color: colors.ink }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => onToggleFavorite(item.id)}
                  accessibilityLabel="Toggle favorite"
                >
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={18}
                    color={isFav ? colors.accent : colors.muted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.dishDesc, { color: colors.muted }]} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.dishPrice, { color: colors.accent }]}>
                  {formatRupiah(item.price)}
                </Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.accent }]}
                  onPress={() => onAddToCart(item.id)}
                >
                  <Text style={styles.addBtnText}>{isId ? '+ Tambah' : '+ Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 88 },
  headerBlock: { marginBottom: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.accent,
    marginBottom: 2,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  searchWrap: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, paddingVertical: 8 },
  clearSearchBtn: { padding: 4 },
  favFilterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b1810',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  promoLeft: { flex: 1 },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(207, 115, 62, 0.24)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  promoBadgeText: { fontSize: 10, fontWeight: '800', color: '#f5a373', letterSpacing: 0.8 },
  promoTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', lineHeight: 22 },
  promoSub: { fontSize: 12, color: '#d7c5b6', marginTop: 4, marginBottom: 10 },
  promoCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  promoCtaText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  promoImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#3f2518',
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },
  errorBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13 },
  retryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  stateText: { fontSize: 14, color: COLORS.muted },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.muted, textAlign: 'center' },
  resetBtn: {
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
  },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 12,
    alignItems: 'center',
  },
  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: COLORS.soft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dishName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, flex: 1 },
  heartBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 17, marginTop: 2, marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dishPrice: { fontSize: 15, fontWeight: '800', color: COLORS.accent },
  addBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
