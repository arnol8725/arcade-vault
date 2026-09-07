export default function SalonLoading() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="chip skeleton-block"
            style={{ width: 64, height: 26 }}
          />
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num skeleton-block" style={{ height: 22 }} />
          <div
            className="name skeleton-block"
            style={{ height: 12, marginTop: 8 }}
          />
          <div
            className="score skeleton-block"
            style={{ height: 16, marginTop: 8 }}
          />
        </div>
        <div className="podium-slot gold">
          <div
            className="rank-num skeleton-block"
            style={{ height: 36, marginTop: 4 }}
          />
          <div
            className="name skeleton-block"
            style={{ height: 12, marginTop: 8 }}
          />
          <div
            className="score skeleton-block"
            style={{ height: 20, marginTop: 8 }}
          />
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num skeleton-block" style={{ height: 22 }} />
          <div
            className="name skeleton-block"
            style={{ height: 12, marginTop: 8 }}
          />
          <div
            className="score skeleton-block"
            style={{ height: 16, marginTop: 8 }}
          />
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div className="tr" key={i} style={{ opacity: 1, animation: "none" }}>
            <div className="rk skeleton-block" style={{ height: 11 }} />
            <div className="pl skeleton-block" style={{ height: 11 }} />
            <div className="sc skeleton-block" style={{ height: 11 }} />
            <div className="dt skeleton-block" style={{ height: 11 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
