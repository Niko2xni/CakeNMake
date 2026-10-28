import { jsPDF } from 'jspdf';
import { INK, ACCENT, BODY, arrow, drawFlavorBubble, drawCropBubble, drawBubbleLabel, drawPatternInfoBlock, describeColor } from './blueprintBubbles';
import { drawPatternIconBubble } from './blueprintIcons';
import {
  drawSidePatternSchematic,
  drawSurfaceTreatmentSchematic,
  drawTexturedFinishSchematic,
  drawTexturedFinishSideSchematic,
  drawFillingPipingSchematic,
  drawEdgePatternSchematic,
  drawAssemblyExplodedSchematic,
  drawAssemblyCompleteSchematic,
  drawAssemblyCoatingSchematic,
  drawAssemblySurfaceSchematic,
  drawAssemblySideSchematic,
  hexToRgb,
} from './blueprintSchematics';
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
  const title = continued ? 'Details & Prices (cont.)' : 'Details & Prices';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(90, 60, 60);
  const titleW = doc.getTextWidth(title);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const nameW = designName ? doc.getTextWidth(designName) : 0;
  const availOnRight = PAGE_W - MARGIN - (MARGIN + titleW + 10);

  if (designName && nameW > availOnRight) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(90, 60, 60);
    doc.text(title, MARGIN, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 120, 120);
    const lines = doc.splitTextToSize(designName, PAGE_W - 2 * MARGIN);
    const textStartY = 29.5;
    doc.text(lines, MARGIN, textStartY);
    const endY = textStartY + (lines.length - 1) * 4.2;

    const lineY = Math.max(34, endY + 3.5);
    doc.setDrawColor(230, 215, 210);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
    return lineY + 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(90, 60, 60);
  doc.text(title, MARGIN, 26);
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
  const secTitle = String(section || 'DETAILS').toUpperCase();

  // Primary Section Title (Always Big, Bold H1: Font Size 20)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(secTitle, MARGIN, 24);

  // Optional Tier Label on the top right
  if (tierLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text(String(tierLabel).toUpperCase(), PAGE_W - MARGIN, 24, { align: 'right' });
  }

  // Design name subtitle underneath the section title
  let lineY = 33;
  if (designName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 120, 120);
    const lines = doc.splitTextToSize(designName, PAGE_W - 2 * MARGIN);
    const textStartY = 29.5;
    doc.text(lines, MARGIN, textStartY);
    const endY = textStartY + (lines.length - 1) * 4.2;
    lineY = Math.max(34, endY + 3.5);
  }

  doc.setDrawColor(230, 215, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);
  return lineY + 7;
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

