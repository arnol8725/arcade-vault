# SPEC 05 — Motor real de Asteroids en el juego "ROCAS"

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-06
> **Objective:** Reemplazar el arena decorativa y el puntaje simulado de `GamePlayer` para el juego `rocas` por el motor real de `references/started-games/02-asteroids/game.js`, portado a un componente React/TypeScript con canvas que alimenta el HUD existente con datos reales.

---

## Alcance

**In:**

- Portar `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, loop `update`/`draw`, constantes `RADII`/`SPEEDS`/`POINTS`) a TypeScript puro y agnóstico de framework en `lib/games/asteroids-engine.ts`, sin dependencias del DOM salvo el `CanvasRenderingContext2D` que recibe por parámetro.
- Crear `components/games/asteroids-canvas.tsx` (`"use client"`): monta un `<canvas>` de resolución interna fija 800×600 escalado por CSS al contenedor (`width: 100%; height: 100%`, ya en aspect-ratio 4/3 en `.crt-screen`), instancia el motor, corre el loop vía `requestAnimationFrame`, y expone el estado real (`score`, `lives`, `level`, `gameover`) hacia arriba mediante props de callback (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`). Recibe una prop `paused: boolean`: si es `true`, el loop sigue pidiendo frames y dibujando, pero `update(dt)` no se ejecuta (el juego queda congelado en el último frame).
- Los listeners de teclado (`keydown`/`keyup` en `window`, ya existentes en el original) se agregan en un `useEffect` y se remueven en su cleanup al desmontar el componente (el original, pensado para una página standalone, nunca los remueve). Se agrega `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space` para que no hagan scroll de la página anfitriona (el `index.html` original no lo necesitaba por ser página única).
- Se elimina del motor portado el overlay interno de `drawOverlay('GAME OVER', ...)` y el `pressed('Space') → initGame()` del estado `'gameover'`: al llegar a `gameover` el motor solo dispara `onGameOver(score)` y detiene el loop. El único punto de reinicio/guardado de partida pasa a ser el modal ya existente en `GamePlayer` (pedir iniciales, "GUARDAR PUNTUACIÓN", "JUGAR DE NUEVO").
- Modificar `components/game-player.tsx`: cuando `game.id === "rocas"`, renderiza `<AsteroidsCanvas>` dentro de `.crt-screen` en vez del `.game-arena` decorativo (`grid-floor`, `enemy`, `player-ship`), y el `score`/`lives`/`level` del HUD dejan de venir del `setInterval` simulado y de la fórmula derivada (`Math.floor(score / 2500) + 1`) para venir de los callbacks del motor real. `restart()` reinicia también el motor (vía una prop `resetKey` o remount del `AsteroidsCanvas`). El resto del componente (HUD, botones PAUSA/FIN/SALIR, modal de fin de partida, `saveScore` a `localStorage["av_scores"]`) no cambia de lógica — solo recibe datos reales en vez de simulados.
- Para cualquier otro `game.id` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`), `GamePlayer` sigue exactamente igual que hoy: arena decorativa y puntaje simulado con `setInterval`.

**Out of scope (para specs futuros):**

- Portar cualquier otro juego de `references/started-games/` (Arkanoid u otros) a su slot real — cada uno es su propio spec.
- Migrar `av_scores` de `localStorage` a una tabla de Supabase — ya diferido por SPEC 04 a un spec futuro dependiente de la auth real.
- Sonido (el `game.js` de origen no tiene efectos de sonido; el arkanoid de referencia sí, pero es otro juego).
- Tabla de leaderboard real por juego (`seededScores` sigue siendo mock en `/salon`).
- Actualizar los valores decorativos `best`/`plays` de `rocas` en `lib/games.ts` — son datos de portada, no puntajes reales.
- Controles táctiles/mobile o remapeo de teclas — se mantiene el esquema original (`←` `→` rotar, `↑` propulsar, `Espacio` disparar).
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no introduce persistencia nueva ni tablas. Los tipos nuevos son internos del motor portado, sin almacenamiento:

```ts
// lib/games/asteroids-engine.ts
export type AsteroidSize = 1 | 2 | 3;
export type EngineState = "playing" | "dead" | "gameover";

