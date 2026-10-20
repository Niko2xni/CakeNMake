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
  doc.setFillColor(248, 245, 242);
  doc.rect(wallX, wallY, wallW, wallH, 'F');

  // Top rim & base borders
  doc.setDrawColor(120, 105, 105);
  doc.setLineWidth(0.5);
  doc.line(wallX, wallY, wallX + wallW, wallY);
  doc.line(wallX, wallY + wallH, wallX + wallW, wallY + wallH);

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

  // Background of unrolled wall (representing base cake frosting underneath)
  doc.setFillColor(250, 247, 244);
  doc.rect(wallX, wallY, wallW, wallH, 'F');

  // Top rim & base borders
  doc.setDrawColor(140, 125, 125);
  doc.setLineWidth(0.5);
  doc.line(wallX, wallY, wallX + wallW, wallY);
  doc.line(wallX, wallY + wallH, wallX + wallW, wallY + wallH);

  // 3. Render 2D drawing based on the actual 3D render contour (or fallback wave)
  const rgb = hexToRgb(color);
  renderDripDrawing(doc, {
    wallX,
    wallY,
    wallW,
    wallH,
    patternId,
    rgb,
    contour,
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
      const cols = 9;
      const rows = 4;
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
            shouldFill = (c + r) % 3 === 0;
          } else if (str.includes('outer')) {
            shouldFill = r === 0 || r === rows - 1;
          } else if (str.includes('inner')) {
            shouldFill = r === 1 || r === 2;
          } else {
            shouldFill = (c + r) % 2 === 0;
          }

          if (shouldFill) {
            const pointUp = (c + r) % 2 === 0;
            if (pointUp) {
              doc.triangle(cx1 + 0.5, cy2 - 0.5, cx2 - 0.5, cy2 - 0.5, midX, cy1 + 0.5, 'F');
            } else {
              doc.triangle(cx1 + 0.5, cy1 + 0.5, cx2 - 0.5, cy1 + 0.5, midX, cy2 - 0.5, 'F');
            }
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

function renderDripDrawing(doc, { wallX, wallY, wallW, wallH, patternId, rgb, contour }) {
  // If actual 3D render contour was captured from the scene, draw it directly!
  if (Array.isArray(contour) && contour.length > 10) {
    // 1. Fill the glaze curtain from top of cake down to the actual 3D render drip contour
    doc.setFillColor(...rgb);
    for (let i = 0; i < contour.length - 1; i++) {
      const p1 = contour[i];
      const p2 = contour[i + 1];
      const x1 = wallX + p1.x * wallW;
      const x2 = wallX + p2.x * wallW;
      const y1 = wallY + Math.max(0.04, p1.y) * wallH;
      const y2 = wallY + Math.max(0.04, p2.y) * wallH;
      const stripW = Math.max(0.35, x2 - x1 + 0.12);
      const bottomY = Math.max(y1, y2);
      doc.rect(x1, wallY, stripW, bottomY - wallY, 'F');
    }

    // 2. Bold 2D hand-drawn style outline tracing the actual 3D render drip contour
    doc.setDrawColor(25, 20, 20); // Bold black ink stroke
    doc.setLineWidth(1.1); // Marker stroke weight
    for (let i = 0; i < contour.length - 1; i++) {
      const x1 = wallX + contour[i].x * wallW;
      const y1 = wallY + Math.max(0.04, contour[i].y) * wallH;
      const x2 = wallX + contour[i + 1].x * wallW;
      const y2 = wallY + Math.max(0.04, contour[i + 1].y) * wallH;
      doc.line(x1, y1, x2, y2);
    }
    return;
  }

  const str = String(patternId || '').toLowerCase();

  let keyNodes;
  if (str.includes('short') && !str.includes('alt')) {
    // Short wave / short drips: evenly length short drips
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
  } else if (str.includes('wave')) {
    // Wave: rhythmic gentle ripples of equal amplitude
    const dripY = 0.50;
    const crestY = 0.26;
    keyNodes = [
      [0.00, 0.38],
      [0.10, dripY], [0.20, crestY],
      [0.30, dripY], [0.40, crestY],
      [0.50, dripY], [0.60, crestY],
      [0.70, dripY], [0.80, crestY],
      [0.90, dripY], [1.00, 0.38],
    ];
  } else if (str.includes('drape')) {
    // Draped swags of equal depth
    const dripY = 0.72;
    const crestY = 0.24;
    keyNodes = [
      [0.00, crestY],
      [0.125, dripY], [0.25, crestY],
      [0.375, dripY], [0.50, crestY],
      [0.625, dripY], [0.75, crestY],
      [0.875, dripY], [1.00, crestY],
    ];
  } else if (str.includes('tiny')) {
    // Tiny tip scallops of equal depth
    const dripY = 0.40;
    const crestY = 0.20;
    keyNodes = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const u0 = i / count;
      const uMid = (i + 0.5) / count;
      keyNodes.push([u0, crestY]);
      keyNodes.push([uMid, dripY]);
    }
    keyNodes.push([1.00, crestY]);
  } else if (str.includes('alt')) {
    // Explicit alternating pattern only
    keyNodes = [
      [0.00, 0.20],
      [0.125, 0.86], [0.25, 0.20],
      [0.375, 0.52], [0.50, 0.20],
      [0.625, 0.86], [0.75, 0.20],
      [0.875, 0.52], [1.00, 0.20],
    ];
  } else {
    // Natural Tear / Long Gaps (Default):
    // ALL DRIPS ARE EVENLY LENGTH at the drip (matching actual 3D render)
    // Continuous flowing curve with evenly spaced, evenly long rounded drips
    const dripY = 0.86;  // Consistent bottom depth for every drip
    const crestY = 0.20; // Consistent upper arch height
    keyNodes = [
      [0.00, crestY],
      [0.125, dripY], // Drip 1 (evenly length)
      [0.25, crestY],  // Crest 1
      [0.375, dripY], // Drip 2 (evenly length)
      [0.50, crestY],  // Crest 2
      [0.625, dripY], // Drip 3 (evenly length)
      [0.75, crestY],  // Crest 3
      [0.875, dripY], // Drip 4 (evenly length)
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