// Filling:
// - If Piping Design is Mashed Circles or Mashed Swirls (or active piping): Side-by-side layout (2D Pattern Schematic vs. 3D Render)
// - If None / Plain: Display like Fundamentals (single 3D render with FLAVOR bubble)
function addFillingPages(doc, page, images, anchors, swatches, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'FILLING');

  const pipingTip = page.pipingTip || (page.piping && !page.piping.toLowerCase().includes('plain') && !page.piping.toLowerCase().includes('none') ? page.piping : null);

  if (pipingTip) {
    const boxW = 88;
    const boxH = 74;
    const gap = 6;
    const leftX = MARGIN;
    const rightX = MARGIN + boxW + gap;
    const boxY = top + 2;

    const crop = (page.crops || [])[0] || {};
    const fillingColor = page.flavorChipColor || crop.chipColor || '#F6E8D5';
    const fillingSub = page.flavorName || crop.sub || page.flavor || '';
    const pipingName = page.piping || name(pipingTip);

    // 1. LEFT SIDE: 2D Pattern Drawing
    drawFillingPipingSchematic(doc, {
      x: leftX,
      y: boxY,
      w: boxW,
      h: boxH,
      piping: pipingTip,
      pipingName,
      color: fillingColor,
      colorName: fillingSub,
      layers: page.layers,
    });

    // 2. RIGHT SIDE: 3D Render
    const renderImg = images?.[page.zoomImage] || images?.[page.image];
    placeImage(doc, renderImg, rightX, boxY, boxW, boxH);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'S');
    drawViewBadge(doc, '3D RENDER', rightX + 3, boxY + 3);

    // 3. Details table & Highlights below
    const rows = [
      ['Filling Layers', String(page.layers || 1)],
      ['Piping Design', pipingName],
    ];
    if (fillingSub) rows.push(['Flavor', fillingSub]);

    detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, {
      details: rows,
      highlights: [`${pipingName} piping design applied between layers (2D pattern schematic vs. 3D render)`],
    });
    return;
  }

  // Plain / None: Fundamentals style (one 3D render of the filling layer with FLAVOR bubble on the left)
  const boxW = 96;
  const boxH = 72;
  const boxX = PAGE_W - MARGIN - boxW;
  const boxY = top + 2;
  placeImage(doc, images?.[page.image], boxX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'S');

  const r = 16;
  const midY = boxY + boxH / 2;
  const topAnchors = anchors?.[page.image] || {};
  const crop = (page.crops || [])[0] || {};
  const cx = MARGIN + r + 2;
  const sub = page.flavorName || crop.sub || page.flavor || '';
  const fillingColor = page.flavorChipColor || crop.chipColor || '#F6E8D5';
  drawFlavorBubble(doc, { cx, cy: midY, r, color: fillingColor });
  drawBubbleLabel(doc, { cx, y: midY + r + 7, title: crop.label || 'FILLING', sub });

  const hit = topAnchors[crop.anchorId] || { x: 0.35, y: 0.3 };
  const tx = boxX + hit.x * boxW;
  const ty = boxY + hit.y * boxH;
  const ang = Math.atan2(ty - midY, tx - cx);
  arrow(doc, cx + Math.cos(ang) * (r + 0.5), midY + Math.sin(ang) * (r + 0.5), tx, ty);

  const rows = [['Filling Layers', String(page.layers || 1)], ['Pattern', 'Plain edge (no piping)']];
  if (sub) rows.push(['Flavor', sub]);

  detailBlock(doc, MARGIN, boxY + boxH + 20, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: ['Filling spread smoothly on top of the cake layer'],
  });
}

// Fundamentals, in the Filling page's style: one picture of the cake in the
// shared box, a FLAVOR bubble (the sponge flavor's colour icon) and a NAKED
// FINISH bubble (a magnified look at the bare sponge), arrows to the sponge.
function addFundamentalsPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
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
  const spongeColor = target.color || fillColors?.[page.image] || flavor?.chipColor || '#F6DEAB';
  drawFlavorBubble(doc, { cx, cy: cy1, r, color: spongeColor });
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

