// ===== EDIT THESE =====
const TARGET = 500;
const WIN_TITLE = "I love you 💖";
const WIN_TEXT = "Write your message to her here.";
const FACES = ["assets/faces/face1.png", "assets/faces/face2.png", "assets/faces/face3.png"];
// ======================

const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const W = 360; let H = 640, SX = 1, SY = 1;
const PINKS = ["#ff2d78", "#ff7ab0", "#ffc2dc", "#fff", "#ff5c9a"];
const GOOD = [{ e: "🍩", p: 5 }, { e: "☕", p: 5 }, { e: "💖", p: 8 }, { e: "🍓", p: 6 }];
const BAD = ["⏰", "📚", "🪫"];

const faceImgs = FACES.map(s => { const i = new Image(); i.ok = false; i.onload = () => i.ok = true; i.src = s; return i; });
const P = { x: W / 2, y: 550, w: 84, tx: W / 2, vx: 0, sq: 0 };
let items = [], parts = [], pops = [], bgH = [];
let score = 0, lives = 3, combo = 0, slow = 0, shield = 0, spawnT = 0, shake = 0, flash = 0, t = 0, stateT = 0, best = 0, state = "start";
try { best = +localStorage.getItem("cdbest") || 0; } catch (e) {}

function fit() {
  const ch = innerHeight, cw = Math.min(innerWidth, ch * 0.62);
  cv.style.width = cw + "px"; cv.style.height = ch + "px";
  const d = Math.min(devicePixelRatio || 1, 3);
  cv.width = cw * d; cv.height = ch * d;
  H = W * ch / cw; SX = cv.width / W; SY = cv.height / H;
  P.y = H - 90;
  bgH = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 14 + Math.random() * 28, v: 15 + Math.random() * 30, ph: Math.random() * 6 }));
}
addEventListener("resize", fit); fit();

// ---- sound + vibration ----
let AC;
function snd(f, d = .1, type = "sine", v = .08, f2) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, n);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, n + d);
    g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(n + d);
  } catch (e) {}
}
const buzz = n => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };

// ---- effects ----
function burst(x, y, n, cols, sp = 170) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = sp * (.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, l: 1, d: .8 + Math.random() * .8, c: cols[i % cols.length], s: 10 + Math.random() * 14, h: Math.random() < .6 });
  }
}
const pop = (x, y, txt, c = "#ff2d78") => pops.push({ x, y, txt, c, l: 1 });

function reset() {
  items = []; parts = []; pops = [];
  score = 0; lives = 3; combo = 0; slow = 0; shield = 0; spawnT = 0; shake = 0; flash = 0;
  state = "play"; snd(500, .2, "triangle", .1, 900);
}

function spawn(lvl) {
  const r = Math.random();
  const it = { x: 32 + Math.random() * (W - 64), y: -40, vy: 115 + lvl * 16 + Math.random() * 40, s: 36, ph: Math.random() * 6, rot: 0, vr: (Math.random() - .5) * 2 };
  if (r < .34) { it.kind = "face"; it.e = "😊"; it.p = 12; it.img = faceImgs[Math.floor(Math.random() * faceImgs.length)]; }
  else if (r < .56) { const g = GOOD[Math.floor(Math.random() * GOOD.length)]; it.kind = "good"; it.e = g.e; it.p = g.p; }
  else if (r < .63) { it.kind = "boba"; it.e = "🧋"; }
  else if (r < .69) { it.kind = "shield"; it.e = "🛡️"; }
  else { it.kind = "bad"; it.e = BAD[Math.floor(Math.random() * BAD.length)]; }
  items.push(it);
}

