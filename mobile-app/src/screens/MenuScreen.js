import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
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
}) {
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = dishes.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesFav = !favoritesOnly || favorites.includes(d.id);
    return matchesSearch && matchesFav;
  });

  if (loading && dishes.length === 0) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.mutedText}>
          {isId ? 'Memuat menu dari server...' : 'Loading menu from server...'}
        </Text>
      </View>
    );
  }

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
          <Text style={styles.eyebrow}>{isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}</Text>
          <Text style={styles.title}>{isId ? 'Menu Andalan' : 'House Favorites'}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={isId ? 'Cari menu...' : 'Search the menu...'}
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity
              style={[styles.favFilterBtn, favoritesOnly && styles.favFilterBtnActive]}
              onPress={() => setFavoritesOnly((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={[styles.favFilterText, favoritesOnly && { color: '#fff' }]}>
                {favoritesOnly ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
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
          <Text style={styles.mutedText}>
            {favoritesOnly
              ? isId
                ? 'Belum ada menu favorit.'
                : 'No favorite dishes yet.'
              : isId
                ? 'Menu tidak ditemukan.'
                : 'No dishes found.'}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isFav = favorites.includes(item.id);
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => onSelectDish(item)}
          >
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image }} style={styles.dishImage} resizeMode="contain" />
              <TouchableOpacity
                style={[styles.heartBtn, isFav && styles.heartBtnActive]}
                onPress={() => onToggleFavorite(item.id)}
              >
                <Text style={{ color: isFav ? '#fff' : COLORS.accent, fontSize: 16 }}>
                  {isFav ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.dishName}>{item.name}</Text>
              <Text style={styles.dishDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.dishPrice}>{formatRupiah(item.price)}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => onSelectDish(item)}
                  >
                    <Text style={styles.detailsBtnText}>{isId ? 'Detail' : 'Details'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => onAddToCart(item.id)}
                  >
                    <Text style={styles.addBtnText}>{isId ? '+ Pesan' : '+ Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  headerBlock: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.ink,
  },
  favFilterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  favFilterText: {
    fontSize: 18,
    color: COLORS.accent,
  },
  errorBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
  },
  retryBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  centerBox: {
    flex: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageWrap: {
    backgroundColor: '#fff',
    height: 180,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    position: 'relative',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  cardBody: {
    padding: 16,
  },
  dishName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  dishDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
