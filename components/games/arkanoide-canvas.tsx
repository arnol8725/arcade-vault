"use client";

import { useEffect, useRef } from "react";
import {
  createArkanoideEngine,
  type ArkanoideEngine,
} from "@/lib/games/arkanoide-engine";

interface ArkanoideCanvasProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onEngineReady?: (engine: ArkanoideEngine) => void;
}

export function ArkanoideCanvas({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  onEngineReady,
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

    const engine = createArkanoideEngine(canvas, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
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

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
