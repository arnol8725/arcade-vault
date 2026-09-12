# Burbujas — game-jam

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-09-11
> **Objective:** Dar de alta el juego `burbujas` en el catálogo de Supabase y construir desde cero un motor de bubble shooter (disparo de burbujas de color contra una grilla hexagonal, match-3 y caída de racimos sueltos) en `lib/games/burbujas-engine.ts`, integrado en `GamePlayer` con puntaje y nivel reales.

---

## Alcance

**In:**

- Alta de una fila nueva en `games` (Supabase): `id: "burbujas"`, `title: "BURBUJAS"`, `cat: "PUZZLE"`, `cover: "cover-burbujas"`, `color: "cyan"`, `best: 0`, `plays: "0"`, `sort_order: 10`.
- Nueva clase CSS `.cover-burbujas` en `app/globals.css`, mismo patrón que `.cover-arkanoide`/`.cover-rocas` (gradiente de fondo + pseudo-elemento con el motivo, acá círculos concéntricos cyan/magenta), para que la card del catálogo no quede sin portada.
- Motor nuevo, diseñado desde cero (no hay carpeta en `references/started-games/`), en `lib/games/burbujas-engine.ts`: canvas 800×600 (misma resolución que `rocas`/`arkanoide`, encaja en el `aspect-ratio: 4/3` de `.crt-screen`), grilla hexagonal de filas escalonadas, cañón fijo en la base, burbuja en vuelo con rebote en paredes laterales y snap a celda al colisionar.
- Reglas de juego: el cañón apunta con `←`/`→` (y con `mousemove` sobre el canvas) y dispara con `Espacio` o clic; la burbuja disparada rebota en las paredes laterales, se pega al tocar el techo u otra burbuja y se ancla en la celda libre más cercana; un racimo de 3 o más del mismo color conectado a la burbuja recién pegada explota y suma puntos; las burbujas que quedan sin camino hasta la fila superior caen y suman puntos extra (más que las explotadas por color); cada `SHOTS_PER_DROP` disparos sin explotar nada, toda la grilla desciende una fila.
- Cola de disparo visible: burbuja actual + siguiente, ambas sorteadas solo entre los colores que todavía existen en la grilla (evita disparos imposibles de matchear).
- Condición de victoria de nivel: limpiar la grilla completa → sube el nivel, se repuebla la grilla con más filas iniciales y un color más en la paleta (hasta un tope de colores), y se reinicia el contador de disparos.
- Condición de derrota: cualquier burbuja anclada cruza la línea de muerte (fila `DEATH_ROW`, dibujada como línea punteada sobre el cañón) → `onGameOver` una sola vez.
- Crear `components/games/burbujas-canvas.tsx` (`"use client"`) siguiendo el patrón de `AsteroidsCanvas`/`ArkanoideCanvas`: `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]` que crea y arranca el motor y lo detiene en el cleanup, efecto separado en `[paused]` que llama `setPaused`.
- Wire en `components/game-player.tsx`: extender el único punto de bifurcación (`isAsteroids`/`isTetris`/`isArkanoide`/`isSerpentina`) con `isBurbujas = game.id === "burbujas"` y un estado `burbujasLevel` (mismo patrón que `arkanoideLevel`), excluyéndolo del `setInterval` de puntaje simulado.
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Vidas: este juego es de una sola "vida" (cruzar la línea de muerte es fin de partida directo). Un modelo de 3 intentos con limpieza parcial de filas sería otro spec.
- Power-ups (burbuja bomba, burbuja arcoíris/comodín, rayo que limpia una fila) — se pueden agregar después sin tocar el núcleo de match-3.
- Sonido (pop, disparo, caída de racimo) — no hay assets de audio para este juego; agregarlos implica buscar/generar sonidos, que es otro spec.
- Niveles diseñados a mano (layouts fijos tipo campaña) — acá la grilla inicial es generada aleatoriamente con semilla de nivel.
- Controles táctiles/mobile (arrastrar para apuntar, tap para disparar).
- Actualizar `best`/`plays` con datos reales derivados de partidas.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Fila nueva en `games` (Supabase, ver SPEC 06 para el esquema de la tabla). `sort_order: 10` es el siguiente libre tras `arkanoide` (9) al momento de redactar este spec; los tres conceptos de este game-jam comparten ese candidato, así que confirmar con `select max(sort_order) from games` antes de insertar:

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values (
  'burbujas',
  'BURBUJAS',
  'Apuntá, dispará y hacé estallar racimos de tres o más.',
  'Un cañón en la base escupe burbujas de color contra un techo que baja sin pausa. Junta tres del mismo color para reventarlas y cortá los racimos por su base para que todo el bloque se desplome. Si la espuma cruza la línea roja, se acabó.',
  'PUZZLE',
  'cover-burbujas',
  'cyan',
  0,
  '0',
  10
);
```

Contrato del motor (`lib/games/burbujas-engine.ts`), framework-agnóstico, sin React ni acceso a `document`/`window` fuera de `start()`/`stop()`:

```ts
export interface BurbujasEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void; // edge-triggered, una sola vez
}

