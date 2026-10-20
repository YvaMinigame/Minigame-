// ===== EDIT THESE =====
const TARGET = 300;
const WIN_TITLE = "You did it! 💖";
const WIN_TEXT = "Write your message to her here.";
const FACES = ["assets/faces/face1.png", "assets/faces/face2.png", "assets/faces/face3.png"];
// ======================

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const W = 360, H = 640;

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = W * s + "px";
  cv.style.height = H * s + "px";
}
addEventListener("resize", fit);
fit();

const faceImgs = FACES.map(src => {
  const i = new Image();
  i.ok = false;
  i.onload = () => (i.ok = true);
  i.src = src;
  return i;
});

const player = { x: W / 2, y: H - 70, w: 80 };
let items = [], score = 0, lives = 3, combo = 0, slow = 0, shield = 0, spawnT = 0;
let state = "start";

const GOOD = [{ e: "🍩", p: 5 }, { e: "☕", p: 5 }, { e: "💖", p: 8 }];
const BAD = ["⏰", "📚", "🪫"];

function reset() {
  items = []; score = 0; lives = 3; combo = 0; slow = 0; shield = 0; spawnT = 0;
  state = "play";
}

function spawn() {
  const r = Math.random();
  const it = {
    x: 30 + Math.random() * (W - 60),
    y: -30,
    vy: 120 + Math.min(score, 300) * 0.4 + Math.random() * 40,
    s: 34
  };
  if (r < 0.4) {
    it.kind = "face"; it.e = "😊"; it.p = 10;
    it.img = faceImgs[Math.floor(Math.random() * faceImgs.length)];
  } else if (r < 0.6) {
    const g = GOOD[Math.floor(Math.random() * GOOD.length)];
    it.kind = "good"; it.e = g.e; it.p = g.p;
  } else if (r < 0.68) { it.kind = "boba"; it.e = "🧋"; }
  else if (r < 0.74) { it.kind = "shield"; it.e = "🛡️"; }
  else { it.kind = "bad"; it.e = BAD[Math.floor(Math.random() * BAD.length)]; }
  items.push(it);
}

function moveTo(cx) {
  const r = cv.getBoundingClientRect();
  const x = ((cx - r.left) * W) / r.width;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, x));
}
cv.addEventListener("pointerdown", e => {
  if (state !== "play") reset();
  else moveTo(e.clientX);
});
cv.addEventListener("pointermove", e => {
  if (state === "play") moveTo(e.clientX);
});

function update(dt) {
  const k = slow > 0 ? 0.5 : 1;
  slow = Math.max(0, slow - dt);
  shield = Math.max(0, shield - dt);
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = 0.75; }

  for (const it of items) {
    it.y += it.vy * k * dt;
    if (Math.abs(it.x - player.x) < player.w / 2 + 8 && Math.abs(it.y - player.y) < 30) {
      it.dead = true;
      if (it.kind === "bad") {
        if (shield > 0) shield = 0;
        else { lives--; combo = 0; if (lives <= 0) state = "over"; }
      } else if (it.kind === "boba") slow = 5;
      else if (it.kind === "shield") shield = 8;
      else {
        combo++;
        score += it.p * (1 + Math.floor(combo / 5));
        if (score >= TARGET) state = "win";
      }
    }
  }
  items = items.filter(it => !it.dead && it.y < H + 40);
}

function emoji(e, x, y, s) {
  ctx.font = s + "px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(e, x, y);
}

function wrap(txt, x, y, maxW, lh) {
  let line = "";
  for (const w of txt.split(" ")) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w + " ";
      y += lh;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

function overlay(title, text) {
  ctx.fillStyle = "rgba(60,10,35,0.85)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(title, W / 2, 230);
  ctx.font = "18px sans-serif";
  wrap(text, W / 2, 285, 280, 26);
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Tap to play", W / 2, 440);
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ffd6e4");
  g.addColorStop(1, "#fff1e0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const it of items) {
    if (it.img && it.img.ok) ctx.drawImage(it.img, it.x - 24, it.y - 24, 48, 48);
    else emoji(it.e, it.x, it.y, it.s);
  }

  emoji("🧺", player.x, player.y, 56);
  if (shield > 0) {
    ctx.strokeStyle = "#ff4d88";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 46, 0, 7);
    ctx.stroke();
  }

  ctx.fillStyle = "#7a1f45";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Score " + score + "/" + TARGET, 12, 24);
  ctx.textAlign = "right";
  ctx.fillText("❤️".repeat(Math.max(lives, 0)), W - 12, 24);

  ctx.textAlign = "left";
  ctx.font = "14px sans-serif";
  ctx.fillText("Combo x" + (1 + Math.floor(combo / 5)) + (slow > 0 ? "   🧋 slow" : ""), 12, 50);
  ctx.fillStyle = "rgba(122,31,69,0.2)";
  ctx.fillRect(12, 60, 120, 8);
  ctx.fillStyle = "#ff4d88";
  ctx.fillRect(12, 60, 24 * (combo % 5), 8);

  if (state === "start") overlay("Catch & Dodge 💕", "Drag to move. Catch faces and snacks. Dodge clocks, books and low battery.");
  if (state === "over") overlay("Oh no! 😢", "Score " + score + ". Try again!");
  if (state === "win") overlay(WIN_TITLE, WIN_TEXT);
}

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  if (state === "play") update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
