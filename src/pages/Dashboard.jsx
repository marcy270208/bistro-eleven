import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';

const Dashboard = ({ user, orders, setOrders, dishes, setDishes }) => {
  const [showSalesModal, setShowSalesModal] = React.useState(false);
  const [filter, setFilter] = useState('Active');
  const isAdmin = user?.role === 'administrator';


  const [newDish, setNewDish] = useState({ name: '', price: '', description: '', photo: null, preview: null });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setNewDish({ ...newDish, photo: ev.target.result, preview: ev.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleAddDish = (e) => {
    e.preventDefault();
    const id = newDish.name.toLowerCase().replace(/[\s&]+/g, '-');
    setDishes([
      ...dishes, 
      { 
        id, 
        name: newDish.name, 
        price: parseInt(newDish.price, 10), 
        description: newDish.description, 
        image: newDish.photo 
      }
    ]);
    setNewDish({ name: '', price: '', description: '', photo: null, preview: null });
    e.target.reset();
    alert('The dish and its photo were added to the catalog.');
  };

  const handleDeleteDish = (id) => {
    setDishes(dishes.filter(d => d.id !== id));
  };

  const handleOrderStatus = (id, newStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const visibleOrders = isAdmin 
    ? orders 
    : orders.filter((o) => o.username === user?.username);

  let filteredOrders = visibleOrders;
  if (isAdmin) {
    if (filter === 'Active') {
      filteredOrders = visibleOrders.filter(o => o.status === 'New' || o.status === 'Preparing');
    } else if (filter === 'Completed') {
      filteredOrders = visibleOrders.filter(o => o.status === 'Completed' || o.status === 'Cancelled');
    }
  }

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const preparingCount = orders.filter(o => o.status === 'Preparing' || o.status === 'New').length;

  if (!user) return <Navigate to="/login" />;

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow" id="role-label">
            {isAdmin ? 'RESTAURANT MANAGEMENT' : 'CLIENT ACCOUNT \u2022 BISTRO ELEVEN'}
          </p>
          <h1 id="welcome-title">
            {isAdmin ? 'Administrator Portal' : `Hello, ${user?.name}.`}
          </h1>
          <p className="muted" id="welcome-copy">
            {!isAdmin && 'Browse dishes, place an order, and follow its progress.'}
          </p>
        </div>
        {!isAdmin && (
          <a className="button button-red" id="new-order-link" href="/">
            Browse menu
            <span>&rarr;</span>
          </a>
        )}
      </section>

      {isAdmin && (
        <div className="stats-grid">
          <div className="stat-card pointer" style={{ padding: '24px', textAlign: 'center' }} onClick={() => setShowSalesModal(true)}>
            <span style={{ fontSize: '11px', marginBottom: '8px', color: 'var(--muted)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Sales</span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>Rp {revenue.toLocaleString('id-ID')}</b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>↓ Click for details</span>
          </div>
          <div className="stat-card pointer" style={{ padding: '24px', textAlign: 'center' }} onClick={() => document.getElementById('orders').scrollIntoView({ behavior: 'smooth' })}>
            <span style={{ fontSize: '11px', marginBottom: '8px', color: 'var(--muted)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Incoming Orders</span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>{preparingCount} Active</b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>↓ Click to manage queue</span>
          </div>
          <div className="stat-card pointer" style={{ padding: '24px', textAlign: 'center' }} onClick={() => document.getElementById('add-new-item').scrollIntoView({ behavior: 'smooth' })}>
            <span style={{ fontSize: '11px', marginBottom: '8px', color: 'var(--muted)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Add New Item</span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>Quick Entry</b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>↓ Click to add item</span>
          </div>
        </div>
      )}

      <section className="panel" id="orders">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2 id="orders-title">{isAdmin ? 'Customer Orders Queue' : 'My orders'}</h2>
          </div>
        </div>
        
        {isAdmin && (
          <div className="filter-tabs" id="order-filters">
            <button className={`filter-tab ${filter === 'Active' ? 'active' : ''}`} onClick={() => setFilter('Active')}>Active</button>
            <button className={`filter-tab ${filter === 'Completed' ? 'active' : ''}`} onClick={() => setFilter('Completed')}>Completed</button>
            <button className={`filter-tab ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>All Orders</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Type & Destination</th>
                <th>Items & Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="orders-list">
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    <p className="empty-state">No orders yet.</p>
                  </td>
                </tr>
              )}
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td><b>{order.id}</b></td>
                  <td>{order.customer}</td>
                  <td>
                    {order.type}<br/>
                    {order.type === 'Dine-in' ? (
                      <span className="terracotta">{order.location}</span>
                    ) : (
                      <span className="warm-slate">{order.location}</span>
                    )}
                  </td>
                  <td>
                    {order.items.map((item, idx) => (
                      <div key={idx}><b>{item.qty}x</b> {item.name}</div>
                    ))}
                    {order.notes && (
                      <div><small style={{ fontStyle: 'italic' }}>&#128221; Note: "{order.notes}"</small></div>
                    )}
                  </td>
                  <td>Rp {order.total.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`badge-status bg-${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>
                    {isAdmin && order.status !== 'Completed' && order.status !== 'Cancelled' ? (
                      <>
                        <button className="button-action btn-complete" onClick={() => handleOrderStatus(order.id, 'Completed')}>Complete</button>
                        <button className="button-action btn-cancel" onClick={() => handleOrderStatus(order.id, 'Cancelled')}>Cancel</button>
                      </>
                    ) : (
                      !isAdmin ? '-' : <span className="label-archived">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="panel admin-tools" id="add-new-item">
          <h3>Add New Item</h3>
          <p className="muted">Add a dish to the restaurant menu catalog.</p>
          <form id="add-dish-form" className="clean-form" onSubmit={handleAddDish}>
            <label>Item Name</label>
            <input 
              placeholder="Item Name" 
              required 
              value={newDish.name} 
              onChange={e => setNewDish({...newDish, name: e.target.value})} 
            />
            <label>Price (IDR)</label>
            <input 
              type="number" 
              min="1000" 
              step="1000" 
              placeholder="Price (IDR)" 
              required 
              value={newDish.price} 
              onChange={e => setNewDish({...newDish, price: e.target.value})} 
            />
            <label>Dish Photo</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" required onChange={handlePhotoUpload} />
            {newDish.preview && <img className="upload-preview" src={newDish.preview} alt="Dish photo preview" style={{ display: 'block' }} />}
            <label>Description</label>
            <textarea 
              rows="2" 
              placeholder="Brief taste and ingredients" 
              required 
              value={newDish.description} 
              onChange={e => setNewDish({...newDish, description: e.target.value})}
            ></textarea>
            <div className="form-actions">
              <button className="button button-red save-catalog" type="submit" style={{ width: 'fit-content', padding: '0 24px', minHeight: '40px' }}>
                Save to Catalog
              </button>
            </div>
          </form>
          <div id="admin-dish-list">
            <h4>Current menu <button style={{ marginLeft: '16px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '4px' }} onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset to Defaults</button></h4>
            {dishes.map(dish => (
              <div key={dish.id} className="admin-dish-row">
                <span className="admin-dish-info">
                  <img src={dish.image} alt="" />
                  <span>{dish.name} &bull; Rp {dish.price.toLocaleString('id-ID')}</span>
                </span>
                <button type="button" className="remove-dish" onClick={() => handleDeleteDish(dish.id)}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showSalesModal && (
        <div className="drawer-backdrop open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSalesModal(false)}>
          <div className="panel" style={{ width: '400px', maxWidth: '90%', margin: '0 auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }} onClick={() => setShowSalesModal(false)}>&times;</button>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Completed Transactions</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {completedOrders.length > 0 ? completedOrders.map(o => (
                <div key={o.id} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span><b>{o.id}</b> - {o.customer}</span>
                  <span>Rp {o.total.toLocaleString('id-ID')}</span>
                </div>
              )) : (
                <p className="muted">No completed transactions.</p>
              )}
            </div>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total Revenue:</span>
              <span>Rp {revenue.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
