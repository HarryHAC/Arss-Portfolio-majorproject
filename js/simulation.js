/* =====================================================================
   SIMULATION STATE + DASHBOARD
   ===================================================================== */
const state = {
  mode: "normal",
  breathRate: 14,
  tidal: 500,
  inspT: 1.2,
  expT: 2.4,
  blower: 55,
  o2flow: 30,
  pressure: 3.5,
  recycle: 60,
  ambTemp: 22,
  humidity: 45,
  o2avail: 80,
  activity: 1,
  running: true,
};
const defaults = { ...state };
let flowSpeed = 1;

function applyMode(m) {
  state.mode = m;
  const P = {
    normal: {
      breathRate: 14,
      blower: 55,
      o2flow: 30,
      pressure: 3.5,
      recycle: 60,
      o2avail: 80,
      activity: 1,
    },
    demand: {
      breathRate: 26,
      blower: 80,
      o2flow: 45,
      pressure: 4.2,
      recycle: 55,
      o2avail: 70,
      activity: 3,
    },
    lowo2: {
      breathRate: 18,
      blower: 65,
      o2flow: 70,
      pressure: 3.6,
      recycle: 60,
      o2avail: 35,
      activity: 2,
    },
    highco2: {
      breathRate: 16,
      blower: 70,
      o2flow: 35,
      pressure: 3.4,
      recycle: 30,
      o2avail: 75,
      activity: 2,
    },
    blockage: {
      breathRate: 16,
      blower: 90,
      o2flow: 35,
      pressure: 1.6,
      recycle: 60,
      o2avail: 70,
      activity: 2,
    },
    sensorfail: {
      breathRate: 14,
      blower: 55,
      o2flow: 30,
      pressure: 3.5,
      recycle: 60,
      o2avail: 60,
      activity: 1,
    },
    failsafe: {
      breathRate: 14,
      blower: 75,
      o2flow: 20,
      pressure: 3.0,
      recycle: 10,
      o2avail: 60,
      activity: 1,
    },
  }[m];
  Object.assign(state, P);
  syncSliders();
  markMode();
}
function markMode() {
  document
    .querySelectorAll("#twinModes .mbtn")
    .forEach((b) => b.classList.toggle("active", b.dataset.m === state.mode));
}

// modes buttons
MODES.forEach((m) => {
  const b = el("button", "mbtn", m.label);
  b.dataset.m = m.id;
  b.onclick = () => applyMode(m.id);
  $("#twinModes").appendChild(b);
});

// sliders
const SLIDERS = [
  ["Breathing rate", "breathRate", 8, 30, 1, "bpm"],
  ["Tidal volume", "tidal", 300, 800, 10, "mL"],
  ["Inspiratory time", "inspT", 0.5, 2, 0.1, "s"],
  ["Expiratory time", "expT", 1, 4, 0.1, "s"],
  ["Blower speed", "blower", 0, 100, 1, "%"],
  ["O₂ flow", "o2flow", 0, 100, 1, "%"],
  ["Positive pressure", "pressure", 0, 6, 0.1, "cmH₂O"],
  ["Recycle ratio", "recycle", 0, 100, 1, "%"],
  ["Ambient temp", "ambTemp", -20, 45, 1, "°C"],
  ["Humidity", "humidity", 0, 100, 1, "%RH"],
  ["O₂ availability", "o2avail", 10, 100, 1, "%"],
];
SLIDERS.forEach(([lab, key, min, max, step, u]) => {
  const row = el("div", "sld");
  row.innerHTML = `<label>${lab}</label><span class="out" id="out-${key}"></span><input type="range" min="${min}" max="${max}" step="${step}" id="s-${key}">`;
  $("#sliders").appendChild(row);
  const inp = $("#s-" + key, row);
  inp.value = state[key];
  inp.oninput = () => {
    state[key] = parseFloat(inp.value);
    $("#out-" + key).textContent = fmt(state[key]) + " " + u;
  };
  inp.dataset.u = u;
});
function syncSliders() {
  SLIDERS.forEach(([, key, , , , u]) => {
    const inp = $("#s-" + key);
    if (inp) {
      inp.value = state[key];
      $("#out-" + key).textContent = fmt(state[key]) + " " + u;
    }
  });
}
function fmt(n) {
  return (Math.round(n * 10) / 10).toString();
}
syncSliders();
$("#runBtn").textContent = "Pause";
$("#runBtn").onclick = () => {
  state.running = !state.running;
  $("#runBtn").textContent = state.running ? "Pause" : "Run";
};
$("#resetBtn").onclick = () => {
  Object.assign(state, defaults);
  syncSliders();
  applyMode("normal");
};

