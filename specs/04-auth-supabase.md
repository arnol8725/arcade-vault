# SPEC 04 — Autenticación real con Supabase (email + contraseña)

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-06
> **Objective:** Reemplazar el login/registro mock de `/auth` (que aceptaba cualquier usuario sin validar nada) por autenticación real de Supabase con email y contraseña, manteniendo el modo "jugar como invitado" 100% local y sin tocar los componentes que ya consumen `useUser()`.

---

## Alcance

**In:**

- Instalar `@supabase/ssr` y `@supabase/supabase-js`, y crear los clientes de Supabase para App Router: `lib/supabase/client.ts` (browser) y `lib/supabase/server.ts` (server), más `middleware.ts` en la raíz para refrescar la sesión en cookies en cada request.
- Reescribir `app/auth/page.tsx`: el tab "INICIAR SESIÓN" pasa a pedir **correo electrónico** en vez de "Usuario" (Supabase identifica por email); el tab "CREAR CUENTA" mantiene los 3 campos (usuario, correo, contraseña). Se agrega validación antes de llamar a Supabase: email con el mismo regex de SPEC 03, contraseña de al menos 6 caracteres, usuario no vacío en el signup — dispara el `shake` ya existente en el sistema de diseño si falla. Errores de Supabase (credenciales inválidas, email ya registrado, etc.) se muestran inline con la clase `.error` ya creada en SPEC 03.
- `lib/user-context.tsx` mantiene exactamente la misma interfaz pública (`user`, `login`, `guest`, `signOut`) para que `Nav`, `game-player` y `salon` no cambien ni una línea. Por dentro: `login` pasa a resolver la sesión contra Supabase (signup vía `supabase.auth.signUp` con `options.data.name` para el username, login vía `supabase.auth.signInWithPassword`), hidrata `SessionUser` desde `supabase.auth.getSession()` / `onAuthStateChange` en vez de leer `localStorage`, y `signOut` llama a `supabase.auth.signOut()`. `guest()` no cambia: sigue siendo 100% local, sin llamar a Supabase.
- Desactivar "Confirm email" en la configuración de Auth del proyecto Supabase (`benxpdtvepdyoltawtzg`) para que el signup deje la sesión activa al toque, igual que el comportamiento actual del mock.
- Agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (vacíos) a `.env.example`, con los valores reales en `.env.local` (gitignorado), obtenidos del proyecto ya conectado vía MCP (`.mcp.json` → `project_ref=benxpdtvepdyoltawtzg`).

**Out of scope (para specs futuros):**

- Migrar `av_scores` (puntajes de `localStorage`) a una tabla de Supabase — spec 05, dependiente de este.
- Tabla `profiles` en la base de datos: el username queda en `user_metadata` de `auth.users`, sin tabla propia. Si spec 05 necesita relacionar scores con usuarios, ahí se evalúa si hace falta.
- Botones sociales GOOGLE/GITHUB: siguen visualmente presentes pero sin `onClick` funcional, igual que hoy.
- Confirmación de email por correo (magic link de verificación) — queda desactivada, no implementada.
- Recuperación de contraseña ("olvidé mi contraseña").
- Protección de rutas (gating): `/juego/[id]/jugar` y `/salon` siguen accesibles sin sesión real, como hasta ahora — este spec no agrega middleware de autorización, solo de refresco de sesión.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no crea tablas nuevas en Supabase. Usa `auth.users`, ya provisto por Supabase Auth, y guarda el username en su `user_metadata`:

```ts
// lib/user-context.tsx
export interface SessionUser {
  name: string; // viene de user_metadata.name (signup) o "INVITADO" (guest, local)
}
```

`SessionUser` no cambia de forma — sigue teniendo solo `name` — para no romper a `Nav`, que hoy renderiza `user.name` sin más campos.

---

## Plan de implementación

