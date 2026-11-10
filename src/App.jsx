import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import AccountSettings from './pages/AccountSettings';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Header from './components/Header';
import CartDrawer from './components/CartDrawer';
import BottomCartDock from './components/BottomCartDock';
import MobileBottomNav from './components/MobileBottomNav';
import { startingDishes } from './data/dishes';
import { api } from './lib/api';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('bistroTheme') || 'light');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bistroToken'));
  const [authReady, setAuthReady] = useState(false);
  const [dishes, setDishes] = useState(startingDishes);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(false);
  const [favoriteDishIds, setFavoriteDishIds] = useState([]);
  const [isFavoritesOnly, setIsFavoritesOnly] = useState(false);
  const cartCount = cart ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;

  useEffect(() => {
    localStorage.removeItem('adminDishes');
    api('/api/dishes')
      .then(serverDishes => {
        if (!Array.isArray(serverDishes) || serverDishes.length === 0) return;
        setDishes(serverDishes.map(dish => {
          const originalDish = startingDishes.find(
            item => String(item.id) === String(dish.id) || item.name.toLowerCase() === dish.name?.toLowerCase()
          );
          return {
            ...originalDish,
            ...dish,
            ingredients: Array.isArray(dish.ingredients) && dish.ingredients.length
              ? dish.ingredients
              : (originalDish?.ingredients || []),
          };
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) { setUser(null); setAuthReady(true); return; }
    api('/api/auth/me', { token })
      .then(setUser)
      .catch(() => { localStorage.removeItem('bistroToken'); setToken(null); setUser(null); })
      .finally(() => setAuthReady(true));
  }, [token]);

  useEffect(() => {
    if (!token) { setOrders([]); return; }
    api('/api/orders', { token }).then(setOrders).catch(() => setOrders([]));
  }, [token]);

  useEffect(() => {
    localStorage.setItem('bistroTheme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const addToCart = (dishId) => {
    if (!user) { window.location.hash = '/login'; return; }
    if (user?.role === 'administrator') return; // Admin can't order
    setCart(prev => {
      const existing = prev.find(item => item.id === dishId);
      if (existing) {
        return prev.map(item => item.id === dishId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: dishId, qty: 1 }];
    });
    setIsDockVisible(true);
    setTimeout(() => setIsDockVisible(false), 3000);
  };

  const updateCartQty = (dishId, qty) => {
    setCart(prev => {
      if (qty <= 0) return prev.filter(item => item.id !== dishId);
      return prev.map(item => item.id === dishId ? { ...item, qty } : item);
    });
  };

  const logout = () => {
    localStorage.removeItem('bistroToken');
    setToken(null);
    setUser(null);
    setCart([]);
    setIsCartOpen(false);
  };

  const handleAuth = ({ user: authenticatedUser, token: authToken }) => {
    localStorage.setItem('bistroToken', authToken);
    setToken(authToken);
    setUser(authenticatedUser);
  };

  return (
    <HashRouter>
      {authReady && <Header user={user} toggleTheme={toggleTheme} theme={theme} setIsCartOpen={setIsCartOpen} cart={cart} logout={logout} isFavoritesOnly={isFavoritesOnly} setIsFavoritesOnly={setIsFavoritesOnly} />}
      
      <Routes>
        <Route path="/" element={<Home dishes={dishes} addToCart={addToCart} user={user} token={token} favoriteDishIds={favoriteDishIds} setFavoriteDishIds={setFavoriteDishIds} isFavoritesOnly={isFavoritesOnly} setIsFavoritesOnly={setIsFavoritesOnly} />} />
        <Route path="/login" element={<Login onAuthenticated={handleAuth} user={user} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail token={token} setUser={setUser} />} />
        <Route path="/dashboard" element={authReady ? <Dashboard user={user} token={token} dishes={dishes} setDishes={setDishes} orders={orders} setOrders={setOrders} /> : null} />
        <Route path="/account" element={authReady ? <AccountSettings user={user} token={token} setUser={setUser} /> : null} />
        <Route path="/checkout" element={authReady ? <Checkout user={user} token={token} cart={cart} setCart={setCart} dishes={dishes} orders={orders} setOrders={setOrders} /> : null} />
      </Routes>

      {user?.role === 'client' && <CartDrawer isOpen={isCartOpen} setIsOpen={setIsCartOpen} cart={cart} dishes={dishes} updateCartQty={updateCartQty} user={user} />}
      {user?.role === 'client' && <BottomCartDock isVisible={isDockVisible} setIsVisible={setIsDockVisible} cartCount={cartCount} openCart={() => { setIsDockVisible(false); setIsCartOpen(true); }} />}
      {authReady && <MobileBottomNav user={user} cartCount={cartCount} isCartOpen={isCartOpen} openCart={() => user?.role === 'client' ? setIsCartOpen(true) : (window.location.hash = '/login')} />}
    </HashRouter>
  );
}

export default App;

