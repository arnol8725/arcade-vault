# Receta de puerto de motor — referencia para `/nuevo-juego`

> Este archivo es la referencia que consulta el skill `nuevo-juego` al portar o diseñar un motor. No es texto para copiar literal — es el contrato de forma que el motor y el componente cliente deben respetar, más lo ya relevado de `references/started-games/`.

## Contrato genérico: motor (`lib/games/<slug>-engine.ts`)

Framework-agnóstico: no importa React, no toca `document`/`window` fuera de `start()`/`stop()`, salvo el `HTMLCanvasElement`/`CanvasRenderingContext2D` recibido por parámetro.

```ts
export interface <Name>EngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange?: (lives: number) => void; // omitir si el juego no tiene concepto de vidas
  onLevelChange?: (level: number) => void; // omitir si no tiene niveles/líneas
  onGameOver: (finalScore: number) => void; // se dispara UNA sola vez, edge-triggered
}

export interface <Name>Engine {
  start: () => void;   // agrega listeners, inicializa estado, arranca requestAnimationFrame
  stop: () => void;    // remueve listeners, cancela el rAF
  setPaused: (paused: boolean) => void; // congela update(), draw() sigue corriendo
  reset: () => void;   // reinicia estado sin tocar listeners
}

export function create<Name>Engine(
  canvas: HTMLCanvasElement,
  callbacks: <Name>EngineCallbacks,
): <Name>Engine;
```

Reglas que sigue `lib/games/asteroids-engine.ts` y que todo motor nuevo debe respetar:

- **Diff-and-report**: cada callback se compara contra el último valor reportado (sentinela `-1` inicial) y solo se dispara si cambió de verdad — nunca todos los frames. Evita saturar el estado de React.
- **`onGameOver` edge-triggered**: se dispara exactamente una vez, en el frame donde el estado transiciona a "game over"/"derrota"/"victoria". El motor **no** dibuja su propio overlay de fin de partida ni reinicia por tecla (`Space → init()`); esa responsabilidad es 100% del modal externo de `GamePlayer`.
- **Resolución interna fija**, dibujada vía `ctx`, escalada por CSS en el host (`width: 100%; height: 100%` dentro de `.crt-screen`, que ya tiene `aspect-ratio: 4/3`) — nunca tamaño relativo al viewport.
- **Listeners scoped al ciclo de vida**: se agregan en `start()` y se remueven en `stop()`, nunca fijados a nivel de módulo. `preventDefault()` en toda tecla que scrollearía la página (flechas, espacio).
- **Gate de precarga** si el juego depende de assets async (audio, spritesheet): el loop no arranca hasta que estén listos.

## Contrato genérico: componente cliente (`components/games/<slug>-canvas.tsx`)

```tsx
"use client";
interface <Name>CanvasProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
export function <Name>Canvas({ paused, ...callbacks }: <Name>CanvasProps) { ... }
```

- `canvasRef` + `engineRef`. Un `callbacksRef` guarda las últimas props de callback (actualizado en cada render vía un `useEffect` sin deps) para que el efecto de montaje pueda crear el motor **una sola vez** sin recrearlo cuando cambia la identidad de las funciones callback.
- Efecto de montaje (`useEffect([])`): crea el motor con `create<Name>Engine`, llama `engine.start()`; el cleanup llama `engine.stop()`.
- Efecto separado en `[paused]`: `engineRef.current?.setPaused(paused)`.
- `<canvas width={W} height={H} style={{ width: "100%", height: "100%" }} />` con `W×H` la resolución nativa del juego (800×600 en Asteroids/Arkanoid). Si el juego usa doble canvas (Tetris: tablero + preview de siguiente pieza), agregar un segundo `ref`/prop análogo.

## Wiring en `components/game-player.tsx`

Hoy existe un único punto de bifurcación: `const isAsteroids = game.id === "rocas";`. Para un juego nuevo, extender ese punto (booleano adicional o mapeo por `game.id`) para renderizar `<Slug Canvas key={resetKey} paused={paused} onScoreChange={setScore} ... onGameOver={endGame} />` dentro de `.crt-screen`, dejando el resto de `GamePlayer` (HUD, botones, modal de fin de partida, `saveScore`) sin cambios — ya es genérico. `restart()` ya incrementa `resetKey` para forzar el remount del canvas; no hace falta tocar esa lógica.

