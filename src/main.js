import * as THREE from 'three';
import { registerSW } from 'virtual:pwa-register';

// -------------------------------------------------------------
// MIDNIGHT CIRCUIT - High-Fidelity 3D Driving Simulator
// -------------------------------------------------------------

// --- PWA Service Worker & Install Management ---
registerSW({ immediate: true });

// --- DOM Elements ---
const container = document.getElementById('canvas-container');
const speedValEl = document.getElementById('speedometer-value');
const speedoNeedleEl = document.getElementById('speedo-needle-group');
const speedoArcEl = document.getElementById('speedo-arc');
const controlsHintEl = document.getElementById('controls-hint');
const lightsIndicatorEl = document.getElementById('lights-indicator');
const lightsDotEl = document.getElementById('lights-dot');
const lightsTextEl = document.getElementById('lights-text');
const audioIndicatorEl = document.getElementById('audio-indicator');
const audioIconEl = document.getElementById('audio-icon');
const audioTextEl = document.getElementById('audio-text');
const rpmValEl = document.getElementById('rpm-value');
const tachoNeedleEl = document.getElementById('tacho-needle-group');
const tachoArcEl = document.getElementById('tacho-arc');
const gearBadgeEl = document.getElementById('gear-badge');
const gearNumberEl = document.getElementById('gear-number');
const shiftStatusEl = document.getElementById('shift-status');
const engineBtnEl = document.getElementById('engine-btn');
const engineDotEl = document.getElementById('engine-dot');
const engineTextEl = document.getElementById('engine-text');
const pwaInstallBtnEl = document.getElementById('pwa-install-btn');
const pwaInstallTextEl = document.getElementById('pwa-install-text');
const iosModalEl = document.getElementById('ios-install-modal');
const closeIosModalBtnEl = document.getElementById('close-ios-modal-btn');
const offlineToastEl = document.getElementById('offline-toast');
const garageExitPromptEl = document.getElementById('garage-exit-prompt');
const transitionOverlayEl = document.getElementById('scene-transition-overlay');
const garageBtnEl = document.getElementById('garage-btn');
const cameraIndicatorEl = document.getElementById('camera-indicator');
const cameraTextEl = document.getElementById('camera-text');

// --- Game & Garage Environment State ---
let inGarage = true;          // Player starts inside the 3D Underground Garage!
let canExitGarage = false;    // True when GT-R R35 reaches the garage exit zone
let isSceneTransitioning = false;
let cameraMode = 'normal';    // 'normal' or 'cockpit'
let carCabinMesh = null;
let garageGroup = null;
let garageDoorMesh = null;
const ceilingLights = [];     // Array tracking cool blue flickering industrial light fixtures

// --- Cockpit Digital Dashboard Telemetry Texture ---
let cockpitDisplayCanvas = null;
let cockpitDisplayCtx = null;
let cockpitDisplayTexture = null;

function initCockpitDisplayTexture() {
  if (cockpitDisplayCanvas) return;
  cockpitDisplayCanvas = document.createElement('canvas');
  cockpitDisplayCanvas.width = 1024;
  cockpitDisplayCanvas.height = 512;
  cockpitDisplayCtx = cockpitDisplayCanvas.getContext('2d');

  cockpitDisplayTexture = new THREE.CanvasTexture(cockpitDisplayCanvas);
  cockpitDisplayTexture.minFilter = THREE.LinearFilter;
  cockpitDisplayTexture.magFilter = THREE.LinearFilter;
}

function updateCockpitDisplays() {
  if (!cockpitDisplayCtx || !cockpitDisplayTexture) return;

  const ctx = cockpitDisplayCtx;
  const w = 1024;
  const h = 512;

  // Dark midnight carbon backdrop
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, w, h);

  const kmh = Math.round(Math.abs(carState.speed) * 3.6);
  const rpm = Math.round(carState.rpm);
  const isRedline = rpm >= 6800;

  // Helper to convert angle (deg) to radians
  const toRad = (deg) => (deg * Math.PI) / 180;

  // -------------------------------------------------------------
  // 1. LEFT GAUGE: ROUND TACHOMETER (RPM x1000 Meter)
  // -------------------------------------------------------------
  const tachoCenterX = 260;
  const tachoCenterY = 256;
  const gaugeRadius = 192;

  // Dark Gauge Dial Base
  ctx.beginPath();
  ctx.arc(tachoCenterX, tachoCenterY, gaugeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1120';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Redline Arc (6.8k to 8k RPM => -6° to 30°)
  ctx.beginPath();
  ctx.arc(tachoCenterX, tachoCenterY, gaugeRadius - 16, toRad(-6), toRad(30));
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#ef4444';
  ctx.stroke();

  // Tachometer Dial Ticks & Bold Numbers (0 to 8 x1000 RPM)
  for (let i = 0; i <= 8; i++) {
    const angleDeg = -210 + (i / 8) * 240;
    const rad = toRad(angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const innerR = gaugeRadius - 32;
    const outerR = gaugeRadius - 12;
    ctx.beginPath();
    ctx.moveTo(tachoCenterX + cos * innerR, tachoCenterY + sin * innerR);
    ctx.lineTo(tachoCenterX + cos * outerR, tachoCenterY + sin * outerR);
    ctx.lineWidth = i >= 7 ? 6 : 4;
    ctx.strokeStyle = i >= 7 ? '#f87171' : '#38bdf8';
    ctx.stroke();

    // Bold Number text
    const textR = gaugeRadius - 56;
    const tx = tachoCenterX + cos * textR;
    const ty = tachoCenterY + sin * textR + 10;
    ctx.fillStyle = i >= 7 ? '#ef4444' : '#f8fafc';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${i}`, tx, ty);
  }

  // Label "x1000 RPM"
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('x1000 RPM', tachoCenterX, tachoCenterY + 84);

  // Tachometer Sweeping Red Glowing Needle
  const rpmRatio = Math.min(1.0, Math.max(0, rpm / 8000));
  const tachoNeedleDeg = -210 + rpmRatio * 240;
  const tachoNeedleRad = toRad(tachoNeedleDeg);

  ctx.beginPath();
  ctx.moveTo(tachoCenterX, tachoCenterY);
  ctx.lineTo(
    tachoCenterX + Math.cos(tachoNeedleRad) * (gaugeRadius - 24),
    tachoCenterY + Math.sin(tachoNeedleRad) * (gaugeRadius - 24)
  );
  ctx.lineWidth = 8;
  ctx.strokeStyle = isRedline ? '#f87171' : '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Needle Hub Cap
  ctx.beginPath();
  ctx.arc(tachoCenterX, tachoCenterY, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // -------------------------------------------------------------
  // 2. RIGHT GAUGE: ROUND SPEEDOMETER (KM/H Meter)
  // -------------------------------------------------------------
  const speedoCenterX = 764;
  const speedoCenterY = 256;

  // Dark Gauge Dial Base
  ctx.beginPath();
  ctx.arc(speedoCenterX, speedoCenterY, gaugeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1120';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Speedometer Dial Ticks & Bold Numbers (0 to 320 KM/H)
  const speedoSteps = 8; // 0, 40, 80, 120, 160, 200, 240, 280, 320
  for (let i = 0; i <= speedoSteps; i++) {
    const val = i * 40;
    const angleDeg = -210 + (i / speedoSteps) * 240;
    const rad = toRad(angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const innerR = gaugeRadius - 32;
    const outerR = gaugeRadius - 12;
    ctx.beginPath();
    ctx.moveTo(speedoCenterX + cos * innerR, speedoCenterY + sin * innerR);
    ctx.lineTo(speedoCenterX + cos * outerR, speedoCenterY + sin * outerR);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Bold Number text
    const textR = gaugeRadius - 56;
    const tx = speedoCenterX + cos * textR;
    const ty = speedoCenterY + sin * textR + 10;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${val}`, tx, ty);
  }

  // Label "KM/H"
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KM/H', speedoCenterX, speedoCenterY + 84);

  // Speedometer Sweeping Cyan Glowing Needle
  const speedRatio = Math.min(1.0, Math.max(0, kmh / 320));
  const speedNeedleDeg = -210 + speedRatio * 240;
  const speedNeedleRad = toRad(speedNeedleDeg);

  ctx.beginPath();
  ctx.moveTo(speedoCenterX, speedoCenterY);
  ctx.lineTo(
    speedoCenterX + Math.cos(speedNeedleRad) * (gaugeRadius - 24),
    speedoCenterY + Math.sin(speedNeedleRad) * (gaugeRadius - 24)
  );
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Needle Hub Cap
  ctx.beginPath();
  ctx.arc(speedoCenterX, speedoCenterY, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // -------------------------------------------------------------
  // 3. CENTER DIGITAL DISPLAY (Between the two round meters)
  // -------------------------------------------------------------
  const centerBoxX = 456;
  const centerBoxY = 96;
  const centerBoxW = 112;
  const centerBoxH = 320;

  ctx.fillStyle = '#030712';
  ctx.fillRect(centerBoxX, centerBoxY, centerBoxW, centerBoxH);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.strokeRect(centerBoxX, centerBoxY, centerBoxW, centerBoxH);

  // GEAR Label & Value
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GEAR', 512, 136);

  let gearVal = `${carState.currentGear}`;
  if (!carState.engineRunning) gearVal = 'OFF';
  else if (carState.isLaunchControl) gearVal = 'LC';
  else if (carState.speed < -0.2) gearVal = 'R';
  else if (kmh < 1 && !keys.forward) gearVal = 'P';

  ctx.fillStyle = gearVal === 'OFF' ? '#ef4444' : '#fef08a';
  ctx.font = '900 56px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(gearVal, 512, 204);

  // Digital Speed readout
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 40px monospace';
  ctx.fillText(`${kmh}`, 512, 284);
  ctx.font = 'bold 18px monospace';
  ctx.fillText('KM/H', 512, 312);

  // Boost bar
  const boost = (speedRatio * 1.35).toFixed(1);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`${boost} BAR`, 512, 364);

  cockpitDisplayTexture.needsUpdate = true;
}

// --- Web Audio Synth Variables ---
let audioCtx = null;
let masterGain = null;
let isAudioMuted = false;
let isAudioInitialized = false;

// Multi-Harmonic V6 Engine Oscillator Bank (Nissan VR38DETT Firing Orders)
let fundOsc = null;        // Firing Order 3 (3 * RPM / 60) - fundamental combustion pulse
let bankOsc = null;        // Bank Order 1.5 (1.5 * RPM / 60) - asymmetric 60-deg V6 rumble
let raspOsc = null;        // Harmonic Order 6 (6 * RPM / 60) - metallic exhaust rasp
let valveOsc = null;       // Harmonic Order 9 (9 * RPM / 60) - upper mechanical texture
let subOsc = null;         // Sub-bass (0.75 * RPM / 60) - chassis vibration

// Acoustic Saturation & Formant Filters
let enginePreGain = null;  // Pre-distortion summing gain
let engineShaper = null;   // Non-linear wave shaper (exhaust manifold acoustic saturation)
let bodyResonator = null;  // Acoustic cavity resonance (~185 Hz)
let raspResonator = null;  // Metallic tip resonance (~880 Hz)
let engineFilter = null;   // Master dynamic lowpass
let engineGain = null;     // Master engine level
let subGain = null;        // Sub-bass level
let raspGain = null;       // Rasp level

// Turbocharger Whine & Spool System
let turboOsc = null;       // High-pitch turbine whistle
let turboGain = null;      // Dynamic turbo boost volume
let turboFilter = null;    // Resonant bandpass tracking turbine whistle
let turboBoost = 0;        // Simulated turbo boost level (0.0 to 1.0) with spool lag
let lastThrottleState = false; // For detecting throttle lift and triggering wastegate blow-off

// Twin Intake Induction Airflow Roar
let intakeNoiseSource = null;
let intakeFilter = null;
let intakeGain = null;

// High-Friction Asphalt Tire Skid & Screech Synthesizer
let skidNoiseSource = null;
let skidCarcassSource = null;
let skidFilter1 = null;      // Dynamic granular asphalt scrub bandpass (1100 - 2400 Hz)
let skidFilter2 = null;      // High screech resonance peak (2800 - 3800 Hz)
let skidFilter3 = null;      // Top-end acoustic smoothing lowpass
let skidCarcassFilter = null;// Low tire carcass scrub rumble
let skidGain = null;         // Master tire skid volume
let skidCarcassGain = null;  // Carcass rumble volume

// Overrun Burble Timer
let overrunBurbleTimer = 0;

// Pre-allocated Audio Buffers for Zero-Allocation Playback
const popBuffers = [];
const tailBuffers = [];

// Reusable scratch vectors to eliminate runtime garbage collection allocations
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLookAt = new THREE.Vector3();
const _rearLeftOffset = new THREE.Vector3(-0.95, 0.08, 1.35);
const _rearRightOffset = new THREE.Vector3(0.95, 0.08, 1.35);
const _frontLeftOffset = new THREE.Vector3(-0.95, 0.08, -1.35);
const _frontRightOffset = new THREE.Vector3(0.95, 0.08, -1.35);
const _sprayLeftOffset = new THREE.Vector3(-0.94, 0.2, 1.45);
const _sprayRightOffset = new THREE.Vector3(0.94, 0.2, 1.45);

// --- Three.js Globals ---
let scene, camera, renderer, pmremGenerator;
let clock = new THREE.Clock();

// --- Highway & Chunk Dimensions ---
const ROAD_WIDTH = 16;
const CHUNK_LENGTH = 120;
const TOTAL_CHUNKS = 10;
const ROAD_SPAN = CHUNK_LENGTH * TOTAL_CHUNKS;

// --- 6-Speed Automatic Transmission Specifications ---
const GEAR_CONFIG = [
  { gear: 1, maxKmh: 44,  shiftUpKmh: 38,  downshiftKmh: 0,   ratio: 3.80 },
  { gear: 2, maxKmh: 66,  shiftUpKmh: 60,  downshiftKmh: 28,  ratio: 2.62 },
  { gear: 3, maxKmh: 102, shiftUpKmh: 94,  downshiftKmh: 52,  ratio: 1.88 },
  { gear: 4, maxKmh: 140, shiftUpKmh: 132, downshiftKmh: 84,  ratio: 1.42 },
  { gear: 5, maxKmh: 176, shiftUpKmh: 168, downshiftKmh: 122, ratio: 1.12 },
  { gear: 6, maxKmh: 205, shiftUpKmh: 999, downshiftKmh: 156, ratio: 0.86 },
];

// --- Vehicle State & Physics ---
const carState = {
  // Spatial
  position: new THREE.Vector3(0, 0, 0),
  heading: 0, // 0 = forward along -Z
  speed: 0, // m/s (55.56 m/s = 200 km/h)
  steerAngle: 0,
  pitchAngle: 0,
  rollAngle: 0,

  // Engine Status & Ignition
  engineRunning: false,
  engineStarting: false,
  startupTimer: 0,
  startupDuration: 0.85,

  // Transmission & RPM
  currentGear: 1, // 1 to 6
  isShifting: false,
  shiftType: 'none', // 'none' | 'up'
  shiftProgress: 0,
  shiftTimer: 0,
  shiftDuration: 0.20, // Ultra-fast, crisp dual-clutch gear shift
  shiftStartRpm: 0,
  shiftTargetRpm: 0,
  rpm: 0,
  idleRpm: 950,
  redlineRpm: 7200,
  maxRpm: 8000,

  // Launch Control System (W + SPACE)
  isLaunchControl: false,
  launchControlTimer: 0,
  launchStage: 0, // 0 = off, 1 = 4000 RPM (0-2s), 2 = 5700 RPM (>2s)
  isLaunching: false,
  launchTimer: 0,

  // Dynamics limits (0 to 200 km/h progressive highway pulling)
  maxForwardSpeed: 55.56, // exactly 200 km/h
  maxReverseSpeed: 11.11, // ~40 km/h
  baseEnginePower: 3.45,
  brakeRate: 9.6, // Realistic 0.98G sport brake deceleration (was an excessive 30.0)
  handbrakeRate: 13.5, // Handbrake deceleration (was 45.0)
  brakePressure: 0, // Progressive hydraulic pedal pressure
  reverseAccelRate: 5.5,
  rollingFriction: 0.7,
  aeroDragCoeff: 0.00040,
  maxSteerAngle: 0.34, // Rebalanced for responsive yet controllable steering
  steerReturnSpeed: 5.4, // Natural centering speed
  steerInputSpeed: 3.6, // Quick responsive turn-in without sluggish delay
  wheelbase: 2.75,
  wheelRadius: 0.36,
  wheelRotation: 0,

  // Road guardrail boundary (road width is 16, lane is within ±7.4)
  roadLimitX: 7.4,
  isClutchDepressed: false,
  prevClutchState: false,
};

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  clutch: false,
};

let hasDriven = false;

// Scene collections
const roadChunks = [];
let carGroup, carChassis, interiorSteeringWheel;
const wheels = { fl: null, fr: null, rl: null, rr: null };
const steerPivots = { fl: null, fr: null };
const headlights = [], headlightBeams = [], headlightLenses = [], headlightTargets = [];
let roadBeamPoolMesh = null;
let taillightRoadDecalMesh = null;
let headlightsOn = true;
let brakeLightMesh;
const afterburnerRings = [];
const afterburnerLenses = [];
let sprayParticles, sprayGeo, sprayPositions;
const SPRAY_COUNT = 80;

// Realistic Volumetric Tire Smoke Billboard System (Wheelspin, Hard Accel, Braking & Drifting)
const TIRE_SMOKE_COUNT = 100;
let smokeGroup;
const smokeMeshPool = [];
let smokeNextIndex = 0;

// Quad Exhaust Backfire Flame & Pop System (4 Silencers)
const exhaustFlameJets = [];
let flameGroupR, flameGroupL;
let outerFlameMat, innerFlameMat, coreFlameMat, rimFlameMat;
let exhaustFlashLight;
let sparkParticles, sparkPositions, sparkVelocities, sparkLives, sparkMaxLives;
const SPARK_COUNT = 28;
let exhaustPopTimer = 0;
const EXHAUST_POP_DURATION = 0.08;
let currentPopDuration = 0.08;
let currentPopIntensity = 1.0;
let isAggressivePopActive = false;

// Overrun High-RPM Pops & Bangs System
let overrunBarrageCount = 0;
let overrunNextPopTimer = 0;
let overrunIntensity = 1.0;
let prevAcceleratorState = false;
let throttleHeldDuration = 0;

// Camera follow system with cinematic, smooth speed-dependent zoom pullback
const cameraFollow = {
  smoothHeading: 0,
  smoothSpeedRatio: 0,
  baseDistance: 7.8,       // Comfortable starting distance framing the whole car nicely
  maxPullback: 4.2,        // Clear, dramatic dynamic zoom pullback as speed climbs to 200 km/h
  baseHeight: 2.65,        // Starting camera height
  maxHeightRise: 0.90,     // Dynamic elevation rise for expansive highway view
  lookAhead: 14.0,         // Forward focus point
  maxLookAheadExtend: 8.0, // High-speed forward road focus extension
  lookHeight: 1.15,
  baseFov: 54,             // Cinematic telephoto baseline
  maxFovExtend: 12,        // Smooth speed tunnel FOV expansion (54° -> 66°)
};

