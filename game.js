const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const coinsDisplay = document.getElementById("coins");
const bestDisplay = document.getElementById("best");
const finalScore = document.getElementById("final-score");

const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over");

let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

let running = false;
let score = 0;
let coins = 0;
let best = Number(localStorage.getItem("borderDashBest")) || 0;

let lane = 1;
let jump = 0;
let sliding = 0;
let speed = 0.38;
let spawnTimer = 0;
let sceneryOffset = 0;
let lastTime = 0;

let obstacles = [];
let pickups = [];
let particles = [];

bestDisplay.textContent = best;

const player = {
  x: 0,
  y: 0
};

function laneX(lane, z = 1) {
  const roadCenter = W / 2;
  const perspective = 0.24 + z * 0.76;
  const laneWidth = W * 0.17 * perspective;

  return roadCenter + (lane - 1) * laneWidth;
}

function groundY(z) {
  return H * (0.37 + z * 0.57);
}

function startGame() {
  score = 0;
  coins = 0;
  speed = 0.38;
  lane = 1;
  jump = 0;
  sliding = 0;
  spawnTimer = 0;
  sceneryOffset = 0;

  obstacles = [];
  pickups = [];
  particles = [];

  running = true;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  lastTime = performance.now();
}

function endGame() {
  running = false;

  if (score > best) {
    best = score;
    localStorage.setItem("borderDashBest", best);
    bestDisplay.textContent = best;
  }

  finalScore.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

function changeLane(direction) {
  if (!running) return;
  lane = Math.max(0, Math.min(2, lane + direction));
}

function doJump() {
  if (running && jump <= 0 && sliding <= 0) {
    jump = 1;
  }
}

function doSlide() {
  if (running && jump <= 0 && sliding <= 0) {
    sliding = 0.65;
  }
}

document.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }

  if (e.repeat) return;

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") changeLane(-1);
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") changeLane(1);
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") doJump();
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") doSlide();
});

function mobileButton(id, action) {
  const button = document.getElementById(id);

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    action();
  });
}

mobileButton("left-button", () => changeLane(-1));
mobileButton("right-button", () => changeLane(1));
mobileButton("jump-button", doJump);
mobileButton("slide-button", doSlide);

document.getElementById("start-button").onclick = startGame;
document.getElementById("restart-button").onclick = startGame;

// Spawn obstacles and dog tags

function spawnObjects() {
  const obstacleLane = Math.floor(Math.random() * 3);
  const typeRoll = Math.random();

  let type;

  if (typeRoll < 0.36) type = "barrier";
  else if (typeRoll < 0.65) type = "crate";
  else if (typeRoll < 0.83) type = "truck";
  else type = "overhead";

  obstacles.push({
    lane: obstacleLane,
    z: 0,
    type: type
  });

  // Occasionally create collectible dog tags
  if (Math.random() < 0.8) {
    const coinLane = Math.floor(Math.random() * 3);

    for (let i = 0; i < 4; i++) {
      pickups.push({
        lane: coinLane,
        z: -i * 0.12,
        collected: false
      });
    }
  }
}

