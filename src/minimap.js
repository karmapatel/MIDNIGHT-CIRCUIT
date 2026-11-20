// =============================================================
// MIDNIGHT CIRCUIT - DARKLINES :: Circular Radar Mini-Map HUD
// Pre-renders the exact open-world road network offscreen and
// draws a smooth heading-up circular navigation radar each frame.
// =============================================================

export function createMinimap(canvasEl, mapData) {
  if (!canvasEl || !mapData) return null;

  const ctx = canvasEl.getContext('2d');
  if (!ctx) return null;

  // Offscreen static world map canvas (580m x 580m @ 2.0 px/m = 1160 x 1160)
  const MAP_ORIGIN_X = -290;
  const MAP_ORIGIN_Z = -440;
  const MAP_SPAN = 580;
  const OFFSCREEN_PPM = 2.0; // pixels per world meter
  const OFFSCREEN_SIZE = Math.round(MAP_SPAN * OFFSCREEN_PPM);

  const offscreen = document.createElement('canvas');
  offscreen.width = OFFSCREEN_SIZE;
  offscreen.height = OFFSCREEN_SIZE;
  const octx = offscreen.getContext('2d');

  const toOX = (wx) => (wx - MAP_ORIGIN_X) * OFFSCREEN_PPM;
  const toOZ = (wz) => (wz - MAP_ORIGIN_Z) * OFFSCREEN_PPM;

  // -----------------------------------------------------------
  // 1. Pre-Render Static Open-World Layout (Runs Once at Startup)
  // -----------------------------------------------------------
  function bakeStaticMap() {
    // Deep midnight slate base
    octx.fillStyle = '#050914';
    octx.fillRect(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE);

    // Subtle tactical radar coordinate grid (every 40m)
    octx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    octx.lineWidth = 1;
    const gridStep = 40;
    for (let wx = -280; wx <= 280; wx += gridStep) {
      const x = toOX(wx);
      octx.beginPath();
      octx.moveTo(x, 0);
      octx.lineTo(x, OFFSCREEN_SIZE);
      octx.stroke();
    }
    for (let wz = -420; wz <= 120; wz += gridStep) {
      const z = toOZ(wz);
      octx.beginPath();
      octx.moveTo(0, z);
      octx.lineTo(OFFSCREEN_SIZE, z);
      octx.stroke();
    }

    // Building, warehouse & container footprints (subtle architectural silhouettes)
    if (mapData.buildings) {
      for (let i = 0; i < mapData.buildings.length; i++) {
        const b = mapData.buildings[i];
        if (b.tag !== 'building' && b.tag !== 'warehouse' && b.tag !== 'container') continue;
        const x = toOX(b.minX);
        const y = toOZ(b.minZ);
        const w = (b.maxX - b.minX) * OFFSCREEN_PPM;
        const h = (b.maxZ - b.minZ) * OFFSCREEN_PPM;

        if (b.tag === 'warehouse') {
          octx.fillStyle = 'rgba(30, 41, 59, 0.65)';
          octx.strokeStyle = 'rgba(245, 158, 11, 0.24)';
        } else if (b.tag === 'container') {
          octx.fillStyle = 'rgba(51, 65, 85, 0.72)';
          octx.strokeStyle = 'rgba(251, 146, 60, 0.25)';
        } else {
          octx.fillStyle = 'rgba(15, 23, 42, 0.90)';
          octx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
        }
        octx.lineWidth = 1.5;
        octx.fillRect(x, y, w, h);
        octx.strokeRect(x, y, w, h);
      }
    }

    // Open Exploration Areas (Drift Plaza & Industrial Cargo Yard)
    if (mapData.plazas) {
      mapData.plazas.forEach((p) => {
        const x = toOX(p.x1);
        const y = toOZ(p.z1);
        const w = (p.x2 - p.x1) * OFFSCREEN_PPM;
        const h = (p.z2 - p.z1) * OFFSCREEN_PPM;

        octx.fillStyle = p.kind === 'plaza'
          ? 'rgba(30, 48, 72, 0.78)'
          : 'rgba(38, 46, 62, 0.74)';
        octx.fillRect(x, y, w, h);

        octx.strokeStyle = p.kind === 'plaza'
          ? 'rgba(34, 211, 238, 0.42)'
          : 'rgba(245, 158, 11, 0.35)';
        octx.lineWidth = 2.4;
        octx.strokeRect(x, y, w, h);
      });
    }

    // Road Network Pass 1: Outer Crisp Road Shoulder / Halo
    octx.lineCap = 'butt';
    octx.lineJoin = 'round';

    const drawAllRoads = (extraWidth, fillStyle, isCenterline = false) => {
      // Straight road segments
      mapData.straightRoads.forEach((r) => {
        octx.strokeStyle = fillStyle;
        octx.lineWidth = isCenterline ? 1.5 : (r.width * OFFSCREEN_PPM + extraWidth);
        if (isCenterline) octx.setLineDash([7, 7]);
        else octx.setLineDash([]);
        octx.beginPath();
        octx.moveTo(toOX(r.x1), toOZ(r.z1));
        octx.lineTo(toOX(r.x2), toOZ(r.z2));
        octx.stroke();
      });

      // Curved sweepers & technical corner section
      mapData.curvedRoads.forEach((cr) => {
        if (!cr.pts || cr.pts.length < 2) return;
        octx.strokeStyle = fillStyle;
        octx.lineWidth = isCenterline ? 1.5 : (cr.width * OFFSCREEN_PPM + extraWidth);
        if (isCenterline) octx.setLineDash([7, 7]);
        else octx.setLineDash([]);
        octx.beginPath();
        octx.moveTo(toOX(cr.pts[0].x), toOZ(cr.pts[0].z));
        for (let i = 1; i < cr.pts.length; i++) {
          octx.lineTo(toOX(cr.pts[i].x), toOZ(cr.pts[i].z));
        }
        octx.stroke();
      });

      octx.setLineDash([]);

      // Intersections (skip during centerline pass)
      if (!isCenterline) {
        mapData.intersections.forEach((inter) => {
          const w = inter.widthX * OFFSCREEN_PPM + extraWidth;
          const h = inter.widthZ * OFFSCREEN_PPM + extraWidth;
          octx.fillStyle = fillStyle;
          octx.fillRect(toOX(inter.cx) - w * 0.5, toOZ(inter.cz) - h * 0.5, w, h);
        });
      }
    };

    // Road outer glow/curb edge
    drawAllRoads(4.4, 'rgba(148, 163, 184, 0.50)', false);
    // Road primary asphalt body
    drawAllRoads(0.6, '#334155', false);
    // Crisp center lane dashes
    drawAllRoads(0, 'rgba(203, 213, 225, 0.34)', true);

    // Highlight Drift Plaza central circular island
    if (mapData.islands) {
      mapData.islands.forEach((isl) => {
        const ix = toOX(isl.x);
        const iz = toOZ(isl.z);
        const ir = isl.r * OFFSCREEN_PPM;
        octx.fillStyle = '#09111f';
        octx.beginPath();
        octx.arc(ix, iz, ir, 0, Math.PI * 2);
        octx.fill();
        octx.strokeStyle = '#22d3ee';
        octx.lineWidth = 2.6;
        octx.stroke();
      });
    }

    // Highlight Garage building + open doorway facing North (-Z)
    if (mapData.garage) {
      const g = mapData.garage;
      const gx = toOX(g.x1);
      const gz = toOZ(g.z1);
      const gw = (g.x2 - g.x1) * OFFSCREEN_PPM;
      const gh = (g.z2 - g.z1) * OFFSCREEN_PPM;

      octx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      octx.fillRect(gx, gz, gw, gh);
      octx.strokeStyle = '#f59e0b';
      octx.lineWidth = 3.2;
      octx.strokeRect(gx, gz, gw, gh);

      // Doorway notch opening on North side (-Z)
      const doorW = 10 * OFFSCREEN_PPM;
      octx.fillStyle = '#334155';
      octx.fillRect(toOX(g.exitX) - doorW * 0.5, gz - 4, doorW, 8);

      // Subtle Garage 'G' emblem centered inside
      octx.fillStyle = '#fbbf24';
      octx.font = '900 22px ui-monospace, SFMono-Regular, Menlo, monospace';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText('G', toOX(0), toOZ(2));
    }
  }

  bakeStaticMap();

  // -----------------------------------------------------------
  // 2. Per-Frame Circular Heading-Up Radar Rendering
  // -----------------------------------------------------------
  let currentDpr = 0;
  let cssSize = 0;
  let smoothViewRadius = 128; // World meters visible from center to rim

  function syncCanvasSize() {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetSize = Math.max(88, Math.round(rect.width || 136));
    if (targetSize !== cssSize || dpr !== currentDpr) {
      cssSize = targetSize;
      currentDpr = dpr;
      canvasEl.width = Math.round(cssSize * dpr);
      canvasEl.height = Math.round(cssSize * dpr);
    }
  }

  function update(carState, dt = 0.016) {
    if (!carState) return;
    syncCanvasSize();

    const w = cssSize;
    const h = cssSize;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = w * 0.5 - 3;

    // Smooth speed-adaptive radar zoom (120m at low speed -> 170m at 200 km/h)
    const speedKmh = Math.abs(carState.speed || 0) * 3.6;
    const targetViewRadius = 120 + Math.min(1, speedKmh / 190) * 52;
    smoothViewRadius += (targetViewRadius - smoothViewRadius) * Math.min(1, dt * 4.5);

    const worldPPM = radius / smoothViewRadius;
    const drawScale = worldPPM / OFFSCREEN_PPM;

    const px = carState.position.x;
    const pz = carState.position.z;
    const heading = carState.heading;

    ctx.save();
    ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // 1. Circular clip region
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Base fill inside circle
    ctx.fillStyle = '#040812';
    ctx.fillRect(0, 0, w, h);

    // 2. Draw rotated heading-up pre-baked open-world road map
    // Verified transform: rotate(+heading) aligns world forward (-sin(h), -cos(h)) straight UP!
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);
    ctx.scale(drawScale, drawScale);
    ctx.drawImage(offscreen, -toOX(px), -toOZ(pz));
    ctx.restore();

    // 3. Subtle concentric tactical radar range ring & smoked edge vignette
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    const vig = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius);
    vig.addColorStop(0, 'rgba(2, 6, 23, 0)');
    vig.addColorStop(0.78, 'rgba(2, 6, 23, 0.25)');
    vig.addColorStop(1, 'rgba(2, 6, 23, 0.78)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // 4. Subtle forward headlight/vision cone emanating from player marker
    const coneGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy - radius * 0.28, radius * 0.42);
    coneGrad.addColorStop(0, 'rgba(34, 211, 238, 0.24)');
    coneGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius * 0.44, -Math.PI * 0.5 - 0.38, -Math.PI * 0.5 + 0.38);
    ctx.closePath();
    ctx.fill();

    // 5. Center Player Directional Chevron (GT-R Position)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = 'rgba(6, 182, 212, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#22d3ee';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(6.2, 6.2);
    ctx.lineTo(0, 3.2);
    ctx.lineTo(-6.2, 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end circular clip

    // 6. Crisp Outer Smoked Glass Bezel Ring (matching speedometer/tachometer gauges)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle inner cyan accent arc at top (forward heading tick)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI * 0.5 - 0.14, -Math.PI * 0.5 + 0.14);
    ctx.stroke();

    // 7. Orbiting Garage Home Directional Pip (when garage is outside current radar view)
    const gdx = 0 - px;
    const gdz = -10 - pz;
    const gDist = Math.hypot(gdx, gdz);
    if (gDist > smoothViewRadius * 0.86) {
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const rsx = gdx * cosH - gdz * sinH;
      const rsy = gdx * sinH + gdz * cosH;
      const ang = Math.atan2(rsy, rsx);
      const pipR = radius - 1;
      const gx = cx + Math.cos(ang) * pipR;
      const gy = cy + Math.sin(ang) * pipR;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(ang + Math.PI * 0.5);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(3.6, 2.5);
      ctx.lineTo(-3.6, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 8. Orbiting North ('N') Cardinal Compass Pip along the bezel
    const nDirX = Math.sin(heading);
    const nDirY = -Math.cos(heading);
    const nR = radius - 9;
    const nx = cx + nDirX * nR;
    const ny = cy + nDirY * nR;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fb7185';
    ctx.font = '800 8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);

    ctx.restore();
  }

  return { update };
}
