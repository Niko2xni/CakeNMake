/**
 * Blueprint Vector Icon Renderer
 * Renders the exact geometric ToolPanel icons (Side & Edge) directly
 * into jsPDF vector primitives for high-resolution, print-ready blueprints.
 */

import { BUBBLE_RIM, INK } from './blueprintBubbles';

export function drawPatternIconBubble(doc, {
  cx,
  cy,
  r = 16,
  treatmentId,
  variantId,
  title = 'PATTERN',
  sub = '',
}) {
  // 1. Draw outer circular badge background and rim
  doc.setFillColor(248, 244, 241);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(...BUBBLE_RIM);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r, 'S');

  // 2. Render vector icon inside the bubble
  const iconR = r * 0.82;
  if (isEdgeTreatment(treatmentId)) {
    drawEdgePatternIcon(doc, cx, cy, iconR, treatmentId, variantId);
  } else {
    drawSidePatternIcon(doc, cx, cy, iconR, treatmentId, variantId);
  }

  // 3. Draw bubble badge/label below
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(String(title).toUpperCase(), cx, cy + r + 6.5, { align: 'center' });

  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 65, 65);
    const subLines = doc.splitTextToSize(String(sub), 44);
    doc.text(subLines, cx, cy + r + 10.5, { align: 'center' });
  }
}

/**
 * Draws a side design icon centered at (cx, cy) with radius `iconR` (in mm).
 */
export function drawSidePatternIcon(doc, cx, cy, iconR, treatmentId, variantId) {
  const scale = iconR / 10.6;
  const X = (vx) => cx + (vx - 12) * scale;
  const Y = (vy) => cy + (vy - 12) * scale;
  const S = (val) => val * scale;

  doc.saveGraphicsState?.();
  doc.setDrawColor(45, 38, 38);
  doc.setFillColor(45, 38, 38);
  doc.setLineWidth(0.42);

  // Outer icon boundary circle
  doc.circle(cx, cy, S(10.6), 'S');

  const normVariant = normalizeVariant(treatmentId, variantId);

  switch (treatmentId) {
    case 'checkeredPattern':
      drawCheckeredIcon(doc, X, Y, S, normVariant);
      break;
    case 'trianglePattern':
      drawTriangleIcon(doc, X, Y, S, normVariant);
      break;
    case 'chevronPattern':
      drawChevronIcon(doc, X, Y, S, normVariant);
      break;
    case 'scatterPearls':
      drawScatterPearlsIcon(doc, X, Y, S, normVariant);
      break;
    case 'pipingScrolls':
      drawPipingScrollsIcon(doc, X, Y, S, normVariant);
      break;
    case 'sunshinePlay':
      drawSunshinePlayIcon(doc, X, Y, S, normVariant);
      break;
    case 'victorianLambeth':
      drawVictorianLambethIcon(doc, X, Y, S, normVariant);
      break;
    default:
      drawCheckeredIcon(doc, X, Y, S, 'wholeCake');
      break;
  }

  doc.restoreGraphicsState?.();
}

