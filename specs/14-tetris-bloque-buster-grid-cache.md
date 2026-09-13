# SPEC 14 — Performance del grid del tablero en Bloque Buster (Tetris)

> **Status:** Implementado
> **Depends on:** SPEC 08 (motor de Tetris / Bloque Buster)
> **Date:** 2026-09-13
> **Objective:** Eliminar el redibujado por-frame de las líneas de grilla estáticas del tablero en `lib/games/tetris-engine.ts`, cacheando fondo + grilla en un canvas offscreen pre-renderizado una sola vez y compositándolo con `ctx.drawImage()`, sin cambiar el resultado visual.

---

## Contexto (diagnóstico previo a este spec)

Auditoría de código confirmó la causa raíz antes de escribir el plan:

- `drawGrid()` (`lib/games/tetris-engine.ts:361-376`) dibuja las líneas de la grilla del tablero (9 verticales + 19 horizontales = **28 líneas**, fijas por `COLS=10`, `ROWS=20`, `BLOCK=30`) con un `ctx.beginPath()` + `ctx.moveTo()` + `ctx.lineTo()` + `ctx.stroke()` **independiente por cada línea**, es decir 28 operaciones de stroke separadas.
- `draw()` (`lib/games/tetris-engine.ts:378-411`) llama a `drawGrid()` de forma incondicional en **cada frame** del loop: `loop()` (línea 461) ejecuta `draw()` siempre que `state !== "gameover"`, incluso con `paused === true` (la pausa solo desactiva `update(dt)` en la línea 456, nunca el dibujo). Resultado: 28 strokes × ~60fps = ~1680 operaciones de dibujo por segundo dedicadas exclusivamente a una grilla que **nunca cambia** durante toda la vida del motor — ni las coordenadas ni el color (`GRID_LINE_COLOR`) dependen de ningún estado del juego.
- Lo mismo ocurre con el fondo: `ctx.fillRect(0, 0, BOARD_W, BOARD_H)` en `draw()` línea 379-380 se repite cada frame junto con la grilla, aunque ambos (fondo + grilla) forman una capa 100% estática.
- El mismo patrón (grilla estática redibujada con un `beginPath`/`stroke` por línea, en cada frame) existe también en `lib/games/serpentina-engine.ts:351-366` (`drawGrid()`). Queda **fuera de alcance** de este spec — un spec por juego, como exige el proceso — pero se documenta para que, si se decide auditar Serpentina, no se trate como hallazgo nuevo sin contexto.
- `asteroids-engine.ts` y `frogger-engine.ts` también usan `beginPath()` varias veces por frame, pero en esos casos es para dibujar entidades dinámicas (naves, balas, autos, troncos) cuya posición cambia cada frame — no aplica el mismo diagnóstico de "contenido estático redibujado como si fuera dinámico". `arkanoide-engine.ts` no usa `beginPath()` en absoluto.

---

## Alcance

**In:**

- Cachear la capa estática del tablero (`fillRect` de fondo + las 28 líneas de `drawGrid()`) en un `<canvas>` offscreen de `BOARD_W × BOARD_H`, renderizado **una sola vez** (al crear el motor o de forma perezosa en el primer frame).
- Reemplazar, dentro de `draw()`, el par `ctx.fillStyle = CANVAS_BG; ctx.fillRect(...)` + `drawGrid()` por un único `ctx.drawImage(cachedBackground, 0, 0)`.
- Conservar `drawGrid()` como función interna solo si sigue haciendo falta para construir el cache una vez; si no, puede inlinearse en la función que construye el cache.
- Medición manual antes/después con Chrome DevTools (Performance recording y/o FPS meter) en el mismo escenario reproducible: partida en curso con nivel alto (drop rápido) para maximizar frames dibujados en la ventana de medición.
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- El mismo patrón en `lib/games/serpentina-engine.ts` (`drawGrid()` línea 351) — comparte el antipatrón pero es un motor distinto; si se decide atacarlo, es un spec dedicado a Serpentina, no una extensión de este.
- Cambios visuales al tablero (color de fondo, color o grosor de las líneas de grilla) — el objetivo es idéntico resultado visual, más barato de renderizar.
- Optimizar el redibujado de los bloques del tablero (`drawBlock()`, llamado ~200+ veces por frame para las celdas ocupadas, la pieza actual y el fantasma) — esas celdas sí cambian de frame a frame (pieza en movimiento, líneas que se limpian) y no aplica el mismo diagnóstico de "contenido estático". Si se quiere optimizar ese camino, es otro spec con su propio diagnóstico.
- Cambios de lógica de juego (colisiones, rotación, clear de líneas, niveles, scoring) — este spec toca únicamente el código de dibujo del fondo/grilla.
- Cambios a `components/games/tetris-canvas.tsx` o al wiring en `components/game-player.tsx` — el fix vive enteramente dentro del motor.
- Overlay de FPS visible en producción o telemetría de performance persistente — la medición de este spec es manual, puntual, con DevTools.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

