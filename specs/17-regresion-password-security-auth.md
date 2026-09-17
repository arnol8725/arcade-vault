# SPEC 17 — Regresión en password security del flujo de auth

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 15 (login-social-google-github), SPEC 16
> **Date:** 2026-09-16
> **Objective:** Corregir una regresión detectada en auditoría de seguridad enfocada en autenticación: el advisor `auth_leaked_password_protection` que SPEC 16 dejó documentado como resuelto vuelve a aparecer en WARN, y el largo mínimo de contraseña validado en el cliente (`app/auth/page.tsx`) no coincide con el mínimo de 8 caracteres que SPEC 16 fijó como criterio de aceptación.

---

## Alcance

**In:**

- `app/auth/page.tsx`: subir `MIN_PASSWORD_LENGTH` de `6` a `8` para que la validación de cliente sea consistente con el mínimo de contraseña que SPEC 16 fijó en el dashboard de Supabase Auth. Hoy el usuario puede escribir una contraseña de 6 o 7 caracteres, pasar la validación de cliente (`invalid()`), y recién enterarse del rechazo — si el mínimo del dashboard sigue activo — en la respuesta de Supabase. Si el mínimo del dashboard no está activo (ver punto siguiente), no hay ninguna barrera.
- Paso manual en el dashboard de Supabase (Authentication → Settings), proyecto `benxpdtvepdyoltawtzg`: volver a habilitar **Leaked password protection**. `mcp__supabase__get_advisors(type: "security")` corrido el 2026-09-16 muestra el advisor `auth_leaked_password_protection` en WARN — el mismo advisor que SPEC 16 marcó como resuelto (`Implemented`) el 2026-09-15. Es una regresión de configuración, no un hallazgo nuevo de código: alguien desactivó el toggle después de SPEC 16, o el cambio nunca llegó a persistir en el dashboard.
- Paso manual en el dashboard de Supabase (Authentication → Settings): reconfirmar que **Minimum password length** sigue en 8. No es verificable por `mcp__supabase__get_advisors` ni por ninguna otra tool de MCP — se agrega como paso explícito de este spec porque el toggle hermano (leaked password protection) sí se revirtió, así que no hay que asumir que este otro se mantuvo.
- Verificación final: correr de nuevo `mcp__supabase__get_advisors(type: "security")` y confirmar que `auth_leaked_password_protection` ya no aparece.

**Out of scope (para specs futuros):**

- `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy` — mismo descarte explícito que SPEC 16.
- Reconfigurar el rate limit de sign ups (30/hora) — no hay evidencia de que se haya revertido; se recuerda como paso manual pendiente de confirmar en el reporte final de la auditoría, pero no se incluye como hallazgo de este spec porque no hay evidencia concreta que lo respalde.
- El flujo completo de confirmación de email (`resendConfirmation`, `emailRedirectTo` en `signUp`, manejo de `?error=confirmacion-invalida`) descrito en `specs/15-confirmacion-email-signup.md` — ese spec sigue en estado `Approved` y su código no está implementado hoy (`lib/user-context.tsx` no tiene `emailRedirectTo` en la llamada a `signUp` ni expone `resendConfirmation`). Es trabajo pendiente de ESE spec, no una regresión de seguridad de este.
- El riesgo de auto-vinculación de cuentas por email en login social (Google/GitHub) — ya está identificado y aceptado explícitamente en la tabla de Riesgos de `specs/15-login-social-google-github.md`; no se re-abre acá.
- Cambios a `proxy.ts`, `lib/supabase/client.ts` o `lib/supabase/server.ts` — se revisaron en esta auditoría y no presentan hallazgos (ver sección de verificación de este spec).
- RLS de `scores`/`games` y los grants de `rls_auto_enable()` — se revisaron y siguen correctos (sin política de escritura para `anon`, `EXECUTE` de `rls_auto_enable()` sigue revocado de `anon`/`authenticated`); no requieren cambios.

---

## Modelo de datos

Este spec no crea tablas ni cambia el esquema de `games` o `scores`. No hay migración SQL: el único cambio de "config" ocurre en el dashboard de Supabase Auth (no versionable en código), y el único cambio de código es una constante en `app/auth/page.tsx`.

```ts
// app/auth/page.tsx
const MIN_PASSWORD_LENGTH = 8; // antes: 6
```

---

## Plan de implementación

1. Baseline (ya corrido durante esta auditoría, 2026-09-16):
   - `mcp__supabase__get_advisors(type: "security")` → único resultado: `auth_leaked_password_protection` en WARN.
   - `pg_policies` sobre `public.games`/`public.scores` → sin policies de escritura para `anon`; `scores` solo tiene `INSERT` para `authenticated` con `auth.uid() = user_id`, sin `UPDATE`/`DELETE`. Sin cambios respecto a SPEC 07.
   - `information_schema.routine_privileges` sobre `public.rls_auto_enable` → `EXECUTE` solo para `postgres` y `service_role`; el `REVOKE` de SPEC 16 sigue vigente, sin regresión.
   - Grep de `SUPABASE_SERVICE_ROLE`/`SUPABASE_BD_PASSWORD` fuera de archivos de servidor → sin coincidencias en código de cliente.
