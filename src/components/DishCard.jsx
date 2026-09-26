export default function DishCard({ dish, addToCart }) {
  const rupiah = (amount) => 'Rp ' + Number(amount || 0).toLocaleString('id-ID');

  return (
    <article className="dish-card">
      <img src={dish.image} alt={dish.name} />
      <div className="dish-info">
        <h3>{dish.name}</h3>
        <p>{dish.description || 'Freshly made in the Bistro Eleven kitchen.'}</p>
        <div className="dish-bottom">
          <b>{rupiah(dish.price)}</b>
          {addToCart && (
            <button onClick={() => addToCart(dish.id)}>Add to cart +</button>
          )}
        </div>
      </div>
    </article>
  );
}

