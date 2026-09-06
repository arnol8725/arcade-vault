# SPEC 02 — Home y Acerca de: nueva landing y reordenamiento de rutas

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-09-05
> **Objective:** Convertir `/` en la landing Home de `references/templates/home-about/`, mover la Biblioteca actual a `/biblioteca`, y agregar la pantalla Acerca de en `/acerca-de` con formulario de contacto solo visual, actualizando el Nav y todos los enlaces internos que asumían `/` como Biblioteca.

---

## Alcance

**In:**

- Pantalla Home en `/`: hero (silhouettes SVG decorativas, headline, CTAs), sección "¿Por qué Arcade Vault?" con feature cards (iconos GAMEPAD/FREE/TROPHY/ROCKET), sección "Juegos disponibles ahora" con 6 mini-cards de `GAMES` + CTA "ver todos", sección de stats, sección "Actividad en vivo" (ticker de últimas puntuaciones + top jugadores del día, datos hardcodeados como en el template), sección de precios (plan único gratis + FAQ) y CTA final. Animaciones scroll-reveal vía `IntersectionObserver`, portadas de `home.jsx`.
- Biblioteca actual (buscador + chips de categoría + grilla de `GameCard`) se muda de `app/page.tsx` a `app/biblioteca/page.tsx`, sin cambios de comportamiento — solo cambia la ruta.
- Pantalla Acerca de en `/acerca-de`: hero de misión, 3 highlights (HEART/BROWSER/PLANT), divisor animado y formulario de contacto (nombre/email/mensaje) que valida campos vacíos (shake) y al enviar muestra una animación de terminal falsa de éxito. 100% visual — sin backend, sin envío real, sin persistencia.
- Nav actualizado: agrega los links "Inicio" (`/`) y "Acerca de" (`/acerca-de`), reordena a Inicio / Biblioteca / Salón de la Fama / Acerca de, el link "Biblioteca" pasa a apuntar a `/biblioteca`, y `isActive` se extiende a las 5 rutas.
- CSS nuevo: los selectores de `references/templates/home-about/styles.css` que todavía no existen en `app/globals.css` (hero, secciones, feature-grid, mini-rail, stats, activity-grid, pricing-grid, about-hero, contact-grid, etc.) se agregan al final de `app/globals.css`.
- Actualización de los enlaces internos que asumían `/` = Biblioteca: botón "volver" en `components/game-detail.tsx`, `components/game-player.tsx` y `app/salon/page.tsx`, y el redirect post-login/invitado en `app/auth/page.tsx` — todos pasan a apuntar a `/biblioteca`.

**Out of scope (para specs futuros):**

- Envío real del formulario de contacto (backend, email, guardado de mensajes).
- Motor de juego real para cualquiera de los 8 juegos (ya fuera de alcance desde SPEC 01).
- Sistema de créditos/monedas funcional (sigue estático, decisión heredada de SPEC 01).
- Ticker de actividad en vivo real (websockets, datos derivados de partidas reales) — sigue siendo un array hardcodeado como en el template.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Modelo de datos

Este spec no introduce módulos de datos nuevos. El ticker de "actividad en vivo" y el top de jugadores de Home se portan **literales** (hardcodeados) desde `home.jsx`, tal como están en el template — no se derivan de `seededScores` ni de `lib/games.ts`. El formulario de contacto no persiste nada: su estado (`sent`, `shake`) vive solo en memoria del componente, igual que en `about.jsx`.

---

## Plan de implementación

