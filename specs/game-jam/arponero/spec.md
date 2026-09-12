# Arponero — game-jam

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-09-11
> **Objective:** Dar de alta el juego `arponero` en el catálogo de Supabase y construir desde cero un motor de acción tipo Pang (arpón vertical contra burbujas gigantes que rebotan y se parten en dos al recibir impacto) en `lib/games/arponero-engine.ts`, integrado en `GamePlayer` con puntaje, vidas y nivel reales.

---

## Alcance

**In:**

- Alta de una fila nueva en `games` (Supabase): `id: "arponero"`, `title: "ARPONERO"`, `cat: "SHOOTER"`, `cover: "cover-arponero"`, `color: "magenta"`, `best: 0`, `plays: "0"`, `sort_order: 10`.
- Nueva clase CSS `.cover-arponero` en `app/globals.css`, mismo patrón que `.cover-arkanoide`/`.cover-rocas` (gradiente + pseudo-elemento con el motivo: círculos grandes y una línea vertical de arpón), con paleta magenta/yellow.
- Motor nuevo, diseñado desde cero (no hay carpeta en `references/started-games/`), en `lib/games/arponero-engine.ts`: canvas 800×600 (misma resolución que `rocas`/`arkanoide`, encaja en el `aspect-ratio: 4/3` de `.crt-screen`), sin dependencias externas ni assets — todo vectorial con `ctx`.
- Reglas de juego: el jugador se mueve en horizontal con `←`/`→` sobre el piso y dispara un arpón vertical con `Espacio`; el arpón sube hasta clavarse en el techo, queda tensado un instante y se retrae; solo puede haber un arpón activo a la vez (ver Decisiones).
- Burbujas: círculos con gravedad constante y velocidad horizontal constante, que rebotan contra paredes y piso con una altura de rebote fija por tamaño (rebote determinista, no amortiguado). Cuatro tamaños (`XL`, `L`, `M`, `S`). Al ser tocada por el arpón, una burbuja se parte en dos del tamaño inmediatamente menor, lanzadas en direcciones horizontales opuestas y con un impulso vertical hacia arriba; la `S` simplemente desaparece.
- Puntaje: pinchar una burbuja suma puntos inversamente proporcionales a su tamaño (las chicas valen más); limpiar el nivel suma un bonus proporcional al tiempo restante del nivel.
- Vidas: 3. Que una burbuja toque al jugador resta una vida, limpia el arpón activo y respawnea al jugador en el centro con invencibilidad parpadeante breve (mismo patrón `state: "dead"` + `invincible` ya probado en `asteroids-engine.ts`); las burbujas no se reinician. Quedarse sin tiempo de nivel también resta una vida y reinicia el nivel en curso.
- Niveles: limpiar todas las burbujas → `level++`, layout siguiente con más burbujas y/o tamaños mayores, y temporizador de nivel un poco más corto (con piso mínimo). El juego es infinito: tras el último layout definido, se cicla aumentando la dificultad.
- Crear `components/games/arponero-canvas.tsx` (`"use client"`) siguiendo el patrón de `AsteroidsCanvas`: `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]` que crea y arranca el motor y lo detiene en el cleanup, efecto separado en `[paused]` que llama `setPaused`.
- Wire en `components/game-player.tsx`: extender el único punto de bifurcación con `isArponero = game.id === "arponero"` y un estado `arponeroLevel` (mismo patrón que `arkanoideLevel`), reutilizando el estado genérico `lives` y excluyéndolo del `setInterval` de puntaje simulado.
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Plataformas/escaleras dentro del escenario (las burbujas rebotan sobre plataformas y el jugador sube por escaleras, como en el Pang original) — cambia la generación de layouts y la colisión; es su propio spec.
- Power-ups (arpón doble, gancho adherente, escudo, reloj que congela, dinamita) — se apoyan encima del núcleo y no lo bloquean.
- Segundo jugador / cooperativo local — el proyecto ya tiene `duelo-pixel` como slot VERSUS.
- Sonido (disparo, pinchazo, muerte) — no hay assets de audio para este juego.
- Fondos temáticos por nivel (ciudades del Pang original) — decorativo.
- Controles táctiles/mobile.
- Actualizar `best`/`plays` con datos reales derivados de partidas.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Fila nueva en `games` (Supabase, ver SPEC 06 para el esquema de la tabla). `sort_order: 10` es el siguiente libre tras `arkanoide` (9) al momento de redactar este spec; los tres conceptos de este game-jam comparten ese candidato, así que confirmar con `select max(sort_order) from games` antes de insertar:

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values (
  'arponero',
  'ARPONERO',
  'Un arpón, burbujas gigantes y ningún lugar donde esconderse.',
  'Cada burbuja que pinchás se parte en dos más chicas y más rápidas. Movete en horizontal, calculá el rebote y dispará el arpón hacia arriba: la pantalla se llena antes de vaciarse. Tres vidas y un reloj que corre.',
  'SHOOTER',
  'cover-arponero',
  'magenta',
  0,
  '0',
  10
);
```

Contrato del motor (`lib/games/arponero-engine.ts`), framework-agnóstico, sin React ni acceso a `document`/`window` fuera de `start()`/`stop()`:

```ts
export interface ArponeroEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void; // edge-triggered, una sola vez
}

