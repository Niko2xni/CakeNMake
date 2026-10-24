import React from 'react';

/**
 * Geometric shape-style vector icons for all CENTER VARIATION designs.
 * Styled in the exact same circular aesthetic as SideDesignIcon and EdgeDesignIcon:
 * viewBox="0 0 24 24", BaseCircleIcon wrapper with outer circle ring,
 * and clean schematic glyphs showing the placement arrangement of toppings on the cake surface.
 */

export default function CenterVariationIcon({ variationId, variantId, index = 0, className = 'w-full h-full' }) {
  const IconComponent = getIconComponent(variantId, index);
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
// Fruit / Topping Glyphs
// ─────────────────────────────────────────────────────────────────────────────

// Strawberry icon: heart/tapered berry silhouette
function BerryGlyph({ cx, cy, r = 2.4, filled = false }) {
  return (
    <path
      d={`M ${cx} ${cy - r} C ${cx + r * 1.1} ${cy - r * 0.9}, ${cx + r * 1.2} ${cy + r * 0.2}, ${cx} ${cy + r * 1.2} C ${cx - r * 1.2} ${cy + r * 0.2}, ${cx - r * 1.1} ${cy - r * 0.9}, ${cx} ${cy - r} Z`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.2"
    />
  );
}

// Blueberry icon: crisp round pearl with small star/crown dot
function BlueberryGlyph({ cx, cy, r = 2.0, filled = false }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="0.6" fill="currentColor" />
    </g>
  );
}

// Mango cube icon: small angled geometric square
function MangoGlyph({ cx, cy, s = 3.6, filled = false }) {
  return (
    <rect
      x={cx - s / 2}
      y={cy - s / 2}
      width={s}
      height={s}
      rx="0.7"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.2"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Center Variation Layout Icons
// ─────────────────────────────────────────────────────────────────────────────

// 1. Single Center / Center Star / Solitary Focal
function SingleCenterIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Central focal berry */}
      <BerryGlyph cx={12} cy={12} r={3.2} filled />
      {/* Cross accent dots / subtle radial petals */}
      <circle cx={12} cy={6.2} r="1.3" fill="currentColor" />
      <circle cx={12} cy={17.8} r="1.3" fill="currentColor" />
      <circle cx={6.2} cy={12} r="1.3" fill="currentColor" />
      <circle cx={17.8} cy={12} r="1.3" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// 2. Duo Center / Center Duo (two side-by-side or paired focal pieces)
function DuoCenterIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={8.5} cy={12} r={2.8} filled />
      <BerryGlyph cx={15.5} cy={12} r={2.8} />
    </BaseCircleIcon>
  );
}

// 3. Trio Cluster / Center Trio (triangle cluster in middle)
function TrioClusterIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={12} cy={8.2} r={2.4} filled />
      <BerryGlyph cx={8} cy={15.2} r={2.4} />
      <BerryGlyph cx={16} cy={15.2} r={2.4} />
      {/* Small center nexus connector */}
      <circle cx={12} cy={13} r="0.8" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// 4. Center Diamond / Diamond Ring (4 points arranged in diamond formation)
function CenterDiamondIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={12} cy={6.5} r={2.2} />
      <BerryGlyph cx={17.5} cy={12} r={2.2} />
      <BerryGlyph cx={12} cy={17.5} r={2.2} />
      <BerryGlyph cx={6.5} cy={12} r={2.2} />
      {/* Diamond inner connecting lines */}
      <path d="M 12 8.7 L 15.3 12 L 12 15.3 L 8.7 12 Z" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
    </BaseCircleIcon>
  );
}

// 5. Crescent Arc / Side Arc (sweeping arc along the perimeter/shoulder)
function CrescentArcIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Crescent curved trajectory line */}
      <path d="M 5.5 15 C 6.5 8, 15 5.5, 18.5 7.5" strokeWidth="1" strokeDasharray="2 1.5" />
      <BerryGlyph cx={5.5} cy={15} r={2.0} />
      <BerryGlyph cx={8.2} cy={10.2} r={2.2} filled />
      <BerryGlyph cx={13} cy={7.2} r={2.2} />
      <BerryGlyph cx={18.2} cy={7.8} r={2.0} />
    </BaseCircleIcon>
  );
}

// 6. Blossom Radial / Floral Radial / Diagonal Sweep
function BlossomRadialIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={12} cy={12} r={2.6} filled />
      {/* S-curve or diagonal blossom arrangement */}
      <BerryGlyph cx={6.2} cy={6.2} r={2.0} />
      <BerryGlyph cx={9.1} cy={9.1} r={1.6} />
      <BerryGlyph cx={14.9} cy={14.9} r={1.6} />
      <BerryGlyph cx={17.8} cy={17.8} r={2.0} />
      <line x1="6.2" y1="6.2" x2="17.8" y2="17.8" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
    </BaseCircleIcon>
  );
}

