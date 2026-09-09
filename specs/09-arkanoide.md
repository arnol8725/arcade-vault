# SPEC 09 — Motor real de Arkanoid en el nuevo juego "ARKANOIDE"

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-07
> **Objective:** Dar de alta el juego `arkanoide` en el catálogo de Supabase y portar el motor real de `references/started-games/04-arkanoid/game.js` a un componente React/TypeScript con canvas, integrado en `GamePlayer` con puntaje, vidas y nivel reales.

---

## Alcance

**In:**

- Alta de una fila nueva en `games` (Supabase): `id: "arkanoide"`, `title: "ARKANOIDE"`, `short: "Paleta, pelota y cinco muros de bloques que demoler."`, `long: "Desliza la paleta con el mouse o las flechas para no dejar caer la pelota. Cada bloque roto suma puntos; limpia los cinco niveles antes de quedarte sin vidas."`, `cat: "ARCADE"`, `cover: "cover-arkanoide"`, `color: "magenta"`, `best: 0`, `plays: "0"`, `sort_order: 9` (siguiente libre tras `duelo-pixel` en 8).
- Nueva clase CSS `.cover-arkanoide` en `app/globals.css`, mismo patrón que `.cover-bricks`/`.cover-rocas` (gradiente de fondo + pseudo-elemento con motivo de bloques), con paleta propia (magenta/cyan) para no verse idéntica a la card de `bloque-buster`.
- Copiar los assets de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoide/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`.
- Portar `references/started-games/04-arkanoid/game.js` + `levels.js` + `assets/spritesheet.js` (paleta, pelota, `blocks[]`, `LEVELS` con 5 niveles y multiplicador de velocidad, colisión AABB, explosiones por sprite, `SPRITES`/`EXPLOSION_FRAMES`) a TypeScript puro y agnóstico de framework en `lib/games/arkanoide-engine.ts`, sin dependencias del DOM salvo el `HTMLCanvasElement`/`CanvasRenderingContext2D` recibido por parámetro.
- Gate de precarga: el loop no arranca hasta que la imagen del spritesheet (`image.onload`) y los dos audios (`audio.oncanplaythrough`) estén listos.
- Crear `components/games/arkanoide-canvas.tsx` (`"use client"`), mismo patrón que `AsteroidsCanvas`: `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje que crea y arranca el motor, efecto separado en `[paused]`, canvas 800×600 a resolución nativa escalado por CSS (`width: 100%; height: 100%`).
- Input dual del original: `←`/`→` por teclado (`keydown`/`keyup` en `window`, con `preventDefault()`) y movimiento de paleta por `mousemove` sobre el propio `<canvas>` (con el mismo escalado `getBoundingClientRect` + `scaleX` del original). Ambos se agregan en `start()` y se remueven en `stop()`.
- Modelo de vidas real: perder la pelota resta una vida; al llegar a 0, fin de partida. Limpiar los 5 niveles también es fin de partida (victoria). `GamePlayer` recibe `onLivesChange`/`onLevelChange`/`onScoreChange`/`onGameOver` reales, igual que `rocas`.
- Wire en `components/game-player.tsx`: extender el punto de bifurcación (`isAsteroids`/`isTetris`) con `isArkanoide = game.id === "arkanoide"` y un nuevo estado `arkanoideLevel` (mismo patrón que `asteroidsLevel`/`tetrisLevel`); reutiliza el estado genérico `lives` ya existente (hoy fijo, pasa a recibir `onLivesChange` real para este juego, igual que `rocas`).
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Corregir el desajuste visual de `bloque-buster` (cover de ladrillos + motor de Tetris) reasignándole este motor de Arkanoid — decisión explícita del usuario en SPEC 08 de dejarlo como deuda para "otro spec"; no se toca acá.
- El sistema de salto de nivel por clic durante la pausa del original (botones dibujados y clickeados dentro del propio canvas) — es UI-en-canvas que compite con el HUD/modal externos de `GamePlayer`; se descarta.
- Sonido de fondo/música — el original solo tiene dos efectos puntuales (rebote y rotura de bloque), sin música.
- Migrar `av_scores`/leaderboard — ya es genérico por `game.id` desde SPEC 07, funciona sin cambios en cuanto la fila de `games` exista.
- Actualizar `best`/`plays` de `arkanoide` con datos reales derivados de partidas jugadas — son datos de portada.
- Controles táctiles/mobile dedicados (swipe, botones on-screen) más allá del mouse que ya trae el original.
- Rediseño del HUD de `GamePlayer` o del layout general de `.crt-screen`.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Fila nueva en `games` (Supabase, ver SPEC 06 para el esquema de la tabla):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values (
  'arkanoide',
  'ARKANOIDE',
  'Paleta, pelota y cinco muros de bloques que demoler.',
  'Desliza la paleta con el mouse o las flechas para no dejar caer la pelota. Cada bloque roto suma puntos; limpia los cinco niveles antes de quedarte sin vidas.',
  'ARCADE',
  'cover-arkanoide',
  'magenta',
  0,
  '0',
  9
);
```

Tipos internos del motor portado, sin almacenamiento propio:

```ts
// lib/games/arkanoide-engine.ts
export type BlockColor =
  | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type EngineState = "playing" | "gameover"; // "win" del original colapsa en "gameover"

