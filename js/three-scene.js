/* =====================================================================
   THREE.JS — 3D respiratory system + airflow particles
   ===================================================================== */
function buildScene(canvas, opts) {
  if (!window.THREE) {
    return;
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  if ("outputEncoding" in renderer && THREE.sRGBEncoding)
    renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xbcccd6, 0.45));
  const key = new THREE.DirectionalLight(0xf0f6fa, 0.95);
  key.position.set(5, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7a9fc2, 0.45);
  fill.position.set(-6, 1, -3);
  scene.add(fill);
  const rimL = new THREE.DirectionalLight(0x35b9d6, 0.8);
  rimL.position.set(-2, -3, -7);
  scene.add(rimL);
  const pt = new THREE.PointLight(0x2fafa2, 0.5, 40);
  pt.position.set(0, 5, 3);
  scene.add(pt);

  const group = new THREE.Group();
  scene.add(group);
  const sys = new THREE.Group();
  group.add(sys);
  // soft round glowing particle sprite
  const dotTex = (function () {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const matBody = new THREE.MeshStandardMaterial({
    color: 0x222d3a,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x0a1420,
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xb8ccd8,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    roughness: 0.06,
    emissive: 0x2a3c48,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  });
  const matAccent = (c) =>
    new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.6,
      roughness: 0.25,
      emissive: c,
      emissiveIntensity: 0.18,
    });
  const matTube = new THREE.MeshStandardMaterial({
    color: 0x2c3540,
    metalness: 0.35,
    roughness: 0.5,
  });
  const matRib = new THREE.MeshStandardMaterial({
    color: 0x343e4a,
    metalness: 0.45,
    roughness: 0.45,
  });

  // ---- component registry (each part = its own clickable group) ----
  const comps = [];
  const labelHost = opts.labelHost;
  function comp(id, anchorPos, dir) {
    const g = new THREE.Group();
    g.userData.compId = id;
    sys.add(g);
    const anchor = new THREE.Object3D();
    anchor.position.set(anchorPos[0], anchorPos[1], anchorPos[2]);
    g.add(anchor);
    const rec = {
      id,
      g,
      anchor,
      dir: new THREE.Vector3(dir[0], dir[1], dir[2]),
    };
    if (labelHost) {
      const nm = (PART_INFO[id] || {}).name || id;
      const d = document.createElement("div");
      d.className = "hotspot";
      d.style.opacity = 0;
      d.innerHTML =
        '<span class="hd"></span><span class="hl">' + nm + "</span>";
      d.onclick = () => {
        const c = PART_INFO[id];
        if (c) openPanel(c);
      };
      labelHost.appendChild(d);
      rec.el = d;
    }
    comps.push(rec);
    return g;
  }
  const bx = (g, x, y, z, w, h, d, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || matBody);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const cy = (g, x, y, z, r, h, mat, rz) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 22),
      mat || matBody,
    );
    m.position.set(x, y, z);
    if (rz) m.rotation.z = Math.PI / 2;
    g.add(m);
    return m;
  };

  // ---- realism helpers + materials ----
  const cyl2 = (g, x, y, z, rt, rb, h, mat, axis) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 24), mat);
    m.position.set(x, y, z);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else if (axis === "z") m.rotation.x = Math.PI / 2;
    g.add(m);
    return m;
  };
  const sph = (g, x, y, z, r, mat) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const tor = (g, x, y, z, R, t, mat, rx, ry) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, t, 12, 32), mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    g.add(m);
    return m;
  };
  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x93a7ba,
    metalness: 0.85,
    roughness: 0.32,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x0b1a2c,
    metalness: 0.5,
    roughness: 0.5,
  });
  const matPCB = new THREE.MeshStandardMaterial({
    color: 0x0d6e3a,
    metalness: 0.2,
    roughness: 0.55,
  });
  const matSkirt = new THREE.MeshStandardMaterial({
    color: 0x22384f,
    metalness: 0.1,
    roughness: 0.8,
  });
  const matVisor = new THREE.MeshStandardMaterial({
    color: 0xbfefff,
    transparent: true,
    opacity: 0.2,
    metalness: 0,
    roughness: 0.05,
    emissive: 0x0a3a48,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  });

  // =====================================================================
  //  WEARABLE LIFE-SUPPORT RIG
  //  A head-level full-face mask carries the filter + blower; corrugated
  //  hoses link it to a chest-mounted chassis that holds the rest of the
  //  loop, every part left exposed on the chest face so all stay visible.
  // =====================================================================
  const MASK_Y = 3.35; // mask centre height

  // ---------- MASK - realistic oronasal full-face mask (faces +z) ----------
  const gMask = comp("mask", [0, MASK_Y + 0.95, 0.1], [0, 1.15, 0.45]);
  const mk = new THREE.Group();
  mk.position.set(0, MASK_Y, 0);
  gMask.add(mk);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 32), matSkirt);
  shell.scale.set(0.9, 1.06, 0.86);
  mk.add(shell);
  // clear panoramic visor (front)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.78, 40, 32), matVisor);
  visor.scale.set(0.78, 0.86, 0.55);
  visor.position.set(0, 0.1, 0.34);
  mk.add(visor);
  // visor bezel
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.05, 16, 52),
    matAccent(0x35b9d6),
  );
  bezel.position.set(0, 0.1, 0.4);
  bezel.scale.set(1.1, 1.24, 1);
  mk.add(bezel);
  // soft face seal (rim toward the face, -z)
  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.13, 16, 48), matSkirt);
  seal.position.set(0, -0.02, -0.24);
  seal.scale.set(1.02, 1.3, 0.7);
  mk.add(seal);
  // chin housing + manifold
  sph(mk, 0, -0.72, 0.12, 0.3, matSkirt);
  bx(mk, 0, -0.66, 0.34, 0.34, 0.26, 0.2, matDark);
  // exhalation valve (amber) centre-bottom front
  cyl2(mk, 0, -0.58, 0.5, 0.11, 0.11, 0.1, matAccent(0xe6a23c), "z");
  sph(mk, 0, -0.58, 0.57, 0.08, matSkirt);
  // supply + return hose stubs under the chin (link to chest)
  cyl2(mk, -0.16, -0.9, 0.18, 0.09, 0.09, 0.34, matTube);
  cyl2(mk, 0.16, -0.9, 0.18, 0.09, 0.09, 0.34, matTube);
  // head-harness straps sweeping back
  [
    [0.62, 0.5],
    [-0.62, 0.5],
    [0.58, -0.25],
    [-0.58, -0.25],
  ].forEach(([xx, yy]) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xx, yy, -0.05),
      new THREE.Vector3(xx * 1.24, yy + 0.12, -0.6),
      new THREE.Vector3(xx * 0.7, yy + 0.16, -1.05),
    ]);
    mk.add(new THREE.Mesh(new THREE.TubeGeometry(c, 18, 0.05, 8, false), matSkirt));
  });

  // ---------- FILTER - HEPA + carbon cartridge on the LEFT of the mask ----------
  const gFilter = comp("filter", [-1.55, MASK_Y + 0.2, 0.28], [-1.25, 0.45, 0.2]);
  cyl2(gFilter, -1.18, MASK_Y + 0.2, 0.24, 0.34, 0.34, 0.34, matDark, "x");
  cyl2(gFilter, -1.36, MASK_Y + 0.2, 0.24, 0.37, 0.37, 0.07, matSteel, "x");
  cyl2(gFilter, -1.0, MASK_Y + 0.2, 0.24, 0.2, 0.2, 0.08, matSteel, "x");
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.11, 0.03),
      matAccent(0x2a6a9a),
    );
    f.position.set(-1.18, MASK_Y + 0.2 + Math.cos(a) * 0.24, 0.24 + Math.sin(a) * 0.24);
    f.rotation.x = a;
    gFilter.add(f);
  }
  cyl2(gFilter, -0.86, MASK_Y + 0.06, 0.22, 0.06, 0.06, 0.34, matTube, "x");

  // ---------- BLOWER - compact centrifugal unit below the filter (LEFT) ----------
  const gBlow = comp("blower", [-1.4, MASK_Y - 0.55, 0.34], [-1.15, -0.1, 0.35]);
  cyl2(gBlow, -1.12, MASK_Y - 0.5, 0.3, 0.32, 0.32, 0.26, matDark, "z");
  cyl2(gBlow, -1.12, MASK_Y - 0.5, 0.44, 0.18, 0.18, 0.08, matSteel, "z");
  cyl2(gBlow, -1.12, MASK_Y - 0.5, 0.5, 0.12, 0.05, 0.1, matAccent(0x35b9d6), "z");
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.02, 0.04),
      matAccent(0x35b9d6),
    );
    b.position.set(-1.12 + Math.cos(a) * 0.11, MASK_Y - 0.5 + Math.sin(a) * 0.11, 0.42);
    b.rotation.z = a;
    gBlow.add(b);
  }
  bx(gBlow, -1.12, MASK_Y - 0.5, 0.14, 0.34, 0.34, 0.2, matDark);
  cyl2(gBlow, -0.95, MASK_Y - 0.78, 0.3, 0.07, 0.07, 0.3, matSteel);

  // =====================================================================
  //  CHEST CHASSIS - worn on the chest; components mounted on the front
  // =====================================================================
  const chest = new THREE.Group();
  sys.add(chest);
  const CY = 0.25; // chest centre height
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.7, 0.36), matBody);
  plate.position.set(0, CY, -0.05);
  chest.add(plate);
  const frameRim = new THREE.Mesh(new THREE.BoxGeometry(3.44, 2.84, 0.16), matSkirt);
  frameRim.position.set(0, CY, 0.02);
  chest.add(frameRim);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(3.16, 2.56, 0.2), matDark);
  inset.position.set(0, CY, 0.12);
  chest.add(inset);
  [-0.62, 0.62].forEach((yy) => bx(chest, 0, CY + yy, 0.22, 3.0, 0.05, 0.05, matSteel));
  // shoulder straps sweeping up toward the mask harness
  [-1.2, 1.2].forEach((xx) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xx, CY + 1.35, 0.1),
      new THREE.Vector3(xx * 1.02, CY + 2.1, -0.15),
      new THREE.Vector3(xx * 0.5, CY + 2.7, -0.5),
    ]);
    chest.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.07, 8, false), matSkirt));
  });
  // chassis status strip
  for (let i = 0; i < 5; i++)
    sph(chest, -0.4 + i * 0.2, CY - 1.15, 0.24, 0.03, matAccent(i % 2 ? 0x4caf82 : 0x35b9d6));

  // ---------- MIXING CHAMBER (centre) ----------
  const gMix = comp("mixing", [0, CY + 0.65, 0.75], [0, 0.15, 0.95]);
  const mix = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 28), matGlass);
  mix.position.set(0, CY + 0.5, 0.55);
  gMix.add(mix);
  cyl2(gMix, 0, CY + 1.02, 0.55, 0.44, 0.44, 0.1, matSteel);
  cyl2(gMix, 0, CY - 0.02, 0.55, 0.44, 0.44, 0.1, matSteel);
  tor(gMix, 0, CY + 0.5, 0.55, 0.24, 0.03, matAccent(0x7a9fc2), Math.PI / 2, 0);
  cyl2(gMix, -0.36, CY + 0.5, 0.55, 0.08, 0.08, 0.3, matSteel, "x");
  cyl2(gMix, 0.36, CY + 0.5, 0.55, 0.08, 0.08, 0.3, matSteel, "x");
  cyl2(gMix, 0, CY + 1.12, 0.55, 0.07, 0.07, 0.24, matSteel);

  // ---------- O2 CYLINDER (left, vertical) ----------
  const gCyl = comp("cylinder", [-1.16, CY + 0.55, 0.62], [-1.15, -0.2, 0.35]);
  cyl2(gCyl, -1.16, CY + 0.35, 0.5, 0.26, 0.26, 1.1, matAccent(0x2fafa2));
  cyl2(gCyl, -1.16, CY + 0.95, 0.5, 0.1, 0.26, 0.22, matAccent(0x2fafa2));
  cyl2(gCyl, -1.16, CY + 1.1, 0.5, 0.08, 0.08, 0.14, matSteel);
  cyl2(gCyl, -1.16, CY - 0.22, 0.5, 0.28, 0.28, 0.06, matDark);

  // ---------- REGULATOR (left, above cylinder) ----------
  const gReg = comp("reg", [-1.16, CY + 1.3, 0.62], [-1.25, 0.4, 0.4]);
  bx(gReg, -1.16, CY + 1.24, 0.52, 0.26, 0.24, 0.24, matSteel);
  cyl2(gReg, -0.98, CY + 1.28, 0.62, 0.1, 0.1, 0.05, matAccent(0xf5f9ff), "z");
  sph(gReg, -1.34, CY + 1.24, 0.52, 0.06, matAccent(0x35b9d6));

  // ---------- O2 CONTROL VALVE (left-centre) ----------
  const gValve = comp("valve", [-0.56, CY + 1.2, 0.64], [-0.6, 0.55, 0.5]);
  cyl2(gValve, -0.56, CY + 1.1, 0.55, 0.12, 0.12, 0.2, matDark);
  tor(gValve, -0.56, CY + 1.1, 0.55, 0.13, 0.03, matAccent(0x2fafa2), Math.PI / 2, 0);
  bx(gValve, -0.56, CY + 0.92, 0.55, 0.16, 0.14, 0.16, matSteel);

  // ---------- ONE-WAY VALVE (top-right; receives exhaled gas) ----------
  const gOne = comp("oneway", [0.98, CY + 1.05, 0.66], [0.9, 0.85, 0.4]);
  cyl2(gOne, 0.98, CY + 1.28, 0.55, 0.14, 0.14, 0.36, matVisor, "x");
  cyl2(gOne, 1.16, CY + 1.28, 0.55, 0.17, 0.17, 0.05, matSteel, "x");
  cyl2(gOne, 0.8, CY + 1.28, 0.55, 0.17, 0.17, 0.05, matSteel, "x");
  cyl2(gOne, 0.98, CY + 1.28, 0.55, 0.11, 0.03, 0.09, matAccent(0xe6a23c), "x");

  // ---------- CO2 SCRUBBER (right; recycle step 1 - removes CO2) ----------
  const gScrub = comp("scrub", [1.05, CY + 0.62, 0.66], [1.3, 0.35, 0.4]);
  cyl2(gScrub, 1.05, CY + 0.52, 0.55, 0.28, 0.28, 0.8, matVisor, "x");
  for (let i = 0; i < 12; i++)
    sph(
      gScrub,
      0.72 + Math.random() * 0.66,
      CY + 0.52 + (Math.random() - 0.5) * 0.3,
      0.55 + (Math.random() - 0.5) * 0.3,
      0.055,
      matAccent(0x4caf82),
    );
  cyl2(gScrub, 0.63, CY + 0.52, 0.55, 0.31, 0.31, 0.07, matSteel, "x");
  cyl2(gScrub, 1.47, CY + 0.52, 0.55, 0.31, 0.31, 0.07, matSteel, "x");
  for (let i = 1; i < 4; i++)
    tor(gScrub, 0.72 + i * 0.2, CY + 0.52, 0.55, 0.29, 0.022, matSteel, 0, Math.PI / 2);

  // ---------- MOISTURE SEPARATOR (right; recycle step 2 - removes water) ----------
  const gMoist = comp("moist", [1.05, CY - 0.42, 0.66], [1.3, -0.4, 0.4]);
  cyl2(gMoist, 1.05, CY - 0.05, 0.55, 0.24, 0.24, 0.18, matSteel);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.42, 22), matVisor);
  bowl.position.set(1.05, CY - 0.33, 0.55);
  gMoist.add(bowl);
  for (let i = 0; i < 5; i++)
    sph(
      gMoist,
      0.98 + Math.random() * 0.14,
      CY - 0.42 + Math.random() * 0.14,
      0.55 + (Math.random() - 0.5) * 0.2,
      0.03,
      matAccent(0x7a9fc2),
    );

  // ---------- RECIRCULATION BLOWER (recycle step 3 - re-pressurises recycled gas) ----------
  const gRecirc = comp("recirc", [0.5, CY - 0.3, 0.68], [0.5, -0.95, 0.5]);
  cyl2(gRecirc, 0.5, CY - 0.6, 0.55, 0.24, 0.24, 0.2, matDark, "z");
  cyl2(gRecirc, 0.5, CY - 0.6, 0.66, 0.14, 0.14, 0.06, matSteel, "z");
  cyl2(gRecirc, 0.5, CY - 0.6, 0.71, 0.09, 0.04, 0.07, matAccent(0x35b9d6), "z");
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.035),
      matAccent(0x35b9d6),
    );
    b.position.set(0.5 + Math.cos(a) * 0.09, CY - 0.6 + Math.sin(a) * 0.09, 0.63);
    b.rotation.z = a;
    gRecirc.add(b);
  }
  bx(gRecirc, 0.5, CY - 0.6, 0.42, 0.26, 0.26, 0.14, matDark);
  cyl2(gRecirc, 0.72, CY - 0.6, 0.55, 0.06, 0.06, 0.22, matSteel, "x");

  // ---------- ESP32 CONTROLLER (bottom-left, exposed PCB) ----------
  const gEsp = comp("esp", [-0.72, CY - 0.28, 0.7], [-0.8, -0.9, 0.5]);
  bx(gEsp, -0.72, CY - 0.55, 0.6, 0.78, 0.46, 0.06, matPCB);
  bx(gEsp, -0.72, CY - 0.51, 0.66, 0.32, 0.2, 0.06, matDark);
  bx(gEsp, -0.56, CY - 0.55, 0.66, 0.11, 0.11, 0.05, matDark);
  for (let i = 0; i < 8; i++)
    bx(gEsp, -0.97 + i * 0.07, CY - 0.75, 0.62, 0.014, 0.045, 0.014, matSteel);
  sph(gEsp, -0.92, CY - 0.4, 0.64, 0.03, matAccent(0x35b9d6));

  // ---------- SENSOR SUITE (top-centre; samples the delivered gas) ----------
  const gSens = comp("sensors", [0.26, CY + 1.34, 0.66], [0.1, 0.95, 0.4]);
  [
    [0.14, CY + 1.16, 0],
    [0.36, CY + 1.14, 0.06],
    [0.26, CY + 1.32, -0.02],
  ].forEach((p) => {
    bx(gSens, p[0], p[1], 0.56 + p[2], 0.18, 0.12, 0.05, matPCB);
    sph(gSens, p[0], p[1] + 0.05, 0.6 + p[2], 0.055, matAccent(0x35b9d6));
  });

  // =====================================================================
  //  HUMAN WEARER — stylised mannequin the miniaturised rig is worn on.
  //  Sits behind the device: mask on the face, chest chassis on the torso
  //  like a front-mounted life-support pack. Not clickable (context only).
  // =====================================================================
  (function buildHuman() {
    const H = new THREE.Group();
    sys.add(H);
    const ZB = -0.82; // body depth, behind the device
    const skin = new THREE.MeshStandardMaterial({
      color: 0x5c6672,
      metalness: 0.05,
      roughness: 0.95,
    });
    const suit = new THREE.MeshStandardMaterial({
      color: 0x3c4651,
      metalness: 0.18,
      roughness: 0.82,
    });
    const part = (geo, mat, x, y, z, sx, sy, sz, rz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (sx != null) m.scale.set(sx, sy, sz);
      if (rz) m.rotation.z = rz;
      H.add(m);
      return m;
    };
    // cranium + jaw (behind the mask)
    part(new THREE.SphereGeometry(0.6, 32, 24), skin, 0, 3.52, ZB + 0.12, 0.86, 1.0, 0.9);
    part(new THREE.SphereGeometry(0.4, 24, 18), skin, 0, 3.12, ZB + 0.2, 0.92, 0.82, 0.9);
    // neck
    part(new THREE.CylinderGeometry(0.22, 0.27, 0.6, 20), skin, 0, 2.78, ZB + 0.02);
    // shoulders (deltoid bar + caps)
    part(new THREE.CylinderGeometry(0.36, 0.36, 2.5, 20), suit, 0, 2.42, ZB, 1, 1, 0.72, Math.PI / 2);
    part(new THREE.SphereGeometry(0.4, 20, 16), suit, -1.28, 2.42, ZB, 1, 1, 0.8);
    part(new THREE.SphereGeometry(0.4, 20, 16), suit, 1.28, 2.42, ZB, 1, 1, 0.8);
    // torso — tapered, flattened front-to-back; the rig rides on its front
    part(new THREE.CylinderGeometry(1.34, 1.02, 3.4, 28), suit, 0, 0.75, ZB - 0.05, 1, 1, 0.6);
    // hips + short thigh stubs
    part(new THREE.CylinderGeometry(1.02, 1.08, 0.8, 24), suit, 0, -1.2, ZB - 0.05, 1, 1, 0.62);
    part(new THREE.CylinderGeometry(0.44, 0.4, 0.95, 18), suit, -0.5, -1.95, ZB - 0.02);
    part(new THREE.CylinderGeometry(0.44, 0.4, 0.95, 18), suit, 0.5, -1.95, ZB - 0.02);
    // arms hanging at the sides, clear of the front pack
    [-1, 1].forEach((s) => {
      part(new THREE.CylinderGeometry(0.28, 0.24, 1.7, 18), suit, s * 1.72, 1.35, ZB + 0.12, 1, 1, 1, s * 0.12);
      part(new THREE.CylinderGeometry(0.22, 0.18, 1.6, 18), suit, s * 1.9, -0.15, ZB + 0.2, 1, 1, 1, s * 0.05);
      part(new THREE.SphereGeometry(0.2, 16, 12), skin, s * 1.96, -1.0, ZB + 0.22, 1, 1.2, 0.9);
    });
  })();

  // ---- flow paths (tubes + particles) ----
  const flows = [],
    tubeMeshes = [],
    ribMeshes = [];
  function tube(points, rad) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 44, rad || 0.09, 12, false),
      matTube,
    );
    sys.add(m);
    tubeMeshes.push(m);
    return curve;
  }
  function ribs(curve, n, color) {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = curve.getPointAt(t);
      const rg = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.03, 6, 14),
        matRib,
      );
      rg.position.copy(p);
      const tan = curve.getTangentAt(t);
      rg.lookAt(p.clone().add(tan));
      sys.add(rg);
      ribMeshes.push(rg);
    }
  }
  function addFlow(pts, color, ribbed, noTube) {
    let curve;
    if (noTube) {
      curve = new THREE.CatmullRomCurve3(
        pts.map((p) => new THREE.Vector3(...p)),
      );
    } else {
      curve = tube(pts, 0.09);
      if (ribbed) ribs(curve, ribbed, color);
    }
    const count = opts.light ? 12 : 20;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      map: dotTex,
      size: opts.light ? 0.26 : 0.3,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pointsObj = new THREE.Points(geo, mat);
    sys.add(pointsObj);
    const phases = [];
    for (let i = 0; i < count; i++) phases.push(i / count);
    flows.push({ curve, geo, pos, count, phases, pointsObj });
  }
  // ---- corrugated breathing hoses linking the mask to the chest ----
  function buildHose(pts, rad) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, rad, 14, false),
      matTube,
    );
    sys.add(m);
    tubeMeshes.push(m);
    const n = Math.max(6, Math.floor(curve.getLength() / (rad * 1.5)));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = curve.getPointAt(t);
      const rg = new THREE.Mesh(
        new THREE.TorusGeometry(rad * 1.18, rad * 0.32, 8, 16),
        matRib,
      );
      rg.position.copy(p);
      const tan = curve.getTangentAt(t);
      rg.lookAt(p.clone().add(tan));
      sys.add(rg);
      ribMeshes.push(rg);
    }
    return curve;
  }
  const HSUP = [
    [-0.95, MASK_Y - 0.85, 0.3],
    [-0.72, 2.1, 0.5],
    [-0.5, CY + 1.1, 0.55],
    [-0.32, CY + 0.55, 0.55],
  ];
  const HDEL = [
    [0, CY + 1.2, 0.55],
    [-0.05, 2.05, 0.5],
    [-0.14, MASK_Y - 0.95, 0.2],
  ];
  const HRET = [
    [0.16, MASK_Y - 0.95, 0.2],
    [0.5, 2.2, 0.45],
    [0.9, 1.75, 0.55],
    [0.98, CY + 1.28, 0.55],
  ];
  buildHose(HSUP, 0.1);
  buildHose(HDEL, 0.1);
  buildHose(HRET, 0.1);

  // ---- animated gas particle flows (follow the real gas path) ----
  addFlow(
    [
      [-1.4, MASK_Y + 0.2, 0.24],
      [-1.12, MASK_Y - 0.5, 0.42],
      ...HSUP,
      [-0.05, CY + 0.5, 0.55],
    ],
    0x35b9d6,
    0,
    true,
  ); // FRESH: ambient -> filter -> intake blower -> supply hose -> mixing
  addFlow([...HDEL, [0, MASK_Y - 0.5, 0.3]], 0x9fe0ef, 0, true); // DELIVERY: mixing -> mask
  addFlow(
    [
      [-1.16, CY + 0.6, 0.5],
      [-1.16, CY + 1.24, 0.52],
      [-0.56, CY + 1.1, 0.55],
      [-0.18, CY + 0.5, 0.55],
    ],
    0x2fafa2,
  ); // O2 MAKEUP: cylinder -> regulator -> valve -> mixing
  addFlow(
    [
      [0.12, MASK_Y - 0.6, 0.32],
      ...HRET,
      [1.05, CY + 0.52, 0.55],
    ],
    0xe6a23c,
    0,
    true,
  ); // EXHALE: mask -> return hose -> one-way valve -> CO2 scrubber
  addFlow(
    [
      [1.05, CY + 0.5, 0.55],
      [1.05, CY - 0.05, 0.55],
      [1.05, CY - 0.4, 0.55],
      [0.5, CY - 0.6, 0.55],
      [0.34, CY + 0.5, 0.55],
    ],
    0x4caf82,
  ); // RECYCLE: scrubber -> moisture -> recirculation blower -> mixing

  // ---- frame the assembly: centre it and fit the camera ----
  const bbox = new THREE.Box3().setFromObject(sys);
  const bcenter = bbox.getCenter(new THREE.Vector3());
  const bsphere = bbox.getBoundingSphere(new THREE.Sphere());
  sys.position.sub(bcenter); // centre assembly on the group origin
  const rad = bsphere.radius;
  const camDir = new THREE.Vector3(
    ...(opts.camDir || [0.6, 0.32, 1]),
  ).normalize();
  const dist =
    (rad / Math.sin((camera.fov * Math.PI) / 360)) * (opts.fit || 0.72);
  camera.position.copy(camDir.clone().multiplyScalar(dist));
  camera.lookAt(0, 0, 0);
  const home = camera.position.clone();
  const minZ = rad * 1.25,
    maxZ = rad * 4.2;
  scene.fog = new THREE.Fog(0x07111f, dist * 0.85, dist * 2.4); // depth haze
  // holographic platform under the model
  const platY = bbox.min.y - bcenter.y - 0.12;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(rad * 1.02, 56),
    new THREE.MeshBasicMaterial({
      color: 0x0b1626,
      transparent: true,
      opacity: 0.4,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = platY;
  group.add(disc);
  const grid = new THREE.PolarGridHelper(
    rad * 1.02,
    8,
    4,
    56,
    0x1e5066,
    0x123047,
  );
  grid.position.y = platY + 0.01;
  if (grid.material) {
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
  }
  group.add(grid);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(rad * 1.02, 0.018, 8, 72),
    new THREE.MeshBasicMaterial({
      color: 0x35b9d6,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = platY;
  group.add(ring);
  group.position.x = (opts.xoff || 0) * rad;

  // ---- interaction ----
  let rot = { x: 0.12, y: 0.5 },
    drag = false,
    moved = false,
    last = { x: 0, y: 0 },
    down = { x: 0, y: 0 },
    autov = opts.auto ? 0.0022 : 0;
  let hovered = null,
    explodeT = 0,
    explodeCur = 0,
    labelsOn = false;
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    tmp = new THREE.Vector3();
  function pick(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(
      comps.map((c) => c.g),
      true,
    );
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o) {
      if (o.userData && o.userData.compId)
        return comps.find((c) => c.id === o.userData.compId);
      o = o.parent;
    }
    return null;
  }
  canvas.addEventListener("pointerdown", (e) => {
    drag = true;
    moved = false;
    down = { x: e.clientX, y: e.clientY };
    last = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("pointerup", (e) => {
    if (drag && !moved && opts.pick) {
      const r = pick(e.clientX, e.clientY);
      if (r) {
        const c = PART_INFO[r.id];
        if (c) openPanel(c);
      }
    }
    drag = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (drag) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) moved = true;
      rot.y += (e.clientX - last.x) * 0.006;
      rot.x = clamp(rot.x + (e.clientY - last.y) * 0.005, -0.7, 0.95);
      last = { x: e.clientX, y: e.clientY };
    } else if (opts.pick) {
      const r = pick(e.clientX, e.clientY);
      hovered = r;
      canvas.style.cursor = r ? "pointer" : "grab";
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      camera.position.multiplyScalar(1 + (e.deltaY > 0 ? 0.08 : -0.08));
      camera.position.clampLength(minZ, maxZ);
    },
    { passive: false },
  );

  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function onScreen() {
    const r = canvas.getBoundingClientRect();
    const H = innerHeight || 800,
      W = innerWidth || 800;
    return r.bottom > -40 && r.top < H + 40 && r.right > 0 && r.left < W;
  }

  function render() {
    const ok = resize();
    if (onScreen() && ok) {
      if (!drag) rot.y += autov;
      group.rotation.y = rot.y;
      group.rotation.x = rot.x;
      group.position.y = reduce ? 0 : Math.sin(Date.now() / 900) * 0.04;
      // explode lerp + hover pop
      explodeCur += (explodeT - explodeCur) * 0.12;
      comps.forEach((c) => {
        const pop = c === hovered && explodeT < 0.5 ? 0.18 : 0;
        c.g.position.copy(c.dir).multiplyScalar(explodeCur * 1.9 + pop);
      });
      const flowsVisible = explodeCur < 0.45;
      tubeMeshes.forEach((m) => (m.visible = flowsVisible));
      ribMeshes.forEach((m) => (m.visible = flowsVisible));
      flows.forEach((f) => {
        f.pointsObj.visible = flowsVisible;
        if (flowsVisible) {
          const sp = (reduce ? 0.3 : flowSpeed) * 0.006;
          for (let i = 0; i < f.count; i++) {
            f.phases[i] = (f.phases[i] + sp) % 1;
            const p = f.curve.getPointAt(f.phases[i]);
            f.pos[i * 3] = p.x;
            f.pos[i * 3 + 1] = p.y;
            f.pos[i * 3 + 2] = p.z;
          }
          f.geo.attributes.position.needsUpdate = true;
        }
      });
      renderer.render(scene, camera);
      // project labels
      if (labelHost) {
        const w = canvas.clientWidth,
          h = canvas.clientHeight;
        comps.forEach((c) => {
          if (!c.el) return;
          if (!labelsOn) {
            c.el.style.opacity = 0;
            c.el.style.pointerEvents = "none";
            return;
          }
          c.anchor.getWorldPosition(tmp);
          tmp.project(camera);
          if (tmp.z < 1) {
            c.el.style.opacity = 1;
            c.el.style.pointerEvents = "auto";
            c.el.style.left = (tmp.x * 0.5 + 0.5) * w + "px";
            c.el.style.top = (-tmp.y * 0.5 + 0.5) * h + "px";
          } else {
            c.el.style.opacity = 0;
            c.el.style.pointerEvents = "none";
          }
        });
      }
    }
    requestAnimationFrame(render);
  }
  render();
  return {
    setLabels: (on) => {
      labelsOn = on;
    },
    setExplode: (on) => {
      explodeT = on ? 1 : 0;
    },
    reset: () => {
      rot = { x: 0.12, y: 0.5 };
      camera.position.copy(home);
      camera.lookAt(0, 0, 0);
      explodeT = 0;
    },
  };
}

// instantiate scenes after Three loads
window.addEventListener("load", () => {
  try {
    buildScene($("#hero-canvas"), {
      camDir: [0.42, 0.16, 1],
      fit: 0.98,
      xoff: 0.42,
      auto: true,
      light: true,
      pick: true,
    });
  } catch (err) {
    console.error("HERO scene error:", err);
  }
  let twin = null;
  try {
    twin = buildScene($("#twin-canvas"), {
      camDir: [0.55, 0.18, 1],
      fit: 0.92,
      auto: true,
      light: false,
      pick: true,
      labelHost: $("#twinHotspots"),
    });
  } catch (err) {
    console.error("TWIN scene error:", err);
  }
  // twin view controls
  const vc = $("#twinView");
  let labelsOn = true,
    explodeOn = false;
  const vbtn = (txt, fn) => {
    const b = el("button", "mbtn", txt);
    b.onclick = () => fn(b);
    vc.appendChild(b);
    return b;
  };
  const lblBtn = vbtn("Labels", (b) => {
    labelsOn = !labelsOn;
    b.classList.toggle("active", labelsOn);
    twin && twin.setLabels(labelsOn);
  });
  vbtn("Exploded view", (b) => {
    explodeOn = !explodeOn;
    b.classList.toggle("active", explodeOn);
    twin && twin.setExplode(explodeOn);
  });
  vbtn("Reset view", () => {
    twin && twin.reset();
  });
  lblBtn.classList.add("active");
  if (twin) twin.setLabels(true); // component labels on by default
  applyMode("normal");
});

/* =====================================================================
   SCROLL: reveals, nav spy, progress bars
   ===================================================================== */
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        if (
          e.target.id === "work" ||
          (e.target.querySelector && e.target.querySelector(".prog"))
        ) {
          e.target
            .querySelectorAll(".prog .bar i")
            .forEach((b) => (b.style.width = b.dataset.p + "%"));
        }
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
);
document.querySelectorAll(".reveal").forEach((x) => io.observe(x));
// ensure progress bars fill
setTimeout(
  () =>
    document
      .querySelectorAll(".prog .bar i")
      .forEach((b) => (b.style.width = b.dataset.p + "%")),
  400,
);

// nav scroll spy
const secs = [...document.querySelectorAll("section[id]")];
const spy = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        const id = "#" + e.target.id;
        document
          .querySelectorAll("#navlinks a")
          .forEach((a) =>
            a.classList.toggle("active", a.getAttribute("href") === id),
          );
      }
    }),
  { rootMargin: "-40% 0px -55% 0px" },
);
secs.forEach((s) => spy.observe(s));