export interface BurbujasEngine {
  start: () => void; // agrega listeners, inicializa la grilla, arranca el rAF
  stop: () => void; // remueve listeners, cancela el rAF
  setPaused: (paused: boolean) => void; // congela update(), draw() sigue corriendo
  reset: () => void; // score 0, nivel 1, grilla inicial, sin tocar listeners
}

export function createBurbujasEngine(
  canvas: HTMLCanvasElement,
  callbacks: BurbujasEngineCallbacks,
): BurbujasEngine;
```

Sin `onLivesChange`: el juego no tiene concepto de vidas (ver Decisiones).

Entidades y constantes internas (sin exportar):

```ts
const WIDTH = 800;
const HEIGHT = 600;
const RADIUS = 20; // radio de burbuja en px
const COL_W = RADIUS * 2; // 40 — paso horizontal
const ROW_H = Math.round(RADIUS * Math.sqrt(3)); // ~35 — paso vertical (filas escalonadas)
const COLS = 19; // filas pares: 19 celdas; filas impares: 18, desplazadas RADIUS px
const ROWS = 14; // filas lógicas máximas
const DEATH_ROW = 12; // cruzarla = game over
const SHOTS_PER_DROP = 8; // disparos sin explotar antes de bajar la grilla
const SHOT_SPEED = 620; // px/s de la burbuja en vuelo
const POP_POINTS = 10; // por burbuja explotada por color
const DROP_POINTS = 25; // por burbuja caída al quedar sin ancla

type BubbleColor = 0 | 1 | 2 | 3 | 4 | 5;

interface Cell {
  color: BubbleColor | null; // null = celda vacía
}

