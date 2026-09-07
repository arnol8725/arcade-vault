export default function BibliotecaLoading() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card skeleton">
            <div className="cover" />
            <div className="meta">
              <div className="title skeleton-block" />
              <div className="desc skeleton-block" />
              <div className="row">
                <div className="score-badge-line skeleton-block" />
                <div className="btn-line skeleton-block" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
