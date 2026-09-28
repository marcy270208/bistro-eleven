import { Link, useLocation } from 'react-router-dom';

export default function Header({ user, toggleTheme, theme, setIsCartOpen, cart, logout }) {
  const location = useLocation();
  const isAdmin = user?.role === 'administrator';
  const isClient = user?.role === 'client';
  const cartCount = cart ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;

  const profileAvatar = () => {
    if (user?.photo) return user.photo;
    const initial = (user?.name || 'G').trim().charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${initial}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark">B</span>
        BISTRO <b>ELEVEN</b>
        {isAdmin && <span className="admin-badge">ADMIN</span>}
      </Link>
      <nav>
        {location.pathname === '/login' ? (
          <Link to="/"><span>&larr;</span> Back to restaurant</Link>
        ) : location.pathname === '/dashboard' ? (
          <>
            <Link to="/"></Link>
            <Link className="active" to="/dashboard">{isAdmin ? 'Admin panel' : 'My orders'}</Link>
            <button className="login-link" id="logout" onClick={logout}>Sign out <span>&rarr;</span></button>
          </>
        ) : location.pathname === '/checkout' ? (
          <>
            <Link to="/"></Link>
            <Link to="/">Restaurant</Link>
            <button className="login-link" id="logout" onClick={logout}>Sign out <span>&rarr;</span></button>
          </>
        ) : (
          <>
            <Link to="/"></Link>
            <Link to="/"></Link>
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
                <div className="profile-trigger">
                  <img id="header-avatar" alt="Profile photo" src={profileAvatar()} />
                  <span id="header-name">{user.name}</span>
                </div>
                <button id="logout-button" className="logout-button" onClick={logout}>Sign out</button>
              </div>
            )}
          </>
        )}
        <button id="theme-toggle" className="theme-toggle" aria-label="Switch color theme" onClick={toggleTheme}>
          {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
      </nav>
    </header>
  );
}
