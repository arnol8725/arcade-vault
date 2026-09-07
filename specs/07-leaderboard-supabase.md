# SPEC 07 — Leaderboard real con Supabase

> **Status:** Aprroved
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-06
> **Objective:** Reemplazar el leaderboard mock de `/salon` (`seededScores`) por un ranking real basado en una tabla `scores` de Supabase, alimentada cuando un usuario logueado guarda su partida.

---

## Alcance

**In:**

- Crear la tabla `scores` en Supabase (vía `mcp__supabase__apply_migration`), con FK a `games(id)` (SPEC 06) y a `auth.users(id)` (SPEC 04). RLS: `SELECT` público, `INSERT` solo para el rol `authenticated` con `auth.uid() = user_id`, sin policies de `UPDATE`/`DELETE`.
- Crear `lib/scores.ts` con `getTopScoresByGame(gameId, limit)`, `getGlobalTopScores(limit)`, `getUserBestForGame(gameId)` (score + rango real del usuario logueado) y `saveScoreToLeaderboard(gameId, score)`.
- Modificar `components/game-player.tsx`: al "GUARDAR PUNTUACIÓN", además del guardado en `localStorage["av_scores"]` que no cambia, si hay sesión real se llama a `saveScoreToLeaderboard` para insertar la misma partida en Supabase. Aplica a los 8 juegos por igual (incluidos los 7 con puntaje simulado, igual que ya trata `saveScore` hoy a todos los juegos por igual).
- Reescribir `app/salon/page.tsx` como Server Component `async` que reemplaza `seededScores`/`GAMES` por datos reales de `getGames()` (SPEC 06), `getGlobalTopScores(10)` y `getTopScoresByGame(id, 10)` por cada juego, delegando el estado de tabs (incluida una nueva pestaña "GLOBAL") a un componente cliente.
- `loading.tsx`/`error.tsx` en `app/salon/`, mismo criterio que SPEC 06.

**Out of scope (para specs futuros):**

- Persistencia de puntajes de invitados (sin sesión) en el leaderboard real — siguen guardando solo en `localStorage`, como hoy.
- Migrar los scores viejos ya guardados en `localStorage["av_scores"]` a Supabase.
- Validación anti-cheat de las partidas (nada impide que una sesión autenticada inserte un score arbitrario contra la API).
- Recalcular `best`/`plays` de la tabla `games` (SPEC 06) a partir de esta tabla.
- Edición o borrado de scores, paginación o "ver más" del top 10.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  game_id text not null references games(id) on delete cascade,
  score integer not null check (score >= 0),
  achieved_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);
create index scores_score_idx on scores (score desc);

alter table scores enable row level security;

create policy "scores are publicly readable"
  on scores for select
  using (true);

create policy "authenticated users insert their own scores"
  on scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Sin policies de update/delete: un score, una vez guardado, es inmutable.
```

```ts
// lib/scores.ts
export interface LeaderboardRow {
  rank: number;
  userName: string;
  score: number;
  achievedAt: string;
}

export interface UserBest {
  score: number;
  rank: number; // count de scores mayores en ese juego + 1
}

