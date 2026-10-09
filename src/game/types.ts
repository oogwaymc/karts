export type TrackId = 'monza' | 'spa' | 'silverstone' | 'monaco' | 'suzuka';

export interface TrackConfig {
  id: TrackId;
  name: string;
  location: string;
  country: string;
  flag: string;
  description: string;
  turns: number;
  lengthMeters: number; // ~640-660m for 35-40s lap
  roadWidth: number;
  kerbWidth: number;
  wallDistance: number;
  kerbColorA: number;
  kerbColorB: number;
  roadColorA: number;
  roadColorB: number;
  wallColorA: number;
  wallColorB: number;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  rawPoints: [number, number, number][]; // x, y, z control points
}

export interface GhostSample {
  t: number;      // timestamp in seconds from lap start
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  steer: number;
  wheelSpin: number;
}

export interface GhostData {
  trackId: TrackId;
  lapTime: number;
  driverName: string;
  samples: GhostSample[];
}

export interface AIDriverConfig {
  id: string;
  name: string;
  number: number;
  color: number;
  suitColor: number;
  baseSpeedKmh: number;
  aggression: number;
  racingLineOffset: number; // lateral offset from centerline
}

export interface AIDriverState {
  config: AIDriverConfig;
  progress: number; // index along track
  latOffset: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  steer: number;
  wheelSpin: number;
}

export interface PhysicsState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  vx: number;
  vz: number;
  vy: number;
  steer: number;
  wheelSpin: number;
  headTilt: number;
}
