// ===== EDIT THESE =====
const OVER_TITLE = "Galing mo Mwa 💋";
const OVER_TEXT = "You did so good! Wanna go again?";
const FACES = ["assets/faces/face1.png", "assets/faces/face2.png", "assets/faces/face3.png"]; // faces that fall
const ME_IMG = "assets/me.png";   // YOUR face (png later). Until it exists, the emoji below is used
const ME_EMOJI = "😎";            // placeholder emoji for your face
const KISSES = ["💋", "😘", "😚", "💕", "💖", "💗"]; // emojis that burst when she catches your face
const NIGHT_EVERY = 90;           // seconds of play before day <-> night
// PNG skins: put a path for any emoji, e.g. "🍩": "assets/donut.png". Empty = use the emoji
const SKIN = { "🧺": "", "🍩": "", "☕": "", "💖": "", "🍓": "", "⏰": "", "📚": "", "🪫": "", "💔": "", "🧋": "", "🛡️": "", "⭐": "" };
// ======================

const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const W = 360; let H = 640, SX = 1, SY = 1;
const PINKS = ["#ff2d78", "#ff7ab0", "#ffc2dc", "#fff", "#ff5c9a"];
const GOOD = [{ e: "🍩", p: 5 }, { e: "☕", p: 5 }, { e: "💖", p: 8 }, { e: "🍓", p: 6 }];
const BAD = ["⏰", "📚", "🪫", "💔"];
const LABEL = { "⏰": "Alarm", "📚": "Books", "🪫": "Battery", "💔": "Heartbreak" };
const TINT = { good: "255,190,220", face: "255,190,220", boba: "255,215,170", shield: "140,230,255", bad: "185,60,125", me: "255,225,140", star: "255,240,150" };

const newImg = s => { const i = new Image(); i.ok = false; i.onload = () => i.ok = true; i.src = s; return i; };
const faceImgs = FACES.map(newImg), meImg = newImg(ME_IMG);
const skinCache = {};
function icon(e, x, y, s) {
  const p = SKIN[e];
  if (p) { const im = skinCache[p] || (skinCache[p] = newImg(p)); if (im.ok) { ctx.drawImage(im, x - s * .6, y - s * .6, s * 1.2, s * 1.2); return; } }
  emoji(e, x, y, s);
}

const P = { x: W / 2, y: 550, w: 84, tx: W / 2, vx: 0, sq: 0 };
let items = [], parts = [], pops = [], rings = [], stamps = [], shoots = [], bgH = [], bgS = [], btns = [];
let score = 0, lives = 3, combo = 0, slow = 0, shield = 0, spawnT = 0, shake = 0, flash = 0, kflash = 0;
let t = 0, stateT = 0, best = 0, state = "start", lvl = 1, missT = 0, muted = false, caught = 0, newBest = false;
let playT = 0, nextSwitch = NIGHT_EVERY, night = 0, nightTarget = 0, ne = 0, meT = 8, starT = 15, cd = 3, lastCd = 4, CF = 1;
try { best = +localStorage.getItem("cdbest") || 0; muted = localStorage.getItem("cdmute") === "1"; } catch (e) {}

function fit() {
  const ch = innerHeight, cw = Math.min(innerWidth, ch * 0.62);
  cv.style.width = cw + "px"; cv.style.height = ch + "px";
  const d = Math.min(devicePixelRatio || 1, 3);
  cv.width = cw * d; cv.height = ch * d;
  H = W * ch / cw; SX = cv.width / W; SY = cv.height / H;
  P.y = H - 90;
  bgH = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 14 + Math.random() * 28, v: 15 + Math.random() * 30, ph: Math.random() * 6 }));
  bgS = Array.from({ length: 55 }, () => ({ x: Math.random() * W, y: Math.random() * H * .85, r: .6 + Math.random() * 1.6, ph: Math.random() * 6 }));
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
  click() { tone(800, .06, "triangle", .07, 1200); },
  cd(n) { if (n > 0) tone(520 + (3 - n) * 120, .18, "triangle", .1); else { tone(880, .15, "triangle", .1); tone(1320, .3, "sine", .09, undefined, .1); } },
  kiss() {
    noise(.05, .08, 2200, "bandpass"); tone(1500, .07, "sine", .11, 600);
    tone(650, .09, "sine", .1, 1500, .09); noise(.04, .05, 3000, "bandpass", undefined, .09);
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, .25, "sine", .06, undefined, .2 + i * .06));
  },
  star() { for (let i = 0; i < 9; i++) tone(1200 + Math.random() * 1800, .14, "sine", .05, undefined, i * .045); },
  night() { [784, 659, 523, 392].forEach((f, i) => tone(f, .5, "sine", .06, undefined, i * .16)); },
  day() { [392, 523, 659, 784].forEach((f, i) => tone(f, .5, "sine", .06, undefined, i * .16)); },
  over() {
    [392, 330, 262].forEach((f, i) => tone(f, .4, "triangle", .1, f * .97, .25 + i * .18));
    [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, "sine", .07, undefined, 1 + i * .1));
  }
};

