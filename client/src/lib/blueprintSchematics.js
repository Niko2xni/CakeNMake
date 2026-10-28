/**
 * Blueprint 2D Pattern Schematics
 * Renders dumbed-down geometric mock copies (unrolled 2D elevations) of
 * cake designs (Side Design & Drip Surface Treatment) directly in vector primitives.
 */

import { INK } from './blueprintBubbles';
import { BORDER_PIPING_TRACES } from './borderPipingTraces';

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
  secondaryColor = null,
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
    secondaryColor,
  });

  // 4. Bottom footer of card: Pattern & Color indicators
  const footerY = y + h - 5;
  if (secondaryColor) {
    const secRgb = hexToRgb(secondaryColor);
    doc.setFillColor(...rgb);
    doc.circle(x + 4.2, footerY, 2.0, 'F');
    doc.setFillColor(...secRgb);
    doc.circle(x + 7.2, footerY, 2.0, 'F');
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.circle(x + 4.2, footerY, 2.0, 'S');
    doc.circle(x + 7.2, footerY, 2.0, 'S');
  } else {
    // Color chip circle
    doc.setFillColor(...rgb);
    doc.circle(x + 5, footerY, 2.2, 'F');
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.circle(x + 5, footerY, 2.2, 'S');
  }

  // Label text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const titleText = `${String(patternName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + (secondaryColor ? 11 : 9), footerY + 1.2);

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
  petitFours = false,
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
    natural: petitFours || /natural/i.test(String(patternName || '')) || /natural/i.test(String(patternId || '')),
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

