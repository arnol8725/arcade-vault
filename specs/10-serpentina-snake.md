# SPEC 10 — Motor real de Snake en el juego "SERPENTINA"

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 05
> **Date:** 2026-09-08
> **Objective:** Reemplazar el arena decorativa y el puntaje simulado de `GamePlayer` para el juego `serpentina` por un motor real de Snake diseñado desde cero (sin carpeta de referencia, con el sprite atlas de `references/source-assets/snake-assets/`), portado al mismo patrón de componente React/TypeScript con canvas usado en `rocas`, `bloque-buster` y `arkanoide`.

---

## Alcance

**In:**

- Diseñar desde cero (no hay `game.js` de origen) el motor de Snake en `lib/games/serpentina-engine.ts`: grilla de 40×30 celdas de 20px sobre un canvas de 800×600 (misma resolución que `rocas`/`arkanoide`, encaja en el `aspect-ratio: 4/3` ya fijo de `.crt-screen`), serpiente representada como lista de segmentos en coordenadas de grilla, loop a intervalo fijo (no `dt` continuo — el movimiento avanza una celda por "tick"), fruta única en pantalla dibujada con el sprite atlas de `public/games/serpentina/fruits.png` (fila pixel-art, coordenadas de `sprites.js`).
- Copiar los assets a `public/games/serpentina/`: `fruits.png` y una versión adaptada de `sprites.js` (o las coordenadas embebidas directamente en el engine — ver Decisiones) para que Next.js los sirva como estáticos, igual que `public/games/arkanoide/spritesheet-breakout.png`.
- Reglas de juego: mover la serpiente con `↑` `↓` `←` `→` (sin permitir invertir 180° sobre sí misma en el mismo tick); comer la fruta suma puntos, alarga la serpiente un segmento y hace aparecer una fruta nueva en una celda libre aleatoria con una skin aleatoria del atlas; cada `N` frutas comidas sube el nivel y acelera el intervalo de movimiento (tope mínimo de velocidad); choque contra el borde del tablero **o** contra el propio cuerpo resta una vida y respawnea la serpiente en el centro con longitud inicial y una breve invencibilidad parpadeante (mismo patrón que `ship.invincible`/`state: "dead"` de `asteroids-engine.ts`), conservando score y nivel; el juego termina (`onGameOver`) cuando las vidas llegan a 0.
- Crear `components/games/serpentina-canvas.tsx` siguiendo el mismo patrón que `AsteroidsCanvas`/`ArkanoideCanvas`: `canvasRef`/`engineRef`, `callbacksRef` para no recrear el motor en cada render, efecto de montaje (`[]`) que crea y arranca el motor y lo detiene en el cleanup, efecto separado en `[paused]` que llama `setPaused`, canvas 800×600 escalado por CSS.
- Precargar `fruits.png` (`new Image()` + `onload`) antes de arrancar el primer frame — mismo gate de precarga que usa `arkanoide-engine.ts` para su spritesheet.
- Wire en `components/game-player.tsx`: extender el punto donde hoy viven `isAsteroids`/`isTetris`/`isArkanoide` para agregar `isSerpentina = game.id === "serpentina"`, renderizando `<SerpentinaCanvas key={resetKey} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setSerpentinaLevel} onGameOver={endGame} />` dentro de `.crt-screen`. El resto de `GamePlayer` (HUD, botones, modal de fin de partida, `saveScore`) no cambia de lógica.
- Para cualquier otro `game.id` (`bloque-buster`, `caida`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` — ya cubiertos: `rocas`, `bloque-buster`, `arkanoide`), `GamePlayer` sigue exactamente igual que hoy.

**Out of scope (para specs futuros):**

- Alta nueva de catálogo en `games` — `serpentina` ya existe como fila (`sort_order: 3`, título `SERPENTINA`). Este spec no toca Supabase.
- Portar cualquier otro juego a su slot real (`gloton`, `caida`, `invasores`, `ranaria`, `duelo-pixel`) — cada uno es su propio spec.
- Sonido — el atlas provisto solo trae sprites de frutas, sin audio; no se agrega sonido en este spec.
- Wrap de bordes (la serpiente atraviesa el borde y reaparece del lado opuesto) — decisión ya cerrada por el usuario: choque contra el borde mata.
- Controles táctiles/mobile o remapeo de teclas — solo flechas de teclado.
- Actualizar los valores decorativos `best`/`plays` de `serpentina` en `lib/games.ts`.
- Migrar `av_scores` de `localStorage`/Supabase — ya resuelto por SPEC 07, sin cambios de forma.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no introduce persistencia nueva ni tablas ni filas de catálogo (`serpentina` ya existe en `games`). Los tipos nuevos son internos del motor, sin almacenamiento:

```ts
// lib/games/serpentina-engine.ts
export type EngineState = "playing" | "dead" | "gameover";

export interface SerpentinaEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface SerpentinaEngine {
  start: () => void; // precarga fruits.png, arranca el loop, agrega listeners
  stop: () => void; // cancela el loop y remueve listeners
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, nivel 1
}
```

Entidades internas (sin exportar):

```ts
// Coordenadas de grilla, no de píxel
const COLS = 40;
const ROWS = 30;
const CELL = 20; // px — COLS*CELL = 800, ROWS*CELL = 600

interface SnakeSegment {
  x: number; // 0..COLS-1
  y: number; // 0..ROWS-1
}

interface Fruit {
  x: number;
  y: number;
  skin: keyof typeof FRUIT_SKINS; // ej. "apple", "cherry" — ver sprites.js
}
```

Conventions:

- Coordenadas de grilla, origen arriba-izquierda; conversión a píxel solo en `draw()` (`gx * CELL`, `gy * CELL`).
- El intervalo de movimiento (ms/tick) es el análogo de la "velocidad"; baja con cada fruta comida hasta un piso mínimo, nunca en px/frame.
- El atlas de sprites (`FRUIT_SKINS`) se define en el propio engine con las coordenadas ya relevadas en `references/source-assets/snake-assets/snake-assets/sprites.js` (fila pixel-art, `y: 136–295` del PNG fuente), no se importa `sprites.js` tal cual (ver Decisiones).

---

## Plan de implementación

1. Copiar `references/source-assets/snake-assets/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`.
2. Crear `lib/games/serpentina-engine.ts`: constantes de grilla (`COLS`, `ROWS`, `CELL`), tabla `FRUIT_SKINS` con los recortes `{ x, y, w, h }` de la fila pixel-art de `fruits.png` (adaptados de `sprites.js`), estado (`snake: SnakeSegment[]`, `dir`, `nextDir`, `fruit: Fruit`, `score`, `lives`, `level`, `state`, `moveInterval`, `moveAccum`, `invincible`). Factory `createSerpentinaEngine(canvas, callbacks): SerpentinaEngine` con precarga de `fruits.png` antes del primer frame (gate de precarga, mismo patrón que `arkanoide-engine.ts`).
3. Implementar `update(dt)`: acumula `dt` en `moveAccum`; cuando supera `moveInterval`, avanza la serpiente una celda en `dir` (aplicando `nextDir` ya validado contra reversa de 180°), chequea colisión con fruta (alarga, suma puntos, sube nivel cada N frutas, reduce `moveInterval` con piso mínimo, genera fruta nueva en celda libre con skin aleatoria) y colisión con borde/cuerpo propio (`killSnake()`: resta vida, si `lives<=0` → `state = "gameover"`, si no → `state = "dead"` con timer breve y respawn en el centro con invencibilidad parpadeante, igual patrón que `killShip()`/`state: "dead"` en `asteroids-engine.ts`).
4. Implementar `draw()`: fondo, grilla sutil opcional, segmentos de la serpiente (rectángulos/redondeados), fruta actual vía `ctx.drawImage(fruitImg, skin.x, skin.y, skin.w, skin.h, dx, dy, CELL, CELL)`, HUD propio de score/nivel/vidas dentro del canvas **NO** — no dibuja overlay de fin de partida ni HUD duplicado (el HUD real vive en `GamePlayer`; igual que `arkanoide-engine.ts`/`tetris-engine.ts`, puede dibujar score/nivel dentro del canvas como decoración visual siempre que no sea la única fuente de verdad, pero **no** dibuja "GAME OVER" ni reinicia por tecla).
5. Input: `keydown`/`keyup` agregados en `start()`, removidos en `stop()`; `ArrowUp/Down/Left/Right` setean `nextDir` (con `preventDefault()`); reversa de 180° sobre la longitud actual se ignora silenciosamente.
6. Crear `components/games/serpentina-canvas.tsx`: mismo patrón que `AsteroidsCanvas` (`canvasRef`, `engineRef`, `callbacksRef`, efecto de montaje `[]` que crea+arranca+limpia, efecto `[paused]` que llama `setPaused`), `<canvas width={800} height={600} style={{ width: "100%", height: "100%" }} />`.
7. Wire en `components/game-player.tsx`: agregar `isSerpentina = game.id === "serpentina"`, estado `serpentinaLevel`, incluirlo en la derivación de `level`, en el `useEffect` del `setInterval` simulado (excluirlo igual que `isAsteroids`/`isTetris`/`isArkanoide`), en `restart()` (resetear `serpentinaLevel`), y en el render condicional dentro de `.crt-screen`.
8. Correr `npm run build` y `npm run lint`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `lib/games/serpentina-engine.ts` no importa nada de React ni del DOM salvo los tipos de canvas recibidos por parámetro.
- [ ] En `/juego/serpentina/jugar`, el HUD externo (puntaje, vidas, nivel) refleja el estado real del motor, no una simulación.
- [ ] Las flechas mueven la serpiente sin producir scroll de la página, y no permiten invertir 180° sobre el propio cuerpo.
- [ ] Comer una fruta suma puntos, alarga la serpiente un segmento y hace aparecer una fruta nueva con una skin del atlas en una celda libre.
- [ ] Cada cierto número de frutas comidas sube el nivel y la serpiente se mueve más rápido, hasta un piso mínimo de velocidad.
- [ ] Chocar contra el borde del tablero resta una vida, no game over inmediato salvo que sea la última vida.
- [ ] Chocar contra el propio cuerpo resta una vida, mismo comportamiento que chocar contra el borde.
- [ ] Al perder una vida (sin llegar a 0), la serpiente respawnea en el centro con longitud inicial, conservando score y nivel.
- [ ] Perder las 3 vidas abre el modal externo de fin de partida de `GamePlayer` con el puntaje real; el canvas no muestra su propio overlay de "GAME OVER" ni reinicia por tecla.
- [ ] "GUARDAR PUNTUACIÓN" persiste `{ game: "serpentina", score, name, at }` en `localStorage["av_scores"]` y, si hay sesión, en Supabase vía `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, 3 vidas, nivel 1, serpiente en posición y longitud inicial).
- [ ] "PAUSA" congela el movimiento y "REANUDAR" continúa sin saltos de posición.
- [ ] Navegar fuera de `/juego/serpentina/jugar` no deja listeners de teclado colgados.
- [ ] Ningún otro `game.id` cambia de comportamiento.
- [ ] `/salon` sigue mostrando `serpentina` con su leaderboard real (ya genérico por `game.id`, sin cambios en `lib/scores.ts`/`lib/scores-server.ts`/`app/salon/*`).

