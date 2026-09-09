// Ported from references/started-games/04-arkanoid/game.js + levels.js +
// assets/spritesheet.js.
// Framework-agnostic: no React, no module-level DOM access — only the
// HTMLCanvasElement/CanvasRenderingContext2D passed in by the caller (plus
// the Image()/Audio() elements the precarga step creates internally, as
// required by the asset-gating step of the spec).

export type BlockColor =
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "gray";
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

export function createArkanoideEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoideEngineCallbacks,
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
  let bounceAudio: HTMLAudioElement | null = null;
  let breakAudio: HTMLAudioElement | null = null;

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
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
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
  function drawSprite(sp: SpriteFrame, x: number, y: number, w: number, h: number): void {
    if (!image) return;
    ctx.drawImage(image, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  function draw(): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (!image) return; // asset gate: nothing to draw before precarga resolves

    for (const block of blocks) {
      if (block.alive) drawSprite(SPRITES.blocks[block.color], block.x, block.y, block.w, block.h);
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawSprite(EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
    }

    drawSprite(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(SPRITES.ball, ball.x, ball.y, ball.w, ball.h);

    if (state === "playing") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Score: ${score}`, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText(`Nivel: ${level}`, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite(SPRITES.ball, bx, 10, ballSize, ballSize);
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
  };
}