export async function getTopScoresByGame(
  gameId: string,
  limit?: number,
): Promise<LeaderboardRow[]>;
export async function getGlobalTopScores(
  limit?: number,
): Promise<LeaderboardRow[]>;
export async function getUserBestForGame(
  gameId: string,
): Promise<UserBest | null>; // null si el usuario no tiene ningún score en ese juego, o no hay sesión
export async function saveScoreToLeaderboard(
  gameId: string,
  score: number,
): Promise<void>; // no-op silencioso si no hay sesión
```

---

## Plan de implementación

1. Crear la tabla `scores` en Supabase vía `mcp__supabase__apply_migration` (migración `create_scores_table`), con el esquema, los índices y las policies de RLS de arriba.
2. Crear `lib/scores.ts`: `getTopScoresByGame`/`getGlobalTopScores`/`getUserBestForGame` usan `lib/supabase/server.ts` (lectura server-side); `saveScoreToLeaderboard` usa `lib/supabase/client.ts`, obtiene la sesión con `supabase.auth.getSession()` y, si existe, hace `insert` con `{ user_id: session.user.id, user_name: session.user.user_metadata.name, game_id, score }`; si no hay sesión, retorna sin hacer nada.
3. Modificar `components/game-player.tsx`: en el handler de `saveScore`, después de escribir en `localStorage` exactamente igual que hoy, llamar a `saveScoreToLeaderboard(game.id, score)` envuelto en `try/catch` — un fallo del insert a Supabase se loguea en consola pero no bloquea ni altera el flujo existente (el guardado local ya se completó).
4. Reescribir `app/salon/page.tsx` como Server Component `async`: `await getGames()`, `await getGlobalTopScores(10)` y `await Promise.all(...)` de `getTopScoresByGame(g.id, 10)` para cada uno de los 8 juegos. Todo se pasa como props a un nuevo `components/salon-client.tsx` (`"use client"`) que reemplaza el contenido actual de la página: agrega una pestaña "GLOBAL" al inicio de los tabs existentes (junto a los tabs por juego), y al seleccionarla muestra el podio/tabla con `getGlobalTopScores` en vez de los datos del juego. Se agregan `app/salon/loading.tsx` y `app/salon/error.tsx` con el mismo criterio de SPEC 06.
5. En `salon-client.tsx`, la sección "TU MEJOR MARCA" (solo pestañas de juego, no en "GLOBAL") usa el resultado de `getUserBestForGame` por juego, calculado server-side y pasado como prop; si el usuario no tiene ningún score guardado en ese juego, la sección se oculta por completo (no se muestra un dato inventado ni un placeholder de "sin puntaje").
6. Verificación manual end-to-end: crear cuenta/loguearse, jugar ROCAS, guardar puntuación → aparece una fila nueva en la tabla `scores` de Supabase y, al volver a `/salon`, la pestaña de rocas la refleja (podio/tabla) y "TU MEJOR MARCA" muestra el score y rango reales; jugar como invitado y guardar puntuación → se guarda en `localStorage` como siempre, pero **no** aparece en `/salon`; jugar un juego con puntaje simulado (ej. `bloque-buster`) logueado y guardar → también se inserta en Supabase igual que rocas; la pestaña "GLOBAL" muestra el mejor score individual entre todos los juegos, ordenado desc; un usuario sin scores en un juego dado no ve la sección "TU MEJOR MARCA" para ese juego.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Existe la tabla `scores` en Supabase con RLS: `SELECT` público, `INSERT` solo para `authenticated` con `auth.uid() = user_id`, sin policies de `UPDATE`/`DELETE`.
- [ ] Guardar una partida logueado inserta una fila real en `scores` con el `game_id`, `score` y `user_name` correctos.
- [ ] Guardar una partida como invitado no inserta nada en Supabase; el comportamiento visible para el invitado no cambia respecto a hoy.
- [ ] `/salon` reemplaza `seededScores` por datos reales: la pestaña "GLOBAL" muestra el top 10 de mejor score individual entre todos los juegos; cada pestaña de juego muestra el top 10 real de ese juego.
- [ ] "TU MEJOR MARCA" muestra el score y rango reales del usuario logueado en el juego seleccionado (rango = cantidad de scores mayores + 1); si el usuario no tiene ningún score en ese juego, la sección no se muestra.
- [ ] Los 8 juegos guardan en `scores` por igual, sin lógica condicional distinta entre `rocas` y el resto.
- [ ] Ningún score existente de `localStorage["av_scores"]` se migra a Supabase.
- [ ] Mientras carga `/salon` se ve un skeleton acorde a la estética pixel/neón existente; si falla la consulta, se muestra un mensaje de error sin romper el resto de la app.

---

## Decisiones

- **Sí:** solo usuarios logueados persisten en el leaderboard real. Evita nombres inventados o falsos en el ranking y no requiere resolver una identidad estable para invitados.
- **Sí:** no migrar scores viejos de `localStorage`. Evita una heurística de matching por nombre poco confiable para datos guardados antes de que existiera login real; los datos viejos quedan intactos donde estaban.
- **Sí:** una fila por partida en vez de upsert del mejor score. El guardado es un `INSERT` simple sin lógica condicional, y el ranking se arma con `ORDER BY score DESC LIMIT N`; permite además que las mejores partidas históricas de un jugador puedan ocupar más de un puesto.
- **Sí:** top 10 por juego y en el global, consistente en toda la pantalla.
- **Sí:** el guardado en `localStorage` no cambia para nadie; el insert a Supabase es un efecto adicional solo cuando hay sesión, y un fallo suyo no bloquea ni altera el flujo existente.
- **Sí:** aplica a los 8 juegos por igual, igual que ya hace hoy `GamePlayer.saveScore` sin distinguir juegos con motor real de los simulados. Cada motor real es su propio spec (SPEC 05 ya lo hizo para `rocas`); el leaderboard no debería depender de eso.
- **Sí:** rango real vía conteo (`count` de scores mayores + 1) en vez de mostrar "fuera del top 10" sin número. Mantiene la utilidad de "TU MEJOR MARCA" tal como existe visualmente hoy.
- **Sí:** ocultar "TU MEJOR MARCA" si el usuario no tiene ningún score en ese juego, en vez de inventar un dato como hace el mock actual (`rows[5]?.score - 2400`).
- **Sí:** agregar una pestaña "GLOBAL" a los tabs existentes de `/salon` en vez de una pantalla separada — reutiliza el patrón de tabs ya construido en la UI.
- **No:** paginación o "ver más" del top 10 — no fue pedido.
- **No:** editar o borrar scores. Son inmutables una vez guardados; no hay caso de uso planteado para corregirlos.

---

## Riesgos

| Riesgo                                                                                                                                                      | Mitigación                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Un usuario autenticado podría insertar un score arbitrario directamente contra la API de Supabase, bypaseando el juego                                      | La policy de `INSERT` exige `auth.uid() = user_id`, pero no valida que el score sea alcanzable; aceptado como trade-off de este MVP — anti-cheat real (validación server-side de la partida) queda fuera de alcance y sería un spec propio |
| El insert a Supabase puede fallar (red, RLS mal configurada) sin que el usuario lo note, porque el guardado en `localStorage` sigue funcionando en paralelo | Aceptado: el error se loguea en consola para debugging; no se bloquea ni se muestra un error al usuario, ya que su score local sí quedó guardado                                                                                           |
| Calcular el rango real vía `count` en `getUserBestForGame` agrega una query extra por cada juego mostrado en `/salon`                                       | Dataset pequeño (8 juegos), el costo es despreciable; si crece, optimizar la consulta es un cambio aislado a `lib/scores.ts`                                                                                                               |

---

## Qué **no** está en este spec

- Persistencia de scores de invitados.
- Migración de scores viejos de `localStorage`.
- Validación anti-cheat de las partidas.
- `best`/`plays` de la tabla `games` recalculados desde `scores`.
- Edición/borrado de scores, paginación del leaderboard.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
