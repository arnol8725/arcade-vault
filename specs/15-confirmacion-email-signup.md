# SPEC 15 — Confirmación de email en el registro

> **Status:** Approved
> **Depends on:** SPEC 04
> **Date:** 2026-09-13
> **Objective:** Reactivar la confirmación de email de Supabase Auth para que crear cuenta ya no deje sesión activa hasta hacer click en el link del correo, con mensaje inline y reenvío en `/auth`.

---

## Alcance

**In:**

- Reactivar "Confirm email" en Authentication → Settings del proyecto Supabase (`benxpdtvepdyoltawtzg`) — paso manual en el dashboard, inverso al paso que lo desactivó en SPEC 04.
- En `lib/user-context.tsx`, la rama de `signUp` de `login()` agrega `options.emailRedirectTo` apuntando a un nuevo route handler `app/auth/callback/route.ts`.
- `app/auth/callback/route.ts` (nuevo): `GET` handler que toma el `code` de la URL, llama a `createClient()` de `lib/supabase/server.ts` y `exchangeCodeForSession(code)`. Si funciona, redirige a `/biblioteca` con sesión ya activa. Si falla (link vencido o inválido), redirige a `/auth?error=confirmacion-invalida`.
- `app/auth/page.tsx`: tras un `signUp` exitoso, en vez de redirigir a `/biblioteca` (ya no hay sesión activa hasta confirmar), el tab CREAR CUENTA muestra un mensaje inline "Revisá tu correo para activar la cuenta" y un botón "Reenviar correo".
- Botón "Reenviar correo" llama a una nueva función `resendConfirmation(email)` en `lib/user-context.tsx`, que envuelve `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`.
- Tab INICIAR SESIÓN: si Supabase rechaza el login con "Email not confirmed", se traduce a un mensaje en español ("Confirmá tu email antes de iniciar sesión") mostrado con la clase `.error` ya existente.
- `/auth` lee el query param `?error=confirmacion-invalida` (seteado por el callback) y muestra un mensaje inline si el link de confirmación falló.

**Out of scope (para specs futuros):**

- Dominio de email custom / plantilla de correo propia — se usa el remitente y template por defecto de Supabase.
- Recuperación de contraseña.
- Protección de rutas (gating) de `/juego/[id]/jugar` y `/salon`.
- Login social (Google/GitHub).
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no crea tablas ni campos nuevos. Reutiliza `auth.users` de Supabase: el campo `email_confirmed_at` (gestionado internamente por Supabase Auth) pasa a ser relevante recién ahora, pero no se lee ni escribe manualmente desde la app — Supabase lo usa para decidir si `signInWithPassword` acepta la sesión.

---

## Plan de implementación

1. Reactivar "Confirm email" en Authentication → Settings del proyecto Supabase (paso manual, sin tooling de MCP para esto — igual que su desactivación en SPEC 04).
2. En `lib/user-context.tsx`, agregar `options: { emailRedirectTo: `${window.location.origin}/auth/callback` }` a la llamada `supabase.auth.signUp(...)`.
3. Crear `app/auth/callback/route.ts`: lee `code` de `request.url`, usa `createClient()` de `lib/supabase/server.ts`, llama `exchangeCodeForSession(code)`, y redirige a `/biblioteca` (éxito) o `/auth?error=confirmacion-invalida` (falla).
4. Agregar `resendConfirmation(email)` a `lib/user-context.tsx` (`supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`) y exponerla en `UserContext`.
5. En `app/auth/page.tsx`: tras `signUp` exitoso sin sesión activa, mostrar el mensaje inline + botón "Reenviar correo" (llama a `resendConfirmation`, con feedback de "correo reenviado"). Mapear el error "Email not confirmed" del login a texto en español. Leer `?error=confirmacion-invalida` de `useSearchParams` y mostrarlo con `.error`.
6. Verificación manual end-to-end: crear cuenta nueva → ya NO deja sesión activa → aparece mensaje inline "revisá tu correo" → revisar bandeja (y spam) → click en el link → redirige a `/biblioteca` ya logueado → cerrar sesión → intentar login con ese mismo email/contraseña antes de confirmar (probar con una cuenta nueva sin confirmar) muestra el error traducido → botón "reenviar correo" dispara un nuevo envío → forzar un `code` inválido en la URL del callback (editar el link a mano) confirma que redirige a `/auth?error=confirmacion-invalida` con el mensaje visible → "jugar como invitado" sigue funcionando sin tocar Supabase.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Crear una cuenta nueva ya no deja sesión activa de inmediato: se queda en `/auth` con el mensaje "Revisá tu correo para activar la cuenta".
- [ ] Hacer click en el link del correo de confirmación redirige a `/biblioteca` con la sesión ya activa (Nav muestra el username).
- [ ] Intentar iniciar sesión con una cuenta sin confirmar muestra el error traducido inline (`.error`), sin dejar loguear.
- [ ] El botón "Reenviar correo" dispara `supabase.auth.resend` y muestra confirmación visual de que se reenvió.
- [ ] Un link de confirmación inválido o vencido redirige a `/auth?error=confirmacion-invalida` mostrando el mensaje, sin romper la app.
- [ ] "Jugar como invitado" sigue funcionando exactamente igual, sin llamar a Supabase.
- [ ] `Nav`, `game-player` y `app/salon/page.tsx` no cambian: siguen usando `useUser()` con la misma interfaz base (`user`, `login`, `guest`, `signOut`), solo se agrega `resendConfirmation` como método adicional opcional.
- [ ] No se crea ninguna tabla nueva en la base de datos de Supabase.

---

## Decisiones

- **Sí:** mensaje inline en `/auth` en vez de una pantalla dedicada nueva. Menos superficie de código, coherente con cómo ya se manejan los errores de SPEC 03/04.
- **Sí:** redirect directo a `/biblioteca` con sesión activa tras confirmar. Mantiene el flujo lo más parecido posible al "instantáneo" que tenía el signup antes de este spec.
- **Sí:** agregar botón de reenvío. Sin esto, un correo perdido o un link vencido deja al usuario sin salida dentro de la app.
- **No:** dominio de email / plantilla custom. Usa el remitente por defecto de Supabase; suficiente para este MVP, cambia el costo/riesgo de spam pero no bloquea el flujo.
- **No:** tabla `profiles` ni cambios al modelo de datos. `email_confirmed_at` lo gestiona Supabase internamente, no hace falta espejarlo en la app.

---

## Riesgos

| Riesgo                                                                                                      | Mitigación                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| El correo de confirmación (remitente por defecto de Supabase) puede caer en spam                            | Aceptado como trade-off de MVP; el botón de reenvío da una segunda oportunidad sin cambiar de flujo                  |
| El link de confirmación vence (24h por defecto en Supabase) y el usuario queda con una cuenta a medio crear | El botón "Reenviar correo" genera un link nuevo; el callback maneja el caso de código inválido sin romper la app     |
| Reactivar "Confirm email" es un cambio de configuración manual en el dashboard, no versionado en código     | Documentado explícitamente en el plan de implementación para que cualquiera que reconstruya el proyecto sepa hacerlo |

---

## Qué **no** está en este spec

- Dominio de email custom o plantilla de correo propia.
- Recuperación de contraseña.
- Protección de rutas (gating) según sesión.
- Login social (Google/GitHub).
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
