/* =====================================================================
   RENDER
   ===================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const el = (t, c, h) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  if (h != null) e.innerHTML = h;
  return e;
};

/* --- icon set (clean inline SVG, no glyph fonts) --- */
const IC = {
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V6M8 10l4-4 4 4M5 19h14"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" stroke="var(--green)"><path d="M20 6 9 17l-5-5"/></svg>',
  cross:
    '<svg viewBox="0 0 24 24" stroke="var(--red)"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  dot: '<svg viewBox="0 0 24 24" stroke="var(--cyan)"><path d="M5 12h14"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v14H3zM3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 112.5 6 2.49 2.49 0 014.98 3.5zM3 8.5h4V21H3zM9 8.5h3.8v1.7h.05a4.17 4.17 0 013.75-2c4 0 4.75 2.64 4.75 6.07V21H21.3v-5.5c0-1.31 0-3-1.83-3s-2.11 1.42-2.11 2.9V21H13.5z"/></svg>',
  lab: '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.6"><path d="M9 3h6M10 3v6l-5 9a1.5 1.5 0 001.3 2.3h11.4A1.5 1.5 0 0015 18l-5-9V3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z"/></svg>',
};
/* --- local persistence + upload helpers --- */
const LS = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
};
function pickFile(accept, cb) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = accept;
  inp.style.display = "none";
  document.body.appendChild(inp);
  inp.onchange = () => {
    if (inp.files && inp.files[0]) cb(inp.files[0]);
    setTimeout(() => inp.remove(), 0);
  };
  inp.click();
}
function downscaleImage(file, max, cb) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    let w = img.width,
      h = img.height;
    const s = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * s);
    h = Math.round(h * s);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cb(c.toDataURL("image/jpeg", 0.82));
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
function slotHTML(key, initials, label) {
  return (
    '<div class="pslot" data-key="' +
    key +
    '"><img class="ps-img" alt=""><div class="ps-ph"><b>' +
    initials +
    "</b><span>" +
    label +
    '</span></div><button class="ps-up" type="button" aria-label="Upload photo">' +
    IC.up +
    "</button></div>"
  );
}

// nav
NAV.forEach(([t, h]) => {
  $("#navlinks").appendChild(el("a", null, t)).href = h;
  const d = el("a", null, t);
  d.href = h;
  d.onclick = closeDrawer;
  $("#drawer").appendChild(d);
});
function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#scrim").classList.remove("open");
}
$("#burger").onclick = () => {
  $("#drawer").classList.add("open");
  $("#scrim").classList.add("open");
};
$("#scrim").onclick = closeDrawer;

// hero HUD
[
  ["SYSTEM STATUS", "ACTIVE", "var(--green)"],
  ["O₂ LEVEL", "NORMAL", "var(--cyan)"],
  ["PRESSURE", "STABLE", "var(--oxy)"],
  ["RECYCLE LOOP", "ACTIVE", "var(--green)"],
].forEach(([k, v, c]) => {
  const chip = el(
    "div",
    "chip",
    `<span style="color:var(--dim)">${k}</span><span style="display:flex;align-items:center;gap:.5rem"><span class="dotp" style="color:${c}"></span><b>${v}</b></span>`,
  );
  $("#heroHud").appendChild(chip);
});

// problem / solution
const liList = (arr, color) =>
  arr
    .map(
      (x) =>
        `<div class="bullet"><svg viewBox="0 0 24 24" stroke="${color}"><path d="M4 12h13M13 7l5 5-5 5"/></svg><span style="color:var(--ink);font-weight:300">${x}</span></div>`,
    )
    .join("");
$("#problemList").innerHTML = liList(PROBLEM, "var(--orange)");
$("#solutionList").innerHTML = liList(SOLUTION, "var(--green)");

// sensors
SENSORS.forEach((s) => {
  $("#sensorGrid").appendChild(
    el(
      "div",
      "sensor",
      `<div class="sic"><svg viewBox="0 0 24 24"><path d="${s.icon}"/></svg></div><h4>${s.n}</h4><div class="un">${s.u}</div><p>${s.p}</p>`,
    ),
  );
});