// background music: soft looping arpeggio, speeds up with level, changes mood at night
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
  const dur = Math.max(.17, .3 - (lvl - 1) * .01), off = ne > .5 ? 1 : 0;
  musicGain.gain.value = .55 - .2 * ne;
  while (mNext < AC.currentTime + .35) {
    const ch = CH[(Math.floor(mStep / 8) + off) % 4], s = mStep % 8, dl = mNext - AC.currentTime;
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
function kiss(x, y) {
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * 6.283, s = 120 + Math.random() * 220;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, l: 1, d: 1.1 + Math.random() * .9, e: KISSES[i % KISSES.length], s: 20 + Math.random() * 18 });
  }
  for (let i = 0; i < 6; i++) stamps.push({ x: 40 + Math.random() * (W - 80), y: H * .2 + Math.random() * H * .5, l: 1, rot: (Math.random() - .5) * .8, s: 36 + Math.random() * 26 });
  ring(x, y, "#ff4f9a", 28); ring(x, y, "#ffd1e8", 12);
  pop(W / 2, H * .34, "MWAH! 💋", "#ff1a6e"); kflash = .5; SFX.kiss(); buzz([40, 30, 40]);
}

// ================= GAME FLOW =================
function reset() {
  items = []; parts = []; pops = []; rings = []; stamps = [];
  score = 0; lives = 3; combo = 0; slow = 0; shield = 0; spawnT = 0; shake = 0; flash = 0; kflash = 0;
  lvl = 1; caught = 0; playT = 0; nextSwitch = NIGHT_EVERY; nightTarget = 0; meT = 8; starT = 15;
  state = "play"; stateT = 0; startMusic(); SFX.start();
}
function toMenu() { state = "start"; stateT = 0; items = []; parts = []; pops = []; rings = []; stamps = []; }
function pause() { if (state !== "play") return; state = "pause"; stateT = 0; SFX.click(); }
function resume() { state = "count"; cd = 3; lastCd = 4; stateT = 0; SFX.click(); }
const speedMul = () => 1 + 2.4 * (1 - Math.exp(-score / 1100)) + score / 12000; // unlimited, keeps climbing