No se introduce persistencia nueva ni tipos públicos nuevos (no cambia la interfaz de `createTetrisEngine`). Se agrega estado interno privado al motor:

```ts
// lib/games/tetris-engine.ts (dentro del closure de createTetrisEngine)

// Canvas offscreen con el fondo + la grilla ya renderizados una sola vez.
// BOARD_W, BOARD_H, BLOCK, COLS, ROWS, CANVAS_BG y GRID_LINE_COLOR son
// constantes del módulo, así que esta capa no necesita invalidarse nunca
// durante la vida del motor — no hay resize dinámico ni theming en runtime.
let boardBackground: HTMLCanvasElement | null = null;

function getBoardBackground(): HTMLCanvasElement {
  if (boardBackground) return boardBackground;
  const bg = document.createElement("canvas");
  bg.width = BOARD_W;
  bg.height = BOARD_H;
  const bgCtx = bg.getContext("2d");
  if (!bgCtx)
    throw new Error(
      "Could not get a 2D context for the board background cache",
    );
  bgCtx.fillStyle = CANVAS_BG;
  bgCtx.fillRect(0, 0, BOARD_W, BOARD_H);
  // ...dibuja las 28 líneas de grilla una sola vez, acá.
  boardBackground = bg;
  return boardBackground;
}
```

---

## Plan de implementación

1. **Medición baseline.** Levantar `/juego/bloque-buster/jugar` con `npm run dev`, jugar hasta un nivel alto (drop rápido, más frames por segundo de juego real) y grabar un Performance profile de Chrome DevTools (o leer el FPS meter) durante ~10s. Guardar el número (FPS promedio o duración de frame, con atención particular al tiempo consumido en llamadas a `stroke`/`drawGrid` dentro del profile) como referencia de "antes". No se toca código todavía.
2. Agregar `boardBackground: HTMLCanvasElement | null` al closure del motor, inicializado en `null`.
3. Escribir `getBoardBackground()`: si `boardBackground` ya existe, lo devuelve; si no, crea el `<canvas>` offscreen de `BOARD_W × BOARD_H`, dibuja ahí el `fillRect` de fondo y las 28 líneas de grilla (reutilizando la lógica actual de `drawGrid()`, pero apuntando al contexto offscreen), guarda el resultado y lo devuelve.
4. En `draw()`, reemplazar `ctx.fillStyle = CANVAS_BG; ctx.fillRect(0, 0, BOARD_W, BOARD_H); drawGrid();` por `ctx.drawImage(getBoardBackground(), 0, 0);`.
5. Eliminar o dejar `drawGrid()` como función auxiliar privada usada solo desde `getBoardBackground()` (no debe seguir llamándose desde el loop de render por frame).
6. Verificación visual manual: jugar una partida completa y confirmar que el tablero se ve **idéntico** al de antes del cambio — mismo color de fondo, mismas líneas de grilla, mismo comportamiento con el juego pausado y sin pausar.
7. Medición final. Repetir el mismo profile/escenario del paso 1 con el código nuevo y comparar contra el baseline.
8. `npm run build` y `npm run lint`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `draw()` ya no llama a `ctx.beginPath()`/`ctx.stroke()` por cada línea de grilla en el loop de render — el fondo + grilla estáticos se pintan con un único `ctx.drawImage()` por frame.
- [ ] El resultado visual del tablero es indistinguible del actual: mismo color de fondo, mismas 28 líneas de grilla, mismo comportamiento en pausa y durante el juego normal.
- [ ] El cache del fondo se construye una sola vez por vida del motor (no se reconstruye en cada frame ni en cada `reset()`, salvo que `reset()` requiera explícitamente reinicializarlo — a decidir en el paso 6 según si hace falta soportar reset del canvas subyacente).
- [ ] La medición final (Performance profile o FPS meter de Chrome DevTools) en el mismo escenario de nivel alto muestra una mejora medible frente al baseline del paso 1 del plan, o se documenta explícitamente si la mejora resultó marginal.
- [ ] No hay regresión en la lógica de juego (colisiones, rotación, clear de líneas, niveles, scoring) — el cambio es exclusivamente de dibujo del fondo/grilla.