// ESP32 flow svg
(function () {
  const g = $("#espFlow");
  const chans = ["O₂", "CO₂", "P", "FLOW", "T", "RH", "CYL"];
  let svg = "";
  chans.forEach((c, i) => {
    const y = 15 + i * 18;
    svg += `<line x1="70" y1="${y}" x2="360" y2="75" stroke="var(--cyan)" stroke-width="1.2" stroke-dasharray="4 5" class="flow-dash" opacity=".6"/><text x="20" y="${y + 3}" font-family="var(--f-mono)" font-size="10" fill="var(--dim)">${c}</text>`;
  });
  svg += `<rect x="360" y="45" width="120" height="60" rx="10" fill="var(--panel-2)" stroke="var(--violet)" stroke-width="1.5"/><text x="420" y="70" text-anchor="middle" font-family="var(--f-disp)" font-size="14" fill="var(--violet)">ESP32</text><text x="420" y="88" text-anchor="middle" font-family="var(--f-mono)" font-size="8" fill="var(--dim)">DECIDE · LOG · SAFETY</text>`;
  [
    ["BLOWER PWM", "var(--cyan)", 35],
    ["O₂ VALVE", "var(--violet)", 75],
    ["ALARM", "var(--red)", 115],
  ].forEach(([t, col, y]) => {
    svg += `<line x1="480" y1="75" x2="720" y2="${y}" stroke="${col}" stroke-width="1.4" stroke-dasharray="4 5" class="flow-dash"/><rect x="720" y="${y - 13}" width="150" height="26" rx="7" fill="var(--panel-2)" stroke="${col}" stroke-width="1.2"/><text x="795" y="${y + 4}" text-anchor="middle" font-family="var(--f-mono)" font-size="9" fill="${col}">${t}</text>`;
  });
  g.innerHTML = svg;
})();

// components grid
COMPONENTS.forEach((c) => {
  const card = el(
    "div",
    "card",
    `<div class="ic"><svg viewBox="0 0 24 24"><path d="${c.icon}"/></svg></div><h3>${c.name}</h3><p>${c.fn}</p><div class="chips"><span class="chip2">IN: ${c.in}</span><span class="chip2">OUT: ${c.out}</span></div>`,
  );
  card.style.cursor = "pointer";
  card.onclick = () => openPanel(c);
  $("#compGrid").appendChild(card);
});

// measurements
const MEAS = [
  [
    "Airflow Parameters",
    [
      ["Flow rate", "≈ 30 L/min"],
      ["Blower pressure", "≈ 70 Pa"],
      ["Breathing flow", "simulation"],
    ],
    "concept",
  ],
  [
    "Pressure Parameters",
    [
      ["Positive-pressure support", "2–5 cmH₂O"],
      ["Circuit pressure", "simulation"],
      ["Cylinder pressure", "200 bar"],
    ],
    "concept",
  ],
  [
    "Gas Parameters",
    [
      ["O₂ concentration", "target band"],
      ["CO₂ concentration", "post-scrub"],
      ["Recycle efficiency", "future target"],
    ],
    "sim",
  ],
  [
    "Environmental",
    [
      ["Temperature", "simulation"],
      ["Humidity", "simulation"],
    ],
    "sim",
  ],
  [
    "Power Parameters",
    [
      ["Battery voltage", "editable"],
      ["Power consumption", "≈ 10.7 W"],
      ["Estimated runtime", "≈ 7–8 h"],
    ],
    "concept",
  ],
];
MEAS.forEach(([title, rows, tag]) => {
  const c = el("div", "card");
  c.innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem"><h3 style="font-size:1rem">${title}</h3><span class="tag ${tag}">${tag === "concept" ? "Concept" : "Simulation"}</span></div>` +
    rows
      .map(
        ([k, v]) =>
          `<div style="display:flex;justify-content:space-between;padding:.45rem 0;border-bottom:1px dashed var(--line);font-size:.88rem"><span style="color:var(--dim)">${k}</span><span class="mono" style="color:var(--ink)">${v}</span></div>`,
      )
      .join("");
  $("#measGrid").appendChild(c);
});

