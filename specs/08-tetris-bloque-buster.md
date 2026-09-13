# SPEC 08 — Motor real de Tetris en el juego "BLOQUE BUSTER"

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-07
> **Objective:** Reemplazar la arena decorativa y el puntaje simulado de `GamePlayer` para el juego `bloque-buster` por el motor real de `references/started-games/03-tetris/game.js`, portado a un componente React/TypeScript con doble canvas (tablero + preview) que alimenta el HUD existente con datos reales.

---

## Alcance

**In:**

- Portar `references/started-games/03-tetris/game.js` (matriz `board`, pieza actual/siguiente, `PIECES`/`COLORS`/`LINE_SCORES`, `collide`, `rotateCW`/`tryRotate` con wall-kicks `[0,-1,1,-2,2]`, `clearLines`, `ghostY`, curva de velocidad `dropInterval = max(100, 1000 - (level-1)*90)`) a TypeScript puro y agnóstico de framework en `lib/games/tetris-engine.ts`, sin dependencias del DOM salvo los `CanvasRenderingContext2D`/`HTMLCanvasElement` que recibe por parámetro.
- Crear `components/games/tetris-canvas.tsx` (`"use client"`): monta dos `<canvas>` — tablero a resolución interna fija 300×600 (`COLS×BLOCK` = 10×30, `ROWS×BLOCK` = 20×30) escalado dentro de `.crt-screen` con `width: 100%; height: 100%; object-fit: contain` (preserva el aspecto 1:2 del tablero dentro del marco 4:3, con barras laterales), y un segundo canvas de preview 120×120 posicionado `position: absolute` en la esquina superior derecha del mismo contenedor, encima del tablero. Instancia el motor, corre el loop vía `requestAnimationFrame`, y expone el estado real (`score`, `level`, `gameover`) hacia arriba mediante props de callback (`onScoreChange`, `onLevelChange`, `onGameOver`). Recibe una prop `paused: boolean`: si es `true`, el loop sigue pidiendo frames y dibujando, pero el avance de la pieza (`dropAccum`) y el procesamiento de input de movimiento no ocurren (el tablero queda congelado en el último frame).
- Los listeners de teclado (`keydown` en `document`, ya existentes en el original) se agregan en `start()` y se remueven en `stop()`. Se agrega `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` para que no hagan scroll de la página anfitriona.
- Se elimina del motor portado: el overlay interno `#overlay`/`overlayTitle`/`overlayScore` (tanto para `GAME OVER` como para `PAUSA`), el botón `#restart-btn` y su `init()` asociado, la tecla `KeyP` para pausa interna, y todo el bloque de `theme-toggle`/`localStorage['tetris-theme']`/`getComputedStyle(...).getPropertyValue('--grid-line')` (no aplica — Arcade Vault no tiene ese toggle; el color de grilla queda como constante fija). Al llegar a `gameOver` el motor solo dispara `onGameOver(score)` y detiene el loop. El único punto de reinicio/guardado/pausa pasa a ser el `GamePlayer` existente (botón PAUSA/REANUDAR, modal de fin de partida).
- Modificar `components/game-player.tsx`: agregar un segundo booleano de bifurcación análogo a `isAsteroids` (`isTetris = game.id === "bloque-buster"`). Cuando es `true`, renderiza `<TetrisCanvas>` dentro de `.crt-screen` en vez del `.game-arena` decorativo, y el `score`/`level` del HUD vienen de los callbacks del motor real (nuevo estado `tetrisLevel`, mismo patrón que `asteroidsLevel`) en vez de la fórmula simulada `Math.floor(score / 2500) + 1`. El stat "Vidas" del HUD **no** se toca — sigue mostrando el valor fijo actual (`useState(3)`, igual que en el resto de los juegos decorativos), porque Tetris no tiene concepto de vidas. `restart()` también resetea `tetrisLevel` a `1` además de incrementar `resetKey`.
- Para cualquier otro `game.id` (`caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`), `GamePlayer` sigue exactamente igual que hoy.

