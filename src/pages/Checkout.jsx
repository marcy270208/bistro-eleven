import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const Checkout = ({ user, cart, setCart, dishes, orders, setOrders }) => {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'administrator';

  const [orderType, setOrderType] = useState('Delivery');
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [bill, setBill] = useState(null);

  if (!user) return <Navigate to="/login" />;
  if (isAdmin) return <Navigate to="/dashboard" />;

  const getDish = id => dishes.find(d => d.id === id);
  const cartItems = cart.map(item => ({ ...item, ...getDish(item.id) }));
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cart.length) return;

    setProcessing(true);

    setTimeout(() => {
      const order = {
        id: 'ORD-' + Date.now().toString().slice(-6),
        username: user.username,
        customer: user.name,
        items: cartItems.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total,
        type: orderType,
        location: orderType === 'Delivery' ? address : `Table ${tableNumber}`,
        notes,
        payment: paymentMethod,
        status: 'New'
      };

      setOrders([order, ...orders]);
      setCart([]);
      setProcessing(false);
      setBill(order);
    }, 1500);
  };

  const handleDone = () => {
    setBill(null);
    navigate('/');
  };

  return (
    <main className="order-page">
      <div className="order-intro">
        <p className="eyebrow">FROM OUR KITCHEN TO YOU</p>
        <h1>Checkout</h1>
        <p className="muted">Review your cart, choose how to receive your order, and confirm.</p>
      </div>

      <section className="order-card">
        <form id="order-form" onSubmit={handleSubmit}>
          <label htmlFor="customer-name">Your name</label>
          <input id="customer-name" required value={user.name} readOnly />

          <div id="checkout-items" className="checkout-items">
            {cartItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{item.qty}x {item.name}</span>
                <span>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
              </div>
            ))}
            {!cartItems.length && <p>Your cart is empty.</p>}
          </div>

          <label htmlFor="order-type">How would you like your order?</label>
          <select id="order-type" value={orderType} onChange={e => setOrderType(e.target.value)}>
            <option value="Delivery">Delivery</option>
            <option value="Dine-in">Dine-in</option>
          </select>

          {orderType === 'Delivery' ? (
            <div className="location-fields active">
              <label htmlFor="address">Delivery address</label>
              <textarea id="address" rows="2" placeholder="Full delivery address" required value={address} onChange={e => setAddress(e.target.value)}></textarea>
            </div>
          ) : (
            <div className="location-fields active">
              <label htmlFor="table-number">Table number</label>
              <input id="table-number" type="text" placeholder="Table number (e.g. 12)" required value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
            </div>
          )}

          <label htmlFor="payment-method">Payment method</label>
          <select id="payment-method" required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="">Choose a payment method</option>
            <option value="Cash">Cash</option>
            <option value="QRIS">QRIS</option>
            <option value="Bank transfer">Bank transfer</option>
          </select>

          <label htmlFor="notes">Order notes <span className="optional">(optional)</span></label>
          <textarea id="notes" rows="2" placeholder="For example: no chili" value={notes} onChange={e => setNotes(e.target.value)}></textarea>

          <div className="order-total">
            <span>Total</span>
            <b>Rp {total.toLocaleString('id-ID')}</b>
          </div>

          <button className="button button-red" type="submit" disabled={!cart.length || processing}>
            Place order <span>&rarr;</span>
          </button>
        </form>
      </section>

      {processing && (
        <div className="order-overlay" id="processing-modal">
          <section className="processing-card">
            <div className="spinner"></div>
            <p className="eyebrow">BISTRO ELEVEN</p>
            <h2>Preparing your order</h2>
            <p>Please wait while we put together your bill.</p>
            <div className="loading-dots"><i></i><i></i><i></i></div>
          </section>
        </div>
      )}

      {bill && (
        <div className="order-overlay" id="bill-modal">
          <section className="bill-card">
            <button className="modal-close" aria-label="Close bill" onClick={handleDone}>&times;</button>
            <p className="eyebrow">BISTRO ELEVEN</p>
            <h2>Your order bill</h2>
            <p className="bill-id">Order {bill.id}</p>
            
            <div className="bill-details">
              <p><b>{bill.customer}</b></p>
              <p>{bill.type}: {bill.location}</p>
              <p>Payment: {bill.payment}</p>
            </div>

            <div className="bill-lines">
              {bill.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>{item.qty}x {item.name}</span>
                  <span>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>

            <div className="bill-total">
              <span>Order total</span>
              <b>Rp {bill.total.toLocaleString('id-ID')}</b>
            </div>

            <p className="bill-thanks">Thank you for dining with us!</p>
            <button className="button button-red" onClick={handleDone}>
              Back to restaurant <span>&rarr;</span>
            </button>
          </section>
        </div>
      )}
    </main>
  );
};

export default Checkout;
