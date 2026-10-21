/**
 * Blueprint 2D Pattern Schematics
 * Renders dumbed-down geometric mock copies (unrolled 2D elevations) of
 * cake designs (Side Design & Drip Surface Treatment) directly in vector primitives.
 */

import { INK } from './blueprintBubbles';

export function hexToRgb(hex, fallback = [70, 55, 55]) {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || fallback[0],
      parseInt(clean[1] + clean[1], 16) || fallback[1],
      parseInt(clean[2] + clean[2], 16) || fallback[2],
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || fallback[0],
      parseInt(clean.slice(2, 4), 16) || fallback[1],
      parseInt(clean.slice(4, 6), 16) || fallback[2],
    ];
  }
  return fallback;
}

/**
 * Renders the 2D Unrolled Pattern Elevation for Side Design
 */
export function drawSidePatternSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  treatmentId = 'checkeredPattern',
  variantId = 'straightGrid',
  color = '#3D2314',
  colorName = 'Chocolate',
  patternName = 'Straight Grid',
  baseFinish = '',
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D PATTERN DRAWING
  drawBadge(doc, '2D PATTERN DRAWING', x + 3, y + 3, [35, 30, 30]);

  // 2. Unrolled Cake Wall Box (representing the circumference wall)
  const wallMarginX = 8;
  const wallTopY = y + 14;
  const wallW = w - wallMarginX * 2;
  const wallH = h - 26;
  const wallX = x + wallMarginX;
  const wallY = wallTopY;

  // Background of unrolled wall (subtle frosted base)
  doc.setFillColor(255, 255, 255);
  doc.rect(wallX, wallY, wallW, wallH, 'F');

  // 3. Render dumbed down geometric pattern shapes
  const rgb = hexToRgb(color);
  renderSideShapes(doc, {
    wallX,
    wallY,
    wallW,
    wallH,
    treatmentId,
    variantId,
    rgb,
  });

  // 4. Bottom footer of card: Pattern & Color indicators
  const footerY = y + h - 5;
  // Color chip circle
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  // Label text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(patternName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + 9, footerY + 1.2);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the 2D Pattern Drawing for Surface Treatment (Glaze Drip)
 */
export function drawSurfaceTreatmentSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  patternId = 'longGaps',
  patternName = 'Natural Tear',
  color = '#3D2314',
  colorName = 'Chocolate',
  contour = null,
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container (clean, crisp white card)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D PATTERN DRAWING
  drawBadge(doc, '2D PATTERN DRAWING', x + 3, y + 3, [35, 30, 30]);

  // 2. Unrolled Cake Wall Box for Drip Drawing
  const wallMarginX = 8;
  const wallTopY = y + 14;
  const wallW = w - wallMarginX * 2;
  const wallH = h - 25;
  const wallX = x + wallMarginX;
  const wallY = wallTopY;

  // Background of unrolled wall (clean white base)
  doc.setFillColor(255, 255, 255);
  doc.rect(wallX, wallY, wallW, wallH, 'F');

  // 3. Render 2D drawing depicting the 3D render design
  const rgb = hexToRgb(color);
  renderDripDrawing(doc, {
    wallX,
    wallY,
    wallW,
    wallH,
    patternId,
    rgb,
  });

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(patternName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + 9, footerY + 1.2);

  doc.restoreGraphicsState?.();
}

