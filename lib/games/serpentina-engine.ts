// Designed from scratch (no reference game.js) for the "SERPENTINA" slot.
// Sprite coordinates ported from
// references/source-assets/snake-assets/snake-assets/sprites.js (the
// pixel-art row of fruits.png, y: 136-295 in the source PNG).
// Framework-agnostic: no React, no module-level DOM access — only the
// HTMLCanvasElement/CanvasRenderingContext2D passed in by the caller (plus
// the Image() element the precarga step creates internally).

import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

export type EngineState = "playing" | "dead" | "gameover";

export interface SerpentinaEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void; // se dispara una sola vez
}

export interface SerpentinaEngine {
  start: () => void; // precarga fruits.png, agrega listeners, arranca el loop
  stop: () => void; // remueve listeners y cancela el rAF
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, nivel 1
  setSkin: (skin: SkinId) => void; // cambia la paleta en caliente, sin reiniciar
}

// ── Paleta ──────────────────────────────────────────────────────────────────
// Inyectada explícitamente (nunca leída de `document`/`getComputedStyle`).
// `clasico` reproduce exactamente los colores previos a los skins.
export interface SerpentinaFruitStyle {
  /** Tono al que se lleva el pixel-art vía composite "color"; null = arte original. */
  tint: string | null;
  /** Alpha (0-1) del pase de realce que levanta los píxeles oscuros; 0 = sin realce. */
  lift: number;
  /** Color del pase de realce (ignorado si `lift` es 0). */
  liftColor: string;
}

export interface SerpentinaPalette {
  bg: string;
  /** Color de las líneas de la grilla (ya incluye su alpha). */
  grid: string;
  snakeHead: string;
  snakeBody: string;
  /** Canal RGB de las partículas en formato "r, g, b" (el alpha lo pone el motor). */
  particleRgb: string;
  fruit: SerpentinaFruitStyle;
  /** Radio del glow en px; 0 = sin glow (clásico plano). */
  glow: number;
}

// Contraste medido contra el `bg` de cada skin (WCAG, 2026-09-11):
// clásico cabeza 15.7:1 / cuerpo 7.2:1 · neón cabeza 16.0:1 / cuerpo 9.4:1 ·
// retro cabeza 12.4:1 / cuerpo 5.2:1 — todos ≥ 4.5:1.
// Frutas (objeto gráfico grande, umbral 3:1), peor caso del spritesheet
// (berenjena/uva oscuras): neón 3.4:1 · retro 4.3:1. En clásico ese peor caso
// queda en 1.3:1, valor preexistente que no se toca (clásico = paleta de hoy).
export const SERPENTINA_PALETTES: Record<SkinId, SerpentinaPalette> = {
  clasico: {
    bg: "#000",
    grid: "rgba(255,255,255,0.04)",
    snakeHead: "#39ff6a",
    snakeBody: "#1fae46",
    particleRgb: "57, 255, 106",
    fruit: { tint: null, lift: 0, liftColor: "#ffffff" },
    glow: 0,
  },
  neon: {
    bg: "#04060e",
    grid: "rgba(125,249,255,0.07)",
    snakeHead: "#5effc1",
    snakeBody: "#12c98e",
    particleRgb: "94, 255, 193",
    // El neón conserva el color original de las frutas: solo levanta las más
    // oscuras (berenjena, uva) para que no se pierdan contra el fondo —
    // 0.35 es el alpha mínimo que lleva ese peor caso por encima de 3:1.
    fruit: { tint: null, lift: 0.35, liftColor: "#9ffcff" },
    glow: 12,
  },
  retro: {
    bg: "#0b0805",
    grid: "rgba(255,176,0,0.06)",
    snakeHead: "#ffc23d",
    snakeBody: "#b4741a",
    particleRgb: "255, 176, 0",
    // Fósforo ámbar monocromático: el spritesheet se tiñe en canvas, nunca se
    // reemplaza por arte nuevo. El realce sube las frutas oscuras a ≥3:1 sin
    // apagar las claras (el amarillo queda en 12.5:1).
    fruit: { tint: "#ffb000", lift: 0.45, liftColor: "#ffd98a" },
    glow: 4,
  },
};