// Exterior Finish:
// - If Textured Buttercream: Side-by-side layout (2D Pattern Schematic vs. 3D Render)
// - If Naked or Fully Frosted: Display like Fundamentals (single 3D render with FLAVOR and FINISH crop bubbles)
function addExteriorFinishPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'EXTERIOR FINISH');

  const isTextured = Boolean(page.isTextured) || page.style === 'texturedButtercream' || (Boolean(page.texture) && page.style !== 'naked' && page.style !== 'fullyFrosted' && !String(page.style || '').toLowerCase().includes('frosted'));

  if (isTextured) {
    const boxY = top + 2;

    const flavor = (page.crops || [])[0] || {};
    const finishColor = page.flavorChipColor || flavor.chipColor || '#F6DEAB';
    const finishFlavorSub = page.flavorName || flavor.sub || '';
    const texture = page.texture || 'ridged';
    const textureName = page.textureName || name(texture);

    // 1. TOP: 3D Render (Prominent showcase view at the top)
    const renderW = 100;
    const renderH = 65;
    const renderX = (PAGE_W - renderW) / 2;
    placeImage(doc, images?.[page.image], renderX, boxY, renderW, renderH);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.roundedRect(renderX, boxY, renderW, renderH, 2, 2, 'S');
    drawViewBadge(doc, '3D RENDER', renderX + 3, boxY + 3);

    // 2. BELOW: 2D Schematics (Front View on the left, Side View on the right)
    const schemY = boxY + renderH + 6;
    const schemW = 84;
    const schemH = 58;
    const gap = 6;
    const card1X = MARGIN;
    const card2X = MARGIN + schemW + gap;

    // 2A. LEFT: 2D Front View Schematic
    drawTexturedFinishSchematic(doc, {
      x: card1X,
      y: schemY,
      w: schemW,
      h: schemH,
      texture,
      textureName,
      color: finishColor,
      colorName: finishFlavorSub,
      badge: '2D FRONT VIEW',
    });

    // 2B. RIGHT: 2D Side View Schematic (Showing bump profiles: Ridge Comb wide short hills vs Ribbon Wrap striking hills)
    drawTexturedFinishSideSchematic(doc, {
      x: card2X,
      y: schemY,
      w: schemW,
      h: schemH,
      texture,
      textureName,
      color: finishColor,
      colorName: finishFlavorSub,
    });

    // 3. BELOW: Details table & Highlights below the schematics
    const rows = [
      ['Finish', name(page.style || 'texturedButtercream')],
      ['Texture', textureName],
    ];
    if (finishFlavorSub) rows.push(['Flavor', finishFlavorSub]);

    detailBlock(doc, MARGIN, schemY + schemH + 8, PAGE_W - 2 * MARGIN, {
      details: rows,
      highlights: [`Textured finish (${textureName}) applied across the cake (3D render top, 2D front pattern & side bump profile below)`],
    });
    return;
  }

  // Non-textured (Naked or Fully Frosted): Fundamentals style
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
  const target = hits[flavor?.anchorId] || hits[page.finish?.anchorId] || { x: 0.5, y: 0.5 };
  const cy1 = boxY + 16;
  const cy2 = cy1 + 50;

  const flavorColor = target.color || fillColors?.[page.image] || page.flavorChipColor || flavor?.chipColor || '#F6DEAB';
  const flavorTitle = flavor?.label || 'FLAVOR';
  const flavorSub = page.flavorName || flavor?.sub || '';
  drawFlavorBubble(doc, { cx, cy: cy1, r, color: flavorColor });
  drawBubbleLabel(doc, { cx, y: cy1 + r + 7, title: flavorTitle, sub: flavorSub });

  const finishItem = page.finish || (page.crops || [])[1] || {};
  const finishTitle = finishItem.label || 'EXTERIOR FINISH';
  const finishSub = finishItem.sub || page.details?.find(([k]) => k === 'Finish')?.[1] || '';
  drawCropBubble(doc, { src: images?.[page.image], ax: target.x, ay: target.y, imgW: boxW, imgH: boxH, cx, cy: cy2, r, zoom: 3 });
  drawBubbleLabel(doc, { cx, y: cy2 + r + 7, title: finishTitle, sub: finishSub });

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

// Surface Treatment: Side-by-side layout!
// Left-side: 2D Drip Schematic (dumbed down mock copy of the drip contour in chosen flavor color)
// Right-side: 3D Render Screenshot (actual 3D cake render)
function addSurfaceTreatmentPages(doc, page, images, anchors, swatches, fillColors, contours, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'SURFACE TREATMENT');

  const boxW = 88;
  const boxH = 74;
  const gap = 6;
  const leftX = MARGIN;
  const rightX = MARGIN + boxW + gap;
  const boxY = top + 2;

  const frontKey = page.frontImage || page.image || 'surface-front';
  const topAnchors = anchors?.[frontKey] || anchors?.surface || {};
  const flavor = (page.crops || [])[0] || {};
  const hit1 = topAnchors[flavor.anchorId] || { x: 0.45, y: 0.28 };
  const isChoc = String(page.flavorName || flavor.sub || '').toLowerCase().includes('choc');
  let flavorColor = isChoc
    ? '#301009'
    : (page.flavorChipColor || flavor.chipColor || fillColors?.[frontKey] || hit1.color || '#F6DEAB');
  const flavorName = page.flavorName || flavor.sub || '';
  const patternId = page.patternId || page.pattern?.sub || page.patternName || 'longGaps';
  const patternName = page.patternName || name(page.pattern?.sub || '');
  const contour = contours?.[frontKey] || contours?.[page.image];

  // 1. LEFT SIDE: 2D Pattern Drawing based on the actual 3D render
  drawSurfaceTreatmentSchematic(doc, {
    x: leftX,
    y: boxY,
    w: boxW,
    h: boxH,
    patternId,
    patternName,
    color: flavorColor,
    colorName: flavorName,
    contour,
  });

  // 2. RIGHT SIDE: Actual 3D Render Screenshot
  const frontImage = images?.[page.frontImage] || images?.[page.image] || images?.['surface-front'] || images?.surface;
  placeImage(doc, frontImage, rightX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'S');
  drawViewBadge(doc, '3D RENDER', rightX + 3, boxY + 3);

  // 3. Details table & Highlights below the side-by-side boxes
  const rows = [
    ['Treatment', name(page.mode || 'glaze')],
    ['Pattern', patternName],
  ];
  if (flavorName) rows.push(['Flavor', flavorName]);

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: [`${name(page.mode || 'glaze')} finish applied to the surface (2D drip schematic vs. 3D render)`],
  });
}

