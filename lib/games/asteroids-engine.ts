// Ported from references/started-games/02-asteroids/game.js.
// Framework-agnostic: no React, no module-level DOM access — only the
// CanvasRenderingContext2D/HTMLCanvasElement passed in by the caller.

import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";

export type AsteroidSize = 1 | 2 | 3;
export type EngineState = "playing" | "dead" | "gameover";

export interface AsteroidsEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngine {
  start: () => void; // starts the loop (requestAnimationFrame) and attaches key listeners
  stop: () => void; // cancels the loop and removes key listeners
  setPaused: (paused: boolean) => void;
  reset: () => void; // back to state 'playing', score 0, lives 3, level 1
  setSkin: (skin: SkinId) => void; // swaps the palette in place, sin reiniciar la partida
}

// ── Paleta ────────────────────────────────────────────────────────────────
// Inyectada explícitamente en el motor (nunca leída del DOM). `clasico`
// reproduce exactamente los colores que el juego tenía antes de los skins.
export interface AsteroidsPalette {
  bg: string;
  ship: string;
  thruster: string;
  asteroid: string;
  bullet: string;
  powerUp: string;
  /** Canal RGB de las partículas, en formato "r, g, b" (el alpha lo pone el motor). */
  particleRgb: string;
  hud: string;
  hudAccent: string;
  /** Radio del glow en px; 0 = sin glow (clásico vectorial puro). */
  glow: number;
}

// Contraste medido contra el `bg` de cada skin (WCAG, 2026-09-11):
// clásico ink 21:1 · neón ink 18.4:1 / acento mínimo 6.6:1 ·
// retro ink 14.9:1 / acento mínimo 6.4:1. Todos ≥ 4.5:1 (texto) y ≥ 3:1 (acentos).
export const ASTEROIDS_PALETTES: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    bg: "#000000",
    ship: "#fff",
    thruster: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    powerUp: "#0ff",
    particleRgb: "255, 255, 255",
    hud: "#fff",
    hudAccent: "#0ff",
    glow: 0,
  },
  neon: {
    bg: "#04060e",
    ship: "#3dfcff",
    thruster: "rgba(255, 157, 46, 0.9)",
    asteroid: "#9fe8ff",
    bullet: "#ff4da6",
    powerUp: "#faff5c",
    particleRgb: "126, 240, 255",
    hud: "#eaf6ff",
    hudAccent: "#faff5c",
    glow: 10,
  },
  retro: {
    bg: "#0b0805",
    ship: "#ffb000",
    thruster: "rgba(255, 106, 26, 0.9)",
    asteroid: "#d99321",
    bullet: "#ffe9b5",
    powerUp: "#fff0c2",
    particleRgb: "201, 130, 31",
    hud: "#ffd9a3",
    hudAccent: "#ffb000",
    glow: 3,
  },
};

export function resolveAsteroidsPalette(skin: SkinId): AsteroidsPalette {
  return ASTEROIDS_PALETTES[skin] ?? ASTEROIDS_PALETTES[DEFAULT_SKIN];
}

/** Enciende el glow del skin activo sobre el `ctx` (no-op si `glow` es 0). */
function setGlow(
  ctx: CanvasRenderingContext2D,
  palette: AsteroidsPalette,
  color: string,
): void {
  if (palette.glow <= 0) return;
  ctx.shadowBlur = palette.glow;
  ctx.shadowColor = color;
}

const W = 800;
const H = 600;

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

// Indexed by asteroid size (1, 2, 3) — index 0 is unused padding, kept to
// mirror the original arrays 1:1.
const RADII: readonly number[] = [0, 16, 30, 50];
const SPEEDS: readonly number[] = [0, 85, 55, 32];
const POINTS: readonly number[] = [0, 100, 50, 20];

interface Point {
  x: number;
  y: number;
}

interface KeyState {
  [code: string]: boolean;
}

const wrap = (v: number, max: number): number => ((v % max) + max) % max;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);
const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette): void {
    ctx.save();
    setGlow(ctx, palette, palette.bullet);
    ctx.fillStyle = palette.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Irregular polygon
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const nextSize = (this.size - 1) as AsteroidSize;
    return [
      new Asteroid(this.x, this.y, nextSize),
      new Asteroid(this.x, this.y, nextSize),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    setGlow(ctx, palette, palette.asteroid);
    ctx.strokeStyle = palette.asteroid;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette): void {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    setGlow(ctx, palette, palette.powerUp);
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = palette.powerUp;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.save();
    setGlow(ctx, palette, palette.powerUp);
    ctx.fillStyle = palette.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;

  reset(): void {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: KeyState): void {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette): void {
    if (this.dead) return;
    // Blink while invincible after respawning
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    setGlow(ctx, palette, palette.ship);
    ctx.strokeStyle = palette.ship;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Classic silhouette: triangle with a notch at the back
    ctx.beginPath();
    ctx.moveTo(20, 0); // nose
    ctx.lineTo(-12, -9); // left wing
    ctx.lineTo(-7, 0); // back notch
    ctx.lineTo(-12, 9); // right wing
    ctx.closePath();
    ctx.stroke();

    // Thruster flame
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      setGlow(ctx, palette, palette.thruster);
      ctx.strokeStyle = palette.thruster;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Particle (explosion) ───────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette): void {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${palette.particleRgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

const PREVENTABLE_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
]);

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsEngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): AsteroidsEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    throw new Error("Could not get a 2D context from the canvas");
  }
  // Function declarations below are hoisted, so TS can't carry the flow
  // narrowing from the check above into them — give ctx a non-nullable
  // static type instead of relying on narrowing.
  const ctx = maybeCtx as CanvasRenderingContext2D;

  // Paleta activa: dato inyectado, nunca leído del DOM desde el loop.
  let palette = resolveAsteroidsPalette(skin);

  // ── Input ─────────────────────────────────────────────────────────────
  const keys: KeyState = {};
  const justPressed: KeyState = {};

  function pressed(code: string): boolean {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (PREVENTABLE_CODES.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function handleKeyUp(e: KeyboardEvent): void {
    keys[e.code] = false;
  }

  // ── Game state ────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: EngineState = "playing";
  let deadTimer = 0;
  let paused = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

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

  function spawnAsteroids(count: number): void {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame(): void {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel(): void {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip(): void {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  function update(dt: number): void {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    setGlow(ctx, palette, palette.hud);
    ctx.strokeStyle = palette.hud;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD(): void {
    ctx.save();
    setGlow(ctx, palette, palette.hud);
    ctx.fillStyle = palette.hud;
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 26);
    ctx.restore();

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      ctx.save();
      setGlow(ctx, palette, palette.hudAccent);
      ctx.textAlign = "left";
      ctx.font = "15px monospace";
      ctx.fillStyle = palette.hudAccent;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
      ctx.restore();
    }
  }

  function draw(): void {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);

    drawHUD();
    // Note: no internal "GAME OVER" overlay and no Space-to-restart here —
    // the host component owns end-of-game UI via callbacks.onGameOver.
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
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      initGame();
      reportChanges();
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
    stop(): void {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
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
      palette = resolveAsteroidsPalette(value);
    },
  };
}
