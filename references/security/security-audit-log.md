# Auditorías de seguridad — Estado

> Mantenido por el agente `security-auditor`. No editar manualmente sin avisar al agente.

## Historial de auditorías

| Fecha      | Área auditada                                                          | Hallazgo(s)                                                                                                                                                                              | Spec generado                                    | Estado del spec |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------- |
| 2026-09-16 | Flujo de auth (`proxy.ts`, `lib/supabase/{client,server}.ts`, `lib/user-context.tsx`, `app/auth/page.tsx`, `app/auth/callback/route.ts`, RLS de `scores`) | (1) `auth_leaked_password_protection` vuelve a WARN en advisors — regresión respecto a SPEC 16, que lo había marcado `Implemented`. (2) `app/auth/page.tsx:9` `MIN_PASSWORD_LENGTH = 6`, inconsistente con el mínimo de 8 que SPEC 16 fijó en el dashboard. Resto del flujo (proxy, clientes Supabase, RLS de `scores`/`games`, grants de `rls_auto_enable()`, headers de `next.config.ts`, callback OAuth) sin hallazgos — evidencia: `pg_policies` sin escritura para `anon`, `routine_privileges` de `rls_auto_enable` solo para `postgres`/`service_role`, grep sin claves de servidor filtradas a cliente. | specs/17-regresion-password-security-auth.md      | Draft             |

Leyenda del estado del spec: `Draft` (pendiente de revisión humana) · `Approved` · `Implemented` · `—` (sin hallazgos)

## Recordatorios manuales pendientes (no verificables por MCP)

- [ ] Supabase Auth → Settings → Minimum password length = 8 (reconfirmar — el toggle hermano de leaked password protection se revirtió sin aviso)
- [ ] Supabase Auth → Settings → Leaked password protection = habilitado (confirmado REVERTIDO el 2026-09-16 — ver specs/17-regresion-password-security-auth.md)
- [ ] Supabase Auth → Rate Limits → Rate limit for sign ups = 30/hora (sin evidencia de regresión, pero no verificable por MCP — reconfirmar en el dashboard)

## Notas

- `specs/15-confirmacion-email-signup.md` sigue en `Approved` sin implementar en código: `lib/user-context.tsx` no tiene `emailRedirectTo` en `signUp` ni expone `resendConfirmation`. No es una regresión de seguridad, es trabajo pendiente de ese spec — no duplicar como hallazgo.
- `specs/15-login-social-google-github.md` (Google/GitHub OAuth) sí está implementado en código y funciona según lo documentado; su riesgo de auto-vinculación por email ya está aceptado explícitamente en la tabla de Riesgos de ese spec — no re-litigado en auditorías futuras salvo evidencia nueva.
