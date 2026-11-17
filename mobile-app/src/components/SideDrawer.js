import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.8, 320);

export default function SideDrawer({
  visible,
  onClose,
  activeTab,
  onSelectTab,
  onOpenCart,
  onToggleLang,
  onToggleTheme,
  onLogout,
  user,
  token,
  lang,
  isDark,
  cartCount,
}) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isId = lang === 'id';
  const isAdmin = user?.role === 'administrator';
  const colors = getColors(isDark);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = (after) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (typeof after === 'function') after();
    });
  };

  const navItems = [
    {
      key: 'menu',
      icon: 'restaurant-outline',
      label: isAdmin && activeTab === 'admin' ? (isId ? 'Restoran' : 'Restaurant') : 'Menu',
      onPress: () => handleClose(() => onSelectTab('menu')),
    },
    ...(isAdmin
      ? [
          {
            key: 'admin',
            icon: 'shield-checkmark-outline',
            label: isId ? 'Panel Admin' : 'Admin Panel',
            onPress: () => handleClose(() => onSelectTab('admin')),
          },
        ]
      : []),
    {
      key: 'orders',
      icon: 'receipt-outline',
      label: isAdmin
        ? isId
          ? 'Pesanan Pelanggan'
          : 'Customer Orders'
        : isId
        ? 'Pesanan Saya'
        : 'My Orders',
      onPress: () => handleClose(() => onSelectTab('orders')),
    },
    {
      key: 'reviews',
      icon: 'star-outline',
      label: isId ? 'Ulasan Pelanggan' : 'Reviews',
      onPress: () => handleClose(() => onSelectTab('reviews')),
    },
    {
      key: 'ai',
      icon: isAdmin ? 'flame-outline' : 'sparkles-outline',
      label: isAdmin
        ? isId
          ? 'Meja Koki'
          : 'Kitchen Desk'
        : isId
        ? 'Tanya AI & Koki'
        : 'AI & Head Chef',
      onPress: () => handleClose(() => onSelectTab('ai')),
    },
    {
      key: 'cart',
      icon: 'cart-outline',
      label: isId ? `Keranjang (${cartCount})` : `Cart (${cartCount})`,
      onPress: () => handleClose(onOpenCart),
    },
    {
      key: 'account',
      icon: 'person-circle-outline',
      label: token
        ? isId
          ? 'Pengaturan Akun'
          : 'Account Settings'
        : isId
        ? 'Masuk / Daftar'
        : 'Sign In / Register',
      onPress: () => handleClose(() => onSelectTab('account')),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => handleClose()}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => handleClose()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.paper,
              borderRightColor: colors.line,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeDrawer} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.logoBadge,
                    { borderColor: colors.accent, backgroundColor: colors.paper },
                  ]}
                >
                  <Text style={[styles.logoLetter, { color: colors.accent }]}>B</Text>
                </View>
                <Text style={[styles.brandText, { color: colors.ink }]}>BISTRO ELEVEN</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => handleClose()}
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Profile Summary */}
            <TouchableOpacity
              style={styles.profileBox}
              onPress={() => handleClose(() => onSelectTab('account'))}
              activeOpacity={0.8}
            >
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(user?.name || user?.username || 'B').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.ink }]} numberOfLines={1}>
                    {user?.name || user?.username || (isId ? 'Tamu' : 'Guest')}
                  </Text>
                  {isAdmin ? (
                    <View style={[styles.adminChip, { backgroundColor: colors.accent }]}>
                      <Text style={styles.adminChipText}>ADMIN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.profileSub, { color: colors.muted }]} numberOfLines={1}>
                  {user?.email ||
                    (user?.username
                      ? `@${user.username}`
                      : isId
                      ? 'Ketuk untuk masuk'
                      : 'Tap to sign in')}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.line }]} />

            {/* Menu Items */}
            <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
              {navItems.map((item) => {
                const active = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.navItem, active && { backgroundColor: colors.accent }]}
                    onPress={item.onPress}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? '#ffffff' : colors.ink}
                      style={styles.navIcon}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: active ? '#ffffff' : colors.ink },
                        active && styles.navLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.dividerSmall, { backgroundColor: colors.line }]} />

              <TouchableOpacity
                style={styles.navItem}
                onPress={onToggleTheme}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={20}
                  color={colors.ink}
                  style={styles.navIcon}
                />
                <Text style={[styles.navLabel, { color: colors.ink }]}>
                  {isId
                    ? isDark
                      ? 'Tema: Mode Gelap'
                      : 'Tema: Mode Terang'
                    : isDark
                    ? 'Theme: Dark Mode'
                    : 'Theme: Light Mode'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={onToggleLang}
                activeOpacity={0.75}
              >
                <Ionicons name="globe-outline" size={20} color={colors.ink} style={styles.navIcon} />
                <Text style={[styles.navLabel, { color: colors.ink }]}>
                  {isId ? 'Bahasa: Indonesia (ID)' : 'Language: English (EN)'}
                </Text>
              </TouchableOpacity>

              {token ? (
                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => handleClose(onLogout)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={colors.danger}
                    style={styles.navIcon}
                  />
                  <Text style={[styles.navLabel, { color: colors.danger }]}>
                    {isId ? 'Keluar' : 'Sign Out'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {/* Warm Bistro Footer */}
            <View
              style={[
                styles.footerBanner,
                { backgroundColor: colors.soft, borderColor: colors.line },
              ]}
            >
              <Text style={[styles.footerEyebrow, { color: colors.accent }]}>BISTRO ELEVEN</Text>
              <Text style={[styles.footerTagline, { color: colors.ink }]}>
                {isId
                  ? 'Tempat nyaman untuk sejuta cita rasa.'
                  : 'A little place for a lot of flavor.'}
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 15, 9, 0.55)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 16,
  },
  safeDrawer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  brandText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#cf733e',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#cf733e',
    borderWidth: 2,
    borderColor: '#f4d3b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  adminChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminChipText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  profileSub: { fontSize: 12, marginTop: 2 },
  divider: {
    height: 1,
    marginHorizontal: 18,
    marginVertical: 10,
  },
  dividerSmall: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  navList: { flex: 1, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  navIcon: { marginRight: 14 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navLabelActive: { color: '#ffffff', fontWeight: '700' },
  footerBanner: {
    margin: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  footerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  footerTagline: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
