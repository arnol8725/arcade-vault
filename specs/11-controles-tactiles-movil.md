# SPEC 11 — Controles táctiles para los 4 motores reales en dispositivos móviles

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 08, SPEC 09, SPEC 10
> **Date:** 2026-09-12
> **Objective:** Agregar un d-pad y botones de acción táctiles debajo del área de juego (fuera del canvas, sin taparlo) para que `rocas`, `bloque-buster`, `arkanoide` y `serpentina` sean jugables sin teclado en dispositivos con pantalla táctil.

---

## Alcance

**In:**

- Componente compartido `components/games/touch-controls.tsx`: d-pad de 4 direcciones (a la izquierda) más hasta 2 botones de acción configurables por props (a la derecha), en una franja propia **debajo de `.crt` (fuera del canvas)**, sin superponerse a la partida en curso. Recibe qué direcciones/botones mostrar y un callback `onKey(code: string, pressed: boolean)`.
- Método público nuevo `setKeyState(code: string, pressed: boolean): void` agregado a la interfaz de los 4 engines (`AsteroidsEngine`, `TetrisEngine`, `ArkanoideEngine`, `SerpentinaEngine`), escribiendo sobre el mismo mecanismo interno de teclas que cada motor ya usa (`keys[...]`) — sin duplicar reglas de juego.
- Mapeo 1:1 con las teclas existentes de cada motor:
  - **rocas:** d-pad `←`/`→` rotan la nave, `↑` empuje; botón **DISPARAR** (`Space`). Continuo: `pressed=true` mientras se mantiene tocado, `false` al soltar — igual que `rocas` lee `keys[...]` cada frame.
  - **bloque-buster:** d-pad `←`/`→` mueven la pieza, `↓` soft drop; botón **ROTAR** (`ArrowUp`/`KeyX`), botón **CAER** (`Space`). El motor es edge-triggered (una acción por `keydown`, sin listener de `keyup`, depende del key-repeat nativo del teclado para mover mientras se mantiene presionado) — el d-pad táctil implementa su propio auto-repeat por software: dispara la acción al tocar y, si se mantiene, vuelve a dispararla cada ~120ms hasta soltar.
  - **arkanoide:** d-pad `←`/`→` mueven la paleta. Sin botón de acción. Convive con el drag por mouse ya existente — dos fuentes de movimiento independientes, igual que hoy conviven teclado y mouse.
  - **serpentina:** d-pad de 4 direcciones cambia `nextDir`. Sin auto-repeat — un tap alcanza porque cambiar de dirección es un estado, no una acción repetida.
- `TouchControls` usa Pointer Events (`onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel`), no Touch Events — un mismo código sirve para touch y mouse (útil también para probar en desktop) y evita el delay de 300ms de tap en iOS.
- `touch-action: none` en los botones del d-pad + `preventDefault()` en sus handlers, para que arrastrar/tocar los controles no scrollee ni haga zoom de la página.
- Visibilidad: `GamePlayer` detecta `window.matchMedia("(pointer: coarse)").matches` en un efecto y solo entonces renderiza `<TouchControls />` como franja debajo de `.crt`. En dispositivos sin puntero táctil (desktop con mouse/trackpad) el layout es idéntico al actual — no se reserva espacio ni se agrega esa franja.
- Los 4 componentes `<slug>-canvas.tsx` (`AsteroidsCanvas`, `TetrisCanvas`, `ArkanoideCanvas`, `SerpentinaCanvas`) aceptan un prop nuevo `onEngineReady?: (engine: X) => void`, invocado una vez en el efecto de montaje tras crear el motor, para que `GamePlayer` capture la instancia sin acoplarse a los detalles internos del canvas.
- `GamePlayer` mantiene un `engineRef` (uno solo activo a la vez) seteado por `onEngineReady` y lo conecta a `TouchControls` vía `onKey={(code, pressed) => engineRef.current?.setKeyState(code, pressed)}`.
- CSS nuevo en `app/globals.css`: `.touch-controls`, `.touch-dpad`, `.touch-button` — franja en flujo normal debajo de `.crt` (no superpuesta al canvas), tamaño mínimo de zona táctil 44×44px.
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Soporte de gamepad/control físico vía Gamepad API.
- Orientación forzada (Screen Orientation API) — decisión explícita del usuario: el canvas ya escala fluido en `.crt-screen` (`aspect-ratio: 4/3`), se juega igual en portrait o landscape.
- Vibración/haptics al tocar los botones.
- Rediseño del HUD externo de `GamePlayer` o del layout general de `.crt-screen` más allá de superponer los controles.
- Cambios de layout responsive en `/biblioteca`, `/salon` u otras rutas no relacionadas a la partida en curso.
- Corregir el desajuste visual de `bloque-buster` (cover de ladrillos + motor de Tetris) — deuda explícita de SPEC 08/09, sigue fuera de alcance acá.
- PWA / instalación en pantalla de inicio.
- Tests automatizados (no hay test runner configurado en el proyecto).

