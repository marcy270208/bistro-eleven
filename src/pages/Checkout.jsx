import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const Checkout = ({ user, token, cart, setCart, dishes, orders, setOrders }) => {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'administrator';

  const [orderType, setOrderType] = useState('Delivery');
  const [address, setAddress] = useState(user?.address || '');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [bill, setBill] = useState(null);
  const [orderError, setOrderError] = useState('');

  if (!user) return <Navigate to="/login" />;
  if (isAdmin) return <Navigate to="/dashboard" />;

  const getDish = id => dishes.find(d => d.id === id);
  const cartItems = cart.map(item => ({ ...item, ...getDish(item.id) }));
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) return;

    setProcessing(true); setLoadingStage(0); setOrderError('');
    const startedAt = Date.now();
    const stageTimers = [
      window.setTimeout(() => setLoadingStage(1), 1200),
      window.setTimeout(() => setLoadingStage(2), 2400),
    ];
    try {
      const order = await api('/api/orders', {
        method: 'POST', token,
        body: JSON.stringify({
          items: cartItems.map(item => ({ name: item.name, qty: item.qty })),
          type: orderType,
          location: orderType === 'Delivery' ? address : `Table ${tableNumber}`,
          notes,
          payment: paymentMethod,
        }),
      });
      await new Promise(resolve => window.setTimeout(resolve, Math.max(0, 3600 - (Date.now() - startedAt))));
      setOrders([order, ...orders.filter(existing => existing.id !== order.id)]);
      setCart([]);
      setBill(order);
    } catch (error) { setOrderError(error.message); }
    finally {
      stageTimers.forEach(timer => window.clearTimeout(timer));
      setProcessing(false);
    }
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
          {orderError && <p className="error" role="alert">{orderError}</p>}
        </form>
      </section>

      {processing && (
        <div className="order-overlay" id="processing-modal">
          <section className="processing-card" role="status" aria-live="polite">
            <div className="kitchen-loader" aria-hidden="true">
              <span className="steam steam-one"></span><span className="steam steam-two"></span><span className="steam steam-three"></span>
              <div className="loader-plate"><div className="loader-meal"><i></i><i></i><i></i></div></div>
              <span className="loader-orbit orbit-one"></span><span className="loader-orbit orbit-two"></span>
            </div>
            <p className="eyebrow">BISTRO ELEVEN</p>
            <h2>{['Order received', 'The kitchen is cooking', 'Your bill is almost ready'][loadingStage]}</h2>
            <p>{['Sending your order to our kitchen.', 'Our chef is preparing your favorites.', 'Adding up your order details.'][loadingStage]}</p>
            <div className="kitchen-steps" aria-label={`Checkout progress: step ${loadingStage + 1} of 3`}>
              {['Order sent', 'Cooking', 'Bill ready'].map((step, index) => (
                <span key={step} className={index <= loadingStage ? 'is-active' : ''}>
                  <i>{index < loadingStage ? '✓' : index + 1}</i>{step}
                </span>
              ))}
            </div>
            <div className="kitchen-progress"><span style={{ width: `${22 + loadingStage * 31}%` }}></span></div>
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