function renderSideShapes(doc, { wallX, wallY, wallW, wallH, treatmentId, variantId, rgb, secondaryColor = null }) {
  doc.setFillColor(...rgb);
  doc.setDrawColor(...rgb);

  const str = String(variantId || '').toLowerCase();

  switch (treatmentId) {
    case 'checkeredPattern': {
      const isXPattern = str.includes('x');
      const isLeftDiagonal = str.includes('side') || str.includes('left');
      const isRightDiagonal = str.includes('right');
      const isParallelOuter = str.includes('outer') || str.includes('bottom');
      const isParallelInner = str.includes('inner') || str.includes('top');

      // Grid dimensions: 9 columns for X pattern to replicate user diagram, 7 columns for diagonals & parallel
      const cols = isXPattern ? 9 : 7;
      const rows = 5;
      const nominalCellW = isXPattern ? 7.6 : 8.6;
      const nominalCellH = isXPattern ? 7.6 : 8.6;
      const cellW = Math.min(nominalCellW, (wallW - 2) / cols);
      const cellH = Math.min(nominalCellH, (wallH - 2) / rows);
      const sqSize = Math.min(cellW * (isXPattern ? (6.2 / 7.6) : (6.8 / 8.6)), cellH * (isXPattern ? (6.2 / 7.6) : (6.8 / 8.6)));
      const padX = (cellW - sqSize) / 2;
      const padY = (cellH - sqSize) / 2;
      const startX = wallX + (wallW - cols * cellW) / 2;
      const startY = wallY + (wallH - rows * cellH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldFill = false;

          if (isXPattern) {
            // Replicate user's exact X pattern diagram (17 squares on 9x5 grid):
            // r=0: c=1, 3, 5, 7
            // r=1: c=2, 6 (centers of top two X's)
            // r=2: c=1, 3, 5, 7
            // r=3: c=0, 4, 8 (centers of bottom X's)
            // r=4: c=1, 3, 5, 7
            shouldFill =
              ((r === 0 || r === 2 || r === 4) && (c === 1 || c === 3 || c === 5 || c === 7)) ||
              (r === 1 && (c === 2 || c === 6)) ||
              (r === 3 && (c === 0 || c === 4 || c === 8));
          } else if (isLeftDiagonal) {
            // Descending diagonal stepping down and to the left
            shouldFill = (c + r) % 3 === 2;
          } else if (isRightDiagonal) {
            // Descending diagonal stepping down and to the right
            shouldFill = (c - r + 30) % 3 === 1;
          } else if (isParallelOuter) {
            // Outer rows: top row (r=0) and bottom row (r=4)
            shouldFill = (r === 0 || r === rows - 1) && (c % 2 === 0);
          } else if (isParallelInner) {
            // Inner rows: 2nd row (r=1) and 4th row (r=3)
            shouldFill = (r === 1 || r === rows - 2) && (c % 2 === 1);
          } else {
            // Full Pattern: Alternating checkerboard of true squares (4-3-4-3-4 layout)
            shouldFill = (r + c) % 2 === 0;
          }

          if (shouldFill) {
            doc.rect(startX + c * cellW + padX, startY + r * cellH + padY, sqSize, sqSize, 'F');
          }
        }
      }
      break;
    }

    case 'trianglePattern': {
      const isXPattern = str.includes('x');
      const isLeftDiagonal = str.includes('side') || str.includes('left');
      const isRightDiagonal = str.includes('right');
      const isParallelOuter = str.includes('outer') || str.includes('bottom');
      const isParallelInner = str.includes('inner') || str.includes('top');

      const cols = isXPattern ? 9 : 7;
      const rows = 5;
      const nominalCellW = isXPattern ? 7.6 : 8.6;
      const nominalCellH = isXPattern ? 7.6 : 8.6;
      const cellW = Math.min(nominalCellW, (wallW - 2) / cols);
      const cellH = Math.min(nominalCellH, (wallH - 2) / rows);
      const triSize = Math.min(cellW * (isXPattern ? (6.2 / 7.6) : (6.8 / 8.6)), cellH * (isXPattern ? (6.2 / 7.6) : (6.8 / 8.6)));
      const padX = (cellW - triSize) / 2;
      const padY = (cellH - triSize) / 2;
      const startX = wallX + (wallW - cols * cellW) / 2;
      const startY = wallY + (wallH - rows * cellH) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldFill = false;

          if (isXPattern) {
            // Replicate user's exact X pattern diagram (17 triangles on 9x5 grid):
            shouldFill =
              ((r === 0 || r === 2 || r === 4) && (c === 1 || c === 3 || c === 5 || c === 7)) ||
              (r === 1 && (c === 2 || c === 6)) ||
              (r === 3 && (c === 0 || c === 4 || c === 8));
          } else if (isLeftDiagonal) {
            // Descending diagonal stepping down and to the left
            shouldFill = (c + r) % 3 === 2;
          } else if (isRightDiagonal) {
            // Descending diagonal stepping down and to the right
            shouldFill = (c - r + 30) % 3 === 1;
          } else if (isParallelOuter) {
            // Outer rows: top row (r=0) and bottom row (r=4)
            shouldFill = (r === 0 || r === rows - 1) && (c % 2 === 0);
          } else if (isParallelInner) {
            // Inner rows: 2nd row (r=1) and 4th row (r=3)
            shouldFill = (r === 1 || r === rows - 2) && (c % 2 === 1);
          } else {
            // Full Pattern: Alternating staggered triangles (4-3-4-3-4 layout)
            shouldFill = (r + c) % 2 === 0;
          }

          if (shouldFill) {
            const bx = startX + c * cellW + padX;
            const by = startY + r * cellH + padY;
            // Upright triangle with flat bottom base and centered top apex
            doc.triangle(bx, by + triSize, bx + triSize, by + triSize, bx + triSize / 2, by, 'F');
          }
        }
      }
      break;
    }

    case 'chevronPattern': {
      const isGapped = str.includes('gap');
      const isWide = str.includes('wide');
      const isTight = str.includes('tight');
      const isTwoTone = str.includes('two');
      const isThreeTone = str.includes('three');

      // Variant-specific wave counts and teeth geometry:
      // - Single Color, Gapped: Same 5-line spacing as Single Color, but 2nd and 4th lines removed
      // - Wide Zigzag: 3 lines, broad sweeping teeth (segs = 4, amp = 4.5mm)
      // - Tight Zigzag: 7 lines, compact dense teeth (segs = 20, amp = 1.8mm)
      // - Single Color, Two-Tone, Three-Tone: 5 lines (segs = 10, amp = 2.6mm)
      let waves = 5;
      let segs = 10;
      let amp = 2.6;
      let lineWidth = 1.0;

      if (isWide) {
        waves = 3;
        segs = 8; // 2 more full zigzag waves (8 segments vs 4)
        amp = 4.8;
        lineWidth = 2.4; // Wider, bolder stroke body
      } else if (isTight) {
        waves = 7;
        segs = 20; // Fine, tightly packed teeth
        amp = 1.8;
        lineWidth = 0.65;
      }

      const stepH = wallH / (waves + 1);
      const segW = wallW / segs;
      doc.setLineWidth(lineWidth);

      for (let w = 1; w <= waves; w++) {
        // Single Color, Gapped: keep 5-line spacing, but remove the 2nd and 4th zigzag lines
        if (isGapped && (w === 2 || w === 4)) {
          continue;
        }

        const baseY = wallY + w * stepH;

        if (typeof doc.setLineDashPattern === 'function') {
          if (isThreeTone) {
            // Cut off line zigzag on 1st, 3rd, and 5th line; solid line zigzag on 2nd and 4th line
            if (w === 1 || w === 3 || w === 5) {
              doc.setLineDashPattern([2.2, 1.4], 0);
            } else {
              doc.setLineDashPattern([], 0);
            }
          } else if (isTwoTone) {
            // Solid on 1st, 3rd, 5th; dashed on 2nd, 4th
            if (w === 2 || w === 4) {
              doc.setLineDashPattern([2.2, 1.4], 0);
            } else {
              doc.setLineDashPattern([], 0);
            }
          } else {
            doc.setLineDashPattern([], 0);
          }
        }

        if (doc.setLineCap) doc.setLineCap(1);
        if (doc.setLineJoin) doc.setLineJoin(1);

        for (let s = 0; s < segs; s++) {
          const x1 = wallX + s * segW;
          const x2 = x1 + segW;
          const y1 = s % 2 === 0 ? baseY - amp : baseY + amp;
          const y2 = s % 2 === 0 ? baseY + amp : baseY - amp;
          doc.line(x1, y1, x2, y2);
          // Seamless joint disc so thick strokes (like Wide Zigzag) never show disjointed seams
          if (isWide) {
            doc.circle(x1, y1, lineWidth / 2, 'F');
            if (s === segs - 1) doc.circle(x2, y2, lineWidth / 2, 'F');
          }
        }

        if (doc.setLineCap) doc.setLineCap(0);
        if (doc.setLineJoin) doc.setLineJoin(0);
      }

      if (typeof doc.setLineDashPattern === 'function') {
        doc.setLineDashPattern([], 0);
      }
      break;
    }

    case 'scatterPearls': {
      const isBorder = str.includes('border');
      const isDiamond = (str.includes('diamond') || str.includes('grid')) && !isBorder;
      const isRows = str.includes('row') || str.includes('horizontal');
      const isBig = str.includes('big');
      const isSmall = str.includes('small');

      if (isDiamond || isBorder) {
        // Exactly 4 horizontal pearl lines (evenly spaced vertically)
        const lines = 4;
        const stepY = wallH / (lines + 1);
        const pearlR = 1.3;

        for (let r = 1; r <= lines; r++) {
          // Diamond Grid Border: remove 2nd and 3rd row of pearls to create the gap
          if (isBorder && (r === 2 || r === 3)) {
            continue;
          }

          const py = wallY + r * stepY;
          // Alternating staggered diamond lattice
          const count = (r % 2 === 1) ? 9 : 8;
          const offset = (r % 2 === 1) ? 0 : 0.5;
          const spacing = (wallW - 8) / 8;

          for (let c = 0; c < count; c++) {
            const px = wallX + 4 + (c + offset) * spacing;
            doc.circle(px, py, pearlR, 'F');
          }
        }
      } else if (isRows) {
        // Horizontal Rows: Same 4 pearl lines as Diamond Grid, alternating big to small
        const lines = 4;
        const stepY = wallH / (lines + 1);
        const count = 10;
        const spacing = (wallW - 8) / (count - 1);

        for (let r = 1; r <= lines; r++) {
          const py = wallY + r * stepY;
          for (let c = 0; c < count; c++) {
            const px = wallX + 4 + c * spacing;
            // Alternating sequence from big to small
            const pr = (c % 2 === 0) ? 1.9 : 1.0;
            doc.circle(px, py, pr, 'F');
          }
        }
      } else {
        // Organic scatter layout with 30 pearls shared across Random, Big, and Small variants
        const scatterCoords = [
          [0.08, 0.18, 'md'], [0.18, 0.42, 'lg'], [0.12, 0.72, 'sm'], [0.22, 0.88, 'md'],
          [0.24, 0.22, 'sm'], [0.32, 0.58, 'md'], [0.30, 0.82, 'lg'], [0.38, 0.14, 'lg'],
          [0.42, 0.38, 'sm'], [0.44, 0.76, 'md'], [0.52, 0.22, 'md'], [0.50, 0.55, 'lg'],
          [0.54, 0.88, 'sm'], [0.62, 0.35, 'sm'], [0.60, 0.70, 'md'], [0.68, 0.15, 'lg'],
          [0.72, 0.48, 'md'], [0.70, 0.85, 'sm'], [0.78, 0.28, 'sm'], [0.82, 0.65, 'lg'],
          [0.86, 0.15, 'md'], [0.88, 0.88, 'md'], [0.92, 0.42, 'sm'], [0.15, 0.55, 'sm'],
          [0.28, 0.35, 'md'], [0.46, 0.92, 'lg'], [0.65, 0.52, 'lg'], [0.75, 0.75, 'md'],
          [0.36, 0.70, 'sm'], [0.84, 0.38, 'lg']
        ];

        scatterCoords.forEach(([rx, ry, sizeCategory]) => {
          let pr;
          if (isBig) {
            // Big Pearls Scatter: substantially bigger than normal (2.5mm)
            pr = 2.5;
          } else if (isSmall) {
            // Small Pearls Scatter: all small (0.9mm)
            pr = 0.9;
          } else {
            // Random Scatter: varied sizes
            pr = sizeCategory === 'lg' ? 1.95 : sizeCategory === 'md' ? 1.45 : 0.95;
          }
          doc.circle(wallX + rx * wallW, wallY + ry * wallH, pr, 'F');
        });
      }
      break;
    }

    case 'pipingScrolls': {
      const isWave = str.includes('wave') || str.includes('rope');
      const isPaired = str.includes('pair') || str.includes('opposing') || str.includes('scroll');
      const isFleur = str.includes('fleur') || str.includes('lis');
      const isShell = str.includes('shell');
      const isVine = str.includes('vine') || str.includes('tendril');
      const isLoop = str.includes('loop') || str.includes('chain');

      if (isWave) {
        // Continuous Wave Rope: Soft flowing sinusoidal rope with pearls above peaks and below valleys
        // Replicating user's 2nd image sketch
        const midY = wallY + wallH * 0.5;
        const amp = 10.5;
        const cycles = 2; // 2 full cycles: Peak 1 at 25%, Valley at 50%, Peak 2 at 75%
        const N = 80;

        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        let prevX = wallX;
        let prevY = midY + amp * Math.cos(0);
        for (let i = 1; i <= N; i++) {
          const currX = wallX + (i / N) * wallW;
          const theta = (i / N) * cycles * 2 * Math.PI;
          const currY = midY + amp * Math.cos(theta);
          doc.line(prevX, prevY, currX, currY);
          prevX = currX;
          prevY = currY;
        }

        // Pearls at peaks (above) and valley (below) matching user sketch
        const peak1X = wallX + wallW * 0.25;
        const peak2X = wallX + wallW * 0.75;
        const valleyX = wallX + wallW * 0.50;

        doc.circle(peak1X, midY - amp - 3.2, 1.4, 'F');
        doc.circle(peak2X, midY - amp - 3.2, 1.4, 'F');
        doc.circle(valleyX, midY + amp + 3.2, 1.4, 'F');
      } else if (isPaired) {
        // Paired Opposing Scrolls: Exactly 2 scrolls total facing each other with generous non-overlapping space
        // Left bended 'C' and Right bended reversed 'C', sharp tips and nested pearls (matching user sketch & 3D render)
        const cy = wallY + wallH * 0.5;
        const cx = wallX + wallW * 0.5;

        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        const drawScroll = (isLeft) => {
          const sign = isLeft ? -1 : 1;
          const spineX = cx + sign * Math.min(16.5, wallW * 0.26); // Outer spine position
          const bend = Math.min(10.5, wallW * 0.17);
          const N = 40;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const u = (i / N) * 2 - 1; // -1 (top tip) to +1 (bottom tip)
            const py = cy + u * 12.5;
            // Spine curves outward at u=0, tips bend inward toward center
            const px = spineX - sign * (u * u * bend);
            pts.push([px, py]);
          }

          for (let i = 0; i < pts.length - 1; i++) {
            doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          }

          // Top sharp tip pointing inward toward the center
          const topPt = pts[0];
          doc.triangle(
            topPt[0], topPt[1] - 0.8,
            topPt[0], topPt[1] + 0.8,
            topPt[0] - sign * 2.2, topPt[1] + 0.9,
            'F'
          );
          // Nested circle inside top curl
          doc.circle(topPt[0], topPt[1] + 4.2, 1.3, 'F');

          // Bottom sharp tip pointing inward toward the center
          const botPt = pts[pts.length - 1];
          doc.triangle(
            botPt[0], botPt[1] - 0.8,
            botPt[0], botPt[1] + 0.8,
            botPt[0] - sign * 2.2, botPt[1] - 0.9,
            'F'
          );
          // Nested circle inside bottom curl
          doc.circle(botPt[0], botPt[1] - 4.2, 1.3, 'F');
        };

        // Draw exactly 2 scrolls facing each other: 1 Left, 1 Right
        drawScroll(true);  // Left 'C'
        drawScroll(false); // Right 'ɔ'
      } else if (isFleur) {
        // Fleur-de-lis Row: 2 motifs centered on the card canvas, keeping the original motif-to-motif spacing
        const cy = wallY + wallH * 0.46;
        doc.setFillColor(...rgb);
        doc.setDrawColor(...rgb);
        doc.setLineWidth(0.4);

        const drawBlade = (bx, by, len, width, angleDeg) => {
          const rad = (angleDeg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const localPts = [
            [0, -len * 0.52],
            [width * 0.5, -len * 0.40],
            [width * 0.5, len * 0.35],
            [0, len * 0.48],
            [-width * 0.5, len * 0.35],
            [-width * 0.5, -len * 0.40]
          ];

          const worldPts = localPts.map(([lx, ly]) => [
            bx + lx * cos - ly * sin,
            by + lx * sin + ly * cos
          ]);

          for (let p = 1; p < worldPts.length - 1; p++) {
            doc.triangle(
              worldPts[0][0], worldPts[0][1],
              worldPts[p][0], worldPts[p][1],
              worldPts[p + 1][0], worldPts[p + 1][1],
              'F'
            );
          }
        };

        // Two motifs centered as a pair (30% and 70% of wallW, exactly 40% spacing between them)
        const centers = [wallX + wallW * 0.30, wallX + wallW * 0.70];
        centers.forEach((cx) => {
          drawBlade(cx, cy, 18, 2.6, 0); // center vertical blade
          drawBlade(cx - 3.2, cy + 1.0, 15, 2.3, -38); // left angled blade
          drawBlade(cx + 3.2, cy + 1.0, 15, 2.3, 38); // right angled blade
          doc.circle(cx, cy + 12.0, 1.3, 'F'); // bottom pearl dot
        });
      } else if (isShell) {
        // Shell Border Row: 2 motifs centered on the card canvas with 5 radiating spikes each
        const cy = wallY + wallH * 0.46;
        doc.setFillColor(...rgb);
        doc.setDrawColor(...rgb);
        doc.setLineWidth(0.4);

        const drawBlade = (bx, by, len, width, angleDeg) => {
          const rad = (angleDeg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const localPts = [
            [0, -len * 0.52],
            [width * 0.5, -len * 0.40],
            [width * 0.5, len * 0.35],
            [0, len * 0.48],
            [-width * 0.5, len * 0.35],
            [-width * 0.5, -len * 0.40]
          ];

          const worldPts = localPts.map(([lx, ly]) => [
            bx + lx * cos - ly * sin,
            by + lx * sin + ly * cos
          ]);

          for (let p = 1; p < worldPts.length - 1; p++) {
            doc.triangle(
              worldPts[0][0], worldPts[0][1],
              worldPts[p][0], worldPts[p][1],
              worldPts[p + 1][0], worldPts[p + 1][1],
              'F'
            );
          }
        };

        // Two motifs centered as a pair (30% and 70% of wallW, exactly 40% spacing between them)
        const centers = [wallX + wallW * 0.30, wallX + wallW * 0.70];
        centers.forEach((cx) => {
          // 5 radiating spikes
          drawBlade(cx, cy, 18, 2.6, 0); // center spike (0 deg)
          drawBlade(cx - 2.5, cy + 0.8, 16, 2.3, -25); // inner left spike (-25 deg)
          drawBlade(cx + 2.5, cy + 0.8, 16, 2.3, 25);  // inner right spike (+25 deg)
          drawBlade(cx - 5.0, cy + 2.0, 13.5, 2.1, -50); // outer left spike (-50 deg)
          drawBlade(cx + 5.0, cy + 2.0, 13.5, 2.1, 50);  // outer right spike (+50 deg)
          doc.circle(cx, cy + 12.0, 1.3, 'F'); // bottom pearl dot
        });
      } else if (isVine) {
        // Vine and Tendrils: Sinusoidal S-curve with top-looped left tendril and bottom-looped right tendril
        // Directly replicating user's 1st image schema reference
        const cy = wallY + wallH * 0.5;
        const cx = wallX + wallW * 0.5;

        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        // 1. S-curve main vine climbing from lower-left to upper-right with horizontal tangents at ends
        const startX = wallX + wallW * 0.08;
        const endX = wallX + wallW * 0.92;
        const steps = 50;
        let prevX = startX;
        let prevY = cy + 12.0;

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const currX = startX + t * (endX - startX);
          // Cosine ease S-curve: starts flat at cy + 12.0, climbs through cy, flattens out at cy - 12.0
          const currY = cy + Math.cos(t * Math.PI) * 12.0;
          doc.line(prevX, prevY, currX, currY);
          prevX = currX;
          prevY = currY;
        }

        doc.setLineWidth(1.3);

        // 2. Left tendril: top circular loop with stem curving down like 'e'
        const lX = cx - 11.0;
        const lLoopY = cy - 2.5;
        // Top loop (circle stroke with radius 1.7)
        doc.circle(lX, lLoopY, 1.7, 'S');

        // Stem curving down from loop with bottom hook pointing towards the vine
        const lStemSteps = 20;
        let lPrevX = lX - 1.7; // left edge of loop
        let lPrevY = lLoopY;
        for (let s = 1; s <= lStemSteps; s++) {
          const t = s / lStemSteps;
          const px = lX - 1.7 - Math.sin(t * Math.PI) * 1.5 + t * 2.0;
          const py = lLoopY + t * 6.8;
          doc.line(lPrevX, lPrevY, px, py);
          lPrevX = px;
          lPrevY = py;
        }

        // 3. Right tendril: bottom circular loop with stem curving up like inverted 'e'
        const rX = cx + 11.0;
        const rLoopY = cy + 2.5;
        // Bottom loop (circle stroke with radius 1.7)
        doc.circle(rX, rLoopY, 1.7, 'S');

        // Stem curving up from loop with top hook pointing towards the vine
        const rStemSteps = 20;
        let rPrevX = rX + 1.7; // right edge of loop
        let rPrevY = rLoopY;
        for (let s = 1; s <= rStemSteps; s++) {
          const t = s / rStemSteps;
          const px = rX + 1.7 + Math.sin(t * Math.PI) * 1.5 - t * 2.0;
          const py = rLoopY - t * 6.8;
          doc.line(rPrevX, rPrevY, px, py);
          rPrevX = px;
          rPrevY = py;
        }
      } else {
        // Interlocking Loop Chain: Horizontal oval with left-side cut off and solid center dot
        // Directly replicating user's 2nd image schema reference
        const cy = wallY + wallH * 0.5;
        const cx = wallX + wallW * 0.5;
        const rx = 16.0;
        const ry = 11.2;

        doc.setLineWidth(1.6);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        // 1. Oval with left-side cut off (opening centered at 180 degrees / 9 o'clock)
        const gapHalfAngle = 0.12 * Math.PI; // ~21.6 deg gap above and below 180 deg
        const startAngle = Math.PI + gapHalfAngle;
        const endAngle = 3 * Math.PI - gapHalfAngle;
        const steps = 60;
        let prevPx = cx + Math.cos(startAngle) * rx;
        let prevPy = cy + Math.sin(startAngle) * ry;

        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const theta = startAngle + t * (endAngle - startAngle);
          const px = cx + Math.cos(theta) * rx;
          const py = cy + Math.sin(theta) * ry;
          doc.line(prevPx, prevPy, px, py);
          prevPx = px;
          prevPy = py;
        }

        // 2. Solid filled center dot (matching user's 2nd image)
        doc.circle(cx, cy, 1.6, 'F');
      }
      break;
    }

    case 'sunshinePlay': {
      const isStarry = str.includes('starry');
      const isSunshineStars = !isStarry && str.includes('sunshinestars');
      const isSkyChumps = !isStarry && (str.includes('sky') || (str.includes('chump') && str.includes('star')));
      const isCloudy = !isStarry && !isSkyChumps && (str.includes('cloud') || str.includes('chump'));
      const isRainbowArc = !isStarry && !isSunshineStars && (str.includes('rainbow') || str.includes('arc'));
      const isStarBurst = !isStarry && !isSunshineStars && !isSkyChumps && !isCloudy && !isRainbowArc;

      // 1. Helper to generate smooth puffy cloud contour points (7 overlapping lobes)
      const getCloudPts = (cloudX, cloudY, scale = 1) => {
        const lobes = [
          [-6.8 * scale, -1.8 * scale, 4.8 * scale], // top-left lobe
          [0.8 * scale, -2.8 * scale, 5.8 * scale],  // top-middle lobe (highest)
          [7.6 * scale, -1.2 * scale, 4.6 * scale],  // top-right lobe
          [9.8 * scale, 1.4 * scale, 4.0 * scale],   // right end cap
          [4.2 * scale, 3.4 * scale, 4.6 * scale],   // bottom-right lobe
          [-4.2 * scale, 3.4 * scale, 4.6 * scale],  // bottom-left lobe
          [-9.2 * scale, 1.4 * scale, 4.0 * scale],  // left end cap
        ];

        const N = 120;
        const pts = [];
        for (let i = 0; i < N; i++) {
          const theta = (i / N) * 2 * Math.PI;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          let maxR = 0;

          for (const [lx, ly, lr] of lobes) {
            const b = -2 * (lx * cosT + ly * sinT);
            const c = lx * lx + ly * ly - lr * lr;
            const disc = b * b - 4 * c;
            if (disc >= 0) {
              const rSol = (-b + Math.sqrt(disc)) / 2;
              if (rSol > maxR) maxR = rSol;
            }
          }

          pts.push([cloudX + cosT * maxR, cloudY + sinT * maxR]);
        }
        return pts;
      };

      // 100% solid filled cloud with flavor color
      const drawCloud = (cloudX, cloudY, scale = 1, fillColor = rgb, strokeColor = rgb) => {
        const pts = getCloudPts(cloudX, cloudY, scale);
        doc.setFillColor(...fillColor);
        for (let i = 0; i < pts.length; i++) {
          const next = (i + 1) % pts.length;
          doc.triangle(cloudX, cloudY, pts[i][0], pts[i][1], pts[next][0], pts[next][1], 'F');
        }
        if (strokeColor) {
          doc.setDrawColor(...strokeColor);
          for (let i = 0; i < pts.length; i++) {
            const next = (i + 1) % pts.length;
            doc.line(pts[i][0], pts[i][1], pts[next][0], pts[next][1]);
          }
        }
      };

      // 5-pointed solid star with 100% opacity
      const drawStar = (sx, sy, outerR, innerR, starRgb = rgb) => {
        doc.setFillColor(...starRgb);
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = (i % 2 === 0) ? outerR : innerR;
          pts.push([sx + Math.cos(angle) * r, sy + Math.sin(angle) * r]);
        }
        for (let i = 0; i < 10; i++) {
          const next = (i + 1) % 10;
          doc.triangle(sx, sy, pts[i][0], pts[i][1], pts[next][0], pts[next][1], 'F');
        }
      };

      // Exact 30-point Random Scatter coordinates from Scatter Pearls
      const scatterCoords = [
        [0.08, 0.18, 'md'], [0.18, 0.42, 'lg'], [0.12, 0.72, 'sm'], [0.22, 0.88, 'md'],
        [0.24, 0.22, 'sm'], [0.32, 0.58, 'md'], [0.30, 0.82, 'lg'], [0.38, 0.14, 'lg'],
        [0.42, 0.38, 'sm'], [0.44, 0.76, 'md'], [0.52, 0.22, 'md'], [0.50, 0.55, 'lg'],
        [0.54, 0.88, 'sm'], [0.62, 0.35, 'sm'], [0.60, 0.70, 'md'], [0.68, 0.15, 'lg'],
        [0.72, 0.48, 'md'], [0.70, 0.85, 'sm'], [0.78, 0.28, 'sm'], [0.82, 0.65, 'lg'],
        [0.86, 0.15, 'md'], [0.88, 0.88, 'md'], [0.92, 0.42, 'sm'], [0.15, 0.55, 'sm'],
        [0.28, 0.35, 'md'], [0.46, 0.92, 'lg'], [0.65, 0.52, 'lg'], [0.75, 0.75, 'md'],
        [0.36, 0.70, 'sm'], [0.84, 0.38, 'lg']
      ];

      const renderStarBurst = (coords = scatterCoords, starColor = rgb) => {
        coords.forEach(([rxCoord, ryCoord, sizeCategory]) => {
          const px = wallX + rxCoord * wallW;
          const py = wallY + ryCoord * wallH;
          let outerR = 2.2;
          let innerR = 0.95;
          if (sizeCategory === 'sm') {
            outerR = 1.5;
            innerR = 0.65;
          } else if (sizeCategory === 'lg') {
            outerR = 3.1;
            innerR = 1.35;
          }
          drawStar(px, py, outerR, innerR, starColor);
        });
      };

      const renderRainbowArc = (rcx = wallX + wallW * 0.5, rbaseY = wallY + wallH * 0.70, scale = 1.0) => {
        // 4 rainbow bands with static colors (green, yellow, orange, pink/red)
        const rainbowBands = [
          { r: 10.5 * scale, color: [155, 232, 155] }, // green (#9BE89B)
          { r: 13.3 * scale, color: [255, 229, 123] }, // yellow (#FFE57B)
          { r: 16.1 * scale, color: [252, 171, 113] }, // orange (#FCAB71)
          { r: 18.9 * scale, color: [241, 109, 134] }, // pink/red (#F16D86)
        ];

        doc.setLineWidth(2.7 * scale);
        rainbowBands.forEach(({ r, color }) => {
          doc.setDrawColor(...color);
          const steps = 40;
          let prevPx = rcx - r;
          let prevPy = rbaseY;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const theta = Math.PI - t * Math.PI;
            const px = rcx + Math.cos(theta) * r;
            const py = rbaseY - Math.sin(theta) * r;
            doc.line(prevPx, prevPy, px, py);
            prevPx = px;
            prevPy = py;
          }
        });

        // 100% solid opacity clouds at rainbow feet, colored with selected flavor
        doc.setLineWidth(1.2 * scale);
        drawCloud(rcx - 12.0 * scale, rbaseY + 1.2 * scale, 0.95 * scale, rgb, rgb);
        drawCloud(rcx + 12.0 * scale, rbaseY + 1.2 * scale, 0.95 * scale, rgb, rgb);
      };

      const renderCloudyChamp = (cScale = 1.05) => {
        doc.setLineWidth(1.4);
        // 100% solid opacity clouds fully filled with flavor color (matching user instructions)
        drawCloud(wallX + wallW * 0.28, wallY + wallH * 0.68, cScale, rgb, rgb);
        drawCloud(wallX + wallW * 0.72, wallY + wallH * 0.32, cScale, rgb, rgb);
      };

      if (isRainbowArc) {
        // Rainbow Arc: static rainbow arches + 100% solid flavor clouds at feet
        renderRainbowArc();
      } else if (isCloudy) {
        // Cloudy Champ: 100% solid flavor-filled clouds (no empty outlines)
        renderCloudyChamp();
      } else if (isSkyChumps) {
        // Sky Chumps: Cloudy Champ + Star Burst overlapping with 100% opacity
        renderStarBurst();
        renderCloudyChamp();
      } else if (isSunshineStars) {
        // Sunshine Stars: Rainbow Arc + Star Burst overlapping with 100% opacity
        renderStarBurst();
        renderRainbowArc();
      } else if (isStarry) {
        // Starry Sunshine Play: Balanced combination of Rainbow Arc, Cloudy Champ, and Star Burst
        // Rainbow Arc centered at upper-center
        renderRainbowArc(wallX + wallW * 0.5, wallY + wallH * 0.58, 0.72);

        // Cloudy Champ: 1 cloud at lower-left, 1 cloud at upper-right (user requested right-side cloud at top)
        doc.setLineWidth(1.2);
        // Left-side cloud at bottom-left
        drawCloud(wallX + wallW * 0.20, wallY + wallH * 0.76, 0.85, rgb, rgb);
        // Right-side cloud at top-right
        drawCloud(wallX + wallW * 0.78, wallY + wallH * 0.28, 0.85, rgb, rgb);

        // Framing star constellation around open areas (no collisions with top-right cloud)
        const starryCoords = [
          [0.08, 0.16, 'md'], [0.18, 0.28, 'lg'], [0.12, 0.48, 'sm'],
          [0.26, 0.14, 'sm'], [0.33, 0.28, 'md'], [0.42, 0.18, 'sm'],
          [0.50, 0.82, 'md'], [0.38, 0.90, 'sm'], [0.62, 0.90, 'sm'],
          [0.80, 0.78, 'lg'], [0.74, 0.90, 'sm'], [0.88, 0.90, 'sm'],
        ];
        renderStarBurst(starryCoords);
      } else {
        // Star Burst: 30 scattered stars copying Random Scatter
        renderStarBurst();
      }
      break;
    }

    case 'victorianLambeth': {
      // Victorian Lambeth variants: Classic, No Rosette, Ropes Only, No Ropes, Double Band, Triple Band
      const isDoubleBand = str.includes('double');
      const isTripleBand = str.includes('triple');
      const isNoRosette = (str.includes('norosette') || (str.includes('no') && str.includes('rosette'))) && !isDoubleBand && !isTripleBand;
      const isNoRopes = (str.includes('noropes') || (str.includes('no') && str.includes('rope'))) && !isDoubleBand && !isTripleBand;
      const isRopesOnly = (str.includes('ropesonly') || (str.includes('rope') && !str.includes('no'))) && !isDoubleBand && !isTripleBand;

      const topY = wallY + 7.5;
      const jx0 = wallX + 8.0;
      const jx1 = wallX + wallW * 0.5;
      const jx2 = wallX + wallW - 8.0;

      doc.setDrawColor(...rgb);
      doc.setFillColor(...rgb);

      // Helper to draw catenary/parabolic hanging rope curve
      const drawRope = (xA, yA, xB, yB, sag, lw = 0.9) => {
        doc.setLineWidth(lw);
        doc.setDrawColor(...rgb);
        const steps = 25;
        let prevX = xA;
        let prevY = yA;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const currX = xA + t * (xB - xA);
          const currY = yA + t * (yB - yA) + 4 * t * (1 - t) * sag;
          doc.line(prevX, prevY, currX, currY);
          prevX = currX;
          prevY = currY;
        }
      };

      // Helper to draw horizontal leaf/diamond backing at junction
      const drawLeafBacking = (jx, jy) => {
        doc.setFillColor(...rgb);
        const ptsL = [
          [jx - 1.5, jy - 1.2],
          [jx - 6.5, jy],
          [jx - 1.5, jy + 1.2]
        ];
        doc.triangle(ptsL[0][0], ptsL[0][1], ptsL[1][0], ptsL[1][1], ptsL[2][0], ptsL[2][1], 'F');

        const ptsR = [
          [jx + 1.5, jy - 1.2],
          [jx + 6.5, jy],
          [jx + 1.5, jy + 1.2]
        ];
        doc.triangle(ptsR[0][0], ptsR[0][1], ptsR[1][0], ptsR[1][1], ptsR[2][0], ptsR[2][1], 'F');
      };

      // Helper to draw rosette with swirl ridges
      const drawRosette = (rx, ry, radius = 2.6) => {
        doc.setFillColor(...rgb);
        doc.circle(rx, ry, radius, 'F');
        doc.setLineWidth(0.6);
        doc.setDrawColor(255, 255, 255);
        const petals = 6;
        for (let p = 0; p < petals; p++) {
          const ang = (p / petals) * 2 * Math.PI;
          const ex = rx + Math.cos(ang) * radius;
          const ey = ry + Math.sin(ang) * radius;
          doc.line(rx, ry, ex, ey);
        }
        doc.setDrawColor(...rgb);
      };

      // Helper to draw pearl (white dot with crisp flavor outline)
      const drawPearl = (px, py, pr = 1.35) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...rgb);
        doc.setLineWidth(0.7);
        doc.circle(px, py, pr, 'FD');
      };

      // Helper to draw volumetric crescent drape
      const drawDrape = (xStart, xEnd, yBase, dipTopVal = 12.3, dipBotVal = 19.3) => {
        const w = xEnd - xStart;
        if (w <= 0.5) return;
        const steps = 30;
        const topPts = [];
        const botPts = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const currX = xStart + t * w;
          const dipTop = 4 * t * (1 - t) * dipTopVal;
          const dipBot = 4 * t * (1 - t) * dipBotVal;
          topPts.push([currX, yBase + dipTop]);
          botPts.push([currX, yBase + dipBot]);
        }

        doc.setFillColor(...rgb);
        for (let s = 0; s < steps; s++) {
          doc.triangle(
            topPts[s][0], topPts[s][1],
            topPts[s + 1][0], topPts[s + 1][1],
            botPts[s + 1][0], botPts[s + 1][1],
            'F'
          );
          doc.triangle(
            topPts[s][0], topPts[s][1],
            botPts[s + 1][0], botPts[s + 1][1],
            botPts[s][0], botPts[s][1],
            'F'
          );
        }
        doc.setLineWidth(0.8);
        for (let s = 0; s < steps; s++) {
          doc.line(topPts[s][0], topPts[s][1], topPts[s + 1][0], topPts[s + 1][1]);
          doc.line(botPts[s][0], botPts[s][1], botPts[s + 1][0], botPts[s + 1][1]);
        }
      };

      // Helper to draw 3-teardrop crest motif
      const drawTeardrop = (tx, ty, len, w, angleDeg) => {
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const localPts = [
          [0, len * 0.5],
          [-w * 0.5, 0],
          [-w * 0.45, -len * 0.3],
          [0, -len * 0.5],
          [w * 0.45, -len * 0.3],
          [w * 0.5, 0]
        ];

        const worldPts = localPts.map(([lx, ly]) => [
          tx + lx * cos - ly * sin,
          ty + lx * sin + ly * cos
        ]);

        for (let p = 1; p < worldPts.length - 1; p++) {
          doc.triangle(
            worldPts[0][0], worldPts[0][1],
            worldPts[p][0], worldPts[p][1],
            worldPts[p + 1][0], worldPts[p + 1][1],
            'F'
          );
        }
      };

      if (isNoRosette) {
        // No Rosette: Multi-tiered ropes connecting hollow pearl circles with duplicated overlapping lower parts
        const y0 = topY + 4.5;
        const x0 = wallX + 9.0;
        const x1 = wallX + wallW * 0.5;
        const x2 = wallX + wallW - 9.0;

        const mx0 = (x0 + x1) / 2; // wallX + 22.5
        const mx1 = (x1 + x2) / 2; // wallX + 49.5
        const my0 = topY + 16.0;

        // Lower circle parts (duplicated to sides as requested)
        const ly_low = topY + 33.5;
        const lx_center = x1;
        const lx_left = mx0;
        const lx_right = mx1;

        // Intermediate overlapping dots
        const lx0 = (x0 + mx0) / 2;
        const lx2 = (x2 + mx1) / 2;
        const ly_mid = topY + 25.0;

        const ox0 = wallX + 3.0;
        const oy0 = topY + 30.0;
        const ox2 = wallX + wallW - 3.0;
        const oy2 = topY + 30.0;

        // 1. Top row ropes
        drawRope(wallX, y0 - 1.0, x0, y0, 4.0, 1.1);
        drawRope(x0, y0, x1, y0, 6.0, 1.1);
        drawRope(x1, y0, x2, y0, 6.0, 1.1);
        drawRope(x2, y0, wallX + wallW, y0 - 1.0, 4.0, 1.1);

        // 2. Thick middle banner ropes passing through middle pearls
        drawRope(x0, y0, x1, y0, 18.0, 1.8);
        drawRope(x1, y0, x2, y0, 18.0, 1.8);
        drawRope(wallX, y0 + 3.0, x0, y0, 9.0, 1.6);
        drawRope(x2, y0, wallX + wallW, y0 + 3.0, 9.0, 1.6);

        // 3. Ropes from top pearls down to middle pearls
        drawRope(x0, y0, mx0, my0, 2.5, 0.9);
        drawRope(x1, y0, mx0, my0, 2.5, 0.9);
        drawRope(x1, y0, mx1, my0, 2.5, 0.9);
        drawRope(x2, y0, mx1, my0, 2.5, 0.9);

        // 4. Overlapping lower loop parts (center, left, right)
        drawRope(mx0, my0, lx_center, ly_low, 6.0, 0.9);
        drawRope(mx1, my0, lx_center, ly_low, 6.0, 0.9);
        drawRope(x0, y0, lx_center, ly_low, 9.0, 0.9);
        drawRope(x2, y0, lx_center, ly_low, 9.0, 0.9);

        drawRope(x0, y0, lx_left, ly_low, 7.0, 0.9);
        drawRope(x1, y0, lx_left, ly_low, 7.0, 0.9);
        drawRope(wallX, y0 + 6.0, lx_left, ly_low, 8.0, 0.9);
        drawRope(mx0, my0, lx_left, ly_low, 4.0, 0.9);

        drawRope(x1, y0, lx_right, ly_low, 7.0, 0.9);
        drawRope(x2, y0, lx_right, ly_low, 7.0, 0.9);
        drawRope(wallX + wallW, y0 + 6.0, lx_right, ly_low, 8.0, 0.9);
        drawRope(mx1, my0, lx_right, ly_low, 4.0, 0.9);

        // Intermediate criss-crossing ropes
        drawRope(x0, y0, lx0, ly_mid, 4.5, 0.9);
        drawRope(lx0, ly_mid, x1, y0, 6.0, 0.9);
        drawRope(x1, y0, lx2, ly_mid, 6.0, 0.9);
        drawRope(lx2, ly_mid, x2, y0, 4.5, 0.9);

        // Outer hanging loops to far-left and far-right dots
        drawRope(x0, y0, ox0, oy0, 5.0, 0.9);
        drawRope(ox0, oy0, wallX, topY + 28.0, 2.0, 0.9);
        drawRope(x2, y0, ox2, oy2, 5.0, 0.9);
        drawRope(ox2, oy2, wallX + wallW, topY + 28.0, 2.0, 0.9);

        // Draw all pearl circles with a HOLE (white interior, flavor stroke outline)
        const drawHollowPearl = (px, py, pr) => {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...rgb);
          doc.setLineWidth(1.1);
          doc.circle(px, py, pr, 'FD');
        };

        drawHollowPearl(x0, y0, 2.5);
        drawHollowPearl(x1, y0, 2.5);
        drawHollowPearl(x2, y0, 2.5);

        drawHollowPearl(mx0, my0, 2.2);
        drawHollowPearl(mx1, my0, 2.2);

        drawHollowPearl(lx_center, ly_low, 1.4);
        drawHollowPearl(lx_left, ly_low, 1.4);
        drawHollowPearl(lx_right, ly_low, 1.4);

        drawHollowPearl(lx0, ly_mid, 1.1);
        drawHollowPearl(lx2, ly_mid, 1.1);
        drawHollowPearl(ox0, oy0, 1.1);
        drawHollowPearl(ox2, oy2, 1.1);
      } else if (isRopesOnly) {
        // Ropes Only:
        // Lower circles and ropes below removed; only the ropes connected at the main circles at the top stay.
        const y0 = topY + 4.5;
        const x0 = wallX + 9.0;
        const x1 = wallX + wallW * 0.5;
        const x2 = wallX + wallW - 9.0;

        // 1. Top row rope swag connecting the main circles
        drawRope(wallX, y0 - 1.0, x0, y0, 4.0, 1.1);
        drawRope(x0, y0, x1, y0, 6.0, 1.1);
        drawRope(x1, y0, x2, y0, 6.0, 1.1);
        drawRope(x2, y0, wallX + wallW, y0 - 1.0, 4.0, 1.1);

        // 2. Middle rope swag connecting the main circles
        drawRope(wallX, y0 + 3.0, x0, y0, 8.0, 1.5);
        drawRope(x0, y0, x1, y0, 16.0, 1.6);
        drawRope(x1, y0, x2, y0, 16.0, 1.6);
        drawRope(x2, y0, wallX + wallW, y0 + 3.0, 8.0, 1.5);

        // 3. Lower rope swag connecting the main circles
        drawRope(wallX, y0 + 6.0, x0, y0, 11.0, 1.2);
        drawRope(x0, y0, x1, y0, 24.0, 1.3);
        drawRope(x1, y0, x2, y0, 24.0, 1.3);
        drawRope(x2, y0, wallX + wallW, y0 + 6.0, 11.0, 1.2);

        // Main circles at the top (pearls)
        drawPearl(x0, y0, 2.2);
        drawPearl(x1, y0, 2.2);
        drawPearl(x2, y0, 2.2);
      } else if (isDoubleBand) {
        // Double Band: No Ropes design with 3 drops removed,
        // duplicated into two vertically staggered bands (top band & lower band) matching 3D render
        const midY = topY + 15.0;
        const mx0 = (jx0 + jx1) / 2; // wallX + 22.0
        const mx1 = (jx1 + jx2) / 2; // wallX + 50.0

        // 1. Top band drapes (within [wallX, wallX + wallW])
        drawDrape(jx0, jx1, topY + 4.2, 8.5, 14.5);
        drawDrape(jx1, jx2, topY + 4.2, 8.5, 14.5);
        drawDrape(wallX, jx0, topY + 4.2, 5.0, 9.5);
        drawDrape(jx2, wallX + wallW, topY + 4.2, 5.0, 9.5);

        // 2. Lower band drapes (staggered horizontally at mx0 and mx1)
        drawDrape(mx0, mx1, midY + 4.2, 8.5, 14.5);
        drawDrape(wallX, mx0, midY + 4.2, 6.5, 11.5);
        drawDrape(mx1, wallX + wallW, midY + 4.2, 6.5, 11.5);

        // 3. Top band rosettes + leaf backings + pearls
        [jx0, jx1, jx2].forEach((jx) => {
          drawLeafBacking(jx, topY);
          drawRosette(jx, topY, 2.6);
          drawPearl(jx, topY + 4.2, 1.35);
        });

        // 4. Lower band rosettes + leaf backings + pearls (staggered)
        [wallX + 1.2, mx0, mx1, wallX + wallW - 1.2].forEach((mx) => {
          drawLeafBacking(mx, midY);
          drawRosette(mx, midY, 2.6);
          drawPearl(mx, midY + 4.2, 1.35);
        });
      } else if (isTripleBand) {
        // Triple Band: Wider-range drapes connecting circles, with repeated 3-drops
        // filling all available spaces (top center, lower-left, lower-right) matching 3D render
        const midY = topY + 15.0;
        const cx = wallX + wallW * 0.5;
        const tx0 = wallX + 14.0;
        const tx1 = wallX + wallW - 14.0;

        // 1. Top wider-range drapes (strictly within [wallX, wallX + wallW])
        drawDrape(tx0, tx1, topY + 4.2, 9.0, 15.5);
        drawDrape(wallX, tx0, topY + 4.2, 6.0, 11.0);
        drawDrape(tx1, wallX + wallW, topY + 4.2, 6.0, 11.0);

        // 2. Lower wider-range drapes
        drawDrape(wallX, cx, midY + 4.2, 9.0, 15.5);
        drawDrape(cx, wallX + wallW, midY + 4.2, 9.0, 15.5);

        // 3. Repeated 3-drop motifs in available spaces
        doc.setFillColor(...rgb);
        // Top center space (above wide central drape, pointing UP)
        const topDropY = topY + 2.5;
        drawTeardrop(cx, topDropY, 4.8, 2.0, 180);
        drawTeardrop(cx - 3.2, topDropY - 2.0, 3.8, 1.6, 156);
        drawTeardrop(cx + 3.2, topDropY - 2.0, 3.8, 1.6, 204);

        // Top outer spaces (above outer drapes, pointing UP)
        drawTeardrop(wallX + 3.5, topDropY, 3.8, 1.6, 180);
        drawTeardrop(wallX + wallW - 3.5, topDropY, 3.8, 1.6, 180);

        // Lower-left space (below left drape, pointing DOWN)
        const lowDropY = midY + 3.0;
        const leftDropX = (wallX + cx) / 2;
        drawTeardrop(leftDropX, lowDropY, 4.8, 2.0, 0);
        drawTeardrop(leftDropX - 3.2, lowDropY + 2.0, 3.8, 1.6, -24);
        drawTeardrop(leftDropX + 3.2, lowDropY + 2.0, 3.8, 1.6, 24);

        // Lower-right space (below right drape, pointing DOWN)
        const rightDropX = (cx + wallX + wallW) / 2;
        drawTeardrop(rightDropX, lowDropY, 4.8, 2.0, 0);
        drawTeardrop(rightDropX - 3.2, lowDropY + 2.0, 3.8, 1.6, -24);
        drawTeardrop(rightDropX + 3.2, lowDropY + 2.0, 3.8, 1.6, 24);

        // 4. Top rosettes + leaf backings + pearls
        [tx0, tx1].forEach((tx) => {
          drawLeafBacking(tx, topY);
          drawRosette(tx, topY, 2.6);
          drawPearl(tx, topY + 4.2, 1.35);
        });

        // 5. Middle/lower rosettes + leaf backings + pearls
        [wallX + 1.2, cx, wallX + wallW - 1.2].forEach((mx) => {
          drawLeafBacking(mx, midY);
          drawRosette(mx, midY, 2.6);
          drawPearl(mx, midY + 4.2, 1.35);
        });
      } else if (isNoRopes) {
        // No Ropes: Classic design with ropes removed,
        // but keeping the wide crescent drape, top rosettes with leaf backings,
        // the anchor pearls brought back in between, and the 3-teardrop crest intact
        drawDrape(jx0, jx1, topY + 4.2, 12.3, 19.3);
        drawDrape(jx1, jx2, topY + 4.2, 12.3, 19.3);

        const dropY = topY + 25.5;
        doc.setFillColor(...rgb);
        drawTeardrop(jx1, dropY, 5.0, 2.1, 0);
        drawTeardrop(jx1 - 3.2, dropY + 2.5, 4.2, 1.8, -26);
        drawTeardrop(jx1 + 3.2, dropY + 2.5, 4.2, 1.8, 26);

        [jx0, jx1, jx2].forEach((jx) => {
          drawLeafBacking(jx, topY);
          drawRosette(jx, topY, 2.6);
          drawPearl(jx, topY + 4.2, 1.35); // Brought back!
        });
      } else {
        // Classic Victorian Lambeth: Complete multi-tiered festooning
        const drawSwagBay = (xStart, xEnd) => {
          const mx = (xStart + xEnd) / 2;
          const w = xEnd - xStart;
          const steps = 30;

          // 1. Tier 1: Thin top rope arc
          doc.setLineWidth(0.9);
          doc.setDrawColor(...rgb);
          let prevX = xStart;
          let prevY = topY + 4.2;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const currX = xStart + t * w;
            const dip = 4 * t * (1 - t) * 7.5;
            const currY = topY + 4.2 + dip;
            doc.line(prevX, prevY, currX, currY);
            prevX = currX;
            prevY = currY;
          }

          // 2. Tier 2: Broad crescent drape
          const topPts = [];
          const botPts = [];
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const currX = xStart + t * w;
            const dipTop = 4 * t * (1 - t) * 12.3;
            const dipBot = 4 * t * (1 - t) * 19.3;
            topPts.push([currX, topY + 4.2 + dipTop]);
            botPts.push([currX, topY + 4.2 + dipBot]);
          }

          doc.setFillColor(...rgb);
          for (let s = 0; s < steps; s++) {
            doc.triangle(topPts[s][0], topPts[s][1], topPts[s + 1][0], topPts[s + 1][1], botPts[s + 1][0], botPts[s + 1][1], 'F');
            doc.triangle(topPts[s][0], topPts[s][1], botPts[s + 1][0], botPts[s + 1][1], botPts[s][0], botPts[s][1], 'F');
          }
          doc.setLineWidth(0.8);
          for (let s = 0; s < steps; s++) {
            doc.line(topPts[s][0], topPts[s][1], topPts[s + 1][0], topPts[s + 1][1]);
            doc.line(botPts[s][0], botPts[s][1], botPts[s + 1][0], botPts[s + 1][1]);
          }

          // 3. Tier 3: Deep hanging lower U-loop reaching down to bottom pearl
          doc.setLineWidth(1.0);
          prevX = xStart;
          prevY = topY + 4.5;
          const lowLoopDip = 27.5;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const currX = xStart + t * w;
            const dip = 4 * t * (1 - t) * lowLoopDip;
            const currY = topY + 4.5 + dip;
            doc.line(prevX, prevY, currX, currY);
            prevX = currX;
            prevY = currY;
          }

          const bottomPearlY = topY + 4.5 + lowLoopDip;
          drawPearl(mx, bottomPearlY, 1.4);

          doc.setLineWidth(0.9);
          doc.line(mx, bottomPearlY + 1.4, mx - 3.2, bottomPearlY + 5.8);
          doc.line(mx, bottomPearlY + 1.4, mx + 3.2, bottomPearlY + 5.8);
        };

        drawSwagBay(jx0, jx1);
        drawSwagBay(jx1, jx2);

        // Center 3-teardrop crest motif between the swags
        const dropY = topY + 25.5;
        doc.setFillColor(...rgb);
        drawTeardrop(jx1, dropY, 5.0, 2.1, 0);
        drawTeardrop(jx1 - 3.2, dropY + 2.5, 4.2, 1.8, -26);
        drawTeardrop(jx1 + 3.2, dropY + 2.5, 4.2, 1.8, 26);

        // Top complete rosettes, leaf backings, and anchor pearls
        [jx0, jx1, jx2].forEach((jx) => {
          drawLeafBacking(jx, topY);
          drawRosette(jx, topY, 2.6);
          drawPearl(jx, topY + 4.2, 1.35);
        });
      }

      break;
    }

    case 'borderPiping': {
      // 6 solid variants: Shell, Reverse Shell, Bead, Rope Twist, Rope Twist Classic, Elongated Shell
      // Alternating color function removed completely from Edge Border Piping per user request.
      const rimY = wallY + wallH * 0.52;

      // Fluted shell unit (matches the 3D render): a stack of horizontal flutes whose
      // spacing fans between a peaked top contour and a bowl-shaped bottom contour.
      // `mirror` flips the unit left/right for the Reverse Shell.
      const drawFlutedShell = (xStart, unitW, col, mirror = false) => {
        const flutes = 9;
        const steps = 26;
        const peakT = 0.30;
        // Top contour: rises from the left edge to a peak near 30% width, then slopes down
        const topRel = (t) => (t < peakT
          ? -6.0 - 4.0 * (t / peakT)
          : -10.0 + 4.0 * ((t - peakT) / (1 - peakT)));
        // Bottom contour: rounded bowl, lowest a little past centre
        const botRel = (t) => 6.0 + 4.0 * Math.sin(Math.PI * Math.pow(t, 0.85));
        const ptAt = (t, f) => {
          const x = mirror ? xStart + (1 - t) * unitW : xStart + t * unitW;
          const y = rimY + topRel(t) + (botRel(t) - topRel(t)) * f;
          return [x, y];
        };

        doc.setDrawColor(...col);
        for (let r = 0; r < flutes; r++) {
          const f = r / (flutes - 1);
          doc.setLineWidth(r === 0 || r === flutes - 1 ? 1.1 : 0.55);
          let [px, py] = ptAt(0, f);
          for (let s = 1; s <= steps; s++) {
            const [cx, cy] = ptAt(s / steps, f);
            doc.line(px, py, cx, cy);
            px = cx;
            py = cy;
          }
        }
        // Left and right seam edges
        doc.setLineWidth(1.1);
        const [lx0, ly0] = ptAt(0, 0);
        const [lx1, ly1] = ptAt(0, 1);
        const [rx0, ry0] = ptAt(1, 0);
        const [rx1, ry1] = ptAt(1, 1);
        doc.line(lx0, ly0, lx1, ly1);
        doc.line(rx0, ry0, rx1, ry1);
      };

      const drawShellRow = (mirror) => {
        const count = 3;
        const totalW = wallW - 8.0;
        const unitW = totalW / count;
        for (let i = 0; i < count; i++) {
          const col = (isAlt && i % 2 === 1) ? altRgb : rgb;
          drawFlutedShell(wallX + 4.0 + i * unitW, unitW, col, mirror);
        }
      };

      // Paints a traced ink drawing (see borderPipingTraces.js). Polygons arrive sorted by nesting
      // depth: even depth = ink, odd depth = hole (painted back to the white wall).
      const drawBorderTrace = (trace, { left, centerY, width, colorFor }) => {
        const mmPerUnit = width / (trace.w * trace.scale);
        const heightMm = trace.h * (width / trace.w);
        const top = centerY - heightMm / 2;
        trace.polys.forEach((poly) => {
          const [depth, cxPx, sx, sy, ...rest] = poly;
          const segs = [];
          for (let i = 0; i < rest.length; i += 2) segs.push([rest[i] * mmPerUnit, rest[i + 1] * mmPerUnit]);
          doc.setFillColor(...(depth % 2 === 0 ? colorFor(cxPx) : [255, 255, 255]));
          doc.lines(segs, left + sx * mmPerUnit, top + sy * mmPerUnit, [1, 1], 'F', true);
        });
      };

      // ── Pen-and-ink toolkit (matches the hand-drawn reference style) ─────────
      // Bold wobbly outlines, tapering crease strokes, slanted hatching on the shadow side,
      // and scattered stipple. Deterministic: every call is seeded, so output never shifts.
      const makeRng = (seed) => {
        let a = seed >>> 0;
        return () => {
          a = (a + 0x6D2B79F5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };
      const setRound = () => {
        if (doc.setLineCap) doc.setLineCap(1);
        if (doc.setLineJoin) doc.setLineJoin(1);
      };

      // Polyline whose width tapers from w0 to w1 (or follows widthFn(t)).
      const inkLine = (pts, w0, w1, col, widthFn = null) => {
        setRound();
        doc.setDrawColor(...col);
        for (let i = 0; i < pts.length - 1; i++) {
          const t = i / Math.max(1, pts.length - 2);
          doc.setLineWidth(Math.max(0.04, widthFn ? widthFn(t) : w0 + (w1 - w0) * t));
          doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        }
      };

      // Closed outline: white fill (hides whatever is behind), then a bold wobbly stroke.
      const inkShape = (pts, col, lw, rnd) => {
        doc.setFillColor(255, 255, 255);
        const segs = [];
        for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);
        setRound();
        doc.setDrawColor(...col);
        for (let i = 0; i < pts.length; i++) {
          const n = (i + 1) % pts.length;
          doc.setLineWidth(lw * (0.82 + 0.36 * rnd()));
          doc.line(pts[i][0], pts[i][1], pts[n][0], pts[n][1]);
        }
      };

      // Slanted hatch strokes hanging off a set of edge points.
      const inkHatch = (edgePts, col, rnd, { len = 1.6, dx = -0.5, lw = 0.13 } = {}) => {
        setRound();
        doc.setDrawColor(...col);
        doc.setLineWidth(lw);
        edgePts.forEach(([x, y]) => {
          const L2 = len * (0.5 + 0.7 * rnd());
          doc.line(x, y + 0.15, x + dx * (0.75 + 0.5 * rnd()) * L2, y + L2);
        });
      };

      // One leaf plate in ink style: rounded-pointed left tip, bowed top/bottom edges, wavy
      // notched right end, two tapering crease lines, hatching under the bottom edge and at the tip.
      const inkPlate = (xs, xe, ycFn, thMax, col, rnd, { hatch = true } = {}) => {
        const N = 38;
        const top = [];
        const bot = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const th = thMax * Math.pow(Math.min(1, u / 0.2), 0.55) * (1 - 0.1 * u);
          const x = xs + u * (xe - xs);
          const yc = ycFn(u);
          top.push([x, yc - th / 2]);
          bot.push([x, yc + th / 2]);
        }
        // wavy blunt end, top -> bottom
        const endPts = [];
        const M = 9;
        for (let j = 1; j < M; j++) {
          const v = j / M;
          const x = xe + 0.85 * Math.sin(2 * Math.PI * v + 0.5) * Math.sin(Math.PI * v) * 1.4;
          endPts.push([x, top[N][1] + (bot[N][1] - top[N][1]) * v]);
        }
        const outline = [...top, ...endPts, ...bot.slice().reverse()];
        inkShape(outline, col, 0.46, rnd);

        // tapering crease lines
        [0.36, 0.7].forEach((f, idx) => {
          const pts = [];
          for (let i = 6; i <= N - 3; i++) {
            if (idx === 1 && i > N * 0.55 && i < N * 0.62) continue; // broken stroke like the drawing
            pts.push([top[i][0], top[i][1] + (bot[i][1] - top[i][1]) * f]);
          }
          const span = pts.length - 1;
          inkLine(pts, 0.05, 0.05, col, (t) => 0.06 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.05)));
        });

        if (hatch) {
          // shadow hatching hanging under the bottom edge
          const edge = [];
          for (let i = 5; i <= N - 6; i += 3) edge.push(bot[i]);
          inkHatch(edge, col, rnd, { len: Math.max(1.0, thMax * 0.2), dx: -0.45 });
          // little hatch group inside the tip, just under the top edge
          const tip = [];
          for (let i = 2; i <= 8; i++) tip.push([top[i][0], top[i][1] + 0.3]);
          setRound();
          doc.setDrawColor(...col);
          doc.setLineWidth(0.12);
          tip.forEach(([x, y]) => doc.line(x, y, x + 1.0, y + 1.5 + rnd() * 0.8));
        }
        return { top, bot };
      };


      const drawInkShellBorder = ({ elongated = false } = {}) => {
        const rnd = makeRng(elongated ? 7715 : 8812);
        const cy = wallY + wallH * 0.52;
        const count = 3;
        const unitW = (wallW + 4) / count;
        const overlap = elongated ? 7.5 : 6.0;

        for (let i = 0; i < count; i++) {
          const col = rgb;
          const x0 = wallX - 1.0 + i * (unitW - overlap * 0.5);
          const w = unitW + overlap * 0.5;
          const N = 36;
          const topPts = [];
          const botPts = [];

          const peakT = elongated ? 0.20 : 0.28;
          const peakH = elongated ? 7.5 : 8.8;
          const tailYRel = elongated ? 1.5 : 2.5;

          for (let s = 0; s <= N; s++) {
            const t = s / N;
            const x = x0 + t * w;
            const topRel = t < peakT
              ? -peakH * Math.sin((t / peakT) * (Math.PI / 2))
              : -peakH * Math.cos(((t - peakT) / (1 - peakT)) * (Math.PI / 2)) * 0.75 + tailYRel * ((t - peakT) / (1 - peakT));
            const botRel = 5.5 * Math.sin(Math.pow(t, 0.75) * Math.PI) * (1 - 0.55 * t) + tailYRel * t;

            topPts.push([x, cy + topRel]);
            botPts.push([x, cy + botRel]);
          }

          const headArc = [];
          const headN = 8;
          for (let k = 1; k < headN; k++) {
            const u = k / headN;
            const hx = x0 - 1.5 * Math.sin(u * Math.PI);
            const hy = botPts[0][1] + (topPts[0][1] - botPts[0][1]) * u;
            headArc.push([hx, hy]);
          }
          const outline = [...headArc, ...topPts, ...botPts.slice().reverse()];
          inkShape(outline, col, 0.52, rnd);

          const flutes = elongated ? 7 : 9;
          for (let r = 1; r < flutes; r++) {
            const frac = r / flutes;
            const ridgePts = [];
            const steps = 24;
            for (let st = 0; st <= steps; st++) {
              const u = st / steps;
              const idx = Math.round((1 - u) * N);
              const topP = topPts[idx] || topPts[0];
              const botP = botPts[idx] || botPts[0];
              const ry = topP[1] + (botP[1] - topP[1]) * frac;
              const rx = topP[0];
              ridgePts.push([rx, ry]);
            }
            inkLine(ridgePts, 0.12, 0.05, col, (t) => 0.08 + 0.22 * Math.sin(t * Math.PI));
          }

          const hatchEdge = [];
          for (let k = 4; k < N - 6; k += 2) hatchEdge.push(botPts[k]);
          inkHatch(hatchEdge, col, rnd, { len: 1.8, dx: -0.42, lw: 0.14 });

          doc.setFillColor(...col);
          for (let k = 0; k < 6; k++) {
            const px = x0 + w * (0.2 + 0.3 * rnd());
            const py = cy - peakH * (0.4 + 0.4 * rnd());
            doc.circle(px, py, 0.12 + 0.08 * rnd(), 'F');
          }
        }
      };

      const drawInkReverseShell = () => {
        const rnd = makeRng(4419);
        const cy = wallY + wallH * 0.52;
        const count = 4;
        const unitW = (wallW + 6) / count;
        const overlap = 4.5;

        for (let i = 0; i < count; i++) {
          const col = rgb;
          const isUp = (i % 2 === 0);
          const x0 = wallX - 1.0 + i * (unitW - overlap * 0.5);
          const w = unitW + overlap * 0.5;
          const N = 32;
          const topPts = [];
          const botPts = [];

          const dir = isUp ? -1 : 1;

          for (let s = 0; s <= N; s++) {
            const t = s / N;
            const x = x0 + t * w;
            const envelope = Math.sin(t * Math.PI);
            const yMid = cy + dir * 3.0 * Math.sin(t * Math.PI * 0.95);
            const th = (4.8 * envelope + 1.2) * (1 - 0.2 * t);
            topPts.push([x, yMid - th * 0.5]);
            botPts.push([x, yMid + th * 0.5]);
          }

          const endPts = [];
          const M = 6;
          for (let j = 1; j < M; j++) {
            const v = j / M;
            const ex = x0 + w + 1.0 * Math.sin(v * Math.PI);
            const ey = topPts[N][1] + (botPts[N][1] - topPts[N][1]) * v;
            endPts.push([ex, ey]);
          }
          const outline = [...topPts, ...endPts, ...botPts.slice().reverse()];
          inkShape(outline, col, 0.50, rnd);

          [0.32, 0.68].forEach((frac) => {
            const cPts = [];
            for (let s = 3; s <= N - 3; s++) {
              cPts.push([topPts[s][0], topPts[s][1] + (botPts[s][1] - topPts[s][1]) * frac]);
            }
            inkLine(cPts, 0.08, 0.05, col, (t) => 0.06 + 0.2 * Math.sin(t * Math.PI));
          });

          const shadowEdge = isUp ? botPts : topPts;
          const hatchPts = [];
          for (let s = 4; s <= N - 5; s += 2) hatchPts.push(shadowEdge[s]);
          inkHatch(hatchPts, col, rnd, { len: 1.5, dx: isUp ? -0.4 : 0.4, lw: 0.13 });
        }
      };

      const drawInkRopeTwist = ({ isClassic = false } = {}) => {
        const rnd = makeRng(isClassic ? 7192 : 6321);
        const cy = wallY + wallH * 0.52;
        const count = isClassic ? 5 : 8;
        const strandStep = (wallW - 2) / count;
        const strandW = isClassic ? 14.0 : 10.5;
        const strandH = isClassic ? 8.5 : 7.2;

        for (let i = 0; i < count; i++) {
          const col = rgb;
          const cx = wallX + 3.0 + i * strandStep;
          const N = 28;
          const angle = 0.58;

          const pts = [];
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const rx = strandW * 0.5;
          const ry = strandH * 0.5;

          for (let s = 0; s < N; s++) {
            const theta = (s / N) * 2 * Math.PI;
            const ex = rx * Math.cos(theta);
            const ey = ry * Math.sin(theta);
            const rotX = ex * cosA - ey * sinA;
            const rotY = ex * sinA + ey * cosA;
            pts.push([cx + rotX, cy + rotY]);
          }

          inkShape(pts, col, 0.48, rnd);

          [-0.35, 0.0, 0.35].forEach((offsetFrac) => {
            const crease = [];
            const C = 16;
            for (let k = 2; k < C - 2; k++) {
              const u = (k / (C - 1)) * 2 - 1;
              const ex = rx * u * 0.85;
              const ey = ry * offsetFrac * Math.sqrt(Math.max(0, 1 - u * u * 0.6));
              const rotX = ex * cosA - ey * sinA;
              const rotY = ex * sinA + ey * cosA;
              crease.push([cx + rotX, cy + rotY]);
            }
            inkLine(crease, 0.06, 0.06, col, (t) => 0.06 + 0.18 * Math.sin(t * Math.PI));
          });

          const lowerHatch = [];
          for (let k = 0; k < 6; k++) {
            const u = (k / 5) * 1.2 - 0.6;
            const ex = rx * u;
            const ey = ry * 0.75;
            const rotX = ex * cosA - ey * sinA;
            const rotY = ex * sinA + ey * cosA;
            lowerHatch.push([cx + rotX, cy + rotY]);
          }
          inkHatch(lowerHatch, col, rnd, { len: 1.4, dx: -0.35, lw: 0.12 });
        }
      };

      if (str.includes('bead')) {
        // Bead Piping: a stack of four buns in solid color
        drawBorderTrace(BORDER_PIPING_TRACES.bead, {
          left: wallX - 4.6, centerY: wallY + wallH * 0.5, width: wallW + 6.0,
          colorFor: () => rgb,
        });
      } else if (str.includes('reverse')) {
        // Reverse Shell: alternating crescent shell leaves in solid color
        drawInkReverseShell();
      } else if (str.includes('elongated')) {
        // Elongated Shell Border: long sweeping shell units in solid color
        drawInkShellBorder({ elongated: true });
      } else if (str.includes('classic') && str.includes('rope')) {
        // Rope Twist Classic: broad ribbon twist units in solid color
        drawInkRopeTwist({ isClassic: true });
      } else if (str.includes('rope')) {
        // Rope Twist: diagonal twisted rope strands in solid color
        drawInkRopeTwist({ isClassic: false });
      } else {
        // Shell Border: three fluted fan shells in solid color
        drawInkShellBorder({ elongated: false });
      }
      break;
    }

    case 'beadedTrim': {
      // 6 variants drawn from the 3D renders: Beaded Trim (small/large alternating), Petite,
      // Grand, Morse Dot-Dash-Dot, Morse Alternating, Morse Double-Dot Dash.
      // Pen-and-ink style: bold outline, socket ring, tapered shadow hatching, stipple, highlight.
      const cy = wallY + wallH * 0.5;
      const ink = rgb;
      let seed = 4242;
      const rnd = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (doc.setLineCap) doc.setLineCap(1);
      if (doc.setLineJoin) doc.setLineJoin(1);

      // Filled tapered stroke along pts (width ramps 0 -> wMax -> 0 unless flat)
      const taper = (pts, wMax, { flat = false } = {}) => {
        if (pts.length < 2) return;
        const L = []; const R = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
          const tx = b[0] - a[0]; const ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
          const u = i / (pts.length - 1);
          const w = (flat ? wMax : wMax * Math.sin(Math.PI * u) ** 0.7 + 0.03) / 2;
          L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
          R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
        }
        const poly = [...L, ...R.reverse()];
        const segs = [];
        for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
        doc.setFillColor(...ink);
        doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);
      };
      const arcPts = (x, y, rx, ry, a0, a1, n = 14) => {
        const out = [];
        for (let i = 0; i <= n; i++) {
          const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180;
          out.push([x + rx * Math.cos(a), y + ry * Math.sin(a)]);
        }
        return out;
      };
      const outlinePoly = (poly, lw) => {
        const segs = [];
        for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ink);
        doc.setLineWidth(lw);
        doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'FD', true);
      };
      const dot = (x, y, r) => { doc.setFillColor(...ink); doc.circle(x, y, r, 'F'); };

      // A sphere bead of radius r sitting in a socket
      const bead = (x, y, r) => {
        // socket: broken rings below / left of the bead
        taper(arcPts(x - r * 0.03, y + r * 0.06, r * 1.13, r * 1.1, 100, 240), r * 0.09);
        taper(arcPts(x + r * 0.03, y + r * 0.08, r * 1.2, r * 1.17, 25, 80), r * 0.07);
        outlinePoly(arcPts(x, y, r, r, 0, 355, 36), Math.max(0.35, r * 0.1));
        // low-poly facets: a few chords just inside the outline, lit side
        for (let k = 0; k < 4; k++) {
          const a = 150 + k * 28 + rnd() * 8;
          taper(arcPts(x, y, r * 0.8, r * 0.8, a, a + 16, 4), r * 0.055);
        }
        // shadow hatching on the lower right: short strokes bleeding in from the outline
        const n = Math.max(7, Math.round(r * 4));
        for (let i = 0; i < n; i++) {
          const a = (-5 + (i / (n - 1)) * 100) * (Math.PI / 180);
          const len = r * (0.24 + 0.24 * Math.sin(((i + 0.5) / n) * Math.PI)) * (0.8 + 0.4 * rnd());
          const x0 = x + Math.cos(a) * (r - 0.05); const y0 = y + Math.sin(a) * (r - 0.05);
          taper([[x0, y0], [x0 - Math.cos(a) * len * 0.9 - len * 0.15, y0 - Math.sin(a) * len * 0.9]], r * 0.11);
        }
        // highlight: small ring + crescent on the upper left
        doc.setDrawColor(...ink);
        doc.setLineWidth(Math.max(0.12, r * 0.035));
        doc.circle(x - r * 0.38, y - r * 0.42, r * 0.09, 'S');
        taper(arcPts(x, y, r * 0.66, r * 0.66, 205, 262, 8), r * 0.075);
        // stipple on the cake surface beside the socket
        for (let i = 0; i < 5; i++) {
          const a = (20 + rnd() * 85) * (Math.PI / 180);
          dot(x + Math.cos(a) * r * (1.42 + rnd() * 0.3), y + Math.sin(a) * r * (1.4 + rnd() * 0.3), 0.1 + rnd() * 0.08);
        }
      };

      // A capsule (Morse dash) of half-height h and total width w
      const capsule = (x0, y, w, h) => {
        const pts = [
          ...arcPts(x0 + w - h, y, h, h, -90, 90, 14),
          ...arcPts(x0 + h, y, h, h, 90, 270, 14),
        ];
        taper(arcPts(x0 + w * 0.5, y + h * 0.1, w * 0.54, h * 1.15, 25, 155, 18), h * 0.09);
        taper(arcPts(x0 + w * 0.5, y + h * 0.1, w * 0.55, h * 1.22, 165, 200, 6), h * 0.07);
        outlinePoly(pts, Math.max(0.35, h * 0.1));
        // highlight streak along the top and a small one near the left cap
        taper([[x0 + h * 0.9, y - h * 0.6], [x0 + w * 0.35, y - h * 0.64], [x0 + w * 0.65, y - h * 0.64], [x0 + w - h * 0.8, y - h * 0.55]], h * 0.12);
        doc.setDrawColor(...ink);
        doc.setLineWidth(0.12);
        doc.circle(x0 + h * 0.55, y - h * 0.35, h * 0.07, 'S');
        // shadow hatching along the underside
        const n = Math.max(10, Math.round(w * 1.3));
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n;
          const x = x0 + h * 0.5 + u * (w - h * 1.0);
          const len = h * (0.4 + 0.25 * Math.sin(u * Math.PI)) * (0.8 + 0.4 * rnd());
          taper([[x, y + h - 0.05], [x - len * 0.3, y + h - len]], h * 0.16);
        }
        // end-cap shading on the right
        taper(arcPts(x0 + w - h, y, h * 0.7, h * 0.7, -50, 60, 8), h * 0.08);
        for (let i = 0; i < 7; i++) {
          dot(x0 + w * (0.1 + rnd() * 0.85), y + h * (1.45 + rnd() * 0.35), 0.1 + rnd() * 0.08);
        }
      };

      const isMorse = str.includes('morse');
      if (str.includes('petite')) {
        // Petite: five medium beads with wide even gaps
        const r = wallW * 0.068;
        const step = (wallW - 2 * r - 2.4) / 4;
        for (let i = 0; i < 5; i++) bead(wallX + 1.2 + r + i * step, cy, r);
      } else if (str.includes('grand')) {
        // Grand: five large beads nearly touching, slight size drift
        const rs = [0.97, 1, 0.9, 1, 0.9];
        const rb = wallW * 0.082;
        let x = wallX + 1.2;
        const total = rs.reduce((s, k) => s + k * rb * 2, 0);
        const gap = (wallW - 2.4 - total) / 4;
        rs.forEach((k) => { x += k * rb; bead(x, cy, k * rb); x += k * rb + gap; });
      } else if (isMorse && str.includes('dotdashdot')) {
        // Dot - Dash - Dot
        const d = wallW / 6.7;
        const g = d * 0.5;
        let x = wallX + (wallW - (d * 4.8 + g * 2)) / 2;
        bead(x + d / 2, cy, d / 2); x += d + g;
        capsule(x, cy, d * 2.8, d / 2); x += d * 2.8 + g;
        bead(x + d / 2, cy, d / 2);
      } else if (isMorse && str.includes('dotdotdash')) {
        // Dot - Dot - Dash
        const d = wallW / 5.9;
        const g = d * 0.45;
        let x = wallX + (wallW - (d * 4.8 + g * 2)) / 2;
        bead(x + d / 2, cy, d / 2); x += d + g;
        bead(x + d / 2, cy, d / 2); x += d + g;
        capsule(x, cy, d * 2.8, d / 2);
      } else if (isMorse) {
        // Alternating: dot, dash, dot, dash
        const d = wallW / 9.4;
        const g = d * 0.45;
        let x = wallX + (wallW - (d * 7.6 + g * 3)) / 2;
        for (let s = 0; s < 2; s++) {
          bead(x + d / 2, cy, d / 2); x += d + g;
          capsule(x, cy, d * 2.8, d / 2); x += d * 2.8 + g;
        }
      } else {
        // Beaded Trim: small / large / small / large / small
        const rs = [0.62, 1, 0.62, 1, 0.62];
        const rb = wallW * 0.095;
        const total = rs.reduce((s, k) => s + k * rb * 2, 0);
        const gap = (wallW - 2.4 - total) / 4;
        let x = wallX + 1.2;
        rs.forEach((k) => { x += k * rb; bead(x, cy, k * rb); x += k * rb + gap; });
      }
      break;
    }

    case 'dollops': {
      // 24 variants: Star / Round Tip Dollops, Continuous / Medium / Sparse, Solid / Alt, +/- Cherries.
      // Drawn from the top-down 3D renders in a pen-and-ink style: star = 12-lobed rosette with
      // spiralling ribs, round = smooth dome with a pinched centre; hatching + stipple on the
      // shadow side, cast-shadow stipple on the cake surface.
      const isAlt = str.includes('alt');
      const isCherry = str.includes('cherry');
      const isRound = str.includes('round');
      const isSparse = str.includes('sparse');
      const isMedium = str.includes('medium') || (!isRound && !isSparse && !str.includes('continuous'));
      const isContinuous = !isSparse && !isMedium;
      const altRgb = secondaryColor ? hexToRgb(secondaryColor) : [Math.min(255, rgb[0] + 75), Math.min(255, rgb[1] + 75), Math.min(255, rgb[2] + 75)];
      const cy = wallY + wallH * 0.5;

      let seed = 9001;
      const rnd = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (doc.setLineCap) doc.setLineCap(1);
      if (doc.setLineJoin) doc.setLineJoin(1);

      // Filled tapered stroke: 'mid' (thick in the middle) or 'grow' (thin start -> thick end)
      const taper = (pts, wMax, col, mode = 'mid') => {
        if (pts.length < 2) return;
        const L = []; const R = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
          const tx = b[0] - a[0]; const ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
          const u = i / (pts.length - 1);
          const w = (mode === 'grow' ? wMax * (0.08 + 0.92 * u ** 0.9) : wMax * Math.sin(Math.PI * u) ** 0.7 + 0.03) / 2;
          L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
          R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
        }
        const poly = [...L, ...R.reverse()];
        const segs = [];
        for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
        doc.setFillColor(...col);
        doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);
      };
      const outline = (pts, lw, col) => {
        const segs = [];
        for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...col);
        doc.setLineWidth(lw);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'FD', true);
      };
      const dot = (x, y, r, col) => { doc.setFillColor(...col); doc.circle(x, y, r, 'F'); };

      const N = 12;
      const rimPts = (x, y, R, rot, lobes) => {
        const out = [];
        const steps = lobes ? N * 10 : 72;
        for (let i = 0; i < steps; i++) {
          const th = (i / steps) * Math.PI * 2;
          const k = Math.floor(((th - rot) / (Math.PI * 2)) * N + 1e5) % N;
          const rr = lobes
            ? R * (0.72 + 0.28 * Math.abs(Math.cos((N * (th - rot)) / 2)) ** 0.55) * (0.94 + 0.06 * Math.sin(k * 2.7))
            : R * (1 + 0.012 * Math.sin(3 * th + rot));
          out.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr]);
        }
        return out;
      };

      // Cast shadow on the cake (upper-left): stipple + short hatches, painted before the bodies
      const shadow = (x, y, R, col) => {
        const sx = x - R * 0.3; const sy = y - R * 0.26;
        const nDots = Math.round(R * 4.2);
        for (let i = 0, got = 0; i < 400 && got < nDots; i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R * 1.06;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          if (Math.hypot(px - x, py - y) < R * 0.98 || px < wallX + 0.4 || px > wallX + wallW - 0.4) continue;
          if (Math.hypot(px - x, py - y) > R * 1.38) continue;
          dot(px, py, 0.07 + rnd() * 0.1, col); got++;
        }
        const nH = Math.round(R * 2.4);
        for (let i = 0, got = 0; i < 400 && got < nH; i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R * 1.0;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 1.04 || d > R * 1.3 || px < wallX + 0.6 || px > wallX + wallW - 0.8) continue;
          taper([[px, py], [px + R * 0.12, py + R * 0.12]], 0.24, col);
          got++;
        }
      };

      const star = (x, y, R, col) => {
        const rot = -Math.PI / 2 + 0.12;
        outline(rimPts(x, y, R, rot, true), Math.max(0.4, R * 0.045), col);
        const swirl = 0.34;
        for (let k = 0; k < N; k++) {
          const tip = rot + (k / N) * Math.PI * 2;
          const notch = tip + Math.PI / N;
          // valley between lobes: bold at the rim, fading to the centre
          const v = [];
          for (let t = 0.04; t <= 0.8; t += 0.09) {
            const a = notch - swirl * (1 - t) ** 1.2;
            v.push([x + Math.cos(a) * R * t, y + Math.sin(a) * R * t]);
          }
          taper(v, R * 0.055, col, 'grow');
          // ridge line of each lobe (thin, shorter)
          const rg = [];
          for (let t = 0.1; t <= 0.95; t += 0.1) {
            const a = tip - swirl * (1 - t) ** 1.2;
            const rr = R * (t * (0.74 + 0.22 * t));
            rg.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
          }
          taper(rg, R * 0.03, col);
          // shading on the upper-left half (the shadow side): short strokes inside the rim
          const mid = ((tip * 180) / Math.PI + 360) % 360;
          if (mid > 120 && mid < 330) {
            for (let j = -1; j <= 1; j++) {
              const a = tip - swirl * 0.06 + j * 0.07;
              const r0 = R * (0.97 - 0.02 * Math.abs(j)); const r1 = R * (0.97 - 0.2 - 0.04 * (1 - Math.abs(j)));
              taper([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a - 0.05) * r1, y + Math.sin(a - 0.05) * r1]], R * 0.036, col);
            }
          }
        }
        // centre pinch
        dot(x, y, R * 0.04, col);
      };

      const roundDollop = (x, y, R, col) => {
        outline(rimPts(x, y, R, 0.4, false), Math.max(0.45, R * 0.05), col);
        // pinch at the centre: little crease lines
        for (let k = 0; k < 6; k++) {
          const a = 0.3 + (k / 6) * Math.PI * 2 + rnd() * 0.3;
          const L = R * (0.14 + 0.12 * rnd());
          taper([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], R * 0.05, col);
        }
        // soft shading: hatching just inside the upper-left rim
        const n = Math.round(R * 3.2);
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * (0.85 + 1.0 * (i / (n - 1)))) + (rnd() - 0.5) * 0.04; // ~153deg..333deg
          const len = R * (0.14 + 0.16 * Math.sin((i / (n - 1)) * Math.PI)) * (0.8 + 0.4 * rnd());
          const x0 = x + Math.cos(a) * (R - 0.06); const y0 = y + Math.sin(a) * (R - 0.06);
          taper([[x0, y0], [x0 - Math.cos(a) * len + len * 0.15, y0 - Math.sin(a) * len]], R * 0.07, col);
        }
        // contour arcs on the shadow side
        [0.84, 0.68].forEach((f, k) => {
          const a0 = 150 + k * 12; const a1 = 285 - k * 20;
          taper(Array.from({ length: 14 }, (_, i) => {
            const a = ((a0 + ((a1 - a0) * i) / 13) * Math.PI) / 180;
            return [x + Math.cos(a) * R * f, y + Math.sin(a) * R * f];
          }), R * (0.05 - 0.01 * k), col);
        });
        // highlight crescent lower right
        taper(Array.from({ length: 9 }, (_, i) => {
          const a = ((20 + i * 8) * Math.PI) / 180;
          return [x + Math.cos(a) * R * 0.74, y + Math.sin(a) * R * 0.74];
        }), R * 0.035, col);
      };

      const cherry = (x, y, R) => {
        const r = R * 0.3;
        doc.setFillColor(204, 24, 48);
        doc.setDrawColor(120, 10, 25);
        doc.setLineWidth(0.3);
        doc.circle(x, y, r, 'FD');
        doc.setFillColor(255, 255, 255);
        doc.circle(x - r * 0.35, y - r * 0.35, r * 0.2, 'F');
        doc.setDrawColor(85, 128, 48);
        doc.setLineWidth(0.5);
        doc.line(x, y - r * 0.9, x + r * 0.9, y - r * 1.9);
      };

      // layout (centres + radius) from the renders
      let R; let xs;
      if (isSparse) { R = wallW * 0.2; xs = [wallX + wallW / 2]; }
      else if (isMedium) { R = wallW * 0.185; xs = [wallX + wallW * 0.3, wallX + wallW * 0.7]; }
      else { R = wallW * 0.13; const st = (wallW - 2 * R - 1.5) / 3; xs = [0, 1, 2, 3].map((i) => wallX + 0.75 + R + i * st); }

      const cols = xs.map((_, i) => ((isAlt && i % 2 === 1) ? altRgb : rgb));
      xs.forEach((x, i) => shadow(x, cy, R, cols[i]));
      xs.forEach((x, i) => {
        if (isRound) roundDollop(x, cy, R, cols[i]); else star(x, cy, R, cols[i]);
        if (isCherry) cherry(x, cy, R);
      });
      break;
    }

    case 'whippedCream': {
      // 6 variants: Whipped Cream Rosettes (Continuous / Regular) x (Solid, Alternating, Cherry).
      // Drawn from the top-down renders in pen-and-ink style: scalloped rim, spiralling layers
      // winding to a raised centre peak, hatching on the shadow side, cast-shadow stipple.
      const isAlt = str.includes('alt');
      const isCherry = str.includes('cherry');
      const isContinuous = str.includes('continuous');
      const altRgb = secondaryColor ? hexToRgb(secondaryColor) : [Math.min(255, rgb[0] + 75), Math.min(255, rgb[1] + 75), Math.min(255, rgb[2] + 75)];
      const cy = wallY + wallH * 0.5;

      let seed = 31337;
      const rnd = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (doc.setLineCap) doc.setLineCap(1);
      if (doc.setLineJoin) doc.setLineJoin(1);

      const taper = (pts, wMax, col) => {
        if (pts.length < 2) return;
        const L = []; const R = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
          const tx = b[0] - a[0]; const ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
          const u = i / (pts.length - 1);
          const w = (wMax * Math.sin(Math.PI * u) ** 0.7 + 0.03) / 2;
          L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
          R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
        }
        const poly = [...L, ...R.reverse()];
        const segs = [];
        for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
        doc.setFillColor(...col);
        doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);
      };
      const outline = (pts, lw, col) => {
        const segs = [];
        for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...col);
        doc.setLineWidth(lw);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'FD', true);
      };
      const dot = (x, y, r, col) => { doc.setFillColor(...col); doc.circle(x, y, r, 'F'); };

      const shadow = (x, y, R, col) => {
        const sx = x - R * 0.3; const sy = y - R * 0.26;
        for (let i = 0, got = 0; i < 400 && got < Math.round(R * 4.2); i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R * 1.06;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 0.98 || d > R * 1.38 || px < wallX + 0.4 || px > wallX + wallW - 0.4) continue;
          dot(px, py, 0.07 + rnd() * 0.1, col); got++;
        }
        for (let i = 0, got = 0; i < 400 && got < Math.round(R * 2.4); i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 1.04 || d > R * 1.3 || px < wallX + 0.6 || px > wallX + wallW - 0.8) continue;
          taper([[px, py], [px + R * 0.12, py + R * 0.12]], 0.24, col);
          got++;
        }
      };

      const rosette = (x, y, R, col) => {
        // scalloped rim
        const rim = [];
        const steps = 120;
        for (let i = 0; i < steps; i++) {
          const th = (i / steps) * Math.PI * 2;
          const rr = R * (1 + 0.022 * Math.sin(th * 17 + 1.3) + 0.018 * Math.sin(th * 7 + 0.4));
          rim.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr]);
        }
        outline(rim, Math.max(0.45, R * 0.05), col);
        // stacked piped layers: broken, slightly drifting rings around the centre peak
        [[0.84, 200, 330], [0.84, 20, 140], [0.64, 170, 320], [0.64, 345, 130], [0.44, 190, 310], [0.44, 10, 110]].forEach(([f, a0, a1], k) => {
          const pts = [];
          const sweep = ((a1 - a0 + 360) % 360) || 360;
          for (let i = 0; i <= 16; i++) {
            const a = ((a0 + (sweep * i) / 16) * Math.PI) / 180;
            const wob = 1 + 0.03 * Math.sin(a * 5 + k);
            pts.push([x + R * 0.03 * f + Math.cos(a) * R * f * wob, y + R * 0.03 * f + Math.sin(a) * R * f * wob]);
          }
          taper(pts, R * (0.075 - 0.01 * Math.floor(k / 2)), col);
        });
        // short lap marks between the arms (the ragged edge of each piped layer)
        for (let k = 0; k < 9; k++) {
          const th = rnd() * Math.PI * 2; const rr = R * (0.35 + rnd() * 0.5);
          const a0 = [x + Math.cos(th) * rr, y + Math.sin(th) * rr];
          const th2 = th + 0.3 + rnd() * 0.2;
          const a1 = [x + Math.cos(th2) * rr * 0.97, y + Math.sin(th2) * rr * 0.97];
          taper([a0, [(a0[0] + a1[0]) / 2 + R * 0.01, (a0[1] + a1[1]) / 2 + R * 0.01], a1], R * 0.035, col);
        }
        // shading on the upper-left rim (shadow side)
        const n = Math.round(R * 3.4);
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.85 + 1.0 * (i / (n - 1)));
          const len = R * (0.14 + 0.18 * Math.sin((i / (n - 1)) * Math.PI)) * (0.8 + 0.4 * rnd());
          const x0 = x + Math.cos(a) * (R - 0.06); const y0 = y + Math.sin(a) * (R - 0.06);
          taper([[x0, y0], [x0 - Math.cos(a) * len + len * 0.15, y0 - Math.sin(a) * len]], R * 0.065, col);
        }
        // centre peak: small raised knob with a shadow crescent
        doc.setDrawColor(...col);
        doc.setLineWidth(Math.max(0.25, R * 0.03));
        doc.setFillColor(255, 255, 255);
        doc.circle(x, y, R * 0.15, 'FD');
        taper(Array.from({ length: 8 }, (_, i) => {
          const a = ((200 + i * 12) * Math.PI) / 180;
          return [x + Math.cos(a) * R * 0.11, y + Math.sin(a) * R * 0.11];
        }), R * 0.04, col);
        dot(x + R * 0.05, y + R * 0.04, R * 0.012, col);
      };

      const cherry = (x, y, R) => {
        const r = R * 0.52;
        doc.setFillColor(176, 14, 36);
        doc.setDrawColor(90, 6, 18);
        doc.setLineWidth(Math.max(0.3, R * 0.03));
        doc.circle(x, y, r, 'FD');
        // dark shade crescent lower right
        taper(Array.from({ length: 10 }, (_, i) => {
          const a = ((10 + i * 9) * Math.PI) / 180;
          return [x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82];
        }), r * 0.14, [90, 6, 18]);
        doc.setFillColor(255, 255, 255);
        doc.circle(x + r * 0.45, y - r * 0.5, r * 0.1, 'F');
        doc.circle(x - r * 0.3, y - r * 0.62, r * 0.06, 'F');
        // stem
        doc.setFillColor(40, 90, 36);
        doc.setDrawColor(40, 90, 36);
        doc.setLineWidth(Math.max(0.35, R * 0.04));
        doc.line(x - r * 0.1, y - r * 0.05, x - r * 0.62, y - r * 0.45);
        doc.circle(x - r * 0.1, y - r * 0.05, r * 0.11, 'F');
      };

      let R; let xs;
      if (isContinuous) { R = wallW * 0.138; const st = (wallW - 2 * R - 1.5) / 3; xs = [0, 1, 2, 3].map((i) => wallX + 0.75 + R + i * st); }
      else { R = wallW * 0.185; xs = [wallX + wallW * 0.3, wallX + wallW * 0.7]; }
      const cols = xs.map((_, i) => ((isAlt && i % 2 === 1) ? altRgb : rgb));
      xs.forEach((x, i) => shadow(x, cy, R, cols[i]));
      xs.forEach((x, i) => {
        rosette(x, cy, R, cols[i]);
        // continuous cherry render shows a cherry on every other rosette; the regular one on both
        if (isCherry && (!isContinuous || i % 2 === 0)) cherry(x, cy, R);
      });
      break;
    }

    case 'fruitConfection': {
      // 6 variants drawn from the top-down renders: Hershey's Kisses Rim, Hershey and Ferrero,
      // Ferrero Rocher Rim, Ferrero and Cherry, Cherry Rim, Cherry and Hershey.
      // Pen-and-ink style: bold outlines, tapered contour/crease strokes, hatching on the
      // shadow side (upper-left, matching the render's cast shadow) and stipple.
      const cy = wallY + wallH * 0.5;
      const ink = rgb;

      let seed = 777;
      const rnd = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (doc.setLineCap) doc.setLineCap(1);
      if (doc.setLineJoin) doc.setLineJoin(1);

      const taper = (pts, wMax, col = ink) => {
        if (pts.length < 2) return;
        const L = []; const R = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
          const tx = b[0] - a[0]; const ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
          const u = i / (pts.length - 1);
          const w = (wMax * Math.sin(Math.PI * u) ** 0.7 + 0.03) / 2;
          L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
          R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
        }
        const poly = [...L, ...R.reverse()];
        const segs = [];
        for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
        doc.setFillColor(...col);
        doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);
      };
      const arc = (x, y, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
        const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
        return [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
      });
      const outline = (pts, lw, fill = [255, 255, 255], col = ink) => {
        const segs = [];
        for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        doc.setFillColor(...fill);
        doc.setDrawColor(...col);
        doc.setLineWidth(lw);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'FD', true);
      };
      const dot = (x, y, r, col = ink) => { doc.setFillColor(...col); doc.circle(x, y, r, 'F'); };

      // cast shadow on the cake, upper-left of the item
      const shadow = (x, y, R) => {
        const sx = x - R * 0.28; const sy = y - R * 0.24;
        for (let i = 0, got = 0; i < 500 && got < Math.round(R * 4.5); i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R * 1.08;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 0.98 || d > R * 1.4) continue;
          dot(px, py, 0.07 + rnd() * 0.1); got++;
        }
        for (let i = 0, got = 0; i < 500 && got < Math.round(R * 2.6); i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 1.04 || d > R * 1.3) continue;
          taper([[px, py], [px + R * 0.11, py + R * 0.11]], 0.24);
          got++;
        }
      };

      // ---- Hershey's Kiss (top-down dome with the pinched tip right of centre) ----
      const kiss = (x, y, R) => {
        outline(arc(x, y, R, R, 0, 360, 60), Math.max(0.45, R * 0.045));
        // shading hatching inside the upper-left rim
        const n = Math.round(R * 3.6);
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.8 + 1.15 * (i / (n - 1)));
          const len = R * (0.16 + 0.22 * Math.sin((i / (n - 1)) * Math.PI)) * (0.8 + 0.4 * rnd());
          const x0 = x + Math.cos(a) * (R - 0.06); const y0 = y + Math.sin(a) * (R - 0.06);
          taper([[x0, y0], [x0 - Math.cos(a) * len + len * 0.12, y0 - Math.sin(a) * len]], R * 0.06);
        }
        // contour arcs of the dome
        taper(arc(x, y, R * 0.8, R * 0.8, 150, 290), R * 0.045);
        taper(arc(x + R * 0.04, y + R * 0.03, R * 0.6, R * 0.6, 170, 300), R * 0.035);
        // highlight crescent lower right
        taper(arc(x, y, R * 0.76, R * 0.76, 15, 85, 9), R * 0.035);
        // pinched tip: a small teardrop pointing right, with fold lines
        const tx = x + R * 0.28; const ty = y + R * 0.05;
        outline([[tx - R * 0.12, ty - R * 0.08], [tx + R * 0.14, ty], [tx - R * 0.12, ty + R * 0.1], [tx - R * 0.17, ty + R * 0.01]], Math.max(0.3, R * 0.035), [255, 255, 255]);
        taper([[tx - R * 0.45, ty - R * 0.04], [tx - R * 0.25, ty - R * 0.02], [tx - R * 0.08, ty]], R * 0.04);
        taper([[tx - R * 0.4, ty + R * 0.12], [tx - R * 0.22, ty + R * 0.08], [tx - R * 0.08, ty + R * 0.04]], R * 0.03);
        taper([[tx + R * 0.02, ty + R * 0.12], [tx + R * 0.12, ty + R * 0.1], [tx + R * 0.2, ty + R * 0.14]], R * 0.03);
      };

      // ---- Ferrero Rocher (spiky, nutty chocolate sphere) ----
      const ferrero = (x, y, R) => {
        const rim = [];
        const M = 34;
        for (let i = 0; i < M; i++) {
          const th = (i / M) * Math.PI * 2;
          const rr = R * (i % 2 === 0 ? 1.0 + 0.04 * rnd() : 0.88 + 0.04 * rnd());
          rim.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr]);
        }
        outline(rim, Math.max(0.45, R * 0.045));
        // second ring of flakes just inside the rim
        for (let i = 0; i < 17; i++) {
          const th = ((i + 0.3) / 17) * Math.PI * 2;
          const p0 = [x + Math.cos(th - 0.09) * R * 0.86, y + Math.sin(th - 0.09) * R * 0.86];
          const p1 = [x + Math.cos(th) * R * 0.72, y + Math.sin(th) * R * 0.72];
          const p2 = [x + Math.cos(th + 0.09) * R * 0.86, y + Math.sin(th + 0.09) * R * 0.86];
          taper([p0, p1, p2], R * 0.05);
        }
        // hazelnut blobs in two staggered rings, each with shadow hatching on the lower right
        const blob = (bx, by, br) => {
          outline(arc(bx, by, br, br * 0.92, 0, 360, 18), Math.max(0.25, R * 0.03));
          taper(arc(bx, by, br * 0.7, br * 0.65, 20, 120, 6), br * 0.13);
          for (let k = 0; k < 3; k++) {
            const a = (0.2 + k * 0.45);
            const x0 = bx + Math.cos(a) * br * 0.9; const y0 = by + Math.sin(a) * br * 0.9;
            taper([[x0, y0], [x0 - br * 0.25, y0 - br * 0.12]], R * 0.03);
          }
          dot(bx - br * 0.35, by - br * 0.4, Math.max(0.05, br * 0.06), [255, 255, 255]);
        };
        for (let i = 0; i < 8; i++) {
          const th = (i / 8) * Math.PI * 2 + 0.2;
          blob(x + Math.cos(th) * R * 0.62, y + Math.sin(th) * R * 0.62, R * (0.13 + 0.04 * rnd()));
        }
        for (let i = 0; i < 5; i++) {
          const th = (i / 5) * Math.PI * 2 + 0.7;
          blob(x + Math.cos(th) * R * 0.32, y + Math.sin(th) * R * 0.32, R * (0.15 + 0.04 * rnd()));
        }
        // swirling creases radiating from the centre point
        for (let i = 0; i < 10; i++) {
          const th = (i / 10) * Math.PI * 2 + rnd() * 0.2;
          taper([[x, y], [x + Math.cos(th + 0.08) * R * 0.09, y + Math.sin(th + 0.08) * R * 0.09], [x + Math.cos(th + 0.12) * R * 0.17, y + Math.sin(th + 0.12) * R * 0.17]], R * 0.025);
        }
        // shading on the upper-left rim
        const n = Math.round(R * 2.6);
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.85 + 1.0 * (i / (n - 1)));
          const len = R * (0.12 + 0.14 * Math.sin((i / (n - 1)) * Math.PI));
          const x0 = x + Math.cos(a) * (R * 0.95); const y0 = y + Math.sin(a) * (R * 0.95);
          taper([[x0, y0], [x0 - Math.cos(a) * len, y0 - Math.sin(a) * len]], R * 0.05);
        }
      };

      // ---- Cherry (red, rounded-square top view, with stem and highlights) ----
      const RED = [176, 14, 36]; const DARK = [90, 6, 18];
      const cherry = (x, y, R) => {
        // faint cast shadow + the long thin stem shadow
        const sx = x - R * 0.2; const sy = y - R * 0.2;
        for (let i = 0, got = 0; i < 400 && got < Math.round(R * 3); i++) {
          const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()) * R * 1.1;
          const px = sx + Math.cos(a) * rr; const py = sy + Math.sin(a) * rr;
          const d = Math.hypot(px - x, py - y);
          if (d < R * 1.0 || d > R * 1.3) continue;
          dot(px, py, 0.07 + rnd() * 0.08); got++;
        }
        taper([[x - R * 0.9, y - R * 1.1], [x - R * 0.6, y - R * 0.85], [x - R * 0.3, y - R * 0.55]], R * 0.04);
        const body = [];
        for (let i = 0; i < 64; i++) {
          const th = (i / 64) * Math.PI * 2;
          const c = Math.cos(th); const s = Math.sin(th);
          const rr = R * (1.02 - 0.04 * Math.cos(4 * th + 0.6));
          body.push([x + Math.sign(c) * Math.abs(c) ** 0.95 * rr, y + Math.sign(s) * Math.abs(s) ** 0.95 * rr]);
        }
        outline(body, Math.max(0.4, R * 0.04), RED, DARK);
        // dark shading lower right + upper-left crescent
        taper(arc(x, y, R * 0.84, R * 0.84, 10, 100, 12), R * 0.16, DARK);
        taper(arc(x, y, R * 0.86, R * 0.86, 190, 260, 10), R * 0.08, DARK);
        // highlights
        doc.setFillColor(255, 255, 255);
        taper(arc(x, y, R * 0.7, R * 0.7, 235, 275, 6), R * 0.07, [255, 255, 255]);
        taper(arc(x, y, R * 0.7, R * 0.7, 20, 40, 4), R * 0.06, [255, 255, 255]);
        // stem
        doc.setDrawColor(40, 90, 36);
        doc.setLineWidth(Math.max(0.4, R * 0.07));
        doc.line(x - R * 0.05, y - R * 0.05, x - R * 0.62, y - R * 0.5);
        dot(x - R * 0.05, y - R * 0.05, R * 0.1, [40, 90, 36]);
        dot(x - R * 0.64, y - R * 0.52, R * 0.06, [120, 90, 50]);
      };

      const R1 = wallW * 0.2;
      const R2 = wallW * 0.17;
      const mid = wallX + wallW / 2;
      const left = wallX + wallW * 0.3;
      const right = wallX + wallW * 0.7;

      if (str.includes('hershey') && str.includes('sparse')) {
        // Hershey and Ferrero
        shadow(left, cy, R2); shadow(right, cy, R2);
        ferrero(left, cy, R2); kiss(right, cy, R2 * 0.95);
      } else if (str.includes('ferrero') && str.includes('sparse')) {
        // Ferrero and Cherry
        shadow(right, cy, R2); cherry(left, cy, R2 * 0.8);
        ferrero(right, cy, R2);
      } else if (str.includes('cherry') && str.includes('sparse')) {
        // Cherry and Hershey
        shadow(right, cy, R2); cherry(left, cy, R2 * 0.8);
        kiss(right, cy, R2 * 0.95);
      } else if (str.includes('hershey')) {
        shadow(mid, cy, R1); kiss(mid, cy, R1);
      } else if (str.includes('ferrero')) {
        shadow(mid, cy, R1); ferrero(mid, cy, R1);
      } else {
        cherry(mid, cy, R1 * 0.85);
      }
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

