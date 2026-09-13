# SPEC 13 — Performance del glow en Frogger (skin neón)

> **Status:** Implementado
> **Depends on:** SPEC 10 (motor de Frogger)
> **Date:** 2026-09-13
> **Objective:** Eliminar el costo de `shadowBlur` por-entidad-por-frame en `lib/games/frogger-engine.ts` cacheando el glow del skin neón en sprites offscreen pre-renderizados, sin cambiar el resultado visual.

---

## Contexto (diagnóstico previo a este spec)

Auditoría de código confirmó la causa raíz antes de escribir el plan:

- `withGlow()` (`lib/games/frogger-engine.ts:314`) aplica `ctx.save()` + `ctx.shadowBlur = 14` + `ctx.shadowColor` + `ctx.restore()` **por cada entidad, en cada frame**, cuando el skin activo tiene `glow: true` (solo el skin neón; classic y retro entran por el `if (!skin.glow) { drawFn(); return; }` y no pagan ningún costo extra).
- Se invoca desde `drawGoals()` (borde + relleno de cada boca, ×5), `drawEntity()` (car, truck, log, turtle visible — hasta 14 filas con varias entidades por fila) y `drawFrog()`. Con tráfico denso en pantalla esto son 20-40+ operaciones de `shadowBlur` en vivo por frame, una de las operaciones más caras del Canvas 2D API.
- Ningún otro motor del proyecto (`asteroids`, `tetris`, `arkanoide`, `serpentina`) usa `shadowBlur`; el problema es específico de Frogger y de su skin neón.
- Usuario confirmó que los tirones se notan justamente con el skin neón y con pantalla cargada de autos/troncos — coincide con el diagnóstico.

---

## Alcance

**In:**

- Reemplazar el uso en vivo de `shadowBlur` dentro de `withGlow()` por un cache de sprites offscreen: cada combinación relevante de (tipo de entidad, ancho en celdas, color/skin) se dibuja una única vez a un `OffscreenCanvas`/`<canvas>` en memoria con el glow ya "horneado", y en el loop de render se usa `ctx.drawImage()` para pintarlo en la posición actual — mismo resultado visual, sin recalcular el blur en cada frame.
- Cubre las cuatro superficies que hoy llaman `withGlow()`: `drawGoals()` (borde y relleno de boca), `drawEntity()` (car, truck, log, turtle visible), `drawFrog()`.
- Invalidación del cache: al llamar `setSkin()` (cambio de skin en caliente, ya soportado por el motor) se descarta el cache viejo y se reconstruye bajo demanda con la paleta nueva.
- Medición manual antes/después con Chrome DevTools (Performance recording y/o FPS meter) en el mismo escenario reproducible: skin neón, tramo de la partida con tráfico denso (varias filas de autos/camiones simultáneas).
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Cambios visuales al skin neón (color, radio de blur, intensidad) — el objetivo es idéntico resultado visual, más barato de renderizar. Cualquier ajuste estético es otro spec.
- Auditoría o cambios de performance en `asteroids`, `tetris`, `arkanoide` o `serpentina` — ninguno comparte el patrón de `shadowBlur` por entidad; si aparece evidencia real de un problema en otro motor, se abre un spec dedicado a ese motor.
- Cambios de lógica de juego de Frogger (colisiones, spawn de entidades, reglas de las bocas, temporizador) — este spec toca únicamente el código de dibujo.
- Overlay de FPS visible en producción o cualquier telemetría de performance persistente — la medición de este spec es manual, puntual, con DevTools.
- Cambios a `components/games/frogger-canvas.tsx` o al wiring en `components/game-player.tsx` — el fix vive enteramente dentro del motor.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

No se introduce persistencia nueva ni tipos públicos nuevos (no cambia la interfaz de `createFroggerEngine`). Se agrega estado interno privado al motor:

```ts
// lib/games/frogger-engine.ts (dentro del closure de createFroggerEngine)

// Clave de cache: tipo de entidad + ancho en celdas + color del glow.
// El color ya identifica al skin activo (cada skin define sus propios
// colores en SKINS), así que no hace falta incluir el nombre del skin.
type GlowSpriteKey = string; // `${entityKind}:${widthCells}:${color}`

// Un sprite cacheado guarda el canvas offscreen ya renderizado con el
// glow, más el offset para centrarlo respecto a la posición lógica
// (x, y) del elemento, porque el halo del blur sobresale del bounding
// box original.
interface CachedGlowSprite {
  canvas: HTMLCanvasElement; // u OffscreenCanvas si el entorno lo soporta
  offsetX: number;
  offsetY: number;
}

let glowSpriteCache: Map<GlowSpriteKey, CachedGlowSprite>;
// Se reinicializa (Map nueva, vacía) cada vez que setSkin() cambia el
// skin activo; las entradas se generan de forma perezosa (lazy) la
// primera vez que cada combinación se necesita, no todas de una.
```

---

## Plan de implementación

