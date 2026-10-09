import * as THREE from 'three';

export interface KartMeshRefs {
  root: THREE.Group;
  chassis: THREE.Group;
  steeringWheel: THREE.Group;
  wheels: THREE.Mesh[];
  frontPivots: THREE.Group[];
  driverHead: THREE.Group;
  driverArms: THREE.Group;
}

export interface KartOptions {
  isGhost?: boolean;
  driverName?: string;
  number?: number;
  bodyColor?: number;
  suitColor?: number;
  helmetColor?: number;
}

/**
 * Creates texture for the Nassau panel and side pods with Driver Name & Number.
 */
function createNassauDecal(driverName: string, raceNumber: number, accentColor = '#00d4ff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, 256, 256);

  // Side accent stripes
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 16, 256);
  ctx.fillRect(240, 0, 16, 256);

  ctx.fillStyle = '#ff2a4b';
  ctx.fillRect(20, 26, 216, 6);

  // Big Race Number (e.g. 24)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 110px "Chakra Petch", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(raceNumber), 128, 115);

  // Driver Name: JAC
  ctx.fillStyle = accentColor;
  ctx.font = '900 36px "Poppins", sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText(driverName.toUpperCase(), 128, 195);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 15px "Poppins", sans-serif';
  ctx.fillText('FATKARTS RACING', 128, 226);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Creates Helmet visor / forehead decal for Jac.
 */