function collect(it) {
  if (it.kind === "bad") {
    if (shield > 0) { shield = 0; burst(P.x, P.y - 20, 18, ["#7ee8ff", "#fff"]); pop(P.x, P.y - 70, "Blocked!", "#2aa5d8"); snd(700, .2, "triangle", .1, 1300); }
    else {
      lives--; combo = 0; shake = .45; flash = .4;
      burst(it.x, it.y, 16, ["#b3124f", "#ff5c8a"]); pop(P.x, P.y - 70, "Ouch!", "#b3124f");
      snd(200, .3, "sawtooth", .1, 70); buzz(120);
      if (lives <= 0) { state = "over"; stateT = 0; try { if (score > best) { best = score; localStorage.setItem("cdbest", best); } } catch (e) {} }
    }
  } else if (it.kind === "boba") {
    slow = 5; burst(it.x, it.y, 16, ["#ffd1e8", "#c9a27a", "#fff"]); pop(P.x, P.y - 70, "Slow-mo 🧋", "#a0527c"); snd(500, .3, "sine", .1, 950);
  } else if (it.kind === "shield") {
    shield = 8; burst(it.x, it.y, 16, ["#7ee8ff", "#fff"]); pop(P.x, P.y - 70, "Shield 🛡️", "#2aa5d8"); snd(450, .3, "triangle", .1, 1000);
  } else {
    combo++;
    const m = 1 + Math.floor(combo / 5), p = it.p * m;
    score += p; burst(it.x, it.y, 14, PINKS); pop(it.x, it.y - 24, "+" + p);
    snd(600 + Math.min(combo, 14) * 40, .13, "sine", .09, 1000 + Math.min(combo, 14) * 40);
    if (combo % 5 === 0) { pop(W / 2, H * .32, "COMBO x" + m + "!", "#ff1a6e"); buzz(30); snd(900, .25, "square", .05, 1500); }
    if (score >= TARGET) {
      state = "win"; stateT = 0; buzz([80, 50, 80, 50, 160]);
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => snd(f, .35, "triangle", .1), i * 150));
      try { if (score > best) { best = score; localStorage.setItem("cdbest", best); } } catch (e) {}
    }
  }
}

// ---- controls ----
function onTouch(e) {
  e.preventDefault();
  if (state !== "play") { if (e.type === "touchstart" && stateT > .6) reset(); return; }
  const r = cv.getBoundingClientRect();
  P.tx = Math.max(P.w / 2, Math.min(W - P.w / 2, (e.touches[0].clientX - r.left) * W / r.width));
}
cv.addEventListener("touchstart", onTouch, { passive: false });
cv.addEventListener("touchmove", onTouch, { passive: false });
cv.addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse") return;
  if (state !== "play") { if (stateT > .6) reset(); }
});
cv.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || state !== "play") return;
  const r = cv.getBoundingClientRect();
  P.tx = Math.max(P.w / 2, Math.min(W - P.w / 2, (e.clientX - r.left) * W / r.width));
});
["touchstart", "touchmove"].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
["gesturestart", "gesturechange", "dblclick", "contextmenu"].forEach(n => document.addEventListener(n, e => e.preventDefault()));

// ---- update ----
function update(dt) {
  const lvl = 1 + Math.floor(score / 100), k = slow > 0 ? .45 : 1;
  slow = Math.max(0, slow - dt); shield = Math.max(0, shield - dt);
  spawnT -= dt; if (spawnT <= 0) { spawn(lvl); spawnT = Math.max(.36, .8 - lvl * .07); }
  for (const it of items) {
    it.y += it.vy * k * dt; it.rot += it.vr * dt;
    if (Math.abs(it.x - P.x) < P.w / 2 + 6 && Math.abs(it.y - P.y) < 34 && it.y < P.y + 22) { it.dead = true; P.sq = 1; collect(it); }
  }
  items = items.filter(i => !i.dead && i.y < H + 50);
}