Esto reemplaza la exclusión "Controles táctiles/mobile" que SPEC 05, 08, 09 y 10 dejaron explícitamente fuera de su propio alcance — este spec es el que la resuelve para los 4 motores a la vez.

---

## Modelo de datos

Este spec no introduce persistencia nueva. Extiende las interfaces ya existentes de los 4 engines con un método nuevo, y agrega los tipos del componente compartido:

```ts
// Se agrega a AsteroidsEngine, TetrisEngine, ArkanoideEngine y SerpentinaEngine
export interface XEngine {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
  setKeyState: (code: string, pressed: boolean) => void; // nuevo
}
```

```ts
// components/games/touch-controls.tsx
export interface TouchButtonConfig {
  code: string; // "Space" | "ArrowUp" | "KeyX" | ...
  label: string; // "DISPARAR" | "ROTAR" | "CAER"
}

export interface TouchControlsProps {
  directions: {
    up?: string; // ej. "ArrowUp"
    down?: string;
    left?: string; // ej. "ArrowLeft"
    right?: string;
  };
  buttons?: TouchButtonConfig[]; // 0 a 2 botones de acción
  onKey: (code: string, pressed: boolean) => void;
  /** Solo bloque-buster: auto-repeat por software mientras el botón/dirección se mantiene tocado. */
  repeat?: { intervalMs: number; codes: string[] };
}
```

```ts
// components/games/<slug>-canvas.tsx — prop nuevo, mismo patrón en los 4
interface XCanvasProps {
  // ...props existentes sin cambios
  onEngineReady?: (engine: XEngine) => void;
}
```

---

## Plan de implementación

1. Agregar `setKeyState(code, pressed)` a `lib/games/asteroids-engine.ts`, `tetris-engine.ts`, `arkanoide-engine.ts` y `serpentina-engine.ts`, escribiendo sobre el mismo objeto/mecanismo interno de teclas que cada uno ya usa (`keys[e.code]` en rocas/bloque-buster, `keys[e.key]` en arkanoide, `DIR_BY_CODE`/`nextDir` en serpentina). En `bloque-buster`, además, implementar el auto-repeat por software descrito arriba (dispara al presionar, repite cada ~120ms mientras se mantenga, se cancela al soltar).
2. Crear `components/games/touch-controls.tsx`: d-pad de 4 botones direccionales + hasta 2 botones de acción, Pointer Events (`onPointerDown/Up/Leave/Cancel`) con `preventDefault()` y `touch-action: none`, lógica de auto-repeat cuando `repeat` está presente.
3. Agregar `onEngineReady` a `components/games/asteroids-canvas.tsx`, `tetris-canvas.tsx`, `arkanoide-canvas.tsx`, `serpentina-canvas.tsx`, llamado una vez en el efecto de montaje tras crear cada motor.
4. En `components/game-player.tsx`: detectar `isTouchDevice` con `window.matchMedia("(pointer: coarse)")` en un efecto; mantener `engineRef` capturado vía `onEngineReady`; renderizar `<TouchControls />` **debajo de `.crt`** (fuera de `.crt-screen`, como franja propia) cuando `isTouchDevice && !over` con la config de direcciones/botones correspondiente a `game.id` (rocas/bloque-buster/arkanoide/serpentina).
5. Agregar `.touch-controls`/`.touch-dpad`/`.touch-button` a `app/globals.css`: layout en flujo normal (no `position: absolute`, no superpuesto al canvas), tamaño mínimo de zona táctil 44×44px.
6. `npm run build` y `npm run lint`.
7. Verificación manual en cada uno de los 4 `/juego/<id>/jugar` con las herramientas de emulación táctil del navegador (device toolbar): d-pad y botones disparan la misma acción que su tecla equivalente, ningún toque scrollea ni hace zoom de la página, el teclado físico sigue funcionando igual que antes, y en un viewport de escritorio sin puntero táctil los controles no aparecen.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Los 4 engines (`asteroids-engine.ts`, `tetris-engine.ts`, `arkanoide-engine.ts`, `serpentina-engine.ts`) exponen `setKeyState` sin importar nada de React ni del DOM salvo lo ya permitido.
- [ ] En un viewport con `(pointer: coarse)` activo, `/juego/rocas/jugar` muestra d-pad + botón "DISPARAR"; tocar cada dirección rota/empuja la nave igual que su tecla, y el botón dispara.
- [ ] En `/juego/bloque-buster/jugar`, el d-pad mueve la pieza y hace soft drop, "ROTAR" rota la pieza y "CAER" hace hard drop; mantener tocada una dirección mueve la pieza repetidamente sin necesidad de tocar una y otra vez.
- [ ] En `/juego/arkanoide/jugar`, el d-pad mueve la paleta con `←`/`→`; el drag por mouse existente sigue funcionando sin conflicto.
- [ ] En `/juego/serpentina/jugar`, el d-pad cambia la dirección de la serpiente con un solo tap por dirección, sin permitir invertir 180° (misma regla que ya aplica el motor).
- [ ] Tocar cualquier botón de los controles no produce scroll ni zoom de la página.
- [ ] En un viewport sin puntero táctil (`(pointer: coarse)` falso), los controles táctiles no se renderizan y el layout es idéntico al actual.
- [ ] El teclado físico sigue funcionando exactamente igual que antes en los 4 juegos, incluso con `TouchControls` visible.
- [ ] Navegar fuera de cualquier `/juego/<id>/jugar` no deja listeners de pointer colgados ni intervalos de auto-repeat corriendo.
- [ ] Ningún otro `game.id` (los decorativos: `caida`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) cambia de comportamiento.

