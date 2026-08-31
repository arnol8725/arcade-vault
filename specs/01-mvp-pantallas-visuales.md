# SPEC 01 — MVP visual de Arcade Vault: pantallas base

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-30
> **Objective:** Implementar como rutas reales de Next.js App Router las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor, auth y salón de la fama), consumiendo datos mock estáticos y el sistema de diseño ya existente en `app/globals.css`, sin motor de juego real.

---

## Alcance

**In:**

- Cinco rutas: `/` (Biblioteca), `/juego/[id]` (Detalle), `/juego/[id]/jugar` (Reproductor), `/auth` (Autenticación) y `/salon` (Salón de la Fama).
- `Nav` y footer compartidos, montados una sola vez en `app/layout.tsx`.
- Módulo de datos mock estático (`lib/games.ts`) portado de `references/templates/data.jsx`: `GAMES`, `CATS`, `PLAYERS`, `seededScores`.
- Sesión de usuario cliente (login, invitado, cerrar sesión) persistida en `localStorage` bajo la clave `av_user`, compartida entre Nav, Auth, Reproductor y Salón vía un contexto de React.
- Pantalla Reproductor con el loop de puntaje simulado del template: incremento automático mientras no está en pausa, vidas, nivel, pausa/reanudar, modal de fin de partida y guardado del puntaje en `localStorage` bajo la clave `av_scores`.
- Menú móvil (hamburguesa) del Nav, portado de `nav.jsx`.
- Reutilización 1:1 de las clases ya presentes en `app/globals.css` (`.av-nav`, `.card`, `.crt-screen`, `.podium`, `.hall-tabs`, `.auth-card`, etc.) — no se agrega CSS nuevo.

**Out of scope (para specs futuros):**

- Motor de juego real para cualquiera de los 8 juegos (colisiones, físicas, input, canvas/WebGL).
- Backend, base de datos o autenticación real (validación de contraseña, sesiones de servidor).
- Sistema de créditos/monedas funcional — el contador "CRÉDITOS · 03" del Nav queda estático.
- Tests automatizados (no hay test runner configurado en el proyecto).
- Multijugador o partidas en tiempo real (aplica al modo "dos jugadores" mencionado en `duelo-pixel`).

---

## Modelo de datos

Nuevo módulo `lib/games.ts`, tipado, portado de `data.jsx`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // sufijo de clase CSS, p.ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[]; // los 8 juegos, copiados literalmente de data.jsx
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[]; // nombres usados por seededScores
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Nuevo módulo `lib/user-context.tsx` (contexto de React, no persistencia nueva de negocio):

```ts
export interface SessionUser {
  name: string;
}

// value expuesto por useUser():
// { user: SessionUser | null; login(name: string): void; guest(): void; signOut(): void }
```

El guardado de puntaje no introduce un módulo propio: la página `/juego/[id]/jugar` escribe directo en `localStorage["av_scores"]` con la misma forma que el template (`{ game, score, name, at }`), igual que hacía `handleSaveScore` en `app.jsx`.