export interface Block {
  x: number; y: number; w: number; h: number;
  color: BlockColor;
  alive: boolean;
}

export interface ArkanoideEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void; // 1..5
  onGameOver: (finalScore: number) => void; // se dispara una sola vez, tanto en derrota (0 vidas) como en victoria (5 niveles limpiados)
}

export interface ArkanoideEngine {
  start: () => void; // agrega listeners, precarga assets, arranca requestAnimationFrame
  stop: () => void; // remueve listeners y cancela el rAF
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, nivel 1
}

export function createArkanoideEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoideEngineCallbacks,
): ArkanoideEngine;
```

`LEVELS` (5 niveles, portados 1:1 de `levels.js`: patrones de bloques `l1`..`l5` y multiplicador de velocidad `speed` creciente 1.00→1.46) queda como constante interna del engine, no expuesta.

El guardado de partida sigue usando la forma ya definida en SPEC 01/05, sin cambios:

```ts
// components/game-player.tsx (sin cambios de forma)
{
  game: string; // "arkanoide"
  score: number;
  name: string;
  at: number;
} // en localStorage["av_scores"], además de saveScoreToLeaderboard(game.id, score)
```

---

## Plan de implementación

1. Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` y `references/started-games/04-arkanoid/assets/sounds/{ball-bounce.mp3,break-sound.mp3}` a `public/games/arkanoide/` (sin tocar los originales de `references/`).
2. `mcp__supabase__execute_sql` para confirmar el `sort_order` máximo actual en `games` (hoy 8, `duelo-pixel`); `mcp__supabase__apply_migration` con el `insert` de la fila `arkanoide` (`sort_order: 9`) mostrado arriba; correr `mcp__supabase__get_advisors` después para confirmar que `anon` sigue sin policies de escritura.
3. Agregar `.cover-arkanoide` en `app/globals.css`: mismo patrón que `.cover-bricks`/`.cover-rocas` (fondo + pseudo-elemento `::after` con motivo de bloques), paleta magenta/cyan propia.
4. Crear `lib/games/arkanoide-engine.ts`: portar `paddle`/`ball`/`blocks[]`/`explosions[]`, `LEVELS` (con `speed` y `blocks` por nivel), `collideAABB`, la física de `update(dt)` (rebotes en paredes, paleta, bloques; pérdida de vida al caer la pelota; avance de nivel al limpiar todos los bloques), y el render (`SPRITES`/`EXPLOSION_FRAMES` del spritesheet, dibujo de paleta/pelota/bloques/explosiones/HUD), todo tipado en TypeScript estricto dentro de la factory `createArkanoideEngine(canvas, callbacks): ArkanoideEngine`.
5. Precarga: dentro de `start()`, cargar la imagen (`new Image()`, `onload`) y los dos `Audio()` (`oncanplaythrough`) apuntando a `/games/arkanoide/...`; el loop (`requestAnimationFrame`) no arranca hasta que las tres promesas resuelvan.
6. Eliminar del motor portado: el toggle de pausa interno (tecla `P`/`Escape`), `drawPauseOverlay` con sus botones de salto de nivel y el listener `click` del canvas que los procesa, y `drawOverlay('GAME OVER' | '¡Completaste el juego!')`. En su lugar: al llegar a 0 vidas o al limpiar el nivel 5, el motor pasa a `state = 'gameover'` y llama `callbacks.onGameOver(score)` una única vez (edge-triggered); no dibuja overlay propio ni reinicia por tecla.
7. Input: `keydown`/`keyup` en `window` para `ArrowLeft`/`ArrowRight` (con `preventDefault()`) y `mousemove` en el `<canvas>` recibido por parámetro (con el escalado `getBoundingClientRect`/`scaleX` del original) para mover la paleta; todos agregados en `start()` y removidos en `stop()`.
8. Crear `components/games/arkanoide-canvas.tsx` (`"use client"`): mismo patrón que `AsteroidsCanvas` — `callbacksRef` actualizado en un efecto sin deps, efecto de montaje `[]` que crea el motor con `createArkanoideEngine` y llama `engine.start()` (cleanup: `engine.stop()`), efecto separado en `[paused]` que llama `engine.setPaused(paused)`, `<canvas width={800} height={600} style={{ width: "100%", height: "100%" }} />`.
9. Modificar `components/game-player.tsx`: agregar `isArkanoide = game.id === "arkanoide"` y estado `arkanoideLevel` (mismo patrón que `asteroidsLevel`/`tetrisLevel`); `level` deriva de `arkanoideLevel` cuando aplica; renderizar `<ArkanoideCanvas key={resetKey} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setArkanoideLevel} onGameOver={endGame} />` dentro de `.crt-screen` en ese caso; `restart()` también resetea `arkanoideLevel` a `1`. Ningún otro `game.id` cambia de comportamiento.
10. `npm run build` y `npm run lint`.
11. Verificación manual end-to-end en `/juego/arkanoide/jugar` (ver checklist de Fase 5 del skill): HUD con puntaje/vidas/nivel reales; paleta responde a `←`/`→` y al mouse sin scrollear la página; romper un bloque suma 10 puntos y dispara su animación de explosión; limpiar los bloques de un nivel carga el siguiente con velocidad mayor; perder la pelota resta una vida y perder la última abre el modal externo de fin de partida (no el overlay interno); limpiar el nivel 5 también abre ese modal; "GUARDAR PUNTUACIÓN"/"JUGAR DE NUEVO"/"PAUSA"/"SALIR" se comportan igual que en `rocas`; `/biblioteca`, `/` y `/salon` muestran `arkanoide` con su propia portada y pestaña de leaderboard; ningún otro `game.id` cambia de comportamiento.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `lib/games/arkanoide-engine.ts` no importa nada de React ni del DOM salvo los tipos de canvas recibidos por parámetro.
- [ ] La fila `arkanoide` existe en `games` con `sort_order: 9` y aparece en `/biblioteca`, en la home y en `/salon` con su propia pestaña de leaderboard.
- [ ] `.cover-arkanoide` se ve visualmente distinta de `.cover-bricks` (paletas de color distintas) en las cards de catálogo.
- [ ] En `/juego/arkanoide/jugar`, el HUD (puntaje, vidas, nivel) refleja el estado real del motor, no una simulación.
- [ ] La paleta responde tanto a `←`/`→` como al movimiento del mouse sobre el canvas, sin producir scroll de la página.
- [ ] Romper un bloque suma 10 puntos, dispara la animación de explosión de su color y reproduce el sonido de rotura.
- [ ] Limpiar todos los bloques de un nivel carga el siguiente nivel (patrón de bloques y velocidad de `LEVELS`); limpiar el nivel 5 dispara fin de partida.
- [ ] Perder la pelota resta una vida y reproduce el sonido de rebote correspondiente; llegar a 0 vidas dispara fin de partida.
- [ ] Tanto la derrota (0 vidas) como la victoria (nivel 5 limpiado) abren el modal externo de fin de partida de `GamePlayer` con el puntaje real — el canvas no muestra su propio overlay de "GAME OVER" ni de "¡Completaste el juego!".
- [ ] "GUARDAR PUNTUACIÓN" persiste `{ game: "arkanoide", score, name, at }` en `localStorage["av_scores"]` y, si hay sesión, en Supabase vía `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, 3 vidas, nivel 1, sin bloques/explosiones residuales del intento anterior).
- [ ] "PAUSA"/"REANUDAR" congelan y continúan el juego sin saltos de física ni pérdida de vidas injustificada.
- [ ] Navegar fuera de `/juego/arkanoide/jugar` no deja listeners de teclado ni de mouse colgados.
- [ ] Ningún otro `game.id` cambia de comportamiento.

---

## Decisiones

- **Sí:** alta nueva de catálogo (`arkanoide`) en vez de forzar el motor en un slot decorativo existente. Ninguno de los slots libres (`caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) describe un breakout — reutilizar uno de ellos repetiría el mismo desajuste texto/motor que ya existe en `bloque-buster`.
- **No:** reasignar el `cover`/`cat`/motor de `bloque-buster` para que coincida con Arkanoid (y mover Tetris a otro slot como `caida`). SPEC 08 dejó esa corrección como deuda explícita para "otro spec"; resolverla acá amplía el alcance sin pedido explícito del usuario.
- **Sí:** `.cover-arkanoide` nueva en vez de reusar `.cover-bricks`. Evita dos cards visualmente idénticas en `/biblioteca` y home.
- **Sí:** mantener el control dual teclado + mouse del original. Es parte de la identidad del juego original (Breakout clásico se juega con mouse) y no requiere UI adicional — el `mousemove` se agrega directamente sobre el `<canvas>` recibido por parámetro.
- **Sí:** portar el spritesheet y los efectos de sonido (copiados a `public/games/arkanoide/`) en vez de redibujar con formas vectoriales como en `rocas`. Es el único de los tres juegos portados con arte y audio propios; descartarlos perdería fidelidad visual/sonora sin necesidad real.
- **Sí:** tanto `gameover` (0 vidas) como `win` (5 niveles limpiados) del original colapsan en un único `onGameOver` del engine. El modal externo de `GamePlayer` no distingue victoria de derrota — ambos son "fin de partida" con puntaje final, igual que en `rocas`/`bloque-buster`.
- **No:** el sistema de salto de nivel por clic durante la pausa (botones dibujados y clickeados dentro del propio canvas). Es UI-en-canvas que compite con el HUD/modal externos de `GamePlayer` — se descarta igual que se descartó el overlay interno de pausa en SPEC 05/08.
- **No:** música de fondo. El original no tiene, solo dos efectos puntuales (rebote y rotura).
- **No:** actualizar `best`/`plays` de `arkanoide` con datos reales derivados de partidas. Son valores decorativos de portada, igual que en el resto del catálogo.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La precarga async (imagen + 2 audios) puede tardar en conexiones lentas y dejar el canvas en negro unos frames al montar | El gate de precarga bloquea el loop hasta que las tres promesas resuelvan; se acepta una breve pantalla negra inicial, mismo trade-off que ya asume el resto del MVP |
| Los navegadores pueden bloquear la reproducción de audio si no hubo interacción previa del usuario | Los sonidos solo se disparan en respuesta a colisiones durante una partida ya iniciada por el jugador (tecla o mouse), la misma interacción previa que ya habilita el audio en cualquier otro flujo del navegador |
| Doble esquema de input (teclado + mouse) puede pisarse si el jugador mueve el mouse mientras mantiene presionada una flecha | Ambos escriben sobre la misma variable de posición de la paleta; el último evento procesado gana — comportamiento idéntico al del original, aceptado tal cual |
| Portar manualmente ~270 líneas de `game.js` + niveles puede introducir bugs sutiles (ej. orden de colisión bloque vs pared, redondeo de `speed` por nivel) | El checklist de verificación manual del paso 11 cubre explícitamente puntaje por bloque, avance de nivel y pérdida de vidas, los puntos más fáciles de romper en un port |

---

## Qué **no** está en este spec

- Corregir el desajuste visual de `bloque-buster` (cover de ladrillos + motor de Tetris).
- Sistema de salto de nivel por clic durante la pausa.
- Música de fondo.
- Migración de `av_scores` a Supabase-only.
- Actualizar `best`/`plays` de `arkanoide` con datos reales.
- Controles táctiles/mobile dedicados más allá del mouse ya presente en el original.
- Rediseño del HUD de `GamePlayer` o del layout general de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