---

## Decisiones

- **Sí:** motor a intervalo fijo (mueve una celda por tick) en vez de movimiento continuo en píxeles/frame. Es la mecánica estándar de Snake — moverlo en píxeles continuos complicaría la detección de colisión contra la propia cola sin aportar nada al juego.
- **Sí:** vidas reales (3) con respawn en el centro, en vez de game over inmediato al primer choque. Decisión explícita del usuario; reutiliza el mismo patrón `state: "dead"` + invencibilidad temporal ya probado en `asteroids-engine.ts`, evitando inventar un mecanismo nuevo.
- **Sí:** choque contra el borde del tablero mata (resta vida) — sin wrap. Decisión explícita del usuario.
- **Sí:** choque contra el propio cuerpo también resta vida, mismo tratamiento que el borde. Confirmado explícitamente por el usuario para mantener consistencia (una sola noción de "muerte", no dos).
- **Sí:** velocidad sube con cada fruta comida (nivel), con un piso mínimo de intervalo. Decisión explícita del usuario; el piso evita que el juego se vuelva imposible de jugar en partidas largas.
- **Sí:** las coordenadas del atlas se re-declaran dentro de `serpentina-engine.ts` en vez de importar `sprites.js` tal cual. El archivo original usa `window.SPRITE_ATLAS` (patrón de script global de página única), incompatible con un módulo TypeScript sin acceso a `window` fuera de `start()`/`stop()`; portar los valores a una constante tipada es más simple que adaptar el script.
- **No:** dar de alta `serpentina` en el catálogo de Supabase. Ya existe como fila con `sort_order: 3` — este spec es puramente de motor.
- **No:** sonido. El atlas provisto no trae audio; agregarlo requeriría buscar/generar assets nuevos, fuera del alcance pedido.
- **No:** dificultad progresiva de otro tipo (obstáculos, muros internos, power-ups). No fue pedido por el usuario — mantenerse en Snake clásico con vidas.