// -------------------------------------------------------------
// Procedural High-Fidelity PBR Textures (Wet Asphalt)
// -------------------------------------------------------------
function generateRoadPBRTextures() {
  const width = 1024;
  const height = 1024;

  // 1. Albedo / Diffuse Canvas (Dark Wet Asphalt with Markings & Puddles)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');

  // Deep dark damp asphalt base
  diffCtx.fillStyle = '#111317';
  diffCtx.fillRect(0, 0, width, height);

  // Worn tire tracks in lanes (darker damp sheen)
  const trackGradients = [
    { x: width * 0.16, w: width * 0.12 },
    { x: width * 0.38, w: width * 0.12 },
    { x: width * 0.62, w: width * 0.12 },
    { x: width * 0.84, w: width * 0.12 },
  ];
  trackGradients.forEach((track) => {
    const grad = diffCtx.createLinearGradient(track.x - track.w / 2, 0, track.x + track.w / 2, 0);
    grad.addColorStop(0, 'rgba(10, 12, 15, 0)');
    grad.addColorStop(0.5, 'rgba(8, 10, 12, 0.65)');
    grad.addColorStop(1, 'rgba(10, 12, 15, 0)');
    diffCtx.fillStyle = grad;
    diffCtx.fillRect(track.x - track.w / 2, 0, track.w, height);
  });

  // Micro gravel noise
  const imgData = diffCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 2)); // cool night tint
  }
  diffCtx.putImageData(imgData, 0, 0);

  // Road Markings (Weathered, crisp retroreflective paint)
  // Outer Solid White Shoulder Lines
  diffCtx.fillStyle = '#e2e8f0';
  diffCtx.fillRect(width * 0.045, 0, 15, height);
  diffCtx.fillRect(width * 0.955 - 15, 0, 15, height);

  // Dashed Lane Dividers
  diffCtx.fillStyle = '#cbd5e1';
  const dashH = 55;
  const gapH = 45;
  let y = 0;
  while (y < height) {
    diffCtx.fillRect(width * 0.275, y, 9, dashH);
    diffCtx.fillRect(width * 0.725 - 9, y, 9, dashH);
    y += dashH + gapH;
  }

  // Double Solid Highway Yellow Center Line
  diffCtx.fillStyle = '#f59e0b';
  diffCtx.fillRect(width * 0.492 - 6, 0, 7, height);
  diffCtx.fillRect(width * 0.508, 0, 7, height);

  // 2. Normal Map Canvas (Sobel bump filtered from aggregate noise)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = 512;
  normCanvas.height = 512;
  const normCtx = normCanvas.getContext('2d');
  const normImg = normCtx.createImageData(512, 512);
  const nData = normImg.data;

  // Generate fine asphalt bump normal map
  for (let py = 0; py < 512; py++) {
    for (let px = 0; px < 512; px++) {
      const idx = (py * 512 + px) * 4;
      const nx = (Math.random() - 0.5) * 0.45;
      const ny = (Math.random() - 0.5) * 0.45;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      nData[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }
  normCtx.putImageData(normImg, 0, 0);

  // 3. Roughness Map Canvas (Specular wet tracks vs rough gravel)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const roughCtx = roughCanvas.getContext('2d');

  // Dry rough asphalt baseline (gray ~0.8)
  roughCtx.fillStyle = '#cccccc';
  roughCtx.fillRect(0, 0, 512, 512);

  // Wet shiny wheel tracks (darker = lower roughness = high gloss reflections)
  const wetLanes = [512 * 0.16, 512 * 0.38, 512 * 0.62, 512 * 0.84];
  wetLanes.forEach((wx) => {
    const rGrad = roughCtx.createRadialGradient(wx, 256, 10, wx, 256, 60);
    rGrad.addColorStop(0, '#2a2a2a'); // Very shiny wet center
    rGrad.addColorStop(1, 'rgba(204, 204, 204, 0)');
    roughCtx.fillStyle = rGrad;
    roughCtx.fillRect(wx - 50, 0, 100, 512);
  });

  // Textures setup
  const albedoTexture = new THREE.CanvasTexture(diffCanvas);
  albedoTexture.wrapS = THREE.RepeatWrapping;
  albedoTexture.wrapT = THREE.RepeatWrapping;
  albedoTexture.repeat.set(1, CHUNK_LENGTH / 15);
  albedoTexture.anisotropy = 16;

  const normalTexture = new THREE.CanvasTexture(normCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(8, (CHUNK_LENGTH / 15) * 8);

  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.repeat.set(1, CHUNK_LENGTH / 15);

  return { albedoTexture, normalTexture, roughnessTexture };
}

// -------------------------------------------------------------
// Photorealistic Bi-LED Headlight Highway Ground Illumination Map
// (Seamless soft-edged continuous Gaussian beam)
// -------------------------------------------------------------
function generateHeadlightGroundTexture() {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Pure black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 1. Broad Unified Low-Beam Highway Illuminator (Wide, seamless forward carpet)
  const broadGrad = ctx.createRadialGradient(512, 700, 30, 512, 600, 520);
  broadGrad.addColorStop(0, 'rgba(230, 245, 255, 0.75)');
  broadGrad.addColorStop(0.25, 'rgba(200, 235, 255, 0.55)');
  broadGrad.addColorStop(0.55, 'rgba(150, 210, 255, 0.28)');
  broadGrad.addColorStop(0.80, 'rgba(90, 160, 240, 0.08)');
  broadGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = broadGrad;
  ctx.beginPath();
  ctx.ellipse(512, 600, 480, 390, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-Beam Long-Throw Forward Elliptical Focus (Down the highway lanes)
  const forwardGrad = ctx.createRadialGradient(512, 420, 20, 512, 420, 380);
  forwardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
  forwardGrad.addColorStop(0.20, 'rgba(225, 245, 255, 0.65)');
  forwardGrad.addColorStop(0.55, 'rgba(165, 218, 255, 0.25)');
  forwardGrad.addColorStop(0.85, 'rgba(100, 175, 245, 0.05)');
  forwardGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = forwardGrad;
  ctx.beginPath();
  ctx.ellipse(512, 420, 280, 380, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Dual Projector Hotspots directly ahead of left and right lamps
  [-110, 110].forEach(xOffset => {
    const spotGrad = ctx.createRadialGradient(512 + xOffset, 560, 10, 512 + xOffset, 560, 220);
    spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    spotGrad.addColorStop(0.30, 'rgba(220, 242, 255, 0.50)');
    spotGrad.addColorStop(0.70, 'rgba(140, 205, 255, 0.15)');
    spotGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.ellipse(512 + xOffset, 560, 130, 260, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Soft Bumper-Base Transition Mask (Ensures 100% smooth zero-line fade near the bumper)
  ctx.globalCompositeOperation = 'destination-in';
  const maskGrad = ctx.createLinearGradient(0, 1024, 0, 0);
  maskGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  maskGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.6)');
  maskGrad.addColorStop(0.20, 'rgba(0, 0, 0, 1.0)');
  maskGrad.addColorStop(0.85, 'rgba(0, 0, 0, 1.0)');
  maskGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// -------------------------------------------------------------
// Photorealistic GT-R Twin Circular Taillight Ground Decal Map
// (Soft Gaussian crimson reflection puddles on wet asphalt)
// -------------------------------------------------------------
function generateTaillightGroundTexture() {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 1. Broad soft ambient red wash spreading across rear lanes
  const broadGrad = ctx.createRadialGradient(256, 440, 30, 256, 360, 260);
  broadGrad.addColorStop(0, 'rgba(230, 20, 35, 0.45)');
  broadGrad.addColorStop(0.35, 'rgba(190, 10, 25, 0.28)');
  broadGrad.addColorStop(0.70, 'rgba(130, 5, 18, 0.10)');
  broadGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = broadGrad;
  ctx.beginPath();
  ctx.ellipse(256, 360, 230, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Dual lateral rear light beams matching left and right GT-R taillight clusters
  const xCenters = [215, 297];

  xCenters.forEach((cx) => {
    // Elongated rear throw pool extending down the asphalt
    const throwGrad = ctx.createRadialGradient(cx, 440, 10, cx, 360, 210);
    throwGrad.addColorStop(0, 'rgba(255, 40, 60, 0.85)');
    throwGrad.addColorStop(0.30, 'rgba(240, 25, 45, 0.55)');
    throwGrad.addColorStop(0.65, 'rgba(180, 10, 25, 0.20)');
    throwGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = throwGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 360, 80, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hotspot near bumper / tire contact
    const spotGrad = ctx.createRadialGradient(cx, 460, 5, cx, 460, 75);
    spotGrad.addColorStop(0, 'rgba(255, 95, 115, 0.95)');
    spotGrad.addColorStop(0.45, 'rgba(255, 35, 55, 0.65)');
    spotGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 460, 55, 60, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Smooth fade mask at bumper edge (Y=512) and far rear road edge (Y=0)
  ctx.globalCompositeOperation = 'destination-in';
  const maskGrad = ctx.createLinearGradient(0, 512, 0, 0);
  maskGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  maskGrad.addColorStop(0.05, 'rgba(0, 0, 0, 0.9)');
  maskGrad.addColorStop(0.20, 'rgba(0, 0, 0, 1.0)');
  maskGrad.addColorStop(0.75, 'rgba(0, 0, 0, 1.0)');
  maskGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// -------------------------------------------------------------
// Procedural Night Sky HDR Environment Map
// -------------------------------------------------------------
function generateEnvironmentMap() {
  const envScene = new THREE.Scene();

  // Dark moody sky dome with moon gradient
  const skyGeo = new THREE.SphereGeometry(100, 32, 16);
  skyGeo.scale(-1, 1, 1);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradient: Deep night sky to subtle horizon glow
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#02050e'); // Deep space zenith
  skyGrad.addColorStop(0.55, '#070f20'); // Night horizon blue
  skyGrad.addColorStop(0.72, '#0d1c38'); // Distant night glow
  skyGrad.addColorStop(1.0, '#050a14'); // Ground dark
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Distant glowing moon disc in environment map
  const moonGrad = ctx.createRadialGradient(720, 120, 5, 720, 120, 90);
  moonGrad.addColorStop(0, '#ffffff');
  moonGrad.addColorStop(0.2, '#93c5fd');
  moonGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(550, 0, 350, 260);

  const skyTex = new THREE.CanvasTexture(canvas);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(skyMesh);

  // Convert to high-performance PMREM environment
  const envMap = pmremGenerator.fromScene(envScene).texture;
  skyGeo.dispose();
  skyMat.dispose();
  skyTex.dispose();

  return envMap;
}

// -------------------------------------------------------------
// Scene Initialization
// -------------------------------------------------------------
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060d);
  scene.fog = new THREE.FogExp2(0x050814, 0.0048);

  camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2.65, 7.8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Setup PMREM Environment
  pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envTexture = generateEnvironmentMap();
  scene.environment = envTexture;

  // Atmosphere: Ambient, Hemisphere & Moonlight
  const hemiLight = new THREE.HemisphereLight(0x2d3e5e, 0x080c14, 0.7);
  scene.add(hemiLight);

  const moonLight = new THREE.DirectionalLight(0x8cb1e8, 0.85);
  moonLight.position.set(50, 110, 60);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.near = 10;
  moonLight.shadow.camera.far = 260;
  moonLight.shadow.camera.left = -32;
  moonLight.shadow.camera.right = 32;
  moonLight.shadow.camera.top = 45;
  moonLight.shadow.camera.bottom = -45;
  moonLight.shadow.bias = -0.0004;
  scene.add(moonLight);

  createStarfield();
  createMoon();
  createRoadSprayParticles();
  createTireSmokeParticles();
  buildCar();
  buildGarage();
  buildRoadChunks();

  // Initially hide highway road chunks while player is inside the garage
  roadChunks.forEach((chunk) => {
    chunk.group.visible = false;
  });

  // Player starts seated inside the GT-R R35 in Slot 1 inside the garage
  carState.position.set(-7.0, 0, 12.0);
  carState.heading = 0;
  carState.speed = 0;

  setupInputListeners();
  updateEngineHUD();
  window.addEventListener('resize', onWindowResize, false);
}

// -------------------------------------------------------------
// Stars & Night Celestial Elements
// -------------------------------------------------------------
function createStarfield() {
  const count = 2200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xa5c9eb),
    new THREE.Color(0xfcd34d),
    new THREE.Color(0xd8b4fe),
  ];

  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(Math.random() * 0.96);
    const rad = 600 + Math.random() * 120;

    pos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = Math.abs(rad * Math.cos(phi)) + 12;
    pos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);

    const c = palette[Math.floor(Math.random() * palette.length)];
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    fog: false,
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
}

function createMoon() {
  const moonGroup = new THREE.Group();
  moonGroup.position.set(140, 190, -420);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(15, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xf1f5f9, fog: false })
  );
  moonGroup.add(moonMesh);

  // Soft atmospheric moon corona glow
  const coronaMesh = new THREE.Mesh(
    new THREE.RingGeometry(15, 36, 48),
    new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  coronaMesh.lookAt(0, 0, 0);
  moonGroup.add(coronaMesh);

  scene.add(moonGroup);
}

// -------------------------------------------------------------
// Road Spray / Night Mist Particles
// -------------------------------------------------------------
function createRoadSprayParticles() {
  sprayGeo = new THREE.BufferGeometry();
  sprayPositions = new Float32Array(SPRAY_COUNT * 3);

  for (let i = 0; i < SPRAY_COUNT; i++) {
    sprayPositions[i * 3] = 0;
    sprayPositions[i * 3 + 1] = -100; // initially hidden
    sprayPositions[i * 3 + 2] = 0;
  }

  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));

  const sprayMat = new THREE.PointsMaterial({
    color: 0xcfd8dc,
    size: 0.45,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  sprayParticles = new THREE.Points(sprayGeo, sprayMat);
  scene.add(sprayParticles);
}

function updateRoadSpray(dt) {
  if (!sprayGeo || !carGroup) return;

  const positions = sprayGeo.attributes.position.array;
  const speedRatio = Math.abs(carState.speed) / carState.maxForwardSpeed;

  _v1.copy(_sprayLeftOffset).applyMatrix4(carGroup.matrixWorld);
  _v2.copy(_sprayRightOffset).applyMatrix4(carGroup.matrixWorld);

  for (let i = 0; i < SPRAY_COUNT; i++) {
    const idx = i * 3;
    if (speedRatio > 0.08 && Math.random() < 0.35) {
      const source = i % 2 === 0 ? _v1 : _v2;
      positions[idx] = source.x + (Math.random() - 0.5) * 0.3;
      positions[idx + 1] = source.y + Math.random() * 0.2;
      positions[idx + 2] = source.z + Math.random() * 0.3;
    } else {
      // Drift backward and upward slowly
      positions[idx + 1] += 0.8 * dt;
      positions[idx + 2] += (carState.speed * 0.4) * dt;
    }
  }

  sprayGeo.attributes.position.needsUpdate = true;
}

// -------------------------------------------------------------
// Realistic Volumetric Tire Smoke Billboard System (Wheelspin, Hard Accel, Braking & Drifting)
// -------------------------------------------------------------
let smokeTexture;

function createSmokePuffTexture() {
  if (smokeTexture) return smokeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Multi-layered Gaussian organic cloud puff
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.20, 'rgba(245, 248, 255, 0.85)');
  grad.addColorStop(0.48, 'rgba(230, 238, 248, 0.55)');
  grad.addColorStop(0.75, 'rgba(210, 225, 240, 0.20)');
  grad.addColorStop(1, 'rgba(190, 210, 230, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  // Secondary offset soft puffs for irregular smoky texture
  const subGrad = ctx.createRadialGradient(48, 52, 2, 48, 52, 42);
  subGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  subGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = subGrad;
  ctx.beginPath();
  ctx.arc(48, 52, 42, 0, Math.PI * 2);
  ctx.fill();

  smokeTexture = new THREE.CanvasTexture(canvas);
  smokeTexture.needsUpdate = true;
  return smokeTexture;
}

function createTireSmokeParticles() {
  smokeGroup = new THREE.Group();
  scene.add(smokeGroup);

  const texture = createSmokePuffTexture();
  const planeGeo = new THREE.PlaneGeometry(1, 1);

  for (let i = 0; i < TIRE_SMOKE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.visible = false;
    mesh.position.set(0, -100, 0);
    smokeGroup.add(mesh);

    smokeMeshPool.push({
      mesh,
      mat,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1.0,
      baseSize: 1.0,
      targetOpacity: 0.7,
      rotAngle: 0,
      rotSpeed: 0,
      active: false,
    });
  }
}

function spawnTireSmokePuff(worldPos, isRear, isBraking, intensity = 1.0, isLaunch = false) {
  const p = smokeMeshPool[smokeNextIndex];
  smokeNextIndex = (smokeNextIndex + 1) % TIRE_SMOKE_COUNT;

  p.active = true;
  p.mesh.visible = true;

  // Position at tire contact patch with subtle variance
  p.mesh.position.set(
    worldPos.x + (Math.random() - 0.5) * 0.20,
    worldPos.y + 0.10 + Math.random() * 0.10,
    worldPos.z + (Math.random() - 0.5) * 0.20
  );

  // Velocity: Outward lateral expansion, air drift, and upward thermal billow
  const heading = carState.heading;
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  const slipSpeed = Math.abs(carState.speed);

  const lateral = (Math.random() - 0.5) * (isLaunch ? 2.2 : 1.8);
  const forward = (Math.random() - 0.5) * 1.0;

  p.velocity.set(
    lateral * cosH + forward * sinH,
    (isLaunch ? 0.85 : 0.60) + Math.random() * 0.70, // Natural upward thermal rise
    -lateral * sinH + forward * cosH + (slipSpeed * 0.30) * cosH
  );

  // Increased lifespan for launch control smoke (0.65s - 0.90s) for fuller trailing plume
  const life = isLaunch ? (0.65 + Math.random() * 0.25) : (0.35 + Math.random() * 0.17);
  p.life = life;
  p.maxLife = life;
  p.baseSize = isLaunch ? (0.70 + Math.random() * 0.35) : (0.55 + Math.random() * 0.30);
  p.targetOpacity = Math.min(0.65, (0.45 + Math.random() * 0.15) * intensity);
  p.rotAngle = Math.random() * Math.PI * 2;
  p.rotSpeed = (Math.random() - 0.5) * 2.2;

  p.mesh.scale.set(p.baseSize, p.baseSize, 1);
  p.mat.opacity = p.targetOpacity;

  // Strict White / Grey Tones Only (Neutral natural tire friction smoke)
  const greyTones = [0xf8fafc, 0xf1f5f9, 0xe2e8f0, 0xd4d4d8, 0xcccccc];
  const chosenColor = greyTones[Math.floor(Math.random() * greyTones.length)];
  p.mat.color.setHex(chosenColor);
}

function updateTireSmoke(dt) {
  if (!smokeGroup || !carGroup) return;

  const canDrive = carState.engineRunning && !carState.engineStarting;
  const currentKmh = Math.abs(carState.speed) * 3.6;
  const forwardMoving = carState.speed > 0.05;

  // 1. Launch Control Takeoff Only:
  // Normal takeoff without launch control produces NO smoke.
  // Smoke ONLY occurs when car accelerates forward actively with Launch Control!
  const isLaunchTakeoff = canDrive && carState.isLaunching && forwardMoving && currentKmh < 45.0;

  // 2. Strong Emergency Braking Skid Only:
  // Low or moderate braking does NOT trigger any smoke.
  // Smoke only triggers under hard threshold emergency braking (> 75% brake pressure) at high speed (> 25 km/h) or high-speed handbrake.
  const isStrongBraking = (keys.backward && forwardMoving && currentKmh > 25.0 && carState.brakePressure > 0.75) ||
                          (keys.handbrake && forwardMoving && currentKmh > 25.0);

  if (isLaunchTakeoff || isStrongBraking) {
    carGroup.updateMatrixWorld(true);

    if (isLaunchTakeoff) {
      const burnoutIntensity = 0.92;
      const spawnRate = 0.72;

      // Rear tires (Primary drive delivery)
      if (Math.random() < spawnRate) {
        _v1.copy(_rearLeftOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, true, false, burnoutIntensity, true);
      }
      if (Math.random() < spawnRate) {
        _v1.copy(_rearRightOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, true, false, burnoutIntensity, true);
      }
      // Front tires (AWD transfer slip)
      if (Math.random() < spawnRate * 0.45) {
        _v1.copy(_frontLeftOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, false, false, burnoutIntensity * 0.75, true);
      }
      if (Math.random() < spawnRate * 0.45) {
        _v1.copy(_frontRightOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, false, false, burnoutIntensity * 0.75, true);
      }
    }

    if (isStrongBraking) {
      const brakeIntensity = Math.min(0.9, Math.max(0.45, currentKmh / 50));
      const brakeSpawnRate = 0.65;

      // Skid smoke on braking wheels under heavy deceleration
      if (Math.random() < brakeSpawnRate) {
        _v1.copy(_rearLeftOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, true, true, brakeIntensity, false);
      }
      if (Math.random() < brakeSpawnRate) {
        _v1.copy(_rearRightOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, true, true, brakeIntensity, false);
      }
      if (Math.random() < brakeSpawnRate * 0.7) {
        _v1.copy(_frontLeftOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, false, true, brakeIntensity, false);
      }
      if (Math.random() < brakeSpawnRate * 0.7) {
        _v1.copy(_frontRightOffset).applyMatrix4(carGroup.matrixWorld);
        spawnTireSmokePuff(_v1, false, true, brakeIntensity, false);
      }
    }
  }

  // 3. Update Existing Active Smoke Billboard Meshes
  const camQuat = camera.quaternion;

  for (let i = 0; i < TIRE_SMOKE_COUNT; i++) {
    const p = smokeMeshPool[i];
    if (p.active) {
      p.life -= dt;

      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        p.mesh.position.set(0, -100, 0);
      } else {
        const progress = 1.0 - (p.life / p.maxLife);

        // Position translation
        p.mesh.position.addScaledVector(p.velocity, dt);

        // Air drag
        p.velocity.x *= (1.0 - 1.6 * dt);
        p.velocity.y *= (1.0 - 0.9 * dt);
        p.velocity.z *= (1.0 - 1.8 * dt);

        // Moderate volumetric expansion (starts ~0.6m, expands to ~1.8m)
        const currentScale = p.baseSize * (1.0 + progress * 2.1);
        p.mesh.scale.set(currentScale, currentScale, 1);

        // Rotate facing camera + roll
        p.rotAngle += p.rotSpeed * dt;
        p.mesh.quaternion.copy(camQuat);
        p.mesh.rotateZ(p.rotAngle);

        // Smooth exponential opacity fade so smoke vanishes cleanly without lingering
        p.mat.opacity = p.targetOpacity * Math.pow(Math.max(0, 1.0 - progress), 1.55);
      }
    }
  }
}

// -------------------------------------------------------------
// Nissan GT-R R35 ("Godzilla") Photorealistic 3D Construction
// -------------------------------------------------------------
function buildCar() {
  carGroup = new THREE.Group();
  scene.add(carGroup);

  carChassis = new THREE.Group();
  carGroup.add(carChassis);

  // PBR Automotive Materials
  // 1. Nissan GT-R Iconic Bayside Blue Metallic Multi-Layer Clearcoat
  const carPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a46b8, // Legendary Bayside Blue Metallic
    metalness: 0.92,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 1.0,
  });

  // 2. Satin Carbon-Fiber Aero Trim (Diffuser, Splitter, Wing, NACA Ducts)
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.42,
    metalness: 0.65,
  });

  // 3. Dark Titanium / Gunmetal Trim (Grille, Wheels)
  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x272c35,
    metalness: 0.90,
    roughness: 0.22,
  });

  // 4. GT-R Signature Crimson Red Accent (Badges, Nismo Pinstripe, Red "R")
  const gtrRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.45,
    roughness: 0.28,
  });

  // 5. Automotive Deep Tinted Glass with Specular Reflection
  const carGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050e1c,
    metalness: 0.12,
    roughness: 0.04,
    transmission: 0.72,
    ior: 1.52,
    reflectivity: 0.92,
    transparent: true,
    opacity: 0.82,
  });

  // 6. Polished Chrome / Mirror Metal
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.98,
    roughness: 0.04,
  });

  // 7. Titanium Heat-Treated Burnt Blue (Exhaust Tips)
  const burntTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    metalness: 0.95,
    roughness: 0.12,
  });

  // -----------------------------------------------------------
  // A. Sculpted Nissan GT-R R35 Chassis & Widebody
  // -----------------------------------------------------------

  // Lower Main Hull with Chiseled Shoulder Crease
  const mainHullGeo = new THREE.BoxGeometry(1.90, 0.42, 4.38);
  const mainHull = new THREE.Mesh(mainHullGeo, carPaintMat);
  mainHull.position.set(0, 0.44, 0);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  carChassis.add(mainHull);

  // GT-R R35 Long Muscular Hood with Twin Power Bulge Creases
  const hoodGeo = new THREE.BoxGeometry(1.84, 0.26, 1.48);
  const hood = new THREE.Mesh(hoodGeo, carPaintMat);
  hood.position.set(0, 0.53, -1.25);
  hood.rotation.x = -0.055;
  hood.castShadow = true;
  carChassis.add(hood);

  // Center Raised Power Bulge
  const powerBulge = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 1.35), carPaintMat);
  powerBulge.position.set(0, 0.66, -1.25);
  carChassis.add(powerBulge);

  // Iconic Nissan GT-R R35 Dual Hood NACA Air Ducts (Cooling V6 Twin-Turbo)
  [-0.36, 0.36].forEach((xPos) => {
    // Recessed Carbon NACA Scoop
    const nacaGeo = new THREE.BoxGeometry(0.13, 0.035, 0.26);
    const nacaMesh = new THREE.Mesh(nacaGeo, carbonMat);
    nacaMesh.position.set(xPos, 0.66, -1.30);
    nacaMesh.rotation.x = 0.08;
    carChassis.add(nacaMesh);

    // Dark Intake Mouth
    const nacaMouth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.05), carbonMat);
    nacaMouth.position.set(xPos, 0.665, -1.18);
    carChassis.add(nacaMouth);
  });

  // Aerodynamic Tapered Front Nose Shell
  const noseGeo = new THREE.BoxGeometry(1.84, 0.32, 0.72);
  const nose = new THREE.Mesh(noseGeo, carPaintMat);
  nose.position.set(0, 0.38, -2.34);
  nose.castShadow = true;
  carChassis.add(nose);

  // Nissan GT-R V-Motion Matte Dark Grille Mouth
  const grilleMouthGeo = new THREE.BoxGeometry(1.36, 0.35, 0.16);
  const grilleMouth = new THREE.Mesh(grilleMouthGeo, darkTitaniumMat);
  grilleMouth.position.set(0, 0.35, -2.71);
  carChassis.add(grilleMouth);

  // GT-R Center Horizontal Bumper Bar
  const bumperBar = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 0.09), carbonMat);
  bumperBar.position.set(0, 0.36, -2.72);
  carChassis.add(bumperBar);

  // Iconic Front GT-R Emblem (Chrome 'GT' + Crimson Red 'R')
  const gtrEmblemGroup = new THREE.Group();
  gtrEmblemGroup.position.set(0, 0.36, -2.77);
  const gtPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.015), chromeMat);
  gtPlate.position.x = -0.025;
  gtrEmblemGroup.add(gtPlate);
  const rBadge = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.058, 0.018), gtrRedMat);
  rBadge.position.x = 0.038;
  gtrEmblemGroup.add(rBadge);
  carChassis.add(gtrEmblemGroup);

  // Carbon Fiber Front Splitter & Nismo-Style Red Pinstripe
  const splitterGeo = new THREE.BoxGeometry(1.96, 0.06, 0.88);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.20, -2.38);
  splitter.castShadow = true;
  carChassis.add(splitter);

  // Front Splitter Red Nismo Pinstripe Edge
  const frontRedStripe = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.016, 0.02), gtrRedMat);
  frontRedStripe.position.set(0, 0.18, -2.82);
  carChassis.add(frontRedStripe);

  // Front Corner Aero Canards
  [-0.98, 0.98].forEach((xPos) => {
    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.18), carbonMat);
    canard.position.set(xPos, 0.26, -2.44);
    canard.rotation.y = xPos > 0 ? -0.15 : 0.15;
    carChassis.add(canard);
  });

  // Lower Brake Duct Intakes
  [-0.72, 0.72].forEach((xPos) => {
    const duct = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), carbonMat);
    duct.position.set(xPos, 0.25, -2.70);
    carChassis.add(duct);
  });

  // Flared Muscular Wheel Arches (Fenders)
  const fenderGeo = new THREE.BoxGeometry(0.12, 0.38, 0.92);
  // Front Left & Right Wide Fenders
  const fenderFL = new THREE.Mesh(fenderGeo, carPaintMat);
  fenderFL.position.set(-0.98, 0.46, -1.35);
  carChassis.add(fenderFL);
  const fenderFR = fenderFL.clone();
  fenderFR.position.x = 0.98;
  carChassis.add(fenderFR);

  // Rear Left & Right Wide Muscular Haunches (Godzilla Hips)
  const rearHaunchGeo = new THREE.BoxGeometry(0.14, 0.40, 1.05);
  const fenderRL = new THREE.Mesh(rearHaunchGeo, carPaintMat);
  fenderRL.position.set(-0.99, 0.47, 1.35);
  carChassis.add(fenderRL);
  const fenderRR = fenderRL.clone();
  fenderRR.position.x = 0.99;
  carChassis.add(fenderRR);

  // Iconic Nissan GT-R Front Fender Air Extractors (Side Gills & Badges)
  [-0.99, 0.99].forEach((xPos) => {
    const sideVentGroup = new THREE.Group();
    sideVentGroup.position.set(xPos, 0.54, -0.74);

    // Recessed Carbon Gill Vent
    const ventSlot = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.15), carbonMat);
    sideVentGroup.add(ventSlot);

    // Chrome Fender Slash Fin
    const chromeFin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.11), chromeMat);
    chromeFin.position.set(xPos > 0 ? 0.01 : -0.01, 0.03, 0);
    sideVentGroup.add(chromeFin);

    // GT-R Red Crest Badge
    const sideBadge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.04), gtrRedMat);
    sideBadge.position.set(xPos > 0 ? 0.012 : -0.012, -0.04, 0);
    sideVentGroup.add(sideBadge);

    carChassis.add(sideVentGroup);
  });

  // Aerodynamic Carbon Side Skirts with Nismo Red Stripe
  const skirtGeo = new THREE.BoxGeometry(0.10, 0.11, 2.68);
  const skirtR = new THREE.Mesh(skirtGeo, carbonMat);
  skirtR.position.set(0.98, 0.23, 0);
  carChassis.add(skirtR);
  const skirtL = skirtR.clone();
  skirtL.position.x = -0.98;
  carChassis.add(skirtL);

  const skirtStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.018, 2.66), gtrRedMat);
  skirtStripeR.position.set(1.035, 0.20, 0);
  carChassis.add(skirtStripeR);
  const skirtStripeL = skirtStripeR.clone();
  skirtStripeL.position.x = -1.035;
  carChassis.add(skirtStripeL);

  // -----------------------------------------------------------
  // B. Nissan GT-R R35 Cockpit, Roofline & Sword C-Pillar
  // -----------------------------------------------------------

  // Aerodynamic Tapered Cockpit Greenhouse Glass
  const cabinGeo = new THREE.BoxGeometry(1.48, 0.54, 2.22);
  carCabinMesh = new THREE.Mesh(cabinGeo, carGlassMat);
  carCabinMesh.position.set(0, 0.86, 0.12);
  carCabinMesh.castShadow = true;
  carChassis.add(carCabinMesh);

  // Flat Sloping Metallic Roof Shell
  const roofGeo = new THREE.BoxGeometry(1.38, 0.06, 1.48);
  const roof = new THREE.Mesh(roofGeo, carPaintMat);
  roof.position.set(0, 1.13, 0.15);
  roof.castShadow = true;
  carChassis.add(roof);

  // Slanted A-Pillars
  const aPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 0.07), carPaintMat);
  aPillarR.position.set(0.71, 0.88, -0.74);
  aPillarR.rotation.x = 0.44;
  carChassis.add(aPillarR);
  const aPillarL = aPillarR.clone();
  aPillarL.position.x = -0.71;
  carChassis.add(aPillarL);

  // GT-R Signature Angular Sword C-Pillars (Quarter Window Kink)
  const cPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.54, 0.08), carPaintMat);
  cPillarR.position.set(0.71, 0.88, 1.00);
  cPillarR.rotation.x = -0.38;
  carChassis.add(cPillarR);
  const cPillarL = cPillarR.clone();
  cPillarL.position.x = -0.71;
  carChassis.add(cPillarL);

  // Rear Trunk Deck Lid
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.10, 0.72), carPaintMat);
  trunkLid.position.set(0, 0.68, 1.88);
  carChassis.add(trunkLid);

  // -----------------------------------------------------------
  // JDM Right-Hand Drive (RHD) Nissan GT-R R35 Detailed Cockpit
  // -----------------------------------------------------------
  initCockpitDisplayTexture();

  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x17191e, roughness: 0.6, metalness: 0.2 });
  const alcantaraMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.92, metalness: 0.08 });
  const aluminumTrimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.15 });
  const mfdScreenMat = new THREE.MeshBasicMaterial({ map: cockpitDisplayTexture });

  // 1. Full Dark Alcantara Interior Deck (Encases mainHull top surface y=0.65 cleanly from y=0.54 to y=0.70)
  const dashDeckGeo = new THREE.BoxGeometry(1.76, 0.16, 1.30);
  const dashDeck = new THREE.Mesh(dashDeckGeo, alcantaraMat);
  dashDeck.position.set(0, 0.62, -0.20);
  carChassis.add(dashDeck);

  // 2. Windshield Base Cowl Line (Clean, realistic boundary dividing dark interior deck from blue exterior hood at z=-0.85)
  const windshieldCowl = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.08), leatherMat);
  windshieldCowl.position.set(0, 0.70, -0.85);
  carChassis.add(windshieldCowl);

  // 3. Elevated Recessed Instrument Cluster Pod Housing (Shifted higher up for prominent visibility)
  const clusterHousingGeo = new THREE.BoxGeometry(0.38, 0.16, 0.06);
  const clusterHousing = new THREE.Mesh(clusterHousingGeo, leatherMat);
  clusterHousing.position.set(0.38, 0.83, -0.50);
  clusterHousing.rotation.x = -0.06;
  carChassis.add(clusterHousing);

  // High-Resolution Tachometer & Speedometer Display Screen
  const clusterDisplayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.15, 0.01),
    mfdScreenMat
  );
  clusterDisplayMesh.position.set(0.38, 0.83, -0.47);
  clusterDisplayMesh.rotation.x = -0.06;
  carChassis.add(clusterDisplayMesh);

  // 4. RHD JDM Steering Wheel Assembly (+0.38 X Offset)
  interiorSteeringWheel = new THREE.Group();
  interiorSteeringWheel.position.set(0.38, 0.72, -0.38);
  interiorSteeringWheel.rotation.x = 0.28;

  // Leather Outer Rim
  const wheelTorus = new THREE.TorusGeometry(0.14, 0.02, 12, 28);
  const wheelRim = new THREE.Mesh(wheelTorus, leatherMat);
  interiorSteeringWheel.add(wheelRim);

  // 3-Spoke Metallic Hub
  [-Math.PI / 2, 0.55, Math.PI - 0.55].forEach((angle) => {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.016), aluminumTrimMat);
    spoke.rotation.z = angle;
    interiorSteeringWheel.add(spoke);
  });

  // Red Anodized GT-R Center Emblem Badge
  const gtrBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16),
    gtrRedMat
  );
  gtrBadge.rotation.x = Math.PI / 2;
  interiorSteeringWheel.add(gtrBadge);

  // Titanium Paddle Shifters behind wheel
  const paddleL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.012), aluminumTrimMat);
  paddleL.position.set(-0.14, 0.02, -0.025);
  interiorSteeringWheel.add(paddleL);
  const paddleR = paddleL.clone();
  paddleR.position.x = 0.14;
  interiorSteeringWheel.add(paddleR);

  // Steering Column Shaft
  const steeringColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.26, 12), alcantaraMat);
  steeringColumn.rotation.x = 0.25;
  steeringColumn.position.set(0, -0.08, -0.10);
  interiorSteeringWheel.add(steeringColumn);

  carChassis.add(interiorSteeringWheel);

  // Center Console & Dark Metallic Panel (No Duplicate Gauge Screen)
  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.75), leatherMat);
  centerConsole.position.set(0, 0.44, -0.25);
  carChassis.add(centerConsole);

  // Sleek Carbon Center Trim Screen (Non-Duplicating Dark Polyphony Display)
  const mfdScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.12, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.3, metalness: 0.8 })
  );
  mfdScreen.position.set(0, 0.54, -0.62);
  mfdScreen.rotation.x = -0.15;
  carChassis.add(mfdScreen);

  // Short-Throw Dual-Clutch Gear Shift Lever
  const shifterBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.04, 12), alcantaraMat);
  shifterBase.position.set(0, 0.58, -0.25);
  carChassis.add(shifterBase);

  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), aluminumTrimMat);
  shifterKnob.position.set(0, 0.65, -0.25);
  carChassis.add(shifterKnob);

  // Red Anodized Engine Start Button on Center Console
  const startBtnInterior = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16),
    gtrRedMat
  );
  startBtnInterior.position.set(0.09, 0.58, -0.32);
  carChassis.add(startBtnInterior);

  // Center Windshield Interior Rear-View Mirror (Facing Rearward Toward Driver)
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(0, 1.15, -0.52);

  const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), alcantaraMat);
  mirrorStem.rotation.x = 0.2;
  mirrorGroup.add(mirrorStem);

  const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.075, 0.02), alcantaraMat);
  mirrorHousing.position.set(0, -0.035, -0.01);
  mirrorGroup.add(mirrorHousing);

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.95,
    roughness: 0.08,
  });
  const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.068, 0.005), mirrorGlassMat);
  mirrorGlass.position.set(0, -0.035, 0.005); // Face +Z rearward towards driver!
  mirrorGlass.rotation.y = -0.12; // Angle slightly toward RHD driver
  mirrorGroup.add(mirrorGlass);

  carChassis.add(mirrorGroup);

  // Interior: Recaro GT-R Sports Bucket Seats (Right Driver + Left Passenger)
  const seatGeo = new THREE.BoxGeometry(0.44, 0.54, 0.44);

  // Driver Seat on RIGHT Side (+0.36)
  const seatDriver = new THREE.Mesh(seatGeo, leatherMat);
  seatDriver.position.set(0.36, 0.64, 0.05);
  carChassis.add(seatDriver);

  // Passenger Seat on LEFT Side (-0.36)
  const seatPass = new THREE.Mesh(seatGeo, leatherMat);
  seatPass.position.set(-0.36, 0.64, 0.05);
  carChassis.add(seatPass);

  // -----------------------------------------------------------
  // C. Nissan GT-R R35 High-Mount Carbon Rear Wing & Spoiler
  // -----------------------------------------------------------
  const spoilerBladeGeo = new THREE.BoxGeometry(1.78, 0.045, 0.34);
  const spoilerWing = new THREE.Mesh(spoilerBladeGeo, carbonMat);
  spoilerWing.position.set(0, 0.98, 2.12);
  spoilerWing.castShadow = true;
  carChassis.add(spoilerWing);

  // Spoiler Aerodynamic Side Endplates
  [-0.89, 0.89].forEach((xPos) => {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.36), carbonMat);
    endplate.position.set(xPos, 0.98, 2.12);
    carChassis.add(endplate);
  });

  // Tall Sculpted Wing Stanchions / Mounts
  const mountGeo = new THREE.BoxGeometry(0.04, 0.28, 0.14);
  const mountL = new THREE.Mesh(mountGeo, carbonMat);
  mountL.position.set(-0.52, 0.84, 2.10);
  carChassis.add(mountL);
  const mountR = mountL.clone();
  mountR.position.x = 0.52;
  carChassis.add(mountR);

  // Aerodynamic Side Mirrors with Chrome Face
  const mirrorShellGeo = new THREE.BoxGeometry(0.2, 0.1, 0.12);
  const mirrorFaceGeo = new THREE.PlaneGeometry(0.18, 0.08);

  const mirrorR = new THREE.Group();
  mirrorR.position.set(1.03, 0.76, -0.66);
  mirrorR.add(new THREE.Mesh(mirrorShellGeo, carPaintMat));
  const mFaceR = new THREE.Mesh(mirrorFaceGeo, chromeMat);
  mFaceR.position.set(0, 0, 0.062);
  mirrorR.add(mFaceR);
  carChassis.add(mirrorR);

  const mirrorL = new THREE.Group();
  mirrorL.position.set(-1.03, 0.76, -0.66);
  mirrorL.add(new THREE.Mesh(mirrorShellGeo, carPaintMat));
  const mFaceL = new THREE.Mesh(mirrorFaceGeo, chromeMat);
  mFaceL.position.set(0, 0, 0.062);
  mirrorL.add(mFaceL);
  carChassis.add(mirrorL);

  // -----------------------------------------------------------
  // D. R35 Lightning-Bolt LED Headlights & High-Intensity Bi-LED Beams
  // -----------------------------------------------------------
  // D. R35 Lightning-Bolt LED Headlights & High-Intensity Bi-LED Beams
  // -----------------------------------------------------------
  const lightHousingGeo = new THREE.BoxGeometry(0.38, 0.14, 0.28);
  const projectorLensGeo = new THREE.SphereGeometry(0.055, 16, 16);

  // Clear existing headlight references
  headlights.length = 0;
  headlightBeams.length = 0;
  headlightLenses.length = 0;
  headlightTargets.length = 0;

  [-0.66, 0.66].forEach((xPos) => {
    // Swept-back dark housing
    const housing = new THREE.Mesh(lightHousingGeo, darkTitaniumMat);
    housing.position.set(xPos, 0.48, -2.56);
    housing.rotation.y = xPos > 0 ? 0.14 : -0.14;
    carChassis.add(housing);

    // Signature R35 Lightning-Bolt / Z-blade LED Daytime Running Light Tube
    const boltGeo = new THREE.BoxGeometry(0.24, 0.02, 0.16);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const lightningBolt = new THREE.Mesh(boltGeo, boltMat);
    lightningBolt.position.set(xPos, 0.52, -2.62);
    carChassis.add(lightningBolt);

    // Dual LED Projector Bulbs
    [-0.06, 0.06].forEach((xOffset) => {
      const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lens = new THREE.Mesh(projectorLensGeo, lensMat);
      lens.position.set(xPos + xOffset, 0.47, -2.68);
      carChassis.add(lens);
      headlightLenses.push(lens);
    });

    // 1. Primary Long-Throw Projector SpotLight (Mounted to chassis so lamps roll/pitch with car body)
    const mainSpot = new THREE.SpotLight(0xf2f8ff, 8.0, 140, Math.PI / 4.8, 0.75, 1.05);
    mainSpot.position.set(xPos, 0.52, -2.68);
    mainSpot.castShadow = false;

    // Target is on the road plane (added to carGroup so beam aims onto the asphalt)
    const mainTarget = new THREE.Object3D();
    mainTarget.position.set(xPos * 0.3, 0.05, -55.0);
    carGroup.add(mainTarget);
    mainSpot.target = mainTarget;
    carChassis.add(mainSpot);
    headlights.push(mainSpot);

    // 2. Wide Low-Beam Peripheral Flood (Ultra-wide lateral spread across highway lanes, curbs & guardrails)
    const wideFlood = new THREE.SpotLight(0xe4f2ff, 5.5, 80, Math.PI / 2.5, 0.85, 1.15);
    wideFlood.position.set(xPos, 0.48, -2.65);
    const wideTarget = new THREE.Object3D();
    wideTarget.position.set(xPos * 1.8, 0.05, -24.0);
    carGroup.add(wideTarget);
    wideFlood.target = wideTarget;
    carChassis.add(wideFlood);
    headlights.push(wideFlood);

    headlightTargets.push({
      mainTarget,
      wideTarget,
      defaultMainX: xPos * 0.3,
      defaultWideX: xPos * 1.8,
    });
  });

  // 3. Dedicated High-Definition Highway Road Illumination Projected Decal
  // Geometry is offset so its origin is pinned smoothly under front bumper (Z = -2.2) and projects forward
  const groundBeamTex = generateHeadlightGroundTexture();
  const groundBeamGeo = new THREE.PlaneGeometry(26.0, 58.0);
  groundBeamGeo.translate(0, 29.0, 0); // Origin at rear edge

  const groundBeamMat = new THREE.MeshBasicMaterial({
    map: groundBeamTex,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4.0,
    polygonOffsetUnits: -4.0,
  });
  roadBeamPoolMesh = new THREE.Mesh(groundBeamGeo, groundBeamMat);
  roadBeamPoolMesh.rotation.x = -Math.PI / 2;
  roadBeamPoolMesh.position.set(0, 0.035, -2.2);
  carGroup.add(roadBeamPoolMesh);

  // -----------------------------------------------------------
  // E. THE ICONIC NISSAN GT-R 4 ROUND BRAKE LIGHTS
  // -----------------------------------------------------------
  // Reset arrays
  afterburnerRings.length = 0;
  afterburnerLenses.length = 0;

  // Clean Rear Black Fascia Bezel Panel (No center dot, emblem, or stray lights)
  const rearBezel = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.32, 0.08), carbonMat);
  rearBezel.position.set(0, 0.57, 2.18);
  carChassis.add(rearBezel);

  // The 4 Legendary Circular Ring Taillights: Left Outer/Inner, Right Inner/Outer
  const taillightSpecs = [
    { x: -0.65, r: 0.110, tube: 0.024 }, // Left Outer (larger)
    { x: -0.37, r: 0.095, tube: 0.022 }, // Left Inner
    { x:  0.37, r: 0.095, tube: 0.022 }, // Right Inner
    { x:  0.65, r: 0.110, tube: 0.024 }, // Right Outer (larger)
  ];

  taillightSpecs.forEach((spec) => {
    // 1. Deep Smoked Housing Ring Cup
    const cupGeo = new THREE.CylinderGeometry(spec.r + 0.025, spec.r + 0.025, 0.04, 24);
    cupGeo.rotateX(Math.PI / 2);
    const cup = new THREE.Mesh(cupGeo, darkTitaniumMat);
    cup.position.set(spec.x, 0.58, 2.19);
    carChassis.add(cup);

    // 2. Circular Brake Light Ring (Dark smoked when off, illuminates bright red on braking)
    const ringGeo = new THREE.TorusGeometry(spec.r, spec.tube, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x180306 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(spec.x, 0.58, 2.22);
    carChassis.add(ringMesh);
    afterburnerRings.push(ringMesh);

    // 3. Central Smoked Disc Lens (Illuminates bright on braking)
    const lensGeo = new THREE.CircleGeometry(spec.r * 0.88, 24);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x0f0204 });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(spec.x, 0.58, 2.215);
    carChassis.add(lensMesh);
    afterburnerLenses.push(lensMesh);
  });

  // Reference for compatibility with existing brake light logic
  brakeLightMesh = afterburnerRings[0] || new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x180306 }));

  // 4. Dedicated High-Definition Highway Taillight & Brake Light Ground Decal
  // Projects soft, photorealistic Gaussian crimson reflections onto the wet asphalt behind each wheel/lamp cluster
  const rearGroundTex = generateTaillightGroundTexture();
  const rearGroundGeo = new THREE.PlaneGeometry(8.5, 14.0);
  rearGroundGeo.translate(0, 7.0, 0); // Origin pinned smoothly at rear bumper edge (Z = 2.22)

  const rearGroundMat = new THREE.MeshBasicMaterial({
    map: rearGroundTex,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4.0,
    polygonOffsetUnits: -4.0,
  });
  taillightRoadDecalMesh = new THREE.Mesh(rearGroundGeo, rearGroundMat);
  taillightRoadDecalMesh.rotation.x = Math.PI / 2;
  taillightRoadDecalMesh.position.set(0, 0.036, 2.22);
  carGroup.add(taillightRoadDecalMesh);

  // -----------------------------------------------------------
  // F. Rear Carbon Diffuser with Aero Strakes
  // -----------------------------------------------------------
  const diffuserGeo = new THREE.BoxGeometry(1.88, 0.24, 0.58);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuser.position.set(0, 0.32, 2.22);
  diffuser.castShadow = true;
  carChassis.add(diffuser);

  // 4 Vertical Aerodynamic Strakes (Fins)
  [-0.75, -0.25, 0.25, 0.75].forEach((xPos) => {
    const strake = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.38), carbonMat);
    strake.position.set(xPos, 0.22, 2.38);
    carChassis.add(strake);
  });

  // -----------------------------------------------------------
  // G. NISSAN GT-R R35 QUAD LARGE-BORE EXHAUST SYSTEM (4 TIPS)
  // -----------------------------------------------------------
  const quadTipPositions = [-0.58, -0.42, 0.42, 0.58];
  const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 20);
  exhaustGeo.rotateX(Math.PI / 2);

  const exhaustLipGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.03, 20);
  exhaustLipGeo.rotateX(Math.PI / 2);

  quadTipPositions.forEach((xPos) => {
    // Polished Chrome Barrel
    const barrel = new THREE.Mesh(exhaustGeo, chromeMat);
    barrel.position.set(xPos, 0.25, 2.48);
    carChassis.add(barrel);

    // Heat-Treated Burnt Titanium Blue Ring Lip
    const lip = new THREE.Mesh(exhaustLipGeo, burntTitaniumMat);
    lip.position.set(xPos, 0.25, 2.58);
    carChassis.add(lip);
  });

  // Shared Flame Materials for 4-Silencer Backfire System
  outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xff3800,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  coreFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  rimFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  function createSingleSilencerFlame() {
    const group = new THREE.Group();

    // 1. Primary Compact Backfire Cone (Authentic 18cm flame tongue)
    const outerGeo = new THREE.ConeGeometry(0.035, 0.18, 12, 1, true);
    outerGeo.translate(0, 0.09, 0);
    outerGeo.rotateX(Math.PI / 2);
    const outerMesh = new THREE.Mesh(outerGeo, outerFlameMat);
    group.add(outerMesh);

    // 2. High-temp Cyan/Blue Inner Core (12cm)
    const innerGeo = new THREE.ConeGeometry(0.022, 0.12, 10, 1, true);
    innerGeo.translate(0, 0.06, 0);
    innerGeo.rotateX(Math.PI / 2);
    const innerMesh = new THREE.Mesh(innerGeo, innerFlameMat);
    group.add(innerMesh);

    // 3. Central White-Hot Filament (6.5cm)
    const coreGeo = new THREE.ConeGeometry(0.010, 0.065, 8, 1, true);
    coreGeo.translate(0, 0.0325, 0);
    coreGeo.rotateX(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, coreFlameMat);
    group.add(coreMesh);

    // 4. Exhaust Pipe Mouth Radial Flare
    const rimGeo = new THREE.RingGeometry(0.008, 0.036, 12);
    const rimMesh = new THREE.Mesh(rimGeo, rimFlameMat);
    group.add(rimMesh);

    group.visible = false;
    return group;
  }

  // Clear and instantiate individual flame jets for all 4 silencers (2 on left, 2 on right)
  exhaustFlameJets.length = 0;
  quadTipPositions.forEach((xPos) => {
    const flameJet = createSingleSilencerFlame();
    flameJet.position.set(xPos, 0.25, 2.58);
    carChassis.add(flameJet);
    exhaustFlameJets.push(flameJet);
  });

  flameGroupL = exhaustFlameJets[0];
  flameGroupR = exhaustFlameJets[3];

  // Subtle Point Light flash under bumper
  exhaustFlashLight = new THREE.PointLight(0xff5500, 0, 3.2, 1.6);
  exhaustFlashLight.position.set(0, 0.25, 2.65);
  carChassis.add(exhaustFlashLight);

  // Fiery Spark Particle System (28 Compact Embers)
  const sparkGeo = new THREE.BufferGeometry();
  sparkPositions = new Float32Array(SPARK_COUNT * 3);
  sparkVelocities = new Float32Array(SPARK_COUNT * 3);
  sparkLives = new Float32Array(SPARK_COUNT);
  sparkMaxLives = new Float32Array(SPARK_COUNT);
  const sparkColors = new Float32Array(SPARK_COUNT * 3);

  for (let i = 0; i < SPARK_COUNT; i++) {
    sparkPositions[i * 3 + 0] = 0;
    sparkPositions[i * 3 + 1] = -100;
    sparkPositions[i * 3 + 2] = 0;
    sparkLives[i] = 0;
    sparkMaxLives[i] = 0.12;
    // Varied ember colors: Incandescent white-hot, blazing cyan, and molten golden-orange
    if (i % 3 === 0) {
      sparkColors[i * 3 + 0] = 1.0;
      sparkColors[i * 3 + 1] = 0.95;
      sparkColors[i * 3 + 2] = 0.80; // White-hot
    } else if (i % 3 === 1) {
      sparkColors[i * 3 + 0] = 0.20;
      sparkColors[i * 3 + 1] = 0.85;
      sparkColors[i * 3 + 2] = 1.0;  // Cyan core spark
    } else {
      sparkColors[i * 3 + 0] = 1.0;
      sparkColors[i * 3 + 1] = 0.40;
      sparkColors[i * 3 + 2] = 0.05; // Molten amber
    }
  }

  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

  const sparkMat = new THREE.PointsMaterial({
    size: 0.07,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });
  sparkParticles = new THREE.Points(sparkGeo, sparkMat);
  carChassis.add(sparkParticles);

  // -----------------------------------------------------------
  // H. 3D Wheels, Rotors & Gold Brembo Multi-Piston Calipers
  // -----------------------------------------------------------
  const wheelParams = {
    radius: carState.wheelRadius,
    width: 0.33,
    xOffset: 0.98,
    yOffset: 0.36,
    frontZ: -1.35,
    rearZ: 1.35,
  };

  // Front Left Steering Assembly
  steerPivots.fl = new THREE.Group();
  steerPivots.fl.position.set(-wheelParams.xOffset, wheelParams.yOffset, wheelParams.frontZ);
  carChassis.add(steerPivots.fl);
  wheels.fl = createPhotorealisticWheel(wheelParams.radius, wheelParams.width);
  steerPivots.fl.add(wheels.fl);

  // Front Right Steering Assembly
  steerPivots.fr = new THREE.Group();
  steerPivots.fr.position.set(wheelParams.xOffset, wheelParams.yOffset, wheelParams.frontZ);
  carChassis.add(steerPivots.fr);
  wheels.fr = createPhotorealisticWheel(wheelParams.radius, wheelParams.width);
  steerPivots.fr.add(wheels.fr);

  // Rear Left Assembly
  wheels.rl = createPhotorealisticWheel(wheelParams.radius, wheelParams.width);
  wheels.rl.position.set(-wheelParams.xOffset, wheelParams.yOffset, wheelParams.rearZ);
  carChassis.add(wheels.rl);

  // Rear Right Assembly
  wheels.rr = createPhotorealisticWheel(wheelParams.radius, wheelParams.width);
  wheels.rr.position.set(wheelParams.xOffset, wheelParams.yOffset, wheelParams.rearZ);
  carChassis.add(wheels.rr);

  // Ambient Contact Occlusion Shadow Plane
  const shadowGeo = new THREE.PlaneGeometry(2.4, 4.9);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(64, 64, 18, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.92)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.025, 0);
  carChassis.add(contactShadow);
}

