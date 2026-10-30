import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Header({ user, toggleTheme, theme, setIsCartOpen, cart, logout, isFavoritesOnly, setIsFavoritesOnly }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'administrator';
  const isClient = user?.role === 'client';
  const cartCount = cart ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;

  const profileAvatar = () => {
    if (user?.photo) return user.photo;
    const initial = (user?.name || 'G').trim().charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${initial}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const handleScroll = (id) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo(0,0);
    }, 100);
  };

  const openSearch = () => {
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
        window.setTimeout(() => document.getElementById('menu-search')?.focus(), 350);
      }, 120);
      return;
    }
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => document.getElementById('menu-search')?.focus(), 350);
  };

  const openCart = () => {
    if (isClient) setIsCartOpen(true);
    else if (!isAdmin) navigate('/login');
  };

  const toggleFavorites = () => {
    setIsFavoritesOnly(value => !value);
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => handleScroll('menu'), 120);
    } else handleScroll('menu');
  };

  return (
    <header className="site-header">
      <Link className="brand" to="/" onClick={() => window.scrollTo(0,0)}>
        <span className="brand-mark">B</span>
        BISTRO <b>ELEVEN</b>
        {isAdmin && <span className="admin-badge">ADMIN</span>}
      </Link>
      <nav>
        {location.pathname === '/login' ? (
          <Link to="/" onClick={() => window.scrollTo(0,0)}><span>&larr;</span> Back to restaurant</Link>
        ) : location.pathname === '/dashboard' ? (
          <>
            <Link to="/" onClick={() => window.scrollTo(0,0)}>Restaurant</Link>
            <Link className="active" to="/dashboard">{isAdmin ? 'Admin panel' : 'My orders'}</Link>
            <Link to="/account">Account settings</Link>
            <button className="login-link" id="logout" onClick={logout}>Sign out <span>&rarr;</span></button>
          </>
        ) : location.pathname === '/checkout' ? (
          <>
            <Link to="/" onClick={() => handleScroll('menu')}>Menu</Link>
            <Link to="/" onClick={() => window.scrollTo(0,0)}>Restaurant</Link>
            <Link to="/account">Account settings</Link>
            <button className="login-link" id="logout" onClick={logout}>Sign out <span>&rarr;</span></button>
          </>
        ) : (
          <>
            <Link to="/" onClick={() => handleScroll('menu')}>Menu</Link>
            <Link to="/" onClick={() => handleScroll('reviews')}>Reviews</Link>
            {isClient && <Link to="/dashboard" id="client-orders-link">My orders</Link>}
            {isAdmin && <Link to="/dashboard" id="admin-link">Admin panel</Link>}
            
            {!isAdmin && (
              <button className="cart-open" id="cart-open" onClick={() => setIsCartOpen(true)}>
                Cart
                <span id="cart-count">{cartCount}</span>
              </button>
            )}

            {!user ? (
              <Link className="login-link" id="account-link" to="/login">Sign in <span>&rarr;</span></Link>
            ) : (
              <div className="signed-in-tools" id="signed-in-tools">
                <Link className="profile-trigger" to="/account" title="Account settings">
                  <img id="header-avatar" alt="Profile photo" src={profileAvatar()} />
                  <span id="header-name">{user.name}</span>
                </Link>
                <button id="logout-button" className="logout-button" onClick={logout}>Sign out</button>
              </div>
            )}
          </>
        )}
        <button id="theme-toggle" className="theme-toggle" aria-label="Switch color theme" onClick={toggleTheme}>
          {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
      </nav>
      <div className="mobile-header-tools" aria-label="Quick actions">
        <button className="mobile-header-icon" aria-label="Search menu" onClick={openSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.3 16.3 4.2 4.2"/></svg>
        </button>
        <button className={`mobile-header-icon ${isFavoritesOnly ? 'is-selected' : ''}`} aria-label={isFavoritesOnly ? 'Show all dishes' : 'Show favorite dishes'} aria-pressed={isFavoritesOnly} onClick={toggleFavorites}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/></svg>
        </button>
        <button className="mobile-header-icon mobile-theme-toggle" aria-label="Switch color theme" onClick={toggleTheme}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{theme === 'dark' ? <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a8.6 8.6 0 1 0 11.7 11.7Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}</svg>
        </button>
        {!isAdmin && <button className="mobile-header-icon mobile-cart-button" aria-label={`Open basket, ${cartCount} items`} onClick={openCart}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h2l2.5 12.2a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.9-1.4L22 8H5"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
          {cartCount > 0 && <i>{cartCount}</i>}
        </button>}
        <Link className="mobile-header-icon mobile-profile-button" to={user ? '/account' : '/login'} aria-label={user ? 'Account settings' : 'Sign in'}>
          {user ? <img src={profileAvatar()} alt="" /> : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>}
        </Link>
      </div>
    </header>
  );
}