function drawBadge(doc, label, bx, by, bgColor = [35, 30, 30]) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const text = String(label).toUpperCase();
  const tw = doc.getTextWidth(text);
  const bw = tw + 6;
  const bh = 4.8;
  doc.setFillColor(...bgColor);
  doc.roundedRect(bx, by, bw, bh, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(text, bx + bw / 2, by + bh - 1.4, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometric Shapes Generation for Side Designs
// ─────────────────────────────────────────────────────────────────────────────

function renderSideShapes(doc, { wallX, wallY, wallW, wallH, treatmentId, variantId, rgb }) {
  doc.setFillColor(...rgb);
  doc.setDrawColor(...rgb);

  const str = String(variantId || '').toLowerCase();

  switch (treatmentId) {
    case 'checkeredPattern': {
      const cols = 10;
      const rows = 5;
      const cellW = wallW / cols;
      const cellH = wallH / rows;
      const pad = 0.5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldFill = false;
          if (str.includes('side') || str.includes('x')) {
            shouldFill = (c % 3 === 0 && r % 2 === 0) || (c === 0 || c === cols - 1);
          } else if (str.includes('right') || str.includes('diag')) {
            shouldFill = (c + r) % 3 === 0;
          } else if (str.includes('outer')) {
            shouldFill = (r === 0 || r === rows - 1) && c % 2 === 0;
          } else if (str.includes('inner')) {
            shouldFill = (r === 1 || r === 2 || r === 3) && c % 2 === 0;
          } else {
            // standard straight grid
            shouldFill = (r + c) % 2 === 0;
          }

          if (shouldFill) {
            doc.rect(wallX + c * cellW + pad, wallY + r * cellH + pad, cellW - pad * 2, cellH - pad * 2, 'F');
          }
        }
      }
      break;
    }

    case 'trianglePattern': {
      // Replicate 3D render: broad, spread-out equilateral triangles in a 3-2-3 staggered pattern
      const cols = 5;
      const rows = 3;
      const cellW = wallW / cols;
      const cellH = wallH / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx1 = wallX + c * cellW;
          const cx2 = cx1 + cellW;
          const midX = cx1 + cellW / 2;
          const cy1 = wallY + r * cellH;
          const cy2 = cy1 + cellH;

          let shouldFill = false;
          if (str.includes('right') || str.includes('diag')) {
            shouldFill = (c + r) % 2 === 0;
          } else if (str.includes('outer')) {
            shouldFill = (r === 0 || r === rows - 1) && (c % 2 === 0);
          } else if (str.includes('inner')) {
            shouldFill = r === 1 && (c % 2 === 1);
          } else {
            // standard full pattern / checkerboard: alternating 3-2-3 staggered layout
            shouldFill = (c + r) % 2 === 0;
          }

          if (shouldFill) {
            // Broad base and comfortable horizontal spreading directly replicating 3D render
            const padX = cellW * 0.08;
            const padY = cellH * 0.16;
            doc.setFillColor(...rgb);
            doc.triangle(cx1 + padX, cy2 - padY, cx2 - padX, cy2 - padY, midX, cy1 + padY, 'F');
            doc.setDrawColor(25, 20, 20);
            doc.setLineWidth(0.85);
            doc.triangle(cx1 + padX, cy2 - padY, cx2 - padX, cy2 - padY, midX, cy1 + padY, 'S');
          }
        }
      }
      break;
    }

    case 'chevronPattern': {
      const waves = str.includes('tight') ? 4 : str.includes('wide') ? 2 : 3;
      const stepH = wallH / (waves + 1);
      const segs = 10;
      const segW = wallW / segs;
      doc.setLineWidth(str.includes('tight') ? 0.7 : 1.3);

      for (let w = 1; w <= waves; w++) {
        const baseY = wallY + w * stepH;
        for (let s = 0; s < segs; s++) {
          const x1 = wallX + s * segW;
          const x2 = x1 + segW;
          const y1 = s % 2 === 0 ? baseY - 3.5 : baseY + 3.5;
          const y2 = s % 2 === 0 ? baseY + 3.5 : baseY - 3.5;
          doc.line(x1, y1, x2, y2);
        }
      }
      break;
    }

    case 'scatterPearls': {
      if (str.includes('diamond') || str.includes('grid')) {
        const cols = 8;
        const rows = 4;
        const stepX = wallW / cols;
        const stepY = wallH / rows;
        doc.setLineWidth(0.2);
        doc.setDrawColor(...rgb);
        // Diamond lattice lines
        for (let r = 0; r <= rows; r++) {
          for (let c = 0; c <= cols; c++) {
            const px = wallX + c * stepX;
            const py = wallY + r * stepY;
            doc.circle(px, py, 1.2, 'F');
          }
        }
      } else if (str.includes('row')) {
        const rows = [0.25, 0.5, 0.75];
        const count = 12;
        rows.forEach((ry) => {
          for (let c = 0; c < count; c++) {
            const px = wallX + 3 + c * ((wallW - 6) / (count - 1));
            const py = wallY + wallH * ry;
            doc.circle(px, py, 1.3, 'F');
          }
        });
      } else {
        // Scatter pattern
        const pearls = [
          [0.1, 0.2, 1.4], [0.22, 0.6, 1.1], [0.35, 0.3, 1.6], [0.48, 0.75, 1.2],
          [0.6, 0.35, 1.5], [0.72, 0.7, 1.1], [0.85, 0.25, 1.4], [0.93, 0.55, 1.2],
          [0.15, 0.8, 1.3], [0.28, 0.15, 1.5], [0.42, 0.5, 1.2], [0.55, 0.15, 1.3],
          [0.68, 0.85, 1.6], [0.8, 0.5, 1.4],
        ];
        pearls.forEach(([rx, ry, pr]) => {
          doc.circle(wallX + rx * wallW, wallY + ry * wallH, pr, 'F');
        });
      }
      break;
    }

    case 'pipingScrolls': {
      const swags = 5;
      const swagW = wallW / swags;
      doc.setLineWidth(0.9);
      for (let s = 0; s < swags; s++) {
        const sx1 = wallX + s * swagW;
        const sx2 = sx1 + swagW;
        const midX = sx1 + swagW / 2;
        const topY = wallY + wallH * 0.35;
        const botY = wallY + wallH * 0.65;

        // Curved swag arcs
        doc.line(sx1, topY, midX, botY);
        doc.line(midX, botY, sx2, topY);
        // Fleur / crest dot
        doc.circle(midX, botY + 1.5, 1.3, 'F');
        doc.circle(sx1, topY, 1.0, 'F');
      }
      break;
    }

    case 'sunshinePlay': {
      const clusters = 4;
      const step = wallW / clusters;
      for (let c = 0; c < clusters; c++) {
        const cx = wallX + (c + 0.5) * step;
        const cy = wallY + wallH * 0.62;

        // Cloud puffs
        doc.circle(cx - 3, cy, 2.5, 'F');
        doc.circle(cx, cy - 1.8, 3.2, 'F');
        doc.circle(cx + 3, cy, 2.5, 'F');
        doc.rect(cx - 4, cy, 8, 2.5, 'F');

        // Star bursts above
        const starX = cx;
        const starY = wallY + wallH * 0.28;
        doc.circle(starX, starY, 1.2, 'F');
        doc.setLineWidth(0.5);
        doc.line(starX - 2.5, starY, starX + 2.5, starY);
        doc.line(starX, starY - 2.5, starX, starY + 2.5);
      }
      break;
    }

    case 'victorianLambeth': {
      const swags = 4;
      const swagW = wallW / swags;
      doc.setLineWidth(0.7);

      for (let s = 0; s < swags; s++) {
        const x1 = wallX + s * swagW;
        const x2 = x1 + swagW;
        const mx = x1 + swagW / 2;

        // Tier 1 swag
        doc.line(x1, wallY + 3, mx, wallY + 13);
        doc.line(mx, wallY + 13, x2, wallY + 3);

        // Tier 2 swag
        doc.line(x1, wallY + 7, mx, wallY + 18);
        doc.line(mx, wallY + 18, x2, wallY + 7);

        // Hanging drop point
        doc.circle(mx, wallY + 20, 1.2, 'F');
        // Rosette at swag junction
        doc.circle(x1, wallY + 4, 1.5, 'F');
      }
      doc.circle(wallX + wallW, wallY + 4, 1.5, 'F');
      break;
    }

    default: {
      // Clean fallback grid
      const cols = 8;
      const rows = 4;
      const cellW = wallW / cols;
      const cellH = wallH / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            doc.rect(wallX + c * cellW + 0.6, wallY + r * cellH + 0.6, cellW - 1.2, cellH - 1.2, 'F');
          }
        }
      }
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D Drawing Style Generation for Drip Surface Treatment
// Recreates the organic continuous wavy drip curve (matching user reference sketch)
// ─────────────────────────────────────────────────────────────────────────────