// dashboard gauges
const DASH = [
  ["o2", "O₂ Concentration", "%", "ring"],
  ["co2", "CO₂", "ppm", "wave"],
  ["press", "Air Pressure", "cmH₂O", "wave"],
  ["flow", "Air Flow", "L/min", "wave"],
  ["temp", "Temperature", "°C", "val"],
  ["hum", "Humidity", "%RH", "val"],
  ["cyl", "Cylinder", "bar", "val"],
  ["blow", "Blower", "%", "val"],
  ["valve", "O₂ Valve", "%", "val"],
  ["status", "System", "", "val"],
];
const gaugeEls = {};
DASH.forEach(([id, label, u, kind]) => {
  const g = el(
    "div",
    "gauge" +
      (kind === "ring" ? " ring" : "") +
      (kind === "wave" ? " wide" : ""),
  );
  if (kind === "ring") {
    g.innerHTML = `<canvas id="cv-${id}"></canvas><div><div class="lab-t">${label}</div><div class="big" id="v-${id}">—</div><div class="u">${u}</div></div>`;
  } else if (kind === "wave") {
    g.innerHTML = `<div style="display:flex;justify-content:space-between"><div class="lab-t">${label}</div><div class="big" id="v-${id}" style="font-size:1.2rem">—</div></div><canvas id="cv-${id}"></canvas><div class="u">${u}</div>`;
  } else {
    g.innerHTML = `<div class="lab-t">${label}</div><div class="big" id="v-${id}">—</div><div class="u">${u}</div>`;
  }
  $("#dash").appendChild(g);
  gaugeEls[id] = g;
});

