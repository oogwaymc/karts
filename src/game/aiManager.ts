import * as THREE from 'three';
import { AIDriverConfig, AIDriverState } from './types';
import { TrackGeometryData } from './tracks';
import { buildFatkart, KartMeshRefs } from './kartModel';

export const AI_GRID_CONFIGS: AIDriverConfig[] = [
  {
    id: 'ai-max',
    name: 'Max',
    number: 33,
    color: 0x152238, // Navy
    suitColor: 0x111c2e,
    baseSpeedKmh: 118,
    aggression: 0.9,
    racingLineOffset: -1.8
  },
  {
    id: 'ai-charles',
    name: 'Charles',
    number: 16,
    color: 0xbd1822, // Scuderia Red
    suitColor: 0x9e121a,
    baseSpeedKmh: 116,
    aggression: 0.8,
    racingLineOffset: 1.6
  },
  {
    id: 'ai-lando',
    name: 'Lando',
    number: 4,
    color: 0xff8000, // Papaya Orange
    suitColor: 0xcc6600,
    baseSpeedKmh: 117,
    aggression: 0.85,
    racingLineOffset: -0.8
  },
  {
    id: 'ai-lewis',
    name: 'Lewis',
    number: 44,
    color: 0x223038, // Silver/Teal
    suitColor: 0x00d2be,
    baseSpeedKmh: 115,
    aggression: 0.75,
    racingLineOffset: 2.2
  }
];

export class AIManager {
  private track: TrackGeometryData;
  private drivers: AIDriverState[] = [];
  private meshes: KartMeshRefs[] = [];
  public enabled = true;

  constructor(track: TrackGeometryData, scene: THREE.Scene) {
    this.track = track;

    AI_GRID_CONFIGS.forEach((cfg) => {
      const meshRefs = buildFatkart({
        driverName: cfg.name,
        number: cfg.number,
        bodyColor: cfg.color,
        suitColor: cfg.suitColor
      });
      scene.add(meshRefs.root);
      this.meshes.push(meshRefs);

      this.drivers.push({
        config: cfg,
        progress: 0,
        latOffset: cfg.racingLineOffset,
        speed: 0,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        steer: 0,
        wheelSpin: 0
      });
    });

    this.resetGrid();
  }

  public setTrack(track: TrackGeometryData) {
    this.track = track;
    this.resetGrid();
  }

  public setEnabled(on: boolean) {
    this.enabled = on;
    this.meshes.forEach((m) => {
      m.root.visible = on;
    });
  }

  public resetGrid() {
    const { N, C, T, L, elev } = this.track;

    this.drivers.forEach((d, idx) => {
      // Grid spots behind player (staggered grid positions)
      const gridOffsetIndex = -12 - (idx * 8);
      const startIdx = (gridOffsetIndex + N * 10) % N;
      const lat = d.latOffset;

      d.progress = gridOffsetIndex;
      d.speed = 0;
      d.x = C[startIdx].x + L[startIdx].x * lat;
      d.z = C[startIdx].z + L[startIdx].z * lat;
      d.y = elev[startIdx];
      d.yaw = Math.atan2(T[startIdx].x, T[startIdx].z);
      d.pitch = 0;
      d.roll = 0;
      d.steer = 0;
      d.wheelSpin = 0;

      const m = this.meshes[idx];
      m.root.position.set(d.x, d.y, d.z);
      m.root.rotation.set(0, d.yaw, 0);
      m.root.visible = this.enabled;
    });
  }

  public update(dt: number, raceStarted: boolean, playerProgress: number, playerX: number, playerZ: number) {
    if (!this.enabled) return;

    const { N, C, T, L, elev, spacing } = this.track;

    this.drivers.forEach((d, idx) => {
      const mesh = this.meshes[idx];

      if (raceStarted) {
        // Accelerate up to target speed
        const targetSpeed = d.config.baseSpeedKmh / 3.6; // m/s
        if (d.speed < targetSpeed) {
          d.speed = Math.min(targetSpeed, d.speed + 32 * dt);
        }

        // Advance along spline
        const deltaProg = (d.speed * dt) / spacing;
        d.progress += deltaProg;
      }

      // Calculate track index
      const normalizedIdx = Math.floor((d.progress % N + N) % N);
      const nextIdx = (normalizedIdx + 1) % N;
      const alpha = (d.progress % 1 + 1) % 1;

      // Centerline interpolation
      const cA = C[normalizedIdx];
      const cB = C[nextIdx];
      const tA = T[normalizedIdx];
      const lA = L[normalizedIdx];

      // Smooth path
      const cx = cA.x + (cB.x - cA.x) * alpha;
      const cz = cA.z + (cB.z - cA.z) * alpha;
      const cy = elev[normalizedIdx] + (elev[nextIdx] - elev[normalizedIdx]) * alpha;

      // Lateral offset with slight oscillation for natural racing feel
      const latWiggle = Math.sin(d.progress * 0.05 + idx) * 0.4;
      const totalLat = d.latOffset + latWiggle;

      d.x = cx + lA.x * totalLat;
      d.z = cz + lA.z * totalLat;
      d.y = cy;

      // Heading aligned with track tangent
      const targetYaw = Math.atan2(tA.x, tA.z);
      d.steer = (targetYaw - d.yaw) * 0.8;
      d.yaw = targetYaw;

      d.wheelSpin += (d.speed * dt) / 0.3;

      // Update 3D mesh
      mesh.root.position.set(d.x, d.y, d.z);
      mesh.root.rotation.set(0, d.yaw, 0);
      mesh.steeringWheel.rotation.z = -d.steer * 0.5;
      mesh.wheels.forEach(w => { w.rotation.x = d.wheelSpin; });
      mesh.frontPivots.forEach(fp => { fp.rotation.y = d.steer * 0.4; });
      mesh.driverHead.rotation.z = -d.steer * 0.2;
    });
  }

  /**
   * Returns current race position for player (P1 to P5)
   */
  public getRacePosition(playerProgress: number): { position: number; total: number; leaderDeltaMeters: number } {
    if (!this.enabled) return { position: 1, total: 1, leaderDeltaMeters: 0 };

    let position = 1;
    let maxProgress = playerProgress;

    this.drivers.forEach((d) => {
      if (d.progress > playerProgress) {
        position++;
      }
      if (d.progress > maxProgress) {
        maxProgress = d.progress;
      }
    });

    const leaderDeltaMeters = (maxProgress - playerProgress) * this.track.spacing;
    return { position, total: this.drivers.length + 1, leaderDeltaMeters };
  }

  public dispose(scene: THREE.Scene) {
    this.meshes.forEach(m => {
      scene.remove(m.root);
    });
  }
}