## Leaderboard y catálogo — ya genéricos, no tocar

- `lib/scores.ts` (`saveScoreToLeaderboard`) y `lib/scores-server.ts` (`getTopScoresByGame`, `getGlobalTopScores`, `getUserBestForGame`) reciben `gameId: string` sin ninguna rama por juego. `GamePlayer.saveScore()` ya llama a `saveScoreToLeaderboard(game.id, score)` para los 8 juegos por igual.
- `app/salon/page.tsx` + `components/salon-client.tsx` iteran sobre `getGames()` genéricamente — un juego nuevo aparece solo con que exista su fila en `games`.
- **Conclusión**: agregar un motor real (o un juego nuevo) no requiere ningún cambio en el stack de leaderboard — solo que la fila de `games` exista con el `id` correcto.

## Comparación de los juegos ya relevados en `references/started-games/`

| Aspecto | `02-asteroids` (ya portado en `rocas`) | `03-tetris` | `04-arkanoid` |
|---|---|---|---|
| Forma OOP | 5 clases (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`), cada una con `update(dt)`/`draw()` | Sin clases — objetos/arrays planos (`board`, `current`/`next`, `PIECES`, `COLORS`) | Sin clases — objetos planos (`paddle`, `ball`, `blocks[]`, `explosions[]`); datos de nivel en `levels.js` aparte |
| `update`/`draw` | Separados, `dt` en segundos (cap 0.05) | Sin `update(dt)` propio — la gravedad está inline en el loop (`dropAccum` vs `dropInterval`, `dt` en ms) | Separados, `dt` en segundos (sin cap) |
| Input | Teclado (`←` `→` `↑` `Espacio`) | Teclado (`←` `→` `↓` `↑`/`X` rotar, `Espacio` hard drop, `P` pausa) | Teclado (`←` `→`, `P`/`Escape`) **+ mouse** (`mousemove` mueve la paleta, `click` sobre botones dibujados en el propio canvas durante la pausa) |
| Sonido | No | No | **Sí** — dos `Audio` reproducidos vía `.cloneNode().play()` en colisiones; requiere assets servidos desde `public/` y preload |
| Canvas | 1 × 800×600 | **2** — tablero 300×600 + preview de siguiente pieza 120×120 | 1 × 800×600, con spritesheet PNG cargado async antes de arrancar el loop |
| Concepto de "vidas" | Sí (3 vidas) | No — solo score/líneas/nivel | Sí |
| Acoplamientos a limpiar al portar | — (ya resuelto en `asteroids-engine.ts`) | Botón de restart real (`#restart-btn`) compartido por pausa y game over; toggle de tema vía `localStorage` y `getComputedStyle(...).getPropertyValue('--grid-line')` — descartar, no son parte de la lógica del juego | Botones de "saltar a nivel" dibujados y clickeados dentro del propio canvas durante la pausa — candidatos a convertirse en controles React reales en vez de UI-en-canvas; rutas de assets (`assets/...`) deben pasar a `public/` |
| Complejidad relativa | Base (línea de partida, ~420 líneas) | Más simple en entidades, pero dos canvases y sistema de rotación con wall-kick | Más compleja: carga de sprites async, archivo de niveles aparte, audio real, doble esquema de input, UI interactiva dentro del canvas |

## Si el juego es "desde cero" (sin carpeta de referencia)

Mismo contrato de arriba, sin el paso de portar un archivo existente: diseñar directamente las entidades/constantes y el loop `update(dt)`/`draw()` en `lib/games/<slug>-engine.ts` respetando la factory `create<Name>Engine(canvas, callbacks): <Name>Engine`. Vale la pena dejar por escrito, en la sección "Modelo de datos" del spec de la Fase 3, un resumen corto de entidades/constantes/condición de derrota-victoria antes de codear.
