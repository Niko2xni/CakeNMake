import React from 'react';

/**
 * Geometric shape-style vector icons for all EDGE section designs.
 * Expanded to overtake the whole circular button for maximum visibility and clarity.
 */

export default function EdgeDesignIcon({ variantId, index = 0, className = 'w-full h-full' }) {
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
// 1. Border Piping (12 variants: 6 Solid + 6 Alternating)
// ─────────────────────────────────────────────────────────────────────────────

// Shell Border
function ShellBorder({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 13.5 C 3.5 8.5, 8.5 8.5, 9.5 13.5" strokeWidth="1.8" />
      <path d="M 9.5 13.5 C 9.5 8.5, 14.5 8.5, 15.5 13.5" strokeWidth="1.8" />
      <path d="M 15.5 13.5 C 15.5 8.5, 20 8.5, 20.5 13.5" strokeWidth="1.8" />
      <line x1="6.5" y1="10" x2="6.5" y2="13.5" strokeWidth="1.2" />
      <line x1="12.5" y1="10" x2="12.5" y2="13.5" strokeWidth="1.2" />
      <line x1="18" y1="10" x2="18" y2="13.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

// Reverse Shell
function ReverseShell({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 10.5 C 6.5 6.5, 8.5 15.5, 12 10.5 C 15.5 6.5, 17.5 15.5, 20.5 10.5" strokeWidth="2" />
      <path d="M 3.5 13.5 C 6.5 9.5, 8.5 18.5, 12 13.5 C 15.5 9.5, 17.5 18.5, 20.5 13.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

// Bead Piping
function BeadPiping({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="5" cy="12" r="2.2" strokeWidth="1.6" />
      <circle cx="9.7" cy="12" r="2.2" strokeWidth="1.6" />
      <circle cx="14.3" cy="12" r="2.2" strokeWidth="1.6" />
      <circle cx="19" cy="12" r="2.2" strokeWidth="1.6" />
    </BaseCircleIcon>
  );
}

// Rope Twist
function RopeTwist({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="4" y1="15" x2="8" y2="9" strokeWidth="2.5" />
      <line x1="8.5" y1="15" x2="12.5" y2="9" strokeWidth="2.5" />
      <line x1="13" y1="15" x2="17" y2="9" strokeWidth="2.5" />
      <line x1="17.5" y1="15" x2="20" y2="11.2" strokeWidth="2.5" />
      <path d="M 3 15.5 Q 12 17.5, 21 15.5" strokeWidth="1" strokeDasharray="1 1.5" />
    </BaseCircleIcon>
  );
}

// Rope Twist Classic
function RopeTwistClassic({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3 12 C 5 6.5, 8.5 6.5, 11 12 C 13.5 17.5, 17 17.5, 19.5 12 C 20.5 9.5, 21.5 9.5, 22 12" strokeWidth="2.2" />
      <path d="M 3 13.5 C 5 8, 8.5 8, 11 13.5 C 13.5 19, 17 19, 19.5 13.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

// Elongated Shell Border
function ElongatedShellBorder({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 13 C 5.5 7.5, 11 7.5, 12 13 C 14 7.5, 19.5 7.5, 20.5 13" strokeWidth="2" />
      <path d="M 8.5 9.5 L 9.5 13" strokeWidth="1.4" />
      <path d="M 17 9.5 L 18 13" strokeWidth="1.4" />
    </BaseCircleIcon>
  );
}

// Alternating Border Piping (7-12)
function ShellBorderAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 13.5 C 3.5 8.5, 8.5 8.5, 9.5 13.5" strokeWidth="1.8" />
      <path d="M 9.5 13.5 C 9.5 8.5, 14.5 8.5, 15.5 13.5" strokeWidth="1.8" strokeDasharray="2 1.5" />
      <path d="M 15.5 13.5 C 15.5 8.5, 20 8.5, 20.5 13.5" strokeWidth="1.8" />
      <line x1="6.5" y1="10" x2="6.5" y2="13.5" strokeWidth="1.2" />
      <line x1="18" y1="10" x2="18" y2="13.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

function ReverseShellAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 10.5 C 6.5 6.5, 8.5 15.5, 12 10.5" strokeWidth="2" />
      <path d="M 12 10.5 C 15.5 6.5, 17.5 15.5, 20.5 10.5" strokeWidth="2" strokeDasharray="2 1.5" />
      <path d="M 3.5 13.5 C 6.5 9.5, 8.5 18.5, 12 13.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

function BeadPipingAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="5" cy="12" r="2.2" fill="currentColor" />
      <circle cx="9.7" cy="12" r="2.2" strokeWidth="1.6" />
      <circle cx="14.3" cy="12" r="2.2" fill="currentColor" />
      <circle cx="19" cy="12" r="2.2" strokeWidth="1.6" />
    </BaseCircleIcon>
  );
}

function RopeTwistAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="4" y1="15" x2="8" y2="9" strokeWidth="2.5" />
      <line x1="8.5" y1="15" x2="12.5" y2="9" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
      <line x1="13" y1="15" x2="17" y2="9" strokeWidth="2.5" />
      <line x1="17.5" y1="15" x2="20" y2="11.2" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
    </BaseCircleIcon>
  );
}

function RopeTwistClassicAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3 12 C 5 6.5, 8.5 6.5, 11 12" strokeWidth="2.2" />
      <path d="M 11 12 C 13.5 17.5, 17 17.5, 19.5 12" strokeWidth="2.2" strokeDasharray="2 1.5" />
    </BaseCircleIcon>
  );
}

function ElongatedShellBorderAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <path d="M 3.5 13 C 5.5 7.5, 11 7.5, 12 13" strokeWidth="2" />
      <path d="M 12 13 C 14 7.5, 19.5 7.5, 20.5 13" strokeWidth="2" strokeDasharray="2.5 1.5" />
      <path d="M 8.5 9.5 L 9.5 13" strokeWidth="1.4" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Beaded Trim (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Standard Beaded Trim
function BeadedTrim({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <circle cx="9.7" cy="12" r="2" fill="currentColor" />
      <circle cx="14.3" cy="12" r="2" fill="currentColor" />
      <circle cx="19" cy="12" r="2" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Petite Beaded Trim (many small beads)
function BeadedTrimPetite({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="4.2" cy="12" r="1.3" fill="currentColor" />
      <circle cx="7.3" cy="12" r="1.3" fill="currentColor" />
      <circle cx="10.4" cy="12" r="1.3" fill="currentColor" />
      <circle cx="13.6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="16.7" cy="12" r="1.3" fill="currentColor" />
      <circle cx="19.8" cy="12" r="1.3" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Grand Beaded Trim (large beads)
function BeadedTrimGrand({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="6" cy="12" r="2.8" fill="currentColor" />
      <circle cx="12" cy="12" r="2.8" fill="currentColor" />
      <circle cx="18" cy="12" r="2.8" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Morse Dot-Dash-Dot
function BeadedTrimMorseDotDashDot({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <rect x="8.5" y="10.4" width="7" height="3.2" rx="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Morse Alternating (Dot - Dash - Dot - Dash)
function BeadedTrimMorseDotDash({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="4.5" cy="12" r="1.6" fill="currentColor" />
      <rect x="7.5" y="10.5" width="4.5" height="3" rx="1.5" fill="currentColor" />
      <circle cx="14" cy="12" r="1.6" fill="currentColor" />
      <rect x="17" y="10.5" width="4.5" height="3" rx="1.5" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Morse Double-Dot Dash (Dot - Dot - Dash)
function BeadedTrimMorseDotDotDash({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <circle cx="4.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="8.5" cy="12" r="1.6" fill="currentColor" />
      <rect x="12" y="10.5" width="5.5" height="3" rx="1.5" fill="currentColor" />
      <circle cx="19.5" cy="12" r="1.6" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dollops (24 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Helper: Star Dollop Shape
function StarDollopShape({ cx, cy, r = 3, filled = false }) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.48;
    points.push(`${cx + Math.cos(angle) * rad},${cy + Math.sin(angle) * rad}`);
  }
  return <polygon points={points.join(' ')} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />;
}

// Helper: Round Dollop Shape
function RoundDollopShape({ cx, cy, r = 2.8, filled = false }) {
  return (
    <path
      d={`M ${cx - r} ${cy + r * 0.5} C ${cx - r} ${cy - r * 0.5}, ${cx - r * 0.4} ${cy - r}, ${cx} ${cy - r * 1.3} C ${cx + r * 0.4} ${cy - r}, ${cx + r} ${cy - r * 0.5}, ${cx + r} ${cy + r * 0.5} Z`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.3"
    />
  );
}

// Helper: Cherry topper
function CherryTopper({ cx, cy }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="1.6" fill="currentColor" />
      <path d={`M ${cx} ${cy - 1.4} Q ${cx + 1.2} ${cy - 3.2}, ${cx + 2.5} ${cy - 2.5}`} stroke="currentColor" strokeWidth="1" />
    </g>
  );
}

// Continuous Star Dollop
function StarDollopContinuous({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={6} cy={12} r={2.8} />
      <StarDollopShape cx={12} cy={12} r={2.8} />
      <StarDollopShape cx={18} cy={12} r={2.8} />
    </BaseCircleIcon>
  );
}

// Star Dollop (2 spaced)
function StarDollop({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={8} cy={12} r={3.2} />
      <StarDollopShape cx={16} cy={12} r={3.2} />
    </BaseCircleIcon>
  );
}

// Sparse Star Dollop (1 prominent)
function StarDollopSparse({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={12} cy={12} r={4.5} />
    </BaseCircleIcon>
  );
}

// Continuous Round Dollop
function RoundDollopContinuous({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={6} cy={12} r={2.5} />
      <RoundDollopShape cx={12} cy={12} r={2.5} />
      <RoundDollopShape cx={18} cy={12} r={2.5} />
    </BaseCircleIcon>
  );
}

// Round Dollop (2 spaced)
function RoundDollopMedium({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={8} cy={12} r={3} />
      <RoundDollopShape cx={16} cy={12} r={3} />
    </BaseCircleIcon>
  );
}

// Sparse Round Dollop (1 prominent)
function RoundDollopSparse({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={12} cy={12} r={4.2} />
    </BaseCircleIcon>
  );
}

// With Cherry (7-12)
function StarDollopContinuousCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={6} cy={13.5} r={2.4} />
      <StarDollopShape cx={12} cy={13.5} r={2.4} />
      <StarDollopShape cx={18} cy={13.5} r={2.4} />
      <CherryTopper cx={12} cy={9} />
    </BaseCircleIcon>
  );
}

function StarDollopCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={8} cy={13.5} r={3} />
      <StarDollopShape cx={16} cy={13.5} r={3} />
      <CherryTopper cx={8} cy={8.5} />
      <CherryTopper cx={16} cy={8.5} />
    </BaseCircleIcon>
  );
}

function StarDollopSparseCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={12} cy={13.5} r={3.8} />
      <CherryTopper cx={12} cy={7.5} />
    </BaseCircleIcon>
  );
}

function RoundDollopContinuousCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={6} cy={13.5} r={2.4} />
      <RoundDollopShape cx={12} cy={13.5} r={2.4} />
      <RoundDollopShape cx={18} cy={13.5} r={2.4} />
      <CherryTopper cx={12} cy={9} />
    </BaseCircleIcon>
  );
}

function RoundDollopMediumCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={8} cy={13.5} r={2.8} />
      <RoundDollopShape cx={16} cy={13.5} r={2.8} />
      <CherryTopper cx={8} cy={8.8} />
      <CherryTopper cx={16} cy={8.8} />
    </BaseCircleIcon>
  );
}

function RoundDollopSparseCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={12} cy={13.5} r={3.8} />
      <CherryTopper cx={12} cy={7.5} />
    </BaseCircleIcon>
  );
}

// Alternating (13-18)
function StarDollopContinuousAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={6} cy={12} r={2.8} filled />
      <StarDollopShape cx={12} cy={12} r={2.8} />
      <StarDollopShape cx={18} cy={12} r={2.8} filled />
    </BaseCircleIcon>
  );
}

function StarDollopAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={8} cy={12} r={3.2} filled />
      <StarDollopShape cx={16} cy={12} r={3.2} />
    </BaseCircleIcon>
  );
}

function StarDollopSparseAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={12} cy={12} r={4.5} />
      <path d="M 8.5 8.5 L 15.5 15.5" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
    </BaseCircleIcon>
  );
}

function RoundDollopContinuousAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={6} cy={12} r={2.5} filled />
      <RoundDollopShape cx={12} cy={12} r={2.5} />
      <RoundDollopShape cx={18} cy={12} r={2.5} filled />
    </BaseCircleIcon>
  );
}

function RoundDollopMediumAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={8} cy={12} r={3} filled />
      <RoundDollopShape cx={16} cy={12} r={3} />
    </BaseCircleIcon>
  );
}

function RoundDollopSparseAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={12} cy={12} r={4.2} />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// Alternating with Cherry (19-24)
function StarDollopContinuousAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={6} cy={13.5} r={2.4} filled />
      <StarDollopShape cx={12} cy={13.5} r={2.4} />
      <StarDollopShape cx={18} cy={13.5} r={2.4} filled />
      <CherryTopper cx={12} cy={9} />
    </BaseCircleIcon>
  );
}

function StarDollopAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={8} cy={13.5} r={3} filled />
      <StarDollopShape cx={16} cy={13.5} r={3} />
      <CherryTopper cx={8} cy={8.5} />
      <CherryTopper cx={16} cy={8.5} />
    </BaseCircleIcon>
  );
}

function StarDollopSparseAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <StarDollopShape cx={12} cy={13.5} r={3.8} />
      <CherryTopper cx={12} cy={7.5} />
      <circle cx="12" cy="13.5" r="1.5" fill="currentColor" />
    </BaseCircleIcon>
  );
}

function RoundDollopContinuousAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={6} cy={13.5} r={2.4} filled />
      <RoundDollopShape cx={12} cy={13.5} r={2.4} />
      <RoundDollopShape cx={18} cy={13.5} r={2.4} filled />
      <CherryTopper cx={12} cy={9} />
    </BaseCircleIcon>
  );
}

function RoundDollopMediumAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={8} cy={13.5} r={2.8} filled />
      <RoundDollopShape cx={16} cy={13.5} r={2.8} />
      <CherryTopper cx={8} cy={8.8} />
      <CherryTopper cx={16} cy={8.8} />
    </BaseCircleIcon>
  );
}

function RoundDollopSparseAltCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RoundDollopShape cx={12} cy={13.5} r={3.8} />
      <CherryTopper cx={12} cy={7.5} />
      <circle cx="12" cy="13.5" r="1.5" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Whipped Cream Rosettes (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

function RosetteShape({ cx, cy, r = 3, filled = false }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" />
      <path
        d={`M ${cx} ${cy - r * 0.6} C ${cx + r * 0.6} ${cy - r * 0.3}, ${cx + r * 0.6} ${cy + r * 0.4}, ${cx} ${cy + r * 0.4} C ${cx - r * 0.5} ${cy + r * 0.4}, ${cx - r * 0.4} ${cy - r * 0.2}, ${cx} ${cy}`}
        fill="none"
        stroke={filled ? 'white' : 'currentColor'}
        strokeWidth="1.1"
      />
    </g>
  );
}