**Out of scope (para specs futuros):**

- Corregir el desajuste entre el `cover`/`cat` actuales de `bloque-buster` en la tabla `games` (`cover-bricks`, `ARCADE` — visualmente un breakout/Arkanoid) y el motor de Tetris que este spec le asigna. Decisión explícita del usuario: el motor va en `bloque-buster` tal cual está hoy en el catálogo; ajustar `cover`/`cat`/`title` para que coincidan visualmente es un spec aparte.
- Portar Arkanoid (`references/started-games/04-arkanoid`) a cualquier slot — otro spec.
- Alta de fila nueva en `games` — no aplica, `bloque-buster` ya existe en la tabla (SPEC 06).
- Sonido (el `game.js` de origen no tiene efectos de sonido).
- Migrar `av_scores`/leaderboard — ya es genérico por `game.id` desde SPEC 07, funciona sin cambios en cuanto el motor reporte un `score` real.
- Actualizar los valores decorativos `best`/`plays` de `bloque-buster` en la tabla `games` — son datos de portada, no derivados de partidas jugadas.
- Controles táctiles/mobile o remapeo de teclas — se mantiene el esquema original (`←` `→` mover, `↑`/`X` rotar, `↓` bajada suave, `Espacio` caída dura).
- Rediseño del HUD de `GamePlayer` o del layout general de `.crt-screen` — el preview de siguiente pieza se resuelve como overlay absoluto dentro del propio componente nuevo, sin tocar CSS global ni la estructura de `GamePlayer`.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no introduce persistencia nueva ni tablas — `bloque-buster` ya existe en `games` (SPEC 06) y el leaderboard ya es genérico por `game.id` (SPEC 07). Los tipos nuevos son internos del motor portado, sin almacenamiento:

```ts
// lib/games/tetris-engine.ts
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 0 = vacío, 1-8 = tipo de pieza
export type EngineState = "playing" | "gameover";

export interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

export interface TetrisEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void; // level = floor(lines / 10) + 1
  onGameOver: (finalScore: number) => void;
}

export interface TetrisEngine {
  start: () => void; // arranca el loop y agrega listeners
  stop: () => void; // cancela el loop y remueve listeners
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', board vacío, score 0, level 1
}

export function createTetrisEngine(
  boardCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  callbacks: TetrisEngineCallbacks,
): TetrisEngine;
```

El guardado de partida sigue usando la forma ya definida en SPEC 01/05, sin cambios:

```ts
// components/game-player.tsx (sin cambios de forma)
{
  game: string; // "bloque-buster"
  score: number;
  name: string;
  at: number;
} // en localStorage["av_scores"], además de saveScoreToLeaderboard(game.id, score)
```

---

## Plan de implementación

