import React, { useState } from 'react';
import DishCard from '../components/DishCard';

const Home = ({ dishes, addToCart, user }) => {
  const [search, setSearch] = useState('');

  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const starterReviews = [
    { id: 'review-1', name: 'Maya L.', rating: 5, text: 'The club sandwich was fresh and delicious. Such a warm, welcoming place.' },
    { id: 'review-2', name: 'Daniel R.', rating: 5, text: 'Great food, generous portions, and friendly service. I will be back!' },
    { id: 'review-3', name: 'Clara W.', rating: 4, text: 'Loved the pasta and the relaxed atmosphere. A lovely lunch spot.' }
  ];

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
              placeholder="Search the menu..." 
              aria-label="Search the menu"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="menu-grid">
          {filtered.length ? filtered.map(dish => (
            <DishCard key={dish.id} dish={dish} addToCart={addToCart} user={user} />
          )) : <p className="empty-state">No dishes found.</p>}
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
            <p className="eyebrow">KIND WORDS</p>
            <h2>Guest reviews</h2>
          </div>
          <p>Stories shared by our Bistro Eleven guests.</p>
        </div>
        <div id="reviews-list" className="reviews-grid">
          {starterReviews.map(r => (
            <article key={r.id} className="review-card">
              <div className="review-top">
                <div className="review-avatar">
                  <img src={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#c83c28"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="76">${r.name.charAt(0)}</text></svg>`)}`} alt="" />
                </div>
                <div>
                  <b>{r.name}</b>
                  <div className="review-stars">
                    {'\u2605'.repeat(r.rating)}{'\u2606'.repeat(5 - r.rating)}
                  </div>
                </div>
              </div>
              <p>{r.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer><div>&copy; 2026 Bistro Eleven. All rights reserved.</div></footer>
    </main>
  );
};

export default Home;