// Side Design: Side-by-side layout!
// Left-side: 2D Pattern Schematic (dumbed down mock copy of the chosen design on unrolled wall in chosen color)
// Right-side: 3D Render Screenshot (actual 3D cake render)
function addSidePages(doc, page, images, anchors, swatches, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'SIDE');

  const boxW = 88;
  const boxH = 74;
  const gap = 6;
  const leftX = MARGIN;
  const rightX = MARGIN + boxW + gap;
  const boxY = top + 2;

  const frontKey = page.frontImage || page.image || 'side-front';
  const topAnchors = anchors?.[frontKey] || anchors?.side || {};
  const flavor = (page.crops || [])[0] || {};
  const hit1 = topAnchors[flavor.anchorId] || { x: 0.45, y: 0.5 };
  const isChoc = String(page.flavorName || flavor.sub || '').toLowerCase().includes('choc');
  const flavorColor = isChoc
    ? '#301009'
    : (page.flavorChipColor || flavor.chipColor || (fillColors?.[frontKey] && fillColors[frontKey] !== '#ffffff' ? fillColors[frontKey] : null) || hit1.color || '#F6DEAB');
  const flavorName = page.flavorName || flavor.sub || '';
  const treatmentId = page.treatmentId || page.mode;
  const variantId = page.variantId || page.pattern?.variantId;
  const patternName = page.patternName || page.pattern?.sub || '';

  // 1. LEFT SIDE: 2D Dumbed Down Mock Pattern Schematic
  drawSidePatternSchematic(doc, {
    x: leftX,
    y: boxY,
    w: boxW,
    h: boxH,
    treatmentId,
    variantId,
    color: flavorColor,
    colorName: flavorName,
    patternName,
    baseFinish: page.baseFinish,
  });

  // 2. RIGHT SIDE: Actual 3D Render Screenshot
  const frontImage = images?.[page.frontImage] || images?.[page.image] || images?.['side-front'] || images?.side;
  placeImage(doc, frontImage, rightX, boxY, boxW, boxH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'S');
  drawViewBadge(doc, '3D RENDER', rightX + 3, boxY + 3);

  // 3. Details table & Highlights below the side-by-side boxes
  const rows = [];
  if (page.baseFinish) rows.push(['Base Finish', page.baseFinish]);
  rows.push(['Design', name(page.mode || 'Side Design')]);
  rows.push(['Set', patternName || name(page.pattern?.sub || '')]);
  if (flavorName) rows.push(['Color', flavorName]);

  const highlightText = page.baseTypeDisplay
    ? `${page.baseTypeDisplay}: ${name(page.mode || 'Side Design')} (2D pattern schematic vs. 3D render)`
    : `${name(page.mode || 'Side Design')} wrapped around the cake's side (2D pattern schematic vs. 3D render)`;

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: [highlightText],
  });
}