function renderDripDrawing(doc, { wallX, wallY, wallW, wallH, patternId, rgb }) {
  const str = String(patternId || '').toLowerCase();

  let keyNodes;
  if (str.includes('alt')) {
    // Long & Short Drips: alternating tall and short fingers
    keyNodes = [
      [0.00, 0.20],
      [0.125, 0.86], [0.25, 0.20],
      [0.375, 0.52], [0.50, 0.20],
      [0.625, 0.86], [0.75, 0.20],
      [0.875, 0.52], [1.00, 0.20],
    ];
  } else if (str.includes('short') && !str.includes('wave')) {
    // Short Drips: uniform ring of equal short drips
    const dripY = 0.52;
    const crestY = 0.20;
    keyNodes = [
      [0.00, crestY],
      [0.125, dripY],
      [0.25, crestY],
      [0.375, dripY],
      [0.50, crestY],
      [0.625, dripY],
      [0.75, crestY],
      [0.875, dripY],
      [1.00, crestY],
    ];
  } else if (str.includes('longwave') || (str.includes('full') && str.includes('wave'))) {
    // Full Coverage / Long Wave: soft ripple near base
    const dripY = 0.86;
    const crestY = 0.76;
    keyNodes = [
      [0.00, (dripY + crestY) / 2],
      [0.10, dripY], [0.20, crestY],
      [0.30, dripY], [0.40, crestY],
      [0.50, dripY], [0.60, crestY],
      [0.70, dripY], [0.80, crestY],
      [0.90, dripY], [1.00, (dripY + crestY) / 2],
    ];
  } else if (str.includes('midwave') || (str.includes('mid') && str.includes('wave'))) {
    // Mid Coverage / Mid Wave: soft ripple midway down
    const dripY = 0.54;
    const crestY = 0.44;
    keyNodes = [
      [0.00, (dripY + crestY) / 2],
      [0.10, dripY], [0.20, crestY],
      [0.30, dripY], [0.40, crestY],
      [0.50, dripY], [0.60, crestY],
      [0.70, dripY], [0.80, crestY],
      [0.90, dripY], [1.00, (dripY + crestY) / 2],
    ];
  } else if (str.includes('shortwave') || (str.includes('short') && str.includes('wave'))) {
    // Short Coverage / Short Wave: soft ripple near top
    const dripY = 0.26;
    const crestY = 0.16;
    keyNodes = [
      [0.00, (dripY + crestY) / 2],
      [0.10, dripY], [0.20, crestY],
      [0.30, dripY], [0.40, crestY],
      [0.50, dripY], [0.60, crestY],
      [0.70, dripY], [0.80, crestY],
      [0.90, dripY], [1.00, (dripY + crestY) / 2],
    ];
  } else if (str.includes('tinytip') || str.includes('curve')) {
    // Wave Curve: soft undulating edge
    const dripY = 0.40;
    const crestY = 0.20;
    keyNodes = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      keyNodes.push([i / count, crestY]);
      keyNodes.push([(i + 0.5) / count, dripY]);
    }
    keyNodes.push([1.00, crestY]);
  } else if (str.includes('uneven') || str.includes('fall')) {
    // Tear Fall: organic ganache coverage with varied teardrop drips
    keyNodes = [
      [0.00, 0.22],
      [0.125, 0.88], [0.25, 0.28],
      [0.375, 0.55], [0.50, 0.22],
      [0.625, 0.82], [0.75, 0.32],
      [0.875, 0.60], [1.00, 0.25],
    ];
  } else {
    // Natural Tear / Long Gaps (Default):
    // ALL DRIPS ARE EVENLY LENGTH at the drip (matching actual 3D render)
    // Continuous flowing curve with evenly spaced, evenly long rounded drips
    const dripY = 0.86;  // Consistent bottom depth for every drip
    const crestY = 0.20; // Consistent upper arch height
    keyNodes = [
      [0.00, crestY],
      [0.125, dripY], // Drip 1 (equal long)
      [0.25, crestY],  // Crest 1
      [0.375, dripY], // Drip 2 (equal long)
      [0.50, crestY],  // Crest 2
      [0.625, dripY], // Drip 3 (equal long)
      [0.75, crestY],  // Crest 3
      [0.875, dripY], // Drip 4 (equal long)
      [1.00, crestY],  // Crest 4
    ];
  }

  // Generate smooth cubic Bezier curve points with horizontal extrema tangents
  const curvePoints = [];
  for (let i = 0; i < keyNodes.length - 1; i++) {
    const p0 = { x: wallX + keyNodes[i][0] * wallW, y: wallY + keyNodes[i][1] * wallH };
    const p3 = { x: wallX + keyNodes[i + 1][0] * wallW, y: wallY + keyNodes[i + 1][1] * wallH };
    const dx = p3.x - p0.x;
    const p1 = { x: p0.x + dx * 0.5, y: p0.y };
    const p2 = { x: p3.x - dx * 0.5, y: p3.y };

    const samples = 24;
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const mt = 1 - t;
      const bx = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      const by = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      curvePoints.push({ x: bx, y: by });
    }
  }
  curvePoints.push({
    x: wallX + keyNodes[keyNodes.length - 1][0] * wallW,
    y: wallY + keyNodes[keyNodes.length - 1][1] * wallH,
  });

  // 1. Fill the glaze curtain from the top rim down to the wavy drip curve
  doc.setFillColor(...rgb);
  for (let i = 0; i < curvePoints.length - 1; i++) {
    const pt1 = curvePoints[i];
    const pt2 = curvePoints[i + 1];
    const stripW = Math.max(0.35, pt2.x - pt1.x + 0.12);
    const bottomY = Math.max(pt1.y, pt2.y);
    doc.rect(pt1.x, wallY, stripW, bottomY - wallY, 'F');
  }

  // 2. Bold 2D drawing style outline tracing the drip contour (matching user sketch)
  doc.setDrawColor(25, 20, 20); // Bold black marker stroke
  doc.setLineWidth(1.1); // Organic hand-drawn weight
  for (let i = 0; i < curvePoints.length - 1; i++) {
    doc.line(curvePoints[i].x, curvePoints[i].y, curvePoints[i + 1].x, curvePoints[i + 1].y);
  }
}