// Continuous Whipped Cream Rosettes
function WhippedCreamRosetteContinuous({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={6} cy={12} r={2.8} />
      <RosetteShape cx={12} cy={12} r={2.8} />
      <RosetteShape cx={18} cy={12} r={2.8} />
    </BaseCircleIcon>
  );
}

// Spaced Whipped Cream Rosettes
function WhippedCreamRosette({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={8} cy={12} r={3.5} />
      <RosetteShape cx={16} cy={12} r={3.5} />
    </BaseCircleIcon>
  );
}

// Alternating Continuous
function WhippedCreamRosetteContinuousAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={6} cy={12} r={2.8} filled />
      <RosetteShape cx={12} cy={12} r={2.8} />
      <RosetteShape cx={18} cy={12} r={2.8} filled />
    </BaseCircleIcon>
  );
}

// Alternating Spaced
function WhippedCreamRosetteAlt({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={8} cy={12} r={3.5} filled />
      <RosetteShape cx={16} cy={12} r={3.5} />
    </BaseCircleIcon>
  );
}

// Continuous with Cherry
function WhippedCreamRosetteContinuousCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={6} cy={13.5} r={2.5} />
      <RosetteShape cx={12} cy={13.5} r={2.5} />
      <RosetteShape cx={18} cy={13.5} r={2.5} />
      <CherryTopper cx={12} cy={9} />
    </BaseCircleIcon>
  );
}

