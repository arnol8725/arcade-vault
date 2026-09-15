# SPEC 15 — Login social con Google y GitHub

> **Status:** Approved
> **Depends on:** SPEC 04
> **Date:** 2026-09-14
> **Objective:** Wirear los botones GOOGLE y GITHUB de `/auth` (hoy decorativos) a `supabase.auth.signInWithOAuth` para que un usuario pueda registrarse o iniciar sesión con su cuenta de Google o GitHub, reutilizando la sesión por cookies y la interfaz de `useUser()` que ya dejó SPEC 04.

---

## Alcance

**In:**

- Los dos botones sociales que ya existen visualmente en `app/auth/page.tsx` (GOOGLE, GITHUB) pasan a llamar a `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`. Sirven tanto para "crear cuenta" como para "iniciar sesión" — con OAuth es el mismo flujo, Supabase crea el usuario en `auth.users` si no existía.
- Nueva ruta `app/auth/callback/route.ts` (route handler de servidor) que recibe el `code` que devuelve el provider, lo canjea por sesión con `supabase.auth.exchangeCodeForSession(code)` (usa `lib/supabase/server.ts`, mismo cliente que ya existe) y redirige a `/biblioteca`, igual que el signup con email de SPEC 04.
- `lib/user-context.tsx`: la hidratación de `SessionUser.name` agrega un fallback para leer el nombre según qué metadata trae cada provider, sin romper el caso de email/contraseña. Orden: `user_metadata.name` → `user_metadata.full_name` (Google) → `user_metadata.user_name` (GitHub) → prefijo del email antes del `@` (fallback final si el provider no entrega nombre).
- Manejo de error: si el usuario cancela el flujo OAuth (denegado en la pantalla del provider) o Supabase devuelve error en el callback, se redirige de vuelta a `/auth` con un mensaje mostrado inline con la clase `.error` ya existente (SPEC 03), sin romper lo que haya tipeado en los tabs de email/contraseña.
- Auto-vinculación por email: si un email ya tiene cuenta creada con contraseña (SPEC 04) y esa persona entra luego con Google o GitHub usando el mismo email, Supabase vincula la nueva identidad OAuth a la cuenta existente automáticamente (funciona porque "Confirm email" ya quedó desactivado en SPEC 04). No se agrega lógica propia de detección de duplicados.
- Verificar en el dashboard de Supabase (Authentication → Providers) que Google y GitHub estén habilitados con el Client ID/Secret ya cargados por el usuario (dato confirmado: las OAuth Apps ya existen), y que la Redirect URL configurada en cada provider apunte a `<url-del-proyecto>/auth/callback`.

**Out of scope (para specs futuros):**

- Crear las OAuth Apps en Google Cloud Console / GitHub Developer Settings — ya están creadas, no es parte de este spec.
- Tabla `profiles` en la base de datos — se sigue usando `user_metadata` de `auth.users`, sin tabla propia, igual que SPEC 04.
- Pantalla de "completar perfil" post-login OAuth para elegir username manualmente — se descartó, el nombre sale directo del provider.
- Bloqueo o detección manual de cuentas duplicadas por email — se delega 100% en el comportamiento nativo de Supabase.
- Recuperación de contraseña, confirmación de email, protección de rutas (gating) — siguen fuera de alcance, como ya lo dejó SPEC 04.
- Otros providers sociales (Discord, Twitter/X, etc.) — no fueron pedidos.
- Desvincular una identidad social ya conectada desde el perfil del usuario — no existe pantalla de perfil hoy.

---

## Modelo de datos

Este spec no crea tablas nuevas. Sigue usando `auth.users` de Supabase Auth. No cambia la forma de `SessionUser`:

```ts
// lib/user-context.tsx
export interface SessionUser {
  name: string; // ahora puede originarse en user_metadata.name, .full_name, .user_name, o el prefijo del email
}
```

---

## Plan de implementación