// -------------------------------------------------------------
// Nissan GT-R Rays 20-Inch Forged Alloy Wheels & Brembo Brakes
// -------------------------------------------------------------
function createPhotorealisticWheel(radius, width) {
  const wheelGroup = new THREE.Group();

  // Rubber Tire with Tread Ridges
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 28);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.92,
    metalness: 0.12,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  // GT-R Rays Style Dark Gunmetal Rim Barrel
  const rimGeo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, width * 1.02, 24);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x242831, // Signature GT-R Rays Forged Gunmetal
    metalness: 0.94,
    roughness: 0.20,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rim);

  // GT-R Rays 10-Spoke Y-Forged Alloy Pattern
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10;
    const spokeGeo = new THREE.BoxGeometry(width * 1.03, radius * 0.68, 0.045);
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = angle;
    wheelGroup.add(spoke);
  }

  // Center Hub & Wheel Lug Nuts
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, width * 1.05, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, rimMat);
  wheelGroup.add(hub);

  // Cross-Drilled Ventilated Carbon-Ceramic Brake Rotor
  const rotorGeo = new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, 0.03, 20);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.88,
    roughness: 0.28,
  });
  const rotor = new THREE.Mesh(rotorGeo, rotorMat);
  rotor.position.set(0, 0, 0);
  wheelGroup.add(rotor);

  // Signature Nissan GT-R Gold / Bronze Brembo Multi-Piston Caliper
  const caliperGeo = new THREE.BoxGeometry(0.18, 0.16, 0.15);
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Iconic Gold/Bronze GT-R Brembo Caliper
    metalness: 0.78,
    roughness: 0.26,
  });
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0, radius * 0.44, 0);
  wheelGroup.add(caliper);

  return wheelGroup;
}

