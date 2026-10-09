import * as THREE from 'three';
import { TrackGeometryData } from './tracks';

export interface BuiltTrack {
  group: THREE.Group;
  dispose: () => void;
}

export function buildTrackScene(track: TrackGeometryData): BuiltTrack {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const { N, C, T, L, elev, config } = track;
  const HW = config.roadWidth;
  const KERB = config.kerbWidth;
  const WALL = config.wallDistance;

  const matFlat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const matFlat2 = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  disposables.push(matFlat, matFlat2);

  const P = (i: number, off: number, yOffset = 0) => {
    return new THREE.Vector3(
      C[i].x + L[i].x * off,
      elev[i] + yOffset,
      C[i].z + L[i].z * off
    );
  };

  function pushTri(pos: number[], col: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  }

  function buildMesh(pos: number[], col: number[], mat: THREE.Material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    disposables.push(g);
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    group.add(m);
    return m;
  }

  function flat(offH: number, offL: number, yOff: number, fn: (i: number) => THREE.Color | null) {
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < N; i++) {
      const c = fn(i);
      if (!c) continue;
      const j = (i + 1) % N;
      const A = P(i, offH, yOff);
      const B = P(i, offL, yOff);
      const Cc = P(j, offH, yOff);
      const D = P(j, offL, yOff);
      pushTri(pos, col, A, B, Cc, c);
      pushTri(pos, col, B, D, Cc, c);
    }
    return buildMesh(pos, col, matFlat);
  }

  function wall(off: number, h: number, fn: (i: number) => THREE.Color) {
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < N; i++) {
      const c = fn(i);
      const j = (i + 1) % N;
      const A = P(i, off, 0);
      const A2 = P(i, off, h);
      const B = P(j, off, 0);
      const B2 = P(j, off, h);
      pushTri(pos, col, A, A2, B, c);
      pushTri(pos, col, A2, B2, B, c);
    }
    return buildMesh(pos, col, matFlat2);
  }

  const col = (h: number) => new THREE.Color(h);
  const roadA = col(config.roadColorA);
  const roadB = col(config.roadColorB);
  const kerbA = col(config.kerbColorA);
  const kerbB = col(config.kerbColorB);
  const wallA = col(config.wallColorA);
  const wallB = col(config.wallColorB);
  const white = col(0xf0f3f6);
  const gravelA = col(0x272d37);
  const gravelB = col(0x212630);

  // Runoff gravel / asphalt runoff
  flat(WALL, HW + KERB, 0.0, (i) => (i % 6 < 3 ? gravelA : gravelB));
  flat(-HW - KERB, -WALL, 0.0, (i) => (i % 6 < 3 ? gravelA : gravelB));

  // Main track surface
  flat(HW, -HW, 0.02, (i) => (i % 8 < 4 ? roadA : roadB));

  // Kerbs (Left and Right)
  flat(HW + KERB, HW, 0.05, (i) => (i % 4 < 2 ? kerbA : kerbB));
  flat(-HW, -HW - KERB, 0.05, (i) => (i % 4 < 2 ? kerbA : kerbB));

  // Track white edge lines
  flat(HW - 0.25, HW - 0.75, 0.055, () => white);
  flat(-HW + 0.75, -HW + 0.25, 0.055, () => white);

  // Dashed centerline
  flat(0.2, -0.2, 0.058, (i) => (i % 8 < 4 ? white : null));

  // Start / Finish Line (Chequered grid)
  flat(HW, -HW, 0.065, (i) => {
    if (i < 3) return (i % 2 === 0 ? white : col(0x111111));
    return null;
  });

  // Track safety armco / barrier walls
  wall(WALL, 1.4, (i) => (i % 8 < 4 ? wallA : wallB));
  wall(-WALL, 1.4, (i) => (i % 8 < 4 ? wallA : wallB));

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(3500, 3500);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({ color: config.groundColor });
  disposables.push(groundGeo, groundMat);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.15;
  group.add(groundMesh);

  // Checkpoint & Finish Gantries
  function buildGantry(idx: number, isStartFinish: boolean, cpNumber?: number) {
    const gantry = new THREE.Group();
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x222730 });
    disposables.push(frameMat);

    const postGeo = new THREE.BoxGeometry(0.8, 8, 0.8);
    disposables.push(postGeo);
    const postL = new THREE.Mesh(postGeo, frameMat);
    postL.position.set(HW + 2.4, 4, 0);
    const postR = new THREE.Mesh(postGeo, frameMat);
    postR.position.set(-HW - 2.4, 4, 0);

    const beamGeo = new THREE.BoxGeometry(2 * (HW + 2.4) + 1.2, 1.4, 1.2);
    disposables.push(beamGeo);
    const beam = new THREE.Mesh(beamGeo, frameMat);
    beam.position.set(0, 8, 0);

    gantry.add(postL, postR, beam);

    // Overhead banner
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = isStartFinish ? '#d8232a' : '#144670';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isStartFinish ? 'START / FINISH' : `CHECKPOINT ${cpNumber}`, 256, 64);

    const bannerTex = new THREE.CanvasTexture(canvas);
    disposables.push(bannerTex);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    disposables.push(bannerMat);
    const bannerGeo = new THREE.PlaneGeometry(2 * HW * 0.8, 1.2);
    disposables.push(bannerGeo);
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(0, 8, 0.61);
    gantry.add(bannerMesh);

    // Orientation & position
    gantry.position.copy(C[idx]);
    gantry.position.y = elev[idx];
    gantry.rotation.y = Math.atan2(T[idx].x, T[idx].z);
    group.add(gantry);
  }

  // Start / Finish Arch
  buildGantry(0, true);
  // Checkpoints
  track.cpIndices.forEach((cpIdx, idx) => {
    buildGantry(cpIdx, false, idx + 1);
  });

  // Track-specific scenery
  buildScenery(track, group, disposables);

  return {
    group,
    dispose: () => {
      disposables.forEach(d => d.dispose());
    }
  };
}

