"use client";

import { useCallback, useEffect, useRef } from "react";

export interface TouchButtonConfig {
  code: string; // "Space" | "ArrowUp" | "KeyX" | ...
  label: string; // "DISPARAR" | "ROTAR" | "CAER"
}

export interface TouchControlsProps {
  directions: {
    up?: string; // e.g. "ArrowUp"
    down?: string;
    left?: string; // e.g. "ArrowLeft"
    right?: string;
  };
  buttons?: TouchButtonConfig[]; // 0 to 2 action buttons
  onKey: (code: string, pressed: boolean) => void;
  /** bloque-buster only: software auto-repeat while the button/direction stays pressed. */
  repeat?: { intervalMs: number; codes: string[] };
}

const AUTO_REPEAT_MS_DEFAULT = 120;

/**
 * Touch d-pad + up to 2 action buttons, overlaid on `.crt-screen`.
 * Uses Pointer Events (not Touch Events) so the same code path handles touch
 * and mouse, and avoids the ~300ms iOS Safari tap delay.
 */
export function TouchControls({
  directions,
  buttons = [],
  onKey,
  repeat,
}: TouchControlsProps) {
  // Tracks which codes are currently held down via a pointer, so leave/cancel
  // can release exactly the keys that pointer had pressed.
  const activePointers = useRef<Map<number, string>>(new Map());
  const repeatIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  const stopRepeat = useCallback((code: string) => {
    const interval = repeatIntervals.current.get(code);
    if (interval) {
      clearInterval(interval);
      repeatIntervals.current.delete(code);
    }
  }, []);

  const press = useCallback(
    (code: string) => {
      onKey(code, true);
      const repeatCodes = repeat?.codes ?? [];
      if (repeatCodes.includes(code) && !repeatIntervals.current.has(code)) {
        const intervalMs = repeat?.intervalMs ?? AUTO_REPEAT_MS_DEFAULT;
        const interval = setInterval(() => onKey(code, true), intervalMs);
        repeatIntervals.current.set(code, interval);
      }
    },
    [onKey, repeat],
  );

  const release = useCallback(
    (code: string) => {
      stopRepeat(code);
      onKey(code, false);
    },
    [onKey, stopRepeat],
  );

  // Release everything and clear all intervals on unmount, so navigating away
  // never leaves a stuck key or a running auto-repeat interval behind.
  useEffect(() => {
    const pointers = activePointers.current;
    const intervals = repeatIntervals.current;
    return () => {
      for (const code of pointers.values()) onKey(code, false);
      pointers.clear();
      for (const interval of intervals.values()) clearInterval(interval);
      intervals.clear();
    };
  }, [onKey]);

  const handlePointerDown = useCallback(
    (code: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      activePointers.current.set(e.pointerId, code);
      press(code);
    },
    [press],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const code = activePointers.current.get(e.pointerId);
      if (code) {
        activePointers.current.delete(e.pointerId);
        release(code);
      }
    },
    [release],
  );

  // pointerleave/pointercancel aren't fired consistently across mobile
  // browsers when the finger slides off the button; handling both explicitly
  // guarantees the key is released even if the finger slips.
  const handlePointerLeave = handlePointerUp;
  const handlePointerCancel = handlePointerUp;

  const dpadButton = (key: "up" | "down" | "left" | "right", label: string) => {
    const code = directions[key];
    if (!code) return null;
    return (
      <button
        key={key}
        type="button"
        className={`touch-button touch-dpad__${key}`}
        style={{ touchAction: "none" }}
        aria-label={label}
        onPointerDown={handlePointerDown(code)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {dpadButton("up", "▲")}
        {dpadButton("left", "◀")}
        {dpadButton("right", "▶")}
        {dpadButton("down", "▼")}
      </div>
      {buttons.length > 0 && (
        <div className="touch-actions">
          {buttons.map((button) => (
            <button
              key={button.code}
              type="button"
              className="touch-button touch-actions__button"
              style={{ touchAction: "none" }}
              aria-label={button.label}
              onPointerDown={handlePointerDown(button.code)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerCancel}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
