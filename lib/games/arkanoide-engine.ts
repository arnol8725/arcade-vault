// Ported from references/started-games/04-arkanoid/game.js + levels.js +
// assets/spritesheet.js.
// Framework-agnostic: no React, no module-level DOM access — only the
// HTMLCanvasElement/CanvasRenderingContext2D passed in by the caller (plus
// the Image()/Audio() elements the precarga step creates internally, as
// required by the asset-gating step of the spec).

import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type EngineState = "playing" | "gameover"; // "win" del original colapsa en "gameover"

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

export interface ArkanoideEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void; // 1..5
  onGameOver: (finalScore: number) => void; // se dispara una sola vez, tanto en derrota (0 vidas) como en victoria (5 niveles limpiados)
}

export interface ArkanoideEngine {
  start: () => void; // agrega listeners, precarga assets, arranca requestAnimationFrame
  stop: () => void; // remueve listeners y cancela el rAF
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, nivel 1
  setSkin: (skin: SkinId) => void; // re-tinta la hoja de sprites, sin reiniciar la partida
}

// ── Paleta ────────────────────────────────────────────────────────────────
// Inyectada explícitamente (nunca leída del DOM). Caso especial del catálogo:
// los colores de Arkanoide están horneados en `spritesheet-breakout.png`, así
// que el skin no se resuelve con `fillStyle` sino tintando la hoja entera en
// un canvas fuera de pantalla — una sola vez por cambio de skin, nunca por
// frame. No se genera arte nuevo: es siempre el mismo PNG recompuesto.

/** Un paso de composición sobre la hoja de sprites (`globalCompositeOperation`). */
export interface SheetTintStep {
  mode: GlobalCompositeOperation;
  color: string;
  alpha: number;
}

export interface ArkanoidePalette {
  bg: string;
  /** Texto del HUD (score / nivel). */
  hud: string;
  /** Radio del glow en px; 0 = sin glow (clásico tal cual). */
  glow: number;
  /** Color del glow de pala, bola, vidas y HUD. */
  glowColor: string;
  /** Color del glow de las explosiones de bloque. */
  flashColor: string;
  /** Vacío = hoja original sin tocar (clásico). */
  sheetTint: readonly SheetTintStep[];
}

// Contraste medido (WCAG) contra el `bg` de cada skin, sobre los colores
// reales muestreados del spritesheet — dominante y promedio de cada sprite:
//   clásico  HUD 21.0:1  · sprites 10.9:1 (pala) … 2.06:1 (bloque gris, valor
//            preexistente que no se toca: clásico = la paleta de hoy tal cual)
//   neón     HUD 18.4:1  · sprites 18.6:1 … 4.16:1 (bloque gris)
//   retro    HUD 14.9:1  · sprites 12.7:1 … 3.96:1 (bloque gris)
// Todo texto ≥ 4.5:1; todo acento de neón/retro ≥ 3:1.
export const ARKANOIDE_PALETTES: Record<SkinId, ArkanoidePalette> = {
  clasico: {
    bg: "#000",
    hud: "#fff",
    glow: 0,
    glowColor: "#fff",
    flashColor: "#fff",
    sheetTint: [],
  },
  neon: {
    bg: "#04060e",
    hud: "#eaf6ff",
    glow: 9,
    glowColor: "#3dfcff",
    flashColor: "#faff5c",
    // 1) `saturation` con un rojo puro: toma la saturación del source (máxima)
    //    y conserva hue + luminosidad del sprite → mismos bloques, saturados.
    // 2) `screen` cian tenue: levanta los contornos oscuros sin quemar los
    //    highlights, que es lo que da el aire de tubo de neón.
    sheetTint: [
      { mode: "saturation", color: "#ff0000", alpha: 1 },
      { mode: "screen", color: "#3dfcff", alpha: 0.24 },
    ],
  },
  retro: {
    bg: "#0b0805",
    hud: "#ffd9a3",
    glow: 3,
    glowColor: "#ffb000",
    flashColor: "#ffe9b5",
    // 1) `color` ámbar: hue + saturación del ámbar, luminosidad del sprite →
    //    fósforo monocromático de gabinete, con el sombreado original intacto.
    // 2) `screen` cálido: separa los bloques más oscuros del fondo.
    sheetTint: [
      { mode: "color", color: "#ffb000", alpha: 1 },
      { mode: "screen", color: "#ff9600", alpha: 0.34 },
    ],
  },
};

export function resolveArkanoidePalette(skin: SkinId): ArkanoidePalette {
  return ARKANOIDE_PALETTES[skin] ?? ARKANOIDE_PALETTES[DEFAULT_SKIN];
}

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 150; // ms

const ASSET_BASE = "/games/arkanoide";

// ── Levels (ported 1:1 from levels.js) ─────────────────────────────────────
interface LevelBlockDef {
  col: number;
  row: number;
  color: BlockColor;
}

interface Level {
  speed: number;
  blocks: LevelBlockDef[];
}

const LEVELS: readonly Level[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4: number[][] = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

// ── Spritesheet (ported 1:1 from assets/spritesheet.js) ────────────────────
interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const EXPLOSION_FRAMES: Record<BlockColor, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const SPRITES: {
  paddle: SpriteFrame;
  ball: SpriteFrame;
  blocks: Record<BlockColor, SpriteFrame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

// ── Runtime shapes ──────────────────────────────────────────────────────────
interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

interface KeyState {
  [key: string]: boolean;
}

function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function preloadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
    audio.src = src;
  });
}

/**
 * Devuelve una copia de la hoja de sprites con el tinte del skin aplicado.
 * Se llama una sola vez por cambio de skin (nunca dentro del loop).
 *
 * Los modos de blending componen también sobre los píxeles transparentes de
 * la hoja, así que el último paso restaura el canal alpha original con
 * `destination-in`.
 */