// waveform buffers
const wave = { co2: [], press: [], flow: [] };
function computeReadings() {
  const s = state;
  let o2 = 21 + s.o2flow * 0.28 - (100 - s.o2avail) * 0.06;
  o2 = clamp(o2, 14, 60);
  let co2 = 400 + (100 - s.recycle) * 6 + (s.breathRate - 14) * 40;
  if (s.mode === "highco2") co2 += 2200;
  co2 = clamp(co2, 350, 6000);
  let press = s.pressure + (s.mode === "blockage" ? -1.4 : 0);
  press = clamp(press, 0, 6.5);
  let flow = s.blower * 0.34 + s.breathRate * 0.2;
  if (s.mode === "blockage") flow *= 0.4;
  flow = clamp(flow, 0, 50);
  let cyl = clamp(200 - s.o2flow * 0.4 - ((Date.now() / 1e6) % 1) * 0, 5, 200);
  let valve = clamp(s.o2flow, 0, 100);
  let blow = clamp(s.blower, 0, 100);
  const temp = s.ambTemp + 8 + s.activity * 1.5;
  const hum = clamp(s.humidity + (100 - s.recycle) * 0.1, 0, 100);
  // faults
  let faults = [];
  if (co2 > 3000) faults.push({ t: "HIGH CO₂", crit: false });
  if (o2 < 18) faults.push({ t: "LOW O₂", crit: false });
  if (press > 5.2) faults.push({ t: "HIGH PRESSURE", crit: false });
  if (press < 2 && s.mode !== "failsafe")
    faults.push({ t: "LOW PRESSURE", crit: false });
  if (s.mode === "sensorfail") faults.push({ t: "SENSOR FAILURE", crit: true });
  if (s.mode === "blockage") faults.push({ t: "FILTER BLOCKAGE", crit: false });
  if (s.mode === "failsafe") faults.push({ t: "FAIL-SAFE ACTIVE", crit: true });
  return { o2, co2, press, flow, cyl, valve, blow, temp, hum, faults };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* draw ring gauge */
function drawRing(id, val, max, color) {
  const cv = $("#cv-" + id);
  if (!cv) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = 88;
  cv.width = size * dpr;
  cv.height = size * dpr;
  const x = cv.getContext("2d");
  x.scale(dpr, dpr);
  x.clearRect(0, 0, size, size);
  const cx = size / 2,
    cy = size / 2,
    r = 36;
  x.lineWidth = 8;
  x.strokeStyle = "rgba(255,255,255,.08)";
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.stroke();
  const p = clamp(val / max, 0, 1);
  x.strokeStyle = color;
  x.lineCap = "round";
  x.beginPath();
  x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  x.stroke();
  x.fillStyle = color;
  x.font = '600 15px "JetBrains Mono"';
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(Math.round(val) + "%", cx, cy);
}
/* draw waveform */
function drawWave(id, buf, color, scaleMax) {
  const cv = $("#cv-" + id);
  if (!cv) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 260,
    h = 52;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const x = cv.getContext("2d");
  x.scale(dpr, dpr);
  x.clearRect(0, 0, w, h);
  // grid
  x.strokeStyle = "rgba(255,255,255,.05)";
  x.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 26) {
    x.beginPath();
    x.moveTo(gx, 0);
    x.lineTo(gx, h);
    x.stroke();
  }
  x.beginPath();
  const n = buf.length;
  for (let i = 0; i < n; i++) {
    const px = (i / (60 - 1)) * w;
    const py = h - clamp(buf[i] / scaleMax, 0, 1) * (h - 6) - 3;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.strokeStyle = color;
  x.lineWidth = 2;
  x.shadowColor = color;
  x.shadowBlur = 6;
  x.stroke();
  x.shadowBlur = 0;
  // fill
  x.lineTo(((n - 1) / (60 - 1)) * w, h);
  x.lineTo(0, h);
  x.closePath();
  const grd = x.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, color + "44");
  grd.addColorStop(1, "transparent");
  x.fillStyle = grd;
  x.fill();
}

/* decision engine */
const DEC_RULES = [
  {
    cond: (r) => r.co2 > 3000,
    k: "CO₂ HIGH",
    t: "Increase fresh airflow · reduce recycle ratio",
    crit: false,
  },
  {
    cond: (r) => r.o2 < 18,
    k: "O₂ LOW",
    t: "Open O₂ valve · increase supplementation",
    crit: false,
  },
  {
    cond: (r) => r.press > 5.2,
    k: "PRESSURE HIGH",
    t: "Reduce blower speed",
    crit: false,
  },
  {
    cond: (r) => r.press < 2,
    k: "PRESSURE LOW",
    t: "Increase blower speed",
    crit: false,
  },
  {
    cond: (r) => r.faults.some((f) => f.t === "SENSOR FAILURE"),
    k: "SENSOR FAULT",
    t: "Activate fail-safe · safe defaults",
    crit: true,
  },
  {
    cond: (r) => r.faults.some((f) => f.crit),
    k: "UNSAFE CONDITION",
    t: "Alarm ON · ensure user safety",
    crit: true,
  },
  {
    cond: (r) => true,
    k: "NOMINAL",
    t: "Hold targets · continuous monitoring",
    crit: false,
  },
];
(function () {
  DEC_RULES.forEach((d, i) => {
    $("#decFlow").appendChild(
      el(
        "div",
        "dec-step" + (d.crit ? " crit" : ""),
        `<span class="k">${d.k}</span><div style="color:var(--ink);font-size:.86rem;margin-top:.2rem">${d.t}</div>`,
      ),
    );
  });
})();