// 7. Outer Ring / Circle Ring / Full Perimeter Crown
function OuterRingIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx={12} cy={12} r="6.6" strokeWidth="0.8" strokeDasharray="2 2" />
      <BerryGlyph cx={12} cy={5.2} r={1.6} />
      <BerryGlyph cx={16.8} cy={7.2} r={1.6} />
      <BerryGlyph cx={18.8} cy={12} r={1.6} />
      <BerryGlyph cx={16.8} cy={16.8} r={1.6} />
      <BerryGlyph cx={12} cy={18.8} r={1.6} />
      <BerryGlyph cx={7.2} cy={16.8} r={1.6} />
      <BerryGlyph cx={5.2} cy={12} r={1.6} />
      <BerryGlyph cx={7.2} cy={7.2} r={1.6} />
    </BaseCircleIcon>
  );
}

// 8. Four Corners Ring / Petits Fours One-Per-Cake
function FourCornersIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={7.5} cy={7.5} r={2.3} filled />
      <BerryGlyph cx={16.5} cy={7.5} r={2.3} filled />
      <BerryGlyph cx={7.5} cy={16.5} r={2.3} filled />
      <BerryGlyph cx={16.5} cy={16.5} r={2.3} filled />
    </BaseCircleIcon>
  );
}

// 9. Bouquet Cluster / Corner Cluster
function BouquetClusterIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Off-center cluster in upper right corner */}
      <BerryGlyph cx={15.5} cy={7.5} r={2.4} filled />
      <BerryGlyph cx={11.5} cy={7.0} r={2.1} />
      <BerryGlyph cx={16.0} cy={12.0} r={2.1} />
      <BlueberryGlyph cx={11.0} cy={11.5} r={1.7} />
      <MangoGlyph cx={15.0} cy={16.0} s={3.0} />
      <path d="M 6 18 C 9 17, 13 14, 15 11" strokeWidth="1" strokeDasharray="1.5 1.5" />
    </BaseCircleIcon>
  );
}

// 10. Center Cluster / Hex Cluster / Fruit Blossom
function FruitBlossomClusterIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={12} cy={12} r={2.5} filled />
      <circle cx={12} cy={6.5} r="1.5" fill="currentColor" />
      <MangoGlyph cx={16.8} cy={9.5} s={2.6} />
      <BlueberryGlyph cx={16.8} cy={14.5} r={1.5} />
      <circle cx={12} cy={17.5} r="1.5" fill="currentColor" />
      <MangoGlyph cx={7.2} cy={14.5} s={2.6} />
      <BlueberryGlyph cx={7.2} cy={9.5} r={1.5} />
    </BaseCircleIcon>
  );
}

// 11. Tropical Crown / Berry Crown
function CrownIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Crown arch formation */}
      <path d="M 6.5 14.5 L 9 9.5 L 12 12.5 L 15 9.5 L 17.5 14.5 Z" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
      <BerryGlyph cx={9} cy={9.2} r={2.2} filled />
      <BerryGlyph cx={15} cy={9.2} r={2.2} filled />
      <MangoGlyph cx={6.5} cy={15} s={3.0} />
      <BerryGlyph cx={12} cy={14} r={2.0} />
      <MangoGlyph cx={17.5} cy={15} s={3.0} />
    </BaseCircleIcon>
  );
}

// 12. Harvest Ring / Petite Blossom
function HarvestRingIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <BerryGlyph cx={12} cy={6.5} r={2.0} filled />
      <MangoGlyph cx={16.8} cy={9.2} s={2.8} />
      <BlueberryGlyph cx={16.8} cy={14.8} r={1.8} />
      <BerryGlyph cx={12} cy={17.5} r={2.0} filled />
      <MangoGlyph cx={7.2} cy={14.8} s={2.8} />
      <BlueberryGlyph cx={7.2} cy={9.2} r={1.8} />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon Component Selector
// ─────────────────────────────────────────────────────────────────────────────
function getIconComponent(variantId, index) {
  switch (variantId) {
    case 'singleCenter':
    case 'centerpiece':
      return SingleCenterIcon;

    case 'duoCenter':
    case 'duoPair':
      return DuoCenterIcon;

    case 'trioCluster':
    case 'trioCenter':
      return TrioClusterIcon;

    case 'centerDiamond':
      return CenterDiamondIcon;

    case 'crescentArc':
    case 'petiteArc':
      return CrescentArcIcon;

    case 'blossomRadial':
      return BlossomRadialIcon;

    case 'outerRing':
    case 'circleRing':
      return OuterRingIcon;

    case 'fourCorners':
    case 'singlePerCake':
      return FourCornersIcon;

    case 'bouquetCluster':
    case 'quattroCluster':
      return BouquetClusterIcon;

    case 'clusterFive':
    case 'hexCluster':
    case 'blossomCluster':
      return FruitBlossomClusterIcon;

    case 'tropicalCrown':
    case 'berryCrown':
      return CrownIcon;

    case 'harvestRing':
    case 'petiteBlossom':
      return HarvestRingIcon;

    default:
      // Fallback selector by index for any unmapped variations
      const fallbacks = [
        SingleCenterIcon,
        DuoCenterIcon,
        TrioClusterIcon,
        CenterDiamondIcon,
        CrescentArcIcon,
        BlossomRadialIcon,
        OuterRingIcon,
        FourCornersIcon,
        BouquetClusterIcon,
        FruitBlossomClusterIcon,
      ];
      return fallbacks[index % fallbacks.length];
  }
}