export interface ArponeroEngine {
  start: () => void; // agrega listeners, carga el nivel 1, arranca el rAF
  stop: () => void; // remueve listeners, cancela el rAF
  setPaused: (paused: boolean) => void; // congela update(), draw() sigue corriendo
  reset: () => void; // score 0, 3 vidas, nivel 1, sin tocar listeners
}

export function createArponeroEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArponeroEngineCallbacks,
): ArponeroEngine;
```

Entidades y constantes internas (sin exportar):

```ts
const WIDTH = 800;
const HEIGHT = 600;
const FLOOR_Y = 560; // línea de piso
const GRAVITY = 420; // px/s²
const HARPOON_SPEED = 900; // px/s de subida
const HARPOON_HOLD = 0.35; // s clavado en el techo antes de retraerse
const PLAYER_SPEED = 300; // px/s
const PLAYER_W = 26;
const PLAYER_H = 44;
const RESPAWN_INVULN = 2.0; // s de invencibilidad parpadeante tras morir
const LEVEL_TIME = 60; // s iniciales por nivel (baja por nivel, piso 30)

type BubbleSize = 0 | 1 | 2 | 3; // 0 = S, 3 = XL

const BUBBLE_RADIUS: Record<BubbleSize, number> = { 0: 12, 1: 22, 2: 36, 3: 56 };
const BUBBLE_BOUNCE: Record<BubbleSize, number> = { 0: 260, 1: 330, 2: 400, 3: 470 }; // |vy| al tocar el piso
const BUBBLE_POINTS: Record<BubbleSize, number> = { 0: 200, 1: 120, 2: 70, 3: 40 };

interface Bubble {
  x: number;
  y: number;
  vx: number; // constante salvo rebote en paredes (cambia de signo)
  vy: number;
  size: BubbleSize;
}

interface Harpoon {
  x: number;
  yTop: number; // punta; la cuerda va de FLOOR_Y hasta yTop
  state: "rising" | "stuck" | "retracting";
  hold: number; // s restantes en "stuck"
}

interface Player {
  x: number; // centro
  facing: -1 | 1;
  invincible: number; // s restantes; > 0 = parpadea y no colisiona
}