export interface AsteroidsEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngine {
  start: () => void; // arranca el loop (requestAnimationFrame)
  stop: () => void; // cancela el loop y remueve listeners
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, level 1
}
```

El guardado de partida sigue usando la forma ya definida en SPEC 01 (`GamePlayer.saveScore`), sin cambios:

```ts
// components/game-player.tsx (sin cambios de forma)
{
  game: string;
  score: number;
  name: string;
  at: number;
} // en localStorage["av_scores"]
```

---

## Plan de implementación

1. Crear `lib/games/asteroids-engine.ts`: portar 1:1 la lógica de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, `spawnAsteroids`, `nextLevel`, `explode`, `killShip`, `update`, `draw`, `drawHUD`) tipada en TypeScript estricto, envuelta en una función factory `createAsteroidsEngine(canvas: HTMLCanvasElement, callbacks: AsteroidsEngineCallbacks): AsteroidsEngine`. Se elimina el `drawOverlay('GAME OVER', ...)` de `draw()` y el `pressed('Space') → initGame()` de `update()` en estado `'gameover'`; en su lugar, al entrar en `'gameover'` se llama `callbacks.onGameOver(score)` una sola vez. Cada cambio de `score`, `lives` o `level` dispara el callback correspondiente.
2. El manejo de input (`keys`, `justPressed`, `pressed(code)`) se mueve dentro del engine, pero los `addEventListener` se registran/remueven a través de métodos expuestos por el engine (llamados desde el `useEffect` del componente React), no como listeners globales fijados al cargar el módulo. Se agrega `e.preventDefault()` para `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space` en el `keydown`.
3. Crear `components/games/asteroids-canvas.tsx` (`"use client"`): en un `useEffect` con `ref` al `<canvas>`, llama `createAsteroidsEngine` con los callbacks recibidos por props, guarda la instancia en un `ref`, y llama `engine.start()`; el cleanup llama `engine.stop()`. Un segundo `useEffect` sincroniza la prop `paused` con `engine.setPaused(paused)`. El `<canvas width={800} height={600}>` se estiliza con `width: "100%"; height: "100%"` para escalar dentro de `.crt-screen` (ya `aspect-ratio: 4/3`, igual que 800×600).
4. Modificar `components/game-player.tsx`: agregar estado real `lives` (hoy fijo con `useState(3)` sin setter) y quitar la derivación `level = Math.floor(score / 2500) + 1` cuando `game.id === "rocas"`. Condicional: si `game.id === "rocas"`, renderizar `<AsteroidsCanvas paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={endGame} key={resetKey} />` dentro de `.crt-screen` en vez del `.game-arena` decorativo; para cualquier otro juego, mantener el `useEffect` con `setInterval` y el `.game-arena` actuales sin cambios. `restart()` incrementa `resetKey` para forzar el remount del `AsteroidsCanvas` (reinicio limpio del motor) además de resetear `score`/`paused`/`over`/`saved` como ya hace hoy.
5. Verificación manual end-to-end en `/juego/rocas/jugar`: HUD muestra puntaje, vidas y nivel reales (no la simulación); disparar, rotar y propulsar responden a `←` `→` `↑` `Espacio` sin scrollear la página; destruir asteroides suma puntos según tamaño (20/50/100) y los parte en fragmentos menores; perder las 3 vidas dispara el modal de fin de partida (no el overlay interno del canvas) con el puntaje real; "GUARDAR PUNTUACIÓN" lo persiste en `localStorage["av_scores"]`; "JUGAR DE NUEVO" reinicia el motor desde cero (score 0, vidas 3, nivel 1); "PAUSA" congela el juego en el frame actual y "REANUDAR" continúa sin saltos de física; "SALIR" desmonta el componente sin dejar listeners de teclado colgados (verificar que las flechas ya no afectan nada fuera de `/juego/rocas/jugar`); confirmar que el resto de los juegos (ej. `bloque-buster` en `/juego/bloque-buster/jugar`) sigue mostrando la arena decorativa y el puntaje simulado sin cambios.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `lib/games/asteroids-engine.ts` no importa nada de React ni del DOM salvo el tipo `CanvasRenderingContext2D`/`HTMLCanvasElement` recibidos por parámetro.
- [ ] En `/juego/rocas/jugar`, el HUD (puntaje, vidas, nivel) refleja el estado real del motor, no una simulación.
- [ ] Los controles `←` `→` `↑` `Espacio` mueven/disparan la nave real y no producen scroll de la página.
- [ ] Destruir un asteroide grande/mediano/pequeño suma 20/50/100 puntos respectivamente y lo divide en fragmentos más chicos, salvo los de tamaño 1.
- [ ] Perder las 3 vidas abre el modal externo de fin de partida con el puntaje real; el canvas no muestra su propio overlay de "GAME OVER" ni reinicia con `Espacio`.
- [ ] "GUARDAR PUNTUACIÓN" en el modal persiste `{ game: "rocas", score, name, at }` en `localStorage["av_scores"]`.
- [ ] "JUGAR DE NUEVO" reinicia el motor por completo (score 0, 3 vidas, nivel 1, sin asteroides residuales del intento anterior).
- [ ] "PAUSA" congela el juego (nave, asteroides y balas dejan de moverse) y "REANUDAR" continúa sin saltos de física ni pérdida de vidas injustificada.
- [ ] Navegar fuera de `/juego/rocas/jugar` (botón "SALIR" u otra ruta) no deja listeners de teclado activos afectando el resto de la app.
- [ ] Ningún otro juego (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) cambia de comportamiento: siguen con la arena decorativa y el puntaje simulado.
- [ ] `lib/games.ts` no cambia (los valores `best`/`plays` de `rocas` quedan como datos de portada, sin relación con partidas reales).

---

## Decisiones

- **Sí:** portar el motor a TypeScript dentro de un componente React con canvas, en vez de embeber los archivos originales en un `<iframe>`. Permite que el HUD ya existente (`player-hud`) reciba puntaje/vidas/nivel reales sin inventar un canal de `postMessage` entre un iframe y la página anfitriona.
- **Sí:** alcance acotado a `rocas` únicamente. Es el primer juego que se porta — generalizar `GamePlayer` para los 8 juegos a la vez multiplica el riesgo sin pedido explícito; cada motor futuro es su propio spec.
- **Sí:** desactivar el overlay y el restart-por-`Space` internos del motor original. Tener dos flujos de "fin de partida" (el del canvas y el modal externo) compitiendo por la misma tecla es confuso e innecesario — el modal externo ya cubre pedir iniciales y guardar.
- **Sí:** pausa por congelamiento de `update` (no cancelar `requestAnimationFrame`). Evita el salto de física que produciría resetear `lastTime` a `null` al reanudar, y no requiere un overlay adicional porque el HUD externo ya muestra "EN PAUSA".
- **Sí:** mantener `av_scores` en `localStorage` sin cambios de forma. La migración a Supabase ya quedó diferida explícitamente por SPEC 04 a un spec futuro — mezclarla acá amplía el alcance sin necesidad.
- **Sí:** remover y volver a agregar los listeners de teclado en el ciclo de montaje/desmontaje de React. El original los deja para siempre porque es una página única; en una SPA con rutas, no limpiar los listeners los dejaría activos al navegar a otra pantalla.
- **Sí:** `preventDefault()` en las teclas de control. El `index.html` original es la única página del navegador, así que nunca le importó el scroll; dentro de Arcade Vault, las flechas y el espacio sí scrollean la página si no se interceptan.
- **No:** portar el sistema de sonido del Arkanoid de referencia a este juego. Son juegos distintos con specs distintas — el `game.js` de Asteroids nunca tuvo sonido.
- **No:** actualizar `best`/`plays` de `rocas` en `lib/games.ts` con datos reales. Son valores decorativos de portada definidos en SPEC 01, no derivados de partidas jugadas; cambiar su fuente es un spec aparte (requeriría alguna agregación sobre `av_scores`).

---

## Riesgos

| Riesgo                                                                                                                                        | Mitigación                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El canvas a resolución fija 800×600 escalado por CSS puede verse borroso o pixelado en pantallas muy grandes                                  | Aceptado para este MVP — es el mismo trade-off que ya asume el `.crt-screen` con su estética CRT/scanlines; si se vuelve un problema, ajustar la resolución interna es un cambio aislado al `AsteroidsCanvas` |
| Portar manualmente ~420 líneas de `game.js` a TypeScript puede introducir bugs sutiles de física (ej. orden de `update` vs `draw`, redondeos) | El plan de verificación manual del paso 5 cubre explícitamente puntaje por tamaño, división de asteroides y colisión nave-asteroide, que son los puntos más fáciles de romper en un port                      |
| No limpiar bien los listeners de teclado al desmontar podría dejar `←` `→` `↑` `Espacio` interceptados en el resto de la app                  | El paso 5 de verificación incluye explícitamente navegar fuera de `/juego/rocas/jugar` y confirmar que las teclas vuelven a comportarse normalmente                                                           |

---

## Qué **no** está en este spec

- Portar otros juegos de `references/started-games/` a sus slots reales.
- Migración de `av_scores` a Supabase.
- Sonido, controles táctiles o remapeo de teclas.
- Leaderboard real por juego en `/salon`.
- Actualizar `best`/`plays` de `rocas` en `lib/games.ts`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
