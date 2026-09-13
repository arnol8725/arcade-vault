"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AsteroidsCanvas } from "@/components/games/asteroids-canvas";
import { TetrisCanvas } from "@/components/games/tetris-canvas";
import { ArkanoideCanvas } from "@/components/games/arkanoide-canvas";
import { SerpentinaCanvas } from "@/components/games/serpentina-canvas";
import { TouchControls } from "@/components/games/touch-controls";
import type { Game } from "@/lib/games";
import { useUser } from "@/lib/user-context";
import { saveScoreToLeaderboard } from "@/lib/scores";

// Minimal shape shared by the 4 real engines' setKeyState — enough for
// TouchControls to drive whichever engine is currently mounted, without
// GamePlayer coupling to each engine's full interface.
interface KeyStateSource {
  setKeyState: (code: string, pressed: boolean) => void;
}

function subscribeToPointerType(onChange: () => void): () => void {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function getIsTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}
function getIsTouchDeviceServerSnapshot(): boolean {
  return false;
}

interface TouchConfig {
  directions: {
    up?: string;
    down?: string;
    left?: string;
    right?: string;
  };
  buttons?: { code: string; label: string }[];
  repeat?: { intervalMs: number; codes: string[] };
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useUser();
  const isAsteroids = game.id === "rocas";
  const isTetris = game.id === "bloque-buster";
  const isArkanoide = game.id === "arkanoide";
  const isSerpentina = game.id === "serpentina";
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [asteroidsLevel, setAsteroidsLevel] = useState(1);
  const [tetrisLevel, setTetrisLevel] = useState(1);
  const [arkanoideLevel, setArkanoideLevel] = useState(1);
  const [serpentinaLevel, setSerpentinaLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const engineRef = useRef<KeyStateSource | null>(null);

  // Touch controls only render on devices whose primary pointer is coarse
  // (touchscreens) — a mouse/trackpad desktop keeps the current layout.
  // `useSyncExternalStore` reads this browser-only media query without ever
  // calling setState from inside an effect, and reports `false` for the SSR
  // snapshot since `window` doesn't exist on the server.
  const isTouchDevice = useSyncExternalStore(
    subscribeToPointerType,
    getIsTouchDevice,
    getIsTouchDeviceServerSnapshot,
  );

  // Direction/button mapping per real engine, 1:1 with each engine's
  // existing keyboard codes (see SPEC 11). `repeat` mirrors the native OS
  // key-repeat that bloque-buster already relies on for its edge-triggered
  // actions, so holding a touch d-pad/button behaves like holding a key.
  const touchConfig: TouchConfig | null = isAsteroids
    ? {
        directions: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" },
        buttons: [{ code: "Space", label: "DISPARAR" }],
      }
    : isTetris
      ? {
          directions: {
            left: "ArrowLeft",
            right: "ArrowRight",
            down: "ArrowDown",
          },
          buttons: [
            { code: "ArrowUp", label: "ROTAR" },
            { code: "Space", label: "CAER" },
          ],
          repeat: {
            intervalMs: 120,
            codes: ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"],
          },
        }
      : isArkanoide
        ? { directions: { left: "ArrowLeft", right: "ArrowRight" } }
        : isSerpentina
          ? {
              directions: {
                up: "ArrowUp",
                down: "ArrowDown",
                left: "ArrowLeft",
                right: "ArrowRight",
              },
            }
          : null;

  // "rocas", "bloque-buster", "arkanoide" and "serpentina" get real
  // level/lives from their engines' callbacks. Every other game keeps the
  // simulated derivation: level increments once per 2500-point threshold
  // crossed by the fake score, computed on every render — no extra state
  // needed for those.
  const level = isAsteroids
    ? asteroidsLevel
    : isTetris
      ? tetrisLevel
      : isArkanoide
        ? arkanoideLevel
        : isSerpentina
          ? serpentinaLevel
          : Math.floor(score / 2500) + 1;

  useEffect(() => {
    if (
      isAsteroids ||
      isTetris ||
      isArkanoide ||
      isSerpentina ||
      over ||
      paused
    )
      return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isAsteroids, isTetris, isArkanoide, isSerpentina, over, paused]);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setAsteroidsLevel(1);
    setTetrisLevel(1);
    setArkanoideLevel(1);
    setSerpentinaLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setResetKey((k) => k + 1);
  };

  const saveScore = () => {
    try {
      const all = JSON.parse(localStorage.getItem("av_scores") || "[]");
      all.push({ game: game.id, score, name, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {}

    saveScoreToLeaderboard(game.id, score).catch((error) => {
      console.error("saveScoreToLeaderboard failed", error);
    });

    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/juego/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsCanvas
              key={resetKey}
              paused={paused}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setAsteroidsLevel}
              onGameOver={endGame}
              onEngineReady={(engine) => {
                engineRef.current = engine;
              }}
            />
          ) : isTetris ? (
            <TetrisCanvas
              key={resetKey}
              paused={paused}
              onScoreChange={setScore}
              onLevelChange={setTetrisLevel}
              onGameOver={endGame}
              onEngineReady={(engine) => {
                engineRef.current = engine;
              }}
            />
          ) : isArkanoide ? (
            <ArkanoideCanvas
              key={resetKey}
              paused={paused}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setArkanoideLevel}
              onGameOver={endGame}
              onEngineReady={(engine) => {
                engineRef.current = engine;
              }}
            />
          ) : isSerpentina ? (
            <SerpentinaCanvas
              key={resetKey}
              paused={paused}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setSerpentinaLevel}
              onGameOver={endGame}
              onEngineReady={(engine) => {
                engineRef.current = engine;
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isTouchDevice && !over && touchConfig && (
        <TouchControls
          directions={touchConfig.directions}
          buttons={touchConfig.buttons}
          repeat={touchConfig.repeat}
          onKey={(code, pressed) =>
            engineRef.current?.setKeyState(code, pressed)
          }
        />
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