function spawn() {
  let x = -1;
  for (let k = 0; k < 16; k++) {
    const c = 34 + Math.random() * (W - 68);
    if (items.every(o => o.y > 170 || Math.abs(o.x - c) > 74)) { x = c; break; }
  }
  if (x < 0) return false;
  const it = { x, y: -40, vy: (118 + Math.random() * 40) * speedMul(), ph: Math.random() * 6, sd: Math.random() < .5 ? 1 : -1 };
  const r = Math.random(), badP = Math.min(.42, .28 + lvl * .012);
  if (meT <= 0 && r < .05) { it.kind = "me"; it.e = ME_EMOJI; it.img = meImg; meT = 12 + Math.random() * 6; }
  else if (starT <= 0 && lvl >= 2 && r < .09) { it.kind = "star"; it.e = "⭐"; starT = 20 + Math.random() * 10; }
  else {
    const u = Math.random();
    if (u < badP) { it.kind = "bad"; it.e = BAD[Math.floor(Math.random() * BAD.length)]; }
    else if (u < badP + .06) { it.kind = "boba"; it.e = "🧋"; }
    else if (u < badP + .11) { it.kind = "shield"; it.e = "🛡️"; }
    else if (Math.random() < .5) { it.kind = "face"; it.e = "😊"; it.p = 12; it.img = faceImgs[Math.floor(Math.random() * faceImgs.length)]; }
    else { const g = GOOD[Math.floor(Math.random() * GOOD.length)]; it.kind = "good"; it.e = g.e; it.p = g.p; }
  }
  it.r = (it.kind === "face" || it.kind === "me") ? 34 : 30;
  const pr = Math.random();
  if (pr < .22) it.vx = (Math.random() < .5 ? -1 : 1) * (25 + Math.random() * 35);
  else if (pr < .36) it.zig = 40 + Math.random() * 30;
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
      if (lives <= 0) { newBest = score > best; state = "over"; stateT = 0; saveBest(); SFX.over(); }
    }
  } else if (it.kind === "boba") {
    slow = 5; burst(it.x, it.y, 16, ["#ffd1e8", "#c9a27a", "#fff"]); ring(it.x, it.y, "#c9a27a");
    pop(P.x, P.y - 70, "Slow-mo 🧋", "#a0527c"); SFX.boba();
  } else if (it.kind === "shield") {
    shield = 8; burst(it.x, it.y, 16, ["#7ee8ff", "#fff"]); ring(it.x, it.y, "#7ee8ff");
    pop(P.x, P.y - 70, "Shield 🛡️", "#2aa5d8"); SFX.shield();
  } else if (it.kind === "star") {
    let n = 0;
    for (const o of items) if (o !== it && o.kind === "bad" && !o.dead) { o.dead = true; n++; burst(o.x, o.y, 10, ["#ffe066", "#fff"]); ring(o.x, o.y, "#ffe066"); }
    const p = 10 + n * 5; score += p; caught++;
    ring(P.x, P.y - 20, "#ffe066", 30); pop(P.x, P.y - 70, "✨ Burst! +" + p, "#d98a00"); SFX.star();
  } else if (it.kind === "me") {
    combo++; caught++;
    const p = 25 * (1 + Math.floor(combo / 5)); score += p;
    if (lives < 3) lives++;
    kiss(it.x, it.y); pop(it.x, it.y - 24, "+" + p);
  } else {
    combo++; caught++;
    const m = 1 + Math.floor(combo / 5), p = it.p * m;
    score += p; burst(it.x, it.y, 14, PINKS); ring(it.x, it.y, "#ff5c9a"); pop(it.x, it.y - 24, "+" + p);
    if (it.kind === "face") SFX.face(); else SFX.good(combo);
    if (combo % 5 === 0) { pop(W / 2, H * .32, "COMBO x" + m + "!", "#ff1a6e"); buzz(30); SFX.combo(); }
  }
}

// ================= CONTROLS =================
const cl = x => Math.max(P.w / 2, Math.min(W - P.w / 2, x));
const toGame = (cx, cy) => { const r = cv.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
const hitMute = (x, y) => (x - 28) ** 2 + (y - 118) ** 2 < 28 * 28;
const hitPause = (x, y) => (x - 68) ** 2 + (y - 118) ** 2 < 28 * 28;
function tap(x, y) {
  ac();
  if (hitMute(x, y)) { toggleMute(); return true; }
  if (state === "play" && hitPause(x, y)) { pause(); return true; }
  if ((state === "start" || state === "over" || state === "pause") && stateT > .4)
    for (const b of btns) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { SFX.click(); b.act(); return true; }
  return false;
}
function onTouch(e) {
  e.preventDefault();
  const [x, y] = toGame(e.touches[0].clientX, e.touches[0].clientY);
  if (e.type === "touchstart" && tap(x, y)) return;
  if (state === "play") P.tx = cl(x);
}
cv.addEventListener("touchstart", onTouch, { passive: false });
cv.addEventListener("touchmove", onTouch, { passive: false });
cv.addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse") return;
  const [x, y] = toGame(e.clientX, e.clientY); tap(x, y);
});
cv.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || state !== "play") return;
  P.tx = cl(toGame(e.clientX, e.clientY)[0]);
});
const keys = {};
addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "p" || e.key === "P" || e.key === "Escape") { if (state === "play") pause(); else if (state === "pause") resume(); }
  if ((e.key === " " || e.key === "Enter") && (state === "start" || state === "over") && stateT > .6) { ac(); reset(); }
  if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", e => { delete keys[e.key]; });
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
["touchstart", "touchmove"].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
["gesturestart", "gesturechange", "dblclick", "contextmenu"].forEach(n => document.addEventListener(n, e => e.preventDefault()));

