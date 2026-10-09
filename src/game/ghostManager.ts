import { GhostData, GhostSample, TrackId } from './types';

export class GhostManager {
  private currentSamples: GhostSample[] = [];
  private activeGhost: GhostData | null = null;
  private trackId: TrackId;
  private sampleInterval = 0.033; // 30 Hz recording for high precision and small memory
  private lastSampleTime = -1;

  constructor(trackId: TrackId) {
    this.trackId = trackId;
    this.loadGhost();
  }

  public setTrack(trackId: TrackId) {
    this.trackId = trackId;
    this.currentSamples = [];
    this.lastSampleTime = -1;
    this.loadGhost();
  }

  public getActiveGhost(): GhostData | null {
    return this.activeGhost;
  }

  public getBestTime(): number | null {
    try {
      const stored = localStorage.getItem(`fatkart_best_${this.trackId}`);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (_) {}
    return this.activeGhost?.lapTime ?? null;
  }

  private loadGhost() {
    try {
      const raw = localStorage.getItem(`fatkart_ghost_${this.trackId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as GhostData;
        if (parsed && Array.isArray(parsed.samples) && parsed.samples.length > 5) {
          this.activeGhost = parsed;
          return;
        }
      }
    } catch (_) {}
    this.activeGhost = null;
  }

  public startLap() {
    this.currentSamples = [];
    this.lastSampleTime = -1;
  }

  public recordFrame(sample: GhostSample) {
    if (this.lastSampleTime < 0 || (sample.t - this.lastSampleTime) >= this.sampleInterval) {
      this.currentSamples.push(sample);
      this.lastSampleTime = sample.t;
    }
  }

  public completeLap(lapTime: number): { isNewBest: boolean; saved: boolean } {
    const currentBest = this.getBestTime();
    const isNewBest = currentBest === null || lapTime < currentBest;

    if (isNewBest && this.currentSamples.length > 10) {
      const data: GhostData = {
        trackId: this.trackId,
        lapTime,
        driverName: 'Jac',
        samples: this.currentSamples
      };
      this.activeGhost = data;
      try {
        localStorage.setItem(`fatkart_ghost_${this.trackId}`, JSON.stringify(data));
        localStorage.setItem(`fatkart_best_${this.trackId}`, String(lapTime));
      } catch (e) {
        console.warn('Ghost save error:', e);
      }
      this.currentSamples = [];
      return { isNewBest: true, saved: true };
    }

    this.currentSamples = [];
    return { isNewBest: false, saved: false };
  }

  /**
   * Sample ghost state at a specific time `t` (seconds into the lap).
   */
  public sampleAtTime(t: number): GhostSample | null {
    if (!this.activeGhost || this.activeGhost.samples.length === 0) return null;
    const samples = this.activeGhost.samples;

    if (t <= samples[0].t) return samples[0];
    const last = samples[samples.length - 1];
    if (t >= last.t) return last;

    // Binary search for closest segment
    let low = 0;
    let high = samples.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (samples[mid].t < t) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idxA = Math.max(0, high);
    const idxB = Math.min(samples.length - 1, low);
    if (idxA === idxB) return samples[idxA];

    const a = samples[idxA];
    const b = samples[idxB];
    const span = b.t - a.t;
    const alpha = span > 0 ? (t - a.t) / span : 0;

    return {
      t,
      x: a.x + (b.x - a.x) * alpha,
      y: a.y + (b.y - a.y) * alpha,
      z: a.z + (b.z - a.z) * alpha,
      yaw: a.yaw + (b.yaw - a.yaw) * alpha,
      pitch: a.pitch + (b.pitch - a.pitch) * alpha,
      roll: a.roll + (b.roll - a.roll) * alpha,
      steer: a.steer + (b.steer - a.steer) * alpha,
      wheelSpin: a.wheelSpin + (b.wheelSpin - a.wheelSpin) * alpha
    };
  }
}
