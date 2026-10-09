import * as THREE from 'three';
import { TrackId } from './types';
import { TRACK_CONFIGS, buildTrackData, TrackGeometryData } from './tracks';
import { buildTrackScene, BuiltTrack } from './trackRenderer';
import { buildFatkart, KartMeshRefs } from './kartModel';
import { KartPhysics, PhysicsControls } from './physics';
import { GhostManager } from './ghostManager';
import { AIManager } from './aiManager';

export interface GameTelemetry {
  lapTime: number;
  bestLapTime: number | null;
  currentLap: number;
  checkpointText: string;
  speedKmh: number;
  offTrack: boolean;
  wrongWay: boolean;
  deltaText: string | null;
  deltaPositive: boolean;
  hasGhost: boolean;
  ghostVisible: boolean;
  trackName: string;
  trackFlag: string;
  cameraMode: 'chase' | 'cockpit' | 'tv';
  bannerMessage: string;
  secretCheatActive: boolean;
  racePosition: number;
  totalRacers: number;
  aiEnabled: boolean;
  customTopSpeed: number;
  driverName: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private currentTrackId: TrackId = 'monza';
  private trackData: TrackGeometryData;
  private builtTrack: BuiltTrack | null = null;

  private playerKart: KartMeshRefs;
  private ghostKart: KartMeshRefs;
  private ghostManager: GhostManager;
  private aiManager: AIManager;

  private physics: KartPhysics;
  private controls: PhysicsControls = { up: false, down: false, left: false, right: false };

  // Timing & Laps
  private started = false;
  private paused = false;
  private currentLap = 1;
  private lapTime = 0;
  private nextCpIndex = 0;
  private cpNames = ['CP 1', 'CP 2', 'CP 3'];

  // Camera & view
  private cameraMode: 'chase' | 'cockpit' | 'tv' = 'chase';
  private camYaw = 0;
  private lookTarget = new THREE.Vector3();

  // Ghost visibility & Delta
  private ghostVisible = true;
  private liveDeltaText: string | null = null;
  private liveDeltaPositive = false;

  // Flash message
  private bannerMessage = 'Press W or ↑ to Race';
  private bannerTimer = 3.0;

  // Secret key sequence buffers
  private keySequenceBuffer = '';

  // Telemetry callback
  private onTelemetryUpdate?: (t: GameTelemetry) => void;
  public onTriggerCustomSpeedSlider?: () => void;

  private animFrameId: number | null = null;
  private lastTime = 0;

  constructor(
    canvas: HTMLCanvasElement,
    onTelemetryUpdate?: (t: GameTelemetry) => void,
    onTriggerCustomSpeedSlider?: () => void
  ) {
    this.canvas = canvas;
    this.onTelemetryUpdate = onTelemetryUpdate;
    this.onTriggerCustomSpeedSlider = onTriggerCustomSpeedSlider;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.2, 2200);

    // Initial track setup
    this.trackData = buildTrackData(TRACK_CONFIGS[this.currentTrackId]);
    this.ghostManager = new GhostManager(this.currentTrackId);
    this.physics = new KartPhysics(this.trackData);

    // Build Player Fatkart & Ghost Fatkart
    this.playerKart = buildFatkart({ driverName: 'Jac', number: 24, isGhost: false });
    this.scene.add(this.playerKart.root);

    this.ghostKart = buildFatkart({ driverName: 'Jac', number: 24, isGhost: true });
    this.ghostKart.root.visible = false;
    this.scene.add(this.ghostKart.root);

    // Setup AI Drivers
    this.aiManager = new AIManager(this.trackData, this.scene);

    // Lights
    this.setupLighting();

    // Mount initial track
    this.loadTrack(this.currentTrackId);