// Edge Border: Side-by-side layout (matching SIDE & SURFACE TREATMENT standard)
// Left-side: 2D Pattern Schematic (using the vector patterns we did in blueprintSchematics)
// Right-side: 3D Render Screenshot (actual 3D cake render)
function addEdgePages(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'EDGE');

  const boxW = 88;
  const boxH = 74;
  const gap = 6;
  const leftX = MARGIN;
  const rightX = MARGIN + boxW + gap;
  const boxY = top + 2;

  const slot = page.slot || 'top';
  const designId = page.designId || page.mode || page.pipingTip || 'shell';
  const variantId = page.variantId || designId;
  const patternName = page.designName || page.patternName || name(variantId);
  const color = page.color || '#F6DEAB';
  const colorName = page.colorName || 'Vanilla';
  const secondaryColor = page.secondaryColor || null;

  // 1. LEFT SIDE: 2D Vector Pattern Drawing (using the patterns we did)
  drawEdgePatternSchematic(doc, {
    x: leftX,
    y: boxY,
    w: boxW,
    h: boxH,
    slot,
    designId: variantId,
    variantId,
    designName: patternName,
    color,
    colorName: page.primaryColorName || page.colorName?.split('/')?.[0]?.trim() || colorName,
    secondaryColor: null,
  });

  // 2. RIGHT SIDE: Actual 3D Render Screenshot (Front / Top / Multi-angle)
  const front3D = images?.[page.frontImage] || images?.[page.image] || images?.[`edge-${slot}`];
  const top3D = images?.[page.topImage] || images?.[`${page.image}-top`] || images?.[`edge-${slot}-top`] || front3D;

  if (front3D && top3D && front3D !== top3D) {
    doc.setFillColor(252, 250, 248);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'F');
    const subH = (boxH - 10) / 2;
    placeImage(doc, front3D, rightX + 1.5, boxY + 5, boxW - 3, subH);
    drawViewBadge(doc, 'FRONT (3D)', rightX + 3, boxY + 6);

    doc.setDrawColor(220, 215, 210);
    doc.setLineWidth(0.4);
    doc.line(rightX + 2, boxY + 5 + subH + 0.5, rightX + boxW - 2, boxY + 5 + subH + 0.5);

    placeImage(doc, top3D, rightX + 1.5, boxY + 6 + subH, boxW - 3, subH);
    drawViewBadge(doc, 'TOP (3D)', rightX + 3, boxY + 7 + subH);

    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'S');
    drawViewBadge(doc, '3D RENDER', rightX + 3, boxY + 2.5);
  } else {
    const img3D = front3D || top3D;
    if (img3D) {
      placeImage(doc, img3D, rightX, boxY, boxW, boxH);
    }
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, 'S');
    drawViewBadge(doc, '3D RENDER', rightX + 3, boxY + 3);
  }

  // 3. Details table & Highlights below the side-by-side boxes
  const solidColorName = page.primaryColorName || page.colorName?.split('/')?.[0]?.trim() || colorName;
  const rows = [
    ['Edge Position', `${name(slot)} Rim`],
    ['Border Design', patternName],
    ['Color', solidColorName],
  ];
  if (page.details && Array.isArray(page.details)) {
    for (const [k, v] of page.details) {
      if (!rows.some(([rk]) => rk.toLowerCase() === k.toLowerCase() || (k.toLowerCase() === 'piping color' && rk.toLowerCase() === 'color'))) {
        rows.push([k, v]);
      }
    }
  }

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, {
    details: rows,
    highlights: page.highlights || [
      `${name(slot)} border (${patternName}) - 2D pattern schematic vs. 3D render`,
      'The 2D pattern schematic replicates the exact geometry of the 3D render to guide piping technique and spacing',
    ],
  });
}

// Center Decorations: Top-view diagram showing where designs are placed.
// Top view is framed and centered horizontally on the page at its normal display (4:3 aspect ratio)
// with a "TOP VIEW" badge, and concise, detailed placement details below.
function addCenterPage(doc, page, images, anchors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'CENTER');

  // Centered framed box for the top view diagram
  const imgW = 126;
  const imgH = 94;
  const imgX = (PAGE_W - imgW) / 2;
  const imgY = top + 2;

  const centerImg = images?.[page.image] || images?.['center-top'] || images?.['center'];
  placeImage(doc, centerImg, imgX, imgY, imgW, imgH);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'S');
  drawViewBadge(doc, 'TOP VIEW', imgX + 3, imgY + 3);

  // Details and highlights below the framed top view
  detailBlock(doc, MARGIN, imgY + imgH + 10, PAGE_W - 2 * MARGIN, page);
}

