// Premade Doodle Shape Definitions
// Points are generated parametrically for smooth, high-quality shapes.
// Each shape produces dense arrays of [x, z] coordinates normalized to ~0.5 radius.
// The `closed` flag tells the renderer whether to close the tube into a loop.

function makeHeart(steps = 80) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    // Classic parametric heart, scaled and flipped to point upward
    const x = 0.42 * Math.pow(Math.sin(t), 3);
    const z = -0.35 * Math.cos(t) + 0.12 * Math.cos(2 * t) + 0.05 * Math.cos(3 * t) + 0.02 * Math.cos(4 * t);
    pts.push([x, z]);
  }
  return pts;
}

function makeStar(outerR = 0.48, innerR = 0.2, points = 5, steps = 8) {
  const pts = [];
  const totalPts = points * 2;
  for (let i = 0; i <= totalPts; i++) {
    const angle = (i / totalPts) * 2 * Math.PI - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    // Interpolate along each edge to avoid catmull-rom corner rounding
    if (i > 0) {
      const prevAngle = ((i - 1) / totalPts) * 2 * Math.PI - Math.PI / 2;
      const prevR = (i - 1) % 2 === 0 ? outerR : innerR;
      const px = prevR * Math.cos(prevAngle);
      const pz = prevR * Math.sin(prevAngle);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        pts.push([px + (x - px) * t, pz + (z - pz) * t]);
      }
    }
    pts.push([x, z]);
  }
  return pts;
}

function makeSwirl(steps = 90) {
  const pts = [];
  // Archimedean spiral: radius grows with angle
  const turns = 1.6;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = 0.08 + 0.32 * (t / (turns * 2 * Math.PI));
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

function makeCloud(steps = 80) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    // Bumpy ellipse: wider than tall, with 5 bumps on top, smoother on bottom
    const bumpiness = t > 0 && t < Math.PI ? 0.14 : 0.05;
    const bumpFreq  = t > 0 && t < Math.PI ? 5 : 3;
    const r = (0.42 + bumpiness * Math.sin(bumpFreq * t));
    pts.push([r * Math.cos(t) * 1.2, r * Math.sin(t) * 0.75]);
  }
  return pts;
}

function makeLeaf(steps = 80) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    // Teardrop / leaf: pointed at top and bottom, wider in the middle
    const x = 0.42 * Math.sin(t);
    const z = -0.55 * Math.cos(t) + 0.12 * Math.cos(2 * t);
    pts.push([x, z]);
  }
  return pts;
}

export const PREMADE_DOODLES = [
  {
    id: 'heart',
    label: 'Heart',
    closed: true,
    points: makeHeart(),
  },
  {
    id: 'star',
    label: 'Star',
    closed: true,
    points: makeStar(),
  },
  {
    id: 'swirl',
    label: 'Swirl',
    closed: false,
    points: makeSwirl(),
  },
  {
    id: 'cloud',
    label: 'Cloud',
    closed: true,
    points: makeCloud(),
  },
  {
    id: 'leaf',
    label: 'Leaf',
    closed: true,
    points: makeLeaf(),
  },
];

export const getDoodleShape = (id) => PREMADE_DOODLES.find(d => d.id === id) || PREMADE_DOODLES[0];
