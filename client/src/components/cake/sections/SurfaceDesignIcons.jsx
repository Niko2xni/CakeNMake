import React from 'react';

/**
 * Geometric shape-style vector icons for SURFACE TREATMENT (Glaze) patterns.
 * Faithfully matches the exact cake render silhouettes provided:
 *
 * 1. Long Drips (`longGaps`):
 *    Sharp V-tapered long fingers reaching all the way to the bottom edge.
 *    Wide triangular negative gaps between them.
 *
 * 2. Long & Short Drips (`longShortAlt`):
 *    Alternating deep fingers reaching to the bottom and shorter tapered drips stopping halfway.
 *
 * 3. Short Drips (`shortDrips`):
 *    Even, mid-length V-tapered drips hanging evenly down to about half-height with rounded tips.
 *
 * 4. Full Coverage (`longWave`):
 *    Deep blanket covering nearly the entire cake body, terminating with a soft rolling scallop wave at the bottom.
 *
 * 5. Mid Coverage (`midWave`):
 *    Glaze blanket extending down to roughly the middle with a smooth undulating wave edge.
 *
 * 6. Short Coverage (`shortWave`):
 *    Shallow glaze cap sitting near the top rim with a gentle scalloped wave edge.
 *
 * Petit Fours variants:
 * 7. Tear Fall (`unevenCombo`): Organic flowing teardrop drips.
 * 8. Wave Curve (`tinyTip`): Scalloped undulating wave edge.
 */

export default function SurfaceDesignIcon({ patternId, className = 'w-full h-full' }) {
  const IconComponent = getIconComponent(patternId);
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

// 1. Long Drips (longGaps): Sharp elongated V-tapered fingers reaching the bottom base, wide inverted triangular gaps
export function GlazeLongGapsIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Top rim reference */}
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      {/* Long sharp V-drips silhouette */}
      <path
        d="M 3.2 5.2 H 20.8 V 7.5 L 18.8 19.5 L 16.8 7.5 L 12 20.2 L 7.2 7.5 L 5.2 19.5 L 3.2 7.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </BaseCircleIcon>
  );
}

// 2. Long & Short Drips (longShortAlt): Alternating tall fingers reaching the bottom and shorter mid drips
export function GlazeLongShortAltIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 7.5 L 19.2 14 L 17.5 7.5 L 12 20.2 L 6.5 7.5 L 4.8 14 L 3.2 7.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </BaseCircleIcon>
  );
}

// 3. Short Drips (shortDrips): Even ring of mid-length V-tapered drips stopping at mid-body with rounded tips
export function GlazeShortDripsIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 7.5 C 20 7.5, 19.2 13.8, 17.8 13.8 C 16.4 13.8, 15.6 7.5, 14.8 7.5 C 14 7.5, 13.2 14.5, 12 14.5 C 10.8 14.5, 10 7.5, 9.2 7.5 C 8.4 7.5, 7.6 13.8, 6.2 13.8 C 4.8 13.8, 4 7.5, 3.2 7.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </BaseCircleIcon>
  );
}

// 4. Full Coverage (longWave): Deep coating blanketing cake down to near bottom with soft rolling scalloped wave edge
export function GlazeLongWaveIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 17 C 19.3 19, 17.7 17.2, 16.2 17.2 C 14.7 17.2, 13.5 19.2, 12 19.2 C 10.5 19.2, 9.3 17.2, 7.8 17.2 C 6.3 17.2, 4.7 19, 3.2 17 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.24"
      />
    </BaseCircleIcon>
  );
}

// 5. Mid Coverage (midWave): Blanket extending halfway down the cake with smooth undulating scalloped wave edge
export function GlazeMidWaveIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 12 C 19.3 14, 17.7 11.8, 16.2 11.8 C 14.7 11.8, 13.5 14.2, 12 14.2 C 10.5 14.2, 9.3 11.8, 7.8 11.8 C 6.3 11.8, 4.7 14, 3.2 12 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </BaseCircleIcon>
  );
}

// 6. Short Coverage (shortWave): Shallow cap near top with subtle undulating scalloped wave edge
export function GlazeShortWaveIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 8.5 C 19.3 10.2, 17.7 8.5, 16.2 8.5 C 14.7 8.5, 13.5 10.4, 12 10.4 C 10.5 10.4, 9.3 8.5, 7.8 8.5 C 6.3 8.5, 4.7 10.2, 3.2 8.5 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </BaseCircleIcon>
  );
}

// 7. Tear Fall (unevenCombo - Petit Fours): Organic flowing ganache with varied teardrops
export function GlazeUnevenComboIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 7 C 19.5 7, 19.2 13, 18 13 C 17 13, 16.5 18.5, 15.2 18.5 C 14 18.5, 13.6 10, 12.5 10 C 11.5 10, 11 16, 9.8 16 C 8.6 16, 8.2 9, 7 9 C 5.8 9, 5.2 14.5, 4.2 14.5 C 3.8 14.5, 3.2 12, 3.2 12 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.22"
      />
      <circle cx="15.2" cy="18" r="1.1" fill="currentColor" />
      <circle cx="9.8" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="4.2" cy="14" r="0.8" fill="currentColor" />
    </BaseCircleIcon>
  );
}

// 8. Wave Curve (tinyTip - Petit Fours): Undulating scalloped wave edge cap
export function GlazeTinyTipIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2" strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.4" />
      <path
        d="M 3.2 5.2 H 20.8 V 9 C 19 11.5, 17 9, 15.5 11.5 C 14 13.8, 12 9.5, 10.5 11.5 C 9 13.5, 7 9.5, 5.5 11.5 C 4.5 12.5, 3.8 10, 3.2 10 Z"
        strokeWidth="1.3"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </BaseCircleIcon>
  );
}

function getIconComponent(patternId) {
  switch (patternId) {
    case 'longGaps':
      return GlazeLongGapsIcon;
    case 'longShortAlt':
      return GlazeLongShortAltIcon;
    case 'shortDrips':
      return GlazeShortDripsIcon;
    case 'longWave':
      return GlazeLongWaveIcon;
    case 'midWave':
      return GlazeMidWaveIcon;
    case 'shortWave':
      return GlazeShortWaveIcon;
    case 'unevenCombo':
      return GlazeUnevenComboIcon;
    case 'tinyTip':
      return GlazeTinyTipIcon;
    default:
      return GlazeLongGapsIcon;
  }
}
