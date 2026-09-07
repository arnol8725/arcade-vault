# SPEC 06 — Catálogo de juegos en Supabase

> **Status:** Implemantado
> **Depends on:** SPEC 04
> **Date:** 2026-09-06
> **Objective:** Reemplazar el array estático `GAMES` de `lib/games.ts` por una tabla `games` real en Supabase, de solo lectura desde la app, para poder editar el catálogo sin tocar código ni redeployar.

---

## Alcance

**In:**

- Crear la tabla `games` en Supabase (vía `mcp__supabase__apply_migration`) con las mismas columnas que hoy tiene la interfaz `Game` de `lib/games.ts` (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`), más `sort_order` para preservar el orden de listado. RLS activado con una policy de `SELECT` pública y sin policies de escritura para el rol `anon`.
- Seedear la tabla con los 8 juegos actuales (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`), con los mismos valores exactos que hoy están hardcodeados, en el mismo orden (`sort_order` 1 a 8).
- Reescribir `lib/games.ts`: mantiene los tipos (`Game`, `GameCategory`, `GameColor`, `ScoreRow`, `CATS`) y `seededScores`, elimina el array `GAMES`, y agrega `getGames(): Promise<Game[]>` y `getGameById(id: string): Promise<Game | null>` que consultan Supabase vía `lib/supabase/server.ts`.
- Convertir `app/juego/[id]/page.tsx` y `app/juego/[id]/jugar/page.tsx` (ya son Server Components) a `async`, usando `getGameById`.
- Convertir `app/biblioteca/page.tsx` y `app/page.tsx` (home) — hoy ambos `"use client"` con `GAMES` síncrono — al patrón Server Component + isla cliente: la página pasa a ser `async`, hace `await getGames()`, y delega el filtrado/estado interactivo a un nuevo sub-componente cliente que recibe los juegos ya resueltos como prop.
- Agregar `loading.tsx` (skeleton con la estética pixel/neón existente) y `error.tsx` (mensaje de error simple) en `app/biblioteca/` y en la raíz de `app/`.

**Out of scope (para specs futuros):**

- Leaderboard real con scores en Supabase (`/salon` sigue usando `seededScores` mock) — spec siguiente, dependiente de este.
- Calcular `best`/`plays` en tiempo real a partir de partidas jugadas — siguen siendo valores manuales de portada, igual que hoy.
- Pantalla de administración para crear/editar/borrar juegos desde la app — la tabla se gestiona vía SQL/dashboard de Supabase o MCP.
- Migrar `cover` a imágenes reales o Supabase Storage — sigue siendo un string usado como clase CSS.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  best integer not null default 0,
  plays text not null default '0',
  sort_order integer not null,
  created_at timestamptz not null default now()
);

alter table games enable row level security;

create policy "games are publicly readable"
  on games for select
  using (true);

-- Sin policies de insert/update/delete para anon: el catálogo se escribe
-- solo desde el dashboard de Supabase o vía MCP con la service role.
```

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

export const CATS: string[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
]; // sin cambios

export async function getGames(): Promise<Game[]>; // SELECT * FROM games ORDER BY sort_order ASC
export async function getGameById(id: string): Promise<Game | null>;

// ScoreRow y seededScores no cambian — siguen siendo mock, fuera de este spec.
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}
export function seededScores(seed: number, count?: number): ScoreRow[];
```

---

## Plan de implementación

