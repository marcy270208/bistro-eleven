import React from 'react';
import { useLanguage } from '../lib/i18n';

export default function BottomCartDock({ isVisible, setIsVisible, cartCount, openCart }) {
  const { isId } = useLanguage();
  if (!isVisible && cartCount === 0) return null;

  return (
    <div className={`bottom-cart-dock ${isVisible ? 'visible' : ''}`} id="bottom-cart-dock">
      <span className="bottom-cart-icon" id="bottom-cart-icon" aria-hidden="true">
        &#128722;
      </span>
      <div className="bottom-cart-copy">
        <b>{isId ? 'Ditambahkan ke keranjang' : 'Added to your cart'}</b>
        <span id="bottom-cart-summary">
          {cartCount} {isId ? 'menu' : 'items'}
        </span>
      </div>
      <button className="bottom-cart-view" id="bottom-cart-view" onClick={openCart}>
        {isId ? 'Lihat keranjang' : 'View cart'} <span>&rarr;</span>
      </button>
      <button
        className="bottom-cart-close"
        id="bottom-cart-close"
        aria-label="Dismiss cart message"
        onClick={() => setIsVisible(false)}
      >
        &times;
      </button>
    </div>
  );
}
