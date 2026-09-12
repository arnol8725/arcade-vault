# TODO — Sugerencias de juegos

> Memoria del agente `game-planner` (`.claude/agents/game-planner.md`). Se lee antes de
> proponer, para no repetir sugerencias, y se actualiza al final de cada corrida.
> Append-only: las entradas no se borran; lo único que cambia en una entrada vieja es su
> `Estado` (y su `Spec`, cuando ya existe).

Estados: `Pendiente` · `Aprobado` · `Implementado` · `Descartado`

## Estado

| #   | Fecha      | Juego                   | Slot destino                 | Categoría | Complejidad | Estado    | Spec |
| --- | ---------- | ----------------------- | ---------------------------- | --------- | ----------- | --------- | ---- |
| S01 | 2026-09-10 | INVASORES (`invasores`) | `invasores` (slot existente) | SHOOTER   | Media       | Pendiente | —    |
| S02 | 2026-09-10 | CAÍDA (`caida`) | `caida` (slot existente) | PUZZLE | Media | Pendiente | — |
| S03 | 2026-09-10 | GLOTÓN (`gloton`) | `gloton` (slot existente) | ARCADE | Alta | Pendiente | — |
| S04 | 2026-09-10 | RANARIA (`ranaria`) | `ranaria` (slot existente) | ARCADE | Media | Pendiente | — |
| S05 | 2026-09-10 | DUELO PIXEL (`duelo-pixel`) | `duelo-pixel` (slot existente) | VERSUS | Baja | Pendiente | — |
| S06 | 2026-09-10 | ANDAMIOS (`andamios`) | alta nueva en `games` | ARCADE | Media-Alta | Pendiente | — |
| S07 | 2026-09-10 | ESCUADRÓN (`escuadron`) | alta nueva en `games` | SHOOTER | Media | Pendiente | — |
| S08 | 2026-09-10 | GALERÍA (`galeria`) | alta nueva en `games` | SHOOTER | Baja | Pendiente | — |
| S09 | 2026-09-10 | CIUDADELA (`ciudadela`) | alta nueva en `games` | SHOOTER | Media | Pendiente | — |
| S10 | 2026-09-10 | BLINDADOS (`blindados`) | alta nueva en `games` | SHOOTER | Alta | Pendiente | — |
| S11 | 2026-09-10 | VÓRTICE (`vortice`) | alta nueva en `games` | SHOOTER | Media | Pendiente | — |
| S12 | 2026-09-10 | CRISTALES (`cristales`) | alta nueva en `games` | PUZZLE | Media | Pendiente | — |
| S13 | 2026-09-10 | CARGAMENTO (`cargamento`) | alta nueva en `games` | PUZZLE | Baja | Pendiente | — |
| S14 | 2026-09-10 | TUBERÍAS (`tuberias`) | alta nueva en `games` | PUZZLE | Media | Pendiente | — |
| S15 | 2026-09-10 | ZONA MINADA (`zona-minada`) | alta nueva en `games` | PUZZLE | Baja | Pendiente | — |
| S16 | 2026-09-10 | BURBUJAS (`burbujas`) | alta nueva en `games` | PUZZLE | Media-Alta | Pendiente | — |
| S17 | 2026-09-10 | PARÁBOLA (`parabola`) | alta nueva | VERSUS | Media | Pendiente | — |
| S18 | 2026-09-10 | DOMINIO (`dominio`) | alta nueva | VERSUS | Media | Pendiente | — |
| S19 | 2026-09-10 | DESCENSO (`descenso`) | alta nueva | ARCADE | Media-Baja | Pendiente | — |
| S20 | 2026-09-10 | TURBO (`turbo`) | alta nueva | ARCADE | Alta | Pendiente | — |
| S21 | 2026-09-10 | BRINCO (`brinco`) | alta nueva | ARCADE | Baja | Pendiente | — |

## Entradas

### S01 — INVASORES (`invasores`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Primera corrida:** el TODO estaba vacío, así que no hubo sugerencias previas que filtrar (Fase 2 sin descartes por memoria).
- **Slot:** `invasores` (decorativo existente) — `cat` SHOOTER, `color` green, `cover` cover-invaders, `sort_order` 5. El copy de la ficha ("Defiende el planeta de filas alienígenas") ya describe exactamente la mecánica propuesta: no hace falta migración ni corrección de textos.
- **Mecánica:** Space Invaders. Formación de 11×5 alienígenas que se desplaza en bloque, baja un escalón al tocar el borde y acelera a medida que quedan menos vivos. Cañón que se mueve sobre el eje horizontal inferior, 4 búnkeres destructibles por bloques, nave nodriza ocasional cruzando la fila superior. Derrota cuando la formación alcanza la línea del cañón o se agotan las vidas; al limpiar una oleada arranca la siguiente, más rápida y una fila más abajo.
- **Controles:** `←` `→` mover el cañón, `Espacio` disparar (un proyectil propio en vuelo por vez). `preventDefault()` en flechas y espacio para no scrollear la página anfitriona. Sin mouse.
- **Score:** entero monotónico creciente: 10 / 20 / 30 puntos según la fila del alien abatido, 50–300 por la nave nodriza. Nunca decrece, así que sirve tal cual para la tabla `scores` y para `/salon`.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de oleada), `onGameOver` (edge-triggered, una sola vez, tanto por invasión como por vidas agotadas).
- **Assets:** **cero**. Los sprites son matrices de bits dibujadas con `fillRect` (dos frames de animación por tipo de alien), igual de baratas que el dibujo vectorial de `rocas`. Sin audio en el alcance propuesto — meterlo obligaría a un gate de precarga tipo `arkanoide`; queda anotado como posible extensión futura, no como requisito.
- **Canvas:** 1 × 800×600, resolución interna fija, misma escala CSS que `rocas` y `arkanoide` dentro de `.crt-screen`.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, entidades planas (`aliens[]`, `bullets[]`, `bunkers[]`, `cannon`, `mothership`), un único `requestAnimationFrame` con `update(dt)`/`draw()` separados. Encaja sin fricción en `create<Name>Engine(canvas, callbacks) → { start, stop, setPaused, reset }`.
  2. _Score_ — entero monotónico y bien distribuido; el leaderboard de SPEC 07 funciona sin cambios.
  3. _Controles_ — teclado solo, el mismo esquema de `rocas` (`←` `→` + `Espacio`), con `preventDefault()` viable.
  4. _Estética_ — es el arquetipo del pixel-art; se ve nativo dentro de `.crt-screen` con la paleta neón verde del slot.
  5. _Assets_ — ninguno. Mejor que `serpentina` (atlas de frutas) y que `arkanoide` (spritesheet + 2 mp3).
  6. _Sesión corta_ — 2 a 4 minutos por partida, con derrota inequívoca (invasión o 0 vidas) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — hoy hay 3 ARCADE con motor real (`bloque-buster`, `serpentina`, `arkanoide`) y 1 SHOOTER (`rocas`). Este es SHOOTER, pero de mecánica opuesta a `rocas`: formación fija y cobertura en vez de vuelo libre con inercia en 360°. No se pisa con ningún motor existente.
  8. _Costo_ — Media. Por encima de `serpentina`, por debajo de `rocas` (sin inercia vectorial, sin fragmentación de asteroides, sin sistema de partículas ni power-ups) y sin el gate de precarga async de `arkanoide`. La única pieza no trivial es la erosión por bloques de los búnkeres.
  9. _Slot vs alta nueva_ — llena un slot decorativo existente: cero migraciones, portada y copy reutilizados tal cual. Es el criterio que lo pone por delante de cualquier alta nueva en esta corrida.
- **Complejidad:** Media — comparada con `arkanoide` en volumen de lógica, pero más barata porque no necesita assets ni precarga.
- **Descartadas esta corrida:** `gloton` (criterio 8, costo Alto: cuatro fantasmas con IA diferenciada de scatter/chase/frightened, pathfinding en laberinto y temporizadores de modo lo vuelven más caro que `rocas`; además sería el cuarto ARCADE y su movimiento en grilla se solapa con `serpentina`, criterio 7), `duelo-pixel` (criterio 2, el marcador de Pong llega a ~11 puntos y produce un leaderboard degenerado donde todos empatan; y criterio 7, paleta + pelota + rebotes es la misma mecánica que `arkanoide`).
- **También evaluados y postergados:** `caida` (duplica la mecánica de Tetris ya implementada en `bloque-buster`; antes de portarle nada hay que resolver ese solapamiento de ficha) y `ranaria` (viable, costo Medio, pero sería el cuarto ARCADE y su río de troncos arrastrantes más los "home slots" lo encarecen frente a `invasores`; queda como candidato natural para la próxima corrida).
- **Handoff:** `/nuevo-juego invasores`


