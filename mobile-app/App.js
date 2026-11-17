import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, setUnauthorizedHandler } from './src/lib/api';
import { deleteToken, getLang, getToken, saveLang } from './src/lib/storage';
import { COLORS } from './src/theme';
import SideDrawer from './src/components/SideDrawer';
import MenuScreen from './src/screens/MenuScreen';
import DishDetailModal from './src/screens/DishDetailModal';
import CartCheckoutModal from './src/screens/CartCheckoutModal';
import OrdersScreen from './src/screens/OrdersScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import AiScreen from './src/screens/AiScreen';
import AccountScreen from './src/screens/AccountScreen';

export default function App() {
  const [tab, setTab] = useState('menu'); // 'menu' | 'orders' | 'reviews' | 'ai' | 'account'
  const [lang, setLang] = useState('en');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [dishes, setDishes] = useState([]);
  const [dishesLoading, setDishesLoading] = useState(true);
  const [dishesError, setDishesError] = useState('');

  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]); // [{ id, qty }]
  const [selectedDish, setSelectedDish] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const handleToggleFavorite = (dishId) => {
    setFavorites((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

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

  const handleUpdateQty = (dishId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === dishId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />

        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <TouchableOpacity
              style={styles.menuIconBtn}
              onPress={() => setDrawerOpen(true)}
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons name="menu" size={24} color={COLORS.ink} />
            </TouchableOpacity>
            <View>
              <Text style={styles.brand}>BISTRO ELEVEN</Text>
              <Text style={styles.subBrand}>
                {user ? `${user.name || user.username}` : isId ? 'Tamu' : 'Guest'}
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLang}>
              <Text style={styles.langBtnText}>{lang.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={() => setCartOpen(true)}>
              <Text style={styles.cartBtnText}>
                {isId ? 'Keranjang' : 'Cart'} ({cartCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          {tab === 'menu' ? (
            <MenuScreen
              dishes={dishes}
              loading={dishesLoading}
              error={dishesError}
              onRetry={loadDishes}
              onSelectDish={setSelectedDish}
              onAddToCart={handleAddToCart}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              isId={isId}
            />
          ) : null}

          {tab === 'orders' ? (
            <OrdersScreen
              token={token}
              user={user}
              lang={lang}
              onGoLogin={() => setTab('account')}
            />
          ) : null}

          {tab === 'reviews' ? (
            <ReviewsScreen
              token={token}
              user={user}
              lang={lang}
              onGoLogin={() => setTab('account')}
            />
          ) : null}

          {tab === 'ai' ? (
            <AiScreen
              token={token}
              user={user}
              lang={lang}
              onAddToCart={handleAddToCart}
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
            />
          ) : null}
        </View>

        <DishDetailModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onAddToCart={handleAddToCart}
          isId={isId}
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
        />

        <SideDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeTab={tab}
          onSelectTab={setTab}
          onOpenCart={() => setCartOpen(true)}
          onToggleLang={toggleLang}
          onLogout={async () => {
            await deleteToken();
            setToken(null);
            setUser(null);
            setTab('account');
          }}
          user={user}
          token={token}
          lang={lang}
          cartCount={cartCount}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.paper },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
  },
  brand: { fontSize: 16, fontWeight: '800', letterSpacing: 1, color: COLORS.ink },
  subBrand: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  langBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  cartBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  cartBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  body: { flex: 1 },
});
