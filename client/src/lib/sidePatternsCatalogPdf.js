import { jsPDF } from 'jspdf';
import { drawSidePatternSchematic } from './blueprintSchematics';
import {
  CHECKERED_PATTERN_SETS,
  TRIANGLE_PATTERN_SETS,
  CHEVRON_PATTERN_SETS,
  SCATTER_PEARLS_SETS,
  PIPING_SCROLLS_SETS,
  SUNSHINE_PLAY_SETS,
  VICTORIAN_LAMBETH_SETS,
  BORDER_PIPING_VARIATIONS_DELUXE,
  BEADED_TRIM_VARIATIONS_DELUXE,
  DOLLOPS_VARIATIONS_DELUXE,
  WHIPPED_CREAM_VARIATIONS,
  FRUIT_CONFECTION_RIM_OPTIONS,
} from './cakeConfig';

export const PATTERNS_CATEGORIES_CONFIG = [
  // Side Designs
  { id: 'checkeredPattern', label: 'Checkered Pattern', section: 'Side', sets: CHECKERED_PATTERN_SETS },
  { id: 'trianglePattern', label: 'Triangle Pattern', section: 'Side', sets: TRIANGLE_PATTERN_SETS },
  { id: 'chevronPattern', label: 'Chevron Pattern', section: 'Side', sets: CHEVRON_PATTERN_SETS },
  { id: 'scatterPearls', label: 'Scatter Pearls', section: 'Side', sets: SCATTER_PEARLS_SETS },
  { id: 'pipingScrolls', label: 'Piping Scrolls', section: 'Side', sets: PIPING_SCROLLS_SETS },
  { id: 'sunshinePlay', label: 'Sunshine Play', section: 'Side', sets: SUNSHINE_PLAY_SETS },
  { id: 'victorianLambeth', label: 'Victorian Lambeth', section: 'Side', sets: VICTORIAN_LAMBETH_SETS },
  // Edge Designs
  { id: 'borderPiping', label: 'Border Piping', section: 'Edge', sets: BORDER_PIPING_VARIATIONS_DELUXE },
  { id: 'beadedTrim', label: 'Beaded Trim', section: 'Edge', sets: BEADED_TRIM_VARIATIONS_DELUXE },
  { id: 'dollops', label: 'Dollops', section: 'Edge', sets: DOLLOPS_VARIATIONS_DELUXE },
  { id: 'whippedCream', label: 'Whipped Cream', section: 'Edge', sets: WHIPPED_CREAM_VARIATIONS },
  { id: 'fruitConfection', label: 'Fruit & Confection Rim', section: 'Edge', sets: FRUIT_CONFECTION_RIM_OPTIONS },
];

export const SIDE_CATEGORIES_CONFIG = PATTERNS_CATEGORIES_CONFIG;

/**
 * Builds a multi-page PDF catalog containing all 2D vector pattern schematics
 * (both Side and Edge designs) so bakery admins can inspect and review all designs in one place.
 */
export function buildSidePatternsCatalogPdf({
  category = 'all',
  color = '#3D2314',
  colorName = 'Chocolate',
} = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const activeCategories = category === 'all'
    ? PATTERNS_CATEGORIES_CONFIG
    : PATTERNS_CATEGORIES_CONFIG.filter((c) => c.id === category);

  // Group active categories into pages (up to 6 cards per page)
  const pages = [];
  activeCategories.forEach((cat) => {
    const itemsPerPage = 6;
    const totalPagesForCat = Math.ceil(cat.sets.length / itemsPerPage);
    for (let p = 0; p < totalPagesForCat; p++) {
      pages.push({
        cat,
        pageIndexInCat: p,
        totalPagesForCat,
        items: cat.sets.slice(p * itemsPerPage, (p + 1) * itemsPerPage),
      });
    }
  });

  pages.forEach((pageData, globalPageIdx) => {
    if (globalPageIdx > 0) doc.addPage();

    const { cat, pageIndexInCat, totalPagesForCat, items } = pageData;

    // 1. Header Banner
    doc.setFillColor(255, 245, 247);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setDrawColor(244, 208, 216);
    doc.setLineWidth(0.4);
    doc.line(0, 26, 210, 26);

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(35, 30, 30);
    const catPageText = totalPagesForCat > 1 ? ` · PART ${pageIndexInCat + 1} OF ${totalPagesForCat}` : '';
    const sectionTag = cat.section ? `${cat.section.toUpperCase()} DESIGN · ` : '';
    doc.text(`${sectionTag}${cat.label.toUpperCase()}${catPageText}`, 15, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 95, 95);
    doc.text(`2D Pattern Elevation Schematics · Color: ${colorName} · Category: ${cat.label} · Page ${globalPageIdx + 1} of ${pages.length}`, 15, 20);

    // 2. 2x3 Grid of Schematics (up to 6 variants per page)
    const cardW = 86;
    const cardH = 74;
    const col0X = 15;
    const col1X = 109;
    const rowY = [32, 114, 196];

    items.forEach((variant, vIdx) => {
      const col = vIdx % 2;
      const row = Math.floor(vIdx / 2);
      const cardX = col === 0 ? col0X : col1X;
      const cardY = rowY[row] || 32;

      drawSidePatternSchematic(doc, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        treatmentId: cat.id,
        variantId: variant.id,
        color,
        colorName,
        patternName: variant.label,
        baseFinish: 'Frosted',
      });
    });

    // 3. Page Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 130, 130);
    doc.text(`CakeNMake Bakery Blueprints · 2D Patterns Schematics Catalog · Page ${globalPageIdx + 1} of ${pages.length}`, 15, 288);
  });

  return doc;
}

export const buildPatternsCatalogPdf = buildSidePatternsCatalogPdf;