/**
 * Renders the 2D Pattern Drawing for Textured Buttercream Finish (Exterior Finish)
 */
export function drawTexturedFinishSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  texture = 'ridged',
  textureName = 'Ridged Comb',
  color = '#F5E6C8',
  colorName = 'Vanilla',
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container (crisp white card)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D PATTERN DRAWING
  drawBadge(doc, '2D PATTERN DRAWING', x + 3, y + 3, [35, 30, 30]);

  // 2. Unrolled Cake Wall Box (representing the circumference wall)
  const wallMarginX = 8;
  const wallTopY = y + 14;
  const wallW = w - wallMarginX * 2;
  const wallH = h - 25;
  const wallX = x + wallMarginX;
  const wallY = wallTopY;

  const rgb = hexToRgb(color);
  const highlightRgb = [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * 0.32)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * 0.32)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * 0.32)),
  ];
  const upperMidRgb = [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * 0.16)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * 0.16)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * 0.16)),
  ];
  const crownRgb = rgb;
  const lowerMidRgb = [
    Math.max(0, Math.round(rgb[0] * 0.86)),
    Math.max(0, Math.round(rgb[1] * 0.86)),
    Math.max(0, Math.round(rgb[2] * 0.86)),
  ];
  const shadowRgb = [
    Math.max(0, Math.round(rgb[0] * 0.70)),
    Math.max(0, Math.round(rgb[1] * 0.70)),
    Math.max(0, Math.round(rgb[2] * 0.70)),
  ];
  const creaseRgb = [
    Math.max(0, Math.round(rgb[0] * 0.48)),
    Math.max(0, Math.round(rgb[1] * 0.48)),
    Math.max(0, Math.round(rgb[2] * 0.48)),
  ];
  const specularColor = [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * 0.65)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * 0.65)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * 0.65)),
  ];

  // Base coat
  doc.setFillColor(...crownRgb);
  doc.rect(wallX, wallY, wallW, wallH, 'F');

  const str = String(texture || '').toLowerCase();
  if (str.includes('ribbon')) {
    // Ribbon Wrap: stacked horizontal convex ribbon bumps with upper highlight & lower groove shadow
    const bands = 5;
    const bandH = wallH / bands;
    for (let b = 0; b < bands; b++) {
      const by = wallY + b * bandH;
      // 1. Upper convex highlight band
      doc.setFillColor(...highlightRgb);
      doc.rect(wallX, by, wallW, bandH * 0.22, 'F');
      // 2. Upper transition swell
      doc.setFillColor(...upperMidRgb);
      doc.rect(wallX, by + bandH * 0.22, wallW, bandH * 0.20, 'F');
      // 3. Central crown body
      doc.setFillColor(...crownRgb);
      doc.rect(wallX, by + bandH * 0.42, wallW, bandH * 0.33, 'F');
      // 4. Lower curve bevel
      doc.setFillColor(...lowerMidRgb);
      doc.rect(wallX, by + bandH * 0.75, wallW, bandH * 0.17, 'F');
      // 5. Underside groove shadow
      doc.setFillColor(...shadowRgb);
      doc.rect(wallX, by + bandH * 0.92, wallW, bandH * 0.08, 'F');
      // 6. Specular crest glint line
      doc.setDrawColor(...specularColor);
      doc.setLineWidth(0.35);
      doc.line(wallX, by + bandH * 0.14, wallX + wallW, by + bandH * 0.14);
      // 7. Dark crease seam between bumps
      if (b < bands - 1) {
        doc.setDrawColor(...creaseRgb);
        doc.setLineWidth(0.65);
        doc.line(wallX, by + bandH, wallX + wallW, by + bandH);
      }
    }
  } else if (str.includes('vertical')) {
    // Vertical Piping: fluted vertical column bumps with side highlight & groove shadow
    const columns = 12;
    const colW = wallW / columns;
    for (let c = 0; c < columns; c++) {
      const cx = wallX + c * colW;
      doc.setFillColor(...highlightRgb);
      doc.rect(cx, wallY, colW * 0.30, wallH, 'F');
      doc.setFillColor(...crownRgb);
      doc.rect(cx + colW * 0.30, wallY, colW * 0.40, wallH, 'F');
      doc.setFillColor(...shadowRgb);
      doc.rect(cx + colW * 0.70, wallY, colW * 0.30, wallH, 'F');
      doc.setDrawColor(...specularColor);
      doc.setLineWidth(0.25);
      doc.line(cx + colW * 0.16, wallY, cx + colW * 0.16, wallY + wallH);
      if (c < columns - 1) {
        doc.setDrawColor(...creaseRgb);
        doc.setLineWidth(0.5);
        doc.line(cx + colW, wallY, cx + colW, wallY + wallH);
      }
    }
  } else {
    // Ridged Comb (default): horizontal combed ridges with upper highlight & lower groove shadow
    const ridgeCount = 8;
    const ridgeH = wallH / ridgeCount;
    for (let r = 0; r < ridgeCount; r++) {
      const ry = wallY + r * ridgeH;
      // 1. Upper ridge highlight
      doc.setFillColor(...highlightRgb);
      doc.rect(wallX, ry, wallW, ridgeH * 0.30, 'F');
      // 2. Central ridge crown
      doc.setFillColor(...crownRgb);
      doc.rect(wallX, ry + ridgeH * 0.30, wallW, ridgeH * 0.40, 'F');
      // 3. Lower trough shadow
      doc.setFillColor(...shadowRgb);
      doc.rect(wallX, ry + ridgeH * 0.70, wallW, ridgeH * 0.30, 'F');
      // 4. Specular glint line
      doc.setDrawColor(...specularColor);
      doc.setLineWidth(0.28);
      doc.line(wallX, ry + ridgeH * 0.16, wallX + wallW, ry + ridgeH * 0.16);
      // 5. Trough crease seam
      if (r < ridgeCount - 1) {
        doc.setDrawColor(...creaseRgb);
        doc.setLineWidth(0.5);
        doc.line(wallX, ry + ridgeH, wallX + wallW, ry + ridgeH);
      }
    }
  }

  // Crisp black outer boundary outline
  doc.setDrawColor(25, 20, 20);
  doc.setLineWidth(0.7);
  doc.rect(wallX, wallY, wallW, wallH, 'S');

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(textureName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + 9, footerY + 1.2);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the 2D Pattern Drawing for Filling Piping Design (Mashed Circles / Mashed Swirls)
 */
