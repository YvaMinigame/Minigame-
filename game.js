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
const TINT = { good: "255,190,220", face: "255,190,220", boba: "255,215,170", shield: "140,230,255", bad: "185,60,125" };

const faceImgs = FACES.map(s => { const i = new Image(); i.ok = false; i.onload = () => i.ok = true; i.src = s; return i; });
const P = { x: W / 2, y: 550, w: 84, tx: W / 2, vx: 0, sq: 0 };
let items = [], parts = [], pops = [], rings = [], bgH = [];
let score = 0, lives = 3, combo = 0, slow = 0, shield = 0, spawnT = 0, shake = 0, flash = 0, t = 0, stateT = 0, best = 0, state = "start";
let lvl = 1, missT = 0, muted = false;
try { best = +localStorage.getItem("cdbest") || 0; muted = localStorage.getItem("cdmute") === "1"; } catch (e) {}

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

// ================= AUDIO =================
let AC, master, musicGain, noiseBuf;
function ac() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = .55; musicGain.connect(master);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === "suspended") AC.resume();
  } catch (e) {}
  return AC;
}
function tone(f, d = .1, type = "sine", v = .08, f2, delay = 0, dest) {
  if (!ac()) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime + Math.max(0, delay);
    o.type = type; o.frequency.setValueAtTime(f, n);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, n + d);
    g.gain.setValueAtTime(.0001, n); g.gain.linearRampToValueAtTime(v, n + .008); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    o.connect(g); g.connect(dest || master); o.start(n); o.stop(n + d + .02);
  } catch (e) {}
}
function noise(d = .08, v = .1, f = 2000, ftype = "highpass", f2, delay = 0) {
  if (!ac()) return;
  try {
    const s = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain(), n = AC.currentTime + delay;
    s.buffer = noiseBuf; flt.type = ftype; flt.frequency.setValueAtTime(f, n);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, n + d);
    g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    s.connect(flt); flt.connect(g); g.connect(master); s.start(n); s.stop(n + d + .02);
  } catch (e) {}
}
const buzz = n => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };
const PENTA = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5];
const SFX = {
  pop(p = 1, v = .12) { noise(.05, v, 1500, "highpass"); tone(900 * p, .08, "sine", v, 300 * p); },
  good(c) {
    SFX.pop(1 + Math.random() * .2, .1);
    const f = PENTA[c % PENTA.length];
    tone(f, .28, "sine", .09, undefined, .02); tone(f * 2, .2, "triangle", .035, undefined, .05);
  },
  face() { SFX.pop(1.1, .1); [784, 988, 1175, 1568].forEach((f, i) => tone(f, .18, "triangle", .07, undefined, i * .05)); },
  bad() { tone(160, .3, "sawtooth", .1, 50); tone(90, .35, "sine", .2, 40); noise(.2, .12, 900, "lowpass", 200); },
  boba() { for (let i = 0; i < 6; i++) tone(400 + i * 90, .09, "sine", .08, 700 + i * 110, i * .05); },
  shield() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, .25, "triangle", .07, f * 1.02, i * .06)); },
  block() { tone(1400, .25, "triangle", .1, 2200); noise(.1, .08, 3000, "highpass"); },
  miss() { SFX.pop(.7 + Math.random() * .3, .035); },
  combo() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, "square", .04, undefined, i * .06)); },
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, "triangle", .08, undefined, i * .08)); },
  start() { tone(500, .2, "triangle", .1, 900); tone(1200, .15, "sine", .05, 1800, .12); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, .4, "triangle", .1, f * .97, .3 + i * .18)); },
  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .55, "triangle", .1, undefined, i * .13));
    for (let i = 0; i < 10; i++) tone(1500 + Math.random() * 1500, .12, "sine", .04, undefined, .8 + i * .08);
  }
};

