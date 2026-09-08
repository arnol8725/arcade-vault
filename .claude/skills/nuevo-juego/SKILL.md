---
name: nuevo-juego
description: Porta un juego real (con motor propio en canvas) a un slot del catálogo de Arcade Vault, o da de alta un juego nuevo, reutilizando el patrón ya probado en SPEC 05 (rocas/Asteroids). Redacta un spec acotado en specs/NN-*.md, pide confirmación, y luego implementa engine.ts + canvas.tsx + wiring en GamePlayer + alta en Supabase si aplica. El leaderboard (SPEC 07) y el catálogo (SPEC 06) ya son genéricos — no requieren cambios por juego. Usar cuando se pida portar o crear un juego jugable de verdad (no decorativo).
disable-model-invocation: true
argument-hint: <game-id> [referencia:NN-carpeta | "desde cero"]
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(npm run build:*), Bash(npm run lint:*), mcp__supabase__list_tables, mcp__supabase__execute_sql, mcp__supabase__apply_migration, mcp__supabase__get_advisors
---

# /nuevo-juego — Motor real + integración de catálogo/leaderboard

## Session context

Specs existentes (para calcular el próximo NN):
!`ls specs/ 2>/dev/null || echo "specs/ no existe"`

Orígenes disponibles en references/started-games/:
!`ls references/started-games/ 2>/dev/null || echo "sin referencias disponibles"`

Fecha de hoy (usar para el header del spec, nunca adivinarla):
!`date +%F`

## Qué hace y qué no

- **Sí**: porta o diseña el motor real (canvas + lógica) de UN juego, lo integra en `GamePlayer` para que sea jugable de verdad, y si el juego es nuevo, lo da de alta en el catálogo (`games` en Supabase).
- **No**: toca `lib/scores.ts`, `lib/scores-server.ts` ni `app/salon/*` — el leaderboard ya es genérico por `game.id` (SPEC 07); en cuanto la fila exista en `games`, funciona solo.
- **No**: rediseña el HUD de `GamePlayer` ni el layout de `.crt-screen`.
- **No**: re-porta `rocas` (ya tiene motor real) salvo que el usuario lo pida explícitamente.

## Fase 1 — Alcance (preguntar, no asumir)

Usar `AskUserQuestion` para resolver, antes de tocar cualquier archivo:

