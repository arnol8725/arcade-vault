"use client";

import { useEffect, useRef } from "react";
import {
  createArkanoideEngine,
  type ArkanoideEngine,
} from "@/lib/games/arkanoide-engine";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

interface ArkanoideCanvasProps {
  paused: boolean;
  /** Skin activo; el motor re-tinta la hoja de sprites sin reiniciar la partida. */
  skin?: SkinId;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export function ArkanoideCanvas({
  paused,
  skin = DEFAULT_SKIN,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: ArkanoideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoideEngine | null>(null);

  // The engine is created once per mount; keep the latest callback props in
  // a ref so it always calls the current ones without needing to be re-created.
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  });

  // Skin vigente al momento de crear el motor (el efecto de montaje corre una
  // sola vez; los cambios posteriores entran por `setSkin`).
  const skinRef = useRef(skin);
  useEffect(() => {
    skinRef.current = skin;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createArkanoideEngine(
      canvas,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
      },
      skinRef.current,
    );
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setSkin(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
