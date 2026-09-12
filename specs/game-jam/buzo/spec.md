# Buzo — game-jam

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-09-11
> **Objective:** Dar de alta el juego `buzo` en el catálogo de Supabase y construir desde cero un motor de descenso submarino (nado libre en 2D con scroll vertical, oxígeno que se agota y burbujas de aire que lo recargan) en `lib/games/buzo-engine.ts`, integrado en `GamePlayer` con puntaje, vidas y nivel reales.

---

## Alcance

**In:**

- Alta de una fila nueva en `games` (Supabase): `id: "buzo"`, `title: "BUZO"`, `cat: "ARCADE"`, `cover: "cover-buzo"`, `color: "green"`, `best: 0`, `plays: "0"`, `sort_order: 10`.
- Nueva clase CSS `.cover-buzo` en `app/globals.css`, mismo patrón que `.cover-arkanoide`/`.cover-snake` (gradiente azul-verde + pseudo-elemento con burbujas ascendentes de distinto tamaño).
- Motor nuevo, diseñado desde cero (no hay carpeta en `references/started-games/`), en `lib/games/buzo-engine.ts`: canvas 800×600 (misma resolución que `rocas`/`arkanoide`, encaja en el `aspect-ratio: 4/3` de `.crt-screen`), sin assets externos — todo vectorial con `ctx`.
- Reglas de juego: se controla un buzo con `←` `→` `↑` `↓` (nado con inercia y arrastre de agua: la aceleración se aplica sobre la velocidad y el agua la frena, no es movimiento instantáneo); el mundo hace scroll vertical infinito hacia abajo a medida que el buzo desciende, y la cámara lo sigue con un margen muerto en el centro de la pantalla.
- Oxígeno: barra que baja de forma continua, con consumo mayor cuanto más profundo está el buzo. Las **burbujas de aire** suben desde el fondo; atravesarlas recarga oxígeno (una burbuja grande recarga más que una chica) y las consume.
- Puntaje: recoger **perlas** suma puntos multiplicados por la zona de profundidad actual; el puntaje es entero y monotónico creciente, nunca se resta.
- Peligros: **medusas** que patrullan en horizontal y **erizos** fijos anclados a las paredes de la sima. Tocar cualquiera de los dos resta una vida y empuja al buzo hacia arriba con invencibilidad parpadeante breve (mismo patrón `state: "dead"` + `invincible` ya probado en `asteroids-engine.ts`).
- Vidas: 3. Quedarse sin oxígeno también resta una vida y reubica al buzo en la superficie de la zona actual con el tanque lleno. Llegar a 0 vidas → `onGameOver` una sola vez.
- Zonas de profundidad: cada `ZONE_DEPTH` píxeles de descenso el nivel sube (`onLevelChange`), aumentan el consumo de oxígeno, la densidad de peligros y el multiplicador de puntaje de las perlas, y disminuye la frecuencia de burbujas de aire.
- Crear `components/games/buzo-canvas.tsx` (`"use client"`) siguiendo el patrón de `AsteroidsCanvas`: `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]` que crea y arranca el motor y lo detiene en el cleanup, efecto separado en `[paused]` que llama `setPaused`.
- Wire en `components/game-player.tsx`: extender el único punto de bifurcación con `isBuzo = game.id === "buzo"` y un estado `buzoLevel` (mismo patrón que `arkanoideLevel`), reutilizando el estado genérico `lives` y excluyéndolo del `setInterval` de puntaje simulado.
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Subir a la superficie a "depositar" el botín (el loop de riesgo/recompensa tipo Dave el Buzo) — cambia la estructura de la partida de descenso infinito a viajes de ida y vuelta; es su propio spec.
- Arpón, linterna u otros equipamientos activos del buzo — acá no dispara, solo esquiva y recoge.
- Upgrades persistentes entre partidas (tanque más grande, aletas más rápidas) — implican persistencia nueva, fuera de este motor.
- Peligros grandes con IA de persecución (tiburón que caza al buzo) — el movimiento de medusas es patrullaje simple.
- Corrientes marinas que arrastran al buzo, o cuevas con geometría de colisión.
- Sonido (burbujeo, alarma de oxígeno bajo, golpe) — no hay assets de audio para este juego.
- Controles táctiles/mobile.
- Actualizar `best`/`plays` con datos reales derivados de partidas.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Fila nueva en `games` (Supabase, ver SPEC 06 para el esquema de la tabla). `sort_order: 10` es el siguiente libre tras `arkanoide` (9) al momento de redactar este spec; los tres conceptos de este game-jam comparten ese candidato, así que confirmar con `select max(sort_order) from games` antes de insertar:

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values (
  'buzo',
  'BUZO',
  'Bajá por las perlas, volvé por el aire.',
  'Cuanto más profundo, más valen las perlas y más rápido se vacía el tanque. Las burbujas que suben del fondo son tu única recarga, y entre vos y ellas hay medusas y erizos. Tres vidas para llegar lo más hondo posible.',
  'ARCADE',
  'cover-buzo',
  'green',
  0,
  '0',
  10
);
```

Contrato del motor (`lib/games/buzo-engine.ts`), framework-agnóstico, sin React ni acceso a `document`/`window` fuera de `start()`/`stop()`:

```ts
export interface BuzoEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void; // nivel = zona de profundidad alcanzada
  onGameOver: (finalScore: number) => void; // edge-triggered, una sola vez
}