// -------------------------------------------------------------
// Endless Highway Chunks with Wet Asphalt PBR & Streetlights
// -------------------------------------------------------------
function buildRoadChunks() {
  const { albedoTexture, normalTexture, roughnessTexture } = generateRoadPBRTextures();

  // Wet Asphalt Physically Based Material
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: roughnessTexture,
    roughness: 0.55,
    metalness: 0.2,
  });

  const curbMaterial = new THREE.MeshStandardMaterial({
    color: 0x3e4756,
    roughness: 0.85,
  });

  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0xa0aec0,
    metalness: 0.9,
    roughness: 0.25,
  });

  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x070b12,
    roughness: 0.95,
    metalness: 0.05,
  });

  // Street Light Prototypes
  const mastGeo = new THREE.CylinderGeometry(0.09, 0.14, 7.2, 8);
  const armGeo = new THREE.BoxGeometry(0.08, 0.08, 2.4);
  const luminaireGeo = new THREE.BoxGeometry(0.35, 0.1, 0.48);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
  const bulbGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Pine Silhouette Prototypes
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.38, 2.0, 6);
  const folGeo1 = new THREE.ConeGeometry(2.4, 4.0, 6);
  const folGeo2 = new THREE.ConeGeometry(1.8, 3.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.95 });
  const folMat = new THREE.MeshStandardMaterial({ color: 0x08160f, roughness: 0.95 });

  for (let c = 0; c < TOTAL_CHUNKS; c++) {
    const chunkGroup = new THREE.Group();
    const chunkZ = -c * CHUNK_LENGTH;
    chunkGroup.position.set(0, 0, chunkZ);

    // 1. Wet Asphalt Road Mesh
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.receiveShadow = true;
    chunkGroup.add(roadMesh);

    // 2. Concrete Curbs
    const curbGeo = new THREE.BoxGeometry(0.42, 0.22, CHUNK_LENGTH);
    const curbL = new THREE.Mesh(curbGeo, curbMaterial);
    curbL.position.set(-ROAD_WIDTH / 2 - 0.21, 0.11, 0);
    curbL.receiveShadow = true;
    chunkGroup.add(curbL);

    const curbR = new THREE.Mesh(curbGeo, curbMaterial);
    curbR.position.set(ROAD_WIDTH / 2 + 0.21, 0.11, 0);
    curbR.receiveShadow = true;
    chunkGroup.add(curbR);

    // 3. Corrugated W-Beam Metal Guardrails
    const railGeo = new THREE.BoxGeometry(0.14, 0.44, CHUNK_LENGTH);
    const railL = new THREE.Mesh(railGeo, barrierMaterial);
    railL.position.set(-ROAD_WIDTH / 2 - 0.95, 0.46, 0);
    railL.castShadow = true;
    chunkGroup.add(railL);

    const railR = new THREE.Mesh(railGeo, barrierMaterial);
    railR.position.set(ROAD_WIDTH / 2 + 0.95, 0.46, 0);
    railR.castShadow = true;
    chunkGroup.add(railR);

    // Guardrail I-Beam Posts spaced every 15 meters
    const postGeo = new THREE.BoxGeometry(0.1, 0.7, 0.1);
    for (let pz = -CHUNK_LENGTH / 2 + 7.5; pz < CHUNK_LENGTH / 2; pz += 15) {
      const postL = new THREE.Mesh(postGeo, barrierMaterial);
      postL.position.set(-ROAD_WIDTH / 2 - 0.95, 0.35, pz);
      chunkGroup.add(postL);

      const postR = new THREE.Mesh(postGeo, barrierMaterial);
      postR.position.set(ROAD_WIDTH / 2 + 0.95, 0.35, pz);
      chunkGroup.add(postR);

      // Retroreflective Amber/White Delineator Markers
      const markGeo = new THREE.BoxGeometry(0.06, 0.14, 0.06);
      const markMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const markL = new THREE.Mesh(markGeo, markMat);
      markL.position.set(-ROAD_WIDTH / 2 - 0.8, 0.62, pz);
      chunkGroup.add(markL);

      const markR = new THREE.Mesh(markGeo, markMat);
      markR.position.set(ROAD_WIDTH / 2 + 0.8, 0.62, pz);
      chunkGroup.add(markR);
    }

    // 4. Night Grassy Terrain Shoulders
    const groundGeo = new THREE.PlaneGeometry(90, CHUNK_LENGTH);
    const groundL = new THREE.Mesh(groundGeo, terrainMaterial);
    groundL.rotation.x = -Math.PI / 2;
    groundL.position.set(-ROAD_WIDTH / 2 - 45.5, -0.01, 0);
    groundL.receiveShadow = true;
    chunkGroup.add(groundL);

    const groundR = new THREE.Mesh(groundGeo, terrainMaterial);
    groundR.rotation.x = -Math.PI / 2;
    groundR.position.set(ROAD_WIDTH / 2 + 45.5, -0.01, 0);
    groundR.receiveShadow = true;
    chunkGroup.add(groundR);

    // 5. Overhead Highway Street Lights (Spaced every 60m)
    for (let i = 0; i < 2; i++) {
      const zOffset = -CHUNK_LENGTH / 2 + (i + 0.5) * (CHUNK_LENGTH / 2);
      const isRight = (c + i) % 2 === 0;
      const xPos = isRight ? ROAD_WIDTH / 2 + 1.75 : -ROAD_WIDTH / 2 - 1.75;

      const lightPost = new THREE.Group();
      lightPost.position.set(xPos, 0, zOffset);

      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 3.6;
      mast.castShadow = true;
      lightPost.add(mast);

      const arm = new THREE.Mesh(armGeo, mastMat);
      arm.position.set(isRight ? -0.9 : 0.9, 7.1, 0);
      arm.rotation.y = isRight ? Math.PI / 2 : -Math.PI / 2;
      lightPost.add(arm);

      const luminaire = new THREE.Mesh(luminaireGeo, bulbGlowMat);
      luminaire.position.set(isRight ? -1.8 : 1.8, 7.05, 0);
      lightPost.add(luminaire);

      // Warm Golden Sodium/LED Pool of Light
      const streetLight = new THREE.PointLight(0xfef08a, 1.4, 35, 1.35);
      streetLight.position.set(isRight ? -1.8 : 1.8, 6.8, 0);
      lightPost.add(streetLight);

      chunkGroup.add(lightPost);
    }

    // 6. Natural Roadside Trees
    for (let t = 0; t < 12; t++) {
      const treeSide = t % 2 === 0 ? 1 : -1;
      const treeDist = ROAD_WIDTH / 2 + 4.0 + Math.random() * 26;
      const treeX = treeSide * treeDist;
      const treeZ = -CHUNK_LENGTH / 2 + Math.random() * CHUNK_LENGTH;
      const treeScale = 0.85 + Math.random() * 0.75;

      const tree = new THREE.Group();
      tree.position.set(treeX, 0, treeZ);
      tree.scale.set(treeScale, treeScale, treeScale);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.0;
      tree.add(trunk);

      const f1 = new THREE.Mesh(folGeo1, folMat);
      f1.position.y = 3.0;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(folGeo2, folMat);
      f2.position.y = 4.8;
      f2.castShadow = true;
      tree.add(f2);

      chunkGroup.add(tree);
    }

    scene.add(chunkGroup);
    roadChunks.push({ group: chunkGroup, index: c });
  }
}

// -------------------------------------------------------------
// 3D Underground Atmospheric Garage Construction & Transition
// -------------------------------------------------------------
function buildGarage() {
  garageGroup = new THREE.Group();
  scene.add(garageGroup);

  // PBR Industrial Materials
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.38,
    metalness: 0.25,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x11151e,
    roughness: 0.75,
    metalness: 0.45,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e14,
    roughness: 0.88,
    metalness: 0.20,
  });

  const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const greenChevronMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const metalColumnMat = new THREE.MeshStandardMaterial({
    color: 0x272e3b,
    metalness: 0.85,
    roughness: 0.30,
  });

  // 1. Garage Floor (36m wide, 52m deep)
  const floorGeo = new THREE.PlaneGeometry(36, 52);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  garageGroup.add(floorMesh);

  // 2. Ceiling with Structural Steel I-Beams (Y = 6.0m)
  const ceilingGeo = new THREE.PlaneGeometry(36, 52);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = 6.0;
  garageGroup.add(ceilingMesh);

  for (let z = -20; z <= 20; z += 10) {
    const iBeam = new THREE.Mesh(new THREE.BoxGeometry(36, 0.35, 0.4), metalColumnMat);
    iBeam.position.set(0, 5.8, z);
    garageGroup.add(iBeam);
  }

  // 3. Perimeter Walls
  // Back Wall (Z = 24)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), wallMat);
  backWall.position.set(0, 3, 24);
  garageGroup.add(backWall);

  // Left Wall (X = -18)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 52), wallMat);
  leftWall.position.set(-18, 3, 0);
  garageGroup.add(leftWall);

  // Right Wall (X = 18)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 52), wallMat);
  rightWall.position.set(18, 3, 0);
  garageGroup.add(rightWall);

  // Front Exit Wall (Z = -24) with Central Gate Frame (X: [-5, 5])
  const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 0.4), wallMat);
  frontWallL.position.set(-11.5, 3, -24);
  garageGroup.add(frontWallL);

  const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 0.4), wallMat);
  frontWallR.position.set(11.5, 3, -24);
  garageGroup.add(frontWallR);

  const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 0.4), wallMat);
  frontWallTop.position.set(0, 5.1, -24);
  garageGroup.add(frontWallTop);

  // Detailed Industrial Roll-Up Garage Shutter Door
  garageDoorMesh = new THREE.Group();
  garageDoorMesh.position.set(0, 2.2, -23.9);

  const slatMatDark = new THREE.MeshStandardMaterial({
    color: 0x272e3b,
    metalness: 0.88,
    roughness: 0.32,
  });
  const slatMatLight = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    metalness: 0.82,
    roughness: 0.28,
  });
  const bottomBarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.90,
    roughness: 0.20,
  });
  const hazardStripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const blackStripeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const doorChromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.98,
    roughness: 0.08,
  });

  // 14 Horizontal Ribbed Slats (Roll-up Panels)
  const slatCount = 14;
  const slatHeight = 0.30;
  const totalDoorHeight = slatCount * slatHeight;

  for (let i = 0; i < slatCount; i++) {
    const yLocal = (i - slatCount / 2 + 0.5) * slatHeight;
    const isEven = i % 2 === 0;
    const slatGeo = new THREE.BoxGeometry(9.7, slatHeight * 0.92, 0.14);
    const slatMesh = new THREE.Mesh(slatGeo, isEven ? slatMatDark : slatMatLight);
    slatMesh.position.set(0, yLocal, 0);
    garageDoorMesh.add(slatMesh);

    // Recessed Hinge Groove Line between slats
    const grooveGeo = new THREE.BoxGeometry(9.72, 0.025, 0.16);
    const grooveMesh = new THREE.Mesh(grooveGeo, blackStripeMat);
    grooveMesh.position.set(0, yLocal + slatHeight / 2, 0);
    garageDoorMesh.add(grooveMesh);

    // Chrome Rivet Fasteners on slat ends
    [-4.7, 4.7].forEach((xRivet) => {
      const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), doorChromeMat);
      rivet.rotation.x = Math.PI / 2;
      rivet.position.set(xRivet, yLocal, 0);
      garageDoorMesh.add(rivet);
    });
  }

  // Heavy Bottom Bar with Caution Hazard Stripes
  const bottomY = -totalDoorHeight / 2 + slatHeight / 2;
  const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(9.72, 0.38, 0.20), bottomBarMat);
  bottomBar.position.set(0, bottomY, 0.02);
  garageDoorMesh.add(bottomBar);

  // Yellow & Black Diagonal Hazard Stripes on Bottom Bar
  for (let hs = -4.5; hs <= 4.5; hs += 0.6) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.22), (Math.abs(Math.round(hs * 10)) % 2 === 0) ? hazardStripeMat : blackStripeMat);
    stripe.position.set(hs, bottomY, 0.025);
    stripe.rotation.z = 0.35;
    garageDoorMesh.add(stripe);
  }

  // Weather Seal Rubber Foot Lip
  const sealLip = new THREE.Mesh(new THREE.BoxGeometry(9.74, 0.08, 0.24), blackStripeMat);
  sealLip.position.set(0, bottomY - 0.20, 0.02);
  garageDoorMesh.add(sealLip);

  // Dual Heavy Steel Pull Handles
  [-1.2, 1.2].forEach((xHandle) => {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.12), doorChromeMat);
    handle.position.set(xHandle, bottomY + 0.1, 0.14);
    garageDoorMesh.add(handle);
  });

  garageGroup.add(garageDoorMesh);

  // Vertical Guide Tracks & Overhead Roller Housing
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  [-4.92, 4.92].forEach((xTrack) => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.8, 0.32), trackMat);
    track.position.set(xTrack, 2.4, -23.85);
    garageGroup.add(track);
  });

  // Overhead Roller Drum Shell
  const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 9.8, 20);
  drumGeo.rotateZ(Math.PI / 2);
  const drumMesh = new THREE.Mesh(drumGeo, trackMat);
  drumMesh.position.set(0, 4.65, -23.8);
  garageGroup.add(drumMesh);

  // Exit Frame Warning Beacons & Neon Exit Sign
  const exitSignGroup = new THREE.Group();
  exitSignGroup.position.set(0, 4.8, -23.7);
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.1), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
  exitSignGroup.add(signBack);
  const signNeon = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.45, 0.12), cyanNeonMat);
  exitSignGroup.add(signNeon);
  garageGroup.add(exitSignGroup);

  // Exit Status Beacons
  [-4.8, 4.8].forEach((xPos, idx) => {
    const bulbMat = idx === 0 ? redNeonMat : new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bulbMat);
    bulb.position.set(xPos, 4.2, -23.7);
    garageGroup.add(bulb);
  });

  // Green Floor Chevron Arrows leading to exit gate
  for (let z = -8; z >= -20; z -= 4) {
    const chevronGroup = new THREE.Group();
    chevronGroup.position.set(0, 0.02, z);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 1.8), greenChevronMat);
    armL.position.set(-0.6, 0, 0);
    armL.rotation.y = Math.PI / 4;
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 1.8), greenChevronMat);
    armR.position.set(0.6, 0, 0);
    armR.rotation.y = -Math.PI / 4;
    chevronGroup.add(armL);
    chevronGroup.add(armR);
    garageGroup.add(chevronGroup);
  }

  // Marked Exit Zone Floor Hazard Lines
  const zoneBoxL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 7.5), yellowStripeMat);
  zoneBoxL.position.set(-4.5, 0.02, -19.75);
  garageGroup.add(zoneBoxL);
  const zoneBoxR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 7.5), yellowStripeMat);
  zoneBoxR.position.set(4.5, 0.02, -19.75);
  garageGroup.add(zoneBoxR);

  // 4. PARKING SLOTS (Exactly 3 Parking Slots along Z = 12.0)
  // Slot 1: X = -7.0, Z = 12.0 (Contains Nissan GT-R R35)
  // Slot 2: X = 0.0, Z = 12.0 (Empty)
  // Slot 3: X = 7.0, Z = 12.0 (Empty)
  const slotWidth = 4.8;
  const slotLength = 8.5;
  const slotCenterZ = 12.0;
  const slotXPositions = [-7.0, 0.0, 7.0];

  slotXPositions.forEach((xPos, idx) => {
    const slotNumber = idx + 1;

    // Stall boundary painted lines (Yellow)
    const lineL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, slotLength), yellowStripeMat);
    lineL.position.set(xPos - slotWidth / 2, 0.02, slotCenterZ);
    garageGroup.add(lineL);

    const lineR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, slotLength), yellowStripeMat);
    lineR.position.set(xPos + slotWidth / 2, 0.02, slotCenterZ);
    garageGroup.add(lineR);

    const lineBack = new THREE.Mesh(new THREE.BoxGeometry(slotWidth, 0.02, 0.12), yellowStripeMat);
    lineBack.position.set(xPos, 0.02, slotCenterZ + slotLength / 2);
    garageGroup.add(lineBack);

    // Wheel Stop Bumper at back of slot
    const wheelStop = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.18, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    wheelStop.position.set(xPos, 0.09, slotCenterZ + 3.2);
    garageGroup.add(wheelStop);

    // Slot Number Floor Plaque
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.8), plaqueMat);
    plaque.position.set(xPos, 0.025, slotCenterZ - 3.8);
    garageGroup.add(plaque);

    const numBadgeMat = slotNumber === 1
      ? new THREE.MeshBasicMaterial({ color: 0xef4444 }) // Crimson for GT-R Slot 1
      : new THREE.MeshBasicMaterial({ color: 0x06b6d4 }); // Cyan for Slots 2 & 3
    const numBadge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.025, 0.5), numBadgeMat);
    numBadge.position.set(xPos, 0.03, slotCenterZ - 3.8);
    garageGroup.add(numBadge);

    // Wall Sign Above Slot
    const wallSign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), plaqueMat);
    wallSign.position.set(xPos, 3.8, 23.9);
    garageGroup.add(wallSign);

    const wallText = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 0.1),
      slotNumber === 1 ? redNeonMat : cyanNeonMat
    );
    wallText.position.set(xPos, 3.8, 23.85);
    garageGroup.add(wallText);

    // Overhead Slot SpotLight
    const slotSpot = new THREE.SpotLight(
      slotNumber === 1 ? 0xffffff : 0x38bdf8,
      slotNumber === 1 ? 6.0 : 3.0,
      18,
      Math.PI / 4,
      0.6,
      1.0
    );
    slotSpot.position.set(xPos, 5.5, slotCenterZ);
    slotSpot.target.position.set(xPos, 0, slotCenterZ);
    garageGroup.add(slotSpot);
    garageGroup.add(slotSpot.target);
  });

  // 5. Heavy Structural Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 6.0, 16);
  const pillarPositions = [
    { x: -12, z: 0 }, { x: 12, z: 0 },
    { x: -12, z: 12 }, { x: 12, z: 12 },
  ];

  pillarPositions.forEach((pos) => {
    const pillar = new THREE.Mesh(pillarGeo, metalColumnMat);
    pillar.position.set(pos.x, 3.0, pos.z);
    pillar.castShadow = true;
    garageGroup.add(pillar);

    // Yellow/Black Hazard Ring
    const hazardRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    hazardRing.position.set(pos.x, 1.2, pos.z);
    garageGroup.add(hazardRing);
  });

  // 6. Underground Cool Blue Flickering Ceiling Fixtures
  const garageAmbient = new THREE.AmbientLight(0x1e293b, 0.85);
  garageGroup.add(garageAmbient);

  ceilingLights.length = 0;
  const blueTubeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let z = -18; z <= 20; z += 9) {
    [-8, 0, 8].forEach((xPos) => {
      const fixtureGeo = new THREE.BoxGeometry(2.6, 0.12, 0.35);
      const fixture = new THREE.Mesh(fixtureGeo, metalColumnMat);
      fixture.position.set(xPos, 5.75, z);
      garageGroup.add(fixture);

      const tubeMat = blueTubeMat.clone();
      const tube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.20), tubeMat);
      tube.position.set(xPos, 5.67, z);
      garageGroup.add(tube);

      const coolBlueLight = new THREE.PointLight(0x0284c7, 3.2, 18.0);
      coolBlueLight.position.set(xPos, 5.45, z);
      garageGroup.add(coolBlueLight);

      ceilingLights.push({
        pointLight: coolBlueLight,
        tubeMat: tubeMat,
        baseIntensity: 2.8 + Math.random() * 0.8,
        freq1: 8.0 + Math.random() * 12.0,
        freq2: 18.0 + Math.random() * 25.0,
        phase: Math.random() * Math.PI * 2,
      });
    });
  }

  // 7. Garage Details & Tuning Props
  // Red Metallic Heavy Tool Chests
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.8, roughness: 0.3 });
  const cabinet1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.8), cabinetMat);
  cabinet1.position.set(-17.0, 0.7, -6.0);
  garageGroup.add(cabinet1);

  const cabinet2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.8), cabinetMat);
  cabinet2.position.set(17.0, 0.7, -6.0);
  garageGroup.add(cabinet2);

  // Stacked Tire Rack along right wall
  const tireRackGroup = new THREE.Group();
  tireRackGroup.position.set(16.8, 0, 4.0);
  for (let ty = 0.35; ty <= 1.8; ty += 0.45) {
    const rackTire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9 })
    );
    rackTire.rotation.z = Math.PI / 2;
    rackTire.position.set(0, ty, 0);
    tireRackGroup.add(rackTire);
  }
  garageGroup.add(tireRackGroup);

  // Wall Neon Sign ("MIDNIGHT CIRCUIT TUNING")
  const wallNeonGroup = new THREE.Group();
  wallNeonGroup.position.set(-17.7, 4.2, 4.0);
  wallNeonGroup.rotation.y = Math.PI / 2;
  const wallNeonBack = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
  wallNeonGroup.add(wallNeonBack);
  const wallNeonText = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 0.1), redNeonMat);
  wallNeonGroup.add(wallNeonText);
  garageGroup.add(wallNeonGroup);
}

function updateGarageLighting(dt) {
  if (!inGarage || ceilingLights.length === 0) return;
  const time = clock.getElapsedTime();

  for (let i = 0; i < ceilingLights.length; i++) {
    const light = ceilingLights[i];
    const wave1 = Math.sin(time * light.freq1 + light.phase) * 0.12;
    const wave2 = Math.cos(time * light.freq2) * 0.08;
    const randomSpark = (Math.random() < 0.025) ? -(0.25 + Math.random() * 0.35) : 0.02;

    const currentIntensity = Math.max(0.6, light.baseIntensity + wave1 + wave2 + randomSpark);
    light.pointLight.intensity = currentIntensity;

    const lightness = Math.max(0.35, Math.min(0.85, 0.60 + (currentIntensity - light.baseIntensity) * 0.20));
    light.tubeMat.color.setHSL(0.55, 0.92, lightness);
  }
}

function transitionFromGarageToHighway() {
  if (isSceneTransitioning) return;
  isSceneTransitioning = true;

  if (transitionOverlayEl) {
    transitionOverlayEl.classList.remove('opacity-0');
    transitionOverlayEl.classList.add('opacity-100');
  }

  // Smooth mechanical roll-up shutter animation with subtle shudder vibration
  let doorAnimTime = 0;
  const startY = 2.2;
  const doorInterval = setInterval(() => {
    doorAnimTime += 0.025;
    const progress = Math.min(1.0, doorAnimTime / 0.65);
    const smoothP = progress * progress * (3 - 2 * progress);
    const shudder = (progress < 0.98) ? (Math.random() - 0.5) * 0.03 : 0;

    if (garageDoorMesh) {
      garageDoorMesh.position.y = startY + smoothP * 4.8 + shudder;
      garageDoorMesh.position.x = shudder * 0.5;
    }

    if (doorAnimTime >= 0.70) {
      clearInterval(doorInterval);
    }
  }, 25);

  setTimeout(() => {
    inGarage = false;
    canExitGarage = false;

    if (garageGroup) garageGroup.visible = false;
    roadChunks.forEach((chunk) => {
      chunk.group.visible = true;
    });

    // Show Return to Garage button on HUD while on highway
    if (garageBtnEl) {
      garageBtnEl.classList.remove('hidden');
      garageBtnEl.classList.add('flex');
    }

    // Reposition GT-R R35 smoothly onto highway start line
    carState.position.set(0, 0, 0);
    carState.heading = 0;
    carState.speed = 0;
    cameraFollow.smoothHeading = 0;

    if (garageExitPromptEl) {
      garageExitPromptEl.classList.add('hidden', 'opacity-0', 'scale-95');
      garageExitPromptEl.classList.remove('opacity-100', 'scale-100');
    }

    if (transitionOverlayEl) {
      transitionOverlayEl.classList.remove('opacity-100');
      transitionOverlayEl.classList.add('opacity-0');
    }

    setTimeout(() => {
      isSceneTransitioning = false;
    }, 700);
  }, 650);
}

