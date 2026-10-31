import React, { useEffect, useState } from 'react';
import DishCard from '../components/DishCard';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

const Home = ({ dishes, addToCart, user, token, favoriteDishIds, setFavoriteDishIds, isFavoritesOnly, setIsFavoritesOnly }) => {
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadReviews = () => api('/api/reviews').then(data => { setReviews(data); setReviewError(''); }).catch(() => setReviewError('Reviews are temporarily unavailable.'));
  useEffect(() => { loadReviews(); }, []);

  const submitReview = async (event) => {
    event.preventDefault(); setReviewBusy(true); setReviewError('');
    try {
      await api('/api/reviews', { method: 'POST', token, body: JSON.stringify({ rating: Number(rating), text: reviewText.trim() }) });
      setReviewText(''); await loadReviews();
    } catch (error) { setReviewError(error.message); }
    finally { setReviewBusy(false); }
  };

  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) && (!isFavoritesOnly || favoriteDishIds.includes(d.id)));
  const recentReviews = reviews.filter(review => {
    const date = new Date(String(review.createdAt || '').replace(' ', 'T') + 'Z');
    return Number.isFinite(date.getTime()) && Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const averageRating = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  return (
    <main>
      <section className="hero">
        <div className="hero-shade"></div>
        <div className="hero-content">
          <p className="eyebrow">GOOD FOOD &bull; GOOD COMPANY</p>
          <h1>Made for<br /><em>good moments.</em></h1>
          <p className="hero-copy">
            Fresh ingredients, comforting favorites, and a table always ready for you at Bistro Eleven.
          </p>
          <button className="button button-red" onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore the menu <span>&darr;</span>
          </button>
        </div>
        <div className="hero-note">FRESHLY MADE<br /><b>EVERY DAY</b></div>
      </section>

      <section className="menu-section" id="menu">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FROM OUR KITCHEN</p>
            <h2>House favorites</h2>
          </div>
          <div className="menu-tools">
            <p>Simple food, made with care.<br />Choose a dish to get started.</p>
            <input
              id="menu-search"
              placeholder="Search the menu..." 
              aria-label="Search the menu"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="menu-grid">
          {filtered.length ? filtered.map(dish => (
            <DishCard
              key={dish.id}
              dish={dish}
              addToCart={addToCart}
              isFavorite={favoriteDishIds.includes(dish.id)}
              onToggleFavorite={() => setFavoriteDishIds(ids => ids.includes(dish.id) ? ids.filter(id => id !== dish.id) : [...ids, dish.id])}
            />
          )) : (
            <div className="empty-state menu-empty-state">
              <p>{isFavoritesOnly ? 'No favorite dishes yet. Tap the heart on a dish to save one.' : 'No dishes found.'}</p>
              {isFavoritesOnly && <button onClick={() => setIsFavoritesOnly(false)}>Browse the full menu</button>}
            </div>
          )}
        </div>
      </section>

      <section className="story">
        <span>11</span>
        <div>
          <p className="eyebrow">BISTRO ELEVEN</p>
          <h2>A little place for<br />a lot of flavor.</h2>
        </div>
      </section>
      
      <section className="reviews-section" id="reviews">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GUEST BOOK</p>
            <h2>What people said</h2>
          </div>
          <p>Stories shared by our Bistro Eleven guests.</p>
        </div>
        {reviews.length > 0 && (
          <div className="review-summary" aria-label={`Average rating ${averageRating} from ${reviews.length} reviews`}>
            <b>{averageRating}</b>
            <div>
              <span className="review-summary-stars" aria-hidden="true">★★★★★</span>
              <small>{recentReviews ? `${recentReviews} reviews · last 30 days` : `${reviews.length} guest reviews`}</small>
            </div>
          </div>
        )}
        {user?.role === 'client' && !user.photo && (
          <div className="review-form-panel">
            <h3>Add a profile photo to review</h3>
            <p className="muted">Your profile photo will appear next to your review.</p>
            <Link className="button button-red" to="/account">Open account settings <span>&rarr;</span></Link>
          </div>
        )}
        {user?.role === 'client' && user.photo && (
          <section className="review-form-panel">
            <h3>Share your experience</h3>
            <form onSubmit={submitReview}>
              <label htmlFor="review-rating">Rating</label>
              <select id="review-rating" value={rating} onChange={e => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} stars</option>)}
              </select>
              <label htmlFor="review-text">Your review</label>
              <textarea id="review-text" required maxLength={1000} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Tell us about your visit" />
              {reviewError && <p className="error" role="alert">{reviewError}</p>}
              <button className="button button-red" type="submit" disabled={reviewBusy}>{reviewBusy ? 'Sending…' : 'Post review'}</button>
            </form>
          </section>
        )}
        <p className="error" role="status">{reviewError && !user ? reviewError : ''}</p>
        <div id="reviews-list" className="reviews-grid">
          {reviews.length === 0 ? <p className="empty-state">No reviews yet. Be the first to share your experience.</p> : reviews.map(r => (
            <article key={r.id} className="review-card">
              <div className="review-card-heading">
                <div className="review-avatar">
                  <img src={r.photo || `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${r.name.charAt(0)}</text></svg>`)}`} alt={`${r.name} profile`} />
                </div>
                <div className="review-author">
                  <b>{r.name}</b>
                  <time dateTime={r.createdAt}>{new Date(String(r.createdAt || '').replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </div>
                <div className="review-stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}<span>{'★'.repeat(5 - r.rating)}</span></div>
              </div>
              <blockquote>{r.text}</blockquote>
            </article>
          ))}
        </div>
      </section>

      <footer><div>&copy; 2026 Bistro Eleven. All rights reserved.</div></footer>
    </main>
  );
};

export default Home;
