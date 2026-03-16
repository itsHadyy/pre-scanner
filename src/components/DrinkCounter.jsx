import '../styles/claim.css';

function DrinkCounter({ redeemed, total }) {
  return (
    <div className="drink-counter">
      <p className="drink-counter-text">
        <span className="highlight-number">{redeemed}</span>
        {' '}
        of
        {' '}
        <span className="highlight-number">{total}</span>
        {' '}
        drinks redeemed
      </p>
      <div className="drink-progress">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`drink-dot ${i < redeemed ? 'drink-dot-filled' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export default DrinkCounter;