// ================= UPDATE =================
function update(dt) {
  playT += dt;
  if (playT >= nextSwitch) {
    nextSwitch += NIGHT_EVERY; nightTarget = 1 - nightTarget;
    if (nightTarget) { pop(W / 2, H * .3, "🌙 Night falls", "#5b2a9e"); SFX.night(); }
    else { pop(W / 2, H * .3, "☀️ Good morning", "#ff1a6e"); SFX.day(); }
  }
  night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt / 7); // ~7s smooth blend

  const nl = 1 + Math.floor(score / 100), k = slow > 0 ? .45 : 1;
  if (nl > lvl) { lvl = nl; pop(W / 2, H * .42, "Level " + lvl + "!", "#ff1a6e"); SFX.level(); }
  slow = Math.max(0, slow - dt); shield = Math.max(0, shield - dt); missT = Math.max(0, missT - dt);
  meT -= dt; starT -= dt;
  spawnT -= dt;
  if (spawnT <= 0) spawnT = spawn() ? Math.max(.3, .8 - lvl * .05) : .08;

  for (const it of items) {
    if (it.dead) continue;
    it.y += it.vy * k * dt;
    const vxn = it.zig ? Math.cos(t * 2.4 + it.ph) * it.zig : (it.vx || 0);
    it.x += vxn * k * dt;
    if (it.x < it.r) { it.x = it.r; if (it.vx) it.vx = Math.abs(it.vx); }
    else if (it.x > W - it.r) { it.x = W - it.r; if (it.vx) it.vx = -Math.abs(it.vx); }
    if (Math.abs(it.x - P.x) < P.w / 2 + 6 && Math.abs(it.y - P.y) < 34 && it.y < P.y + 22) { it.dead = true; P.sq = 1; collect(it); }
    else if (it.y > H - 40) {
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
  ne = night * night * (3 - 2 * night);
  if (state === "play") {
    const dir = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    if (dir) P.tx = cl(P.tx + dir * 520 * dt);
  }
  const nx = P.x + (P.tx - P.x) * Math.min(1, dt * 18);
  P.vx = (nx - P.x) / Math.max(dt, .001); P.x = nx; P.sq = Math.max(0, P.sq - dt * 4);
  shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); kflash = Math.max(0, kflash - dt);
  for (const h of bgH) { h.y -= h.v * dt; if (h.y < -40) { h.y = H + 40; h.x = Math.random() * W; } }
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.l -= dt / p.d; }
  parts = parts.filter(p => p.l > 0);
  for (const q of pops) { q.y -= 50 * dt; q.l -= dt * 1.1; }
  pops = pops.filter(q => q.l > 0);
  for (const r of rings) { r.r += 150 * dt; r.l -= dt * 3; }
  rings = rings.filter(r => r.l > 0);
  for (const s of stamps) s.l -= dt * .5;
  stamps = stamps.filter(s => s.l > 0);
  if (ne > .5 && Math.random() < dt / 5) shoots.push({ x: W * .2 + Math.random() * W * .8, y: Math.random() * H * .3, l: 1 });
  for (const s of shoots) { s.x -= 300 * dt; s.y += 160 * dt; s.l -= dt * 1.4; }
  shoots = shoots.filter(s => s.l > 0);
  if (state === "count") {
    cd -= dt; const n = Math.ceil(cd);
    if (n !== lastCd) { lastCd = n; if (n > 0) SFX.cd(n); }
    if (cd <= 0) { state = "play"; stateT = 0; SFX.cd(0); if (AC) mNext = AC.currentTime + .1; }
  }
  if (state === "over" && Math.random() < .6)
    parts.push({ x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 40, vy: 70 + Math.random() * 80, l: 1, d: 3, e: KISSES[Math.floor(Math.random() * KISSES.length)], s: 18 + Math.random() * 18 });
}

