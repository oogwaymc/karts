import * as THREE from 'three';
import { TrackGeometryData } from './tracks';

export interface PhysicsControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class KartPhysics {
  public x = 0;
  public y = 0;
  public z = 0;
  public yaw = 0;
  public pitch = 0;
  public roll = 0;
  public vx = 0;
  public vz = 0;
  public steer = 0;
  public wheelSpin = 0;
  public headTilt = 0;

  public offTrack = false;
  public wrongWay = false;
  public currentTrackIndex = 0;
  public trackProgress = 0; // accumulated indices from start

  // Base physics parameters (120 km/h base, 130 km/h with cheat)
  public readonly BASE_TOP_KMH = 120;
  public readonly CHEAT_TOP_KMH = 130;
  public readonly BASE_TOP_V = 120 / 3.6; // 33.33 m/s (120 km/h)
  public readonly BASE_ACCEL = 48.0;

  // Secret 130 km/h cheat: Joeisabitchwasd
  public secretCheatActive = false;

  // Custom top speed slider override (activated by clicking 2-4-1-1)
  public customTopSpeedKmh: number | null = null;

  private track: TrackGeometryData;

  constructor(track: TrackGeometryData) {
    this.track = track;
    this.resetToStart();
  }

  public setTrack(track: TrackGeometryData) {
    this.track = track;
    this.resetToStart();
  }

  public resetToStart() {
    const { C, T, elev, N, spacing } = this.track;
    const backDist = 6.0;
    const backIndices = Math.round(backDist / spacing);

    this.x = C[0].x - T[0].x * backDist;
    this.z = C[0].z - T[0].z * backDist;
    this.y = elev[0];
    this.yaw = Math.atan2(T[0].x, T[0].z);
    this.pitch = 0;
    this.roll = 0;
    this.vx = 0;
    this.vz = 0;
    this.steer = 0;
    this.wheelSpin = 0;
    this.headTilt = 0;
    this.offTrack = false;
    this.wrongWay = false;

    this.currentTrackIndex = (N - backIndices) % N;
    this.trackProgress = -backIndices;
  }

  /**
   * Actual velocity magnitude in m/s
   */
  public getSpeed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  /**
   * Speedometer reading in km/h.
   * If secret cheat is active (130 km/h), speedo hides the extra speed and caps at 120 km/h!
   */
  public getDisplaySpeedKmh(): number {
    const actual = this.getSpeed();
    if (this.customTopSpeedKmh !== null) {
      return Math.round(actual * 3.6);
    }
    if (this.secretCheatActive) {
      // Maps actual 130 km/h back down to 120 km/h display
      const displayed = actual * (120 / 130);
      return Math.round(displayed * 3.6);
    }
    return Math.round(actual * 3.6);
  }

  public update(dt: number, controls: PhysicsControls) {
    let targetTopKmh = this.BASE_TOP_KMH;
    if (this.customTopSpeedKmh !== null) {
      targetTopKmh = this.customTopSpeedKmh;
    } else if (this.secretCheatActive) {
      targetTopKmh = this.CHEAT_TOP_KMH;
    }

    const topV = targetTopKmh / 3.6;
    const accelRate = this.BASE_ACCEL * Math.max(0.8, targetTopKmh / 120);

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const lx = fz;
    const lz = -fx;

    let vf = this.vx * fx + this.vz * fz;
    let vl = this.vx * lx + this.vz * lz;

    // Steering input with smooth centering
    const steerTarget = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    const steerSpeed = steerTarget === 0 ? 12 : 8.5;
    this.steer += (steerTarget - this.steer) * Math.min(1, steerSpeed * dt);

    // Dynamic head tilt leaning into corners
    const targetHeadTilt = -this.steer * 0.42 - (vl / topV) * 0.35;
    this.headTilt += (targetHeadTilt - this.headTilt) * Math.min(1, 9 * dt);

    // Acceleration & Braking
    const topCap = this.offTrack ? topV * 0.42 : topV;
    if (controls.up) {
      const pwr = vf >= 0 ? accelRate * Math.max(0, 1 - vf / topV) : 60;
      vf += pwr * dt;
    }
    if (controls.down) {
      vf += vf > 1 ? -68 * dt : -22 * dt;
    }
    if (!controls.up && !controls.down) {
      // Natural engine braking & drag
      const drag = 3.8 * dt;
      vf = Math.abs(vf) <= drag ? 0 : vf - Math.sign(vf) * drag;
    }

    // Rolling resistance
    vf *= Math.exp(-(0.05 + (this.offTrack ? 1.7 : 0)) * dt);
    if (vf > topCap) vf = Math.max(topCap, vf - 60 * dt);
    vf = Math.max(vf, -9);

    // Lateral grip & tire scrub
    vl *= Math.exp(-(this.offTrack ? 4.0 : 8.0) * dt);

    // Yaw rotation from steering
    const steerAuthority = Math.min(1, Math.abs(vf) / 6.0);
    const yawRate = this.steer * 2.3 * steerAuthority * (1 - 0.35 * Math.min(1, Math.abs(vf) / topV));
    this.yaw += yawRate * dt;

    // Convert local velocities back to world
    this.vx = fx * vf + lx * vl;
    this.vz = fz * vf + lz * vl;

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.wheelSpin += (vf * dt) / 0.3;

    // Track progression & nearest centerline sample
    this.resolveTrackPosition();
  }

  private resolveTrackPosition() {
    const { N, C, L, T, elev, config } = this.track;
    const HW = config.roadWidth;
    const KERB = config.kerbWidth;
    const WALL = config.wallDistance;

    let best = this.currentTrackIndex;
    let minD = Infinity;

    // Check localized window around current index for efficiency & robustness
    for (let k = -24; k <= 24; k++) {
      const j = (this.currentTrackIndex + k + N) % N;
      const dx = this.x - C[j].x;
      const dz = this.z - C[j].z;
      const d = dx * dx + dz * dz;
      if (d < minD) {
        minD = d;
        best = j;
      }
    }

    let delta = best - this.currentTrackIndex;
    if (delta > N / 2) delta -= N;
    else if (delta < -N / 2) delta += N;

    this.trackProgress += delta;
    this.currentTrackIndex = best;

    // Follow track elevation smoothly
    const targetY = elev[best];
    this.y += (targetY - this.y) * 0.35;

    // Lateral offset from centerline
    const Li = L[best];
    const Ti = T[best];
    const lat = (this.x - C[best].x) * Li.x + (this.z - C[best].z) * Li.z;

    this.offTrack = Math.abs(lat) > (HW + KERB);
    this.wrongWay = (this.vx * Ti.x + this.vz * Ti.z) < -3.5;

    // Collision with Armco barriers
    if (Math.abs(lat) > WALL) {
      const s = Math.sign(lat);
      const overshoot = Math.abs(lat) - WALL;
      this.x -= Li.x * s * overshoot;
      this.z -= Li.z * s * overshoot;

      const vn = (this.vx * Li.x + this.vz * Li.z) * s;
      if (vn > 0) {
        this.vx -= Li.x * s * vn * 1.4;
        this.vz -= Li.z * s * vn * 1.4;
        this.vx *= 0.85;
        this.vz *= 0.85;
      }
    }

    // Pitch and roll alignment based on track gradient
    const nextIdx = (best + 1) % N;
    const dy = elev[nextIdx] - elev[best];
    this.pitch = Math.atan2(dy, this.track.spacing);
    this.roll = this.steer * 0.08;
  }
}