---

## Decisiones

- **Sí:** cachear fondo + grilla juntos en un único canvas offscreen en vez de cachear solo la grilla y seguir haciendo `fillRect` del fondo por separado cada frame. Ambos son igual de estáticos, así que componerlos en una sola capa reduce el costo por frame a una única llamada `drawImage()` en vez de dos operaciones (`fillRect` + `drawImage`).
- **Sí:** cache construido de forma perezosa en el primer `draw()` (o en la creación del motor, a decidir en implementación) en vez de pre-renderizarlo fuera del closure del motor. El canvas offscreen necesita `document.createElement`, que requiere DOM disponible — coherente con que el motor ya asume DOM dentro de `start()`/`stop()`, pero evita acoplar la construcción del cache a un momento específico del ciclo de vida si no es necesario.
- **Sí:** alcance limitado a Bloque Buster (Tetris). La auditoría de código (grep de `beginPath` en los 5 motores) confirmó que Serpentina comparte el mismo patrón exacto, pero abrir alcance a otro motor sin que el usuario lo pida específicamente sería trabajo especulativo — un spec por juego, como ya establece el proceso.
- **No:** optimizar `drawBlock()` ni el redibujado de las celdas ocupadas/pieza actual/fantasma en este spec. Esas celdas sí cambian de frame a frame; cachear contenido dinámico no aplica y el diagnóstico de este spec es específicamente sobre contenido estático redibujado innecesariamente.
- **No:** overlay de FPS en producción ni telemetría persistente. Medición manual puntual con DevTools, igual que en spec 13.
- **No:** tocar el color de fondo, el color de la grilla, ni ninguna otra decisión visual existente. Este spec es de performance pura, resultado visual intacto.

---

## Riesgos

| Riesgo                                                                                                                                                                            | Mitigación                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El cache offscreen se crea con dimensiones o contexto mal inicializados y el tablero queda en blanco o desalineado                                                                | Verificación visual manual explícita en el paso 6 del plan, jugando una partida completa antes de dar el spec por cerrado                                                                                                                                                              |
| La mejora medida en DevTools es marginal porque el costo real de `drawGrid()` ya era bajo frente al resto del frame (200+ `drawBlock()` por frame)                                | El baseline del paso 1 se toma antes de tocar código; si la comparación del paso 7 no muestra mejora clara, el spec no se cierra como "resuelto por performance" — se documenta el hallazgo igual, ya que reduce trabajo de la GPU/rasterizador aunque el impacto en FPS no sea grande |
| `reset()` o algún flujo futuro espera que el canvas del tablero se reconstruya visualmente desde cero, y el cache estático queda "pegado" tapando un estado que debería limpiarse | El cache cubre únicamente fondo + grilla (contenido 100% estático); las celdas, pieza actual y fantasma siguen dibujándose por encima en cada frame sin cambios, así que `reset()` no necesita invalidar el cache — confirmar esto explícitamente en el paso 6                         |

---

## Qué **no** está en este spec

- Auditoría o cambios de performance en `serpentina`, `asteroids`, `arkanoide` o `frogger` (Serpentina comparte el mismo patrón de grilla estática, pero queda para un spec dedicado).
- Optimización de `drawBlock()` o del redibujado de celdas dinámicas del tablero.
- Cambios visuales al fondo o a la grilla del tablero.
- Cambios de lógica/reglas de juego de Tetris (colisiones, rotación, clear de líneas, niveles, scoring).
- Overlay de FPS en producción o telemetría de performance persistente.
- Cambios a `tetris-canvas.tsx` o al wiring en `game-player.tsx`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