// ================= DRAW =================
function emoji(e, x, y, s) { ctx.font = s + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }
function text(s, x, y, size, color, align = "left", w = "bold") { ctx.font = w + " " + size + "px sans-serif"; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillStyle = color; ctx.fillText(s, x, y); }
function wrap(s, x, y, maxW, lh, color, size = 17) {
  ctx.font = size + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = color; let line = "";
  for (const w of s.split(" ")) { const tt = line + w + " "; if (ctx.measureText(tt).width > maxW && line) { ctx.fillText(line, x, y); line = w + " "; y += lh; } else line = tt; }
  ctx.fillText(line, x, y);
}
const easeBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const DAY = [[255, 217, 234], [255, 166, 204], [255, 127, 181]], NIT = [[24, 14, 62], [78, 34, 118], [150, 55, 135]];
const mix = (a, b, k, al) => (al === undefined ? "rgb(" : "rgba(") + (a[0] + (b[0] - a[0]) * k | 0) + "," + (a[1] + (b[1] - a[1]) * k | 0) + "," + (a[2] + (b[2] - a[2]) * k | 0) + (al === undefined ? ")" : "," + al + ")");

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(DAY[0], NIT[0], ne)); g.addColorStop(.55, mix(DAY[1], NIT[1], ne)); g.addColorStop(1, mix(DAY[2], NIT[2], ne));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (ne > .02) { // twinkling stars
    ctx.fillStyle = "#fff";
    for (const s of bgS) { ctx.globalAlpha = ne * (.35 + .65 * Math.abs(Math.sin(t * 1.4 + s.ph))); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  const gx = W / 2 + Math.sin(t * .5) * 90, r = ctx.createRadialGradient(gx, H * .3, 10, gx, H * .3, 320);
  r.addColorStop(0, "rgba(255,255,255," + (.6 - .45 * ne) + ")"); r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  // sun sets, moon rises
  if (ne < .98) { ctx.globalAlpha = 1 - ne; emoji("☀️", W - 56, 150 + ne * 190, 54); }
  if (ne > .02) {
    const my = 150 + (1 - ne) * 190, mg = ctx.createRadialGradient(W - 56, my, 10, W - 56, my, 80);
    mg.addColorStop(0, "rgba(255,240,200," + .4 * ne + ")"); mg.addColorStop(1, "rgba(255,240,200,0)");
    ctx.globalAlpha = 1; ctx.fillStyle = mg; ctx.fillRect(W - 140, my - 90, 170, 180);
    ctx.globalAlpha = ne; emoji("🌙", W - 56, my, 54);
  }
  ctx.globalAlpha = 1;
  for (const s of shoots) { // shooting stars
    ctx.strokeStyle = "rgba(255,255,255," + s.l + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 40, s.y - 21); ctx.stroke();
  }
  ctx.globalAlpha = .28 - .14 * ne; ctx.fillStyle = "#fff";
  for (const h of bgH) { ctx.font = h.s + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("♥", h.x + Math.sin(t + h.ph) * 14, h.y); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = mix([255, 92, 154], [110, 36, 120], ne, .55 + .15 * ne); ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H - 34 + Math.sin(x * .03 + t * 2) * 5);
  ctx.lineTo(W, H); ctx.fill();
  if (slow > 0) { ctx.fillStyle = "rgba(190,225,255,.22)"; ctx.fillRect(0, 0, W, H); }
}

