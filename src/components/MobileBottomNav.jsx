import { useState } from 'react';
import { useLocation } from 'react-router-dom';

const icons = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>,
  menu: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  search: <><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.3 16.3 4.2 4.2"/></>,
  reviews: <><path d="M4 4h16v13H9l-5 4z"/><path d="M8 9h8M8 13h5"/></>,
  cart: <><path d="M2 3h2l2.5 12.2a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.9-1.4L22 8H5"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></>,
};

export default function MobileBottomNav({ user, cartCount, isCartOpen, openCart }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');
  if (location.pathname !== '/' || user?.role === 'administrator' || isCartOpen) return null;

  const goToSection = (section, focusSearch = false, tab = section) => {
    setActiveTab(tab);
    const scroll = () => {
      const target = document.getElementById(section);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusSearch) window.setTimeout(() => document.getElementById('menu-search')?.focus(), 350);
    };
    scroll();
  };

  const home = () => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      <button className={activeTab === 'home' ? 'is-active' : ''} onClick={home}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{icons.home}</svg><span>Home</span>
      </button>
      <button className={activeTab === 'menu' ? 'is-active' : ''} onClick={() => goToSection('menu', false, 'menu')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{icons.menu}</svg><span>Menu</span>
      </button>
      <button className={activeTab === 'search' ? 'is-active' : ''} onClick={() => goToSection('menu', true, 'search')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{icons.search}</svg><span>Search</span>
      </button>
      <button className={activeTab === 'reviews' ? 'is-active' : ''} onClick={() => goToSection('reviews', false, 'reviews')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{icons.reviews}</svg><span>Reviews</span>
      </button>
      <button className={activeTab === 'basket' ? 'is-active' : ''} onClick={() => { setActiveTab('basket'); openCart(); }} aria-label={`Open basket, ${cartCount} items`}>
        <span className="mobile-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true">{icons.cart}</svg>{cartCount > 0 && <i>{cartCount}</i>}</span><span>Basket</span>
      </button>
    </nav>
  );
}