function createDriverHelmetDecal(driverName: string, accentColor = '#00d4ff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 128, 64);

  // Center crest badge
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(16, 12, 96, 40, 8);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = '900 24px "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(driverName.toUpperCase(), 64, 32);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Builds the Fatkart Go-Kart model and Driver (Jac or AI opponents).
 */
export function buildFatkart(options: boolean | KartOptions = false): KartMeshRefs {
  const opts: KartOptions = typeof options === 'boolean'
    ? { isGhost: options }
    : options;

  const isGhost = opts.isGhost ?? false;
  const driverName = opts.driverName ?? 'Jac';
  const raceNumber = opts.number ?? 24;
  const bodyColor = opts.bodyColor ?? 0x0f1115;
  const suitColor = opts.suitColor ?? 0x111317;
  const helmetColor = opts.helmetColor ?? 0x1a212d;

  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);

  const wheels: THREE.Mesh[] = [];
  const frontPivots: THREE.Group[] = [];

  const nassauTex = createNassauDecal(driverName, raceNumber);
  const helmetDecalTex = createDriverHelmetDecal(driverName);

  let matFrame: THREE.Material;
  let matBody: THREE.Material;
  let matNassau: THREE.Material;
  let matTire: THREE.Material;
  let matRim: THREE.Material;
  let matEngine: THREE.Material;
  let matExhaust: THREE.Material;
  let matDriverSuit: THREE.Material;
  let matHelmet: THREE.Material;
  let matVisor: THREE.Material;
  let matDecal: THREE.Material;

  if (isGhost) {
    // Holographic iridescent phantom material for ghost kart
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38e5ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    matFrame = ghostMat;
    matBody = ghostMat;
    matNassau = ghostMat;
    matTire = new THREE.MeshBasicMaterial({ color: 0x1f88aa, transparent: true, opacity: 0.3, depthWrite: false });
    matRim = ghostMat;
    matEngine = ghostMat;
    matExhaust = ghostMat;
    matDriverSuit = ghostMat;
    matHelmet = new THREE.MeshBasicMaterial({ color: 0x80f2ff, transparent: true, opacity: 0.5, depthWrite: false });
    matVisor = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
    matDecal = ghostMat;
  } else {
    // Solid materials
    matFrame = new THREE.MeshLambertMaterial({ color: 0x181a1f, flatShading: true });
    matBody = new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true });
    matNassau = new THREE.MeshLambertMaterial({ map: nassauTex, flatShading: false });
    matTire = new THREE.MeshLambertMaterial({ color: 0x151618, flatShading: true });
    matRim = new THREE.MeshLambertMaterial({ color: 0xd2d7e0, flatShading: true });
    matEngine = new THREE.MeshLambertMaterial({ color: 0x5a606e, flatShading: true });
    matExhaust = new THREE.MeshLambertMaterial({ color: 0xb5bcc7, flatShading: true });
    matDriverSuit = new THREE.MeshLambertMaterial({ color: suitColor, flatShading: true });
    matHelmet = new THREE.MeshStandardMaterial({
      color: helmetColor,
      roughness: 0.25,
      metalness: 0.6
    });
    matVisor = new THREE.MeshStandardMaterial({
      color: 0x091018,
      roughness: 0.08,
      metalness: 0.95,
      emissive: 0x002233,
      emissiveIntensity: 0.3
    });
    matDecal = new THREE.MeshBasicMaterial({ map: helmetDecalTex });
  }

  // 1. Tubular Steel Chassis Frame
  const tubeMat = matFrame;
  function addTube(radius: number, length: number, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], parent = chassis) {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 8);
    const m = new THREE.Mesh(geo, tubeMat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    parent.add(m);
    return m;
  }

  // Main chassis side rails & bumpers
  addTube(0.04, 2.3, [-0.46, 0.22, 0], [Math.PI / 2, 0, 0]);
  addTube(0.04, 2.3, [0.46, 0.22, 0], [Math.PI / 2, 0, 0]);
  addTube(0.04, 0.92, [0, 0.22, 1.1], [0, 0, Math.PI / 2]);
  addTube(0.04, 0.92, [0, 0.22, 0.2], [0, 0, Math.PI / 2]);
  addTube(0.04, 0.92, [0, 0.22, -1.0], [0, 0, Math.PI / 2]);

  // Front bumper hoop
  addTube(0.038, 1.35, [0, 0.22, 1.35], [0, 0, Math.PI / 2]);
  addTube(0.038, 0.4, [0.65, 0.22, 1.18], [0, Math.PI / 4, Math.PI / 2]);
  addTube(0.038, 0.4, [-0.65, 0.22, 1.18], [0, -Math.PI / 4, Math.PI / 2]);

  // Rear bumper protection bar
  addTube(0.04, 1.4, [0, 0.22, -1.25], [0, 0, Math.PI / 2]);
  addTube(0.04, 0.35, [0.68, 0.22, -1.1], [0, -Math.PI / 3, Math.PI / 2]);
  addTube(0.04, 0.35, [-0.68, 0.22, -1.1], [0, Math.PI / 3, Math.PI / 2]);

  // Side pod nerf bars
  addTube(0.035, 1.1, [0.72, 0.23, -0.05], [Math.PI / 2, 0, 0]);
  addTube(0.035, 1.1, [-0.72, 0.23, -0.05], [Math.PI / 2, 0, 0]);

  // 2. Bodywork: Side Pods, Front Wedge Nosecone & Nassau Panel
  const podGeo = new THREE.BoxGeometry(0.28, 0.22, 1.25);
  const leftPod = new THREE.Mesh(podGeo, matBody);
  leftPod.position.set(-0.76, 0.28, -0.05);
  chassis.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo, matBody);
  rightPod.position.set(0.76, 0.28, -0.05);
  chassis.add(rightPod);

  const noseGeo = new THREE.BoxGeometry(1.28, 0.16, 0.55);
  const nose = new THREE.Mesh(noseGeo, matBody);
  nose.position.set(0, 0.26, 1.28);
  nose.rotation.x = -0.15;
  chassis.add(nose);

  // Nassau Panel
  const nassauGeo = new THREE.BoxGeometry(0.38, 0.52, 0.04);
  const nassau = new THREE.Mesh(nassauGeo, matNassau);
  nassau.position.set(0, 0.52, 0.72);
  nassau.rotation.x = -0.42;
  chassis.add(nassau);

  // Floor tray
  const floorMat = isGhost ? matFrame : new THREE.MeshLambertMaterial({ color: 0x22262d, flatShading: true });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.02, 1.8), floorMat);
  floor.position.set(0, 0.19, 0.1);
  chassis.add(floor);

  // 3. Ergonomic Kart Bucket Seat
  const seatMat = isGhost ? matFrame : new THREE.MeshLambertMaterial({ color: 0x121418, flatShading: true });
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), seatMat);
  seatBase.position.set(0, 0.26, -0.32);
  chassis.add(seatBase);

  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.1), seatMat);
  seatBack.position.set(0, 0.55, -0.6);
  seatBack.rotation.x = -0.32;
  chassis.add(seatBack);

  // 4. 125cc Kart Engine & Tuned Exhaust Chamber
  const engBlock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.32), matEngine);
  engBlock.position.set(0.44, 0.36, -0.38);
  chassis.add(engBlock);

  const engHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 8), matEngine);
  engHead.position.set(0.44, 0.56, -0.38);
  chassis.add(engHead);

  const exhaustCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.44, 0.52, -0.45),
    new THREE.Vector3(0.52, 0.44, -0.65),
    new THREE.Vector3(0.38, 0.36, -0.92),
    new THREE.Vector3(0.15, 0.36, -1.12),
    new THREE.Vector3(-0.15, 0.36, -1.18)
  ]);
  const exhaustGeo = new THREE.TubeGeometry(exhaustCurve, 16, 0.055, 8, false);
  const exhaust = new THREE.Mesh(exhaustGeo, matExhaust);
  chassis.add(exhaust);

  const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.42, 8), matExhaust);
  silencer.rotation.z = Math.PI / 2;
  silencer.position.set(-0.35, 0.36, -1.18);
  chassis.add(silencer);

  const rearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8), matExhaust);
  rearAxle.rotation.z = Math.PI / 2;
  rearAxle.position.set(0, 0.24, -0.85);
  chassis.add(rearAxle);

  // 5. Fatkarts Wide Slick Wheels & Tires
  const wheelDefs: { x: number; z: number; isFront: boolean; tireW: number; tireR: number }[] = [
    { x: -0.74, z: 0.88, isFront: true, tireW: 0.32, tireR: 0.28 },
    { x: 0.74, z: 0.88, isFront: true, tireW: 0.32, tireR: 0.28 },
    { x: -0.80, z: -0.85, isFront: false, tireW: 0.46, tireR: 0.31 },
    { x: 0.80, z: -0.85, isFront: false, tireW: 0.46, tireR: 0.31 }
  ];

  wheelDefs.forEach(def => {
    const pivot = new THREE.Group();
    pivot.position.set(def.x, def.tireR, def.z);

    const tGeo = new THREE.CylinderGeometry(def.tireR, def.tireR, def.tireW, 14);
    tGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tGeo, matTire);

    const rimGeo = new THREE.CylinderGeometry(def.tireR * 0.62, def.tireR * 0.62, def.tireW + 0.01, 10);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, matRim);
    tire.add(rim);

    const nutMat = isGhost ? matRim : new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, def.tireW + 0.03, 6), nutMat);
    nut.rotateZ(Math.PI / 2);
    tire.add(nut);

    pivot.add(tire);
    chassis.add(pivot);
    wheels.push(tire);

    if (def.isFront) frontPivots.push(pivot);
  });

  // 6. Steering Column & Flat-Bottom D-Shape Steering Wheel
  addTube(0.03, 0.65, [0, 0.46, 0.38], [-0.55, 0, 0]);
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(0, 0.68, 0.22);
  steeringWheel.rotation.x = -0.55;
  chassis.add(steeringWheel);

  const wheelRimMat = isGhost ? matFrame : new THREE.MeshLambertMaterial({ color: 0x1f232b, flatShading: true });
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 8, 16), wheelRimMat);
  steeringWheel.add(wheelRim);

  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.04), wheelRimMat);
  steeringWheel.add(spoke);

  const dashDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.02),
    isGhost ? matFrame : new THREE.MeshBasicMaterial({ color: 0x00ff88 })
  );
  dashDisplay.position.set(0, 0, 0.02);
  steeringWheel.add(dashDisplay);

  // 7. DRIVER: JAC
  const driverGroup = new THREE.Group();
  chassis.add(driverGroup);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.28), matDriverSuit);
  torso.position.set(0, 0.62, -0.38);
  torso.rotation.x = -0.22;
  driverGroup.add(torso);

  // Harness belts
  const beltMat = isGhost ? matFrame : new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const beltL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.02), beltMat);
  beltL.position.set(-0.11, 0.62, -0.24);
  beltL.rotation.x = -0.22;
  driverGroup.add(beltL);

  const beltR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.02), beltMat);
  beltR.position.set(0.11, 0.62, -0.24);
  beltR.rotation.x = -0.22;
  driverGroup.add(beltR);

  // Driver legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.72), matDriverSuit);
  legL.position.set(-0.16, 0.32, 0.12);
  driverGroup.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.72), matDriverSuit);
  legR.position.set(0.16, 0.32, 0.12);
  driverGroup.add(legR);

  // Driver arms
  const driverArms = new THREE.Group();
  driverGroup.add(driverArms);

  const armGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.46, 8);
  const armL = new THREE.Mesh(armGeo, matDriverSuit);
  armL.position.set(-0.24, 0.62, -0.05);
  armL.rotation.set(0.85, 0, 0.35);
  driverArms.add(armL);

  const armR = new THREE.Mesh(armGeo, matDriverSuit);
  armR.position.set(0.24, 0.62, -0.05);
  armR.rotation.set(0.85, 0, -0.35);
  driverArms.add(armR);

  const gloveMat = isGhost ? matDriverSuit : new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), gloveMat);
  gloveL.position.set(-0.16, 0.68, 0.20);
  driverArms.add(gloveL);

  const gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), gloveMat);
  gloveR.position.set(0.16, 0.68, 0.20);
  driverArms.add(gloveR);

  // DRIVER HEAD & JAC'S RACING HELMET
  const driverHead = new THREE.Group();
  driverHead.position.set(0, 0.94, -0.32);
  driverGroup.add(driverHead);

  // Sleek racing helmet shell
  const helmetShellGeo = new THREE.SphereGeometry(0.21, 16, 14);
  helmetShellGeo.scale(0.94, 1.02, 1.05);
  const helmetShell = new THREE.Mesh(helmetShellGeo, matHelmet);
  driverHead.add(helmetShell);

  // Modern aerodynamic chin bar
  const chinGeo = new THREE.BoxGeometry(0.22, 0.12, 0.16);
  const chin = new THREE.Mesh(chinGeo, matHelmet);
  chin.position.set(0, -0.10, 0.14);
  driverHead.add(chin);

  // Aerodynamic curved visor
  const visorGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.10, 14, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
  visorGeo.rotateY(Math.PI / 2);
  const visor = new THREE.Mesh(visorGeo, matVisor);
  visor.position.set(0, 0.02, 0.06);
  driverHead.add(visor);

  // Jac Forehead Badge
  const decalGeo = new THREE.PlaneGeometry(0.12, 0.06);
  const decalMesh = new THREE.Mesh(decalGeo, matDecal);
  decalMesh.position.set(0, 0.13, 0.21);
  decalMesh.rotation.x = -0.22;
  driverHead.add(decalMesh);

  // Ground contact shadow
  if (!isGhost) {
    const shadowGeo = new THREE.PlaneGeometry(1.9, 3.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.05;
    root.add(shadow);
  }

  return {
    root,
    chassis,
    steeringWheel,
    wheels,
    frontPivots,
    driverHead,
    driverArms
  };
}
