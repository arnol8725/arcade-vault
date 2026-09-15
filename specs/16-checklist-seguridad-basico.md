# SPEC 16 — Checklist de seguridad básico

> **Status:** Implemented
> **Depends on:** SPEC 04, SPEC 06, SPEC 07
> **Date:** 2026-09-15
> **Objective:** Cerrar las medidas de `references/security/segurity-checklist.md` (headers HTTP, hardening de Supabase Auth y revisión de advisors) para reducir la superficie de ataque básica del proyecto.

---

## Alcance

**In:**

- Headers de seguridad en `next.config.ts` aplicados a todas las rutas (`/(.*)`) vía `headers: async () => [...]`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. Exactamente los 3 del checklist, sin agregar HSTS, Permissions-Policy ni CSP.
- Supabase Auth (Authentication → Settings, proyecto `benxpdtvepdyoltawtzg`), paso manual en el dashboard:
  - **Minimum password length** = 8.
  - **Leaked password protection** = habilitado (verificado disponible en el plan actual — `mcp__supabase__get_advisors` ya lo reporta como advisor `auth_leaked_password_protection`, es decir, es un toggle activable, no un feature bloqueado por plan).
- Supabase Auth (Authentication → Rate Limits), paso manual: **Rate limit for sign ups** = 30 por hora.
- Migración SQL (vía `mcp__supabase__apply_migration`) que revoca `EXECUTE` de la función `public.rls_auto_enable()` a los roles `anon` y `authenticated`. Hallazgo detectado al correr `mcp__supabase__get_advisors(type: "security")` durante este spec (no estaba en el checklist original, pero se decidió incluirlo por ser un warning real de tipo SECURITY):
  - `anon_security_definer_function_executable`
  - `authenticated_security_definer_function_executable`
- Verificación final con `mcp__supabase__get_advisors(type: "security")`: confirmar que los 3 warnings de arriba (leaked password + las 2 de `rls_auto_enable`) ya no aparecen, y que RLS de `games`/`scores` sigue sin warnings (ya está OK hoy, confirmado en el baseline de este spec).

**Out of scope (para specs futuros):**

- `Content-Security-Policy` — requiere auditar todos los scripts/estilos inline del proyecto antes de poder escribir una política sin romper nada.
- `Strict-Transport-Security` y `Permissions-Policy` — no estaban en el checklist original, se descartaron explícitamente para este spec.
- Dominio de email custom / plantilla de correo propia (ya fuera de alcance en SPEC 15).
- Recuperación de contraseña, MFA/2FA, protección de rutas por sesión (gating).
- Revisión de advisors de tipo `performance` — este spec solo cubre `security`.
- WAF / protección a nivel de CDN o proxy (Cloudflare, etc.) — no hay uno configurado hoy.

---

## Modelo de datos

Este spec no crea tablas nuevas ni cambia el esquema de `games` o `scores`. La única escritura en base de datos es una migración de permisos (`REVOKE EXECUTE`) sobre una función ya existente:

```sql
-- migración: revocar ejecución pública de rls_auto_enable()
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
```

---

## Plan de implementación

1. Baseline: correr `mcp__supabase__get_advisors(type: "security")` y confirmar el estado de partida (ya hecho durante la definición de este spec) — RLS de `games`/`scores` OK, `auth_leaked_password_protection` en WARN, `rls_auto_enable()` ejecutable por `anon`/`authenticated` en WARN.
2. Agregar el array `securityHeaders` y la función `headers()` a `next.config.ts` con los 3 headers del checklist aplicados a `/(.*)`. Verificación manual: `npm run build` + `npm run dev`, inspeccionar los response headers de `/` en el navegador o con `curl -I`.
3. Aplicar la migración `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;` con `mcp__supabase__apply_migration`.
4. Paso manual en el dashboard de Supabase (Authentication → Settings): activar **Minimum password length = 8** y **Leaked password protection**.
5. Paso manual en el dashboard de Supabase (Authentication → Rate Limits): configurar **Rate limit for sign ups = 30 por hora**.
6. Verificación final: correr de nuevo `mcp__supabase__get_advisors(type: "security")` y confirmar que `auth_leaked_password_protection`, `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` ya no aparecen en la lista. Confirmar que signup/login (SPEC 04) y login social (SPEC 15) siguen funcionando sin cambios de comportamiento visibles para el usuario.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La respuesta HTTP de cualquier ruta (ej. `/`) incluye `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Supabase Auth tiene "Minimum password length" en 8 (intentar crear cuenta con contraseña de 6 caracteres falla con el mensaje de error de Supabase).
- [ ] Supabase Auth tiene "Leaked password protection" habilitado.
- [ ] Supabase Auth tiene el rate limit de sign ups configurado en 30 por hora.
- [ ] `mcp__supabase__get_advisors(type: "security")` ya no reporta `auth_leaked_password_protection`, `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [ ] RLS de `games` y `scores` sigue habilitado y sin warnings de advisors (regresión, no debería haber cambiado).
- [ ] Crear cuenta, iniciar sesión con email/contraseña (SPEC 04) y con Google/GitHub (SPEC 15) sigue funcionando igual que antes de este spec.
- [ ] "Jugar como invitado" sigue funcionando sin llamar a Supabase.

---

## Decisiones

- **Sí:** verificar cada setting de Auth con `mcp__supabase__get_advisors` en vez de confiar solo en el paso manual del dashboard — deja evidencia objetiva y verificable en los criterios de aceptación.
- **Sí:** tratar "Leaked password protection" como paso directo (no condicional) — el advisor la reporta como disponible para activar en el plan actual del proyecto, no aparece bloqueada por plan.
- **Sí:** 30 signups por hora como valor de rate limit — conservador para el tráfico actual del MVP, ajustable después desde el dashboard sin deploy.
- **Sí:** solo los 3 headers exactos del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) — alcance mínimo, sin inventar hardening adicional no pedido.
- **Sí:** incluir el fix de `rls_auto_enable()` aunque no estaba en el checklist original — apareció como warning real de seguridad al correr advisors (paso que el checklist sí pedía), y el usuario confirmó explícitamente incluirlo.
- **No:** `Content-Security-Policy` — necesitaría inventariar todos los scripts/estilos inline del proyecto primero; se descarta para no bloquear este spec con una auditoría más grande.
- **No:** `Strict-Transport-Security` / `Permissions-Policy` — el usuario eligió quedarse exactamente con los 3 headers del checklist.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Revocar `EXECUTE` de `rls_auto_enable()` a `anon`/`authenticated` podría romper algo si alguna parte de la app la invoca vía RPC en runtime | Se revisó el propósito de la función (auto-habilitar RLS, uso de mantenimiento/migración, no de runtime de la app) antes de revocar; el paso 6 del plan verifica que signup/login/juego sigan funcionando |
| Rate limit de 30 signups/hora podría bloquear registros legítimos en un pico de tráfico (ej. lanzamiento o campaña) | Es un valor ajustable desde el dashboard de Supabase sin necesidad de deploy de código |
| Los cambios de dashboard (password length, leaked password protection, rate limit) no quedan versionados en código | Documentados explícitamente en el plan de implementación de este spec para que cualquiera que reconstruya el proyecto sepa replicarlos |

---

## Qué **no** está en este spec

- `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.
- Dominio de email custom o plantilla de correo propia.
- Recuperación de contraseña, MFA/2FA.
- Protección de rutas por sesión (gating) de `/juego/[id]/jugar` y `/salon`.
- Revisión de advisors de tipo `performance`.
- WAF o protección a nivel de CDN/proxy.

Cada uno de estos, si se implementa, va en su propio spec.
