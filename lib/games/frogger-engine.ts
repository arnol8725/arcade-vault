// Designed from scratch (no reference game.js) for the "FROGGER" slot.
// All visuals are canvas primitives — no bitmap sprites (see spec 01-frogger-core,
// "Fuera de alcance").
// Framework-agnostic: no React, no module-level DOM access — only the
// HTMLCanvasElement/CanvasRenderingContext2D passed in by the caller.

export interface FroggerEngineCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void; // se dispara una sola vez
}

export interface FroggerEngine {
  start: () => void;
  stop: () => void;
  setPaused: (paused: boolean) => void;
  reset: () => void; // vuelve a state 'playing', score 0, lives 3, nivel 1
  setKeyState: (code: string, pressed: boolean) => void; // fuente de input por software (touch controls)
  setSkin: (skinKey: FroggerSkinKey) => void; // re-sincroniza la paleta de dibujo sin recrear el motor
}

// ── Skins ────────────────────────────────────────────────────────────────
// Los 3 skins canónicos de Arcade Vault (classic/retro/neon). El wiring de
// un selector visible queda para cuando el usuario lo pida — ver
// references/game-with-themes.md.
export type FroggerSkinKey = "classic" | "retro" | "neon";

export interface FroggerSkin {
  boardBg: string; // fillRect de fondo antes de pintar las zonas por fila
  zones: { goal: string; river: string; safe: string; road: string };
  goalPad: { fill: string; border: string; filled: string };
  car: { body: string; wheel: string };
  truck: { body: string; cab: string };
  log: { body: string; grain: string };
  turtle: { visible: string; visibleRing: string; submerged: string };
  frog: { body: string; eyeWhite: string; eyePupil: string; limb: string };
  hud: {
    barBg: string;
    text: string;
    life: string;
    timeGood: string;
    timeWarn: string;
    timeBad: string;
  };
  glow: boolean; // neon: shadowBlur + strokeRect de contorno
  blockHighlight: boolean; // retro: línea de luz de 4px al tope de los bloques sólidos
}

const SKINS: Record<FroggerSkinKey, FroggerSkin> = {
  classic: {
    boardBg: "#000000",
    zones: {
      goal: "#123a1a",
      river: "#0a2540",
      safe: "#0a2e12",
      road: "#0a0a0a",
    },
    goalPad: { fill: "#0f5c2a", border: "#ffd23f", filled: "#39ff6a" },
    car: { body: "#ff4d4d", wheel: "#1a1a1a" },
    truck: { body: "#8a8a8a", cab: "#555555" },
    log: { body: "#8b5a2b", grain: "#a97c50" },
    turtle: {
      visible: "#2ecc71",
      visibleRing: "#1e9955",
      submerged: "rgba(46,204,113,0.35)",
    },
    frog: {
      body: "#39ff6a",
      eyeWhite: "#ffffff",
      eyePupil: "#0a0a0a",
      limb: "#39ff6a",
    },
    hud: {
      barBg: "rgba(0,0,0,0.55)",
      text: "#ffffff",
      life: "#39ff6a",
      timeGood: "#39ff6a",
      timeWarn: "#ffd23f",
      timeBad: "#ff4d4d",
    },
    glow: false,
    blockHighlight: false,
  },
  retro: {
    boardBg: "#141018",
    zones: {
      goal: "#1f4d33",
      river: "#1c3f66",
      safe: "#1f4a24",
      road: "#181818",
    },
    goalPad: { fill: "#2f7a4a", border: "#ffcf5c", filled: "#7be0a0" },
    car: { body: "#ff8a5c", wheel: "#262626" },
    truck: { body: "#cfcfcf", cab: "#8f8f8f" },
    log: { body: "#a9713f", grain: "#c98f57" },
    turtle: {
      visible: "#5ad19b",
      visibleRing: "#3a9c72",
      submerged: "rgba(90,209,155,0.32)",
    },
    frog: {
      body: "#5ad19b",
      eyeWhite: "#fff8ec",
      eyePupil: "#1c1c1c",
      limb: "#5ad19b",
    },
    hud: {
      barBg: "rgba(20,16,28,0.72)",
      text: "#fff2d6",
      life: "#5ad19b",
      timeGood: "#5ad19b",
      timeWarn: "#ffcf5c",
      timeBad: "#ff8a5c",
    },
    glow: false,
    blockHighlight: true,
  },
  neon: {
    boardBg: "#000000",
    zones: {
      goal: "#001b0e",
      river: "#000f24",
      safe: "#001208",
      road: "#000000",
    },
    goalPad: { fill: "#00130a", border: "#00fff2", filled: "#39ff14" },
    car: { body: "#ff2bd6", wheel: "#000000" },
    truck: { body: "#00e5ff", cab: "#0077ff" },
    log: { body: "#ff8a00", grain: "#ffce00" },
    turtle: {
      visible: "#39ff14",
      visibleRing: "#00ff88",
      submerged: "rgba(57,255,20,0.22)",
    },
    frog: {
      body: "#39ff14",
      eyeWhite: "#ffffff",
      eyePupil: "#000000",
      limb: "#39ff14",
    },
    hud: {
      barBg: "rgba(0,0,0,0.8)",
      text: "#00fff2",
      life: "#39ff14",
      timeGood: "#39ff14",
      timeWarn: "#ffea00",
      timeBad: "#ff1744",
    },
    glow: true,
    blockHighlight: false,
  },
};