/* neuro canvas */
(function () {
  const cv = $("#neuroCanvas");
  const x = cv.getContext("2d");
  let nodes = [];
  function init() {
    const w = cv.clientWidth,
      h = cv.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * dpr;
    cv.height = h * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = [];
    for (let i = 0; i < 22; i++)
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
  }
  window.addEventListener("resize", init);
  setTimeout(init, 60);
  window._neuro = () => {
    const w = cv.clientWidth,
      h = cv.clientHeight;
    if (!w) return;
    x.clearRect(0, 0, w, h);
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 90) {
          x.strokeStyle = "rgba(200,135,58," + (1 - d / 90) * 0.22 + ")";
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(a.x, a.y);
          x.lineTo(b.x, b.y);
          x.stroke();
        }
      }
    nodes.forEach((n) => {
      x.fillStyle = "rgba(200,135,58,.7)";
      x.beginPath();
      x.arc(n.x, n.y, 2, 0, Math.PI * 2);
      x.fill();
    });
    // core
    x.fillStyle = "rgba(158,143,207,.85)";
    x.beginPath();
    x.arc(w / 2, h / 2, 7 + Math.sin(Date.now() / 400) * 2, 0, Math.PI * 2);
    x.fill();
  };
})();

/* main loop */
let tick = 0;
function loop() {
  const r = computeReadings();
  flowSpeed = 0.4 + state.blower / 120 + state.breathRate / 60;
  if (state.mode === "blockage") flowSpeed *= 0.5;
  if (!state.running) flowSpeed = 0;
  if (tick % 3 === 0) {
    // gauges
    setTxt("v-o2", Math.round(r.o2));
    drawRing("o2", r.o2, 60, r.o2 < 18 ? "#FF3B30" : "#00E5FF");
    setTxt("v-co2", Math.round(r.co2));
    setTxt("v-press", fmt(r.press));
    setTxt("v-flow", fmt(r.flow));
    setTxt("v-temp", fmt(r.temp));
    setTxt("v-hum", Math.round(r.hum));
    setTxt("v-cyl", Math.round(r.cyl));
    setTxt("v-blow", Math.round(r.blow));
    setTxt("v-valve", Math.round(r.valve));
    const worst = r.faults.find((f) => f.crit)
      ? "CRITICAL"
      : r.faults.length
        ? "CAUTION"
        : "NOMINAL";
    setTxt("v-status", worst);
    // waves
    push(wave.co2, r.co2);
    push(
      wave.press,
      r.press + Math.sin(tick / 6) * 0.4 * (state.running ? 1 : 0),
    );
    push(wave.flow, r.flow + Math.sin(tick / 4) * 2 * (state.running ? 1 : 0));
    drawWave("co2", wave.co2, "#FF9D00", 6000);
    drawWave("press", wave.press, "#00E5FF", 6.5);
    drawWave("flow", wave.flow, "#1E90FF", 50);
    // status bar
    const sb = $("#statusBar");
    const crit = r.faults.some((f) => f.crit);
    const warn = r.faults.length > 0;
    sb.className = "statusbar " + (crit ? "crit" : warn ? "warn" : "ok");
    $("#statusText").textContent = crit
      ? "CRITICAL — FAIL-SAFE"
      : warn
        ? "CAUTION"
        : "SYSTEM NOMINAL";
    $("#statusSub").textContent = r.faults.length
      ? r.faults.map((f) => f.t).join(" · ")
      : "closed-loop stable";
    $("#statusText").previousElementSibling.style.color = crit
      ? "var(--red)"
      : warn
        ? "var(--orange)"
        : "var(--green)";
    // twin hud
    $("#twinHud").innerHTML =
      `MODE <b>${(MODES.find((m) => m.id === state.mode) || {}).label}</b><br>FLOW <b>${fmt(r.flow)} L/min</b> · O₂ <b>${Math.round(r.o2)}%</b><br>PRESS <b>${fmt(r.press)} cmH₂O</b>`;
    // decision engine
    let chosen = DEC_RULES.findIndex((d) => d.cond(r));
    document
      .querySelectorAll(".dec-step")
      .forEach((s, i) =>
        s.classList.toggle("on", i === chosen),
      );
  }
  if (window._neuro) window._neuro();
  tick++;
  requestAnimationFrame(loop);
}
function setTxt(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}
function push(a, v) {
  a.push(v);
  if (a.length > 60) a.shift();
}
for (let i = 0; i < 60; i++) {
  push(wave.co2, 450);
  push(wave.press, 3.5);
  push(wave.flow, 20);
}
requestAnimationFrame(loop);
