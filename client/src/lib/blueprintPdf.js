import { jsPDF } from 'jspdf';

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
// Only pages 1-3 exist so far; the tier pages get appended to the same
// document by their own builders.
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

export function buildBlueprintPdf({ views, details }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  addStartPage(doc, views?.hero); // page 1
  doc.addPage();
  addAnglePage(doc, views); // page 2
  addDetailsPages(doc, details); // page 3 (+ overflow)
  return doc;
}

export function buildBlueprintPdfBlob(args) {
  return buildBlueprintPdf(args).output('blob');
}
