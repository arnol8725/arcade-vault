"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function HomeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="fade-in"
      style={{
        textAlign: "center",
        padding: "120px 32px",
        color: "var(--ink-faint)",
      }}
    >
      <div
        className="pixel"
        style={{ fontSize: 16, color: "var(--magenta)", marginBottom: 16 }}
      >
        ALGO SALIÓ MAL
      </div>
      <div style={{ marginBottom: 24 }}>Intenta de nuevo en unos segundos.</div>
      <button className="btn" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
