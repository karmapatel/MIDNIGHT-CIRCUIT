import * as THREE from 'three';

// =============================================================
// MIDNIGHT CIRCUIT - DARKLINES :: Compact Nighttime Open World
// Connected seamlessly to the existing garage exit at (0, 0, -24)
// =============================================================

const WORLD_MIN_X = -255;
const WORLD_MAX_X = 255;
const WORLD_MIN_Z = -375;
const WORLD_MAX_Z = 48;

// -------------------------------------------------------------
// Procedural Nighttime Textures (100% self-contained)
// -------------------------------------------------------------
function createWorldTextures(maxAnisotropy = 8) {
  // 1. Wet Asphalt Road Texture (2-lane & 4-lane variants)
  function makeRoadAlbedo(lanes = 2, centerDoubleYellow = true) {
    const w = 512;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#12161e';
    ctx.fillRect(0, 0, w, h);

    // Subtle asphalt grain
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = ((Math.random() - 0.5) * 16) | 0;
      data[i] = Math.max(8, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(10, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(14, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Darker worn tire tracks
    const trackCenters = lanes === 4
      ? [w * 0.14, w * 0.36, w * 0.64, w * 0.86]
      : [w * 0.26, w * 0.74];
    trackCenters.forEach((tx) => {
      const g = ctx.createLinearGradient(tx - 38, 0, tx + 38, 0);
      g.addColorStop(0, 'rgba(6, 9, 14, 0)');
      g.addColorStop(0.5, 'rgba(5, 7, 12, 0.42)');
      g.addColorStop(1, 'rgba(6, 9, 14, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(tx - 38, 0, 76, h);
    });

    // Edge solid white lines
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(w * 0.04, 0, 7, h);
    ctx.fillRect(w * 0.96 - 7, 0, 7, h);

    // Dashed lane dividers for 4-lane roads
    if (lanes === 4) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
      for (let y = 18; y < h; y += 128) {
        ctx.fillRect(w * 0.265 - 3, y, 6, 58);
        ctx.fillRect(w * 0.735 - 3, y, 6, 58);
      }
    }

    // Center lines
    if (centerDoubleYellow) {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(w * 0.5 - 8, 0, 5, h);
      ctx.fillRect(w * 0.5 + 3, 0, 5, h);
    } else {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.88)';
      for (let y = 20; y < h; y += 128) {
        ctx.fillRect(w * 0.5 - 3, y, 6, 62);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // 2. Shared Asphalt Normal & Roughness maps
  const normCanvas = document.createElement('canvas');
  normCanvas.width = 256;
  normCanvas.height = 256;
  const nCtx = normCanvas.getContext('2d');
  const nImg = nCtx.createImageData(256, 256);
  const nd = nImg.data;
  for (let i = 0; i < nd.length; i += 4) {
    const nx = (Math.random() - 0.5) * 0.42;
    const ny = (Math.random() - 0.5) * 0.42;
    const len = Math.sqrt(nx * nx + ny * ny + 1.0);
    nd[i] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
    nd[i + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
    nd[i + 2] = Math.floor(((1.0 / len) * 0.5 + 0.5) * 255);
    nd[i + 3] = 255;
  }
  nCtx.putImageData(nImg, 0, 0);
  const roadNormal = new THREE.CanvasTexture(normCanvas);
  roadNormal.wrapS = THREE.RepeatWrapping;
  roadNormal.wrapT = THREE.RepeatWrapping;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#bcbcbc';
  rCtx.fillRect(0, 0, 256, 256);
  // Subtle damp specular streaks
  for (let i = 0; i < 40; i++) {
    const px = Math.random() * 256;
    const py = Math.random() * 256;
    const rad = 16 + Math.random() * 34;
    const grad = rCtx.createRadialGradient(px, py, 2, px, py, rad);
    grad.addColorStop(0, 'rgba(38, 38, 38, 0.72)');
    grad.addColorStop(1, 'rgba(188, 188, 188, 0)');
    rCtx.fillStyle = grad;
    rCtx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  const roadRoughness = new THREE.CanvasTexture(roughCanvas);
  roadRoughness.wrapS = THREE.RepeatWrapping;
  roadRoughness.wrapT = THREE.RepeatWrapping;

  // 3. Intersection Asphalt Texture (crosswalks + stop bars)
  function makeIntersectionAlbedo(sides = { n: true, s: true, e: true, w: true }) {
    const s = 512;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#12161e';
    ctx.fillRect(0, 0, s, s);

    // Subtle aggregate grain
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = ((Math.random() - 0.5) * 14) | 0;
      img.data[i] = Math.max(8, Math.min(255, img.data[i] + n));
      img.data[i + 1] = Math.max(10, Math.min(255, img.data[i + 1] + n));
      img.data[i + 2] = Math.max(14, Math.min(255, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // Subtle center wear
    const wear = ctx.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s * 0.45);
    wear.addColorStop(0, 'rgba(6, 9, 15, 0.35)');
    wear.addColorStop(1, 'rgba(6, 9, 15, 0)');
    ctx.fillStyle = wear;
    ctx.fillRect(0, 0, s, s);

    // Zebra crosswalk stripes on active sides
    ctx.fillStyle = 'rgba(203, 213, 225, 0.72)';
    const stripeCount = 9;
    const margin = 52;
    const span = s - margin * 2;
    const step = span / stripeCount;

    if (sides.n) {
      for (let i = 0; i < stripeCount; i++) {
        ctx.fillRect(margin + i * step + 5, 14, step * 0.52, 42);
      }
      ctx.fillRect(30, 64, s * 0.45, 7);
    }
    if (sides.s) {
      for (let i = 0; i < stripeCount; i++) {
        ctx.fillRect(margin + i * step + 5, s - 56, step * 0.52, 42);
      }
      ctx.fillRect(s * 0.55 - 30, s - 71, s * 0.45, 7);
    }
    if (sides.w) {
      for (let i = 0; i < stripeCount; i++) {
        ctx.fillRect(14, margin + i * step + 5, 42, step * 0.52);
      }
      ctx.fillRect(64, s * 0.55 - 30, 7, s * 0.45);
    }
    if (sides.e) {
      for (let i = 0; i < stripeCount; i++) {
        ctx.fillRect(s - 56, margin + i * step + 5, 42, step * 0.52);
      }
      ctx.fillRect(s - 71, 30, 7, s * 0.45);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // 4. Open Plaza / Industrial Concrete Pavement Texture
  function makePlazaAlbedo(isIndustrial = false) {
    const s = 512;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isIndustrial ? '#151921' : '#131822';
    ctx.fillRect(0, 0, s, s);

    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = ((Math.random() - 0.5) * 14) | 0;
      img.data[i] = Math.max(8, Math.min(255, img.data[i] + n));
      img.data[i + 1] = Math.max(10, Math.min(255, img.data[i + 1] + n));
      img.data[i + 2] = Math.max(14, Math.min(255, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // Concrete slab expansion seams
    ctx.strokeStyle = 'rgba(5, 8, 14, 0.55)';
    ctx.lineWidth = 3;
    for (let p = 0; p <= s; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(s, p);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // 5. Nighttime Skyscraper / Urban Facade Textures (3 realistic dark palettes)
  function makeBuildingFacade(variant = 0) {
    const w = 512;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const baseColors = ['#0c111b', '#10141d', '#0b0e16'];
    ctx.fillStyle = baseColors[variant % 3];
    ctx.fillRect(0, 0, w, h);

    // Subtle structural concrete mullions
    ctx.fillStyle = '#151c29';
    const cols = variant === 0 ? 8 : (variant === 1 ? 6 : 10);
    const rows = variant === 0 ? 22 : (variant === 1 ? 18 : 26);
    const cellW = w / cols;
    const cellH = h / rows;

    // Emissive window map canvas
    const emCanvas = document.createElement('canvas');
    emCanvas.width = w;
    emCanvas.height = h;
    const emCtx = emCanvas.getContext('2d');
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, w, h);

    const litPalettes = [
      ['#bae6fd', '#7dd3fc', '#fde68a', '#e2e8f0'], // Cool glass tower
      ['#fcd34d', '#fdba74', '#cbd5e1', '#93c5fd'], // Warm midtown office
      ['#67e8f9', '#fda4af', '#f8fafc', '#fde047'], // Cyber/midnight accent
    ];
    const palette = litPalettes[variant % 3];

    // Deterministic-feeling random per building texture
    let seed = (variant + 1) * 9301 + 49297;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let r = 0; r < rows; r++) {
      // Floor slab band
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, r * cellH, w, cellH * 0.24);

      const floorActivity = rand();
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + cellW * 0.14;
        const wy = r * cellH + cellH * 0.28;
        const ww = cellW * 0.72;
        const wh = cellH * 0.62;

        // Dark reflective window glass base
        ctx.fillStyle = '#111a2b';
        ctx.fillRect(wx, wy, ww, wh);

        // Ground floor (bottom 2 rows) darker storefront
        if (r >= rows - 2) {
          if (rand() < 0.45) {
            const col = variant === 2 ? '#0891b2' : '#d97706';
            ctx.fillStyle = col;
            ctx.fillRect(wx, wy, ww, wh);
            emCtx.fillStyle = col;
            emCtx.fillRect(wx, wy, ww, wh);
          }
          continue;
        }

        // Sparse realistic late-night lit windows (~18-28%)
        const threshold = floorActivity > 0.72 ? 0.52 : 0.16;
        if (rand() < threshold) {
          const litColor = palette[Math.floor(rand() * palette.length)];
          const alpha = 0.45 + rand() * 0.55;
          ctx.fillStyle = litColor;
          ctx.globalAlpha = alpha;
          ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          ctx.globalAlpha = 1.0;

          emCtx.fillStyle = litColor;
          emCtx.globalAlpha = alpha * 0.85;
          emCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
          emCtx.globalAlpha = 1.0;
        }
      }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = maxAnisotropy;

    const emissiveMap = new THREE.CanvasTexture(emCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;

    return { map, emissiveMap };
  }

  // 6. Corrugated Industrial Warehouse Facade
  function makeWarehouseTexture() {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141923';
    ctx.fillRect(0, 0, w, h);

    // Corrugated vertical ribs
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? '#1b2230' : '#0f141d';
      ctx.fillRect(x, 0, 4, h);
    }

    // Concrete dado lower wall
    ctx.fillStyle = '#1e2533';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Industrial hazard stripe
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, h * 0.70, w, 6);

    // Clerestory high factory windows
    ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
    for (let x = 24; x < w - 24; x += 64) {
      ctx.fillRect(x, 26, 40, 18);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // 7. Radial Streetlight Ground Pool Decal Texture
  function makeLightPoolTexture() {
    const s = 256;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.70)');
    g.addColorStop(0.28, 'rgba(255, 255, 255, 0.34)');
    g.addColorStop(0.65, 'rgba(255, 255, 255, 0.08)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // 8. Neon Sign Texture Helper
  function makeNeonSignTexture(text, subtext, accentHex = '#06b6d4', bgHex = '#070b14') {
    const w = 512;
    const h = 160;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);

    // Outer neon border
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 18;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Main title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, subtext ? h * 0.44 : h * 0.52);

    if (subtext) {
      ctx.fillStyle = accentHex;
      ctx.font = '700 22px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(subtext, w / 2, h * 0.76);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // 9. Turn Chevron Warning Sign Texture
  function makeChevronTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 22;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(36, 22);
    ctx.lineTo(86, 64);
    ctx.lineTo(36, 106);
    ctx.stroke();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 120, 120);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  return {
    road2Lane: makeRoadAlbedo(2, true),
    road4Lane: makeRoadAlbedo(4, true),
    roadCurve: makeRoadAlbedo(2, false),
    roadNormal,
    roadRoughness,
    inter4Way: makeIntersectionAlbedo({ n: true, s: true, e: true, w: true }),
    interTN: makeIntersectionAlbedo({ n: false, s: true, e: true, w: true }),
    interTS: makeIntersectionAlbedo({ n: true, s: false, e: true, w: true }),
    interTE: makeIntersectionAlbedo({ n: true, s: true, e: false, w: true }),
    interTW: makeIntersectionAlbedo({ n: true, s: true, e: true, w: false }),
    plazaAlbedo: makePlazaAlbedo(false),
    industrialAlbedo: makePlazaAlbedo(true),
    facades: [makeBuildingFacade(0), makeBuildingFacade(1), makeBuildingFacade(2)],
    warehouse: makeWarehouseTexture(),
    lightPool: makeLightPoolTexture(),
    chevron: makeChevronTexture(),
    makeNeonSignTexture,
  };
}

// -------------------------------------------------------------
// Smooth Ribbon Geometry Builder along any 3D CurvePath
// Generates exact flat road mesh with arc-length UVs + edge paths
// -------------------------------------------------------------
function buildCurvedRoadRibbon(curve, segments, widthStart, widthEnd, yOffset = 0.003) {
  const pts = curve.getSpacedPoints(segments);
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const normals = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = new Uint16Array(segments * 6);

  const leftEdge = [];
  const rightEdge = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const right = new THREE.Vector3();

  let accumDist = 0;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = pts[i];
    if (i > 0) accumDist += p.distanceTo(pts[i - 1]);

    // Smooth finite-difference tangent (robust across CurvePath seams)
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(segments, i + 1)];
    tangent.subVectors(pNext, pPrev).normalize();
    right.crossVectors(tangent, up).normalize();

    const halfW = THREE.MathUtils.lerp(widthStart, widthEnd, t) * 0.5;

    const lx = p.x - right.x * halfW;
    const lz = p.z - right.z * halfW;
    const rx = p.x + right.x * halfW;
    const rz = p.z + right.z * halfW;

    leftEdge.push({ x: lx, z: lz, nx: -right.x, nz: -right.z, tx: tangent.x, tz: tangent.z, dist: accumDist });
    rightEdge.push({ x: rx, z: rz, nx: right.x, nz: right.z, tx: tangent.x, tz: tangent.z, dist: accumDist });

    const vi = i * 2;
    positions[vi * 3] = lx;
    positions[vi * 3 + 1] = yOffset;
    positions[vi * 3 + 2] = lz;

    positions[(vi + 1) * 3] = rx;
    positions[(vi + 1) * 3 + 1] = yOffset;
    positions[(vi + 1) * 3 + 2] = rz;

    normals[vi * 3] = 0;
    normals[vi * 3 + 1] = 1;
    normals[vi * 3 + 2] = 0;
    normals[(vi + 1) * 3] = 0;
    normals[(vi + 1) * 3 + 1] = 1;
    normals[(vi + 1) * 3 + 2] = 0;

    const vCoord = accumDist / 16.0;
    uvs[vi * 2] = 0;
    uvs[vi * 2 + 1] = vCoord;
    uvs[(vi + 1) * 2] = 1;
    uvs[(vi + 1) * 2 + 1] = vCoord;

    if (i < segments) {
      const ii = i * 6;
      indices[ii] = vi;
      indices[ii + 1] = vi + 1;
      indices[ii + 2] = vi + 2;
      indices[ii + 3] = vi + 1;
      indices[ii + 4] = vi + 3;
      indices[ii + 5] = vi + 2;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();

  return { geo, leftEdge, rightEdge, length: accumDist, pts };
}

// -------------------------------------------------------------
// Main Open-World Builder
// -------------------------------------------------------------
export function buildOpenWorld(scene, renderer) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'DarklinesOpenWorld';
  scene.add(worldGroup);

  const maxAniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  const tex = createWorldTextures(maxAniso);

  // Collision primitives used by resolveWorldCollisions()
  const aabbColliders = [];
  const circleColliders = [];
  const segmentColliders = [];

  const addAABB = (minX, maxX, minZ, maxZ, tag = 'wall') => {
    aabbColliders.push({ minX, maxX, minZ, maxZ, tag });
  };
  const addBoxCollider = (cx, cz, w, d, tag = 'building') => {
    addAABB(cx - w * 0.5, cx + w * 0.5, cz - d * 0.5, cz + d * 0.5, tag);
  };
  const addCircleCollider = (x, z, r, tag = 'pillar') => {
    circleColliders.push({ x, z, r, tag });
  };
  const addSegmentCollider = (ax, az, bx, bz, r = 0.45, tag = 'barrier') => {
    segmentColliders.push({ ax, az, bx, bz, r, tag });
  };

  // Shared Architectural & Road Materials
  const roadMatCache = new Map();
  function getRoadMaterial(baseTex, repeatV) {
    const key = `${baseTex.uuid}_${repeatV.toFixed(2)}`;
    if (roadMatCache.has(key)) return roadMatCache.get(key);
    const map = baseTex.clone();
    map.needsUpdate = true;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, repeatV);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = maxAniso;

    const norm = tex.roadNormal.clone();
    norm.needsUpdate = true;
    norm.wrapS = THREE.RepeatWrapping;
    norm.wrapT = THREE.RepeatWrapping;
    norm.repeat.set(4, Math.max(1, repeatV * 4));

    const rough = tex.roadRoughness.clone();
    rough.needsUpdate = true;
    rough.wrapS = THREE.RepeatWrapping;
    rough.wrapT = THREE.RepeatWrapping;
    rough.repeat.set(2, Math.max(1, repeatV * 2));

    const mat = new THREE.MeshStandardMaterial({
      map,
      normalMap: norm,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: rough,
      roughness: 0.58,
      metalness: 0.18,
    });
    roadMatCache.set(key, mat);
    return mat;
  }

  const curveRoadMat = new THREE.MeshStandardMaterial({
    map: tex.roadCurve,
    normalMap: tex.roadNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: tex.roadRoughness,
    roughness: 0.58,
    metalness: 0.18,
  });

  const makeInterMat = (interTex) => new THREE.MeshStandardMaterial({
    map: interTex,
    normalMap: tex.roadNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: tex.roadRoughness,
    roughness: 0.62,
    metalness: 0.16,
  });

  const interMats = {
    4: makeInterMat(tex.inter4Way),
    tn: makeInterMat(tex.interTN),
    ts: makeInterMat(tex.interTS),
    te: makeInterMat(tex.interTE),
    tw: makeInterMat(tex.interTW),
  };

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x1c2330,
    roughness: 0.88,
    metalness: 0.08,
  });

  const concreteDarkMat = new THREE.MeshStandardMaterial({
    color: 0x121722,
    roughness: 0.86,
    metalness: 0.12,
  });

  const guardrailMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.3,
  });

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x263142,
    metalness: 0.78,
    roughness: 0.38,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    roughness: 0.9,
    metalness: 0.15,
  });

  const buildingMaterials = tex.facades.map((f) => new THREE.MeshStandardMaterial({
    map: f.map,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: f.emissiveMap,
    emissiveIntensity: 0.95,
    roughness: 0.42,
    metalness: 0.45,
  }));

  const warehouseMat = new THREE.MeshStandardMaterial({
    map: tex.warehouse,
    roughness: 0.72,
    metalness: 0.42,
  });

  // -----------------------------------------------------------
  // 1. CONTINUOUS DARK BASE GROUND (extends deep into night fog)
  // -----------------------------------------------------------
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshStandardMaterial({ color: 0x060910, roughness: 0.96, metalness: 0.04 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(0, -0.06, -150);
  baseGround.receiveShadow = true;
  worldGroup.add(baseGround);

  // -----------------------------------------------------------
  // 2. GARAGE EXTERIOR ARCHITECTURAL SHELL & COLLIDERS
  // Strictly OUTSIDE existing garage bounds (X: ±18, Z: -24..+24, Y: 0..6)
  // Interior of buildGarage() is 100% UNTOUCHED!
  // -----------------------------------------------------------
  // Exact Garage Interior + Exterior Wall Colliders (leave X: [-4.9, +4.9] open at Z = -24)
  addAABB(-18.6, -17.4, -24.4, 24.4, 'garage_wall'); // Left wall
  addAABB(17.4, 18.6, -24.4, 24.4, 'garage_wall');   // Right wall
  addAABB(-18.6, 18.6, 23.5, 24.6, 'garage_wall');   // Back wall
  addAABB(-18.6, -5.0, -24.4, -23.5, 'garage_wall'); // Front-left wall
  addAABB(5.0, 18.6, -24.4, -23.5, 'garage_wall');   // Front-right wall
  // Existing 4 interior garage pillars
  addCircleCollider(-12, 0, 0.92, 'garage_pillar');
  addCircleCollider(12, 0, 0.92, 'garage_pillar');
  addCircleCollider(-12, 12, 0.92, 'garage_pillar');
  addCircleCollider(12, 12, 0.92, 'garage_pillar');

  // Exterior shell wrapping outside the garage box so looking back from outside looks iconic
  const garageShellGroup = new THREE.Group();
  const extWallMat = new THREE.MeshStandardMaterial({
    color: 0x101622,
    roughness: 0.72,
    metalness: 0.35,
  });
  const extTrimCyan = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const extTrimRed = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

  // Outer roof cap (strictly above Y = 6.08)
  const extRoof = new THREE.Mesh(new THREE.BoxGeometry(37.4, 0.5, 49.4), roofMat);
  extRoof.position.set(0, 6.35, 0);
  garageShellGroup.add(extRoof);

  // Outer side & back cladding (outside ±18.35, +24.35)
  const extSideGeo = new THREE.BoxGeometry(0.45, 6.6, 49.0);
  const extSideL = new THREE.Mesh(extSideGeo, extWallMat);
  extSideL.position.set(-18.45, 3.3, 0);
  garageShellGroup.add(extSideL);
  const extSideR = new THREE.Mesh(extSideGeo, extWallMat);
  extSideR.position.set(18.45, 3.3, 0);
  garageShellGroup.add(extSideR);

  const extBack = new THREE.Mesh(new THREE.BoxGeometry(37.4, 6.6, 0.45), extWallMat);
  extBack.position.set(0, 3.3, 24.45);
  garageShellGroup.add(extBack);

  // Exterior front fascia flanks (outside Z = -24.35, never blocking X: [-5, +5])
  const extFrontFlankGeo = new THREE.BoxGeometry(13.5, 6.6, 0.35);
  const extFrontL = new THREE.Mesh(extFrontFlankGeo, extWallMat);
  extFrontL.position.set(-11.8, 3.3, -24.38);
  garageShellGroup.add(extFrontL);
  const extFrontR = new THREE.Mesh(extFrontFlankGeo, extWallMat);
  extFrontR.position.set(11.8, 3.3, -24.38);
  garageShellGroup.add(extFrontR);

  // Exterior architectural canopy header above exit door
  const extHeader = new THREE.Mesh(new THREE.BoxGeometry(37.4, 2.2, 1.4), extWallMat);
  extHeader.position.set(0, 5.55, -24.85);
  garageShellGroup.add(extHeader);

  // Subtle cyan & crimson architectural neon edge lines on garage exterior
  const extLineTop = new THREE.Mesh(new THREE.BoxGeometry(37.5, 0.12, 0.14), extTrimCyan);
  extLineTop.position.set(0, 6.55, -25.52);
  garageShellGroup.add(extLineTop);

  const extLineGateL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.3, 0.14), extTrimRed);
  extLineGateL.position.set(-5.15, 2.15, -24.55);
  garageShellGroup.add(extLineGateL);
  const extLineGateR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.3, 0.14), extTrimRed);
  extLineGateR.position.set(5.15, 2.15, -24.55);
  garageShellGroup.add(extLineGateR);

  // Exterior illuminated sign above garage exit (visible when returning from the city!)
  const garageSignTex = tex.makeNeonSignTexture('DARKLINES', 'MIDNIGHT GARAGE // BAY 01', '#06b6d4', '#060a12');
  const garageSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 2.0),
    new THREE.MeshBasicMaterial({ map: garageSignTex })
  );
  garageSignMesh.position.set(0, 5.55, -25.58);
  garageSignMesh.rotation.y = Math.PI; // Faces -Z (outward toward city)
  garageShellGroup.add(garageSignMesh);

  worldGroup.add(garageShellGroup);

  // -----------------------------------------------------------
  // 3. CONNECTED ROAD NETWORK (ZERO OVERLAP, ZERO GAPS)
  // -----------------------------------------------------------
  const streetLightsData = []; // { x, y, z, color, dirX, dirZ, addPole }
  const guardrailMeshes = [];
  const chevronData = [];
  const treePositions = [];
  const bollardPositions = [];
  const trafficLightPositions = [];

  // Vector road & landmark metadata exported for the circular mini-map HUD
  const mapData = {
    straightRoads: [],
    intersections: [],
    curvedRoads: [],
    plazas: [
      { x1: -196, z1: -144, x2: -87, z2: -26, kind: 'plaza' },
      { x1: 87, z1: -173, x2: 211, z2: -102, kind: 'industrial' },
    ],
    islands: [
      { x: -141.5, z: -85.0, r: 6.2 },
    ],
    garage: { x1: -18, z1: -24, x2: 18, z2: 24, exitX: 0, exitZ: -24 },
    buildings: aabbColliders,
  };

  function addStraightRoad(x1, z1, x2, z2, width, lanes = 2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.1) return;

    mapData.straightRoads.push({ x1, z1, x2, z2, width, lanes });

    const repeatV = Math.max(1, length / 18);
    const mat = getRoadMaterial(lanes === 4 ? tex.road4Lane : tex.road2Lane, repeatV);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
    mesh.rotation.x = -Math.PI / 2;
    const angle = Math.atan2(dx, dz);
    mesh.rotation.z = angle;
    mesh.position.set((x1 + x2) * 0.5, 0.002, (z1 + z2) * 0.5);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function addIntersection(cx, cz, widthX, widthZ, type = '4') {
    mapData.intersections.push({ cx, cz, widthX, widthZ, type });

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(widthX, widthZ),
      interMats[type] || interMats[4]
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, 0.002, cz);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function addStreetLightRow(x1, z1, x2, z2, offset, spacing = 36, side = 1, color = 0xfef08a) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 12) return;
    const ux = dx / len;
    const uz = dz / len;
    // Right-hand normal
    const nx = -uz * side;
    const nz = ux * side;
    const count = Math.max(1, Math.floor(len / spacing));
    for (let i = 0; i < count; i++) {
      const dist = ((i + 0.5) / count) * len;
      const px = x1 + ux * dist + nx * offset;
      const pz = z1 + uz * dist + nz * offset;
      streetLightsData.push({
        x: px,
        z: pz,
        inwardX: -nx,
        inwardZ: -nz,
        color,
      });
    }
  }

  // ---- A. MAIN AVENUE (X = 0, width 16m, connects flush to Garage Floor at Z = -26!) ----
  addStraightRoad(0, -26, 0, -48, 16, 2);     // Garage apron exit stretch
  addIntersection(0, -56, 16, 16, 'tw');      // Corner Section junction (East side open)
  addStraightRoad(0, -64, 0, -82, 16, 2);
  addIntersection(0, -90, 16, 16, '4');       // Midtown South & Drift Plaza junction
  addStraightRoad(0, -98, 0, -173, 16, 2);
  addIntersection(0, -180, 16, 14, '4');      // Midtown Cross St
  addStraightRoad(0, -187, 0, -252, 16, 2);
  addIntersection(0, -260, 16, 16, '4');      // Downtown North Ave
  addStraightRoad(0, -268, 0, -330, 16, 2);
  addIntersection(0, -340, 16, 20, 'tn');     // High-Speed Expressway T-junction

  // Main Ave lights
  addStreetLightRow(0, -30, 0, -80, 9.2, 32, 1, 0x7dd3fc);
  addStreetLightRow(0, -30, 0, -80, 9.2, 32, -1, 0x7dd3fc);
  addStreetLightRow(0, -104, 0, -170, 9.2, 34, 1, 0xfef08a);
  addStreetLightRow(0, -104, 0, -170, 9.2, 34, -1, 0xfef08a);
  addStreetLightRow(0, -194, 0, -248, 9.2, 30, 1, 0x93c5fd);
  addStreetLightRow(0, -194, 0, -248, 9.2, 30, -1, 0x93c5fd);
  addStreetLightRow(0, -274, 0, -326, 9.2, 30, 1, 0xfef08a);
  addStreetLightRow(0, -274, 0, -326, 9.2, 30, -1, 0xfef08a);

  // ---- B. CITY DISTRICT STREETS (Narrower 14m N-S & E-W Grid) ----
  // West Downtown Street (X = -80, width 14m, Z = -90 to -260)
  addIntersection(-80, -90, 14, 16, 'ts');
  addStraightRoad(-80, -98, -80, -173, 14, 2);
  addIntersection(-80, -180, 14, 14, '4');
  addStraightRoad(-80, -187, -80, -252, 14, 2);
  addIntersection(-80, -260, 14, 16, 'tn');
  addStreetLightRow(-80, -104, -80, -168, 8.2, 34, 1, 0xfef08a);
  addStreetLightRow(-80, -194, -80, -248, 8.2, 34, -1, 0x93c5fd);

  // East Downtown Street (X = +80, width 14m, Z = -90 to -260)
  addIntersection(80, -90, 14, 16, 'ts');
  addStraightRoad(80, -98, 80, -173, 14, 2);
  addIntersection(80, -180, 14, 14, '4');
  addStraightRoad(80, -187, 80, -252, 14, 2);
  addIntersection(80, -260, 14, 16, 'tn');
  addStreetLightRow(80, -104, 80, -168, 8.2, 34, -1, 0xfef08a);
  addStreetLightRow(80, -194, 80, -248, 8.2, 34, 1, 0x93c5fd);

  // South Midtown Avenue (Z = -90, width 16m: from Drift Plaza East Gate X=-68 to East Downtown X=+80)
  addStraightRoad(-73, -90, -8, -90, 16, 2);
  addStraightRoad(8, -90, 73, -90, 16, 2);
  addStreetLightRow(-65, -90, -14, -90, 9.2, 32, -1, 0xfef08a);
  addStreetLightRow(14, -90, 68, -90, 9.2, 32, -1, 0xfef08a);

  // Midtown Cross Street (Z = -180, width 14m: West Ring -220 to Industrial Blvd +220)
  addIntersection(-220, -180, 18, 14, 'tw');
  addStraightRoad(-211, -180, -87, -180, 14, 2);
  addStraightRoad(-73, -180, -8, -180, 14, 2);
  addStraightRoad(8, -180, 73, -180, 14, 2);
  addStraightRoad(87, -180, 211, -180, 14, 2);
  addIntersection(220, -180, 18, 14, 'te');
  addStreetLightRow(-204, -180, -94, -180, 8.2, 36, 1, 0x93c5fd);
  addStreetLightRow(-68, -180, -14, -180, 8.2, 32, -1, 0xfef08a);
  addStreetLightRow(14, -180, 68, -180, 8.2, 32, 1, 0xfef08a);
  addStreetLightRow(94, -180, 204, -180, 8.2, 36, -1, 0xfdba74);

  // Downtown North Avenue (Z = -260, width 16m: West Ring -220 to Industrial Blvd +220)
  addIntersection(-220, -260, 18, 16, 'tw');
  addStraightRoad(-211, -260, -87, -260, 16, 2);
  addStraightRoad(-73, -260, -8, -260, 16, 2);
  addStraightRoad(8, -260, 73, -260, 16, 2);
  addStraightRoad(87, -260, 211, -260, 16, 2);
  addIntersection(220, -260, 18, 16, 'te');
  addStreetLightRow(-204, -260, -94, -260, 9.2, 38, -1, 0x7dd3fc);
  addStreetLightRow(-68, -260, -14, -260, 9.2, 32, 1, 0x7dd3fc);
  addStreetLightRow(14, -260, 68, -260, 9.2, 32, -1, 0x7dd3fc);
  addStreetLightRow(94, -260, 204, -260, 9.2, 38, 1, 0xfdba74);

  // ---- C. HIGH-SPEED STRETCH (North Expressway, Z = -340, width 20m, 4 lanes!) ----
  addStraightRoad(-184, -340, -8, -340, 20, 4);
  addStraightRoad(8, -340, 184, -340, 20, 4);
  addStreetLightRow(-176, -340, -16, -340, 11.2, 40, 1, 0xfef08a);
  addStreetLightRow(-176, -340, -16, -340, 11.2, 40, -1, 0xfef08a);
  addStreetLightRow(16, -340, 176, -340, 11.2, 40, 1, 0xfef08a);
  addStreetLightRow(16, -340, 176, -340, 11.2, 40, -1, 0xfef08a);

  // ---- D. WEST RING ROAD (X = -220, width 18m) & INDUSTRIAL BOULEVARD (X = +220, width 18m) ----
  // West Ring Road
  addStraightRoad(-220, -304, -220, -268, 18, 2);
  addStraightRoad(-220, -252, -220, -187, 18, 2);
  addStraightRoad(-220, -173, -220, -118, 18, 2);
  addStreetLightRow(-220, -300, -220, -124, 10.2, 40, 1, 0x93c5fd);

  // Industrial Boulevard (East Side)
  addStraightRoad(220, -304, 220, -268, 18, 2);
  addStraightRoad(220, -252, 220, -187, 18, 2);
  addStraightRoad(220, -173, 220, -100, 18, 2);
  addStreetLightRow(220, -300, 220, -108, 10.2, 38, -1, 0xfdba74);

  // ---- E. CURVED CONNECTORS & TECHNICAL CORNER SECTION ----
  function buildSweeper(curve, segments, wStart, wEnd, options = {}) {
    const {
      guardLeft = true,
      guardRight = true,
      chevronLeft = false,
      chevronRight = false,
      lightSide = 0, // 1 = right, -1 = left, 0 = none
      lightColor = 0xfef08a,
    } = options;

    const ribbon = buildCurvedRoadRibbon(curve, segments, wStart, wEnd, 0.003);
    mapData.curvedRoads.push({
      pts: ribbon.pts.map((p) => ({ x: p.x, z: p.z })),
      width: (wStart + wEnd) * 0.5,
    });
    const roadMesh = new THREE.Mesh(ribbon.geo, curveRoadMat);
    roadMesh.receiveShadow = true;
    worldGroup.add(roadMesh);

    const buildEdgeBarrier = (edge, addCollider, addChevrons) => {
      // Visual guardrail rail segments + collider segments
      const step = 2;
      for (let i = 0; i < edge.length - step; i += step) {
        const a = edge[i];
        const b = edge[Math.min(edge.length - 1, i + step)];
        const ax = a.x + a.nx * 0.55;
        const az = a.z + a.nz * 0.55;
        const bx = b.x + b.nx * 0.55;
        const bz = b.z + b.nz * 0.55;
        const segLen = Math.hypot(bx - ax, bz - az);
        if (segLen < 0.2) continue;

        const mx = (ax + bx) * 0.5;
        const mz = (az + bz) * 0.5;
        const yaw = Math.atan2(bx - ax, bz - az);

        guardrailMeshes.push({ x: mx, z: mz, len: segLen + 0.12, yaw });

        if (addCollider) {
          addSegmentCollider(ax, az, bx, bz, 0.42, 'guardrail');
        }

        if (addChevrons && i % 6 === 2) {
          chevronData.push({
            x: a.x + a.nx * 1.1,
            z: a.z + a.nz * 1.1,
            yaw: Math.atan2(-a.nx, -a.nz),
          });
        }
      }
    };

    if (guardLeft) buildEdgeBarrier(ribbon.leftEdge, true, chevronLeft);
    if (guardRight) buildEdgeBarrier(ribbon.rightEdge, true, chevronRight);

    if (lightSide !== 0) {
      const edge = lightSide > 0 ? ribbon.rightEdge : ribbon.leftEdge;
      let nextDist = 18;
      for (let i = 0; i < edge.length; i++) {
        if (edge[i].dist >= nextDist) {
          streetLightsData.push({
            x: edge[i].x + edge[i].nx * 1.6,
            z: edge[i].z + edge[i].nz * 1.6,
            inwardX: -edge[i].nx,
            inwardZ: -edge[i].nz,
            color: lightColor,
          });
          nextDist += 34;
        }
      }
    }
  }

  // 1) NW Expressway Sweeper: (-184, -340) heading West -> (-220, -304) heading South
  const nwCurve = new THREE.CurvePath();
  nwCurve.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(-184, 0, -340),
    new THREE.Vector3(-204, 0, -340),
    new THREE.Vector3(-220, 0, -324),
    new THREE.Vector3(-220, 0, -304)
  ));
  buildSweeper(nwCurve, 26, 20, 18, {
    guardLeft: true, guardRight: true, chevronRight: true, lightSide: 1, lightColor: 0x7dd3fc,
  });

  // 2) NE Expressway Sweeper: (184, -340) heading East -> (220, -304) heading South
  const neCurve = new THREE.CurvePath();
  neCurve.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(184, 0, -340),
    new THREE.Vector3(204, 0, -340),
    new THREE.Vector3(220, 0, -324),
    new THREE.Vector3(220, 0, -304)
  ));
  buildSweeper(neCurve, 26, 20, 18, {
    guardLeft: true, guardRight: true, chevronLeft: true, lightSide: -1, lightColor: 0xfdba74,
  });

  // 3) SW Sweeper: (-220, -118) heading South -> (-192, -90) heading East right into the Open Drift Plaza!
  const swCurve = new THREE.CurvePath();
  swCurve.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(-220, 0, -118),
    new THREE.Vector3(-220, 0, -102),
    new THREE.Vector3(-208, 0, -90),
    new THREE.Vector3(-192, 0, -90)
  ));
  buildSweeper(swCurve, 22, 18, 16, {
    guardLeft: false, guardRight: true, chevronRight: true, lightSide: 1, lightColor: 0x7dd3fc,
  });

  // 4) SOUTH-EAST TECHNICAL CORNER SECTION (Touge S-Bends & Hairpin Sweepers)
  // Connects flush from Industrial Blvd (220, -100, tangent South) -> Main Road T-Junction (8, -56, tangent West)
  const cornerPath = new THREE.CurvePath();
  // Segment 1: Fast entry south into sweeping right-hander
  cornerPath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(220, 0, -100),
    new THREE.Vector3(220, 0, -52),
    new THREE.Vector3(206, 0, -16),
    new THREE.Vector3(168, 0, -16)
  ));
  // Segment 2: Technical S-bend swinging north-west
  cornerPath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(168, 0, -16),
    new THREE.Vector3(138, 0, -16),
    new THREE.Vector3(136, 0, -64),
    new THREE.Vector3(102, 0, -64)
  ));
  // Segment 3: Tight left-right switchback curving south
  cornerPath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(102, 0, -64),
    new THREE.Vector3(74, 0, -64),
    new THREE.Vector3(76, 0, -24),
    new THREE.Vector3(48, 0, -24)
  ));
  // Segment 4: Final sweeping apex lining up flush with Main Road at (8, -56)
  cornerPath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(48, 0, -24),
    new THREE.Vector3(28, 0, -24),
    new THREE.Vector3(26, 0, -56),
    new THREE.Vector3(8, 0, -56)
  ));

  buildSweeper(cornerPath, 88, 18, 16, {
    guardLeft: true,
    guardRight: true,
    chevronLeft: true,
    chevronRight: true,
    lightSide: 1,
    lightColor: 0xfef08a,
  });

  // -----------------------------------------------------------
  // 4. EXPLORATION AREA :: OPEN DRIFT PLAZA & PARKING LOT
  // Wide open free-drive arena: X: [-196, -87], Z: [-144, -26]
  // Accessible from West (SW Sweeper), East (Z = -90), and North (driveway from Z = -180)!
  // -----------------------------------------------------------
  const plazaX1 = -196;
  const plazaX2 = -87;
  const plazaZ1 = -144;
  const plazaZ2 = -26;
  const plazaW = plazaX2 - plazaX1; // 109m
  const plazaD = plazaZ2 - plazaZ1; // 118m
  const plazaCX = (plazaX1 + plazaX2) * 0.5; // -141.5
  const plazaCZ = (plazaZ1 + plazaZ2) * 0.5; // -85

  const plazaTex = tex.plazaAlbedo.clone();
  plazaTex.needsUpdate = true;
  plazaTex.repeat.set(9, 10);
  plazaTex.colorSpace = THREE.SRGBColorSpace;
  const plazaFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(plazaW, plazaD),
    new THREE.MeshStandardMaterial({
      map: plazaTex,
      normalMap: tex.roadNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: tex.roadRoughness,
      roughness: 0.62,
      metalness: 0.16,
    })
  );
  plazaFloor.rotation.x = -Math.PI / 2;
  plazaFloor.position.set(plazaCX, 0.001, plazaCZ);
  plazaFloor.receiveShadow = true;
  worldGroup.add(plazaFloor);

  // North driveway connecting Midtown Cross Street (Z = -180) straight down into the Drift Plaza!
  addStraightRoad(-142, -173, -142, -144, 16, 2);

  // Painted parking bay lines along North & South edges of the Drift Plaza
  const paintLineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const lineGeoV = new THREE.PlaneGeometry(0.18, 6.2);
  for (let px = -182; px <= -100; px += 4.6) {
    // South bays
    const sLine = new THREE.Mesh(lineGeoV, paintLineMat);
    sLine.rotation.x = -Math.PI / 2;
    sLine.position.set(px, 0.012, -31);
    worldGroup.add(sLine);
    // North bays (skip center driveway X: [-152, -132])
    if (px < -152 || px > -132) {
      const nLine = new THREE.Mesh(lineGeoV, paintLineMat);
      nLine.rotation.x = -Math.PI / 2;
      nLine.position.set(px, 0.012, -139);
      worldGroup.add(nLine);
    }
  }

  // Central Drift Plaza Illuminated Circular Island (fun centerpiece for donuts!)
  const islandX = -141.5;
  const islandZ = -85.0;
  const islandRadius = 6.2;
  const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(islandRadius, islandRadius + 0.35, 0.42, 32),
    sidewalkMat
  );
  islandBase.position.set(islandX, 0.21, islandZ);
  islandBase.receiveShadow = true;
  worldGroup.add(islandBase);

  const islandGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(islandRadius + 0.05, 0.09, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  );
  islandGlowRing.rotation.x = Math.PI / 2;
  islandGlowRing.position.set(islandX, 0.44, islandZ);
  worldGroup.add(islandGlowRing);

  const islandObelisk = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 7.5, 1.6),
    darkSteelMat
  );
  islandObelisk.position.set(islandX, 4.1, islandZ);
  islandObelisk.castShadow = true;
  worldGroup.add(islandObelisk);

  const obeliskStrip = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 6.6, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  );
  obeliskStrip.position.set(islandX, 4.1, islandZ);
  worldGroup.add(obeliskStrip);
  addCircleCollider(islandX, islandZ, islandRadius + 0.25, 'plaza_island');

  // Plaza Perimeter Concrete Curbs / Walls (leave 3 wide entrances open!)
  // South border wall & modern glass pavilion
  addBoxCollider(plazaCX, -24.5, plazaW + 4, 2.2, 'plaza_wall');
  const plazaSouthWall = new THREE.Mesh(new THREE.BoxGeometry(plazaW + 2, 1.1, 1.0), concreteDarkMat);
  plazaSouthWall.position.set(plazaCX, 0.55, -25.2);
  worldGroup.add(plazaSouthWall);

  // Plaza Pavilion + Neon Sign on South Edge
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(28, 6.2, 8), concreteDarkMat);
  pavilion.position.set(plazaCX, 3.1, -18.5);
  worldGroup.add(pavilion);
  const plazaSignTex = tex.makeNeonSignTexture('DARKLINES PLAZA', 'OPEN DRIFT & PARKING DECK', '#f43f5e', '#090b14');
  const plazaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.0),
    new THREE.MeshBasicMaterial({ map: plazaSignTex })
  );
  plazaSign.position.set(plazaCX, 4.4, -22.6);
  plazaSign.rotation.y = Math.PI;
  worldGroup.add(plazaSign);

  // West border of Drift Plaza (leave Z: [-99, -81] open for SW Sweeper!)
  const makeLowWall = (cx, cz, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, d), concreteDarkMat);
    m.position.set(cx, 0.475, cz);
    worldGroup.add(m);
    addBoxCollider(cx, cz, w + 0.3, d + 0.3, 'plaza_wall');
  };
  makeLowWall(-196.8, -53, 1.2, 55);   // West-South edge
  makeLowWall(-196.8, -122, 1.2, 44);  // West-North edge
  // North border of Drift Plaza (leave X: [-151, -133] open for North driveway!)
  makeLowWall(-174, -144.8, 45, 1.2);
  makeLowWall(-109, -144.8, 45, 1.2);
  // East border of Drift Plaza (leave Z: [-99, -81] open for South Midtown Ave!)
  makeLowWall(-86.5, -53, 1.2, 55);    // East-South edge
  makeLowWall(-86.5, -122, 1.2, 44);   // East-North edge

  // Plaza Corner Floodlights
  [
    [-190, -138, 0.7, 0.7],
    [-94, -138, -0.7, 0.7],
    [-190, -34, 0.7, -0.7],
    [-94, -34, -0.7, -0.7],
  ].forEach(([lx, lz, ix, iz]) => {
    streetLightsData.push({ x: lx, z: lz, inwardX: ix, inwardZ: iz, color: 0x7dd3fc });
  });

  // -----------------------------------------------------------
  // 5. INDUSTRIAL ZONE :: CARGO YARD, WAREHOUSES, CONTAINERS & SILOS
  // Drivable Cargo Yard: X: [+88, +211], Z: [-172, -104]
  // Accessible from North (Z = -180), East (X = +220), and West (X = +80)!
  // -----------------------------------------------------------
  const indX1 = 87;
  const indX2 = 211;
  const indZ1 = -173;
  const indZ2 = -102;
  const indW = indX2 - indX1;
  const indD = indZ2 - indZ1;
  const indCX = (indX1 + indX2) * 0.5;
  const indCZ = (indZ1 + indZ2) * 0.5;

  const indTex = tex.industrialAlbedo.clone();
  indTex.needsUpdate = true;
  indTex.repeat.set(10, 6);
  indTex.colorSpace = THREE.SRGBColorSpace;
  const indFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(indW, indD),
    new THREE.MeshStandardMaterial({
      map: indTex,
      normalMap: tex.roadNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: tex.roadRoughness,
      roughness: 0.72,
      metalness: 0.14,
    })
  );
  indFloor.rotation.x = -Math.PI / 2;
  indFloor.position.set(indCX, 0.001, indCZ);
  indFloor.receiveShadow = true;
  worldGroup.add(indFloor);

  // Warehouse builder helper
  function addWarehouse(cx, cz, w, h, d, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), warehouseMat);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Pitched industrial roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.9, d + 0.6), roofMat);
    roof.position.y = h + 0.45;
    g.add(roof);

    // Loading bay doors along front (+Z) face
    const bayCount = Math.max(2, Math.floor(w / 10));
    const doorGeo = new THREE.BoxGeometry(4.2, 4.4, 0.25);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.6, metalness: 0.7 });
    const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xfdba74 });
    for (let i = 0; i < bayCount; i++) {
      const bx = -w * 0.5 + ((i + 0.5) / bayCount) * w;
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(bx, 2.2, d * 0.5 + 0.1);
      g.add(door);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.35), lightStripMat);
      lamp.position.set(bx, 4.8, d * 0.5 + 0.2);
      g.add(lamp);
    }

    worldGroup.add(g);

    // Add accurate AABB collider (rotY is 0 or PI/2)
    const effW = Math.abs(Math.cos(rotY)) > 0.5 ? w : d;
    const effD = Math.abs(Math.cos(rotY)) > 0.5 ? d : w;
    addBoxCollider(cx, cz, effW + 0.4, effD + 0.4, 'warehouse');
  }

  // North Industrial Block (X: +90..+208, Z: -250..-190): Large Warehouses + Fuel Silos
  addWarehouse(124, -222, 46, 12, 24, 0);
  addWarehouse(180, -228, 36, 11, 20, 0);

  // Industrial Storage Silos
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });
  const siloTopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  const siloCoords = [
    [164, -204, 5.2, 16],
    [178, -204, 5.2, 16],
    [192, -204, 4.6, 13],
  ];
  siloCoords.forEach(([sx, sz, sr, sh]) => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr, sh, 20), siloMat);
    cyl.position.set(sx, sh * 0.5, sz);
    cyl.castShadow = true;
    worldGroup.add(cyl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.82, sr, 1.4, 20), siloTopMat);
    cap.position.set(sx, sh + 0.7, sz);
    worldGroup.add(cap);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(sr + 0.08, sr + 0.08, 0.5, 20), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    band.position.set(sx, sh * 0.72, sz);
    worldGroup.add(band);
    addCircleCollider(sx, sz, sr + 0.3, 'silo');
  });

  // Warehouse inside South-West of Cargo Yard (leaves wide drivable lanes around it!)
  addWarehouse(116, -116, 36, 10.5, 18, Math.PI);

  // Shipping Container placements (InstancedMesh built below)
  // Organized with wide 16m+ drivable aisles through the Cargo Yard!
  const containerInstances = [];
  const containerColors = [0x7f1d1d, 0x1e3a5f, 0x1e3a2f, 0x334155, 0x78350f];
  function addContainerStack(cx, cz, yaw, levels = 1, colorIdx = 0) {
    const len = 12.0;
    const wid = 2.6;
    const hei = 2.8;
    for (let lv = 0; lv < levels; lv++) {
      containerInstances.push({
        x: cx,
        y: hei * 0.5 + lv * hei,
        z: cz,
        yaw,
        color: containerColors[(colorIdx + lv) % containerColors.length],
      });
    }
    const effW = Math.abs(Math.cos(yaw)) > 0.5 ? len : wid;
    const effD = Math.abs(Math.cos(yaw)) > 0.5 ? wid : len;
    addBoxCollider(cx, cz, effW + 0.3, effD + 0.3, 'container');
  }

  // Cargo Yard container rows (plenty of space to drift/weave between them!)
  addContainerStack(110, -156, 0, 2, 0);
  addContainerStack(124, -156, 0, 1, 1);
  addContainerStack(174, -156, 0, 2, 2);
  addContainerStack(192, -156, 0, 1, 3);
  addContainerStack(176, -118, 0, 2, 4);
  addContainerStack(192, -118, 0, 1, 0);
  addContainerStack(152, -134, Math.PI / 2, 2, 1);

  // Industrial Neon Sign at Cargo Yard entrance
  const indSignTex = tex.makeNeonSignTexture('SECTOR 04', 'PORT INDUSTRIAL CARGO YARD', '#f59e0b', '#0a0d14');
  const indSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.2),
    new THREE.MeshBasicMaterial({ map: indSignTex })
  );
  indSign.position.set(148, 8.2, -187.5);
  worldGroup.add(indSign);

  // Cargo Yard Floodlights
  streetLightsData.push(
    { x: 146, z: -164, inwardX: 0, inwardZ: 1, color: 0xfdba74 },
    { x: 198, z: -136, inwardX: -1, inwardZ: 0, color: 0xfdba74 },
    { x: 146, z: -108, inwardX: 0, inwardZ: -1, color: 0xfdba74 }
  );

  // South barrier of Cargo Yard (keeps player from cutting off-road into Corner Section except via roads)
  makeLowWall(148, -101.2, 120, 1.2);

  // East Backdrop Warehouses outside Industrial Blvd (X: +234..+268)
  addWarehouse(248, -280, 22, 13, 34, Math.PI / 2);
  addWarehouse(248, -218, 22, 12, 36, Math.PI / 2);
  addWarehouse(248, -142, 22, 14, 42, Math.PI / 2);

  // -----------------------------------------------------------
  // 6. CITY DISTRICT :: SKYSCRAPERS, MID-RISE BLOCKS, NEON SIGNS & SIDEWALKS
  // -----------------------------------------------------------
  const neonColors = [0x06b6d4, 0xf43f5e, 0xf59e0b, 0x8b5cf6, 0x38bdf8];
  const beaconPositions = [];

  function addCityBlock(x1, z1, x2, z2, config = {}) {
    const {
      minH = 20,
      maxH = 55,
      density = 2, // 2x2 or 3x2 buildings
      neonChance = 0.65,
      seedOffset = 1,
    } = config;

    const bw = x2 - x1;
    const bd = z2 - z1;
    const cx = (x1 + x2) * 0.5;
    const cz = (z1 + z2) * 0.5;

    // Raised concrete sidewalk slab for the entire block
    const slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.22, bd), sidewalkMat);
    slab.position.set(cx, 0.11, cz);
    slab.receiveShadow = true;
    worldGroup.add(slab);

    // Deterministic pseudo-random per block
    let seed = Math.abs(Math.floor(x1 * 17 + z1 * 31 + seedOffset * 101)) + 13;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const margin = 3.2;
    const innerW = bw - margin * 2;
    const innerD = bd - margin * 2;
    const cols = Math.max(1, Math.min(4, Math.round(innerW / 24)));
    const rows = Math.max(1, Math.min(3, Math.round(innerD / 24)));
    const cellW = innerW / cols;
    const cellD = innerD / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gap = 2.6;
        const w = Math.max(8, cellW - gap);
        const d = Math.max(8, cellD - gap);
        const h = minH + rand() * (maxH - minH);
        const bx = x1 + margin + (c + 0.5) * cellW;
        const bz = z1 + margin + (r + 0.5) * cellD;

        const matIdx = Math.floor(rand() * buildingMaterials.length);
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterials[matIdx]);
        bldg.position.set(bx, h * 0.5 + 0.22, bz);
        bldg.castShadow = h < 45;
        bldg.receiveShadow = true;
        worldGroup.add(bldg);

        // Stepped upper penthouse / crown on taller skyscrapers
        if (h > 38) {
          const topW = w * 0.68;
          const topD = d * 0.68;
          const topH = 4.5 + rand() * 7.0;
          const crown = new THREE.Mesh(new THREE.BoxGeometry(topW, topH, topD), darkSteelMat);
          crown.position.set(bx, h + 0.22 + topH * 0.5, bz);
          worldGroup.add(crown);

          // Red aviation spire beacon
          if (h > 52) {
            const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 9, 6), darkSteelMat);
            spire.position.set(bx, h + topH + 4.7, bz);
            worldGroup.add(spire);
            beaconPositions.push({ x: bx, y: h + topH + 9.4, z: bz });
          }
        } else {
          // Rooftop HVAC block
          const hvac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, 1.8, d * 0.35), roofMat);
          hvac.position.set(bx + w * 0.12, h + 1.1, bz - d * 0.1);
          worldGroup.add(hvac);
        }

        // Architectural neon accent trim or street-level neon sign
        if (rand() < neonChance) {
          const nColor = neonColors[Math.floor(rand() * neonColors.length)];
          const nMat = new THREE.MeshBasicMaterial({ color: nColor });

          // Horizontal glowing cornice / storefront accent strip
          const stripY = h > 42 ? h - 1.2 : 5.2;
          const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.28, d + 0.25), nMat);
          strip.position.set(bx, stripY, bz);
          worldGroup.add(strip);
        }

        // Exact building collider (with sidewalk curb buffer)
        addBoxCollider(bx, bz, w + 0.6, d + 0.6, 'building');
      }
    }

    // Also add low-profile block sidewalk collider? No, keeping collider strictly on buildings
    // lets cars kiss the sidewalk curb without bouncing off invisible air!
    // Actually, adding subtle visual curb edges along block perimeter makes streets super crisp.
    void density;
  }

  // Downtown Midtown West & East (flanking Main Avenue right as you exit the garage!)
  addCityBlock(-71, -171, -10, -100, { minH: 22, maxH: 48, neonChance: 0.8, seedOffset: 1 });
  addCityBlock(10, -171, 71, -100, { minH: 24, maxH: 52, neonChance: 0.8, seedOffset: 2 });

  // Downtown Core Skyscrapers (Tall Dramatic Skyline straight ahead of the Garage!)
  addCityBlock(-71, -250, -10, -189, { minH: 46, maxH: 88, neonChance: 0.9, seedOffset: 3 });
  addCityBlock(10, -250, 71, -189, { minH: 50, maxH: 94, neonChance: 0.9, seedOffset: 4 });

  // West Downtown Blocks (between X = -209 and X = -89)
  addCityBlock(-209, -250, -89, -189, { minH: 26, maxH: 56, neonChance: 0.7, seedOffset: 5 });
  // Slim urban loft strip north of Drift Plaza (Z: -171..-148)
  addCityBlock(-209, -171, -152, -148, { minH: 14, maxH: 24, neonChance: 0.75, seedOffset: 6 });
  addCityBlock(-132, -171, -89, -148, { minH: 14, maxH: 26, neonChance: 0.75, seedOffset: 7 });

  // North Skyline Corridor bordering the High-Speed Expressway (Z: -328..-270)
  addCityBlock(-182, -328, -10, -270, { minH: 36, maxH: 76, neonChance: 0.85, seedOffset: 8 });
  addCityBlock(10, -328, 182, -270, { minH: 32, maxH: 70, neonChance: 0.85, seedOffset: 9 });

  // Garage Flanking Urban Service Buildings (keeps garage block natural & grounded!)
  addCityBlock(-68, -79, -21, -28, { minH: 10, maxH: 18, neonChance: 0.65, seedOffset: 10 });
  addCityBlock(-68, -22, -22, 22, { minH: 11, maxH: 18, neonChance: 0.4, seedOffset: 11 });
  addCityBlock(22, -14, 62, 24, { minH: 11, maxH: 19, neonChance: 0.4, seedOffset: 12 });

  // Signature Neon Billboards Facing Main Avenue & Intersections
  const billboards = [
    { x: -10.4, y: 12, z: -115, ry: Math.PI / 2, t1: 'MIDNIGHT', t2: 'DOWNTOWN SECTOR 01', col: '#06b6d4', w: 12, h: 3.4 },
    { x: 10.4, y: 14, z: -145, ry: -Math.PI / 2, t1: 'DARKLINES', t2: 'NIGHT CIRCUIT', col: '#f43f5e', w: 13, h: 3.6 },
    { x: -10.4, y: 18, z: -215, ry: Math.PI / 2, t1: 'R35 TUNING', t2: 'TWIN TURBO SPEC', col: '#38bdf8', w: 14, h: 3.8 },
    { x: 10.4, y: 16, z: -232, ry: -Math.PI / 2, t1: 'WANGAN', t2: 'HIGHWAY EXPRESS', col: '#f59e0b', w: 13, h: 3.6 },
    { x: -45, y: 11, z: -100.2, ry: 0, t1: 'DRIFT PLAZA', t2: '<-- WEST ACCESS', col: '#06b6d4', w: 11, h: 3.0 },
    { x: 45, y: 11, z: -100.2, ry: 0, t1: 'INDUSTRIAL', t2: 'CORNERS LOOP -->', col: '#f59e0b', w: 11, h: 3.0 },
  ];
  billboards.forEach((b) => {
    const bTex = tex.makeNeonSignTexture(b.t1, b.t2, b.col, '#050811');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(b.w, b.h),
      new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide })
    );
    sign.position.set(b.x, b.y, b.z);
    sign.rotation.y = b.ry;
    worldGroup.add(sign);
  });

  // -----------------------------------------------------------
  // 7. OVERHEAD HIGHWAY GANTRIES (High-Speed Stretch & Main Ave)
  // -----------------------------------------------------------
  function addOverheadGantry(cx, cz, spanWidth, rotY, title, sub, colorHex = '#06b6d4') {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;

    const legH = 8.4;
    const legGeo = new THREE.BoxGeometry(0.45, legH, 0.45);
    const legL = new THREE.Mesh(legGeo, darkSteelMat);
    legL.position.set(-spanWidth * 0.5, legH * 0.5, 0);
    g.add(legL);
    const legR = new THREE.Mesh(legGeo, darkSteelMat);
    legR.position.set(spanWidth * 0.5, legH * 0.5, 0);
    g.add(legR);

    const truss = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 0.6, 0.65, 0.55), darkSteelMat);
    truss.position.set(0, legH - 0.3, 0);
    g.add(truss);

    const signTex = tex.makeNeonSignTexture(title, sub, colorHex, '#06121c');
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(13.5, spanWidth * 0.65), 2.5, 0.25),
      [
        darkSteelMat,
        darkSteelMat,
        darkSteelMat,
        darkSteelMat,
        new THREE.MeshBasicMaterial({ map: signTex }),
        new THREE.MeshBasicMaterial({ map: signTex }),
      ]
    );
    board.position.set(0, legH - 0.9, 0);
    g.add(board);

    worldGroup.add(g);

    // Colliders for the 2 gantry legs
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const hw = spanWidth * 0.5;
    addCircleCollider(cx - hw * cos, cz + hw * sin, 0.55, 'gantry_leg');
    addCircleCollider(cx + hw * cos, cz - hw * sin, 0.55, 'gantry_leg');
  }

  // Main Avenue entry gantry right after leaving the garage!
  addOverheadGantry(0, -74, 18.6, 0, 'MIDNIGHT CITY', 'DOWNTOWN  |  EXPRESSWAY  |  PLAZA', '#06b6d4');
  // North High-Speed Expressway gantries
  addOverheadGantry(-95, -340, 22.8, Math.PI / 2, 'NORTH EXPRESSWAY', 'TOP SPEED STRAIGHT // 200+ KM/H', '#f43f5e');
  addOverheadGantry(95, -340, 22.8, Math.PI / 2, 'DARKLINES LOOP', 'INDUSTRIAL ZONE  >>  CORNERS', '#f59e0b');
  // Industrial Blvd gantry
  addOverheadGantry(220, -215, 20.6, 0, 'INDUSTRIAL ZONE', 'CARGO YARD  |  TOUGE CORNERS', '#f59e0b');

  // -----------------------------------------------------------
  // 8. STRAIGHT EXPRESSWAY & PERIMETER GUARDRAILS + BOUNDARIES
  // -----------------------------------------------------------
  function addStraightGuardrail(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 1) return;
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const yaw = Math.atan2(dx, dz);
    guardrailMeshes.push({ x: mx, z: mz, len, yaw });
    addSegmentCollider(x1, z1, x2, z2, 0.45, 'guardrail');
  }

  // North side of High-Speed Expressway (continuous protective barrier)
  addStraightGuardrail(-184, -350.6, 184, -350.6);
  // Outer West side of West Ring Road
  addStraightGuardrail(-229.6, -304, -229.6, -118);
  // Outer East side of Industrial Blvd
  addStraightGuardrail(229.6, -304, 229.6, -100);
  // South border behind Garage so player can't drive into void behind garage
  addStraightGuardrail(-250, 32, 250, 32);

  // Garage Apron Protective Side Curbs/Bollards (between Z = -26 and Z = -48 along X = ±9.2)
  for (let bz = -27.5; bz >= -46; bz -= 3.7) {
    bollardPositions.push({ x: -8.8, z: bz });
    bollardPositions.push({ x: 8.8, z: bz });
  }
  addSegmentCollider(-8.8, -24.5, -8.8, -47.5, 0.45, 'apron_wall');
  addSegmentCollider(8.8, -24.5, 8.8, -47.5, 0.45, 'apron_wall');

  // Traffic lights at key Downtown intersections
  const keyIntersections = [
    [0, -90, 9.2, 9.2],
    [0, -180, 9.2, 8.2],
    [0, -260, 9.2, 9.2],
    [-80, -180, 8.2, 8.2],
    [80, -180, 8.2, 8.2],
    [-80, -260, 8.2, 9.2],
    [80, -260, 8.2, 9.2],
  ];
  keyIntersections.forEach(([ix, iz, ox, oz]) => {
    trafficLightPositions.push({ x: ix + ox, z: iz + oz, yaw: Math.PI });
    trafficLightPositions.push({ x: ix - ox, z: iz - oz, yaw: 0 });
  });

  // -----------------------------------------------------------
  // 9. DISTANT HORIZON SILHOUETTE BUILDINGS & NIGHTTIME PINE TREES
  // Ensures zero empty void edges from any angle in the map
  // -----------------------------------------------------------
  const skylineSilMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    emissive: 0x0b1628,
    emissiveIntensity: 0.45,
    roughness: 0.85,
  });
  const skylineData = [];
  // North skyline backdrop behind Expressway (Z: -385..-430)
  for (let sx = -260; sx <= 260; sx += 34) {
    skylineData.push([sx, -395 - (Math.abs(sx * 7) % 30), 22, 34 + (Math.abs(sx * 13) % 58), 22]);
  }
  // West skyline backdrop behind West Ring (X: -265..-300)
  for (let sz = -340; sz <= -40; sz += 38) {
    skylineData.push([-272 - (Math.abs(sz * 5) % 24), sz, 24, 24 + (Math.abs(sz * 11) % 44), 24]);
  }
  // South backdrop behind Garage & Corner Section (Z: +46..+90)
  for (let sx = -220; sx <= 220; sx += 40) {
    skylineData.push([sx, 58 + (Math.abs(sx * 3) % 22), 26, 22 + (Math.abs(sx * 9) % 34), 22]);
  }
  skylineData.forEach(([x, z, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skylineSilMat);
    m.position.set(x, h * 0.5, z);
    worldGroup.add(m);
  });

  // Nighttime Roadside Pine Trees framing the Corner Section, Expressway edges & Garage perimeter
  let treeSeed = 4219;
  const treeRand = () => {
    treeSeed = (treeSeed * 16807) % 2147483647;
    return (treeSeed - 1) / 2147483646;
  };
  // Trees along North side of Expressway
  for (let tx = -210; tx <= 210; tx += 15) {
    treePositions.push({ x: tx + (treeRand() - 0.5) * 6, z: -358 - treeRand() * 18, s: 0.9 + treeRand() * 0.9 });
  }
  // Trees along West Ring outer edge
  for (let tz = -310; tz <= -80; tz += 18) {
    treePositions.push({ x: -237 - treeRand() * 14, z: tz + (treeRand() - 0.5) * 5, s: 0.85 + treeRand() * 0.85 });
  }
  // Trees framing the South-East Corner Section & South Garage edge
  for (let tx = 30; tx <= 235; tx += 16) {
    treePositions.push({ x: tx + (treeRand() - 0.5) * 6, z: 6 + treeRand() * 20, s: 0.9 + treeRand() * 0.8 });
  }
  for (let tx = -210; tx <= -30; tx += 20) {
    treePositions.push({ x: tx, z: 26 + treeRand() * 12, s: 0.9 + treeRand() * 0.7 });
  }

  // -----------------------------------------------------------
  // 10. INSTANCED MESHES (High-Performance GPU Batching)
  // -----------------------------------------------------------
  const dummy = new THREE.Object3D();

  // 10a. Guardrails
  if (guardrailMeshes.length > 0) {
    const railInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.52, 1.0), guardrailMat, guardrailMeshes.length);
    const postInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.78, 0.14), darkSteelMat, guardrailMeshes.length);
    railInst.frustumCulled = false;
    postInst.frustumCulled = false;

    for (let i = 0; i < guardrailMeshes.length; i++) {
      const g = guardrailMeshes[i];
      dummy.position.set(g.x, 0.54, g.z);
      dummy.rotation.set(0, g.yaw, 0);
      dummy.scale.set(1, 1, g.len);
      dummy.updateMatrix();
      railInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(g.x, 0.39, g.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);
    }
    railInst.instanceMatrix.needsUpdate = true;
    postInst.instanceMatrix.needsUpdate = true;
    worldGroup.add(railInst);
    worldGroup.add(postInst);
  }

  // 10b. Apex Chevron Turn Warning Signs
  if (chevronData.length > 0) {
    const chevMat = new THREE.MeshBasicMaterial({ map: tex.chevron, side: THREE.DoubleSide });
    const chevInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.15, 1.15), chevMat, chevronData.length);
    const chevPostInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 1.8, 0.09), darkSteelMat, chevronData.length);
    chevInst.frustumCulled = false;
    chevPostInst.frustumCulled = false;

    for (let i = 0; i < chevronData.length; i++) {
      const c = chevronData[i];
      dummy.position.set(c.x, 1.55, c.z);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      chevInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(c.x, 0.9, c.z);
      dummy.updateMatrix();
      chevPostInst.setMatrixAt(i, dummy.matrix);
    }
    chevInst.instanceMatrix.needsUpdate = true;
    chevPostInst.instanceMatrix.needsUpdate = true;
    worldGroup.add(chevInst);
    worldGroup.add(chevPostInst);
  }

  // 10c. Streetlights (Mast + Arm + Glowing Luminaire + Wet Ground Light Pool)
  const lightPoolList = []; // Exact luminaire world positions for dynamic 6-PointLight pool
  if (streetLightsData.length > 0) {
    const n = streetLightsData.length;
    const mastInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.14, 7.6, 8), darkSteelMat, n);
    const armInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 2.3), darkSteelMat, n);
    const bulbInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.38, 0.12, 0.56),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      n
    );
    const poolMat = new THREE.MeshBasicMaterial({
      map: tex.lightPool,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const poolInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(16, 16), poolMat, n);

    [mastInst, armInst, bulbInst, poolInst].forEach((im) => {
      im.frustumCulled = false;
    });

    const tmpColor = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const sl = streetLightsData[i];
      const yaw = Math.atan2(sl.inwardX, sl.inwardZ);
      const lampX = sl.x + sl.inwardX * 1.95;
      const lampZ = sl.z + sl.inwardZ * 1.95;

      // Mast
      dummy.position.set(sl.x, 3.8, sl.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mastInst.setMatrixAt(i, dummy.matrix);

      // Arm extending over road
      dummy.position.set(sl.x + sl.inwardX * 1.05, 7.45, sl.z + sl.inwardZ * 1.05);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      armInst.setMatrixAt(i, dummy.matrix);

      // Luminaire bulb
      dummy.position.set(lampX, 7.36, lampZ);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      bulbInst.setMatrixAt(i, dummy.matrix);

      // Ground glow pool on wet asphalt
      dummy.position.set(lampX, 0.015, lampZ);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      poolInst.setMatrixAt(i, dummy.matrix);

      tmpColor.setHex(sl.color);
      bulbInst.setColorAt(i, tmpColor);
      poolInst.setColorAt(i, tmpColor);

      lightPoolList.push({ x: lampX, y: 7.0, z: lampZ, color: sl.color });
    }

    mastInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    bulbInst.instanceMatrix.needsUpdate = true;
    poolInst.instanceMatrix.needsUpdate = true;
    if (bulbInst.instanceColor) bulbInst.instanceColor.needsUpdate = true;
    if (poolInst.instanceColor) poolInst.instanceColor.needsUpdate = true;

    worldGroup.add(mastInst);
    worldGroup.add(armInst);
    worldGroup.add(bulbInst);
    worldGroup.add(poolInst);
  }

  // 10d. Shipping Containers (Industrial Zone)
  if (containerInstances.length > 0) {
    const cMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74, metalness: 0.35 });
    const cInst = new THREE.InstancedMesh(new THREE.BoxGeometry(12.0, 2.8, 2.6), cMat, containerInstances.length);
    cInst.castShadow = true;
    cInst.receiveShadow = true;
    cInst.frustumCulled = false;

    const tmpCol = new THREE.Color();
    for (let i = 0; i < containerInstances.length; i++) {
      const c = containerInstances[i];
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cInst.setMatrixAt(i, dummy.matrix);
      tmpCol.setHex(c.color);
      cInst.setColorAt(i, tmpCol);
    }
    cInst.instanceMatrix.needsUpdate = true;
    if (cInst.instanceColor) cInst.instanceColor.needsUpdate = true;
    worldGroup.add(cInst);
  }

  // 10e. Nighttime Roadside Pine Trees
  if (treePositions.length > 0) {
    const n = treePositions.length;
    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.38, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 0.95 }),
      n
    );
    const folMat = new THREE.MeshStandardMaterial({ color: 0x07150e, roughness: 0.95 });
    const fol1Inst = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 4.4, 6), folMat, n);
    const fol2Inst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.85, 3.6, 6), folMat, n);
    [trunkInst, fol1Inst, fol2Inst].forEach((im) => {
      im.frustumCulled = false;
    });

    for (let i = 0; i < n; i++) {
      const t = treePositions[i];
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.setScalar(t.s);

      dummy.position.set(t.x, 1.1 * t.s, t.z);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, 3.2 * t.s, t.z);
      dummy.updateMatrix();
      fol1Inst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, 5.1 * t.s, t.z);
      dummy.updateMatrix();
      fol2Inst.setMatrixAt(i, dummy.matrix);
    }
    trunkInst.instanceMatrix.needsUpdate = true;
    fol1Inst.instanceMatrix.needsUpdate = true;
    fol2Inst.instanceMatrix.needsUpdate = true;
    worldGroup.add(trunkInst);
    worldGroup.add(fol1Inst);
    worldGroup.add(fol2Inst);
  }

  // 10f. Garage Apron Bollards
  if (bollardPositions.length > 0) {
    const n = bollardPositions.length;
    const bBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.16, 0.92, 10), darkSteelMat, n);
    const bTop = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.145, 0.145, 0.12, 10),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
      n
    );
    bBody.frustumCulled = false;
    bTop.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      const b = bollardPositions[i];
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(b.x, 0.46, b.z);
      dummy.updateMatrix();
      bBody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(b.x, 0.84, b.z);
      dummy.updateMatrix();
      bTop.setMatrixAt(i, dummy.matrix);
    }
    bBody.instanceMatrix.needsUpdate = true;
    bTop.instanceMatrix.needsUpdate = true;
    worldGroup.add(bBody);
    worldGroup.add(bTop);
  }

  // 10g. Downtown Traffic Signals
  if (trafficLightPositions.length > 0) {
    const n = trafficLightPositions.length;
    const tlPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.15, 6.2, 8), darkSteelMat, n);
    const tlHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1.25, 0.42), darkSteelMat, n);
    const tlGreen = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981 }),
      n
    );
    const tlRed = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
      n
    );
    [tlPole, tlHead, tlGreen, tlRed].forEach((im) => {
      im.frustumCulled = false;
    });

    for (let i = 0; i < n; i++) {
      const tl = trafficLightPositions[i];
      const cos = Math.cos(tl.yaw);
      const sin = Math.sin(tl.yaw);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, tl.yaw, 0);
      dummy.position.set(tl.x, 3.1, tl.z);
      dummy.updateMatrix();
      tlPole.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tl.x, 5.8, tl.z);
      dummy.updateMatrix();
      tlHead.setMatrixAt(i, dummy.matrix);

      // Alternate green/red bulbs on opposite faces
      dummy.position.set(tl.x + sin * 0.22, 5.45, tl.z + cos * 0.22);
      dummy.updateMatrix();
      tlGreen.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tl.x - sin * 0.22, 6.1, tl.z - cos * 0.22);
      dummy.updateMatrix();
      tlRed.setMatrixAt(i, dummy.matrix);
    }
    tlPole.instanceMatrix.needsUpdate = true;
    tlHead.instanceMatrix.needsUpdate = true;
    tlGreen.instanceMatrix.needsUpdate = true;
    tlRed.instanceMatrix.needsUpdate = true;
    worldGroup.add(tlPole);
    worldGroup.add(tlHead);
    worldGroup.add(tlGreen);
    worldGroup.add(tlRed);
  }

  // 10h. Rooftop Aviation Red Beacons
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  if (beaconPositions.length > 0) {
    const bInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 8), beaconMat, beaconPositions.length);
    bInst.frustumCulled = false;
    for (let i = 0; i < beaconPositions.length; i++) {
      const bp = beaconPositions[i];
      dummy.position.set(bp.x, bp.y, bp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bInst.setMatrixAt(i, dummy.matrix);
    }
    bInst.instanceMatrix.needsUpdate = true;
    worldGroup.add(bInst);
  }

  // -----------------------------------------------------------
  // 11. DYNAMIC 6-LIGHT STREETLIGHT POOL (Zero GC per frame!)
  // Gives real dynamic specular highlights on the GT-R R35 body
  // everywhere in the open world for minimal GPU cost!
  // -----------------------------------------------------------
  const POOL_SIZE = 6;
  const activeStreetLights = [];
  const nearestIndices = new Int32Array(POOL_SIZE);
  const nearestDistSq = new Float32Array(POOL_SIZE);

  for (let i = 0; i < POOL_SIZE; i++) {
    const pl = new THREE.PointLight(0xfef08a, 1.5, 36, 1.45);
    pl.position.set(0, -100, 0);
    worldGroup.add(pl);
    activeStreetLights.push(pl);
  }

  let pulseClock = 0;

  function updateOpenWorld(carPos, dt) {
    pulseClock += dt;

    // Gentle aviation beacon pulse
    const bGlow = 0.55 + 0.45 * Math.sin(pulseClock * 2.6);
    beaconMat.color.setRGB(0.95 * bGlow, 0.12 * bGlow, 0.25 * bGlow);

    // Find 6 nearest streetlights to the car (zero allocations)
    for (let k = 0; k < POOL_SIZE; k++) {
      nearestIndices[k] = -1;
      nearestDistSq[k] = 1e12;
    }

    const cx = carPos.x;
    const cz = carPos.z;
    const count = lightPoolList.length;

    for (let i = 0; i < count; i++) {
      const sl = lightPoolList[i];
      const dx = sl.x - cx;
      const dz = sl.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > 5200) continue; // > ~72m away

      // Insert into sorted top-6 nearest array
      if (d2 < nearestDistSq[POOL_SIZE - 1]) {
        let pos = POOL_SIZE - 1;
        while (pos > 0 && d2 < nearestDistSq[pos - 1]) {
          nearestDistSq[pos] = nearestDistSq[pos - 1];
          nearestIndices[pos] = nearestIndices[pos - 1];
          pos--;
        }
        nearestDistSq[pos] = d2;
        nearestIndices[pos] = i;
      }
    }

    for (let k = 0; k < POOL_SIZE; k++) {
      const idx = nearestIndices[k];
      const pl = activeStreetLights[k];
      if (idx >= 0) {
        const sl = lightPoolList[idx];
        pl.position.set(sl.x, sl.y, sl.z);
        pl.color.setHex(sl.color);
        // Smooth distance fade so lights never pop abruptly
        const dist = Math.sqrt(nearestDistSq[k]);
        const fade = Math.max(0, Math.min(1, (70 - dist) / 22));
        pl.intensity = 1.65 * fade;
      } else {
        pl.intensity = 0;
      }
    }
  }

  // -----------------------------------------------------------
  // 12. ROBUST 2-CIRCLE CHASSIS COLLISION SOLVER (Sliding & Anti-Stuck)
  // -----------------------------------------------------------
  const CHASSIS_SPHERE_OFFSET = 1.15;
  const CHASSIS_RADIUS = 1.05;
  let wasColliding = false;
  let impactCooldown = 0;

  function resolveWorldCollisions(carState, dt, garageDoorClosed = false) {
    const pos = carState.position;
    const fwdX = -Math.sin(carState.heading);
    const fwdZ = -Math.cos(carState.heading);

    if (impactCooldown > 0) {
      impactCooldown = Math.max(0, impactCooldown - dt);
    }

    let hitAny = false;
    let maxImpactRatio = 0;
    let maxNormalSpeed = 0;
    let bestNormalX = 0;
    let bestNormalZ = 0;
    let maxPenetration = 0;

    // 2 solver passes eliminate corner wedging completely
    for (let pass = 0; pass < 2; pass++) {
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? 1 : -1;
        let sx = pos.x + fwdX * (CHASSIS_SPHERE_OFFSET * sign);
        let sz = pos.z + fwdZ * (CHASSIS_SPHERE_OFFSET * sign);

        const pushSphere = (nx, nz, pen) => {
          if (pen <= 0) return;
          pos.x += nx * pen;
          pos.z += nz * pen;
          sx += nx * pen;
          sz += nz * pen;
          hitAny = true;
          if (pen > maxPenetration) maxPenetration = pen;

          const movingDot = (fwdX * nx + fwdZ * nz) * carState.speed;
          if (movingDot < 0) {
            const ratio = Math.abs(fwdX * nx + fwdZ * nz);
            const normalSpd = Math.abs(movingDot);
            if (ratio > maxImpactRatio) {
              maxImpactRatio = ratio;
              maxNormalSpeed = normalSpd;
              bestNormalX = nx;
              bestNormalZ = nz;
            }
          }
        };

        // 1. Optional closed garage shutter gate collider
        if (garageDoorClosed) {
          const minX = -5.2, maxX = 5.2, minZ = -24.25, maxZ = -23.55;
          const clX = Math.max(minX, Math.min(maxX, sx));
          const clZ = Math.max(minZ, Math.min(maxZ, sz));
          const dx = sx - clX;
          const dz = sz - clZ;
          const d2 = dx * dx + dz * dz;
          if (d2 < CHASSIS_RADIUS * CHASSIS_RADIUS) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pushSphere(dx / d, dz / d, CHASSIS_RADIUS - d);
            } else {
              pushSphere(0, sz > -23.9 ? 1 : -1, CHASSIS_RADIUS);
            }
          }
        }

        // 2. AABB Colliders (Buildings, Garage Walls, Warehouses, Containers)
        for (let i = 0; i < aabbColliders.length; i++) {
          const b = aabbColliders[i];
          if (sx + CHASSIS_RADIUS < b.minX || sx - CHASSIS_RADIUS > b.maxX ||
              sz + CHASSIS_RADIUS < b.minZ || sz - CHASSIS_RADIUS > b.maxZ) {
            continue;
          }
          const clX = Math.max(b.minX, Math.min(b.maxX, sx));
          const clZ = Math.max(b.minZ, Math.min(b.maxZ, sz));
          const dx = sx - clX;
          const dz = sz - clZ;
          const d2 = dx * dx + dz * dz;
          if (d2 < CHASSIS_RADIUS * CHASSIS_RADIUS) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pushSphere(dx / d, dz / d, CHASSIS_RADIUS - d);
            } else {
              // Inside box fallback: push out via nearest face
              const dLeft = Math.abs(sx - b.minX);
              const dRight = Math.abs(b.maxX - sx);
              const dTop = Math.abs(sz - b.minZ);
              const dBot = Math.abs(b.maxZ - sz);
              const m = Math.min(dLeft, dRight, dTop, dBot);
              if (m === dLeft) pushSphere(-1, 0, dLeft + CHASSIS_RADIUS);
              else if (m === dRight) pushSphere(1, 0, dRight + CHASSIS_RADIUS);
              else if (m === dTop) pushSphere(0, -1, dTop + CHASSIS_RADIUS);
              else pushSphere(0, 1, dBot + CHASSIS_RADIUS);
            }
          }
        }

        // 3. Circle Colliders (Pillars, Silos, Plaza Island, Gantry Legs)
        for (let i = 0; i < circleColliders.length; i++) {
          const c = circleColliders[i];
          const dx = sx - c.x;
          const dz = sz - c.z;
          const minDist = CHASSIS_RADIUS + c.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < minDist * minDist) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pushSphere(dx / d, dz / d, minDist - d);
            } else {
              pushSphere(1, 0, minDist);
            }
          }
        }

        // 4. Capsule / Segment Colliders (Curved Guardrails & Expressway Barriers)
        for (let i = 0; i < segmentColliders.length; i++) {
          const seg = segmentColliders[i];
          const abx = seg.bx - seg.ax;
          const abz = seg.bz - seg.az;
          const abLenSq = abx * abx + abz * abz;
          let t = 0;
          if (abLenSq > 1e-6) {
            t = ((sx - seg.ax) * abx + (sz - seg.az) * abz) / abLenSq;
            if (t < 0) t = 0;
            else if (t > 1) t = 1;
          }
          const clX = seg.ax + abx * t;
          const clZ = seg.az + abz * t;
          const dx = sx - clX;
          const dz = sz - clZ;
          const minDist = CHASSIS_RADIUS + seg.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < minDist * minDist && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            pushSphere(dx / d, dz / d, minDist - d);
          }
        }
      }
    }

    // Outer world safety clamp (smooth dt-scaled damping, impossible to escape map)
    const boundaryDamp = Math.exp(-2.2 * dt);
    if (pos.x < WORLD_MIN_X) { pos.x = WORLD_MIN_X; carState.speed *= boundaryDamp; }
    else if (pos.x > WORLD_MAX_X) { pos.x = WORLD_MAX_X; carState.speed *= boundaryDamp; }
    if (pos.z < WORLD_MIN_Z) { pos.z = WORLD_MIN_Z; carState.speed *= boundaryDamp; }
    else if (pos.z > WORLD_MAX_Z) { pos.z = WORLD_MAX_Z; carState.speed *= boundaryDamp; }

    // Smooth, Speed-Proportional Collision & Wall-Slide Physics
    if (hitAny && maxImpactRatio > 0.01) {
      const speedSign = Math.sign(carState.speed) || 1;
      const absSpeed = Math.abs(carState.speed);
      const tangentFactor = Math.sqrt(Math.max(0, 1.0 - maxImpactRatio * maxImpactRatio));
      const isFreshImpact = !wasColliding && impactCooldown <= 0;

      if (maxImpactRatio > 0.84) {
        // Near head-on impact (> ~57 deg): proportional energy absorption
        if (isFreshImpact) {
          if (maxNormalSpeed > 12.0) {
            // High-speed head-on impact: crisp damped rebound
            const rebound = Math.min(4.8, (maxNormalSpeed - 8.0) * 0.14);
            carState.speed = -speedSign * rebound;
          } else if (maxNormalSpeed > 4.5) {
            // Medium bump: soft cushioned bounce
            carState.speed = -speedSign * Math.min(1.4, maxNormalSpeed * 0.12);
          } else {
            // Slow gentle bump: bleed smoothly without harsh sudden stop
            carState.speed *= Math.exp(-9.0 * dt);
          }
          impactCooldown = 0.22;
        } else {
          // Continuously pushing nose into wall: smooth gradual bleed, no jerky snap
          carState.speed *= Math.exp(-10.0 * dt);
        }
      } else {
        // Glancing or angled collision: preserve tangential momentum & glide along surface
        if (isFreshImpact && maxNormalSpeed > 4.2) {
          // One-time normal impulse loss scaled smoothly by actual perpendicular impact speed
          const severity = Math.min(1.0, (maxNormalSpeed - 4.2) / 28.0);
          const targetSlideSpeed = absSpeed * (1.0 - (1.0 - tangentFactor) * (0.28 + 0.45 * severity));
          carState.speed = speedSign * Math.max(0, targetSlideSpeed);
          impactCooldown = 0.16;
        }

        // Frame-rate-independent wall friction (very gentle on light brushes, firmer on steeper angles)
        const scrapeDrag = 0.35 + maxImpactRatio * maxImpactRatio * 2.8;
        carState.speed *= Math.exp(-scrapeDrag * dt);

        // Smoothly steer chassis heading parallel to the wall so it glides off cleanly
        const cross = fwdX * bestNormalZ - fwdZ * bestNormalX;
        if (Math.abs(cross) > 0.02 && absSpeed > 0.35) {
          const alignStrength = (0.9 + maxImpactRatio * 2.1) * Math.min(1.0, absSpeed / 8.0);
          carState.heading -= Math.sign(cross) * alignStrength * dt * speedSign;
        }
      }
    }

    wasColliding = hitAny && maxPenetration > 0.002;
  }

  // -----------------------------------------------------------
  // 13. DISTRICT / ZONE DETECTOR (For subtle HUD orientation)
  // -----------------------------------------------------------
  function getZoneName(x, z) {
    if (Math.abs(x) < 18 && z > -24.2 && z < 24.5) return 'DARKLINES GARAGE';
    if (z < -312) return 'NORTH EXPRESSWAY';
    if (x < -82 && z > -150 && z < -20) return 'DRIFT PLAZA';
    if (x > 84 && z > -256 && z < -98) return 'INDUSTRIAL ZONE';
    if (x > 12 && z >= -98 && z < -4) return 'TOUGE CORNERS';
    if (Math.abs(x) < 16 && z >= -98 && z <= -24) return 'MAIN AVENUE';
    if (x < -195) return 'WEST RING ROAD';
    return 'DOWNTOWN DISTRICT';
  }

  return {
    worldGroup,
    mapData,
    updateOpenWorld,
    resolveWorldCollisions,
    getZoneName,
  };
}
