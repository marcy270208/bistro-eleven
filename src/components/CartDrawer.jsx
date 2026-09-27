import { Link } from 'react-router-dom';

export default function CartDrawer({ isOpen, setIsOpen, cart, dishes, updateCartQty, user }) {
  if (user?.role === 'administrator') return null;

  const cartTotal = cart.reduce((sum, item) => {
    const dish = dishes.find(d => d.id === item.id);
    return sum + (dish ? dish.price * item.qty : 0);
  }, 0);

  const rupiah = (amount) => 'Rp ' + Number(amount || 0).toLocaleString('id-ID');

  return (
    <>
      <aside className={`cart-drawer ${isOpen ? 'open' : ''}`} id="cart-drawer" aria-label="Shopping cart">
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button id="cart-close" aria-label="Close cart" onClick={() => setIsOpen(false)}>
          &times;
        </button>
        </div>
        <div id="cart-items">
          {cart.length === 0 ? (
            <p className="cart-empty">Your cart is empty. Add a dish from the menu to get started.</p>
          ) : (
            cart.map(item => {
              const dish = dishes.find(d => d.id === item.id);
              if (!dish) return null;
              return (
                <div key={item.id} className="cart-line">
                  <div>
                    <b>{dish.name}</b><br/>
                    <small>{rupiah(dish.price)} &bull; {item.qty} serving(s)</small>
                  </div>
                  <div className="qty-buttons">
                    <button onClick={() => updateCartQty(item.id, item.qty - 1)}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateCartQty(item.id, item.qty + 1)}>+</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="drawer-total">
          <span>Total</span>
          <b id="cart-total">{rupiah(cartTotal)}</b>
        </div>
        <Link className={`button button-red ${cart.length === 0 ? 'disabled-link' : ''}`} id="checkout-link" to="/checkout" onClick={() => setIsOpen(false)}>
          Continue to checkout <span>&rarr;</span>
        </Link>
      </aside>
      <div className={`drawer-backdrop ${isOpen ? 'open' : ''}`} id="drawer-backdrop" onClick={() => setIsOpen(false)}></div>
    </>
  );
}