function renderDripDrawing(doc, { wallX, wallY, wallW, wallH, patternId, rgb, natural = false }) {
  const str = String(patternId || '').toLowerCase();
  const H = wallH - 3.0;            // glaze geometry height (the bottom edge sags a little below it)
  let tang = 0.5;                    // Bezier tangent length (smaller = narrower, pointier tongues)

  // wave coverage helper: 3 soft dips between crests
  const wave = (dipY, crestY) => [
    [0.00, crestY], [0.17, dipY], [0.33, crestY], [0.50, dipY], [0.66, crestY], [0.83, dipY], [1.00, crestY],
  ];

  const isNatural = natural || str.includes('natural');
  let keyNodes;
  if (isNatural && !str.includes('tinytip') && !str.includes('curve') && !str.includes('uneven')) {
    // Natural Tear: poured glaze with a lumpy lower edge and two long thin runs
    // (checked first: the id 'naturalTear' contains the letters "alt" and used to match Long & Short Drips)
    tang = 0.4;
    keyNodes = [
      [0.00, 0.34], [0.06, 0.34], [0.14, 0.86, 0.1], [0.21, 0.55, 0.3], [0.35, 0.44],
      [0.50, 0.62], [0.62, 0.54], [0.70, 0.93, 0.1], [0.78, 0.27, 0.45], [0.88, 0.28], [0.95, 0.36], [1.00, 0.36],
    ];
  } else if (str.includes('alt')) {
    // Long & Short Drips: one long narrow tongue, one short wide one (as in the render)
    tang = 0.36;
    keyNodes = [
      [0.00, 0.14], [0.07, 0.50], [0.14, 0.19], [0.27, 0.95], [0.46, 0.17],
      [0.64, 0.56], [0.82, 0.18], [0.95, 0.86], [1.00, 0.86],
    ];
  } else if (str.includes('short') && !str.includes('wave')) {
    // Short Drips: two shallow rounded drips between crests
    tang = 0.42;
    keyNodes = [
      [0.00, 0.50], [0.06, 0.52], [0.15, 0.20], [0.31, 0.56], [0.48, 0.18],
      [0.69, 0.56], [0.87, 0.21], [0.95, 0.50], [1.00, 0.50],
    ];
  } else if (str.includes('longwave') || (str.includes('full') && str.includes('wave'))) {
    tang = 0.5;
    keyNodes = wave(0.88, 0.80);
  } else if (str.includes('midwave') || (str.includes('mid') && str.includes('wave'))) {
    tang = 0.5;
    keyNodes = wave(0.53, 0.44);
  } else if (str.includes('shortwave') || (str.includes('short') && str.includes('wave'))) {
    tang = 0.5;
    keyNodes = wave(0.25, 0.14);
  } else if (str.includes('tinytip') || str.includes('curve')) {
    // Wave Curve: a glaze cap with a softly undulating edge (two dips, three white peaks)
    tang = 0.5;
    keyNodes = [
      [0.00, 0.55], [0.13, 0.38], [0.30, 0.58], [0.46, 0.37], [0.66, 0.60], [0.82, 0.38], [0.95, 0.55], [1.00, 0.55],
    ];
  } else if (str.includes('uneven') || str.includes('fall')) {
    // Tear Fall: wide rounded arches of cake between thin, long, uneven tails (3rd value = handle length)
    tang = 0.45;
    keyNodes = [
      [0.00, 0.24], [0.06, 0.20, 0.5], [0.17, 0.80, 0.1], [0.31, 0.19, 0.5], [0.46, 0.53, 0.1],
      [0.62, 0.20, 0.5], [0.77, 0.82, 0.1], [0.92, 0.22, 0.5], [1.00, 0.26],
    ];
  } else {
    // Long Drips (default / Natural Tear): two long tapering tongues, cake showing between
    tang = 0.22;
    keyNodes = [
      [0.00, 0.92], [0.03, 0.92], [0.10, 0.17], [0.28, 0.96], [0.50, 0.17],
      [0.69, 0.96], [0.88, 0.17], [0.97, 0.92], [1.00, 0.92],
    ];
  }

  // bottom edge of the cake (sags in the middle like the front of a cylinder)
  const botY = (x) => {
    const u = (x - wallX) / wallW;
    return wallY + H + 2.4 * (1 - (2 * u - 1) ** 2);
  };

  // --- glaze edge curve ---
  const curve = [];
  for (let i = 0; i < keyNodes.length - 1; i++) {
    const p0 = { x: wallX + keyNodes[i][0] * wallW, y: wallY + keyNodes[i][1] * H };
    const p3 = { x: wallX + keyNodes[i + 1][0] * wallW, y: wallY + keyNodes[i + 1][1] * H };
    const dx = p3.x - p0.x;
    const k0 = keyNodes[i][2] ?? tang;
    const k3 = keyNodes[i + 1][2] ?? tang;
    const p1 = { x: p0.x + dx * k0, y: p0.y };
    const p2 = { x: p3.x - dx * k3, y: p3.y };
    for (let s = 0; s < 28; s++) {
      const t = s / 28; const mt = 1 - t;
      curve.push({
        x: mt ** 3 * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t ** 3 * p3.x,
        y: mt ** 3 * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t ** 3 * p3.y,
      });
    }
  }
  const last = keyNodes[keyNodes.length - 1];
  curve.push({ x: wallX + last[0] * wallW, y: wallY + last[1] * H });
  curve.forEach((p) => { p.y = Math.min(p.y, botY(p.x) - 0.5); });

  // deterministic rng
  let seed = 2468;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (doc.setLineCap) doc.setLineCap(1);
  if (doc.setLineJoin) doc.setLineJoin(1);

  const taper = (pts, wMax, flat = false) => {
    if (pts.length < 2) return;
    const L = []; const R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b[0] - a[0]; const ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1;
      const u = i / (pts.length - 1);
      const w = (flat ? wMax : wMax * Math.sin(Math.PI * u) ** 0.6 + 0.03) / 2;
      L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
      R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
    }
    const poly = [...L, ...R.reverse()];
    const segs = [];
    for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
    doc.setFillColor(...rgb);
    doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);
  };

  // 1. glaze curtain: light tint of the glaze colour, filled from the rim down to the edge curve
  const tint = rgb.map((c) => Math.round(c + (255 - c) * 0.6));
  doc.setFillColor(...tint);
  const poly = [[wallX, wallY], [wallX + wallW, wallY], ...[...curve].reverse().map((p) => [p.x, p.y])];
  const segs = [];
  for (let i = 1; i < poly.length; i++) segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
  doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);

  // 2. cake body outline: sides + sagging bottom
  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.55);
  doc.line(wallX, wallY, wallX, botY(wallX));
  doc.line(wallX + wallW, wallY, wallX + wallW, botY(wallX + wallW));
  let prev = null;
  for (let i = 0; i <= 40; i++) {
    const x = wallX + (wallW * i) / 40;
    const p = [x, botY(x)];
    if (prev) doc.line(prev[0], prev[1], p[0], p[1]);
    prev = p;
  }

  // 3. sponge stipple on the exposed cake, below the glaze edge
  const stippleN = 420;
  for (let i = 0, got = 0; i < 4000 && got < stippleN; i++) {
    const x = wallX + 0.6 + rnd() * (wallW - 1.2);
    const y = wallY + rnd() * (H + 2.4);
    // find curve y at x
    let cyAt = wallY;
    for (let k = 0; k < curve.length - 1; k++) {
      if (curve[k].x <= x && curve[k + 1].x >= x) { cyAt = curve[k].y; break; }
    }
    if (y < cyAt + 1.1 || y > botY(x) - 0.6) continue;
    doc.setFillColor(...rgb);
    doc.circle(x, y, 0.06 + rnd() * 0.08, 'F');
    got++;
  }

  // 4. bold glaze edge with a thinner inner lip line, plus shading hatches just above the edge
  for (let i = 0; i < curve.length - 1; i += 1) {
    const a = curve[i]; const b = curve[i + 1];
    doc.setLineWidth(0.62);
    doc.line(a.x, a.y, b.x, b.y);
  }
  for (let i = 3; i < curve.length - 3; i += 2) {
    const a = curve[i - 2]; const b = curve[i + 2];
    const dx = b.x - a.x; const dy = b.y - a.y;
    const slope = Math.abs(dy / (dx || 0.001));
    // hatch strokes lean from the edge up into the glaze; longer on steep (shadowed) flanks
    const len = (1.0 + 4.2 * Math.min(1, slope * 0.5)) * (0.7 + 0.6 * rnd());
    if (rnd() < 0.15) continue;
    const p = curve[i];
    taper([[p.x, p.y - 0.25], [p.x + (dy > 0 ? 0.35 : -0.35) * len * 0.4, p.y - len]], 0.34);
  }
  // inner lip line (thin, broken) following the edge
  let run = [];
  for (let i = 0; i < curve.length; i++) {
    const p = curve[i];
    const off = 1.1;
    const brk = Math.sin(i * 0.37) > 0.82;
    if (brk) { taper(run, 0.22); run = []; continue; }
    run.push([p.x, p.y - off]);
  }
  taper(run, 0.22);

  // fold lines running down each tongue (local lowest points of the edge)
  let lastFoldX = -1e9;
  for (let i = 8; i < curve.length - 8; i++) {
    const c = curve[i];
    if (!str.includes('wave') && c.x - lastFoldX > wallW * 0.15 && c.x > wallX + wallW * 0.12 && c.x < wallX + wallW * 0.9 && c.y > wallY + H * 0.35 && c.y >= curve[i - 6].y && c.y >= curve[i + 6].y && c.y > curve[i - 8].y + 0.01) {
      lastFoldX = c.x;
      [-1, 1].forEach((sg) => {
        const x = c.x + sg * Math.min(2.6, wallW * 0.035);
        const yEnd = c.y - Math.min(4, (c.y - wallY) * 0.2);
        taper([[x, wallY + 4], [x - sg * 0.3, (wallY + 4 + yEnd) / 2], [x, yEnd]], 0.26);
      });
    }
  }

  // 5. rim of the glaze at the top + soft vertical sheen lines on the cylinder
  taper(Array.from({ length: 24 }, (_, i) => [wallX + (wallW * i) / 23, wallY + 1.7 + 0.25 * Math.sin((i / 23) * Math.PI)]), 0.3);
  [[0.05, 0.9], [0.1, 0.7], [0.93, 0.8]].forEach(([fx, fy]) => {
    const x = wallX + fx * wallW;
    const yEnd = wallY + 3 + (Math.min(...curve.filter((p) => Math.abs(p.x - x) < 1.5).map((p) => p.y), wallY + H) - wallY - 3) * fy;
    if (yEnd > wallY + 6) taper([[x, wallY + 3], [x + 0.2, (wallY + 3 + yEnd) / 2], [x, yEnd]], 0.2);
  });
}

