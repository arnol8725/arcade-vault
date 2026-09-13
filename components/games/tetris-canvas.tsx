"use client";

import { useEffect, useRef } from "react";
import {
  createTetrisEngine,
  type TetrisEngine,
} from "@/lib/games/tetris-engine";

interface TetrisCanvasProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onEngineReady?: (engine: TetrisEngine) => void;
}

export function TetrisCanvas({
  paused,
  onScoreChange,
  onLevelChange,
  onGameOver,
  onEngineReady,
}: TetrisCanvasProps) {
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);

  // The engine is created once per mount; keep the latest callback props in
  // a ref so it always calls the current ones without needing to be re-created.
  const callbacksRef = useRef({
    onScoreChange,
    onLevelChange,
    onGameOver,
    onEngineReady,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLevelChange,
      onGameOver,
      onEngineReady,
    };
  });

  useEffect(() => {
    const boardCanvas = boardCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!boardCanvas || !nextCanvas) return;

    const engine = createTetrisEngine(boardCanvas, nextCanvas, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={boardCanvasRef}
        width={300}
        height={600}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{ position: "absolute", top: 12, right: 12 }}
      />
    </div>
  );
}
