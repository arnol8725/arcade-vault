import Link from "next/link";
import type { Game } from "@/lib/games";
import { MiniCard } from "@/components/home-sections";

export function HomeGamesPreview({ games }: { games: Game[] }) {
  return (
    <section className="home-section reveal">
      <div className="section-head">
        <div className="kicker pixel neon-cyan">{"// 02"}</div>
        <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
        <div className="section-rule"></div>
      </div>
      <div className="mini-rail">
        {games.slice(0, 6).map((g) => (
          <MiniCard key={g.id} game={g} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/biblioteca" className="btn lg">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </section>
  );
}
