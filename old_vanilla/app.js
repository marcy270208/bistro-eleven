const startingDishes = [
  { id: 'club', name: 'Classic Club Sandwich', description: 'Toasted bread, tender chicken, fried egg, and fresh greens.', price: 20000, image: 'images/dish1.png' },
  { id: 'pasta', name: 'Spaghetti Bolognese', description: 'Pasta with rich meat sauce and parmesan.', price: 30000, image: 'images/dish2.jpg' },
  { id: 'chicken', name: 'Crispy Fried Chicken', description: 'Crispy chicken seasoned with Bistro Eleven herbs.', price: 35000, image: 'images/dish3.jpg' },
  { id: 'pizza-pep', name: 'Classic Pepperoni Pizza', description: 'Pepperoni, mozzarella, and a rich tomato sauce.', price: 40000, image: 'images/dish4.png' }    , { id: 'lava-cake', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey molten center, dusted with powdered sugar.', price: 25000, image: 'images/lava_cake.png' }
    , { id: 'pancakes', name: 'Berry & Butter Pancakes', description: 'Fluffy pancakes topped with fresh berries, butter, and maple syrup.', price: 28000, image: 'images/pancakes.png' }
    , { id: 'orange-juice', name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice served with mint and ice.', price: 15000, image: 'images/orange_juice.png' }
    , { id: 'strawberry-smoothie', name: 'Strawberry Smoothie', description: 'Creamy strawberry smoothie blended with fresh mint.', price: 18000, image: 'images/strawberry_smoothie.png' },
];
const adminAccount = { username: 'admin', password: 'admin123', name: 'Bistro Admin', role: 'administrator' };
const clientAccount = { username: 'Margaret', password: '1234', name: 'Margaret', role: 'client' };
const rupiah = (amount) => 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
try {
  let saved = JSON.parse(localStorage.getItem('adminDishes'));
  if (saved) {
    saved = saved.filter(d => d.id !== 'burger' && d.id !== 'pizza-bbq');
    localStorage.setItem('adminDishes', JSON.stringify(saved));
  }
} catch (e) {}
try {
  let saved = JSON.parse(localStorage.getItem('adminDishes'));
  if (saved) {
    const newIds = ['lava-cake', 'pancakes', 'orange-juice', 'strawberry-smoothie'];
    const newItems = startingDishes.filter(d => newIds.includes(d.id));
    for (let item of newItems) {
      if (!saved.find(d => d.id === item.id)) {
        saved.push(item);
      }
    }
    localStorage.setItem('adminDishes', JSON.stringify(saved));
  }
} catch (e) {}
try {
  let saved = JSON.parse(localStorage.getItem('adminDishes'));
  if (saved) {
    let updated = false;
    for (let d of saved) {
      if (d.image === 'images/dish1.jpg') { d.image = 'images/dish1.png'; updated = true; }
      if (d.image === 'images/dish4.jpg') { d.image = 'images/dish4.png'; updated = true; }
    }
    if (updated) localStorage.setItem('adminDishes', JSON.stringify(saved));
  }
} catch (e) {}
const getDishes = () => read('adminDishes', startingDishes).map((dish) => ({
  ...dish,
  description: dish.description === 'Hidangan baru Bistro Eleven.' ? 'Freshly made in the Bistro Eleven kitchen.' : dish.description
}));
const getCart = () => read('bistroCart', []);
const getOrders = () => read('adminOrders', []).map((order) => ({
  ...order,
  status: ({ Diproses: 'New', Disiapkan: 'Preparing', Selesai: 'Completed', Dibatalkan: 'Cancelled' })[order.status] || order.status
}));
const getUser = () => read('bistroUser', null);
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function renderMenu(query = '') {
  const menu = document.querySelector('#menu-grid');
  if (!menu) return;
  const filtered = getDishes().filter((dish) => dish.name.toLowerCase().includes(query.toLowerCase()));
  menu.innerHTML = filtered.length ? filtered.map((dish) => `
    <article class="dish-card"><img src="${escapeHTML(dish.image)}" alt="${escapeHTML(dish.name)}">
      <div class="dish-info"><h3>${escapeHTML(dish.name)}</h3><p>${escapeHTML(dish.description || 'Freshly made in the Bistro Eleven kitchen.')}</p>
        <div class="dish-bottom"><b>${rupiah(dish.price)}</b><button data-add="${escapeHTML(dish.id)}">Add to cart +</button></div>
      </div>
    </article>`).join('') : '<p class="empty-state">No dishes found.</p>';
}
renderMenu();
document.querySelector('#menu-search')?.addEventListener('input', (event) => renderMenu(event.target.value));
function updateCart() {
  const cart = getCart();
  const dishes = getDishes();
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + (dishes.find((dish) => dish.id === item.id)?.price || 0) * item.qty, 0);
  const count = document.querySelector('#cart-count');
  if (count) count.textContent = itemCount;
  const totalLabel = document.querySelector('#cart-total');
  if (totalLabel) totalLabel.textContent = rupiah(total);
  const bottomSummary = document.querySelector('#bottom-cart-summary');
  if (bottomSummary) bottomSummary.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${rupiah(total)}`;
  const list = document.querySelector('#cart-items');
  if (list) list.innerHTML = cart.length ? cart.map((item) => {
    const dish = dishes.find((entry) => entry.id === item.id);
    if (!dish) return '';
    return `<div class="cart-line"><div><b>${escapeHTML(dish.name)}</b><br><small>${rupiah(dish.price)} · ${item.qty} serving(s)</small></div><div class="qty-buttons"><button data-cart-id="${escapeHTML(item.id)}" data-change="-1">−</button><span>${item.qty}</span><button data-cart-id="${escapeHTML(item.id)}" data-change="1">+</button></div></div>`;
  }).join('') : '<p class="cart-empty">Your cart is empty. Add a dish from the menu to get started.</p>';
  const checkout = document.querySelector('#checkout-link');
  if (checkout) checkout.classList.toggle('disabled-link', !cart.length);
}
updateCart();
document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add]');
  if (addButton) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === addButton.dataset.add);
    if (item) item.qty += 1; else cart.push({ id: addButton.dataset.add, qty: 1 });
    save('bistroCart', cart);
    updateCart();
    showBottomCart();
    animateAddToCart(addButton);
  }
  const changeButton = event.target.closest('[data-change]');
  if (changeButton) {
    let cart = getCart();
    const item = cart.find((entry) => entry.id === changeButton.dataset.cartId);
    if (item) item.qty += Number(changeButton.dataset.change);
    cart = cart.filter((entry) => entry.qty > 0);
    save('bistroCart', cart);
    updateCart();
    renderCheckout();
  }
});
function openCart() { document.querySelector('#cart-drawer')?.classList.add('open'); document.querySelector('#drawer-backdrop')?.classList.add('open'); }
function closeCart() { document.querySelector('#cart-drawer')?.classList.remove('open'); document.querySelector('#drawer-backdrop')?.classList.remove('open'); }
function showBottomCart() {
  const dock = document.querySelector('#bottom-cart-dock');
  if (!dock) return;
  dock.hidden = false;
  requestAnimationFrame(() => dock.classList.add('visible'));
}
function hideBottomCart() {
  const dock = document.querySelector('#bottom-cart-dock');
  if (!dock) return;
  dock.classList.remove('visible');
  setTimeout(() => { dock.hidden = true; }, 320);
}
document.querySelector('#bottom-cart-view')?.addEventListener('click', openCart);
document.querySelector('#bottom-cart-close')?.addEventListener('click', hideBottomCart);
function animateAddToCart(button) {
  const image = button.closest('.dish-card')?.querySelector('img');
  const cartIcon = document.querySelector('#bottom-cart-icon');
  if (!image || !cartIcon || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = image.getBoundingClientRect();
  const to = cartIcon.getBoundingClientRect();
  const flyingImage = image.cloneNode();
  Object.assign(flyingImage.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, objectFit: 'contain', background: '#fff', padding: '8px', margin: '0', zIndex: '100', pointerEvents: 'none', borderRadius: '8px' });
  document.body.appendChild(flyingImage);
  const moveX = to.left + to.width / 2 - from.left - from.width / 2;
  const dock = document.querySelector('#bottom-cart-dock');
  const targetY = window.innerHeight - 24 - dock.getBoundingClientRect().height / 2;
  const moveY = targetY - from.top - from.height / 2;
  flyingImage.animate([
    { transform: 'translate3d(0, 0, 0) scale(1) rotate(0)', opacity: 1, offset: 0 },
    { transform: `translate3d(${moveX * .45}px, ${moveY * .45 - 42}px, 0) scale(.72) rotate(-5deg)`, opacity: .92, offset: .48 },
    { transform: `translate3d(${moveX}px, ${moveY}px, 0) scale(.18) rotate(4deg)`, opacity: 0, offset: 1 }
  ], { duration: 1050, easing: 'ease-in-out' }).finished.then(() => flyingImage.remove()).catch(() => flyingImage.remove());
  cartIcon.classList.remove('cart-bump');
  setTimeout(() => {
    cartIcon.classList.add('cart-bump');
    setTimeout(() => cartIcon.classList.remove('cart-bump'), 650);
  }, 930);
  button.closest('.dish-card')?.classList.add('dish-added');
  setTimeout(() => button.closest('.dish-card')?.classList.remove('dish-added'), 650);
}
document.querySelector('#cart-open')?.addEventListener('click', openCart);
document.querySelector('#cart-close')?.addEventListener('click', closeCart);
document.querySelector('#drawer-backdrop')?.addEventListener('click', closeCart);
const signedInUser = getUser();
if (signedInUser) {
  if (signedInUser.role === 'administrator') {
    const co = document.querySelector('#cart-open'); if (co) co.hidden = true;
    const cl = document.querySelector('#checkout-link'); if (cl) cl.hidden = true;
    document.querySelectorAll('[data-add]').forEach(btn => btn.hidden = true);
  }
  const signInLink = document.querySelector('#account-link');
  const signedInTools = document.querySelector('#signed-in-tools');
  if (signInLink) signInLink.hidden = true;
  if (signedInTools) signedInTools.hidden = false;
  const avatar = profileAvatar(signedInUser);
  const headerAvatar = document.querySelector('#header-avatar');
  if (headerAvatar) headerAvatar.src = avatar;
  const headerName = document.querySelector('#header-name');
  if (headerName) headerName.textContent = signedInUser.name;
  const adminLink = document.querySelector('#admin-link');
  if (adminLink) adminLink.hidden = signedInUser.role !== 'administrator';
  const ordersLink = document.querySelector('#client-orders-link');
  if (ordersLink) ordersLink.hidden = signedInUser.role !== 'client';
  const footerLink = document.querySelector('#footer-account-link');
  if (footerLink) footerLink.hidden = true;
}
document.querySelector('#logout-button')?.addEventListener('click', () => { localStorage.removeItem('bistroUser'); window.location.reload(); });
function profileAvatar(user) {
  if (user.photo) return user.photo;
  const initial = (user.name || 'G').trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const starterReviews = [
  { id: 'review-1', username: 'guest-1', name: 'Maya L.', rating: 5, text: 'The club sandwich was fresh and delicious. Such a warm, welcoming place.', photo: '' },
  { id: 'review-2', username: 'guest-2', name: 'Daniel R.', rating: 5, text: 'Great food, generous portions, and friendly service. I will be back!', photo: '' },
  { id: 'review-3', username: 'guest-3', name: 'Clara W.', rating: 4, text: 'Loved the pasta and the relaxed atmosphere. A lovely lunch spot.', photo: '' }
];
function renderReviews() {
  const list = document.querySelector('#reviews-list');
  if (!list) return;
  const reviews = starterReviews;
  list.innerHTML = reviews.length ? reviews.map((review) => {
    const photo = review.photo || profileAvatar({ name: review.name });
    return `<article class="review-card"><div class="review-top"><div class="review-avatar"><img src="${escapeHTML(photo)}" alt=""></div><div><b>${escapeHTML(review.name)}</b><div class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div></div></div><p>${escapeHTML(review.text)}</p></article>`;
  }).join('') : '';
}
renderReviews();
function showPhoto(photo) { document.querySelector('#lightbox-image').src = photo; document.querySelector('#photo-lightbox').hidden = false; }
document.querySelector('#photo-close')?.addEventListener('click', () => { document.querySelector('#photo-lightbox').hidden = true; });
document.querySelector('#photo-lightbox')?.addEventListener('click', (event) => { if (event.target.id === 'photo-lightbox') event.currentTarget.hidden = true; });
function applyTheme() {
  const dark = localStorage.getItem('bistroTheme') === 'dark';
  document.body.classList.toggle('dark-theme', dark);
  document.querySelectorAll('#theme-toggle').forEach((button) => { button.textContent = dark ? '\u2600\uFE0F' : '\uD83C\uDF19'; button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); });
}
applyTheme();
document.querySelectorAll('#theme-toggle').forEach((button) => button.addEventListener('click', () => {
  localStorage.setItem('bistroTheme', document.body.classList.contains('dark-theme') ? 'light' : 'dark');
  applyTheme();
}));
const loginForm = document.querySelector('#login-form');
loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#username').value.trim();
  const password = document.querySelector('#password').value;
  const users = read('bistroUsers', []);
  const user = username === adminAccount.username && password === adminAccount.password
    ? adminAccount : username === clientAccount.username && password === clientAccount.password
    ? clientAccount : users.find((account) => account.username === username && account.password === password);
  if (!user) { document.querySelector('#login-error').textContent = 'Username or password is incorrect. Try again or create a client account.'; return; }
  save('bistroUser', user);
  window.location.href = 'index.html';
});
document.querySelector('#show-signup')?.addEventListener('click', () => {
  document.querySelector('#login-panel').hidden = true;
  document.querySelector('#signup-panel').hidden = false;
});
document.querySelector('#show-login')?.addEventListener('click', () => {
  document.querySelector('#signup-panel').hidden = true;
  document.querySelector('#login-panel').hidden = false;
});
document.querySelector('#signup-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#signup-name').value.trim();
  const username = document.querySelector('#signup-username').value.trim();
  const password = document.querySelector('#signup-password').value;
  const users = read('bistroUsers', []);
  if (username.toLowerCase() === 'admin') { document.querySelector('#signup-error').textContent = 'That username is reserved. Please choose another one.'; return; }
  if (users.some((account) => account.username.toLowerCase() === username.toLowerCase())) { document.querySelector('#signup-error').textContent = 'That username is already registered. Please sign in.'; return; }
  const user = { name, username, password, role: 'client' };
  users.push(user);
  save('bistroUsers', users);
  save('bistroUser', user);
  window.location.href = 'index.html';
});
const orderRows = document.querySelector('#orders-list');
if (orderRows) {
  const user = getUser();
  if (!user) window.location.href = 'login.html';
  else {
    const isAdmin = user.role === 'administrator';
    const allOrders = getOrders();
    let currentFilter = 'Active';
    if (isAdmin) document.body.classList.add('admin-mode');
    const adminBadge = document.querySelector('#admin-badge');
    if (adminBadge) adminBadge.hidden = !isAdmin;
    const dashboardNavLink = document.querySelector('#dashboard-nav-link');
    if (dashboardNavLink) dashboardNavLink.textContent = isAdmin ? 'Admin panel' : 'My orders';
    document.title = isAdmin ? 'Admin panel | Bistro Eleven' : 'My orders | Bistro Eleven';
    document.querySelector('#role-label').textContent = isAdmin ? 'RESTAURANT MANAGEMENT' : 'CLIENT ACCOUNT · BISTRO ELEVEN';
    document.querySelector('#welcome-title').textContent = isAdmin ? 'Administrator Portal' : `Hello, ${user.name}.`;
    document.querySelector('#welcome-copy').textContent = isAdmin ? '' : 'Browse dishes, place an order, and follow its progress.';
    document.querySelector('#orders-title').textContent = isAdmin ? 'Customer Orders' : 'My orders';
    document.querySelector('#new-order-link').hidden = isAdmin;
    const adminMenuTools = document.querySelector('#add-new-item');
    if (adminMenuTools) adminMenuTools.hidden = !isAdmin;
    const filterTabs = document.querySelector('#order-filters');
    if (filterTabs) filterTabs.hidden = !isAdmin;
    const renderDashboard = () => {
      const orders = getOrders();
      const visibleOrders = isAdmin ? orders : orders.filter((order) => order.username === user.username);
      if (isAdmin) {
        const completedOrders = orders.filter(o => o.status === 'Completed');
        const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
        const preparingCount = orders.filter(o => o.status === 'Preparing' || o.status === 'New').length;
        document.querySelector('#stats-grid').innerHTML = `
          <div class="stat-card pointer" id="card-total-sales" style="padding: 24px; text-align: center; flex: 1;">
            <p style="font-size:11px; margin-bottom:8px; color:var(--muted); font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Total Sales</p>
            <h3 style="font-size:24px; margin:0 0 8px;">${rupiah(revenue)}</h3>
            <p style="font-size:12px; color:var(--red);">↙ Click for details</p>
          </div>
          <div class="stat-card pointer" id="card-incoming" style="padding: 24px; text-align: center; flex: 1;">
            <p style="font-size:11px; margin-bottom:8px; color:var(--muted); font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Incoming Orders</p>
            <h3 style="font-size:24px; margin:0 0 8px;">${preparingCount} Active</h3>
            <p style="font-size:12px; color:var(--red);">↓ Click to manage queue</p>
          </div>
          <div class="stat-card pointer" id="card-add-item" style="padding: 24px; text-align: center; flex: 1;">
            <p style="font-size:11px; margin-bottom:8px; color:var(--muted); font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Add New Item</p>
            <h3 style="font-size:24px; margin:0 0 8px;">Quick Entry</h3>
            <p style="font-size:12px; color:var(--red);">↓ Click to add item</p>
          </div>
        `;
        document.querySelector('#card-total-sales')?.addEventListener('click', () => {
          const list = document.querySelector('#completed-list');
          list.innerHTML = completedOrders.length ? completedOrders.map(o => `<div style="border-bottom: 1px solid var(--line); padding: 8px 0; display:flex; justify-content:space-between"><span><b>${o.id}</b> - ${o.customer}</span><span>${rupiah(o.total)}</span></div>`).join('') : '<p class="muted">No completed transactions.</p>';
          document.querySelector('#completed-modal').hidden = false;
        });
        document.querySelector('#card-incoming')?.addEventListener('click', () => document.querySelector('#orders').scrollIntoView({behavior: 'smooth'}));
        document.querySelector('#card-add-item')?.addEventListener('click', () => document.querySelector('#add-new-item').scrollIntoView({behavior: 'smooth'}));
        document.querySelector('#completed-close')?.addEventListener('click', () => { document.querySelector('#completed-modal').hidden = true; });
      } else {
        const stats = [['My orders', visibleOrders.length], ['In progress', visibleOrders.filter((order) => order.status !== 'Completed').length], ['Dishes available', getDishes().length]];
        document.querySelector('#stats-grid').innerHTML = stats.map(([label, value]) => `<div class="stat-card"><span>${label}</span><b>${value}</b></div>`).join('');
      }
      let filteredOrders = visibleOrders;
      if (isAdmin) {
        if (currentFilter === 'Active') filteredOrders = visibleOrders.filter(o => o.status === 'New' || o.status === 'Preparing');
        else if (currentFilter === 'Completed') filteredOrders = visibleOrders.filter(o => o.status === 'Completed' || o.status === 'Cancelled');
      }
      document.querySelector('#empty-orders').hidden = filteredOrders.length > 0;
      orderRows.innerHTML = filteredOrders.map((order) => {
        try {
          const typeDest = order.type === 'Dine-in' 
            ? `<span class="terracotta">${escapeHTML(order.location)}</span>` 
            : `<span class="warm-slate">${escapeHTML(order.location)}</span>`;
          const safeItems = order.items || [];
          const itemsList = safeItems.map(item => `<b>${item.qty || item.quantity || 1}×</b> ${escapeHTML(item.name)}`).join('<br>');
          const notesHtml = order.notes ? `<br><small style="font-style:italic">📝 Note: "${escapeHTML(order.notes)}"</small>` : '';
        const badgeClass = order.status === 'New' ? 'bg-new' : order.status === 'Preparing' ? 'bg-preparing' : order.status === 'Completed' ? 'bg-completed' : 'bg-cancelled';
        const badge = `<span class="badge-status ${badgeClass}">${escapeHTML(order.status)}</span>`;
        let actionHtml = `<span class="label-archived">Archived</span>`;
        if (isAdmin && order.status !== 'Completed' && order.status !== 'Cancelled') {
          actionHtml = `
            <button class="button-action btn-complete" data-action="Completed" data-id="${escapeHTML(order.id)}">Complete</button>
            <button class="button-action btn-cancel" data-action="Cancelled" data-id="${escapeHTML(order.id)}">Cancel</button>
          `;
        } else if (!isAdmin) {
          actionHtml = '-';
        }
        return `<tr>
          <td><b>${escapeHTML(order.id)}</b></td>
          <td>${escapeHTML(order.customer)}</td>
          <td>${escapeHTML(order.type)}<br>${typeDest}</td>
          <td>${itemsList}${notesHtml}</td>
          <td>${rupiah(order.total)}</td>
          <td>${badge}</td>
          <td>${actionHtml}</td>
        </tr>`;
      } catch (e) {
        console.error("Error rendering order", order, e);
        return `<tr><td colspan="7">Error rendering order ${escapeHTML(order.id)}</td></tr>`;
      }
    }).join('');
    };
    renderDashboard();
    const filterTabsContainer = document.querySelector('#order-filters');
    if (filterTabsContainer) {
      filterTabsContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-tab')) return;
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderDashboard();
      });
    }
    orderRows.addEventListener('click', (event) => {
      const btn = event.target.closest('.button-action');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (id && action) {
        save('adminOrders', getOrders().map((order) => order.id === id ? { ...order, status: action } : order));
        renderDashboard();
      }
    });
    renderAdminDishes();
  }
}
function renderAdminDishes() {
  const list = document.querySelector('#admin-dish-list');
  if (!list) return;
  list.innerHTML = '<h4>Current menu</h4>' + getDishes().map((dish) => `<div class="admin-dish-row"><span class="admin-dish-info"><img src="${escapeHTML(dish.image)}" alt=""><span>${escapeHTML(dish.name)} · ${rupiah(dish.price)}</span></span><button class="remove-dish" data-remove-dish="${escapeHTML(dish.id)}">Delete</button></div>`).join('');
}
const dishPhotoInput = document.querySelector('#new-dish-photo');
dishPhotoInput?.addEventListener('change', () => {
  const file = dishPhotoInput.files[0];
  const message = document.querySelector('#menu-error');
  const preview = document.querySelector('#new-dish-preview');
  message.textContent = '';
  if (!file) { preview.hidden = true; return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
    message.textContent = 'Choose a JPG, PNG, or WebP image up to 1 MB.';
    dishPhotoInput.value = '';
    preview.hidden = true;
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});
document.querySelector('#add-dish-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#new-dish-name').value.trim();
  const price = Number(document.querySelector('#new-dish-price').value);
  const description = document.querySelector('#new-dish-description').value.trim();
  const file = dishPhotoInput.files[0];
  if (!file) { document.querySelector('#menu-error').textContent = 'Choose a photo for this dish.'; return; }
  const reader = new FileReader();
  const image = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  }).catch(() => null);
  if (!image) { document.querySelector('#menu-error').textContent = 'The photo could not be read. Please choose another file.'; return; }
  const dishes = getDishes();
  dishes.push({ id: 'custom-' + Date.now(), name, description, price, image });
  try {
    save('adminDishes', dishes);
    event.target.reset();
    document.querySelector('#new-dish-preview').hidden = true;
    document.querySelector('#menu-error').textContent = '';
    renderAdminDishes();
    alert('The dish and its photo were added to the catalog.');
  } catch {
    document.querySelector('#menu-error').textContent = 'Browser storage is full. Please choose a smaller photo.';
  }
});
document.querySelector('#admin-dish-list')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-dish]');
  if (!button) return;
  save('adminDishes', getDishes().filter((dish) => dish.id !== button.dataset.removeDish));
  renderAdminDishes();
});
function renderCheckout() {
  const list = document.querySelector('#checkout-items');
  if (!list) return;
  const dishes = getDishes();
  const cart = getCart();
  list.innerHTML = cart.length ? cart.map((item) => {
    const dish = dishes.find((entry) => entry.id === item.id);
    return dish ? `<div class="checkout-row"><span>${escapeHTML(dish.name)} × ${item.qty}</span><b>${rupiah(dish.price * item.qty)}</b></div>` : '';
  }).join('') : '<p class="cart-empty">Your cart is empty. <a href="index.html#menu">Browse the menu.</a></p>';
  document.querySelector('#order-total').textContent = rupiah(cart.reduce((sum, item) => sum + (dishes.find((dish) => dish.id === item.id)?.price || 0) * item.qty, 0));
}
const orderType = document.querySelector('#order-type');
orderType?.addEventListener('change', () => {
  const isDelivery = orderType.value === 'Delivery';
  document.querySelector('#delivery-fields').classList.toggle('active', isDelivery);
  document.querySelector('#dinein-fields').classList.toggle('active', !isDelivery);
  document.querySelector('#address').required = isDelivery;
  document.querySelector('#table-number').required = !isDelivery;
});
const orderForm = document.querySelector('#order-form');
if (orderForm) {
  const user = getUser();
  if (!user) window.location.href = 'login.html';
  else if (user.role === 'administrator') window.location.href = 'dashboard.html';
  else {
    document.querySelector('#customer-name').value = user.name;
    renderCheckout();
    orderForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const cart = getCart();
      if (!cart.length) { document.querySelector('#order-message').textContent = 'Your cart is empty. Return to the menu to choose a dish.'; return; }
      const dishes = getDishes();
      const items = cart.map((item) => {
        const dish = dishes.find((entry) => entry.id === item.id);
        return { id: item.id, name: dish.name, price: dish.price, qty: item.qty };
      });
      const isDelivery = orderType.value === 'Delivery';
      const location = isDelivery ? document.querySelector('#address').value.trim() : `Table ${document.querySelector('#table-number').value}`;
      const order = {
        id: 'BE-' + String(Date.now()).slice(-6), username: user.username,
        customer: document.querySelector('#customer-name').value.trim(), items,
        total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
        type: orderType.value, location, notes: document.querySelector('#notes').value.trim(),
        payment: document.querySelector('#payment-method').value, status: 'New'
      };
      const submitButton = orderForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      document.querySelector('#processing-modal').hidden = false;
      setTimeout(() => {
        save('adminOrders', [order, ...getOrders()]);
        save('bistroCart', []);
        document.querySelector('#bill-id').textContent = `Order ${order.id}`;
        document.querySelector('#bill-details').innerHTML = `<span>${escapeHTML(order.customer)}</span><span>${escapeHTML(order.type)} · ${escapeHTML(order.location)}</span><span>Payment: ${escapeHTML(order.payment)}</span>`;
        document.querySelector('#bill-lines').innerHTML = order.items.map((item) => `<div class="bill-row"><span>${item.qty} × ${escapeHTML(item.name)}</span><b>${rupiah(item.price * item.qty)}</b></div>`).join('');
        document.querySelector('#bill-total').textContent = rupiah(order.total);
        document.querySelector('#processing-modal').hidden = true;
        document.querySelector('#bill-modal').hidden = false;
        updateCart();
      }, 1500);
    });
  }
}
function closeBill() { document.querySelector('#bill-modal').hidden = true; window.location.href = 'index.html'; }
document.querySelector('#bill-close')?.addEventListener('click', closeBill);
document.querySelector('#bill-done')?.addEventListener('click', closeBill);
document.querySelector('#logout')?.addEventListener('click', () => localStorage.removeItem('bistroUser'));