1. **Medición baseline.** Levantar `/juego/frogger/jugar` con `npm run dev`, forzar el skin neón, y grabar un Performance profile de Chrome DevTools (o leer el FPS meter) durante ~10s con tráfico denso en pantalla. Guardar el número (FPS promedio o duración de frame) como referencia de "antes". No se toca código todavía.
2. Agregar `glowSpriteCache: Map<GlowSpriteKey, CachedGlowSprite>` al closure del motor, inicializada vacía en la creación.
3. Escribir `getOrCreateGlowSprite(key, widthPx, heightPx, color, drawFn)`: si `key` ya está en el cache, devuelve la entrada existente; si no, crea un `<canvas>` en memoria del tamaño `(widthPx + padding*2) × (heightPx + padding*2)` (el padding cubre el halo del `shadowBlur` de radio 14), dibuja ahí con `shadowBlur` **una sola vez**, guarda el resultado en el `Map` y lo devuelve.
4. Reemplazar el cuerpo de `withGlow()`: en vez de aplicar `shadowBlur` en vivo, resuelve o crea el sprite cacheado correspondiente vía `getOrCreateGlowSprite()` y lo pinta con `ctx.drawImage()` en la posición actual del elemento (aplicando `offsetX`/`offsetY` para compensar el padding del halo). El skin classic/retro sigue el mismo atajo que hoy (`if (!skin.glow) { drawFn(); return; }`), sin pasar por el cache.
5. Adaptar cada llamador de `withGlow()` (`drawGoals()`, `drawEntity()` para car/truck/log/turtle, `drawFrog()`) para pasar la clave de cache correcta (tipo + ancho en celdas + color) en vez de solo el color, ya que ahora la función necesita saber qué dibujar la primera vez y qué tamaño reservar.
6. En `setSkin()`, agregar `glowSpriteCache = new Map()` para invalidar todo el cache cuando cambia la paleta activa (los sprites viejos tenían el color del skin anterior "horneado" y ya no sirven).
7. Verificación visual manual: jugar con los 3 skins (classic, retro, neon) y confirmar que el resultado se ve **idéntico** al de antes del cambio — mismo glow, mismo color, mismo radio — tanto en reposo como cambiando de skin en caliente durante la partida.
8. Medición final. Repetir el mismo profile/escenario del paso 1 con el código nuevo y comparar contra el baseline.
9. `npm run build` y `npm run lint`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Ningún llamador de glow (`drawGoals`, `drawEntity`, `drawFrog`) ejecuta `ctx.shadowBlur` en vivo dentro del loop de render cuando el skin es neón — el blur solo se calcula una vez por combinación (tipo + ancho + color), al crear el sprite cacheado.
- [ ] El resultado visual del skin neón es indistinguible del actual: mismo color, mismo radio de glow, mismo comportamiento en goles, autos, camiones, troncos, tortugas y sapo.
- [ ] Cambiar de skin en caliente (`setSkin()`) durante una partida en curso muestra el glow del skin nuevo correctamente — ninguna entidad queda pintada con el color del skin anterior.
- [ ] Los skins classic y retro se comportan exactamente igual que antes de este cambio (no pasan por el cache de glow).
- [ ] La medición final (Performance profile o FPS meter de Chrome DevTools) en el mismo escenario de tráfico denso con skin neón muestra una mejora medible frente al baseline del paso 1 del plan.
- [ ] No hay regresión en la lógica de juego (colisiones, spawn, reglas de las bocas, temporizador) — el cambio es exclusivamente de dibujo.

---

## Decisiones

- **Sí:** sprites offscreen pre-renderizados en vez de reducir/desactivar el blur en vivo. Preserva el resultado visual exacto del skin neón (criterio explícito del usuario) mientras elimina el costo por-frame; la alternativa de "bajar el radio o limitar el glow a entidades cercanas" degradaba el efecto visual, algo que el usuario no pidió.
- **Sí:** cache perezoso (lazy), por combinación de (tipo, ancho en celdas, color) en vez de pre-generar todo al iniciar el motor. Evita trabajo innecesario si una combinación nunca aparece en una partida dada, y mantiene el cambio acotado a `withGlow()` y sus llamadores.
- **Sí:** invalidar todo el cache en `setSkin()` en vez de versionarlo por skin. El motor ya soporta cambio de skin en caliente como un evento infrecuente (no ocurre en medio de un frame de juego normal); reconstruir bajo demanda es más simple que mantener un cache por skin y no tiene costo perceptible.
- **Sí:** alcance limitado a Frogger. La auditoría de código (grep de `shadowBlur`/`withGlow` en los 5 motores) no encontró el patrón en ningún otro; abrir alcance a los demás sin evidencia sería trabajo especulativo.
- **No:** overlay de FPS en producción ni telemetría persistente. El usuario eligió medición manual puntual con DevTools; no hace falta instrumentación nueva en el código del juego.
- **No:** tocar el radio de blur, los colores del skin neón, ni ninguna otra decisión visual de spec 12. Este spec es de performance pura, resultado visual intacto.

---

## Riesgos

| Riesgo                                                                                                                                 | Mitigación                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El padding del sprite cacheado (necesario para no recortar el halo del blur) queda mal calculado y el glow se ve cortado en los bordes | Calcular el padding con margen generoso a partir del radio de blur conocido (14px) y verificar visualmente cada tipo de entidad en el paso 7 del plan antes de dar el spec por cerrado                                                                    |
| Cambiar de skin en caliente deja sprites viejos en el `Map` si se olvida invalidar en algún branch de `setSkin()`                      | El criterio de aceptación de cambio de skin en caliente cubre esto explícitamente; probarlo manualmente cambiando de skin varias veces durante una partida activa                                                                                         |
| La mejora medida en DevTools es marginal porque el cuello de botella real no era `shadowBlur` sino otra cosa (spawn, colisiones, GC)   | El baseline del paso 1 se toma antes de tocar código; si la comparación del paso 8 no muestra mejora clara, el spec no se cierra como resuelto — se documenta el hallazgo y se decide si hace falta perfilar más a fondo antes de intentar otra hipótesis |

---

## Qué **no** está en este spec

- Auditoría o cambios de performance en `asteroids`, `tetris`, `arkanoide` o `serpentina`.
- Cambios visuales al skin neón (color, intensidad, radio de glow) o a cualquier otro skin.
- Cambios de lógica/reglas de juego de Frogger.
- Overlay de FPS en producción o telemetría de performance persistente.
- Cambios a `frogger-canvas.tsx` o al wiring en `game-player.tsx`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