function returnToGarageFromHighway() {
  if (isSceneTransitioning || inGarage) return;
  isSceneTransitioning = true;

  if (transitionOverlayEl) {
    transitionOverlayEl.classList.remove('opacity-0');
    transitionOverlayEl.classList.add('opacity-100');
  }

  setTimeout(() => {
    inGarage = true;
    canExitGarage = false;

    roadChunks.forEach((chunk) => {
      chunk.group.visible = false;
    });
    if (garageGroup) garageGroup.visible = true;

    // Hide Return to Garage button while inside garage
    if (garageBtnEl) {
      garageBtnEl.classList.add('hidden');
      garageBtnEl.classList.remove('flex');
    }

    // Reposition GT-R R35 back into Slot 1
    carState.position.set(-7.0, 0, 12.0);
    carState.heading = 0;
    carState.speed = 0;
    cameraFollow.smoothHeading = 0;

    if (garageDoorMesh) {
      garageDoorMesh.position.set(0, 2.2, -23.9);
    }

    if (garageExitPromptEl) {
      garageExitPromptEl.classList.add('hidden', 'opacity-0', 'scale-95');
      garageExitPromptEl.classList.remove('opacity-100', 'scale-100');
    }

    if (transitionOverlayEl) {
      transitionOverlayEl.classList.remove('opacity-100');
      transitionOverlayEl.classList.add('opacity-0');
    }

    setTimeout(() => {
      isSceneTransitioning = false;
    }, 700);
  }, 650);
}

// -------------------------------------------------------------
// Seamless Dynamic Road Chunk Streaming
// -------------------------------------------------------------
function updateRoadChunks() {
  if (inGarage) return;
  const carZ = carState.position.z;
  const numChunks = roadChunks.length;
  if (numChunks === 0) return;

  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < numChunks; i++) {
    const z = roadChunks[i].group.position.z;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  for (let i = 0; i < numChunks; i++) {
    const chunk = roadChunks[i];
    const relativeZ = chunk.group.position.z - carZ;
    if (relativeZ > CHUNK_LENGTH * 1.5) {
      chunk.group.position.z = minZ - CHUNK_LENGTH;
      minZ -= CHUNK_LENGTH;
    } else if (relativeZ < -ROAD_SPAN + CHUNK_LENGTH) {
      chunk.group.position.z = maxZ + CHUNK_LENGTH;
      maxZ += CHUNK_LENGTH;
    }
  }
}

// Non-linear acoustic transfer curve for exhaust pipe manifold saturation
function makeEngineDistortionCurve(k = 14) {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Asymmetric hyperbolic tangent soft-clip with subtle compression
    curve[i] = Math.tanh(k * x * 0.16) * 0.82 + (x * 0.18);
  }
  return curve;
}

// Looping pink noise buffer generator for intake air induction roar
function createPinkNoiseBuffer(ctx, duration = 2.5) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.038;
    b6 = white * 0.115926;
  }
  return buffer;
}

// Realistic stochastic granular asphalt stick-slip friction buffer
function createTireSkidBuffer(ctx, duration = 3.0) {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = buffer.getChannelData(0);

  let slipInteg = 0;
  let grainPhase = 0;
  let chatter = 0;

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    // Granular micro-tread contact impulses
    grainPhase += 0.05 + (Math.random() * 0.08);
    const grainImpulse = Math.sin(grainPhase * 60.0) * (Math.random() > 0.35 ? 1.0 : -0.7);

    // Stochastic stick-slip noise
    const white = Math.random() * 2 - 1;
    slipInteg = 0.91 * slipInteg + 0.09 * white;
    chatter = 0.985 * chatter + (Math.random() - 0.5) * 0.06;

    // Multi-frequency physical rubber abrasive shear resonances
    const rubberScreech = Math.sin(2 * Math.PI * (920 + chatter * 120) * t + slipInteg * 2.8) * 0.40
                        + Math.sin(2 * Math.PI * (1480 + chatter * 180) * t + grainImpulse * 2.2) * 0.35
                        + Math.sin(2 * Math.PI * (2720 + chatter * 240) * t + white * 1.2) * 0.25;

    const raw = (rubberScreech * 0.60 + grainImpulse * 0.22 + white * 0.18);
    output[i] = Math.tanh(raw * 2.4) * 0.80;
  }
  return buffer;
}

// Low-frequency carcass scrub rumble buffer (tire deformation over coarse tarmac)
function createCarcassRumbleBuffer(ctx, duration = 3.0) {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = buffer.getChannelData(0);

  let rumble = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    rumble = 0.96 * rumble + 0.04 * white;
    output[i] = Math.tanh(rumble * 3.5) * 0.90;
  }
  return buffer;
}

// -------------------------------------------------------------
// Web Audio Engine Synthesizer System (Nissan GT-R VR38DETT V6)
// -------------------------------------------------------------
function initAudio() {
  if (isAudioInitialized) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    // Master Output Bus
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(isAudioMuted ? 0 : 0.45, now);
    masterGain.connect(audioCtx.destination);

    // 1. Acoustic Saturation WaveShaper (transforms raw synth waves into physical exhaust growl)
    engineShaper = audioCtx.createWaveShaper();
    engineShaper.curve = makeEngineDistortionCurve(15);
    engineShaper.oversample = '2x';

    // 2. Dual Acoustic Formant Resonators (models GT-R exhaust chamber & quad titanium tips)
    bodyResonator = audioCtx.createBiquadFilter();
    bodyResonator.type = 'peaking';
    bodyResonator.frequency.setValueAtTime(185, now);
    bodyResonator.Q.setValueAtTime(2.2, now);
    bodyResonator.gain.setValueAtTime(4.8, now); // +4.8 dB cabin and muffler chamber boom

    raspResonator = audioCtx.createBiquadFilter();
    raspResonator.type = 'peaking';
    raspResonator.frequency.setValueAtTime(920, now);
    raspResonator.Q.setValueAtTime(2.6, now);
    raspResonator.gain.setValueAtTime(4.5, now); // +4.5 dB metallic titanium tailpipe buzz

    // 3. Dynamic Engine Lowpass Filter (opens wide under acceleration, tightens when coasting)
    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(520, now);
    engineFilter.Q.setValueAtTime(1.8, now);

    // 4. Engine Level Mixer
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(carState.engineRunning ? 0.30 : 0.0001, now);

    // Wire main exhaust signal chain:
    // PreGain -> Shaper -> BodyResonator -> RaspResonator -> LowpassFilter -> EngineGain -> Master
    enginePreGain = audioCtx.createGain();
    enginePreGain.gain.setValueAtTime(0.55, now);
    enginePreGain.connect(engineShaper);
    engineShaper.connect(bodyResonator);
    bodyResonator.connect(raspResonator);
    raspResonator.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(masterGain);

    // 5. Multi-Harmonic V6 Oscillator Bank (Nissan VR38DETT Firing Orders)
    // - Order 3 (Fund): 3 power strokes per rev in a 4-stroke V6. At 950 RPM idle = 47.5 Hz
    fundOsc = audioCtx.createOscillator();
    fundOsc.type = 'sawtooth';
    fundOsc.frequency.setValueAtTime(47.5, now);
    fundOsc.connect(enginePreGain);

    // - Order 1.5 (Bank): 60-degree V6 asymmetric cross-bank pulse interference throb. At idle = 23.75 Hz
    bankOsc = audioCtx.createOscillator();
    bankOsc.type = 'triangle';
    bankOsc.frequency.setValueAtTime(23.75, now);
    bankOsc.connect(enginePreGain);

    // - Order 6 (Rasp): 2nd firing harmonic producing the high-rev metallic snarl. At idle = 95 Hz
    raspOsc = audioCtx.createOscillator();
    raspOsc.type = 'sawtooth';
    raspOsc.frequency.setValueAtTime(95, now);
    raspGain = audioCtx.createGain();
    raspGain.gain.setValueAtTime(carState.engineRunning ? 0.24 : 0.0001, now);
    raspOsc.connect(raspGain);
    raspGain.connect(enginePreGain);

    // - Order 9 (Valvetrain): High-order mechanical camshaft & valve chatter. At idle = 142.5 Hz
    valveOsc = audioCtx.createOscillator();
    valveOsc.type = 'triangle';
    valveOsc.frequency.setValueAtTime(142.5, now);
    const valveGain = audioCtx.createGain();
    valveGain.gain.setValueAtTime(carState.engineRunning ? 0.10 : 0.0001, now);
    valveOsc.connect(valveGain);
    valveGain.connect(enginePreGain);

    // - Sub-Bass Order 0.75: Deep low-frequency chassis vibration (bypasses shaper for pure low end)
    subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(23.75, now);
    subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(carState.engineRunning ? 0.32 : 0.0001, now);
    subOsc.connect(subGain);
    subGain.connect(bodyResonator);

    // 6. Twin Turbocharger Whistle & Spool System
    turboOsc = audioCtx.createOscillator();
    turboOsc.type = 'sine';
    turboOsc.frequency.setValueAtTime(1100, now);

    turboFilter = audioCtx.createBiquadFilter();
    turboFilter.type = 'bandpass';
    turboFilter.frequency.setValueAtTime(1100, now);
    turboFilter.Q.setValueAtTime(5.5, now);

    turboGain = audioCtx.createGain();
    turboGain.gain.setValueAtTime(0.0001, now);

    turboOsc.connect(turboFilter);
    turboFilter.connect(turboGain);
    turboGain.connect(masterGain);

    // 7. Cold-Air Induction Airflow Roar
    intakeNoiseSource = audioCtx.createBufferSource();
    intakeNoiseSource.buffer = createPinkNoiseBuffer(audioCtx, 2.5);
    intakeNoiseSource.loop = true;

    intakeFilter = audioCtx.createBiquadFilter();
    intakeFilter.type = 'bandpass';
    intakeFilter.frequency.setValueAtTime(460, now);
    intakeFilter.Q.setValueAtTime(1.8, now);

    intakeGain = audioCtx.createGain();
    intakeGain.gain.setValueAtTime(0.0001, now);

    intakeNoiseSource.connect(intakeFilter);
    intakeFilter.connect(intakeGain);
    intakeGain.connect(masterGain);

    // 8. Dynamic Granular Asphalt Tire Skid & Screech Synthesizer
    skidNoiseSource = audioCtx.createBufferSource();
    skidNoiseSource.buffer = createTireSkidBuffer(audioCtx, 3.0);
    skidNoiseSource.loop = true;

    // Stage 1: Dynamic Asphalt Stick-Slip Scrub Bandpass (1100 - 2400 Hz)
    skidFilter1 = audioCtx.createBiquadFilter();
    skidFilter1.type = 'bandpass';
    skidFilter1.frequency.setValueAtTime(1450, now);
    skidFilter1.Q.setValueAtTime(4.2, now);

    // Stage 2: High Screech Formant Peak (2800 - 3800 Hz)
    skidFilter2 = audioCtx.createBiquadFilter();
    skidFilter2.type = 'peaking';
    skidFilter2.frequency.setValueAtTime(3200, now);
    skidFilter2.Q.setValueAtTime(3.6, now);
    skidFilter2.gain.setValueAtTime(12.0, now);

    // Stage 3: Top-End Acoustic Smoothing Lowpass (prevents harshness)
    skidFilter3 = audioCtx.createBiquadFilter();
    skidFilter3.type = 'lowpass';
    skidFilter3.frequency.setValueAtTime(5600, now);
    skidFilter3.Q.setValueAtTime(1.0, now);

    skidGain = audioCtx.createGain();
    skidGain.gain.setValueAtTime(0.0001, now);

    skidNoiseSource.connect(skidFilter1);
    skidFilter1.connect(skidFilter2);
    skidFilter2.connect(skidFilter3);
    skidFilter3.connect(skidGain);
    skidGain.connect(masterGain);

    // Low-Frequency Heavy Tire Carcass Scrub Rumble
    skidCarcassSource = audioCtx.createBufferSource();
    skidCarcassSource.buffer = createCarcassRumbleBuffer(audioCtx, 3.0);
    skidCarcassSource.loop = true;

    skidCarcassFilter = audioCtx.createBiquadFilter();
    skidCarcassFilter.type = 'lowpass';
    skidCarcassFilter.frequency.setValueAtTime(180, now);
    skidCarcassFilter.Q.setValueAtTime(1.5, now);

    skidCarcassGain = audioCtx.createGain();
    skidCarcassGain.gain.setValueAtTime(0.0001, now);

    skidCarcassSource.connect(skidCarcassFilter);
    skidCarcassFilter.connect(skidCarcassGain);
    skidCarcassGain.connect(masterGain);

    // Pre-generate static pop audio buffers pool (eliminates GC pauses during driving)
    if (popBuffers.length === 0) {
      const sampleRate = audioCtx.sampleRate;
      for (let pIdx = 0; pIdx < 8; pIdx++) {
        const isB = pIdx % 2 === 0;
        const duration = isB ? 0.070 : 0.052;
        const bufferLen = Math.floor(sampleRate * duration);
        const pBuf = audioCtx.createBuffer(1, bufferLen, sampleRate);
        const data = pBuf.getChannelData(0);
        const tubeResFreq = isB ? (390 + (pIdx * 15)) : (310 + (pIdx * 12));
        const omega = 2 * Math.PI * tubeResFreq / sampleRate;

        for (let i = 0; i < bufferLen; i++) {
          const t = i / sampleRate;
          const attack = Math.min(1.0, t / 0.0005);
          const decay = Math.exp(-t / (isB ? 0.014 : 0.0095));
          const env = attack * decay;
          const standingWave = Math.sin(omega * i) * 0.52;
          const turbulentGas = (Math.random() * 2 - 1) * 0.48;
          data[i] = Math.tanh((standingWave + turbulentGas) * env * 3.0) * 0.98;
        }
        popBuffers.push({ buffer: pBuf, isBang: isB, duration });
      }

      for (let tIdx = 0; tIdx < 6; tIdx++) {
        const tailLen = Math.floor(sampleRate * 0.045);
        const tailBuf = audioCtx.createBuffer(1, tailLen, sampleRate);
        const tData = tailBuf.getChannelData(0);
        const tOmega = 2 * Math.PI * (480 + tIdx * 35) / sampleRate;
        for (let i = 0; i < tailLen; i++) {
          const t = i / sampleRate;
          const env = Math.min(1.0, t / 0.0005) * Math.exp(-t / 0.0085);
          const s = (Math.sin(tOmega * i) * 0.45 + (Math.random() * 2 - 1) * 0.55) * env;
          tData[i] = Math.tanh(s * 2.8) * 0.88;
        }
        tailBuffers.push(tailBuf);
      }
    }

    // Start all audio nodes
    fundOsc.start(now);
    bankOsc.start(now);
    raspOsc.start(now);
    valveOsc.start(now);
    subOsc.start(now);
    turboOsc.start(now);
    intakeNoiseSource.start(now);
    skidNoiseSource.start(now);
    skidCarcassSource.start(now);

    isAudioInitialized = true;
    updateAudioHUD();
  } catch (err) {
    console.warn('Web Audio initialization error:', err);
  }
}

function toggleAudio() {
  if (!isAudioInitialized) {
    initAudio();
    isAudioMuted = false;
  } else {
    isAudioMuted = !isAudioMuted;
    if (audioCtx && masterGain) {
      const now = audioCtx.currentTime;
      if (Number.isFinite(now)) {
        masterGain.gain.setTargetAtTime(isAudioMuted ? 0 : 0.45, now, 0.05);
      }
    }
  }
  updateAudioHUD();
}

function updateAudioHUD() {
  if (!audioIndicatorEl || !audioTextEl || !audioIconEl) return;
  if (isAudioInitialized && !isAudioMuted) {
    audioIndicatorEl.className = 'text-emerald-400 flex items-center gap-1.5 font-medium cursor-pointer pointer-events-auto bg-transparent border-0 p-0 hover:text-emerald-300 transition-colors';
    audioIconEl.textContent = '🔊';
    audioTextEl.textContent = 'AUDIO ON (M)';
  } else {
    audioIndicatorEl.className = 'text-slate-500 flex items-center gap-1.5 font-medium cursor-pointer pointer-events-auto bg-transparent border-0 p-0 hover:text-slate-400 transition-colors';
    audioIconEl.textContent = '🔇';
    audioTextEl.textContent = 'AUDIO MUTED (M)';
  }
}

// -------------------------------------------------------------
// Nissan GT-R Engine Start & Stop System
// -------------------------------------------------------------
function toggleEngine() {
  if (carState.engineStarting) return; // Prevent spamming during starter cranking
  if (!carState.engineRunning) {
    startEngine();
  } else {
    stopEngine();
  }
}

function startEngine() {
  if (carState.engineRunning || carState.engineStarting) return;
  if (!isAudioInitialized) {
    initAudio();
  }
  carState.engineStarting = true;
  carState.startupTimer = carState.startupDuration;
  playEngineStartSound();
  updateEngineHUD();
}

function stopEngine() {
  if (!carState.engineRunning && !carState.engineStarting) return;
  carState.engineRunning = false;
  carState.engineStarting = false;
  carState.startupTimer = 0;
  carState.isShifting = false;
  playEngineStopSound();
  updateEngineHUD();
}

function updateEngineHUD() {
  if (!engineBtnEl || !engineDotEl || !engineTextEl) return;

  if (carState.engineStarting) {
    engineBtnEl.className = 'pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 text-white font-mono text-xs font-bold border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all active:scale-95 cursor-pointer select-none animate-pulse';
    engineDotEl.className = 'inline-block w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.9)] animate-ping';
    engineTextEl.textContent = 'STARTING...';
  } else if (carState.engineRunning) {
    engineBtnEl.className = 'pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono text-xs font-bold border border-red-400/40 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all active:scale-95 cursor-pointer select-none';
    engineDotEl.className = 'inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse';
    engineTextEl.textContent = 'ENGINE STOP';
  } else {
    engineBtnEl.className = 'pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-800 to-red-950 hover:from-red-900 hover:to-rose-900 text-slate-200 hover:text-white font-mono text-xs font-bold border border-red-500/30 hover:border-red-500/60 shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-all active:scale-95 cursor-pointer select-none';
    engineDotEl.className = 'inline-block w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]';
    engineTextEl.textContent = 'START ENGINE';
  }
}

// Realistic GT-R VR38DETT Starter Motor & Ignition Flare Audio
function playEngineStartSound() {
  if (!isAudioInitialized) {
    initAudio();
  }
  if (!audioCtx || isAudioMuted) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  try {
    const now = audioCtx.currentTime;

    // 1. High-torque Starter Motor Cranking Pulses (solenoid clicks & flywheel teeth whine)
    [0.0, 0.11, 0.22].forEach((offset) => {
      const crankTime = now + offset;

      const crankOsc = audioCtx.createOscillator();
      crankOsc.type = 'sawtooth';
      crankOsc.frequency.setValueAtTime(115, crankTime);
      crankOsc.frequency.exponentialRampToValueAtTime(54, crankTime + 0.08);

      const crankGain = audioCtx.createGain();
      crankGain.gain.setValueAtTime(0.25, crankTime);
      crankGain.gain.exponentialRampToValueAtTime(0.001, crankTime + 0.08);

      crankOsc.connect(crankGain);
      crankGain.connect(masterGain || audioCtx.destination);
      crankOsc.start(crankTime);
      crankOsc.stop(crankTime + 0.085);

      // Starter pinion gear mesh noise burst
      const noiseLen = Math.floor(audioCtx.sampleRate * 0.06);
      const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.02));
      }
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(680, crankTime);
      noiseFilter.Q.setValueAtTime(3.0, crankTime);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.18, crankTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, crankTime + 0.06);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain || audioCtx.destination);
      noiseSource.start(crankTime);
    });

    // 2. VR38DETT Ignition Burst & Initial Combustion Kick
    const igniteTime = now + 0.34;
    const boomOsc = audioCtx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(130, igniteTime);
    boomOsc.frequency.exponentialRampToValueAtTime(38, igniteTime + 0.22);

    const boomGain = audioCtx.createGain();
    boomGain.gain.setValueAtTime(0.48, igniteTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, igniteTime + 0.24);

    boomOsc.connect(boomGain);
    boomGain.connect(masterGain || audioCtx.destination);
    boomOsc.start(igniteTime);
    boomOsc.stop(igniteTime + 0.25);

    // Initial combustion exhaust bark
    const igniteLen = Math.floor(audioCtx.sampleRate * 0.15);
    const igniteBuf = audioCtx.createBuffer(1, igniteLen, audioCtx.sampleRate);
    const igniteData = igniteBuf.getChannelData(0);
    for (let i = 0; i < igniteLen; i++) {
      igniteData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.04));
    }
    const igniteSource = audioCtx.createBufferSource();
    igniteSource.buffer = igniteBuf;
    const igniteFilter = audioCtx.createBiquadFilter();
    igniteFilter.type = 'lowpass';
    igniteFilter.frequency.setValueAtTime(550, igniteTime);

    const igniteGain = audioCtx.createGain();
    igniteGain.gain.setValueAtTime(0.28, igniteTime);
    igniteGain.gain.exponentialRampToValueAtTime(0.001, igniteTime + 0.14);

    igniteSource.connect(igniteFilter);
    igniteFilter.connect(igniteGain);
    igniteGain.connect(masterGain || audioCtx.destination);
    igniteSource.start(igniteTime);

    // Fade the continuous engine oscillators into life starting at ignition
    if (engineGain) {
      engineGain.gain.setValueAtTime(0.0001, igniteTime);
      engineGain.gain.exponentialRampToValueAtTime(0.36, igniteTime + 0.12);
      engineGain.gain.setTargetAtTime(0.32, igniteTime + 0.35, 0.15);
    }
  } catch (err) {
    console.warn('Engine start audio error:', err);
  }
}

// Engine Mechanical Shutdown Audio (Smooth Spool Down & Compression Release)
function playEngineStopSound() {
  if (!isAudioInitialized || !audioCtx || isAudioMuted) return;

  try {
    const now = audioCtx.currentTime;

    // Pitch smoothly slides down to 10 Hz over 0.40s
    if (fundOsc) fundOsc.frequency.setTargetAtTime(12, now, 0.12);
    if (bankOsc) bankOsc.frequency.setTargetAtTime(10, now, 0.12);
    if (raspOsc) raspOsc.frequency.setTargetAtTime(16, now, 0.12);
    if (valveOsc) valveOsc.frequency.setTargetAtTime(18, now, 0.12);
    if (subOsc) subOsc.frequency.setTargetAtTime(8, now, 0.12);

    if (engineGain) engineGain.gain.setTargetAtTime(0.00001, now, 0.14);
    if (subGain) subGain.gain.setTargetAtTime(0.00001, now, 0.14);
    if (turboGain) turboGain.gain.setTargetAtTime(0.00001, now, 0.12);
    if (intakeGain) intakeGain.gain.setTargetAtTime(0.00001, now, 0.12);
    if (skidGain) skidGain.gain.setTargetAtTime(0.00001, now, 0.08);
    if (skidCarcassGain) skidCarcassGain.gain.setTargetAtTime(0.00001, now, 0.08);

    // Gentle mechanical spin-down exhaust decompression sigh
    const sighOsc = audioCtx.createOscillator();
    sighOsc.type = 'sine';
    sighOsc.frequency.setValueAtTime(45, now);
    sighOsc.frequency.exponentialRampToValueAtTime(18, now + 0.38);

    const sighGain = audioCtx.createGain();
    sighGain.gain.setValueAtTime(0.20, now);
    sighGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

    sighOsc.connect(sighGain);
    sighGain.connect(masterGain || audioCtx.destination);
    sighOsc.start(now);
    sighOsc.stop(now + 0.42);
  } catch (err) {
    console.warn('Engine stop audio error:', err);
  }
}