2. Cambiar `MIN_PASSWORD_LENGTH` de `6` a `8` en `app/auth/page.tsx`.
3. Paso manual en el dashboard de Supabase (Authentication → Settings): volver a activar **Leaked password protection**.
4. Paso manual en el dashboard de Supabase (Authentication → Settings): confirmar que **Minimum password length** sigue en 8 (si no, volver a fijarlo).
5. Verificación final: correr de nuevo `mcp__supabase__get_advisors(type: "security")` y confirmar que la lista de advisors queda vacía. Probar en `/auth`, tab CREAR CUENTA, que una contraseña de 7 caracteres dispare el `shake`/bloqueo de cliente (ya no pasa la validación de `invalid()`), y que si se fuerza el envío directo a Supabase con una contraseña corta, la API la rechace.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `app/auth/page.tsx` usa `MIN_PASSWORD_LENGTH = 8`.
- [ ] En el tab CREAR CUENTA de `/auth`, escribir una contraseña de 7 caracteres o menos dispara el bloqueo de validación de cliente (shake), no permite enviar el formulario.
- [ ] Supabase Auth tiene "Leaked password protection" habilitado (confirmado por `mcp__supabase__get_advisors(type: "security")` sin reportar `auth_leaked_password_protection`).
- [ ] Supabase Auth tiene "Minimum password length" confirmado en 8.
- [ ] `mcp__supabase__get_advisors(type: "security")` no reporta ningún warning tras el fix.
- [ ] RLS de `games`/`scores` y los grants de `rls_auto_enable()` siguen sin cambios (regresión, no debería haber variado — ya verificado en el baseline de este spec).
- [ ] Crear cuenta, iniciar sesión con email/contraseña y con Google/GitHub sigue funcionando igual que antes de este spec.
- [ ] "Jugar como invitado" sigue funcionando sin llamar a Supabase.

---

## Decisiones

- **Sí:** tratar el retorno del advisor `auth_leaked_password_protection` como una regresión de configuración, no como un hallazgo nuevo — ya fue diagnosticado y "cerrado" por SPEC 16, y el fix (activar el toggle) es el mismo.
- **Sí:** subir `MIN_PASSWORD_LENGTH` en el cliente de 6 a 8 aunque el enforcement real vive en Supabase — evita que el usuario llene el formulario, lo envíe, y recién ahí se entere del rechazo; y evita depender 100% de que el toggle del dashboard esté realmente activo en todo momento.
- **Sí:** incluir la reconfirmación manual de "Minimum password length" aunque no hay advisor que lo reporte — el toggle hermano (leaked password protection) se revirtió sin que nadie lo notara hasta esta auditoría, así que no hay que asumir que el otro se mantuvo.
- **No:** re-abrir el rate limit de sign ups (30/hora) como hallazgo de este spec — no hay evidencia verificable de que se haya revertido; se deja como recordatorio manual en el reporte de la auditoría, no como acción de este spec.
- **No:** tocar el flujo de confirmación de email (`specs/15-confirmacion-email-signup.md`) — ese spec sigue `Approved` sin implementar, es trabajo pendiente propio, no una regresión.
- **No:** re-litigar el riesgo de auto-vinculación por email del login social — ya está aceptado explícitamente en `specs/15-login-social-google-github.md`.

---

## Riesgos

| Riesgo                                                                                                                                                                                     | Mitigación                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El toggle de "Leaked password protection" se puede volver a desactivar sin que nadie lo note, igual que ocurrió entre SPEC 16 y esta auditoría                                             | Los cambios de dashboard no son versionables en código; la única mitigación real es correr `mcp__supabase__get_advisors(type: "security")` periódicamente (rol de este agente) |
| Subir el mínimo de cliente a 8 sin que el dashboard realmente lo exija deja una falsa sensación de seguridad si alguien llama a la API de Supabase directamente (bypaseando el formulario) | El paso 4 del plan reconfirma el valor del dashboard, que es la barrera real; el cliente es solo UX                                                                            |
| No hay forma de saber por qué se revirtió el toggle (cambio manual, reset de plan, etc.)                                                                                                   | Fuera de alcance de este spec diagnosticar la causa; se documenta el hecho y el fix, no la causa raíz                                                                          |

---

## Qué **no** está en este spec

- `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.
- Rate limit de sign ups (sin evidencia de regresión).
- Flujo de confirmación de email (`resendConfirmation`, `emailRedirectTo`, `?error=confirmacion-invalida`) — trabajo pendiente de `specs/15-confirmacion-email-signup.md`.
- Riesgo de auto-vinculación de cuentas por email en login social — ya aceptado en `specs/15-login-social-google-github.md`.
- Cambios a `proxy.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` — sin hallazgos en esta auditoría.
- RLS o grants de `games`/`scores`/`rls_auto_enable()` — sin hallazgos, siguen correctos.

Cada uno de estos, si se implementa o se detecta como regresión real, va en su propio spec.