/**
 * Renders the 2D Pattern Drawing for Textured Buttercream Finish (Exterior Finish) - Front View
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
  badge = '2D FRONT VIEW',
}) {
  doc.saveGraphicsState?.();

  // 1. Framed outer container (crisp white card)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Badge: 2D FRONT VIEW
  drawBadge(doc, badge, x + 3, y + 3, [35, 30, 30]);

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

  const str = String(texture || '').toLowerCase();
  const isVerticalTex = str.includes('vertical');
  if (!isVerticalTex) {
    // ---- Ink style front view for Ridge Comb / Ribbon Wrap (drawn from the 3D renders) ----
    const isRibbonTex = str.includes('ribbon');
    const count = isRibbonTex ? 24 : 13;
    const amp = isRibbonTex ? 0.35 : 0.75;            // silhouette bump depth (mm)
    const groveW = isRibbonTex ? 0.42 : 0.62;
    const hatchFrac = isRibbonTex ? 0.34 : 0.42;
    const sagA = 1.3;                                  // cylinder-front sag of every ridge line
    const top = wallY + 1.6;
    const bottom = wallY + wallH - 2.0;
    const pitch = (bottom - top) / count;
    const tintRgb = rgb.map((c) => Math.round(c + (255 - c) * 0.6));
    let seed = 1357;
    const rnd = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    if (doc.setLineCap) doc.setLineCap(1);
    if (doc.setLineJoin) doc.setLineJoin(1);
    const sag = (xx) => { const u = (xx - wallX) / wallW; return sagA * (1 - (2 * u - 1) ** 2); };
    const taperPoly = (pts, wMax, flat = false) => {
      if (pts.length < 2) return;
      const L = []; const R = [];
      for (let i = 0; i < pts.length; i++) {
        const pa = pts[Math.max(0, i - 1)]; const pb = pts[Math.min(pts.length - 1, i + 1)];
        const tx = pb[0] - pa[0]; const ty = pb[1] - pa[1]; const l = Math.hypot(tx, ty) || 1;
        const u = i / (pts.length - 1);
        const w = (flat ? wMax : wMax * Math.sin(Math.PI * u) ** 0.5 + 0.03) / 2;
        L.push([pts[i][0] - (ty / l) * w, pts[i][1] + (tx / l) * w]);
        R.push([pts[i][0] + (ty / l) * w, pts[i][1] - (tx / l) * w]);
      }
      const poly = [...L, ...R.reverse()];
      const sg = [];
      for (let i = 1; i < poly.length; i++) sg.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
      doc.setFillColor(...rgb);
      doc.lines(sg, poly[0][0], poly[0][1], [1, 1], 'F', true);
    };
    const bottomY = (xx) => bottom + pitch * 0.5 + sag(xx) * 1.2;

    // tinted body
    doc.setFillColor(...tintRgb);
    doc.rect(wallX, wallY, wallW, wallH, 'F');
    // white corners outside the sagging bottom so the base reads as a curve
    doc.setFillColor(255, 255, 255);
    for (let i = 0; i < 40; i++) {
      const x0 = wallX + (wallW * i) / 40;
      doc.rect(x0, bottomY(x0 + wallW / 80), wallW / 40 + 0.05, wallY + wallH - bottomY(x0 + wallW / 80) + 0.01, 'F');
    }

    // ridges: groove line, shadow hatching beneath it, soft highlight line on the crest
    const N = 36;
    for (let r = 0; r <= count; r++) {
      const gy = top + r * pitch;               // groove (valley) line y at the edges
      const line = Array.from({ length: N + 1 }, (_, i) => {
        const xx = wallX + (wallW * i) / N;
        return [xx, gy + sag(xx)];
      });
      if (r > 0 && r < count) taperPoly(line, groveW * (0.85 + 0.3 * rnd()), true);
      if (r === count) continue;
      // shadow hatching just below the groove line: evenly spaced, slightly jittered strokes
      const stepX = isRibbonTex ? 0.9 : 1.1;
      for (let xx = wallX + 0.8; xx < wallX + wallW - 0.6; xx += stepX) {
        const jx = xx + (rnd() - 0.5) * 0.3;
        const len = pitch * hatchFrac * (0.55 + 0.6 * rnd());
        const y0 = gy + sag(jx) + 0.12;
        taperPoly([[jx, y0], [jx - 0.1, y0 + len]], 0.2);
      }
      // highlight crest: thin continuous line across the upper part of the ridge
      taperPoly(Array.from({ length: N + 1 }, (_, i) => {
        const xx = wallX + (wallW * i) / N;
        return [xx, gy + pitch * 0.62 + sag(xx)];
      }), 0.14);
    }

    // top rim arc and bold scalloped side silhouette
    taperPoly(Array.from({ length: N + 1 }, (_, i) => { const xx = wallX + (wallW * i) / N; return [xx, top - 0.6 + sag(xx) * 0.4]; }), 0.5);
    const edgeL = []; const edgeR = [];
    for (let i = 0; i <= count * 2; i++) {
      const yy = top + (i * pitch) / 2;
      const bump = (i % 2 === 0) ? amp : 0;          // inward at grooves, full at crests
      edgeL.push([wallX + bump, yy]);
      edgeR.push([wallX + wallW - bump, yy]);
    }
    taperPoly([[wallX, wallY], ...edgeL, [wallX, bottomY(wallX)]], 0.62, true);
    taperPoly([[wallX + wallW, wallY], ...edgeR, [wallX + wallW, bottomY(wallX + wallW)]], 0.62, true);
    taperPoly(Array.from({ length: N + 1 }, (_, i) => { const xx = wallX + (wallW * i) / N; return [xx, bottomY(xx)]; }), 0.7, true);
  } else {
    doc.setFillColor(...crownRgb);
    doc.rect(wallX, wallY, wallW, wallH, 'F');
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
  }

  // Crisp black outer boundary outline
  doc.setDrawColor(25, 20, 20);
  doc.setLineWidth(0.7);
  if (isVerticalTex) doc.rect(wallX, wallY, wallW, wallH, 'S');

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...INK);
  const titleText = `${String(textureName).toUpperCase()} · ${String(colorName).toUpperCase()}`;
  doc.text(titleText, x + 9, footerY + 1.2);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the 2D Side View Drawing for Textured Buttercream Finish (Exterior Finish)
 * Shows the cake wall cross-section profile and the protruding bumps in side elevation:
 * - Ridge Comb: wider in bumps like a short hill (gentle rolling slope, lower amplitude)
 * - Ribbon Wrap: very striking hill bumps (prominent convex outward relief, striking hill shape)
 */
