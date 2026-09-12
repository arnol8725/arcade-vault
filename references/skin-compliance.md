# TODO — Compliance de skins

> Memoria del agente `skin-designer` (`.claude/agents/skin-designer.md`). Se lee antes de
> tocar nada, para no repetir trabajo ya hecho. Append-only: las entradas no se borran; lo
> único que cambia en una entrada vieja es su `Estado` (y las columnas de skin, cuando se
> completan).

Estados: `Pendiente` · `En progreso` · `Implementado`

Alcance: solo los juegos con motor real. Los slots decorativos (`caida`, `gloton`,
`invasores`, `ranaria`, `duelo-pixel`) no tienen canvas que skinear — quedan cubiertos solos
cuando `/nuevo-juego` los implemente siguiendo el contrato de paleta ya extendido en
`.claude/skills/nuevo-juego/recipe.md`.

## Estado

| Juego           | Clásico | Neon | Retro | Estado    | Notas |
| ---------------- | ------- | ---- | ----- | --------- | ----- |
| `serpentina`      | ✅       | ✅    | ✅     | Implementado | `SERPENTINA_PALETTES` + `setSkin`. Frutas de `fruits.png` teñidas por canvas. Falta verificación visual en navegador. |
| `rocas`           | ✅       | ✅    | ✅     | Implementado | `ASTEROIDS_PALETTES` + `setSkin`. Falta verificación visual en navegador. |
| `bloque-buster`   | —       | —    | —     | Pendiente | Doble canvas (tablero + preview): la paleta debe cubrir ambos. |
| `arkanoide`       | ✅       | ✅    | ✅     | Implementado | `ARKANOIDE_PALETTES` + `setSkin`. Tinte por canvas sobre `spritesheet-breakout.png` (sin arte nuevo). Falta verificación visual en navegador. |

> `Clásico` = la paleta actual de cada motor, formalizada como default — no requiere cambio
> visual, solo que el motor acepte el parámetro de paleta y lo ignore/use-los-valores-de-hoy
> cuando el skin activo es `clasico`.

## Entradas

### 2026-09-11 — Diseño del sistema de skins + `rocas` (Asteroids)

**Estado:** Implementado (pendiente solo la verificación visual manual).

**Alcance de la corrida:** primera ejecución del agente. Se diseñó el sistema completo
(Fase 2), se extendió el contrato de motor (Fase 3) y se aplicó al motor `rocas` (Fase 4).
Los otros tres motores siguen en `Pendiente`.

**Sistema de skins (Fase 2):**

- `lib/games/skins.ts` — nuevo. `SkinId = "clasico" | "neon" | "retro"`, `SKIN_IDS`,
  `DEFAULT_SKIN = "clasico"`, `SKIN_STORAGE_KEY = "av_skin"`,
  `SKIN_DOM_ATTRIBUTE = "data-skin"`, `SKIN_LABELS`, `isSkinId()`. Datos puros: no importa
  React ni toca el DOM, así lo puede consumir cualquier motor.
- `lib/use-skin.ts` — nuevo. `useSkin(): [SkinId, (s) => void]` sobre `useSyncExternalStore`
  (`localStorage` + listener de `storage` para sincronizar pestañas). Se usó ese hook, y no
  `useState` + `useEffect`, porque la regla `react-hooks/set-state-in-effect` del lint de
  React 19 rechaza el `setState` sincrónico dentro del efecto de hidratación. El
  `getServerSnapshot` devuelve `DEFAULT_SKIN`, así no hay mismatch de hidratación.
  Escribe `<html data-skin="...">`.
- `components/skin-picker.tsx` — nuevo. Componente cliente puro (no conoce ningún motor):
  fila de 3 chips bajo el CRT, con `aria-pressed`. Ubicado en `GamePlayer`, después del
  bloque `.crt`.
