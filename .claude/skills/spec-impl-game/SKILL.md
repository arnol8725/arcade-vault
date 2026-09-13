---
name: spec-impl-game
description: Implementa un spec aprobado que agrega un juego nuevo (misma mecánica que /spec-impl) y, al terminar la implementación, encadena automáticamente skin-designer y luego mobile-porter sobre el juego recién implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Task, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementer de specs de juegos nuevos, con cadena de post-procesado

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

Este comando es una variante de `/spec-impl` para specs que agregan un **juego nuevo** a Arcade Vault. No dupliques las fases 1-4 aquí: léelas y ejecutalas tal como están definidas en `.agents/skills/spec-impl/SKILL.md`.

### Fases 1-4 — delegadas a /spec-impl

1. Lee ahora `.agents/skills/spec-impl/SKILL.md` completo.
2. Ejecuta sus cuatro fases exactamente como están descritas ahí, usando `$ARGUMENTS` como el spec objetivo:
   - Fase 1 — Identificar el spec.
   - Fase 2 — Validar que el estado significa "Approved" (o equivalente en cualquier idioma). Si no, detenete con el mensaje de error estándar de `/spec-impl` — no continúes a la Fase 5.
   - Fase 3 — Crear/cambiar de branch (`spec-NN-slug`), respetando `AutoCreateBranch`.
   - Fase 4 — Implementar paso a paso, con pausas para revisar el diff en cada paso, sin commitear nunca automáticamente.
3. No avances a la Fase 5 de este documento hasta que la Fase 4 llegue a su mensaje de cierre ("✅ All steps of the plan are implemented...").

---

### Fase 5 — Cadena post-implementación (skin-designer → mobile-porter), secuencial

**Regla no negociable: nunca dispares los dos `Task` en el mismo turno/mensaje. Primero `skin-designer`, esperá su resultado completo, recién después `mobile-porter`. Jamás en paralelo.**

1. **Determinar el `game.id` (slug) del juego recién implementado.** Debe coincidir con el `id` usado en:
   - `lib/games/<slug>-engine.ts`
   - `components/games/<slug>-canvas.tsx`
   - la nueva rama `isX` agregada en `components/game-player.tsx`

   Confirmá el slug leyendo el spec y/o los archivos que acabás de crear en la Fase 4. Si hay ambigüedad (más de un juego tocado, o el slug no es obvio), preguntá al usuario cuál es el `game.id` exacto — no lo adivines ni asumas.

2. **Invocar `skin-designer`** vía `Task` (`subagent_type: skin-designer`), pasando en el prompt: el `game.id` exacto, y la instrucción de aplicar los 3 skins canónicos (`classic`, `retro`, `neon`) a ese juego siguiendo sus propias reglas.

   Esperá el resultado completo de este `Task` antes de hacer cualquier otra cosa.

3. **Recién con el resultado de skin-designer en mano**, invocar `mobile-porter` vía `Task` (`subagent_type: mobile-porter`), pasando el mismo `game.id`, para cablear los controles táctiles de ese juego.

   Esperá su resultado completo.

4. **Resumen final al usuario** (4-8 líneas):
   - Juego implementado (`game.id` + título).
   - Qué hizo skin-designer (skins aplicados, archivos tocados).
   - Qué hizo mobile-porter (touch config cableado, archivo tocado).
   - Recordatorio: verificar los criterios de aceptación del spec uno por uno; si todos pasan, actualizar el estado del spec a "Implemented" (o equivalente) y hacer el commit final antes de mergear la branch. El commit sigue siendo decisión y comando explícito del usuario — nunca automático.

**Si la Fase 4 no llegó a completarse** (el usuario se detuvo, quedó una ambigüedad sin resolver, o el spec fue rechazado en Fase 2): no dispares la Fase 5 bajo ninguna circunstancia.
