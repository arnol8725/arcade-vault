"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_SKIN,
  SKIN_DOM_ATTRIBUTE,
  SKIN_STORAGE_KEY,
  isSkinId,
  type SkinId,
} from "@/lib/games/skins";

// Store externo mínimo sobre `localStorage`. La selección de skin es 100%
// client-side: no toca Supabase, ni `games`, ni `scores`.
let cached: SkinId | null = null;
const listeners = new Set<() => void>();

function readSkin(): SkinId {
  if (cached === null) {
    try {
      const stored = localStorage.getItem(SKIN_STORAGE_KEY);
      cached = isSkinId(stored) ? stored : DEFAULT_SKIN;
    } catch {
      // localStorage bloqueado (modo privado / permisos): default.
      cached = DEFAULT_SKIN;
    }
  }
  return cached;
}

/** En el servidor no hay preferencia guardada: siempre el default. */
function readServerSkin(): SkinId {
  return DEFAULT_SKIN;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Mantiene sincronizadas otras pestañas del mismo origen.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SKIN_STORAGE_KEY) return;
    cached = isSkinId(event.newValue) ? event.newValue : DEFAULT_SKIN;
    listeners.forEach((listener) => listener());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeSkin(next: SkinId): void {
  cached = next;
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, next);
  } catch {
    // Sin persistencia: la selección igual vale para la sesión actual.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Skin activo + setter. Refleja el valor en `<html data-skin="...">` para que
 * el CSS del sitio (oscuro-only, sin modo claro) cambie de paleta junto con
 * los motores.
 */
export function useSkin(): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(subscribe, readSkin, readServerSkin);

  useEffect(() => {
    document.documentElement.setAttribute(SKIN_DOM_ATTRIBUTE, skin);
  }, [skin]);

  const setSkin = useCallback((next: SkinId) => writeSkin(next), []);

  return [skin, setSkin];
}