- `app/globals.css` — se agregaron `:root[data-skin="neon"]` y `:root[data-skin="retro"]`
  encima de `:root` (que queda intacto = `clasico`). Tokens nuevos: `--cyan-rgb`,
  `--magenta-rgb`, `--yellow-rgb`, `--green-rgb` (canales para glows con alpha variable) y
  `--glow-scale` (1 clásico · 1.8 neón · 0.6 retro). Más los estilos `.skin-picker`.
  **No** se agregó `prefers-color-scheme` ni modo claro: los tres skins son fondos oscuros.
- Gap cerrado: `.btn.cyan` y `.btn.green` ahora existen en `globals.css`, y
  `components/game-card.tsx` pasa `game.color` directo (`"btn " + game.color`) en vez de la
  ternaria que solo cubría magenta/yellow.

**Contrato de motor (Fase 3):** addendum "Contrato de paleta (skins)" en
`.claude/skills/nuevo-juego/recipe.md`. Firma extendida
`create<Name>Engine(canvas, callbacks, skin?)` + `setSkin(skin)` en la interfaz del motor.
El contrato viejo (`start`/`stop`/`setPaused`/`reset`, diff-and-report, `onGameOver`
edge-triggered, sin overlay propio) queda igual.

**`rocas` (Fase 4):** `lib/games/asteroids-engine.ts` exporta `AsteroidsPalette`,
`ASTEROIDS_PALETTES` y `resolveAsteroidsPalette()`. Los cinco `draw()` (`Bullet`,
`Asteroid`, `PowerUp`, `Ship`, `Particle`) más `drawHUD`/`drawLifeIcon` y el `fillRect` del
fondo reciben la paleta por parámetro — cero colores literales en el render. El glow se
aplica con `shadowBlur`/`shadowColor` siempre dentro de `save()`/`restore()`.
`components/games/asteroids-canvas.tsx` acepta `skin?: SkinId`: el valor de montaje entra
por `skinRef` al crear el motor, y los cambios posteriores por
`useEffect([skin]) → setSkin()` — el motor nunca se recrea al cambiar de skin.

**Paletas de `rocas` y contraste medido (WCAG, contra el `bg` de cada skin):**

| Skin | bg | nave | asteroide | bala | power-up | HUD | glow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clásico | `#000000` | `#fff` 21:1 | `#fff` 21:1 | `#fff` 21:1 | `#0ff` 16.8:1 | `#fff` 21:1 | 0 |
| neón | `#04060e` | `#3dfcff` 16.0:1 | `#9fe8ff` 14.9:1 | `#ff4da6` 6.6:1 | `#faff5c` 18.8:1 | `#eaf6ff` 18.4:1 | 10px |
| retro | `#0b0805` | `#ffb000` 10.9:1 | `#d99321` 7.8:1 | `#ffe9b5` 16.7:1 | `#fff0c2` 17.6:1 | `#ffd9a3` 14.9:1 | 3px |

Mínimo global: 6.37:1 (partícula retro). Todo supera 4.5:1 (texto) y 3:1 (acentos).
Tokens CSS contra su propio `--bg`: neón `--ink` 18.8:1 / `--ink-faint` 3.8:1;
retro `--ink` 14.9:1 / `--ink-faint` 3.2:1 (el `--ink-faint` clásico queda en 2.49:1, valor
preexistente que no se tocó por la regla de "clásico = paleta de hoy tal cual").

**Verificación:** `npm run build` ✅ · `npm run lint` ✅ · `npx prettier --write` sobre los
archivos tocados.

**Pendientes que deja esta corrida:**

1. **Verificación visual manual** de los 3 skins en `/juego/rocas/jugar` — Playwright no
   está instalado en el repo ni disponible como herramienta en esta corrida, así que el
   chequeo ocular quedó sin hacer.
