import * as THREE from 'three';
import { TrackConfig, TrackId } from './types';

// Raw track contours based on real-world F1 track layouts
export const TRACK_CONFIGS: Record<TrackId, TrackConfig> = {
  monza: {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    location: 'Monza, Italy',
    country: 'Italy',
    flag: '🇮🇹',
    description: 'The Temple of Speed: lightning straights, Variante del Rettifilo, Ascari chicane & the legendary Parabolica.',
    turns: 11,
    lengthMeters: 650,
    roadWidth: 8.5,
    kerbWidth: 1.8,
    wallDistance: 18.0,
    kerbColorA: 0xd8232a, // Italian red
    kerbColorB: 0xffffff, // White
    roadColorA: 0x373c47,
    roadColorB: 0x323742,
    wallColorA: 0x1f5a74,
    wallColorB: 0x2b86a8,
    skyColor: 0x0c1422,
    fogColor: 0x0c1422,
    groundColor: 0x15221b,
    rawPoints: [
      // Pit straight -> Rettifilo chicane -> Curva Grande -> Roggia chicane -> Lesmo 1 & 2 -> Serraglio -> Ascari -> Parabolica
      [0, 0, 0],
      [0, 0, 80],
      [5, 0, 110], // Rettifilo chicane right
      [-3, 0, 128], // chicane left
      [2, 0, 150], // exit
      [35, 0, 205], // Curva Grande sweeping right
      [80, 0, 245],
      [110, 0, 255],
      [135, 0, 235],
      [145, 0, 195], // Roggia chicane approach
      [138, 0, 175],
      [148, 0, 160],
      [165, 0, 140], // Lesmo 1
      [175, 0, 115], // Lesmo 2
      [160, 0, 75],  // Serraglio straight
      [140, 0, 10],
      [125, 0, -35], // Ascari chicane entry
      [110, 0, -50],
      [120, 0, -70], // Ascari exit
      [115, 0, -110], // Back straight to Parabolica
      [90, 0, -155],
      [45, 0, -180], // Parabolica apex
      [-5, 0, -165],
      [-25, 0, -120], // Parabolica exit onto main straight
      [-15, 0, -50]
    ]
  },

  spa: {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    location: 'Stavelot, Belgium',
    country: 'Belgium',
    flag: '🇧🇪',
    description: 'The Ardennes roller-coaster: La Source hairpin, the iconic Eau Rouge & Raidillon uphill climb, Pouhon & Bus Stop.',
    turns: 19,
    lengthMeters: 655,
    roadWidth: 8.5,
    kerbWidth: 1.8,
    wallDistance: 18.0,
    kerbColorA: 0xd8232a, // Belgian Red
    kerbColorB: 0xf9d616, // Belgian Yellow
    roadColorA: 0x363b44,
    roadColorB: 0x30353e,
    wallColorA: 0x822a2a,
    wallColorB: 0x993535,
    skyColor: 0x09101c,
    fogColor: 0x09101c,
    groundColor: 0x121e15,
    rawPoints: [
      // Main straight -> La Source hairpin -> Eau Rouge dip -> Raidillon climb -> Kemmel straight -> Les Combes -> Pouhon -> Blanchimont -> Bus Stop
      [0, 0, 0],
      [0, 0, 45],
      [18, 0, 60], // La Source hairpin right
      [18, -1, 40],
      [10, -2, 10], // Downhill toward Eau Rouge
      [-5, -3.5, -35], // Eau Rouge compression bottom
      [-15, 1.0, -65], // Eau Rouge left flick
      [-10, 4.5, -95], // Raidillon crest uphill!
      [-2, 5.0, -135], // Kemmel straight summit
      [15, 4.8, -185],
      [40, 4.2, -220],
      [70, 3.5, -235], // Les Combes chicane right-left
      [95, 2.5, -225],
      [110, 1.5, -190], // Malmedy & Bruxelles hairpin
      [105, 0.5, -150],
      [80, -0.5, -120], // Pouhon double apex fast left
      [45, -1.0, -90],
      [25, -1.2, -50],
      [40, -1.0, -15],  // Campus & Stavelot
      [75, -0.5, 25],
      [85, 0, 65],     // Blanchimont flat-out left
      [65, 0, 110],
      [35, 0, 125],    // Bus Stop chicane right-left
      [12, 0, 105],
      [-5, 0, 60]
    ]
  },

  silverstone: {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    location: 'Northamptonshire, UK',
    country: 'United Kingdom',
    flag: '🇬🇧',
    description: 'Home of British Motor Racing: Maggotts-Becketts-Chapel high-G sweeps, Hangar straight, Stowe & Club.',
    turns: 18,
    lengthMeters: 648,
    roadWidth: 8.5,
    kerbWidth: 1.8,
    wallDistance: 19.0,
    kerbColorA: 0x1a6b3c, // British racing green
    kerbColorB: 0xffffff, // White
    roadColorA: 0x383e49,
    roadColorB: 0x333944,
    wallColorA: 0x224263,
    wallColorB: 0x1a334d,
    skyColor: 0x0b1320,
    fogColor: 0x0b1320,
    groundColor: 0x16241a,
    rawPoints: [
      // Hamilton straight -> Abbey -> Farm -> Village -> Loop -> Wellington straight -> Brooklands -> Copse -> Maggotts-Becketts -> Hangar -> Stowe -> Club
      [0, 0, 0],
      [0, 0, 60],
      [25, 0, 95], // Abbey fast right
      [45, 0, 125], // Farm
      [60, 0, 150], // Village tight right
      [50, 0, 175], // The Loop hairpin left
      [20, 0, 175],
      [-15, 0, 155], // Aintree
      [-40, 0, 115], // Wellington Straight
      [-75, 0, 60],
      [-95, 0, 15],  // Brooklands & Luffield
      [-90, 0, -35],
      [-65, 0, -65], // Woodcote
      [-30, 0, -90], // Copse high-speed right
      [10, 0, -115],
      [45, 0, -145], // Maggotts left
      [75, 0, -165], // Becketts right
      [95, 0, -150], // Chapel exit
      [120, 0, -110], // Hangar Straight flat-out
      [145, 0, -50],
      [150, 0, 15],  // Stowe corner right
      [130, 0, 65],  // Vale chicane
      [90, 0, 75],   // Club corner
      [40, 0, 50],
      [15, 0, 20]
    ]
  },

  monaco: {
    id: 'monaco',
    name: 'Circuit de Monaco',
    location: 'Monte Carlo, Monaco',
    country: 'Monaco',
    flag: '🇲🇨',
    description: 'The Jewel of Motorsport: Sainte Dévote, Casino Square, the Fairmont Hairpin, Mediterranean Tunnel & Swimming Pool.',
    turns: 19,
    lengthMeters: 645,
    roadWidth: 8.0,
    kerbWidth: 1.6,
    wallDistance: 16.0,
    kerbColorA: 0xd8232a, // Monaco red
    kerbColorB: 0xffffff, // White
    roadColorA: 0x353a44,
    roadColorB: 0x30353f,
    wallColorA: 0xc8aa4b, // Gold/Bronze Riviera barriers
    wallColorB: 0x1f4e79, // Azure blue
    skyColor: 0x091224,
    fogColor: 0x091224,
    groundColor: 0x151c27,
    rawPoints: [
      // Boulevard Albert 1er -> Sainte Dévote -> Beau Rivage climb -> Casino -> Mirabeau -> Fairmont Hairpin -> Tunnel -> Chicane -> Tabac -> Piscine -> Rascasse
      [0, 0, 0],
      [0, 0, 45],
      [15, 0.8, 65],  // Sainte Dévote tight right
      [22, 2.0, 95],  // Beau Rivage uphill climb
      [20, 3.5, 130],
      [12, 4.2, 160], // Massenet long left
      [-5, 4.0, 175], // Casino Square crest
      [-25, 3.2, 165], // Mirabeau Haute downhill
      [-40, 2.0, 140],
      [-50, 1.2, 120], // Fairmont Hairpin - slowest hairpin in F1!
      [-45, 0.8, 105],
      [-32, 0.4, 98],  // Mirabeau Bas & Portier
      [-15, 0.2, 85],
      [-10, 0.0, 50],  // Tunnel entry
      [-12, 0.0, -10], // Inside tunnel
      [-15, 0.0, -60], // Tunnel exit & downhill
      [-25, 0.0, -95], // Nouvelle Chicane left-right
      [-18, 0.0, -115],
      [0, 0.0, -135],  // Tabac left
      [25, 0.0, -145], // Louis Chiron
      [55, 0.0, -135], // Swimming Pool chicane
      [70, 0.0, -105],
      [65, 0.0, -65],  // La Rascasse hairpin right
      [45, 0.0, -35],  // Anthony Noghès
      [20, 0.0, -15]
    ]
  },

  suzuka: {
    id: 'suzuka',
    name: 'Suzuka International Circuit',
    location: 'Mie Prefecture, Japan',
    country: 'Japan',
    flag: '🇯🇵',
    description: 'The legendary Figure-8: First Corner, flowing S-Curves, Degner, Spoon Curve, supersonic 130R & Casio Triangle.',
    turns: 18,
    lengthMeters: 652,
    roadWidth: 8.5,
    kerbWidth: 1.8,
    wallDistance: 18.0,
    kerbColorA: 0xd8232a, // Japanese Red
    kerbColorB: 0xffffff, // White
    roadColorA: 0x373c46,
    roadColorB: 0x313640,
    wallColorA: 0x9c2727,
    wallColorB: 0x22364e,
    skyColor: 0x0a1120,
    fogColor: 0x0a1120,
    groundColor: 0x142017,
    rawPoints: [
      // Main straight -> First Corner -> S-Curves -> Dunlop -> Degner 1 & 2 -> Hairpin -> 200R -> Spoon -> Back straight -> 130R -> Casio Chicane
      [0, 0, 0],
      [0, 0, 55],
      [18, 0, 85],  // Turn 1 & 2 double right
      [30, 0.5, 110],
      [25, 0.8, 135], // S-Curves 1 (left)
      [40, 1.2, 155], // S-Curves 2 (right)
      [30, 1.5, 175], // S-Curves 3 (left)
      [45, 1.8, 195], // Dunlop curve (long uphill left)
      [35, 2.2, 225],
      [10, 2.0, 240], // Degner 1 fast right
      [-15, 1.5, 245], // Degner 2 tight right
      [-35, 1.0, 230], // Underpass approach
      [-55, 0.5, 200], // Hairpin curve tight left
      [-65, 0.2, 170],
      [-55, 0.0, 140], // 200R sweeping curve
      [-35, 0.2, 95],
      [-30, 0.4, 45],  // Spoon Curve entry
      [-45, 0.6, 5],
      [-70, 0.8, -35], // Spoon double left
      [-95, 0.5, -65],
      [-110, 0.2, -105], // Back straight flat-out
      [-90, 0.0, -150],
      [-50, 0.0, -175], // 130R supersonic left
      [-10, 0.0, -165],
      [15, 0.0, -130], // Casio Triangle chicane
      [10, 0.0, -95],  // Chicane exit onto main straight
      [5, 0.0, -45]
    ]
  }
};