export function drawFillingPipingSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  piping = 'mashedCircles',
  pipingName = 'Mashed Circles',
  color = '#F6E8D5',
  colorName = 'Vanilla',
  layers = 1,
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container (crisp white card)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D PATTERN DRAWING
  drawBadge(doc, '2D PATTERN DRAWING', x + 3, y + 3, [35, 30, 30]);

  // 2. Sponge Slab Section Box
  const wallMarginX = 8;
  const wallTopY = y + 14;
  const wallW = w - wallMarginX * 2;
  const wallH = h - 25;
  const wallX = x + wallMarginX;
  const wallY = wallTopY;

  // Background of cake cross-section
  const spongeH = wallH * 0.28;
  const fillH = wallH * 0.44;
  const topSpongeY = wallY;
  const fillY = topSpongeY + spongeH;
  const botSpongeY = fillY + fillH;

  // Top sponge slab (warm golden sponge crumb)
  doc.setFillColor(245, 226, 190);
  doc.rect(wallX, topSpongeY, wallW, spongeH, 'F');
  // Bottom sponge slab (warm golden sponge crumb)
  doc.setFillColor(245, 226, 190);
  doc.rect(wallX, botSpongeY, wallW, spongeH, 'F');

  // Crumb specks on sponge
  doc.setFillColor(212, 184, 150);
  for (let s = 0; s < 10; s++) {
    const rx = wallX + 4 + s * ((wallW - 8) / 9);
    doc.circle(rx, topSpongeY + spongeH * 0.5, 0.4, 'F');
    doc.circle(rx + 2, botSpongeY + spongeH * 0.5, 0.4, 'F');
  }

  // Crust seam lines
  doc.setDrawColor(180, 140, 95);
  doc.setLineWidth(0.6);
  doc.line(wallX, fillY, wallX + wallW, fillY);
  doc.line(wallX, botSpongeY, wallX + wallW, botSpongeY);

  // Background between sponges for filling
  const rgb = hexToRgb(color);
  doc.setFillColor(
    Math.max(0, Math.round(rgb[0] * 0.95)),
    Math.max(0, Math.round(rgb[1] * 0.95)),
    Math.max(0, Math.round(rgb[2] * 0.95)),
  );
  doc.rect(wallX, fillY, wallW, fillH, 'F');

  // Piped Rounds (Mashed Circles or Swirls)
  const isSwirls = String(piping || '').toLowerCase().includes('swirl');
  const count = 7;
  const circleD = (wallW + 4) / count;
  const radius = circleD / 2;
  const centerY = fillY + fillH / 2;

  for (let c = 0; c < count; c++) {
    const cx = wallX + c * circleD + radius - 2;

    // 1. Solid dollop body
    doc.setFillColor(...rgb);
    doc.circle(cx, centerY, radius, 'F');

    // 2. Bold black ink outline
    doc.setDrawColor(25, 20, 20);
    doc.setLineWidth(1.0);
    doc.circle(cx, centerY, radius, 'S');

    if (isSwirls) {
      // Mashed Swirls: diagonal spiral slashes across each dollop
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.8);
      doc.line(cx - radius * 0.5, centerY - radius * 0.4, cx + radius * 0.2, centerY + radius * 0.6);
      doc.line(cx - radius * 0.2, centerY - radius * 0.7, cx + radius * 0.6, centerY + radius * 0.3);
      // Small highlight spiral
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(cx - radius * 0.4, centerY - radius * 0.5, cx, centerY + radius * 0.3);
    } else {
      // Mashed Circles: crescent specular highlight on top-left of circle
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.7);
      doc.line(cx - radius * 0.5, centerY - radius * 0.3, cx - radius * 0.2, centerY - radius * 0.6);
    }
  }

  // Outer cake boundary
  doc.setDrawColor(25, 20, 20);
  doc.setLineWidth(0.8);
  doc.line(wallX, wallY, wallX + wallW, wallY);
  doc.line(wallX, wallY + wallH, wallX + wallW, wallY + wallH);

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(pipingName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + 9, footerY + 1.2);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the 2D Pattern Drawing for Edge Border (Top or Bottom Edge)
 */
