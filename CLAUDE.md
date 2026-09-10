# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar en este repositorio.

@AGENTS.md

## Proyecto

Arcade Vault — plataforma para jugar online y competir por el mayor puntaje, con estética retro-arcade CRT.

Stack: Next.js 16.3.3 (App Router), React 19.2.8, TypeScript strict, Tailwind CSS 4, Supabase (auth + base de datos) y Resend (email transaccional).

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm start` — ejecutar el build de producción
- `npm run lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript)

No hay test runner configurado. La verificación de un spec es `npm run build` + `npm run lint` + el checklist manual del propio spec.

## Rutas (App Router)

| Ruta                 | Archivo                          |
| -------------------- | -------------------------------- |
| `/` (home)           | `app/page.tsx`                   |
| `/acerca-de`         | `app/acerca-de/page.tsx`         |
| `/auth`              | `app/auth/page.tsx`              |
| `/biblioteca`        | `app/biblioteca/page.tsx`        |
| `/juego/[id]`        | `app/juego/[id]/page.tsx`        |
| `/juego/[id]/jugar`  | `app/juego/[id]/jugar/page.tsx`  |
| `/salon`             | `app/salon/page.tsx`             |

y mas (ver reference/implemented-games.md) cuando tu necesites revisar cual juego esta implementado y como implementar uno nuevo.

`biblioteca` y `salon` tienen sus propios `loading.tsx` y `error.tsx`, además de los de la raíz.

Casi todo el estilo es CSS escrito a mano en `app/globals.css` (~3.700 líneas: el sistema de diseño pixel/neón completo). No hay `tailwind.config.*` — Tailwind 4 entra solo vía `postcss.config.mjs`.

## Arquitectura de juegos

El contrato completo (motor, componente, wiring, reglas duras) está en `.claude/skills/nuevo-juego/recipe.md` — esa es la fuente de verdad; acá solo el resumen.

- **Motor**: `lib/games/<slug>-engine.ts`. Factory `create<Name>Engine(canvas, callbacks)` que devuelve `{ start, stop, setPaused, reset }`. Framework-agnóstico: no importa React ni toca `document`/`window` fuera de `start()`/`stop()`.
- **Componente cliente**: `components/games/<slug>-canvas.tsx`. Patrón `callbacksRef` + efecto de montaje que crea el motor una sola vez y lo detiene en el cleanup.
- **Wiring**: único punto en `components/game-player.tsx:15-18` (`isAsteroids`, `isTetris`, `isArkanoide`, `isSerpentina`). El HUD, la pausa, el modal de fin de partida y el guardado de puntaje ya son genéricos por `game.id` — no requieren cambios al agregar un juego.
- `onGameOver` es edge-triggered (se dispara una sola vez) y el motor nunca dibuja su propio overlay de GAME OVER: ese modal es responsabilidad exclusiva de `GamePlayer`.

Motores reales hoy: `rocas` (Asteroids), `bloque-buster` (Tetris), `arkanoide` (Arkanoid), `serpentina` (Snake). Los demás slots del catálogo (`caida`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen siendo decorativos.

`references/started-games/` contiene los juegos originales sin portar (`02-asteroids`, `03-tetris`, `04-arkanoid`). Toda la carpeta `references/**` está en `globalIgnores` de ESLint.

## Datos y Supabase

- Clientes: `lib/supabase/client.ts` (browser) y `lib/supabase/server.ts` (servidor). El refresco de sesión vive en `proxy.ts` — Next.js 16 renombró la convención `middleware` a `proxy`, y la función exportada se llama `proxy`.
- **Catálogo**: tabla `games` (PK `id` text; `cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS; `color` ∈ cyan/magenta/green/yellow; `sort_order`). Lectura vía `getGames()` / `getGameById()` en `lib/games-server.ts`.
- **Leaderboard**: tabla `scores` (FK a `games.id` y a `auth.users.id`). Escritura con `saveScoreToLeaderboard()` en `lib/scores.ts`; lectura con `getTopScoresByGame()` / `getGlobalTopScores()` / `getUserBestForGame()` en `lib/scores-server.ts`.
- Ambas tablas tienen RLS habilitado. `anon` no debe tener policies de escritura — verificar con `mcp__supabase__get_advisors` después de cualquier migración.
- Sesión en cliente: `lib/user-context.tsx` (`UserProvider` / `useUser`).
- Contacto por email: `lib/contact.ts` (`sendContactMessage`) vía Resend.
- Tipos compartidos y datos decorativos (`CATS`, `PLAYERS`, `seededScores`): `lib/games.ts`.
- Variables de entorno (ver `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `SUPABASE_BD_PASSWORD`. El servidor MCP de Supabase está configurado en `.mcp.json`.

## Workflow Spec-Driven

- Los specs viven en `specs/NN-*.md`, con header `> **Status:**`. La configuración del flujo está en `specs/.spec-config.yml`.
- Hay 10 specs escritos y prácticamente todos implementados. Pendiente de higiene: los valores de Status están inconsistentes (`Implementado`, `Implemented`, `Implemantado`) y `08-tetris-bloque-buster.md` sigue en `Approved` aunque ya está implementado.
- `/spec` y `/spec-impl` están instalados (`.agents/skills/spec`, `.agents/skills/spec-impl`; también enlazados en `~/.claude/skills`), basados en https://github.com/Klerith/fernando-skills.
- `/nuevo-juego` (`.claude/skills/nuevo-juego/`) es un skill del proyecto: redacta el spec de un juego y luego implementa motor + canvas + wiring. Tiene `disable-model-invocation: true`, así que solo corre si el usuario lo invoca explícitamente.

## Convenciones

- Para diseñar interfaz usar `/ui-ux-pro-max`.
- Formato: Prettier + ESLint. **Ojo**: el hook `PostToolUse` de `.claude/settings.json` tiene un `PROJECT_ROOT` hardcodeado de macOS y no corre en esta máquina Windows — formatear a mano con `npx prettier --write <archivo>` y `npm run lint`.
- Guardar cada screenshot de Playwright en `.playwright-screenshots/` (gitignored) — pasar esa ruta en `filename` al llamar `browser_take_screenshot`.
- `@/*` resuelve a la raíz del repo (ver `tsconfig.json`).
- **Leer `node_modules/next/dist/docs/` antes de escribir código de Next.js** — ver `AGENTS.md` para el motivo (esta versión trae cambios de API y convenciones respecto de los datos de entrenamiento).
