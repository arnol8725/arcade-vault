# SPEC 12 — Estilo gamepad neón para los controles táctiles

> **Status:** Implemented
> **Depends on:** SPEC 11
> **Date:** 2026-09-12
> **Objective:** Rediseñar visualmente `TouchControls` (sin tocar su lógica) para que se vea como un gamepad de consola neón, tomando como referencia `references/gamepad-assets/`.

---

## Alcance

**In:**

- Restyle completo de `components/games/touch-controls.tsx` (markup) y su CSS en `app/globals.css` (`.touch-controls`, `.touch-dpad`, `.touch-button`, `.touch-actions`, `.touch-actions__button`), inspirado en `references/gamepad-assets/gamepad.html` / `gamepad-neon.png`.
- Marco de consola: envolver los controles en una caja bordeada con esquinas redondeadas, gradiente de fondo, borde de línea cyan y textura de puntos sutil, igual que `.gp` en la referencia.
- D-pad: reemplazar los caracteres Unicode (▲◀▶▼) por iconos SVG inline (triángulos), con el mismo tratamiento de glow (`drop-shadow`) al presionar que usa la referencia.
- Hub central decorativo en medio del d-pad: rombo/gema que pulsa continuamente (animación CSS), sin ninguna función táctil — no es un botón, no captura eventos de puntero.
- Botones de acción circulares con degradado radial + anillo de glow al presionar, manteniendo su etiqueta de texto completa (p. ej. "DISPARAR", "ROTAR", "CAER") con tipografía más chica para que entre en el círculo.
- Color por botón de acción: cada `TouchButtonConfig` declara explícitamente su color (`cyan` o `magenta`); `rocas` mantiene `DISPARAR` en magenta (igual que hoy), `bloque-buster` usa `ROTAR` en cyan y `CAER` en magenta.
- El piso de 44×44px se mantiene como mínimo intocable en todos los breakpoints nuevos (criterio ya aceptado en spec 11).
- `npm run build` y `npm run lint`.

**Out of scope (para specs futuros):**

- Cualquier cambio de comportamiento/lógica de spec 11: Pointer Events, `setKeyState`, mapeo de teclas, auto-repeat de bloque-buster, detección `(pointer: coarse)`. Este spec es 100% visual.
- Sonido/haptics al presionar los botones.
- Cambios al layout general de `.crt`/`.crt-screen` o al HUD externo de `GamePlayer`.
- Rediseño de cualquier otra pantalla del sitio (biblioteca, salón, home, auth, acerca-de).
- Soporte de gamepad físico (Gamepad API) — la referencia se llama "gamepad" pero es solo un componente visual táctil, no integra control físico.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

No se introduce persistencia nueva. Se extiende la interfaz ya existente de `TouchButtonConfig` con un campo de color:

```ts
// components/games/touch-controls.tsx
export interface TouchButtonConfig {
  code: string; // "Space" | "ArrowUp" | "KeyX" | ...
  label: string; // "DISPARAR" | "ROTAR" | "CAER"
  variant: "cyan" | "magenta"; // nuevo: color del botón de acción
}
```

`components/game-player.tsx` pasa `variant` explícito por juego al armar el array de `TouchButtonConfig` (no se infiere por posición/índice):

- `rocas`: `{ code: "Space", label: "DISPARAR", variant: "magenta" }`.
- `bloque-buster`: `{ code: "ArrowUp", label: "ROTAR", variant: "cyan" }`, `{ code: "Space", label: "CAER", variant: "magenta" }`.
- `arkanoide` y `serpentina`: sin botones de acción, sin cambios.

---

## Plan de implementación