1. `npm install @supabase/ssr @supabase/supabase-js`.
2. Obtener URL y anon key del proyecto (`get_project_url`, `get_publishable_keys` vía MCP de Supabase) y cargarlas en `.env.local` (gitignorado) como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Agregar las mismas dos claves vacías a `.env.example`.
3. Crear `lib/supabase/client.ts` (`createBrowserClient` de `@supabase/ssr`) y `lib/supabase/server.ts` (`createServerClient`, leyendo/escribiendo cookies vía `next/headers`).
4. Crear `middleware.ts` en la raíz con `updateSession` (patrón estándar de `@supabase/ssr`) para refrescar el token de sesión en cada request, con `matcher` que excluya assets estáticos.
5. Desactivar "Confirm email" en Authentication → Settings del proyecto Supabase (paso manual en el dashboard, no hay tool de MCP para esto).
6. Reescribir `lib/user-context.tsx`: `login(email, pass)` intenta `signInWithPassword`; `guest()` sin cambios; `signOut()` llama a `supabase.auth.signOut()` y limpia el estado local; un `useEffect` con `onAuthStateChange` mantiene `user` sincronizado con la sesión real (o con el invitado local si no hay sesión de Supabase).
7. Reescribir `app/auth/page.tsx`: tab INICIAR SESIÓN pide correo + contraseña; tab CREAR CUENTA pide usuario + correo + contraseña y llama a `supabase.auth.signUp({ email, password, options: { data: { name: user } } })`. Ambos flujos validan formato de email (regex de SPEC 03) y contraseña ≥ 6 caracteres antes de llamar a Supabase, disparando `shake` si falla. Errores de Supabase se muestran con la clase `.error` de SPEC 03, sin perder lo tipeado.
8. Verificación manual end-to-end: crear cuenta nueva con email válido → sesión activa inmediata → redirige a `/biblioteca` → Nav muestra el username → recargar la página mantiene la sesión (cookie, no `localStorage`) → cerrar sesión vuelve a mostrar `/auth` → loguear con el mismo email/contraseña funciona → "jugar como invitado" sigue funcionando sin tocar Supabase → probar contraseña corta (<6) y email mal formado disparan `shake` sin llamar a Supabase → probar login con contraseña incorrecta muestra el error inline.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `@supabase/ssr` y `@supabase/supabase-js` figuran en `dependencies` de `package.json`.
- [ ] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vacíos; los valores reales viven solo en `.env.local` (gitignorado).
- [ ] Crear una cuenta nueva con email y contraseña válidos deja al usuario logueado de inmediato (sin paso de confirmación por correo) y lo redirige a `/biblioteca`.
- [ ] Cerrar sesión y volver a loguear con el mismo email/contraseña funciona.
- [ ] Recargar la página con sesión activa no desloguea al usuario (la sesión persiste vía cookies, no vía `localStorage`).
- [ ] "Jugar como invitado" sigue funcionando exactamente igual que antes, sin llamar a Supabase.
- [ ] Email con formato inválido o contraseña de menos de 6 caracteres disparan el `shake` y no llegan a llamar a Supabase.
- [ ] Un error real de Supabase (ej. contraseña incorrecta, email ya registrado) se muestra inline con la clase `.error`, sin borrar lo tipeado.
- [ ] `Nav`, `game-player` y `app/salon/page.tsx` no cambian: siguen usando `useUser()` con la misma interfaz (`user`, `login`, `guest`, `signOut`).
- [ ] No se crea ninguna tabla nueva en la base de datos de Supabase.

---

## Decisiones

- **Sí:** separar auth (este spec) de migrar `av_scores` (spec futuro). Son dominios distintos — mezclar los dos infla el spec y el riesgo de romper algo en la mitad.
- **Sí:** login por email, no por username. Es el flujo nativo de Supabase Auth (`signInWithPassword`); resolver username→email requeriría una tabla `profiles` y una query extra antes de poder autenticar, solo para evitar pedir el email en el login.
- **Sí:** sin tabla `profiles` en este spec. El username alcanza como `user_metadata` de `auth.users`; crear una tabla ahora es trabajo adelantado que puede no necesitarse según cómo quede diseñado el spec de scores.
- **Sí:** `@supabase/ssr` en vez de `@supabase/supabase-js` a secas. Es el paquete vigente de Supabase para Next.js App Router — maneja la sesión en cookies entre Server y Client Components; el paquete base no lo hace bien en App Router.
- **Sí:** mantener la interfaz de `useUser()` (`user`, `login`, `guest`, `signOut`) sin cambios. Minimiza el blast radius: `Nav`, `game-player` y `salon` no se tocan.
- **Sí:** desactivar confirmación de email. Prioriza mantener el flujo instantáneo que ya tiene el mock (crear cuenta = jugar ya); el costo es que cualquiera puede registrarse con un email que no controla, aceptable para este MVP.
- **Sí:** modo invitado queda 100% local, sin usuario anónimo de Supabase. Es más simple y no había pedido de que el invitado persista entre dispositivos o sesiones.
- **No:** wirear los botones GOOGLE/GITHUB. No fue elegido como método de auth; quedan decorativos como ya estaban.
- **No:** agregar recuperación de contraseña ni gating de rutas. No fue pedido y amplía el alcance del spec sin necesidad inmediata.

---

## Riesgos

| Riesgo                                                                                                                                                                                                                             | Mitigación                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Con "Confirm email" desactivado, cualquiera puede crear una cuenta con un email que no le pertenece                                                                                                                                | Aceptado como trade-off consciente para este MVP; si se vuelve un problema, activar confirmación es un cambio de configuración, no de código                                                  |
| `middleware.ts` mal configurado puede refrescar la sesión en cada asset estático y degradar performance                                                                                                                            | Usar el `matcher` estándar de la doc de `@supabase/ssr` que excluye `_next/static`, `_next/image` y archivos con extensión                                                                    |
| El proyecto Supabase (`benxpdtvepdyoltawtzg`) ya tiene otros specs planeados (scores) que van a compartir el mismo `auth.users` — un cambio de estrategia acá (ej. agregar `profiles` después) obliga a migrar usuarios existentes | Mantener el username en `user_metadata` desde el día uno hace que agregar una tabla `profiles` más adelante sea un `INSERT ... SELECT` desde `auth.users`, no una migración de datos perdidos |

---

## Qué **no** está en este spec

- Migración de `av_scores` a Supabase.
- Tabla `profiles` u otra tabla de la base de datos.
- Login social (Google/GitHub).
- Confirmación de email / recuperación de contraseña.
- Protección de rutas según sesión.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