export interface BuzoEngine {
  start: () => void; // agrega listeners, siembra la primera zona, arranca el rAF
  stop: () => void; // remueve listeners, cancela el rAF
  setPaused: (paused: boolean) => void; // congela update(), draw() sigue corriendo
  reset: () => void; // score 0, 3 vidas, zona 1, buzo en superficie, tanque lleno
}

export function createBuzoEngine(
  canvas: HTMLCanvasElement,
  callbacks: BuzoEngineCallbacks,
): BuzoEngine;
```

Entidades y constantes internas (sin exportar):

```ts
const WIDTH = 800;
const HEIGHT = 600;
const SWIM_ACCEL = 900; // px/s² mientras se mantiene una flecha
const WATER_DRAG = 2.6; // 1/s — v *= 1 - DRAG*dt (inercia de agua)
const MAX_SPEED = 260; // px/s
const BUOYANCY = 40; // px/s² hacia arriba cuando no se pulsa nada
const CAMERA_DEADZONE = 140; // px arriba/abajo del centro antes de que la cámara siga
const OXYGEN_MAX = 100;
const OXYGEN_BASE_DRAIN = 3.2; // unidades/s en la zona 1
const OXYGEN_DRAIN_PER_ZONE = 0.9; // extra por zona
const ZONE_DEPTH = 1800; // px de descenso por zona
const PEARL_POINTS = 50; // × zona
const RESPAWN_INVULN = 2.0; // s de invencibilidad parpadeante

interface Diver {
  x: number; // mundo
  y: number; // mundo — y crece hacia abajo; y = 0 es la superficie
  vx: number;
  vy: number;
  facing: -1 | 1;
  oxygen: number; // 0..OXYGEN_MAX
  invincible: number; // s restantes
}

interface AirBubble {
  x: number;
  y: number;
  r: number; // radio; determina cuánto oxígeno recarga
  vy: number; // negativo: sube
  wobble: number; // fase del zigzag horizontal
}

interface Pearl {
  x: number;
  y: number;
  taken: boolean;
}

interface Jelly {
  x: number;
  y: number;
  vx: number; // patrulla horizontal, rebota en los bordes del cauce
  phase: number; // fase de la animación de pulso
}

interface Urchin {
  x: number; // anclado a la pared izquierda o derecha
  y: number;
  r: number;
}