export interface TrackGeometryData {
  config: TrackConfig;
  N: number;
  C: THREE.Vector3[]; // Centerline points
  T: THREE.Vector3[]; // Tangent vectors (forward)
  L: THREE.Vector3[]; // Normal vectors (left)
  elev: number[];     // Y elevation
  length: number;
  spacing: number;
  cpIndices: number[]; // Checkpoint sample indices
}

/**
 * Builds normalized Catmull-Rom spline with perimeter ~645-660m
 * so that at standard go-kart speed (avg 60-65 km/h) a lap takes ~35-40 seconds!
 */
export function buildTrackData(config: TrackConfig, targetN = 800): TrackGeometryData {
  const pts = config.rawPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const tempCurve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const initialLen = tempCurve.getLength();

  // Scale points to reach exact target length ~645-660m
  const scale = config.lengthMeters / initialLen;
  const scaledPts = pts.map(p => new THREE.Vector3(p.x * scale, p.y * Math.min(scale, 1.6), p.z * scale));
  const curve = new THREE.CatmullRomCurve3(scaledPts, true, 'centripetal');

  const N = targetN;
  const sp = curve.getSpacedPoints(N);
  const C: THREE.Vector3[] = [];
  const T: THREE.Vector3[] = [];
  const L: THREE.Vector3[] = [];
  const elev: number[] = [];

  for (let i = 0; i < N; i++) {
    C.push(sp[i]);
    elev.push(sp[i].y);
  }

  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const next = C[(i + 1) % N];
    const prev = C[(i - 1 + N) % N];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    T.push(tangent);

    // Left vector is cross product of Up and Tangent
    const left = new THREE.Vector3().crossVectors(up, tangent).normalize();
    L.push(left);
  }

  const length = curve.getLength();
  const spacing = length / N;

  // 4 checkpoints: CP1 @ 25%, CP2 @ 50%, CP3 @ 75%, Start/Finish @ 0/100%
  const cpIndices = [
    Math.round(N * 0.25),
    Math.round(N * 0.50),
    Math.round(N * 0.75)
  ];

  return {
    config,
    N,
    C,
    T,
    L,
    elev,
    length,
    spacing,
    cpIndices
  };
}