1. Crear `lib/games/tetris-engine.ts`: portar la lógica de `references/started-games/03-tetris/game.js` (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `drawBlock`, `drawGrid`, `draw`, `drawNext`) tipada en TypeScript estricto, envuelta en `createTetrisEngine(boardCanvas, nextCanvas, callbacks): TetrisEngine`. Se elimina el overlay de `GAME OVER`/`PAUSA`, el `restart-btn`, la tecla `KeyP` y el bloque de theme-toggle; el color de grilla pasa a ser una constante fija en vez de leerse de `--grid-line`. Al entrar en `gameOver` se llama `callbacks.onGameOver(score)` una sola vez. Cada cambio real de `score` o `level` (derivado de `lines`) dispara su callback (patrón diff-and-report, igual que `asteroids-engine.ts`).
2. El manejo de input (`keydown` para `ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`KeyX`/`Space`) se mueve dentro del engine con `addEventListener`/`removeEventListener` expuestos vía `start()`/`stop()`, no fijados a nivel de módulo. Se agrega `e.preventDefault()` en las cinco teclas de control. Cuando `paused` es `true` (vía `setPaused`), `update`/el manejo de `dropAccum` no se ejecuta pero `draw()` sigue corriendo cada frame (mismo patrón de congelamiento que `asteroids-engine.ts`).
3. Crear `components/games/tetris-canvas.tsx` (`"use client"`): dos `useRef` a los `<canvas>` (tablero 300×600, preview 120×120), un `callbacksRef` que guarda las últimas props (patrón de `AsteroidsCanvas`), un efecto de montaje (`useEffect([])`) que llama `createTetrisEngine(boardCanvas, nextCanvas, callbacks)`, guarda la instancia en un `ref` y llama `engine.start()` (cleanup: `engine.stop()`), y un efecto separado en `[paused]` que llama `engine.setPaused(paused)`. El canvas de tablero se estiliza con `width: "100%", height: "100%", objectFit: "contain"`; el canvas de preview se posiciona `position: "absolute", top: 12, right: 12` sobre el contenedor relativo del tablero.
4. Modificar `components/game-player.tsx`: agregar `isTetris = game.id === "bloque-buster"` y estado `tetrisLevel` (mismo patrón que `asteroidsLevel`). Extender la fórmula de `level` a `isAsteroids ? asteroidsLevel : isTetris ? tetrisLevel : Math.floor(score / 2500) + 1`. Condicional de render: si `isTetris`, `<TetrisCanvas paused={paused} onScoreChange={setScore} onLevelChange={setTetrisLevel} onGameOver={endGame} key={resetKey} />` dentro de `.crt-screen`; para `rocas` y el resto, sin cambios. `restart()` agrega `setTetrisLevel(1)` a los resets existentes.
5. Verificación manual end-to-end en `/juego/bloque-buster/jugar` (checklist de la Fase 5 de abajo).
6. Correr `npm run build` y `npm run lint`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/tetris-engine.ts` no importa nada de React ni del DOM salvo los tipos `CanvasRenderingContext2D`/`HTMLCanvasElement` recibidos por parámetro.
- [ ] En `/juego/bloque-buster/jugar`, el HUD (puntaje, nivel) refleja el estado real del motor, no la simulación; "Vidas" se mantiene en su valor decorativo fijo actual.
- [ ] `←` `→` mueven la pieza, `↑`/`X` rotan con wall-kick, `↓` hace bajada suave (+1 punto/fila), `Espacio` hace caída dura (+2 puntos/celda) — ninguna produce scroll de la página.
- [ ] Completar una línea la limpia, suma puntos según `LINE_SCORES × level` y sube el nivel cada 10 líneas acumuladas (`dropInterval` disminuye en consecuencia).
- [ ] La pieza fantasma (`ghost`) se dibuja en la posición de caída proyectada con transparencia.
- [ ] El preview de la siguiente pieza se ve en la esquina superior derecha del `.crt-screen`, sin desbordar ni tapar permanentemente el tablero.
- [ ] Que una pieza nueva no pueda entrar al tablero (spawn bloqueado) abre el modal externo de fin de partida con el puntaje real; el canvas no muestra su propio overlay de "GAME OVER" ni tiene botón de reinicio propio.
- [ ] "GUARDAR PUNTUACIÓN" en el modal persiste `{ game: "bloque-buster", score, name, at }` en `localStorage["av_scores"]` y llama a `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (tablero vacío, score 0, nivel 1, sin piezas residuales del intento anterior).
- [ ] "PAUSA" congela el tablero (ninguna pieza cae ni responde a movimiento) y "REANUDAR" continúa sin saltos de velocidad ni piezas fantasma perdidas.
- [ ] Navegar fuera de `/juego/bloque-buster/jugar` no deja el listener de teclado del motor activo afectando el resto de la app.
- [ ] Ningún otro `game.id` (incluido `rocas`) cambia de comportamiento.
- [ ] `/salon` sigue listando `bloque-buster` con su leaderboard real (sin cambios de código en `app/salon/*`, `lib/scores.ts` ni `lib/scores-server.ts`).

---

## Decisiones

- **Sí:** asignar el motor de Tetris al `game.id` `bloque-buster`, pese a que su `cover`/`cat` actuales en la tabla `games` (`cover-bricks`, `ARCADE`) sugieren visualmente un breakout/Arkanoid y no un puzzle de piezas. Decisión explícita del usuario en la Fase 1 de este spec, aceptando el desajuste visual como deuda separada.
- **No:** corregir `cover`/`cat`/`title` de `bloque-buster` en este spec. Es un cambio de datos de portada sin relación con el motor de juego — va en un spec propio si se decide alinear el catálogo.
- **Sí:** doble canvas (tablero + preview) en un único componente `TetrisCanvas`, con el preview como overlay `position: absolute` dentro del mismo contenedor del tablero. Evita tocar el layout de `.crt-screen` o el HUD de `GamePlayer` (fuera de alcance de este skill) mientras conserva la mecánica visible de "siguiente pieza" del original.
- **Sí:** tablero escalado con `object-fit: contain` en vez de `100%/100%` sin más. El tablero es 1:2 (300×600) y `.crt-screen` es 4:3 — estirarlo sin preservar aspecto deformaría los bloques cuadrados; `contain` los deja cuadrados con barras laterales, mismo trade-off ya aceptado en SPEC 05 para la resolución fija del canvas.
- **Sí:** el motor no reporta "vidas" (no existe el concepto en Tetris) — el stat "Vidas" del HUD de `GamePlayer` queda en su valor fijo decorativo actual, igual que en los demás juegos sin motor de vidas real.
- **Sí:** eliminar el toggle de tema claro/oscuro y su lectura de `--grid-line` vía `getComputedStyle`. Es una feature de la página standalone original sin equivalente en Arcade Vault; el color de grilla pasa a ser una constante fija en el motor portado.
- **Sí:** eliminar la tecla `KeyP` de pausa interna y el `restart-btn` del original. `GamePlayer` ya tiene sus propios botones PAUSA/REANUDAR y el modal de fin de partida con "JUGAR DE NUEVO" — dos mecanismos de pausa/reinicio compitiendo por las mismas teclas es confuso, igual que se decidió en SPEC 05 para el `Space` de reinicio de Asteroids.
- **No:** portar sonido o assets — el `game.js` de origen no los tiene.

---

## Riesgos

| Riesgo                                                                                                                                           | Mitigación                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El desajuste visual `cover-bricks`/`ARCADE` de `bloque-buster` vs. el contenido real (Tetris) puede confundir en `/biblioteca` y `/`             | Aceptado explícitamente por el usuario en Fase 1; queda documentado como deuda para un spec futuro de corrección de catálogo                                                              |
| El preview de siguiente pieza como overlay absoluto puede solaparse con el tablero en pantallas muy angostas donde `.crt-screen` se achica mucho | El preview es pequeño (120×120 escalado) y se ancla a una esquina fija; si se vuelve un problema real, ajustar tamaño/posición es un cambio aislado a `TetrisCanvas`                      |
| Portar manualmente ~305 líneas de `game.js` puede introducir bugs sutiles en wall-kicks o en el timing de `dropAccum` vs `dt`                    | Los criterios de aceptación cubren explícitamente rotación con wall-kick, limpieza de líneas, curva de velocidad por nivel y pieza fantasma — los puntos más fáciles de romper en un port |

---

## Qué **no** está en este spec

- Corrección del `cover`/`cat`/`title` de `bloque-buster` en la tabla `games`.
- Puerto de Arkanoid u otro juego de `references/started-games/`.
- Alta de fila nueva en `games` (no aplica — `bloque-buster` ya existe).
- Sonido, controles táctiles o remapeo de teclas.
- Cambios en `lib/scores.ts`, `lib/scores-server.ts` o `app/salon/*`.
- Actualizar `best`/`plays` de `bloque-buster` en la tabla `games`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
