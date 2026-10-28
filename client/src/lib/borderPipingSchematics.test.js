import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawSidePatternSchematic } from './blueprintSchematics';
import { buildSidePatternsCatalogPdf } from './sidePatternsCatalogPdf';
import { BORDER_PIPING_VARIATIONS_DELUXE, BORDER_PIPING_ALTERNATING_VARIATIONS } from './cakeConfig';

describe('Border Piping 2D Schematics (Solid Color Only)', () => {
  it('confirms alternating variants are removed from Edge Border Piping', () => {
    expect(BORDER_PIPING_VARIATIONS_DELUXE).toHaveLength(6);
    expect(BORDER_PIPING_VARIATIONS_DELUXE.some((v) => v.id.endsWith('Alt'))).toBe(false);
    expect(BORDER_PIPING_VARIATIONS_DELUXE.map((v) => v.id)).toEqual([
      'shell',
      'reverseShell',
      'bead',
      'ropeTwist',
      'ropeTwistClassic',
      'elongatedShell',
    ]);
  });

  it('renders all 6 solid border piping variants cleanly without throwing', () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    BORDER_PIPING_VARIATIONS_DELUXE.forEach((variant) => {
      expect(() => {
        drawSidePatternSchematic(doc, {
          x: 10,
          y: 10,
          w: 80,
          h: 60,
          treatmentId: 'borderPiping',
          variantId: variant.id,
          color: '#5B7038',
          colorName: 'Matcha',
          patternName: variant.label,
          secondaryColor: null,
        });
      }).not.toThrow();
    });
  });

  it('builds the complete borderPiping catalog PDF as a single 1-page catalog without alternating variants', () => {
    const doc = buildSidePatternsCatalogPdf({
      category: 'borderPiping',
      color: '#5B7038',
      colorName: 'Matcha',
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
