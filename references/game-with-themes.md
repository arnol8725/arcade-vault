# Skins por juego — Estado

> Mantenido por el agente `skin-designer`. Un juego por corrida. No editar manualmente sin avisar al agente.

## Estado por juego

| Juego     | classic | retro | neon | Skins extra | Dark-mode revisado | Última actualización |
| --------- | ------- | ----- | ---- | ----------- | ------------------- | --------------------- |
| tetris    | —       | ✅    | ✅   | pastel      | parcial              | —                     |
| arkanoid  | —       | —     | —    | —           | —                    | —                     |
| asteroids | —       | —     | —    | —           | —                    | —                     |
| snake     | —       | —     | —    | —           | —                    | —                     |
| frogger   | ✅      | ✅    | ✅   | —           | sí                   | 2026-09-12            |

Leyenda: `✅` aplicado y verificado · `🟡` en progreso · `—` pendiente

## Notas por juego

### frogger

- Arquitectura real del proyecto: motor `lib/games/frogger-engine.ts` (framework-agnostic) +
  canvas delgado `components/games/frogger-canvas.tsx`, no un componente monolítico tipo
  `TetrisGame.tsx`. El patrón de skins se adaptó a esa arquitectura:
  - `FroggerSkinKey` (`"classic" | "retro" | "neon"`) + `FroggerSkin` (interfaz con colores de
    zonas, coches, camiones, troncos, tortugas, rana y HUD) + `SKINS: Record<FroggerSkinKey, FroggerSkin>`,
    todo exportado desde `frogger-engine.ts`.
  - El engine guarda el skin activo en una variable mutable `skin` (equivalente al `skinRef.current`
    del patrón React) y expone `setSkin(skinKey)` en la interfaz `FroggerEngine`, en vez de un
    `useEffect` que reescribe un ref dentro del propio componente — el motor no es un componente React.
  - `createFroggerEngine(canvas, callbacks, initialSkinKey = "classic")` recibe el skin inicial como
    tercer parámetro.
  - `FroggerCanvas` expone la prop `skinKey?: FroggerSkinKey` (default `"classic"`), la pasa al crear
    el motor y la re-sincroniza con un `useEffect([skinKey]) => engineRef.current?.setSkin(skinKey)`.
- **classic**: paleta arcade original ya existente en el motor (verde rana `#39ff6a`, coches rojos
  `#ff4d4d`, camiones grises `#8a8a8a`, troncos marrones `#8b5a2b`, tortugas verdes `#2ecc71`). Sin
  glow, sin highlight — es el default.
- **retro**: CRT pastel/saturado sin brillo, bloques sólidos con línea de luz de 4px blanca
  semitransparente al tope (`blockHighlight: true`). Paleta: coches naranja `#ff8a5c`, camiones
  gris claro `#cfcfcf`, troncos ocre `#a9713f`, tortugas/rana verde menta `#5ad19b`.
  Sin `shadowBlur`.
- **neon**: eléctrico saturado con `shadowBlur`/`shadowColor` (`glow: true`) + `strokeRect` de
  contorno en coches/camiones/troncos, fondo `boardBg: "#000000"`. Paleta: coches magenta
  `#ff2bd6`, camiones cian `#00e5ff`, troncos naranja `#ff8a00`, rana/tortugas verde neón `#39ff14`,
  HUD cian `#00fff2`.
- **Selector de temas**: no se agregó ninguna UI de selector. Se verificó que Arkanoid, Tetris y
  Asteroids tampoco tienen un selector de skins implementado en este repo — no hay patrón previo
  que replicar. Se respetó la regla de no introducir selector global ni persistencia; el cableado
  de un selector (local al `GamePlayer` o donde el usuario decida) queda pendiente para cuando se
  solicite explícitamente.
- **Dark-mode**: los 3 skins contrastan sobre `--bg: #0a0a0f` — todas las zonas (`zones.*`) y
  `boardBg` usan tonos oscuros (`#000000`–`#1c3f66`), y los elementos jugables (coches, camiones,
  troncos, tortugas, rana, HUD) usan colores saturados claros que se distinguen del fondo.