export function resolveSerpentinaPalette(skin: SkinId): SerpentinaPalette {
  return SERPENTINA_PALETTES[skin] ?? SERPENTINA_PALETTES[DEFAULT_SKIN];
}

const W = 800;
const H = 600;
const CELL = 20;
const COLS = W / CELL; // 40
const ROWS = H / CELL; // 30

const INITIAL_LENGTH = 3;
const FRUITS_PER_LEVEL = 5;
const BASE_MOVE_INTERVAL = 140; // ms/celda en nivel 1
const MIN_MOVE_INTERVAL = 60; // piso de velocidad
const INTERVAL_STEP_PER_LEVEL = 8; // ms que se descuentan por nivel
const DEAD_PAUSE = 900; // ms congelado antes de respawnear
const RESPAWN_INVINCIBLE = 1400; // ms de parpadeo tras respawnear

const ASSET_BASE = "/games/serpentina";

// ── Sprite atlas (ported 1:1 from sprites.js) ───────────────────────────────
interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRUIT_SKINS = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
} as const satisfies Record<string, SpriteFrame>;

type FruitSkinName = keyof typeof FRUIT_SKINS;
const FRUIT_SKIN_NAMES = Object.keys(FRUIT_SKINS) as FruitSkinName[];

// ── Runtime shapes ──────────────────────────────────────────────────────────
interface Cell {
  x: number;
  y: number;
}

interface Dir {
  x: number;
  y: number;
}

interface Fruit extends Cell {
  skin: FruitSkinName;
}

interface Particle {
  x: number; // px
  y: number; // px
  vx: number;
  vy: number;
  ttl: number;
  life: number;
}

const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

const DIR_BY_CODE: Record<string, Dir> = {
  ArrowUp: UP,
  ArrowDown: DOWN,
  ArrowLeft: LEFT,
  ArrowRight: RIGHT,
};

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);
const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));