---

## Riesgos

| Riesgo                                                                                                                     | Mitigación                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El movimiento a intervalo fijo puede sentirse "a saltos" si el `dt` de `requestAnimationFrame` no se acumula bien           | Usar el mismo patrón de acumulador (`moveAccum += dt`) que ya usa `tetris-engine.ts` para su `dropAccum`/`dropInterval`, probado en este mismo proyecto                          |
| Bajar el intervalo de movimiento sin piso mínimo podría volver el juego injugable en niveles altos                          | Definir un piso explícito (ej. no bajar de ~60ms/tick) en el paso 3 del plan de implementación                                                                                    |
| Precarga de `fruits.png` fallida (404, red) dejaría el loop sin arrancar nunca                                              | Igual tratamiento que `arkanoide-engine.ts` con su spritesheet: gate de precarga con `onload`/`onerror`, documentado como comportamiento ya aceptado en ese motor de referencia    |

---

## Qué **no** está en este spec

- Alta nueva de catálogo en Supabase (`serpentina` ya existe).
- Portar `gloton`, `caida`, `invasores`, `ranaria` o `duelo-pixel` a motor real.
- Sonido, wrap de bordes, controles táctiles o remapeo de teclas.
- Power-ups, obstáculos u otras variantes de Snake no clásicas.
- Actualizar `best`/`plays` de `serpentina` en `lib/games.ts`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
