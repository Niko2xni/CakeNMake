import React from 'react';

export default function FrostingImage({ className = '' }) {
  return (
    <svg
      viewBox="0 0 800 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Soft Drop Shadow for Depth */}
        <filter id="glaze-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#590d22" floodOpacity="0.18" />
        </filter>

        {/* Glossy Liquid Gradient */}
        <linearGradient id="glaze-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff758f" />
          <stop offset="50%" stopColor="#ff4d6d" />
          <stop offset="100%" stopColor="#c9184a" />
        </linearGradient>

        {/* Surface Highlight Gradient */}
        <linearGradient id="shine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main Dripping Glaze Body */}
      <path
        d="M 0,0
           L 800,0
           L 800,180
           C 740,210 710,340 660,340
           C 610,340 590,200 520,200
           C 460,200 440,420 370,420
           C 300,420 280,250 220,250
           C 170,250 150,380 90,380
           C 40,380 20,230 0,210
           Z"
        fill="url(#glaze-gradient)"
        filter="url(#glaze-shadow)"
      />

      {/* Glossy Top Reflection */}
      <path
        d="M 20,15
           L 780,15
           C 780,45 720,80 660,80
           C 590,80 540,35 480,35
           C 410,35 370,95 300,95
           C 240,95 200,45 120,45
           C 60,45 30,60 20,15
           Z"
        fill="url(#shine-gradient)"
      />

      {/* Liquid Drip Highlights */}
      <ellipse cx="370" cy="395" rx="18" ry="8" fill="#ffffff" fillOpacity="0.3" />
      <ellipse cx="660" cy="320" rx="14" ry="6" fill="#ffffff" fillOpacity="0.3" />
      <ellipse cx="90" cy="360" rx="12" ry="5" fill="#ffffff" fillOpacity="0.3" />
    </svg>
  );
}


import * as THREE from 'three';
import { GLAZE_PATTERN_CARVES } from '../components/cake/cakeConstants';
import { buildGlazeGeometry } from '../components/cake/frostingGeometry';

/**
 * Enhanced Glaze Material with Physical Clearcoat & Procedural Optical Depth
 */
export function createEnhancedGlazeMaterial(colorHex) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.08,             // Sleek, wet finish
    metalness: 0.0,
    clearcoat: 1.0,               // High gloss clearcoat layer
    clearcoatRoughness: 0.02,     // Sharp reflections[cite: 6]
    transmission: 0.15,           // Subtle volume translucency for realistic thick liquid
    ior: 1.45,                    // Index of refraction close to sugar syrup
    side: THREE.DoubleSide,       // Rendering inner and outer shell faces[cite: 6]
  });

  // Inject GPU shader code for surface tension variation and edge darkening
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vGlazePos;
       varying vec3 vGlazeNormal;`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vGlazePos = position;
       vGlazeNormal = normal;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vGlazePos;
       varying vec3 vGlazeNormal;`
    ).replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       // Subtle fresnel-based color deepening to simulate drip volume thickness
       float fresnel = pow(1.0 - max(0.0, dot(normal, geometry.viewDir)), 2.5);
       gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.88, gl_FragColor.rgb, fresnel);`
    );
  };

  return material;
}

/**
 * Enhanced Glaze Geometry Builder (Utilizes continuous profile lathe & drip carving)[cite: 6]
 */
export function buildEnhancedGlazeGeometry(radius, height, topDomeHeight, rand, patternKey = 'longShortAlt', opts = {}) {
  const carveConfig = GLAZE_PATTERN_CARVES[patternKey] || GLAZE_PATTERN_CARVES.longShortAlt; //

  return buildGlazeGeometry(radius, height, topDomeHeight, rand, {
    ...opts,
    carve: carveConfig,
    coatThickness: opts.coatThickness ?? 0.07, //[cite: 6]
    capLift: opts.capLift ?? 0.05,             //[cite: 6]
    sideSamples: opts.sideSamples ?? 64,        // High vertical sample resolution[cite: 6]
    edgeFadeDist: opts.edgeFadeDist ?? 0.35,    // Smoothly fades out ridge hugging[cite: 6]
  });
}