function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function createSerpentinaEngine(
  canvas: HTMLCanvasElement,
  callbacks: SerpentinaEngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): SerpentinaEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    throw new Error("Could not get a 2D context from the canvas");
  }
  // Function declarations below are hoisted, so TS can't carry the flow
  // narrowing from the check above into them — give ctx a non-nullable
  // static type instead of relying on narrowing.
  const ctx = maybeCtx as CanvasRenderingContext2D;

  // ── Assets ────────────────────────────────────────────────────────────
  let image: HTMLImageElement | null = null;

  // ── Skin ──────────────────────────────────────────────────────────────
  let skinId: SkinId = skin;
  let palette = resolveSerpentinaPalette(skinId);
  // Tiles de fruta ya teñidos, cacheados por `${skin}|${fruta}` (a lo sumo
  // 3 skins × 22 frutas). Evita rehacer el composite en cada frame.
  const fruitTiles = new Map<string, HTMLCanvasElement>();

  // ── Input ─────────────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent): void {
    const wanted = DIR_BY_CODE[e.code];
    if (!wanted) return;
    e.preventDefault();
    // Ignore a 180° reversal onto the current heading.
    if (wanted.x === -dir.x && wanted.y === -dir.y) return;
    nextDir = wanted;
  }

  // ── Game state ────────────────────────────────────────────────────────
  let snake: Cell[] = [];
  let dir: Dir = RIGHT;
  let nextDir: Dir = RIGHT;
  let fruit: Fruit = { x: 0, y: 0, skin: "apple" };
  let particles: Particle[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let applesEaten = 0;
  let moveInterval = BASE_MOVE_INTERVAL;
  let moveAccum = 0;
  let state: EngineState = "playing";
  let deadTimer = 0;
  let invincible = 0;
  let paused = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let stopped = true;

  // Sentinels so the first reportChanges() call after start()/reset() always
  // syncs the caller, even though the initial values match the defaults.
  let lastReportedScore = -1;
  let lastReportedLives = -1;
  let lastReportedLevel = -1;

  function reportChanges(): void {
    if (score !== lastReportedScore) {
      lastReportedScore = score;
      callbacks.onScoreChange(score);
    }
    if (lives !== lastReportedLives) {
      lastReportedLives = lives;
      callbacks.onLivesChange(lives);
    }
    if (level !== lastReportedLevel) {
      lastReportedLevel = level;
      callbacks.onLevelChange(level);
    }
  }

  function isOnSnake(x: number, y: number): boolean {
    return snake.some((s) => s.x === x && s.y === y);
  }

  function spawnFruit(): void {
    let x: number;
    let y: number;
    do {
      x = randInt(0, COLS - 1);
      y = randInt(0, ROWS - 1);
    } while (isOnSnake(x, y));
    const skin = FRUIT_SKIN_NAMES[randInt(0, FRUIT_SKIN_NAMES.length - 1)];
    fruit = { x, y, skin };
  }

  function explode(gx: number, gy: number, count = 10): void {
    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(40, 160);
      const life = rand(0.3, 0.7);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl: life,
        life,
      });
    }
  }

  function placeSnake(): void {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    snake = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      snake.push({ x: cx - i, y: cy });
    }
    dir = RIGHT;
    nextDir = RIGHT;
    moveAccum = 0;
  }

  function computeMoveInterval(lvl: number): number {
    return Math.max(
      MIN_MOVE_INTERVAL,
      BASE_MOVE_INTERVAL - (lvl - 1) * INTERVAL_STEP_PER_LEVEL,
    );
  }

  function initGame(): void {
    score = 0;
    lives = 3;
    level = 1;
    applesEaten = 0;
    moveInterval = computeMoveInterval(level);
    particles = [];
    state = "playing";
    deadTimer = 0;
    invincible = 0;
    placeSnake();
    spawnFruit();
  }

  function respawnSnake(): void {
    placeSnake();
    invincible = RESPAWN_INVINCIBLE;
    if (isOnSnake(fruit.x, fruit.y)) spawnFruit();
  }

  function killSnake(): void {
    explode(snake[0].x, snake[0].y);
    lives--;
    if (lives <= 0) {
      lives = 0;
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = DEAD_PAUSE;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  function tick(): void {
    dir = nextDir;
    const head = snake[0];
    const newHead: Cell = { x: head.x + dir.x, y: head.y + dir.y };

    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS
    ) {
      killSnake();
      return;
    }

    const eating = newHead.x === fruit.x && newHead.y === fruit.y;
    // The tail cell is vacated this tick unless the snake is growing, so it
    // doesn't count as a collision target in that case.
    const bodyToCheck = eating ? snake : snake.slice(0, -1);
    const hitsSelf =
      invincible <= 0 &&
      bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y);
    if (hitsSelf) {
      killSnake();
      return;
    }

    snake.unshift(newHead);
    if (eating) {
      score += 10 * level;
      applesEaten++;
      const newLevel = Math.floor(applesEaten / FRUITS_PER_LEVEL) + 1;
      if (newLevel !== level) {
        level = newLevel;
        moveInterval = computeMoveInterval(level);
      }
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  function update(dt: number): void {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;
    }
    particles = particles.filter((p) => p.ttl > 0);

    if (state === "gameover") return;

    if (state === "dead") {
      deadTimer -= dt * 1000;
      if (deadTimer <= 0) {
        state = "playing";
        respawnSnake();
      }
      return;
    }

    if (invincible > 0) invincible -= dt * 1000;

    moveAccum += dt * 1000;
    while (moveAccum >= moveInterval && state === "playing") {
      moveAccum -= moveInterval;
      tick();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function drawGrid(): void {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }
  }

  function drawSnake(): void {
    if (state === "dead") return; // hidden while waiting to respawn
    if (invincible > 0 && Math.floor(invincible / 125) % 2 === 0) return; // blink

    ctx.save();
    if (palette.glow > 0) {
      ctx.shadowBlur = palette.glow;
      ctx.shadowColor = palette.snakeHead;
    }
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? palette.snakeHead : palette.snakeBody;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.restore();
  }

  /**
   * Tile de fruta teñido para el skin activo. El pixel-art de `fruits.png`
   * tiene los colores horneados: el skin se resuelve con composite en canvas
   * (`color` conserva la luminancia del sprite y toma el tono del skin),
   * nunca con un spritesheet nuevo. Devuelve `null` si el skin usa el arte
   * original sin alterar (clásico).
   */
  function getFruitTile(name: FruitSkinName): HTMLCanvasElement | null {
    const style = palette.fruit;
    if (!image) return null;
    if (!style.tint && style.lift <= 0) return null;

    const key = `${skinId}|${name}`;
    const cached = fruitTiles.get(key);
    if (cached) return cached;

    const sp = FRUIT_SKINS[name];
    const tile = canvas.ownerDocument.createElement("canvas");
    tile.width = sp.w;
    tile.height = sp.h;
    const tctx = tile.getContext("2d");
    if (!tctx) return null;

    tctx.drawImage(image, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);
    if (style.tint) {
      tctx.globalCompositeOperation = "color";
      tctx.fillStyle = style.tint;
      tctx.fillRect(0, 0, sp.w, sp.h);
    }
    if (style.lift > 0) {
      // `source-atop` deja el realce solo sobre los píxeles opacos del sprite.
      tctx.globalCompositeOperation = "source-atop";
      tctx.globalAlpha = style.lift;
      tctx.fillStyle = style.liftColor;
      tctx.fillRect(0, 0, sp.w, sp.h);
      tctx.globalAlpha = 1;
    }
    // El fill de `color` pinta también el fondo transparente: se restaura el
    // alpha original recortando contra el sprite.
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(image, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);

    fruitTiles.set(key, tile);
    return tile;
  }

  function drawFruit(): void {
    if (!image) return;
    const sp = FRUIT_SKINS[fruit.skin];
    const dx = fruit.x * CELL;
    const dy = fruit.y * CELL;
    const tile = getFruitTile(fruit.skin);

    ctx.save();
    if (palette.glow > 0) {
      ctx.shadowBlur = palette.glow;
      ctx.shadowColor = palette.fruit.tint ?? palette.fruit.liftColor;
    }
    if (tile) {
      ctx.drawImage(tile, 0, 0, sp.w, sp.h, dx, dy, CELL, CELL);
    } else {
      ctx.drawImage(image, sp.x, sp.y, sp.w, sp.h, dx, dy, CELL, CELL);
    }
    ctx.restore();
  }

  function drawParticles(): void {
    for (const p of particles) {
      const alpha = Math.max(0, p.ttl / p.life);
      ctx.fillStyle = `rgba(${palette.particleRgb},${alpha.toFixed(2)})`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  }

  function draw(): void {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    if (!image) return; // asset gate: nothing to draw before precarga resolves

    drawGrid();
    drawFruit();
    drawSnake();
    drawParticles();
  }

  // ── Main loop ─────────────────────────────────────────────────────────
  function loop(ts: number): void {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    const wasGameOver = state === "gameover";
    if (!paused) update(dt);
    if (!wasGameOver && state === "gameover") {
      callbacks.onGameOver(score);
    }
    reportChanges();

    draw();
    rafId = requestAnimationFrame(loop);
  }

  return {
    start(): void {
      stopped = false;
      window.addEventListener("keydown", handleKeyDown);

      preloadImage(`${ASSET_BASE}/fruits.png`)
        .then((img) => {
          if (stopped) return; // stop() ran before the precarga resolved
          image = img;
          initGame();
          reportChanges();
          lastTime = null;
          rafId = requestAnimationFrame(loop);
        })
        .catch((error: unknown) => {
          console.error("serpentina-engine: failed to preload assets", error);
        });
    },
    stop(): void {
      stopped = true;
      window.removeEventListener("keydown", handleKeyDown);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    setPaused(value: boolean): void {
      paused = value;
    },
    reset(): void {
      initGame();
      reportChanges();
      lastTime = null;
    },
    setSkin(value: SkinId): void {
      skinId = value;
      palette = resolveSerpentinaPalette(value);
    },
  };
}