// timeline
// TIMELINE_STATUS: editable — 'done' | 'wip' | 'plan' per phase. Nothing completed yet.
const TIMELINE_STATUS = [
  "wip",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
  "plan",
];
TIMELINE.forEach(([ph, t, d], i) => {
  const s = TIMELINE_STATUS[i];
  const st =
    s === "done"
      ? '<span class="tag done">Completed</span>'
      : s === "wip"
        ? '<span class="tag wip">In Progress</span>'
        : '<span class="tag">Planned</span>';
  $("#timeline").appendChild(
    el(
      "div",
      "tl-card",
      `<div class="ph">PHASE ${ph}</div><h4>${t}</h4><p>${d}</p><div class="st">${st}</div>`,
    ),
  );
});

// reviews
REVIEWS.forEach((r) => {
  const cls = r.status === "done" ? "done" : r.status === "wip" ? "wip" : "";
  const tag =
    r.status === "done"
      ? '<span class="tag done">Completed</span>'
      : r.status === "wip"
        ? '<span class="tag wip">In Progress</span>'
        : '<span class="tag">Upcoming</span>';
  const node = el("div", "rev " + cls);
  node.innerHTML = `<div class="rev-head"><h3>${r.n}</h3>${tag}<span class="rev-date">${r.date}</span></div>
    <div class="rev-body"><div class="inner">
      <div class="blk"><span class="k">Objectives</span><p>${r.obj}</p></div>
      <div class="blk"><span class="k">Work Completed</span><ul>${r.work.map((w) => `<li>${w}</li>`).join("")}</ul></div>
      <div class="blk"><span class="k">New Additions</span><p>${r.add}</p></div>
      <div class="blk"><span class="k">Technical Challenge</span><p>${r.chal}</p></div>
      <div class="blk"><span class="k">Solution Implemented</span><p>${r.sol}</p></div>
      <div class="blk"><span class="k">Faculty Suggestions</span><p>${r.fac}</p></div>
      <div class="blk"><span class="k">Changes After Review</span><p>${r.chg}</p></div>
      <div class="blk"><span class="k">Next Steps</span><p>${r.next}</p></div>
    </div></div>`;
  const head = $(".rev-head", node),
    body = $(".rev-body", node);
  head.onclick = () => {
    body.style.maxHeight = body.style.maxHeight
      ? ""
      : body.scrollHeight + 40 + "px";
  };
  $("#reviewList").appendChild(node);
});

// work progress
WORK.forEach(([t, p]) => {
  const c = el(
    "div",
    "prog",
    `<div class="t"><span>${t}</span><b>${p}%</b></div><div class="bar"><i data-p="${p}"></i></div>`,
  );
  $("#workGrid").appendChild(c);
});

// literature
LIT.forEach((l) => {
  $("#litGrid").appendChild(
    el(
      "div",
      "card",
      `<div style="display:flex;justify-content:space-between;gap:1rem"><h3 style="font-size:1rem">${l.t}</h3><span class="tag sim">${l.y}</span></div>
   <p style="margin-top:.5rem">${l.a} · <span class="mono" style="color:var(--dim)">${l.j}</span></p>
   <div style="border-top:1px dashed var(--line);padding-top:.6rem;margin-top:.4rem">
   <div style="font-size:.84rem;color:var(--ink)"><b style="color:var(--cyan)">Key finding:</b> ${l.k}</div>
   <div style="font-size:.84rem;color:var(--dim);margin-top:.3rem"><b style="color:var(--green)">Relevance:</b> ${l.r}</div>
   <div class="mono" style="font-size:.66rem;color:var(--mute2);margin-top:.5rem">DOI: ${l.doi}</div></div>`,
    ),
  );
});