export function drawTexturedFinishSideSchematic(doc, {
  x,
  y,
  w = 54,
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

  // Badge: 2D SIDE VIEW
  drawBadge(doc, '2D SIDE VIEW', x + 3, y + 3, [35, 30, 30]);

  // Profile callout chip at top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(140, 115, 115);
  doc.text('PROFILE', x + w - 4, y + 7, { align: 'right' });

  // 2. Wall Drawing Area
  const wallMarginX = 5;
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
  const crownRgb = rgb;
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

  // Interior Cake Core (sponge cross-section on left side)
  const coreW = 10;
  doc.setFillColor(243, 238, 232);
  doc.rect(wallX, wallY, coreW, wallH, 'F');
  // Subtle core label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(175, 160, 155);
  doc.text('CORE', wallX + coreW / 2, wallY + wallH / 2 + 1.2, { align: 'center' });

  // Cake wall boundary line (dividing sponge core and frosting)
  const wallLineX = wallX + coreW;
  doc.setDrawColor(205, 195, 190);
  doc.setLineWidth(0.4);
  doc.line(wallLineX, wallY, wallLineX, wallY + wallH);

  // Frosting base coat thickness
  const baseT = 2.2;
  const xTrough = wallLineX + baseT;

  const str = String(texture || '').toLowerCase();
  const isRibbon = str.includes('ribbon');
  const isVertical = str.includes('vertical');

  if (isRibbon) {
    // Ribbon Wrap: 5 very striking, bold hill bumps
    const bands = 5;
    const bandH = wallH / bands;
    const relief = 11.5; // deep, prominent outward protrusion (striking hill)

    for (let b = 0; b < bands; b++) {
      const by = wallY + b * bandH;

      // Base frosting body behind bump
      doc.setFillColor(...crownRgb);
      doc.rect(wallLineX, by, baseT, bandH, 'F');

      // Draw the striking convex hill bump:
      const steps = 18;
      const hillPoints = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const py = by + t * bandH;
        // Steep convex hill that swells boldly outward like a striking hill bump
        const sinV = Math.sin(t * Math.PI);
        const bumpW = relief * Math.pow(sinV, 0.72);
        hillPoints.push({ x: xTrough + bumpW, y: py, t, bumpW });
      }

      // Shading: upper highlight, central crown, lower shadow
      for (let s = 0; s < hillPoints.length - 1; s++) {
        const pt1 = hillPoints[s];
        const pt2 = hillPoints[s + 1];
        const sliceY = pt1.y;
        const sliceH = pt2.y - pt1.y + 0.15;
        const avgBumpW = (pt1.bumpW + pt2.bumpW) / 2;
        const avgT = (pt1.t + pt2.t) / 2;

        if (avgT < 0.28) {
          doc.setFillColor(...highlightRgb);
        } else if (avgT < 0.68) {
          doc.setFillColor(...crownRgb);
        } else {
          doc.setFillColor(...shadowRgb);
        }
        doc.rect(xTrough, sliceY, Math.max(0.5, avgBumpW), sliceH, 'F');
      }

      // Specular glint on peak crest
      doc.setDrawColor(...specularColor);
      doc.setLineWidth(0.4);
      doc.line(xTrough + relief * 0.72, by + bandH * 0.35, xTrough + relief * 0.94, by + bandH * 0.45);

      // Outer outline tracing the striking hill bump contour
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.65);
      for (let s = 0; s < hillPoints.length - 1; s++) {
        doc.line(hillPoints[s].x, hillPoints[s].y, hillPoints[s + 1].x, hillPoints[s + 1].y);
      }

      // Dark crease seam between bumps
      if (b < bands - 1) {
        doc.setDrawColor(...creaseRgb);
        doc.setLineWidth(0.65);
        doc.line(wallLineX, by + bandH, xTrough + 1.2, by + bandH);
      }
    }

    // Callout annotation on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...INK);
    doc.text('STRIKING', wallX + wallW - 1, wallY + wallH * 0.40, { align: 'right' });
    doc.text('HILL BUMPS', wallX + wallW - 1, wallY + wallH * 0.40 + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(140, 115, 115);
    doc.text('(5 bands)', wallX + wallW - 1, wallY + wallH * 0.40 + 7.5, { align: 'right' });
  } else if (isVertical) {
    // Vertical Piping in side view: uniform vertical column bump profile
    const relief = 6;
    doc.setFillColor(...crownRgb);
    doc.rect(wallLineX, wallY, baseT, wallH, 'F');

    const waves = 10;
    const waveH = wallH / waves;
    for (let w = 0; w < waves; w++) {
      const wy = wallY + w * waveH;
      const steps = 14;
      const flutePoints = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const py = wy + t * waveH;
        const bumpW = relief * Math.sin(t * Math.PI);
        flutePoints.push({ x: xTrough + bumpW, y: py, t, bumpW });
      }
      for (let s = 0; s < flutePoints.length - 1; s++) {
        const pt1 = flutePoints[s];
        const pt2 = flutePoints[s + 1];
        doc.setFillColor(pt1.t < 0.5 ? highlightRgb[0] : shadowRgb[0], pt1.t < 0.5 ? highlightRgb[1] : shadowRgb[1], pt1.t < 0.5 ? highlightRgb[2] : shadowRgb[2]);
        doc.rect(xTrough, pt1.y, Math.max(0.5, (pt1.bumpW + pt2.bumpW) / 2), pt2.y - pt1.y + 0.15, 'F');
      }
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.55);
      for (let s = 0; s < flutePoints.length - 1; s++) {
        doc.line(flutePoints[s].x, flutePoints[s].y, flutePoints[s + 1].x, flutePoints[s + 1].y);
      }
    }
  } else {
    // Ridged Comb (default): 8 wider, short hill bumps
    const ridgeCount = 8;
    const ridgeH = wallH / ridgeCount;
    const relief = 5.2; // wider in bumps like a short hill (gentle rolling slope, lower amplitude)

    for (let r = 0; r < ridgeCount; r++) {
      const ry = wallY + r * ridgeH;

      // Base frosting body behind ridge
      doc.setFillColor(...crownRgb);
      doc.rect(wallLineX, ry, baseT, ridgeH, 'F');

      // Draw wider short hill bump:
      const steps = 14;
      const hillPoints = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const py = ry + t * ridgeH;
        // Sinusoidal rolling curve: gentle, wide short hill
        const bumpW = relief * Math.sin(t * Math.PI);
        hillPoints.push({ x: xTrough + bumpW, y: py, t, bumpW });
      }

      // Shading: upper gentle highlight, lower gentle shadow
      for (let s = 0; s < hillPoints.length - 1; s++) {
        const pt1 = hillPoints[s];
        const pt2 = hillPoints[s + 1];
        const sliceY = pt1.y;
        const sliceH = pt2.y - pt1.y + 0.15;
        const avgBumpW = (pt1.bumpW + pt2.bumpW) / 2;
        const avgT = (pt1.t + pt2.t) / 2;

        if (avgT < 0.35) {
          doc.setFillColor(...highlightRgb);
        } else if (avgT < 0.65) {
          doc.setFillColor(...crownRgb);
        } else {
          doc.setFillColor(...shadowRgb);
        }
        doc.rect(xTrough, sliceY, Math.max(0.5, avgBumpW), sliceH, 'F');
      }

      // Outer outline tracing the wide short hill contour
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(0.55);
      for (let s = 0; s < hillPoints.length - 1; s++) {
        doc.line(hillPoints[s].x, hillPoints[s].y, hillPoints[s + 1].x, hillPoints[s + 1].y);
      }

      // Trough crease line
      if (r < ridgeCount - 1) {
        doc.setDrawColor(...creaseRgb);
        doc.setLineWidth(0.45);
        doc.line(wallLineX, ry + ridgeH, xTrough + 0.8, ry + ridgeH);
      }
    }

    // Callout annotation on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...INK);
    doc.text('WIDE SHORT', wallX + wallW - 1, wallY + wallH * 0.40, { align: 'right' });
    doc.text('HILLS', wallX + wallW - 1, wallY + wallH * 0.40 + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(140, 115, 115);
    doc.text('(8 ridges)', wallX + wallW - 1, wallY + wallH * 0.40 + 7.5, { align: 'right' });
  }

  // Dimension bracket / relief indicator
  doc.setDrawColor(160, 140, 135);
  doc.setLineWidth(0.3);
  doc.line(wallLineX, wallY, wallX, wallY);
  doc.line(wallLineX, wallY + wallH, wallX, wallY + wallH);
  doc.line(wallX, wallY, wallX, wallY + wallH);

  // 4. Bottom footer of card
  const footerY = y + h - 5;
  doc.setFillColor(...rgb);
  doc.circle(x + 5, footerY, 2.2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 5, footerY, 2.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...INK);
  const titleText = `${String(textureName).toUpperCase()} · SIDE VIEW`;
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

export function resolveEdgeTreatment(designId) {
  const str = String(designId || '').toLowerCase();
  if (
    str.includes('beadedtrim') ||
    str.includes('morsedot') ||
    str.includes('grand') ||
    str.includes('petite') ||
    str.includes('trio')
  ) {
    return 'beadedTrim';
  }
  if (str.includes('dollop')) {
    return 'dollops';
  }
  if (str.includes('whipped') || str.includes('cream')) {
    return 'whippedCream';
  }
  if (
    str.includes('strawberr') ||
    str.includes('blueberr') ||
    str.includes('mango') ||
    str.includes('fruit') ||
    str.includes('confection') ||
    str.includes('cherry') ||
    str.includes('hershey') ||
    str.includes('ferrero')
  ) {
    return 'fruitConfection';
  }
  return 'borderPiping';
}

/**
 * Renders the 2D Pattern Drawing for Edge Border (Top or Bottom Edge)
 * Delegates to the unified pattern schematic pipeline so Edge uses the exact 2D patterns
 * (Border Piping traces, Beaded Trim, Dollops, Whipped Cream, Fruit & Confections).
 */
