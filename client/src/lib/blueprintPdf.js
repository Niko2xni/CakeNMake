import { jsPDF } from 'jspdf';
import { INK, ACCENT, BODY, arrow, drawFlavorBubble, drawCropBubble, drawBubbleLabel, describeColor } from './blueprintBubbles';
import { name } from './blueprintDetails';

// Cake Blueprint — draft. Page order (each name is what we call the page):
//
//   1. Start Page   one big three-quarter hero shot (top + front + side),
//                   full A4 page, like a presentation image of the design.
//   2. Angle Page   the four automatic captures in a 2x2 grid (Front |
//                   Back over Top | Side), edge to edge on one A4 page.
//   3. Details Page  every selected item from Fundamentals, Side, Center and
//                   Edge, each with its price beside it, then the total. Runs
//                   onto extra pages if the list is long. A section with
//                   nothing selected is left out.
//   4. Tier 1 Page(s)   Naked Finish first (always, even for a fully frosted
//                   cake), then Fundamentals, Side, Edge, Center — a tab with
//                   nothing selected is skipped. May run several pages.
//   N. Tier 2 Page(s)   the same sequence for the second tier.
//
// Tier pages are planned by blueprintStages.js and photographed by
// CakeScene.captureBlueprintStages().
//
// Captures come from CakeScene.captureBlueprintViews(): hero is A4 portrait
// (1240x1754); front/back/top/side are portrait 930x1315 — exactly one grid
// cell's shape (half the page wide, half tall) — so nothing is cropped or
// stretched.

const PAGE_W = 210; // mm, A4 portrait
const PAGE_H = 297;
const CELL_W = PAGE_W / 2;
const CELL_H = PAGE_H / 2;
const GUTTER = 0.4; // hairline separator between cells

// Reading order: top row Front | Back, bottom row Top | Side.
const GRID = [
  { key: 'front', label: 'FRONT', col: 0, row: 0 },
  { key: 'back', label: 'BACK', col: 1, row: 0 },
  { key: 'top', label: 'TOP', col: 0, row: 1 },
  { key: 'side', label: 'SIDE', col: 1, row: 1 },
];

function imageFormat(dataUrl) {
  return /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG';
}

export function addStartPage(doc, hero) {
  if (hero) {
    doc.addImage(hero, imageFormat(hero), 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');
  } else {
    doc.setFillColor(245, 240, 236);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }
}

export function addAnglePage(doc, views) {
  for (const { key, label, col, row } of GRID) {
    const x = col * CELL_W;
    const y = row * CELL_H;
    const src = views?.[key];
    if (src) {
      doc.addImage(src, imageFormat(src), x, y, CELL_W, CELL_H, undefined, 'FAST');
    } else {
      doc.setFillColor(245, 240, 236);
      doc.rect(x, y, CELL_W, CELL_H, 'F');
    }

    // Small label chip, bottom-left of each cell.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const textW = doc.getTextWidth(label);
    const chipW = textW + 6;
    const chipH = 6;
    const chipX = x + 5;
    const chipY = y + CELL_H - chipH - 5;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chipX, chipY, chipW, chipH, 3, 3, 'F');
    doc.setTextColor(90, 60, 60);
    doc.text(label, chipX + 3, chipY + 4.1);
  }

  // Hairline cross so the four cells read as a grid even though the
  // captures share one background color.
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(GUTTER);
  doc.line(CELL_W, 0, CELL_W, PAGE_H);
  doc.line(0, CELL_H, PAGE_W, CELL_H);
}


// ─── Details Page ──────────────────────────────────────────────────────────
// `sections`: [{ title: 'Fundamentals', items: [{ label, detail?, priceMinor? }] }]
// priceMinor is in minor units (centavos). null/undefined prints "Included".
// jsPDF's built-in Helvetica has no peso sign glyph, so amounts print as
// "PHP 1,234.00" (embed a font later if the ₱ symbol is wanted).

const MARGIN = 18;
const ROW_H = 7.5;
const BOTTOM = PAGE_H - 22;