// Background

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);

  sky.addColorStop(0, "#829b80");
  sky.addColorStop(0.45, "#687c54");
  sky.addColorStop(1, "#34452a");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Distant mountains
  ctx.fillStyle = "#52684a";

  ctx.beginPath();
  ctx.moveTo(0, H * 0.43);

  for (let x = 0; x <= W; x += W / 8) {
    ctx.lineTo(x, H * 0.28 + Math.sin(x * 0.02) * 35);
  }

  ctx.lineTo(W, H * 0.5);
  ctx.lineTo(0, H * 0.5);
  ctx.fill();

  // Military base buildings
  for (let i = 0; i < 5; i++) {
    let x = i * W / 4 - 30;

    ctx.fillStyle = "#394638";
    ctx.fillRect(x, H * 0.28, 75, H * 0.13);

    ctx.fillStyle = "#28352b";
    ctx.fillRect(x - 8, H * 0.26, 90, 12);

    ctx.fillStyle = "#8e9b76";
    ctx.fillRect(x + 12, H * 0.32, 12, 18);
    ctx.fillRect(x + 45, H * 0.32, 12, 18);
  }

  // Road
  ctx.fillStyle = "#393b35";

  ctx.beginPath();
  ctx.moveTo(W * 0.36, H * 0.38);
  ctx.lineTo(W * 0.64, H * 0.38);
  ctx.lineTo(W * 1.12, H);
  ctx.lineTo(-W * 0.12, H);
  ctx.closePath();
  ctx.fill();

  // Road edges
  ctx.strokeStyle = "#a3a17e";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(W * 0.36, H * 0.38);
  ctx.lineTo(-W * 0.12, H);
  ctx.moveTo(W * 0.64, H * 0.38);
  ctx.lineTo(W * 1.12, H);
  ctx.stroke();

  // Lane markings
  const offset = (sceneryOffset % 0.18);

  for (let i = 0; i < 9; i++) {
    const z = i * 0.15 + offset;
    if (z > 1) continue;

    const y = groundY(z);
    const width = W * (0.006 + z * 0.012);

    ctx.fillStyle = "#d2d0a9";

    for (let line = 1; line <= 2; line++) {
      const x = W / 2 + (line - 1.5) * W * 0.17 * (0.24 + z * 0.76);

      ctx.fillRect(x - width / 2, y, width, 10 + z * 22);
    }
  }

  // Trees and military fences
  for (let side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = ((i * 0.13 + sceneryOffset * 0.5) % 1);
      const y = groundY(z);
      const scale = 0.25 + z * 1.3;

      const x = W / 2 + side * (W * (0.22 + z * 0.35));

      // Trees
      ctx.fillStyle = "#263c25";
      ctx.fillRect(x - 4 * scale, y - 25 * scale, 8 * scale, 25 * scale);

      ctx.fillStyle = "#344d2d";
      ctx.beginPath();
      ctx.arc(x, y - 27 * scale, 17 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Fence posts
      if (i % 2 === 0) {
        ctx.fillStyle = "#53594b";
        ctx.fillRect(x + side * 25 * scale, y - 23 * scale, 4 * scale, 23 * scale);
      }
    }
  }
}

// Obstacles

function drawObstacle(o) {
  const z = o.z;
  if (z < 0 || z > 1) return;

  const x = laneX(o.lane, z);
  const y = groundY(z);
  const s = 0.3 + z * 1.1;

  ctx.save();
  ctx.translate(x, y);

  if (o.type === "barrier") {
    // Military road barrier
    ctx.fillStyle = "#d2c9a1";
    ctx.fillRect(-27 * s, -35 * s, 54 * s, 35 * s);

    ctx.fillStyle = "#a34c32";

    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.translate(i * 15 * s, 0);
      ctx.rotate(-0.5);
      ctx.fillRect(-4 * s, -40 * s, 9 * s, 40 * s);
      ctx.restore();
    }

    ctx.fillStyle = "#393b34";
    ctx.fillRect(-30 * s, -5 * s, 60 * s, 6 * s);
  }

  if (o.type === "crate") {
    // Supply crate
    ctx.fillStyle = "#596d39";
    ctx.fillRect(-22 * s, -43 * s, 44 * s, 43 * s);

    ctx.strokeStyle = "#a3a878";
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(-22 * s, -43 * s, 44 * s, 43 * s);

    ctx.strokeRect(-12 * s, -33 * s, 24 * s, 24 * s);

    ctx.fillStyle = "#b2b88a";
    ctx.fillRect(-5 * s, -40 * s, 10 * s, 36 * s);
  }

  if (o.type === "truck") {
    // Parked military transport truck
    ctx.fillStyle = "#283a27";
    ctx.fillRect(-32 * s, -63 * s, 64 * s, 63 * s);

    ctx.fillStyle = "#667a48";
    ctx.fillRect(-25 * s, -82 * s, 50 * s, 28 * s);

    ctx.fillStyle = "#9eaa91";
    ctx.fillRect(-18 * s, -77 * s, 12 * s, 12 * s);
    ctx.fillRect(6 * s, -77 * s, 12 * s, 12 * s);

    ctx.fillStyle = "#1b211b";
    ctx.fillRect(-28 * s, -10 * s, 13 * s, 12 * s);
    ctx.fillRect(15 * s, -10 * s, 13 * s, 12 * s);
  }

  if (o.type === "overhead") {
    // Low overhead training obstacle
    ctx.fillStyle = "#485d3b";
    ctx.fillRect(-32 * s, -35 * s, 8 * s, 35 * s);
    ctx.fillRect(24 * s, -35 * s, 8 * s, 35 * s);

    ctx.fillStyle = "#a2a17a";
    ctx.fillRect(-35 * s, -35 * s, 70 * s, 12 * s);
  }

  ctx.restore();
}

// Dog tags

