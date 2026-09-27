import React, { useEffect } from 'react';

export default function BottomCartDock({ isVisible, setIsVisible, cartCount, openCart }) {
  if (!isVisible && cartCount === 0) return null;

  return (
    <div className={`bottom-cart-dock ${isVisible ? 'visible' : ''}`} id="bottom-cart-dock">
      <span className="bottom-cart-icon" id="bottom-cart-icon" aria-hidden="true">
        &#128722;
      </span>
      <div className="bottom-cart-copy">
        <b>Added to your cart</b>
        <span id="bottom-cart-summary">{cartCount} items</span>
      </div>
      <button className="bottom-cart-view" id="bottom-cart-view" onClick={openCart}>
        View cart <span>&rarr;</span>
      </button>
      <button className="bottom-cart-close" id="bottom-cart-close" aria-label="Dismiss cart message" onClick={() => setIsVisible(false)}>
        &times;
      </button>
    </div>
  );
}
