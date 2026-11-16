import React, { useEffect, useState } from 'react';
import DishCard from '../components/DishCard';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';

const Home = ({ dishes, dishesLoading, dishesError, onRetryDishes, addToCart, user, token, favoriteDishIds, setFavoriteDishIds, isFavoritesOnly, setIsFavoritesOnly }) => {
  const { isId } = useLanguage();
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState('5');
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadReviews = () => {
    setReviewsLoading(true);
    return api('/api/reviews')
      .then((data) => {
        setReviews(data);
        setReviewError('');
      })
      .catch(() =>
        setReviewError(
          isId ? 'Ulasan sementara tidak tersedia.' : 'Reviews are temporarily unavailable.'
        )
      )
      .finally(() => setReviewsLoading(false));
  };
  useEffect(() => {
    loadReviews();
  }, []);

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewBusy(true);
    setReviewError('');
    try {
      await api('/api/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify({ rating: Number(rating), text: reviewText.trim() }),
      });
      setReviewText('');
      await loadReviews();
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm(isId ? 'Hapus ulasan pelanggan ini?' : 'Delete this customer review?')) return;
    try {
      await api(`/api/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE', token });
      setReviews((current) => current.filter((item) => item.id !== reviewId));
    } catch (error) {
      alert(error.message || (isId ? 'Gagal menghapus ulasan.' : 'Could not delete review.'));
    }
  };

  const filtered = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) &&
      (!isFavoritesOnly || favoriteDishIds.includes(d.id))
  );
  const recentReviews = reviews.filter((review) => {
    const date = new Date(String(review.createdAt || '').replace(' ', 'T') + 'Z');
    return Number.isFinite(date.getTime()) && Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <main>
      <section className="hero">
        <div className="hero-shade"></div>
        <div className="hero-content">
          <p className="eyebrow">
            {isId ? 'MAKANAN LEZAT \u2022 SUASANA HANGAT' : 'GOOD FOOD \u2022 GOOD COMPANY'}
          </p>
          <h1>
            {isId ? (
              <>
                Dibuat untuk
                <br />
                <em>momen terbaik.</em>
              </>
            ) : (
              <>
                Made for
                <br />
                <em>good moments.</em>
              </>
            )}
          </h1>
          <p className="hero-copy">
            {isId
              ? 'Bahan-bahan segar, hidangan favorit yang menenangkan, dan meja yang selalu siap untukmu di Bistro Eleven.'
              : 'Fresh ingredients, comforting favorites, and a table always ready for you at Bistro Eleven.'}
          </p>
          <button
            className="button button-red"
            onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {isId ? 'Jelajahi menu' : 'Explore the menu'} <span>&darr;</span>
          </button>
        </div>
        <div className="hero-note">
          {isId ? (
            <>
              DIBUAT SEGAR
              <br />
              <b>SETIAP HARI</b>
            </>
          ) : (
            <>
              FRESHLY MADE
              <br />
              <b>EVERY DAY</b>
            </>
          )}
        </div>
      </section>

      <section className="menu-section" id="menu">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}</p>
            <h2>{isId ? 'Menu andalan kami' : 'House favorites'}</h2>
          </div>
          <div className="menu-tools">
            <p>
              {isId ? (
                <>
                  Masakan hangat, dibuat sepenuh hati.
                  <br />
                  Pilih hidangan untuk mulai memesan.
                </>
              ) : (
                <>
                  Simple food, made with care.
                  <br />
                  Choose a dish to get started.
                </>
              )}
            </p>
            <input
              id="menu-search"
              placeholder={isId ? 'Cari menu...' : 'Search the menu...'}
              aria-label={isId ? 'Cari menu' : 'Search the menu'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {dishesError && (
          <div className="empty-state" role="alert" style={{ marginBottom: '20px' }}>
            <p className="error" style={{ marginBottom: '10px' }}>
              {isId ? 'Gagal memuat menu terbaru dari server.' : dishesError}
            </p>
            {onRetryDishes && (
              <button type="button" className="filter-tab active" onClick={onRetryDishes}>
                {isId ? 'Coba lagi' : 'Retry'}
              </button>
            )}
          </div>
        )}
        <div className="menu-grid">
          {dishesLoading && filtered.length === 0 ? (
            <div className="empty-state menu-empty-state">
              <p>{isId ? 'Memuat menu dari server...' : 'Loading menu from server...'}</p>
            </div>
          ) : filtered.length ? (
            filtered.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                addToCart={addToCart}
                isFavorite={favoriteDishIds.includes(dish.id)}
                onToggleFavorite={() =>
                  setFavoriteDishIds((ids) =>
                    ids.includes(dish.id) ? ids.filter((id) => id !== dish.id) : [...ids, dish.id]
                  )
                }
              />
            ))
          ) : (
            <div className="empty-state menu-empty-state">
              <p>
                {isFavoritesOnly
                  ? isId
                    ? 'Belum ada menu favorit. Ketuk ikon hati pada menu untuk menyimpannya.'
                    : 'No favorite dishes yet. Tap the heart on a dish to save one.'
                  : isId
                    ? 'Menu tidak ditemukan.'
                    : 'No dishes found.'}
              </p>
              {isFavoritesOnly && (
                <button onClick={() => setIsFavoritesOnly(false)}>
                  {isId ? 'Lihat semua menu' : 'Browse the full menu'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="story">
        <span>11</span>
        <div>
          <p className="eyebrow">BISTRO ELEVEN</p>
          <h2>
            {isId ? (
              <>
                Tempat nyaman untuk
                <br />
                sejuta cita rasa.
              </>
            ) : (
              <>
                A little place for
                <br />a lot of flavor.
              </>
            )}
          </h2>
        </div>
        <p className="story-note">
          {isId
            ? 'Dimasak segar setiap hari dari bahan pilihan — siap dinikmati di tempat maupun diantar hangat.'
            : 'Freshly prepared every day with seasonal ingredients — crafted for both dine-in and warm delivery.'}
        </p>
      </section>

      <section className="reviews-section" id="reviews">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isId ? 'BUKU TAMU' : 'GUEST BOOK'}</p>
            <h2>{isId ? 'Kata pelanggan kami' : 'What people said'}</h2>
          </div>
          <p>
            {isId
              ? 'Cerita dan pengalaman dari para pelanggan Bistro Eleven.'
              : 'Stories shared by our Bistro Eleven guests.'}
          </p>
        </div>
        {reviews.length > 0 && (
          <div
            className="review-summary"
            aria-label={`Average rating ${averageRating} from ${reviews.length} reviews`}
          >
            <b>{averageRating}</b>
            <div>
              <span className="review-summary-stars" aria-hidden="true">
                ★★★★★
              </span>
              <small>
                {recentReviews
                  ? isId
                    ? `${recentReviews} ulasan · 30 hari terakhir`
                    : `${recentReviews} reviews · last 30 days`
                  : isId
                    ? `${reviews.length} ulasan pelanggan`
                    : `${reviews.length} guest reviews`}
              </small>
            </div>
          </div>
        )}
        {!user && (
          <div className="review-form-panel">
            <h3>{isId ? 'Masuk untuk memberi ulasan' : 'Sign in to leave a review'}</h3>
            <p className="muted">
              {isId
                ? 'Masuk ke akun pelangganmu untuk membagikan pengalaman makan di Bistro Eleven.'
                : 'Sign in with your customer account to share your Bistro Eleven dining experience.'}
            </p>
            <Link className="button button-red" to="/login">
              {isId ? 'Masuk sekarang' : 'Sign in'} <span>&rarr;</span>
            </Link>
          </div>
        )}
        {user?.role === 'client' && (
          <section className="review-form-panel">
            <h3>{isId ? 'Bagikan pengalamanmu' : 'Share your experience'}</h3>
            <form onSubmit={submitReview}>
              <label htmlFor="review-rating">Rating</label>
              <select id="review-rating" value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} {isId ? 'bintang' : 'stars'}
                  </option>
                ))}
              </select>
              <label htmlFor="review-text">{isId ? 'Ulasanmu' : 'Your review'}</label>
              <textarea
                id="review-text"
                required
                maxLength={1000}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={isId ? 'Ceritakan pengalaman makanmu di sini' : 'Tell us about your visit'}
              />
              {reviewError && (
                <p className="error" role="alert">
                  {reviewError}
                </p>
              )}
              <button className="button button-red" type="submit" disabled={reviewBusy}>
                {reviewBusy ? (isId ? 'Mengirim…' : 'Sending…') : isId ? 'Kirim ulasan' : 'Post review'}
              </button>
            </form>
          </section>
        )}
        {reviewError && !user && (
          <div className="empty-state" role="status" style={{ padding: '12px 0' }}>
            <p className="error" style={{ marginBottom: '8px' }}>{reviewError}</p>
            <button type="button" className="filter-tab" onClick={loadReviews}>
              {isId ? 'Muat ulang ulasan' : 'Retry'}
            </button>
          </div>
        )}
        <div id="reviews-list" className="reviews-grid">
          {reviewsLoading ? (
            <p className="empty-state">
              {isId ? 'Memuat ulasan pelanggan...' : 'Loading guest reviews...'}
            </p>
          ) : reviews.length === 0 ? (
            <p className="empty-state">
              {isId
                ? 'Belum ada ulasan. Jadilah yang pertama membagikan pengalamanmu!'
                : 'No reviews yet. Be the first to share your experience.'}
            </p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="review-card">
                <div className="review-card-heading">
                  <div className="review-avatar">
                    <img
                      src={
                        r.photo ||
                        `data:image/svg+xml,${encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${r.name.charAt(
                            0
                          )}</text></svg>`
                        )}`
                      }
                      alt={`${r.name} profile`}
                    />
                  </div>
                  <div className="review-author">
                    <b>{r.name}</b>
                    <time dateTime={r.createdAt}>
                      {new Date(String(r.createdAt || '').replace(' ', 'T') + 'Z').toLocaleDateString(
                        isId ? 'id-ID' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </time>
                  </div>
                  <div className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
                    {'★'.repeat(r.rating)}
                    <span>{'★'.repeat(5 - r.rating)}</span>
                  </div>
                </div>
                <blockquote>{r.text}</blockquote>
                {user?.role === 'administrator' && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="remove-dish"
                      onClick={() => deleteReview(r.id)}
                    >
                      {isId ? 'Hapus ulasan' : 'Delete review'}
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <footer>
        <div>
          &copy; 2026 Bistro Eleven. {isId ? 'Hak cipta dilindungi.' : 'All rights reserved.'}
        </div>
      </footer>
    </main>
  );
};

export default Home;