function tick(dt) {
  t += dt; stateT += dt;
  const nx = P.x + (P.tx - P.x) * Math.min(1, dt * 18);
  P.vx = (nx - P.x) / Math.max(dt, .001); P.x = nx; P.sq = Math.max(0, P.sq - dt * 4);
  shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
  for (const h of bgH) { h.y -= h.v * dt; if (h.y < -40) { h.y = H + 40; h.x = Math.random() * W; } }
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.l -= dt / p.d; }
  parts = parts.filter(p => p.l > 0);
  for (const q of pops) { q.y -= 50 * dt; q.l -= dt * 1.1; }
  pops = pops.filter(q => q.l > 0);
  if (state === "win" && Math.random() < .5) parts.push({ x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 40, vy: 80 + Math.random() * 80, l: 1, d: 3, c: PINKS[Math.floor(Math.random() * 5)], s: 12 + Math.random() * 14, h: true });
}

// ---- draw ----
function emoji(e, x, y, s) { ctx.font = s + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }
function text(s, x, y, size, color, align = "left", w = "bold") { ctx.font = w + " " + size + "px sans-serif"; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillStyle = color; ctx.fillText(s, x, y); }
function wrap(s, x, y, maxW, lh, color) {
  ctx.font = "17px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = color; let line = "";
  for (const w of s.split(" ")) { const tt = line + w + " "; if (ctx.measureText(tt).width > maxW && line) { ctx.fillText(line, x, y); line = w + " "; y += lh; } else line = tt; }
  ctx.fillText(line, x, y);
}

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ffd9ea"); g.addColorStop(.55, "#ffa6cc"); g.addColorStop(1, "#ff7fb5");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const gx = W / 2 + Math.sin(t * .5) * 90, r = ctx.createRadialGradient(gx, H * .3, 10, gx, H * .3, 320);
  r.addColorStop(0, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .28; ctx.fillStyle = "#fff";
  for (const h of bgH) { ctx.font = h.s + "px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♥", h.x + Math.sin(t + h.ph) * 14, h.y); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,92,154,.55)"; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H - 34 + Math.sin(x * .03 + t * 2) * 5);
  ctx.lineTo(W, H); ctx.fill();
  if (slow > 0) { ctx.fillStyle = "rgba(190,225,255,.22)"; ctx.fillRect(0, 0, W, H); }
}

function drawItems() {
  for (const it of items) {
    ctx.save(); ctx.translate(it.x, it.y);
    const w = Math.sin(t * 4 + it.ph) * .15;
    ctx.fillStyle = it.kind === "bad" ? "rgba(120,0,50,.2)" : "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(0, 0, it.kind === "face" ? 32 : 26 + Math.sin(t * 6 + it.ph) * 2, 0, 6.3); ctx.fill();
    ctx.rotate(it.kind === "face" ? w : it.rot * .3 + w);
    if (it.kind === "face") {
      if (it.img.ok) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 26, 0, 6.3); ctx.clip(); ctx.drawImage(it.img, -26, -26, 52, 52); ctx.restore(); }
      else emoji(it.e, 0, 0, 40);
      ctx.strokeStyle = "#ff2d78"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 27, 0, 6.3); ctx.stroke();
    } else emoji(it.e, 0, 0, it.s);
    ctx.restore();
  }
}

function drawPlayer() {
  ctx.save(); ctx.translate(P.x, P.y);
  ctx.rotate(Math.max(-.35, Math.min(.35, P.vx / 1800)));
  const s = P.sq; ctx.scale(1 + s * .25, 1 - s * .2);
  if (shield > 0) {
    ctx.strokeStyle = "rgba(126,232,255,.9)"; ctx.fillStyle = "rgba(126,232,255,.22)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 50 + Math.sin(t * 8) * 3, 0, 6.3); ctx.fill(); ctx.stroke();
  }
  emoji("🧺", 0, 0, 60);
  ctx.restore();
}

function drawParts() {
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c;
    ctx.font = p.s + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.h ? "♥" : "✦", p.x, p.y);
  }
  ctx.globalAlpha = 1;
  for (const q of pops) {
    ctx.globalAlpha = Math.min(1, q.l * 1.5);
    const sc = 1 + Math.max(0, q.l - .8) * 2; ctx.save(); ctx.translate(q.x, q.y); ctx.scale(sc, sc);
    text(q.txt, 0, 0, 22, "#fff", "center"); ctx.lineWidth = 0; ctx.restore();
    text(q.txt, q.x, q.y, 22, q.c, "center");
  }
  ctx.globalAlpha = 1;
}