// background music: soft looping arpeggio that speeds up with level
const CH = [
  { b: 130.8, a: [261.6, 329.6, 392, 523.3] }, { b: 110, a: [220, 261.6, 329.6, 440] },
  { b: 87.3, a: [174.6, 220, 261.6, 349.2] }, { b: 98, a: [196, 246.9, 293.7, 392] }
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
let mNext = 0, mStep = 0;
function startMusic() { ac(); mNext = AC ? AC.currentTime + .1 : 0; mStep = 0; }
function music() {
  if (state !== "play" || !AC) return;
  if (mNext < AC.currentTime) mNext = AC.currentTime + .05;
  const dur = Math.max(.2, .3 - (lvl - 1) * .012);
  while (mNext < AC.currentTime + .35) {
    const ch = CH[Math.floor(mStep / 8) % 4], s = mStep % 8, dl = mNext - AC.currentTime;
    tone(ch.a[ARP[s]], .4, "sine", .05, undefined, dl, musicGain);
    if (s % 4 === 0) tone(ch.b, dur * 3, "triangle", .09, undefined, dl, musicGain);
    if (Math.random() < .3) tone(ch.a[Math.floor(Math.random() * 4)] * 2, .35, "sine", .03, undefined, dl, musicGain);
    mNext += dur; mStep++;
  }
}
setInterval(music, 100);
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("cdmute", muted ? "1" : "0"); } catch (e) {}
  ac(); if (master) master.gain.value = muted ? 0 : 1;
  if (!muted) SFX.pop(1, .1);
}

// ================= EFFECTS =================
function burst(x, y, n, cols, sp = 170) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = sp * (.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, l: 1, d: .8 + Math.random() * .8, c: cols[i % cols.length], s: 10 + Math.random() * 14, h: Math.random() < .6 });
  }
}
const pop = (x, y, txt, c = "#ff2d78") => pops.push({ x, y, txt, c, l: 1 });
const ring = (x, y, c, r = 22) => rings.push({ x, y, r, c, l: 1 });
const saveBest = () => { try { if (score > best) { best = score; localStorage.setItem("cdbest", best); } } catch (e) {} };

function reset() {
  items = []; parts = []; pops = []; rings = [];
  score = 0; lives = 3; combo = 0; slow = 0; shield = 0; spawnT = 0; shake = 0; flash = 0; lvl = 1;
  state = "play"; startMusic(); SFX.start();
}

// ================= SPAWN (no stacking) =================
function spawn() {
  let x = -1;
  for (let k = 0; k < 16; k++) {
    const c = 34 + Math.random() * (W - 68);
    if (items.every(o => o.y > 170 || Math.abs(o.x - c) > 74)) { x = c; break; }
  }
  if (x < 0) return false;
  const r = Math.random();
  const it = { x, y: -40, vy: 115 + lvl * 16 + Math.random() * 40, ph: Math.random() * 6, sd: Math.random() < .5 ? 1 : -1 };
  if (r < .34) { it.kind = "face"; it.e = "😊"; it.p = 12; it.img = faceImgs[Math.floor(Math.random() * faceImgs.length)]; }
  else if (r < .56) { const g = GOOD[Math.floor(Math.random() * GOOD.length)]; it.kind = "good"; it.e = g.e; it.p = g.p; }
  else if (r < .63) { it.kind = "boba"; it.e = "🧋"; }
  else if (r < .69) { it.kind = "shield"; it.e = "🛡️"; }
  else { it.kind = "bad"; it.e = BAD[Math.floor(Math.random() * BAD.length)]; }
  it.r = it.kind === "face" ? 34 : 30;
  items.push(it); return true;
}