1. Verificar en el dashboard de Supabase que los providers Google y GitHub estén habilitados en Authentication → Providers, con Client ID/Secret cargados y la Redirect URL de cada uno apuntando a `<url-del-proyecto>/auth/callback`. Paso manual, sin código.
2. Crear `app/auth/callback/route.ts`: recibe `code` por query string, usa `lib/supabase/server.ts` para `exchangeCodeForSession(code)`, y hace `redirect('/biblioteca')` en éxito o `redirect('/auth?error=oauth')` si falla el canje.
3. En `app/auth/page.tsx`, agregar `onClick` a los botones GOOGLE y GITHUB: cada uno llama a `supabase.auth.signInWithOAuth({ provider: 'google' | 'github', options: { redirectTo: `${window.location.origin}/auth/callback` } })`. Leer `?error=oauth` de la URL al montar la página para mostrar el mensaje inline con `.error` si viene presente.
4. Actualizar `lib/user-context.tsx`: al hidratar `SessionUser` desde `supabase.auth.getSession()` / `onAuthStateChange`, resolver `name` con el fallback `user_metadata.name → user_metadata.full_name → user_metadata.user_name → email.split('@')[0]`.
5. Verificación manual end-to-end: click en GOOGLE desde `/auth` → completar el consentimiento → vuelve a la app logueado y redirigido a `/biblioteca` → Nav muestra el nombre correcto → repetir con GITHUB → cerrar sesión y volver a entrar con el mismo provider funciona → cancelar el consentimiento de Google a mitad de camino vuelve a `/auth` con el error inline sin romper nada → crear cuenta con email+contraseña usando un email, cerrar sesión, entrar con Google usando el mismo email → queda logueado en la misma cuenta (mismo `id` de `auth.users`, se ve el mismo historial si ya hubiera scores) → "jugar como invitado" sigue sin tocar Supabase.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] Click en el botón GOOGLE desde `/auth` inicia el flujo OAuth y, tras aceptar, deja la sesión activa y redirige a `/biblioteca`.
- [ ] Click en el botón GITHUB desde `/auth` hace lo mismo con GitHub.
- [ ] El nombre mostrado en `Nav` tras un login social sale del provider (nombre de Google o username de GitHub), no queda vacío ni dice "undefined".
- [ ] Cancelar el consentimiento en la pantalla del provider redirige de vuelta a `/auth` mostrando un error inline con la clase `.error`, sin perder lo tipeado en los tabs de email/contraseña.
- [ ] Un email que ya tiene cuenta con contraseña (SPEC 04) y luego inicia sesión con Google/GitHub usando ese mismo email queda vinculado a la misma cuenta (mismo `id` de usuario), no crea una cuenta duplicada.
- [ ] Recargar la página con una sesión OAuth activa no desloguea al usuario (persiste por cookies, igual que SPEC 04).
- [ ] "Jugar como invitado" sigue funcionando exactamente igual, sin llamar a Supabase.
- [ ] No se crea ninguna tabla nueva en la base de datos de Supabase.
- [ ] `Nav`, `game-player` y `app/salon/page.tsx` no cambian: `useUser()` mantiene la misma interfaz (`user`, `login`, `guest`, `signOut`).

---

## Decisiones

- **Sí:** reutilizar `lib/supabase/client.ts` y `lib/supabase/server.ts` de SPEC 04 tal cual, sin crear clientes nuevos para OAuth.
- **Sí:** ruta de callback como route handler de servidor (`app/auth/callback/route.ts`) con `exchangeCodeForSession`. Es el patrón estándar de `@supabase/ssr` para PKCE flow — necesita correr en servidor porque escribe la cookie de sesión.
- **Sí:** auto-vinculación de identidades por email, delegada 100% a Supabase. Evita construir lógica propia de "¿este email ya existe?" y es consistente con que "Confirm email" ya está desactivado desde SPEC 04.
- **Sí:** fallback en cadena para el nombre (`name` → `full_name` → `user_name` → prefijo de email) en vez de pedir username manual post-login. Cero pantallas nuevas, cero estado de "perfil incompleto" que mantener.
- **No:** tabla `profiles`. Mismo motivo que SPEC 04 — no hace falta todavía.
- **No:** pantalla de "completar perfil" tras el primer login social. Fue evaluado y descartado: agrega un flujo y un estado nuevo sin necesidad confirmada.
- **No:** crear las OAuth Apps de Google/GitHub desde este spec — ya existen, confirmado por el usuario.
- **No:** bloquear el login social si el email ya existe con otro método. Se prioriza cero fricción para el usuario sobre protección extra contra account-takeover, mismo criterio de riesgo aceptado que SPEC 04 con "Confirm email" desactivado.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| GitHub puede tener el email del usuario marcado como privado, y Supabase no recibe el email en la identidad OAuth | Habilitar el scope `user:email` en la configuración del provider GitHub dentro de Supabase Dashboard (paso de configuración, no de código) |
| Redirect URL mal configurada en Google Cloud Console / GitHub OAuth App (no apunta a `/auth/callback` del dominio correcto) rompe el canje de `code` por sesión | Paso 1 del plan de implementación verifica explícitamente esta configuración antes de tocar código |
| Auto-vinculación por email sin verificación adicional permite que alguien con acceso a un email ajeno (pero no a su contraseña) tome esa cuenta iniciando sesión OAuth con ese email | Aceptado como el mismo trade-off que SPEC 04 tomó con "Confirm email" desactivado; mitigar esto requeriría reactivar confirmación de email, fuera de alcance de este spec |
| `onAuthStateChange` en `lib/user-context.tsx` corre en cliente; si el fallback de nombre no contempla algún formato de metadata que devuelva un provider, `Nav` podría mostrar un nombre vacío | El fallback termina siempre en `email.split('@')[0]`, que existe en el 100% de los casos porque Supabase siempre entrega `email` en la sesión |

---

## Qué **no** está en este spec

- Crear las OAuth Apps de Google/GitHub (ya existen).
- Tabla `profiles` u otra tabla nueva en la base de datos.
- Pantalla de completar perfil post-login social.
- Bloqueo manual de cuentas duplicadas por email.
- Recuperación de contraseña, confirmación de email, protección de rutas (gating).
- Otros providers sociales distintos de Google y GitHub.
- Desvincular una identidad social ya conectada.

Cada uno de estos, si se implementa, va en su propio spec.