---

## Decisiones

- **Sí:** un componente compartido `TouchControls` en vez de uno embebido por motor. Evita repetir 4 veces el mismo layout de d-pad+botones con variaciones mínimas de configuración.
- **Sí:** `setKeyState(code, pressed)` como método nuevo en cada engine, en vez de simular `KeyboardEvent` sintéticos sobre `window`. Es explícito, no depende de que cada listener interprete bien un evento sintético, y es fácil de probar a mano.
- **Sí:** Pointer Events en vez de Touch Events. Un solo código cubre touch y mouse, sin el delay de 300ms de tap en iOS Safari.
- **Sí:** auto-repeat por software solo en `bloque-buster`. Es el único de los 4 motores edge-triggered sin listener de `keyup` que depende del key-repeat nativo del teclado para moverse mientras se mantiene presionada una tecla; los demás (`rocas`, `arkanoide`) leen `keys[...]` cada frame y ya son continuos por naturaleza, y `serpentina` no necesita repetición porque cambiar de dirección es un estado, no una acción repetida.
- **Sí:** mapeo 1:1 con las teclas existentes en vez de un esquema de control nuevo. Reutiliza la lógica de reglas de cada motor ya probada, sin inventar mecánicas.
- **No:** forzar orientación landscape. El canvas ya escala fluido vía `.crt-screen` (`aspect-ratio: 4/3`); forzarla requeriría Screen Orientation API y agregaría una restricción que el usuario no pidió.
- **No:** mostrar los controles por umbral de ancho de viewport. Se decidió por detección real de puntero táctil (`pointer: coarse`) para cubrir híbridos (laptop táctil) y no esconderlos en tablets grandes ni mostrarlos en un desktop con ventana angosta.
- **No:** gamepad, haptics, PWA. No fueron pedidos y ampliarían el alcance sin necesidad.
- **Sí (revisado durante la implementación):** `TouchControls` va debajo de `.crt`, en flujo normal, en vez de superpuesto sobre el canvas con `position: absolute`. La primera versión tapaba parte del área de juego mientras se jugaba; sacarlo del canvas prioriza ver el juego completo sobre ahorrar espacio vertical.

---

## Riesgos

| Riesgo                                                                                                                      | Mitigación                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| El auto-repeat por software de `bloque-buster` puede sentirse distinto al key-repeat nativo del teclado (velocidad/retardo) | Usar un intervalo fijo razonable (~120ms) documentado en el plan; ajustable a mano si en la verificación manual se siente muy rápido o muy lento     |
| Sostener dos botones a la vez (ej. d-pad + acción) con dos dedos requiere que cada `pointerId` se trackee por separado      | Pointer Events ya distinguen `pointerId` nativamente; cada botón maneja su propio `pointerId` sin interferir con los demás                           |
| El drag de mouse y el d-pad táctil de `arkanoide` podrían pisarse si conviven en el mismo dispositivo híbrido               | Ambos escriben sobre la misma variable de posición de la paleta, igual que hoy conviven teclado+mouse en ese motor — el último evento procesado gana |
| `pointerleave`/`pointercancel` no disparados en todos los navegadores móviles al deslizar el dedo fuera del botón           | Manejar ambos eventos explícitamente en `TouchControls` (no solo `pointerup`) para garantizar que la tecla se libere aunque el dedo se resbale       |

---

## Qué **no** está en este spec

- Gamepad/control físico vía Gamepad API.
- Orientación forzada (Screen Orientation API).
- Vibración/haptics.
- Rediseño del HUD externo o del layout general de `.crt-screen`.
- Cambios de layout responsive fuera de la pantalla de partida (`/biblioteca`, `/salon`, etc.).
- Corregir el desajuste visual de `bloque-buster` (cover de ladrillos + motor de Tetris).
- PWA / instalación en pantalla de inicio.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