// Twin-Turbo Wastegate Blow-Off & Compressor Surge Flutter ("pshh-ts-ts-ts")
function playBlowOffSound(intensity = 1.0) {
  if (!isAudioInitialized || !audioCtx || isAudioMuted) return;
  const now = audioCtx.currentTime;
  if (!Number.isFinite(now)) return;

  try {
    const sampleRate = audioCtx.sampleRate;
    const effIntensity = Math.max(0.2, Math.min(1.0, intensity));

    // 1. High-pressure air dump hiss
    const hissLen = Math.floor(sampleRate * 0.20);
    const hissBuf = audioCtx.createBuffer(1, hissLen, sampleRate);
    const hData = hissBuf.getChannelData(0);
    for (let i = 0; i < hissLen; i++) {
      hData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.045));
    }
    const hissSource = audioCtx.createBufferSource();
    hissSource.buffer = hissBuf;
    const hissFilter = audioCtx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.setValueAtTime(2600, now);
    hissFilter.Q.setValueAtTime(1.6, now);
    hissFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.18);

    const hissGain = audioCtx.createGain();
    const effGain = Math.min(0.24, 0.20 * effIntensity);
    hissGain.gain.setValueAtTime(effGain, now);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(masterGain || audioCtx.destination);
    hissSource.start(now);

    // 2. Multi-pulse compressor surge flutter ("ts-ts-ts")
    [0.035, 0.075, 0.12].forEach((offset, idx) => {
      const flutterTime = now + offset;
      const decay = Math.pow(0.55, idx);
      const fLen = Math.floor(sampleRate * 0.035);
      const fBuf = audioCtx.createBuffer(1, fLen, sampleRate);
      const fData = fBuf.getChannelData(0);
      for (let i = 0; i < fLen; i++) {
        fData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.008));
      }
      const fSource = audioCtx.createBufferSource();
      fSource.buffer = fBuf;
      const fFilter = audioCtx.createBiquadFilter();
      fFilter.type = 'bandpass';
      fFilter.frequency.setValueAtTime(3100 - idx * 280, flutterTime);
      fFilter.Q.setValueAtTime(4.2, flutterTime);

      const fGain = audioCtx.createGain();
      fGain.gain.setValueAtTime(effGain * 0.8 * decay, flutterTime);
      fGain.gain.exponentialRampToValueAtTime(0.0001, flutterTime + 0.03);

      fSource.connect(fFilter);
      fFilter.connect(fGain);
      fGain.connect(masterGain || audioCtx.destination);
      fSource.start(flutterTime);
    });
  } catch (err) {
    console.warn('Blow-off sound error:', err);
  }
}

// Subtle Overrun Burble (soft exhaust pops when decelerating off-throttle)
function playOverrunBurble() {
  if (!isAudioInitialized || !audioCtx || isAudioMuted) return;
  const now = audioCtx.currentTime;
  if (!Number.isFinite(now)) return;

  try {
    const sampleRate = audioCtx.sampleRate;
    const len = Math.floor(sampleRate * 0.075);
    const buf = audioCtx.createBuffer(1, len, sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.022));
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360 + Math.random() * 220, now);

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.07 + Math.random() * 0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain || audioCtx.destination);
    src.start(now);
  } catch (e) {}
}

// -------------------------------------------------------------
// Frame-by-Frame Realistic Acoustic Engine Updates
// -------------------------------------------------------------
function updateEngineAudio(dt) {
  if (!isAudioInitialized || !audioCtx || isAudioMuted) return;

  const now = audioCtx.currentTime;
  if (!Number.isFinite(now)) return;

  // If engine is OFF and not starting, mute all engine audio buses
  if (!carState.engineRunning && !carState.engineStarting) {
    if (engineGain) engineGain.gain.setTargetAtTime(0.00001, now, 0.04);
    if (subGain) subGain.gain.setTargetAtTime(0.00001, now, 0.04);
    if (turboGain) turboGain.gain.setTargetAtTime(0.00001, now, 0.04);
    if (intakeGain) intakeGain.gain.setTargetAtTime(0.00001, now, 0.04);
    if (skidGain) skidGain.gain.setTargetAtTime(0.00001, now, 0.04);
    if (skidCarcassGain) skidCarcassGain.gain.setTargetAtTime(0.00001, now, 0.04);
    return;
  }

  if (!Number.isFinite(carState.rpm)) {
    carState.rpm = carState.idleRpm;
  }

  const rpmSpan = Math.max(1, carState.redlineRpm - carState.idleRpm);
  const rpmRatio = Math.max(0, Math.min(1.0, (carState.rpm - carState.idleRpm) / rpmSpan));
  const isAccelerating = Boolean(keys.forward && carState.engineRunning && !carState.engineStarting);
  const isBraking = Boolean((keys.backward && carState.speed > 0.5) || keys.handbrake);
  const isIdle = carState.engineRunning && !carState.engineStarting && !isAccelerating && Math.abs(carState.speed) < 0.6;

  // 1. True V6 Firing Orders (Combustion Mechanics)
  // Crankshaft rotation speed in revs per second
  const crankHz = carState.rpm / 60;
  // Fundamental firing order (Order 3 in a 4-stroke V6): 3 power strokes per revolution
  const fundPitch = crankHz * 3.0;
  // Asymmetric bank pulse (Order 1.5): left-to-right 60-degree cylinder bank pulse merging
  const bankPitch = crankHz * 1.5;
  // Metallic titanium rasp (Order 6): 2nd firing harmonic
  const raspPitch = crankHz * 6.0;
  // Upper valvetrain chatter (Order 9)
  const valvePitch = crankHz * 9.0;
  // Sub-bass body vibration (Order 0.75)
  const subPitch = crankHz * 0.75;

  // 2. Dynamic Turbocharger Spool Model
  if (isAccelerating) {
    // Turbo boost builds up realistically with RPM and positive throttle
    const targetBoost = Math.max(0, Math.min(1.0, (carState.rpm - 1700) / 4600));
    turboBoost += (targetBoost - turboBoost) * 2.2 * dt;
  } else {
    // Rapid boost bleed when throttle is lifted
    turboBoost += (0 - turboBoost) * 4.2 * dt;
  }
  turboBoost = Math.max(0, Math.min(1.0, turboBoost));

  // Throttle lift detection: trigger wastegate blow-off flutter when lifting off at boost
  if (lastThrottleState && !isAccelerating && turboBoost > 0.32) {
    playBlowOffSound(turboBoost);
  }
  lastThrottleState = isAccelerating;

  // Turbo whistle pitch: high-tech turbine screaming from 1,150 Hz up to 3,600 Hz
  const turboPitch = 1150 + (turboBoost * 2200) + (rpmRatio * 450);
  const targetTurboGain = turboBoost * 0.034;

  // 3. Cold-Air Induction Airflow Roar
  const targetIntakeGain = isAccelerating ? (0.012 + turboBoost * 0.035) : 0.0001;
  const targetIntakeCutoff = 380 + (rpmRatio * 480);

  // 4. Acoustic Filter Cutoff & Engine Load Resonance
  // On throttle: combustion chambers resonate with sharp attack; cutoff opens wide
  // Off throttle (overrun): cutoff collapses into a deep, hollow, burbling exhaust note
  let targetCutoff;
  if (isAccelerating) {
    targetCutoff = 520 + (rpmRatio * 2500) + (turboBoost * 450); // Opens up to ~3470 Hz
  } else if (isBraking) {
    targetCutoff = 360 + (rpmRatio * 420); // Muffled under brake deceleration
  } else if (isIdle) {
    targetCutoff = 540; // Rich, warm, open idle exhaust note with clear harmonic presence
  } else {
    targetCutoff = 400 + (rpmRatio * 560); // Deep hollow coasting overrun tone
  }

  // Master Engine Volume
  let targetEngineGain;
  if (isIdle) {
    // Rich, clearly audible, authentic VR38DETT twin-turbo V6 idle thrum & burble
    const idleLope = 1.0 + 0.08 * Math.sin(now * 31.4); // Subtle 5 Hz combustion idle pulse lope
    targetEngineGain = 0.34 * idleLope;
  } else {
    targetEngineGain = 0.24 + (rpmRatio * 0.18);
    if (isAccelerating) targetEngineGain += 0.07;
  }

  // Rasp Intensity (Order 6) increases dramatically at higher RPM
  let targetRaspGain = isIdle ? 0.36 : (0.24 + Math.pow(rpmRatio, 1.4) * 0.40);
  if (isAccelerating) targetRaspGain *= 1.35;

  // 5. Shift Acoustic Modulation (Clean twin-clutch ignition cut)
  if (carState.isShifting && carState.shiftType === 'up') {
    const p = Math.max(0, Math.min(1.0, Number.isFinite(carState.shiftProgress) ? carState.shiftProgress : 0));
    // Crisp 18% parabolic dip in engine tone during transmission shift
    const shiftDip = 0.18 * Math.sin(Math.PI * p);
    targetEngineGain *= (1.0 - shiftDip);
    targetCutoff *= (1.0 - 0.18 * Math.sin(Math.PI * p));

    // Momentary clutch bite torque punch when engaging new gear
    if (subGain && p > 0.65) {
      const biteWarmth = 0.42 + 0.18 * Math.sin(Math.PI * ((p - 0.65) / 0.35));
      subGain.gain.setTargetAtTime(Math.max(0.01, biteWarmth), now, 0.035);
    }
  } else if (subGain) {
    subGain.gain.setTargetAtTime(isIdle ? 0.58 : 0.42, now, 0.08);
  }

  // 6. Apply smoothly to Web Audio Nodes
  const safeFundPitch = Math.max(15, Math.min(1200, fundPitch));
  const safeBankPitch = Math.max(10, Math.min(800, bankPitch));
  const safeRaspPitch = Math.max(20, Math.min(2400, raspPitch));
  const safeValvePitch = Math.max(30, Math.min(3200, valvePitch));
  const safeSubPitch = Math.max(8, Math.min(400, subPitch));
  const safeCutoff = Math.max(120, Math.min(10000, targetCutoff));
  const safeEngineGain = Math.max(0.0001, Math.min(0.8, targetEngineGain));

  if (fundOsc && Number.isFinite(safeFundPitch)) {
    fundOsc.frequency.setTargetAtTime(safeFundPitch, now, 0.035);
  }
  if (bankOsc && Number.isFinite(safeBankPitch)) {
    bankOsc.frequency.setTargetAtTime(safeBankPitch, now, 0.035);
  }
  if (raspOsc && Number.isFinite(safeRaspPitch)) {
    raspOsc.frequency.setTargetAtTime(safeRaspPitch, now, 0.035);
  }
  if (raspGain && Number.isFinite(targetRaspGain)) {
    raspGain.gain.setTargetAtTime(Math.max(0.01, Math.min(0.8, targetRaspGain)), now, 0.04);
  }
  if (valveOsc && Number.isFinite(safeValvePitch)) {
    valveOsc.frequency.setTargetAtTime(safeValvePitch, now, 0.04);
  }
  if (subOsc && Number.isFinite(safeSubPitch)) {
    subOsc.frequency.setTargetAtTime(safeSubPitch, now, 0.045);
  }

  // Dynamic filter cutoff & engine volume
  if (engineFilter && Number.isFinite(safeCutoff)) {
    engineFilter.frequency.setTargetAtTime(safeCutoff, now, 0.05);
  }
  if (engineGain && Number.isFinite(safeEngineGain)) {
    engineGain.gain.setTargetAtTime(safeEngineGain, now, 0.035);
  }

  // Turbocharger whistle updates
  if (turboOsc && Number.isFinite(turboPitch)) {
    turboOsc.frequency.setTargetAtTime(Math.max(600, Math.min(5000, turboPitch)), now, 0.04);
  }
  if (turboFilter && Number.isFinite(turboPitch)) {
    turboFilter.frequency.setTargetAtTime(Math.max(600, Math.min(5000, turboPitch)), now, 0.04);
  }
  if (turboGain && Number.isFinite(targetTurboGain)) {
    turboGain.gain.setTargetAtTime(Math.max(0.00001, Math.min(0.2, targetTurboGain)), now, 0.05);
  }

  // Intake induction roar updates
  if (intakeFilter && Number.isFinite(targetIntakeCutoff)) {
    intakeFilter.frequency.setTargetAtTime(Math.max(200, Math.min(2000, targetIntakeCutoff)), now, 0.06);
  }
  if (intakeGain && Number.isFinite(targetIntakeGain)) {
    intakeGain.gain.setTargetAtTime(Math.max(0.00001, Math.min(0.2, targetIntakeGain)), now, 0.05);
  }

  // 7. Dynamic High-Friction Asphalt Tire Skid & Screech Synthesizer
  const currentKmh = Math.abs(carState.speed) * 3.6;
  const forwardMoving = carState.speed > 0.1;
  let targetSkidIntensity = 0.0;

  if (carState.engineRunning || Math.abs(carState.speed) > 1.0) {
    // A. Heavy Service Braking Skid (> 40% pedal pressure at > 12 km/h)
    if (keys.backward && forwardMoving && currentKmh > 12.0 && carState.brakePressure > 0.40) {
      const brakeSlip = ((carState.brakePressure - 0.40) / 0.60) * Math.min(1.0, currentKmh / 35.0);
      targetSkidIntensity = Math.max(targetSkidIntensity, brakeSlip * 0.96);
    }
    // B. Emergency Handbrake Drift Skid
    if (keys.handbrake && forwardMoving && currentKmh > 8.0) {
      const handbrakeSlip = Math.min(1.0, currentKmh / 26.0);
      targetSkidIntensity = Math.max(targetSkidIntensity, handbrakeSlip * 0.94);
    }
    // C. Launch Control Takeoff Burnout Screech (0 - 42 km/h)
    if (carState.isLaunching && forwardMoving && currentKmh < 42.0) {
      const launchSlip = 0.90 * (1.0 - (currentKmh / 42.0) * 0.35);
      targetSkidIntensity = Math.max(targetSkidIntensity, launchSlip);
    }
    // D. High-G High-Speed Cornering Scrub
    if (currentKmh > 60.0 && Math.abs(carState.steerAngle) > 0.16) {
      const cornerSlip = ((Math.abs(carState.steerAngle) - 0.16) / 0.18) * Math.min(1.0, (currentKmh - 60.0) / 70.0);
      targetSkidIntensity = Math.max(targetSkidIntensity, cornerSlip * 0.68);
    }
  }

  if (skidGain && skidFilter1 && skidFilter2 && skidCarcassGain) {
    const safeSkidGain = targetSkidIntensity > 0.03 ? Math.min(0.48, targetSkidIntensity * 0.44) : 0.00001;
    const safeCarcassGain = targetSkidIntensity > 0.05 ? Math.min(0.32, targetSkidIntensity * 0.28) : 0.00001;
    const scrubFreq = 1250 + targetSkidIntensity * 1150; // 1250 - 2400 Hz
    const formantFreq = 2900 + targetSkidIntensity * 850; // 2900 - 3750 Hz

    skidGain.gain.setTargetAtTime(safeSkidGain, now, 0.035);
    skidCarcassGain.gain.setTargetAtTime(safeCarcassGain, now, 0.04);
    skidFilter1.frequency.setTargetAtTime(scrubFreq, now, 0.03);
    skidFilter2.frequency.setTargetAtTime(formantFreq, now, 0.03);
  }
}

// -------------------------------------------------------------
// Realistic Physical Acoustic Exhaust Pops & Bangs Synthesizer
// -------------------------------------------------------------
function playExhaustPopSound(intensity = 1.0, isAggressive = false, isBang = false) {
  if (!isAudioInitialized) {
    initAudio();
  }
  if (!audioCtx || isAudioMuted) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  if (!Number.isFinite(now)) return;

  try {
    const sampleRate = audioCtx.sampleRate;
    const effIntensity = Math.max(0.5, Math.min(2.5, intensity));

    // 1. Physical Acoustic Combustion Shockwave Impulse (punchy, loud exhaust crack)
    const matchingBuffers = popBuffers.filter(b => b.isBang === isBang);
    const chosen = matchingBuffers.length > 0
      ? matchingBuffers[Math.floor(Math.random() * matchingBuffers.length)]
      : (popBuffers[0] || null);

    if (!chosen) return;

    const popSource = audioCtx.createBufferSource();
    popSource.buffer = chosen.buffer;
    const duration = chosen.duration;

    // 2. Dual-Stage Acoustic Resonant Filtering
    // Stage A: Hollow Metal Downpipe Body Resonance Filter
    const tubeFilter = audioCtx.createBiquadFilter();
    tubeFilter.type = 'bandpass';
    const centerFreq = isBang ? (440 + Math.random() * 70) : (340 + Math.random() * 50);
    tubeFilter.frequency.setValueAtTime(centerFreq, now);
    tubeFilter.Q.setValueAtTime(isBang ? 3.0 : 2.5, now);

    // Stage B: Titanium Tailpipe Wall Snap / High-Velocity Gas Crack Filter
    const crackFilter = audioCtx.createBiquadFilter();
    crackFilter.type = 'peaking';
    const crackFreq = isBang ? (1420 + Math.random() * 200) : (1050 + Math.random() * 150);
    crackFilter.frequency.setValueAtTime(crackFreq, now);
    crackFilter.Q.setValueAtTime(2.0, now);
    crackFilter.gain.setValueAtTime(isBang ? 8.5 : 5.0, now);

    // Stage C: Increased Output Gain for louder, punchier presence
    const popGain = audioCtx.createGain();
    const peakGain = Math.min(1.45, (isBang ? 1.25 : 0.95) * effIntensity);
    popGain.gain.setValueAtTime(peakGain, now);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.032);

    popSource.connect(tubeFilter);
    tubeFilter.connect(crackFilter);
    crackFilter.connect(popGain);
    popGain.connect(masterGain || audioCtx.destination);
    popSource.start(now);

    // 3. Staccato Micro-Crackle Secondary Detonation (Authentic overrun texture)
    if (Math.random() < 0.85 && tailBuffers.length > 0) {
      const tailDelay = 0.022 + Math.random() * 0.030;
      const tailTime = now + tailDelay;

      const tailSource = audioCtx.createBufferSource();
      tailSource.buffer = tailBuffers[Math.floor(Math.random() * tailBuffers.length)];

      const tailFilter = audioCtx.createBiquadFilter();
      tailFilter.type = 'bandpass';
      tailFilter.frequency.setValueAtTime(680 + Math.random() * 300, tailTime);
      tailFilter.Q.setValueAtTime(2.5, tailTime);

      const tailGain = audioCtx.createGain();
      tailGain.gain.setValueAtTime(peakGain * (0.45 + Math.random() * 0.22), tailTime);
      tailGain.gain.exponentialRampToValueAtTime(0.0001, tailTime + 0.048);

      tailSource.connect(tailFilter);
      tailFilter.connect(tailGain);
      tailGain.connect(masterGain || audioCtx.destination);
      tailSource.start(tailTime);
    }

    // 4. Subtle, crisp wastegate pressure chuff on heavy detonations
    if (isBang && Math.random() < 0.35) {
      playBlowOffSound(0.30);
    }
  } catch (err) {
    console.warn('Exhaust pop audio error:', err);
  }
}