### S02 — CAÍDA (`caida`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** `caida` (decorativo existente) — `cat` PUZZLE, `color` magenta, `cover` cover-tetro, `sort_order` 2.
- **Resolución del conflicto de ficha con `bloque-buster` (obligatoria, va en el spec):**
  Hoy `caida.long` ("Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia
  líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas") describe **exactamente** el
  Tetris que ya corre en `bloque-buster` — y `bloque-buster.long` también, desde la migración
  `fix_bloque_buster_tetris_copy` (2026-09-09). Son dos fichas para el mismo juego.
  - **Descartado — mover el motor de Tetris a `caida`** (el "swap" aparentemente limpio: `caida` ya es
    PUZZLE, que es la categoría correcta de Tetris, y su portada `cover-tetro` dibuja literalmente
    tetrominós). Motivo del descarte: la tabla `scores` tiene FK a `games.id` y las partidas ya jugadas
    de Tetris están registradas bajo `bloque-buster`; mudar el motor dejaría ese historial de
    leaderboard huérfano o mal etiquetado en `/salon`. Además liberaría `bloque-buster` (ARCADE,
    `cover-bricks`, arte de muro de ladrillos) sin juego que ponerle: su lectura natural es Breakout, y
    Breakout ya está implementado en `arkanoide`. Más churn y peor resultado.
  - **Elegido — reasignar `caida` a una mecánica de caída distinta de Tetris, y corregir su copy.**
    El copy nuevo se escribe en el spec y se aplica en una migración `update` sobre `caida`
    (`short`/`long`); `cat` PUZZLE, `color` magenta, `cover` cover-tetro y `sort_order` 2 se conservan
    tal cual — la portada (seis cuadrados de colores en grilla) lee igual de bien como gemas.
    Copy propuesto — `short`: "Alinea tres gemas antes de que la columna toque el techo." · `long`:
    "Tríos de gemas caen sin pausa. Cicla sus colores, apílalos y alinea tres o más en cualquier
    dirección para pulverizarlos. Cada derrumbe encadena el siguiente, y la caída se acelera sin piedad."
  - **Higiene opcional, fuera del alcance del motor:** con `caida` ya diferenciado, conviene revisar
    `bloque-buster.cat` (`ARCADE` → `PUZZLE`) y `bloque-buster.cover` (`cover-bricks`, arte de Breakout)
    — la deuda ya anotada en `references/implemented-games.md`. Anotado, no bloqueante.
- **Mecánica:** Columns. Tablero de 6 columnas × 14 filas. Cae una **tríada vertical** de gemas de 6
  colores; se mueve lateralmente y sus tres colores se **ciclan** in-place (no hay rotación con
  wall-kick). Al posarse, se resuelve un match de 3 o más en las cuatro direcciones (horizontal,
  vertical y ambas diagonales): las gemas coincidentes se pulverizan, las de arriba colapsan por
  gravedad y se vuelve a evaluar — **cascadas encadenadas** con multiplicador creciente. Máquina de
  estados corta dentro de `update(dt)`: `cayendo → asentando → emparejando → colapsando → cayendo`.
  La gravedad se acelera cada 30 gemas despejadas (un "nivel"). Derrota cuando una tríada nueva no
  entra en la columna central.
- **Controles:** `←` `→` mover la tríada, `↓` soft drop, `↑` / `X` ciclar los colores de la tríada,
  `Espacio` hard drop. `preventDefault()` en flechas y espacio. Sin mouse.
- **Score:** entero monotónico creciente. 10 por gema pulverizada, multiplicado por el índice de
  cadena (×1, ×2, ×4, ×8…) y por el nivel actual; +5 por fila ganada en hard drop. Nunca decrece, y
  la varianza de las cascadas produce una distribución amplia, ideal para `/salon`.
- **Callbacks:** `onScoreChange`, `onLevelChange` (`floor(gemas / 30) + 1`), `onGameOver`
  (edge-triggered). **Sin `onLivesChange`** — corrida continua, mismo criterio que `bloque-buster`.
- **Assets:** **cero**. Gemas = `fillRect` redondeado con seis colores de la paleta neón (`--cyan`,
  `--magenta`, `--green`, `--yellow`, naranja y violeta, los mismos seis de `.cover-tetro`), con un
  glifo interno distinto por color para legibilidad sin depender solo del tono (accesibilidad).
- **Canvas:** **1 × 400×600** — tablero de 6×14 celdas de 36 px (216×504) a la izquierda y panel de
  "siguiente tríada" dibujado en el mismo `ctx` a la derecha. A diferencia de `bloque-buster`, **no**
  necesita un segundo canvas: un solo `ref`, un solo `requestAnimationFrame`.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro; estado plano (`board: number[][]`, `current: {col, y, colors[3]}`,
     `next`, `chain`, `phase`). Un único `requestAnimationFrame` con `update(dt)`/`draw()` separados.
     Encaja sin fricción en `create<Name>Engine(canvas, callbacks) → { start, stop, setPaused, reset }`.
  2. _Score_ — entero monotónico, con cola larga por las cadenas; el leaderboard de SPEC 07 funciona sin cambios.
  3. _Controles_ — teclado solo, el mismo esquema que `bloque-buster` menos la rotación, con `preventDefault()` viable.
  4. _Estética_ — gemas de 36 px sobre grilla oscura: pixel-art nativo dentro de `.crt-screen`, y reutiliza
     la paleta exacta de la portada `cover-tetro` que ya existe.
  5. _Assets_ — ninguno. Empata con `invasores` (S01) y mejora a `serpentina` y `arkanoide`.
  6. _Sesión corta_ — 2 a 5 minutos con la curva de aceleración propuesta; derrota inequívoca (columna
     central bloqueada) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — comparte familia con Tetris (pieza que cae sobre grilla), y hay que decirlo:
     es el candidato menos novedoso de este slice en lo mecánico. Pero el verbo central es distinto —
     emparejar por color con cascadas en vez de completar filas con encastre geométrico —, no hay rotación
     ni wall-kick, y el scoring es exponencial por cadena en vez de lineal por línea. Además es el **único
     PUZZLE con motor real** del catálogo, que hoy tiene esa categoría vacía de juego jugable.
  8. _Costo_ — Media. Por debajo de `bloque-buster` en input (sin sistema de rotación con wall-kick) pero
     por encima en resolución de tablero: la detección de matches en 4 direcciones y el bucle de cascadas
     con multiplicador son la pieza no trivial.
  9. _Slot vs alta nueva_ — llena un slot existente: cero filas nuevas, portada reutilizada. El único costo
     de migración es un `update` de dos campos de texto, mucho más barato que un `insert` + CSS de portada nueva.
- **Complejidad:** Media — comparable a `bloque-buster` en volumen de lógica, redistribuida del input a la
  resolución del tablero.
- **Descartadas esta corrida (para este slot):** `Dr. Mario` / píldoras + virus (criterio 7: la mecánica es
  casi idéntica a Columns pero exige sembrar virus por nivel y una condición de victoria por limpieza, que
  encarece sin diferenciar; y criterio 2: el score de Dr. Mario es escalonado por virus, con menos varianza),
  `Puyo Puyo` (criterio 4 y 5: el encanto depende de sprites expresivos y de la conexión visual por
  agrupación de burbujas, que en `fillRect` plano se lee peor que las gemas cuadradas).

### S03 — GLOTÓN (`gloton`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** `gloton` (decorativo existente) — `cat` ARCADE, `color` yellow, `cover` cover-glot, `sort_order` 4.
  El copy de la ficha ("Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro
  espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles") describe
  la mecánica propuesta al pie de la letra: **no hace falta ninguna migración ni corrección de textos**.
- **Reconsideración respecto de S01:** `gloton` figura en S01 como "descartada esta corrida" por criterio 8
  (costo Alto) y criterio 7 (cuarto ARCADE, movimiento en grilla solapado con `serpentina`). No es una
  entrada con estado `Descartado` — fue una alternativa perdedora en una comparación de un solo ganador.
  Además el motivo de costo **se apoyaba en una premisa incorrecta**: el targeting clásico de los cuatro
  fantasmas **no usa pathfinding**. Cada fantasma calcula una *tile* objetivo (una función de 3 a 5 líneas
  por fantasma) y, en cada intersección, elige el vecino transitable que minimiza la distancia euclídea a
  ese objetivo, sin poder invertir el sentido. Eso es una tabla de decisión, no A\*. El costo real baja de
  "más caro que `rocas`" a "comparable a `rocas`". El solapamiento con `serpentina` (criterio 7) sí es real
  y se aborda abajo.
- **Mecánica:** Pac-Man. Laberinto de 28×31 tiles definido como constante de strings (`#` muro, `.` punto,
  `o` píldora, ` ` vacío), 240 puntos y 4 píldoras energéticas. Cuatro fantasmas con personalidad
  diferenciada por su *tile* objetivo: persecución directa, emboscada 4 tiles por delante del glotón,
  vector duplicado respecto de un segundo fantasma, y tímido (persigue de lejos, se dispersa de cerca).
  Temporizador global que alterna **scatter** (cada fantasma a su esquina) y **chase**, con ventanas que se
  acortan por nivel. La píldora energética los pone en **frightened** (invierten sentido, se mueven lento,
  son comestibles); al ser comidos vuelven como ojos a la casa. Túnel lateral con envolvimiento. Fruta bonus
  al despejar 70 y 170 puntos. Limpiar el laberinto arranca el nivel siguiente, más rápido y con menos
  frightened. Derrota al agotar las 3 vidas.
- **Controles:** `←` `→` `↑` `↓` con **buffer de giro** (la tecla queda encolada y se aplica en cuanto el
  giro es legal, que es lo que hace que el juego se sienta justo). `preventDefault()` en las cuatro flechas.
  Sin mouse.
- **Score:** entero monotónico creciente. 10 por punto, 50 por píldora, 200/400/800/1600 por fantasma
  comido en la misma píldora, 100–500 por fruta. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (laberinto despejado),
  `onGameOver` (edge-triggered, al agotar vidas).
- **Assets:** **cero**. El glotón es un `arc()` con la boca animada por ángulo; los fantasmas, un
  semicírculo + falda ondulada + dos ojos con pupila orientada al movimiento; el laberinto, `strokeRect`
  redondeados por tile con la paleta neón. Los puntos son círculos de 2–3 px. Ni un solo archivo en `public/`.
- **Canvas:** 1 × 800×600 (tiles de 20 px, tablero de 560×620 escalado/centrado; misma escala CSS que `rocas`).
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro; entidades planas (`maze[][]`, `player`, `ghosts[4]`, `modeTimer`,
     `frightenedTimer`). Un único `requestAnimationFrame`, `update(dt)`/`draw()` separados. Encaja tal cual
     en la factory; nada async, ningún gate de precarga.
  2. _Score_ — entero monotónico, con la mejor distribución de todo el slice (los 1600 por cadena de fantasmas
     premian el juego hábil y separan el leaderboard). SPEC 07 sin cambios.
  3. _Controles_ — teclado solo, cuatro flechas con `preventDefault()` viable. Mismo esquema que `serpentina`.
  4. _Estética_ — es, junto a `invasores`, el arquetipo del arcade neón; el laberinto en trazo fino brilla
     nativo dentro de `.crt-screen` y la portada `cover-glot` (amarillo sobre violeta) ya está resuelta.
  5. _Assets_ — ninguno; todo geometría primitiva.
  6. _Sesión corta_ — 2 a 5 minutos por partida; derrota inequívoca (0 vidas) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — es el cuarto ARCADE y sí comparte el movimiento sobre grilla con `serpentina`,
     lo cual hay que asumir. La diferencia sustantiva: `serpentina` es un juego de **auto-restricción** (el
     peligro es el propio cuerpo, no hay adversario), mientras que `gloton` introduce los **primeros
     adversarios con IA de persecución y modos** del catálogo — un subsistema que ningún motor existente
     tiene. Es la pieza que más capacidad nueva agrega al proyecto.
  8. _Costo_ — Alta, comparable a `rocas`. Lo caro no son los fantasmas (targeting de tabla, sin pathfinding)
     sino el volumen acumulado: mapa de tiles con alineación exacta al centro de celda, buffer de giro,
     máquina de modos scatter/chase/frightened/eyes con temporizadores por nivel, túnel con envolvimiento y
     secuencia de muerte/respawn.
  9. _Slot vs alta nueva_ — llena un slot existente con copy y portada que ya describen el juego exacto: cero
     migraciones, ni siquiera de texto. El slot mejor alineado de todo el catálogo.
- **Complejidad:** Alta — comparada con `rocas` (el motor más caro implementado hoy). Es el techo de costo de
  este slice y conviene programarlo después de uno o dos de los de costo Medio.
- **Descartadas esta corrida (para este slot):** `Ms. Pac-Man` / variante con múltiples laberintos (criterio 8:
  multiplica por cuatro los mapas y agrega fantasmas con componente aleatorio, sin agregar mecánica nueva),
  `Digger` / laberinto excavable (criterio 9: no honra el copy del slot, que promete cuatro espectros y píldora
  de inversión; obligaría a una migración de textos sin ganancia).

### S04 — RANARIA (`ranaria`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** `ranaria` (decorativo existente) — `cat` ARCADE, `color` green, `cover` cover-rana, `sort_order` 7.
  El copy ("Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los
  nenúfares antes de que se acabe el tiempo") describe la mecánica propuesta exactamente: **sin migración**.
  S01 lo dejó anotado como "candidato natural para la próxima corrida" — esta es esa corrida.
- **Mecánica:** Frogger. Tablero fijo de 14 columnas × 15 filas. De abajo hacia arriba: fila de salida,
  5 carriles de tráfico con vehículos de velocidad y sentido alternos, mediana segura, 5 carriles de río con
  troncos y tortugas (algunas se sumergen en ciclo), y la fila superior con **5 nenúfares** vacíos. El salto
  es **discreto**: una pulsación = un paso de celda, con una interpolación corta de 120 ms para el arco.
  En el río la rana **no flota**: muere en el agua salvo que esté sobre un tronco/tortuga, y entonces es
  **arrastrada** por la velocidad de esa plataforma (si el arrastre la saca del tablero, muere). Temporizador
  por intento; llenar los 5 nenúfares completa la ronda y arranca la siguiente, más rápida. Derrota al agotar
  las 3 vidas (por atropello, ahogo, arrastre o tiempo).
- **Controles:** `←` `→` `↑` `↓`, **un paso por pulsación** (`keydown` con anti-repetición: la tecla debe
  soltarse para volver a contar). `preventDefault()` en las cuatro flechas. Sin mouse.
- **Score:** entero monotónico creciente. 10 por cada fila **nueva** alcanzada hacia arriba (marca de fila
  máxima, para que retroceder no reste ni permita farmear), 50 por nenúfar ocupado, 10 por segundo restante
  del temporizador al llegar, 1000 por completar los 5 nenúfares de la ronda. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (ronda), `onGameOver`
  (edge-triggered).
- **Assets:** **cero**. Rana = dos rectángulos verdes + patas; coches, troncos y tortugas = rectángulos y
  elipses de la paleta neón; agua = franja con dos líneas animadas por desplazamiento de fase. El temporizador
  se dibuja como barra dentro del canvas.
- **Canvas:** 1 × 800×600 (celdas de 50 px, 16 columnas × 12 filas útiles, con la fila superior de nenúfares
  y una franja inferior para la barra de tiempo).
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro; estado plano (`lanes[]` con `{y, speed, dir, items[]}`, `frog`,
     `homes[5]`, `timer`). Un único `requestAnimationFrame`; los carriles son listas de rectángulos que se
     desplazan y envuelven, la colisión es AABB por carril. Encaja en la factory sin fricción.
  2. _Score_ — entero monotónico, protegido contra farmeo por la marca de fila máxima; SPEC 07 sin cambios.
  3. _Controles_ — cuatro flechas, un paso por pulsación, `preventDefault()` viable. Sin mouse.
  4. _Estética_ — carriles de colores planos y siluetas simples: pixel-art nativo en `.crt-screen`, con la
     portada `cover-rana` ya resuelta en verde.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 1 a 4 minutos; derrota inequívoca (0 vidas) que dispara `onGameOver` una sola vez.
     El temporizador por intento garantiza que la partida nunca se estanque.
  7. _Diversidad de catálogo_ — cuarto ARCADE, pero es el **único juego de esquiva pura** del proyecto: el
     jugador no dispara, no destruye y no acumula por colisión, sino que sobrevive a un patrón en movimiento.
     Ningún motor existente tiene esa forma. Su movimiento discreto por celdas lo emparenta con `serpentina`,
     pero ahí el tablero es estático y aquí es el tablero el que se mueve bajo los pies.
  8. _Costo_ — Media. Los carriles son triviales; lo no trivial es el **acoplamiento de arrastre** (la rana
     hereda la velocidad de la plataforma que pisa, con su propia condición de muerte por salida de tablero),
     la contabilidad de los 5 nenúfares (ocupados, y muerte si se salta sobre uno ya ocupado) y el ciclo de
     tortugas que se sumergen.
  9. _Slot vs alta nueva_ — llena un slot existente, copy y portada reutilizados literalmente, cero migraciones.
- **Complejidad:** Media — por encima de `serpentina`, por debajo de `arkanoide` (no hay assets ni gate de
  precarga async) y muy por debajo de `gloton`.
- **Descartadas esta corrida (para este slot):** `Freeway` / solo carriles de tráfico, sin río (criterio 9: la
  ficha promete explícitamente "troncos a la deriva en el río"; recortarlo obligaría a corregir el copy y
  además dejaría un juego de una sola idea, con sesiones planas), `Crossy Road` con scroll infinito (criterio 1
  y 4: el scroll vertical continuo rompe el encuadre de tablero fijo que usan todos los motores actuales y
  obliga a generación procedural de carriles, encareciendo sin beneficio arcade).

### S05 — DUELO PIXEL (`duelo-pixel`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** `duelo-pixel` (decorativo existente) — `cat` VERSUS, `color` cyan, `cover` cover-duelo, `sort_order` 8.
  Es la **única fila VERSUS del catálogo**, y hoy esa categoría no tiene ni un juego jugable.
- **Reconsideración respecto de S01:** S01 lo descartó por criterio 2 (el marcador de Pong llega a ~11 puntos
  y produce un leaderboard degenerado donde todos empatan) y criterio 7 (paleta + pelota + rebotes = la misma
  mecánica que `arkanoide`). Ambos motivos son reales y **esta propuesta los ataca de frente** en vez de
  ignorarlos:
  - **Criterio 2 — resuelto por diseño de score.** No se envía a `scores` el marcador del duelo. El score de
    leaderboard es un **acumulador de rally**: 10 por cada devolución de la paleta del jugador, ×(1 + rallies
    consecutivos / 10) por la escalada de la volea, +500 por cada punto anotado a la CPU, +200 por nivel de
    dificultad superado. El marcador del duelo (0–3) cumple el rol de **vidas**, no de puntuación: la partida
    termina cuando la CPU anota 3. Resultado: enteros de tres a cinco cifras, con varianza amplia y sin empates
    masivos. El marcador de sets se muestra dibujado en el canvas y se reporta por `onLivesChange`.
  - **Criterio 7 — asumido y acotado.** Es el candidato mecánicamente más cercano a `arkanoide` de todo el
    slice, y no conviene fingir lo contrario. Lo que lo justifica igual: (a) es el único modo de llenar la
    categoría VERSUS, hoy vacía; (b) introduce el **primer oponente con IA** del catálogo — una CPU con modelo
    de error explícito (retardo de reacción, error de predicción proporcional a la velocidad de la pelota,
    y ambos escalando por nivel), que es un subsistema que ningún motor existente tiene; (c) no hay muro de
    bloques, ni power-ups, ni pérdida de vida por pelota caída: el bucle es escalada de volea contra un rival
    que también falla. Por eso queda rankeado como el más barato **y** el menos novedoso del slice.
- **Alcance v1 — 1 jugador contra la CPU, y por qué:** la ficha promete "modo solitario contra la CPU o
  partida local a dos jugadores". El modo 2P **no entra en v1**, por una razón de contrato y no de costo:
  `GamePlayer.saveScore()` guarda en `scores` el score del estado sin ninguna rama por juego, así que una
  partida local a dos escribiría una fila de leaderboard que no representa a un jugador identificable.
  Suprimir ese guardado exigiría tocar el wiring genérico de `components/game-player.tsx`, que este proyecto
  mantiene deliberadamente libre de ramas por juego. Queda anotado como extensión futura, con la condición
  previa de que `GamePlayer` soporte modos sin puntuación. **Duda anotada:** si el equipo prefiere honrar el
  copy ya, la alternativa es un `update` de `duelo-pixel.long` que presente el 2P local como "próximamente";
  ante la falta de un interlocutor, se elige v1 = 1P y copy intacto, que es lo menos destructivo.
- **Mecánica:** Pong de escalada. Dos paletas verticales, pelota con ángulo de salida según el punto de
  contacto con la paleta y aceleración progresiva por cada devolución dentro de la misma volea. Cada punto
  anotado (por cualquiera de los dos) sube el nivel de dificultad: la pelota parte más rápido, la paleta de la
  CPU reacciona antes y su error se achica, y ambas paletas se acortan. La partida termina cuando la CPU anota
  3 puntos. Sin límite superior: un jugador muy bueno puede encadenar voleas indefinidamente, que es justo lo
  que el score de rally premia.
- **Controles:** `↑` `↓` mover la paleta, con **mouse opcional** (`mousemove` mueve la paleta, precedente ya
  establecido por `arkanoide`). `preventDefault()` en las flechas. `W`/`S` quedan reservadas para el futuro 2P.
- **Score:** entero monotónico creciente, según la fórmula de rally de arriba. Nunca decrece — perder un punto
  no resta, solo consume una "vida". SPEC 07 sin cambios.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 = puntos que le quedan por conceder a la CPU),
  `onLevelChange` (nivel de dificultad, sube con cada punto anotado por cualquiera), `onGameOver`
  (edge-triggered, cuando la CPU llega a 3).
- **Assets:** **cero**. Dos `fillRect`, un cuadrado para la pelota, la línea central punteada y los dígitos del
  marcador dibujados con `fillText` en la fuente mono ya cargada por el sitio.
- **Canvas:** 1 × 800×600.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — el motor más simple posible dentro del contrato: `paddleL`, `paddleR`, `ball`,
     `level`. Un único `requestAnimationFrame`, `update(dt)`/`draw()` separados. Encaja trivialmente en la factory.
  2. _Score_ — resuelto por el acumulador de rally (ver arriba): entero monotónico de amplio rango, sin el
     leaderboard degenerado que motivó el descarte en S01.
  3. _Controles_ — `↑` `↓` con `preventDefault()`, más mouse opcional con el mismo patrón de `arkanoide`.
  4. _Estética_ — es el juego más "CRT" que existe: dos barras y un cuadrado sobre negro. Nativo dentro de
     `.crt-screen`, con la portada `cover-duelo` ya resuelta en cian.
  5. _Assets_ — ninguno; ni siquiera formas compuestas.
  6. _Sesión corta_ — 1 a 4 minutos, acotada por la escalada de dificultad: la aceleración por nivel garantiza
     que la CPU termine llegando a 3. Derrota inequívoca, `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — llena la **única categoría sin motor real** (VERSUS) y aporta el primer
     adversario con IA. Contra: es la mecánica más cercana a `arkanoide` del slice; asumido explícitamente.
  8. _Costo_ — **Baja**, comparable a `serpentina` y la más barata de las cinco. Lo único con sustancia es
     afinar el modelo de error de la CPU para que se sienta competitiva sin ser imbatible.
  9. _Slot vs alta nueva_ — llena un slot existente, copy y portada reutilizados; la única salvedad es la
     promesa de 2P local, tratada arriba.
- **Complejidad:** Baja — comparada con `serpentina`. Es el candidato ideal para intercalar entre dos motores caros.
- **Descartadas esta corrida (para este slot):** `Pong a 2 jugadores locales como v1` (criterio 2 y contrato de
  wiring: escribiría en `scores` una fila que no representa a un jugador identificable, y suprimir ese guardado
  exige tocar el `GamePlayer` genérico), `Air Hockey` / duelo en 2 ejes con disco y golpeo libre (criterio 1 y 8:
  la colisión círculo-círculo con transferencia de impulso y el control de la paleta en dos ejes lo encarecen, y
  criterio 9: la ficha promete explícitamente "dos paletas verticales").

### S06 — ANDAMIOS (`andamios`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva en `games`** — ningún slot decorativo describe un juego de plataformas, así que aquí
  el criterio 9 obliga a insertar fila. Valores propuestos:
  - `id`: `andamios`
  - `title`: `ANDAMIOS`
  - `short`: `Escala la obra esquivando barriles antes de que te aplasten.`
  - `long`: `Cinco andamios torcidos, escaleras oxidadas y una lluvia de barriles que bajan rebotando. Salta, trepa y agarra el martillo: arriba del todo alguien te está esperando.`
  - `cat`: `ARCADE`
  - `color`: `cyan`
  - `cover`: `cover-andamios`
  - `sort_order`: `10` (siguiente libre después de `arkanoide` = 9)
  - `best` / `plays`: decorativos, mismo criterio que el resto del seed.
  - **Trabajo extra que implica el alta:** una migración `insert` (precedente exacto:
    `20260908013755 insert_game_arkanoide`) **y** una clase `.cover-andamios` nueva en `app/globals.css`
    junto al resto de los generadores de portada (precedente: `.cover-arkanoide`, líneas ~910–935). La
    portada se resuelve con CSS puro, sin imagen: bandas diagonales cian como andamios, dos escaleras de
    trazo punteado y un barril amarillo con `radial-gradient`. Sin archivos en `public/`.
- **Mecánica:** escalada de pantalla fija, sin scroll — el tablero entero cabe en el canvas, como todos los
  motores actuales. Cinco andamios ligeramente inclinados conectados por escaleras; el jugador arranca abajo
  y debe llegar a la plataforma superior. Desde arriba caen **barriles** que ruedan siguiendo la pendiente,
  rebotan al llegar al borde y bajan por algunas escaleras al azar; la cadencia y la probabilidad de bajada
  crecen por pantalla. Un **martillo** de duración limitada permite destruir barriles al contacto (y desactiva
  el salto mientras dura). Llegar arriba completa la pantalla, suma el bonus de tiempo restante y arranca la
  siguiente con más barriles y disposición de escaleras distinta. Derrota al agotar las 3 vidas.
  La física se mantiene barata: **no** hay motor de colisiones general — la altura del suelo se resuelve con
  un lookup por columna sobre los segmentos de andamio, el salto es un arco de parámetros fijos, y estar en
  escalera es un estado que desactiva la gravedad.
- **Controles:** `←` `→` caminar, `↑` `↓` subir/bajar escalera (solo cuando se solapa con una), `Espacio`
  saltar. `preventDefault()` en flechas y espacio. Sin mouse.
- **Score:** entero monotónico creciente. 100 por barril saltado (detectado al cruzarlo por encima),
  300/500/800 por barril destruido con martillo, 100 por cada andamio nuevo alcanzado (marca de altura máxima,
  para que bajar y volver a subir no farmee), y el bonus de tiempo restante al completar la pantalla. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de pantalla),
  `onGameOver` (edge-triggered, al agotar vidas).
- **Assets:** **cero**. Andamios y escaleras son `fillRect` rotados/apilados; el jugador es una silueta de
  ~16×20 px compuesta por cinco rectángulos con dos frames de caminata; los barriles son elipses con dos
  aros. Sin audio, sin gate de precarga.
- **Canvas:** 1 × 800×600 (nativo 4:3, idéntico a `rocas`, `arkanoide` y `serpentina`).
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro; entidades planas (`platforms[]` como segmentos con pendiente,
     `ladders[]` como rectángulos, `barrels[]`, `player` con `{x, y, vy, onGround, onLadder}`, `hammer`).
     Un único `requestAnimationFrame` con `update(dt)`/`draw()` separados. Nada de física de terceros: gravedad
     escalar y resolución de suelo por lookup de columna. Encaja en la factory sin fricción.
  2. _Score_ — entero monotónico, protegido contra farmeo por la marca de altura máxima; SPEC 07 sin cambios.
  3. _Controles_ — teclado solo, flechas + espacio, con `preventDefault()` viable (mismo set que `rocas`).
  4. _Estética_ — vigas, escaleras y barriles son geometría gruesa de alto contraste: pixel-art nativo dentro
     de `.crt-screen`, sin nada fotográfico ni de alta resolución.
  5. _Assets_ — ninguno. Es el criterio donde un alta nueva suele perder (portada nueva), y aquí se paga con
     CSS puro en vez de con un PNG.
  6. _Sesión corta_ — 1 a 4 minutos, con el temporizador de pantalla empujando hacia arriba; derrota inequívoca
     (0 vidas) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — el argumento más fuerte de esta entrada: **hoy no existe ningún juego con
     gravedad, salto ni verticalidad** en Arcade Vault. Los cuatro motores actuales son vuelo inercial en 360°,
     caída sobre grilla, rebote en 2 ejes y avance sobre grilla. Un platformer de pantalla fija es la mecánica
     más lejana a todo lo implementado. Contra: suma un ARCADE más a una categoría ya poblada — pero ARCADE es
     la única de las cuatro categorías disponibles en la que un platformer entra honestamente.
  8. _Costo_ — Media-Alta, comparable a `arkanoide` en volumen y por debajo de `rocas` y `gloton`. La pieza no
     trivial es la máquina de estados del jugador (suelo / salto / escalera / martillo) y el rodado de barriles
     por pendiente con bifurcación en escaleras; todo lo demás es dibujo plano.
  9. _Slot vs alta nueva_ — es el único de los cinco que **no** puede llenar un slot: ninguna de las cinco
     fichas decorativas (`caida` piezas que caen, `gloton` laberinto, `invasores` formaciones, `ranaria` cruzar
     carriles, `duelo-pixel` paletas) admite un platformer sin reescribir su copy por completo. El costo
     asumido es explícito y acotado: un `insert` y una clase CSS de portada.
- **Complejidad:** Media-Alta — comparada con `arkanoide` (similar volumen de lógica, pero sin carga async de
  spritesheet ni audio, y con una máquina de estados de jugador que `arkanoide` no tiene).
- **Descartadas esta corrida (para esta alta nueva):** `Lode Runner` (criterio 8: excavar ladrillos con
  regeneración temporizada, IA de perseguidores que caen en los pozos y un set de niveles diseñados a mano lo
  ponen por encima de `gloton` en costo; y criterio 6: sus pantallas duran demasiado para el objetivo de 1–5
  minutos), `Ice Climber` (criterio 1 y 4: depende de scroll vertical continuo, que rompe el encuadre de tablero
  fijo de todos los motores actuales y el aspect 4:3 de `.crt-screen`), `Burger Time` (criterio 7: mecánica de
  plataformas con escaleras muy parecida a la propuesta pero con el foco en empujar ingredientes, que lo acerca
  a un juego de recolección tipo `gloton` y diluye la novedad de la gravedad/salto).


### S07 — ESCUADRÓN (`escuadron`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `escuadron` · `title` `ESCUADRÓN` · `cat` `SHOOTER` · `color` `cyan` · `cover` `cover-escuadron` · `sort_order` 10. No hay slot decorativo que calce: `invasores` ya está reservado por S01 y su copy describe formación fija, no scroll.
- **Mecánica:** shoot'em up de scroll vertical (linaje 1942 / Xevious). Campo de estrellas en dos capas de parallax bajando de forma continua; la nave del jugador se mueve libre en X/Y dentro del canvas pero **sin inercia** (velocidad constante, se frena al soltar) — ésa es la diferencia deliberada contra `rocas`. Las oleadas salen de una tabla de patrones declarativa: formación en V que entra, describe un arco y sale; serpiente lateral que barre de borde a borde; kamikazes que apuntan a la posición del jugador al aparecer; torretas lentas que disparan ráfagas dirigidas. Cada 5 oleadas entra un jefe con blindaje por impactos y patrón de disparo radial. Power-ups que suelta una oleada limpiada al 100%: disparo doble, disparo triple, escudo de un impacto. Derrota al agotar las 3 vidas.
- **Controles:** `←` `→` `↑` `↓` mover, `Espacio` disparar (auto-fire con cooldown mientras se mantiene). `preventDefault()` en flechas y espacio. Sin mouse.
- **Score:** entero monotónico: 50 / 100 / 150 / 200 por enemigo según tipo, bonus ×2 de la oleada si se la limpia completa, 2000–5000 por jefe según velocidad de derribo. Nunca decrece; los power-ups no descuentan. Apto tal cual para `scores` y `/salon`.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de oleada), `onGameOver` (edge-triggered, una sola vez, al agotar vidas).
- **Assets:** **cero**. Naves y jefes son polígonos dibujados con `fill`/`fillRect`, las estrellas son puntos de 1–2 px y las explosiones reusan el sistema de partículas ya validado en `rocas`. Sin audio en el alcance.
- **Canvas:** 1 × 800×600, resolución interna fija, escalado por CSS dentro de `.crt-screen` (4/3).
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro. Entidades planas (`player`, `enemies[]`, `bullets[]`, `enemyBullets[]`, `powerups[]`, `particles[]`, `stars[]`) con `update(dt)`/`draw()` separados y un único `requestAnimationFrame`. Encaja sin fricción en `createEscuadronEngine(canvas, callbacks) → { start, stop, setPaused, reset }`.
  2. _Score_ — entero monotónico y bien escalonado; el leaderboard de SPEC 07 funciona sin cambios.
  3. _Controles_ — teclado solo, `preventDefault()` viable en flechas y espacio.
  4. _Estética_ — el scroll vertical con parallax de estrellas es el uso más nativo posible del neón sobre negro dentro de `.crt-screen`.
  5. _Assets_ — ninguno. Mejor que `serpentina` (atlas de frutas) y que `arkanoide` (spritesheet + 2 mp3).
  6. _Sesión corta_ — 3 a 5 minutos; derrota inequívoca (0 vidas) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — SHOOTER, pero es el tercer eje distinto del género: `rocas` es vuelo libre con inercia en 360°, S01 `invasores` es formación fija con búnkeres, y esto es scroll con patrones guionados. No se pisa con ninguno.
  8. _Costo_ — Media. Por encima de `serpentina`, comparable a `arkanoide`, por debajo de `rocas` (sin inercia vectorial, sin fragmentación recursiva). El grueso de la variedad vive en la tabla de oleadas, que es **data**, no lógica nueva.
  9. _Slot vs alta nueva_ — alta nueva, con su costo asumido: 1 migración `insert` + 1 clase `.cover-escuadron` en `globals.css`. Se justifica porque ningún slot decorativo libre (`caida`, `gloton`, `ranaria`, `duelo-pixel`) describe un shoot'em up de scroll, y forzarlo obligaría a reescribir copy y portada — más caro que insertar la fila.
- **Complejidad:** Media — comparada con `arkanoide` en volumen de lógica, sin su gate de precarga async.
- **Descartadas esta corrida:** variante de scroll **horizontal** tipo R-Type (criterio 8: el jefe-serpiente articulado y el "force pod" acoplable suben el costo a Alta sin agregar diversidad de catálogo frente a esta misma entrada), y variante con jefes basados en spritesheet (criterio 5: rompe el cero-assets por un beneficio puramente cosmético).

### S08 — GALERÍA (`galeria`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `galeria` · `title` `GALERÍA` · `cat` `SHOOTER` · `color` `yellow` · `cover` `cover-galeria` · `sort_order` 11.
- **Mecánica:** shooter de galería de feria con apuntado fijo (linaje Carnival / Duck Hunt). Tres carriles horizontales a distinta "profundidad" cruzan blancos de distinta velocidad y tamaño: patos en el carril lejano (chicos y rápidos, valen más), latas en el medio, ositos en el cercano (grandes y lentos). El jugador controla una mira; el cañón está fijo abajo. Cargador de 6 tiros con recarga manual (`R`) o automática con penalización de **tiempo**. Rondas de 30 s con cuota de blancos: si se alcanza, la siguiente suma velocidad y un carril más poblado; si no, `onGameOver`. Blanco bonus (diana dorada) que aparece 3 s y vale 500. Blanco prohibido (globo rojo): acertarlo **resta 3 s de reloj, nunca puntos**, para no romper la monotonía del score.
- **Controles:** **mouse** (`mousemove` mueve la mira, `click` dispara) con fallback de teclado (`←` `→` `↑` `↓` mueven la mira, `Espacio` dispara) y `R` para recargar. Precedente de doble esquema de input: `arkanoide`. `preventDefault()` en flechas y espacio.
- **Score:** entero monotónico: 100 carril lejano, 50 medio, 25 cercano, 500 diana dorada, bonus de ronda = 200 por cuota superada + 10 por bala sin usar. Las penalizaciones son siempre de tiempo, nunca de puntos — el score nunca decrece.
- **Callbacks:** `onScoreChange`, `onLevelChange` (número de ronda), `onGameOver` (edge-triggered al expirar el reloj sin cuota). **Sin** `onLivesChange`: el juego no tiene concepto de vidas, igual que `bloque-buster`, y `GamePlayer` ya tolera ese caso.
- **Assets:** **cero**. Los blancos son siluetas de `fillRect` de 8–12 celdas (misma técnica bitmap que la propuesta para `invasores`); la mira son dos líneas y un círculo.
- **Canvas:** 1 × 800×600.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, entidades planas (`targets[]`, `lanes[]`, `crosshair`, `ammo`, `timer`), un único `requestAnimationFrame`. Los listeners de `mousemove`/`click` se agregan en `start()` y se remueven en `stop()`, como manda la receta.
  2. _Score_ — entero monotónico por diseño explícito (la penalización es de tiempo, no de puntos).
  3. _Controles_ — mouse primario + teclado de respaldo; `preventDefault()` viable.
  4. _Estética_ — caseta de feria en pixel-art plano con paleta neón amarilla; nada fotográfico. Los blancos de feria son un arquetipo pixel, no realista.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — la más corta de la tanda: rondas de 30 s, partida típica de 1,5 a 3 minutos, con derrota clarísima (reloj a 0 sin cuota).
  7. _Diversidad de catálogo_ — sería el único juego cuyo eje de habilidad es **puntería con mouse y gestión de munición**, no pilotaje. Comparte input con `arkanoide` pero no mecánica. Dentro de este slice se diferencia de S09 en que acá se rastrean blancos laterales con munición finita, mientras que S09 es intercepción de trayectorias por área.
  8. _Costo_ — **Baja**, la más barata de las cinco: por debajo de `serpentina`. Hit-test punto-vs-rect, sin física, sin IA, sin grilla.
  9. _Slot vs alta nueva_ — alta nueva (1 migración + `.cover-galeria`). Ningún slot decorativo libre describe un shooter de galería.
- **Complejidad:** Baja — por debajo de `serpentina`; es el candidato ideal si se busca una entrega rápida.
- **Descartadas esta corrida:** galería con **pseudo-3D de perspectiva** (blancos que escalan al acercarse, tipo Operation Wolf) — criterios 1 y 4: el escalado continuo pide sprites reales y arruina la legibilidad pixel dentro de `.crt-screen`; y galería con blancos de figura humana (criterio 4, además de chocar con el tono del catálogo).

### S09 — CIUDADELA (`ciudadela`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `ciudadela` · `title` `CIUDADELA` · `cat` `SHOOTER` · `color` `magenta` · `cover` `cover-ciudadela` · `sort_order` 12.
- **Mecánica:** defensa de ciudad con artillería (linaje Missile Command). Seis ciudades y tres baterías en el borde inferior; cada batería tiene munición finita por oleada (10 contramisiles). Desde el borde superior descienden misiles en trayectorias rectas hacia ciudades y baterías. El jugador marca un punto del cielo y dispara desde la batería más cercana: el contramisil viaja hasta ahí y detona en una esfera de explosión que **crece y decrece**, destruyendo todo misil que la toque mientras está viva — de ahí las reacciones en cadena, que son el núcleo del scoring alto. Dificultad por oleada: más misiles, más rápidos, MIRV que se dividen a media altura, y bombarderos/satélites que cruzan soltando misiles. Derrota cuando caen las 6 ciudades.
- **Controles:** **mouse** (`mousemove` mueve la retícula, `click` dispara) con fallback de teclado (`←` `→` `↑` `↓` mueven la retícula, `Z` / `X` / `C` disparan desde la batería izquierda / central / derecha). `preventDefault()` en flechas.
- **Score:** entero monotónico: 25 por misil interceptado, multiplicado por el factor de oleada (1..6); 100 por bombardero o satélite; bonus de fin de oleada = 5 por contramisil sobrante + 100 por ciudad viva. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (**ciudades restantes**, 6 → 0: mapea natural al contador de vidas del HUD genérico), `onLevelChange` (oleada), `onGameOver` (edge-triggered, al perder la última ciudad).
- **Assets:** **cero**. Trazos de línea para las estelas, arcos para las explosiones, `fillRect` para las siluetas de ciudad. Es el arquetipo del render vectorial: el mismo lenguaje visual que ya sostiene `rocas`.
- **Canvas:** 1 × 800×600.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, entidades planas (`cities[]`, `batteries[]`, `enemyMissiles[]`, `playerMissiles[]`, `explosions[]`), un único `requestAnimationFrame`, `update(dt)`/`draw()` separados.
  2. _Score_ — entero monotónico con multiplicador de oleada; produce una curva de leaderboard sana (separa bien al buen jugador del mediocre, a diferencia de un marcador tipo Pong).
  3. _Controles_ — mouse primario + teclado de respaldo, `preventDefault()` viable.
  4. _Estética_ — vectorial puro sobre negro; probablemente el más "CRT" del catálogo junto con S11.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 2 a 4 minutos. Derrota inequívoca (6.ª ciudad destruida) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — sería el primer juego cuyo eje es **defensa por denegación de área**: no se dispara *a* un objeto sino *a un punto del espacio*, anticipando trayectorias. No se pisa ni con `rocas`, ni con S01 `invasores`, ni con S08 (allá se rastrean blancos, acá se predicen cruces).
  8. _Costo_ — Media, por debajo de `rocas`. La única pieza no trivial es la explosión de radio animado con detección continua y la cadena resultante; el resto es interpolación lineal de misiles entre origen y destino.
  9. _Slot vs alta nueva_ — alta nueva (1 migración + `.cover-ciudadela`). Ningún slot decorativo libre describe defensa con artillería.
- **Complejidad:** Media — comparada con `arkanoide`, con menos estado que `rocas` y sin assets ni carga async.
- **Descartadas esta corrida:** artillería **por turnos** tipo Scorched Earth (criterio 6: el ritmo por turnos estira la partida y rompe la sesión arcade de 1–5 min; criterio 2: el score por turnos alternados no produce un entero limpio por jugador), y defensa de base en vista isométrica (criterio 4: la isometría pide tile-set y arruina la lectura pixel plana del resto del catálogo).

### S10 — BLINDADOS (`blindados`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `blindados` · `title` `BLINDADOS` · `cat` `SHOOTER` · `color` `green` · `cover` `cover-blindados` · `sort_order` 13.
- **Mecánica:** duelo de tanques en terreno destructible, **1 jugador contra CPU** (linaje Tank Battalion / Battle City). Arena de 26×26 celdas con cuatro materiales: ladrillo (se erosiona por cuartos de celda, un cuarto por impacto), acero (indestructible salvo con power-up), arbusto (oculta al tanque pero deja pasar los disparos) y agua (bloquea tanques, deja pasar disparos). El jugador defiende su base en el borde inferior de oleadas de tanques que entran por los tres accesos superiores. Cuatro tipos de enemigo: básico, rápido, blindado (4 impactos) y artillero (cadencia alta). Power-ups que sueltan los tanques marcados: pala (blinda la base con acero por 20 s), casco (escudo), estrella (mejora el cañón). Derrota si destruyen la base **o** si se agotan las 3 vidas. Explícitamente sin modo 2P local: el eje VERSUS queda fuera de esta propuesta.
- **Controles:** `←` `→` `↑` `↓` mueven y orientan (el cañón apunta a donde se mueve, rotación en 4 direcciones), `Espacio` dispara (un proyectil propio en vuelo por vez, como el cañón de `invasores`). `preventDefault()` en flechas y espacio. Sin mouse.
- **Score:** entero monotónico: 100 / 200 / 300 / 400 según tipo de tanque, +500 al limpiar una oleada con la base intacta. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de mapa/oleada), `onGameOver` (edge-triggered, una sola vez, tanto por base destruida como por 0 vidas).
- **Assets:** **cero**. Tanques dibujados como composición de `fillRect` con orientación en 4 ángulos rectos (sin `rotate` arbitrario), ladrillo con patrón de 2 px, agua con dos frames de rayado alternado.
- **Canvas:** 1 × 800×600 (arena de 26×26 celdas de 20 px = 520×520 centrada, con márgenes laterales para el marcador de oleada).
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, grilla en array plano + entidades (`player`, `enemies[]`, `bullets[]`, `powerups[]`, `base`), un único `requestAnimationFrame`. Sin física continua ni dependencias externas.
  2. _Score_ — entero monotónico y escalonado por dificultad del enemigo.
  3. _Controles_ — teclado solo, esquema idéntico al de `rocas`/`invasores`; `preventDefault()` viable.
  4. _Estética_ — Battle City es pixel-art de grilla puro; se ve nativo en `.crt-screen`, y la erosión por cuartos de celda **se lee mejor** en pixel que en vectorial.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 3 a 5 minutos. Doble condición de derrota, ambas inequívocas, unificadas en un solo disparo de `onGameOver`.
  7. _Diversidad de catálogo_ — aporta dos cosas que hoy no existen: **terreno destructible persistente** y **enemigos con agencia propia** (los aliens de S01 se mueven en bloque guionado; los asteroides de `rocas` son inertes). Es el único candidato de la tanda con IA real.
  8. _Costo_ — **Alta**, la más cara de las cinco, a la altura de `rocas`. Tres piezas no triviales: persecución por grilla de la CPU (greedy hacia la base o hacia el jugador, con desempate aleatorio y giro solo en intersecciones — no hace falta A\*), colisión sub-celda del tanque contra muros erosionados por cuartos, y una tabla de mapas.
  9. _Slot vs alta nueva_ — alta nueva (1 migración + `.cover-blindados`). `duelo-pixel` (VERSUS) podría parecer cercano por la palabra "duelo", pero su ficha describe Pong y ese slot está fuera del alcance de este slice; reasignarlo a tanques exigiría reescribir copy, portada y `cat`.
- **Complejidad:** Alta — comparada con `rocas`. Conviene dejarla para después de haber entregado al menos una de las Medias/Baja de esta tanda.
- **Descartadas esta corrida:** duelo de tanques **2P local** en el mismo motor (criterio 2: dos jugadores no mapean a una única fila de `scores`, y el eje VERSUS está fuera del alcance de este slice), y tanques con terreno deformable **píxel a píxel** tipo Worms (criterios 1 y 8: la máscara de terreno por píxel más los proyectiles balísticos con viento multiplican el costo y sacan al motor del presupuesto de la receta).

### S11 — VÓRTICE (`vortice`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `vortice` · `title` `VÓRTICE` · `cat` `SHOOTER` · `color` `cyan` · `cover` `cover-vortice` · `sort_order` 14.
- **Mecánica:** shooter de túnel con oleadas radiales (linaje Tempest). El campo es un pozo poligonal de 16 carriles dibujado en falsa perspectiva: cada carril es un cuadrilátero entre el borde exterior (la boca del pozo) y el punto de fuga interior. El jugador es un "claw" que se desplaza por el borde exterior, un carril por pulsación sostenida, y dispara **hacia adentro** del pozo. Los enemigos suben desde el fondo: *flippers* que saltan de carril en carril y matan al llegar al borde, *spikers* que dejan una púa creciente en su carril (la púa mata al volar al nivel siguiente si no se la lima a tiros), y *fusibles* que, al alcanzar el borde, persiguen al jugador por el propio anillo. Un superzapper de un solo uso por nivel limpia la pantalla. Al vaciar un pozo, la nave "vuela" hacia adentro y aparece el siguiente, con otra forma (cerrado en anillo, en U abierta, en V) y más velocidad.
- **Controles:** `←` `→` girar por el borde del pozo, `Espacio` disparar, `Z` superzapper. Alternativa opcional de mouse (`mousemove` horizontal gira). `preventDefault()` en flechas y espacio.
- **Score:** entero monotónico: 50 por flipper, 100 por segmento de spiker, 150 por fusible, bonus de nivel = 1000 × número de pozo al limpiarlo, más los puntos del vuelo de transición. Nunca decrece.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de pozo), `onGameOver` (edge-triggered, al agotar vidas).
- **Assets:** **cero**. Todo el juego es `stroke()` de líneas de color sobre negro: es, literalmente, el candidato más neón posible del catálogo.
- **Canvas:** 1 × 800×600.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, **sin 3D real**. Cada pozo es un array de 16 segmentos con dos puntos precomputados (exterior e interior); la posición de cualquier entidad es `(carril, profundidad 0..1)` y se proyecta con una interpolación lineal entre esos dos puntos. Aritmética plana: cero WebGL, cero matrices de proyección. Un único `requestAnimationFrame`.
  2. _Score_ — entero monotónico con bonus creciente por pozo; buena dispersión para el leaderboard.
  3. _Controles_ — teclado solo (mouse opcional), `preventDefault()` viable.
  4. _Estética_ — el encaje estético más fuerte de la tanda: vectorial neón sobre negro, con la geometría del pozo reforzando el efecto de tubo del propio marco `.crt-screen`.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 2 a 4 minutos, con derrota inequívoca (0 vidas) y un solo disparo de `onGameOver`.
  7. _Diversidad de catálogo_ — sería el único juego, propuesto o existente, con **topología no cartesiana**: el jugador se mueve por un anillo o arco, no por un plano. Aporta un eje que ni `rocas` (plano toroidal), ni S01 `invasores` (plano), ni S07 (plano con scroll) cubren.
  8. _Costo_ — Media. Lo no trivial es el mapeo carril↔pantalla y el salto de carril de los flippers (con aritmética modular para los pozos cerrados y tope en los abiertos). El render, al ser solo líneas, es más barato que el de cualquier motor existente.
  9. _Slot vs alta nueva_ — alta nueva (1 migración + `.cover-vortice`). Ningún slot decorativo libre describe un shooter de túnel.
- **Complejidad:** Media — comparada con `arkanoide`; el costo está en geometría, no en assets ni en carga async.
- **Descartadas esta corrida:** **Gyruss** (anillo circular con disparo hacia el centro): misma familia radial, pero su formación de enemigos que desciende en espiral organizada se lee demasiado parecida a S01 `invasores` (criterio 7) y su fondo de túnel estelar ya lo cubre S07; y una versión con **wireframe 3D real** y matriz de proyección (criterio 1: excede el canvas 2D plano que exige `recipe.md`; criterio 8: sube el costo a Alta sin ganancia jugable sobre la proyección lineal precomputada).


### S12 — CRISTALES (`cristales`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `cristales` · `title` `CRISTALES` ·
  `cat` `PUZZLE` · `color` `magenta` · `cover` `cover-gemas` · `sort_order` 10.
- **Mecánica:** match-3 por intercambio sobre grilla 8×8. Se intercambian dos cristales
  adyacentes; si el intercambio forma una línea de 3 o más iguales (horizontal o vertical),
  esos cristales estallan, los de arriba caen por gravedad y la fila superior se rellena con
  cristales nuevos. Si la caída forma otra línea, encadena (cascada) con multiplicador
  creciente. Un intercambio que no forma línea **no se ejecuta** (vuelve solo, sin penalidad):
  eso mantiene el score estrictamente monotónico y evita la única fuente natural de resta.
  Reloj global de 90 s que baja continuamente; cada línea formada devuelve un poco de tiempo
  (+1 s por cristal estallado, con techo en 90 s), así que jugar bien alarga la partida y
  jugar mal la termina. Derrota única: el reloj llega a 0. Si el tablero queda sin ningún
  intercambio válido posible, se baraja solo (sin costo ni bonus) — nunca es un bloqueo.
- **Controles:** teclado — `←` `→` `↑` `↓` mueven el cursor de selección, `Espacio` / `Enter`
  selecciona el primer cristal y luego el adyacente a intercambiar, `Escape` cancela la
  selección. Mouse opcional: clic-clic sobre dos celdas adyacentes (mismo camino de código que
  el teclado, solo otro productor de eventos). `preventDefault()` en flechas y espacio.
- **Score:** entero monotónico creciente, nunca decrece. 30 puntos por cristal estallado
  multiplicado por el eslabón de cascada (×1 el primero, ×2 el segundo, ×3 el tercero…),
  +100 extra por línea de 4 y +250 por línea de 5. El score se reporta al terminar de resolver
  cada cascada completa (no frame a frame), así que `onScoreChange` se dispara pocas veces por
  segundo. Apto tal cual para la tabla `scores` y para `/salon`.
- **Callbacks:** `onScoreChange`, `onLevelChange` (nivel = `floor(score / 3000) + 1`; cada
  nivel acelera el drenaje del reloj y a partir del nivel 4 entra un sexto tipo de cristal),
  `onGameOver` (edge-triggered, una sola vez, en el frame en que el reloj cruza 0).
  Sin `onLivesChange` — no hay concepto de vidas, igual que `bloque-buster`.
- **Assets:** **cero**. Cada tipo de cristal es una forma geométrica distinta dibujada con
  `ctx` (rombo, círculo, cuadrado, triángulo, hexágono, estrella) **además** de su color neón:
  la forma es el canal redundante que hace legible el tablero en un CRT verde y para daltónicos.
- **Canvas:** 1 × 800×600. Grilla 8×8 de 64 px centrada (512×512) más una franja lateral con
  reloj y multiplicador de cascada actual.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro. Estado plano: `board[8][8]` de enteros, `cursor`,
     `selection`, `phase` ∈ `idle | swapping | clearing | falling | refilling`, `clock`. Un
     único `requestAnimationFrame` con `update(dt)`/`draw()` separados; las animaciones son
     interpolaciones sobre un `phaseT` en segundos, no `setTimeout`. Encaja sin fricción en
     `create<Name>Engine(canvas, callbacks) → { start, stop, setPaused, reset }`.
  2. _Score_ — entero monotónico por construcción: el único evento que suma es "cristal
     estallado", y el intercambio inválido se revierte sin costo en vez de restar. Granularidad
     fina (decenas de eventos por minuto), así que el leaderboard de SPEC 07 discrimina bien.
  3. _Controles_ — teclado con `preventDefault()`; el mouse es opcional y ya hay precedente
     (`arkanoide` usa `mousemove`).
  4. _Estética_ — formas geométricas planas con relleno neón sobre grilla oscura: es el dibujo
     más barato y más nativo posible dentro de `.crt-screen`. Nada fotográfico.
  5. _Assets_ — ninguno. Mejor que `serpentina` (atlas de frutas) y que `arkanoide`
     (spritesheet + 2 mp3). Sin gate de precarga.
  6. _Sesión corta_ — el reloj de 90 s acota la partida a 1,5–4 min según qué tan bien se
     juegue, con una derrota inequívoca y única (reloj a 0) que dispara `onGameOver` una vez.
  7. _Diversidad de catálogo_ — sería el **primer PUZZLE jugable** del sitio. Mecánicamente no
     se pisa con nada: no hay piezas que caigan desde arriba bajo control del jugador (eso es
     `bloque-buster`), no hay pelota ni paleta (`arkanoide`), no hay nave (`rocas`), no hay
     serpiente que crece (`serpentina`). La grilla es compartida con `serpentina`, pero ahí es
     un espacio de movimiento y acá es un espacio de manipulación.
  8. _Costo_ — Media. Por encima de `serpentina`, a la par de `arkanoide` pero sin assets ni
     precarga async. Las dos piezas no triviales son el detector de líneas (barrido por filas y
     columnas, O(64)) y la máquina de fases de la cascada con su animación de caída.
  9. _Slot vs alta nueva_ — ver nota común del encabezado: el único slot PUZZLE es `caida`
     (ficha = Tetris, asignado a otro slice), así que corresponde alta nueva.
- **Complejidad:** Media — comparada con `arkanoide` en volumen de lógica, más barata porque no
  necesita assets ni precarga.
- **Descartadas esta corrida:** `columnas` / Puyo-Puyo (criterio 7 y regla dura: son piezas que
  caen y se encastran en un pozo, exactamente lo que ya cubre `bloque-buster`; el match por
  color no alcanza para diferenciarlo), `inundacion` / Flood-It (criterio 2: el score natural es
  "cuántos movimientos sobraron", un entero chico de rango 0–5 que produce un leaderboard
  degenerado donde todos empatan, igual que el problema detectado en `duelo-pixel` en S01).

### S13 — CARGAMENTO (`cargamento`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `cargamento` · `title` `CARGAMENTO` ·
  `cat` `PUZZLE` · `color` `yellow` · `cover` `cover-cajas` · `sort_order` 11.
- **Mecánica:** empuje de cajas (Sokoban) sobre salas discretas de 8×8 a 12×10 celdas. Un
  montacargas se mueve en 4 direcciones y **empuja** (nunca tira) cajas hacia marcas de
  entrega. La sala se completa cuando todas las cajas están sobre marcas, y se encadena con la
  siguiente, más grande y con una caja más. Set curado de ~12 salas escalonadas y, a partir de
  ahí, salas generadas por un generador sembrado al azar en cada partida (se genera hacia atrás
  desde la solución, así que siempre son resolubles) — eso evita que el leaderboard se convierta
  en un concurso de memorización del set fijo.
- **Controles:** teclado — `←` `→` `↑` `↓` mover/empujar, `Z` deshacer el último movimiento
  (ilimitado), `R` reiniciar la sala actual. `preventDefault()` en las flechas. Sin mouse.
- **Score:** el punto delicado de esta propuesta, y resuelto así: el score **no** se define por
  nivel alcanzado sino por eventos de entrega, y nunca resta.
  - +200 por cada caja depositada sobre una marca, en el momento en que se deposita (evento
    intermedio, dentro de la sala: esto es lo que da granularidad y evita el score escalonado
    grueso típico de un puzzle por niveles);
  - +500 al completar la sala, +100 × número de sala como bonus de progresión;
  - +10 × movimientos sobrantes del presupuesto de la sala al completarla (el presupuesto son
    movimientos, no puntos, así que gastar de más nunca resta score).
  - Sacar una caja de una marca **no descuenta** los 200 ya otorgados: se marca esa caja como
    "ya cobrada" y no vuelve a pagar. Con eso el total es estrictamente monotónico creciente,
    entero, y con suficientes escalones (una partida típica cruza 30–60 eventos de suma) para
    que `scores` y `/salon` ordenen de verdad.
  - `Z` y `R` cuestan presupuesto de movimientos, nunca puntos.
- **Derrota:** presupuesto global de movimientos. La partida arranca con 250 movimientos; cada
  sala completada devuelve un paquete (+120, +6 por sala superada). Cuando el presupuesto llega
  a 0 en medio de una sala, se acabó: `onGameOver` una sola vez. Es la traducción arcade de un
  género que normalmente no tiene derrota, y es lo que lo hace apto para un salón de la fama.
- **Callbacks:** `onScoreChange`, `onLevelChange` (número de sala), `onGameOver`
  (edge-triggered, al agotarse el presupuesto). Sin `onLivesChange`.
- **Assets:** **cero**. Montacargas, cajas (cuadrado con aspa), marcas (cuadrado calado) y
  muros son `fillRect`/`strokeRect` sobre grilla. Las salas son datos: matrices de caracteres
  en un array del propio motor.
- **Canvas:** 1 × 800×600, celda de 48 px, sala centrada; el presupuesto restante se dibuja
  como barra fina en el borde inferior.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — el más simple de los cinco: `grid` de caracteres, `player {x,y}`,
     `undoStack[]`, `budget`. `update(dt)` casi no tiene física (solo la interpolación del paso
     de 120 ms entre celdas); un único `requestAnimationFrame`.
  2. _Score_ — ver arriba: entero monotónico garantizado por el marcado de "caja ya cobrada" y
     por hacer que todo castigo caiga sobre el presupuesto de movimientos, nunca sobre el score.
     Sin ese diseño este candidato se caía por el criterio 2, que es la advertencia estándar
     para los puzzles por niveles discretos.
  3. _Controles_ — 4 flechas + 2 teclas, con `preventDefault()`. El esquema más chico del
     catálogo.
  4. _Estética_ — tiles planos de 48 px con contorno neón: pixel-art nativo, legible en CRT.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — las salas se resuelven en 20–60 s cada una y el presupuesto acota la
     corrida entera a 3–5 min. Derrota clara y única.
  7. _Diversidad de catálogo_ — mecánica de empuje sobre grilla discreta, sin tiempo real:
     es lo más lejano que hay a los 4 motores existentes, todos de reflejos. Aporta el eje
     "pensar" que hoy no existe en el sitio.
  8. _Costo_ — **Baja**, a la altura de `serpentina`. La lógica de empuje son ~15 líneas; el
     único trabajo real es el set de salas (datos) y el generador inverso, que puede quedar
     fuera del MVP dejando solo las 12 curadas + repetición con rotación/espejado.
  9. _Slot vs alta nueva_ — ver nota común del encabezado.
- **Complejidad:** Baja — por debajo de `arkanoide` y comparable a `serpentina`; el generador
  procedural es la única parte opcionalmente cara y es diferible a una segunda iteración.
- **Duda anotada** (sin usuario a quien preguntar, se elige lo más defendible): si se decide
  cortar el generador procedural en el MVP, el leaderboard premia parcialmente la memorización
  de las 12 salas curadas. Mitigación barata dentro del MVP: rotar/espejar cada sala al azar al
  servirla, lo que multiplica por 8 las variantes con cero código de generación.
- **Descartadas esta corrida:** `deslizante` / rompecabezas de 15 piezas (criterio 2: el único
  evento puntuable es "tablero resuelto", un score escalonado grueso de 5–10 escalones por
  partida, sin eventos intermedios que lo suavicen; y criterio 6: los tableros grandes se
  vuelven largos y frustrantes), `atasco` / Rush Hour (misma familia de deslizar-para-despejar
  que esta propuesta, o sea cero aporte al criterio 7 si ya entra `cargamento`, y peor en el
  criterio 2: un solo evento de suma por nivel, sin el equivalente a la "caja depositada").

### S14 — TUBERÍAS (`tuberias`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `tuberias` · `title` `TUBERÍAS` ·
  `cat` `PUZZLE` · `color` `cyan` · `cover` `cover-tubos` · `sort_order` 12.
- **Mecánica:** conexión de tuberías contra reloj (Pipe Mania). Grilla de 10×7 celdas con una
  boca de entrada en una celda al azar. Una cola lateral muestra las próximas 5 piezas
  (codo ×4, recta ×2, cruce); el jugador coloca la primera de la cola en cualquier celda vacía,
  o **encima** de una tubería que todavía no está inundada. Tras una cuenta atrás de 20 s
  arranca el fluido, que avanza una celda cada N ms (N baja con el nivel) siguiendo las
  conexiones. El nivel se supera cuando el fluido recorre al menos K celdas (K crece por nivel)
  o alcanza la boca de salida; ahí se limpia la grilla y empieza el siguiente, más rápido y con
  más K. La pieza de cruce puede ser atravesada dos veces (una por eje) y paga doble.
- **Controles:** teclado — `←` `→` `↑` `↓` mueven el cursor sobre la grilla, `Espacio` /
  `Enter` coloca la pieza de la cola, `X` descarta la pieza actual (con un cooldown de 2 s para
  que no sea gratis). Mouse opcional: clic en la celda coloca. `preventDefault()` en flechas y
  espacio.
- **Score:** entero monotónico creciente. +50 por cada celda que el fluido efectivamente
  recorre (goteo continuo mientras avanza, un evento cada N ms: la fuente de granularidad más
  fina de las cinco propuestas), +100 extra la segunda vez que el fluido atraviesa un cruce,
  +1000 × nivel al superar el nivel. Descartar una pieza no resta puntos — cuesta tiempo, que
  es el recurso real. El fluido no puede "desandar", así que ninguna celda paga dos veces salvo
  el cruce, que paga exactamente una vez por eje.
- **Derrota / vidas:** si el fluido llega a un extremo abierto o a una celda vacía antes de
  cumplir K, es una fuga: se pierde una vida (3 al empezar) y el nivel se reinicia con grilla
  nueva, conservando el score acumulado. Con 0 vidas, `onGameOver` una sola vez.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas — alimenta los corazones reales del
  HUD), `onLevelChange`, `onGameOver` (edge-triggered).
- **Assets:** **cero**. Cada tipo de tubería es un par de trazos (`lineTo` / `arc`) con
  `lineWidth` grueso; el fluido es el mismo trazo redibujado en color neón con un relleno
  parcial interpolado, lo que además da la animación de avance gratis.
- **Canvas:** 1 × 800×600. Grilla 10×7 de 76 px (760×532) más columna lateral de 40 px con la
  cola de piezas y la cuenta atrás.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro. Estado plano: `grid[7][10]` de `{ type, rot,
     filledFrom, filledTo }`, `queue[5]`, `flow { cell, dir, t }`, `cursor`, `lives`, `level`.
     Un único `requestAnimationFrame`; `update(dt)` solo avanza el fluido y la cuenta atrás.
  2. _Score_ — el mejor de los cinco en granularidad: el fluido paga por celda recorrida, o sea
     que el score sube de forma casi continua durante toda la partida. Entero, monotónico y con
     rango amplio; `scores` y `/salon` ordenan sin empates.
  3. _Controles_ — teclado con `preventDefault()`; mouse opcional con precedente en `arkanoide`.
  4. _Estética_ — trazos gruesos de color sobre grilla oscura, con el fluido avanzando como una
     línea neón: es casi una demo de la estética CRT del sitio. Altamente legible a 800×600.
  5. _Assets_ — ninguno, ni sprites ni audio.
  6. _Sesión corta_ — cada nivel dura 40–70 s y las 3 vidas acotan la corrida a 2–5 min, con
     derrota inequívoca.
  7. _Diversidad de catálogo_ — presión de tiempo real **sin** reflejos: la tensión es de
     planificación bajo reloj, no de puntería ni de esquive. No se parece a ninguno de los 4
     motores vivos ni a las otras 4 propuestas de este slice (no hay match por color, no hay
     empuje en grilla, no hay deducción, no hay disparo).
  8. _Costo_ — Media. Comparable a `arkanoide` sin assets. Las piezas no triviales son la tabla
     de conexiones por tipo/rotación (dato puro) y el paso del fluido celda a celda con
     tratamiento especial del cruce.
  9. _Slot vs alta nueva_ — ver nota común del encabezado.
- **Complejidad:** Media — comparada con `arkanoide` en volumen de lógica, más barata por no
  tener spritesheet, audio ni gate de precarga.
- **Descartadas esta corrida:** `espejos` / laberinto de láser y espejos (criterio 2: el único
  evento puntuable es "nivel resuelto", sin goteo intermedio como el que aquí da el fluido, y
  criterio 6: los niveles de deducción óptica se estiran a varios minutos cada uno),
  `interruptores` / Lights Out (criterio 2: score plano, cada tablero paga una vez y se resuelve
  en 30 s; criterio 7: la interacción se reduce a pulsar celdas, sin tensión ni progresión
  legible en el HUD).

### S15 — ZONA MINADA (`zona-minada`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `zona-minada` · `title` `ZONA MINADA` ·
  `cat` `PUZZLE` · `color` `green` · `cover` `cover-minas` · `sort_order` 13.
- **Mecánica:** deducción lógica sobre grilla, en formato arcade encadenado. Tablero de 9×9 con
  10 minas; al despejarlo entero se sirve el siguiente, más grande y más denso (12×12/25,
  16×16/50, y de ahí en adelante escalando la densidad). Cada celda despejada muestra cuántas
  minas tiene alrededor; el 0 propaga en cascada por inundación. El primer clic de cada tablero
  es siempre seguro (las minas se siembran después de conocerlo) y además abre una cascada, así
  que nunca hay un arranque a ciegas. Reloj por tablero (120 s, menos a medida que sube el
  nivel) para que nadie se quede clavado en un 50/50.
- **Controles:** teclado — `←` `→` `↑` `↓` mueven el cursor, `Espacio` despeja, `F` pone o quita
  bandera. Mouse opcional: clic izquierdo despeja, clic derecho pone bandera con
  `preventDefault()` sobre `contextmenu` (listener agregado en `start()` y removido en `stop()`,
  como el resto). `preventDefault()` en flechas y espacio.
- **Score:** entero monotónico creciente. +10 por cada celda segura revelada (las celdas que
  abre la cascada cuentan una por una: de ahí sale la granularidad), +500 × nivel al despejar el
  tablero, +25 por cada mina correctamente marcada en el momento de despejar el tablero, y
  +5 × segundos restantes del reloj como bonus de cierre. Pisar una mina o marcar mal **no
  resta puntos**: cuesta una vida o queda simplemente sin bonus.
- **Derrota / vidas:** 3 vidas. Pisar una mina cuesta una vida y esa mina queda visible y
  bloqueada — el tablero continúa, no se acaba la partida: eso mantiene la sesión en
  movimiento y evita el final abrupto del buscaminas clásico. Que se agote el reloj del tablero
  también cuesta una vida y reparte un tablero nuevo del mismo tamaño. Con 0 vidas,
  `onGameOver` una sola vez.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (número de
  tablero), `onGameOver` (edge-triggered).
- **Assets:** **cero**. Celdas y banderas son `fillRect`/trazos; los números 1..8 son
  `ctx.fillText` con la mono del sitio y un color distinto por valor, exactamente el código de
  color del buscaminas original traducido a la paleta neón.
- **Canvas:** 1 × 800×600, celda de tamaño variable según el tablero (de 56 px en 9×9 a 32 px
  en 16×16) para que la grilla siempre quede centrada y legible.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — el estado es dos matrices (`mines[][]`, `state[][]` ∈ oculta /
     revelada / con bandera) más `cursor`, `lives`, `clock`. `update(dt)` solo corre el reloj:
     es un juego dirigido por eventos dentro de un único `requestAnimationFrame` que dibuja a
     60 fps. Encaje perfecto con la factory.
  2. _Score_ — entero monotónico por construcción: todo lo que suma es "celda segura revelada"
     y los bonus de cierre; los errores se pagan con vidas y con reloj, nunca con puntos. Una
     partida buena cruza cientos de eventos de +10, así que discrimina finísimo en `/salon`.
  3. _Controles_ — teclado completo (nadie queda excluido si no usa mouse) más mouse opcional
     con `contextmenu` neutralizado; todo con `preventDefault()`.
  4. _Estética_ — grilla de celdas biseladas con números monoespaciados de colores: es
     literalmente estética de terminal de los 80, la que mejor se banca el filtro CRT.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 30–90 s por tablero y 3 vidas dan corridas de 2–5 min con derrota única.
  7. _Diversidad de catálogo_ — es el único candidato **sin presión de reflejos en absoluto**:
     el jugador puede pensar (dentro del reloj). Frente a las otras cuatro propuestas no
     comparte mecánica con ninguna, y frente a los 4 motores vivos es el opuesto exacto.
  8. _Costo_ — **Baja**, la más barata de las cinco, a la altura de `serpentina`. La única
     rutina no trivial es la inundación iterativa (con pila explícita, no recursión, para no
     desbordar en tableros grandes) y el sembrado diferido al primer clic.
  9. _Slot vs alta nueva_ — ver nota común del encabezado.
- **Complejidad:** Baja — comparada con `serpentina`; sin assets, sin física, sin precarga.
- **Duda anotada:** el buscaminas clásico puede generar posiciones de adivinanza pura (50/50).
  No se propone un generador "sin adivinanza" (cara, requiere un solver en el loop de
  generación): las 3 vidas y el reloj absorben esas posiciones, que es el criterio arcade
  habitual. Si en la implementación se quiere subir la calidad, el solver queda como extensión.
- **Descartadas esta corrida:** `sudoku` (criterio 2: no existe score monotónico natural — el
  único evento es "tablero resuelto" y el tiempo es una métrica de menor-es-mejor que la tabla
  `scores` no sabe ordenar; criterio 6: 10+ minutos por tablero, fuera del rango de sesión;
  criterio 4: 81 dígitos densos son ilegibles con el filtro CRT a 800×600), `nonograma` /
  Picross (criterio 6: una grilla de 15×15 lleva 10–20 min; criterio 4: las pistas numéricas en
  los márgenes exigen tipografía chica que el CRT desarma; criterio 2: mismo problema de un
  solo evento puntuable por tablero).

### S16 — BURBUJAS (`burbujas`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** alta nueva en `games`. Fila propuesta: `id` `burbujas` · `title` `BURBUJAS` ·
  `cat` `PUZZLE` · `color` `magenta` · `cover` `cover-burbujas` · `sort_order` 14.
- **Mecánica:** burbujas disparadas a un techo que baja (Puzzle Bobble). Una masa de burbujas de
  colores cuelga del techo sobre una grilla hexagonal de filas alternadas. Abajo, un cañón fijo
  gira entre −80° y +80° y dispara la burbuja en turno, que rebota en las paredes laterales y se
  pega al primer contacto con la masa, encajando en la celda hexagonal libre más cercana. Si al
  pegarse forma un grupo de 3 o más del mismo color, el grupo estalla; y toda burbuja que quede
  **desconectada del techo** cae y paga extra. Cada 6 disparos sin estallar nada, el techo baja
  una fila. Se despeja el tablero → siguiente nivel, con un color más y techo más agresivo.
- **Controles:** teclado — `←` `→` giran el cañón (con giro fino si se mantiene `Shift`),
  `Espacio` dispara, `↓` intercambia la burbuja cargada con la de reserva. Mouse opcional para
  apuntar. `preventDefault()` en flechas y espacio.
- **Score:** entero monotónico creciente. +10 por burbuja estallada × el tamaño del grupo
  (un grupo de 5 paga 10 × 5 × 5 = 250: premia la jugada planificada por sobre el trámite),
  +25 por cada burbuja que cae por desconexión, +1000 × nivel al despejar el tablero. Fallar un
  disparo no resta: acerca el descenso del techo, que es el castigo real.
- **Derrota:** cuando cualquier burbuja cruza la línea inferior del cañón. `onGameOver` una sola
  vez, en ese frame.
- **Callbacks:** `onScoreChange`, `onLevelChange` (número de tablero), `onGameOver`
  (edge-triggered). Sin `onLivesChange` — es una corrida continua, como `bloque-buster`.
- **Assets:** **cero**. Cada burbuja es un `arc` relleno con un brillo (segundo `arc` chico más
  claro) y un símbolo interno distinto por color (punto, aspa, anillo, barra…), de nuevo como
  canal redundante al color. La mira es una línea punteada con su rebote precalculado.
- **Canvas:** 1 × 800×600. Zona de juego de 13 columnas × radio 30 px, cañón centrado abajo.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, sin física de motor externo: la burbuja en vuelo es
     un punto con velocidad constante y reflexión en `x`; el resto es geometría hexagonal
     entera. Estado plano: `grid[row][col]`, `shot`, `cannonAngle`, `queue`, `shotsSinceClear`.
     Un único `requestAnimationFrame` con `update(dt)`/`draw()`.
  2. _Score_ — entero monotónico creciente; el bonus cuadrático por tamaño de grupo da un rango
     amplio y separa bien al jugador que planifica del que tira por tirar. Sin restas.
  3. _Controles_ — teclado con `preventDefault()`, mismo esquema de `rocas` (`←` `→` +
     `Espacio`), lo que lo hace inmediato para quien ya jugó ahí.
  4. _Estética_ — círculos neón sobre fondo oscuro con la mira punteada: muy legible en CRT y
     visualmente el más vistoso de las cinco propuestas (buena portada, buena captura).
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — 2–4 min por corrida, derrota inequívoca (una burbuja cruza la línea) y
     única.
  7. _Diversidad de catálogo_ — aunque haya un cañón, **no es un shooter**: no hay enemigos que
     ataquen, ni proyectiles hostiles, ni esquive; el disparo es el verbo de colocación de un
     puzzle de emparejado, y el fracaso es de planificación (dejar colores sueltos), no de
     reflejos. Frente a `rocas` (vuelo libre con inercia) y a `invasores` de S01 (formación
     hostil que dispara de vuelta) no comparte ni bucle ni tensión. Frente a S12 comparte la
     familia "match por color", pero el verbo es puntería y trayectoria con rebote en vez de
     intercambio en grilla, y la grilla es hexagonal con conectividad al techo.
  8. _Costo_ — **Media-Alta**, la más cara de las cinco: por debajo de `rocas` (no hay inercia
     vectorial, ni fragmentación, ni power-ups, ni partículas) pero por encima de `arkanoide` en
     lógica. Las piezas no triviales son la aritmética de vecinos en grilla hexagonal de filas
     desplazadas, **dos** recorridos de inundación por disparo (grupo del mismo color, y
     conectividad al techo para las caídas) y el encaje del punto en vuelo a la celda libre.
  9. _Slot vs alta nueva_ — ver nota común del encabezado.
- **Complejidad:** Media-Alta — entre `arkanoide` y `rocas`; sin assets ni precarga, pero con la
  lógica de grilla hexagonal como costo propio. Si hay que priorizar dentro del slice, es la
  última de las cinco por costo/beneficio, aunque la primera por atractivo visual.
- **Descartadas esta corrida:** `mahjong` / solitario de fichas (criterio 5: exige un atlas de
  144 fichas con ideogramas, muchísimo más caro que el único atlas del proyecto —
  `serpentina/fruits.png` —; criterio 4: esos dibujos son ilegibles a tamaño de ficha bajo el
  filtro CRT; criterio 6: sesiones de 10+ min), `zuma` / esferas que avanzan por un camino
  (criterio 7: es la misma familia de emparejado por color que esta propuesta, así que no
  aportaría diversidad si `burbujas` entra; criterio 8: además es más caro, porque exige una
  curva paramétrica con inserción y recolocación de toda la cadena de esferas).

### S17 — PARÁBOLA (`parabola`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva** en `games` — ningún slot decorativo sirve: el único VERSUS existente
  (`duelo-pixel`) tiene ficha explícita de Pong y pertenece al dominio del slice A. Fila propuesta:
  - `id` / `slug`: `parabola`
  - `title`: `PARÁBOLA`
  - `cat`: `VERSUS`
  - `color`: `yellow`
  - `cover`: `cover-parabola` (clase CSS nueva: dos torres pixeladas en los extremos sobre horizonte
    oscuro y una traza punteada en arco entre ellas; mismo lenguaje de gradientes que `.cover-duelo`)
  - `sort_order`: 10 (provisional, ver nota de cabecera)
- **Mecánica:** duelo de artillería **por turnos**. Dos torres apoyadas sobre un terreno recortado
  (heightmap de una columna por píxel, destructible por cráteres circulares) en los extremos opuestos
  de la pantalla. En tu turno ajustás **ángulo** y **potencia**, disparás, y el proyectil vuela con
  gravedad constante más **viento** lateral (aleatorio por ronda, mostrado en el HUD del canvas).
  El impacto abre un cráter en el terreno y aplica daño por proximidad a la torre enemiga; el terreno
  bajo una torre que queda sin soporte la hace caer y recibir daño. Cada torre tiene 100 HP.
  Ronda ganada = enemigo a 0 HP; entonces arranca la siguiente ronda con viento más fuerte y la torre
  rival más lejos y más angosta.
  **Dos modos, elegidos en la pantalla de inicio del propio canvas** (tecla `1` / `2`, es una pantalla
  de arranque, no UI dentro de la pausa):
  - **1P — Campaña contra la CPU**: el modo canónico, el único que alimenta el leaderboard. La CPU
    dispara con un error de puntería que se reduce ronda a ronda.
  - **2P — Duelo local hot-seat** en el mismo teclado: el modo "VERSUS" real de la ficha.
- **Controles:** turno de P1 → `A` / `D` ángulo (±1°, `Shift` para paso fino), `W` / `S` potencia,
  `Espacio` disparar. Turno de P2 (solo en 2P) → `←` / `→` ángulo, `↑` / `↓` potencia, `Enter` disparar.
  En 1P la CPU juega su turno sola y el jugador usa el set de P1. `preventDefault()` en flechas,
  `Espacio` y `Enter`. Sin mouse.
- **Score:** entero monotónico creciente, **solo en el modo 1P**. Impacto directo en la torre rival
  500; impacto cercano 100–400 por proximidad decreciente; +300 si acertás con el **primer** disparo
  de la ronda; +200 × número de ronda al ganar la ronda; +2 por cada punto de HP propio que sobrevive
  al cierre de ronda. Un disparo errado suma 0 — **nunca resta**, así que el valor que ve
  `onScoreChange` es no decreciente y sirve tal cual para la tabla `scores` y para `/salon`.
  **Resolución explícita del criterio 2 en un juego VERSUS:** en el modo 2P el motor reporta
  `onScoreChange(0)` y cierra con `onGameOver(0)` — un duelo humano contra humano no produce un
  puntaje atribuible al usuario logueado, así que deliberadamente no produce ninguno. `GamePlayer`
  sigue genérico (muestra 0 y, si el usuario guarda, inserta un 0 que jamás contamina el top del
  leaderboard). Si el implementador prefiere riesgo cero, la v1 puede shipear **solo el modo 1P** y
  dejar el hot-seat para una v2: la categoría VERSUS se justifica igual porque el enfrentamiento
  cabeza a cabeza es el núcleo del juego.
- **Callbacks:** `onScoreChange`, `onLivesChange` (HP propio mapeado a 3 "vidas" = torres restantes
  de la campaña; se reinicia el HP al ganar una ronda), `onLevelChange` (número de ronda),
  `onGameOver` (edge-triggered, una sola vez, en el frame en que tu torre llega a 0 HP — o, en 2P,
  cuando cualquiera de las dos cae).
- **Assets:** **cero**. Terreno = un `Uint16Array` de alturas dibujado con `fillRect` por columna;
  torres, cañón y proyectil = rectángulos y una línea; el arco de tiro = puntos dibujados cada N
  frames. Sin audio. **Canvas:** 1 × 800×600, resolución interna fija, misma escala CSS que `rocas`
  dentro de `.crt-screen`.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro. Estado plano (`terrain: Uint16Array`, `towers[2]`,
     `shell | null`, `wind`, `turn`, `phase`). Un único `requestAnimationFrame`: el juego por turnos
     no necesita un segundo loop — las fases `AIM` / `FLIGHT` / `RESOLVE` son un switch dentro del
     mismo `update(dt)`, y en `AIM` el loop sigue corriendo para animar la mira. `start`/`stop`/
     `setPaused`/`reset` calzan sin fricción.
  2. _Score_ — entero monotónico, resuelto arriba con el modo 1P como fuente única del leaderboard.
  3. _Controles_ — teclado puro, dos sets disjuntos en el mismo teclado (WASD+Espacio / flechas+Enter),
     con `preventDefault()` viable en todas las teclas que scrollean.
  4. _Estética_ — terreno recortado por columnas y proyectil de 3×3 px es pixel-art nativo; el arco
     punteado y los cráteres neón se ven excelentes dentro de `.crt-screen`.
  5. _Assets_ — ninguno, igual que `rocas` e `invasores` (S01) y mejor que `serpentina`/`arkanoide`.
  6. _Sesión corta_ — cada disparo resuelve en ~3 s; una ronda dura 20–40 s y una campaña 2–4 min,
     con derrota inequívoca (torre a 0 HP) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — hoy hay **0 motores reales en VERSUS** (la categoría existe con una
     única fila decorativa), así que es la mayor ganancia de diversidad disponible. El verbo
     —apuntar con dos parámetros y esperar— no existe en ningún motor actual: no hay movimiento
     continuo del avatar, no hay esquiva y no hay presión de tiempo por frame. No se parece a `rocas`
     (vuelo libre + disparo directo instantáneo), ni a `arkanoide`, ni a `serpentina`, ni a
     `bloque-buster`.
  8. _Costo_ — **Media**. Comparable a `arkanoide` en volumen de lógica. Las piezas no triviales son
     el heightmap destructible (barato: cráter = restar un semicírculo de alturas) y la IA de la CPU
     (una búsqueda binaria sobre el ángulo con ruido inyectado; ~30 líneas). Por debajo de `rocas`
     porque no hay partículas, ni fragmentación, ni power-ups, ni precarga async.
  9. _Slot vs alta nueva_ — se evaluó llenar `duelo-pixel`, y se descarta por dos motivos:
     su copy describe literalmente Pong (habría que reescribir ficha + portada, que es justamente
     lo que el criterio 9 quiere evitar), y ese slot es dominio del slice A en esta corrida.
     El alta nueva cuesta 1 INSERT + 1 clase CSS, sin tocar copy existente.
- **Complejidad:** Media — comparada con `arkanoide` (parecido volumen de lógica, pero sin
  spritesheet, sin audio y sin gate de precarga).
- **Descartadas esta corrida:** duelo de **tanques 2P con disparo directo en arena** (criterio 7:
  moverse libre y disparar en línea recta es exactamente el verbo de `rocas`; aporta poco sobre un
  motor ya implementado), **air hockey / duelo de penales 2P** (criterio 7: paleta + pelota + rebote
  es la mecánica de `arkanoide`, explícitamente vetada; y criterio 2, el marcador a 7 u 11 puntos
  produce el mismo leaderboard degenerado que ya hizo descartar Pong en S01).
- **Handoff:** `/nuevo-juego parabola`

---

### S18 — DOMINIO (`dominio`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva** en `games` — mismo razonamiento que S17: el único slot VERSUS está tomado
  por la ficha de Pong y por el slice A. Fila propuesta:
  - `id` / `slug`: `dominio`
  - `title`: `DOMINIO`
  - `cat`: `VERSUS`
  - `color`: `magenta`
  - `cover`: `cover-dominio` (clase CSS nueva: tablero de celdas con un damero irregular
    cyan/magenta y una frontera dentada al medio)
  - `sort_order`: 11 (provisional)
- **Mecánica:** **captura de territorio** en grilla. Arena de 40×30 celdas de 20 px con paredes
  fijas. Dos corredores se mueven en continuo por la grilla (4 direcciones, avance celda a celda con
  interpolación de dibujo) y **pintan de su color cada celda que pisan**, incluyendo las que el rival
  ya pintó. Ronda de 60 s: gana quien controla más celdas al sonar el reloj. Chocar contra el rival te
  devuelve a tu base y te cuesta una vida; además hay **celdas de impulso** (boost de 2 s) y
  **celdas neutras protegidas** que hay que pisar dos veces, para que la arena no sea una carrera
  plana. Rondas encadenadas: cada ronda ganada sube la velocidad base y la agresividad del rival.
  **Dos modos elegidos en la pantalla de inicio** (`1` / `2`), igual que S17: 1P contra CPU (modo
  canónico del leaderboard) y 2P local hot-seat en el mismo teclado.
- **Controles:** P1 `W` `A` `S` `D`; P2 `↑` `←` `↓` `→`. En 1P el jugador usa WASD y la CPU maneja al
  rival. `preventDefault()` en las cuatro flechas. Sin mouse.
- **Score:** entero monotónico, **solo en el modo 1P**. El score **no** es el conteo de territorio
  actual (ese sube y baja cuando el rival te repinta, y no serviría para `scores`): es un **contador
  acumulado de eventos de pintado** — +10 por celda neutra pintada, +25 por celda robada al rival,
  +100 por celda de impulso —, que por construcción nunca decrece. Al cerrar la ronda se suma un bono
  de +5 por cada punto porcentual de territorio controlado y +500 × número de ronda si ganaste.
  **Resolución explícita del criterio 2 en VERSUS:** idéntica a S17 — en 2P el motor reporta 0 y
  cierra con `onGameOver(0)`, porque un resultado humano-vs-humano no es atribuible a un usuario de
  `scores`; el leaderboard se alimenta exclusivamente del modo 1P contra CPU, donde el score mide
  rendimiento del jugador y supervivencia entre rondas.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas; cada choque con el rival resta una y
  respawnea en la base con 1 s de invulnerabilidad), `onLevelChange` (número de ronda),
  `onGameOver` (edge-triggered: al perder una ronda por territorio, o al llegar a 0 vidas).
- **Assets:** **cero**. Todo es `fillRect` sobre una grilla y un `Uint8Array` de propietario por
  celda. Sin audio. **Canvas:** 1 × 800×600, grilla de 40×30 celdas de 20 px — exactamente la misma
  geometría que `serpentina`, así que el andamiaje de grilla ya tiene precedente en el repo.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro. Estado plano (`owner: Uint8Array(1200)`, `walls: Uint8Array`,
     `riders[2]`, `timer`, `round`). Un único `requestAnimationFrame` con `update(dt)`/`draw()`
     separados; el repintado incremental permite dibujar solo las celdas sucias si hiciera falta.
     Factory `createDominioEngine(canvas, callbacks) → { start, stop, setPaused, reset }` directa.
  2. _Score_ — entero monotónico por diseño (contador de eventos, no de estado), resuelto arriba.
  3. _Controles_ — dos sets de teclado disjuntos en el mismo teclado, con `preventDefault()` en flechas.
     Es el esquema canónico de un VERSUS local y no pide nada que el navegador bloquee.
  4. _Estética_ — una grilla de celdas neón en dos colores del sistema (cyan vs magenta) es
     literalmente el lenguaje visual de `globals.css`; se ve nativo en `.crt-screen`.
  5. _Assets_ — ninguno. Mejor que `serpentina`, que necesita su atlas de frutas.
  6. _Sesión corta_ — ronda de 60 s; una partida de 2–4 rondas dura 2–4 min, con final inequívoco
     (perder la ronda o quedarse sin vidas) que dispara `onGameOver` una sola vez.
  7. _Diversidad de catálogo_ — segundo motor VERSUS, categoría hoy vacía de motores reales. El verbo
     es **denegación de espacio**: no se dispara, no se esquiva un proyectil y no se encastra nada.
     Se comparte la grilla de 20 px con `serpentina`, pero ahí termina el parecido: no hay cola que
     crezca, no hay auto-colisión, no hay fruta que rutear, y el estado que importa es el del
     **tablero**, no el del avatar. Es el candidato VERSUS que menos se pisa con lo implementado.
  8. _Costo_ — **Media**. Movimiento en grilla y pintado son triviales; el costo real está en la IA
     del rival (flood-fill corto hacia el clúster de celdas no propias más cercano, con evasión del
     jugador) y en el contador de territorio incremental.
  9. _Slot vs alta nueva_ — ningún slot decorativo describe captura de territorio; `duelo-pixel` es
     Pong y es del slice A. Alta nueva = 1 INSERT + 1 clase CSS, sin reescribir copy ajeno.
- **Complejidad:** Media — por encima de `serpentina` (que es la vara baja) por la IA y el conteo de
  territorio, por debajo de `rocas`.
- **Descartadas esta corrida:** **estelas / light-cycles** (criterio 7: dejar un rastro sólido en un
  campo cerrado y morir al tocarlo es exactamente la habilidad que ya entrena `serpentina` —
  un jugador lo leería como "Serpentina para dos"; y criterio 2, el score natural, "rondas ganadas",
  es un entero chico y degenerado, el mismo defecto por el que S01 descartó Pong. Se prefirió
  `dominio`, que usa la misma grilla pero cambia el verbo), **sumo / empuje fuera del ring 2P**
  (criterio 7: el modelo de impulso e inercia con rebotes elásticos lo acerca demasiado a `rocas`;
  y criterio 2, un ring-out produce "mejor de 5", otro marcador chico que degenera el leaderboard).
- **Handoff:** `/nuevo-juego dominio`

---

### S19 — DESCENSO (`descenso`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva** en `games`. El slot ARCADE más cercano sería `ranaria`, pero su ficha es
  Frogger (pantalla fija, cruzar carriles y un río) y además es dominio del slice A. Fila propuesta:
  - `id` / `slug`: `descenso`
  - `title`: `DESCENSO`
  - `cat`: `ARCADE`
  - `color`: `cyan`
  - `cover`: `cover-descenso` (clase CSS nueva: pendiente diagonal con pares de banderas alternadas
    cyan/magenta y triángulos-abeto en los costados)
  - `sort_order`: 12 (provisional)
- **Mecánica:** descenso de esquí con **scroll vertical infinito**. Vista cenital; el esquiador queda
  fijo en el tercio superior y la montaña sube. Cinco posturas de carving (`izq fuerte`, `izq suave`,
  `recto`, `der suave`, `der fuerte`) que determinan el vector de avance; la postura de **huevo**
  (`↓`) acelera pero congela el carving durante medio segundo, que es la decisión táctica del juego.
  La pendiente crece con la altitud, así que la velocidad base sube sola. La montaña genera por
  bandas: abetos, rocas, otros esquiadores lentos, **puertas de slalom** (pares de banderas que
  conviene atravesar) y **rampas** (`Espacio` para saltar y pasar por encima de un obstáculo,
  con tiempo de aire bonificado). Chocar = caída: una vida menos, 1,5 s de reincorporación con
  invulnerabilidad parpadeante y velocidad reseteada.
- **Controles:** `←` / `→` carving (un escalón de postura por pulsación), `↓` huevo, `Espacio` salto
  en rampa. `preventDefault()` en flechas y espacio. Sin mouse.
- **Score:** entero monotónico: **+1 por metro descendido** (el scroll acumulado, nunca retrocede),
  **+100 por puerta de slalom atravesada entre banderas**, **+25 por cada décima de segundo de aire**
  en un salto limpio, y **+500 al cerrar un tramo** (cada 1000 m). Una caída no resta: solo corta la
  velocidad y el multiplicador de racha. Entero creciente y bien distribuido para `scores`.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 caídas), `onLevelChange` (tramo = `floor(m/1000)+1`),
  `onGameOver` (edge-triggered, al agotarse las vidas).
- **Assets:** **cero**. Abetos = dos triángulos, rocas = polígonos de 5 vértices, banderas = dos
  `fillRect`, esquiador = un cuerpo de 3 rects cuya rotación es la postura. Sin audio.
  **Canvas:** 1 × 800×600, resolución interna fija.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro, entidades planas en un array de obstáculos con culling por
     `y`, spawner por bandas al cruzar umbrales de scroll. Un solo `requestAnimationFrame`,
     `update(dt)`/`draw()` separados con `dt` capeado como en `rocas`.
  2. _Score_ — metros + bonos, entero monotónico creciente; es el patrón de score más limpio de todo
     el slice.
  3. _Controles_ — 4 teclas, `preventDefault()` trivial, sin mouse.
  4. _Estética_ — siluetas geométricas sobre fondo oscuro con banderas neón: pixel-art directo,
     legible en `.crt-screen`.
  5. _Assets_ — ninguno.
  6. _Sesión corta_ — la dificultad escala con la altitud, así que una partida típica dura 1,5–3 min
     y termina inequívocamente al gastar las 3 caídas.
  7. _Diversidad de catálogo_ — sería el cuarto ARCADE con motor real, pero introduce un verbo que el
     catálogo no tiene: **scroll continuo y esquiva a velocidad creciente**. `serpentina` es grilla
     discreta, `arkanoide` es rebote, `bloque-buster` es encastre y `rocas` es vuelo inercial en
     pantalla toroidal — ninguno tiene un mundo que avanza solo. No se pisa con `ranaria` (Frogger es
     pantalla fija, avance a saltos discretos y carriles de ida y vuelta).
  8. _Costo_ — **Media-Baja**. Un poco por encima de `serpentina` (spawner + colisiones círculo/AABB +
     las cinco posturas) y claramente por debajo de `arkanoide`.
  9. _Slot vs alta nueva_ — se evaluó `ranaria` y se descarta: su copy ("cruzar carriles de tráfico y
     un río de troncos contra reloj") describe otra mecánica, reutilizarlo obligaría a reescribir
     ficha y portada, y el slot es del slice A. Alta nueva = 1 INSERT + 1 clase CSS.
- **Complejidad:** Media-Baja — entre `serpentina` (baja) y `arkanoide` (media). Es el mejor
  ratio valor/costo de las tres ARCADE de este slice.
- **Descartadas esta corrida:** **salto de esquí en dos fases (impulso + vuelo)** (criterio 6: la
  partida dura 15 s y se agota como bucle; criterio 2: el score por salto es un entero chico con
  poquísima varianza, mal leaderboard), **snowboard en halfpipe con trucos** (criterio 2: puntuar
  combos/aterrizajes exige un sistema de jueces difícil de hacer legible y monotónico; criterio 8:
  la animación de rotaciones lo empuja a Alta sin aportar sobre `descenso`).
- **Handoff:** `/nuevo-juego descenso`

---

### S20 — TURBO (`turbo`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva** en `games` — ningún slot decorativo describe conducción. Fila propuesta:
  - `id` / `slug`: `turbo`
  - `title`: `TURBO`
  - `cat`: `ARCADE`
  - `color`: `magenta`
  - `cover`: `cover-turbo` (clase CSS nueva: carretera en perspectiva con bandas alternadas que se
    angostan hacia un horizonte con sol partido en scanlines — el cliché Out Run, que es exactamente
    la estética del sitio)
  - `sort_order`: 13 (provisional)
- **Mecánica:** carrera arcade en **pseudo-3D por segmentos** (linaje Pole Position / Out Run).
  La pista es un array de segmentos con curvatura y pendiente acumuladas; cada frame se proyectan
  ~300 segmentos desde la posición del jugador y se dibujan como trapecios de asfalto, bordes y
  césped alternados. La curva empuja el auto hacia afuera a alta velocidad (hay que contra-dirigir),
  el césped frena y sacude, y los rivales aparecen como cajas escaladas por el mismo factor de
  proyección. **El juego es contra el reloj**: arrancás con 60 s y cada checkpoint suma tiempo;
  el objetivo es encadenar tramos. Nitro limitado que se recarga por adelantamiento limpio.
- **Controles:** `↑` acelerar, `↓` frenar, `←` / `→` dirigir, `Espacio` nitro. `preventDefault()` en
  flechas y espacio. Sin mouse.
- **Score:** entero monotónico: **+1 por cada 10 m recorridos**, **+150 por rival adelantado**,
  **+1000 × número de checkpoint** al cruzarlo, **+2 por cada segundo sobrante** en el reloj al
  cruzar un checkpoint. Chocar no resta puntos: cuesta velocidad, que es lo que cuesta tiempo.
  Estrictamente creciente, apto para `scores`.
- **Callbacks:** `onScoreChange`, `onLevelChange` (tramo = checkpoint alcanzado), `onGameOver`
  (edge-triggered, exactamente en el frame en que el reloj llega a 0). **Sin `onLivesChange`**: no
  hay concepto de vidas, igual que `bloque-buster` — el HUD de `GamePlayer` deja los 3 corazones
  fijos, que es el comportamiento ya aceptado para Tetris (anotar en el spec para que no se lea como
  bug, y no tocar `GamePlayer` por esto).
- **Assets:** **cero**. Todo se dibuja con `fillRect`/`fillPoly`: asfalto, bordes, rayas, césped,
  cartel de checkpoint y rivales como pilas de rectángulos escalados. Sin audio.
  **Canvas:** 1 × 800×600, resolución interna fija.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — canvas 2D puro: la proyección pseudo-3D es aritmética
     (`scale = camDepth / (segZ - camZ)`), **no** WebGL ni 3D real, así que no rompe el contrato de
     `recipe.md`. Estado plano (`segments[]`, `cars[]`, `player{z,x,speed}`, `timer`), un único
     `requestAnimationFrame`, `update(dt)`/`draw()` separados.
  2. _Score_ — distancia + adelantamientos + checkpoints: entero monotónico y con mucho rango, ideal
     para `/salon`.
  3. _Controles_ — teclado puro de 5 teclas con `preventDefault()` viable.
  4. _Estética_ — es **el** juego que mejor rinde la identidad neón/CRT del sitio: horizonte con
     scanlines, bandas magenta/cyan y un sol pixelado. Alto retorno visual por portada y por captura.
  5. _Assets_ — ninguno; los rivales se dibujan proceduralmente. Se recomienda **no** meter
     spritesheet para no arrastrar el gate de precarga de `arkanoide`.
  6. _Sesión corta_ — el reloj garantiza partidas de 1,5–3 min y una derrota inequívoca
     (tiempo agotado) que dispara `onGameOver` una sola vez, sin depender de la habilidad del jugador
     para terminar.
  7. _Diversidad de catálogo_ — ningún motor actual tiene cámara ni sensación de velocidad; es la
     incorporación más diferenciada del catálogo entero. Contra las otras dos ARCADE de este slice:
     `descenso` es cenital y `brinco` es vista lateral, así que las tres usan **tres cámaras
     distintas** y no compiten entre sí.
  8. _Costo_ — **Alta**, a la par de `rocas`. El pipeline de segmentos (curvatura acumulada, colinas,
     clipping por `maxy`, escalado de rivales) es la pieza cara, y hay que calibrar a mano la
     sensación de dirección y derrape. Es el candidato más ambicioso del slice: conviene abordarlo
     cuando haya presupuesto, no como primer paso.
  9. _Slot vs alta nueva_ — ningún slot describe conducción ni carreras; reutilizar uno obligaría a
     reescribir ficha y portada. Alta nueva = 1 INSERT + 1 clase CSS.
- **Complejidad:** Alta — comparable a `rocas`, y el motor más caro de los cinco de este slice.
- **Descartadas esta corrida:** **rally cenital con vueltas cronometradas en circuito cerrado**
  (criterio 2: el score natural de un juego de vueltas es el **tiempo**, donde menor es mejor —
  incompatible con el entero monotónico creciente de `scores` sin inventar una conversión artificial;
  criterio 8: derrape, cámara que sigue e IA de racing line lo llevan a Alta sin aportar sobre
  `turbo`), **carrera cenital con tráfico en autopista** (criterio 7: misma cámara y mismo verbo que
  `descenso` —scroll vertical + esquiva— así que sumaría redundancia dentro del propio slice;
  queda anotada como **plan B barato de `turbo`** si el pipeline pseudo-3D resulta demasiado caro:
  mismo tema de conducción, complejidad Baja, score por distancia y adelantamientos).
- **Handoff:** `/nuevo-juego turbo`

---

### S21 — BRINCO (`brinco`)

- **Fecha:** 2026-09-10 · **Estado:** Pendiente
- **Slot:** **alta nueva** en `games`. Fila propuesta:
  - `id` / `slug`: `brinco`
  - `title`: `BRINCO`
  - `cat`: `ARCADE`
  - `color`: `green`
  - `cover`: `cover-brinco` (clase CSS nueva: silueta en salto sobre una línea de suelo con tres
    bloques de altura creciente y un arco punteado de trayectoria)
  - `sort_order`: 14 (provisional)
- **Mecánica:** corredor de **un botón** en vista lateral con scroll horizontal infinito y velocidad
  creciente. El personaje corre solo; la única decisión es **cuándo saltar y cuánto tiempo mantener
  el botón** (salto de altura variable con tope, más *coyote time* de 90 ms para que el control se
  sienta justo). El generador emite patrones pre-validados de obstáculos (bloques bajos, series de
  tres, plataformas flotantes con chispas encima) y garantiza que cada patrón sea franqueable a la
  velocidad vigente. Cada 500 m sube el tramo: más velocidad y patrones más densos. Impacto = una
  vida menos, 1,2 s de invulnerabilidad parpadeante y la velocidad vuelve al piso del tramo.
- **Controles:** **`Espacio`** (tap = salto corto, mantener = salto alto). `↑` como alias del mismo
  salto para quien prefiera flechas. `preventDefault()` en ambas. Sin mouse. Es el juego más
  accesible del catálogo: se explica en una línea.
- **Score:** entero monotónico: **+1 por cada 10 px de avance**, **+50 por chispa recogida**,
  **+25 × multiplicador por obstáculo superado**, con el multiplicador subiendo 1 cada 10 obstáculos
  limpios (tope ×5) y volviendo a ×1 al recibir un impacto. El total nunca decrece: al perder la
  racha solo se deja de sumar rápido.
- **Callbacks:** `onScoreChange`, `onLivesChange` (3 vidas), `onLevelChange` (tramo =
  `floor(m/500)+1`), `onGameOver` (edge-triggered, al agotarse las vidas).
- **Assets:** **cero**. Corredor = 3 rects con una animación de piernas de 2 frames; obstáculos =
  rects; fondo = dos capas de parallax de líneas neón. Sin audio.
  **Canvas:** 1 × 800×600, resolución interna fija.
- **Encaje (rúbrica):**
  1. _Contrato de motor_ — el motor más simple posible dentro del contrato: un `player{y,vy,grounded}`,
     un array de obstáculos con culling por `x`, un spawner por patrones. Un solo
     `requestAnimationFrame`, `update(dt)`/`draw()` separados.
  2. _Score_ — distancia + chispas + multiplicador: entero monotónico creciente.
  3. _Controles_ — una sola tecla; `preventDefault()` en `Espacio` y `↑`. Cero fricción.
  4. _Estética_ — siluetas y parallax de líneas: pixel-art/neón nativo en `.crt-screen`.
  5. _Assets_ — ninguno. Es, junto con `parabola` y `dominio`, un motor de coste cero en assets.
  6. _Sesión corta_ — la velocidad creciente garantiza partidas de 1–3 min con final inequívoco.
  7. _Diversidad de catálogo_ — es la **única vista lateral con gravedad** del catálogo: ningún motor
     actual tiene salto ni suelo. Contra las otras dos ARCADE del slice: `turbo` es pseudo-3D y
     `descenso` es cenital, así que las tres no compiten. Se declara explícitamente que **no** es
     plataformas de pantalla fija (dominio del slice A): no hay exploración, no hay escaleras, no hay
     pantalla que se complete — es un endless runner de un botón con score por distancia.
  8. _Costo_ — **Baja**, por debajo de `serpentina`. Es el candidato de "victoria rápida" del slice:
     sirve para validar el pipeline de alta nueva (INSERT + clase CSS + wiring en `game-player.tsx`)
     con el motor más barato posible antes de encarar `turbo`.
  9. _Slot vs alta nueva_ — ningún slot decorativo describe un corredor lateral; `ranaria` y `gloton`
     son otra cosa y son del slice A. Alta nueva = 1 INSERT + 1 clase CSS.
- **Complejidad:** Baja — por debajo de `serpentina`, que era la vara baja del repo.
- **Descartadas esta corrida:** **atletismo arcade de machaque (tipo Track & Field)**
  (criterio 3: el input es aporrear una tecla, ergonomía pésima en web y dependiente del *key repeat*
  del sistema operativo, que además difiere por navegador; criterio 6: cada prueba dura 10–20 s y el
  juego se vuelve una lista de minijuegos, multiplicando el costo), **"flappy" de vuelo entre
  tuberías** (criterio 6: partidas de 15–20 s con curva de frustración muy empinada; criterio 7:
  es el mismo verbo de un botón que `brinco` pero con menos lectura del escenario, así que aportaría
  redundancia dentro del propio slice).
- **Handoff:** `/nuevo-juego brinco`

---


---

## Nota de la corrida del 2026-09-10 (paralela, 4 slices)

Las entradas S02–S21 se produjeron en una corrida de cuatro slices en paralelo con dominios
disjuntos (A: los 4 slots decorativos + plataformas · B: SHOOTER · C: PUZZLE · D: VERSUS +
ARCADE de carreras/destreza). Cada slice escribió a un archivo propio y el merge a este TODO
se hizo después, para no pisarse sobre un archivo append-only.

Conflictos conocidos que hay que resolver al escribir el spec, no antes:

- **`sort_order` solapado.** Cada slice numeró sus altas nuevas desde 10 sin ver las de los
  otros, así que S06, S07–S11, S12–S16 y S17–S21 reclaman el mismo rango. El valor definitivo
  se asigna en la migración de cada alta, tomando el `max(sort_order) + 1` vivo de `games`.
- **Ficha de `caida`.** S02 propone reasignar el slot a Columns y corregir `short`/`long`;
  esa corrección de copy es parte del spec de S02, no un prerrequisito suelto.
- **Reconsideraciones declaradas.** S03 (`gloton`) y S05 (`duelo-pixel`) fueron descartadas en
  S01 y se reconsideran acá con el motivo original atacado explícitamente: S03 porque el costo
  se había estimado sobre una premisa falsa (los fantasmas no usan pathfinding, sino una tile
  objetivo por fantasma), y S05 porque el score deja de ser el marcador 0–3 y pasa a ser un
  acumulador de rally de 3–5 cifras.
