import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatRupiah } from '../theme';

export default function DishDetailModal({
  dish,
  onClose,
  onAddToCart,
  isId,
  colors: propColors,
}) {
  const colors = propColors || COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [dish?.id]);

  if (!dish) return null;

  const handleAdd = () => {
    for (let i = 0; i < qty; i += 1) {
      onAddToCart(dish.id);
    }
    onClose();
  };

  return (
    <Modal visible={Boolean(dish)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView style={styles.flex} bounces={false}>
          <View style={styles.heroWrap}>
            {dish.image ? (
              <Image source={{ uri: dish.image }} style={styles.heroImg} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="restaurant-outline" size={56} color={colors.muted} />
              </View>
            )}
            <TouchableOpacity
              style={styles.floatingBack}
              onPress={onClose}
              accessibilityLabel="Back to menu"
            >
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>{isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{dish.name}</Text>
              <Text style={styles.price}>{formatRupiah(dish.price)}</Text>
            </View>

            <Text style={styles.description}>
              {dish.description ||
                (isId
                  ? 'Disiapkan segar di dapur Bistro Eleven.'
                  : 'Freshly made in the Bistro Eleven kitchen.')}
            </Text>

            <View style={styles.ingredientsBox}>
              <Text style={styles.sectionTitle}>
                {isId ? 'Komposisi Bahan' : 'Ingredients'}
              </Text>
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
                  {isId
                    ? 'Daftar bahan belum ditambahkan.'
                    : 'Ingredients have not been added yet.'}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={18} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{qty}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setQty((q) => q + 1)}
            >
              <Ionicons name="add" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.ctaBtn} onPress={handleAdd}>
            <Text style={styles.ctaText}>
              {isId ? 'Tambah' : 'Add to Cart'} · {formatRupiah((Number(dish.price) || 0) * qty)}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.paper },
    flex: { flex: 1 },
    heroWrap: {
      height: 280,
      backgroundColor: colors.soft,
      position: 'relative',
    },
    heroImg: { width: '100%', height: '100%' },
    heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    floatingBack: {
      position: 'absolute',
      top: 14,
      left: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 4,
    },
    sheet: {
      marginTop: -24,
      backgroundColor: colors.paper,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 28,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
      color: colors.accent,
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, flex: 1 },
    price: { fontSize: 20, fontWeight: '800', color: colors.accent },
    description: { fontSize: 14, color: colors.muted, lineHeight: 22, marginBottom: 20 },
    ingredientsBox: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      backgroundColor: colors.soft,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.ink },
    muted: { fontSize: 13, color: colors.muted },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.soft,
      borderRadius: 999,
      paddingHorizontal: 6,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.line,
    },
    stepBtn: {
      width: 38,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepValue: {
      minWidth: 26,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '800',
      color: colors.ink,
    },
    ctaBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