interface FlyingBubble {
  x: number; // px
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

type EngineState = "aiming" | "flying" | "resolving" | "gameover";
```

Conventions:

- La grilla se guarda como `Cell[ROWS][COLS]`; la conversión a píxel vive solo en `draw()` y en el snap (`cellToPixel(row, col)` / `pixelToCell(x, y)`), nunca en la lógica de match.
- El match-3 es un flood fill BFS desde la celda recién ocupada, restringido a vecinos del mismo color (6 vecinos hexagonales).
- Los racimos huérfanos se detectan con un flood fill inverso desde la fila 0: todo lo no alcanzado cae.
- El puntaje es entero y monotónico creciente: nunca se resta.
- El ángulo del cañón se clampea a `[-80°, 80°]` respecto de la vertical para que no dispare horizontal contra las paredes indefinidamente.

---

## Plan de implementación

1. Insertar la fila de `games` vía migración Supabase y agregar `.cover-burbujas` en `app/globals.css`. Verificar que la card aparezca en `/biblioteca` y el detalle en `/juego/burbujas`.
2. Crear `lib/games/burbujas-engine.ts` con las constantes, los tipos internos, el estado (`grid`, `flying`, `current`, `next`, `angle`, `shotsSinceDrop`, `score`, `level`, `state`) y la factory `createBurbujasEngine(canvas, callbacks)` devolviendo `{ start, stop, setPaused, reset }` sin lógica de juego todavía (loop + `draw()` de la grilla estática).
3. Implementar geometría de grilla: `cellToPixel`, `pixelToCell`, `neighbors(row, col)` (6 vecinos con offset por paridad de fila) y `generateGrid(level)` (filas iniciales pobladas según nivel, paleta de colores según nivel).
4. Implementar el disparo: apuntado con `←`/`→` y `mousemove`, `Espacio`/`click` pasa a `state = "flying"` con `vx`/`vy` desde el ángulo; `update(dt)` mueve la burbuja, rebota en `x < RADIUS` y `x > WIDTH - RADIUS`, y detecta colisión contra techo o contra cualquier burbuja anclada (distancia < `RADIUS * 1.8`).
5. Implementar el snap y la resolución: ocupar la celda libre más cercana al punto de impacto, flood fill de color (≥3 → explotar, `POP_POINTS` c/u), flood fill de huérfanos desde la fila 0 (`DROP_POINTS` c/u), actualizar `score` con diff-and-report.
6. Implementar el descenso: si el disparo no explotó nada, incrementar `shotsSinceDrop`; al llegar a `SHOTS_PER_DROP`, desplazar toda la grilla una fila hacia abajo y resetear el contador. Chequear `DEATH_ROW` tras cada resolución → `state = "gameover"` + `onGameOver(score)` una sola vez.
7. Implementar la victoria de nivel: grilla vacía → `level++`, `onLevelChange(level)`, regenerar grilla con una fila extra y un color más (tope 6), resetear `shotsSinceDrop`.
8. Implementar `draw()`: fondo, grilla de burbujas (círculos con gradiente radial y brillo especular, todo vectorial con `ctx`), burbuja en vuelo, línea de muerte punteada, cañón con su ángulo, guía de puntitos del trayecto, y la cola actual/siguiente. **No** dibujar overlay de "GAME OVER" ni HUD que compita con el de `GamePlayer`.
9. Crear `components/games/burbujas-canvas.tsx` con `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]` (crear + `start()`, cleanup `stop()`), efecto `[paused]` → `setPaused`, `<canvas width={800} height={600} style={{ width: "100%", height: "100%" }} />`.
10. Wire en `components/game-player.tsx`: `isBurbujas`, estado `burbujasLevel`, inclusión en la derivación de `level`, exclusión del `setInterval` simulado, reset en `restart()`, render condicional dentro de `.crt-screen`.
11. Correr `npm run build` y `npm run lint`.
12. Verificación manual end-to-end en `/juego/burbujas/jugar`: apuntar, disparar, explotar un racimo, cortar un racimo para que caiga, dejar que la grilla baje hasta la línea de muerte, confirmar el modal de fin de partida, guardar puntaje y jugar de nuevo.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/burbujas-engine.ts` no importa React ni toca `document`/`window` fuera de `start()`/`stop()`.
- [ ] `/biblioteca` muestra la card de `BURBUJAS` con la portada `.cover-burbujas` y `/juego/burbujas` muestra su detalle.
- [ ] `←`/`→` y `mousemove` mueven el ángulo del cañón sin provocar scroll de la página.
- [ ] `Espacio` o clic dispara una burbuja y no se puede disparar otra hasta que la anterior se ancle.
- [ ] La burbuja en vuelo rebota en las paredes laterales y nunca se sale del canvas.
- [ ] Al anclarse, la burbuja queda alineada a una celda de la grilla (sin superposiciones visibles).
- [ ] Un racimo de 3 o más del mismo color conectado a la burbuja recién pegada explota y suma puntos.
- [ ] Un racimo que queda sin conexión a la fila superior cae y suma puntos con una tarifa mayor que la explosión por color.
- [ ] Tras `SHOTS_PER_DROP` disparos sin explotar nada, toda la grilla desciende una fila.
- [ ] Limpiar la grilla sube el nivel, repuebla la grilla y lo refleja en el HUD externo de `GamePlayer`.
- [ ] Cruzar la línea de muerte dispara `onGameOver` exactamente una vez, con el puntaje real.
- [ ] El canvas no dibuja su propio overlay de "GAME OVER" ni reinicia por tecla.
- [ ] "GUARDAR PUNTUACIÓN" persiste `{ game: "burbujas", score, ... }` en `localStorage["av_scores"]` y, con sesión, en Supabase vía `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, nivel 1, grilla inicial).
- [ ] "PAUSA" congela la burbuja en vuelo y "REANUDAR" continúa sin salto de posición.
- [ ] Navegar fuera de `/juego/burbujas/jugar` no deja listeners de teclado ni de mouse colgados.
- [ ] Ningún otro `game.id` cambia de comportamiento.
- [ ] `/salon` muestra `burbujas` con su leaderboard real, sin tocar `lib/scores*.ts`.

---

## Decisiones

- **Sí:** grilla hexagonal de filas escalonadas en vez de grilla cuadrada. Es lo que hace que el snap y los racimos se vean "de burbujas" y no de ladrillos; el costo es una función `neighbors()` con offset por paridad, trivial de escribir.
- **Sí:** snap a celda al colisionar, en vez de dejar las burbujas en posición libre. Sin grilla lógica el match-3 y la detección de huérfanos se vuelven geometría continua, mucho más cara y frágil.
- **Sí:** sortear los colores de la cola solo entre los presentes en la grilla. Sin eso, en partidas avanzadas el cañón entrega colores inútiles y la derrota se siente arbitraria.
- **Sí:** puntaje mayor por burbuja caída que por burbuja explotada. Premia la jugada de cortar el racimo por la base, que es la decisión interesante del género.
- **No:** vidas. El género se juega a una sola vida; cruzar la línea de muerte es el final natural. Agregar vidas obligaría a inventar una regla de "limpieza parcial" al revivir, que no aporta.
- **No:** power-ups ni comodines en esta versión. El núcleo (match-3 + huérfanos + descenso) ya llena una sesión de 1 a 5 minutos; los power-ups son una capa encima, no un requisito.
- **No:** assets externos (sprites/audio). Todo se dibuja con `ctx` (gradientes radiales + brillo especular), así que el motor no necesita gate de precarga y no puede fallar por un 404.
- **No:** layouts de nivel diseñados a mano. La generación por nivel da rejugabilidad sin un archivo de datos aparte.

---

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| El snap elige una celda ya ocupada o "atraviesa" burbujas si la velocidad es alta                 | Integrar el movimiento en subpasos cuando `SHOT_SPEED * dt > RADIUS` y, al impactar, elegir la celda libre más cercana al centro de impacto |
| Los offsets de vecinos por paridad de fila se equivocan y el flood fill deja racimos sin explotar | Escribir `neighbors()` como tabla explícita de 6 offsets por paridad y probarla a mano en la verificación del paso 12                       |
| El flood fill de huérfanos sobre toda la grilla cada disparo puede notarse en el frame             | La grilla es de 14×19 ≈ 266 celdas: un BFS completo es despreciable; además solo corre en `state = "resolving"`, no todos los frames        |
| Con paleta de 6 colores el nivel alto se vuelve injugable                                          | Tope explícito de colores por nivel y cola sorteada solo entre colores presentes en la grilla                                                |

---

## Qué **no** está en este spec

- Vidas o reintentos parciales — es a una sola vida.
- Power-ups, comodines o burbujas especiales.
- Sonido de pop, disparo o caída.
- Niveles diseñados a mano.
- Controles táctiles/mobile.
- Actualizar `best`/`plays` con datos reales.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
