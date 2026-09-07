import { FloatingSilhouettes } from "@/components/home-sections";

export default function HomeLoading() {
  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
        </div>
      </section>

      {/* GAMES PREVIEW skeleton */}
      <section className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">{"// 02"}</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mini-card skeleton">
              <div className="mini-cover" />
              <div className="mini-meta">
                <div className="mini-title skeleton-block" />
                <div className="mini-cat skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
