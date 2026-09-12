---
name: game-jam
description: Recibe un tema libre del usuario y genera 3 conceptos de juego distintos que encajen con ese tema, cada uno como un spec completo en specs/game-jam/<game-id>/spec.md, listo para revisión. No escribe código ni implementa — el handoff es elegir un concepto y correr /nuevo-juego <game-id>. Solo se ejecuta cuando el usuario lo invoca explícitamente por nombre; nunca de forma proactiva.
disable-model-invocation: true
tools: Read, Glob, Grep, Write, Bash, mcp__supabase__execute_sql, mcp__supabase__list_tables
model: opus
---

# game-jam — Tres conceptos de juego a partir de un tema

Recibe un tema libre y propone 3 juegos distintos que encajen con él, cada uno redactado
como un spec completo en `specs/game-jam/<game-id>/spec.md`. Es un brainstorm de "game jam":
no implementa nada, no toca la memoria de `game-planner`, y no numera como `specs/NN-*.md`
de la raíz — vive en su propio namespace para que el usuario elija cuál llevar a `/nuevo-juego`.

## Session context

Ids ya usados en el catálogo real (nunca reusar ninguno de estos como `game-id` nuevo):
!`cat references/implemented-games.md 2>/dev/null | grep -oE '`[a-z-]+`' | sort -u || echo "implemented-games.md no encontrado"`

Carpetas ya existentes en `specs/game-jam/` (de corridas anteriores; tampoco reusar estos slugs):
!`ls specs/game-jam/ 2>/dev/null || echo "specs/game-jam/ vacío o inexistente"`

Specs existentes en la raíz (solo como referencia de estilo/formato, no de numeración):
!`ls specs/*.md 2>/dev/null || echo "specs/ no existe"`

Fecha de hoy (usarla en el header de cada spec; nunca adivinarla):
!`date +%F`

## Qué hace y qué no

- **Sí**: recibe un tema en lenguaje natural, propone 3 conceptos de juego jugables en canvas
  2D single-player que encajan con ese tema y con el contrato de motor del proyecto.
- **Sí**: redacta un spec completo por concepto en `specs/game-jam/<game-id>/spec.md`, mismo
  formato que `specs/08-tetris-bloque-buster.md` / `specs/09-arkanoide.md` / `specs/10-serpentina-snake.md`.
- **Sí**: verifica que cada `game-id` propuesto sea nuevo (no choca con el catálogo real ni
  con carpetas previas de `specs/game-jam/`) antes de escribir nada.
- **Sí**: puede preguntarle al usuario si el tema es ambiguo o demasiado amplio para acotar 3
  conceptos concretos — a diferencia de `game-planner`, esta corre con el usuario presente.
- **No**: no escribe código (`lib/games/*`, `components/**`), no implementa nada — el handoff
  es que el usuario elija un `game-id` y corra `/nuevo-juego <game-id>`.
- **No**: no toca `references/game-suggestions-todo.md` (esa es la memoria de `game-planner`,
  para otro propósito: llenar los slots decorativos existentes, no brainstorm libre por tema).
- **No**: no toca `specs/.spec-config.yml` ni numera sus archivos como `specs/NN-*.md`.
- **No**: no escribe en Supabase — solo lectura (`execute_sql`/`list_tables`) para chequear
  colisión de ids contra el catálogo real.

## Fase 1 — Interpretar el tema

Tomar el tema tal cual lo da el usuario. Si es vago al punto de no poder derivar 3 mecánicas
concretas (ej. "algo divertido"), pedir una aclaración corta de una vuelta antes de seguir.
Si el tema alcanza para imaginar mecánicas distintas, avanzar sin más preguntas.

## Fase 2 — Brainstorm de 3 conceptos

Generar 3 ideas de juego **claramente diferenciadas entre sí** (mecánica central distinta,
no una variante de la misma idea) que:

- Encajen temáticamente con lo que pidió el usuario.
- Sean viables dentro del motor canvas 2D del proyecto: loop `update(dt)`/`draw()` con un
  único `requestAnimationFrame`, sin WebGL ni física 3D ni dependencias externas — mismo
  techo que ya usan `rocas`, `bloque-buster`, `arkanoide` y `serpentina`.
- Tengan una noción de puntaje entero monotónico (apto para `scores`) y una condición de
  derrota clara que dispare `onGameOver` una sola vez.
- Se jueguen en sesiones cortas (1 a 5 minutos).

Para cada concepto, definir antes de escribir el spec: nombre, `game-id` propuesto (kebab-case),
mecánica central en 1-2 líneas, controles, y por qué encaja con el tema.

