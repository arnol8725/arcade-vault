"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import type { LeaderboardRow, UserBest } from "@/lib/scores";
import { useUser } from "@/lib/user-context";

export interface GameLeaderboard {
  gameId: string;
  top: LeaderboardRow[];
  userBest: UserBest | null;
}

const GLOBAL_TAB = "GLOBAL" as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function SalonClient({
  games,
  globalTop,
  perGame,
}: {
  games: Game[];
  globalTop: LeaderboardRow[];
  perGame: GameLeaderboard[];
}) {
  const { user } = useUser();
  const [tab, setTab] = useState<string>(GLOBAL_TAB);

  const isGlobal = tab === GLOBAL_TAB;
  const game = games.find((g) => g.id === tab);
  const gameData = perGame.find((g) => g.gameId === tab);
  const rows = isGlobal ? globalTop : (gameData?.top ?? []);
  const userBest = isGlobal ? null : (gameData?.userBest ?? null);
  const title = isGlobal ? "GLOBAL" : (game?.title ?? "");

  const [first, second, third] = rows;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        <button
          className={"chip" + (isGlobal ? " active" : "")}
          onClick={() => setTab(GLOBAL_TAB)}
        >
          GLOBAL
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          className="hall-table"
          style={{ padding: "40px 18px", textAlign: "center" }}
        >
          <p
            className="pixel"
            style={{ fontSize: 11, color: "var(--ink-faint)" }}
          >
            SIN PUNTAJES TODAVÍA EN {title}
          </p>
        </div>
      ) : (
        <>
          <div className="podium">
            {second && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{second.userName}</div>
                <div className="score">
                  {second.score.toLocaleString("es-ES")}
                </div>
                <div className="date">{formatDate(second.achievedAt)}</div>
              </div>
            )}
            {first && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{
                    fontSize: 9,
                    color: "var(--gold)",
                    letterSpacing: "0.18em",
                  }}
                >
                  CAMPEÓN
                </div>
                <div
                  className="rank-num"
                  style={{ fontSize: 36, marginTop: 4 }}
                >
                  01
                </div>
                <div className="name">{first.userName}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {first.score.toLocaleString("es-ES")}
                </div>
                <div className="date">{formatDate(first.achievedAt)}</div>
              </div>
            )}
            {third && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{third.userName}</div>
                <div className="score">
                  {third.score.toLocaleString("es-ES")}
                </div>
                <div className="date">{formatDate(third.achievedAt)}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.userName + r.achievedAt + i}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.userName}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{formatDate(r.achievedAt)}</div>
              </div>
            ))}
            {!isGlobal && user && userBest && (
              <>
                <div className="tr you-label">▸ TU MEJOR MARCA EN {title}</div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(userBest.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {user.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {userBest.score.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">—</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