function drawPickup(p) {
  if (p.z < 0 || p.z > 1) return;

  const x = laneX(p.lane, p.z);
  const y = groundY(p.z) - 32 * p.z;
  const s = 0.4 + p.z * 0.8;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#f2d36a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * s, 11 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#a98632";
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  ctx.fillStyle = "#9a792e";
  ctx.beginPath();
  ctx.arc(0, 0, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Soldier

function drawPlayer() {
  const x = laneX(lane, 1);
  const ground = H * 0.88;

  player.x = x;
  player.y = ground;

  let height = 0;

  if (jump > 0) {
    height = Math.sin((1 - jump) * Math.PI) * 110;
  }

  const y = ground - height;

  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, height > 0 ? height + 5 : 5, 27, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Slide animation
  if (sliding > 0) {
    ctx.rotate(-0.15);

    ctx.fillStyle = "#405b32";
    ctx.fillRect(-23, -30, 46, 23);

    ctx.fillStyle = "#b6a78c";
    ctx.beginPath();
    ctx.arc(26, -21, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#293c27";
    ctx.fillRect(-32, -9, 55, 9);

  } else {
    // Legs
    ctx.fillStyle = "#343e2b";
    ctx.fillRect(-16, -37, 12, 37);
    ctx.fillRect(4, -37, 12, 37);

    // Boots
    ctx.fillStyle = "#252b21";
    ctx.fillRect(-20, -7, 18, 8);
    ctx.fillRect(3, -7, 18, 8);

    // Body
    ctx.fillStyle = "#526c3d";
    ctx.fillRect(-19, -75, 38, 40);

    // Vest
    ctx.fillStyle = "#34472d";
    ctx.fillRect(-15, -70, 30, 32);

    // Arms
    ctx.fillStyle = "#526c3d";
    ctx.fillRect(-27, -70, 10, 31);
    ctx.fillRect(17, -70, 10, 31);

    // Head
    ctx.fillStyle = "#c39d79";
    ctx.beginPath();
    ctx.arc(0, -87, 13, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#394e2d";
    ctx.beginPath();
    ctx.arc(0, -92, 15, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(-17, -92, 34, 5);

    // Backpack
    ctx.fillStyle = "#384b30";
    ctx.fillRect(-24, -71, 9, 25);
  }

  ctx.restore();
}

// Particles

function createParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 5,
      life: 1
    });
  }
}

function drawParticles(dt) {
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt * 2;

    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = "#e3c75e";
    ctx.fillRect(p.x, p.y, 5, 5);
  }

  ctx.globalAlpha = 1;

  particles = particles.filter(p => p.life > 0);
}

// Main game update

function update(dt) {
  score += Math.floor(dt * 15);
  speed = Math.min(0.85, speed + dt * 0.008);

  sceneryOffset += speed * dt;

  jump = Math.max(0, jump - dt * 1.5);
  sliding = Math.max(0, sliding - dt);

  spawnTimer += dt;

  if (spawnTimer > 1.25 / (speed / 0.38)) {
    spawnObjects();
    spawnTimer = 0;
  }

  // Move obstacles
  for (let o of obstacles) {
    o.z += speed * dt * 0.75;

    if (o.lane === lane && o.z > 0.87 && o.z < 1.05) {
      let avoided = false;

      if (o.type === "barrier" && jump > 0.15) avoided = true;
      if (o.type === "overhead" && sliding > 0) avoided = true;

      if (!avoided) {
        endGame();
        return;
      }
    }
  }

  // Move dog tags
  for (let p of pickups) {
    p.z += speed * dt * 0.75;

    if (!p.collected && p.lane === lane && p.z > 0.88 && p.z < 1.05) {
      p.collected = true;
      coins++;
      score += 50;

      createParticles(laneX(p.lane), groundY(p.z));
    }
  }

  obstacles = obstacles.filter(o => o.z < 1.15);
  pickups = pickups.filter(p => p.z < 1.15 && !p.collected);

  scoreDisplay.textContent = score;
  coinsDisplay.textContent = coins;
}

// Drawing

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawBackground();

  // Draw objects from farthest to closest
  const objects = [
    ...obstacles.map(o => ({ ...o, objectType: "obstacle" })),
    ...pickups.map(p => ({ ...p, objectType: "pickup" }))
  ].sort((a, b) => a.z - b.z);

  for (let o of objects) {
    if (o.objectType === "obstacle") {
      drawObstacle(o);
    } else {
      drawPickup(o);
    }
  }

  drawPlayer();

  drawParticles(0);

  // Speed indicator
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(W - 155, H - 65, 140, 35);

  ctx.fillStyle = "#d8dba7";
  ctx.font = "bold 14px Arial";
  ctx.fillText("SPEED: " + Math.round(speed * 100), W - 145, H - 43);
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;

  if (running) {
    update(dt);
    draw();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