function money(minor, currency = 'PHP') {
  return `${currency} ${(Number(minor || 0) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pageHeader(doc, designName, continued) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(90, 60, 60);
  doc.text(continued ? 'Details & Prices (cont.)' : 'Details & Prices', MARGIN, 26);
  if (designName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 120, 120);
    doc.text(designName, PAGE_W - MARGIN, 26, { align: 'right' });
  }
  doc.setDrawColor(230, 215, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 30, PAGE_W - MARGIN, 30);
  return 40;
}

export function addDetailsPages(doc, { sections = [], totalMinor = null, currency = 'PHP', designName = '' } = {}) {
  doc.addPage();
  let y = pageHeader(doc, designName, false);

  const ensureRoom = (needed) => {
    if (y + needed <= BOTTOM) return;
    doc.addPage();
    y = pageHeader(doc, designName, true);
  };

  for (const section of sections) {
    const items = (section.items || []).filter(Boolean);
    if (items.length === 0) continue; // nothing selected -> section skipped

    ensureRoom(ROW_H * 2 + 4); // never strand a heading at the page bottom
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(200, 110, 130);
    doc.text(section.title.toUpperCase(), MARGIN, y);
    y += 5;

    for (const item of items) {
      const price = item.priceText || (item.priceMinor == null ? 'Included' : money(item.priceMinor, currency));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 45, 45);
      const priceW = doc.getTextWidth(price);
      const textLines = doc.splitTextToSize([item.label, item.detail].filter(Boolean).join('  '), PAGE_W - 2 * MARGIN - priceW - 8);
      for (let line = 0; line < textLines.length; line++) {
        ensureRoom(ROW_H);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 45, 45);
        doc.text(textLines[line], MARGIN, y);
        if (line < textLines.length - 1) y += ROW_H;
      }
      const detailEnd = MARGIN + doc.getTextWidth(textLines[textLines.length - 1]);
      doc.setTextColor(item.priceMinor == null ? 150 : 60, item.priceMinor == null ? 135 : 45, item.priceMinor == null ? 135 : 45);
      doc.text(price, PAGE_W - MARGIN, y, { align: 'right' });

      // Dotted leader between the item and its price.
      doc.setDrawColor(215, 200, 195);
      doc.setLineDashPattern([0.4, 1.2], 0);
      doc.setLineWidth(0.25);
      doc.line(detailEnd + 3, y - 0.8, PAGE_W - MARGIN - priceW - 3, y - 0.8);
      doc.setLineDashPattern([], 0);
      y += ROW_H;
    }
    y += 5;
  }

  if (totalMinor != null) {
    ensureRoom(16);
    doc.setDrawColor(90, 60, 60);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(90, 60, 60);
    doc.text('TOTAL', MARGIN, y);
    doc.text(money(totalMinor, currency), PAGE_W - MARGIN, y, { align: 'right' });
  }
}

// ─── Tier "DETAILS:" pages ─────────────────────────────────────────────────
// One page per stage of how the cake is made. Layout: picture of our cake on
// the right, labelled pills on the left with arrows into the picture, then
// the details and highlight points, and the flavor (when there is one) in a
// pill underneath with an arrow pointing up at what it flavors.
// Filling is a stack of slices with arrows pointing down.


function pill(doc, text, x, y, { w, fontSize = 8 } = {}) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  const width = w || doc.getTextWidth(text) + 7;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y - 4, width, 8, 4, 4, 'FD');
  doc.setTextColor(...INK);
  doc.text(text, x + width / 2, y + 1.1, { align: 'center' });
  return width;
}

function tierHeader(doc, designName, tierLabel, section) {
  doc.addPage();
  // The page's own name is the title (FILLING, SIDE, EDGE...); only the
  // design's name sits at the right, plus the tier when there are several.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(String(section || 'DETAILS').toUpperCase(), MARGIN, 26);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 120, 120);
  if (designName) doc.text(designName, PAGE_W - MARGIN, 24, { align: 'right' });
  if (tierLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text(String(tierLabel).toUpperCase(), PAGE_W - MARGIN, 30, { align: 'right' });
  }
  doc.setDrawColor(230, 215, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 33, PAGE_W - MARGIN, 33);
  return 40;
}

function placeImage(doc, src, x, y, w, h) {
  doc.setFillColor(248, 244, 241);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  if (src) doc.addImage(src, imageFormat(src), x, y, w, h, undefined, 'FAST');
}

function detailBlock(doc, x, y, width, { details = [], highlights = [], flavor = null }) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text('DETAILS', x, y);
  y += 6;
  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
    doc.text(`${label}${value ? ':' : ''}`, x, y);
    if (value) {
      const labelW = doc.getTextWidth(`${label}: `) + 1; // measured in bold, as drawn
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value), Math.max(20, width - labelW));
      doc.text(lines, x + labelW, y);
      y += 6 * lines.length;
    } else {
      y += 6;
    }
  }
  if (highlights.length) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text('HIGHLIGHTS', x, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
    for (const point of highlights) {
      const lines = doc.splitTextToSize(point, width - 6);
      doc.setFillColor(...ACCENT);
      doc.circle(x + 1.2, y - 1.2, 0.8, 'F');
      doc.text(lines, x + 5, y);
      y += 5.5 * lines.length;
    }
  }
  if (flavor) {
    y += 6;
    // Pill under the details, arrow pointing back up at them.
    arrow(doc, x + 14, y - 1, x + 14, y - 6);
    pill(doc, `FLAVOR: ${String(flavor).toUpperCase()}`, x, y + 5, { fontSize: 8.5 });
    y += 10;
  }
  return y;
}

// Pills stacked down the left column; each arrow ends on the spot the
// capture measured (or the plan's fallback guess when it could not).
function drawCallouts(doc, callouts, anchors, imgX, imgY, imgW, imgH) {
  const placed = [];
  (callouts || []).forEach((c) => {
    const hit = anchors?.[c.anchorId];
    const tx = imgX + (hit ? hit.x : c.ax) * imgW;
    const ty = imgY + (hit ? hit.y : c.ay) * imgH;
    let py = Math.min(imgY + imgH - 6, Math.max(imgY + 6, ty));
    for (const prev of placed) if (Math.abs(py - prev) < 11) py = prev + 11; // keep pills apart
    placed.push(py);
    const w = pill(doc, c.label, MARGIN, py, { w: 38, fontSize: c.label.length > 12 ? 6.5 : 8 });
    arrow(doc, MARGIN + w, py, tx, ty);
  });
}

function addStagePage(doc, page, images, anchors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, page.section);
  const imgX = 60;
  const imgW = PAGE_W - MARGIN - imgX;
  const imgH = (imgW * 3) / 4;
  placeImage(doc, images?.[page.image], imgX, top, imgW, imgH);
  drawCallouts(doc, page.callouts, anchors?.[page.image], imgX, top, imgW, imgH);
  detailBlock(doc, MARGIN, top + imgH + 12, PAGE_W - 2 * MARGIN, page);
}

// Filling, as sketched: the cake layer with its filling on top in a framed
// picture, a round close-up on each side with arrows into the exact spot
// (FILLING = the flavor's own color), then an arrow down to a closer view
// with a PATTERN bubble: a magnified look at the piping design.
function addFillingPages(doc, page, images, anchors, swatches, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'FILLING');

  // Both pictures share one size and one column so they line up, and both get
  // the same border.
  const boxW = 96;
  const boxH = 72;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = top + 2;
  placeImage(doc, images?.[page.image], boxX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');

  const r = 16;
  const midY = boxY + boxH / 2 - 4;
  const topAnchors = anchors?.[page.image] || {};
  const zoomAnchors = anchors?.[page.zoomImage] || {};
  for (const crop of page.crops || []) {
    const left = crop.side !== 'right';
    const cx = left ? MARGIN + r : PAGE_W - MARGIN - r;
    let sub = crop.sub;
    if (crop.kind === 'color') {
      // The colour the filling really is, named in plain words.
      const actual = fillColors?.[crop.colorKey];
      const bubbleColor = crop.chipColor || actual || swatches?.[crop.colorKey];
      drawFlavorBubble(doc, { cx, cy: midY, r, color: bubbleColor });
      sub = crop.sub || (actual ? describeColor(actual) : crop.fallbackName || '');
    } else {
      drawFlavorBubble(doc, { cx, cy: midY, r, color: crop.chipColor || swatches?.[crop.swatchKey] });
    }
    // Arrow from the bubble's edge to the filling it describes.
    const hit = topAnchors[crop.anchorId] || { x: 0.35, y: 0.3 };
    const tx = boxX + hit.x * boxW;
    const ty = boxY + hit.y * boxH;
    const ang = Math.atan2(ty - midY, tx - cx);
    arrow(doc, cx + Math.cos(ang) * (r + 0.5), midY + Math.sin(ang) * (r + 0.5), tx, ty);
    drawBubbleLabel(doc, { cx, y: midY + r + 7, title: crop.label, sub });
  }

  // Down to the closer view, with a magnified bubble of its piping design.
  const slabW = boxW;
  const slabH = boxH;
  const slabX = boxX;
  const slabY = boxY + boxH + 16;
  arrow(doc, boxX + boxW / 2, boxY + boxH + 2, boxX + boxW / 2, slabY - 1);
  placeImage(doc, images?.[page.zoomImage], slabX, slabY, slabW, slabH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(slabX, slabY, slabW, slabH, 2, 2, 'S');
  if (page.pattern) {
    const spot = zoomAnchors[page.pattern.anchorId] || { x: 0.4, y: 0.3 };
    const cx = MARGIN + r;
    const cy = slabY + slabH / 2 - 4;
    drawCropBubble(doc, { src: images?.[page.zoomImage], ax: spot.x, ay: spot.y, imgW: slabW, imgH: slabH, cx, cy, r, zoom: 3 });
    const tx = slabX + spot.x * slabW;
    const ty = slabY + spot.y * slabH;
    const ang = Math.atan2(ty - cy, tx - cx);
    arrow(doc, cx + Math.cos(ang) * (r + 0.5), cy + Math.sin(ang) * (r + 0.5), tx, ty);
    drawBubbleLabel(doc, { cx, y: cy + r + 7, title: page.pattern.label, sub: page.pattern.sub });
  }

  const rows = [['Filling Layers', String(page.layers)], ['Pattern', page.piping || 'Plain edge (no piping)']];
  detailBlock(doc, MARGIN, slabY + slabH + 10, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: ['Filling spread on top of the cake layer'],
  });
}

// Fundamentals, in the Filling page's style: one picture of the cake in the
// shared box, a FLAVOR bubble (the sponge flavor's colour icon) and a NAKED
// FINISH bubble (a magnified look at the bare sponge), arrows to the sponge.
function addFundamentalsPage(doc, page, images, anchors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'FUNDAMENTALS');
  const boxW = 96;
  const boxH = 72;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = top + 2;
  placeImage(doc, images?.[page.image], boxX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');

  // Both bubbles describe the same spot, so they join into ONE arrow: a short
  // line from each bubble to a shared bar, then a single arrow to the cake.
  const r = 14;
  const cx = MARGIN + r + 2;
  const hits = anchors?.[page.image] || {};
  const flavor = (page.crops || [])[0];
  const target = hits[flavor?.anchorId] || { x: 0.5, y: 0.5 };
  const cy1 = boxY + 16;
  const cy2 = cy1 + 50;
  drawFlavorBubble(doc, { cx, cy: cy1, r, color: flavor?.chipColor || target.color });
  drawBubbleLabel(doc, { cx, y: cy1 + r + 7, title: flavor?.label || 'FLAVOR', sub: flavor?.sub });
  drawCropBubble(doc, { src: images?.[page.image], ax: target.x, ay: target.y, imgW: boxW, imgH: boxH, cx, cy: cy2, r, zoom: 3 });
  drawBubbleLabel(doc, { cx, y: cy2 + r + 7, title: page.naked?.label || 'NAKED FINISH', sub: page.naked?.sub });

  const joinX = cx + r + 9;
  const midY = (cy1 + cy2) / 2;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(cx + r + 0.5, cy1, joinX, cy1);
  doc.line(cx + r + 0.5, cy2, joinX, cy2);
  doc.line(joinX, cy1, joinX, cy2);
  arrow(doc, joinX, midY, boxX + target.x * boxW, boxY + target.y * boxH);

  detailBlock(doc, MARGIN, boxY + boxH + 36, PAGE_W - 2 * MARGIN, page);
}

function drawViewBadge(doc, label, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const text = String(label).toUpperCase();
  const tw = doc.getTextWidth(text);
  const bw = tw + 7;
  const bh = 5;
  doc.setFillColor(35, 30, 30);
  doc.roundedRect(x, y, bw, bh, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(text, x + bw / 2, y + bh - 1.4, { align: 'center' });
}

// Surface Treatment, in the Filling page's style:
// Top framed box with FRONT close-up screenshot and arrow pointing from FLAVOR bubble to the surface coat,
// connecting arrow down to a bottom framed box with BACK close-up screenshot and arrow pointing from PATTERN bubble to the drips.
function addSurfaceTreatmentPages(doc, page, images, anchors, swatches, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'SURFACE TREATMENT');

  const boxW = 96;
  const boxH = 72;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = top + 2;
  const frontImage = images?.[page.frontImage] || images?.[page.image] || images?.['surface-front'] || images?.surface;
  placeImage(doc, frontImage, boxX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');
  drawViewBadge(doc, 'FRONT', boxX + 3, boxY + 3);

  const r = 16;
  const midY = boxY + boxH / 2 - 4;
  const frontKey = page.frontImage || page.image || 'surface-front';
  const backKey = page.backImage || page.zoomImage || 'surface-back';
  const topAnchors = anchors?.[frontKey] || anchors?.surface || {};
  const backAnchors = anchors?.[backKey] || anchors?.['surface-zoom'] || topAnchors;

  // Arrow 1: FLAVOR bubble with ToolPanel chip pointing to the front surface
  const cx = MARGIN + r;
  const flavor = (page.crops || [])[0] || {};
  const flavorColor = page.flavorChipColor || flavor.chipColor || '#F6DEAB';
  const flavorName = page.flavorName || flavor.sub || '';
  drawFlavorBubble(doc, { cx, cy: midY, r, color: flavorColor });
  drawBubbleLabel(doc, { cx, y: midY + r + 7, title: flavor.label || 'FLAVOR', sub: flavorName });

  const hit1 = topAnchors[flavor.anchorId] || { x: 0.45, y: 0.28 };
  const tx1 = boxX + hit1.x * boxW;
  const ty1 = boxY + hit1.y * boxH;
  const ang1 = Math.atan2(ty1 - midY, tx1 - cx);
  arrow(doc, cx + Math.cos(ang1) * (r + 0.5), midY + Math.sin(ang1) * (r + 0.5), tx1, ty1);

  // Down arrow to the back view of the pattern
  const slabW = boxW;
  const slabH = boxH;
  const slabX = boxX;
  const slabY = boxY + boxH + 16;
  arrow(doc, boxX + boxW / 2, boxY + boxH + 2, boxX + boxW / 2, slabY - 1);
  const backImage = images?.[page.backImage] || images?.[page.zoomImage] || images?.['surface-back'] || images?.['surface-zoom'] || frontImage;
  placeImage(doc, backImage, slabX, slabY, slabW, slabH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(slabX, slabY, slabW, slabH, 2, 2, 'S');
  drawViewBadge(doc, 'BACK', slabX + 3, slabY + 3);

  // Arrow 2: PATTERN bubble pointing to the pattern drips
  if (page.pattern) {
    const spot = backAnchors[page.pattern.anchorId] || { x: 0.45, y: 0.42 };
    const cy2 = slabY + slabH / 2 - 4;
    drawCropBubble(doc, { src: backImage, ax: spot.x, ay: spot.y, imgW: slabW, imgH: slabH, cx, cy: cy2, r, zoom: 3 });
    const tx2 = slabX + spot.x * slabW;
    const ty2 = slabY + spot.y * slabH;
    const ang2 = Math.atan2(ty2 - cy2, tx2 - cx);
    arrow(doc, cx + Math.cos(ang2) * (r + 0.5), cy2 + Math.sin(ang2) * (r + 0.5), tx2, ty2);
    drawBubbleLabel(doc, { cx, y: cy2 + r + 7, title: page.pattern.label || 'PATTERN', sub: page.pattern.sub });
  }

  const rows = [
    ['Treatment', name(page.mode || 'glaze')],
    ['Pattern', page.patternName || name(page.pattern?.sub || '')],
  ];
  if (flavorName) rows.push(['Flavor', flavorName]);

  detailBlock(doc, MARGIN, slabY + slabH + 10, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: [`${name(page.mode || 'glaze')} finish applied to the surface (Front and Back close-up views)`],
  });
}

// Side Design, in the Filling page's style:
// Top framed box with FRONT close-up screenshot and arrow pointing from FLAVOR/COLOR bubble to the side design,
// connecting arrow down to a bottom framed box with BACK close-up screenshot and arrow pointing from PATTERN bubble to the pattern.
function addSidePages(doc, page, images, anchors, swatches, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'SIDE');

  const boxW = 96;
  const boxH = 72;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = top + 2;
  const frontImage = images?.[page.frontImage] || images?.[page.image] || images?.['side-front'] || images?.side;
  placeImage(doc, frontImage, boxX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');
  drawViewBadge(doc, 'FRONT', boxX + 3, boxY + 3);

  const r = 16;
  const midY = boxY + boxH / 2 - 4;
  const frontKey = page.frontImage || page.image || 'side-front';
  const backKey = page.backImage || page.zoomImage || 'side-back';
  const topAnchors = anchors?.[frontKey] || anchors?.side || {};
  const backAnchors = anchors?.[backKey] || anchors?.['side-zoom'] || topAnchors;

  // Arrow 1: FLAVOR / COLOR bubble with ToolPanel chip pointing to the side design
  const cx = MARGIN + r;
  const flavor = (page.crops || [])[0] || {};
  const flavorColor = page.flavorChipColor || flavor.chipColor || '#F6DEAB';
  const flavorName = page.flavorName || flavor.sub || '';
  drawFlavorBubble(doc, { cx, cy: midY, r, color: flavorColor });
  drawBubbleLabel(doc, { cx, y: midY + r + 7, title: flavor.label || 'FLAVOR', sub: flavorName });

  const hit1 = topAnchors[flavor.anchorId] || { x: 0.45, y: 0.5 };
  const tx1 = boxX + hit1.x * boxW;
  const ty1 = boxY + hit1.y * boxH;
  const ang1 = Math.atan2(ty1 - midY, tx1 - cx);
  arrow(doc, cx + Math.cos(ang1) * (r + 0.5), midY + Math.sin(ang1) * (r + 0.5), tx1, ty1);

  // Down arrow to the back view of the pattern
  const slabW = boxW;
  const slabH = boxH;
  const slabX = boxX;
  const slabY = boxY + boxH + 16;
  arrow(doc, boxX + boxW / 2, boxY + boxH + 2, boxX + boxW / 2, slabY - 1);
  const backImage = images?.[page.backImage] || images?.[page.zoomImage] || images?.['side-back'] || images?.['side-zoom'] || frontImage;
  placeImage(doc, backImage, slabX, slabY, slabW, slabH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(slabX, slabY, slabW, slabH, 2, 2, 'S');
  drawViewBadge(doc, 'BACK', slabX + 3, slabY + 3);

  // Arrow 2: PATTERN bubble pointing to the side pattern
  if (page.pattern) {
    const spot = backAnchors[page.pattern.anchorId] || { x: 0.45, y: 0.5 };
    const cy2 = slabY + slabH / 2 - 4;
    drawCropBubble(doc, { src: backImage, ax: spot.x, ay: spot.y, imgW: slabW, imgH: slabH, cx, cy: cy2, r, zoom: 3 });
    const tx2 = slabX + spot.x * slabW;
    const ty2 = slabY + spot.y * slabH;
    const ang2 = Math.atan2(ty2 - cy2, tx2 - cx);
    arrow(doc, cx + Math.cos(ang2) * (r + 0.5), cy2 + Math.sin(ang2) * (r + 0.5), tx2, ty2);
    drawBubbleLabel(doc, { cx, y: cy2 + r + 7, title: page.pattern.label || 'PATTERN', sub: page.pattern.sub });
  }

  const rows = [];
  if (page.baseFinish) rows.push(['Base Finish', page.baseFinish]);
  rows.push(['Design', name(page.mode || 'Side Design')]);
  rows.push(['Set', page.patternName || name(page.pattern?.sub || '')]);
  if (flavorName) rows.push(['Color', flavorName]);

  const highlightText = page.baseTypeDisplay
    ? `${page.baseTypeDisplay}: ${name(page.mode || 'Side Design')} (Front & Back close-up views)`
    : `${name(page.mode || 'Side Design')} wrapped around the cake's side (Front & Back close-up views)`;

  detailBlock(doc, MARGIN, slabY + slabH + 10, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: [highlightText],
  });
}