// comparison
(function () {
  let h = `<thead><tr><th>Parameter</th><th>Conventional System</th><th>Adaptive ARSS</th></tr></thead><tbody>`;
  const mk = (c, t) =>
    `<span class="${c}" style="display:inline-flex;align-items:center;gap:.45rem"><svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke-width:2.2" stroke="currentColor"><path d="${t}"/></svg>`;
  const cell = (v) =>
    v === "yes"
      ? mk("yes", "M20 6 9 17l-5-5") + "Yes</span>"
      : v === "no"
        ? mk("no", "M18 6 6 18M6 6l12 12") + "No</span>"
        : mk("mid", "M12 3a9 9 0 100 18Z") + "Partial</span>";
  COMPARE.forEach(([p, a, b]) => {
    h += `<tr><td>${p}</td><td>${cell(a)}</td><td>${cell(b)}</td></tr>`;
  });
  h += "</tbody>";
  $("#cmpTable").innerHTML = h;
})();

// roadmap
FUTURE.forEach((f, i) => {
  $("#roadmap").appendChild(
    el(
      "div",
      "road-card",
      `<div class="rn">R${String(i + 1).padStart(2, "0")}</div><h4>${f}</h4><p>${i < 4 ? "Near-term" : i < 9 ? "Mid-term" : "Long-term"} objective.</p>`,
    ),
  );
});

// faults
FAULTS.forEach((f) => {
  $("#faultGrid").appendChild(
    el(
      "div",
      "fs" + (f.crit ? " crit" : ""),
      `<h4><span class="dotp" style="color:${f.crit ? "var(--red)" : "var(--orange)"}"></span> ${f.n}</h4>
   <div class="row"><span class="k">Detection</span><span>${f.det}</span></div>
   <div class="row"><span class="k">ESP32 response</span><span>${f.res}</span></div>
   <div class="row"><span class="k">Corrective</span><span>${f.act}</span></div>
   <div class="row"><span class="k">Alarm</span><span>${f.alm}</span></div>`,
    ),
  );
});

// team
const socSvg = {
  li: '<svg viewBox="0 0 24 24"><path d="M4.98 3.5A2.5 2.5 0 112.5 6 2.49 2.49 0 014.98 3.5zM3 8.5h4V21H3zM9 8.5h3.8v1.7h.05a4.17 4.17 0 013.75-2c4 0 4.75 2.64 4.75 6.07V21H21.3v-5.5c0-1.31 0-3-1.83-3s-2.11 1.42-2.11 2.9V21H13.5z"/></svg>',
  em: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 6l9 7 9-7"/></svg>',
};
TEAM.forEach((m, i) => {
  const card = el("div", "member");
  card.innerHTML = `<span class="idline">DIGITAL ID</span><span class="idline r">${m.id}</span>
    <div class="hex"><div class="clip">${slotHTML("mem" + i, m.init, "ADD PHOTO")}</div></div>
    <h3>${m.name}</h3><div class="role">${m.role}</div><p class="bio">${m.bio}</p>
    <div class="chips" style="justify-content:center">${m.skills.map((s) => `<span class="chip2">${s}</span>`).join("")}</div>
    <div class="soc"><a href="#" aria-label="LinkedIn">${socSvg.li}</a><a href="#" aria-label="Email">${socSvg.em}</a></div>`;
  $("#teamGrid").appendChild(card);
});

// mentor
$("#mentorCard").innerHTML = `
  <div class="mphoto">${slotHTML("mentor", "TJ", "ADD PHOTO")}</div>
  <div class="meta"><div class="ln">Project Guide</div><h3>Dr. T. Jayanthi</h3><div class="desig">Associate Professor</div>
  <div class="badges"><span>Project Guide</span><span>Research Mentor</span><span>Academic Supervision</span></div></div>`;

// gallery
GALLERY.forEach(([cat, cap, h], i) => {
  const it = el("div", "gitem");
  it.innerHTML = `<div class="pslot" data-key="gal${i}" style="min-height:${h}px"><img class="ps-img" alt=""><div class="ps-ph"><b>+</b><span>ADD IMAGE</span></div><button class="ps-up" type="button" aria-label="Upload image">${IC.up}</button></div><div class="cap">${cap}<small>${cat.toUpperCase()}</small></div>`;
  $("#galleryGrid").appendChild(it);
});