type EngineState = "playing" | "dead" | "gameover";
```

Conventions:

- Todo se guarda en coordenadas de mundo (`y` crece hacia abajo desde la superficie); la cámara (`camY`) se resta solo en `draw()`.
- Las entidades se siembran por franjas de `CHUNK_H` píxeles a medida que la cámara avanza, y se descartan las que quedan más de una pantalla por encima de la cámara — así la lista nunca crece sin límite en una partida larga.
- El nivel se deriva de la profundidad máxima alcanzada (`Math.floor(maxDepth / ZONE_DEPTH) + 1`), no de la posición actual: subir no baja el nivel ni el multiplicador ya ganado.
- `dt` en segundos con cap de 0.05 (mismo cap que `asteroids-engine.ts`).
- El puntaje es entero y monotónico creciente: perder una vida o quedarse sin aire no descuenta puntos.
- Diff-and-report en los cuatro callbacks, con sentinela `-1` inicial.

---

## Plan de implementación

1. Insertar la fila de `games` vía migración Supabase y agregar `.cover-buzo` en `app/globals.css`. Verificar la card en `/biblioteca` y el detalle en `/juego/buzo`.
2. Crear `lib/games/buzo-engine.ts` con constantes, tipos internos, estado (`diver`, `bubbles`, `pearls`, `jellies`, `urchins`, `camY`, `maxDepth`, `score`, `lives`, `zone`, `state`) y la factory `createBuzoEngine(canvas, callbacks)` devolviendo `{ start, stop, setPaused, reset }`, con loop `update(dt)`/`draw()` y un solo `requestAnimationFrame`.
3. Implementar el nado: `keydown`/`keyup` sobre las cuatro flechas (con `preventDefault()`), aceleración por eje, `WATER_DRAG` aplicado siempre, clamp a `MAX_SPEED`, `BUOYANCY` leve hacia arriba al soltar las teclas, clamp horizontal a las paredes del cauce y tope superior en la superficie (`y >= 0`).
4. Implementar la cámara: `camY` sigue al buzo con `CAMERA_DEADZONE`, nunca por encima de la superficie; `maxDepth = Math.max(maxDepth, diver.y)`.
5. Implementar la siembra por franjas: `seedChunk(fromY, toY, zone)` genera perlas, burbujas de aire, medusas y erizos con densidades dependientes de `zone`; descartar entidades que quedaron fuera de rango por arriba.
6. Implementar el oxígeno: `oxygen -= (OXYGEN_BASE_DRAIN + OXYGEN_DRAIN_PER_ZONE * (zone - 1)) * dt`; al tocar una `AirBubble`, `oxygen = Math.min(OXYGEN_MAX, oxygen + r * AIR_PER_RADIUS)` y la burbuja se consume; al llegar a 0 → `loseLife("ahogo")`.
7. Implementar recolección y peligros: perla tocada → `taken = true`, `score += PEARL_POINTS * zone`, `onScoreChange`; medusa o erizo tocado con `invincible <= 0` → `loseLife("golpe")` con empuje hacia arriba.
8. Implementar `loseLife(cause)`: `lives--`, `onLivesChange`, `state = "dead"` con timer breve; si `lives > 0`, reposicionar según la causa (ahogo → superficie de la zona actual con tanque lleno; golpe → mismo lugar, tanque intacto), `invincible = RESPAWN_INVULN`; si `lives <= 0`, `state = "gameover"` y `onGameOver(score)` una sola vez.
9. Implementar las zonas: recalcular `zone` desde `maxDepth`; al cambiar, `onLevelChange(zone)` y ajustar densidades de siembra.
10. Implementar `draw()`: degradado de agua que se oscurece con la profundidad, partículas de plancton de parallax, buzo (con parpadeo cuando `invincible > 0`), perlas, burbujas de aire, medusas con pulso, erizos, y la barra de oxígeno dentro del canvas (con aviso visual bajo el 25 %). **No** dibujar overlay de "GAME OVER" ni reiniciar por tecla.
11. Crear `components/games/buzo-canvas.tsx` con `canvasRef`/`engineRef`/`callbacksRef`, efecto de montaje `[]`, efecto `[paused]` → `setPaused`, `<canvas width={800} height={600} style={{ width: "100%", height: "100%" }} />`.
12. Wire en `components/game-player.tsx`: `isBuzo`, estado `buzoLevel`, inclusión en la derivación de `level`, exclusión del `setInterval` simulado, reset en `restart()`, render condicional dentro de `.crt-screen`.
13. Correr `npm run build` y `npm run lint`.
14. Verificación manual end-to-end en `/juego/buzo/jugar`: descender dos zonas y ver el nivel subir en el HUD, recargar oxígeno con una burbuja, ahogarse a propósito y confirmar el respawn con tanque lleno, chocar una medusa y confirmar la invencibilidad parpadeante, perder las 3 vidas y confirmar el modal externo, guardar puntaje y jugar de nuevo.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `lib/games/buzo-engine.ts` no importa React ni toca `document`/`window` fuera de `start()`/`stop()`.
- [ ] `/biblioteca` muestra la card de `BUZO` con la portada `.cover-buzo` y `/juego/buzo` muestra su detalle.
- [ ] Las cuatro flechas mueven al buzo con inercia (no movimiento instantáneo) y sin provocar scroll de la página.
- [ ] El buzo no puede salir lateralmente del cauce ni subir por encima de la superficie.
- [ ] La cámara sigue al buzo con zona muerta y nunca muestra por encima de la superficie.
- [ ] El oxígeno baja de forma continua y más rápido en zonas más profundas.
- [ ] Atravesar una burbuja de aire recarga oxígeno y consume esa burbuja; las burbujas grandes recargan más que las chicas.
- [ ] Quedarse sin oxígeno resta una vida y reubica al buzo con el tanque lleno.
- [ ] Recoger una perla suma puntos multiplicados por la zona de profundidad actual.
- [ ] Tocar una medusa o un erizo resta una vida, empuja al buzo hacia arriba y activa invencibilidad parpadeante temporal.
- [ ] Durante la invencibilidad el buzo no puede volver a recibir daño.
- [ ] Cada `ZONE_DEPTH` píxeles de descenso sube el nivel en el HUD externo, y el nivel nunca baja al volver a subir.
- [ ] La cantidad de entidades activas no crece sin límite en una partida larga (las que quedan muy por encima de la cámara se descartan).
- [ ] Perder las 3 vidas dispara `onGameOver` exactamente una vez, con el puntaje real, y abre el modal externo de `GamePlayer`.
- [ ] El canvas no dibuja su propio overlay de "GAME OVER" ni reinicia por tecla.
- [ ] "GUARDAR PUNTUACIÓN" persiste `{ game: "buzo", score, ... }` en `localStorage["av_scores"]` y, con sesión, en Supabase vía `saveScoreToLeaderboard`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, 3 vidas, zona 1, buzo en superficie con tanque lleno).
- [ ] "PAUSA" congela el nado, el ascenso de las burbujas y el consumo de oxígeno; "REANUDAR" continúa sin saltos.
- [ ] Navegar fuera de `/juego/buzo/jugar` no deja listeners de teclado colgados.
- [ ] Ningún otro `game.id` cambia de comportamiento.
- [ ] `/salon` muestra `buzo` con su leaderboard real, sin tocar `lib/scores*.ts`.

---

## Decisiones

- **Sí:** nado con inercia y arrastre en vez de movimiento en grilla o velocidad constante. Es lo que hace que "estar bajo el agua" se sienta distinto de `rocas` o `serpentina`, y convierte el acercarse a una burbuja entre dos medusas en una maniobra real.
- **Sí:** el oxígeno es el reloj del juego, no un temporizador aparte. Une tema y presión: las burbujas son a la vez el recurso y el motivo por el que vale la pena arriesgarse.
- **Sí:** multiplicador de puntaje por zona de profundidad. Da la tensión central del género (bajar más rinde más, pero el aire dura menos) sin necesidad de un sistema de riesgo/recompensa más elaborado.
- **Sí:** el nivel se deriva de la profundidad **máxima** alcanzada, no de la actual. Si bajara al subir, el jugador vería el HUD oscilar y perdería el multiplicador ya ganado por una maniobra de supervivencia.
- **Sí:** vidas (3) con respawn e invencibilidad parpadeante, reutilizando el patrón `state: "dead"` + `invincible` de `asteroids-engine.ts` en vez de inventar un mecanismo nuevo.
- **Sí:** siembra por franjas con descarte de lo que queda arriba, en vez de generar todo el mundo al inicio. Mantiene la memoria y el costo por frame acotados en descensos largos.
- **No:** subir a la superficie a depositar el botín. Cambia la estructura de la partida a viajes de ida y vuelta; el descenso infinito da sesiones de 1 a 5 minutos con menos reglas.
- **No:** arpón ni equipamiento activo. El juego es de esquivar y administrar aire; agregar disparo lo acerca a `rocas` y `arponero`, que ya cubren ese eje.
- **No:** assets externos (sprites/audio). Todo se dibuja con `ctx`, así que el motor no necesita gate de precarga y no puede fallar por un 404.

---

## Riesgos

| Riesgo                                                                                                   | Mitigación                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| La siembra aleatoria genera una franja sin ninguna burbuja de aire y la muerte se siente injusta         | Garantizar un mínimo de burbujas de aire por franja (`at least 1 per CHUNK_H`), además de la densidad aleatoria                                  |
| La siembra puede colocar una medusa o un erizo encima de una burbuja de aire, bloqueándola                | Chequeo de distancia mínima entre entidades al sembrar, con reintento acotado (máximo N intentos por entidad)                                    |
| El drag exponencial (`v *= 1 - DRAG*dt`) se vuelve inestable si `dt` crece por un tab en segundo plano   | Cap de `dt` en 0.05 s, igual que `asteroids-engine.ts`, y clamp del factor de drag a `[0, 1]`                                                    |
| La lista de entidades crece sin límite en un descenso muy largo                                          | Descartar en cada frame lo que esté más de una pantalla por encima de `camY`, verificado explícitamente en el checklist de aceptación            |
| Con el escalado del `.crt-screen`, la barra de oxígeno dibujada en el canvas puede competir con el HUD    | Dibujarla como elemento diegético (tanque del buzo, en una esquina, con estética propia), sin duplicar puntaje/vidas/nivel que ya muestra el HUD |

---

## Qué **no** está en este spec

- Viajes de ida y vuelta a la superficie para depositar el botín.
- Arpón, linterna o cualquier equipamiento activo.
- Upgrades persistentes entre partidas.
- Peligros con IA de persecución.
- Corrientes marinas o cuevas con geometría de colisión.
- Sonido de burbujeo, alarma de oxígeno o golpe.
- Controles táctiles/mobile.
- Actualizar `best`/`plays` con datos reales.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