export function drawEdgePatternSchematic(doc, {
  x,
  y,
  w = 88,
  h = 74,
  slot = 'top',
  treatmentId = null,
  designId = 'shell',
  variantId = null,
  designName = 'Shell Border',
  patternName = null,
  color = '#F5E6C8',
  colorName = 'Vanilla',
  secondaryColor = null,
  baseFinish = 'Frosted',
}) {
  const vid = variantId || designId || 'shell';
  const tid = treatmentId || resolveEdgeTreatment(vid);
  const nameText = patternName || designName || vid;
  const label = slot ? `${String(slot).toUpperCase()} BORDER · ${String(nameText).toUpperCase()}` : nameText;

  return drawSidePatternSchematic(doc, {
    x,
    y,
    w,
    h,
    treatmentId: tid,
    variantId: vid,
    color,
    colorName,
    patternName: label,
    secondaryColor,
    baseFinish,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D Box & Curved Surface Projection Helpers for Assembling Schematics
// ─────────────────────────────────────────────────────────────────────────────

export function isBoxShape(shape) {
  const s = String(shape || '').toLowerCase();
  return s.includes('rect') || s.includes('square') || s.includes('cube') || s.includes('petit');
}

function drawPolygon(doc, pts, style = 'F') {
  if (!pts || pts.length < 3) return;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
}

function reStrokeBoxOutlines(doc, { cx, topY, rx, ry, totalCoreH, botY }) {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.75);
  // Top diamond
  drawPolygon(doc, [
    [cx, topY - ry],
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ], 'S');
  // Left vertical edge
  doc.line(cx - rx, topY, cx - rx, botY);
  // Center vertical ridge
  doc.line(cx, topY + ry, cx, botY + ry);
  // Right vertical edge
  doc.line(cx + rx, topY, cx + rx, botY);
  // Bottom edges
  doc.line(cx - rx, botY, cx, botY + ry);
  doc.line(cx, botY + ry, cx + rx, botY);
}

function renderBoxAssembledCore(doc, { cx, topY, rx, ry, totalCoreH, botY, bands, spRgb, fillRgb }) {
  const spongeHighlight = [
    Math.min(255, spRgb[0] + 16),
    Math.min(255, spRgb[1] + 16),
    Math.min(255, spRgb[2] + 16),
  ];
  const spongeShadow = [
    Math.max(0, spRgb[0] - 22),
    Math.max(0, spRgb[1] - 22),
    Math.max(0, spRgb[2] - 22),
  ];

  let currentY = topY;
  bands.forEach((band) => {
    const isSponge = band.type === 'sponge';
    const leftColor = isSponge ? spongeHighlight : fillRgb;
    const rightColor = isSponge ? spongeShadow : [
      Math.max(0, fillRgb[0] - 20),
      Math.max(0, fillRgb[1] - 20),
      Math.max(0, fillRgb[2] - 20),
    ];

    // Left face band quad
    doc.setFillColor(...leftColor);
    drawPolygon(doc, [
      [cx - rx, currentY],
      [cx, currentY + ry],
      [cx, currentY + band.h + ry],
      [cx - rx, currentY + band.h],
    ], 'F');

    // Right face band quad
    doc.setFillColor(...rightColor);
    drawPolygon(doc, [
      [cx, currentY + ry],
      [cx + rx, currentY],
      [cx + rx, currentY + band.h],
      [cx, currentY + band.h + ry],
    ], 'F');

    currentY += band.h;
  });

  // Top Diamond
  doc.setFillColor(...spongeHighlight);
  drawPolygon(doc, [
    [cx, topY - ry],
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ], 'F');

  // Seam lines between bands
  let seamY = topY;
  for (let i = 0; i < bands.length - 1; i++) {
    seamY += bands[i].h;
    const isFillingSeam = bands[i].type === 'filling' || bands[i + 1].type === 'filling';
    doc.setDrawColor(25, 20, 20);
    doc.setLineWidth(isFillingSeam ? 0.6 : 0.4);
    doc.line(cx - rx, seamY, cx, seamY + ry);
    doc.line(cx, seamY + ry, cx + rx, seamY);
  }

  // Outlines
  reStrokeBoxOutlines(doc, { cx, topY, rx, ry, totalCoreH, botY });
}

function renderBoxCoatedBase(doc, { cx, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture }) {
  const finishBase = fnRgb;
  const finishHighlight = [
    Math.min(255, fnRgb[0] + 16),
    Math.min(255, fnRgb[1] + 16),
    Math.min(255, fnRgb[2] + 16),
  ];
  const finishShadow = [
    Math.max(0, fnRgb[0] - 24),
    Math.max(0, fnRgb[1] - 24),
    Math.max(0, fnRgb[2] - 24),
  ];
  const finishDeepShadow = [
    Math.max(0, fnRgb[0] - 38),
    Math.max(0, fnRgb[1] - 38),
    Math.max(0, fnRgb[2] - 38),
  ];

  // 1. Left Face quad
  doc.setFillColor(...finishBase);
  drawPolygon(doc, [
    [cx - rx, topY],
    [cx, topY + ry],
    [cx, botY + ry],
    [cx - rx, botY],
  ], 'F');

  // 2. Right Face quad
  doc.setFillColor(...finishShadow);
  drawPolygon(doc, [
    [cx, topY + ry],
    [cx + rx, topY],
    [cx + rx, botY],
    [cx, botY + ry],
  ], 'F');

  // 3. Texture lines on both faces (if textured)
  if (isTextured) {
    if (texture === 'ribbonWrap') {
      const numRibbons = 7;
      const ribbonH = totalCoreH / numRibbons;
      for (let rIdx = 1; rIdx < numRibbons; rIdx++) {
        const rY = topY + rIdx * ribbonH;
        doc.setDrawColor(...finishDeepShadow);
        doc.setLineWidth(0.65);
        doc.line(cx - rx, rY, cx, rY + ry);
        doc.line(cx, rY + ry, cx + rx, rY);

        doc.setDrawColor(...finishHighlight);
        doc.setLineWidth(0.35);
        doc.line(cx - rx, rY + 0.5, cx, rY + ry + 0.5);
        doc.line(cx, rY + ry + 0.5, cx + rx, rY + 0.5);
      }
    } else {
      const numRidges = 12;
      const ridgeH = totalCoreH / (numRidges + 1);
      for (let rIdx = 1; rIdx <= numRidges; rIdx++) {
        const rY = topY + rIdx * ridgeH;
        doc.setDrawColor(...finishDeepShadow);
        doc.setLineWidth(0.45);
        doc.line(cx - rx, rY, cx, rY + ry);
        doc.line(cx, rY + ry, cx + rx, rY);

        doc.setDrawColor(...finishHighlight);
        doc.setLineWidth(0.25);
        doc.line(cx - rx, rY + 0.4, cx, rY + ry + 0.4);
        doc.line(cx, rY + ry + 0.4, cx + rx, rY + 0.4);
      }
    }
  }

  // 4. Top Diamond surface
  doc.setFillColor(...finishHighlight);
  drawPolygon(doc, [
    [cx, topY - ry],
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ], 'F');

  if (isTextured) {
    doc.setDrawColor(...finishShadow);
    doc.setLineWidth(0.3);
    drawPolygon(doc, [
      [cx, topY - ry * 0.6],
      [cx + rx * 0.6, topY],
      [cx, topY + ry * 0.6],
      [cx - rx * 0.6, topY],
    ], 'S');
  }

  // 5. Outlines
  reStrokeBoxOutlines(doc, { cx, topY, rx, ry, totalCoreH, botY });
}

function renderBoxDripGlaze(doc, { cx, topY, rx, ry, totalCoreH, botY, sRgb, patternId, patternName }) {
  const sHighlight = [
    Math.min(255, sRgb[0] + 32),
    Math.min(255, sRgb[1] + 32),
    Math.min(255, sRgb[2] + 32),
  ];
  const sShadow = [
    Math.max(0, sRgb[0] - 25),
    Math.max(0, sRgb[1] - 25),
    Math.max(0, sRgb[2] - 25),
  ];

  // 1. Top Diamond glaze pool
  doc.setFillColor(...sRgb);
  drawPolygon(doc, [
    [cx, topY - ry],
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ], 'F');

  doc.setDrawColor(...sShadow);
  doc.setLineWidth(0.4);
  drawPolygon(doc, [
    [cx, topY - ry],
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ], 'S');

  // Sheen reflection on top glaze diamond
  doc.setFillColor(...sHighlight);
  drawPolygon(doc, [
    [cx - rx * 0.2, topY - ry * 0.6],
    [cx + rx * 0.2, topY - ry * 0.2],
    [cx, topY + ry * 0.2],
    [cx - rx * 0.4, topY - ry * 0.2],
  ], 'F');

  // 2. Drip curtain nodes along Left Face and Right Face
  const str = String(patternId || patternName || '').toLowerCase();
  let tang = 0.5;
  const wave = (dipY, crestY) => [
    [0.00, crestY], [0.17, dipY], [0.33, crestY], [0.50, dipY], [0.66, crestY], [0.83, dipY], [1.00, crestY],
  ];

  let keyNodes;
  if (str.includes('alt') || str.includes('longshort')) {
    tang = 0.36;
    keyNodes = [
      [0.00, 0.14], [0.07, 0.50], [0.14, 0.19], [0.27, 0.95], [0.46, 0.17],
      [0.64, 0.56], [0.82, 0.18], [0.95, 0.86], [1.00, 0.86],
    ];
  } else if (str.includes('short') && !str.includes('wave') && !str.includes('cover')) {
    tang = 0.42;
    keyNodes = [
      [0.00, 0.50], [0.06, 0.52], [0.15, 0.20], [0.31, 0.56], [0.48, 0.18],
      [0.69, 0.56], [0.87, 0.21], [0.95, 0.50], [1.00, 0.50],
    ];
  } else if (str.includes('longwave') || str.includes('full') || str.includes('coverage')) {
    tang = 0.5;
    keyNodes = wave(0.85, 0.72);
  } else if (str.includes('midwave') || (str.includes('mid') && str.includes('wave')) || (str.includes('mid') && str.includes('cover'))) {
    tang = 0.5;
    keyNodes = wave(0.53, 0.42);
  } else if (str.includes('shortwave') || (str.includes('short') && str.includes('wave')) || (str.includes('short') && str.includes('cover'))) {
    tang = 0.5;
    keyNodes = wave(0.28, 0.16);
  } else if (str.includes('tinytip') || str.includes('curve')) {
    tang = 0.5;
    keyNodes = [
      [0.00, 0.55], [0.13, 0.38], [0.30, 0.58], [0.46, 0.37], [0.66, 0.60], [0.82, 0.38], [0.95, 0.55], [1.00, 0.55],
    ];
  } else if (str.includes('uneven') || str.includes('fall')) {
    tang = 0.45;
    keyNodes = [
      [0.00, 0.24], [0.06, 0.20, 0.5], [0.17, 0.80, 0.1], [0.31, 0.19, 0.5], [0.46, 0.53, 0.1],
      [0.62, 0.20, 0.5], [0.77, 0.82, 0.1], [0.92, 0.22, 0.5], [1.00, 0.26],
    ];
  } else if (str.includes('natural') || str.includes('tear') || str.includes('gap')) {
    tang = 0.4;
    keyNodes = [
      [0.00, 0.34], [0.06, 0.34], [0.14, 0.86, 0.1], [0.21, 0.55, 0.3], [0.35, 0.44],
      [0.50, 0.62], [0.62, 0.54], [0.70, 0.93, 0.1], [0.78, 0.27, 0.45], [0.88, 0.28], [0.95, 0.36], [1.00, 0.36],
    ];
  } else {
    tang = 0.28;
    keyNodes = [
      [0.00, 0.85], [0.03, 0.85], [0.10, 0.18], [0.28, 0.92], [0.50, 0.18],
      [0.69, 0.92], [0.88, 0.18], [0.97, 0.85], [1.00, 0.85],
    ];
  }

  const dripCurve = [];
  const maxDripH = totalCoreH - 5;
  for (let i = 0; i < keyNodes.length - 1; i++) {
    const p0 = { u: keyNodes[i][0], v: keyNodes[i][1] };
    const p3 = { u: keyNodes[i + 1][0], v: keyNodes[i + 1][1] };
    const du = p3.u - p0.u;
    const k0 = keyNodes[i][2] ?? tang;
    const k3 = keyNodes[i + 1][2] ?? tang;
    const p1 = { u: p0.u + du * k0, v: p0.v };
    const p2 = { u: p3.u - du * k3, v: p3.v };

    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      const u = mt ** 3 * p0.u + 3 * mt * mt * t * p1.u + 3 * mt * t * t * p2.u + t ** 3 * p3.u;
      const v = mt ** 3 * p0.v + 3 * mt * mt * t * p1.v + 3 * mt * t * t * p2.v + t ** 3 * p3.v;

      const pt = projectSurface(u, 0, { cx, topY, rx, ry, totalCoreH, isBox: true });
      const py = Math.min(botY + (u <= 0.5 ? (u / 0.5) * ry : (1 - (u - 0.5) / 0.5) * ry) - 1.5, pt.y + v * maxDripH);
      dripCurve.push({ x: pt.x, y: py, u, v });
    }
  }
  const lastNode = keyNodes[keyNodes.length - 1];
  const ptLast = projectSurface(1, 0, { cx, topY, rx, ry, totalCoreH, isBox: true });
  dripCurve.push({ x: ptLast.x, y: Math.min(botY - 1.5, ptLast.y + lastNode[1] * maxDripH), u: 1, v: lastNode[1] });

  // Closed polygon of the drip curtain
  const poly = [
    ...dripCurve.map(p => [p.x, p.y]),
    [cx + rx, topY],
    [cx, topY + ry],
    [cx - rx, topY],
  ];

  doc.setFillColor(...sRgb);
  drawPolygon(doc, poly, 'F');

  // Bottom edge line of drip curtain
  doc.setDrawColor(...sShadow);
  doc.setLineWidth(0.65);
  for (let i = 0; i < dripCurve.length - 1; i++) {
    doc.line(dripCurve[i].x, dripCurve[i].y, dripCurve[i + 1].x, dripCurve[i + 1].y);
  }

  // Corner ridge line down through drip curtain
  const centerDripPt = dripCurve.find(p => Math.abs(p.u - 0.5) < 0.04);
  if (centerDripPt) {
    doc.setDrawColor(...sShadow);
    doc.setLineWidth(0.5);
    doc.line(cx, topY + ry, cx, centerDripPt.y);
  }

  // Re-stroke outer box outlines
  reStrokeBoxOutlines(doc, { cx, topY, rx, ry, totalCoreH, botY });
}

function projectSurface(u, v, { cx, topY, rx, ry, totalCoreH, isBox }) {
  if (isBox) {
    if (u <= 0.5) {
      const t = u / 0.5;
      const x = cx - rx * (1 - t);
      const rimY = topY + t * ry;
      const y = rimY + v * totalCoreH;
      return { x, y, face: 'left' };
    } else {
      const t = (u - 0.5) / 0.5;
      const x = cx + t * rx;
      const rimY = topY + ry * (1 - t);
      const y = rimY + v * totalCoreH;
      return { x, y, face: 'right' };
    }
  } else {
    // Cylinder: front visible arc (-77 deg to +77 deg)
    const thetaM = 1.34;
    const theta = -thetaM + 2 * thetaM * u;
    const x = cx + rx * Math.sin(theta);
    const y = topY + v * totalCoreH + ry * Math.cos(theta);
    return { x, y, face: 'front' };
  }
}

function renderSurfaceQuad(doc, u1, v1, u2, v2, params, fillColor, style = 'F') {
  if (params.isBox) {
    if (u1 < 0.5 && u2 > 0.5) {
      renderSurfaceQuad(doc, u1, v1, 0.5, v2, params, fillColor, style);
      renderSurfaceQuad(doc, 0.5, v1, u2, v2, params, fillColor, style);
      return;
    }
  }

  let pts;
  if (!params.isBox && Math.abs(u2 - u1) > 0.04) {
    const um = (u1 + u2) / 2;
    const pTL = projectSurface(u1, v1, params);
    const pTM = projectSurface(um, v1, params);
    const pTR = projectSurface(u2, v1, params);
    const pBR = projectSurface(u2, v2, params);
    const pBM = projectSurface(um, v2, params);
    const pBL = projectSurface(u1, v2, params);
    pts = [
      [pTL.x, pTL.y],
      [pTM.x, pTM.y],
      [pTR.x, pTR.y],
      [pBR.x, pBR.y],
      [pBM.x, pBM.y],
      [pBL.x, pBL.y],
    ];
  } else {
    const pTL = projectSurface(u1, v1, params);
    const pTR = projectSurface(u2, v1, params);
    const pBR = projectSurface(u2, v2, params);
    const pBL = projectSurface(u1, v2, params);
    pts = [
      [pTL.x, pTL.y],
      [pTR.x, pTR.y],
      [pBR.x, pBR.y],
      [pBL.x, pBL.y],
    ];
  }

  if (params.isBox && u1 >= 0.5 && Array.isArray(fillColor)) {
    const shaded = [
      Math.max(0, fillColor[0] - 18),
      Math.max(0, fillColor[1] - 18),
      Math.max(0, fillColor[2] - 18),
    ];
    doc.setFillColor(...shaded);
  } else if (Array.isArray(fillColor)) {
    doc.setFillColor(...fillColor);
  }

  drawPolygon(doc, pts, style);
}

function renderSurfaceTriangle(doc, u1, v1, u2, v2, params, fillColor) {
  if (params.isBox && u1 < 0.5 && u2 > 0.5) {
    renderSurfaceTriangle(doc, u1, v1, 0.5, v2, params, fillColor);
    renderSurfaceTriangle(doc, 0.5, v1, u2, v2, params, fillColor);
    return;
  }
  const uApex = (u1 + u2) / 2;
  const pApex = projectSurface(uApex, v1, params);
  const pBL = projectSurface(u1, v2, params);
  const pBR = projectSurface(u2, v2, params);

  if (params.isBox && u1 >= 0.5 && Array.isArray(fillColor)) {
    const shaded = [
      Math.max(0, fillColor[0] - 18),
      Math.max(0, fillColor[1] - 18),
      Math.max(0, fillColor[2] - 18),
    ];
    doc.setFillColor(...shaded);
  } else if (Array.isArray(fillColor)) {
    doc.setFillColor(...fillColor);
  }

  doc.triangle(pBL.x, pBL.y, pBR.x, pBR.y, pApex.x, pApex.y, 'F');
}

function renderProjectedSidePattern(doc, {
  cx,
  topY,
  rx,
  ry,
  totalCoreH,
  botY,
  isBox,
  treatmentId,
  variantId,
  rgb,
  secondaryColor = null,
  hasSurface = false,
}) {
  const params = { cx, topY, rx, ry, totalCoreH, botY, isBox };
  const str = String(variantId || '').toLowerCase();
  doc.setFillColor(...rgb);
  doc.setDrawColor(...rgb);

  switch (treatmentId) {
    case 'checkeredPattern': {
      const isXPattern = str.includes('x');
      const isLeftDiagonal = str.includes('side') || str.includes('left');
      const isRightDiagonal = str.includes('right');
      const isParallelOuter = str.includes('outer') || str.includes('bottom');
      const isParallelInner = str.includes('inner') || str.includes('top');

      const cols = isXPattern ? 9 : 11;
      const rows = 5;
      const uStart = 0.04;
      const uEnd = 0.96;
      const uRange = uEnd - uStart;
      const uStep = uRange / cols;

      const vStart = 0.10;
      const vEnd = 0.88;
      const vRange = vEnd - vStart;
      const vStep = vRange / rows;

      const sqU = uStep * 0.74;
      const sqV = vStep * 0.74;
      const padU = (uStep - sqU) / 2;
      const padV = (vStep - sqV) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldFill = false;

          if (isXPattern) {
            shouldFill =
              ((r === 0 || r === 2 || r === 4) && (c === 1 || c === 3 || c === 5 || c === 7)) ||
              (r === 1 && (c === 2 || c === 6)) ||
              (r === 3 && (c === 0 || c === 4 || c === 8));
          } else if (isLeftDiagonal) {
            shouldFill = (c + r) % 3 === 2;
          } else if (isRightDiagonal) {
            shouldFill = (c - r + 30) % 3 === 1;
          } else if (isParallelOuter) {
            shouldFill = (r === 0 || r === rows - 1) && (c % 2 === 0);
          } else if (isParallelInner) {
            shouldFill = (r === 1 || r === rows - 2) && (c % 2 === 1);
          } else {
            shouldFill = (r + c) % 2 === 0;
          }

          if (shouldFill) {
            const u1 = uStart + c * uStep + padU;
            const u2 = u1 + sqU;
            const v1 = vStart + r * vStep + padV;
            const v2 = v1 + sqV;
            renderSurfaceQuad(doc, u1, v1, u2, v2, params, rgb, 'F');
          }
        }
      }
      break;
    }

    case 'trianglePattern': {
      const isXPattern = str.includes('x');
      const isLeftDiagonal = str.includes('side') || str.includes('left');
      const isRightDiagonal = str.includes('right');
      const isParallelOuter = str.includes('outer') || str.includes('bottom');
      const isParallelInner = str.includes('inner') || str.includes('top');

      const cols = isXPattern ? 9 : 11;
      const rows = 5;
      const uStart = 0.04;
      const uEnd = 0.96;
      const uRange = uEnd - uStart;
      const uStep = uRange / cols;

      const vStart = 0.10;
      const vEnd = 0.88;
      const vRange = vEnd - vStart;
      const vStep = vRange / rows;

      const triU = uStep * 0.74;
      const triV = vStep * 0.74;
      const padU = (uStep - triU) / 2;
      const padV = (vStep - triV) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldFill = false;

          if (isXPattern) {
            shouldFill =
              ((r === 0 || r === 2 || r === 4) && (c === 1 || c === 3 || c === 5 || c === 7)) ||
              (r === 1 && (c === 2 || c === 6)) ||
              (r === 3 && (c === 0 || c === 4 || c === 8));
          } else if (isLeftDiagonal) {
            shouldFill = (c + r) % 3 === 2;
          } else if (isRightDiagonal) {
            shouldFill = (c - r + 30) % 3 === 1;
          } else if (isParallelOuter) {
            shouldFill = (r === 0 || r === rows - 1) && (c % 2 === 0);
          } else if (isParallelInner) {
            shouldFill = (r === 1 || r === rows - 2) && (c % 2 === 1);
          } else {
            shouldFill = (r + c) % 2 === 0;
          }

          if (shouldFill) {
            const u1 = uStart + c * uStep + padU;
            const u2 = u1 + triU;
            const v1 = vStart + r * vStep + padV;
            const v2 = v1 + triV;
            renderSurfaceTriangle(doc, u1, v1, u2, v2, params, rgb);
          }
        }
      }
      break;
    }

    case 'chevronPattern': {
      const isWide = str.includes('wide');
      const isTight = str.includes('tight');
      const isGapped = str.includes('gap');
      const isTwoTone = str.includes('two');
      const isThreeTone = str.includes('three');

      const waves = isWide ? 3 : isTight ? 7 : 5;
      const segs = isWide ? 8 : isTight ? 22 : 12;
      const ampV = (isWide ? 3.6 : isTight ? 1.6 : 2.5) / totalCoreH;
      const lineWidth = isWide ? 1.8 : isTight ? 0.6 : 1.0;

      doc.setDrawColor(...rgb);
      doc.setLineWidth(lineWidth);

      for (let w = 1; w <= waves; w++) {
        if (isGapped && (w === 2 || w === 4)) continue;

        const vBase = 0.10 + w * (0.80 / (waves + 1));

        if (typeof doc.setLineDashPattern === 'function') {
          if (isThreeTone) {
            if (w === 1 || w === 3 || w === 5) {
              doc.setLineDashPattern([2.2, 1.4], 0);
            } else {
              doc.setLineDashPattern([], 0);
            }
          } else if (isTwoTone) {
            if (w === 2 || w === 4) {
              doc.setLineDashPattern([2.2, 1.4], 0);
            } else {
              doc.setLineDashPattern([], 0);
            }
          } else {
            doc.setLineDashPattern([], 0);
          }
        }

        const subSteps = 3;
        let prevPt = projectSurface(0.04, vBase - ampV, params);
        for (let s = 0; s < segs; s++) {
          const u0 = 0.04 + s * (0.92 / segs);
          const u1 = 0.04 + (s + 1) * (0.92 / segs);
          const v0 = vBase + (s % 2 === 0 ? -ampV : ampV);
          const v1 = vBase + (s % 2 === 0 ? ampV : -ampV);
          for (let k = 1; k <= subSteps; k++) {
            const t = k / subSteps;
            const u = u0 + t * (u1 - u0);
            const v = v0 + t * (v1 - v0);
            const currPt = projectSurface(u, v, params);
            doc.line(prevPt.x, prevPt.y, currPt.x, currPt.y);
            prevPt = currPt;
          }
        }
      }

      if (typeof doc.setLineDashPattern === 'function') {
        doc.setLineDashPattern([], 0);
      }
      break;
    }

    case 'scatterPearls': {
      const isBorder = str.includes('border');
      const isDiamond = (str.includes('diamond') || str.includes('grid')) && !isBorder;
      const isRows = str.includes('row') || str.includes('horizontal');
      const isBig = str.includes('big');
      const isSmall = str.includes('small');

      if (isDiamond || isBorder) {
        const lines = 4;
        const pearlR = 1.3;
        for (let r = 1; r <= lines; r++) {
          if (isBorder && (r === 2 || r === 3)) continue;
          const vr = 0.12 + r * (0.76 / 5);
          const count = (r % 2 === 1) ? 11 : 10;
          const offset = (r % 2 === 1) ? 0 : 0.5;
          const spacing = 0.88 / 10;
          for (let c = 0; c < count; c++) {
            const u = 0.06 + (c + offset) * spacing;
            if (u > 0.96) continue;
            const pt = projectSurface(u, vr, params);
            doc.setFillColor(...rgb);
            doc.circle(pt.x, pt.y, pearlR, 'F');
          }
        }
      } else if (isRows) {
        const lines = 4;
        const count = 11;
        const spacing = 0.88 / 10;
        for (let r = 1; r <= lines; r++) {
          const vr = 0.12 + r * (0.76 / 5);
          for (let c = 0; c < count; c++) {
            const u = 0.06 + c * spacing;
            const pr = (c % 2 === 0) ? 1.8 : 1.0;
            const pt = projectSurface(u, vr, params);
            doc.setFillColor(...rgb);
            doc.circle(pt.x, pt.y, pr, 'F');
          }
        }
      } else {
        const scatterCoords = [
          [0.08, 0.18, 'md'], [0.18, 0.42, 'lg'], [0.12, 0.72, 'sm'], [0.22, 0.88, 'md'],
          [0.24, 0.22, 'sm'], [0.32, 0.58, 'md'], [0.30, 0.82, 'lg'], [0.38, 0.14, 'lg'],
          [0.42, 0.38, 'sm'], [0.44, 0.76, 'md'], [0.52, 0.22, 'md'], [0.50, 0.55, 'lg'],
          [0.54, 0.88, 'sm'], [0.62, 0.35, 'sm'], [0.60, 0.70, 'md'], [0.68, 0.15, 'lg'],
          [0.72, 0.48, 'md'], [0.70, 0.85, 'sm'], [0.78, 0.28, 'sm'], [0.82, 0.65, 'lg'],
          [0.86, 0.15, 'md'], [0.88, 0.88, 'md'], [0.92, 0.42, 'sm'], [0.15, 0.55, 'sm'],
          [0.28, 0.35, 'md'], [0.46, 0.92, 'lg'], [0.65, 0.52, 'lg'], [0.75, 0.75, 'md'],
          [0.36, 0.70, 'sm'], [0.84, 0.38, 'lg']
        ];
        scatterCoords.forEach(([uRel, vRel, sizeCategory]) => {
          const u = 0.06 + uRel * 0.88;
          const v = 0.12 + vRel * 0.76;
          let pr;
          if (isBig) pr = 2.4;
          else if (isSmall) pr = 0.9;
          else pr = sizeCategory === 'lg' ? 1.9 : sizeCategory === 'md' ? 1.4 : 0.9;
          const pt = projectSurface(u, v, params);
          doc.setFillColor(...rgb);
          doc.circle(pt.x, pt.y, pr, 'F');
        });
      }
      break;
    }

    case 'pipingScrolls': {
      const isWave = str.includes('wave') || str.includes('rope');
      const isPaired = str.includes('pair') || str.includes('opposing') || str.includes('scroll');
      const isFleur = str.includes('fleur') || str.includes('lis');
      const isShell = str.includes('shell');
      const isVine = str.includes('vine') || str.includes('tendril');

      if (isWave) {
        const N = 80;
        const ampV = 11.0 / totalCoreH;
        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        let prevPt = projectSurface(0.05, 0.50 + ampV, params);
        for (let i = 1; i <= N; i++) {
          const u = 0.05 + (i / N) * 0.90;
          const theta = (i / N) * 2 * 2 * Math.PI;
          const v = 0.50 + ampV * Math.cos(theta);
          const currPt = projectSurface(u, v, params);
          doc.line(prevPt.x, prevPt.y, currPt.x, currPt.y);
          prevPt = currPt;
        }

        const p1 = projectSurface(0.05 + 0.90 * 0.25, 0.50 - ampV - 0.07, params);
        const p2 = projectSurface(0.05 + 0.90 * 0.75, 0.50 - ampV - 0.07, params);
        const v1 = projectSurface(0.05 + 0.90 * 0.50, 0.50 + ampV + 0.07, params);
        doc.circle(p1.x, p1.y, 1.4, 'F');
        doc.circle(p2.x, p2.y, 1.4, 'F');
        doc.circle(v1.x, v1.y, 1.4, 'F');
      } else if (isPaired) {
        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        const drawScroll = (centerU, isLeft) => {
          const sign = isLeft ? -1 : 1;
          const N = 36;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const t = (i / N) * 2 - 1;
            const v = 0.50 + t * 0.28;
            const u = centerU - sign * (t * t * 0.12);
            pts.push(projectSurface(u, v, params));
          }
          for (let i = 0; i < pts.length - 1; i++) {
            doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          }
          const topPt = pts[0];
          doc.circle(topPt[0], topPt[1] + (isLeft ? 2.5 : 2.5), 1.3, 'F');
          const botPt = pts[pts.length - 1];
          doc.circle(botPt[0], botPt[1] - (isLeft ? 2.5 : 2.5), 1.3, 'F');
        };

        drawScroll(0.28, true);
        drawScroll(0.72, false);
      } else if (isFleur) {
        const drawFleurMotif = (centerU) => {
          doc.setFillColor(...rgb);
          doc.setDrawColor(...rgb);
          doc.setLineWidth(0.4);

          const drawBlade = (uOff, vOff, lenV, widthU) => {
            const pTop = projectSurface(centerU + uOff, 0.48 + vOff - lenV * 0.5, params);
            const pL = projectSurface(centerU + uOff - widthU * 0.5, 0.48 + vOff, params);
            const pR = projectSurface(centerU + uOff + widthU * 0.5, 0.48 + vOff, params);
            const pBot = projectSurface(centerU + uOff, 0.48 + vOff + lenV * 0.5, params);
            drawPolygon(doc, [[pTop.x, pTop.y], [pR.x, pR.y], [pBot.x, pBot.y], [pL.x, pL.y]], 'F');
          };

          drawBlade(0, 0, 0.38, 0.05);
          drawBlade(-0.045, 0.03, 0.30, 0.045);
          drawBlade(0.045, 0.03, 0.30, 0.045);
          const pearlPt = projectSurface(centerU, 0.74, params);
          doc.circle(pearlPt.x, pearlPt.y, 1.3, 'F');
        };

        [0.26, 0.50, 0.74].forEach(drawFleurMotif);
      } else if (isShell) {
        const drawShellMotif = (centerU) => {
          doc.setFillColor(...rgb);
          doc.setDrawColor(...rgb);
          doc.setLineWidth(0.4);

          const drawSpike = (uOff, vOff, lenV, widthU) => {
            const pTop = projectSurface(centerU + uOff, 0.48 + vOff - lenV * 0.5, params);
            const pL = projectSurface(centerU + uOff - widthU * 0.5, 0.48 + vOff, params);
            const pR = projectSurface(centerU + uOff + widthU * 0.5, 0.48 + vOff, params);
            const pBot = projectSurface(centerU + uOff, 0.48 + vOff + lenV * 0.5, params);
            drawPolygon(doc, [[pTop.x, pTop.y], [pR.x, pR.y], [pBot.x, pBot.y], [pL.x, pL.y]], 'F');
          };

          drawSpike(0, 0, 0.38, 0.045);
          drawSpike(-0.035, 0.02, 0.32, 0.04);
          drawSpike(0.035, 0.02, 0.32, 0.04);
          drawSpike(-0.07, 0.05, 0.26, 0.035);
          drawSpike(0.07, 0.05, 0.26, 0.035);
          const pearlPt = projectSurface(centerU, 0.74, params);
          doc.circle(pearlPt.x, pearlPt.y, 1.3, 'F');
        };

        [0.26, 0.50, 0.74].forEach(drawShellMotif);
      } else if (isVine) {
        doc.setLineWidth(1.8);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        const steps = 60;
        let prevPt = projectSurface(0.06, 0.78, params);
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 0.06 + t * 0.88;
          const v = 0.50 + Math.cos(t * Math.PI) * 0.28;
          const currPt = projectSurface(u, v, params);
          doc.line(prevPt.x, prevPt.y, currPt.x, currPt.y);
          prevPt = currPt;
        }

        const lLoopPt = projectSurface(0.32, 0.44, params);
        doc.circle(lLoopPt.x, lLoopPt.y, 1.8, 'S');
        const rLoopPt = projectSurface(0.68, 0.56, params);
        doc.circle(rLoopPt.x, rLoopPt.y, 1.8, 'S');
      } else {
        doc.setLineWidth(1.6);
        doc.setDrawColor(...rgb);
        doc.setFillColor(...rgb);

        [0.28, 0.50, 0.72].forEach((centerU) => {
          const N = 40;
          let prevP = null;
          for (let i = 0; i <= N; i++) {
            const theta = (i / N) * 2 * Math.PI;
            const u = centerU + Math.cos(theta) * 0.10;
            const v = 0.50 + Math.sin(theta) * 0.24;
            const currP = projectSurface(u, v, params);
            if (prevP) {
              doc.line(prevP.x, prevP.y, currP.x, currP.y);
            }
            prevP = currP;
          }
          const dotPt = projectSurface(centerU, 0.50, params);
          doc.circle(dotPt.x, dotPt.y, 1.2, 'F');
        });
      }
      break;
    }

    default: {
      const cols = 11;
      const rows = 5;
      const uStep = 0.92 / cols;
      const vStep = 0.78 / rows;
      const sqU = uStep * 0.74;
      const sqV = vStep * 0.74;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            const u1 = 0.04 + c * uStep;
            const u2 = u1 + sqU;
            const v1 = 0.10 + r * vStep;
            const v2 = v1 + sqV;
            renderSurfaceQuad(doc, u1, v1, u2, v2, params, rgb, 'F');
          }
        }
      }
      break;
    }
  }
}