function collect(it) {
  if (it.kind === "bad") {
    if (shield > 0) {
      shield = 0; burst(P.x, P.y - 20, 18, ["#7ee8ff", "#fff"]); ring(P.x, P.y - 20, "#7ee8ff", 30);
      pop(P.x, P.y - 70, "Blocked!", "#2aa5d8"); SFX.block();
    } else {
      lives--; combo = 0; shake = .45; flash = .4;
      burst(it.x, it.y, 16, ["#b3124f", "#ff5c8a"]); ring(it.x, it.y, "#b3124f");
      pop(P.x, P.y - 70, "Ouch!", "#b3124f"); SFX.bad(); buzz(120);
      if (lives <= 0) { state = "over"; stateT = 0; SFX.over(); saveBest(); }
    }
  } else if (it.kind === "boba") {
    slow = 5; burst(it.x, it.y, 16, ["#ffd1e8", "#c9a27a", "#fff"]); ring(it.x, it.y, "#c9a27a");
    pop(P.x, P.y - 70, "Slow-mo 🧋", "#a0527c"); SFX.boba();
  } else if (it.kind === "shield") {
    shield = 8; burst(it.x, it.y, 16, ["#7ee8ff", "#fff"]); ring(it.x, it.y, "#7ee8ff");
    pop(P.x, P.y - 70, "Shield 🛡️", "#2aa5d8"); SFX.shield();
  } else {
    combo++;
    const m = 1 + Math.floor(combo / 5), p = it.p * m;
    score += p; burst(it.x, it.y, 14, PINKS); ring(it.x, it.y, "#ff5c9a"); pop(it.x, it.y - 24, "+" + p);
    if (it.kind === "face") SFX.face(); else SFX.good(combo);
    if (combo % 5 === 0) { pop(W / 2, H * .32, "COMBO x" + m + "!", "#ff1a6e"); buzz(30); SFX.combo(); }
    if (score >= TARGET) { state = "win"; stateT = 0; buzz([80, 50, 80, 50, 160]); SFX.win(); saveBest(); }
  }
}

// ================= CONTROLS =================
const toGame = (cx, cy) => { const r = cv.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
const hitMute = (x, y) => (x - 28) ** 2 + (y - 118) ** 2 < 28 * 28;
function onTouch(e) {
  e.preventDefault(); ac();
  const [x, y] = toGame(e.touches[0].clientX, e.touches[0].clientY);
  if (e.type === "touchstart" && hitMute(x, y)) { toggleMute(); return; }
  if (state !== "play") { if (e.type === "touchstart" && stateT > .6) reset(); return; }
  P.tx = Math.max(P.w / 2, Math.min(W - P.w / 2, x));
}
cv.addEventListener("touchstart", onTouch, { passive: false });
cv.addEventListener("touchmove", onTouch, { passive: false });
cv.addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse") return;
  ac();
  const [x, y] = toGame(e.clientX, e.clientY);
  if (hitMute(x, y)) { toggleMute(); return; }
  if (state !== "play" && stateT > .6) reset();
});
cv.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || state !== "play") return;
  const [x] = toGame(e.clientX, e.clientY);
  P.tx = Math.max(P.w / 2, Math.min(W - P.w / 2, x));
});
["touchstart", "touchmove"].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
["gesturestart", "gesturechange", "dblclick", "contextmenu"].forEach(n => document.addEventListener(n, e => e.preventDefault()));

// ================= UPDATE =================
function update(dt) {
  const nl = 1 + Math.floor(score / 100), k = slow > 0 ? .45 : 1;
  if (nl > lvl) { lvl = nl; pop(W / 2, H * .42, "Level " + lvl + "!", "#ff1a6e"); SFX.level(); }
  slow = Math.max(0, slow - dt); shield = Math.max(0, shield - dt); missT = Math.max(0, missT - dt);
  spawnT -= dt;
  if (spawnT <= 0) spawnT = spawn() ? Math.max(.36, .8 - lvl * .07) : .08;

  for (const it of items) {
    it.y += it.vy * k * dt;
    if (Math.abs(it.x - P.x) < P.w / 2 + 6 && Math.abs(it.y - P.y) < 34 && it.y < P.y + 22) { it.dead = true; P.sq = 1; collect(it); }
    else if (it.y > H - 40) { // bubble pops on the floor
      it.dead = true; ring(it.x, H - 38, "#fff", 16);
      if (it.kind !== "bad" && missT <= 0) { SFX.miss(); missT = .06; }
    }
  }
  // bubbles push each other apart so nothing stacks
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r + 4;
    if (d < m) {
      const dir = Math.abs(dx) > .5 ? Math.sign(dx) : a.sd, push = (m - d) * .5 * Math.min(1, dt * 14);
      a.x = Math.max(a.r, Math.min(W - a.r, a.x - dir * push));
      b.x = Math.max(b.r, Math.min(W - b.r, b.x + dir * push));
    }
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
  for (const r of rings) { r.r += 150 * dt; r.l -= dt * 3; }
  rings = rings.filter(r => r.l > 0);
  if (state === "win" && Math.random() < .5) parts.push({ x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 40, vy: 80 + Math.random() * 80, l: 1, d: 3, c: PINKS[Math.floor(Math.random() * 5)], s: 12 + Math.random() * 14, h: true });
}