1. **`game-id`**: ¿uno de los slots decorativos existentes que aún no tienen motor real (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`), o un juego 100% nuevo que no está en el catálogo?
2. **Origen**: ¿una carpeta de `references/started-games/` (de las listadas en Session context), o "desde cero"? Si es desde cero, pedir una descripción breve de mecánica, controles y condición de victoria/derrota — no inventarla.
3. **Si es alta nueva de catálogo**: pedir `title`, `short`, `long`, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `cover` (nombre de clase css, ej. `cover-bricks`), `color` (`cyan`/`magenta`/`green`/`yellow`), valores iniciales de `best`/`plays` (decorativos, puede ser `0`/`"0"`).
4. **Concepto de vidas**: ¿el juego tiene "vidas" reales, o es una corrida continua (solo score + nivel/líneas)? Esto decide qué callbacks del motor importan y si se toca `onLivesChange` en el wiring.

No avanzar a la Fase 2 con suposiciones no confirmadas por el usuario.

## Fase 2 — Leer el patrón de referencia (obligatorio antes de escribir nada)

Leer completos:

- **`.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`** — la fuente de verdad del formato de spec de este proyecto. Son de lectura obligatoria antes de redactar nada en la Fase 3: el spec de este skill debe respetar exactamente esa estructura de secciones y ese estilo, no una aproximación de memoria.
- `specs/05-asteroids-rocas.md` — el spec que originó el patrón, como ejemplo ya aplicado de ese mismo template a un puerto de motor.
- `lib/games/asteroids-engine.ts` y `components/games/asteroids-canvas.tsx` — la implementación de referencia a imitar en **forma**, no en contenido.
- `components/game-player.tsx` — el punto de wiring (`isAsteroids = game.id === "rocas"`).
- El contenido completo de la carpeta de referencia elegida en Fase 1, si hay (`game.js`, `index.html`, `levels.js`, `assets/*`, etc.).
- `recipe.md` (archivo hermano de este skill) — contrato genérico de motor/canvas y diferencias ya relevadas entre `02-asteroids`, `03-tetris` y `04-arkanoid`.

## Fase 3 — Redactar spec acotado

Habiendo leído `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en la Fase 2, crear `specs/NN-<slug>.md` (NN = siguiente número libre según Session context) siguiendo **al pie de la letra** la estructura de secciones de `template.md` (no una versión resumida ni reordenada), pero ya resuelta para este caso concreto:

- **Alcance** (in/out), acotado a este único juego.
- **Modelo de datos**: interfaces `<Name>EngineCallbacks`/`<Name>Engine` (solo los callbacks que apliquen según la Fase 1), y la fila de `games` si es alta nueva.
- **Plan de implementación**: los pasos concretos de la Fase 4 de abajo, adaptados al juego.
- **Criterios de aceptación**, **Decisiones**, **Riesgos**, y "Qué **no** está en este spec".
- Status inicial: `Draft`.

Mostrar el spec completo al usuario y **detenerse**. No continuar a la Fase 4 sin confirmación explícita del usuario (equivalente a que el spec pase a "Approved").

## Fase 4 — Implementación (solo tras confirmación explícita)

1. Si es alta nueva de catálogo: `mcp__supabase__execute_sql` para ver el `sort_order` máximo actual en `games`, luego `mcp__supabase__apply_migration` con el `insert` de la nueva fila; correr `mcp__supabase__get_advisors` después para confirmar que `anon` sigue sin policies de escritura.
2. Crear `lib/games/<slug>-engine.ts`: factory `create<Name>Engine(canvas: HTMLCanvasElement, callbacks: <Name>EngineCallbacks): <Name>Engine` devolviendo `{ start, stop, setPaused, reset }`. Reglas no negociables (ver `recipe.md`): sin imports de React ni acceso a `document`/`window` fuera de `start`/`stop`, salvo los tipos de canvas recibidos por parámetro; cada callback se dispara solo cuando el valor realmente cambia (patrón diff-and-report); `onGameOver` se dispara una única vez (edge-triggered) y el motor no dibuja su propio overlay de "GAME OVER" ni reinicia por tecla; listeners de teclado/mouse se agregan en `start()` y se remueven en `stop()`; `preventDefault()` en las teclas de control; si el juego trae audio o sprites, gate de precarga antes del primer frame.
3. Crear `components/games/<slug>-canvas.tsx`: mismo patrón que `AsteroidsCanvas` — `callbacksRef` para no recrear el motor en cada render, un efecto de montaje (`[]`) que crea y arranca el motor y lo detiene en el cleanup, un efecto separado en `[paused]` que llama `setPaused`, canvas a resolución nativa escalado por CSS (`width: "100%", height: "100%"`). Si el juego usa doble canvas (como Tetris con su preview de siguiente pieza), un segundo `ref`/prop.
4. Wire en `components/game-player.tsx`: extender el punto donde hoy vive `isAsteroids = game.id === "rocas"` para incluir el nuevo `game.id`, renderizando el nuevo canvas dentro de `.crt-screen` con `key={resetKey}`. Si el juego no tiene "vidas" (Fase 1), no tocar ese callback — el HUD de vidas queda en su valor fijo actual, igual que en los juegos decorativos restantes.
5. No tocar `lib/scores.ts`, `lib/scores-server.ts` ni `app/salon/*` — solo confirmar (leyendo, sin editar) que siguen funcionando en cuanto exista la fila en `games`.
6. Correr `npm run build` y `npm run lint`.

## Fase 5 — Verificación manual (adaptar al juego concreto)

Checklist basado en el paso 8 de SPEC 05:

- El HUD (score, y vidas/nivel si aplican) refleja el estado real del motor, no una simulación.
- Los controles del juego responden sin scrollear la página anfitriona.
- La condición de derrota/victoria abre el modal externo de fin de partida de `GamePlayer` con el puntaje real — el canvas no muestra su propio overlay.
- "GUARDAR PUNTUACIÓN" persiste en `localStorage["av_scores"]` y (si hay sesión) en Supabase vía `saveScoreToLeaderboard`, igual que en `rocas`.
- "JUGAR DE NUEVO" reinicia el motor por completo (remount vía `resetKey`).
- "PAUSA"/"REANUDAR" congelan y continúan sin saltos de física.
- "SALIR" o navegar fuera de `/juego/<slug>/jugar` no deja listeners de teclado/mouse colgados.
- Ningún otro `game.id` cambia de comportamiento.
- Si es alta nueva: `/biblioteca` y `/` (home) muestran el juego nuevo, y `/salon` lo lista con su propia pestaña.

## Reglas duras

- Nunca dejar el motor con overlay propio de "GAME OVER" o restart por tecla — el modal externo de `GamePlayer` es el único punto de fin de partida.
- Nunca dejar listeners de teclado/mouse colgados al desmontar el componente.
- Nunca modificar el comportamiento de otro `game.id` existente.
- Nunca saltarse la pausa de confirmación de la Fase 3 antes de tocar código o Supabase.
- Nunca insertar una fila en `games` sin revisar antes el `sort_order` actual.
