# SPEC 03 — Envío real de correo en el formulario de contacto (Resend)

> **Status:** Implementado
> **Depends on:** SPEC 02
> **Date:** 2026-09-05
> **Objective:** Conectar el formulario de contacto ya existente en `/acerca-de` (`components/about-contact-form.tsx`) a Resend mediante una Server Action, para que el envío dispare un correo real en vez de la simulación 100% visual definida en SPEC 02.

---

## Alcance

**In:**

- Instalar la dependencia `resend` y crear una Server Action (`lib/contact.ts`) que envíe el correo con el SDK de Resend.
- Modificar `components/about-contact-form.tsx` para: (a) agregar validación de formato de email (regex básico) además del chequeo de campos vacíos ya existente, (b) llamar a la Server Action al enviar, (c) mostrar un estado "ENVIANDO..." (botón deshabilitado) mientras se espera la respuesta, (d) mostrar la animación de terminal de éxito solo tras la confirmación real de Resend, (e) mostrar una línea de error dentro del mismo bloque de terminal si Resend falla, con botón "REINTENTAR" que vuelve al formulario sin borrar lo tipeado.
- `from`: `onboarding@resend.dev` (dominio sandbox de Resend, sin verificación de dominio propio). `to`: `CONTACT_TO_EMAIL` (variable de entorno) = `arnol87.peralta@gmail.com`, que debe coincidir con el email de la cuenta de Resend usada (limitación del modo sandbox). `reply-to`: el email que la persona cargó en el formulario.
- Crear `.env.example` commiteado con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` como placeholders vacíos, y agregar `!.env.example` al `.gitignore` (el patrón `.env*` ya existente lo ignora por defecto).
- Agregar la regla CSS `.term-body .error` a `app/globals.css`, análoga a `.term-body .success` pero con `var(--magenta)`.

**Out of scope (para specs futuros):**

- Persistencia de los mensajes (archivo, base de datos, tabla) — el correo es el único registro, igual que decidido en SPEC 02.
- Protección anti-spam (honeypot, captcha, rate limiting).
- Dominio propio verificado en Resend (reemplazar `onboarding@resend.dev`).
- Plantillas de correo con HTML/branding — el email sale en texto plano.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no introduce entidades persistentes. Se agrega un tipo de retorno para la Server Action, sin almacenamiento:

```ts
// lib/contact.ts
type ContactInput = { name: string; email: string; msg: string };
type ContactResult = { ok: true } | { ok: false; error: string };
```

El estado del formulario (`sent`, `sending`, `error`, `shake`) vive solo en memoria del componente, como ya definía SPEC 02 — no se guarda en `localStorage` ni en red más allá del envío a Resend.

---

## Plan de implementación

1. `npm install resend` — agrega `resend` a `dependencies` en `package.json`.
2. Crear `.env.example` en la raíz con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` (valores vacíos, con un comentario arriba de `CONTACT_TO_EMAIL` aclarando que debe coincidir con el email de la cuenta de Resend mientras se use el dominio sandbox). Agregar `!.env.example` en `.gitignore` justo debajo de la línea `.env*`, y confirmar con `git status` que `.env.example` queda como untracked-para-commit y que un futuro `.env.local` no aparece.
3. Crear `lib/contact.ts` con `"use server"` al inicio: `sendContactMessage(input: ContactInput): Promise<ContactResult>` que instancia `new Resend(process.env.RESEND_API_KEY)` y llama a `resend.emails.send({ from: "Arcade Vault <onboarding@resend.dev>", to: process.env.CONTACT_TO_EMAIL!, replyTo: input.email, subject: \`Nuevo mensaje de ${input.name} — Arcade Vault\`, text: ... })` dentro de un `try/catch`, devolviendo `{ ok: false, error }` ante cualquier excepción o error reportado por el SDK.
4. Modificar `components/about-contact-form.tsx`: sumar validación de formato de email (regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`) al mismo `if` que hoy solo chequea campos vacíos, disparando el mismo `shake`.
5. Convertir `onSubmit` en `async`: agregar estados `sending` (boolean) y `error` (string | null); al pasar validación, poner `sending = true`, llamar `await sendContactMessage(form)`, y según el resultado setear `sent` (éxito) o `error` (falla) sin borrar `form`; siempre apagar `sending` al terminar.
6. Actualizar el JSX: botón muestra "ENVIANDO..." y `disabled` mientras `sending`; si `error` está seteado (y no hay `sent`), renderizar el mismo bloque `.terminal-success` con una línea `.error` (ej. `[ERROR] TRANSMISIÓN FALLIDA — verificar conexión.`) en vez de la línea `.success`, con un botón "REINTENTAR" que limpia `error` y vuelve a mostrar el formulario con los valores intactos.
7. Agregar `.term-body .error { color: var(--magenta); text-shadow: 0 0 6px rgba(255,0,110,0.45); font-weight: 700; }` al final de `app/globals.css`.
8. Verificación manual end-to-end: completar el formulario en `/acerca-de` con datos válidos y confirmar que llega un correo real a `arnol87.peralta@gmail.com`; probar envío vacío (shake, sin llamada a Resend); probar email mal formado como `"test"` (shake); invalidar temporalmente `RESEND_API_KEY` en `.env.local` y confirmar que se renderiza la línea de error con "REINTENTAR" preservando lo tipeado.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `resend` figura en `dependencies` de `package.json`.
- [ ] `.env.example` existe en el repo, está commiteado (no ignorado por `.gitignore`) y contiene `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` vacíos.
- [ ] Enviar el formulario completo y válido en `/acerca-de` dispara un correo real, recibido en `CONTACT_TO_EMAIL` vía Resend.
- [ ] Enviar con campos vacíos dispara el shake y no llama a la Server Action.
- [ ] Enviar con un email sin formato válido (ej. `"test"`) dispara el shake y no llama a la Server Action.
- [ ] Mientras se espera la respuesta de Resend, el botón muestra "ENVIANDO..." y está deshabilitado.
- [ ] Si Resend falla, se muestra una línea de error dentro del bloque de terminal y un botón "REINTENTAR" que vuelve al formulario sin borrar los valores tipeados.
- [ ] No se persiste ningún mensaje en `localStorage`, archivo ni base de datos — el único efecto es el correo enviado.
- [ ] `RESEND_API_KEY` real vive únicamente en `.env.local` (gitignorado), nunca en el código fuente ni en `.env.example`.

---

## Decisiones

- **Sí:** Server Action (`lib/contact.ts`) en vez de Route Handler. Es el patrón idiomático de App Router para una mutación simple como esta, y evita mantener validación duplicada entre un endpoint y el cliente.
- **Sí:** `from = onboarding@resend.dev` (sandbox de Resend), sin dominio propio verificado. No hay dominio de Arcade Vault configurado en Resend; el sandbox alcanza porque el destino es la misma cuenta de Resend del usuario.
- **Sí:** `reply-to` = email cargado en el formulario. Permite responder directo desde el cliente de correo sin copiar el email del cuerpo del mensaje.
- **Sí:** sin persistencia de mensajes. Mantiene la decisión ya tomada en SPEC 02 de no meter backend de guardado — el correo es el único registro.
- **Sí:** la animación de terminal se muestra recién tras la confirmación real de Resend, sin revelar líneas falsas sincronizadas con el tiempo de espera. Es más simple y no simula un progreso que no refleja el estado real de la petición.
- **Sí:** `.env.example` commiteado con placeholders vacíos; `.env.local` (gitignorado) con los valores reales. Patrón estándar de Next.js para no filtrar secretos en el repo.
- **No:** agregar protección anti-spam (honeypot, captcha, rate limiting). No fue pedido y el volumen esperado no lo justifica todavía — si se vuelve necesario, es su propio spec.
- **No:** agregar validación de email más estricta que un regex básico (ej. verificación de DNS/MX). Fuera de proporción para un formulario de contacto.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El modo sandbox de Resend solo entrega al email de la cuenta registrada — si `CONTACT_TO_EMAIL` no coincide con esa cuenta, el envío falla silenciosamente o con error de Resend | Confirmado con el usuario que `CONTACT_TO_EMAIL = arnol87.peralta@gmail.com` es la cuenta de Resend; se documenta con un comentario en `.env.example` |
| `.env.example` queda ignorado igual si la negación en `.gitignore` está mal ubicada respecto al patrón `.env*` | Verificar con `git status` tras el paso 2 que `.env.example` aparece listo para commit y que ningún `.env.local` aparece en el listado |

---

## Qué **no** está en este spec

- Persistencia de los mensajes de contacto.
- Protección anti-spam (honeypot, captcha, rate limiting).
- Dominio propio verificado en Resend.
- Plantillas de correo con HTML/branding.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