// Spaced with Cherry
function WhippedCreamRosetteCherry({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <RosetteShape cx={8} cy={13.5} r={3.2} />
      <RosetteShape cx={16} cy={13.5} r={3.2} />
      <CherryTopper cx={8} cy={8.5} />
      <CherryTopper cx={16} cy={8.5} />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Edible Delicates (6 variants)
// ─────────────────────────────────────────────────────────────────────────────

// Hershey's Kiss Silhouette
function HersheyKissShape({ cx, cy, s = 1 }) {
  return (
    <g>
      {/* Plume ribbon */}
      <path
        d={`M ${cx} ${cy - 4.5 * s} Q ${cx + 2.5 * s} ${cy - 7 * s}, ${cx + 1.5 * s} ${cy - 8.5 * s}`}
        stroke="currentColor"
        strokeWidth="1.1"
      />
      {/* Teardrop kiss */}
      <path
        d={`M ${cx} ${cy - 4.5 * s} C ${cx + 2 * s} ${cy - 1 * s}, ${cx + 4 * s} ${cy + 1.5 * s}, ${cx + 3.8 * s} ${cy + 3.8 * s} C ${cx + 3.5 * s} ${cy + 4.8 * s}, ${cx - 3.5 * s} ${cy + 4.8 * s}, ${cx - 3.8 * s} ${cy + 3.8 * s} C ${cx - 4 * s} ${cy + 1.5 * s}, ${cx - 2 * s} ${cy - 1 * s}, ${cx} ${cy - 4.5 * s} Z`}
        fill="currentColor"
      />
    </g>
  );
}

// Ferrero Rocher Truffle Silhouette
function FerreroRocherShape({ cx, cy, r = 3.6 }) {
  return (
    <g>
      {/* Ruffled gold cup base */}
      <path
        d={`M ${cx - r * 1.1} ${cy + r * 0.4} L ${cx - r * 0.8} ${cy + r * 1.1} L ${cx + r * 0.8} ${cy + r * 1.1} L ${cx + r * 1.1} ${cy + r * 0.4} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {/* Textured chocolate hazelnut ball */}
      <circle cx={cx} cy={cy - r * 0.1} r={r * 0.85} stroke="currentColor" strokeWidth="1.3" />
      <circle cx={cx - 1} cy={cy - 1.2} r="0.6" fill="currentColor" />
      <circle cx={cx + 1.2} cy={cy - 0.5} r="0.6" fill="currentColor" />
      <circle cx={cx} cy={cy + 1} r="0.6" fill="currentColor" />
    </g>
  );
}

// Cherry with leaf
function CherryShape({ cx, cy, r = 2.4 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" />
      {/* Stem */}
      <path d={`M ${cx} ${cy - r} Q ${cx + 2} ${cy - r - 3}, ${cx + 3.5} ${cy - r - 4.5}`} stroke="currentColor" strokeWidth="1.2" />
      {/* Leaf */}
      <path
        d={`M ${cx + 2.5} ${cy - r - 3.5} Q ${cx + 4.5} ${cy - r - 4}, ${cx + 5} ${cy - r - 2.5} Q ${cx + 3.5} ${cy - r - 2.5}, ${cx + 2.5} ${cy - r - 3.5} Z`}
        fill="currentColor"
      />
    </g>
  );
}

// 1. Hershey's Kisses Rim
function HersheysKissRim({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <HersheyKissShape cx={7} cy={12} s={0.8} />
      <HersheyKissShape cx={16} cy={12} s={0.8} />
    </BaseCircleIcon>
  );
}

// 2. Hershey and Ferrero
function HersheysKissRimSparse({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <HersheyKissShape cx={7} cy={12} s={0.8} />
      <FerreroRocherShape cx={16} cy={12} r={3.2} />
    </BaseCircleIcon>
  );
}

// 3. Ferrero Rocher Rim
function FerreroRocherRim({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <FerreroRocherShape cx={7.5} cy={12} r={3.2} />
      <FerreroRocherShape cx={16.5} cy={12} r={3.2} />
    </BaseCircleIcon>
  );
}

// 4. Ferrero and Cherry
function FerreroRocherRimSparse({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <FerreroRocherShape cx={7.5} cy={12} r={3.2} />
      <CherryShape cx={16} cy={13} r={2.4} />
    </BaseCircleIcon>
  );
}

// 5. Cherry Rim
function CherryRim({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <CherryShape cx={8} cy={13} r={2.5} />
      <CherryShape cx={16} cy={13} r={2.5} />
    </BaseCircleIcon>
  );
}

// 6. Cherry and Hershey
function CherryRimSparse({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <CherryShape cx={7.5} cy={13} r={2.4} />
      <HersheyKissShape cx={16.5} cy={12} s={0.8} />
    </BaseCircleIcon>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver Registry
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_ICON_MAP = {
  // Border Piping
  shell: ShellBorder,
  reverseShell: ReverseShell,
  bead: BeadPiping,
  ropeTwist: RopeTwist,
  ropeTwistClassic: RopeTwistClassic,
  elongatedShell: ElongatedShellBorder,
  shellAlt: ShellBorderAlt,
  reverseShellAlt: ReverseShellAlt,
  beadAlt: BeadPipingAlt,
  ropeTwistAlt: RopeTwistAlt,
  ropeTwistClassicAlt: RopeTwistClassicAlt,
  elongatedShellAlt: ElongatedShellBorderAlt,

  // Beaded Trim
  beadedTrim: BeadedTrim,
  beadedTrimPetite: BeadedTrimPetite,
  beadedTrimGrand: BeadedTrimGrand,
  beadedTrimMorseDotDashDot: BeadedTrimMorseDotDashDot,
  beadedTrimMorseDotDash: BeadedTrimMorseDotDash,
  beadedTrimMorseDotDotDash: BeadedTrimMorseDotDotDash,

  // Dollops
  starDollopContinuous: StarDollopContinuous,
  starDollop: StarDollop,
  starDollopSparse: StarDollopSparse,
  roundDollop: RoundDollopContinuous,
  roundDollopMedium: RoundDollopMedium,
  roundDollopSparse: RoundDollopSparse,

  starDollopContinuousCherry: StarDollopContinuousCherry,
  starDollopCherry: StarDollopCherry,
  starDollopSparseCherry: StarDollopSparseCherry,
  roundDollopCherry: RoundDollopContinuousCherry,
  roundDollopMediumCherry: RoundDollopMediumCherry,
  roundDollopSparseCherry: RoundDollopSparseCherry,

  starDollopContinuousAlt: StarDollopContinuousAlt,
  starDollopAlt: StarDollopAlt,
  starDollopSparseAlt: StarDollopSparseAlt,
  roundDollopAlt: RoundDollopContinuousAlt,
  roundDollopMediumAlt: RoundDollopMediumAlt,
  roundDollopSparseAlt: RoundDollopSparseAlt,

  starDollopContinuousAltCherry: StarDollopContinuousAltCherry,
  starDollopAltCherry: StarDollopAltCherry,
  starDollopSparseAltCherry: StarDollopSparseAltCherry,
  roundDollopAltCherry: RoundDollopContinuousAltCherry,
  roundDollopMediumAltCherry: RoundDollopMediumAltCherry,
  roundDollopSparseAltCherry: RoundDollopSparseAltCherry,

  // Whipped Cream Rosettes
  whippedCreamRosetteContinuous: WhippedCreamRosetteContinuous,
  whippedCreamRosette: WhippedCreamRosette,
  whippedCreamRosetteContinuousAlt: WhippedCreamRosetteContinuousAlt,
  whippedCreamRosetteAlt: WhippedCreamRosetteAlt,
  whippedCreamRosetteContinuousCherry: WhippedCreamRosetteContinuousCherry,
  whippedCreamRosetteCherry: WhippedCreamRosetteCherry,

  // Edible Delicates
  hersheysKissRim: HersheysKissRim,
  hersheysKissRimSparse: HersheysKissRimSparse,
  ferreroRocherRim: FerreroRocherRim,
  ferreroRocherRimSparse: FerreroRocherRimSparse,
  cherryRim: CherryRim,
  cherryRimSparse: CherryRimSparse,
};

function getIconComponent(variantId, index = 0) {
  if (variantId && EDGE_ICON_MAP[variantId]) {
    return EDGE_ICON_MAP[variantId];
  }
  return ShellBorder;
}