// ── Grid ─────────────────────────────────────────────────────────────────
const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const W = COLS * CELL; // 640
// ROWS * CELL = 560 — la altura la fija el atributo height del <canvas> en
// frogger-canvas.tsx; no hace falta una constante propia acá.

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const GOAL_WIDTH = 2; // columnas por boca
const GOAL_START_COLS = [1, 4, 7, 10, 13]; // 5 bocas, con "seto" letal entre ellas

const JUMP_MS = 120;
const ROUND_TIME_BASE = 15; // s en nivel 1
const ROUND_TIME_MIN = 6; // piso de tiempo en niveles altos
const ROUND_TIME_STEP = 1; // s que se descuentan por nivel
const SPEED_GROWTH_PER_LEVEL = 0.15; // +15% por nivel

const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;

// ── Tipos ────────────────────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number; // unidades de celda, puede ser fraccional
  width: number; // en celdas
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  turtlePhase?: number; // ms acumulados en el ciclo de inmersión (independiente por grupo)
}

interface Lane {
  row: number;
  speed: number; // celdas/segundo (magnitud positiva)
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms transcurridos del salto
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}

const DIR_BY_CODE: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

function overlapsCol(entityCol: number, width: number, col: number): boolean {
  return col + 1 > entityCol && col < entityCol + width;
}

function goalIndexForCol(col: number): number {
  const c = Math.round(col);
  return GOAL_START_COLS.findIndex(
    (start) => c >= start && c < start + GOAL_WIDTH,
  );
}

function computeRoundTime(level: number): number {
  return Math.max(
    ROUND_TIME_MIN,
    ROUND_TIME_BASE - (level - 1) * ROUND_TIME_STEP,
  );
}

function buildLanes(level: number): Lane[] {
  const growth = Math.pow(1 + SPEED_GROWTH_PER_LEVEL, level - 1);
  const lanes: Lane[] = [];

  // Carriles de carretera (filas 8-12, 5 carriles), sentidos alternos.
  const roadBaseSpeeds = [1.6, 2.4, 1.8, 3.2, 2.0];
  for (let i = 0; i < 5; i++) {
    const row = ROW_ROAD_TOP + i;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = roadBaseSpeeds[i] * growth;
    const vehicleType: "car" | "truck" = i % 2 === 0 ? "car" : "truck";
    const entities: Entity[] = [];
    let cursor = Math.random() * COLS;
    for (let v = 0; v < 3; v++) {
      const width =
        vehicleType === "truck"
          ? 2 + Math.round(Math.random())
          : 1 + Math.round(Math.random());
      entities.push({ col: cursor, width, type: vehicleType });
      cursor += width + 2 + Math.random() * 2; // hueco de al menos ~2 celdas
    }
    lanes.push({ row, speed, dir, entities });
  }

  // Carriles de río (filas 1-6, 6 carriles), troncos y tortugas alternados.
  const riverBaseSpeeds = [1.2, 1.8, 1.4, 2.2, 1.6, 2.0];
  for (let i = 0; i < 6; i++) {
    const row = ROW_RIVER_TOP + i;
    const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
    const speed = riverBaseSpeeds[i] * growth;
    const isLogLane = i % 2 === 0;
    const entities: Entity[] = [];
    let cursor = Math.random() * COLS;
    const count = isLogLane ? 2 : 3;
    for (let v = 0; v < count; v++) {
      if (isLogLane) {
        const width = 2 + Math.floor(Math.random() * 3); // 2-4
        entities.push({ col: cursor, width, type: "log" });
        cursor += width + 2 + Math.random() * 2;
      } else {
        const groupSize = 2 + Math.floor(Math.random() * 2); // 2-3
        entities.push({
          col: cursor,
          width: groupSize,
          type: "turtle",
          submerged: false,
          turtlePhase: Math.random() * TURTLE_VISIBLE_MS,
        });
        cursor += groupSize + 2 + Math.random() * 2;
      }
    }
    lanes.push({ row, speed, dir, entities });
  }

  return lanes;
}

