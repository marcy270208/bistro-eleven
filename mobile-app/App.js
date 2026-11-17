import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, setUnauthorizedHandler } from './src/lib/api';
import { deleteToken, getLang, getTheme, getToken, saveLang, saveTheme } from './src/lib/storage';
import { getColors } from './src/theme';
import SideDrawer from './src/components/SideDrawer';
import MenuScreen from './src/screens/MenuScreen';
import DishDetailModal from './src/screens/DishDetailModal';
import CartCheckoutModal from './src/screens/CartCheckoutModal';
import OrdersScreen from './src/screens/OrdersScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import AiScreen from './src/screens/AiScreen';
import AccountScreen from './src/screens/AccountScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';

export default function App() {
  const [tab, setTab] = useState('menu'); // 'menu' | 'orders' | 'reviews' | 'ai' | 'account'
  const [lang, setLang] = useState('en');
  const [isDark, setIsDark] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [dishes, setDishes] = useState([]);
  const [dishesLoading, setDishesLoading] = useState(true);
  const [dishesError, setDishesError] = useState('');

  const [cart, setCart] = useState([]); // [{ id, qty }]
  const [selectedDish, setSelectedDish] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabFade = useRef(new Animated.Value(1)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    tabFade.setValue(0.35);
    tabSlide.setValue(10);
    Animated.parallel([
      Animated.timing(tabFade, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tabSlide, {
        toValue: 0,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [tab, tabFade, tabSlide]);

  const edgeSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dx > 18 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dx > 45 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.3) {
          setDrawerOpen(true);
        }
      },
    })
  ).current;

  const isId = lang === 'id';

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await deleteToken();
      setToken(null);
      setUser(null);
      setTab('account');
    });
  }, []);

  const loadDishes = useCallback(async () => {
    setDishesLoading(true);
    setDishesError('');
    try {
      const data = await api('/api/dishes');
      setDishes(Array.isArray(data) ? data : []);
    } catch (err) {
      setDishesError(err.message || 'Failed to load menu');
    } finally {
      setDishesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDishes();
    (async () => {
      const savedLang = await getLang();
      if (savedLang === 'en' || savedLang === 'id') {
        setLang(savedLang);
      }
      const savedTheme = await getTheme();
      setIsDark(savedTheme === 'dark');
      const savedToken = await getToken();
      if (savedToken) {
        try {
          const me = await api('/api/auth/me', { token: savedToken });
          setToken(savedToken);
          setUser(me);
        } catch {
          await deleteToken();
        }
      }
    })();
  }, [loadDishes]);

  const toggleLang = async () => {
    const next = lang === 'en' ? 'id' : 'en';
    setLang(next);
    await saveLang(next);
  };

  const toggleTheme = async () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    await saveTheme(nextDark ? 'dark' : 'light');
  };

  const colors = getColors(isDark);
  const isAdmin = user?.role === 'administrator';

  const handleAddToCart = (dishOrId) => {
    const id = typeof dishOrId === 'object' ? dishOrId?.id : dishOrId;
    if (!id) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id, qty: 1 }];
    });
  };

  const handleUpdateQty = (dishId, nextQty) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === dishId ? { ...item, qty: nextQty } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={['top', 'bottom']}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View
          style={[
            styles.topBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.line },
          ]}
        >
          <View style={styles.topLeft}>
            <TouchableOpacity
              style={[styles.menuIconBtn, { backgroundColor: colors.soft }]}
              onPress={() => setDrawerOpen(true)}
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons name="menu" size={24} color={colors.ink} />
            </TouchableOpacity>
            <View style={[styles.brandCircle, { borderColor: colors.accent, backgroundColor: colors.paper }]}>
              <Text style={[styles.brandLetter, { color: colors.accent }]}>B</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.brand, { color: colors.ink }]} numberOfLines={1}>
                BISTRO ELEVEN
              </Text>
              <Text style={[styles.subBrand, { color: colors.muted }]} numberOfLines={1}>
                {user ? `${user.name || user.username}` : isId ? 'Tamu' : 'Guest'}
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                { backgroundColor: colors.soft, borderColor: colors.line },
              ]}
              onPress={toggleTheme}
              accessibilityLabel="Toggle dark or light mode"
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={colors.ink}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langBtn,
                { backgroundColor: colors.soft, borderColor: colors.line },
              ]}
              onPress={toggleLang}
            >
              <Text style={[styles.langBtnText, { color: colors.ink }]}>{lang.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cartBtn, { backgroundColor: colors.accent }]}
              onPress={() => setCartOpen(true)}
            >
              <Text style={styles.cartBtnText}>
                {isId ? 'Keranjang' : 'Cart'} ({cartCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[styles.body, { backgroundColor: colors.paper }]}
          {...edgeSwipeResponder.panHandlers}
        >
          <Animated.View
            style={[
              styles.body,
              { opacity: tabFade, transform: [{ translateY: tabSlide }] },
            ]}
          >
          {tab === 'menu' ? (
            <MenuScreen
              dishes={dishes}
              loading={dishesLoading}
              error={dishesError}
              onRetry={loadDishes}
              onSelectDish={setSelectedDish}
              onAddToCart={handleAddToCart}
              isId={isId}
              colors={colors}
            />
          ) : null}

          {tab === 'admin' && isAdmin ? (
            <AdminPanelScreen
              token={token}
              dishes={dishes}
              onDishesChanged={loadDishes}
              onGoOrders={() => setTab('orders')}
              onGoChef={() => setTab('ai')}
              lang={lang}
              colors={colors}
            />
          ) : null}

          {tab === 'orders' ? (
            <OrdersScreen
              token={token}
              user={user}
              lang={lang}
              onGoLogin={() => setTab('account')}
              colors={colors}
            />
          ) : null}

          {tab === 'reviews' ? (
            <ReviewsScreen
              token={token}
              user={user}
              lang={lang}
              onGoLogin={() => setTab('account')}
              colors={colors}
            />
          ) : null}

          {tab === 'ai' ? (
            <AiScreen
              token={token}
              user={user}
              lang={lang}
              onAddToCart={handleAddToCart}
              colors={colors}
            />
          ) : null}

          {tab === 'account' ? (
            <AccountScreen
              token={token}
              user={user}
              lang={lang}
              onAuthSuccess={(newToken, newUser) => {
                setToken(newToken);
                setUser(newUser);
              }}
              onLogout={() => {
                setToken(null);
                setUser(null);
              }}
              onUserUpdated={(updated) => setUser(updated)}
              colors={colors}
            />
          ) : null}
          </Animated.View>

          {tab !== 'ai' && !cartOpen && !drawerOpen && !selectedDish ? (
            <TouchableOpacity
              style={[styles.floatingAiBtn, { backgroundColor: colors.accent }]}
              onPress={() => setTab('ai')}
              activeOpacity={0.9}
              accessibilityLabel="Open AI & Head Chef"
            >
              <Ionicons
                name={isAdmin ? 'flame' : 'sparkles'}
                size={18}
                color="#ffffff"
              />
              <Text style={styles.floatingAiText}>
                {isAdmin
                  ? isId
                    ? 'Meja Koki'
                    : 'Chef Desk'
                  : isId
                  ? 'Tanya AI & Koki'
                  : 'Ask AI & Chef'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <DishDetailModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onAddToCart={handleAddToCart}
          isId={isId}
          colors={colors}
        />

        <CartCheckoutModal
          visible={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          dishes={dishes}
          onUpdateQty={handleUpdateQty}
          onClearCart={() => setCart([])}
          user={user}
          token={token}
          onRequireLogin={() => {
            setCartOpen(false);
            setTab('account');
          }}
          onOrderCreated={() => {
            setCartOpen(false);
            setTab('orders');
          }}
          isId={isId}
          colors={colors}
        />

        <SideDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeTab={tab}
          onSelectTab={setTab}
          onOpenCart={() => setCartOpen(true)}
          onToggleLang={toggleLang}
          onToggleTheme={toggleTheme}
          onLogout={async () => {
            await deleteToken();
            setToken(null);
            setUser(null);
            setTab('account');
          }}
          user={user}
          token={token}
          lang={lang}
          isDark={isDark}
          cartCount={cartCount}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 6 },
  menuIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  brandCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLetter: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
  subBrand: { fontSize: 12, marginTop: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  themeBtn: {
    width: 42,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  langBtn: {
    minHeight: 44,
    minWidth: 42,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  langBtnText: { fontSize: 12, fontWeight: '700' },
  cartBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  cartBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  body: { flex: 1 },
  floatingAiBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingAiText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