function drawBubble(it) {
  const R = it.r, tn = TINT[it.kind] || TINT.good;
  ctx.save();
  ctx.translate(it.x + (it.menu ? 0 : Math.sin(t * 2 + it.ph) * 3), it.y);
  const wb = Math.sin(t * 5 + it.ph) * .04; ctx.scale(1 + wb, 1 - wb);
  if (ne > .02) { // night glow
    const hg = ctx.createRadialGradient(0, 0, R * .6, 0, 0, R * 1.9);
    hg.addColorStop(0, "rgba(" + tn + "," + .4 * ne + ")"); hg.addColorStop(1, "rgba(" + tn + ",0)");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, 6.3); ctx.fill();
  }
  const g = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
  g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.6, "rgba(" + tn + ",.22)"); g.addColorStop(1, "rgba(" + tn + ",.6)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(120,220,255,.55)"; ctx.beginPath(); ctx.arc(0, 0, R - 4, .15 * Math.PI, .65 * Math.PI); ctx.stroke();
  ctx.strokeStyle = "rgba(255,160,230,.55)"; ctx.beginPath(); ctx.arc(0, 0, R - 4, 1.15 * Math.PI, 1.65 * Math.PI); ctx.stroke();
  if (it.kind === "bad") {
    ctx.strokeStyle = "rgba(120,0,50," + (.35 + Math.sin(t * 8) * .15 + .2 * ne) + ")"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R + 3, 0, 6.3); ctx.stroke();
  } else if (it.kind === "me" || it.kind === "star") {
    ctx.strokeStyle = "rgba(255,200,60," + (.6 + Math.sin(t * 7) * .3) + ")"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R + 3 + Math.sin(t * 7) * 1.5, 0, 6.3); ctx.stroke();
  }
  ctx.save(); ctx.rotate(Math.sin(t * 3 + it.ph) * .15);
  if (it.kind === "face" || it.kind === "me") {
    const rr = R * .72, im = it.img;
    if (im && im.ok) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.3); ctx.clip(); ctx.drawImage(im, -rr, -rr, rr * 2, rr * 2); ctx.restore(); }
    else icon(it.e, 0, 1, R * 1.1);
    ctx.strokeStyle = it.kind === "me" ? "#ffb300" : "#ff2d78"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rr + 1, 0, 6.3); ctx.stroke();
  } else icon(it.e, 0, 1, R * 1.05);
  ctx.restore();
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
  icon("🧺", 0, 0, 60);
  ctx.restore();
}

function drawParts() {
  for (const s of stamps) { // lipstick kisses left on screen
    ctx.save(); ctx.globalAlpha = Math.min(1, s.l) * .8; ctx.translate(s.x, s.y); ctx.rotate(s.rot); emoji("💋", 0, 0, s.s); ctx.restore();
  }
  for (const r of rings) {
    ctx.globalAlpha = Math.max(0, r.l); ctx.strokeStyle = r.c; ctx.lineWidth = 1 + 3 * r.l;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.3); ctx.stroke();
  }
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c;
    if (p.e) emoji(p.e, p.x, p.y, p.s);
    else { ctx.font = p.s + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.h ? "♥" : "✦", p.x, p.y); }
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
  text("Lv " + lvl, 204, 35, 16, ne > .5 ? "#fff" : "#a0114f", "center");
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.roundRect(W - 112, 10, 102, 36, 18); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const beat = 1 + (i < lives ? Math.max(0, Math.sin(t * 6)) * .15 : 0);
    ctx.save(); ctx.translate(W - 90 + i * 30, 29); ctx.scale(beat, beat);
    ctx.globalAlpha = i < lives ? 1 : .25; emoji("❤️", 0, 0, 22); ctx.restore();
  }
  ctx.globalAlpha = 1;
  const pw = W - 20, pr = (score % 100) / 100; // progress to next level
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.roundRect(10, 54, pw, 10, 5); ctx.fill();
  if (pr > 0) { const g = ctx.createLinearGradient(10, 0, 10 + pw, 0); g.addColorStop(0, "#ff7ab0"); g.addColorStop(1, "#ff1a6e"); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(10, 54, Math.max(10, pw * pr), 10, 5); ctx.fill(); }
  const m = 1 + Math.floor(combo / 5), tc = ne > .5 ? "#ffd1e8" : "#a0114f";
  text("Combo x" + m, 12, 86, 14, tc);
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.roundRect(92, 76, 80, 8, 4); ctx.fill();
  ctx.fillStyle = "#ff2d78"; ctx.beginPath(); ctx.roundRect(92, 76, Math.max(8, 16 * (combo % 5)), 8, 4); ctx.fill();
  text("⚡ x" + speedMul().toFixed(1), 204, 86, 14, tc, "center");
  if (slow > 0) text("🧋 " + slow.toFixed(1) + "s", W - 12, 86, 14, ne > .5 ? "#e6c8ff" : "#6b3a8a", "right");
  if (shield > 0) text("🛡️ " + shield.toFixed(1) + "s", W - 12, 106, 14, ne > .5 ? "#a8e6ff" : "#1f7fa8", "right");
  if (state === "play") { // pause button
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(68, 118, 17, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#c2185b"; ctx.beginPath(); ctx.roundRect(61, 110, 5, 16, 2); ctx.roundRect(70, 110, 5, 16, 2); ctx.fill();
  }
}
function muteBtn() {
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(28, 118, 17, 0, 6.3); ctx.fill();
  emoji(muted ? "🔇" : "🔊", 28, 119, 18);
}

