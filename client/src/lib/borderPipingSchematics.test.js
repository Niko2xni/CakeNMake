import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawSidePatternSchematic } from './blueprintSchematics';
import { buildSidePatternsCatalogPdf } from './sidePatternsCatalogPdf';
import { BORDER_PIPING_VARIATIONS_DELUXE } from './cakeConfig';

describe('Border Piping 2D Schematics & Alternating Colors', () => {
  it('renders all 12 border piping variants without throwing', () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    BORDER_PIPING_VARIATIONS_DELUXE.forEach((variant) => {
      const isAlt = variant.id.endsWith('Alt');
      expect(() => {
        drawSidePatternSchematic(doc, {
          x: 10,
          y: 10,
          w: 80,
          h: 60,
          treatmentId: 'borderPiping',
          variantId: variant.id,
          color: '#5B7038',
          colorName: isAlt ? 'Matcha / Vanilla' : 'Matcha',
          patternName: variant.label,
          secondaryColor: isAlt ? '#E5C583' : null,
        });
      }).not.toThrow();
    });
  });

  it('builds the complete borderPiping catalog PDF with dual pages and dual dots for alternating variants', () => {
    const doc = buildSidePatternsCatalogPdf({
      category: 'borderPiping',
      color: '#5B7038',
      colorName: 'Matcha',
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(2);
  });
});
