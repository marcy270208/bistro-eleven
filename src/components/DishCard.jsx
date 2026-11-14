import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage, localizeDish } from '../lib/i18n';

export default function DishCard({ dish, addToCart, isFavorite, onToggleFavorite }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { lang, isId } = useLanguage();
  const localized = localizeDish(dish, lang);
  const rupiah = (amount) => 'Rp ' + Number(amount || 0).toLocaleString('id-ID');

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailsOpen]);

  return (
    <article className="dish-card">
      <div className="dish-visual">
        <img src={dish.image} alt={dish.name} />
        <button
          className={`dish-favorite-button ${isFavorite ? 'is-favorite' : ''}`}
          aria-label={
            isFavorite
              ? `Remove ${dish.name} from favorites`
              : `Add ${dish.name} to favorites`
          }
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />
          </svg>
        </button>
      </div>
      <div className="dish-info">
        <h3>{dish.name}</h3>
        <p>
          {localized.description ||
            (isId
              ? 'Dibuat segar setiap hari di dapur Bistro Eleven.'
              : 'Freshly made in the Bistro Eleven kitchen.')}
        </p>
        <div className="dish-bottom">
          <b className="dish-price">{rupiah(dish.price)}</b>
          {addToCart && (
            <div className="dish-actions">
              <button className="dish-details-button" onClick={() => setDetailsOpen(true)}>
                {isId ? 'Detail' : 'Details'}
              </button>
              <button className="dish-add-button" onClick={() => addToCart(dish.id)}>
                {isId ? 'Tambah +' : 'Add to cart +'}
              </button>
            </div>
          )}
        </div>
      </div>
      {detailsOpen &&
        createPortal(
          <div
            className="order-overlay dish-detail-overlay"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setDetailsOpen(false);
            }}
          >
            <section
              className="bill-card dish-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`dish-title-${dish.id}`}
            >
              <button
                className="modal-close"
                aria-label="Close food details"
                onClick={() => setDetailsOpen(false)}
              >
                &times;
              </button>
              <img src={dish.image} alt={dish.name} />
              <p className="eyebrow">{isId ? 'DARI DAPUR KAMI' : 'FROM OUR KITCHEN'}</p>
              <h2 id={`dish-title-${dish.id}`}>{dish.name}</h2>
              <p className="dish-detail-description">
                {localized.description ||
                  (isId
                    ? 'Dibuat segar setiap hari di dapur Bistro Eleven.'
                    : 'Freshly made in the Bistro Eleven kitchen.')}
              </p>
              <div className="dish-ingredients">
                <h3>{isId ? 'Komposisi Bahan' : 'Ingredients'}</h3>
                {localized.ingredients?.length ? (
                  <ul>
                    {localized.ingredients.map((ingredient, index) => (
                      <li key={`${ingredient}-${index}`}>{ingredient}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {isId
                      ? 'Daftar bahan belum ditambahkan.'
                      : 'Ingredients have not been added yet.'}
                  </p>
                )}
              </div>
              <div className="dish-detail-footer">
                <b>{rupiah(dish.price)}</b>
                <button
                  className="button button-red"
                  onClick={() => {
                    addToCart(dish.id);
                    setDetailsOpen(false);
                  }}
                >
                  {isId ? 'Tambah ke keranjang +' : 'Add to cart +'}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </article>
  );
}
