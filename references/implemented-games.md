# Juegos de Arcade Vault

> Generado el 2026-09-09 a partir de la tabla `games` de Supabase (proyecto `benxpdtvepdyoltawtzg`) y del código en `lib/games/` y `components/games/`.

El catálogo tiene **9 juegos** dados de alta en la base de datos. De esos, **4 tienen motor real jugable** en canvas; los otros 5 son slots decorativos: sus fichas y portadas existen, pero al pulsar "JUGAR" corre una simulación de puntaje, no un juego.

## Resumen

| # | `id` | Título | Categoría | Motor real | Spec |
| - | ---- | ------ | --------- | ---------- | ---- |
| 1 | `bloque-buster` | BLOQUE BUSTER | ARCADE | Sí — Tetris | `specs/08-tetris-bloque-buster.md` |
| 2 | `caida` | CAÍDA | PUZZLE | No | — |
| 3 | `serpentina` | SERPENTINA | ARCADE | Sí — Snake | `specs/10-serpentina-snake.md` |
| 4 | `gloton` | GLOTÓN | ARCADE | No | — |
| 5 | `invasores` | INVASORES | SHOOTER | No | — |
| 6 | `rocas` | ROCAS | SHOOTER | Sí — Asteroids | `specs/05-asteroids-rocas.md` |
| 7 | `ranaria` | RANARIA | ARCADE | No | — |
| 8 | `duelo-pixel` | DUELO PIXEL | VERSUS | No | — |
| 9 | `arkanoide` | ARKANOIDE | ARCADE | Sí — Arkanoid | `specs/09-arkanoide.md` |

El número de la primera columna es el `sort_order` de la fila en `games`, que es el orden en que aparecen en `/biblioteca` y en la home.

---

## Juegos con motor real

### 1. BLOQUE BUSTER — `bloque-buster`

Tetris. Piezas que caen, rotación con wall-kick, preview de la siguiente pieza.

- Motor: `lib/games/tetris-engine.ts` (`createTetrisEngine`)
- Componente: `components/games/tetris-canvas.tsx`
- Canvas: **doble** — tablero 300×600 y preview de siguiente pieza 120×120
- Controles: `←` `→` mover, `↓` bajar, `↑` / `X` rotar, `Espacio` hard drop
- Callbacks: `onScoreChange`, `onLevelChange` (`floor(líneas / 10) + 1`), `onGameOver`. **Sin vidas** — es una corrida continua.
- Portado desde `references/started-games/03-tetris/`
- Categoría en la DB: `ARCADE` · portada `cover-bricks` · color `cyan`

> Los textos `short`/`long` describían un Breakout en vez del Tetris implementado; se corrigieron en la migración `fix_bloque_buster_tetris_copy` (2026-09-09). Siguen pendientes `cat` (`ARCADE`, siendo que Tetris encaja mejor en `PUZZLE`) y `cover` (`cover-bricks`, la portada de ladrillos).

### 3. SERPENTINA — `serpentina`

Snake sobre grilla, con frutas dibujadas desde un atlas de sprites.

- Motor: `lib/games/serpentina-engine.ts` (`createSerpentinaEngine`)
- Componente: `components/games/serpentina-canvas.tsx`
- Canvas: 800×600, grilla de 40×30 celdas de 20 px
- Controles: `←` `→` `↑` `↓`
- Callbacks: `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`
- Assets: `public/games/serpentina/fruits.png` (atlas de frutas, con gate de precarga antes del primer frame)
- Categoría en la DB: `ARCADE` · portada `cover-snake` · color `green`

### 6. ROCAS — `rocas`

Asteroids. Nave con inercia en gravedad cero, asteroides que se fragmentan, power-ups y partículas.

- Motor: `lib/games/asteroids-engine.ts` (`createAsteroidsEngine`)
- Componente: `components/games/asteroids-canvas.tsx`
- Canvas: 800×600
- Controles: `←` `→` rotar, `↑` propulsar, `Espacio` disparar
- Callbacks: `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange`, `onGameOver`
- Portado desde `references/started-games/02-asteroids/`
- Fue el **primer motor real** del proyecto y es la implementación de referencia que imitan los demás (ver `.claude/skills/nuevo-juego/recipe.md`)
- Categoría en la DB: `SHOOTER` · portada `cover-rocas` · color `yellow`

### 9. ARKANOIDE — `arkanoide`

Arkanoid / Breakout con 5 niveles, sprites y sonido.

- Motor: `lib/games/arkanoide-engine.ts` (`createArkanoideEngine`)
- Componente: `components/games/arkanoide-canvas.tsx`
- Canvas: 800×600
- Controles: `←` `→` y **mouse** (`mousemove` mueve la paleta)
- Callbacks: `onScoreChange`, `onLivesChange`, `onLevelChange` (1..5), `onGameOver` — este último se dispara tanto en derrota (0 vidas) como en victoria (5 niveles limpiados)
- Assets: `public/games/arkanoide/spritesheet-breakout.png`, `public/games/arkanoide/sounds/ball-bounce.mp3`, `public/games/arkanoide/sounds/break-sound.mp3`
- Portado desde `references/started-games/04-arkanoid/`
- Único juego dado de alta en el catálogo después del seed inicial (migración `20260908013755 insert_game_arkanoide`)
- Categoría en la DB: `ARCADE` · portada `cover-arkanoide` · color `magenta`

---

## Slots decorativos (sin motor)

Estas filas existen en `games` y son navegables, pero `components/game-player.tsx` no las enruta a ningún canvas: caen en el `setInterval` de puntaje simulado. Son los candidatos naturales para `/nuevo-juego`.

| `id` | Título | Categoría | Concepto |
| ---- | ------ | --------- | -------- |
| `caida` | CAÍDA | PUZZLE | Piezas que caen y se encastran; velocidad creciente cada 10 líneas |
| `gloton` | GLOTÓN | ARCADE | Laberinto, puntos, cuatro fantasmas y píldora que invierte los papeles |
| `invasores` | INVASORES | SHOOTER | Oleadas alienígenas en formación contra un cañón horizontal |
| `ranaria` | RANARIA | ARCADE | Cruzar carriles de tráfico y un río de troncos contra reloj |
| `duelo-pixel` | DUELO PIXEL | VERSUS | Pong; contra la CPU o a dos jugadores en local |

> `caida` describe exactamente la mecánica de Tetris, que ya está implementada en `bloque-buster`. Antes de portar nada a `caida` conviene decidir si se le reasigna otro juego o si se resuelve el solapamiento con `bloque-buster`.

---

## Notas comunes

- Todos los motores respetan el mismo contrato: factory `create<Name>Engine(canvas, callbacks)` que devuelve `{ start, stop, setPaused, reset }`, sin React y sin tocar `document`/`window` fuera de `start()`/`stop()`. El contrato completo está en `.claude/skills/nuevo-juego/recipe.md`.
- Ningún motor dibuja su propio overlay de GAME OVER ni reinicia por tecla: el modal de fin de partida es siempre el de `components/game-player.tsx`.
- El leaderboard (`specs/07`) y el catálogo (`specs/06`) son genéricos por `game.id` — un juego nuevo aparece en `/salon` con solo existir su fila en `games`.
- Los campos `best` y `plays` de la tabla `games` son **decorativos** (vienen del seed inicial). Las puntuaciones reales viven en la tabla `scores`.