type EngineState = "playing" | "dead" | "levelclear" | "gameover";
```

Conventions:

- Colisión burbuja↔arpón: distancia horizontal del centro de la burbuja al `x` del arpón menor que su radio, y `yTop <= y + r`. Colisión burbuja↔jugador: AABB del jugador contra círculo.
- El rebote en el piso es determinista (`vy = -BUBBLE_BOUNCE[size]`), no proporcional a la energía de caída: así la altura de rebote de cada tamaño es predecible y el juego se vuelve de cálculo, no de suerte.
- `dt` en segundos con cap de 0.05 (mismo cap que `asteroids-engine.ts`) para que un tab en segundo plano no teletransporte burbujas.
- El puntaje es entero y monotónico creciente: nunca se resta (perder una vida no descuenta).
- Diff-and-report en los cuatro callbacks, con sentinela `-1` inicial.

---

## Plan de implementación

1. Insertar la fila de `games` vía migración Supabase y agregar `.cover-arponero` en `app/globals.css`. Verificar la card en `/biblioteca` y el detalle en `/juego/arponero`.
2. Crear `lib/games/arponero-engine.ts` con constantes, tipos internos, estado (`player`, `bubbles`, `harpoon`, `score`, `lives`, `level`, `levelTime`, `state`) y la factory `createArponeroEngine(canvas, callbacks)` devolviendo `{ start, stop, setPaused, reset }`, con loop `update(dt)`/`draw()` y un solo `requestAnimationFrame`.
3. Implementar movimiento del jugador: `keydown`/`keyup` sobre `←`/`→` (con `preventDefault()`), clamp a `[PLAYER_W/2, WIDTH - PLAYER_W/2]`, listeners agregados en `start()` y removidos en `stop()`.
4. Implementar el arpón: `Espacio` dispara solo si `harpoon === null`; sube a `HARPOON_SPEED`, al tocar `y <= 0` pasa a `"stuck"` por `HARPOON_HOLD` segundos y luego a `"retracting"`, desapareciendo al volver al piso.
5. Implementar la física de burbujas: `vy += GRAVITY * dt`, rebote en paredes (`vx *= -1`) y en el piso (`vy = -BUBBLE_BOUNCE[size]`), clamp de posición para que no se hundan en el piso ni se peguen a las paredes.
6. Implementar el pinchazo: al colisionar con el arpón, quitar la burbuja, sumar `BUBBLE_POINTS[size]`, y si `size > 0` crear dos burbujas de `size - 1` con `vx = ±SPLIT_VX` y `vy = -SPLIT_VY`; destruir el arpón. Si `size === 0`, solo desaparece.
7. Implementar muerte y vidas: colisión burbuja↔jugador (si `invincible <= 0`) → `lives--`, `onLivesChange`, arpón eliminado, `state = "dead"` con timer breve y respawn del jugador en el centro con `invincible = RESPAWN_INVULN`. Si `lives <= 0` → `state = "gameover"` y `onGameOver(score)` una sola vez.
8. Implementar el temporizador de nivel: `levelTime -= dt`; al llegar a 0, restar una vida y recargar el layout del nivel en curso. Al quedar `bubbles.length === 0` → bonus por tiempo restante, `level++`, `onLevelChange(level)`, cargar layout siguiente con `LEVEL_TIME` reducido (piso 30 s).
9. Implementar `draw()`: fondo, piso, jugador (con parpadeo cuando `invincible > 0`), cuerda + punta del arpón, burbujas como círculos con gradiente radial y brillo, y el reloj del nivel como barra dentro del canvas. **No** dibujar overlay de "GAME OVER" ni reiniciar por tecla.
10. Crear `components/games/arponero-canvas.tsx` con `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]`, efecto `[paused]` → `setPaused`, `<canvas width={800} height={600} style={{ width: "100%", height: "100%" }} />`.
11. Wire en `components/game-player.tsx`: `isArponero`, estado `arponeroLevel`, inclusión en la derivación de `level`, exclusión del `setInterval` simulado, reset en `restart()`, render condicional dentro de `.crt-screen`.
12. Correr `npm run build` y `npm run lint`.
13. Verificación manual end-to-end en `/juego/arponero/jugar`: pinchar una `XL` y verificar la cadena de divisiones hasta `S`, dejarse tocar para perder una vida y confirmar el respawn con invencibilidad, agotar el reloj de nivel, limpiar un nivel y ver subir el nivel en el HUD, perder las 3 vidas y confirmar el modal externo, guardar puntaje y jugar de nuevo.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/arponero-engine.ts` no importa React ni toca `document`/`window` fuera de `start()`/`stop()`.
- [ ] `/biblioteca` muestra la card de `ARPONERO` con la portada `.cover-arponero` y `/juego/arponero` muestra su detalle.
- [ ] `←`/`→` mueven al jugador sin provocar scroll de la página, y no puede salirse del canvas.
- [ ] `Espacio` dispara el arpón y no permite un segundo arpón mientras haya uno activo.
- [ ] El arpón sube, se clava en el techo, permanece clavado un instante y luego se retrae.
- [ ] Una burbuja pinchada se parte en dos del tamaño inmediatamente menor, con direcciones horizontales opuestas.
- [ ] La burbuja del tamaño más chico desaparece al ser pinchada, sin generar hijas.
- [ ] Las burbujas rebotan siempre a la misma altura según su tamaño (rebote determinista, sin amortiguarse).
- [ ] Las burbujas chicas suman más puntos que las grandes.
- [ ] Tocar una burbuja resta una vida, elimina el arpón activo y respawnea al jugador en el centro con invencibilidad parpadeante temporal.
- [ ] Durante la invencibilidad el jugador no puede volver a morir.
- [ ] Agotar el reloj del nivel resta una vida y recarga el nivel en curso.
- [ ] Limpiar todas las burbujas sube el nivel, suma bonus por tiempo restante y carga el layout siguiente.
- [ ] Perder las 3 vidas dispara `onGameOver` exactamente una vez, con el puntaje real, y abre el modal externo de `GamePlayer`.
- [ ] El canvas no dibuja su propio overlay de "GAME OVER" ni reinicia por tecla.
- [ ] "GUARDAR PUNTUACIÓN" persiste `{ game: "arponero", score, ... }` en `localStorage["av_scores"]` y, con sesión, en Supabase vía `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, 3 vidas, nivel 1, layout inicial).
- [ ] "PAUSA" congela burbujas, arpón y reloj; "REANUDAR" continúa sin saltos de posición.
- [ ] Navegar fuera de `/juego/arponero/jugar` no deja listeners de teclado colgados.
- [ ] Ningún otro `game.id` cambia de comportamiento.
- [ ] `/salon` muestra `arponero` con su leaderboard real, sin tocar `lib/scores*.ts`.

---

## Decisiones

- **Sí:** un solo arpón activo a la vez. Es la restricción que convierte el juego en decisión de timing en vez de spam de disparo; además simplifica la colisión (un objeto, no una lista).
- **Sí:** rebote determinista por tamaño (`vy = -BUBBLE_BOUNCE[size]`) en vez de rebote físico con coeficiente de restitución. Hace la altura de rebote predecible y el juego pasa a ser de cálculo; con restitución real las burbujas terminan muriendo en el piso o escalando sin control.
- **Sí:** vidas (3) con respawn e invencibilidad parpadeante, reutilizando el patrón `state: "dead"` + `invincible` ya probado en `asteroids-engine.ts`, en vez de inventar un mecanismo nuevo.
- **Sí:** las burbujas **no** se reinician al perder una vida. Reiniciarlas convertiría morir en una ventaja táctica cuando la pantalla está llena de burbujas chicas.
- **Sí:** temporizador por nivel. Sin él, una `S` rebotando lejos puede estirar el nivel indefinidamente; el reloj garantiza sesiones de 1 a 5 minutos.
- **Sí:** las burbujas chicas valen más puntos. Empuja a terminar la cadena de divisiones en vez de dejar hijas dando vueltas.
- **No:** plataformas ni escaleras. Duplican la complejidad de colisión y de generación de layouts; el núcleo de arpón + división ya es un juego completo.
- **No:** power-ups en esta versión. Se apoyan encima del núcleo y no lo bloquean.
- **No:** assets externos (sprites/audio). Todo se dibuja con `ctx`, así que el motor no necesita gate de precarga y no puede fallar por un 404.

---

## Riesgos

| Riesgo                                                                                                  | Mitigación                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| El arpón, muy rápido, atraviesa una burbuja chica entre frames                                          | Testear la colisión contra el segmento recorrido en el frame (`yTop` anterior → `yTop` actual), no solo contra la posición final          |
| Una burbuja queda "pegada" a una pared rebotando en el sitio por invertir `vx` dos frames seguidos       | Al invertir `vx`, empujar la posición fuera de la pared (`x = r` / `x = WIDTH - r`) antes de seguir integrando                            |
| Con muchas burbujas `S` simultáneas el nivel se vuelve caótico e injusto                                 | Tope de burbujas simultáneas por layout y `BUBBLE_POINTS` alto para las chicas, que incentiva limpiarlas rápido                           |
| El bonus por tiempo restante rompe la monotonía del puntaje si se calcula mal                            | Calcularlo como entero (`Math.floor(levelTime) * BONUS_PER_SECOND`) y sumarlo una sola vez en la transición a `"levelclear"`              |
| Dificultad creciente sin techo vuelve el juego imposible en pocos niveles                                | Piso explícito de `LEVEL_TIME` (30 s) y progresión de layouts acotada, cicleando con incrementos suaves tras el último definido           |

---

## Qué **no** está en este spec

- Plataformas, escaleras o escenarios con geometría.
- Power-ups de cualquier tipo.
- Modo cooperativo o versus.
- Sonido de disparo, pinchazo o muerte.
- Fondos temáticos por nivel.
- Controles táctiles/mobile.
- Actualizar `best`/`plays` con datos reales.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