2. **Glows literales del chrome del sitio**: `app/globals.css` tiene ~121 `rgba(0,245,255,…)`
   / `rgba(255,0,110,…)` / `rgba(245,255,0,…)` hardcodeados fuera de los tokens. Con
   `data-skin="retro"` los bordes/colores cambian a ámbar pero esos halos siguen tirando a
   cian. No afecta la legibilidad del canvas (el motor no usa CSS); es pulido de chrome.
   Migrarlos a `rgb(var(--cyan-rgb) / …)` de a poco en corridas futuras.
3. CSS muerto `.gp-themer` / `.gp-vapor` / `.gp-cabinet` (líneas ~3200+) sigue ahí: se usó
   como referencia visual para `.skin-picker` pero no se borró (fuera de alcance).
4. Motores restantes: `serpentina` → `bloque-buster` → `arkanoide`.

### 2026-09-11 — `serpentina` (Snake)

**Estado:** Implementado (pendiente solo la verificación visual manual).

**Alcance de la corrida:** solo `serpentina`. El sistema de skins (Fase 2) y el addendum del
contrato en `recipe.md` (Fase 3) ya existían de la corrida anterior: se reutilizaron tal cual,
sin tocar `lib/games/skins.ts`, `lib/use-skin.ts`, `components/skin-picker.tsx` ni
`app/globals.css`. No se tocó el motor ni el canvas de `arkanoide` (lo trabaja otro agente en
paralelo).

**`serpentina` (Fase 4):** `lib/games/serpentina-engine.ts` exporta `SerpentinaPalette`,
`SerpentinaFruitStyle`, `SERPENTINA_PALETTES` y `resolveSerpentinaPalette()`. La firma pasó a
`createSerpentinaEngine(canvas, callbacks, skin = DEFAULT_SKIN)` y la interfaz suma
`setSkin(skin)`. Cero colores literales en el render: el `fillRect` del fondo, `drawGrid`,
`drawSnake`, `drawFruit` y `drawParticles` leen todo de la paleta. El glow va por
`shadowBlur`/`shadowColor` siempre dentro de `save()`/`restore()`.
`components/games/serpentina-canvas.tsx` acepta `skin?: SkinId` (patrón `skinRef` al montar +
`useEffect([skin]) → setSkin()`, el motor no se recrea), y `components/game-player.tsx` le pasa
`skin={skin}` — único cambio en el wiring.

**Caso spritesheet (`fruits.png`):** las 22 frutas tienen el color horneado. Se resolvió con
composite en canvas, sin arte nuevo: tile offscreen por `(skin, fruta)` cacheado en un `Map`
(máx. 3 × 22 por instancia), construido con `globalCompositeOperation = "color"` (conserva la
luminancia del pixel-art y le impone el tono del skin) + un pase `source-atop` de realce con
alpha, y `destination-in` final para restaurar el alpha original del sprite. El tile se crea
con `canvas.ownerDocument.createElement` — nada de `document` global ni de `getComputedStyle`.

**Paletas de `serpentina` y contraste medido (WCAG, contra el `bg` de cada skin):**

| Skin | bg | cabeza | cuerpo | partículas | grilla | fruta (peor caso) | glow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clásico | `#000` | `#39ff6a` 15.7:1 | `#1fae46` 7.2:1 | `#39ff6a` 15.7:1 | `rgba(255,255,255,.04)` | arte original, 1.3:1 | 0 |
| neón | `#04060e` | `#5effc1` 16.0:1 | `#12c98e` 9.4:1 | `#5effc1` 16.0:1 | `rgba(125,249,255,.07)` | realce `#9ffcff` .35 → 3.4:1 | 12px |
| retro | `#0b0805` | `#ffc23d` 12.4:1 | `#b4741a` 5.2:1 | `#ffb000` 10.9:1 | `rgba(255,176,0,.06)` | tinte `#ffb000` + realce `#ffd98a` .45 → 4.3:1 | 4px |

