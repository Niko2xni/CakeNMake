import React from 'react';

/**
 * Section Header Icons for Fundamentals tab:
 * - Sponge Flavor (1st image): Clean sponge cylinder with top oval/ellipse and vertical sides
 * - Filling (2nd image): 3 isometric diamond layer plates stacked vertically
 * - Exterior Finish (3rd image): Cake cylinder with a 3D isometric cut wedge piece removed
 * - Surface Treatment (4th image): Cake cylinder with deep rounded flowing drips dripping down the front
 */

function BaseIconSvg({ children, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// 1. Sponge Flavor: A clean sponge cake cylinder (top oval ellipse + vertical sides + bottom curved base)
export function SpongeFlavorSectionIcon({ className = 'w-4 h-4' }) {
  return (
    <BaseIconSvg className={className}>
      {/* Top ellipse */}
      <ellipse cx="12" cy="6" rx="9" ry="3.2" strokeWidth="1.8" />
      {/* Side walls */}
      <path d="M 3 6 V 18 C 3 19.8 7 21.2 12 21.2 C 17 21.2 21 19.8 21 18 V 6" strokeWidth="1.8" />
    </BaseIconSvg>
  );
}

// 2. Filling: 3 stacked isometric diamond layer plates (chevron/diamond layers)
export function FillingSectionIcon({ className = 'w-4 h-4' }) {
  return (
    <BaseIconSvg className={className}>
      {/* Top layer diamond */}
      <path d="M 12 2.5 L 21.5 7 L 12 11.5 L 2.5 7 Z" strokeWidth="1.8" />
      {/* Middle layer chevron shelf */}
      <path d="M 2.5 12 L 12 16.5 L 21.5 12" strokeWidth="1.8" />
      {/* Bottom layer chevron shelf */}
      <path d="M 2.5 17 L 12 21.5 L 21.5 17" strokeWidth="1.8" />
    </BaseIconSvg>
  );
}

// 3. Exterior Finish: Cake cylinder with an isometric wedge slice cut out
export function ExteriorFinishSectionIcon({ className = 'w-4 h-4' }) {
  return (
    <BaseIconSvg className={className}>
      {/* Outer top rim arc */}
      <path d="M 3 8 C 3 4.5 10 3.5 15 4 C 18.5 4.5 21 6 21 8" strokeWidth="1.7" />
      {/* Outer side walls */}
      <line x1="3" y1="8" x2="3" y2="19" strokeWidth="1.7" />
      <line x1="21" y1="8" x2="21" y2="19" strokeWidth="1.7" />
      {/* Bottom outer arc */}
      <path d="M 3 19 C 3 20.8 7 21.5 9 21.8" strokeWidth="1.7" />
      <path d="M 17 21.5 C 19 21 21 20 21 19" strokeWidth="1.7" />
      {/* Wedge cut-out on top: from left rim to center, then center to right rim */}
      <line x1="9" y1="8.8" x2="13" y2="5.5" strokeWidth="1.7" />
      <line x1="13" y1="5.5" x2="17" y2="9.2" strokeWidth="1.7" />
      {/* Wedge interior walls */}
      <line x1="13" y1="5.5" x2="13" y2="17.5" strokeWidth="1.7" />
      <line x1="9" y1="8.8" x2="8" y2="20" strokeWidth="1.7" />
      <line x1="17" y1="9.2" x2="16" y2="20.5" strokeWidth="1.7" />
      {/* Wedge bottom floor lines */}
      <line x1="8" y1="20" x2="13" y2="17.5" strokeWidth="1.7" />
      <line x1="13" y1="17.5" x2="16" y2="20.5" strokeWidth="1.7" />
    </BaseIconSvg>
  );
}

// 4. Surface Treatment: Cake cylinder with deep rounded flowing drip mantle across front
export function SurfaceTreatmentSectionIcon({ className = 'w-4 h-4' }) {
  return (
    <BaseIconSvg className={className}>
      {/* Top cylinder rim */}
      <ellipse cx="12" cy="5.8" rx="8.5" ry="2.8" strokeWidth="1.7" />
      {/* Outer cylinder side walls */}
      <line x1="3.5" y1="5.8" x2="3.5" y2="19" strokeWidth="1.7" />
      <line x1="20.5" y1="5.8" x2="20.5" y2="19" strokeWidth="1.7" />
      {/* Bottom cylinder base curve */}
      <path d="M 3.5 19 C 3.5 21 8 21.8 12 21.8 C 16 21.8 20.5 21 20.5 19" strokeWidth="1.7" />
      {/* Flowing drip fingers along the front */}
      <path
        d="M 3.5 13.5 C 4.5 11 5.5 16 6.5 16 C 7.5 16 8 11.5 9 11.5 C 10 11.5 10.5 17 11.8 17 C 13.2 17 13.5 12 14.5 12 C 15.5 12 16 16.5 17.2 16.5 C 18.2 16.5 19.2 12.5 20.5 13.5"
        strokeWidth="1.7"
      />
    </BaseIconSvg>
  );
}