export function createFroggerEngine(
  canvas: HTMLCanvasElement,
  callbacks: FroggerEngineCallbacks,
  initialSkinKey: FroggerSkinKey = "classic",
): FroggerEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    throw new Error("Could not get a 2D context from the canvas");
  }
  const ctx = maybeCtx as CanvasRenderingContext2D;

  // Paleta activa; re-sincronizada por setSkin() sin recrear el motor.
  let skin: FroggerSkin = SKINS[initialSkinKey] ?? SKINS.classic;

  // Envuelve un draw() con shadowBlur/shadowColor cuando el skin activo pide
  // glow (neon); en los demás skins ejecuta el draw sin efecto extra.
  function withGlow(color: string, drawFn: () => void): void {
    if (!skin.glow) {
      drawFn();
      return;
    }
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    drawFn();
    ctx.restore();
  }

  // Línea de luz de 4px al tope de un bloque sólido — solo skin retro.
  function topHighlight(x: number, y: number, w: number): void {
    if (!skin.blockHighlight) return;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(x, y, w, 4);
  }

  // ── Input ─────────────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent): void {
    const wanted = DIR_BY_CODE[e.code];
    if (!wanted) return;
    e.preventDefault();
    pendingDir = wanted;
  }

  // ── Estado ────────────────────────────────────────────────────────────
  let lanes: Lane[] = [];
  let goalsFilled: boolean[] = [];
  let frog: Frog = spawnFrog();
  let pendingDir: Direction | null = null;
  let bestRowThisRound = ROW_START;
  let roundTimeLimit = ROUND_TIME_BASE;
  let roundTimeLeft = ROUND_TIME_BASE;
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: "playing" | "gameover" = "playing";
  let paused = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  let lastReportedScore = -1;
  let lastReportedLives = -1;
  let lastReportedLevel = -1;

  function spawnFrog(): Frog {
    const col = Math.floor(COLS / 2);
    return {
      col,
      row: ROW_START,
      animating: false,
      animT: 0,
      fromCol: col,
      fromRow: ROW_START,
      targetCol: col,
      targetRow: ROW_START,
    };
  }

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

  function initRound(): void {
    lanes = buildLanes(level);
    goalsFilled = [false, false, false, false, false];
    frog = spawnFrog();
    bestRowThisRound = ROW_START;
    roundTimeLimit = computeRoundTime(level);
    roundTimeLeft = roundTimeLimit;
    pendingDir = null;
  }

  function initGame(): void {
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    initRound();
  }

  function killFrog(): void {
    lives--;
    if (lives <= 0) {
      lives = 0;
      state = "gameover";
      return;
    }
    frog = spawnFrog();
    roundTimeLeft = roundTimeLimit;
    pendingDir = null;
  }

  function completeRound(): void {
    level++;
    initRound();
  }

  function checkRoadCollision(): boolean {
    for (const lane of lanes) {
      if (
        lane.row !== frog.row ||
        lane.row < ROW_ROAD_TOP ||
        lane.row > ROW_ROAD_BOT
      )
        continue;
      for (const entity of lane.entities) {
        if (overlapsCol(entity.col, entity.width, frog.col)) return true;
      }
    }
    return false;
  }

  function getSupport(): { entity: Entity; lane: Lane } | null {
    for (const lane of lanes) {
      if (
        lane.row !== frog.row ||
        lane.row < ROW_RIVER_TOP ||
        lane.row > ROW_RIVER_BOT
      )
        continue;
      for (const entity of lane.entities) {
        if (overlapsCol(entity.col, entity.width, frog.col)) {
          if (entity.type === "turtle" && entity.submerged) return null;
          return { entity, lane };
        }
      }
    }
    return null;
  }

  function resolveLanding(): void {
    if (frog.row < bestRowThisRound) {
      score += 10 * (bestRowThisRound - frog.row);
      bestRowThisRound = frog.row;
    }

    if (frog.row === ROW_GOALS) {
      const idx = goalIndexForCol(frog.col);
      if (idx === -1 || goalsFilled[idx]) {
        killFrog();
        return;
      }
      goalsFilled[idx] = true;
      score += 50 + Math.max(0, Math.round(roundTimeLeft)) * 10;
      if (goalsFilled.every(Boolean)) {
        score += 200;
        completeRound();
        return;
      }
      frog = spawnFrog();
      roundTimeLeft = roundTimeLimit;
      return;
    }

    if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      if (checkRoadCollision()) killFrog();
    } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      if (!getSupport()) killFrog();
    }
  }

  function startJump(dir: Direction): void {
    const col = Math.round(frog.col);
    const row = frog.row;
    let targetCol = col;
    let targetRow = row;
    if (dir === "up") targetRow = row - 1;
    else if (dir === "down") targetRow = row + 1;
    else if (dir === "left") targetCol = col - 1;
    else targetCol = col + 1;

    targetCol = clamp(targetCol, 0, COLS - 1);
    targetRow = clamp(targetRow, ROW_GOALS, ROW_START);
    if (targetCol === col && targetRow === row) return; // clamped into a no-op, don't animate

    frog.animating = true;
    frog.animT = 0;
    frog.fromCol = frog.col;
    frog.fromRow = frog.row;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }

  function advanceLanes(dt: number): void {
    for (const lane of lanes) {
      for (const entity of lane.entities) {
        entity.col += lane.speed * lane.dir * dt;
        if (lane.dir === 1 && entity.col > COLS) {
          entity.col = -entity.width;
        } else if (lane.dir === -1 && entity.col + entity.width < 0) {
          entity.col = COLS;
        }
        if (entity.type === "turtle") {
          entity.turtlePhase = (entity.turtlePhase ?? 0) + dt * 1000;
          const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
          entity.submerged = entity.turtlePhase % cycle >= TURTLE_VISIBLE_MS;
        }
      }
    }
  }

  function update(dt: number): void {
    if (state !== "playing") return;
    if (paused) return;

    advanceLanes(dt);

    if (frog.animating) {
      frog.animT += dt * 1000;
      if (frog.animT >= JUMP_MS) {
        frog.animating = false;
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        resolveLanding();
      }
      return;
    }

    if (pendingDir) {
      startJump(pendingDir);
      pendingDir = null;
      return;
    }

    if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      const support = getSupport();
      if (!support) {
        killFrog();
        return;
      }
      frog.col += support.lane.speed * support.lane.dir * dt;
      if (frog.col < 0 || frog.col > COLS - 1) {
        killFrog();
        return;
      }
    } else if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      if (checkRoadCollision()) {
        killFrog();
        return;
      }
    }

    if (state === "playing") {
      roundTimeLeft -= dt;
      if (roundTimeLeft <= 0) killFrog();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  function rowBg(row: number): string {
    if (row === ROW_GOALS) return skin.zones.goal;
    if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return skin.zones.river;
    if (row === ROW_SAFE_MID || row === ROW_START) return skin.zones.safe;
    return skin.zones.road; // carretera
  }

  function drawZones(): void {
    ctx.fillStyle = skin.boardBg;
    ctx.fillRect(0, 0, W, ROWS * CELL);
    for (let row = 0; row < ROWS; row++) {
      ctx.fillStyle = rowBg(row);
      ctx.fillRect(0, row * CELL, W, CELL);
    }
  }

  function drawGoals(): void {
    const y = ROW_GOALS * CELL;
    GOAL_START_COLS.forEach((startCol, idx) => {
      const x = startCol * CELL;
      const width = GOAL_WIDTH * CELL;
      ctx.fillStyle = skin.goalPad.fill;
      ctx.fillRect(x + 2, y + 2, width - 4, CELL - 4);
      withGlow(skin.goalPad.border, () => {
        ctx.strokeStyle = skin.goalPad.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, width - 4, CELL - 4);
      });
      if (goalsFilled[idx]) {
        withGlow(skin.goalPad.filled, () => {
          ctx.fillStyle = skin.goalPad.filled;
          ctx.beginPath();
          ctx.ellipse(x + width / 2, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }

  function drawEntity(entity: Entity, row: number): void {
    const x = entity.col * CELL;
    const y = row * CELL;
    const w = entity.width * CELL;
    switch (entity.type) {
      case "car": {
        withGlow(skin.car.body, () => {
          ctx.fillStyle = skin.car.body;
          ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
          if (skin.glow) {
            ctx.strokeStyle = skin.car.body;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 8, w - 4, CELL - 16);
          }
        });
        topHighlight(x + 2, y + 8, w - 4);
        ctx.fillStyle = skin.car.wheel;
        ctx.beginPath();
        ctx.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2);
        ctx.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "truck": {
        withGlow(skin.truck.body, () => {
          ctx.fillStyle = skin.truck.body;
          ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
          if (skin.glow) {
            ctx.strokeStyle = skin.truck.body;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 6, w - 4, CELL - 12);
          }
        });
        topHighlight(x + 2, y + 6, w - 4);
        ctx.fillStyle = skin.truck.cab;
        ctx.fillRect(x + 2, y + 6, CELL * 0.6, CELL - 12);
        break;
      }
      case "log": {
        withGlow(skin.log.body, () => {
          ctx.fillStyle = skin.log.body;
          ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
        });
        topHighlight(x + 2, y + 6, w - 4);
        ctx.strokeStyle = skin.log.grain;
        ctx.lineWidth = 1;
        for (let lx = x + 8; lx < x + w - 4; lx += 10) {
          ctx.beginPath();
          ctx.moveTo(lx, y + 6);
          ctx.lineTo(lx, y + CELL - 6);
          ctx.stroke();
        }
        break;
      }
      case "turtle": {
        for (let t = 0; t < entity.width; t++) {
          const cx = x + t * CELL + CELL / 2;
          const cy = y + CELL / 2;
          if (entity.submerged) {
            ctx.strokeStyle = skin.turtle.submerged;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            withGlow(skin.turtle.visible, () => {
              ctx.fillStyle = skin.turtle.visible;
              ctx.beginPath();
              ctx.arc(cx, cy, 14, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.strokeStyle = skin.turtle.visibleRing;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }
    }
  }

  function drawFrog(): void {
    let x: number;
    let y: number;
    if (frog.animating) {
      const t = clamp(frog.animT / JUMP_MS, 0, 1);
      x =
        (frog.fromCol + (frog.targetCol - frog.fromCol) * t) * CELL + CELL / 2;
      y =
        (frog.fromRow + (frog.targetRow - frog.fromRow) * t) * CELL + CELL / 2;
    } else {
      x = frog.col * CELL + CELL / 2;
      y = frog.row * CELL + CELL / 2;
    }
    const jumpLift = frog.animating
      ? -Math.sin((frog.animT / JUMP_MS) * Math.PI) * 6
      : 0;

    withGlow(skin.frog.body, () => {
      ctx.fillStyle = skin.frog.body;
      ctx.beginPath();
      ctx.ellipse(x, y + jumpLift, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = skin.frog.eyeWhite;
    ctx.beginPath();
    ctx.arc(x - 6, y - 6 + jumpLift, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 6 + jumpLift, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.frog.eyePupil;
    ctx.beginPath();
    ctx.arc(x - 6, y - 6 + jumpLift, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 6 + jumpLift, 2, 0, Math.PI * 2);
    ctx.fill();

    if (frog.animating) {
      ctx.strokeStyle = skin.frog.limb;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + jumpLift);
      ctx.lineTo(x - 20, y + 4 + jumpLift);
      ctx.moveTo(x + 14, y + jumpLift);
      ctx.lineTo(x + 20, y + 4 + jumpLift);
      ctx.stroke();
    }
  }

  function drawHud(): void {
    ctx.fillStyle = skin.hud.barBg;
    ctx.fillRect(0, 0, W, 26);

    ctx.fillStyle = skin.hud.text;
    ctx.font = "16px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(String(score), 8, 13);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 13);

    ctx.textAlign = "right";
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = skin.hud.life;
      ctx.beginPath();
      ctx.arc(W - 12 - i * 18, 13, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "left";

    const frac = clamp(roundTimeLeft / roundTimeLimit, 0, 1);
    ctx.fillStyle =
      frac > 0.5
        ? skin.hud.timeGood
        : frac > 0.25
          ? skin.hud.timeWarn
          : skin.hud.timeBad;
    ctx.fillRect(0, 27, W * frac, 3);
  }

  function draw(): void {
    drawZones();
    for (const lane of lanes) {
      for (const entity of lane.entities) drawEntity(entity, lane.row);
    }
    drawGoals();
    drawFrog();
    drawHud();
  }

  // ── Loop principal ────────────────────────────────────────────────────
  function loop(ts: number): void {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    const wasGameOver = state === "gameover";
    update(dt);
    reportChanges(); // incluye onLivesChange(0) si corresponde, antes de onGameOver
    if (!wasGameOver && state === "gameover") {
      callbacks.onGameOver(score);
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  return {
    start(): void {
      window.addEventListener("keydown", handleKeyDown);
      initGame();
      reportChanges();
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
    stop(): void {
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
    setKeyState(code: string, pressed: boolean): void {
      if (!pressed) return; // dirección: estado por flanco, se ignora el release
      const wanted = DIR_BY_CODE[code];
      if (!wanted) return;
      pendingDir = wanted;
    },
    setSkin(skinKey: FroggerSkinKey): void {
      skin = SKINS[skinKey] ?? SKINS.classic;
    },
  };
}
