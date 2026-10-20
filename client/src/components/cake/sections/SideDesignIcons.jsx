import React from 'react';

/**
 * Geometric shape-style vector icons for all SIDE section designs.
 * Expanded to overtake the whole circular button for maximum visibility and clarity.
 */

export default function SideDesignIcon({ treatmentId, variantId, index = 0, className = 'w-full h-full' }) {
  const IconComponent = getIconComponent(treatmentId, variantId, index);
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Checkered Pattern (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Full Pattern (matches user sketch: large 2x2 checker squares filling the circle)
function CheckeredFullPattern({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="4.8" y="4.8" width="5.4" height="5.4" />
      <rect x="13.8" y="4.8" width="5.4" height="5.4" />
      <rect x="4.8" y="13.8" width="5.4" height="5.4" />
      <rect x="13.8" y="13.8" width="5.4" height="5.4" />
      <line x1="10.2" y1="10.2" x2="13.8" y2="10.2" />
      <line x1="10.2" y1="13.8" x2="13.8" y2="13.8" />
      <line x1="10.2" y1="10.2" x2="10.2" y2="13.8" />
      <line x1="13.8" y1="10.2" x2="13.8" y2="13.8" />
    </BaseCircleIcon>
  );
}

// Variant 2: Left Diagonal (slanted / from bottom-left to top-right)
function CheckeredLeftDiagonal({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="3.8" y="14.8" width="5.4" height="5.4" />
      <rect x="9.3" y="9.3" width="5.4" height="5.4" />
      <rect x="14.8" y="3.8" width="5.4" height="5.4" />
      <path d="M 9.2 14.8 V 14.7 H 9.3 M 14.7 9.3 V 9.2 H 14.8" />
    </BaseCircleIcon>
  );
}

// Variant 3: X Pattern (large crossing diagonals of squares)
function CheckeredXPattern({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="9.3" y="9.3" width="5.4" height="5.4" />
      <rect x="4.8" y="4.8" width="5" height="5" />
      <rect x="14.2" y="4.8" width="5" height="5" />
      <rect x="4.8" y="14.2" width="5" height="5" />
      <rect x="14.2" y="14.2" width="5" height="5" />
    </BaseCircleIcon>
  );
}

// Variant 4: Right Diagonal (slanted \ from top-left to bottom-right)
function CheckeredRightDiagonal({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="3.8" y="3.8" width="5.4" height="5.4" />
      <rect x="9.3" y="9.3" width="5.4" height="5.4" />
      <rect x="14.8" y="14.8" width="5.4" height="5.4" />
      <path d="M 9.2 3.8 V 9.3 H 9.3 M 14.7 14.7 V 14.8 H 14.8" />
    </BaseCircleIcon>
  );
}

// Variant 5: Parallel Lines — Outer (top row + bottom row, middle open)
function CheckeredParallelOuter({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="3.8" y="4.2" width="4.8" height="4.8" />
      <rect x="9.6" y="4.2" width="4.8" height="4.8" />
      <rect x="15.4" y="4.2" width="4.8" height="4.8" />
      <rect x="3.8" y="15" width="4.8" height="4.8" />
      <rect x="9.6" y="15" width="4.8" height="4.8" />
      <rect x="15.4" y="15" width="4.8" height="4.8" />
    </BaseCircleIcon>
  );
}

// Variant 6: Parallel Lines — Inner (two inner middle rows)
function CheckeredParallelInner({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <rect x="3.8" y="7.2" width="4.8" height="4.4" />
      <rect x="9.6" y="7.2" width="4.8" height="4.4" />
      <rect x="15.4" y="7.2" width="4.8" height="4.4" />
      <rect x="3.8" y="12.4" width="4.8" height="4.4" />
      <rect x="9.6" y="12.4" width="4.8" height="4.4" />
      <rect x="15.4" y="12.4" width="4.8" height="4.4" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Triangle Pattern (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Full Pattern
function TriangleFullPattern({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="4.5,10.2 10.5,10.2 7.5,4.8" />
      <polygon points="13.5,4.8 19.5,4.8 16.5,10.2" />
      <polygon points="4.5,13.8 10.5,13.8 7.5,19.2" />
      <polygon points="13.5,19.2 19.5,19.2 16.5,13.8" />
    </BaseCircleIcon>
  );
}

// Variant 2: Left Diagonal
function TriangleLeftDiagonal({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="4,20 10,20 7,14" />
      <polygon points="9,14.5 15,14.5 12,8.5" />
      <polygon points="14,9 20,9 17,3" />
    </BaseCircleIcon>
  );
}

// Variant 3: X Pattern
function TriangleXPattern({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="9,14.5 15,14.5 12,9.5" />
      <polygon points="4,9 9,9 6.5,4" />
      <polygon points="15,4 20,4 17.5,9" />
      <polygon points="4,20 9,20 6.5,15" />
      <polygon points="15,15 20,15 17.5,20" />
    </BaseCircleIcon>
  );
}

// Variant 4: Right Diagonal
function TriangleRightDiagonal({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="4,4 10,4 7,10" />
      <polygon points="9,9.5 15,9.5 12,15.5" />
      <polygon points="14,15 20,15 17,21" />
    </BaseCircleIcon>
  );
}

// Variant 5: Parallel Lines — Outer
function TriangleParallelOuter({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="3.8,9 8.2,9 6,4.5" />
      <polygon points="9.8,9 14.2,9 12,4.5" />
      <polygon points="15.8,9 20.2,9 18,4.5" />
      <polygon points="3.8,19.5 8.2,19.5 6,15" />
      <polygon points="9.8,19.5 14.2,19.5 12,15" />
      <polygon points="15.8,19.5 20.2,19.5 18,15" />
    </BaseCircleIcon>
  );
}

// Variant 6: Parallel Lines — Inner
function TriangleParallelInner({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="3.8,11.5 8.2,11.5 6,7" />
      <polygon points="9.8,11.5 14.2,11.5 12,7" />
      <polygon points="15.8,11.5 20.2,11.5 18,7" />
      <polygon points="3.8,17 8.2,17 6,12.5" />
      <polygon points="9.8,17 14.2,17 12,12.5" />
      <polygon points="15.8,17 20.2,17 18,12.5" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chevron Pattern (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Single Color (broad zigzag bands)
function ChevronSingleColor({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 7.5 L 7.8 5.5 L 12 7.5 L 16.2 5.5 L 20.5 7.5" strokeWidth="1.6" />
      <path d="M 2.2 12 L 7.1 9.8 L 12 12 L 16.9 9.8 L 21.8 12" strokeWidth="1.6" />
      <path d="M 3.5 16.5 L 7.8 14.5 L 12 16.5 L 16.2 14.5 L 20.5 16.5" strokeWidth="1.6" />
    </BaseCircleIcon>
  );
}

// Variant 2: Two-Tone (alternating solid and dashed)
function ChevronTwoTone({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 7.5 L 7.8 5.5 L 12 7.5 L 16.2 5.5 L 20.5 7.5" strokeWidth="1.6" />
      <path d="M 2.2 12 L 7.1 9.8 L 12 12 L 16.9 9.8 L 21.8 12" strokeWidth="1.6" strokeDasharray="2.5 1.8" />
      <path d="M 3.5 16.5 L 7.8 14.5 L 12 16.5 L 16.2 14.5 L 20.5 16.5" strokeWidth="1.6" />
    </BaseCircleIcon>
  );
}

// Variant 3: Three-Tone (dashed-solid-dashed)
function ChevronThreeTone({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 7.5 L 7.8 5.5 L 12 7.5 L 16.2 5.5 L 20.5 7.5" strokeWidth="1.6" strokeDasharray="2.5 1.8" />
      <path d="M 2.2 12 L 7.1 9.8 L 12 12 L 16.9 9.8 L 21.8 12" strokeWidth="1.6" />
      <path d="M 3.5 16.5 L 7.8 14.5 L 12 16.5 L 16.2 14.5 L 20.5 16.5" strokeWidth="1.6" strokeDasharray="2.5 1.8" />
    </BaseCircleIcon>
  );
}

// Variant 4: Wide Zigzag (bold, wide teeth)
function ChevronWideZigzag({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3 10 L 12 4.8 L 21 10" strokeWidth="2" />
      <path d="M 3 17.5 L 12 12.3 L 21 17.5" strokeWidth="2" />
    </BaseCircleIcon>
  );
}

// Variant 5: Tight Zigzag (dense zigzags)
function ChevronTightZigzag({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 7.5 L 6 5.8 L 8.5 7.5 L 11 5.8 L 13.5 7.5 L 16 5.8 L 18.5 7.5 L 20.5 6.2" strokeWidth="1.4" />
      <path d="M 2 12 L 4.5 10.3 L 7 12 L 9.5 10.3 L 12 12 L 14.5 10.3 L 17 12 L 19.5 10.3 L 22 12" strokeWidth="1.4" />
      <path d="M 3.5 16.5 L 6 14.8 L 8.5 16.5 L 11 14.8 L 13.5 16.5 L 16 14.8 L 18.5 16.5 L 20.5 15.2" strokeWidth="1.4" />
    </BaseCircleIcon>
  );
}

// Variant 6: Single Color, Gapped (top and bottom with middle row removed)
function ChevronSingleColorGapped({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 6.5 L 7.8 4.5 L 12 6.5 L 16.2 4.5 L 20.5 6.5" strokeWidth="1.8" />
      <path d="M 3.5 17.5 L 7.8 15.5 L 12 17.5 L 16.2 15.5 L 20.5 17.5" strokeWidth="1.8" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scatter Pearls (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Random Scatter
function ScatterPearlsRandom({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="6.5" cy="8.5" r="1.8" fill="currentColor" />
      <circle cx="16.5" cy="6.5" r="2.1" fill="currentColor" />
      <circle cx="11.5" cy="11.5" r="1.7" fill="currentColor" />
      <circle cx="6.8" cy="16" r="1.9" fill="currentColor" />
      <circle cx="17.2" cy="15" r="1.7" fill="currentColor" />
      <circle cx="12.8" cy="18" r="1.6" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 2: Diamond Grid
function ScatterPearlsDiamondGrid({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 12 4.5 L 19.5 12 L 12 19.5 L 4.5 12 Z" strokeDasharray="1.5 2" strokeWidth="1" />
      <circle cx="12" cy="4.5" r="1.9" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
      <circle cx="19.5" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="19.5" r="1.9" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 3: Horizontal Rows
function ScatterPearlsHorizontalRows({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="6.5" cy="6.8" r="1.6" fill="currentColor" />
      <circle cx="10.2" cy="6.8" r="1.6" fill="currentColor" />
      <circle cx="13.8" cy="6.8" r="1.6" fill="currentColor" />
      <circle cx="17.5" cy="6.8" r="1.6" fill="currentColor" />

      <circle cx="4.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="8.2" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="15.8" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19.5" cy="12" r="1.6" fill="currentColor" />

      <circle cx="6.5" cy="17.2" r="1.6" fill="currentColor" />
      <circle cx="10.2" cy="17.2" r="1.6" fill="currentColor" />
      <circle cx="13.8" cy="17.2" r="1.6" fill="currentColor" />
      <circle cx="17.5" cy="17.2" r="1.6" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 4: Diamond Grid Border (top and bottom border nodes only)
function ScatterPearlsDiamondGridBorder({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 4 8 L 8 5.5 L 12 4 L 16 5.5 L 20 8" strokeDasharray="1.5 2" strokeWidth="1" />
      <circle cx="8" cy="5.5" r="1.9" fill="currentColor" />
      <circle cx="12" cy="4" r="2.1" fill="currentColor" />
      <circle cx="16" cy="5.5" r="1.9" fill="currentColor" />

      <path d="M 4 16 L 8 18.5 L 12 20 L 16 18.5 L 20 16" strokeDasharray="1.5 2" strokeWidth="1" />
      <circle cx="8" cy="18.5" r="1.9" fill="currentColor" />
      <circle cx="12" cy="20" r="2.1" fill="currentColor" />
      <circle cx="16" cy="18.5" r="1.9" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 5: Big Pearls Scatter
function ScatterPearlsBigScatter({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="7.8" cy="8" r="2.8" fill="currentColor" />
      <circle cx="16.5" cy="7.5" r="2.8" fill="currentColor" />
      <circle cx="11.5" cy="13.5" r="2.8" fill="currentColor" />
      <circle cx="17" cy="16.5" r="2.4" fill="currentColor" />
      <circle cx="6.2" cy="16" r="2.3" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 6: Small Pearls Scatter
function ScatterPearlsSmallScatter({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="6.5" cy="7.5" r="1.2" fill="currentColor" />
      <circle cx="11" cy="6" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="18" cy="9.5" r="1.2" fill="currentColor" />

      <circle cx="6.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="11.5" cy="10.5" r="1.2" fill="currentColor" />
      <circle cx="16.5" cy="12" r="1.2" fill="currentColor" />

      <circle cx="5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="9.5" cy="15" r="1.2" fill="currentColor" />
      <circle cx="14" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="18" cy="15" r="1.2" fill="currentColor" />

      <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Piping Scrolls (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Continuous Wave Rope
function PipingWaveRope({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 2 12 C 6 5.5, 8.5 5.5, 12 12 C 15.5 18.5, 18 18.5, 22 12" strokeWidth="2.2" />
      <path d="M 2 13.8 C 6 7.3, 8.5 7.3, 12 13.8 C 15.5 20.3, 18 20.3, 22 13.8" strokeWidth="1.2" strokeDasharray="2 2" />
    </BaseCircleIcon>
  );
}

// Variant 2: Paired Opposing Scrolls
function PipingPairedScrolls({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 5 18 C 5 11, 10.5 10.5, 10.5 6.5 C 10.5 4.5, 8.5 4, 7 5.5" strokeWidth="1.8" />
      <path d="M 19 18 C 19 11, 13.5 10.5, 13.5 6.5 C 13.5 4.5, 15.5 4, 17 5.5" strokeWidth="1.8" />
      <circle cx="12" cy="17" r="1.6" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 3: Fleur-de-lis Row
function PipingFleurDeLis({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 12 3.5 C 10.8 6.5, 10 9, 12 12.5 C 14 9, 13.2 6.5, 12 3.5 Z" strokeWidth="1.6" />
      <path d="M 10.5 10.5 C 8 9, 5.5 7, 5.5 5 C 5.5 3.5, 7.5 3.5, 8.8 5.8 C 9.8 7.5, 10.2 9.5, 10.5 10.5 Z" strokeWidth="1.5" />
      <path d="M 13.5 10.5 C 16 9, 18.5 7, 18.5 5 C 18.5 3.5, 16.5 3.5, 15.2 5.8 C 14.2 7.5, 13.8 9.5, 13.5 10.5 Z" strokeWidth="1.5" />
      <line x1="7" y1="12.5" x2="17" y2="12.5" strokeWidth="2.2" />
      <path d="M 9.8 13.5 C 10.5 17, 11.5 19.5, 12 20.2 C 12.5 19.5, 13.5 17, 14.2 13.5" strokeWidth="1.6" />
    </BaseCircleIcon>
  );
}

// Variant 4: Shell Border Row
function PipingShellBorderRow({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3 14 C 3 9.5, 7.5 9.5, 7.5 14" strokeWidth="1.8" />
      <path d="M 7.5 14 C 7.5 9.5, 12 9.5, 12 14" strokeWidth="1.8" />
      <path d="M 12 14 C 12 9.5, 16.5 9.5, 16.5 14" strokeWidth="1.8" />
      <path d="M 16.5 14 C 16.5 9.5, 21 9.5, 21 14" strokeWidth="1.8" />
      <line x1="5.25" y1="10.5" x2="5.25" y2="14" strokeWidth="1.2" />
      <line x1="9.75" y1="10.5" x2="9.75" y2="14" strokeWidth="1.2" />
      <line x1="14.25" y1="10.5" x2="14.25" y2="14" strokeWidth="1.2" />
      <line x1="18.75" y1="10.5" x2="18.75" y2="14" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

// Variant 5: Vine and Tendrils
function PipingVineAndTendrils({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3 16 C 7.5 16, 7.5 7, 12 12 C 16.5 17, 16.5 7, 21 7" strokeWidth="2" />
      <path d="M 7.5 12 C 6 9, 5 10.5, 6.8 11.5" strokeWidth="1.5" />
      <path d="M 16.5 12 C 18 15, 19 13.5, 17.2 12.5" strokeWidth="1.5" />
    </BaseCircleIcon>
  );
}

// Variant 6: Interlocking Loop Chain
function PipingLoopChain({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <ellipse cx="8" cy="12" rx="4.5" ry="3" strokeWidth="1.8" />
      <ellipse cx="16" cy="12" rx="4.5" ry="3" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.6" strokeWidth="1.4" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sunshine Play (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Rainbow Arc
function SunshineRainbowArc({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 4 15 A 8 8 0 0 1 20 15" strokeWidth="2" />
      <path d="M 6.5 15 A 5.5 5.5 0 0 1 17.5 15" strokeWidth="1.8" />
      <path d="M 9 15 A 3 3 0 0 1 15 15" strokeWidth="1.6" />
      <circle cx="4" cy="16" r="2" fill="currentColor" />
      <circle cx="20" cy="16" r="2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 2: Cloudy Champ
function SunshineCloudyChamp({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 6 15 C 3.5 15, 2.5 12.5, 4 10.5 C 4 7.5, 7.5 6, 9.8 7.5 C 11.5 5, 15.5 5, 17 7.5 C 19.5 7, 22 9, 21.5 12 C 22.5 14.5, 20.5 16, 18.5 16 Z" strokeWidth="1.8" />
    </BaseCircleIcon>
  );
}

// Variant 3: Star Burst
function SunshineStarBurst({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <polygon points="12,3.5 14.3,8.8 20,9.2 15.8,13 17,18.8 12,15.8 7,18.8 8.2,13 4,9.2 9.7,8.8" strokeWidth="1.6" />
      <circle cx="4.5" cy="5" r="1.2" fill="currentColor" />
      <circle cx="19.5" cy="17" r="1.2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 4: Sky Chumps (cloud + star)
function SunshineSkyChumps({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 4.5 17 C 3 17, 2.5 15, 3.5 13.5 C 3.5 11, 6.5 10, 8 11.2 C 9.2 9.2, 12.5 9.2, 13.8 11.2 C 15.5 11, 17 12.5, 16.5 14.5 C 17.5 16.5, 15.5 17.5, 13.5 17 Z" strokeWidth="1.6" />
      <polygon points="17,3.5 18,6.5 21,6.8 18.8,8.8 19.5,12 17,10.2 14.5,12 15.2,8.8 13,6.8 16,6.5" strokeWidth="1.4" />
    </BaseCircleIcon>
  );
}

// Variant 5: Sunshine Stars (rainbow + star)
function SunshineSunshineStars({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 4 17 A 8 8 0 0 1 20 17" strokeWidth="2" />
      <path d="M 7 17 A 5 5 0 0 1 17 17" strokeWidth="1.8" />
      <polygon points="12,3 13.2,5.8 16.2,6 14,8 14.7,11 12,9.3 9.3,11 10,8 7.8,6 10.8,5.8" strokeWidth="1.4" />
      <circle cx="4.5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="19.5" cy="8" r="1.4" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 6: Starry Sunshine Play (rainbow + cloud + star)
function SunshineStarrySunshinePlay({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 5 17 A 7 7 0 0 1 19 17" strokeWidth="2" />
      <circle cx="4.5" cy="17" r="2.2" fill="currentColor" />
      <polygon points="12,3 13,5.8 16,6 13.8,8 14.5,11 12,9.3 9.5,11 10.2,8 8,6 11,5.8" strokeWidth="1.4" />
      <circle cx="18.5" cy="7.5" r="1.5" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Victorian Lambeth (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Variant 1: Classic (rosette + swag drapes + drop pearls)
function VictorianClassic({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="12" cy="6" r="2.2" strokeWidth="1.6" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <path d="M 3.5 8.5 Q 12 14, 20.5 8.5" strokeWidth="1.8" />
      <path d="M 4 11 Q 12 19, 20 11" strokeWidth="1.8" />
      <circle cx="12" cy="20.5" r="1.3" fill="currentColor" />
      <circle cx="4" cy="11" r="1.1" fill="currentColor" />
      <circle cx="20" cy="11" r="1.1" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 2: No Rosette (swag ropes with pearls, no top rosette)
function VictorianNoRosette({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 6.5 Q 12 12, 20.5 6.5" strokeWidth="1.8" />
      <path d="M 4 10.5 Q 12 16.5, 20 10.5" strokeWidth="1.8" />
      <path d="M 4.5 14 Q 12 20.5, 19.5 14" strokeWidth="1.8" />
      <circle cx="12" cy="21.2" r="1.2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 3: Ropes Only (clean draped swags with anchor pearls)
function VictorianRopesOnly({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 8 Q 12 14.5, 20.5 8" strokeWidth="2" />
      <path d="M 4 11.5 Q 12 18.5, 20 11.5" strokeWidth="2" />
      <circle cx="3.8" cy="8" r="1.3" fill="currentColor" />
      <circle cx="20.2" cy="8" r="1.3" fill="currentColor" />
      <circle cx="12" cy="18.8" r="1.2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 4: No Ropes (rosette crest without lower hanging ropes)
function VictorianNoRopes({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="12" cy="7" r="2.5" strokeWidth="1.8" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" />
      <path d="M 6.5 9 C 8 5, 10.5 5, 12 7.5 C 13.5 5, 16 5, 17.5 9" strokeWidth="1.8" />
      <path d="M 4.5 12.5 Q 12 16.5, 19.5 12.5" strokeWidth="1.8" />
    </BaseCircleIcon>
  );
}

// Variant 5: Double Band (top swag band and bottom swag band)
function VictorianDoubleBand({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 7 Q 12 11.5, 20.5 7" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <path d="M 3.5 14.5 Q 12 19, 20.5 14.5" strokeWidth="1.8" />
      <circle cx="12" cy="19.5" r="1.2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Variant 6: Triple Band (three stacked swag bands)
function VictorianTripleBand({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 6 Q 12 9.5, 20.5 6" strokeWidth="1.8" />
      <path d="M 3.5 11.5 Q 12 15, 20.5 11.5" strokeWidth="1.8" />
      <path d="M 3.5 17 Q 12 20.5, 20.5 17" strokeWidth="1.8" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver Registry
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP = {
  checkeredPattern: {
    wholeCake: CheckeredFullPattern,
    sidesOnly: CheckeredLeftDiagonal,
    xPattern: CheckeredXPattern,
    rightDiagonal: CheckeredRightDiagonal,
    parallelOuter: CheckeredParallelOuter,
    parallelInner: CheckeredParallelInner,
    indexList: [
      CheckeredFullPattern,
      CheckeredLeftDiagonal,
      CheckeredXPattern,
      CheckeredRightDiagonal,
      CheckeredParallelOuter,
      CheckeredParallelInner,
    ],
  },
  trianglePattern: {
    wholeCake: TriangleFullPattern,
    sidesOnly: TriangleLeftDiagonal,
    xPattern: TriangleXPattern,
    rightDiagonal: TriangleRightDiagonal,
    parallelOuter: TriangleParallelOuter,
    parallelInner: TriangleParallelInner,
    indexList: [
      TriangleFullPattern,
      TriangleLeftDiagonal,
      TriangleXPattern,
      TriangleRightDiagonal,
      TriangleParallelOuter,
      TriangleParallelInner,
    ],
  },
  chevronPattern: {
    singleColor: ChevronSingleColor,
    twoTone: ChevronTwoTone,
    threeTone: ChevronThreeTone,
    wideZigzag: ChevronWideZigzag,
    tightZigzag: ChevronTightZigzag,
    singleColorGapped: ChevronSingleColorGapped,
    indexList: [
      ChevronSingleColor,
      ChevronTwoTone,
      ChevronThreeTone,
      ChevronWideZigzag,
      ChevronTightZigzag,
      ChevronSingleColorGapped,
    ],
  },
  scatterPearls: {
    randomScatter: ScatterPearlsRandom,
    diamondGrid: ScatterPearlsDiamondGrid,
    horizontalRows: ScatterPearlsHorizontalRows,
    diamondGridBorder: ScatterPearlsDiamondGridBorder,
    bigPearlsScatter: ScatterPearlsBigScatter,
    smallPearlsScatter: ScatterPearlsSmallScatter,
    indexList: [
      ScatterPearlsRandom,
      ScatterPearlsDiamondGrid,
      ScatterPearlsHorizontalRows,
      ScatterPearlsDiamondGridBorder,
      ScatterPearlsBigScatter,
      ScatterPearlsSmallScatter,
    ],
  },
  pipingScrolls: {
    waveRope: PipingWaveRope,
    pairedScrolls: PipingPairedScrolls,
    fleurDeLisRow: PipingFleurDeLis,
    shellBorderRow: PipingShellBorderRow,
    vineAndTendrils: PipingVineAndTendrils,
    loopChain: PipingLoopChain,
    indexList: [
      PipingWaveRope,
      PipingPairedScrolls,
      PipingFleurDeLis,
      PipingShellBorderRow,
      PipingVineAndTendrils,
      PipingLoopChain,
    ],
  },
  sunshinePlay: {
    rainbowArc: SunshineRainbowArc,
    cloudyChump: SunshineCloudyChamp,
    starBurst: SunshineStarBurst,
    skyChumps: SunshineSkyChumps,
    sunshineStars: SunshineSunshineStars,
    starrySunshinePlay: SunshineStarrySunshinePlay,
    indexList: [
      SunshineRainbowArc,
      SunshineCloudyChamp,
      SunshineStarBurst,
      SunshineSkyChumps,
      SunshineSunshineStars,
      SunshineStarrySunshinePlay,
    ],
  },
  victorianLambeth: {
    classic: VictorianClassic,
    noRosette: VictorianNoRosette,
    ropesOnly: VictorianRopesOnly,
    noRopes: VictorianNoRopes,
    doubleBand: VictorianDoubleBand,
    tripleBand: VictorianTripleBand,
    indexList: [
      VictorianClassic,
      VictorianNoRosette,
      VictorianRopesOnly,
      VictorianNoRopes,
      VictorianDoubleBand,
      VictorianTripleBand,
    ],
  },
};

function getIconComponent(treatmentId, variantId, index = 0) {
  const treatment = ICON_MAP[treatmentId];
  if (!treatment) {
    return CheckeredFullPattern;
  }
  if (variantId && treatment[variantId]) {
    return treatment[variantId];
  }
  if (treatment.indexList && treatment.indexList[index]) {
    return treatment.indexList[index];
  }
  return treatment.indexList[0] || CheckeredFullPattern;
}