// Dedicated Assembling Page for Filling:
// Left-side: 2D Layer-by-Layer Assembly (exploded stack with arrows and enclosing callout)
// Right-side: Complete Look After Assembling (assembled core cylinder stack with alternating sponge/filling seams)
function addAssemblyPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'ASSEMBLING');

  const boxW = 84;
  const boxH = 88;
  const gap = 6;
  const leftX = MARGIN;
  const rightX = MARGIN + boxW + gap;
  const boxY = top + 2;

  // 1. LEFT SIDE: 2D Layer-by-Layer Assembly (matching 3rd sketch)
  drawAssemblyExplodedSchematic(doc, {
    x: leftX,
    y: boxY,
    w: boxW,
    h: boxH,
    shape: page.shape || 'round',
    layers: page.layers || 1,
    spongeFlavor: page.spongeFlavor || 'Vanilla',
    spongeColor: page.spongeColor || '#F5E6CA',
    fillingFlavor: page.fillingFlavor || 'Chocolate',
    fillingColor: page.fillingColor || '#7A4B2A',
  });

  // 2. RIGHT SIDE: Complete Look After Assembling (matching 4th sketch)
  drawAssemblyCompleteSchematic(doc, {
    x: rightX,
    y: boxY,
    w: boxW,
    h: boxH,
    shape: page.shape || 'round',
    layers: page.layers || 1,
    spongeFlavor: page.spongeFlavor || 'Vanilla',
    spongeColor: page.spongeColor || '#F5E6CA',
    fillingFlavor: page.fillingFlavor || 'Chocolate',
    fillingColor: page.fillingColor || '#7A4B2A',
  });

  // 3. Stacking instructions & Details below
  const stackingSteps = [
    ['Step 1 · Base Foundation', `Place initial ${page.spongeFlavor} sponge disc centered securely on cake board`],
    ['Step 2 · Layer Stacking', `Spread ${page.fillingFlavor} filling evenly across each sponge tier layer (${page.layers} layer${page.layers > 1 ? 's' : ''})`],
    ['Step 3 · Enclosing Crown', 'Place final enclosing sponge slice flat and level on top to seal cake core'],
    ['Step 4 · Chill & Set', 'Refrigerate assembled core 20–30 mins to stabilize before applying exterior finish'],
  ];

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, {
    details: [...(page.details || []), ...stackingSteps],
    highlights: page.highlights || [
      'Layer-by-layer internal assembly breakdown: stack strictly in order from bottom base to top enclosing crown',
      'Ensure each filling layer is level and chilled before crumb-coating exterior',
    ],
  });
}

// Dedicated Assembling Page for Exterior Coating (in-between EXTERIOR FINISH and SURFACE TREATMENT):
// Left: Assembled Fundamentals + Filling ("FILLING") -> Right: Covered with Frosting or Textured ("COATED")
function addCoatingAssemblyPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'ASSEMBLING');

  const boxW = PAGE_W - 2 * MARGIN;
  const boxH = 88;
  const boxX = MARGIN;
  const boxY = top + 2;

  drawAssemblyCoatingSchematic(doc, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    shape: page.shape || 'round',
    layers: page.layers || 1,
    spongeFlavor: page.spongeFlavor || 'Vanilla',
    spongeColor: page.spongeColor || '#F5E6CA',
    fillingFlavor: page.fillingFlavor || 'None',
    fillingColor: page.fillingColor || '#7A4B2A',
    style: page.style || 'smooth',
    styleName: page.styleName || 'Smooth Coating',
    texture: page.texture || '',
    textureName: page.textureName || '',
    isTextured: Boolean(page.isTextured),
    finishFlavor: page.finishFlavor || 'Vanilla',
    finishColor: page.finishColor || '#F6DEAB',
  });

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, page);
}