function buildTintedSheet(
  source: HTMLImageElement,
  steps: readonly SheetTintStep[],
  doc: Document,
): CanvasImageSource {
  if (steps.length === 0) return source; // clásico: la hoja original, sin tocar
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return source;

  const off = doc.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d");
  if (!octx) return source;

  octx.drawImage(source, 0, 0);
  for (const step of steps) {
    octx.globalCompositeOperation = step.mode;
    // Si el navegador no conoce el modo, la asignación es un no-op y queda el
    // anterior: saltar el paso en vez de pintar un rectángulo sólido encima.
    if (octx.globalCompositeOperation !== step.mode) continue;
    octx.globalAlpha = step.alpha;
    octx.fillStyle = step.color;
    octx.fillRect(0, 0, width, height);
  }

  octx.globalAlpha = 1;
  octx.globalCompositeOperation = "destination-in";
  octx.drawImage(source, 0, 0);
  octx.globalCompositeOperation = "source-over";
  return off;
}

export function createArkanoideEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoideEngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): ArkanoideEngine {
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
  // Hoja de sprites ya tintada con el skin activo; es lo que consume `draw`.
  let sheet: CanvasImageSource | null = null;
  let bounceAudio: HTMLAudioElement | null = null;
  let breakAudio: HTMLAudioElement | null = null;
  let palette = resolveArkanoidePalette(skin);

  function refreshSheet(): void {
    sheet = image
      ? buildTintedSheet(image, palette.sheetTint, canvas.ownerDocument)
      : null;
  }

  function playClone(audio: HTMLAudioElement | null): void {
    if (!audio) return;
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.play().catch(() => {});
  }

  // ── Input ─────────────────────────────────────────────────────────────
  const keys: KeyState = { ArrowLeft: false, ArrowRight: false };

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      keys[e.key] = true;
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      keys[e.key] = false;
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  }

  // ── Game state ────────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: 16,
    h: 16,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let level = 1;
  let state: EngineState = "playing";
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

  function initPaddle(): void {
    paddle.x = (W - paddle.w) / 2;
  }

  function initBall(): void {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number): void {
    level = n;
    const lvl = LEVELS[n - 1];
    blocks = lvl.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }

  function initGame(): void {
    lives = 3;
    score = 0;
    state = "playing";
    initPaddle();
    loadLevel(1);
  }

  // ── Update ────────────────────────────────────────────────────────────
  function update(dt: number): void {
    if (state !== "playing") return;

    // Paddle (keyboard)
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces (left, right, top)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playClone(bounceAudio);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playClone(bounceAudio);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playClone(bounceAudio);
    }

    // Paddle bounce
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playClone(bounceAudio);
    }

    // Block collisions (one per frame, mirrors the original)
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        ball.vy = -ball.vy;
        playClone(breakAudio);
        if (blocks.every((b) => !b.alive)) {
          if (level < 5) loadLevel(level + 1);
          else state = "gameover";
        }
        break;
      }
    }

    // Explosions
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Ball lost
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
      } else {
        initBall();
      }
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function drawSprite(
    sp: SpriteFrame,
    x: number,
    y: number,
    w: number,
    h: number,
    glowColor?: string,
  ): void {
    if (!sheet) return;
    if (glowColor && palette.glow > 0) {
      ctx.save();
      ctx.shadowBlur = palette.glow;
      ctx.shadowColor = glowColor;
      ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
      ctx.restore();
      return;
    }
    ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  function draw(): void {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    if (!sheet) return; // asset gate: nothing to draw before precarga resolves

    // Los bloques van sin glow a propósito: están pegados entre sí, así que el
    // halo quedaría tapado y solo costaría frames. Su color de skin ya viene
    // horneado en la hoja tintada.
    for (const block of blocks) {
      if (block.alive)
        drawSprite(
          SPRITES.blocks[block.color],
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawSprite(
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
        palette.flashColor,
      );
    }

    drawSprite(
      SPRITES.paddle,
      paddle.x,
      paddle.y,
      paddle.w,
      paddle.h,
      palette.glowColor,
    );
    drawSprite(SPRITES.ball, ball.x, ball.y, ball.w, ball.h, palette.glowColor);

    if (state === "playing") {
      ctx.save();
      if (palette.glow > 0) {
        ctx.shadowBlur = palette.glow;
        ctx.shadowColor = palette.glowColor;
      }
      ctx.fillStyle = palette.hud;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Score: ${score}`, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText(`Nivel: ${level}`, W / 2, 10);
      ctx.restore();
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite(SPRITES.ball, bx, 10, ballSize, ballSize, palette.glowColor);
      }
    }
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
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousemove", handleMouseMove);

      Promise.all([
        preloadImage(`${ASSET_BASE}/spritesheet-breakout.png`),
        preloadAudio(`${ASSET_BASE}/sounds/ball-bounce.mp3`),
        preloadAudio(`${ASSET_BASE}/sounds/break-sound.mp3`),
      ])
        .then(([img, bounce, brk]) => {
          if (stopped) return; // stop() ran before the precarga resolved
          image = img;
          refreshSheet();
          bounceAudio = bounce;
          breakAudio = brk;
          initGame();
          reportChanges();
          lastTime = null;
          rafId = requestAnimationFrame(loop);
        })
        .catch((error: unknown) => {
          console.error("arkanoide-engine: failed to preload assets", error);
        });
    },
    stop(): void {
      stopped = true;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
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
      palette = resolveArkanoidePalette(value);
      // Re-tinta la hoja en caliente: la partida en curso no se reinicia.
      refreshSheet();
    },
  };
}