/**
 * Renders the 2D Layer-by-Layer Exploded Assembly schematic (matching user sketch 3).
 * Shows enclosing slab at top with arrow, downward arrows between layers,
 * and filling layers below (e.g. FILLING LAYER 3, 2, 1) each pointing to its slab.
 */
export function drawAssemblyExplodedSchematic(doc, {
  x,
  y,
  w = 84,
  h = 88,
  shape = 'round',
  layers = 1,
  spongeFlavor = 'Vanilla',
  spongeColor = '#F5E6CA',
  fillingFlavor = 'Chocolate',
  fillingColor = '#7A4B2A',
}) {
  doc.saveGraphicsState?.();

  // 1. Outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  drawBadge(doc, '2D LAYER-BY-LAYER ASSEMBLY', x + 3, y + 3, [35, 30, 30]);

  const isBox = isBoxShape(shape);
  const numFilling = Math.max(1, Math.min(4, Number(layers) || 1));
  const totalSlabs = numFilling + 1;

  const contentTop = y + 15;
  const contentBottom = y + h - 8;
  const availH = contentBottom - contentTop;

  // Geometry parameters for slabs
  const slabH = Math.min(8.5, Math.max(5.5, (availH / totalSlabs) * 0.52));
  const gapY = (availH - totalSlabs * slabH) / Math.max(1, totalSlabs - 1);

  const spRgb = hexToRgb(spongeColor, [245, 230, 202]);
  const fillRgb = hexToRgb(fillingColor, [122, 75, 42]);
  const spongeHighlight = [
    Math.min(255, spRgb[0] + 18),
    Math.min(255, spRgb[1] + 18),
    Math.min(255, spRgb[2] + 18),
  ];
  const spongeShadow = [
    Math.max(0, spRgb[0] - 25),
    Math.max(0, spRgb[1] - 25),
    Math.max(0, spRgb[2] - 25),
  ];

  // Cake slab ellipse dimensions
  const slabW = 38;
  const rx = slabW / 2;
  const ry = 4.2;
  const cx = x + w - rx - 6;

  // Arrow & label left margin
  const textX = x + 4;
  const arrowTargetX = cx - rx - 1.5;

  for (let s = 0; s < totalSlabs; s++) {
    const slabY = contentTop + s * (slabH + gapY);
    const isEnclosing = s === 0;
    const fillingIdx = numFilling - s + 1;

    if (isBox) {
      if (isEnclosing) {
        // Enclosing sponge box slab
        doc.setFillColor(...spongeHighlight);
        drawPolygon(doc, [
          [cx - rx, slabY],
          [cx, slabY + ry],
          [cx, slabY + slabH + ry],
          [cx - rx, slabY + slabH],
        ], 'F');

        doc.setFillColor(...spongeShadow);
        drawPolygon(doc, [
          [cx, slabY + ry],
          [cx + rx, slabY],
          [cx + rx, slabY + slabH],
          [cx, slabY + slabH + ry],
        ], 'F');

        doc.setFillColor(...spongeHighlight);
        drawPolygon(doc, [
          [cx, slabY - ry],
          [cx + rx, slabY],
          [cx, slabY + ry],
          [cx - rx, slabY],
        ], 'F');

        reStrokeBoxOutlines(doc, { cx, topY: slabY, rx, ry, totalCoreH: slabH, botY: slabY + slabH });

        // Label on the left: ENCLOSING with arrow
        const labelY = slabY + slabH / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...INK);
        doc.text('ENCLOSING', textX, labelY + 1.2);

        const tw = doc.getTextWidth('ENCLOSING');
        const arrowStartX = textX + tw + 2;
        if (arrowTargetX > arrowStartX + 3) {
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.6);
          doc.line(arrowStartX, labelY, arrowTargetX, labelY);
          doc.setFillColor(...INK);
          doc.triangle(arrowTargetX, labelY, arrowTargetX - 2.2, labelY - 1.2, arrowTargetX - 2.2, labelY + 1.2, 'FD');
        }
      } else {
        // Filling Layer box slab
        const fillThickness = Math.max(2.0, slabH * 0.35);

        // Sponge slice below
        doc.setFillColor(...spongeHighlight);
        drawPolygon(doc, [
          [cx - rx, slabY + fillThickness],
          [cx, slabY + fillThickness + ry],
          [cx, slabY + slabH + ry],
          [cx - rx, slabY + slabH],
        ], 'F');

        doc.setFillColor(...spongeShadow);
        drawPolygon(doc, [
          [cx, slabY + fillThickness + ry],
          [cx + rx, slabY + fillThickness],
          [cx + rx, slabY + slabH],
          [cx, slabY + slabH + ry],
        ], 'F');

        // Filling slice above
        doc.setFillColor(...fillRgb);
        drawPolygon(doc, [
          [cx - rx, slabY],
          [cx, slabY + ry],
          [cx, slabY + fillThickness + ry],
          [cx - rx, slabY + fillThickness],
        ], 'F');

        const fillShadow = [
          Math.max(0, fillRgb[0] - 22),
          Math.max(0, fillRgb[1] - 22),
          Math.max(0, fillRgb[2] - 22),
        ];
        doc.setFillColor(...fillShadow);
        drawPolygon(doc, [
          [cx, slabY + ry],
          [cx + rx, slabY],
          [cx + rx, slabY + fillThickness],
          [cx, slabY + fillThickness + ry],
        ], 'F');

        // Top diamond
        doc.setFillColor(...fillRgb);
        drawPolygon(doc, [
          [cx, slabY - ry],
          [cx + rx, slabY],
          [cx, slabY + ry],
          [cx - rx, slabY],
        ], 'F');

        // Seam between filling and sponge
        doc.setDrawColor(25, 20, 20);
        doc.setLineWidth(0.5);
        doc.line(cx - rx, slabY + fillThickness, cx, slabY + fillThickness + ry);
        doc.line(cx, slabY + fillThickness + ry, cx + rx, slabY + fillThickness);

        reStrokeBoxOutlines(doc, { cx, topY: slabY, rx, ry, totalCoreH: slabH, botY: slabY + slabH });

        // Label on the left: FILLING LAYER X
        const labelText = `FILLING LAYER ${fillingIdx}`;
        const labelY = slabY + fillThickness / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...INK);
        doc.text(labelText, textX, labelY + 1.2);

        const tw = doc.getTextWidth(labelText);
        const arrowStartX = textX + tw + 2;
        if (arrowTargetX > arrowStartX + 3) {
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.6);
          doc.line(arrowStartX, labelY, arrowTargetX, labelY);
          doc.setFillColor(...INK);
          doc.triangle(arrowTargetX, labelY, arrowTargetX - 2.2, labelY - 1.2, arrowTargetX - 2.2, labelY + 1.2, 'FD');
        }
      }
    } else {
      // Cylinder slab
      if (isEnclosing) {
        // Enclosing sponge slab
        doc.setFillColor(...spongeShadow);
        doc.rect(cx - rx, slabY, rx * 2, slabH, 'F');
        doc.ellipse(cx, slabY + slabH, rx, ry, 'F');

        doc.setFillColor(...spongeHighlight);
        doc.ellipse(cx, slabY, rx, ry, 'F');

        doc.setDrawColor(...INK);
        doc.setLineWidth(0.65);
        doc.ellipse(cx, slabY, rx, ry, 'S');
        doc.line(cx - rx, slabY, cx - rx, slabY + slabH);
        doc.line(cx + rx, slabY, cx + rx, slabY + slabH);
        doc.ellipse(cx, slabY + slabH, rx, ry, 'S');

        // Label on the left: ENCLOSING with arrow
        const labelY = slabY + slabH / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...INK);
        doc.text('ENCLOSING', textX, labelY + 1.2);

        const tw = doc.getTextWidth('ENCLOSING');
        const arrowStartX = textX + tw + 2;
        if (arrowTargetX > arrowStartX + 3) {
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.6);
          doc.line(arrowStartX, labelY, arrowTargetX, labelY);
          doc.setFillColor(...INK);
          doc.triangle(arrowTargetX, labelY, arrowTargetX - 2.2, labelY - 1.2, arrowTargetX - 2.2, labelY + 1.2, 'FD');
        }
      } else {
        // Filling Layer slab
        const fillThickness = Math.max(2.0, slabH * 0.35);
        const spThickness = slabH - fillThickness;

        doc.setFillColor(...spongeShadow);
        doc.rect(cx - rx, slabY + fillThickness, rx * 2, spThickness, 'F');
        doc.ellipse(cx, slabY + slabH, rx, ry, 'F');

        doc.setFillColor(...fillRgb);
        doc.rect(cx - rx, slabY, rx * 2, fillThickness, 'F');
        doc.ellipse(cx, slabY + fillThickness, rx, ry, 'F');
        doc.ellipse(cx, slabY, rx, ry, 'F');

        doc.setDrawColor(...INK);
        doc.setLineWidth(0.65);
        doc.ellipse(cx, slabY, rx, ry, 'S');
        doc.line(cx - rx, slabY, cx - rx, slabY + slabH);
        doc.line(cx + rx, slabY, cx + rx, slabY + slabH);
        doc.setDrawColor(25, 20, 20);
        doc.setLineWidth(0.5);
        doc.ellipse(cx, slabY + fillThickness, rx, ry, 'S');
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.65);
        doc.ellipse(cx, slabY + slabH, rx, ry, 'S');

        // Label on the left: FILLING LAYER X
        const labelText = `FILLING LAYER ${fillingIdx}`;
        const labelY = slabY + fillThickness / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...INK);
        doc.text(labelText, textX, labelY + 1.2);

        const tw = doc.getTextWidth(labelText);
        const arrowStartX = textX + tw + 2;
        if (arrowTargetX > arrowStartX + 3) {
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.6);
          doc.line(arrowStartX, labelY, arrowTargetX, labelY);
          doc.setFillColor(...INK);
          doc.triangle(arrowTargetX, labelY, arrowTargetX - 2.2, labelY - 1.2, arrowTargetX - 2.2, labelY + 1.2, 'FD');
        }
      }
    }

    // Downward arrow between slabs (↓)
    if (s < totalSlabs - 1) {
      const nextSlabY = contentTop + (s + 1) * (slabH + gapY);
      const downArrowTop = slabY + slabH + ry + 1.2;
      const downArrowBot = nextSlabY - ry - 1.2;
      if (downArrowBot > downArrowTop + 2.5) {
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.7);
        doc.line(cx, downArrowTop, cx, downArrowBot);
        doc.setFillColor(...INK);
        doc.triangle(cx, downArrowBot, cx - 1.4, downArrowBot - 2.4, cx + 1.4, downArrowBot - 2.4, 'FD');
      }
    }
  }

  // Footer legend
  const footerY = y + h - 4;
  doc.setFillColor(...spRgb);
  doc.circle(x + 4.5, footerY, 1.8, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(x + 4.5, footerY, 1.8, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...INK);
  doc.text(`Sponge (${spongeFlavor})`, x + 7.5, footerY + 0.9);

  const fillLegendX = x + 40;
  doc.setFillColor(...fillRgb);
  doc.circle(fillLegendX, footerY, 1.8, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.circle(fillLegendX, footerY, 1.8, 'S');
  doc.text(`Filling (${fillingFlavor})`, fillLegendX + 3.0, footerY + 0.9);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the Complete Look After Assembling schematic (matching user sketch 4).
 * Shows the full upright assembled core cylinder with alternating sponge and filling layers.
 */
export function drawAssemblyCompleteSchematic(doc, {
  x,
  y,
  w = 84,
  h = 88,
  shape = 'round',
  layers = 1,
  spongeFlavor = 'Vanilla',
  spongeColor = '#F5E6CA',
  fillingFlavor = 'Chocolate',
  fillingColor = '#7A4B2A',
}) {
  doc.saveGraphicsState?.();

  // 1. Outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  drawBadge(doc, 'COMPLETE ASSEMBLED LOOK', x + 3, y + 3, [35, 30, 30]);

  const isBox = isBoxShape(shape);
  const numFilling = Math.max(1, Math.min(4, Number(layers) || 1));
  const numSponge = numFilling + 1;

  const spRgb = hexToRgb(spongeColor, [245, 230, 202]);
  const fillRgb = hexToRgb(fillingColor, [122, 75, 42]);
  const spongeHighlight = [
    Math.min(255, spRgb[0] + 16),
    Math.min(255, spRgb[1] + 16),
    Math.min(255, spRgb[2] + 16),
  ];
  const spongeShadow = [
    Math.max(0, spRgb[0] - 22),
    Math.max(0, spRgb[1] - 22),
    Math.max(0, spRgb[2] - 22),
  ];

  // Core dimensions
  const coreW = 50;
  const rx = coreW / 2; // 25mm
  const ry = 5.6;
  const cx = x + 35;
  const topY = y + 17;
  const totalCoreH = 52;
  const botY = topY + totalCoreH;

  const fillBandH = Math.min(3.4, Math.max(2.2, 12 / numFilling));
  const totalFillH = numFilling * fillBandH;
  const spongeBandH = (totalCoreH - totalFillH) / numSponge;

  const bands = [];
  for (let k = 0; k < numFilling; k++) {
    bands.push({ type: 'sponge', label: k === 0 ? 'Enclosing Crown' : `Sponge Layer ${numFilling - k + 1}`, h: spongeBandH });
    bands.push({ type: 'filling', label: `Filling Layer ${numFilling - k}`, h: fillBandH });
  }
  bands.push({ type: 'sponge', label: 'Base Foundation Sponge', h: spongeBandH });

  if (isBox) {
    renderBoxAssembledCore(doc, { cx, topY, rx, ry, totalCoreH, botY, bands, spRgb, fillRgb });
  } else {
    // 1. Draw entire cylinder background body
    doc.setFillColor(...spongeShadow);
    doc.rect(cx - rx, topY, rx * 2, totalCoreH, 'F');
    doc.ellipse(cx, botY, rx, ry, 'F');

    // 2. Draw each band's fill and curved bottom seam
    let currentY = topY;
    bands.forEach((band) => {
      const isSponge = band.type === 'sponge';
      const bandColor = isSponge ? spongeShadow : fillRgb;
      doc.setFillColor(...bandColor);
      doc.rect(cx - rx, currentY, rx * 2, band.h, 'F');
      doc.ellipse(cx, currentY + band.h, rx, ry, 'F');

      if (isSponge && band.h > 4) {
        doc.setDrawColor(...spongeHighlight);
        doc.setLineWidth(0.3);
        doc.line(cx - rx * 0.7, currentY + band.h * 0.45, cx + rx * 0.7, currentY + band.h * 0.45);
      }

      currentY += band.h;
    });

    // 3. Top surface ellipse
    doc.setFillColor(...spongeHighlight);
    doc.ellipse(cx, topY, rx, ry, 'F');

    // 4. Raw line drawing strokes
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.75);

    doc.ellipse(cx, topY, rx, ry, 'S');
    doc.line(cx - rx, topY, cx - rx, botY);
    doc.line(cx + rx, topY, cx + rx, botY);
    doc.ellipse(cx, botY, rx, ry, 'S');

    // Seam lines between bands
    let seamY = topY;
    for (let i = 0; i < bands.length - 1; i++) {
      seamY += bands[i].h;
      const isFillingSeam = bands[i].type === 'filling' || bands[i + 1].type === 'filling';
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(isFillingSeam ? 0.6 : 0.4);
      doc.ellipse(cx, seamY, rx, ry, 'S');
    }
  }

  // 5. Right-side callout annotations
  const rightCalloutX = cx + rx + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(...INK);

  doc.text('<- Enclosing Crown', rightCalloutX, topY + spongeBandH * 0.5 + 1);

  if (numFilling >= 1) {
    const midFillY = topY + spongeBandH + fillBandH * 0.5;
    doc.text(`<- Filling (${fillingFlavor})`, rightCalloutX, midFillY + 1);
  }

  doc.text('<- Base Sponge', rightCalloutX, botY - spongeBandH * 0.5 + 1);

  // Footer text
  const footerY = y + h - 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...INK);
  doc.text(`ASSEMBLED CORE · ${numSponge} SPONGE SLICES · ${numFilling} FILLING SEAM${numFilling > 1 ? 'S' : ''}`, x + 5, footerY);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the Exterior Coating Assembly schematic (matching user sketch with FILLING -> COATED).
 * Left: Assembled cake cylinder showing alternating sponge and filling seams (labeled "FILLING").
 * Center: Transition arrow (->) indicating crumb-coating and frosting application.
 * Right: Fully coated cake cylinder covered with Frosting or Textured Buttercream (labeled "COATED").
 */
export function drawAssemblyCoatingSchematic(doc, {
  x,
  y,
  w = 182,
  h = 88,
  shape = 'round',
  layers = 1,
  spongeFlavor = 'Vanilla',
  spongeColor = '#F5E6CA',
  fillingFlavor = 'Chocolate',
  fillingColor = '#7A4B2A',
  style = 'smooth',
  styleName = 'Smooth Coating',
  texture = '',
  textureName = '',
  isTextured = false,
  finishFlavor = 'Vanilla',
  finishColor = '#F6DEAB',
}) {
  doc.saveGraphicsState?.();

  // 1. Outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Top badges
  drawBadge(doc, 'CRUMB COAT & EXTERIOR FINISH ASSEMBLY', x + 3, y + 3, [35, 30, 30]);

  const finishBadgeText = isTextured && textureName
    ? `${String(styleName).toUpperCase()} · ${String(textureName).toUpperCase()}`
    : `${String(styleName).toUpperCase()} · ${String(finishFlavor).toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  const badgeTw = doc.getTextWidth(finishBadgeText);
  drawBadge(doc, finishBadgeText, x + w - badgeTw - 14, y + 3, [80, 70, 65]);

  const isBox = isBoxShape(shape);
  const coreW = 58;
  const rx = coreW / 2; // 29mm
  const ry = 6.2;
  const topY = y + 16;
  const totalCoreH = 46;
  const botY = topY + totalCoreH;

  // -------------------------------------------------------------
  // LEFT: Assembled Core (Fundamentals + Filling) -> "FILLING"
  // -------------------------------------------------------------
  const cx1 = x + 42;

  const numFilling = Math.max(1, Math.min(4, Number(layers) || 1));
  const numSponge = numFilling + 1;

  const spRgb = hexToRgb(spongeColor, [245, 230, 202]);
  const fillRgb = hexToRgb(fillingColor, [122, 75, 42]);
  const spongeHighlight = [
    Math.min(255, spRgb[0] + 16),
    Math.min(255, spRgb[1] + 16),
    Math.min(255, spRgb[2] + 16),
  ];
  const spongeShadow = [
    Math.max(0, spRgb[0] - 22),
    Math.max(0, spRgb[1] - 22),
    Math.max(0, spRgb[2] - 22),
  ];

  const fillBandH = Math.min(3.2, Math.max(2.0, 11 / numFilling));
  const totalFillH = numFilling * fillBandH;
  const spongeBandH = (totalCoreH - totalFillH) / numSponge;

  const bands = [];
  for (let k = 0; k < numFilling; k++) {
    bands.push({ type: 'sponge', h: spongeBandH });
    bands.push({ type: 'filling', h: fillBandH });
  }
  bands.push({ type: 'sponge', h: spongeBandH });

  if (isBox) {
    renderBoxAssembledCore(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, bands, spRgb, fillRgb });
  } else {
    // Draw cylinder background
    doc.setFillColor(...spongeShadow);
    doc.rect(cx1 - rx, topY, rx * 2, totalCoreH, 'F');
    doc.ellipse(cx1, botY, rx, ry, 'F');

    // Draw each alternating band
    let currentY = topY;
    bands.forEach((band) => {
      const isSponge = band.type === 'sponge';
      const bandColor = isSponge ? spongeShadow : fillRgb;
      doc.setFillColor(...bandColor);
      doc.rect(cx1 - rx, currentY, rx * 2, band.h, 'F');
      doc.ellipse(cx1, currentY + band.h, rx, ry, 'F');

      if (isSponge && band.h > 4) {
        doc.setDrawColor(...spongeHighlight);
        doc.setLineWidth(0.3);
        doc.line(cx1 - rx * 0.7, currentY + band.h * 0.45, cx1 + rx * 0.7, currentY + band.h * 0.45);
      }
      currentY += band.h;
    });

    // Top surface ellipse
    doc.setFillColor(...spongeHighlight);
    doc.ellipse(cx1, topY, rx, ry, 'F');

    // Outline strokes
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.75);
    doc.ellipse(cx1, topY, rx, ry, 'S');
    doc.line(cx1 - rx, topY, cx1 - rx, botY);
    doc.line(cx1 + rx, topY, cx1 + rx, botY);
    doc.ellipse(cx1, botY, rx, ry, 'S');

    // Seam lines between bands
    let seamY = topY;
    for (let i = 0; i < bands.length - 1; i++) {
      seamY += bands[i].h;
      const isFillingSeam = bands[i].type === 'filling' || bands[i + 1].type === 'filling';
      doc.setDrawColor(25, 20, 20);
      doc.setLineWidth(isFillingSeam ? 0.6 : 0.4);
      doc.ellipse(cx1, seamY, rx, ry, 'S');
    }
  }

  // Label under Left Cake: "FILLING"
  const labelY1 = botY + ry + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const fillingText = 'FILLING';
  doc.text(fillingText, cx1 - doc.getTextWidth(fillingText) / 2, labelY1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(110, 100, 95);
  const subFillingText = `${spongeFlavor} + ${fillingFlavor}`;
  doc.text(subFillingText, cx1 - doc.getTextWidth(subFillingText) / 2, labelY1 + 4.5);


  // -------------------------------------------------------------
  // CENTER: Transition Arrow (->)
  // -------------------------------------------------------------
  const arrowCx = x + w * 0.5;
  const arrowY = topY + totalCoreH * 0.48;
  const arrowLen = 10;

  doc.setDrawColor(...INK);
  doc.setLineWidth(1.4);
  doc.line(arrowCx - arrowLen, arrowY, arrowCx + arrowLen - 2, arrowY);

  doc.setFillColor(...INK);
  doc.triangle(
    arrowCx + arrowLen + 3, arrowY,
    arrowCx + arrowLen - 3, arrowY - 3.5,
    arrowCx + arrowLen - 3, arrowY + 3.5,
    'FD'
  );

  // Arrow step text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const stepText = 'CRUMB COAT & COVER';
  doc.text(stepText, arrowCx - doc.getTextWidth(stepText) / 2, arrowY - 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(120, 110, 105);
  const actionText = isTextured && textureName ? `APPLY ${String(textureName).toUpperCase()}` : 'APPLY SMOOTH COAT';
  doc.text(actionText, arrowCx - doc.getTextWidth(actionText) / 2, arrowY + 8);


  // -------------------------------------------------------------
  // RIGHT: Coated Cake (Frosting or Textured) -> "COATED"
  // -------------------------------------------------------------
  const cx2 = x + 140;
  const fnRgb = hexToRgb(finishColor, [246, 222, 171]);

  if (isBox) {
    renderBoxCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
  } else {
    renderCylinderCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
  }

  // Label under Right Cylinder: "COATED" (matching user sketch)
  const labelY2 = botY + ry + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const coatedText = 'COATED';
  doc.text(coatedText, cx2 - doc.getTextWidth(coatedText) / 2, labelY2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(110, 100, 95);
  const subCoatedText = isTextured && textureName ? `${styleName} · ${textureName}` : `${styleName} (${finishFlavor})`;
  doc.text(subCoatedText, cx2 - doc.getTextWidth(subCoatedText) / 2, labelY2 + 4.5);


  // -------------------------------------------------------------
  // FOOTER NOTE
  // -------------------------------------------------------------
  const footerY = y + h - 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(...INK);
  doc.text('STEP 1: ASSEMBLED CORE (FILLING)  ->  STEP 2: SEALING CRUMB COAT  ->  STEP 3: FULL EXTERIOR COATING (COATED)', x + 5, footerY);

  doc.restoreGraphicsState?.();
}

/**
 * Renders the Surface Treatment / Drip Application Assembly schematic (matching user sketch with COATED -> DRIP).
 * Left: Fully coated cake cylinder (labeled "COATED").
 * Center: Transition arrow (->) indicating glaze pouring & drizzling.
 * Right: Cake cylinder with surface treatment (drip cascading down from top glaze pool,
 *        with dispenser bottle nozzle above it pouring glaze, labeled "DRIP").
 */
export function drawAssemblySurfaceSchematic(doc, {
  x,
  y,
  w = 182,
  h = 88,
  shape = 'round',
  style = 'smooth',
  styleName = 'Smooth Coating',
  texture = '',
  textureName = '',
  isTextured = false,
  finishFlavor = 'Vanilla',
  finishColor = '#F6DEAB',
  surfaceMode = 'drip',
  surfaceModeName = 'Drip',
  patternId = 'naturalTear',
  patternName = 'Natural Tear',
  surfaceFlavorName = 'Chocolate',
  surfaceColor = '#301009',
}) {
  doc.saveGraphicsState?.();

  // 1. Outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Top badges
  drawBadge(doc, 'SURFACE TREATMENT APPLICATION ASSEMBLY', x + 3, y + 3, [35, 30, 30]);

  const topBadgeText = `${String(surfaceModeName || 'DRIP').toUpperCase()} · ${String(patternName || 'GLAZE').toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  const badgeTw = doc.getTextWidth(topBadgeText);
  drawBadge(doc, topBadgeText, x + w - badgeTw - 14, y + 3, [80, 70, 65]);

  const isBox = isBoxShape(shape);
  const coreW = 58;
  const rx = coreW / 2; // 29mm
  const ry = 6.2;
  const topY = y + 16;
  const totalCoreH = 46;
  const botY = topY + totalCoreH;

  const fnRgb = hexToRgb(finishColor, [246, 222, 171]);
  const sRgb = hexToRgb(surfaceColor, [48, 16, 9]);

  // -------------------------------------------------------------
  // LEFT: Coated Cake -> "COATED"
  // -------------------------------------------------------------
  const cx1 = x + 42;
  if (isBox) {
    renderBoxCoatedBase(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
  } else {
    renderCylinderCoatedBase(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
  }

  // Label under Left Cake: "COATED"
  const labelY1 = botY + ry + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const coatedTitle = 'COATED';
  doc.text(coatedTitle, cx1 - doc.getTextWidth(coatedTitle) / 2, labelY1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(110, 100, 95);
  const subCoatedTitle = isTextured && textureName ? `${styleName} · ${textureName}` : `${styleName} (${finishFlavor})`;
  doc.text(subCoatedTitle, cx1 - doc.getTextWidth(subCoatedTitle) / 2, labelY1 + 4.5);


  // -------------------------------------------------------------
  // CENTER: Transition Arrow (->)
  // -------------------------------------------------------------
  const arrowCx = x + w * 0.5;
  const arrowY = topY + totalCoreH * 0.48;
  const arrowLen = 10;

  doc.setDrawColor(...INK);
  doc.setLineWidth(1.4);
  doc.line(arrowCx - arrowLen, arrowY, arrowCx + arrowLen - 2, arrowY);

  doc.setFillColor(...INK);
  doc.triangle(
    arrowCx + arrowLen + 3, arrowY,
    arrowCx + arrowLen - 3, arrowY - 3.5,
    arrowCx + arrowLen - 3, arrowY + 3.5,
    'FD'
  );

  // Arrow step text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const stepText = 'POUR & DRIZZLE';
  doc.text(stepText, arrowCx - doc.getTextWidth(stepText) / 2, arrowY - 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(120, 110, 105);
  const actionText = `APPLY ${String(surfaceModeName || 'DRIP').toUpperCase()}`;
  doc.text(actionText, arrowCx - doc.getTextWidth(actionText) / 2, arrowY + 8);


  // -------------------------------------------------------------
  // RIGHT: Cake with Surface Treatment / Drips -> "DRIP"
  // -------------------------------------------------------------
  const cx2 = x + 140;
  if (isBox) {
    renderBoxCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    renderBoxDripGlaze(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, sRgb, patternId, patternName });
  } else {
    renderCylinderCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    renderCylinderDripGlaze(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, sRgb, patternId, patternName });
  }

  // Label under Right Cylinder: "DRIP" (matching user sketch)
  const labelY2 = botY + ry + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const dripTitle = 'DRIP';
  doc.text(dripTitle, cx2 - doc.getTextWidth(dripTitle) / 2, labelY2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(110, 100, 95);
  const subDripTitle = `${patternName} (${surfaceFlavorName})`;
  doc.text(subDripTitle, cx2 - doc.getTextWidth(subDripTitle) / 2, labelY2 + 4.5);


  // -------------------------------------------------------------
  // FOOTER NOTE
  // -------------------------------------------------------------
  const footerY = y + h - 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(...INK);
  doc.text('STEP 1: CHILLED COATED BASE (COATED)  ->  STEP 2: DRIZZLE GLAZE FROM NOZZLE  ->  STEP 3: CASCADING SURFACE FINISH (DRIP)', x + 5, footerY);

  doc.restoreGraphicsState?.();
}

/**
 * Shared helper: renders coated cylinder base (body, shading, texture ridges, top surface, rim outlines)
 */
function renderCylinderCoatedBase(doc, { cx, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture }) {
  const finishBase = fnRgb;
  const finishHighlight = [
    Math.min(255, fnRgb[0] + 16),
    Math.min(255, fnRgb[1] + 16),
    Math.min(255, fnRgb[2] + 16),
  ];
  const finishShadow = [
    Math.max(0, fnRgb[0] - 24),
    Math.max(0, fnRgb[1] - 24),
    Math.max(0, fnRgb[2] - 24),
  ];
  const finishDeepShadow = [
    Math.max(0, fnRgb[0] - 38),
    Math.max(0, fnRgb[1] - 38),
    Math.max(0, fnRgb[2] - 38),
  ];

  // Cylinder body
  doc.setFillColor(...finishBase);
  doc.rect(cx - rx, topY, rx * 2, totalCoreH, 'F');
  doc.ellipse(cx, botY, rx, ry, 'F');

  // Soft shadow on right
  doc.setFillColor(...finishShadow);
  doc.rect(cx + rx * 0.45, topY, rx * 0.55, totalCoreH, 'F');
  doc.ellipse(cx, botY, rx, ry, 'F');

  // Specular highlight on left
  doc.setFillColor(...finishHighlight);
  doc.rect(cx - rx * 0.65, topY, rx * 0.35, totalCoreH, 'F');
  doc.ellipse(cx, botY, rx, ry, 'F');

  // Texture lines (if textured buttercream)
  if (isTextured) {
    if (texture === 'ribbonWrap') {
      const numRibbons = 7;
      const ribbonH = totalCoreH / numRibbons;
      for (let rIdx = 1; rIdx < numRibbons; rIdx++) {
        const rY = topY + rIdx * ribbonH;
        doc.setDrawColor(...finishDeepShadow);
        doc.setLineWidth(0.65);
        doc.ellipse(cx, rY, rx, ry, 'S');

        doc.setDrawColor(...finishHighlight);
        doc.setLineWidth(0.35);
        doc.ellipse(cx, rY + 0.5, rx, ry, 'S');
      }
    } else {
      const numRidges = 12;
      const ridgeH = totalCoreH / (numRidges + 1);
      for (let rIdx = 1; rIdx <= numRidges; rIdx++) {
        const rY = topY + rIdx * ridgeH;
        doc.setDrawColor(...finishDeepShadow);
        doc.setLineWidth(0.45);
        doc.ellipse(cx, rY, rx, ry, 'S');

        doc.setDrawColor(...finishHighlight);
        doc.setLineWidth(0.25);
        doc.ellipse(cx, rY + 0.4, rx, ry, 'S');
      }
    }
  }

  // Top surface
  doc.setFillColor(...finishHighlight);
  doc.ellipse(cx, topY, rx, ry, 'F');

  if (isTextured) {
    doc.setDrawColor(...finishShadow);
    doc.setLineWidth(0.3);
    doc.ellipse(cx, topY, rx * 0.65, ry * 0.65, 'S');
    doc.ellipse(cx, topY, rx * 0.35, ry * 0.35, 'S');
  }

  // Outer strokes
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.75);
  doc.ellipse(cx, topY, rx, ry, 'S');
  doc.line(cx - rx, topY, cx - rx, botY);
  doc.line(cx + rx, topY, cx + rx, botY);
  doc.ellipse(cx, botY, rx, ry, 'S');
}

/**
 * Shared helper: renders Drip Glaze on top of cylinder based on selected drip pattern
 */
function renderCylinderDripGlaze(doc, { cx, topY, rx, ry, totalCoreH, botY, sRgb, patternId, patternName }) {
  const sHighlight = [
    Math.min(255, sRgb[0] + 32),
    Math.min(255, sRgb[1] + 32),
    Math.min(255, sRgb[2] + 32),
  ];
  const sShadow = [
    Math.max(0, sRgb[0] - 25),
    Math.max(0, sRgb[1] - 25),
    Math.max(0, sRgb[2] - 25),
  ];

  // Top surface glaze pool
  doc.setFillColor(...sRgb);
  doc.ellipse(cx, topY, rx, ry, 'F');
  doc.setDrawColor(...sShadow);
  doc.setLineWidth(0.4);
  doc.ellipse(cx, topY, rx, ry, 'S');

  // Sheen reflection on top glaze
  doc.setFillColor(...sHighlight);
  doc.ellipse(cx - rx * 0.28, topY - 0.6, rx * 0.48, ry * 0.5, 'F');

  // Overlay Drip Glaze based on actual selected Drip Pattern (matching renderDripDrawing)
  const str = String(patternId || patternName || '').toLowerCase();
  let tang = 0.5;

  const wave = (dipY, crestY) => [
    [0.00, crestY], [0.17, dipY], [0.33, crestY], [0.50, dipY], [0.66, crestY], [0.83, dipY], [1.00, crestY],
  ];

  let keyNodes;
  if (str.includes('alt') || str.includes('longshort')) {
    tang = 0.36;
    keyNodes = [
      [0.00, 0.14], [0.07, 0.50], [0.14, 0.19], [0.27, 0.95], [0.46, 0.17],
      [0.64, 0.56], [0.82, 0.18], [0.95, 0.86], [1.00, 0.86],
    ];
  } else if (str.includes('short') && !str.includes('wave') && !str.includes('cover')) {
    tang = 0.42;
    keyNodes = [
      [0.00, 0.50], [0.06, 0.52], [0.15, 0.20], [0.31, 0.56], [0.48, 0.18],
      [0.69, 0.56], [0.87, 0.21], [0.95, 0.50], [1.00, 0.50],
    ];
  } else if (str.includes('longwave') || str.includes('full') || str.includes('coverage')) {
    tang = 0.5;
    keyNodes = wave(0.85, 0.72);
  } else if (str.includes('midwave') || (str.includes('mid') && str.includes('wave')) || (str.includes('mid') && str.includes('cover'))) {
    tang = 0.5;
    keyNodes = wave(0.53, 0.42);
  } else if (str.includes('shortwave') || (str.includes('short') && str.includes('wave')) || (str.includes('short') && str.includes('cover'))) {
    tang = 0.5;
    keyNodes = wave(0.28, 0.16);
  } else if (str.includes('tinytip') || str.includes('curve')) {
    tang = 0.5;
    keyNodes = [
      [0.00, 0.55], [0.13, 0.38], [0.30, 0.58], [0.46, 0.37], [0.66, 0.60], [0.82, 0.38], [0.95, 0.55], [1.00, 0.55],
    ];
  } else if (str.includes('uneven') || str.includes('fall')) {
    tang = 0.45;
    keyNodes = [
      [0.00, 0.24], [0.06, 0.20, 0.5], [0.17, 0.80, 0.1], [0.31, 0.19, 0.5], [0.46, 0.53, 0.1],
      [0.62, 0.20, 0.5], [0.77, 0.82, 0.1], [0.92, 0.22, 0.5], [1.00, 0.26],
    ];
  } else if (str.includes('natural') || str.includes('tear') || str.includes('gap')) {
    tang = 0.4;
    keyNodes = [
      [0.00, 0.34], [0.06, 0.34], [0.14, 0.86, 0.1], [0.21, 0.55, 0.3], [0.35, 0.44],
      [0.50, 0.62], [0.62, 0.54], [0.70, 0.93, 0.1], [0.78, 0.27, 0.45], [0.88, 0.28], [0.95, 0.36], [1.00, 0.36],
    ];
  } else {
    tang = 0.28;
    keyNodes = [
      [0.00, 0.85], [0.03, 0.85], [0.10, 0.18], [0.28, 0.92], [0.50, 0.18],
      [0.69, 0.92], [0.88, 0.18], [0.97, 0.85], [1.00, 0.85],
    ];
  }

  // Evaluate Bezier drip contour points along front of cylinder
  const dripCurve = [];
  const maxDripH = totalCoreH - 5;
  for (let i = 0; i < keyNodes.length - 1; i++) {
    const p0 = { u: keyNodes[i][0], v: keyNodes[i][1] };
    const p3 = { u: keyNodes[i + 1][0], v: keyNodes[i + 1][1] };
    const du = p3.u - p0.u;
    const k0 = keyNodes[i][2] ?? tang;
    const k3 = keyNodes[i + 1][2] ?? tang;
    const p1 = { u: p0.u + du * k0, v: p0.v };
    const p2 = { u: p3.u - du * k3, v: p3.v };

    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      const u = mt ** 3 * p0.u + 3 * mt * mt * t * p1.u + 3 * mt * t * t * p2.u + t ** 3 * p3.u;
      const v = mt ** 3 * p0.v + 3 * mt * mt * t * p1.v + 3 * mt * t * t * p2.v + t ** 3 * p3.v;

      const px = cx - rx + u * (2 * rx);
      const rimY = topY + ry * Math.sqrt(Math.max(0, 1 - ((px - cx) / rx) ** 2));
      const py = Math.min(botY - 1.5, rimY + v * maxDripH);
      dripCurve.push({ x: px, y: py, u, v });
    }
  }
  const lastNode = keyNodes[keyNodes.length - 1];
  const pxLast = cx + rx;
  const pyLast = Math.min(botY - 1.5, topY + lastNode[1] * maxDripH);
  dripCurve.push({ x: pxLast, y: pyLast, u: 1, v: lastNode[1] });

  // Closed polygon of the drip curtain:
  const rimSteps = 24;
  const rimArc = [];
  for (let i = rimSteps; i >= 0; i--) {
    const u = i / rimSteps;
    const rxPos = cx - rx + u * (2 * rx);
    const ryPos = topY + ry * Math.sqrt(Math.max(0, 1 - ((rxPos - cx) / rx) ** 2));
    rimArc.push([rxPos, ryPos]);
  }

  const poly = [
    ...dripCurve.map(p => [p.x, p.y]),
    ...rimArc,
  ];

  const segs = [];
  for (let i = 1; i < poly.length; i++) {
    segs.push([poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]]);
  }
  doc.setFillColor(...sRgb);
  doc.lines(segs, poly[0][0], poly[0][1], [1, 1], 'F', true);

  // Bottom edge line of drip curtain
  doc.setDrawColor(...sShadow);
  doc.setLineWidth(0.65);
  for (let i = 0; i < dripCurve.length - 1; i++) {
    doc.line(dripCurve[i].x, dripCurve[i].y, dripCurve[i + 1].x, dripCurve[i + 1].y);
  }

  // Inner highlight reflection along the bottom wavy rim
  doc.setDrawColor(...sHighlight);
  doc.setLineWidth(0.35);
  for (let i = 2; i < dripCurve.length - 3; i += 2) {
    if (i % 5 !== 0) {
      doc.line(dripCurve[i].x, dripCurve[i].y - 0.7, dripCurve[i + 1].x, dripCurve[i + 1].y - 0.7);
    }
  }

  // For drip patterns with distinct dripping tongues, render rounded bulb droplets at tongue tips
  const isWavePattern = str.includes('wave') || str.includes('full') || str.includes('coverage');
  if (!isWavePattern) {
    for (let i = 2; i < dripCurve.length - 2; i++) {
      const prevY = dripCurve[i - 1].y;
      const curY = dripCurve[i].y;
      const nextY = dripCurve[i + 1].y;
      if (curY >= prevY && curY >= nextY && curY > topY + ry + 7) {
        const bulbR = Math.min(2.3, Math.max(1.3, (curY - (topY + ry)) * 0.08));
        doc.setFillColor(...sRgb);
        doc.circle(dripCurve[i].x, curY - 0.2, bulbR, 'F');
        doc.setDrawColor(...sShadow);
        doc.setLineWidth(0.35);
        doc.circle(dripCurve[i].x, curY - 0.2, bulbR, 'S');

        // Glint highlight on teardrop bulb
        doc.setFillColor(...sHighlight);
        doc.circle(dripCurve[i].x - bulbR * 0.35, curY - 0.2 - bulbR * 0.35, bulbR * 0.35, 'F');
      }
    }
  }

  // Specular sheen reflection streaks down deeper portions of the glaze
  doc.setDrawColor(...sHighlight);
  doc.setLineWidth(0.45);
  [-0.6, -0.2, 0.25, 0.65].forEach((uOff) => {
    const streakX = cx + rx * uOff;
    const pt = dripCurve.find(p => Math.abs(p.x - streakX) < 1.6);
    if (pt && pt.y > topY + ry + 8) {
      const rimYAt = topY + ry * Math.sqrt(Math.max(0, 1 - uOff ** 2));
      doc.line(streakX, rimYAt + 2.0, streakX, pt.y - 2.5);
    }
  });

  // Re-stroke outer cylinder edges
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.75);
  doc.ellipse(cx, topY, rx, ry, 'S');
  doc.line(cx - rx, topY, cx - rx, botY);
  doc.line(cx + rx, topY, cx + rx, botY);
  doc.ellipse(cx, botY, rx, ry, 'S');
}

/**
 * Shared helper: renders Dispenser Nozzle pouring glaze above cylinder (matching user sketch)
 */
function renderDispenserNozzle(doc, { cx, topY, sRgb }) {
  const nozW = 8;
  const nozH = 4.5;
  const nozY = topY - 12;

  // Dispenser bottle/cup reservoir
  doc.setFillColor(244, 242, 240);
  doc.rect(cx - nozW / 2, nozY, nozW, nozH, 'F');
  doc.ellipse(cx, nozY, nozW / 2, 1.2, 'F');
  doc.ellipse(cx, nozY + nozH, nozW / 2, 1.2, 'F');

  // Glaze inside reservoir
  doc.setFillColor(...sRgb);
  doc.rect(cx - nozW / 2 + 0.6, nozY + 1.2, nozW - 1.2, nozH - 1.2, 'F');

  // Dispenser bottle outlines
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  doc.ellipse(cx, nozY, nozW / 2, 1.2, 'S');
  doc.line(cx - nozW / 2, nozY, cx - nozW / 2, nozY + nozH);
  doc.line(cx + nozW / 2, nozY, cx + nozW / 2, nozY + nozH);

  // Tapered funnel to nozzle
  doc.setFillColor(244, 242, 240);
  doc.triangle(cx - nozW / 2, nozY + nozH, cx + nozW / 2, nozY + nozH, cx, nozY + nozH + 3.2, 'FD');

  // Nozzle tip
  doc.setFillColor(...sRgb);
  doc.rect(cx - 0.9, nozY + nozH + 2.4, 1.8, 2.2, 'FD');

  // Stream of glaze falling into center of top surface
  doc.setDrawColor(...sRgb);
  doc.setLineWidth(0.9);
  doc.line(cx, nozY + nozH + 4.6, cx, topY - 0.5);
  doc.setFillColor(...sRgb);
  doc.circle(cx, topY - 1.2, 0.7, 'F');
}

/**
 * Shared helper: renders Piping Nozzle / Tip above cylinder (matching user sketch)
 */
function renderPipingNozzle(doc, { cx, topY, sideRgb }) {
  const pNozW = 8.5;
  const pNozH = 4.2;
  const pNozY = topY - 12.5;

  // Coupler / piping bag collar
  doc.setFillColor(246, 244, 242);
  doc.rect(cx - pNozW / 2, pNozY, pNozW, pNozH, 'F');
  doc.ellipse(cx, pNozY, pNozW / 2, 1.2, 'F');
  doc.ellipse(cx, pNozY + pNozH, pNozW / 2, 1.2, 'F');

  // Frosting inside coupler
  doc.setFillColor(...sideRgb);
  doc.rect(cx - pNozW / 2 + 0.6, pNozY + 1.2, pNozW - 1.2, pNozH - 1.2, 'F');

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  doc.ellipse(cx, pNozY, pNozW / 2, 1.2, 'S');
  doc.line(cx - pNozW / 2, pNozY, cx - pNozW / 2, pNozY + pNozH);
  doc.line(cx + pNozW / 2, pNozY, cx + pNozW / 2, pNozY + pNozH);

  // Metallic piping tip cone
  doc.setFillColor(220, 222, 225);
  doc.triangle(cx - pNozW / 2, pNozY + pNozH, cx + pNozW / 2, pNozY + pNozH, cx, pNozY + pNozH + 3.8, 'FD');

  // Piping tip nozzle opening with frosting
  doc.setFillColor(...sideRgb);
  doc.rect(cx - 1.0, pNozY + pNozH + 2.8, 2.0, 2.0, 'FD');

  // Piped bead droplet at tip
  doc.setFillColor(...sideRgb);
  doc.circle(cx, pNozY + pNozH + 5.5, 0.9, 'F');
}

/**
 * Renders the Side Design Application Assembly schematic (in-between SIDE and EDGE, matching user sketch DRIP -> SIDE).
 * Left: Cake with Surface Treatment / Drip (or Coated Base), labeled "DRIP" (or "COATED").
 * Center: Transition arrow (->) indicating piping & decorating perimeter motifs.
 * Right: Cake cylinder with side design pattern applied along the wall and piping nozzle above it, labeled "SIDE".
 */
export function drawAssemblySideSchematic(doc, {
  x,
  y,
  w = 182,
  h = 88,
  shape = 'round',
  style = 'smooth',
  styleName = 'Smooth Coating',
  texture = '',
  textureName = '',
  isTextured = false,
  finishFlavor = 'Vanilla',
  finishColor = '#F6DEAB',
  hasSurface = false,
  surfaceMode = 'drip',
  surfaceModeName = 'Drip',
  surfacePatternId = 'naturalTear',
  surfacePatternName = 'Natural Tear',
  surfaceFlavorName = 'Chocolate',
  surfaceColor = '#301009',
  treatmentId = 'checkeredPattern',
  treatmentName = 'Checkered Pattern',
  variantId = 'straightGrid',
  sidePatternName = 'Straight Grid',
  sideColorName = 'Chocolate',
  sideColor = '#3D2314',
  secondaryColor = null,
}) {
  doc.saveGraphicsState?.();

  // 1. Outer container
  doc.setFillColor(252, 250, 248);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Top badges
  drawBadge(doc, 'SIDE DESIGN APPLICATION ASSEMBLY', x + 3, y + 3, [35, 30, 30]);

  const topBadgeText = `${String(treatmentName || 'SIDE').toUpperCase()} · ${String(sidePatternName || 'PATTERN').toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  const badgeTw = doc.getTextWidth(topBadgeText);
  drawBadge(doc, topBadgeText, x + w - badgeTw - 14, y + 3, [80, 70, 65]);

  const isBox = isBoxShape(shape);
  const coreW = 58;
  const rx = coreW / 2; // 29mm
  const ry = 6.2;
  const topY = y + 16;
  const totalCoreH = 46;
  const botY = topY + totalCoreH;

  const fnRgb = hexToRgb(finishColor, [246, 222, 171]);
  const sRgb = hexToRgb(surfaceColor, [48, 16, 9]);
  const sideRgb = hexToRgb(sideColor, [61, 35, 20]);

  // -------------------------------------------------------------
  // LEFT: Prepared Tier Base -> "DRIP" (or "COATED")
  // -------------------------------------------------------------
  const cx1 = x + 42;
  if (isBox) {
    renderBoxCoatedBase(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    if (hasSurface) {
      renderBoxDripGlaze(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, sRgb, patternId: surfacePatternId, patternName: surfacePatternName });
    }
  } else {
    renderCylinderCoatedBase(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    if (hasSurface) {
      renderCylinderDripGlaze(doc, { cx: cx1, topY, rx, ry, totalCoreH, botY, sRgb, patternId: surfacePatternId, patternName: surfacePatternName });
    }
  }

  if (hasSurface) {
    // Label: "DRIP"
    const labelY1 = botY + ry + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const dripTitle = 'DRIP';
    doc.text(dripTitle, cx1 - doc.getTextWidth(dripTitle) / 2, labelY1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(110, 100, 95);
    const subDripTitle = `${surfacePatternName || surfaceModeName} (${surfaceFlavorName})`;
    doc.text(subDripTitle, cx1 - doc.getTextWidth(subDripTitle) / 2, labelY1 + 4.5);
  } else {
    // Label: "COATED"
    const labelY1 = botY + ry + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const coatedTitle = 'COATED';
    doc.text(coatedTitle, cx1 - doc.getTextWidth(coatedTitle) / 2, labelY1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(110, 100, 95);
    const subCoatedTitle = isTextured && textureName ? `${styleName} · ${textureName}` : `${styleName} (${finishFlavor})`;
    doc.text(subCoatedTitle, cx1 - doc.getTextWidth(subCoatedTitle) / 2, labelY1 + 4.5);
  }

  // -------------------------------------------------------------
  // CENTER: Transition Arrow (->)
  // -------------------------------------------------------------
  const arrowCx = x + w * 0.5;
  const arrowY = topY + totalCoreH * 0.48;
  const arrowLen = 10;

  doc.setDrawColor(...INK);
  doc.setLineWidth(1.4);
  doc.line(arrowCx - arrowLen, arrowY, arrowCx + arrowLen - 2, arrowY);

  doc.setFillColor(...INK);
  doc.triangle(
    arrowCx + arrowLen + 3, arrowY,
    arrowCx + arrowLen - 3, arrowY - 3.5,
    arrowCx + arrowLen - 3, arrowY + 3.5,
    'FD'
  );

  // Arrow step text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  const stepText = 'PIPE & DECORATE';
  doc.text(stepText, arrowCx - doc.getTextWidth(stepText) / 2, arrowY - 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(120, 110, 105);
  const actionText = `APPLY ${String(sidePatternName || treatmentName || 'SIDE').toUpperCase()}`;
  doc.text(actionText, arrowCx - doc.getTextWidth(actionText) / 2, arrowY + 8);

  // -------------------------------------------------------------
  // RIGHT: Cake with Side Design Applied -> "SIDE"
  // -------------------------------------------------------------
  const cx2 = x + 140;
  // 1. Render base coated base
  if (isBox) {
    renderBoxCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    if (hasSurface) {
      renderBoxDripGlaze(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, sRgb, patternId: surfacePatternId, patternName: surfacePatternName });
    }
  } else {
    renderCylinderCoatedBase(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, fnRgb, isTextured, texture });
    if (hasSurface) {
      renderCylinderDripGlaze(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY, sRgb, patternId: surfacePatternId, patternName: surfacePatternName });
    }
  }

  // 2. Render side design shapes projected onto the surface (bent/curved with cake body and spread across full width)
  renderProjectedSidePattern(doc, {
    cx: cx2,
    topY,
    rx,
    ry,
    totalCoreH,
    botY,
    isBox,
    treatmentId,
    variantId,
    rgb: sideRgb,
    secondaryColor,
    hasSurface,
  });

  // 3. Re-stroke outer edges for crisp boundary
  if (isBox) {
    reStrokeBoxOutlines(doc, { cx: cx2, topY, rx, ry, totalCoreH, botY });
  } else {
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.75);
    doc.ellipse(cx2, topY, rx, ry, 'S');
    doc.line(cx2 - rx, topY, cx2 - rx, botY);
    doc.line(cx2 + rx, topY, cx2 + rx, botY);
    doc.ellipse(cx2, botY, rx, ry, 'S');
  }

  // Label under Right Cylinder: "SIDE" (matching user sketch)
  const labelY2 = botY + ry + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const sideTitle = 'SIDE';
  doc.text(sideTitle, cx2 - doc.getTextWidth(sideTitle) / 2, labelY2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(110, 100, 95);
  const subSideTitle = `${sidePatternName} (${sideColorName})`;
  doc.text(subSideTitle, cx2 - doc.getTextWidth(subSideTitle) / 2, labelY2 + 4.5);

  // -------------------------------------------------------------
  // FOOTER NOTE
  // -------------------------------------------------------------
  const footerY = y + h - 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(...INK);
  const footerBase = hasSurface ? 'DRIP' : 'COATED';
  doc.text(`STEP 1: PREPARED BASE (${footerBase})  ->  STEP 2: PRECISION PIPING TIP  ->  STEP 3: CIRCUMFERENCE WALL MOTIFS (SIDE)`, x + 5, footerY);

  doc.restoreGraphicsState?.();
}