function triggerExhaustFirePop(intensity = 1.0, isAggressive = false, isBang = false) {
  if (!carState.engineRunning || carState.engineStarting) return;

  currentPopIntensity = intensity;
  isAggressivePopActive = isAggressive;
  currentPopDuration = isAggressive ? 0.15 : 0.12;
  exhaustPopTimer = currentPopDuration;

  // Erupt realistic, compact exhaust flame tongues from all 4 silencers
  exhaustFlameJets.forEach((jet, idx) => {
    jet.visible = true;
    const isOuter = (idx === 0 || idx === 3);
    const lengthMult = isAggressive ? (isOuter ? 1.15 : 1.05) : (isOuter ? 0.85 : 0.75);
    const thickMult = isAggressive ? 1.05 : 0.95;
    const lengthScale = (lengthMult * Math.min(1.2, intensity)) * (0.92 + Math.random() * 0.16);
    const thickScale = (thickMult * Math.min(1.1, intensity)) * (0.94 + Math.random() * 0.12);
    jet.scale.set(thickScale, thickScale, lengthScale);
  });

  if (isAggressive) {
    // Searing hot compact flame colors: Electric cyan core + incandescent orange tip
    if (outerFlameMat) {
      outerFlameMat.color.setHex(Math.random() < 0.35 ? 0xff2200 : 0xff4800);
      outerFlameMat.opacity = 0.98;
    }
    if (innerFlameMat) {
      innerFlameMat.color.setHex(0x00e5ff); // Hot electric cyan core
      innerFlameMat.opacity = 1.0;
    }
    if (coreFlameMat) {
      coreFlameMat.color.setHex(0xffffff); // White-hot center filament
      coreFlameMat.opacity = 1.0;
    }
    if (rimFlameMat) {
      rimFlameMat.color.setHex(0x38bdf8); // Searing tip mouth glow
      rimFlameMat.opacity = 0.95;
    }
    if (exhaustFlashLight) {
      exhaustFlashLight.color.setHex(Math.random() < 0.25 ? 0x38bdf8 : 0xff5500);
      exhaustFlashLight.intensity = Math.min(3.2, 2.0 * intensity);
      exhaustFlashLight.distance = 3.6;
    }
  } else {
    // Standard upshift flame
    if (outerFlameMat) {
      outerFlameMat.color.setHex(0xff3800);
      outerFlameMat.opacity = 0.95;
    }
    if (innerFlameMat) {
      innerFlameMat.color.setHex(0x38bdf8);
      innerFlameMat.opacity = 1.0;
    }
    if (coreFlameMat) {
      coreFlameMat.color.setHex(0xffffff);
      coreFlameMat.opacity = 1.0;
    }
    if (rimFlameMat) {
      rimFlameMat.color.setHex(0xffaa00);
      rimFlameMat.opacity = 0.9;
    }
    if (exhaustFlashLight) {
      exhaustFlashLight.color.setHex(0xff5500);
      exhaustFlashLight.intensity = 2.2;
      exhaustFlashLight.distance = 3.2;
    }
  }

  // Emit fiery sparks from all 4 GT-R quad exhaust tips (28 compact particles)
  if (sparkPositions && sparkVelocities && sparkLives) {
    const quadTips = [-0.58, -0.42, 0.42, 0.58];
    for (let i = 0; i < SPARK_COUNT; i++) {
      const tipX = quadTips[i % 4];
      sparkPositions[i * 3 + 0] = tipX + (Math.random() - 0.5) * 0.03;
      sparkPositions[i * 3 + 1] = 0.25 + (Math.random() - 0.5) * 0.03;
      sparkPositions[i * 3 + 2] = 2.58;

      sparkVelocities[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
      sparkVelocities[i * 3 + 1] = (Math.random() - 0.2) * 1.2;
      sparkVelocities[i * 3 + 2] = (isAggressive ? 5.5 : 4.2) + Math.random() * (isAggressive ? 5.5 : 3.5);

      const life = (isAggressive ? 0.15 : 0.12) + Math.random() * 0.07;
      sparkLives[i] = life;
      sparkMaxLives[i] = life;
    }
    if (sparkParticles) {
      sparkParticles.material.opacity = 0.95;
      sparkParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Play realistic exhaust pop audio
  playExhaustPopSound(intensity, isAggressive, isBang);
}

function updateExhaustFlames(dt) {
  if (exhaustPopTimer > 0) {
    exhaustPopTimer -= dt;
    const progress = Math.max(0, Math.min(1.0, 1.0 - (exhaustPopTimer / currentPopDuration)));

    const isAggressive = isAggressivePopActive;
    const peakThresh = 0.25;

    if (progress < peakThresh) {
      // Immediate explosive expansion and flame flicker across all 4 silencers
      const burstFrac = progress / peakThresh;
      exhaustFlameJets.forEach((jet, idx) => {
        const isOuter = (idx === 0 || idx === 3);
        const baseLen = isAggressive ? (isOuter ? 1.15 : 1.05) * Math.min(1.2, currentPopIntensity) : (isOuter ? 0.85 : 0.75);
        const baseThick = isAggressive ? 1.05 : 0.95;
        const sz = baseLen + burstFrac * 0.16 + (Math.random() - 0.5) * 0.06;
        const sxy = baseThick + burstFrac * 0.08 + (Math.random() - 0.5) * 0.05;
        jet.scale.set(sxy, sxy, sz);
      });

      const maxLight = isAggressive ? Math.min(3.2, 2.0 * currentPopIntensity) : 2.2;
      if (exhaustFlashLight) exhaustFlashLight.intensity = maxLight * (1.0 - burstFrac * 0.25);
    } else {
      // Rapid decay across all 4 silencers
      const decayFrac = (progress - peakThresh) / (1.0 - peakThresh);
      const fade = Math.pow(Math.max(0, 1.0 - decayFrac), 1.2);
      exhaustFlameJets.forEach((jet, idx) => {
        const isOuter = (idx === 0 || idx === 3);
        const baseLen = isAggressive ? (isOuter ? 1.15 : 1.05) * Math.min(1.2, currentPopIntensity) : (isOuter ? 0.85 : 0.75);
        const baseThick = isAggressive ? 1.05 : 0.95;
        const sz = Math.max(0.04, fade * baseLen + (Math.random() - 0.5) * 0.05);
        const sxy = Math.max(0.04, fade * baseThick);
        jet.scale.set(sxy, sxy, sz);
      });

      if (outerFlameMat) outerFlameMat.opacity = fade * 0.98;
      if (innerFlameMat) innerFlameMat.opacity = fade * 1.0;
      if (coreFlameMat) coreFlameMat.opacity = fade * 1.0;
      if (rimFlameMat) rimFlameMat.opacity = fade * 0.9;
      const decayLight = isAggressive ? Math.min(2.5, 1.5 * currentPopIntensity) : 1.8;
      if (exhaustFlashLight) exhaustFlashLight.intensity = Math.max(0, fade * decayLight);
    }

    if (exhaustPopTimer <= 0) {
      exhaustFlameJets.forEach((jet) => {
        jet.visible = false;
      });
      if (outerFlameMat) outerFlameMat.opacity = 0;
      if (innerFlameMat) innerFlameMat.opacity = 0;
      if (coreFlameMat) coreFlameMat.opacity = 0;
      if (rimFlameMat) rimFlameMat.opacity = 0;
      if (exhaustFlashLight) exhaustFlashLight.intensity = 0;
      isAggressivePopActive = false;
    }
  }

  // Update flying sparks
  if (sparkParticles && sparkPositions && sparkVelocities && sparkLives) {
    let hasAliveSparks = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (sparkLives[i] > 0) {
        sparkLives[i] -= dt;
        if (sparkLives[i] > 0) {
          hasAliveSparks = true;
          sparkPositions[i * 3 + 0] += sparkVelocities[i * 3 + 0] * dt;
          sparkPositions[i * 3 + 1] += sparkVelocities[i * 3 + 1] * dt;
          sparkPositions[i * 3 + 2] += sparkVelocities[i * 3 + 2] * dt;
          sparkVelocities[i * 3 + 1] -= 4.0 * dt;
          sparkVelocities[i * 3 + 2] *= (1.0 - 2.5 * dt);
        } else {
          sparkPositions[i * 3 + 1] = -100;
        }
      }
    }
    if (hasAliveSparks) {
      sparkParticles.material.opacity = Math.max(0, Math.min(1.0, sparkParticles.material.opacity - dt * 4.0));
      sparkParticles.geometry.attributes.position.needsUpdate = true;
    } else {
      sparkParticles.material.opacity = 0;
    }
  }
}

// -------------------------------------------------------------
// High-RPM Accelerator Release Pops & Bangs Overrun System
// -------------------------------------------------------------
function updateOverrunPops(dt) {
  if (!carState.engineRunning || carState.engineStarting) {
    overrunBarrageCount = 0;
    prevAcceleratorState = false;
    throttleHeldDuration = 0;
    return;
  }

  const acceleratorPressed = Boolean(keys.forward);

  // Track active positive throttle application
  if (acceleratorPressed) {
    throttleHeldDuration += dt;
  }

  // Detect genuine accelerator release event (transition from ON throttle -> OFF throttle)
  if (prevAcceleratorState && !acceleratorPressed) {
    // Only fire pops & bangs if driver was actively pressing the accelerator AND RPM >= 4800 at the moment of release
    if (throttleHeldDuration >= 0.10 && carState.rpm >= 4800) {
      // Extended duration: 9-12 pops for redline overrun, 6-8 pops for > 4800 RPM
      overrunBarrageCount = (carState.rpm >= 6000 ? 9 + Math.floor(Math.random() * 4) : 6 + Math.floor(Math.random() * 3));
      overrunIntensity = 1.35;

      // Erupt the initial sharp, loud crack on throttle lift-off
      triggerExhaustFirePop(overrunIntensity, true, true);
      overrunNextPopTimer = 0.10 + Math.random() * 0.045;
    }
    throttleHeldDuration = 0;
  }

  prevAcceleratorState = acceleratorPressed;

  // If driver steps on the gas again, immediately cancel any remaining overrun pop
  if (acceleratorPressed) {
    overrunBarrageCount = 0;
    return;
  }

  // Active overrun cadence with extended duration and natural volume decay
  if (overrunBarrageCount > 0) {
    if (carState.rpm < 3200) {
      overrunBarrageCount = 0;
      return;
    }

    overrunNextPopTimer -= dt;
    if (overrunNextPopTimer <= 0) {
      overrunBarrageCount--;
      // Mix sharp gunshot cracks and guttural pipe thocks
      const isBang = (overrunBarrageCount % 2 === 0) || (overrunBarrageCount === 0);
      const popVol = Math.max(0.85, 1.25 * (overrunBarrageCount / 8));
      triggerExhaustFirePop(popVol, true, isBang);
      overrunNextPopTimer = 0.095 + Math.random() * 0.045;
    }
  }
}

// -------------------------------------------------------------
// Headlight Toggle System
// -------------------------------------------------------------
function toggleHeadlights() {
  headlightsOn = !headlightsOn;

  headlights.forEach((spot) => {
    spot.visible = headlightsOn;
  });

  headlightBeams.forEach((beam) => {
    beam.visible = headlightsOn;
  });

  headlightLenses.forEach((lens) => {
    lens.material.color.setHex(headlightsOn ? 0xffffff : 0x1e2430);
  });

  if (roadBeamPoolMesh) {
    roadBeamPoolMesh.visible = headlightsOn;
  }

  updateLightsHUD();
}

function updateLightsHUD() {
  if (!lightsIndicatorEl || !lightsDotEl || !lightsTextEl) return;
  if (headlightsOn) {
    lightsIndicatorEl.className = 'text-cyan-400 flex items-center gap-1.5 font-medium';
    lightsDotEl.className = 'inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
    lightsTextEl.textContent = 'LIGHTS ON (L)';
  } else {
    lightsIndicatorEl.className = 'text-slate-500 flex items-center gap-1.5 font-medium';
    lightsDotEl.className = 'inline-block w-2 h-2 rounded-full bg-slate-600';
    lightsTextEl.textContent = 'LIGHTS OFF (L)';
  }
}

// -------------------------------------------------------------
// Input Handling
// -------------------------------------------------------------
function setupInputListeners() {
  // Ensure audio is initialized on first user interaction
  const activateAudio = () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  window.addEventListener('pointerdown', activateAudio, { passive: true });
  window.addEventListener('touchstart', activateAudio, { passive: true });
  window.addEventListener('mousedown', activateAudio, { passive: true });

  if (audioIndicatorEl) {
    audioIndicatorEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudio();
    });
  }

  if (lightsIndicatorEl) {
    lightsIndicatorEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHeadlights();
    });
  }

  if (cameraIndicatorEl) {
    cameraIndicatorEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCameraMode();
    });
  }

  if (engineBtnEl) {
    engineBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEngine();
    });
  }

  if (garageBtnEl) {
    garageBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      returnToGarageFromHighway();
    });
  }

  // --- PWA Installation & Offline Connectivity Logic ---
  let deferredInstallPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  if (pwaInstallBtnEl && !isStandalone) {
    if (isIOS) {
      pwaInstallBtnEl.classList.remove('hidden');
      pwaInstallBtnEl.classList.add('flex');
      if (pwaInstallTextEl) pwaInstallTextEl.textContent = 'INSTALL (iOS)';
    }

    pwaInstallBtnEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          pwaInstallBtnEl.classList.add('hidden');
          pwaInstallBtnEl.classList.remove('flex');
        }
        deferredInstallPrompt = null;
      } else if (isIOS && iosModalEl) {
        iosModalEl.classList.remove('hidden');
        iosModalEl.classList.add('flex');
      }
    });
  }

  if (closeIosModalBtnEl && iosModalEl) {
    closeIosModalBtnEl.addEventListener('click', () => {
      iosModalEl.classList.add('hidden');
      iosModalEl.classList.remove('flex');
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (pwaInstallBtnEl && !isStandalone) {
      pwaInstallBtnEl.classList.remove('hidden');
      pwaInstallBtnEl.classList.add('flex');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (pwaInstallBtnEl) {
      pwaInstallBtnEl.classList.add('hidden');
      pwaInstallBtnEl.classList.remove('flex');
    }
  });

  // Offline / Online Connectivity Notification
  const updateOnlineStatus = () => {
    if (offlineToastEl) {
      if (!navigator.onLine) {
        offlineToastEl.classList.remove('hidden');
        offlineToastEl.classList.add('flex');
      } else {
        offlineToastEl.classList.add('hidden');
        offlineToastEl.classList.remove('flex');
      }
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  window.addEventListener('keydown', (e) => {
    activateAudio();

    switch (e.code) {
      case 'KeyE':
        toggleEngine();
        e.preventDefault();
        break;
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = true;
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.backward = true;
        e.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        e.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        e.preventDefault();
        break;
      case 'Space':
        keys.handbrake = true;
        e.preventDefault();
        break;
      case 'Backslash':
        keys.clutch = true;
        e.preventDefault();
        break;
      case 'KeyL':
        toggleHeadlights();
        e.preventDefault();
        break;
      case 'KeyM':
        toggleAudio();
        e.preventDefault();
        break;
      case 'KeyV':
        toggleCameraMode();
        e.preventDefault();
        break;
      case 'KeyG':
        if (!inGarage && !isSceneTransitioning) {
          returnToGarageFromHighway();
          e.preventDefault();
        }
        break;
      case 'Enter':
      case 'NumpadEnter':
        if (inGarage && canExitGarage && !isSceneTransitioning) {
          transitionFromGarageToHighway();
          e.preventDefault();
        }
        break;
    }
    if (e.key === '\\' || e.code === 'Backslash') {
      keys.clutch = true;
      e.preventDefault();
    }
    if ((e.key === 'e' || e.key === 'E') && e.code !== 'KeyE') {
      toggleEngine();
      e.preventDefault();
    }
    if ((e.key === 'l' || e.key === 'L') && e.code !== 'KeyL') {
      toggleHeadlights();
      e.preventDefault();
    }
    if ((e.key === 'm' || e.key === 'M') && e.code !== 'KeyM') {
      toggleAudio();
      e.preventDefault();
    }
    if ((e.key === 'v' || e.key === 'V') && e.code !== 'KeyV') {
      toggleCameraMode();
      e.preventDefault();
    }
    // If driver tries to accelerate or reverse while engine is turned off, pulse the engine start button
    if (!carState.engineRunning && !carState.engineStarting && (keys.forward || keys.backward)) {
      if (engineBtnEl) {
        engineBtnEl.classList.add('scale-105', 'ring-2', 'ring-rose-500');
        setTimeout(() => {
          if (engineBtnEl) engineBtnEl.classList.remove('scale-105', 'ring-2', 'ring-rose-500');
        }, 300);
      }
    }

    if (!hasDriven && carState.engineRunning && (keys.forward || keys.backward || keys.clutch)) {
      hasDriven = true;
      setTimeout(() => {
        if (controlsHintEl) controlsHintEl.style.opacity = '0.3';
      }, 3500);
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'Space':
        keys.handbrake = false;
        break;
      case 'Backslash':
        keys.clutch = false;
        break;
    }
    if (e.key === '\\' || e.code === 'Backslash') {
      keys.clutch = false;
    }
  });
}

// -------------------------------------------------------------
// Realistic Vehicle Physics & Dynamics
// -------------------------------------------------------------
function updateCarPhysics(dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);

  if (!Number.isFinite(carState.speed)) carState.speed = 0;
  if (!Number.isFinite(carState.rpm)) carState.rpm = carState.idleRpm;
  if (!Number.isFinite(carState.shiftTimer)) {
    carState.shiftTimer = 0;
    carState.isShifting = false;
    carState.shiftType = 'none';
  }

  const forwardMoving = carState.speed > 0.05;
  const reverseMoving = carState.speed < -0.05;
  const currentKmh = Math.abs(carState.speed) * 3.6;
  const canDrive = carState.engineRunning && !carState.engineStarting;

  // 1. Engine Startup Simulation & RPM State Machine
  if (carState.engineStarting) {
    carState.startupTimer -= dt;
    const progress = Math.max(0, Math.min(1.0, 1.0 - (carState.startupTimer / carState.startupDuration)));
    if (progress < 0.38) {
      // Starter motor cranking phase (approx 280-360 RPM vibration)
      carState.rpm = 280 + Math.sin(progress * 52) * 60;
    } else {
      // Ignition flare phase: surge up to ~2,250 RPM then settle to 950 RPM idle
      const flareProg = (progress - 0.38) / 0.62;
      const flareRpm = 950 + 1300 * Math.sin(Math.PI * Math.pow(1.0 - flareProg, 1.3));
      carState.rpm = flareRpm;
    }

    if (carState.startupTimer <= 0) {
      carState.engineStarting = false;
      carState.engineRunning = true;
      carState.rpm = carState.idleRpm;
      updateEngineHUD();
    }
  } else if (!carState.engineRunning) {
    // Engine off: smooth RPM decay to zero
    carState.rpm += (0 - carState.rpm) * 7.0 * dt;
    if (carState.rpm < 8) carState.rpm = 0;
    carState.isShifting = false;
  }

  // 2. Automatic 6-Speed Transmission & Shift Progression Management
  if (carState.isShifting && canDrive) {
    if (keys.clutch) {
      // Immediate disengagement overrides shift animation
      carState.isShifting = false;
      carState.shiftType = 'none';
      carState.shiftTimer = 0;
      carState.shiftProgress = 0;
    } else {
      carState.shiftTimer -= dt;
      carState.shiftProgress = Math.max(0, Math.min(1.0, 1.0 - (carState.shiftTimer / carState.shiftDuration)));

      // S-curve glide for RPM: smooth, organic transition with no sudden cuts or jumps
      const p = carState.shiftProgress;
      const smoothT = p * p * (3 - 2 * p);
      carState.rpm = (1.0 - smoothT) * carState.shiftStartRpm + smoothT * carState.shiftTargetRpm;

      if (carState.shiftTimer <= 0) {
        carState.isShifting = false;
        carState.shiftType = 'none';
        carState.shiftTimer = 0;
        carState.shiftProgress = 0;
      }
    }
  }

  // Gear Selection & Auto Shifting (only active when engine is running and clutch is not depressed)
  if (canDrive && !keys.clutch && !reverseMoving && !carState.isShifting) {
    const curGearData = GEAR_CONFIG[carState.currentGear - 1];

    // Upshift: when accelerating forward and crossing shift threshold or redline
    if (keys.forward && carState.currentGear < 6) {
      if (currentKmh >= curGearData.shiftUpKmh || carState.rpm >= 7050) {
        // Shifting out of 1st terminates launch boost window cleanly
        carState.isLaunching = false;

        const nextGear = carState.currentGear + 1;
        const nextGearData = GEAR_CONFIG[nextGear - 1];
        carState.shiftStartRpm = carState.rpm;

        // Realistic RPM target in next gear based on current speed
        const speedFrac = Math.min(1.0, currentKmh / nextGearData.maxKmh);
        carState.shiftTargetRpm = carState.idleRpm + speedFrac * (carState.redlineRpm - carState.idleRpm);

        carState.currentGear = nextGear;
        carState.isShifting = true;
        carState.shiftType = 'up';
        carState.shiftDuration = 0.20; // Ultra-fast, crisp dual-clutch upshift glide
        carState.shiftTimer = carState.shiftDuration;
        carState.shiftProgress = 0;
        triggerExhaustFirePop(1.5, false, true);
      }
    }
    // Downshift: seamlessly drop gear with zero shift animation or suspension rocking
    else if (carState.currentGear > 1) {
      if (currentKmh < curGearData.downshiftKmh) {
        const prevGear = carState.currentGear - 1;
        carState.currentGear = prevGear;
        carState.isShifting = false;
        carState.shiftType = 'none';
        carState.shiftTimer = 0;
        carState.shiftProgress = 0;
      }
    }
  }

  // 3. Launch Control System & Realistic RPM Dynamics
  // Condition: W (forward) and SPACE (handbrake) held together from stop or low speed
  const isHoldingLaunch = canDrive && !keys.clutch && keys.forward && keys.handbrake && currentKmh < 3.5;

  if (isHoldingLaunch) {
    carState.isLaunchControl = true;
    carState.launchControlTimer += dt;
    carState.speed = 0; // Hold car stationary on the line
    carState.brakePressure = 1.0;

    if (carState.launchControlTimer < 2.0) {
      // Stage 1 (0 to 2 seconds): Rapid, silky-smooth rise to 4000 RPM
      carState.launchStage = 1;
      const targetRpm = 4000;
      // Fast exponential approach (~0.12s) for instant yet fluid analog needle sweep & clean sound
      carState.rpm += (targetRpm - carState.rpm) * 16.0 * dt;
    } else {
      // Stage 2 (after 2 seconds): Smoothly climbs to 5700 RPM boost limit
      carState.launchStage = 2;
      const targetRpm = 5700;
      carState.rpm += (targetRpm - carState.rpm) * 7.5 * dt;
      // Clean, pure engine whine and turbo spool (no pops, bangs or flames)
    }
  } else {
    // When SPACE is released after holding launch control
    if (carState.isLaunchControl) {
      if (keys.forward && !keys.clutch) {
        // LAUNCH TRIGGERED!
        carState.isLaunching = true;
        carState.launchTimer = 1.35; // Increased launch clutch bite & smoke window duration
        carState.speed = 3.6; // Instant launch bite (approx 13 km/h)
        carState.currentGear = 1;

        // Smoothly settle into 4200 - 4500 RPM launch bracket
        carState.rpm += (4350 - carState.rpm) * 18.0 * dt;

        // Clean turbo spool sound
        playBlowOffSound(0.25);
      }
      carState.isLaunchControl = false;
      carState.launchControlTimer = 0;
      carState.launchStage = 0;
    }
  }

  // Active launch slip window (rocket takeoff in 1st gear)
  if (carState.isLaunching) {
    carState.launchTimer -= dt;
    if (!keys.forward || keys.clutch || carState.launchTimer <= 0 || currentKmh > 42.0 || carState.currentGear > 1) {
      carState.isLaunching = false;
    }
  }

  // Clutch Dump / Release event (High-RPM clutch drop)
  if (carState.prevClutchState && !keys.clutch && canDrive) {
    if (keys.forward && carState.rpm > 3500) {
      // Driver dumps the clutch at high RPM: stored flywheel inertia kicks in!
      const dumpBiteSpeed = (carState.rpm / carState.redlineRpm) * 8.5; // up to ~30 km/h bite
      carState.speed = Math.max(carState.speed, dumpBiteSpeed);
      triggerExhaustFirePop(1.4, false, true);
    }
  }

  // RPM Tracking when NOT shifting and engine is running
  if (canDrive && !carState.isShifting) {
    let targetRpm = carState.idleRpm;

    if (keys.clutch) {
      // CLUTCH PRESSED: Drivetrain completely disengaged!
      if (keys.forward) {
        // Free-revving engine: RPM climbs smoothly to max redline (7,600 RPM)
        // Remains firmly at max RPM as long as W is held!
        targetRpm = 7600;
        const revRiseSpeed = 6.2; // Slightly reduced, realistic engine response speed
        carState.rpm += (targetRpm - carState.rpm) * revRiseSpeed * dt;
      } else {
        // Drop smoothly to idle
        const idlePulse = Math.sin(clock.getElapsedTime() * 3.5) * 15;
        targetRpm = carState.idleRpm + idlePulse;
        const revDropSpeed = 5.2;
        carState.rpm += (targetRpm - carState.rpm) * revDropSpeed * dt;
      }
    } else if (carState.isLaunchControl) {
      // RPM already smoothly managed in launch control block above
      targetRpm = carState.rpm;
    } else if (carState.isLaunching && carState.currentGear === 1) {
      // Active Launch: car moves with 4200 - 4500 RPM smoothly transitioning into 1st gear pull
      const speedFraction = Math.min(1.0, currentKmh / GEAR_CONFIG[0].maxKmh);
      const launchBaseRpm = 4350; // Smooth 4200-4500 RPM
      const gearRpm = carState.idleRpm + speedFraction * (carState.redlineRpm - carState.idleRpm);
      targetRpm = Math.max(launchBaseRpm, gearRpm);
      carState.rpm += (targetRpm - carState.rpm) * 12.0 * dt;
    } else if (reverseMoving) {
      targetRpm = carState.idleRpm + Math.min(1.0, currentKmh / 35) * (5200 - carState.idleRpm);
      carState.rpm += (targetRpm - carState.rpm) * 8.0 * dt;
    } else if (currentKmh < 0.8 && !forwardMoving) {
      if (keys.handbrake) {
        targetRpm = carState.idleRpm;
      } else if (keys.forward) {
        // Normal takeoff (without launch control): starts from idle
        targetRpm = 1800;
      } else {
        targetRpm = carState.idleRpm + Math.sin(clock.getElapsedTime() * 3.5) * 20; // Idle pulse
      }
      const rpmSpeed = keys.forward ? 8.0 : 6.0;
      carState.rpm += (targetRpm - carState.rpm) * rpmSpeed * dt;
    } else {
      // Normal driving in gear
      const gearData = GEAR_CONFIG[carState.currentGear - 1];
      const speedFractionInGear = Math.min(1.08, currentKmh / gearData.maxKmh);
      targetRpm = carState.idleRpm + speedFractionInGear * (carState.redlineRpm - carState.idleRpm);
      if (keys.forward) targetRpm += 120;
      const rpmSpeed = keys.forward ? 9.5 : 6.0;
      carState.rpm += (targetRpm - carState.rpm) * rpmSpeed * dt;
    }

    carState.rpm = Math.max(880, Math.min(carState.maxRpm, carState.rpm));
  }

  // 4. Longitudinal Acceleration & Braking with Smooth Shift Transition (Upshifts only)
  if (keys.clutch && canDrive) {
    // CLUTCH ENGAGED (Disconnected): Zero drive engine power transmitted to wheels!
    // Car coasts freely with aerodynamic drag and rolling friction (or decelerates under brake/handbrake)
    if (keys.backward) {
      if (forwardMoving) {
        carState.brakePressure = Math.min(1.0, carState.brakePressure + 5.0 * dt);
        const effectiveBrake = carState.brakeRate * (0.42 + 0.58 * carState.brakePressure);
        carState.speed -= effectiveBrake * dt;
        if (carState.speed < 0) carState.speed = 0;
      }
    } else {
      carState.brakePressure = Math.max(0, carState.brakePressure - 8.0 * dt);
      const aeroDrag = carState.aeroDragCoeff * carState.speed * carState.speed;
      const totalDrag = carState.rollingFriction + aeroDrag;
      if (forwardMoving) {
        carState.speed -= totalDrag * dt;
        if (carState.speed < 0) carState.speed = 0;
      } else if (reverseMoving) {
        carState.speed += carState.rollingFriction * dt;
        if (carState.speed > 0) carState.speed = 0;
      }
    }
  } else if (canDrive && carState.isShifting && carState.shiftType === 'up') {
    // Smooth clutch uncoupling & coupling curve:
    // Torque smoothly dips during middle of shift, then bites into new gear
    const p = carState.shiftProgress;
    let clutchFactor = 0;
    if (p < 0.25) {
      clutchFactor = (1.0 - p / 0.25) * 0.35;
    } else if (p > 0.65) {
      clutchFactor = ((p - 0.65) / 0.35) * 0.75;
    }

    const gearRatio = GEAR_CONFIG[carState.currentGear - 1].ratio;
    const forwardSpeed = Math.max(0, carState.speed);
    const speedRatio = Math.min(1.0, forwardSpeed / carState.maxForwardSpeed);
    const topEndResistance = Math.max(0.04, 1.0 - Math.pow(speedRatio, 1.85));
    const engineThrust = carState.baseEnginePower * (gearRatio * 0.65 + 0.35) * topEndResistance * clutchFactor;
    const aeroDrag = carState.aeroDragCoeff * carState.speed * carState.speed;
    const netAccel = engineThrust - aeroDrag - carState.rollingFriction;

    if (forwardMoving) {
      carState.speed += netAccel * dt;
      if (carState.speed < 0) carState.speed = 0;
    }
  } else if (keys.forward && canDrive) {
    if (reverseMoving) {
      carState.speed += carState.brakeRate * dt;
      if (carState.speed > 0) carState.speed = 0;
    } else if (!carState.isLaunchControl) {
      carState.brakePressure = 0;
      // Current gear torque output
      const gearRatio = GEAR_CONFIG[carState.currentGear - 1].ratio;
      // High-speed air resistance tapers acceleration realistically towards 200 km/h (takes ~20s)
      const forwardSpeed = Math.max(0, carState.speed);
      const speedRatio = Math.min(1.0, forwardSpeed / carState.maxForwardSpeed);
      const topEndResistance = Math.max(0.04, 1.0 - Math.pow(speedRatio, 1.85));

      // Extra launch torque thrust during 1st-gear launch control boost window only
      const launchBoost = (carState.isLaunching && carState.currentGear === 1) ? 1.25 : 1.0;

      const engineThrust = carState.baseEnginePower * launchBoost * (gearRatio * 0.65 + 0.35) * topEndResistance;
      const aeroDrag = carState.aeroDragCoeff * carState.speed * carState.speed;
      const netAccel = engineThrust - aeroDrag - carState.rollingFriction;

      carState.speed += Math.max(0, netAccel) * dt;
      if (carState.speed > carState.maxForwardSpeed) carState.speed = carState.maxForwardSpeed;
    }
  } else if (keys.backward) {
    if (forwardMoving) {
      // Realistic progressive hydraulic brake pedal (works whether engine is ON or OFF)
      carState.brakePressure = Math.min(1.0, carState.brakePressure + 5.0 * dt);
      const effectiveBrake = carState.brakeRate * (0.42 + 0.58 * carState.brakePressure);
      carState.speed -= effectiveBrake * dt;
      if (carState.speed < 0) carState.speed = 0;
    } else if (canDrive) {
      // Reverse drive torque only available if engine is running
      carState.brakePressure = 0;
      carState.speed -= carState.reverseAccelRate * dt;
      if (carState.speed < -carState.maxReverseSpeed) carState.speed = -carState.maxReverseSpeed;
    }
  } else {
    carState.brakePressure = Math.max(0, carState.brakePressure - 8.0 * dt);
    // Coasting drag (active in neutral, off, or foot off gas)
    const aeroDrag = carState.aeroDragCoeff * carState.speed * carState.speed;
    const totalDrag = carState.rollingFriction + aeroDrag;
    if (forwardMoving) {
      carState.speed -= totalDrag * dt;
      if (carState.speed < 0) carState.speed = 0;
    } else if (reverseMoving) {
      carState.speed += carState.rollingFriction * dt;
      if (carState.speed > 0) carState.speed = 0;
    }
  }

  carState.prevClutchState = Boolean(keys.clutch);

  // Handbrake quick decel (realistic e-brake deceleration)
  if (keys.handbrake) {
    if (carState.speed > 0) {
      carState.speed = Math.max(0, carState.speed - carState.handbrakeRate * dt);
    } else if (carState.speed < 0) {
      carState.speed = Math.min(0, carState.speed + carState.handbrakeRate * dt);
    }
  }

  // 4. Responsive Highway Steering with Balanced Speed Damping
  const speed = Math.abs(carState.speed);
  const speedSteerFactor = 1.0 / (1.0 + (speed / 18.0) ** 1.15);
  const targetSteerMax = carState.maxSteerAngle * Math.max(0.36, speedSteerFactor);

  let targetSteer = 0;
  if (keys.left) targetSteer += targetSteerMax;
  if (keys.right) targetSteer -= targetSteerMax;

  if (targetSteer !== 0) {
    carState.steerAngle += (targetSteer - carState.steerAngle) * carState.steerInputSpeed * dt;
  } else {
    carState.steerAngle += (0 - carState.steerAngle) * carState.steerReturnSpeed * dt;
  }

  // 5. Smooth, Responsive Yaw Rate (Heading)
  if (speed > 0.02) {
    const turnFactor = (carState.speed / carState.wheelbase) * Math.tan(carState.steerAngle);
    carState.heading += turnFactor * dt;
  }

  // 6. World Position Translation
  const forwardX = -Math.sin(carState.heading);
  const forwardZ = -Math.cos(carState.heading);

  carState.position.x += forwardX * carState.speed * dt;
  carState.position.z += forwardZ * carState.speed * dt;

  if (inGarage) {
    // 3D Garage Boundary & Collision Physics
    const minX = -15.2, maxX = 15.2;
    const minZ = -22.2, maxZ = 22.2;

    if (carState.position.x < minX) {
      carState.position.x = minX;
      carState.speed *= -0.25;
    } else if (carState.position.x > maxX) {
      carState.position.x = maxX;
      carState.speed *= -0.25;
    }

    if (carState.position.z > maxZ) {
      carState.position.z = maxZ;
      carState.speed *= -0.25;
    } else if (carState.position.z < minZ) {
      const inGateWidth = Math.abs(carState.position.x) < 4.2;
      if (!inGateWidth || !canExitGarage) {
        carState.position.z = minZ;
        carState.speed *= -0.25;
      }
    }

    // Heavy Support Pillar Collisions
    const pillars = [
      { x: -12, z: 0 }, { x: 12, z: 0 },
      { x: -12, z: 12 }, { x: 12, z: 12 },
    ];
    const carRadius = 1.3;
    const pillarRadius = 0.88;
    pillars.forEach((col) => {
      const dx = carState.position.x - col.x;
      const dz = carState.position.z - col.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = carRadius + pillarRadius;
      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        carState.position.x += (dx / dist) * overlap;
        carState.position.z += (dz / dist) * overlap;
        carState.speed *= -0.3;
      }
    });

    // Exit Area Trigger Check
    const inExitZone = Math.abs(carState.position.x) < 4.8 && carState.position.z < -16.0 && carState.position.z > -23.5;
    if (inExitZone) {
      canExitGarage = true;
      if (garageExitPromptEl) {
        garageExitPromptEl.classList.remove('hidden');
        setTimeout(() => {
          if (canExitGarage && garageExitPromptEl) {
            garageExitPromptEl.classList.remove('opacity-0', 'scale-95');
            garageExitPromptEl.classList.add('opacity-100', 'scale-100');
          }
        }, 10);
      }
    } else {
      canExitGarage = false;
      if (garageExitPromptEl) {
        garageExitPromptEl.classList.remove('opacity-100', 'scale-100');
        garageExitPromptEl.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          if (!canExitGarage && garageExitPromptEl) {
            garageExitPromptEl.classList.add('hidden');
          }
        }, 300);
      }
    }
  } else {
    // Elastic guardrail safety boundary on Highway
    const guardrailLimit = carState.roadLimitX;
    if (Math.abs(carState.position.x) > guardrailLimit) {
      const side = Math.sign(carState.position.x);
      const penetration = Math.abs(carState.position.x) - guardrailLimit;
      carState.position.x = side * (guardrailLimit - 0.02);
      carState.heading *= Math.max(0.7, 1.0 - 5.0 * dt);
      carState.speed *= Math.max(0.85, 1.0 - penetration * 0.15 * dt);
    }
  }

  // 7. Wheel Rolling & Pivot Visuals
  carState.wheelRotation += (carState.speed / carState.wheelRadius) * dt;

  wheels.fl.rotation.x = -carState.wheelRotation;
  wheels.fr.rotation.x = -carState.wheelRotation;
  wheels.rl.rotation.x = -carState.wheelRotation;
  wheels.rr.rotation.x = -carState.wheelRotation;

  steerPivots.fl.rotation.y = carState.steerAngle * 1.4;
  steerPivots.fr.rotation.y = carState.steerAngle * 1.4;

  if (interiorSteeringWheel) {
    interiorSteeringWheel.rotation.z = carState.steerAngle * 3.5;
  }

  // 8. Suspension Pitch & Roll with Organic Gear Shift Wave (Upshift only)
  let targetPitch = 0;
  if (carState.isShifting && carState.shiftType === 'up' && forwardMoving && !keys.clutch) {
    // Smooth pitch wave: chassis relaxes forward as torque uncouples then bites back into squat
    const dip = Math.sin(Math.PI * carState.shiftProgress) * 0.020;
    targetPitch = 0.016 - dip;
  } else if (keys.forward && forwardMoving && carState.speed < carState.maxForwardSpeed && !keys.clutch && !carState.isLaunchControl) {
    targetPitch = 0.018; // Rear squats down under active drive torque only when clutch is unpressed
  } else if (keys.backward && forwardMoving && carState.speed > 0.4) {
    // Progressive nose dive only while actively moving forward (no movement at rest)
    const speedRatio = Math.min(1.0, (carState.speed - 0.4) / 1.8);
    targetPitch = -0.018 * Math.max(0.35, carState.brakePressure) * speedRatio;
  } else if (keys.handbrake && forwardMoving && carState.speed > 0.4) {
    // Handbrake dive only occurs while car has forward momentum (no movement at rest)
    const speedRatio = Math.min(1.0, (carState.speed - 0.4) / 1.8);
    targetPitch = -0.022 * speedRatio;
  }
  carState.pitchAngle += (targetPitch - carState.pitchAngle) * 8.5 * dt;

  const lateralAccel = (carState.speed / carState.wheelbase) * Math.tan(carState.steerAngle);
  const targetRoll = -Math.max(-0.08, Math.min(0.08, lateralAccel * 0.0032));
  carState.rollAngle += (targetRoll - carState.rollAngle) * 8.0 * dt;

  carGroup.position.copy(carState.position);
  carGroup.rotation.y = carState.heading;

  carChassis.rotation.x = carState.pitchAngle;
  carChassis.rotation.z = carState.rollAngle;

  // 9. Dynamic Headlight Throw & Road Illumination Movement (Roll, Pitch, and Adaptive Steering Sweep)
  const steerSweep = Math.tan(carState.steerAngle);
  // When braking (pitchAngle < 0), headlight throw beam dips slightly downwards / closer down the road
  // When accelerating (pitchAngle > 0), headlight throw beam reaches slightly further forward
  const pitchThrowShift = carState.pitchAngle * 160.0;

  headlightTargets.forEach((ht) => {
    ht.mainTarget.position.x = ht.defaultMainX - steerSweep * 22.0;
    ht.mainTarget.position.y = 0.05;
    ht.mainTarget.position.z = -55.0 + pitchThrowShift;

    ht.wideTarget.position.x = ht.defaultWideX - steerSweep * 14.0;
    ht.wideTarget.position.y = 0.05;
    ht.wideTarget.position.z = -26.0 + pitchThrowShift * 0.5;
  });

  if (roadBeamPoolMesh) {
    // Dynamic road light projection decal is pinned under the front bumper (Z = -2.2),
    // sweeping smoothly into corners and adjusting beam length with pitch dynamics
    roadBeamPoolMesh.position.x = -steerSweep * 2.0;
    roadBeamPoolMesh.position.z = -2.2;
    roadBeamPoolMesh.position.y = 0.035;
    roadBeamPoolMesh.rotation.z = -steerSweep * 0.14;
    // Scale forward throw distance without moving base at bumper
    const dynamicThrowScale = 1.0 + Math.max(-0.25, Math.min(0.25, pitchThrowShift * 0.03));
    roadBeamPoolMesh.scale.set(1.0, dynamicThrowScale, 1.0);
  }

  if (taillightRoadDecalMesh) {
    // Pin at rear bumper with subtle steering reactive sweep
    taillightRoadDecalMesh.position.x = steerSweep * 0.6;
    taillightRoadDecalMesh.position.z = 2.22;
    taillightRoadDecalMesh.position.y = 0.038;
    taillightRoadDecalMesh.rotation.z = steerSweep * 0.08;
  }

  // 10. Dynamic Tail Lights & Brake Illumination System:
  // - Headlights ON: Tail lights remain illuminated with running glow, and illuminate brighter when brakes are hit.
  // - Headlights OFF: Tail lights remain off, and only illuminate when brakes are hit.
  const isBraking = (keys.backward && forwardMoving) || keys.handbrake;
  if (isBraking) {
    // Ultra-bright high-intensity brake illumination
    if (brakeLightMesh) brakeLightMesh.material.color.setHex(0xff2040);
    afterburnerRings.forEach((ring) => {
      ring.material.color.setHex(0xff2040);
    });
    afterburnerLenses.forEach((lens) => {
      lens.material.color.setHex(0xff4760);
    });
    if (taillightRoadDecalMesh) {
      taillightRoadDecalMesh.visible = true;
      taillightRoadDecalMesh.material.opacity = 0.95;
    }
  } else if (headlightsOn) {
    // Headlights ON: Tail lights remain illuminated with steady running light glow
    if (brakeLightMesh) brakeLightMesh.material.color.setHex(0x991b1b);
    afterburnerRings.forEach((ring) => {
      ring.material.color.setHex(0x991b1b);
    });
    afterburnerLenses.forEach((lens) => {
      lens.material.color.setHex(0x3b0712);
    });
    if (taillightRoadDecalMesh) {
      taillightRoadDecalMesh.visible = true;
      taillightRoadDecalMesh.material.opacity = 0.42;
    }
  } else {
    // Headlights OFF: Tail lights completely dark/unlit when not braking
    if (brakeLightMesh) brakeLightMesh.material.color.setHex(0x180306);
    afterburnerRings.forEach((ring) => {
      ring.material.color.setHex(0x180306);
    });
    afterburnerLenses.forEach((lens) => {
      lens.material.color.setHex(0x0f0204);
    });
    if (taillightRoadDecalMesh) {
      taillightRoadDecalMesh.visible = false;
      taillightRoadDecalMesh.material.opacity = 0;
    }
  }
}