// docs
DOCS.forEach((d, i) => {
  const row = el("div", "doc");
  row.dataset.key = "doc" + i;
  row.innerHTML = `<div class="dic">PDF</div><div style="min-width:0"><h4>${d}</h4><p class="doc-name">No file attached</p></div>
    <div class="doc-actions"><button class="doc-attach" type="button">Attach PDF</button><button class="doc-view" type="button" hidden>View</button></div>`;
  $("#docGrid").appendChild(row);
});

/* ---- wire uploads: images (team/mentor/gallery) + PDFs (docs) ---- */
function wireImageSlots() {
  document.querySelectorAll(".pslot").forEach((slot) => {
    const key = "arss-img-" + slot.dataset.key,
      img = slot.querySelector(".ps-img");
    const saved = LS.get(key);
    if (saved) {
      img.src = saved;
      slot.classList.add("has");
    }
    const up = () =>
      pickFile("image/*", (f) =>
        downscaleImage(f, 760, (url) => {
          img.src = url;
          slot.classList.add("has");
          LS.set(key, url);
        }),
      );
    const btn = slot.querySelector(".ps-up");
    if (btn)
      btn.onclick = (e) => {
        e.stopPropagation();
        up();
      };
    slot.addEventListener("click", up);
  });
}
function openPdf(src, name) {
  $("#pdfTitle").textContent = name || "Document";
  $("#pdfFrame").src = src;
  $("#pdfModal").classList.add("open");
}
function wireDocs() {
  document.querySelectorAll(".doc").forEach((row) => {
    const key = "arss-pdf-" + row.dataset.key,
      nameKey = key + "-name";
    const nameEl = row.querySelector(".doc-name"),
      viewBtn = row.querySelector(".doc-view"),
      attBtn = row.querySelector(".doc-attach");
    let objURL = null;
    const savedName = LS.get(nameKey);
    if (savedName) {
      nameEl.textContent = savedName;
      nameEl.classList.add("set");
      viewBtn.hidden = false;
    }
    attBtn.onclick = () =>
      pickFile("application/pdf,.pdf", (f) => {
        if (objURL) URL.revokeObjectURL(objURL);
        objURL = URL.createObjectURL(f);
        nameEl.textContent = f.name;
        nameEl.classList.add("set");
        viewBtn.hidden = false;
        LS.set(nameKey, f.name);
        if (f.size < 3.2 * 1024 * 1024) {
          const rd = new FileReader();
          rd.onload = () => LS.set(key, rd.result);
          rd.readAsDataURL(f);
        } else LS.del(key);
        openPdf(objURL, f.name);
      });
    viewBtn.onclick = () => {
      const data = objURL || LS.get(key);
      if (data) openPdf(data, nameEl.textContent);
      else attBtn.click();
    };
  });
}
$("#pdfClose").onclick = () => {
  $("#pdfModal").classList.remove("open");
  $("#pdfFrame").src = "about:blank";
};
$("#pdfModal").addEventListener("click", (e) => {
  if (e.target.id === "pdfModal") {
    $("#pdfModal").classList.remove("open");
    $("#pdfFrame").src = "about:blank";
  }
});
$("#ci-mail").innerHTML = IC.mail;
$("#ci-li").innerHTML = IC.linkedin;
$("#ci-lab").innerHTML = IC.lab;
wireImageSlots();
wireDocs();

/* =====================================================================
   ARCHITECTURE DIAGRAM (interactive)
   ===================================================================== */
