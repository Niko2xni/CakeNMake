import React from 'react';

/**
 * Geometric shape-style vector icons for FILLING section piping designs:
 * - None (Smooth flat spread filling layer between sponges)
 * - Mashed Circles (Tight row of pressed overlapping rounded dollops with specular highlight)
 * - Mashed Swirls (Mashed Circles with diagonal spiral slash groove pattern across each bump)
 *
 * Drawn in the exact same circular aesthetic as SideDesignIcons and EdgeDesignIcons.
 */

export default function FillingDesignIcon({ designId, className = 'w-full h-full' }) {
  const IconComponent = getIconComponent(designId);
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

// 1. None: Flat filling layer between sponge guides with a clean slash
export function FillingNoneIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Top sponge slab guide line */}
      <line x1="3.5" y1="7.2" x2="20.5" y2="7.2" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* Bottom sponge slab guide line */}
      <line x1="3.5" y1="16.8" x2="20.5" y2="16.8" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* Smooth flat filling band */}
      <rect x="3.5" y="9.8" width="17" height="4.4" rx="0.8" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      {/* None strike slash */}
      <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" strokeWidth="1.5" />
    </BaseCircleIcon>
  );
}

// 2. Mashed Circles: 3 overlapping round dollops pressed together with crescent specular highlight
export function FillingMashedCirclesIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Top sponge slab guide line */}
      <line x1="3.5" y1="7.2" x2="20.5" y2="7.2" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* Bottom sponge slab guide line */}
      <line x1="3.5" y1="16.8" x2="20.5" y2="16.8" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* 3 mashed round piped dollops overlapping edge-to-edge */}
      <circle cx="6.5" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      <circle cx="12" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      <circle cx="17.5" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      {/* Crescent specular highlights on top-left of each circle */}
      <path d="M 5.2 10.4 A 2.2 2.2 0 0 1 7.4 9.2" strokeWidth="1.3" />
      <path d="M 10.7 10.4 A 2.2 2.2 0 0 1 12.9 9.2" strokeWidth="1.3" />
      <path d="M 16.2 10.4 A 2.2 2.2 0 0 1 18.4 9.2" strokeWidth="1.3" />
    </BaseCircleIcon>
  );
}

// 3. Mashed Swirls: Mashed Circles with diagonal spiral slash groove pattern across each bump
export function FillingMashedSwirlsIcon({ className }) {
  return (
    <BaseCircleIcon className={className}>
      {/* Top sponge slab guide line */}
      <line x1="3.5" y1="7.2" x2="20.5" y2="7.2" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* Bottom sponge slab guide line */}
      <line x1="3.5" y1="16.8" x2="20.5" y2="16.8" strokeWidth="1.2" strokeDasharray="1.5 1.5" opacity="0.6" />
      {/* 3 mashed round piped dollops */}
      <circle cx="6.5" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      <circle cx="12" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      <circle cx="17.5" cy="12" r="3.3" strokeWidth="1.4" fill="currentColor" fillOpacity="0.14" />
      {/* Diagonal spiral slashes across each dollop bump */}
      <line x1="5.1" y1="13.7" x2="7.9" y2="10.3" strokeWidth="1.2" />
      <line x1="6.1" y1="14.5" x2="8.7" y2="11.5" strokeWidth="1.2" />
      <line x1="10.6" y1="13.7" x2="13.4" y2="10.3" strokeWidth="1.2" />
      <line x1="11.6" y1="14.5" x2="14.2" y2="11.5" strokeWidth="1.2" />
      <line x1="16.1" y1="13.7" x2="18.9" y2="10.3" strokeWidth="1.2" />
      <line x1="17.1" y1="14.5" x2="19.7" y2="11.5" strokeWidth="1.2" />
    </BaseCircleIcon>
  );
}

function getIconComponent(designId) {
  const normalized = String(designId || '').toLowerCase();
  if (normalized === 'mashedswirls' || normalized.includes('swirl')) {
    return FillingMashedSwirlsIcon;
  }
  if (normalized === 'mashedcircles' || normalized.includes('circle')) {
    return FillingMashedCirclesIcon;
  }
  return FillingNoneIcon;
}