Variar la forma en que encajan: por ejemplo que no los tres terminen siendo "esquivar
proyectiles" — usar el criterio de diversidad de mecánica/`cat` (ARCADE/PUZZLE/SHOOTER/VERSUS)
que ya usa `game-planner` en su rúbrica, sin necesidad de repetir esa rúbrica completa acá.

## Fase 3 — Verificar colisión de game-id

Antes de escribir cualquier archivo, confirmar que ninguno de los 3 `game-id` propuestos:

1. Ya existe en el catálogo real — confirmar con `mcp__supabase__execute_sql`
   (`select id from games`) además de lo leído en Session context, por si
   `implemented-games.md` quedó desactualizado.
2. Ya existe como carpeta en `specs/game-jam/` (de una corrida anterior de este mismo agente).

Si un slug choca, ajustarlo (agregar variación, ej. `-ii`, sinónimo, etc.) antes de la Fase 4.

## Fase 4 — Redactar el spec completo por concepto

Mismo template exacto que `specs/08-tetris-bloque-buster.md` / `specs/09-arkanoide.md` /
`specs/10-serpentina-snake.md`, en español, respetando el contrato de motor/componente de
`.claude/skills/nuevo-juego/recipe.md`. Secciones, en este orden, separadas por `---`:

1. **Header**: `# <Título> — game-jam` (sin número de SPEC), luego blockquote:
   `> **Status:** Draft` · `> **Depends on:** —` · `> **Date:** <hoy>` ·
   `> **Objective:** <una oración con el alta de catálogo + el motor a construir>`.
2. **`## Alcance`** — `**In:**` (alta de fila en `games`, motor en `lib/games/<game-id>-engine.ts`,
   componente `components/games/<game-id>-canvas.tsx`, wiring en `game-player.tsx`, `npm run build`/`lint`)
   y `**Out of scope (para specs futuros):**`.
3. **`## Modelo de datos`** — el `insert into games (...)` propuesto (con el `sort_order`
   siguiente libre, confirmado en Fase 3) y las interfaces TypeScript del motor:
   `<Name>EngineCallbacks` (`onScoreChange` obligatorio; `onLivesChange`/`onLevelChange` solo
   si el concepto los usa; `onGameOver` edge-triggered una sola vez), `<Name>Engine`
   (`start`/`stop`/`setPaused`/`reset`), y la firma `create<Name>Engine(canvas, callbacks)`.
   Incluir también las entidades/constantes internas relevantes (grilla, entidades, estado).
4. **`## Plan de implementación`** — pasos numerados y committeables, terminando en
   `npm run build` + `npm run lint` + un paso de verificación manual end-to-end.
5. **`## Criterios de aceptación`** — checklist `- [ ]` verificable, sin ítems subjetivos.
6. **`## Decisiones`** — `**Sí:**`/`**No:**` con la justificación de cada elección de diseño.
7. **`## Riesgos`** — tabla `| Riesgo | Mitigación |`.
8. **`## Qué **no** está en este spec`** — recapitula las exclusiones, cerrando siempre con
   la frase: *"Cada uno de estos, si se implementa, va en su propio spec."*

## Fase 5 — Guardar

Escribir cada spec en `specs/game-jam/<game-id>/spec.md` (la carpeta se crea implícitamente
al escribir el archivo). Se apunta a los 3 conceptos completos; el piso aceptable es
**al menos 2 completos con el template entero** — si el tercero no termina de cuajar
(mecánica floja, no encaja con el tema, se solapa demasiado con los otros dos), igual se
guarda pero marcándolo explícitamente como más débil/breve en el reporte de Fase 6, nunca
se omite en silencio.

## Fase 6 — Reportar

Devolver en el reporte final, para cada uno de los 3 conceptos: `game-id`, ruta del spec
(`specs/game-jam/<game-id>/spec.md`), y un resumen de una línea de la mecánica. Cerrar con
el siguiente paso: *"Elegí uno y corré `/nuevo-juego <game-id>`."*

## Reglas duras

- Nunca escribir fuera de `specs/game-jam/<game-id>/spec.md` — no tocar
  `references/game-suggestions-todo.md`, no tocar `specs/.spec-config.yml`, no tocar código
  de `lib/games/` ni `components/**`.
- Nunca escribir en Supabase (`insert`/`update`/`delete`/migraciones). Solo `select` de lectura.
- Nunca inventar la fecha — usar la de Session context.
- Nunca marcar `Status` distinto de `Draft` — la aprobación es manual, del usuario.
- Nunca reusar un `game-id` ya existente en el catálogo real o en `specs/game-jam/`.
- Siempre respetar el contrato de motor/componente de `recipe.md` en el `## Modelo de datos`
  de cada spec (framework-agnóstico, `start`/`stop`/`setPaused`/`reset`, `onGameOver`
  edge-triggered una sola vez, sin overlay propio de fin de partida).
