"use client";

import { SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";

interface SkinPickerProps {
  value: SkinId;
  onChange: (skin: SkinId) => void;
}

/**
 * Selector de skin del reproductor. Componente cliente puro: no conoce
 * ningún motor — solo emite el `SkinId`, que `GamePlayer` inyecta al canvas.
 */
export function SkinPicker({ value, onChange }: SkinPickerProps) {
  return (
    <div className="skin-picker" role="group" aria-label="Skin visual">
      <span className="label">SKIN</span>
      {SKIN_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={"swatch " + id + (value === id ? " active" : "")}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <span className="dot" aria-hidden="true" />
          {SKIN_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