export function drawEdgePatternSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  slot = 'top',
  designId = 'shell',
  designName = 'Shell Border',
  color = '#F5E6C8',
  colorName = 'Vanilla',
  secondaryColor = null,
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container (crisp white card)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D PATTERN DRAWING
  drawBadge(doc, '2D PATTERN DRAWING', x + 3, y + 3, [35, 30, 30]);

  // 2. Unrolled Rim Box
  const wallMarginX = 8;
  const wallTopY = y + 14;
  const wallW = w - wallMarginX * 2;
  const wallH = h - 25;
  const wallX = x + wallMarginX;
  const wallY = wallTopY;

  const isTop = String(slot).toLowerCase().includes('top');
  const rimY = isTop ? wallY + 12 : wallY + wallH - 12;

  const str = String(designId || '').toLowerCase();
  const isAlt = (str.endsWith('alt') || str.includes('alternat')) && Boolean(secondaryColor);
  const rgb = hexToRgb(color);
  const rgb2 = isAlt ? hexToRgb(secondaryColor) : rgb;

  if (str.includes('bead') || str.includes('bracelet')) {
    // Bead Piping / Beaded Trim / Bracelet Beads
    const beadCount = 14;
    const step = (wallW - 4) / (beadCount - 1);
    const beadR = 2.4;
    for (let b = 0; b < beadCount; b++) {
      const bx = wallX + 2 + b * step;
      const useAlt = isAlt && b % 2 === 1;
      const beadRgb = useAlt ? rgb2 : rgb;

      doc.setFillColor(...beadRgb);
      doc.circle(bx, rimY, beadR, 'F');

      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.8);
      doc.circle(bx, rimY, beadR, 'S');

      doc.setFillColor(255, 255, 255);
      doc.circle(bx - 0.7, rimY - 0.7, 0.5, 'F');
    }
  } else if (str.includes('rope')) {
    // Rope Twist: authentic braided cord made of interlocking diagonal rounded segments
    const coilCount = 14;
    const step = (wallW - 6) / (coilCount - 1);
    const coilW = step * 1.3;
    const coilH = 6.4;
    for (let c = 0; c < coilCount; c++) {
      const cx = wallX + 3 + c * step;
      const useAlt = isAlt && c % 2 === 1;
      const coilRgb = useAlt ? rgb2 : rgb;

      // Base overlapping diagonal rounded segment
      doc.setFillColor(...coilRgb);
      doc.ellipse(cx, rimY, coilW * 0.52, coilH * 0.5, 'F');

      // Crisp hand-drawn outline
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.85);
      doc.ellipse(cx, rimY, coilW * 0.52, coilH * 0.5, 'S');

      // Internal braided star-tip fluting ridge highlights and folds
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.line(cx - coilW * 0.25, rimY - coilH * 0.2, cx + coilW * 0.15, rimY + coilH * 0.25);

      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.5);
      doc.line(cx - coilW * 0.1, rimY - coilH * 0.35, cx + coilW * 0.3, rimY + coilH * 0.1);
    }
  } else if (str.includes('curtain')) {
    // Curtain: draped scalloped swag border
    const swags = 6;
    const swagW = wallW / swags;
    for (let s = 0; s < swags; s++) {
      const sx = wallX + s * swagW;
      const midX = sx + swagW / 2;
      const dropY = isTop ? rimY + 8 : rimY - 8;

      doc.setFillColor(...rgb);
      doc.triangle(sx, rimY, sx + swagW, rimY, midX, dropY, 'F');

      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.9);
      doc.line(sx, rimY, midX, dropY);
      doc.line(midX, dropY, sx + swagW, rimY);

      doc.circle(midX, dropY, 1.2, 'F');
      doc.circle(midX, dropY, 1.2, 'S');
    }
  } else {
    // Shell Border (default): overlapping piped shells with fan ridges
    const shellCount = 10;
    const shellW = (wallW - 4) / shellCount;
    for (let s = 0; s < shellCount; s++) {
      const sx = wallX + 2 + s * shellW;
      const useAlt = isAlt && s % 2 === 1;
      const shellRgb = useAlt ? rgb2 : rgb;

      doc.setFillColor(...shellRgb);
      doc.ellipse(sx + shellW * 0.4, rimY, shellW * 0.48, 3.2, 'F');

      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.9);
      doc.ellipse(sx + shellW * 0.4, rimY, shellW * 0.48, 3.2, 'S');

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.line(sx + shellW * 0.1, rimY, sx + shellW * 0.7, rimY - 1.2);
      doc.line(sx + shellW * 0.1, rimY, sx + shellW * 0.7, rimY + 1.2);
    }
  }

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  if (isAlt && secondaryColor) {
    doc.setFillColor(...rgb);
    doc.circle(x + 4.2, footerY, 2.0, 'F');
    doc.setFillColor(...rgb2);
    doc.circle(x + 7.2, footerY, 2.0, 'F');
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.circle(x + 4.2, footerY, 2.0, 'S');
    doc.circle(x + 7.2, footerY, 2.0, 'S');
  } else {
    doc.setFillColor(...rgb);
    doc.circle(x + 5, footerY, 2.2, 'F');
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.circle(x + 5, footerY, 2.2, 'S');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(slot).toUpperCase()} BORDER · ${String(designName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + (isAlt && secondaryColor ? 11 : 9), footerY + 1.2);

  doc.restoreGraphicsState?.();
}
