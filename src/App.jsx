import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Checkout from './pages/Checkout';
import Header from './components/Header';
import CartDrawer from './components/CartDrawer';
import BottomCartDock from './components/BottomCartDock';
import { startingDishes } from './data/dishes';
import { adminAccount, clientAccount } from './data/users';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('bistroTheme') || 'light');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('bistroUser')) || null);
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem('bistroUsers')) || [adminAccount, clientAccount]);
  const [dishes, setDishes] = useState(() => JSON.parse(localStorage.getItem('adminDishes')) || startingDishes);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('bistroCart')) || []);
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('adminOrders')) || []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(false);
  const cartCount = cart ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;

  useEffect(() => {
    localStorage.setItem('bistroUsers', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('bistroTheme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }, [theme]);

  useEffect(() => { localStorage.setItem('bistroUser', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('adminDishes', JSON.stringify(dishes)); }, [dishes]);
  useEffect(() => { localStorage.setItem('bistroCart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('adminOrders', JSON.stringify(orders)); }, [orders]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const addToCart = (dishId) => {
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
    setUser(null);
  };

  return (
    <HashRouter>
      <Header user={user} toggleTheme={toggleTheme} theme={theme} setIsCartOpen={setIsCartOpen} cart={cart} logout={logout} />
      
      <Routes>
        <Route path="/" element={<Home dishes={dishes} addToCart={addToCart} user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} users={users} setUsers={setUsers} user={user} cart={cart} />} />
        <Route path="/dashboard" element={<Dashboard user={user} dishes={dishes} setDishes={setDishes} orders={orders} setOrders={setOrders} />} />
        <Route path="/checkout" element={<Checkout user={user} cart={cart} setCart={setCart} dishes={dishes} orders={orders} setOrders={setOrders} />} />
      </Routes>

      <CartDrawer isOpen={isCartOpen} setIsOpen={setIsCartOpen} cart={cart} dishes={dishes} updateCartQty={updateCartQty} user={user} />
      <BottomCartDock isVisible={isDockVisible} setIsVisible={setIsDockVisible} cartCount={cartCount} openCart={() => { setIsDockVisible(false); setIsCartOpen(true); }} />
    </HashRouter>
  );
}

export default App;