function normalizeVariant(treatmentId, variantId) {
  if (!variantId) return 'wholeCake';
  const str = String(variantId).toLowerCase();
  if (treatmentId === 'checkeredPattern' || treatmentId === 'trianglePattern') {
    if (str.includes('left') || str.includes('sidesonly')) return 'sidesOnly';
    if (str.includes('xpattern') || str === 'x') return 'xPattern';
    if (str.includes('right')) return 'rightDiagonal';
    if (str.includes('outer') || str.includes('bottom')) return 'parallelOuter';
    if (str.includes('inner') || str.includes('top')) return 'parallelInner';
    return 'wholeCake';
  }
  if (treatmentId === 'chevronPattern') {
    if (str.includes('twotone') || str.includes('two')) return 'twoTone';
    if (str.includes('threetone') || str.includes('three')) return 'threeTone';
    if (str.includes('wide')) return 'wideZigzag';
    if (str.includes('tight')) return 'tightZigzag';
    if (str.includes('gap')) return 'singleColorGapped';
    return 'singleColor';
  }
  if (treatmentId === 'scatterPearls') {
    if (str.includes('border')) return 'diamondGridBorder';
    if (str.includes('diamond')) return 'diamondGrid';
    if (str.includes('row')) return 'horizontalRows';
    if (str.includes('big')) return 'bigPearlsScatter';
    if (str.includes('small')) return 'smallPearlsScatter';
    return 'randomScatter';
  }
  if (treatmentId === 'pipingScrolls') {
    if (str.includes('paired') || str.includes('scroll')) return 'pairedScrolls';
    if (str.includes('fleur') || str.includes('lis')) return 'fleurDeLisRow';
    if (str.includes('shell')) return 'shellBorderRow';
    if (str.includes('vine') || str.includes('tendril')) return 'vineAndTendrils';
    if (str.includes('loop') || str.includes('chain')) return 'loopChain';
    return 'waveRope';
  }
  if (treatmentId === 'sunshinePlay') {
    if (str.includes('cloud') || str.includes('champ') || str.includes('chump')) return str.includes('sky') ? 'skyChumps' : 'cloudyChump';
    if (str.includes('burst')) return 'starBurst';
    if (str.includes('starry')) return 'starrySunshinePlay';
    if (str.includes('sunshine') || str.includes('star')) return 'sunshineStars';
    return 'rainbowArc';
  }
  if (treatmentId === 'victorianLambeth') {
    if (str.includes('norosette') || str.includes('no_rosette')) return 'noRosette';
    if (str.includes('ropesonly') || str.includes('ropes_only')) return 'ropesOnly';
    if (str.includes('noropes') || str.includes('no_ropes')) return 'noRopes';
    if (str.includes('double')) return 'doubleBand';
    if (str.includes('triple')) return 'tripleBand';
    return 'classic';
  }
  return variantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Checkered Pattern Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawCheckeredIcon(doc, X, Y, S, variant) {
  if (variant === 'sidesOnly') {
    doc.rect(X(3.8), Y(14.8), S(5.4), S(5.4), 'S');
    doc.rect(X(9.3), Y(9.3), S(5.4), S(5.4), 'S');
    doc.rect(X(14.8), Y(3.8), S(5.4), S(5.4), 'S');
    doc.line(X(9.2), Y(14.8), X(9.3), Y(14.8));
    doc.line(X(14.7), Y(9.3), X(14.8), Y(9.3));
  } else if (variant === 'xPattern') {
    doc.rect(X(9.3), Y(9.3), S(5.4), S(5.4), 'S');
    doc.rect(X(4.8), Y(4.8), S(5), S(5), 'S');
    doc.rect(X(14.2), Y(4.8), S(5), S(5), 'S');
    doc.rect(X(4.8), Y(14.2), S(5), S(5), 'S');
    doc.rect(X(14.2), Y(14.2), S(5), S(5), 'S');
  } else if (variant === 'rightDiagonal') {
    doc.rect(X(3.8), Y(3.8), S(5.4), S(5.4), 'S');
    doc.rect(X(9.3), Y(9.3), S(5.4), S(5.4), 'S');
    doc.rect(X(14.8), Y(14.8), S(5.4), S(5.4), 'S');
    doc.line(X(9.2), Y(9.3), X(9.3), Y(9.3));
    doc.line(X(14.7), Y(14.8), X(14.8), Y(14.8));
  } else if (variant === 'parallelOuter') {
    doc.rect(X(3.8), Y(4.2), S(4.8), S(4.8), 'S');
    doc.rect(X(9.6), Y(4.2), S(4.8), S(4.8), 'S');
    doc.rect(X(15.4), Y(4.2), S(4.8), S(4.8), 'S');
    doc.rect(X(3.8), Y(15), S(4.8), S(4.8), 'S');
    doc.rect(X(9.6), Y(15), S(4.8), S(4.8), 'S');
    doc.rect(X(15.4), Y(15), S(4.8), S(4.8), 'S');
  } else if (variant === 'parallelInner') {
    doc.rect(X(3.8), Y(7.2), S(4.8), S(4.4), 'S');
    doc.rect(X(9.6), Y(7.2), S(4.8), S(4.4), 'S');
    doc.rect(X(15.4), Y(7.2), S(4.8), S(4.4), 'S');
    doc.rect(X(3.8), Y(12.4), S(4.8), S(4.4), 'S');
    doc.rect(X(9.6), Y(12.4), S(4.8), S(4.4), 'S');
    doc.rect(X(15.4), Y(12.4), S(4.8), S(4.4), 'S');
  } else {
    // Full Pattern (User sketch style)
    doc.rect(X(4.8), Y(4.8), S(5.4), S(5.4), 'S');
    doc.rect(X(13.8), Y(4.8), S(5.4), S(5.4), 'S');
    doc.rect(X(4.8), Y(13.8), S(5.4), S(5.4), 'S');
    doc.rect(X(13.8), Y(13.8), S(5.4), S(5.4), 'S');
    doc.line(X(10.2), Y(10.2), X(13.8), Y(10.2));
    doc.line(X(10.2), Y(13.8), X(13.8), Y(13.8));
    doc.line(X(10.2), Y(10.2), X(10.2), Y(13.8));
    doc.line(X(13.8), Y(10.2), X(13.8), Y(13.8));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Triangle Pattern Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawTriangleIcon(doc, X, Y, S, variant) {
  const tri = (x1, y1, x2, y2, x3, y3) => doc.triangle(X(x1), Y(y1), X(x2), Y(y2), X(x3), Y(y3), 'S');
  if (variant === 'sidesOnly') {
    tri(4, 20, 10, 20, 7, 14);
    tri(9, 14.5, 15, 14.5, 12, 8.5);
    tri(14, 9, 20, 9, 17, 3);
  } else if (variant === 'xPattern') {
    tri(9, 14.5, 15, 14.5, 12, 9.5);
    tri(4, 9, 9, 9, 6.5, 4);
    tri(15, 4, 20, 4, 17.5, 9);
    tri(4, 20, 9, 20, 6.5, 15);
    tri(15, 15, 20, 15, 17.5, 20);
  } else if (variant === 'rightDiagonal') {
    tri(4, 4, 10, 4, 7, 10);
    tri(9, 9.5, 15, 9.5, 12, 15.5);
    tri(14, 15, 20, 15, 17, 21);
  } else if (variant === 'parallelOuter') {
    tri(3.8, 9, 8.2, 9, 6, 4.5); tri(9.8, 9, 14.2, 9, 12, 4.5); tri(15.8, 9, 20.2, 9, 18, 4.5);
    tri(3.8, 19.5, 8.2, 19.5, 6, 15); tri(9.8, 19.5, 14.2, 19.5, 12, 15); tri(15.8, 19.5, 20.2, 19.5, 18, 15);
  } else if (variant === 'parallelInner') {
    tri(3.8, 11.5, 8.2, 11.5, 6, 7); tri(9.8, 11.5, 14.2, 11.5, 12, 7); tri(15.8, 11.5, 20.2, 11.5, 18, 7);
    tri(3.8, 17, 8.2, 17, 6, 12.5); tri(9.8, 17, 14.2, 17, 12, 12.5); tri(15.8, 17, 20.2, 17, 18, 12.5);
  } else {
    tri(4.5, 10.2, 10.5, 10.2, 7.5, 4.8);
    tri(13.5, 4.8, 19.5, 4.8, 16.5, 10.2);
    tri(4.5, 13.8, 10.5, 13.8, 7.5, 19.2);
    tri(13.5, 19.2, 19.5, 19.2, 16.5, 13.8);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chevron Pattern Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawChevronIcon(doc, X, Y, S, variant) {
  const poly = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) doc.line(X(pts[i][0]), Y(pts[i][1]), X(pts[i+1][0]), Y(pts[i+1][1]));
  };
  if (variant === 'wideZigzag') {
    doc.setLineWidth(0.6);
    poly([[3, 10], [12, 4.8], [21, 10]]);
    poly([[3, 17.5], [12, 12.3], [21, 17.5]]);
  } else if (variant === 'tightZigzag') {
    doc.setLineWidth(0.35);
    poly([[3.5, 7.5], [6, 5.8], [8.5, 7.5], [11, 5.8], [13.5, 7.5], [16, 5.8], [18.5, 7.5], [20.5, 6.2]]);
    poly([[2, 12], [4.5, 10.3], [7, 12], [9.5, 10.3], [12, 12], [14.5, 10.3], [17, 12], [19.5, 10.3], [22, 12]]);
    poly([[3.5, 16.5], [6, 14.8], [8.5, 16.5], [11, 14.8], [13.5, 16.5], [16, 14.8], [18.5, 16.5], [20.5, 15.2]]);
  } else if (variant === 'singleColorGapped') {
    doc.setLineWidth(0.5);
    poly([[3.5, 6.5], [7.8, 4.5], [12, 6.5], [16.2, 4.5], [20.5, 6.5]]);
    poly([[3.5, 17.5], [7.8, 15.5], [12, 17.5], [16.2, 15.5], [20.5, 17.5]]);
  } else {
    // Single Color / Two-Tone / Three-Tone
    doc.setLineWidth(0.5);
    poly([[3.5, 7.5], [7.8, 5.5], [12, 7.5], [16.2, 5.5], [20.5, 7.5]]);
    poly([[2.2, 12], [7.1, 9.8], [12, 12], [16.9, 9.8], [21.8, 12]]);
    poly([[3.5, 16.5], [7.8, 14.5], [12, 16.5], [16.2, 14.5], [20.5, 16.5]]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scatter Pearls Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawScatterPearlsIcon(doc, X, Y, S, variant) {
  const dot = (x, y, r) => doc.circle(X(x), Y(y), S(r), 'F');
  if (variant === 'diamondGrid') {
    doc.setLineWidth(0.25);
    doc.line(X(12), Y(4.5), X(19.5), Y(12));
    doc.line(X(19.5), Y(12), X(12), Y(19.5));
    doc.line(X(12), Y(19.5), X(4.5), Y(12));
    doc.line(X(4.5), Y(12), X(12), Y(4.5));
    dot(12, 4.5, 1.8); dot(4.5, 12, 1.8); dot(12, 12, 2.0); dot(19.5, 12, 1.8); dot(12, 19.5, 1.8);
  } else if (variant === 'horizontalRows') {
    dot(6.5, 6.8, 1.5); dot(10.2, 6.8, 1.5); dot(13.8, 6.8, 1.5); dot(17.5, 6.8, 1.5);
    dot(4.5, 12, 1.5); dot(8.2, 12, 1.5); dot(12, 12, 1.5); dot(15.8, 12, 1.5); dot(19.5, 12, 1.5);
    dot(6.5, 17.2, 1.5); dot(10.2, 17.2, 1.5); dot(13.8, 17.2, 1.5); dot(17.5, 17.2, 1.5);
  } else if (variant === 'diamondGridBorder') {
    dot(8, 5.5, 1.8); dot(12, 4, 2.0); dot(16, 5.5, 1.8);
    dot(8, 18.5, 1.8); dot(12, 20, 2.0); dot(16, 18.5, 1.8);
  } else if (variant === 'bigPearlsScatter') {
    dot(7.8, 8, 2.6); dot(16.5, 7.5, 2.6); dot(11.5, 13.5, 2.6); dot(17, 16.5, 2.3); dot(6.2, 16, 2.2);
  } else if (variant === 'smallPearlsScatter') {
    dot(6.5, 7.5, 1.1); dot(11, 6, 1.1); dot(15.5, 6, 1.1); dot(18, 9.5, 1.1);
    dot(6.5, 12, 1.1); dot(11.5, 10.5, 1.1); dot(16.5, 12, 1.1);
    dot(5, 15.5, 1.1); dot(9.5, 15, 1.1); dot(14, 15.5, 1.1); dot(18, 15, 1.1); dot(12, 18.5, 1.1);
  } else {
    // Random Scatter
    dot(6.5, 8.5, 1.7); dot(16.5, 6.5, 2.0); dot(11.5, 11.5, 1.6); dot(6.8, 16, 1.8); dot(17.2, 15, 1.6); dot(12.8, 18, 1.5);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Piping Scrolls Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawPipingScrollsIcon(doc, X, Y, S, variant) {
  if (variant === 'pairedScrolls') {
    doc.line(X(5), Y(18), X(8), Y(9));
    doc.line(X(19), Y(18), X(16), Y(9));
    doc.circle(X(12), Y(17), S(1.6), 'F');
  } else if (variant === 'fleurDeLisRow') {
    doc.setLineWidth(0.6);
    doc.line(X(7), Y(12.5), X(17), Y(12.5));
    doc.triangle(X(12), Y(3.5), X(10.5), Y(12.5), X(13.5), Y(12.5), 'S');
    doc.line(X(10.5), Y(12.5), X(12), Y(19.5));
    doc.line(X(13.5), Y(12.5), X(12), Y(19.5));
  } else if (variant === 'shellBorderRow') {
    doc.setLineWidth(0.5);
    doc.line(X(3), Y(14), X(7.5), Y(14));
    doc.line(X(7.5), Y(14), X(12), Y(14));
    doc.line(X(12), Y(14), X(16.5), Y(14));
    doc.line(X(16.5), Y(14), X(21), Y(14));
    doc.line(X(5.25), Y(10.5), X(5.25), Y(14));
    doc.line(X(9.75), Y(10.5), X(9.75), Y(14));
    doc.line(X(14.25), Y(10.5), X(14.25), Y(14));
    doc.line(X(18.75), Y(10.5), X(18.75), Y(14));
  } else if (variant === 'loopChain') {
    doc.circle(X(8), Y(12), S(3.5), 'S');
    doc.circle(X(16), Y(12), S(3.5), 'S');
    doc.circle(X(12), Y(12), S(1.6), 'S');
  } else {
    // Wave Rope & Vine
    doc.setLineWidth(0.6);
    doc.line(X(2), Y(12), X(7), Y(7));
    doc.line(X(7), Y(7), X(12), Y(12));
    doc.line(X(12), Y(12), X(17), Y(17));
    doc.line(X(17), Y(17), X(22), Y(12));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sunshine Play Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawSunshinePlayIcon(doc, X, Y, S, variant) {
  if (variant === 'starBurst') {
    doc.triangle(X(12), Y(3.5), X(15.8), Y(13), X(8.2), Y(13), 'F');
    doc.triangle(X(12), Y(17.5), X(15.8), Y(8), X(8.2), Y(8), 'F');
  } else if (variant === 'cloudyChump') {
    doc.circle(X(8), Y(12), S(3.2), 'S');
    doc.circle(X(13), Y(10), S(3.8), 'S');
    doc.circle(X(17), Y(13), S(3.0), 'S');
  } else if (variant === 'skyChumps') {
    doc.circle(X(8), Y(13), S(3.2), 'S');
    doc.circle(X(12), Y(12), S(3.4), 'S');
    doc.circle(X(17), Y(7), S(2.0), 'F');
  } else {
    // Rainbow Arc & Sunshine Stars
    doc.setLineWidth(0.6);
    doc.circle(X(12), Y(16), S(7.5), 'S');
    doc.circle(X(12), Y(16), S(5.5), 'S');
    doc.circle(X(12), Y(16), S(3.5), 'S');
    doc.circle(X(4), Y(16), S(1.8), 'F');
    doc.circle(X(20), Y(16), S(1.8), 'F');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Victorian Lambeth Icons
// ─────────────────────────────────────────────────────────────────────────────
function drawVictorianLambethIcon(doc, X, Y, S, variant) {
  if (variant === 'ropesOnly') {
    doc.setLineWidth(0.6);
    doc.line(X(3.5), Y(8), X(12), Y(14.5));
    doc.line(X(12), Y(14.5), X(20.5), Y(8));
    doc.line(X(4), Y(11.5), X(12), Y(18.5));
    doc.line(X(12), Y(18.5), X(20), Y(11.5));
    doc.circle(X(3.8), Y(8), S(1.3), 'F');
    doc.circle(X(20.2), Y(8), S(1.3), 'F');
    doc.circle(X(12), Y(18.8), S(1.2), 'F');
  } else if (variant === 'doubleBand') {
    doc.setLineWidth(0.5);
    doc.line(X(3.5), Y(7), X(12), Y(11.5));
    doc.line(X(12), Y(11.5), X(20.5), Y(7));
    doc.circle(X(12), Y(12), S(1.2), 'F');
    doc.line(X(3.5), Y(14.5), X(12), Y(19));
    doc.line(X(12), Y(19), X(20.5), Y(14.5));
    doc.circle(X(12), Y(19.5), S(1.2), 'F');
  } else if (variant === 'tripleBand') {
    doc.setLineWidth(0.45);
    doc.line(X(3.5), Y(6), X(12), Y(9.5)); doc.line(X(12), Y(9.5), X(20.5), Y(6));
    doc.line(X(3.5), Y(11.5), X(12), Y(15)); doc.line(X(12), Y(15), X(20.5), Y(11.5));
    doc.line(X(3.5), Y(17), X(12), Y(20.5)); doc.line(X(12), Y(20.5), X(20.5), Y(17));
  } else if (variant === 'noRosette') {
    doc.setLineWidth(0.5);
    doc.line(X(3.5), Y(6.5), X(12), Y(12)); doc.line(X(12), Y(12), X(20.5), Y(6.5));
    doc.line(X(4), Y(10.5), X(12), Y(16.5)); doc.line(X(12), Y(16.5), X(20), Y(10.5));
    doc.line(X(4.5), Y(14), X(12), Y(20.5)); doc.line(X(12), Y(20.5), X(19.5), Y(14));
    doc.circle(X(12), Y(21.2), S(1.2), 'F');
  } else {
    // Classic & No Ropes
    doc.circle(X(12), Y(6), S(2.2), 'S');
    doc.circle(X(12), Y(6), S(1.0), 'F');
    doc.setLineWidth(0.5);
    doc.line(X(3.5), Y(8.5), X(12), Y(14));
    doc.line(X(12), Y(14), X(20.5), Y(8.5));
    doc.line(X(4), Y(11), X(12), Y(19));
    doc.line(X(12), Y(19), X(20), Y(11));
    doc.circle(X(12), Y(20.5), S(1.3), 'F');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge Design Icons
// ─────────────────────────────────────────────────────────────────────────────

export function isEdgeTreatment(treatmentId) {
  if (!treatmentId) return false;
  const str = String(treatmentId).toLowerCase();
  return (
    str.includes('border') ||
    str.includes('bead') ||
    str.includes('dollop') ||
    str.includes('rosette') ||
    str.includes('delicate') ||
    str === 'edge'
  );
}

export function drawEdgePatternIcon(doc, cx, cy, iconR, treatmentId, variantId) {
  const scale = iconR / 10.6;
  const X = (vx) => cx + (vx - 12) * scale;
  const Y = (vy) => cy + (vy - 12) * scale;
  const S = (val) => val * scale;

  doc.saveGraphicsState?.();
  doc.setDrawColor(45, 38, 38);
  doc.setFillColor(45, 38, 38);
  doc.setLineWidth(0.42);

  // Outer icon boundary circle
  doc.circle(cx, cy, S(10.6), 'S');

  const str = String(variantId || treatmentId || '').toLowerCase();

  if (str.includes('shell') || str.includes('piping') || str.includes('border')) {
    drawEdgeShellIcon(doc, X, Y, S, str);
  } else if (str.includes('bead') || str.includes('pearl') || str.includes('dot')) {
    drawEdgeBeadIcon(doc, X, Y, S, str);
  } else if (str.includes('dollop')) {
    drawEdgeDollopIcon(doc, X, Y, S, str);
  } else if (str.includes('rosette')) {
    drawEdgeRosetteIcon(doc, X, Y, S, str);
  } else if (str.includes('delicate') || str.includes('flower') || str.includes('petal') || str.includes('leaf') || str.includes('sprinkle')) {
    drawEdgeDelicatesIcon(doc, X, Y, S, str);
  } else {
    drawEdgeShellIcon(doc, X, Y, S, str);
  }

  doc.restoreGraphicsState?.();
}

function drawEdgeShellIcon(doc, X, Y, S, variantStr) {
  doc.setLineWidth(0.5);
  // Three shell scallop curves
  doc.line(X(3.5), Y(13.5), X(6.5), Y(9));
  doc.line(X(6.5), Y(9), X(9.5), Y(13.5));
  doc.line(X(9.5), Y(13.5), X(12.5), Y(9));
  doc.line(X(12.5), Y(9), X(15.5), Y(13.5));
  doc.line(X(15.5), Y(13.5), X(18.5), Y(9));
  doc.line(X(18.5), Y(9), X(20.5), Y(13.5));
  // Central shell ribs
  doc.line(X(6.5), Y(10), X(6.5), Y(13.5));
  doc.line(X(12.5), Y(10), X(12.5), Y(13.5));
  doc.line(X(18.5), Y(10), X(18.5), Y(13.5));
  if (variantStr.includes('alt')) {
    doc.circle(X(12.5), Y(7), S(1.2), 'F');
  }
}

function drawEdgeBeadIcon(doc, X, Y, S, variantStr) {
  const isAlt = variantStr.includes('alt') || variantStr.includes('two');
  doc.circle(X(5), Y(12), S(2.1), isAlt ? 'F' : 'S');
  doc.circle(X(9.7), Y(12), S(2.1), 'S');
  doc.circle(X(14.3), Y(12), S(2.1), isAlt ? 'F' : 'S');
  doc.circle(X(19), Y(12), S(2.1), 'S');
}

function drawEdgeDollopIcon(doc, X, Y, S, variantStr) {
  doc.setLineWidth(0.5);
  doc.circle(X(12), Y(12), S(5.2), 'S');
  doc.circle(X(12), Y(12), S(2.6), 'S');
  doc.circle(X(12), Y(12), S(1.0), 'F');
}

function drawEdgeRosetteIcon(doc, X, Y, S, variantStr) {
  doc.setLineWidth(0.5);
  doc.circle(X(12), Y(12), S(6.2), 'S');
  doc.circle(X(12), Y(12), S(3.8), 'S');
  doc.circle(X(12), Y(12), S(1.6), 'F');
}

function drawEdgeDelicatesIcon(doc, X, Y, S, variantStr) {
  if (variantStr.includes('flower') || variantStr.includes('petal')) {
    doc.circle(X(12), Y(12), S(1.8), 'F');
    doc.circle(X(12), Y(7), S(2.0), 'S');
    doc.circle(X(17), Y(12), S(2.0), 'S');
    doc.circle(X(12), Y(17), S(2.0), 'S');
    doc.circle(X(7), Y(12), S(2.0), 'S');
  } else {
    // Leaf / Flakes / Sprinkles
    doc.triangle(X(6), Y(16), X(11), Y(8), X(8), Y(7), 'F');
    doc.triangle(X(18), Y(8), X(13), Y(16), X(16), Y(17), 'F');
    doc.circle(X(12), Y(12), S(1.2), 'F');
  }
}