// ---- cards / menus ----
function cardBegin(ch, drop) {
  ctx.fillStyle = "rgba(60,10,50," + .5 * Math.min(1, stateT * 3) + ")"; ctx.fillRect(0, 0, W, H);
  CF = Math.min(1, (H - 24) / ch);
  const e = Math.min(1, stateT * 3), sc = .6 + .4 * easeBack(e);
  ctx.save(); ctx.translate(W / 2, H / 2 + (drop ? (1 - e) * -90 * CF : 0)); ctx.scale(sc * CF, sc * CF); ctx.globalAlpha = e;
  ctx.fillStyle = "#fff0f6"; ctx.strokeStyle = "#ff5c9a"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-165, -ch / 2, 330, ch, 30); ctx.fill(); ctx.stroke();
}
function cardEnd() { ctx.restore(); ctx.globalAlpha = 1; }
function button(label, lx, ly, w, h, act, primary = true) {
  btns.push({ x: W / 2 + (lx - w / 2) * CF, y: H / 2 + (ly - h / 2) * CF, w: w * CF, h: h * CF, act });
  const bs = primary ? 1 + Math.sin(t * 5) * .05 : 1;
  ctx.save(); ctx.translate(lx, ly); ctx.scale(bs, bs);
  ctx.fillStyle = primary ? "#ff3d87" : "#ffd1e8"; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  text(label, 0, primary ? 7 : 6, primary ? 19 : 15, primary ? "#fff" : "#a0114f", "center"); ctx.restore();
}
function xBadge(x, y, R) {
  ctx.fillStyle = "#e0143c"; ctx.beginPath(); ctx.arc(x + R * .72, y - R * .72, 8, 0, 6.3); ctx.fill();
  text("✕", x + R * .72, y - R * .72 + 4, 11, "#fff", "center");
}
function iconRow(list, y, R, bad) {
  const xs = [-112, -37, 37, 112];
  list.forEach((o, i) => {
    drawBubble({ x: xs[i], y, r: R, kind: o.kind, e: o.e, img: o.img, ph: i * 1.7, menu: true });
    if (bad) xBadge(xs[i], y, R);
    text(o.lab, xs[i], y + R + 15, 11, bad ? "#c0123f" : "#8a1e55", "center");
  });
}

