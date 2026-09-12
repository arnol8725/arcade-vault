// Sistema de skins — contrato compartido por todos los motores.
//
// Datos puros: este módulo NO importa React ni toca el DOM. Los motores
// reciben el `SkinId` como parámetro explícito (o vía `setSkin`) y resuelven
// su paleta contra una tabla estática — nunca leen colores de
// `document`/`getComputedStyle` dentro del loop.
//
// El sitio es oscuro-only: los tres skins se validan por contraste contra el
// fondo CRT oscuro que ya existe. No hay modo claro ni `prefers-color-scheme`.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS = ["clasico", "neon", "retro"] as const;

/** `clasico` = la paleta vigente hoy, formalizada como default. */
export const DEFAULT_SKIN: SkinId = "clasico";

/** Clave de `localStorage`; la selección de skin es 100% client-side. */
export const SKIN_STORAGE_KEY = "av_skin";

/** Atributo que el selector setea en `<html>` para el CSS del sitio. */
export const SKIN_DOM_ATTRIBUTE = "data-skin";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}