function hud() {
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.roundRect(10, 10, 150, 36, 18); ctx.fill();
  text("⭐ " + score, 26, 35, 20, "#c2185b");
  ctx.beginPath(); ctx.roundRect(W - 112, 10, 102, 36, 18); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const beat = 1 + (i < lives ? Math.max(0, Math.sin(t * 6)) * .15 : 0);
    ctx.save(); ctx.translate(W - 90 + i * 30, 29); ctx.scale(beat, beat);
    ctx.globalAlpha = i < lives ? 1 : .25; emoji("❤️", 0, 0, 22); ctx.restore();
  }
  ctx.globalAlpha = 1;
  const pw = W - 20, pr = Math.min(1, score / TARGET);
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.roundRect(10, 54, pw, 10, 5); ctx.fill();
  if (pr > 0) { const g = ctx.createLinearGradient(10, 0, 10 + pw, 0); g.addColorStop(0, "#ff7ab0"); g.addColorStop(1, "#ff1a6e"); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(10, 54, Math.max(10, pw * pr), 10, 5); ctx.fill(); }
  const m = 1 + Math.floor(combo / 5);
  text("Combo x" + m, 12, 86, 14, "#a0114f");
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.roundRect(92, 76, 80, 8, 4); ctx.fill();
  ctx.fillStyle = "#ff2d78"; ctx.beginPath(); ctx.roundRect(92, 76, Math.max(8, 16 * (combo % 5)), 8, 4); ctx.fill();
  if (slow > 0) text("🧋 " + slow.toFixed(1) + "s", W - 12, 86, 14, "#6b3a8a", "right");
  if (shield > 0) text("🛡️ " + shield.toFixed(1) + "s", W - 12, 106, 14, "#1f7fa8", "right");
}

function card(title, lines, btn) {
  ctx.fillStyle = "rgba(120,20,70,.45)"; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, enter = Math.min(1, stateT * 4), sc = .7 + .3 * (1 - Math.pow(1 - enter, 3));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha = enter;
  ctx.fillStyle = "#fff0f6"; ctx.strokeStyle = "#ff5c9a"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-150, -170, 300, 340, 30); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(0, -105); const b = 1 + Math.sin(t * 4) * .05; ctx.scale(b, b);
  text(title, 0, 0, 30, "#e0105f", "center"); ctx.restore();
  let y = -50; for (const l of lines) { wrap(l, 0, y, 250, 24, "#8a1e55"); y += 50 + (l.length > 40 ? 28 : 0); }
  const bs = 1 + Math.sin(t * 5) * .06; ctx.save(); ctx.translate(0, 125); ctx.scale(bs, bs);
  ctx.fillStyle = "#ff3d87"; ctx.beginPath(); ctx.roundRect(-90, -24, 180, 48, 24); ctx.fill();
  text(btn, 0, 7, 19, "#fff", "center"); ctx.restore();
  ctx.restore(); ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(SX, 0, 0, SY, 0, 0);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake * 30, (Math.random() - .5) * shake * 30);
  bg(); drawItems(); drawPlayer(); drawParts();
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = "rgba(255,30,100," + flash * .6 + ")"; ctx.fillRect(0, 0, W, H); }
  if (state !== "start") hud();
  if (state === "start") card("Catch & Dodge 💕", ["Drag to slide the basket. Catch faces and treats, dodge clocks, books and low battery.", "Best: " + best], "Tap to play");
  if (state === "over") card("Oh no! 😢", ["Score " + score, "Best: " + best], "Try again");
  if (state === "win") card(WIN_TITLE, [WIN_TEXT, "Score " + score], "Play again");
}

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, .05); last = ts;
  tick(dt); if (state === "play") update(dt);
  draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
