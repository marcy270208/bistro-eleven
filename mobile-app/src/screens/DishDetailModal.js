import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, formatRupiah } from '../theme';

export default function DishDetailModal({ dish, onClose, onAddToCart, isId }) {
  if (!dish) return null;

  return (
    <Modal visible={Boolean(dish)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backBtnText}>← {isId ? 'Kembali' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{isId ? 'Detail Menu' : 'Dish Details'}</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.imageCard}>
            <Image source={{ uri: dish.image }} style={styles.image} resizeMode="contain" />
          </View>

          <Text style={styles.eyebrow}>{isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}</Text>
          <Text style={styles.title}>{dish.name}</Text>
          <Text style={styles.price}>{formatRupiah(dish.price)}</Text>
          <Text style={styles.description}>
            {dish.description ||
              (isId
                ? 'Dibuat segar setiap hari di dapur Bistro Eleven.'
                : 'Freshly made in the Bistro Eleven kitchen.')}
          </Text>

          <View style={styles.ingredientsBox}>
            <Text style={styles.sectionTitle}>{isId ? 'Komposisi Bahan' : 'Ingredients'}</Text>
            {Array.isArray(dish.ingredients) && dish.ingredients.length > 0 ? (
              <View style={styles.chipsWrap}>
                {dish.ingredients.map((ing, idx) => (
                  <View key={`${ing}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{ing}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>
                {isId ? 'Daftar bahan belum ditambahkan.' : 'Ingredients have not been added yet.'}
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => {
              onAddToCart(dish.id);
              onClose();
            }}
          >
            <Text style={styles.ctaText}>
              {isId ? 'Tambah ke Keranjang +' : 'Add to Cart +'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingRight: 12,
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
  content: {
    padding: 18,
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    height: 230,
    padding: 18,
    marginBottom: 18,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
    marginBottom: 20,
  },
  ingredientsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.ink,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 13,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  ctaBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