// Dedicated Assembling Page for Surface Treatment Application (in-between SURFACE TREATMENT and SIDE):
// Left: Coated Cake ("COATED") -> Right: Cake with Surface Treatment / Drips ("DRIP")
function addSurfaceAssemblyPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'ASSEMBLING');

  const boxW = PAGE_W - 2 * MARGIN;
  const boxH = 88;
  const boxX = MARGIN;
  const boxY = top + 2;

  drawAssemblySurfaceSchematic(doc, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    shape: page.shape || 'round',
    style: page.style || 'smooth',
    styleName: page.styleName || 'Smooth Coating',
    texture: page.texture || '',
    textureName: page.textureName || '',
    isTextured: Boolean(page.isTextured),
    finishFlavor: page.finishFlavor || 'Vanilla',
    finishColor: page.finishColor || '#F6DEAB',
    surfaceMode: page.surfaceMode || 'drip',
    surfaceModeName: page.surfaceModeName || 'Drip',
    patternId: page.patternId || 'naturalTear',
    patternName: page.patternName || 'Natural Tear',
    surfaceFlavorName: page.surfaceFlavorName || 'Chocolate',
    surfaceColor: page.surfaceColor || '#301009',
  });

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, page);
}

// Dedicated Assembling Page for Side Design Application (in-between SIDE and EDGE):
// Left: Cake with Drip / Coated Base ("DRIP" / "COATED") -> Right: Cake with Side Design Pattern ("SIDE")
function addSideAssemblyPage(doc, page, images, anchors, fillColors, designName, tierLabel) {
  const top = tierHeader(doc, designName, tierLabel, 'ASSEMBLING');

  const boxW = PAGE_W - 2 * MARGIN;
  const boxH = 88;
  const boxX = MARGIN;
  const boxY = top + 2;

  drawAssemblySideSchematic(doc, {
    x: boxX,
    y: boxY,
    w: boxW,
    h: boxH,
    shape: page.shape || 'round',
    style: page.style || 'smooth',
    styleName: page.styleName || 'Smooth Coating',
    texture: page.texture || '',
    textureName: page.textureName || '',
    isTextured: Boolean(page.isTextured),
    finishFlavor: page.finishFlavor || 'Vanilla',
    finishColor: page.finishColor || '#F6DEAB',
    hasSurface: Boolean(page.hasSurface),
    surfaceMode: page.surfaceMode || '',
    surfaceModeName: page.surfaceModeName || '',
    surfacePatternId: page.surfacePatternId || '',
    surfacePatternName: page.surfacePatternName || '',
    surfaceFlavorName: page.surfaceFlavorName || '',
    surfaceColor: page.surfaceColor || '#301009',
    treatmentId: page.treatmentId || 'checkeredPattern',
    treatmentName: page.treatmentName || 'Checkered Pattern',
    variantId: page.variantId || null,
    sidePatternName: page.sidePatternName || 'Straight Grid',
    sideColorName: page.sideColorName || 'Vanilla',
    sideColor: page.sideColor || '#F6DEAB',
    secondaryColor: page.secondaryColor || null,
  });

  detailBlock(doc, MARGIN, boxY + boxH + 8, PAGE_W - 2 * MARGIN, page);
}

export function addTierPages(doc, { groups = [], images = {}, anchors = {}, swatches = {}, fillColors = {}, contours = {}, designName = '' } = {}) {
  for (const group of groups) {
    for (const page of group.pages) {
      if (page.kind === 'fundamentals') addFundamentalsPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'finish') addExteriorFinishPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'filling') addFillingPages(doc, page, images, anchors, swatches, fillColors, designName, group.tierLabel);
      else if (page.kind === 'assembling') addAssemblyPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'coating-assembly') addCoatingAssemblyPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'surface') addSurfaceTreatmentPages(doc, page, images, anchors, swatches, fillColors, contours, designName, group.tierLabel);
      else if (page.kind === 'surface-assembly') addSurfaceAssemblyPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'side') addSidePages(doc, page, images, anchors, swatches, fillColors, designName, group.tierLabel);
      else if (page.kind === 'side-assembly') addSideAssemblyPage(doc, page, images, anchors, fillColors, designName, group.tierLabel);
      else if (page.kind === 'edge') addEdgePages(doc, page, images, anchors, fillColors, designName, group.tierLabel);
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