1. Crear la tabla `games` en Supabase vía `mcp__supabase__apply_migration` (migración `create_games_table`), con el esquema y la policy de RLS de arriba.
2. Seedear la tabla con un `insert` de los 8 juegos actuales, con los mismos valores exactos que hoy en `lib/games.ts` y `sort_order` 1–8 en el orden actual.
3. Reescribir `lib/games.ts`: eliminar el array `GAMES`, agregar `getGames()` y `getGameById(id)` usando `createServerClient` de `lib/supabase/server.ts`. Mantener `CATS`, `ScoreRow` y `seededScores` sin cambios.
4. Convertir `app/juego/[id]/page.tsx` y `app/juego/[id]/jugar/page.tsx` a funciones `async` que hacen `await getGameById(id)`; si no hay resultado, `notFound()`.
5. Convertir `app/biblioteca/page.tsx` en Server Component `async`: hace `await getGames()` y renderiza un nuevo `components/biblioteca-client.tsx` (`"use client"`) pasándole `games: Game[]` como prop. Ese componente cliente mantiene toda la lógica actual de filtrado por categoría (`useMemo`, `useState`) que hoy vive en la página. Se agrega `app/biblioteca/loading.tsx` (skeletons de `game-card` con la estética pixel/neón) y `app/biblioteca/error.tsx` ("No se pudo cargar el catálogo").
6. Convertir `app/page.tsx` (home) al mismo patrón: pasa a Server Component `async`, hace `await getGames()`, y el bloque "GAMES PREVIEW" (`GAMES.slice(0, 6)`) se mueve a un nuevo `components/home-games-preview.tsx` que recibe los juegos ya resueltos como prop (queda `"use client"` solo si necesita interactividad propia). Se agrega `app/loading.tsx` y `app/error.tsx` con el mismo criterio que en `/biblioteca`.
7. Verificar que `components/game-card.tsx`, `components/game-detail.tsx` y `components/home-sections.tsx` (que solo importan los tipos `Game`/`ScoreRow`) sigan compilando sin cambios de lógica.
8. Verificación manual end-to-end: `/biblioteca` lista los 8 juegos en el mismo orden y con los mismos datos que antes; el filtro por categoría sigue funcionando; `/` muestra el preview de 6 juegos; `/juego/rocas` y `/juego/rocas/jugar` cargan igual que antes; editar un valor (ej. `title` o `best`) directamente en la tabla `games` vía SQL y refrescar la página lo refleja sin redeploy; forzar un error en la query dispara `error.tsx` sin romper el resto de la navegación; mientras carga, se ve el skeleton en vez de una pantalla en blanco.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Existe la tabla `games` en Supabase con las 8 filas seedadas, con RLS activado y una policy de `SELECT` pública, sin policies de escritura para `anon`.
- [ ] `lib/games.ts` ya no exporta el array `GAMES`; expone `getGames()` y `getGameById(id)` consultando Supabase.
- [ ] `/biblioteca`, `/` (home), `/juego/[id]` y `/juego/[id]/jugar` muestran los mismos 8 juegos con los mismos datos que antes de la migración.
- [ ] Cambiar un valor directamente en la tabla `games` (vía SQL) y refrescar la página lo refleja sin necesidad de redeploy.
- [ ] Mientras carga `/biblioteca` o `/` se ve un skeleton acorde a la estética pixel/neón, no una pantalla en blanco.
- [ ] Si la consulta a Supabase falla, se muestra un mensaje de error visible en vez de una excepción no controlada.
- [ ] No se agrega ninguna pantalla de administración de juegos en este spec.
- [ ] `best` y `plays` siguen siendo valores fijos de portada, no derivados de partidas reales.

---

## Decisiones

- **Sí:** reemplazo total de `lib/games.ts` en vez de mantenerlo como fallback estático. Tener dos fuentes de verdad del catálogo (array + tabla) es una receta para que diverjan.
- **Sí:** `best`/`plays` quedan manuales en la tabla `games`. Calcularlos en tiempo real depende de que exista una tabla de scores real — eso es el spec de leaderboard, siguiente y dependiente de este. Mezclarlos acopla ambos specs sin necesidad.
- **Sí:** columna `sort_order` explícita. Postgres no garantiza el orden de filas sin `ORDER BY`; sin esta columna, el orden de `/biblioteca` y del preview de la home quedaría indeterminado entre requests.
- **Sí:** sin pantalla de administración. No fue pedido, y el catálogo cambia con tan poca frecuencia que gestionarlo vía SQL/dashboard alcanza por ahora.
- **Sí:** Server Component + isla cliente en `/biblioteca` y en la home. Es el patrón idiomático de App Router para este caso: el fetch ocurre en el servidor, la interactividad (filtros por categoría) se mantiene igual que hoy en un sub-componente cliente.
- **Sí:** RLS activado con policy de `SELECT` pública, sin policies de escritura para `anon`. El catálogo es de solo lectura desde el cliente; escribir requiere la service role (dashboard/MCP), no la app.
- **No:** tocar `seededScores`/`ScoreRow` ni el leaderboard de `/salon` en este spec — es el spec siguiente, que necesita el `id` real de juego que esta tabla ya provee.
- **No:** migrar `cover` a imágenes reales o a Supabase Storage. Sigue siendo un string usado como clase CSS (`cover-bricks`, etc.), sin cambio de significado.

---

## Riesgos

| Riesgo                                                                                                                            | Mitigación                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin RLS bien configurado, un cliente anónimo podría escribir en `games`                                                           | Policy de `SELECT` pública explícita y ninguna policy de `insert`/`update`/`delete` para `anon`; correr `get_advisors` después de crear la tabla para confirmar que no queda ninguna policy de escritura abierta |
| Convertir `/biblioteca` y `/` de client a Server Component puede romper animaciones o estado que hoy asumían montaje 100% cliente | El paso 8 de verificación revisa explícitamente que biblioteca y home se vean y filtren igual que antes de la migración                                                                                          |
| `sort_order` manual puede desincronizarse si en el futuro se inserta un juego nuevo sin asignarlo correctamente                   | Aceptado para este MVP sin admin UI; documentado en el seed que `sort_order` debe asignarse explícitamente en cada insert                                                                                        |

---

## Qué **no** está en este spec

- Leaderboard real con scores en Supabase.
- `best`/`plays` calculados en tiempo real.
- Pantalla de administración de juegos.
- Migración de `cover` a imágenes reales o Storage.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