1. Agregar el campo `variant: "cyan" | "magenta"` a `TouchButtonConfig` en `components/games/touch-controls.tsx`, y actualizar la config de botones en `components/game-player.tsx` para setearlo explícito por juego (ver Modelo de datos). Sin CSS nuevo todavía, la UI sigue funcionando igual que hoy.
2. Reemplazar los caracteres `▲◀▶▼` de `dpadButton` por SVG inline (triángulos, misma estructura que `gamepad.html`), manteniendo el `aria-label` igual que hoy.
3. Envolver el layout existente (d-pad a la izquierda, acciones a la derecha) en el marco de consola: agregar el hub decorativo (`div` + gema) centrado en el d-pad vía CSS grid, sin reemplazar ningún botón real ni agregar superficie táctil nueva.
4. CSS nuevo en `app/globals.css`, inspirado 1:1 en `references/gamepad-assets/gamepad.html`: marco (gradiente, borde, `border-radius`, textura de puntos), d-pad con glow al `:active`, hub + animación `pulse-led`, botones de acción con degradado radial + clases `.touch-actions__button--cyan` / `.touch-actions__button--magenta` + anillo de glow. Ajustar tamaños en el breakpoint mobile sin bajar nunca de 44px.
5. Verificación manual en los 4 `/juego/<id>/jugar` con el emulador táctil del navegador: el aspecto visual coincide con `gamepad-neon.png` (marco, hub pulsante, glow al presionar, colores cyan/magenta por botón), y ningún criterio funcional de spec 11 se rompe (las teclas siguen disparando la acción correcta).
6. `npm run build` y `npm run lint`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `TouchButtonConfig` expone `variant: "cyan" | "magenta"` y cada juego con botones de acción lo declara explícitamente (rocas: DISPARAR=magenta; bloque-buster: ROTAR=cyan, CAER=magenta).
- [ ] El d-pad muestra iconos SVG (no caracteres Unicode) que brillan (glow) al presionarse, igual que en `gamepad-neon.png`.
- [ ] Hay un hub central decorativo en medio del d-pad con una gema que pulsa continuamente, sin capturar eventos de puntero (no es un botón).
- [ ] Los controles están envueltos en un marco de consola bordeado (esquinas redondeadas, gradiente, textura de puntos) visualmente equivalente al `.gp` de la referencia.
- [ ] Los botones de acción son circulares, con degradado radial y anillo de glow al presionarse, y muestran su etiqueta de texto completa legible.
- [ ] Ningún botón (d-pad ni acción) mide menos de 44×44px en ningún breakpoint, incluido el más angosto soportado.
- [ ] Todos los criterios de aceptación funcionales de spec 11 (mapeo de teclas, auto-repeat de bloque-buster, `(pointer: coarse)`, sin scroll/zoom al tocar) siguen cumpliéndose sin cambios.
- [ ] En un viewport sin puntero táctil, el comportamiento es idéntico al actual (los controles no se renderizan).

---

## Decisiones

- **Sí:** restyle 100% visual, sin tocar la lógica de spec 11. Separa responsabilidades y evita reabrir un spec ya cerrado y probado.
- **Sí:** marco de consola completo en vez de solo mejorar botones sueltos. Da la sensación real de "gamepad", que es el objetivo explícito del pedido.
- **Sí:** hub central decorativo con pulso. Refuerza la estética retro-arcade sin agregar superficie táctil nueva — no es un botón, cero riesgo funcional.
- **Sí:** iconos SVG en vez de caracteres Unicode. Permiten el efecto de glow con `drop-shadow` que los caracteres de texto no logran bien.
- **Sí:** color explícito por `TouchButtonConfig.variant` en vez de inferido por posición/índice. Evita que `rocas` (1 solo botón) cambie de magenta a cyan por casualidad de orden; cada juego declara su color a propósito.
- **Sí:** mantener el label de texto completo en los botones de acción, sin abreviar a una letra. Prioriza no perder claridad sobre qué hace cada botón.
- **No:** sonido/haptics. No fue pedido, y spec 11 ya lo dejó fuera de alcance explícitamente.
- **No:** piso de 44px negociable. Ya es un criterio de aceptación aceptado en spec 11, no se reabre acá.
- **No:** integrar la Gamepad API (control físico). El nombre "gamepad" de la referencia es solo estético, no implica soporte de hardware.

---

## Riesgos

| Riesgo                                                                                               | Mitigación                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El marco de consola reduce el espacio disponible para el d-pad/botones dentro de la franja existente | Ajustar padding/gaps en el breakpoint mobile sin bajar de 44px, siguiendo el mismo patrón que `references/gamepad-assets/gamepad.html` en su propio `@media (max-width: 620px)` |
| La animación de pulso del hub puede sentirse redundante o distraer durante partidas rápidas (rocas)  | Es sutil (opacity y escala leves) y puramente decorativa — si en la verificación manual distrae, se puede acortar la duración o quitarla sin afectar nada funcional             |

---

## Qué **no** está en este spec

- Cambios de comportamiento/lógica de spec 11 (Pointer Events, `setKeyState`, mapeo de teclas, auto-repeat, detección `(pointer: coarse)`).
- Sonido/haptics al presionar los botones.
- Rediseño del layout general de `.crt`/`.crt-screen` o del HUD externo de `GamePlayer`.
- Cambios de layout en `/biblioteca`, `/salon`, home, auth o acerca-de.
- Gamepad físico (Gamepad API).
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
