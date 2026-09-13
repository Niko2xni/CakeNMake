import * as THREE from 'three';
import { hexToRgb, dim, blendHex } from './cakeMath';

/**
 * Generates a shared grayscale roughness map.
 * Same for every flavor — only material tint changes.
 */
export function buildRoughnessMap(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d4d4d4";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const v = Math.floor(Math.random() * 60 + 165);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Side texture — physically-motivated U-shaped gradient:
 *   top    (heat-exposed crust)  → dark/golden, via bakedTop/bakedRim
 *   middle (pan-shielded side)   → lightest, via sideCenter
 *   bottom (direct pan contact)  → darkest, via bottomBake
 * Pore/fiber density and crust band width are driven by the per-flavor
 * material profile.
 */
export function buildSideTexture(colors, profile = {}) {
  const {
    poreDensity = 1, poreSize = 1, fiberStrength = 1,
    moisture = 0.5, bakeContrast = 0.8, crustThickness = 0.15,
  } = profile;

  const w = 1024, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  const crust = Math.min(Math.max(crustThickness, 0.04), 0.3);
  // Floor so pale flavors (vanilla/default/cheese) still get visible crust
  // and blotch definition instead of collapsing to near-nothing.
  const contrast = Math.max(Math.min(Math.max(bakeContrast, 0), 1), 0.7);

  const sideBase = colors.sideCenter ?? colors.crumbHighlight;
  const moistTint = blendHex(sideBase, colors.crumbHighlight, moisture * 0.18);
  const topRim = blendHex(sideBase, colors.bakedRim, contrast);
  const topCrust = blendHex(sideBase, colors.bakedTop, contrast * 0.85);
  const botTrans = blendHex(sideBase, colors.crumbMid, contrast * 0.7);
  const botBase = blendHex(sideBase, colors.bottomBake, contrast);

  // ── U-shaped base gradient with uneven transitions ───────────────────────
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topRim);
  grad.addColorStop(crust * 0.4, topCrust);
  grad.addColorStop(crust, moistTint);
  grad.addColorStop(0.5, moistTint);
  grad.addColorStop(1 - crust, moistTint);
  grad.addColorStop(1 - crust * 0.4, botTrans);
  grad.addColorStop(1, botBase);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // ── Whole-surface color variation (more organic, less uniform) ───────────
  const drawSoftBlotch = (cx, cy, r, tintHex, alpha) => {
    const rgb = hexToRgb(tintHex);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // More varied warm blotches for uneven browning
  const warmCount = 12 + Math.round(contrast * 12);
  for (let i = 0; i < warmCount; i++) {
    const size = 30 + Math.random() * 80;
    const alpha = (0.05 + Math.random() * 0.12) * (0.4 + contrast * 0.8);
    drawSoftBlotch(
      Math.random() * w, Math.random() * h * 0.3, // Concentrated near top
      size,
      colors.bakedTop,
      alpha
    );
  }

  // Cool blotches for moisture variation
  const coolCount = 10 + Math.round(moisture * 8);
  for (let i = 0; i < coolCount; i++) {
    drawSoftBlotch(
      Math.random() * w, h * 0.15 + Math.random() * h * 0.7,
      25 + Math.random() * 65,
      colors.crumbHighlight,
      0.03 + Math.random() * 0.09
    );
  }

  // ── Sharper crust-edge darkening with variation ───────────────────────────
  const edgeBand = Math.max(crust * 0.5, 0.06);
  const topEdge = ctx.createLinearGradient(0, 0, 0, h * edgeBand);
  topEdge.addColorStop(0, `rgba(0,0,0,${0.20 + contrast * 0.25})`);
  topEdge.addColorStop(0.6, `rgba(0,0,0,${0.08 + contrast * 0.10})`);
  topEdge.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topEdge;
  ctx.fillRect(0, 0, w, h * edgeBand);

  const botEdge = ctx.createLinearGradient(0, h * (1 - edgeBand), 0, h);
  botEdge.addColorStop(0, "rgba(0,0,0,0)");
  botEdge.addColorStop(0.4, `rgba(0,0,0,${0.10 + contrast * 0.12})`);
  botEdge.addColorStop(1, `rgba(0,0,0,${0.25 + contrast * 0.28})`);
  ctx.fillStyle = botEdge;
  ctx.fillRect(0, h * (1 - edgeBand), w, h * edgeBand);

  // ── Uneven baking patches on crust bands (more pronounced) ───────────────
  const topBandH = h * crust * 2.5;
  const topBlotchCount = 18 + Math.round(contrast * 14);
  for (let i = 0; i < topBlotchCount; i++) {
    const darker = Math.random() > 0.4;
    drawSoftBlotch(
      Math.random() * w, Math.random() * topBandH,
      14 + Math.random() * 40,
      darker ? colors.bakedRim : moistTint,
      (darker ? (0.12 + Math.random() * 0.18) : (0.06 + Math.random() * 0.10)) * (0.5 + contrast * 0.8)
    );
  }
  const botBandH = h * crust * 1.8;
  const botBlotchCount = 8 + Math.round(contrast * 8);
  for (let i = 0; i < botBlotchCount; i++) {
    drawSoftBlotch(
      Math.random() * w, h - Math.random() * botBandH,
      10 + Math.random() * 28,
      colors.bottomBake,
      (0.10 + Math.random() * 0.16) * (0.5 + contrast * 0.7)
    );
  }

  // ── Horizontal sponge fiber streaks (more natural variation) ─────────────
  const fiberRgb = hexToRgb(colors.crumbMid);
  const fiberFill = dim(fiberRgb, 0.70);
  const fiberCount = Math.round(700 * Math.min(Math.max(fiberStrength, 0.2), 2));
  for (let i = 0; i < fiberCount; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = (Math.random() * 0.16 + 0.03) * Math.min(Math.max(fiberStrength, 0.3), 1.6);
    ctx.fillStyle = `rgba(${fiberFill},${a})`;
    const length = Math.random() * 15 + 1.5;
    ctx.fillRect(x, y, length, Math.random() * 1.8 + 0.2);
  }

  // ── Pores — 3-layer structure: dark cavity + lighter rim + specular glint ─
  const cavityRgb = hexToRgb(blendHex(colors.bakedRim, '#000000', 0.35));
  const rimRgb = hexToRgb(blendHex(colors.sideCenter ?? colors.crumbHighlight, colors.crumbHighlight, 0.5));
  const glintRgb = hexToRgb(colors.crumbHighlight);
  const poreRadiusMul = Math.min(Math.max(poreSize, 0.4), 2);
  const totalPores = Math.round(4200 * Math.min(Math.max(poreDensity, 0.3), 2));
  const largePores = Math.round(55 * Math.min(Math.max(poreDensity, 0.3), 2));

  const drawPore = (x, y, r) => {
    // Layer 1 — dark cavity centre
    const cav = ctx.createRadialGradient(x, y, 0, x, y, r);
    cav.addColorStop(0, `rgba(${cavityRgb[0]},${cavityRgb[1]},${cavityRgb[2]},${0.48 + Math.random() * 0.28})`);
    cav.addColorStop(0.55, `rgba(${cavityRgb[0]},${cavityRgb[1]},${cavityRgb[2]},${0.18 + Math.random() * 0.14})`);
    cav.addColorStop(1, `rgba(${cavityRgb[0]},${cavityRgb[1]},${cavityRgb[2]},0)`);
    ctx.fillStyle = cav;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Layer 2 — lighter rim (ambient light catching the pore wall)
    const rim = ctx.createRadialGradient(x, y, r * 0.45, x, y, r * 1.05);
    rim.addColorStop(0, `rgba(${rimRgb[0]},${rimRgb[1]},${rimRgb[2]},0)`);
    rim.addColorStop(1, `rgba(${rimRgb[0]},${rimRgb[1]},${rimRgb[2]},${0.11 + Math.random() * 0.09})`);
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, Math.PI * 2); ctx.fill();

    // Layer 3 — tiny specular glint on ~45% of pores
    if (Math.random() > 0.55) {
      const gx = x - r * 0.28, gy = y - r * 0.28;
      const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.38);
      gl.addColorStop(0, `rgba(${glintRgb[0]},${glintRgb[1]},${glintRgb[2]},${0.12 + Math.random() * 0.12})`);
      gl.addColorStop(1, `rgba(${glintRgb[0]},${glintRgb[1]},${glintRgb[2]},0)`);
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(gx, gy, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
  };

  for (let i = 0; i < totalPores; i++) {
    drawPore(Math.random() * w, Math.random() * h, (Math.random() * 1.3 + 0.45) * poreRadiusMul);
  }
  for (let i = 0; i < largePores; i++) {
    drawPore(Math.random() * w, Math.random() * h, (Math.random() * 2.2 + 1.6) * poreRadiusMul);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Top surface texture — simulates uneven baking on the cake top
 * with darker rim, caramelization patches, and subtle crumb texture
 */
export function buildTopTexture(colors, profile = {}) {
  const {
    bakeContrast = 0.8,
  } = profile;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const contrast = Math.min(Math.max(bakeContrast, 0), 1);

  // Base color - lighter center, darker toward edges
  const baseGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  baseGrad.addColorStop(0, colors.crumbHighlight);
  baseGrad.addColorStop(0.4, colors.crumbBase);
  baseGrad.addColorStop(0.7, colors.crumbMid);
  baseGrad.addColorStop(1, colors.bakedTop);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Uneven browning patches
  const drawBlotch = (cx, cy, r, color, alpha) => {
    const rgb = hexToRgb(color);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Darker caramelization patches (random distribution)
  const blotchCount = 16 + Math.round(contrast * 14);
  for (let i = 0; i < blotchCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * size * 0.4;
    const cx = size / 2 + Math.cos(angle) * dist;
    const cy = size / 2 + Math.sin(angle) * dist;
    drawBlotch(
      cx, cy,
      18 + Math.random() * 45,
      colors.bakedRim,
      (0.12 + Math.random() * 0.22) * contrast
    );
  }

  // Subtle crumb texture
  const crumbRgb = hexToRgb(colors.crumbMid);
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = 0.02 + Math.random() * 0.05;
    ctx.fillStyle = `rgba(${crumbRgb[0]},${crumbRgb[1]},${crumbRgb[2]},${a})`;
    ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }

  // Small pores on top surface
  const poreRgb = hexToRgb(blendHex(colors.bakedRim, '#000000', 0.3));
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2 + 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${poreRgb[0]},${poreRgb[1]},${poreRgb[2]},${0.3 + Math.random() * 0.2})`);
    g.addColorStop(1, `rgba(${poreRgb[0]},${poreRgb[1]},${poreRgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Build a vertical gradient texture from color stops
 * @param {Array} colorStops - Array of {color: hex, position: 0-1} objects
 * @param {number} width - Texture width (default 512)
 * @param {number} height - Texture height (default 512)
 * @returns {THREE.CanvasTexture}
 */
export function buildGradientTexture(colorStops, width = 512, height = 512) {
  console.log('Building gradient texture with stops:', colorStops);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Sort color stops by position
  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
  console.log('Sorted stops:', sortedStops);

  // Create linear gradient from top to bottom
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  sortedStops.forEach(stop => {
    gradient.addColorStop(stop.position, stop.color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  console.log('Gradient texture created successfully with improved settings');
  return texture;
}
