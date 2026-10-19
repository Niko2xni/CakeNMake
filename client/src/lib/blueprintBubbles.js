// Blueprint "bubbles": the round close-ups used on the DETAILS: pages.
//
//   drawFlavorBubble  a plain circle in the flavor's own color, like the
//                     flavor chips in the designer (a brown circle for
//                     Chocolate) -- tells the reader WHAT the flavor is.
//   drawCropBubble    a round, magnified crop of a rendered picture, centred
//                     on the spot of interest -- shows what a pattern or
//                     design really looks like up close.
//   drawBubbleLabel   the bold title and the descriptive line under a bubble.
//   arrow             the pointing arrow shared by every blueprint page.
//
// All sizes are millimetres, matching blueprintPdf.js.

export const INK = [90, 60, 60];
export const ACCENT = [200, 110, 130];
export const BODY = [60, 45, 45];

// One rim colour for every bubble, so FILLING and PATTERN match.
export const BUBBLE_RIM = [208, 208, 208];

const imageFormat = (dataUrl) => (/^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG');

export function hexToRgb(hex, fallback = [232, 216, 200]) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function arrow(doc, x1, y1, x2, y2) {
    doc.setDrawColor(...ACCENT);
    doc.setFillColor(...ACCENT);
    doc.setLineWidth(0.5);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = 2.6;
    const bx = x2 - Math.cos(ang) * head;
    const by = y2 - Math.sin(ang) * head;
    doc.line(x1, y1, bx, by);
    doc.triangle(
        x2, y2,
        bx + Math.cos(ang + Math.PI / 2) * 1.3, by + Math.sin(ang + Math.PI / 2) * 1.3,
        bx + Math.cos(ang - Math.PI / 2) * 1.3, by + Math.sin(ang - Math.PI / 2) * 1.3,
        'F',
    );
}

// A solid circle in `color` (hex). Slightly darker rim so pale flavors
// (vanilla, cream) still read against a white page.
export function drawFlavorBubble(doc, { cx, cy, r, color }) {
    const rgb = hexToRgb(color);
    doc.setFillColor(...rgb);
    doc.circle(cx, cy, r, 'F');
    doc.setDrawColor(...BUBBLE_RIM);
    doc.setLineWidth(0.7);
    doc.circle(cx, cy, r, 'S');
    // Soft highlight so it reads as a round swatch rather than a flat dot.
    doc.setFillColor(...rgb.map((v) => Math.min(255, v + 28)));
    doc.circle(cx - r * 0.28, cy - r * 0.3, r * 0.3, 'F');
}

// Magnified round crop of `src`, which is drawn imgW x imgH elsewhere.
// (ax, ay) is the spot, 0..1 of that picture, that lands at the centre.
export function drawCropBubble(doc, { src, ax, ay, imgW, imgH, cx, cy, r, zoom = 2.6 }) {
    doc.setFillColor(248, 244, 241);
    doc.circle(cx, cy, r, 'F');
    if (src) {
        doc.saveGraphicsState();
        doc.circle(cx, cy, r, null);
        doc.clip();
        doc.discardPath();
        doc.addImage(src, imageFormat(src), cx - ax * imgW * zoom, cy - ay * imgH * zoom, imgW * zoom, imgH * zoom, undefined, 'FAST');
        doc.restoreGraphicsState();
    }
    doc.setDrawColor(...BUBBLE_RIM);
    doc.setLineWidth(0.7);
    doc.circle(cx, cy, r, 'S');
}

export function drawBubbleLabel(doc, { cx, y, title, sub }) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(title, cx, y, { align: 'center' });
    if (sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...BODY);
        doc.text(doc.splitTextToSize(String(sub), 40), cx, y + 5, { align: 'center' });
    }
}

// Plain-language name for a colour ("White", "Light Pink", "Dark Brown"...),
// so a bubble can say what colour something really is on screen.
export function describeColor(hex) {
    const [r, g, b] = hexToRgb(hex, null) || [null];
    if (r == null) return 'Unknown';
    const R = r / 255; const G = g / 255; const B = b / 255;
    const max = Math.max(R, G, B); const min = Math.min(R, G, B);
    const l = (max + min) / 2;
    const d = max - min;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) {
        if (max === R) h = ((G - B) / d) % 6; else if (max === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
        h = (h * 60 + 360) % 360;
    }
    if (l > 0.93 && sat < 0.35) return 'White';
    if (l < 0.1) return 'Black';
    if (sat < 0.12) return l > 0.75 ? 'Light Gray' : l > 0.35 ? 'Gray' : 'Dark Gray';
    if (h >= 30 && h < 65 && l > 0.85) return 'Cream';
    let base;
    if (h < 15 || h >= 345) base = 'Red';
    else if (h < 40) base = l < 0.42 ? 'Brown' : 'Orange';
    else if (h < 65) base = l < 0.38 ? 'Brown' : 'Yellow';
    else if (h < 165) base = 'Green';
    else if (h < 200) base = 'Teal';
    else if (h < 255) base = 'Blue';
    else if (h < 290) base = 'Purple';
    else base = 'Pink';
    if (base === 'Brown') return l < 0.2 ? 'Dark Brown' : 'Brown';
    if (l > 0.75) return `Light ${base}`;
    if (l < 0.28) return `Dark ${base}`;
    return base;
}