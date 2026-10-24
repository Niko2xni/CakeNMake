import React from 'react';

/**
 * Geometric shape-style vector icons for Buttercream Textures:
 * - Ridged Comb (`ridged`): Fine, horizontal comb-dragged parallel grooves
 * - Ribbon Wrap (`ribbonWrap`): Stacked horizontal ribbon bands around the cake
 *
 * Drawn in the exact same circular aesthetic as SideDesignIcons,
 * EdgeDesignIcons, and SurfaceDesignIcons.
 */

export default function ButtercreamTextureIcon({ textureId, className = 'w-full h-full' }) {
  const IconComponent = getTextureIcon(textureId);
  return <IconComponent className={className} />;
}

function BaseCircleIcon({ children, className = 'w-full h-full' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10.6" strokeWidth="1.4" />
      {children}
    </svg>
  );
}

// 1. Ridged Comb: Fine, horizontal spatula-dragged parallel ridges across the cake body
export function RidgedCombIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Cake cylinder outline */}
      <path
        d="M 5 7.5 C 5 6 19 6 19 7.5 V 17 C 19 18.5 5 18.5 5 17 Z"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Fine comb grooves */}
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" strokeWidth="1.3" />
      <line x1="5.2" y1="12" x2="18.8" y2="12" strokeWidth="1.3" />
      <line x1="5.5" y1="14.5" x2="18.5" y2="14.5" strokeWidth="1.3" />
    </BaseCircleIcon>
  );
}

// 2. Ribbon Wrap: Stacked horizontal ribbon bands with dimensional folds
export function RibbonWrapIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Ribbon tier band 1 (top) */}
      <path
        d="M 5.5 7.2 C 8 8.2 16 8.2 18.5 7.2 L 18.8 10.5 C 16 11.5 8 11.5 5.2 10.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.16"
      />
      {/* Ribbon tier band 2 (middle) */}
      <path
        d="M 5.2 11 C 8 12 16 12 18.8 11 L 18.8 14.2 C 16 15.2 8 15.2 5.2 14.2 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
      {/* Ribbon tier band 3 (bottom) */}
      <path
        d="M 5.2 14.7 C 8 15.7 16 15.7 18.8 14.7 L 18.5 17.5 C 16 18.5 8 18.5 5.5 17.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </BaseCircleIcon>
  );
}

function getTextureIcon(textureId) {
  switch (textureId) {
    case 'ribbonWrap':
      return RibbonWrapIcon;
    case 'ridged':
    default:
      return RidgedCombIcon;
  }
}