1. Mover el contenido actual de `app/page.tsx` (Biblioteca) a `app/biblioteca/page.tsx` tal cual, sin tocar su lógica.
2. Actualizar `components/nav.tsx`: agregar link "Inicio" (`/`) y "Acerca de" (`/acerca-de`), reordenar a Inicio / Biblioteca / Salón de la Fama / Acerca de, apuntar el link "Biblioteca" a `/biblioteca`, y extender `isActive` a `"home" | "biblioteca" | "salon" | "auth" | "about"`.
3. Corregir los 4 puntos detectados que asumían `/` = Biblioteca: `href="/"` → `href="/biblioteca"` en `components/game-detail.tsx`, `components/game-player.tsx` y `app/salon/page.tsx`; `router.push("/")` → `router.push("/biblioteca")` (ambas ocurrencias) en `app/auth/page.tsx`.
4. Portar al final de `app/globals.css` los selectores de `references/templates/home-about/styles.css` que todavía no existen en el archivo (verificar ausencia con `rg` antes de pegar, para no duplicar nombres genéricos).
5. Crear `components/home-sections.tsx` con `FloatingSilhouettes`, `FeatureIcon` y `MiniCard`, portados de `home.jsx`.
6. Crear el nuevo `app/page.tsx`: pantalla Home completa (hero, "por qué", preview de 6 `MiniCard`, stats, actividad en vivo, precios, CTA final), como client component con el hook de scroll-reveal.
7. Crear `components/about-contact-form.tsx` con el formulario controlado (validación con shake, éxito de terminal falsa), portado de `about.jsx`.
8. Crear `app/acerca-de/page.tsx`: hero de misión, highlights, divisor animado y `<AboutContactForm />`.
9. Recorrido manual end-to-end: Home → Biblioteca → Detalle → Jugar → guardar puntaje → Salón (botón "volver" funciona) → Acerca de (enviar form vacío y completo) → Auth (login/invitado redirige a Biblioteca) → Nav resalta la ruta activa en las 6 pantallas.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `/` renderiza Home: hero con CTAs, sección "¿Por qué Arcade Vault?", 6 mini-cards de juegos, stats, actividad en vivo (ticker + top jugadores), precios con FAQ y CTA final.
- [ ] `/biblioteca` renderiza exactamente el comportamiento actual de la Biblioteca (buscador + chips + grilla + estado "NO HAY RESULTADOS").
- [ ] `/acerca-de` renderiza el hero de misión, los 3 highlights y el formulario de contacto.
- [ ] Enviar el formulario de contacto con campos vacíos dispara el shake y no lo envía.
- [ ] Enviar el formulario completo muestra la animación de terminal de éxito, sin persistir nada en `localStorage` ni en red.
- [ ] El Nav muestra 4 links (Inicio, Biblioteca, Salón de la Fama, Acerca de) y resalta el activo según la ruta en las 6 pantallas (`/`, `/biblioteca`, `/juego/[id]`, `/juego/[id]/jugar`, `/salon`, `/acerca-de`).
- [ ] El botón "volver" en Detalle, Jugador y Salón navega a `/biblioteca`.
- [ ] Iniciar sesión o "jugar como invitado" en `/auth` redirige a `/biblioteca`.
- [ ] Las animaciones scroll-reveal (`.reveal` / `.in`) se activan en Home y Acerca de al hacer scroll.
- [ ] Los CTA de Home ("EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS", "INSERTAR MONEDA") navegan a `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/auth`.

---

## Decisiones

- **Sí:** Home pasa a ocupar `/`, Biblioteca se muda a `/biblioteca`. `nav.jsx` del template ya trae "Inicio" y "Biblioteca" como rutas raíz distintas — matchea la intención de tener una landing separada del catálogo.
- **No:** dejar Biblioteca en `/` y meter Home en otra ruta (ej. `/inicio`). Dejaría dos "home" confusas y el logo del Nav (que siempre apunta a `/`) no llevaría a la landing real.
- **Sí:** slug `/acerca-de` en vez de `/about`. Coherente con el copy en español y con los slugs ya usados (`/juego`, `/salon`).
- **Sí:** tras login o "jugar como invitado" en `/auth`, redirigir a `/biblioteca` y no a `/`. Mantiene el comportamiento actual de llevar al jugador directo al catálogo, en vez de a la landing que ya vio antes de autenticarse.
- **Sí:** el CSS nuevo se agrega al final de `app/globals.css`, no en un archivo separado. Mantiene el patrón de un único stylesheet ya establecido en SPEC 01.
- **Sí:** formulario de contacto 100% visual, sin backend ni `localStorage`. Mismo criterio que el auth mock de SPEC 01 — es un MVP visual.
- **Sí:** los datos del ticker de actividad y del top de jugadores de Home se portan literales (hardcodeados) como en `home.jsx`, sin derivarlos de `seededScores`. Son decorativos y ya vienen fijos en el template; derivarlos agregaría complejidad no pedida.
- **No:** unificar Home y Biblioteca en una sola pantalla. El template las separa a propósito — landing de marketing vs. catálogo funcional.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Mover Biblioteca de `/` a `/biblioteca` rompe algún link/redirect no detectado que todavía asuma `/` = catálogo | El paso 3 del plan lista los 4 puntos ya detectados por `rg`; correr `rg 'href="/"'` de nuevo tras el cambio como chequeo final |
| Portar `styles.css` puede duplicar selectores genéricos (ej. `.stat-`, `.top-`) que ya existan con otro significado en `globals.css` | Revisar con `rg` contra `globals.css` antes de pegar cada bloque, agregando solo los selectores realmente ausentes |

---

## Qué **no** está en este spec

- Envío real del formulario de contacto (backend, email, guardado de mensajes).
- Motor de juego real para ninguno de los 8 juegos.
- Sistema de créditos/monedas funcional.
- Ticker de actividad en vivo real.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