**Nota de convención (Next.js App Router en esta versión):** en `app/juego/[id]/page.tsx` y `app/juego/[id]/jugar/page.tsx`, `params` llega como `Promise<{ id: string }>` — cada page debe hacer `await params` antes de leer `id` (confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`).

---

## Plan de implementación

1. Crear `lib/games.ts` con `GAMES`, `CATS`, `PLAYERS` y `seededScores` portados 1:1 de `data.jsx`, tipados según el modelo de datos.
2. Crear `lib/user-context.tsx` con `UserProvider`/`useUser`, leyendo y escribiendo `localStorage["av_user"]` con los mismos `try/catch` defensivos del template.
3. Crear `components/nav.tsx` portando `nav.jsx`: logo, links Biblioteca/Salón, contador de créditos estático, botón de sesión (usa `useUser()`), menú móvil hamburguesa. El link activo se resuelve con `usePathname()` de `next/navigation`.
4. Reescribir `app/layout.tsx`: envolver `children` con `<UserProvider>`, montar `<Nav />`, `<main className="av-main">` y el footer del template, quitando el scaffold de `create-next-app`.
5. Crear `components/game-card.tsx` (tarjeta con tilt al pasar el mouse, portada de `biblioteca.jsx`) y reescribir `app/page.tsx` como la pantalla Biblioteca: hero, buscador, chips de categoría, grilla de tarjetas y estado vacío "NO HAY RESULTADOS".
6. Crear `app/juego/[id]/page.tsx`: server wrapper que hace `await params`, busca el juego en `GAMES` (`notFound()` si no existe) y renderiza un client component `GameDetail` (portado de `detalle.jsx`) con el leaderboard vía `seededScores`.
7. Crear `app/juego/[id]/jugar/page.tsx`: mismo patrón de wrapper, renderiza `GamePlayer` (portado de `reproductor.jsx`) con el loop de puntaje mock, HUD, pausa, modal de fin de partida y guardado en `localStorage["av_scores"]`.
8. Crear `app/auth/page.tsx`: portar `Auth` (`auth.jsx`) usando `useUser().login()` / `useUser().guest()`, con redirección a `/` vía `useRouter().push()` al enviar el formulario o pulsar "Jugar como invitado".
9. Crear `app/salon/page.tsx`: portar `HallOfFame` (`salon.jsx`) con tabs por juego, podio y tabla, usando `useUser()` para la fila "TU MEJOR MARCA".
10. Recorrido manual end-to-end: Biblioteca → Detalle → Jugar → guardar puntaje → Salón, y Biblioteca → Auth → login/invitado → Nav refleja la sesión.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `/` renderiza el hero, el buscador, los chips de categoría y las 8 tarjetas de `GAMES`.
- [ ] Buscar por texto o filtrar por categoría en `/` reduce la grilla a las coincidencias, y muestra "NO HAY RESULTADOS" cuando no hay ninguna.
- [ ] `/juego/[id]` con un id válido de `GAMES` muestra la info del juego y un leaderboard de 10 filas.
- [ ] `/juego/id-inexistente` devuelve 404 vía `notFound()`.
- [ ] `/juego/[id]/jugar` incrementa el puntaje automáticamente cada ~220ms mientras no está en pausa ni terminó la partida.
- [ ] Pulsar "PAUSA" detiene el incremento de puntaje; pulsar "REANUDAR" lo retoma.
- [ ] Pulsar "FIN" abre el modal de fin de partida con el puntaje final.
- [ ] Guardar el puntaje en el modal lo persiste en `localStorage["av_scores"]` y muestra el toast "PUNTUACIÓN GUARDADA_".
- [ ] En `/auth`, "Iniciar sesión" o "Jugar como invitado" actualiza la sesión y redirige a `/`.
- [ ] Tras iniciar sesión, el Nav muestra el nombre del usuario en vez de "Iniciar Sesión".
- [ ] Cerrar sesión desde el Nav borra `localStorage["av_user"]` y vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon` muestra podio (top 3) y tabla de 12 filas para el juego elegido en las tabs, y cambia al seleccionar otra tab.
- [ ] Con sesión iniciada, `/salon` agrega la fila "TU MEJOR MARCA EN [JUEGO]".
- [ ] El link activo del Nav coincide con la ruta actual en las 5 pantallas.
- [ ] El menú hamburguesa se abre y se cierra correctamente en viewport móvil.

---

## Decisiones

- **Sí:** rutas reales de Next.js App Router (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon`) en vez del router SPA por hash de `app.jsx`. Es la convención nativa del framework, da URLs limpias y navegación de browser gratis.
- **No:** mantener el hash-router del template. Iría contra la arquitectura de App Router y perdería rutas nombradas.
- **Sí:** mantener el loop de puntaje simulado (mock) en el Reproductor tal cual el template. Es UI + estado, no un motor de juego real — sostiene el requisito de "solo visual, sin implementar ningún juego".
- **Sí:** auth 100% mock y client-side, con `localStorage["av_user"]`, sin validación de contraseña. Es un MVP visual; no hay backend en el alcance.
- **Sí:** datos mock en un módulo TS estático (`lib/games.ts`) en vez de una API route interna. Los datos no cambian ni requieren red — una API agregaría complejidad sin beneficio en este MVP.
- **Sí:** un contexto de React (`UserProvider`) para compartir la sesión entre Nav, Auth, Reproductor y Salón. App Router divide las pantallas en árboles de ruta separados — ya no hay un único componente `App` que haga prop-drilling como en el template, y se necesita un mecanismo de estado compartido en cliente.
- **No:** librería de estado global (Zustand, Redux, etc.). Sería sobre-ingeniería para un solo valor de sesión con dos escritores (Auth y Nav).
- **Sí:** slugs de ruta en español (`/juego`, `/salon`, `/auth`), coherentes con el copy en español del resto de la app.
- **No:** contador de créditos dinámico. Fuera de alcance del MVP visual; se mantiene el "03" estático del template.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `params` es una `Promise` en esta versión de Next.js, no un objeto síncrono | Cada `page.tsx` bajo `/juego/[id]` hace `await params` antes de leer `id`, según `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` |
| `localStorage` deshabilitado (modo privado del navegador) | Se mantienen los `try/catch` del patrón original: la sesión y el guardado de puntaje simplemente no persisten, sin romper la pantalla |
| Id de juego inexistente en la URL | `/juego/[id]` llama a `notFound()` de Next.js si el id no está en `GAMES` |

---

## Qué **no** está en este spec

- Motor de juego real para ninguno de los 8 juegos (colisiones, físicas, input, canvas/WebGL).
- Backend, base de datos o autenticación real.
- Sistema de créditos/monedas funcional.
- Tests automatizados.
- Multijugador o partidas en tiempo real.

Cada uno de estos, si se implementa, va en su propio spec.