Serpiente: mínimo 5.19:1 (cuerpo retro), todo ≥4.5:1. Frutas (objeto gráfico grande, umbral
3:1): el peor caso del atlas son la berenjena y la uva oscuras; el alpha de realce se eligió
como el mínimo que las cruza — 0.35 en neón (3.4:1) y 0.45 en retro (4.3:1, con la fruta
amarilla todavía en 14.2:1, así que el realce no aplana el atlas). En clásico ese peor caso
queda en 1.3:1: es el valor que el juego ya tenía y la regla "clásico = paleta de hoy tal cual"
manda no tocarlo — quien necesite legibilidad máxima de frutas tiene neón o retro.

**Verificación:** `npm run build` ✅ · `npm run lint` ✅ · `npx prettier --write` sobre los tres
archivos tocados.

**Pendientes que deja esta corrida:**

1. **Verificación visual manual** de los 3 skins en `/juego/serpentina/jugar` — Playwright
   sigue sin estar instalado en el repo ni disponible como herramienta. Mirar sobre todo el
   tinte de las frutas en retro (que se sigan distinguiendo entre sí) y el glow de 12px de la
   serpiente en neón a 20px de celda.
2. Los pendientes 2 y 3 de la entrada anterior (glows literales del chrome en `globals.css`,
   CSS muerto `.gp-themer`/`.gp-vapor`/`.gp-cabinet`) siguen abiertos — fuera de alcance acá.
3. Motores restantes: `bloque-buster` y `arkanoide` (este último en curso por otro agente).

### 2026-09-11 — `arkanoide` (Arkanoid): tinte por canvas del spritesheet

**Estado:** Implementado (pendiente solo la verificación visual manual en navegador).

**Alcance de la corrida:** solo Arkanoide. El sistema de skins (Fase 2) y el addendum del
contrato de paleta (Fase 3) ya existían de la corrida del 2026-09-11 de `rocas`; acá se
reusaron tal cual, sin modificarlos. No se tocó `serpentina` (trabajo en paralelo de otro
agente) ni `bloque-buster`.

**Por qué es el caso especial:** Arkanoide no dibuja con `fillStyle` — todo sale de
`public/games/arkanoide/spritesheet-breakout.png`, con los colores horneados en el PNG. El
skin se resuelve recomponiendo esa misma hoja en un canvas fuera de pantalla
(`buildTintedSheet`), **una sola vez por cambio de skin** (nunca por frame). No se generó ni
se pidió arte nuevo.

- El canvas offscreen se crea con `canvas.ownerDocument.createElement("canvas")` — el motor
  sigue sin tocar el `document` global.
- Los modos de blending pintan también sobre los píxeles transparentes de la hoja, así que el
  último paso siempre es `destination-in` con la imagen original para restaurar el alpha.
- Guarda de compatibilidad: se asigna `globalCompositeOperation` y se compara el valor leído;
  si el navegador no conoce el modo, la asignación es un no-op y el paso se saltea — sin esa
  guarda el `fillRect` se aplicaría en `source-over` y taparía la hoja con un rectángulo sólido.

**Paletas de `arkanoide` (`ARKANOIDE_PALETTES` en `lib/games/arkanoide-engine.ts`):**

| Skin | bg | HUD | glow | tinte de la hoja |
| --- | --- | --- | --- | --- |
| clásico | `#000` | `#fff` | 0 | ninguno (hoja original, byte por byte) |
| neón | `#04060e` | `#eaf6ff` | 9px `#3dfcff` | `saturation` `#ff0000` α1 → `screen` `#3dfcff` α0.24 |
| retro | `#0b0805` | `#ffd9a3` | 3px `#ffb000` | `color` `#ffb000` α1 → `screen` `#ff9600` α0.34 |

- `saturation` toma la saturación del source (máxima) y conserva hue + luminosidad del sprite:
  los bloques quedan vivísimos pero siguen siendo distinguibles entre sí, que es lo que la
  jugabilidad necesita.