// Center Decorations: Top-view diagram showing where designs are placed.
// Top view is framed and centered horizontally on the page with a "TOP VIEW" badge,
// with no pointing arrows or bubbles, and concise, detailed placement details below.
function addCenterPage(doc, page, images, anchors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'CENTER');

  // Centered framed box for the top view diagram
  const imgW = 126;
  const imgH = 94;
  const imgX = (PAGE_W - imgW) / 2;
  const imgY = top + 2;

  placeImage(doc, images?.[page.image], imgX, imgY, imgW, imgH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'S');
  drawViewBadge(doc, 'TOP VIEW', imgX + 3, imgY + 3);

  // Details and highlights below the framed top view
  detailBlock(doc, MARGIN, imgY + imgH + 12, PAGE_W - 2 * MARGIN, page);
}

export function addTierPages(doc, { groups = [], images = {}, anchors = {}, swatches = {}, fillColors = {}, designName = '' } = {}) {
  for (const group of groups) {
    for (const page of group.pages) {
      if (page.kind === 'fundamentals') addFundamentalsPage(doc, page, images, anchors, designName, group.tierLabel);
      else if (page.kind === 'filling') addFillingPages(doc, page, images, anchors, swatches, fillColors, designName, group.tierLabel);
      else if (page.kind === 'surface') addSurfaceTreatmentPages(doc, page, images, anchors, swatches, fillColors, designName, group.tierLabel);
      else if (page.kind === 'side') addSidePages(doc, page, images, anchors, swatches, fillColors, designName, group.tierLabel);
      else if (page.kind === 'center') addCenterPage(doc, page, images, anchors, designName, group.tierLabel);
      else addStagePage(doc, page, images, anchors, designName, group.tierLabel);
    }
  }
}

export function buildBlueprintPdf({ views, details, tiers }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  addStartPage(doc, views?.hero); // page 1
  doc.addPage();
  addAnglePage(doc, views); // page 2
  addDetailsPages(doc, details); // page 3 (+ overflow)
  if (tiers?.groups?.length) addTierPages(doc, { ...tiers, designName: details?.designName }); // Tier page(s)
  return doc;
}

export function buildBlueprintPdfBlob(args) {
  return buildBlueprintPdf(args).output('blob');
}