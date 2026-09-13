# Auditorías de performance por juego — Estado

> Mantenido por el agente `game-performance-booster`. Un juego por corrida. No editar manualmente sin avisar al agente.

## Estado por juego

| Juego (game.id) | Última auditoría | Hallazgo(s)                                                                                                        | Spec generado                                    | Estado del spec                        |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| rocas             | —                  | —                                                                                                                     | —                                                   | —                                          |
| bloque-buster     | 2026-09-13         | `drawGrid()` (`lib/games/tetris-engine.ts:361-376`) redibuja 28 líneas estáticas con 28 `beginPath`/`stroke` separados en cada frame, siempre (incluso en pausa); mismo patrón sin resolver en `serpentina-engine.ts:351-366` (fuera de alcance de este spec) | specs/14-tetris-bloque-buster-grid-cache.md        | Draft                                      |
| arkanoide         | —                  | —                                                                                                                     | —                                                   | —                                          |
| serpentina        | —                  | —                                                                                                                     | —                                                   | —                                          |
| frogger           | 2026-09-13         | shadowBlur por-entidad-por-frame en `withGlow()` (skin neón)                                                         | specs/13-frogger-glow-performance.md               | Approved (implementado en esta sesión)     |

Leyenda del estado del spec: `Draft` (pendiente de revisión humana) · `Approved` · `Implemented` · `—` (sin hallazgos)