- `color` ámbar toma hue + saturación del source y conserva la luminosidad del sprite: fósforo
  monocromático con el sombreado original intacto. La variedad entre bloques sobrevive como
  variedad de brillo (Lum 0.26 el gris → 0.60 el amarillo), como en un gabinete monocromo real.
- El glow va solo en pala, bola, iconos de vida, HUD y explosiones. Los bloques van sin glow a
  propósito: están pegados entre sí, el halo quedaría tapado y solo costaría frames.

**Contraste medido (WCAG, contra el `bg` de cada skin):** se decodificó el PNG y se muestrearon
los colores reales de cada sprite (dominante por superficie y promedio); después se simularon
los pasos de composición con las fórmulas de CSS Compositing & Blending L1.

| Skin | HUD | pala / bola | mejor bloque | peor bloque |
| --- | --- | --- | --- | --- |
| clásico | 21.0:1 | 10.9:1 | 11.3:1 (amarillo) | 2.06:1 (gris, promedio) |
| neón | 18.4:1 | 12.1:1 | 14.2:1 (cyan) | 4.16:1 (gris, promedio) |
| retro | 14.9:1 | 12.7:1 | 12.5:1 (amarillo) | 3.96:1 (gris, promedio) |

Neón y retro cumplen todo: ≥4.5:1 en texto y ≥3:1 en acentos. **Hallazgo:** el bloque gris en
`clasico` queda en 2.06:1 de promedio (3.57:1 en su color dominante) — es un valor preexistente
del spritesheet original y **no se tocó**, por la regla "clásico = la paleta de hoy tal cual".
Los dos skins nuevos lo corrigen de hecho (4.16:1 y 3.96:1). Si alguna vez se quiere arreglar
también en clásico, sería un cambio de arte, no de paleta.

**Archivos tocados:**

- `lib/games/arkanoide-engine.ts` — `SheetTintStep`, `ArkanoidePalette`, `ARKANOIDE_PALETTES`,
  `resolveArkanoidePalette()`, `buildTintedSheet()`, firma
  `createArkanoideEngine(canvas, callbacks, skin?)` y `setSkin()` en la interfaz. `draw()` ya no
  tiene colores literales (fondo y HUD salen de la paleta) y el asset-gate pasó de `!image` a
  `!sheet`.
- `components/games/arkanoide-canvas.tsx` — prop `skin?: SkinId` con `skinRef` en el montaje +
  `useEffect([skin]) → setSkin()`. El motor no se recrea al cambiar de skin.
- `components/game-player.tsx` — una línea: `skin={skin}` en `<ArkanoideCanvas>`.

El contrato genérico quedó intacto: `start`/`stop`/`setPaused`/`reset`, diff-and-report,
`onGameOver` edge-triggered y sin overlay propio de fin de partida.

**Verificación:** `npx tsc --noEmit` ✅ · `npm run build` ✅ · `npm run lint` ✅ ·
`npx prettier --write` sobre los archivos tocados. Además se renderizó offline un PNG de
control con los tres skins (decodificando el spritesheet y replicando los pasos de composición)
para mirar el resultado: clásico idéntico al de hoy, neón saturado y frío, retro ámbar
monocromático legible. Ese preview vive en el scratchpad de la sesión, no en el repo.

**Pendientes que deja esta corrida:**

1. **Verificación visual manual** de los tres skins en `/juego/arkanoide/jugar` — Playwright
   sigue sin estar instalado. Mirar sobre todo el glow de 9px en neón sobre la bola a 16px y
   que el bloque gris de los niveles 2 y 5 se siga leyendo en retro.
2. Sin novedad sobre los pendientes de chrome de las entradas anteriores (glows literales en
   `globals.css`, CSS muerto `.gp-themer`/`.gp-vapor`/`.gp-cabinet`).
3. Motor restante: `bloque-buster` (doble canvas, tablero + preview).
