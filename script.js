/*
 * Classroom Digital Brain — a fresh, procedural Three.js showcase.
 * Plain JavaScript, no build step. The scene, room details, characters,
 * lighting, controls, camera detection, Web Serial, and energy estimate live here.
 */

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const smooth = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ui = {
    profileIntro: byId("vivek-screen"), profileEnter: byId("vivek-enter"),
    intro: byId("intro-screen"), introCopy: byId("intro-copy"),
    dashboard: byId("dashboard"), header: byId("site-header"),
    headerLive: byId("header-live-label"), headerBack: byId("back-to-intro"),
    profileBack: byId("back-to-vivek"),
    begin: byId("begin-experience"), skip: byId("skip-experience"),
    restart: byId("restart-walkthrough"), caption: byId("walkthrough-caption"),
    captionIndex: $(".caption-index"), captionText: byId("caption-text"),
    skipWalkthrough: byId("skip-walkthrough"), loading: byId("loading-cover"),
    sound: byId("sound-toggle"), authNote: byId("auth-note"),
    roomState: byId("scene-occupancy"), sceneTemp: byId("scene-temperature"),
    occupancy: byId("occupancy-value"), occupancySource: byId("occupancy-source"),
    people: byId("people-value"), temp: byId("temperature-value"), timer: byId("timer-value"),
    beacon: byId("room-beacon"), modeSwitch: byId("mode-switch"), modeToggle: byId("mode-toggle"), modeCaption: byId("mode-caption"),
    modeExplain: byId("mode-explain"), cameraVideo: byId("camera-video"),
    cameraOverlay: byId("camera-overlay"), cameraPlaceholder: byId("camera-placeholder"),
    cameraStatus: byId("camera-status"), cameraButton: byId("camera-toggle"),
    cameraCount: byId("camera-count"), modelStatus: byId("model-status"),
    serialButton: byId("serial-connect"), serialStatus: byId("serial-status"),
    boardSpeed: byId("board-speed"), energyUsed: byId("energy-used"),
    energySaved: byId("energy-saved"), moneySaved: byId("money-saved"),
    energyProgress: byId("energy-progress"), sessionTime: byId("session-time"),
    log: byId("log-list"),
  };

  let googleAuthenticated = false;
  let signedInEmail = "";

  const state = {
    mode: "auto", occupied: false, people: 0, temperature: 28,
    setpoint: 26, delay: 12, remaining: null,
    light: false, fan: false, ac: false,
    source: "MANUAL / SIMULATION", sensorTemperature: false,
    lightWatts: 36, fanWatts: 75, acWatts: 1200, tariff: 8,
    onSeconds: { light: 0, fan: 0, ac: 0 },
    startTime: Date.now(), logCount: 0,
  };

  /* ------------------------------------------------------------
     3D classroom: all geometry is created locally in this file.
     ------------------------------------------------------------ */
  const world = byId("world");
  const sceneViewport = byId("scene-viewport");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111a14);
  scene.fog = new THREE.FogExp2(0x111a14, 0.014);

  const camera = new THREE.PerspectiveCamera(39, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(-3, 6.5, 16.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.appendChild(renderer.domElement);

  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: 0x746d5d, roughness: 0.72, metalness: 0.04 }),
    floorLine: new THREE.MeshStandardMaterial({ color: 0x918673, roughness: 0.8 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x304a3a, roughness: 0.86 }),
    sideWall: new THREE.MeshStandardMaterial({ color: 0x263d31, roughness: 0.9 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0x867e6e, roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x514638, roughness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x966b45, roughness: 0.58 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0xb78958, roughness: 0.56 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x303a34, roughness: 0.38, metalness: 0.62 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x26342c, roughness: 0.48, metalness: 0.18 }),
    board: new THREE.MeshStandardMaterial({ color: 0x183d30, roughness: 0.72 }),
    panelLight: new THREE.MeshStandardMaterial({ color: 0xf1e7c9, roughness: 0.32, emissive: 0x000000 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffe4a6, roughness: 0.26, emissive: 0x000000 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x8fb4a4, roughness: 0.19, metalness: 0.12, emissive: 0x385b4b, emissiveIntensity: 0.52 }),
    acBody: new THREE.MeshStandardMaterial({ color: 0xe0ddcf, roughness: 0.42 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xdcae8a, roughness: 0.68 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x30251c, roughness: 0.72 }),
  };

  const ambient = new THREE.HemisphereLight(0xc8d2bd, 0x192019, 0.68);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xf1d9a9, 1.18);
  sun.position.set(-5, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -11; sun.shadow.camera.right = 11;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  scene.add(sun);
  const windowLight = new THREE.PointLight(0x9cbe9e, 1.15, 15, 1.7);
  windowLight.position.set(5.1, 3.2, 0.6);
  scene.add(windowLight);
  const roomLight = new THREE.PointLight(0xffd589, 0, 12, 1.5);
  roomLight.position.set(0, 3.25, 0.1);
  roomLight.castShadow = true;
  scene.add(roomLight);
  const acLight = new THREE.PointLight(0x86c9db, 0, 7, 2);
  acLight.position.set(3.1, 3, -3.4);
  scene.add(acLight);

  // Palette presets recolor both the page and its Three.js atmosphere without reloading the room.
  const scenePalettes = {
    dusk:    { background:0x111a14, ambient:0xc8d2bd, ground:0x192019, sun:0xf1d9a9, window:0x9cbe9e },
    ocean:   { background:0x091b24, ambient:0xc1e4e8, ground:0x08151a, sun:0xb9e5ec, window:0x70c9d4 },
    dune:    { background:0x211a12, ambient:0xe0d0af, ground:0x21180f, sun:0xf2c889, window:0xd7aa76 },
    silk:    { background:0x191520, ambient:0xd8cae8, ground:0x140f1c, sun:0xd4b9e0, window:0xb9a0cf },
    aurora:  { background:0x071b17, ambient:0xc1e8d5, ground:0x06120f, sun:0x9ce7ca, window:0x59cda8 },
  };
  const themeLabels = { dusk:"Dusk", ocean:"Ocean", dune:"Dune", silk:"Silk", aurora:"Aurora" };
  function applyTheme(theme, persist = true) {
    const selected = scenePalettes[theme] ? theme : "dusk";
    const palette = scenePalettes[selected];
    document.documentElement.dataset.theme = selected;
    byId("theme-name").textContent = selected.toUpperCase();
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === selected;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const quickSwitch = byId("theme-switch");
    quickSwitch.setAttribute("aria-checked", String(selected === "ocean"));
    quickSwitch.title = `Quick switch between Dusk and Ocean · current theme: ${themeLabels[selected]}`;
    quickSwitch.setAttribute("aria-label", `Quick switch between Dusk and Ocean. Current theme: ${themeLabels[selected]}`);
    scene.background.setHex(palette.background);
    scene.fog.color.setHex(palette.background);
    ambient.color.setHex(palette.ambient);
    ambient.groundColor.setHex(palette.ground);
    sun.color.setHex(palette.sun);
    windowLight.color.setHex(palette.window);
    if (persist) { try { localStorage.setItem("classroom-codex-theme", selected); } catch (error) { /* Theme still works if storage is unavailable. */ } }
  }
  document.querySelectorAll("[data-theme-choice]").forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice)));
  byId("theme-switch").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "ocean" ? "dusk" : "ocean"));
  let savedTheme = "dusk";
  try { savedTheme = localStorage.getItem("classroom-codex-theme") || "dusk"; } catch (error) { /* Keep the default palette. */ }
  applyTheme(savedTheme, false);

  // Build the supplied Matrix rain as light decoration; it never intercepts pointer or keyboard input.
  const matrixPattern = byId("matrix-pattern");
  for (let column = 0; column < 40; column++) {
    const streak = document.createElement("i");
    streak.className = "studio-matrix-column";
    streak.style.left = `${column * 2.5}%`;
    streak.style.animationDelay = `-${((column * 13) % 47) / 10}s`;
    streak.style.animationDuration = `${2.5 + ((column * 17) % 28) / 10}s`;
    matrixPattern.appendChild(streak);
  }

  function box(parent, width, height, depth, x, y, z, material, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = options.receive !== false;
    if (options.rotation) mesh.rotation.set(...options.rotation);
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, radiusTop, radiusBottom, height, x, y, z, material, segments = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function tagDevice(object, device) {
    object.traverse((child) => {
      if (child.isMesh) { child.userData.device = device; pickableMeshes.push(child); }
    });
  }
  const pickableMeshes = [];

  // Floor and quiet tile seams give the room scale without visual clutter.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 9), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  for (let x = -5; x <= 5; x += 1) box(scene, 0.012, 0.004, 9, x, 0.008, 0, materials.floorLine, { cast: false });
  for (let z = -4; z <= 4; z += 1) box(scene, 11, 0.004, 0.012, 0, 0.008, z, materials.floorLine, { cast: false });

  // The front stays open like a cutaway architectural model for the showcase.
  box(scene, 11.2, 4.1, 0.22, 0, 2.05, -4.5, materials.wall);
  box(scene, 0.22, 4.1, 9, 5.5, 2.05, 0, materials.sideWall);
  box(scene, 0.22, 4.1, 5.85, -5.5, 2.05, -1.58, materials.sideWall);
  box(scene, 0.22, 4.1, 1.05, -5.5, 2.05, 3.98, materials.sideWall);
  // Wall skirting and exposed ceiling rails make the open model feel finished.
  box(scene, 11, 0.17, 0.12, 0, 0.085, -4.34, materials.trim);
  box(scene, 0.12, 0.17, 9, 5.34, 0.085, 0, materials.trim);
  box(scene, 0.12, 0.17, 5.8, -5.34, 0.085, -1.58, materials.trim);
  box(scene, 0.12, 0.17, 1, -5.34, 0.085, 3.98, materials.trim);
  for (let x = -4.5; x <= 4.5; x += 1.5) box(scene, 0.035, 0.035, 8.6, x, 4.03, 0, materials.trim, { cast: false });

  // Back-wall chalkboard and soft chalk marks.
  const boardFrame = box(scene, 4.4, 1.85, 0.13, 0, 2.45, -4.33, materials.wood);
  const boardFace = box(scene, 4.12, 1.58, 0.035, 0, 2.46, -4.245, materials.board, { cast: false });
  box(scene, 4.18, 0.075, 0.13, 0, 1.48, -4.25, materials.woodLight);
  const chalkMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd2ba, roughness: 0.9, transparent: true, opacity: 0.64 });
  box(scene, 1.18, 0.018, 0.012, -0.88, 2.78, -4.215, chalkMaterial, { cast: false });
  box(scene, 0.85, 0.018, 0.012, 0.74, 2.28, -4.215, chalkMaterial, { cast: false });
  cylinder(scene, 0.028, 0.028, 0.24, -3.9, 3.35, -4.34, materials.metal, 16).rotation.z = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), new THREE.MeshStandardMaterial({ color: 0xd8d0bb, roughness: 0.48, emissive: 0x27271d }));
  clockFace.position.set(-3.9, 3.35, -4.19); scene.add(clockFace);
  box(scene, 0.018, 0.13, 0.012, -3.9, 3.39, -4.17, materials.metal, { cast: false });
  box(scene, 0.11, 0.018, 0.012, -3.85, 3.31, -4.17, materials.metal, { cast: false });

  // Side-wall classroom door. It swings inward during the walk-in sequence.
  box(scene, 0.12, 2.88, 0.16, -5.34, 1.44, 1.35, materials.woodLight);
  box(scene, 0.12, 2.88, 0.16, -5.34, 1.44, 3.45, materials.woodLight);
  box(scene, 0.2, 0.17, 2.2, -5.34, 2.86, 2.4, materials.woodLight);
  const classroomDoor = new THREE.Group();
  classroomDoor.position.set(-5.35, 0, 3.42);
  const doorLeaf = box(classroomDoor, 0.12, 2.62, 2.0, 0, 1.31, -1.0, materials.wood);
  box(classroomDoor, 0.04, 0.5, 0.035, 0.09, 1.25, -0.24, materials.woodLight);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd6b772, metalness: 0.72, roughness: 0.3 }));
  handle.position.set(0.1, 1.2, -0.2); classroomDoor.add(handle);
  scene.add(classroomDoor);
  doorLeaf.userData.action = "door";
  pickableMeshes.push(doorLeaf);
  let doorOpenAmount = 0;
  let doorControlOpen = null;
  function syncDoorControl(open) {
    if (doorControlOpen === open) return;
    doorControlOpen = open;
    const button = byId("door-toggle");
    if (!button) return;
    button.textContent = open ? "Close door" : "Open door";
    button.setAttribute("aria-pressed", String(open));
  }
  function setDoorOpen(open) {
    doorOpenAmount = open ? 1 : 0;
    classroomDoor.rotation.y = open ? -1.36 : 0;
    syncDoorControl(open);
  }

  // Window, mullions, and a translucent shaft of daylight.
  const windowFrame = box(scene, 0.22, 2.1, 2.45, 5.34, 2.65, 0.55, materials.woodLight);
  const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(2.22, 1.86), materials.glass);
  windowPane.rotation.y = -Math.PI / 2;
  windowPane.position.set(5.205, 2.67, 0.55); scene.add(windowPane);
  box(scene, 0.08, 2.0, 0.065, 5.17, 2.65, 0.55, materials.wood, { cast: false });
  box(scene, 0.08, 0.065, 2.25, 5.17, 2.65, 0.55, materials.wood, { cast: false });
  const sunShaftMaterial = new THREE.MeshBasicMaterial({ color: 0xc6bb87, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false });
  const sunShaft = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.1), sunShaftMaterial);
  sunShaft.position.set(3.3, 1.75, 0.65); sunShaft.rotation.y = Math.PI / 2; scene.add(sunShaft);

  // Recessed light panels and warm lamp, all linked to the light control.
  const lightMeshes = [];
  const panelLightMaterial = materials.panelLight;
  [-2.1, 2.1].forEach((x) => {
    const panel = new THREE.Group(); panel.position.set(x, 3.92, -0.5); scene.add(panel);
    box(panel, 1.35, 0.12, 0.68, 0, 0, 0, materials.metal);
    const diffuser = box(panel, 1.19, 0.035, 0.52, 0, -0.07, 0, panelLightMaterial, { cast: false });
    lightMeshes.push(diffuser); tagDevice(panel, "light");
  });
  const lamp = new THREE.Group(); lamp.position.set(0, 3.56, 0.35); scene.add(lamp);
  cylinder(lamp, 0.035, 0.035, 0.36, 0, 0.21, 0, materials.metal, 10);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.28, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x8d8061, side: THREE.DoubleSide, roughness: 0.55 }));
  lampShade.position.y = -0.01; lamp.add(lampShade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), materials.bulb); bulb.position.y = -0.13; lamp.add(bulb);
  const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd580, transparent: true, opacity: 0, depthWrite: false }));
  lampGlow.position.y = -0.05; lamp.add(lampGlow);
  lightMeshes.push(bulb); tagDevice(lamp, "light");

  // Ceiling fan with a soft translucent blur disc when it is moving.
  const fan = new THREE.Group(); fan.position.set(1.2, 3.72, -1.4); scene.add(fan);
  cylinder(fan, 0.045, 0.045, 0.32, 0, 0.16, 0, materials.metal, 12);
  cylinder(fan, 0.15, 0.12, 0.12, 0, -0.03, 0, materials.metal, 16);
  for (let i = 0; i < 3; i++) {
    const bladeRoot = new THREE.Group(); bladeRoot.rotation.y = i * Math.PI * 2 / 3; fan.add(bladeRoot);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd5cfb8, roughness: 0.43, metalness: 0.18 });
    const blade = box(bladeRoot, 1.14, 0.035, 0.24, 0.62, 0, 0, bladeMat);
    blade.rotation.z = -0.04;
  }
  const fanBlur = new THREE.Mesh(new THREE.CircleGeometry(0.86, 48), new THREE.MeshBasicMaterial({ color: 0xd5ddca, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  fanBlur.rotation.x = -Math.PI / 2; fanBlur.position.y = -0.08; fan.add(fanBlur);
  tagDevice(fan, "fan");

  // Wall-mounted AC and status light.
  const acUnit = new THREE.Group(); acUnit.position.set(3.1, 3.35, -4.28); scene.add(acUnit);
  box(acUnit, 1.55, 0.5, 0.3, 0, 0, 0, materials.acBody);
  box(acUnit, 1.3, 0.055, 0.035, 0, -0.17, 0.17, materials.metal, { cast: false });
  const acLedMaterial = new THREE.MeshStandardMaterial({ color: 0x50635a, emissive: 0x000000 });
  const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), acLedMaterial); acLed.position.set(0.62, 0.13, 0.17); acUnit.add(acLed);
  tagDevice(acUnit, "ac");
  const airCount = 28;
  const airPositions = new Float32Array(airCount * 3);
  const airAges = Array.from({ length: airCount }, () => Math.random());
  const airGeometry = new THREE.BufferGeometry(); airGeometry.setAttribute("position", new THREE.BufferAttribute(airPositions, 3));
  const airMaterial = new THREE.PointsMaterial({ color: 0x9cdeeb, size: 0.075, transparent: true, opacity: 0, depthWrite: false });
  const airFlow = new THREE.Points(airGeometry, airMaterial); airFlow.frustumCulled = false; scene.add(airFlow);
  // Soft translucent spheres make the AC airflow read like cool floating air bubbles.
  const bubbleCount = 14;
  const bubbleGeometry = new THREE.SphereGeometry(0.075, 14, 12);
  const bubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x9be8f2, emissive: 0x246c7a, emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0, depthWrite: false });
  const airBubbles = Array.from({ length: bubbleCount }, (_, index) => {
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    bubble.position.set(3.1, 3.1, -3.9);
    bubble.scale.setScalar(0.65 + (index % 4) * 0.18);
    scene.add(bubble);
    return bubble;
  });

  // A live miniature display on the wall mirrors the dashboard state.
  const screenCanvas = document.createElement("canvas"); screenCanvas.width = 512; screenCanvas.height = 320;
  const screenContext = screenCanvas.getContext("2d");
  const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.encoding = THREE.sRGBEncoding;
  const wallScreen = new THREE.Group(); wallScreen.position.set(5.34, 2.15, -2.65); wallScreen.rotation.y = -Math.PI / 2; scene.add(wallScreen);
  box(wallScreen, 1.35, 0.9, 0.11, 0, 0, 0, materials.metal);
  const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(1.21, 0.74), new THREE.MeshBasicMaterial({ map: screenTexture }));
  screenFace.position.z = 0.062; wallScreen.add(screenFace);

  // Desks, chairs, and up to six seated low-poly student figures.
  const deskPositions = [];
  const deskRows = [-1.35, 0.72, 2.62];
  const deskCols = [-2.65, 0.05, 2.75];
  const deskTopMaterial = materials.woodLight;
  for (let row = 0; row < deskRows.length; row++) {
    for (let col = 0; col < 2; col++) {
      const x = deskCols[col === 0 ? 0 : 2];
      const z = deskRows[row];
      deskPositions.push({ x, z });
      const desk = new THREE.Group(); desk.position.set(x, 0, z); scene.add(desk);
      const top = box(desk, 1.48, 0.11, 0.88, 0, 0.82, 0, deskTopMaterial);
      top.rotation.x = -0.035;
      box(desk, 1.48, 0.08, 0.08, 0, 0.75, 0.43, materials.wood, { cast: false });
      [[-0.61,-0.34],[0.61,-0.34],[-0.61,0.34],[0.61,0.34]].forEach(([lx,lz]) => cylinder(desk,0.035,0.045,0.76,lx,0.38,lz,materials.metal,8));
      const chair = new THREE.Group(); chair.position.set(0, 0, 0.65); desk.add(chair);
      box(chair, 0.62, 0.09, 0.58, 0, 0.48, 0.04, materials.chair);
      box(chair, 0.62, 0.62, 0.09, 0, 0.78, 0.31, materials.chair);
      [[-0.24,-0.17],[0.24,-0.17],[-0.24,0.24],[0.24,0.24]].forEach(([lx,lz]) => cylinder(chair,0.025,0.035,0.46,lx,0.23,lz,materials.metal,8));
    }
  }

  function createStudent(seated, paletteIndex = 0) {
    const group = new THREE.Group();
    const tops = [0x566b82, 0x76634d, 0x6d7960, 0x805b55, 0x536c70, 0x766d8a];
    const topMaterial = new THREE.MeshStandardMaterial({ color: tops[paletteIndex % tops.length], roughness: 0.73 });
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x373c3d, roughness: 0.82 });
    cylinder(group, 0.21, 0.25, seated ? 0.57 : 0.65, 0, seated ? 1.03 : 1.12, 0, topMaterial, 12);
    const neck = cylinder(group, 0.07, 0.075, 0.12, 0, seated ? 1.36 : 1.48, 0, materials.skin, 10);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 14), materials.skin); head.position.set(0,seated ? 1.53 : 1.67,0); head.castShadow = true; group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.177, 16, 12, 0, Math.PI*2, 0, Math.PI*.58), materials.hair); hair.position.set(0,seated ? 1.58 : 1.73,0); group.add(hair);
    const armPivots = [];
    [-0.24,0.24].forEach((x) => {
      const pivot = new THREE.Group(); pivot.position.set(x, seated ? 1.25 : 1.38, 0); group.add(pivot);
      cylinder(pivot,0.065,0.075,0.52,0,-0.26,0,topMaterial,8);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07,10,10), materials.skin); hand.position.set(0,-0.51,0); pivot.add(hand);
      armPivots.push(pivot);
    });
    const legPivots = [];
    [-0.12,0.12].forEach((x) => {
      const pivot = new THREE.Group(); pivot.position.set(x, seated ? 0.7 : 0.62, 0); group.add(pivot);
      if (seated) {
        cylinder(pivot,0.09,0.11,0.54,x < 0 ? 0.02 : -0.02,-0.05,-0.2,pantsMaterial,8).rotation.x = Math.PI/2;
        cylinder(pivot,0.075,0.085,0.44,0,-0.3,-0.45,pantsMaterial,8);
      } else {
        cylinder(pivot,0.085,0.095,0.58,0,-0.29,0,pantsMaterial,8);
        cylinder(pivot,0.07,0.07,0.16,0,-0.6,0.03,materials.chair,8);
      }
      legPivots.push(pivot);
    });
    group.userData = { armPivots, legPivots, seated, progress: 0, target: 0 };
    return group;
  }

  const occupants = deskPositions.map((seat, index) => {
    const person = createStudent(true, index);
    person.position.set(seat.x, 0, seat.z + 0.65);
    person.visible = false; person.scale.setScalar(0.01); scene.add(person);
    return person;
  });
  const walkingStudent = createStudent(false, 0);
  walkingStudent.visible = false; scene.add(walkingStudent);

  // Subtle floating dust and cool air particles add motion without clutter.
  const dustCount = 70;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i=0;i<dustCount;i++) {
    dustPositions[i*3] = (Math.random()-.5)*9;
    dustPositions[i*3+1] = Math.random()*3.7+.15;
    dustPositions[i*3+2] = (Math.random()-.5)*7.6;
  }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions,3));
  const dust = new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xe5dcb9,size:0.023,transparent:true,opacity:0.26,depthWrite:false})); scene.add(dust);

  // A miniature screen uses a local canvas texture; it never needs an image file.
  function drawRoomScreen() {
    const c = screenContext;
    c.clearRect(0,0,512,320); c.fillStyle="#0c1510"; c.fillRect(0,0,512,320);
    c.strokeStyle="#50634c"; c.lineWidth=3; c.strokeRect(9,9,494,302);
    c.fillStyle="#b7c69b"; c.font="600 20px Manrope, sans-serif"; c.fillText("MITS  /  SMART ROOM",28,45);
    c.strokeStyle="#354536"; c.beginPath(); c.moveTo(28,61); c.lineTo(484,61); c.stroke();
    c.fillStyle=state.occupied?"#a8ddb0":"#8c9889"; c.font="500 34px Manrope, sans-serif"; c.fillText(state.occupied?`OCCUPIED · ${state.people}`:"ROOM EMPTY",28,112);
    c.fillStyle="#d9cfb7"; c.font="400 24px Manrope, sans-serif"; c.fillText(`${state.temperature.toFixed(1)} °C`,28,166);
    const parts = [`LIGHT ${state.light?"ON":"OFF"}`,`FAN ${state.fan?"ON":"OFF"}`,`AC ${state.ac?"ON":"OFF"}`];
    c.font="500 17px Manrope, sans-serif"; c.fillStyle="#b6c1ae";
    parts.forEach((part,index)=>c.fillText(part,28+index*150,226));
    c.fillStyle="#77856e"; c.font="400 14px Manrope, sans-serif"; c.fillText("SENSING  ·  COMFORT  ·  LESS WASTE",28,276);
    screenTexture.needsUpdate = true;
  }

  // Orbit view is used after the intro; the intro has its own slow camera path.
  const orbit = { theta: 0.76, phi: 1.02, distance: 17.5, target: new THREE.Vector3(0,1.1,0) };
  let cameraMode = "intro";
  let cameraTween = null;
  let userAdjustedRoomView = false;
  let introPointer = { x: 0, y: 0 };
  let introStart = null;
  let introPowerOn = false;
  let walkthroughFinished = false;
  let sceneLight = 0, fanSpeed = 0, acGlow = 0;
  let lastTime = performance.now();

  function orbitPosition() {
    const sinPhi = Math.sin(orbit.phi);
    return new THREE.Vector3(
      orbit.target.x + orbit.distance * sinPhi * Math.sin(orbit.theta),
      orbit.target.y + orbit.distance * Math.cos(orbit.phi),
      orbit.target.z + orbit.distance * sinPhi * Math.cos(orbit.theta)
    );
  }
  function updateOrbitCamera() { camera.position.copy(orbitPosition()); camera.lookAt(orbit.target); }
  // Keep the full room inside its card, including on short and narrow screens.
  function fitRoomView() {
    const aspect = Math.max(1, sceneViewport.clientWidth) / Math.max(1, sceneViewport.clientHeight);
    orbit.theta = 0.76;
    orbit.phi = 1.02;
    orbit.target.set(0, 1.1, 0);
    orbit.distance = clamp(17.5 * Math.sqrt(1.9 / aspect), 16, 21);
  }
  function flyToDashboard() {
    const destination = orbitPosition();
    cameraTween = { from: camera.position.clone(), to: destination, fromTarget: new THREE.Vector3(-3,1.2,1.2), toTarget: orbit.target.clone(), elapsed: 0, duration: reduceMotion ? 0 : 1.8 };
  }
  function resize() {
    const inDashboard = renderer.domElement.parentElement === sceneViewport;
    const width = inDashboard ? Math.max(1, sceneViewport.clientWidth) : window.innerWidth;
    const height = inDashboard ? Math.max(1, sceneViewport.clientHeight) : window.innerHeight;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  window.addEventListener("resize", () => {
    resize();
    if (renderer.domElement.parentElement === sceneViewport && cameraMode === "orbit" && !userAdjustedRoomView) {
      fitRoomView(); updateOrbitCamera();
    }
  });
  const sceneResizeObserver = new ResizeObserver(() => {
    if (renderer.domElement.parentElement === sceneViewport) {
      resize();
      if (cameraMode === "orbit" && !userAdjustedRoomView) { fitRoomView(); updateOrbitCamera(); }
    }
  });
  sceneResizeObserver.observe(sceneViewport);

  /* ------------------------------------------------------------
     Dashboard state, animation, and reusable controls.
     ------------------------------------------------------------ */
  function logEvent(message, kind = "") {
    const li = document.createElement("li"); li.className = `log-entry ${kind}`;
    const time = document.createElement("time"); time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    const text = document.createElement("span"); text.innerHTML = `<i class="log-dot"></i>${escapeText(message)}`;
    li.append(time,text); ui.log.prepend(li); state.logCount++;
    while (ui.log.children.length > 24) ui.log.lastElementChild.remove();
  }
  function escapeText(text) { return String(text).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char])); }
  function refreshDashboard() {
    const occupancyLabel = state.occupied ? `OCCUPIED · ${state.people}` : "EMPTY";
    ui.occupancy.textContent = occupancyLabel;
    ui.occupancy.className = state.occupied ? "occupied" : "empty";
    ui.occupancySource.textContent = state.source;
    ui.people.textContent = String(state.people);
    ui.cameraCount.textContent = String(state.people);
    ui.temp.innerHTML = `${state.temperature.toFixed(1)}<span>°C</span>`;
    ui.sceneTemp.innerHTML = `${state.temperature.toFixed(1)}° <small>C</small>`;
    ui.roomState.textContent = occupancyLabel;
    ui.beacon.classList.toggle("occupied", state.occupied);
    $("#camera-count").textContent = String(state.people);
    ui.modeToggle.checked = state.mode === "manual";
    byId("mode-word").textContent = state.mode === "manual" ? "ON · MANUAL" : "OFF · AUTOMATIC";
    ["light","fan","ac"].forEach((device) => {
      const on = state[device];
      byId(`${device}-state`).textContent = on ? "ON" : "OFF";
      byId(`${device}-state`).classList.toggle("on",on);
      byId(`${device}-toggle`).checked = on;
      $(`[data-device-row="${device}"] .device-glyph`).classList.toggle("on",on);
    });
    const automatic = state.mode === "auto";
    ["light","fan","ac"].forEach((device)=>byId(`${device}-toggle`).disabled=automatic);
    ui.modeCaption.textContent = automatic ? "AUTO" : "MANUAL";
    ui.modeExplain.textContent = automatic
      ? "Presence powers the room. It winds down when the room is empty."
      : "Manual control is active. Use the device switches to set the room.";
    ui.timer.textContent = state.remaining === null ? "—" : `${Math.ceil(state.remaining)}s`;
    drawRoomScreen();
  }

  function updateDeviceScene(device, on) {
    if (device === "light") lightTarget = on ? 1 : 0;
    if (device === "fan") fanTarget = on ? 13 : 0;
    if (device === "ac") {
      acTarget = on ? 1 : 0;
      acLedMaterial.emissive.setHex(on ? 0x48b8ca : 0x000000);
    }
  }
  let lightTarget = 0, fanTarget = 0, acTarget = 0;

  function sendSerialLine(message) {
    if (!serialPort || !serialPort.writable) return;
    serialQueue = serialQueue.then(async () => {
      if (!serialPort || !serialPort.writable) return;
      const writer = serialPort.writable.getWriter();
      try { await writer.write(new TextEncoder().encode(`${message}\n`)); }
      finally { writer.releaseLock(); }
    }).catch(() => logEvent("Could not send command to the USB board.", "warn"));
  }
  function setDevice(device, on, reason = "control changed") {
    if (state[device] === on) { refreshDashboard(); return; }
    state[device] = on;
    updateDeviceScene(device,on);
    refreshDashboard();
    logEvent(`${device.toUpperCase()} switched ${on ? "on" : "off"} · ${reason}`, on ? "" : "off");
    sendSerialLine(`${device.toUpperCase()}_${on ? "ON" : "OFF"}`);
    renderEnergy();
  }
  function checkClimate() {
    if (state.mode !== "auto" || !state.occupied) return;
    if (!state.ac && state.temperature >= state.setpoint + 1) setDevice("ac",true,`room is warmer than ${state.setpoint}°C`);
    else if (state.ac && state.temperature <= state.setpoint - 1) setDevice("ac",false,`room cooled to ${state.setpoint}°C`);
  }
  function setOccupied(occupied, reason = "presence update") {
    const changed = state.occupied !== occupied;
    state.occupied = occupied;
    if (state.mode === "auto") {
      if (occupied) {
        state.remaining = null;
        if (!state.light) setDevice("light",true,"room occupied");
        if (!state.fan) setDevice("fan",true,"room occupied");
        checkClimate();
      } else if (changed) {
        state.remaining = state.delay;
        logEvent(`Room empty · lights and fan will turn off in ${state.delay}s.`, "warn");
      }
    }
    if (changed) logEvent(occupied ? "Someone entered the classroom." : "The classroom is empty.", occupied ? "" : "off");
    refreshDashboard();
  }
  function setPeopleCount(count, source = state.source) {
    state.people = clamp(Math.round(Number(count) || 0),0,999);
    state.source = source;
    const seatedCount = Math.min(state.people,occupants.length);
    occupants.forEach((person,index)=>{
      const visible = index < seatedCount ? 1 : 0;
      person.userData.target = visible;
      person.userData.progress = visible;
      person.visible = Boolean(visible);
      person.scale.setScalar(visible ? 1 : 0.01);
    });
    refreshDashboard();
  }
  function setMode(mode) {
    state.mode = mode;
    state.remaining = null;
    refreshDashboard();
    logEvent(mode === "auto" ? "Automatic control enabled." : "Manual control enabled.");
    if (mode === "auto") {
      if (state.occupied) setOccupied(true,"automatic mode restored");
      else { state.remaining=state.delay;refreshDashboard();logEvent(`Empty room · auto-off timer set to ${state.delay}s.`,"warn"); }
    }
  }

  ui.modeToggle.addEventListener("change",(event)=>setMode(event.target.checked ? "manual" : "auto"));
  ["light","fan","ac"].forEach((device)=>byId(`${device}-toggle`).addEventListener("change",(event)=>setDevice(device,event.target.checked,"manual override")));
  byId("simulate-occupancy").addEventListener("click",()=>{
    const occupied = !state.occupied;
    setPeopleCount(occupied ? Math.max(1,state.people) : 0,"MANUAL / SIMULATION");
    setOccupied(occupied,"manual simulation");
    byId("simulate-occupancy").textContent = occupied ? "− Simulate room empty" : "＋ Simulate arrival";
  });
  byId("temperature-slider").addEventListener("input",(event)=>{
    state.temperature = Number(event.target.value); state.sensorTemperature = false;
    byId("temperature-readout").textContent = String(state.temperature);
    byId("temperature-mode-label").textContent="SIMULATED TEMPERATURE";
    refreshDashboard(); checkClimate();
  });
  byId("setpoint-slider").addEventListener("input",(event)=>{
    state.setpoint = Number(event.target.value); byId("setpoint-readout").textContent=String(state.setpoint); checkClimate();
  });
  byId("delay-slider").addEventListener("input",(event)=>{
    state.delay = Number(event.target.value); byId("delay-readout").textContent=String(state.delay);
    if (state.remaining !== null) state.remaining = state.delay;
  });
  // Click a 3D light/fan/AC to focus its dashboard switch.
  function focusDevice(device) {
    const row = $(`[data-device-row="${device}"]`);
    row.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    row.classList.add("focus-flash"); window.setTimeout(()=>row.classList.remove("focus-flash"),1200);
    const toggle=byId(`${device}-toggle`);
    if (!toggle.disabled) toggle.focus({preventScroll:true});
    else logEvent(`${device.toUpperCase()} is locked in Automatic mode. Switch to Manual to change it.`,"warn");
  }

  // Demo energy estimate. It compares device run-time with an always-on baseline.
  function renderEnergy() {
    const elapsed = Math.max(1,Math.floor((Date.now()-state.startTime)/1000));
    const watts = {light:state.lightWatts,fan:state.fanWatts,ac:state.acWatts};
    const usedWh = Object.keys(watts).reduce((sum,key)=>sum+watts[key]*state.onSeconds[key]/3600,0);
    const baselineWh = Object.values(watts).reduce((sum,value)=>sum+value,0)*elapsed/3600;
    const savedWh = Math.max(0,baselineWh-usedWh);
    const savedKwh = savedWh/1000, usedKwh=usedWh/1000;
    ui.energyUsed.textContent = `${usedKwh.toFixed(2)} kWh`;
    ui.energySaved.innerHTML = `${savedKwh.toFixed(2)} <small>kWh</small>`;
    ui.moneySaved.textContent = `₹${(savedKwh*state.tariff).toFixed(2)}`;
    ui.sessionTime.textContent = `${String(Math.floor(elapsed/60)).padStart(2,"0")}:${String(elapsed%60).padStart(2,"0")}`;
    ui.energyProgress.style.width = `${clamp(baselineWh ? savedWh/baselineWh*100 : 0,0,100)}%`;
  }
  [["light-watts","lightWatts"],["fan-watts","fanWatts"],["ac-watts","acWatts"],["tariff","tariff"]].forEach(([id,key])=>byId(id).addEventListener("input",(event)=>{
    const minimum = key === "tariff" ? 0 : 1;
    state[key] = Math.max(minimum,Number(event.target.value)||0); renderEnergy();
  }));

  window.setInterval(()=>{
    if (state.light) state.onSeconds.light++;
    if (state.fan) state.onSeconds.fan++;
    if (state.ac) state.onSeconds.ac++;
    if (state.mode === "auto" && state.remaining !== null) {
      state.remaining--;
      if (state.remaining <= 0) {
        state.remaining = null;
        if (state.light) setDevice("light",false,"empty-room timer ended");
        if (state.fan) setDevice("fan",false,"empty-room timer ended");
        if (state.ac) setDevice("ac",false,"empty-room timer ended");
        logEvent("Empty-room delay ended · devices switched off.","off");
      }
      refreshDashboard();
    }
    renderEnergy();
  },1000);

  /* ------------------------------------------------------------
     Camera detection: TensorFlow.js + COCO-SSD, all local to browser.
     ------------------------------------------------------------ */
  const cameraContext = ui.cameraOverlay.getContext("2d");
  let cameraStream = null, cocoModel = null, detectionTimer = null, detecting = false;
  let candidateCameraCount = null, candidateCameraSince = 0, stableCameraCount = 0;

  function prepareCameraOverlay() {
    const rect = ui.cameraOverlay.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (ui.cameraOverlay.width !== width) ui.cameraOverlay.width = width;
    if (ui.cameraOverlay.height !== height) ui.cameraOverlay.height = height;
    cameraContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    cameraContext.clearRect(0, 0, rect.width, rect.height);
    return { width: rect.width, height: rect.height };
  }

  function drawPersonDetections(people, videoWidth, videoHeight) {
    const view = prepareCameraOverlay();
    if (!view.width || !view.height) return;
    // Match the video element's object-fit: cover crop so boxes stay on people.
    const scale = Math.max(view.width / videoWidth, view.height / videoHeight);
    const offsetX = (view.width - videoWidth * scale) / 2;
    const offsetY = (view.height - videoHeight * scale) / 2;
    cameraContext.lineWidth = 2.5;
    cameraContext.font = "600 11px Manrope, sans-serif";
    cameraContext.textBaseline = "middle";

    people.forEach((person, index) => {
      const [sourceX, sourceY, sourceW, sourceH] = person.bbox;
      const x = sourceX * scale + offsetX;
      const y = sourceY * scale + offsetY;
      const w = sourceW * scale;
      const h = sourceH * scale;
      if (x + w < 0 || y + h < 0 || x > view.width || y > view.height) return;

      // Bright green square around each person, plus a circular head marker.
      cameraContext.shadowColor = "#43ff7a";
      cameraContext.shadowBlur = 9;
      cameraContext.strokeStyle = "#43ff7a";
      cameraContext.strokeRect(x, y, w, h);
      cameraContext.shadowBlur = 0;
      const markerX = x + w / 2;
      const markerY = y + Math.min(h * 0.13, 24);
      const markerRadius = clamp(w * 0.1, 7, 13);
      cameraContext.beginPath();
      cameraContext.arc(markerX, markerY, markerRadius, 0, Math.PI * 2);
      cameraContext.fillStyle = "rgba(67,255,122,.2)";
      cameraContext.fill();
      cameraContext.strokeStyle = "#9dffb6";
      cameraContext.lineWidth = 1.5;
      cameraContext.stroke();

      const label = `PERSON ${String(index + 1).padStart(2, "0")} · ${(person.score * 100).toFixed(0)}%`;
      const labelWidth = cameraContext.measureText(label).width + 12;
      const labelX = clamp(x, 3, Math.max(3, view.width - labelWidth - 3));
      const labelY = Math.max(12, y - 10);
      cameraContext.fillStyle = "rgba(7,21,10,.88)";
      cameraContext.fillRect(labelX, labelY - 8, labelWidth, 17);
      cameraContext.fillStyle = "#b7ffc8";
      cameraContext.fillText(label, labelX + 6, labelY);
    });
  }

  function acceptStableCameraCount(count) {
    candidateCameraCount = count;
    candidateCameraSince = performance.now();
    if (stableCameraCount === count) return;
    stableCameraCount = count;
    state.source = "CAMERA";
    setPeopleCount(stableCameraCount, state.source);
    if ((stableCameraCount > 0) !== state.occupied) setOccupied(stableCameraCount > 0, "camera detection");
  }

  async function startCamera() {
    if (cameraStream) return;
    if (!navigator.mediaDevices?.getUserMedia) { logEvent("Camera needs localhost or HTTPS. Use the arrival simulation meanwhile.","warn"); return; }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
      ui.cameraVideo.srcObject = cameraStream; await ui.cameraVideo.play();
      ui.cameraPlaceholder.hidden = true;
      ui.cameraStatus.classList.add("on"); ui.cameraStatus.innerHTML="<i></i> LIVE";
      ui.cameraButton.textContent="Stop camera";
      candidateCameraCount = null;
      stableCameraCount = 0;
      state.source="CAMERA"; setPeopleCount(0, state.source);
      if(state.occupied)setOccupied(false,"camera started");
      ui.modelStatus.textContent="Loading person model…";
      byId("camera-card").classList.add("loading-model");
      try { if (!cocoModel) cocoModel = await cocoSsd.load({base:"lite_mobilenet_v2"}); }
      finally { byId("camera-card").classList.remove("loading-model"); }
      ui.modelStatus.textContent="Person detection running locally";
      logEvent("Camera detection started.");
      detectionTimer = window.setInterval(runDetection,260);
    } catch (error) {
      logEvent(error.name === "NotAllowedError" ? "Camera permission denied. Use the manual arrival control." : "Camera or person model could not start.","warn");
      stopCamera(false);
      ui.modelStatus.textContent="Camera unavailable";
    }
  }
  function stopCamera(log = true) {
    byId("camera-card").classList.remove("loading-model");
    if (detectionTimer) clearInterval(detectionTimer); detectionTimer=null; detecting=false;
    if (cameraStream) cameraStream.getTracks().forEach((track)=>track.stop()); cameraStream=null;
    ui.cameraVideo.srcObject=null;
    prepareCameraOverlay();
    candidateCameraCount = null;
    stableCameraCount = 0;
    ui.cameraPlaceholder.hidden=false; ui.cameraStatus.classList.remove("on"); ui.cameraStatus.innerHTML="<i></i> OFF";
    ui.cameraButton.textContent="Start camera"; ui.modelStatus.textContent="Model idle";
    if (!serialPort) { state.source="MANUAL / SIMULATION"; setPeopleCount(0,state.source); if(state.occupied)setOccupied(false,"camera stopped"); }
    else { state.source="BOARD / PIR";setPeopleCount(boardMotion?1:0,state.source);if(boardMotion!==state.occupied)setOccupied(boardMotion,"camera stopped"); }
    if(log) logEvent("Camera detection stopped.","off");
  }
  async function runDetection() {
    if (!cocoModel || !cameraStream || detecting || ui.cameraVideo.readyState < 2) return;
    detecting=true;
    try {
      const predictions=await cocoModel.detect(ui.cameraVideo);
      const people=predictions.filter((item)=>item.class==="person" && item.score>=.4);
      const width=ui.cameraVideo.videoWidth||640, height=ui.cameraVideo.videoHeight||480;
      drawPersonDetections(people,width,height);
      acceptStableCameraCount(people.length);
    } catch(error) { ui.modelStatus.textContent="Detection paused"; }
    finally { detecting=false; }
  }
  ui.cameraButton.addEventListener("click",()=>cameraStream?stopCamera():startCamera());

  /* ------------------------------------------------------------
     Web Serial: reads TEMP:/MOTION: and sends relay commands.
     ------------------------------------------------------------ */
  let serialPort=null, serialReader=null, serialReadTask=null, serialQueue=Promise.resolve(), boardMotion=false;
  async function readSerial(port) {
    if(!port.readable)return;
    const reader=port.readable.getReader(); serialReader=reader; const decoder=new TextDecoder(); let buffer="";
    try {
      while(true){
        const {value,done}=await reader.read(); if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        const lines=buffer.split(/\r\n|\n|\r/);
        buffer=lines.pop() || "";
        lines.forEach(handleSerialLine);
      }
      buffer+=decoder.decode(); if(buffer.trim())handleSerialLine(buffer);
    } catch(error) { if(port===serialPort){ui.serialStatus.textContent="READ INTERRUPTED";logEvent("Hardware telemetry stream stopped.","warn");} }
    finally { try{reader.releaseLock();}catch(error){} if(serialReader===reader)serialReader=null; }
  }
  function handleSerialLine(line) {
    // Accept firmware lines, Serial Monitor prefixes/units, and CR-only line endings.
    const message=line.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").replace(/\uFEFF/g, "").trim();
    const tempMatch=message.match(/\bTEMP(?:ERATURE)?\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
    if(tempMatch){
      const value=Number(tempMatch[1]);
      if(Number.isFinite(value)&&value>=-20&&value<=80){
        state.temperature=value;
        state.sensorTemperature=true;
        byId("temperature-mode-label").textContent="LIVE SENSOR";
        byId("temperature-readout").textContent=value.toFixed(1);
        byId("temperature-slider").value=clamp(Math.round(value),16,40);
        ui.serialStatus.textContent="CONNECTED · LIVE TELEMETRY";
        refreshDashboard();
        checkClimate();
      }
    }
    const motionMatch=message.match(/\bMOTION\s*[:=]\s*([01])\b/i);
    if(motionMatch){boardMotion=motionMatch[1]==="1";if(!cameraStream){const count=boardMotion?1:0;state.source="BOARD / PIR";setPeopleCount(count,state.source);if(boardMotion!==state.occupied)setOccupied(boardMotion,"PIR sensor");}}
  }
  async function connectSerial() {
    if(!("serial" in navigator)){ui.serialStatus.textContent="USE CHROME / EDGE";logEvent("Web Serial needs desktop Chrome or Edge.","warn");return;}
    let port=null;
    try{
      port=await navigator.serial.requestPort();await port.open({baudRate:Number(ui.boardSpeed.value)||115200});serialPort=port;
      ui.serialStatus.textContent=port.readable?"CONNECTED · LISTENING":"CONNECTED · OUTPUT ONLY";ui.serialStatus.classList.add("connected");
      ui.serialButton.textContent="Disconnect board";state.source=cameraStream?"CAMERA":"BOARD / WAITING";byId("temperature-mode-label").textContent=state.sensorTemperature?"LAST SENSOR":"WAITING FOR SENSOR";byId("ac-note").textContent="Relay linked · thermostat";refreshDashboard();
      serialReadTask=readSerial(port);
      sendSerialLine(`LIGHT_${state.light?"ON":"OFF"}`);sendSerialLine(`FAN_${state.fan?"ON":"OFF"}`);sendSerialLine(`AC_${state.ac?"ON":"OFF"}`);
      logEvent("USB board connected. Relay states synchronised.");
    }catch(error){if(port?.opened){try{await port.close();}catch(closeError){}}serialPort=null;ui.serialStatus.textContent="NOT CONNECTED";ui.serialStatus.classList.remove("connected");logEvent("USB connection cancelled or failed.","warn");}
  }
  async function disconnectSerial() {
    const port=serialPort;serialPort=null;
    if(serialReader){try{await serialReader.cancel();}catch(error){}}
    if(serialReadTask)await serialReadTask;serialReadTask=null;
    if(port){try{await port.close();}catch(error){}}
    ui.serialStatus.textContent="NOT CONNECTED";ui.serialStatus.classList.remove("connected");ui.serialButton.textContent="Connect USB board";byId("ac-note").textContent="Relay ready · thermostat";
    byId("temperature-mode-label").textContent=state.sensorTemperature?"LAST SENSOR":"SIMULATED TEMPERATURE";
    if(!cameraStream){state.source="MANUAL / SIMULATION";setPeopleCount(0,state.source);if(state.occupied)setOccupied(false,"board disconnected");}
    else {state.source="CAMERA";setPeopleCount(stableCameraCount,state.source);if((stableCameraCount>0)!==state.occupied)setOccupied(stableCameraCount>0,"camera detection resumed");}
    refreshDashboard();logEvent("USB board disconnected.","off");
  }
  ui.serialButton.addEventListener("click",()=>serialPort?disconnectSerial():connectSerial());

  /* ------------------------------------------------------------
     Procedural walk-in: one side-wall door, person, lights, reveal.
     ------------------------------------------------------------ */
  const walkthroughCaptions=[
    [0,"THE CLASSROOM DOOR OPENS"],[1.45,"A STUDENT ENTERS FROM THE SIDE"],
    [3.05,"THE CLASSROOM DOOR SWINGS OPEN"],[4.35,"THE ROOM RECOGNISES A PRESENCE"],
    [5.25,"LIGHT, AIR, AND ATTENTION"],
  ];
  function setCaption(time) {
    let current=walkthroughCaptions[0]; walkthroughCaptions.forEach((entry)=>{if(time>=entry[0])current=entry;});
    const index=walkthroughCaptions.indexOf(current)+1;
    ui.captionIndex.textContent=String(index).padStart(2,"0");ui.captionText.textContent=current[1];
  }
  const walkPath=[
    {t:0.45,p:new THREE.Vector3(-8.1,0,3.0)},
    {t:1.9,p:new THREE.Vector3(-6.6,0,3.0)},
    {t:2.35,p:new THREE.Vector3(-5.9,0,3.0)},
    {t:3.55,p:new THREE.Vector3(-5.25,0,3.0)},
    {t:4.18,p:new THREE.Vector3(-4.35,0,2.6)},
    {t:5.52,p:new THREE.Vector3(-2.65,0,-0.70)},
  ];
  function walkPosition(time) {
    if(time<=walkPath[0].t)return walkPath[0].p.clone();
    for(let i=0;i<walkPath.length-1;i++){
      const a=walkPath[i],b=walkPath[i+1];
      if(time<=b.t){const t=smooth((time-a.t)/(b.t-a.t));return a.p.clone().lerp(b.p,t);}
    }
    return walkPath[walkPath.length-1].p.clone();
  }
  let dashboardRevealObserver = null;
  function revealDashboardPanels() {
    const panels = [...document.querySelectorAll(".dashboard .panel")];
    panels.forEach((panel, index) => {
      panel.classList.add("studio-reveal");
      panel.style.setProperty("--reveal-order", String(index));
    });
    if (reduceMotion || !("IntersectionObserver" in window)) {
      panels.forEach((panel) => panel.classList.add("is-revealed"));
      return;
    }
    if (!dashboardRevealObserver) {
      dashboardRevealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .08, rootMargin: "0px 0px -4% 0px" });
    }
    panels.forEach((panel) => { if (!panel.classList.contains("is-revealed")) dashboardRevealObserver.observe(panel); });
  }
  function startWalkthrough() {
    if(introStart!==null)return;
    if(!googleAuthenticated){ui.authNote.textContent="Sign in with Google before opening the classroom.";return;}
    if(reduceMotion){completeWalkthrough(true);return;}
    ui.authNote.textContent="Follow the walk-in. The system will wake when someone enters.";
    ui.intro.classList.add("walking");ui.introCopy.classList.add("walking");ui.caption.classList.add("active");
    introStart=performance.now();walkthroughFinished=false;introPowerOn=false;
    setDoorOpen(false);
    logEvent("Walk-through started · side-wall classroom door is opening.");
  }
  function completeWalkthrough(skip=false) {
    if(walkthroughFinished)return;
    if(!googleAuthenticated){ui.authNote.textContent="Sign in with Google before opening the classroom.";return;}
    walkthroughFinished=true;introStart=null;setDoorOpen(true);
    walkingStudent.visible=false;
    setPeopleCount(1,"INTRO WALK-IN");setOccupied(true,"student entered the room");
    // Finish the cinematic entry with the room's light and fan safely off.
    if(state.light)setDevice("light",false,"intro walk-in finished");
    if(state.fan)setDevice("fan",false,"intro walk-in finished");
    if(skip)logEvent("Walk-through skipped · classroom controls are ready.");
    ui.caption.classList.remove("active");ui.intro.classList.add("leaving");
    ui.dashboard.classList.add("active");ui.dashboard.setAttribute("aria-hidden","false");
    revealDashboardPanels();
    sceneViewport.appendChild(renderer.domElement);
    fitRoomView();resize();
    ui.header.classList.add("dashboard-mode");ui.headerBack.hidden=false;ui.headerLive.textContent="LIVE ROOM";
    byId("system-state-label").textContent="ROOM RESPONDING";
    flyToDashboard();
    logEvent("Classroom live · presence automation is active.");
  }
  ui.begin.addEventListener("click",startWalkthrough);
  // The new portrait splash reveals the existing front page; all original entry routes stay intact.
  ui.profileEnter.addEventListener("click",()=>{
    ui.profileIntro.classList.add("leaving");
    ui.profileIntro.setAttribute("aria-hidden","true");
    ui.header.classList.add("has-profile-back");
    ui.profileBack.hidden=false;
    window.setTimeout(()=>{ui.profileIntro.hidden=true;ui.begin.focus({preventScroll:true});},reduceMotion?0:1200);
  });
  ui.skip.addEventListener("click",()=>completeWalkthrough(true));
  ui.skipWalkthrough.addEventListener("click",()=>completeWalkthrough(true));
  function resetToFront() {
    if(cameraStream)stopCamera();
    ui.dashboard.classList.remove("active");ui.dashboard.setAttribute("aria-hidden","true");
    ui.header.classList.remove("dashboard-mode");ui.headerBack.hidden=true;ui.headerLive.textContent="EXPERIENCE";
    ui.intro.classList.remove("leaving","walking");ui.introCopy.classList.remove("walking");ui.caption.classList.remove("active");
    introStart=null;walkthroughFinished=false;introPowerOn=false;setDoorOpen(false);
    walkingStudent.visible=false;
    setMode("auto");setPeopleCount(0,"MANUAL / SIMULATION");setOccupied(false,"front page replay");
    ["light","fan","ac"].forEach((device)=>{if(state[device])setDevice(device,false,"returning to front page");});
    cameraMode="intro";cameraTween=null;userAdjustedRoomView=false;camera.position.set(-3,6.5,16.2);camera.lookAt(-3,1.2,1.2);
    world.appendChild(renderer.domElement);resize();
    byId("system-state-label").textContent=googleAuthenticated?"ACCOUNT READY":"SIGN-IN REQUIRED";ui.authNote.textContent=googleAuthenticated?"Google account connected. Enter the classroom when ready.":"Sign in with Google before opening the classroom.";
  }
  function returnToVivekIntro() {
    if (ui.dashboard.classList.contains("active")) resetToFront();
    ui.header.classList.remove("has-profile-back");
    ui.profileBack.hidden=true;
    ui.profileIntro.hidden=false;
    ui.profileIntro.classList.remove("leaving","ready");
    ui.profileIntro.setAttribute("aria-hidden","false");
    window.scrollTo(0,0);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ui.profileIntro.classList.add("ready");
      ui.profileEnter.focus({preventScroll:true});
    }));
  }
  ui.profileBack.addEventListener("click",returnToVivekIntro);
  ui.headerBack.addEventListener("click",resetToFront);
  ui.restart.addEventListener("click",resetToFront);

  // Optional low-volume synthetic room tone. It starts muted and only plays after a click.
  let audioContext=null, ambientSource=null, ambientGain=null;
  async function toggleAmbient() {
    const turnOn=ui.sound.getAttribute("aria-pressed")!=="true";
    if(turnOn){
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass){ui.authNote.textContent="Ambient sound is not supported in this browser.";return;}
      if(!audioContext){
        audioContext=new AudioContextClass();
        const length=audioContext.sampleRate*3;const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);const data=buffer.getChannelData(0);
        for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*0.3;
        ambientSource=audioContext.createBufferSource();ambientSource.buffer=buffer;ambientSource.loop=true;
        const filter=audioContext.createBiquadFilter();filter.type="lowpass";filter.frequency.value=360;
        ambientGain=audioContext.createGain();ambientGain.gain.value=0;
        ambientSource.connect(filter);filter.connect(ambientGain);ambientGain.connect(audioContext.destination);ambientSource.start();
      }
      await audioContext.resume();ambientGain.gain.cancelScheduledValues(audioContext.currentTime);ambientGain.gain.setTargetAtTime(0.035,audioContext.currentTime,0.7);
    }else if(audioContext&&ambientGain){ambientGain.gain.cancelScheduledValues(audioContext.currentTime);ambientGain.gain.setTargetAtTime(0,audioContext.currentTime,0.35);}
    ui.sound.setAttribute("aria-pressed",String(turnOn));ui.sound.title=turnOn?"Ambient sound is on":"Ambient sound is off";
  }
  ui.sound.addEventListener("click",toggleAmbient);

  // Firebase Auth verifies the Google sign-in and owns the persisted session.
  // The email is display-only; this app has no staff role or server-side data.
  document.addEventListener("classroom-auth-state", (event) => {
    const user = event.detail?.user || null;
    googleAuthenticated = Boolean(user && user.emailVerified);
    signedInEmail = googleAuthenticated ? user.email : "";
    byId("google-sign-out").hidden = !googleAuthenticated;
    byId("system-state-label").textContent = googleAuthenticated ? "ACCOUNT READY" : "SIGN-IN REQUIRED";
    if (googleAuthenticated) {
      ui.authNote.textContent = `Signed in as ${signedInEmail}.`;
    } else if (!ui.authNote.textContent.includes("setup") && !ui.authNote.textContent.includes("not configured")) {
      ui.authNote.textContent = "Sign in with Google before opening the classroom.";
    }
  });
  document.addEventListener("classroom-auth-success", () => {
    if (googleAuthenticated) startWalkthrough();
  });

  /* ------------------------------------------------------------
     Scene pointer controls. The canvas lives inside the Classroom 01 card
     after the intro, so its camera and clickable objects stay with that view.
     ------------------------------------------------------------ */
  const raycaster=new THREE.Raycaster(), ndc=new THREE.Vector2();
  function deviceAt(clientX,clientY){
    const rect=renderer.domElement.getBoundingClientRect();
    ndc.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height*2-1));
    raycaster.setFromCamera(ndc,camera);
    const hit=raycaster.intersectObjects(pickableMeshes,false)[0];
    return hit ? hit.object : null;
  }
  const pointers=new Map();let pinchStart=0,downPoint=null;
  function pointerGap(){const values=[...pointers.values()];return Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y)||1;}
  sceneViewport.addEventListener("pointerdown",(event)=>{
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});sceneViewport.setPointerCapture(event.pointerId);
    downPoint=pointers.size===1?{x:event.clientX,y:event.clientY}:null;
    if(pointers.size===2)pinchStart=pointerGap();
  });
  sceneViewport.addEventListener("pointermove",(event)=>{
    const pointer=pointers.get(event.pointerId);
    if(!pointer){if(event.pointerType==="mouse")sceneViewport.style.cursor=deviceAt(event.clientX,event.clientY)?"pointer":"grab";return;}
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer.x=event.clientX;pointer.y=event.clientY;
    if(pointers.size===2){const gap=pointerGap();orbit.distance=clamp(orbit.distance*pinchStart/gap,9.5,23);pinchStart=gap;userAdjustedRoomView=true;updateOrbitCamera();}
    else if(cameraMode==="orbit"){orbit.theta-=dx*.005;orbit.phi=clamp(orbit.phi-dy*.004,.55,1.4);userAdjustedRoomView=true;updateOrbitCamera();}
  });
  function pointerEnd(event,allowClick){
    const moved=downPoint?Math.hypot(event.clientX-downPoint.x,event.clientY-downPoint.y):99;
    pointers.delete(event.pointerId);
    if(allowClick&&moved<7&&cameraMode==="orbit"){
      const hit=deviceAt(event.clientX,event.clientY);
      if(hit?.userData.action==="door")setDoorOpen(doorOpenAmount<.5);
      else if(hit?.userData.device){const device=hit.userData.device;setDevice(device,!state[device],"3D classroom click");}
    }
    downPoint=null;
  }
  sceneViewport.addEventListener("pointerup",(event)=>pointerEnd(event,true));
  sceneViewport.addEventListener("pointercancel",(event)=>pointerEnd(event,false));
  sceneViewport.addEventListener("wheel",(event)=>{event.preventDefault();orbit.distance=clamp(orbit.distance+event.deltaY*.012,9.5,23);userAdjustedRoomView=true;if(cameraMode==="orbit")updateOrbitCamera();},{passive:false});
  byId("zoom-in").addEventListener("click",()=>{orbit.distance=clamp(orbit.distance-1.2,9.5,23);userAdjustedRoomView=true;updateOrbitCamera();});
  byId("zoom-out").addEventListener("click",()=>{orbit.distance=clamp(orbit.distance+1.2,9.5,23);userAdjustedRoomView=true;updateOrbitCamera();});
  byId("reset-view").addEventListener("click",()=>{userAdjustedRoomView=false;fitRoomView();updateOrbitCamera();});
  byId("door-toggle").addEventListener("click",()=>setDoorOpen(doorOpenAmount<.5));
  ui.intro.addEventListener("pointermove",(event)=>{introPointer.x=(event.clientX/window.innerWidth-.5)*2;introPointer.y=(event.clientY/window.innerHeight-.5)*2;});

  // Ambient motion is light and state-driven; reduced-motion users get a static scene.
  function updateWalkthrough(time) {
    if(introStart===null||walkthroughFinished)return;
    const elapsed=(performance.now()-introStart)/1000;
    doorOpenAmount=smooth((elapsed-.55)/.78);classroomDoor.rotation.y=-1.36*doorOpenAmount;syncDoorControl(doorOpenAmount>=.5);
    if(elapsed>.45&&elapsed<5.52){
      walkingStudent.visible=true;
      const position=walkPosition(elapsed);walkingStudent.position.copy(position);
      const next=walkPosition(Math.min(elapsed+.06,5.52));const dx=next.x-position.x,dz=next.z-position.z;
      if(Math.abs(dx)+Math.abs(dz)>.002)walkingStudent.rotation.y=Math.atan2(-dx,-dz);
      const moving=elapsed<5.3?1:0;const step=Math.sin(elapsed*10.5)*.42*moving;
      walkingStudent.userData.legPivots[0].rotation.x=step;walkingStudent.userData.legPivots[1].rotation.x=-step;
      walkingStudent.userData.armPivots[0].rotation.x=-step*.7;walkingStudent.userData.armPivots[1].rotation.x=step*.7;
      walkingStudent.position.y=Math.abs(Math.sin(elapsed*10.5))*.035*moving;
    }
    if(elapsed>4.75&&!introPowerOn){introPowerOn=true;setPeopleCount(1,"INTRO WALK-IN");setOccupied(true,"student walked in");}
    setCaption(elapsed);
    if(cameraMode==="intro"){
      const travel=smooth(elapsed/5.5);
      camera.position.set(-3+introPointer.x*.22,5.9-travel*.35,16.2-travel*1.5);
      camera.lookAt(-3+introPointer.x*.18,1.35+introPointer.y*.08,1.2-travel*.3);
    }
    if(elapsed>6.35)completeWalkthrough();
  }

  let firstSceneFrame = false;
  function animate(now) {
    requestAnimationFrame(animate);
    const frameMs = Math.min(now - lastTime, 100);
    const dt=frameMs/1000;lastTime=now;
    updateWalkthrough(now);
    if(cameraTween){
      cameraTween.elapsed+=dt;const progress=cameraTween.duration?Math.min(1,cameraTween.elapsed/cameraTween.duration):1;
      const eased=1-Math.pow(1-progress,3);camera.position.lerpVectors(cameraTween.from,cameraTween.to,eased);
      const target=cameraTween.fromTarget.clone().lerp(cameraTween.toTarget,eased);camera.lookAt(target);
      if(progress>=1){cameraTween=null;cameraMode="orbit";updateOrbitCamera();}
    }else if(cameraMode==="intro"&&introStart===null){camera.position.x+=(-3+introPointer.x*.18-camera.position.x)*Math.min(1,dt*1.5);camera.lookAt(-3+introPointer.x*.14,1.35+introPointer.y*.06,1.2);}

    const blend=Math.min(1,dt*3.4);
    sceneLight+=(lightTarget-sceneLight)*blend;fanSpeed+=(fanTarget-fanSpeed)*Math.min(1,dt*1.8);acGlow+=(acTarget-acGlow)*blend;
    ambient.intensity=.42+.25*sceneLight;
    roomLight.intensity=2.5*sceneLight;roomLight.color.setHex(0xffd589);
    panelLightMaterial.emissive.setRGB(.5*sceneLight,.39*sceneLight,.17*sceneLight);
    materials.bulb.emissive.setRGB(.82*sceneLight,.58*sceneLight,.22*sceneLight);
    lampGlow.material.opacity=.22*sceneLight;
    fan.rotation.y+=fanSpeed*dt;fanBlur.material.opacity=Math.min(.1,fanSpeed*.0075);
    acLight.intensity=1.1*acGlow;airMaterial.opacity=.2*acGlow;bubbleMaterial.opacity=.62*acGlow;acLedMaterial.emissiveIntensity=acGlow*1.6;
    if(acGlow>.01){
      for(let i=0;i<airCount;i++){
        airAges[i]=(airAges[i]+dt*.27)%1;
        airPositions[i*3]=3.1+((i%7)-3)*.16+Math.sin(airAges[i]*6+i)*.045;
        airPositions[i*3+1]=3.05-airAges[i]*1.55;
        airPositions[i*3+2]=-3.9+airAges[i]*1.4;
      }
      airBubbles.forEach((bubble,index)=>{
        const phase=(airAges[index]+index/bubbleCount)%1;
        bubble.position.set(3.1+Math.sin(phase*7+index)*.28,3.12-phase*1.55,-3.95+phase*1.45);
        bubble.scale.setScalar(.55+(index%4)*.15+Math.sin(now*.002+index)*.06);
      });
      airGeometry.attributes.position.needsUpdate=true;
    }
    occupants.forEach((person)=>{
      const user=person.userData;const speed=reduceMotion?1:dt*2.5;
      user.progress=user.target>user.progress?Math.min(user.target,user.progress+speed):Math.max(user.target,user.progress-speed);
      person.visible=user.progress>.01;const eased=smooth(user.progress);person.scale.setScalar(Math.max(.01,eased));
      if(!reduceMotion)person.position.y=Math.sin(now*.0018+person.position.x)*.018*user.progress;
    });
    if(!reduceMotion){
      const points=dustGeometry.attributes.position.array;
      for(let i=0;i<dustCount;i++){points[i*3+1]+=.0025;if(points[i*3+1]>3.8)points[i*3+1]=.15;}
      dustGeometry.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,camera);
    if (!firstSceneFrame) {
      firstSceneFrame = true;
      ui.profileIntro.classList.add("ready");
      requestAnimationFrame(() => ui.loading.classList.add("gone"));
    }
  }

  // The service worker caches the page shell; external model/CDN assets need internet.
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  refreshDashboard();renderEnergy();drawRoomScreen();
  logEvent("System initialized · waiting for a classroom entry.");
  requestAnimationFrame(animate);
})();
