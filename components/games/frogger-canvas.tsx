"use client";

import { useEffect, useRef } from "react";
import {
  createFroggerEngine,
  type FroggerEngine,
  type FroggerSkinKey,
} from "@/lib/games/frogger-engine";

interface FroggerCanvasProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onEngineReady?: (engine: FroggerEngine) => void;
  // Skin canónico activo (classic/retro/neon). El wiring de un selector
  // visible queda para cuando el usuario lo pida — ver
  // references/game-with-themes.md.
  skinKey?: FroggerSkinKey;
}

export function FroggerCanvas({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  onEngineReady,
  skinKey = "classic",
}: FroggerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FroggerEngine | null>(null);
  // Holds the mount-time skin so the create-engine effect (deps []) can read
  // it once; later changes flow through the setSkin effect below instead.
  const skinKeyRef = useRef<FroggerSkinKey>(skinKey);

  // The engine is created once per mount; keep the latest callback props in
  // a ref so it always calls the current ones without needing to be re-created.
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
    onEngineReady,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
      onEngineReady,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createFroggerEngine(
      canvas,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
      },
      skinKeyRef.current,
    );
    engineRef.current = engine;
    callbacksRef.current.onEngineReady?.(engine);
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
    skinKeyRef.current = skinKey;
    engineRef.current?.setSkin(skinKey);
  }, [skinKey]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={560}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