(function () {
  const N = {
    ambient: ["Ambient Air", 44, 64, "filter"],
    filter: ["Filter", 196, 64, "filter"],
    blower: ["Blower", 330, 64, "blower"],
    mixing: ["Mixing", 470, 58, "mixing"],
    mask: ["Mask / User", 612, 64, "mask"],
    sensors: ["Sensors", 760, 64, "sensors"],
    cyl: ["O₂ Cylinder", 470, 16, "cylinder"],
    reg: ["Regulator", 612, 16, "reg"],
    valve: ["O₂ Valve", 760, 16, "valve"],
    exhale: ["Exhaled Gas", 612, 168, "oneway"],
    moist: ["Moisture Sep.", 470, 168, "moist"],
    scrub: ["CO₂ Scrubber", 330, 168, "scrub"],
    cond: ["Conditioned Gas", 150, 168, "mixing"],
    esp: ["ESP32", 760, 260, "esp"],
    act: ["Actuators", 470, 260, "blower"],
  };
  const W = 126,
    H = 42;
  let svg =
    '<svg viewBox="0 0 920 330" width="100%" role="img" aria-label="Interactive system block diagram">';
  const path = (d, c, dash) =>
    `<path d="${d}" stroke="${c}" stroke-width="2" fill="none" class="flow-dash"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  // fresh (cyan)
  svg +=
    path("M170,85 H196", "var(--cyan)") +
    path("M322,85 H330", "var(--cyan)") +
    path("M456,85 H470", "var(--cyan)") +
    path("M596,85 H612", "var(--cyan)") +
    path("M738,85 H760", "var(--cyan)");
  // O2 (violet)
  svg +=
    path("M596,37 H612", "var(--violet)") +
    path("M738,37 H760", "var(--violet)") +
    path("M533,37 V58", "var(--violet)");
  // recycle (green)
  svg +=
    path("M676,110 V189 H676", "var(--green)") +
    path("M612,189 H596", "var(--green)") +
    path("M456,189 H420", "var(--green)") +
    path("M276,189 H276", "var(--green)") +
    path("M150,189 H92 V85 H150", "var(--green)") +
    path("M213,189 V110", "var(--green)", "3 6");
  // control (red/amber)
  svg +=
    path("M823,85 V260 H823", "var(--red)", "3 5") +
    path("M760,281 H533 V281", "var(--red)", "3 5") +
    path("M470,271 V110", "var(--orange)", "3 5");
  for (const k in N) {
    const [label, x, y, cid] = N[k];
    svg += `<g class="node" data-c="${cid}"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="9"/><text x="${x + W / 2}" y="${y + H / 2 + 4}" text-anchor="middle">${label}</text></g>`;
  }
  svg += "</svg>";
  const frame = $("#archFrame");
  frame.innerHTML =
    svg +
    `<div class="legend"><b><i style="background:var(--cyan)"></i> Fresh air</b><b><i style="background:var(--green)"></i> Recycled</b><b><i style="background:var(--violet)"></i> Oxygen</b><b><i style="background:var(--orange)"></i> Actuator</b><b><i style="background:var(--red)"></i> Control signal</b></div>`;
  frame.querySelectorAll(".node").forEach((n) => {
    n.onclick = () => {
      const c = COMPONENTS.find((x) => x.id === n.dataset.c);
      if (c) openPanel(c);
    };
  });
})();

/* side panel */
function openPanel(c) {
  $("#spBody").innerHTML =
    `<span class="eyebrow">Component</span><h3 style="margin-top:.6rem">${c.name}</h3>
    <div class="sp-media">3D / IMAGE PLACEHOLDER</div>
    <div class="sp-row"><span class="k">Function</span><span class="v">${c.fn}</span></div>
    <div class="sp-row"><span class="k">Working principle</span><span class="v">${c.prin}</span></div>
    <div class="sp-row"><span class="k">Input</span><span class="v">${c.in}</span></div>
    <div class="sp-row"><span class="k">Output</span><span class="v">${c.out}</span></div>
    <div class="sp-row"><span class="k">Sensor interaction</span><span class="v">${c.sensor}</span></div>
    <div class="sp-row"><span class="k">Control interaction</span><span class="v">${c.ctrl}</span></div>
    <div class="sp-row"><span class="k">Specifications</span><span class="v">${c.specs}</span></div>
    <div class="sp-row"><span class="k">Material</span><span class="v">${c.mat}</span></div>`;
  $("#sidepanel").classList.add("open");
}
$("#spClose").onclick = () => $("#sidepanel").classList.remove("open");
