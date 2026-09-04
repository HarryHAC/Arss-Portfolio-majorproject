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
  scene.add(new THREE.AmbientLight(0xc4b8a0, 0.45));
  const key = new THREE.DirectionalLight(0xfff0e0, 0.95);
  key.position.set(5, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7a9fc2, 0.45);
  fill.position.set(-6, 1, -3);
  scene.add(fill);
  const rimL = new THREE.DirectionalLight(0xc8873a, 0.8);
  rimL.position.set(-2, -3, -7);
  scene.add(rimL);
  const pt = new THREE.PointLight(0x9e8fcf, 0.5, 40);
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
    color: 0x1e2328,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x0d0f12,
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

  // FILTER — cylindrical HEPA canister (axis X) with pleated media
  const gFilter = comp("filter", [-5, 0, 0], [-1, 0.35, 0]);
  cyl2(gFilter, -5, 0, 0, 0.5, 0.5, 1.0, matDark, "x");
  cyl2(gFilter, -4.5, 0, 0, 0.56, 0.56, 0.12, matSteel, "x");
  cyl2(gFilter, -5.5, 0, 0, 0.56, 0.56, 0.12, matSteel, "x");
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.16, 0.035),
      matAccent(0x2a6a9a),
    );
    f.position.set(-5, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
    f.rotation.x = a;
    gFilter.add(f);
  }
  cyl2(gFilter, -5.75, 0, 0, 0.14, 0.14, 0.3, matSteel, "x");
  // BLOWER — centrifugal volute + intake cone + impeller + motor + outlet
  const gBlow = comp("blower", [-3.1, 0, 0], [-0.5, 0.75, 0]);
  cyl2(gBlow, -3.1, 0, 0, 0.6, 0.6, 0.4, matDark, "z");
  cyl2(gBlow, -3.1, 0, 0.24, 0.28, 0.28, 0.12, matSteel, "z");
  cyl2(gBlow, -3.1, 0, 0.32, 0.2, 0.06, 0.18, matAccent(0x7a9fc2), "z");
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.05),
      matAccent(0xc8873a),
    );
    b.position.set(-3.1 + Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.2);
    b.rotation.z = a;
    gBlow.add(b);
  }
  cyl2(gBlow, -3.1, 0, -0.28, 0.24, 0.24, 0.36, matSteel, "z");
  bx(gBlow, -2.78, 0.34, 0, 0.32, 0.5, 0.46, matDark);
  cyl2(gBlow, -2.5, 0.1, 0, 0.13, 0.13, 0.4, matSteel, "x");
  // MIXING chamber — glass cylinder + steel caps + I/O stubs + swirl
  const gMix = comp("mixing", [-0.6, 0, 0], [0, 0.05, 0]);
  const mix = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.64, 1.3, 28),
    matGlass,
  );
  mix.position.set(-0.6, 0, 0);
  gMix.add(mix);
  cyl2(gMix, -0.6, 0.7, 0, 0.68, 0.68, 0.12, matSteel);
  cyl2(gMix, -0.6, -0.7, 0, 0.68, 0.68, 0.12, matSteel);
  cyl2(gMix, -1.25, 0, 0, 0.12, 0.12, 0.4, matSteel, "x");
  cyl2(gMix, 0.05, 0, 0, 0.12, 0.12, 0.4, matSteel, "x");
  cyl2(gMix, -0.6, 0.9, 0, 0.1, 0.1, 0.35, matSteel);
  cyl2(gMix, -0.6, -0.9, 0, 0.1, 0.1, 0.35, matSteel);
  tor(gMix, -0.6, 0, 0, 0.34, 0.035, matAccent(0x7a9fc2), Math.PI / 2, 0);
  // O2 CYLINDER — body + shoulder taper + neck + handwheel + base
  const gCyl = comp("cylinder", [-0.6, 3.1, -0.6], [0.2, 1, -0.5]);
  cyl2(gCyl, -0.6, 3.0, -0.6, 0.34, 0.34, 1.4, matAccent(0x9e8fcf));
  cyl2(gCyl, -0.6, 3.8, -0.6, 0.12, 0.34, 0.3, matAccent(0x9e8fcf));
  cyl2(gCyl, -0.6, 4.0, -0.6, 0.1, 0.1, 0.2, matSteel);
  tor(gCyl, -0.6, 4.14, -0.6, 0.13, 0.03, matSteel, Math.PI / 2, 0);
  cyl2(gCyl, -0.6, 2.28, -0.6, 0.36, 0.36, 0.08, matDark);
  // REGULATOR — body + two gauges + knob + outlet
  const gReg = comp("reg", [-0.6, 2.05, -0.6], [0.9, 0.2, -0.5]);
  bx(gReg, -0.6, 2.02, -0.6, 0.32, 0.3, 0.3, matSteel);
  cyl2(gReg, -0.36, 2.06, -0.46, 0.13, 0.13, 0.05, matAccent(0xf5f9ff), "x");
  cyl2(gReg, -0.36, 2.02, -0.74, 0.09, 0.09, 0.05, matAccent(0xf5f9ff), "x");
  sph(gReg, -0.82, 2.02, -0.6, 0.07, matAccent(0xc8873a));
  cyl2(gReg, -0.6, 1.85, -0.6, 0.06, 0.06, 0.16, matSteel);
  // O2 VALVE — solenoid coil + body + stem
  const gValve = comp("valve", [-0.6, 1.35, -0.4], [0.9, 0, -0.3]);
  cyl2(gValve, -0.6, 1.44, -0.4, 0.14, 0.14, 0.26, matDark);
  tor(gValve, -0.6, 1.44, -0.4, 0.15, 0.03, matAccent(0x9e8fcf), 0, 0);
  bx(gValve, -0.6, 1.2, -0.4, 0.2, 0.16, 0.2, matSteel);
  cyl2(gValve, -0.6, 1.02, -0.4, 0.05, 0.05, 0.18, matSteel);
  // ---- MASK (full-face, signature object) ----
  const gMask = comp("mask", [3.4, 0.2, 0], [1.2, 0.25, 0]);
  const mk = new THREE.Group();
  mk.position.set(3.4, 0.2, 0);
  gMask.add(mk);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), matVisor);
  visor.scale.set(0.7, 1.12, 0.96);
  visor.position.set(0.16, 0, 0);
  mk.add(visor);
  const seal = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.13, 16, 40),
    matSkirt,
  );
  seal.rotation.y = Math.PI / 2;
  seal.position.set(-0.48, -0.04, 0);
  seal.scale.set(1, 1.34, 1);
  mk.add(seal);
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.045, 12, 44),
    matAccent(0xc8873a),
  );
  frame.rotation.y = Math.PI / 2;
  frame.position.set(-0.08, 0, 0);
  frame.scale.set(1, 1.32, 1);
  mk.add(frame);
  sph(mk, -0.34, 0.5, 0, 0.15, matSkirt); // nose bridge
  cyl2(mk, 0.55, -0.52, 0, 0.13, 0.13, 0.12, matAccent(0xff9d00), "x");
  sph(mk, 0.66, -0.52, 0, 0.1, matSkirt); // exhalation valve
  cyl2(mk, -0.95, -0.08, 0.22, 0.16, 0.16, 0.5, matAccent(0x00c781), "x"); // inhalation port (green)
  cyl2(mk, -0.9, -0.5, -0.16, 0.13, 0.13, 0.42, matAccent(0xff9d00), "x"); // exhalation port (orange)
  cyl2(mk, 0.05, 1.02, 0, 0.08, 0.08, 0.42, matAccent(0x7a9fc2)); // pressure-support connector (top)
  [
    [0.5, 0.6],
    [0.5, -0.6],
    [-0.35, 0.55],
    [-0.35, -0.55],
  ].forEach(([yy, zz]) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.4, yy, zz),
      new THREE.Vector3(-1.1, yy * 0.9, zz * 1.12),
      new THREE.Vector3(-1.75, yy * 0.6, zz * 0.92),
    ]);
    mk.add(
      new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.045, 8, false), matDark),
    );
    const bk = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.05),
      matSteel,
    );
    bk.position.set(-0.8, yy * 0.92, zz * 1.06);
    mk.add(bk);
  });
  // ONE-WAY VALVE — clear inline check valve
  const gOne = comp("oneway", [3.4, -2, 0], [1, -0.65, 0]);
  cyl2(gOne, 3.4, -2, 0, 0.22, 0.22, 0.55, matVisor);
  cyl2(gOne, 3.4, -1.72, 0, 0.26, 0.26, 0.08, matSteel);
  cyl2(gOne, 3.4, -2.28, 0, 0.26, 0.26, 0.08, matSteel);
  cyl2(gOne, 3.4, -2.0, 0, 0.18, 0.04, 0.14, matAccent(0xff9d00));
  // MOISTURE SEPARATOR — steel head + clear bowl + drain + droplets
  const gMoist = comp("moist", [1.4, -2.4, 0], [0.3, -1, 0]);
  cyl2(gMoist, 1.4, -2.12, 0, 0.34, 0.34, 0.28, matSteel);
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.28, 0.68, 22),
    matVisor,
  );
  bowl.position.set(1.4, -2.55, 0);
  gMoist.add(bowl);
  cyl2(gMoist, 1.4, -2.94, 0, 0.08, 0.05, 0.14, matSteel);
  for (let i = 0; i < 6; i++)
    sph(
      gMoist,
      1.3 + Math.random() * 0.2,
      -2.7 + Math.random() * 0.25,
      (Math.random() - 0.5) * 0.3,
      0.045,
      matAccent(0x7a9fc2),
    );
  // CO2 SCRUBBER — clear ribbed cartridge (axis X) with sorbent granules
  const gScrub = comp("scrub", [-0.8, -2.4, 0], [-0.6, -1, 0]);
  cyl2(gScrub, -0.8, -2.4, 0, 0.42, 0.42, 1.0, matVisor, "x");
  for (let i = 0; i < 14; i++)
    sph(
      gScrub,
      -1.15 + Math.random() * 0.7,
      -2.4 + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      0.07,
      matAccent(0x00c781),
    );
  cyl2(gScrub, -0.3, -2.4, 0, 0.46, 0.46, 0.1, matSteel, "x");
  cyl2(gScrub, -1.3, -2.4, 0, 0.46, 0.46, 0.1, matSteel, "x");
  cyl2(gScrub, 0.0, -2.4, 0, 0.1, 0.1, 0.3, matSteel, "x");
  cyl2(gScrub, -1.6, -2.4, 0, 0.1, 0.1, 0.3, matSteel, "x");
  for (let i = 1; i < 5; i++)
    tor(gScrub, -1.3 + i * 0.34, -2.4, 0, 0.44, 0.03, matSteel, 0, Math.PI / 2);
  // ESP32 CONTROLLER — PCB + shielded module + USB + chip + pin headers
  const gEsp = comp("esp", [-3.4, -2.4, 0.4], [-1, -0.6, 0.4]);
  bx(gEsp, -3.4, -2.5, 0.4, 1.05, 0.08, 0.7, matPCB);
  bx(gEsp, -3.4, -2.44, 0.4, 0.42, 0.06, 0.5, matDark);
  bx(gEsp, -3.4, -2.42, 0.62, 0.18, 0.05, 0.16, matSteel);
  bx(gEsp, -3.12, -2.44, 0.26, 0.14, 0.06, 0.14, matDark);
  for (let i = 0; i < 8; i++)
    bx(gEsp, -3.85 + i * 0.13, -2.44, 0.68, 0.02, 0.06, 0.02, matSteel);
  for (let i = 0; i < 8; i++)
    bx(gEsp, -3.85 + i * 0.13, -2.44, 0.12, 0.02, 0.06, 0.02, matSteel);
  sph(gEsp, -3.72, -2.42, 0.5, 0.04, matAccent(0xc8873a));
  // SENSOR SUITE — mini PCB modules with sensor domes
  const gSens = comp("sensors", [2.5, 0.5, 0.2], [0.8, 0.7, 0.3]);
  [
    [2.55, 1.15, 0],
    [2.45, -0.35, 0.35],
    [2.7, 0.4, -0.3],
  ].forEach((p) => {
    bx(gSens, p[0], p[1], p[2], 0.22, 0.05, 0.16, matPCB);
    sph(gSens, p[0], p[1] + 0.07, p[2], 0.08, matAccent(0xc8873a));
  });

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
  addFlow(
    [
      [-6.4, 0, 0],
      [-5, 0, 0],
      [-3.1, 0, 0],
      [-1.4, 0, 0],
      [-0.6, 0.2, 0],
    ],
    0xc8873a,
  ); // fresh air flow
  addFlow(
    [
      [-0.6, 0.4, 0],
      [0.9, 0.5, 0],
      [2.0, 0.42, 0],
      [2.5, 0.05, 0.16],
    ],
    0x7a9fc2,
    8,
  ); // mixed -> mask (corrugated)
  addFlow(
    [
      [-0.6, 3.1, -0.6],
      [-0.6, 2.05, -0.6],
      [-0.6, 1.35, -0.4],
      [-0.6, 0.4, 0],
    ],
    0x8b7bff,
  ); // O2
  addFlow(
    [
      [2.55, -0.4, -0.12],
      [3.4, -2, 0],
      [1.4, -2.4, 0],
      [-0.35, -2.4, 0],
    ],
    0xff9d00,
    7,
  ); // exhale (corrugated)
  addFlow(
    [
      [-1.25, -2.4, 0],
      [-2, -1.5, 0],
      [-1.2, -0.5, 0],
      [-0.7, -0.3, 0],
    ],
    0x00c781,
  ); // recycle

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
  scene.fog = new THREE.Fog(0x081b3d, dist * 0.85, dist * 2.4); // depth haze
  // holographic platform under the model
  const platY = bbox.min.y - bcenter.y - 0.12;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(rad * 1.02, 56),
    new THREE.MeshBasicMaterial({
      color: 0x0b2544,
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
    0x1c4a7e,
    0x123157,
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
      color: 0xc8873a,
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
      camDir: [0.45, 0.32, 1],
      fit: 0.8,
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
      camDir: [0.72, 0.3, 1],
      fit: 0.7,
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