// -------------------------------------------------------------
// Dual Camera System: Normal Mode & Cockpit Mode
// -------------------------------------------------------------
function toggleCameraMode() {
  cameraMode = (cameraMode === 'normal') ? 'cockpit' : 'normal';
  if (cameraTextEl) {
    cameraTextEl.textContent = (cameraMode === 'cockpit') ? 'CAM: COCKPIT (V)' : 'CAM: NORMAL (V)';
  }
  const sportClusterEl = document.getElementById('sport-instrument-cluster');
  if (sportClusterEl) {
    sportClusterEl.style.display = (cameraMode === 'cockpit') ? 'none' : 'flex';
  }
  if (cameraIndicatorEl) {
    if (cameraMode === 'cockpit') {
      cameraIndicatorEl.className = 'text-cyan-300 flex items-center gap-1.5 font-mono text-xs font-semibold cursor-pointer pointer-events-auto bg-cyan-950/80 px-3 py-1.5 rounded-full border border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95 select-none';
    } else {
      cameraIndicatorEl.className = 'text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 font-mono text-xs font-semibold cursor-pointer pointer-events-auto bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-indigo-500/40 hover:border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)] transition-all active:scale-95 select-none';
    }
  }
}

function updateCamera(dt) {
  if (!camera || !carState) return;

  const sportClusterEl = document.getElementById('sport-instrument-cluster');

  if (cameraMode === 'cockpit') {
    // Hide outer glass volume & 2D HUD so cockpit view is unobstructed
    if (carCabinMesh) carCabinMesh.visible = false;
    if (sportClusterEl && sportClusterEl.style.display !== 'none') {
      sportClusterEl.style.display = 'none';
    }

    // ---------------------------------------------------------
    // COCKPIT MODE — First-Person Driver's Perspective
    // ---------------------------------------------------------
    if (camera.near !== 0.02) {
      camera.near = 0.02;
      camera.updateProjectionMatrix();
    }

    const speedKmh = Math.abs(carState.speed) * 3.6;

    // Organic speed & engine RPM micro-vibration
    const speedRumble = (speedKmh / 200) * 0.002;
    const rpmRumble = (carState.rpm / 7000) * 0.0012;
    const rumbleX = (Math.random() - 0.5) * (speedRumble + rpmRumble);
    const rumbleY = (Math.random() - 0.5) * (speedRumble + rpmRumble);

    // Seated driver perspective locked 1:1 in local space to carChassis
    // Positioned at driver eye level (x = 0.38, y = 0.96, z = -0.15) looking through steering wheel
    const eyeLocal = new THREE.Vector3(0.38 + rumbleX, 0.96 + rumbleY, -0.15);
    const lookLocal = new THREE.Vector3(0.38, 0.84, -12.0);

    const camWorldPos = carChassis.localToWorld(eyeLocal.clone());
    const camLookTarget = carChassis.localToWorld(lookLocal.clone());

    camera.position.copy(camWorldPos);
    camera.lookAt(camLookTarget);

    // Realistic natural cockpit FOV (70° to 78° with speed build)
    const targetFov = 70.0 + (speedKmh / 200.0) * 8.0;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  } else {
    // Show outer glass volume & 2D HUD in Normal chase mode
    if (carCabinMesh) carCabinMesh.visible = true;
    if (sportClusterEl && sportClusterEl.style.display !== 'flex') {
      sportClusterEl.style.display = 'flex';
    }
    // ---------------------------------------------------------
    // NORMAL MODE — Existing Mode (DO NOT MODIFY IT)
    // ---------------------------------------------------------
    if (camera.near !== 0.1) {
      camera.near = 0.1;
      camera.updateProjectionMatrix();
    }

    // Smooth heading interpolation for fluid steering turns
    const headingDiff = carState.heading - cameraFollow.smoothHeading;
    cameraFollow.smoothHeading += headingDiff * Math.min(1.0, 14.0 * dt);

    // Smooth exponential filter for speed ratio (eliminates abrupt jumps / rubber-banding)
    const targetSpeedRatio = Math.min(1.0, Math.abs(carState.speed) / carState.maxForwardSpeed);
    cameraFollow.smoothSpeedRatio += (targetSpeedRatio - cameraFollow.smoothSpeedRatio) * Math.min(1.0, 4.5 * dt);

    // Organic, progressive speed-dependent pullback & elevation curve
    const currentDist = cameraFollow.baseDistance + cameraFollow.smoothSpeedRatio * cameraFollow.maxPullback;
    const currentHeight = cameraFollow.baseHeight + cameraFollow.smoothSpeedRatio * cameraFollow.maxHeightRise;
    const currentLookAhead = cameraFollow.lookAhead + cameraFollow.smoothSpeedRatio * cameraFollow.maxLookAheadExtend;

    const forwardX = -Math.sin(cameraFollow.smoothHeading);
    const forwardZ = -Math.cos(cameraFollow.smoothHeading);

    // Direct world positioning relative to car maintains solid lock with smooth dynamic framing
    const camX = carState.position.x - forwardX * currentDist;
    const camY = carState.position.y + currentHeight;
    const camZ = carState.position.z - forwardZ * currentDist;

    const lookX = carState.position.x + forwardX * currentLookAhead;
    const lookY = carState.position.y + cameraFollow.lookHeight;
    const lookZ = carState.position.z + forwardZ * currentLookAhead;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);

    // Smooth dynamic speed FOV expansion (widens peripheral vision from 54° to 66° smoothly as speed builds)
    const targetFov = cameraFollow.baseFov + cameraFollow.smoothSpeedRatio * cameraFollow.maxFovExtend;
    if (Math.abs(camera.fov - targetFov) > 0.04) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }
}

// -------------------------------------------------------------
// HUD Updates
// -------------------------------------------------------------
// -------------------------------------------------------------
// High-Performance Cached HUD Updates
// -------------------------------------------------------------
let lastHUDPState = {
  kmh: -1,
  rpm: -1,
  speedDeg: -999,
  tachoDeg: -999,
  gearBadgeKey: '',
  gearHeaderKey: '',
};

function updateHUD() {
  updateCockpitDisplays();

  const kmh = Math.round(Math.abs(carState.speed) * 3.6);
  if (kmh !== lastHUDPState.kmh) {
    lastHUDPState.kmh = kmh;
    if (speedValEl) speedValEl.textContent = kmh.toString();

    // Speedometer Analog Needle & Arc Sweep (0 - 200 km/h, sweep -135 to +135 deg)
    const speedFraction = Math.max(0, Math.min(1.0, kmh / 200));
    if (speedoArcEl) {
      const dashOffset = 212.06 * (1.0 - speedFraction);
      speedoArcEl.style.strokeDashoffset = `${dashOffset}`;
    }
    const speedDeg = Math.round(-135 + (speedFraction * 270));
    if (speedDeg !== lastHUDPState.speedDeg && speedoNeedleEl) {
      lastHUDPState.speedDeg = speedDeg;
      speedoNeedleEl.style.transform = `rotate(${speedDeg}deg)`;
      speedoNeedleEl.setAttribute('transform', `rotate(${speedDeg} 60 60)`);
    }
  }

  // RPM Tachometer Analog Needle & Arc Sweep (0 - 8000 RPM, sweep -135 to +135 deg)
  const currentRpm = Math.round(carState.rpm);
  if (currentRpm !== lastHUDPState.rpm) {
    lastHUDPState.rpm = currentRpm;
    if (rpmValEl) rpmValEl.textContent = currentRpm.toLocaleString();

    const rpmFraction = Math.max(0, Math.min(1.0, currentRpm / 8000));
    if (tachoArcEl) {
      const dashOffset = 212.06 * (1.0 - rpmFraction);
      tachoArcEl.style.strokeDashoffset = `${dashOffset}`;
    }
    const tachoDeg = Math.round(-135 + (rpmFraction * 270));
    if (tachoDeg !== lastHUDPState.tachoDeg && tachoNeedleEl) {
      lastHUDPState.tachoDeg = tachoDeg;
      tachoNeedleEl.style.transform = `rotate(${tachoDeg}deg)`;
      tachoNeedleEl.setAttribute('transform', `rotate(${tachoDeg} 60 60)`);
    }
  }

  // Active Gear Cluster Badge
  if (gearNumberEl && gearBadgeEl && shiftStatusEl) {
    let badgeKey = '';
    if (carState.engineStarting) badgeKey = 'STARTING';
    else if (!carState.engineRunning) badgeKey = 'OFF';
    else if (keys.clutch) badgeKey = keys.forward ? 'CLUTCH_REV' : 'CLUTCH_IDLE';
    else if (carState.isLaunchControl) badgeKey = 'LC_HOLD';
    else if (carState.isLaunching) badgeKey = 'LC_ACTIVE';
    else if (carState.speed < -0.2) badgeKey = 'R';
    else if (kmh < 0.8 && !keys.forward) badgeKey = 'P';
    else if (carState.isShifting && carState.shiftType === 'up') badgeKey = `SHIFT_${carState.currentGear}`;
    else badgeKey = `D_${carState.currentGear}`;

    if (badgeKey !== lastHUDPState.gearBadgeKey) {
      lastHUDPState.gearBadgeKey = badgeKey;
      if (carState.engineStarting) {
        gearNumberEl.textContent = 'ST';
        gearNumberEl.className = 'text-2xl font-mono font-black text-amber-300 animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'STARTING...';
        shiftStatusEl.className = 'text-[9px] font-mono text-amber-300 mt-1 uppercase tracking-wider font-bold animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/50 flex items-center justify-center mt-1 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-150';
      } else if (!carState.engineRunning) {
        gearNumberEl.textContent = 'OFF';
        gearNumberEl.className = 'text-lg font-mono font-black text-rose-500 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'ENGINE OFF';
        shiftStatusEl.className = 'text-[9px] font-mono text-rose-400 mt-1 uppercase tracking-wider font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-rose-950/40 backdrop-blur-sm border border-rose-600/40 flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(225,29,72,0.4)] transition-all duration-150';
      } else if (keys.clutch) {
        gearNumberEl.textContent = 'CL';
        gearNumberEl.className = 'text-2xl font-mono font-black text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = keys.forward ? 'FREE REV' : 'CLUTCH IN';
        shiftStatusEl.className = 'text-[8px] font-mono text-amber-300 mt-1 uppercase tracking-wider font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] text-center';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/50 flex items-center justify-center mt-1 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-150';
      } else if (carState.isLaunchControl) {
        gearNumberEl.textContent = 'LC';
        gearNumberEl.className = 'text-2xl font-mono font-black text-amber-400 animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'LAUNCH CONTROL';
        shiftStatusEl.className = 'text-[7px] font-mono text-amber-300 mt-1 uppercase tracking-tight font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none text-center whitespace-nowrap';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-amber-500/25 backdrop-blur-sm border border-amber-400/60 flex items-center justify-center mt-1 shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all duration-150';
      } else if (carState.isLaunching) {
        gearNumberEl.textContent = 'LC';
        gearNumberEl.className = 'text-2xl font-mono font-black text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'LAUNCH CONTROL';
        shiftStatusEl.className = 'text-[7px] font-mono text-cyan-300 mt-1 uppercase tracking-tight font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none text-center whitespace-nowrap';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-cyan-500/30 backdrop-blur-sm border border-cyan-400/80 flex items-center justify-center mt-1 shadow-[0_0_18px_rgba(6,182,212,0.8)] transition-all duration-150';
      } else if (carState.speed < -0.2) {
        gearNumberEl.textContent = 'R';
        gearNumberEl.className = 'text-2xl font-mono font-black text-rose-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'REVERSE';
        shiftStatusEl.className = 'text-[9px] font-mono text-rose-400 mt-1 uppercase tracking-wider font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-rose-500/15 backdrop-blur-sm border border-rose-500/40 flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(244,63,94,0.3)] transition-all duration-150';
      } else if (kmh < 0.8 && !keys.forward) {
        gearNumberEl.textContent = 'P';
        gearNumberEl.className = 'text-2xl font-mono font-black text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'PARK';
        shiftStatusEl.className = 'text-[9px] font-mono text-slate-300 mt-1 uppercase tracking-wider font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-white/20 flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all duration-150';
      } else if (carState.isShifting && carState.shiftType === 'up') {
        gearNumberEl.textContent = carState.currentGear.toString();
        gearNumberEl.className = 'text-2xl font-mono font-black text-amber-300 animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = 'SHIFTING';
        shiftStatusEl.className = 'text-[9px] font-mono text-amber-400 mt-1 uppercase tracking-wider font-bold animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/50 scale-105 flex items-center justify-center mt-1 transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
      } else {
        gearNumberEl.textContent = carState.currentGear.toString();
        gearNumberEl.className = 'text-2xl font-mono font-black text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
        shiftStatusEl.textContent = `AUTO D${carState.currentGear}`;
        shiftStatusEl.className = 'text-[9px] font-mono text-cyan-300 mt-1 uppercase tracking-wider font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';
        gearBadgeEl.className = 'w-11 h-11 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-white/20 flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all duration-150';
      }
    }
  }
}

// -------------------------------------------------------------
// Resize Handler
// -------------------------------------------------------------
function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// -------------------------------------------------------------
// Main Render Loop
// -------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.045);

  updateCarPhysics(dt);
  updateOverrunPops(dt);
  updateCamera(dt);
  updateRoadChunks();
  updateGarageLighting(dt);
  updateRoadSpray(dt);
  updateTireSmoke(dt);
  updateExhaustFlames(dt);
  updateEngineAudio(dt);
  updateHUD();

  renderer.render(scene, camera);
}

// Start immediately
initScene();
animate();