/**
 * Builds landmark scenery tailored to each F1 circuit (Monaco tunnel, Suzuka ferris wheel, Spa hills/trees, etc.)
 */
function buildScenery(track: TrackGeometryData, group: THREE.Group, disposables: { dispose: () => void }[]) {
  const { config, C, N } = track;

  // 1. Instanced Trees for foliage
  const treeCount = config.id === 'monaco' ? 120 : 500;
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.4, 5);
  const foliageGeo = config.id === 'spa'
    ? new THREE.ConeGeometry(2.4, 7.5, 5) // Pine trees for Ardennes
    : new THREE.SphereGeometry(2.8, 6, 5); // Poplars/Deciduous
  disposables.push(trunkGeo, foliageGeo);

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2e231c, flatShading: true });
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  disposables.push(trunkMat, foliageMat);

  const instTrunk = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const instFoliage = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  disposables.push(instTrunk, instFoliage);

  const pal = config.id === 'spa'
    ? [0x143c2c, 0x1b4a37, 0x113325, 0x21543e].map(c => new THREE.Color(c))
    : [0x1f5f45, 0x286e52, 0x225c44, 0x33785a].map(c => new THREE.Color(c));

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();

  let placed = 0;
  for (let attempt = 0; attempt < 2000 && placed < treeCount; attempt++) {
    const rx = (Math.random() - 0.5) * 800;
    const rz = (Math.random() - 0.5) * 800;

    // Reject if too close to track centerline
    let tooClose = false;
    for (let k = 0; k < N; k += 8) {
      const dx = rx - C[k].x;
      const dz = rz - C[k].z;
      if (dx * dx + dz * dz < 26 * 26) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const scale = 0.8 + Math.random() * 0.9;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    s.set(scale, scale, scale);

    m4.compose(v.set(rx, 1.2 * scale, rz), q, s);
    instTrunk.setMatrixAt(placed, m4);

    m4.compose(v.set(rx, 4.5 * scale, rz), q, s);
    instFoliage.setMatrixAt(placed, m4);
    instFoliage.setColorAt(placed, pal[Math.floor(Math.random() * pal.length)]);

    placed++;
  }

  instTrunk.count = placed;
  instFoliage.count = placed;
  instTrunk.instanceMatrix.needsUpdate = true;
  instFoliage.instanceMatrix.needsUpdate = true;
  if (instFoliage.instanceColor) instFoliage.instanceColor.needsUpdate = true;
  group.add(instTrunk, instFoliage);

  // 2. Circuit-specific landmarks
  if (config.id === 'monaco') {
    // Monaco Marina yachts in harbor
    const yachtHullMat = new THREE.MeshLambertMaterial({ color: 0xf5f7fa });
    disposables.push(yachtHullMat);
    for (let i = 0; i < 6; i++) {
      const yacht = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 22), yachtHullMat);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 12), yachtHullMat);
      cabin.position.set(0, 2.5, -2);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 14, 6), yachtHullMat);
      mast.position.set(0, 8, 2);
      yacht.add(hull, cabin, mast);
      yacht.position.set(65 + i * 22, -1, -60 - i * 14);
      yacht.rotation.y = 0.4 + i * 0.2;
      group.add(yacht);
    }

    // Covered Tunnel Section
    const tunnelIdx = Math.round(N * 0.58);
    const tunnelLen = Math.round(N * 0.08);
    const tunnelMat = new THREE.MeshLambertMaterial({ color: 0x1c212a, side: THREE.DoubleSide });
    disposables.push(tunnelMat);

    for (let i = tunnelIdx; i < tunnelIdx + tunnelLen; i += 3) {
      const idx = i % N;
      const tArch = new THREE.Mesh(new THREE.TorusGeometry(12, 1.2, 6, 12, Math.PI), tunnelMat);
      tArch.position.copy(C[idx]);
      tArch.rotation.y = Math.atan2(track.T[idx].x, track.T[idx].z);
      tArch.rotation.x = Math.PI / 2;
      group.add(tArch);
    }
  } else if (config.id === 'suzuka') {
    // Giant Suzuka Ferris Wheel
    const wheelGroup = new THREE.Group();
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
    const spokeMat = new THREE.MeshBasicMaterial({ color: 0xffee55 });
    disposables.push(wheelMat, spokeMat);

    const rimGeo = new THREE.TorusGeometry(32, 0.8, 8, 32);
    disposables.push(rimGeo);
    const rim = new THREE.Mesh(rimGeo, wheelMat);
    wheelGroup.add(rim);

    for (let k = 0; k < 12; k++) {
      const spokeGeo = new THREE.CylinderGeometry(0.2, 0.2, 64, 4);
      disposables.push(spokeGeo);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.z = (k / 12) * Math.PI;
      wheelGroup.add(spoke);
    }

    const towerMat = new THREE.MeshLambertMaterial({ color: 0x444f60 });
    disposables.push(towerMat);
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 45, 6), towerMat);
    p1.position.set(-6, -20, 0);
    p1.rotation.z = -0.15;
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 45, 6), towerMat);
    p2.position.set(6, -20, 0);
    p2.rotation.z = 0.15;
    wheelGroup.add(p1, p2);

    wheelGroup.position.set(120, 42, -90);
    wheelGroup.rotation.y = -0.5;
    group.add(wheelGroup);
  } else {
    // Mountains / Distant peaks
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0x1f293d, flatShading: true });
    disposables.push(mountainMat);
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.1;
      const dist = 650 + Math.random() * 200;
      const h = 80 + Math.random() * 160;
      const rad = 60 + Math.random() * 90;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mountainMat);
      m.position.set(Math.cos(angle) * dist, h / 2 - 5, Math.sin(angle) * dist);
      group.add(m);
    }
  }
}