function startCard() {
  cardBegin(500);
  text("Catch & Dodge 💕", 0, -205, 28, "#e0105f", "center");
  text("CATCH THESE ✓", 0, -172, 13, "#1f9d55", "center");
  iconRow([{ kind: "face", e: "😊", img: faceImgs[0], lab: "+12" }, { kind: "good", e: "🍩", lab: "+5" }, { kind: "good", e: "💖", lab: "+8" }, { kind: "good", e: "🍓", lab: "+6" }], -138, 21);
  text("DON'T CATCH THESE ✖  (-1 ❤️)", 0, -76, 13, "#c0123f", "center");
  iconRow(BAD.map(e => ({ kind: "bad", e, lab: LABEL[e] })), -42, 21, true);
  text("POWER-UPS", 0, 22, 13, "#7a3fc0", "center");
  iconRow([{ kind: "boba", e: "🧋", lab: "Slow-mo" }, { kind: "shield", e: "🛡️", lab: "Shield" }, { kind: "star", e: "⭐", lab: "Pop bad" }, { kind: "me", e: ME_EMOJI, img: meImg, lab: "Kiss +❤️" }], 56, 21);
  wrap("Drag to move the basket. The higher your score, the faster it gets. No limit!", 0, 122, 290, 17, "#8a1e55", 13);
  button("Tap to play", 0, 190, 200, 50, reset);
  text("Best: " + best, 0, 236, 15, "#a0114f", "center");
  cardEnd();
}
function overCard() {
  cardBegin(500, true);
  const b = 1 + Math.sin(t * 4) * .04;
  ctx.save(); ctx.translate(0, -190); ctx.scale(b, b); text(OVER_TITLE, 0, 0, 28, "#e0105f", "center"); ctx.restore();
  wrap(OVER_TEXT, 0, -158, 280, 18, "#8a1e55", 14);
  text("SCORE", 0, -120, 13, "#a0114f", "center");
  text(String(Math.round(score * Math.min(1, stateT / 1.1))), 0, -72, 48, "#e0105f", "center");
  text(newBest ? "🏆 NEW BEST!" : "Best: " + best, 0, -40, 16, newBest ? "#d98a00" : "#a0114f", "center");
  text("Level " + lvl + "  ·  " + caught + " caught", 0, -16, 14, "#8a1e55", "center");
  text("REMEMBER: DON'T CATCH ✖", 0, 28, 13, "#c0123f", "center");
  iconRow(BAD.map(e => ({ kind: "bad", e, lab: LABEL[e] })), 64, 21, true);
  wrap("They cost a ❤️. Catch 😎 for a kiss and a free heart!", 0, 122, 290, 17, "#8a1e55", 13);
  button("Try again", 0, 187, 200, 48, reset);
  button("Menu", 0, 229, 110, 34, toMenu, false);
  cardEnd();
}
function pauseCard() {
  cardBegin(330);
  text("Paused ⏸", 0, -105, 30, "#e0105f", "center");
  text("Take your time 💕", 0, -72, 16, "#8a1e55", "center");
  text("Score " + score + "  ·  Lv " + lvl, 0, -45, 14, "#a0114f", "center");
  button("Resume", 0, 0, 200, 50, resume);
  button("Restart", 0, 62, 200, 44, reset, false);
  button("Menu", 0, 118, 200, 40, toMenu, false);
  cardEnd();
}
function countdown() {
  ctx.fillStyle = "rgba(60,10,50,.3)"; ctx.fillRect(0, 0, W, H);
  const n = Math.max(1, Math.ceil(cd)), fr = Math.min(1, Math.max(0, n - cd));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.5 - .5 * fr, 1.5 - .5 * fr); ctx.globalAlpha = 1 - .35 * fr;
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 78, 0, 6.3); ctx.stroke();
  text(String(n), 3, 42, 112, "rgba(255,61,135,.9)", "center"); text(String(n), 0, 38, 112, "#fff", "center");
  ctx.restore(); ctx.globalAlpha = 1;
  text("Get ready 💕", W / 2, H / 2 - 110, 22, "#fff", "center");
}

function draw() {
  ctx.setTransform(SX, 0, 0, SY, 0, 0);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake * 30, (Math.random() - .5) * shake * 30);
  bg(); drawItems(); drawPlayer(); drawParts();
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = "rgba(255,30,100," + flash * .6 + ")"; ctx.fillRect(0, 0, W, H); }
  if (kflash > 0) { ctx.fillStyle = "rgba(255,170,215," + kflash * .6 + ")"; ctx.fillRect(0, 0, W, H); }
  btns = [];
  if (state !== "start") hud();
  muteBtn();
  if (state === "start") startCard();
  else if (state === "over") overCard();
  else if (state === "pause") pauseCard();
  else if (state === "count") countdown();
}

let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, .05); last = ts;
  tick(dt); if (state === "play") update(dt);
  draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