// ================= DRAW =================
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

function drawBubble(it) {
  const R = it.r, tn = TINT[it.kind];
  ctx.save();
  ctx.translate(it.x + Math.sin(t * 2 + it.ph) * 3, it.y);
  const wb = Math.sin(t * 5 + it.ph) * .04; ctx.scale(1 + wb, 1 - wb);
  // soap film body
  const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
  g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.6, "rgba(" + tn + ",.22)"); g.addColorStop(1, "rgba(" + tn + ",.6)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.stroke();
  // rainbow shimmer
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(120,220,255,.55)"; ctx.beginPath(); ctx.arc(0, 0, R - 4, .15 * Math.PI, .65 * Math.PI); ctx.stroke();
  ctx.strokeStyle = "rgba(255,160,230,.55)"; ctx.beginPath(); ctx.arc(0, 0, R - 4, 1.15 * Math.PI, 1.65 * Math.PI); ctx.stroke();
  // warning pulse on bad bubbles
  if (it.kind === "bad") {
    ctx.strokeStyle = "rgba(120,0,50," + (.35 + Math.sin(t * 8) * .15) + ")"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R + 3, 0, 6.3); ctx.stroke();
  }
  // content inside
  ctx.save(); ctx.rotate(Math.sin(t * 3 + it.ph) * .15);
  if (it.kind === "face") {
    if (it.img.ok) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.3); ctx.clip(); ctx.drawImage(it.img, -24, -24, 48, 48); ctx.restore(); }
    else emoji(it.e, 0, 1, 38);
    ctx.strokeStyle = "#ff2d78"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 25, 0, 6.3); ctx.stroke();
  } else emoji(it.e, 0, 1, 32);
  ctx.restore();
  // glass highlights
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .45, R * .2, R * .11, -.7, 0, 6.3); ctx.fill();
  ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(R * .4, R * .38, R * .06, 0, 6.3); ctx.fill();
  ctx.restore();
}
function drawItems() { for (const it of items) drawBubble(it); }

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
  for (const r of rings) {
    ctx.globalAlpha = Math.max(0, r.l); ctx.strokeStyle = r.c; ctx.lineWidth = 1 + 3 * r.l;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.3); ctx.stroke();
  }
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c;
    ctx.font = p.s + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.h ? "♥" : "✦", p.x, p.y);
  }
  ctx.globalAlpha = 1;
  for (const q of pops) {
    ctx.globalAlpha = Math.min(1, q.l * 1.5);
    const sc = 1 + Math.max(0, q.l - .8) * 2; ctx.save(); ctx.translate(q.x, q.y); ctx.scale(sc, sc);
    text(q.txt, 1.5, 2, 22, "rgba(255,255,255,.95)", "center");
    text(q.txt, 0, 0, 22, q.c, "center"); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function hud() {
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.roundRect(10, 10, 150, 36, 18); ctx.fill();
  text("⭐ " + score, 26, 35, 20, "#c2185b");
  text("Lv " + lvl, 204, 35, 16, "#a0114f", "center");
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.roundRect(W - 112, 10, 102, 36, 18); ctx.fill();
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

function muteBtn() {
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(28, 118, 17, 0, 6.3); ctx.fill();
  emoji(muted ? "🔇" : "🔊", 28, 119, 18);
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
  muteBtn();
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
