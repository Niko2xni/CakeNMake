import React from 'react';
import {
  CAKE_FORMAT_OPTIONS,
  SIZE_OPTIONS,
  STANDARD_SIZE_OPTIONS,
  BENTO_SIZE_OPTIONS,
  BENTO_SQUARE_SIZE_OPTIONS,
  PETITS_FOUR_SIZE_OPTIONS,
  LAYER_OPTIONS,
  SHAPE_OPTIONS,
  getCakeFormat,
  resolveStructureShape,
} from '@/lib/cakeConfig';

function nextVisualShape(structure) {
  return structure.shape === 'round' || structure.shape === 'rectangle' || structure.shape === 'square'
    ? structure.shape
    : 'round';
}

export default function CakeStructureSection({ structure, realSize, onChange }) {
  const cakeFormat = getCakeFormat(structure);
  const isBento = cakeFormat === 'bento';
  const isPetitsFour = cakeFormat === 'petitsFour';
  const visualShape = resolveStructureShape(structure);

  const activeSizeOptions = isPetitsFour
    ? PETITS_FOUR_SIZE_OPTIONS
    : isBento
    ? visualShape === 'square' ? BENTO_SQUARE_SIZE_OPTIONS : BENTO_SIZE_OPTIONS
    : STANDARD_SIZE_OPTIONS;

  // Filter out 10x10 and 12x12 when square shape is active
  // Same idea for size: if the stored size isn't one of this format's options
  // (e.g. switching to Petit Fours while an old size id is stored), the first
  // option is what actually renders, so show it as selected.
  const effectiveSize = activeSizeOptions.some((o) => o.id === structure.size)
    ? structure.size
    : activeSizeOptions[0]?.id;

  const filteredSizeOptions = visualShape === 'square' && !isPetitsFour && !isBento
    ? activeSizeOptions.filter(opt => opt.id === '6x4' || opt.id === '8x6' || opt.id === '6x6' || opt.id === '8x8')
    : activeSizeOptions;

  // Always force single tier only for all cake types
  const isSingleTierOnly = true;
  const availableLayerOptions = LAYER_OPTIONS.filter((opt) => opt.id === 1);

  const updateFormat = (nextFormat) => {
    if (nextFormat === 'petitsFour') {
      const isCurrentPetitsFourSize = PETITS_FOUR_SIZE_OPTIONS.some((o) => o.id === structure.size);
      const nextSize = isCurrentPetitsFourSize ? structure.size : 'classicCube';
      const selectedOption = PETITS_FOUR_SIZE_OPTIONS.find((o) => o.id === nextSize);
      onChange(
        {
          ...structure,
          cakeFormat: 'petitsFour',
          format: 'petitsFour',
          size: nextSize,
          layers: 1,
          shape: nextVisualShape(structure),
        },
        selectedOption ? selectedOption.dimensions : realSize
      );
    } else if (nextFormat === 'bento') {
      const currentBentoSizes = [...BENTO_SIZE_OPTIONS, ...BENTO_SQUARE_SIZE_OPTIONS];
      const isCurrentBentoSize = currentBentoSizes.some((o) => o.id === structure.size);
      let nextSize = isCurrentBentoSize ? structure.size : 'standardBento';
      if (nextVisualShape(structure) === 'square' && !BENTO_SQUARE_SIZE_OPTIONS.some((o) => o.id === nextSize)) {
        nextSize = 'squareBento3x3';
      }
      const selectedOption = currentBentoSizes.find((o) => o.id === nextSize);
      onChange(
        {
          ...structure,
          cakeFormat: 'bento',
          format: 'bento',
          size: nextSize,
          layers: 1,
          shape: nextVisualShape(structure),
          layerDesign: 'uniform',
        },
        selectedOption ? selectedOption.dimensions : realSize
      );
    } else {
      const isSpecialSize = BENTO_SIZE_OPTIONS.some((o) => o.id === structure.size)
        || BENTO_SQUARE_SIZE_OPTIONS.some((o) => o.id === structure.size)
        || PETITS_FOUR_SIZE_OPTIONS.some((o) => o.id === structure.size);
      const nextSize = isSpecialSize ? '8x6' : structure.size;
      const selectedOption = STANDARD_SIZE_OPTIONS.find((o) => o.id === nextSize);
      // Always force 1 tier
      const nextLayers = 1;
      // If current shape is square but size isn't 6x4 or 8x6, reset to round
      const isAllowedSquare = nextSize === '6x4' || nextSize === '8x6' || nextSize === '6x6' || nextSize === '8x8';
      const nextShape = structure.shape === 'square' && !isAllowedSquare 
        ? 'round' 
        : nextVisualShape(structure);
      onChange(
        {
          ...structure,
          cakeFormat: 'standard',
          format: 'standard',
          size: nextSize,
          layers: nextLayers,
          shape: nextShape,
          layerDesign: 'uniform',
        },
        selectedOption ? selectedOption.dimensions : realSize
      );
    }
  };

  const updateSize = (size) => {
    const selectedOption = SIZE_OPTIONS.find((opt) => opt.id === size);
    // Always force single tier
    const nextLayers = 1;
    const nextLayerDesign = 'uniform';
    const isSquareSize = cakeFormat === 'bento'
      ? BENTO_SQUARE_SIZE_OPTIONS.some((option) => option.id === size)
      : size === '6x4' || size === '8x6' || size === '6x6' || size === '8x8';
    const nextShape = structure.shape === 'square' && !isSquareSize
      ? 'round'
      : structure.shape;
    onChange(
      {
        ...structure,
        cakeFormat,
        format: cakeFormat,
        size,
        layers: nextLayers,
        layerDesign: nextLayerDesign,
        shape: nextShape,
      },
      selectedOption ? selectedOption.dimensions : realSize
    );
  };

  const updateLayers = (layers) => {
    // Always enforce single tier
    const forcedLayers = 1;
    const newLayerDesign = 'uniform';
    onChange(
      { ...structure, cakeFormat, format: cakeFormat, layers: forcedLayers, layerDesign: newLayerDesign },
      realSize
    );
  };

  const updateShape = (shape) => {
    const validSquareSizes = isBento ? BENTO_SQUARE_SIZE_OPTIONS : STANDARD_SIZE_OPTIONS.filter((option) => option.id === '6x4' || option.id === '8x6' || option.id === '6x6' || option.id === '8x8');
    const isAllowedSquareSize = validSquareSizes.some((option) => option.id === structure.size);
    const nextSize = shape === 'square' && !isAllowedSquareSize
      ? (isBento ? 'squareBento3x3' : '8x6')
      : shape !== 'square' && isBento && BENTO_SQUARE_SIZE_OPTIONS.some((option) => option.id === structure.size)
      ? 'standardBento'
      : structure.size;
    const selectedOption = SIZE_OPTIONS.find((option) => option.id === nextSize);
    onChange(
      { ...structure, cakeFormat, format: cakeFormat, shape, size: nextSize },
      selectedOption ? selectedOption.dimensions : realSize
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Cake Format */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block font-medium">Cake Format</span>
        <div className="grid grid-cols-3 gap-2">
          {CAKE_FORMAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateFormat(option.id)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 text-center ${
                cakeFormat === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Cake Size */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block font-medium">Cake Size</span>
        <div className={`grid ${isBento && visualShape !== 'square' ? 'grid-cols-3' : isPetitsFour ? 'grid-cols-2' : visualShape === 'square' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
          {filteredSizeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updateSize(option.id)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                effectiveSize === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cake Layers / Tiers */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block font-medium">Cake Tiers</span>
        <div className={`grid ${availableLayerOptions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
          {availableLayerOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updateLayers(option.id)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                structure.layers === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Cake Shape */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block font-medium">Cake Shape</span>
        <div className={`grid ${isPetitsFour ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
          {SHAPE_OPTIONS.map((option) => {
            // Hide Square shape for Petit Fours (it's always disabled anyway)
            if (isPetitsFour && option.id === 'square') {
              return null;
            }
            
            // Square Bentos have dedicated 2x2 and 3x3 size options.
            const isSquareRestricted = option.id === 'square' && (
              isPetitsFour
              || (!isBento && structure.size !== '6x4' && structure.size !== '8x6' && structure.size !== '6x6' && structure.size !== '8x8')
            );
            
            return (
              <button
                key={option.id}
                onClick={() => !isSquareRestricted && updateShape(option.id)}
                disabled={isSquareRestricted}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  visualShape === option.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isSquareRestricted
                    ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {isPetitsFour && option.id === 'rectangle' ? 'Square' : option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}