    // Window resize
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    // Input listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xb4d2ff, 0x1a2230, 1.4);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.position.set(-180, 240, 120);
    this.scene.add(sun);
  }

  public setControlState(action: 'up' | 'down' | 'left' | 'right', active: boolean) {
    this.controls[action] = active;
  }

  public activateSecretCheat() {
    this.physics.secretCheatActive = true;
    this.flashMessage('JAC FATKART: 130 KM/H SPEED UNLOCKED', 2.5);
  }

  public setSecretCheat(active: boolean) {
    this.physics.secretCheatActive = active;
  }

  public getSecretCheat(): boolean {
    return this.physics.secretCheatActive;
  }

  public setCustomTopSpeed(kmh: number | null) {
    this.physics.customTopSpeedKmh = kmh;
    if (kmh !== null) {
      this.flashMessage(`CUSTOM TOP SPEED: ${kmh} KM/H`, 2.0);
    }
  }

  public getCustomTopSpeed(): number {
    return this.physics.customTopSpeedKmh ?? (this.physics.secretCheatActive ? 130 : 120);
  }

  public toggleAI() {
    const next = !this.aiManager.enabled;
    this.aiManager.setEnabled(next);
    this.flashMessage(`AI OPPONENTS: ${next ? 'ON' : 'OFF'}`, 1.8);
  }

  public switchTrack(trackId: TrackId) {
    if (this.currentTrackId === trackId) return;
    this.loadTrack(trackId);
  }

  private loadTrack(trackId: TrackId) {
    this.currentTrackId = trackId;
    const config = TRACK_CONFIGS[trackId];

    // Dispose old track
    if (this.builtTrack) {
      this.scene.remove(this.builtTrack.group);
      this.builtTrack.dispose();
      this.builtTrack = null;
    }

    // Atmosphere
    this.scene.background = new THREE.Color(config.skyColor);
    this.scene.fog = new THREE.Fog(config.fogColor, 180, 950);

    // Build new geometry & scenery
    this.trackData = buildTrackData(config);
    this.physics.setTrack(this.trackData);
    this.ghostManager.setTrack(trackId);
    this.aiManager.setTrack(this.trackData);

    this.builtTrack = buildTrackScene(this.trackData);
    this.scene.add(this.builtTrack.group);

    this.resetLap();
    this.flashMessage(`${config.name} (${config.flag})`, 2.5);
  }

  public resetLap() {
    this.physics.resetToStart();
    this.started = false;
    this.currentLap = 1;
    this.lapTime = 0;
    this.nextCpIndex = 0;
    this.camYaw = this.physics.yaw;
    this.ghostManager.startLap();
    this.ghostKart.root.visible = false;
    this.liveDeltaText = null;
    this.aiManager.resetGrid();
  }

  public toggleCamera() {
    if (this.cameraMode === 'chase') this.cameraMode = 'cockpit';
    else if (this.cameraMode === 'cockpit') this.cameraMode = 'tv';
    else this.cameraMode = 'chase';
  }

  public toggleGhost() {
    this.ghostVisible = !this.ghostVisible;
  }

  public togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.flashMessage('PAUSED', 9999);
    else this.flashMessage('RESUMED', 0.8);
  }

  public flashMessage(msg: string, duration = 2.0) {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Secret sequence tracker
    if (e.key && e.key.length === 1) {
      this.keySequenceBuffer = (this.keySequenceBuffer + e.key).slice(-18);
      if (this.keySequenceBuffer.toLowerCase().endsWith('joeisabitchwasd')) {
        this.activateSecretCheat();
      }
      if (this.keySequenceBuffer.endsWith('2411')) {
        if (this.onTriggerCustomSpeedSlider) {
          this.onTriggerCustomSpeedSlider();
        }
      }
    }

    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.controls.up = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.controls.down = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.controls.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') this.controls.right = true;

    if (e.code === 'KeyR') this.resetLap();
    if (e.code === 'KeyC') this.toggleCamera();
    if (e.code === 'KeyG') this.toggleGhost();
    if (e.code === 'Space') this.togglePause();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.controls.up = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.controls.down = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.controls.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') this.controls.right = false;
  };

  private handleResize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  public start() {
    if (this.animFrameId !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.animFrameId = requestAnimationFrame(tick);
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.renderFrame(dt);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.builtTrack) this.builtTrack.dispose();
    this.aiManager.dispose(this.scene);
    this.renderer.dispose();
  }

  private renderFrame(dt: number) {
    if (!this.paused) {
      const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const subDt = dt / substeps;
      for (let i = 0; i < substeps; i++) {
        this.stepPhysics(subDt);
      }
      this.aiManager.update(dt, this.started, this.physics.trackProgress, this.physics.x, this.physics.z);
    }

    this.updateVisuals(dt);
    this.updateCamera(dt);
    this.broadcastTelemetry(dt);

    this.renderer.render(this.scene, this.camera);
  }

  private stepPhysics(dt: number) {
    if (!this.started && this.controls.up) {
      this.started = true;
      this.ghostManager.startLap();
    }

    if (this.started) {
      this.lapTime += dt;

      this.ghostManager.recordFrame({
        t: this.lapTime,
        x: this.physics.x,
        y: this.physics.y,
        z: this.physics.z,
        yaw: this.physics.yaw,
        pitch: this.physics.pitch,
        roll: this.physics.roll,
        steer: this.physics.steer,
        wheelSpin: this.physics.wheelSpin
      });
    }

    this.physics.update(dt, this.controls);

    // Checkpoints & Laps
    const cpEvery = this.trackData.N / 4;
    const progress = this.physics.trackProgress;

    if (this.nextCpIndex < 3 && progress >= (this.nextCpIndex + 1) * cpEvery) {
      this.flashMessage(`${this.cpNames[this.nextCpIndex]} · ${this.formatLap(this.lapTime)}`, 1.4);
      this.nextCpIndex++;
    }

    if (progress >= this.trackData.N) {
      this.onLapFinished();
    }
  }

  private onLapFinished() {
    const finishedTime = this.lapTime;
    const { isNewBest } = this.ghostManager.completeLap(finishedTime);

    let msg = `Lap ${this.currentLap}: ${this.formatLap(finishedTime)}`;
    if (isNewBest) {
      msg += ' ★ NEW RECORD ★';
    }
    this.flashMessage(msg, 3.5);

    this.physics.trackProgress -= this.trackData.N;
    this.currentLap++;
    this.lapTime = 0;
    this.nextCpIndex = 0;
    this.ghostManager.startLap();
  }

  private updateVisuals(dt: number) {
    const p = this.physics;

    this.playerKart.root.position.set(p.x, p.y, p.z);
    this.playerKart.root.rotation.set(p.pitch, p.yaw, p.roll);

    this.playerKart.chassis.rotation.z = -p.steer * 0.08;
    this.playerKart.steeringWheel.rotation.z = -p.steer * 0.75;

    this.playerKart.wheels.forEach(w => {
      w.rotation.x = p.wheelSpin;
    });
    this.playerKart.frontPivots.forEach(fp => {
      fp.rotation.y = p.steer * 0.42;
    });

    this.playerKart.driverHead.rotation.z = p.headTilt;
    this.playerKart.driverHead.rotation.y = p.steer * 0.25;
    this.playerKart.driverArms.rotation.z = -p.steer * 0.55;

    // Ghost Kart update
    const activeGhost = this.ghostManager.getActiveGhost();
    if (activeGhost && this.ghostVisible && this.started) {
      const gSample = this.ghostManager.sampleAtTime(this.lapTime);
      if (gSample) {
        this.ghostKart.root.visible = true;
        this.ghostKart.root.position.set(gSample.x, gSample.y, gSample.z);
        this.ghostKart.root.rotation.set(gSample.pitch, gSample.yaw, gSample.roll);
        this.ghostKart.steeringWheel.rotation.z = -gSample.steer * 0.75;
        this.ghostKart.wheels.forEach(w => { w.rotation.x = gSample.wheelSpin; });
        this.ghostKart.frontPivots.forEach(fp => { fp.rotation.y = gSample.steer * 0.42; });

        const forwardProj = (p.x - gSample.x) * Math.sin(p.yaw) + (p.z - gSample.z) * Math.cos(p.yaw);
        const deltaSec = (forwardProj / Math.max(16, p.getSpeed()));

        if (Math.abs(deltaSec) > 0.05) {
          const isAhead = deltaSec > 0;
          this.liveDeltaPositive = !isAhead;
          this.liveDeltaText = `${isAhead ? '-' : '+'}${Math.abs(deltaSec).toFixed(2)}s`;
        } else {
          this.liveDeltaText = '±0.00s';
          this.liveDeltaPositive = false;
        }
      }
    } else {
      this.ghostKart.root.visible = false;
      this.liveDeltaText = null;
    }
  }

  private updateCamera(dt: number) {
    const p = this.physics;
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const speed = p.getSpeed();

    let yawDiff = p.yaw - this.camYaw;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    this.camYaw += yawDiff * Math.min(1, 5.5 * dt);

    if (this.cameraMode === 'cockpit') {
      this.playerKart.driverHead.visible = false;
      this.camera.position.set(p.x + fx * 0.28, p.y + 0.98, p.z + fz * 0.28);
      this.lookTarget.set(p.x + fx * 28, p.y + 0.92, p.z + fz * 28);
      this.camera.fov = 75;
    } else if (this.cameraMode === 'tv') {
      this.playerKart.driverHead.visible = true;
      const tvX = p.x + 35 * Math.sin(p.yaw + 1.2);
      const tvZ = p.z + 35 * Math.cos(p.yaw + 1.2);
      this.camera.position.set(tvX, p.y + 14, tvZ);
      this.lookTarget.set(p.x, p.y + 0.6, p.z);
      this.camera.fov = 50;
    } else {
      this.playerKart.driverHead.visible = true;
      const dist = 7.0 + speed * 0.035;
      const height = 2.7 + (speed / p.BASE_TOP_V) * 0.4;
      const camX = p.x - Math.sin(this.camYaw) * dist;
      const camZ = p.z - Math.cos(this.camYaw) * dist;
      this.camera.position.set(camX, p.y + height, camZ);
      this.lookTarget.set(p.x + Math.sin(this.camYaw) * 5.0, p.y + 0.9, p.z + Math.cos(this.camYaw) * 5.0);

      this.camera.fov = 64 + (speed / p.BASE_TOP_V) * 12;
    }

    this.camera.lookAt(this.lookTarget);
    this.camera.updateProjectionMatrix();
  }

  private broadcastTelemetry(dt: number) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerMessage = '';
      }
    }

    if (!this.onTelemetryUpdate) return;

    const racePos = this.aiManager.getRacePosition(this.physics.trackProgress);

    this.onTelemetryUpdate({
      lapTime: this.lapTime,
      bestLapTime: this.ghostManager.getBestTime(),
      currentLap: this.currentLap,
      checkpointText: `${this.nextCpIndex}/3`,
      speedKmh: this.physics.getDisplaySpeedKmh(),
      offTrack: this.physics.offTrack,
      wrongWay: this.physics.wrongWay,
      deltaText: this.liveDeltaText,
      deltaPositive: this.liveDeltaPositive,
      hasGhost: this.ghostManager.getActiveGhost() !== null,
      ghostVisible: this.ghostVisible,
      trackName: this.trackData.config.name,
      trackFlag: this.trackData.config.flag,
      cameraMode: this.cameraMode,
      bannerMessage: this.bannerMessage,
      secretCheatActive: this.physics.secretCheatActive,
      racePosition: racePos.position,
      totalRacers: racePos.total,
      aiEnabled: this.aiManager.enabled,
      customTopSpeed: this.getCustomTopSpeed(),
      driverName: 'Jac'
    });
  }

  public formatLap(t: number): string {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
  }
}
