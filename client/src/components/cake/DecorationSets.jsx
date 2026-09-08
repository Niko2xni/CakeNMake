import * as THREE from 'three';

// ─── Decoration Set Geometry — first working example per category ─────────
// Per instruction: keep every placeholder Set button in the UI (don't
// reduce the roster), but only ONE per category needs real 3D geometry
// right now, so the whole Surface/Center/Edge/Side data pipeline can
// actually be tested end-to-end before investing in every named design.
//
// Reused instead of rebuilt: Surface > Full Coverage (whippedSkirt)
// already has working geometry in sets/skirtHelpers.jsx from the old Sets
// system — wired directly in CakeScene.jsx, nothing new needed here.
// (Tuxedo used to be reused the same way from sets/tuxedoHelpers.jsx, but
// was retired along with Fondant Swag and Stripes in favor of Sunshine
// Play — see sets/sunshinePlayHelpers.js.) Center > Floral Cluster reuses
// CakeScene.jsx's existing addRosette() the same way. This module only
// covers the genuinely new geometry: Drip, Beaded Trim.

/**
 * Drip — a ring of teardrop blobs hanging from the top edge, each a
 * LatheGeometry profile (radially symmetric, tapering from a wide
 * attachment point at the top to a rounded tip at the bottom). Length
 * varies per instance via the instance matrix scale for a natural,
 * hand-piped irregularity instead of uniform drips.
 */
function buildDripUnitGeometry() {
  const points = [
    new THREE.Vector2(0.0, -1.0),   // tip — closed off (radius 0)
    new THREE.Vector2(0.05, -0.92),
    new THREE.Vector2(0.09, -0.68), // bulb — widest point
    new THREE.Vector2(0.07, -0.42),
    new THREE.Vector2(0.075, -0.18),
    new THREE.Vector2(0.09, 0.0),   // top — attachment radius
  ];
  return new THREE.LatheGeometry(points, 10);
}

export function buildDripRing(radius, colorHex, rand, opts = {}) {
  const count = opts.count ?? Math.max(14, Math.round((radius * Math.PI * 2) / 0.5));
  const baseLength = opts.baseLength ?? 0.9;
  const mat = new THREE.MeshPhysicalMaterial({ color: colorHex, roughness: 0.28, clearcoat: 0.55 });
  const geo = buildDripUnitGeometry();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.15;
    const lengthVariation = 0.55 + rand() * 0.9; // irregular drip lengths, like real gravity-fed icing
    dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    dummy.scale.set(1, baseLength * lengthVariation, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Beaded Trim — alternating large/small pearl beads along a ring, evenly
 * spaced with visible gaps (distinct from the tight, continuous look of
 * the "Round" piping tip in pipingTips.js — this is meant to read as a
 * strung decoration, not a piped border).
 */
export function computeEdgeTrimY(topSurfaceY, radius, decorationType = 'piping', exteriorFinishStyle = 'fullyFrosted', isBottom = false) {
  const isDollopType = decorationType === 'dollops' || (typeof decorationType === 'string' && decorationType.toLowerCase().includes('dollop'));
  if (isBottom) {
    // Bottom edge decorations rest on top of the cake board / plate plane
    // rather than subtracting top-surface recess depths.
    if (isDollopType) {
      return -0.02; // Dollop base sits directly on top of the cake board
    }
    return -0.05;
  }
  if (exteriorFinishStyle === 'naked') {
    // compactDepth + extraInset below (0.10–0.16 depending on cake size
    // and decoration type — see the numbers this replaced) were tuned
    // assuming there's a frosting cap to recess the trim into. Naked's
    // top is bare flat sponge meeting the side wall at a hard, unbeveled
    // 90° corner — there's no material there to sink into, and no bevel
    // to visually absorb it either. Any real dip below the true top
    // surface doesn't nestle in, it punches straight through that corner
    // into the side wall's own geometry, which is exactly the
    // dripping/smearing artifact in the screenshots. topSurfaceY already
    // carries a small +0.05 buffer above the true flat surface (see
    // topY's own definition in CakeScene.jsx), which compactDepth alone
    // already exceeds on every realistic cake size — so this isn't a
    // constant that needs re-tuning, Naked genuinely needs a different
    // formula, not a different number in the same one. A small fixed
    // recess keeps it visually flush without ever going negative.
    return topSurfaceY - 0.02;
  }
  const compactDepth = Math.min(0.12, Math.max(0.06, radius * 0.08));
  const finishDepth = 0.06;
  const extraInset = decorationType === 'beadedTrim' ? 0.02 : 0.04;
  return topSurfaceY - (compactDepth + extraInset + finishDepth);
}

export function computeEdgeTrimRadius(edgeRadius, decorationType = 'piping', exteriorFinishStyle = 'fullyFrosted', isBottom = false) {
  // `edgeRadius` (topRadius/BASE_RADIUS in CakeScene.jsx) is the raw
  // sponge radius, identical for every finish — unlike topSurfaceY above,
  // nothing upstream adjusts it for frosting bulge. So the flat
  // per-finish "finishInset" constants this used to use (applied
  // directly to that same raw number for every finish alike) never
  // actually accounted for Fully Frosted's real surface sitting further
  // out than Naked's does — only for however different those constants
  // happened to be tuned. Deriving an actual surfaceRadius first — the
  // same frosting-bulge convention the Side decorations already use (see
  // sideDecorationRadius/hasFrostingForDeco above: frosted finishes add
  // ~0.06 outward, Naked sits ~0.02 in from the bare sponge) — then
  // applying ONE consistent radialInset on top of that for every finish,
  // is what actually keeps the trim sitting an equivalent distance from
  // each finish's own real edge instead of from a shared number that
  // doesn't represent any of their real edges.
  const surfaceRadius = exteriorFinishStyle === 'naked'
    ? edgeRadius - 0.02
    : edgeRadius + (exteriorFinishStyle === 'texturedButtercream' ? 0.08 : 0.06);
  // The top rim's radialInset (0.22–0.26) is tuned to nestle the trim
  // back into the top surface, inset from the very edge — appropriate
  // there since the whole top disc is visible from above and the trim
  // needs room to sit "on" it. The bottom trim isn't sitting on any
  // visible surface the same way — it reads as a border/skirt piped
  // right at the base perimeter, resting against the cake board. A
  // small POSITIVE inset there (the first attempt at this) still tucked
  // it just inside the wall's own radius, which was enough for the wall
  // to keep occluding most of it from a normal viewing angle. Going
  // negative instead pushes it genuinely proud of the wall — actually in
  // front of the surface, the way a piped border resting against the
  // board would really sit — rather than just closer to flush with it.
  const isDollopType = decorationType === 'dollops' || (typeof decorationType === 'string' && decorationType.toLowerCase().includes('dollop'));

  let topDollopInset = 0.76;
  if (decorationType === 'starDollopContinuous') {
    topDollopInset = 0.66; // R = 4.06 - 0.66 = 3.40 -> outer edge: 3.40 + 0.625 = 4.025 (right by edge, strictly <= 4.06)
  } else if (decorationType === 'starDollop') {
    topDollopInset = 0.76; // R = 4.06 - 0.76 = 3.30 -> outer edge: 3.30 + 0.725 = 4.025 (right by edge, strictly <= 4.06)
  } else if (decorationType === 'starDollopSparse') {
    topDollopInset = 0.82; // R = 4.06 - 0.82 = 3.24 -> outer edge: 3.24 + 0.7875 = 4.028 (right by edge, strictly <= 4.06)
  }

  const radialInset = isBottom
    ? (decorationType === 'beadedTrim' ? -0.10 : (isDollopType ? -0.06 : (['shell', 'reverseShell', 'bead', 'zigzag', 'wavePiping', 'ropeTwist', 'ropeTwistClassic'].includes(decorationType) ? -0.04 : -0.14)))
    : (decorationType === 'beadedTrim' ? 0.22 : (isDollopType ? topDollopInset : (['shell', 'reverseShell'].includes(decorationType) ? 0.40 : (decorationType === 'bead' ? 0.38 : (decorationType === 'zigzag' ? 0.40 : (decorationType === 'wavePiping' ? 0.40 : (['ropeTwist', 'ropeTwistClassic'].includes(decorationType) ? 0.40 : 0.26)))))));
  return Math.max(0.15, surfaceRadius - radialInset);
}

/**
 * Beaded Trim — three designs sharing this one geometry function, only
 * the per-bead size rhythm around the ring differs (`opts.pattern`):
 *
 * - 'classic' (default, the original Beaded Trim): alternates Big/Small.
 * - 'trio' (Trio Beaded Trim): cycles Small → Big → Medium. Deliberately
 *   not a Small → Medium → Big ramp — see EDGE_DECORATION_SETS' comment
 *   in cakeConfig.js for why that reads as lopsided once it wraps around
 *   a full circle instead of balanced.
 * - 'petite' (Petite Beaded Trim): every bead the same small size — a
 *   finer, more delicate trim than either of the other two.
 */
export function buildBeadedTrimRing(radius, colorHex, rand, opts = {}) {
  const pattern = opts.pattern || 'classic';
  const count = opts.count ?? Math.max(18, Math.round((radius * Math.PI * 2) / 0.28));
  const mat = new THREE.MeshPhysicalMaterial({ color: colorHex, roughness: 0.25, clearcoat: 0.6 });
  const geo = new THREE.SphereGeometry(0.13, 14, 10);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    let baseScale;
    if (pattern === 'trio') {
      const cyclePos = i % 3;
      baseScale = cyclePos === 0 ? 0.58 : cyclePos === 1 ? 1.05 : 0.82; // Small, Big, Medium
    } else if (pattern === 'petite') {
      baseScale = 0.62;
    } else {
      const big = i % 2 === 0;
      baseScale = big ? 1 : 0.62;
    }
    const scale = baseScale * (0.92 + rand() * 0.16);
    dummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Checkered Pattern (Buttercream Stenciling) — real 3D raised squares,
 * NOT a flat printed texture. Every other decoration in this file (Drip,
 * Beaded Trim) is actual instanced geometry — the earlier texture-based
 * version was the inconsistent exception, which is part of why it read as
 * a printed edible sheet instead of a stenciled decoration. Only the
 * "black" squares get real geometry at all — the "white" squares are
 * simply absent, so the base frosting shows through naturally, exactly
 * like a real stencil where color is only pushed through the cutouts. One
 * fixed real-world square size is used for both the side wrap and the top
 * disc, so squares read as the same physical size everywhere instead of
 * the side ones looking shrunken.
 */
const CHECKER_SQUARE_SIZE = 1.22; // same physical size on sides AND top
const CHECKER_STANDOFF = -0.06;   // negative standoff embeds the back face into the cake to hide gaps
const CHECKER_THICKNESS = 0.12;   // increased thickness offsets the embedding so the front face stays visible
const CHECKER_GAP_RATIO = 0.9;    // slightly smaller than the grid cell, like stencil grout lines

function buildCheckerSquareMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({ color: colorHex ?? '#1F1F1F', roughness: 0.72 });
}

/** Raised black squares wrapped around a tier's side wall.
 *  - pattern 'full' (default) — checkerboard-spaced, only every other cell
 *    gets a square. Used by "Full Pattern". Adjacent black diagonals are
 *    separated by exactly 1 empty diagonal line (the tightest possible
 *    spacing on a checkerboard).
 *  - pattern 'leftDiagonal' / 'rightDiagonal' — both start from the same
 *    checkerboard grid, but instead of keeping every "black" diagonal,
 *    this thins that alternation further: it indexes the black diagonals
 *    themselves (0, 1, 2, 3, ... — NOT the raw row±col value, which only
 *    ever takes even values here and so can't distinguish more than 2
 *    buckets on its own), then within every `diagonalPeriod` of THAT
 *    index, only the first `diagonalBandWidth` stay fully solid black;
 *    the skipped diagonal(s) in between aren't fully removed either —
 *    every `gapDashPeriod`-th cell along them is kept as a "dash"
 *    (default: every other cell). Repeats around the whole cylinder, so
 *    the result reads as a solid diagonal stripe, a broken/dashed
 *    diagonal, a solid stripe, etc. — a shorter-feeling gap than a fully
 *    empty diagonal, while staying visibly less dense than Full Pattern
 *    (which has no empty cells at all on its diagonals).
 *    'leftDiagonal' groups diagonals by (col + row); 'rightDiagonal' by
 *    (col - row) — the mirror-image direction, so the stripe leans the
 *    opposite way around the cylinder.
 *
 *    `opts.color` sets the square color (defaults to '#1F1F1F', the
 *    original hardcoded black) — previously there was no way to pass a
 *    color in at all, so every checkered cake rendered black regardless
 *    of what was picked elsewhere in the app.
 *    Math note: because black/white diagonals strictly alternate by
 *    parity, a *fully emptied* gap between two solid diagonals is always
 *    an odd number of raw diagonal lines (1, 3, 5, ...) — 1 is Full
 *    Pattern, so 3 is the tightest fully-empty gap possible. Going
 *    shorter than that requires dashing the gap diagonal instead of
 *    emptying it, which is what `gapDashPeriod` does.
 *  - pattern 'parallelOuter' / 'parallelInner' — same checkerboard
 *    alternation as Full Pattern above (still discrete, separated boxes,
 *    not a solid band), just restricted to two of Pattern 1's own rows
 *    instead of every row:
 *      'parallelOuter' — row 1 (bottom-most) + row 4 (top-most): the two
 *        OUTER rows, middle two dropped.
 *      'parallelInner' — row 2 + row 3: the two INNER/middle rows,
 *        outer two dropped.
 *    Reuses the exact same `rows`/cellHeight grid every other pattern
 *    here renders with, rather than a separate virtual grid — so it
 *    inherits the same guaranteed-in-bounds sizing/placement Pattern 1
 *    already has, instead of needing its own bounds math. See
 *    selectParallelRows() below for the row selection.
 */

// Which of Pattern 1's (Full Pattern's) own rows to keep for
// parallelOuter/parallelInner — directly indexing the SAME `rows` grid
// every other checkered pattern already renders safely, rather than a
// separate virtual grid. Per instruction: "follow the design of checkered
// pattern 1, only this time the 2nd row and 3rd row are gone" — that's
// Outer. Inner is the mirror: keep only the 2nd and 3rd rows, drop the
// outer two.
//   parallelOuter — row 1 (bottom-most, index 0) + row 4 (top-most,
//     index rows-1): the two OUTER rows of the grid.
//   parallelInner — row 2 (index 1) + row 3 (index rows-2): the two
//     INNER/middle rows of the grid.
// Because these are real indices into Pattern 1's existing grid rather
// than a computed virtual position, there's no separate bounds math
// needed — any row that exists in Pattern 1's grid is already guaranteed
// to render fully inside the tier, so a subset of those rows is too. On a
// tier short enough that fewer than 4 rows exist, a requested index
// simply isn't added (Set collapses duplicates), same graceful
// degradation as before, just with no chance of overflow either way.
//
// Shared by Triangle Pattern below (see TRIANGLE_PATTERN_SETS in
// cakeConfig.js) since this is pure row-index selection — identical math
// regardless of whether the cell shape ends up a square or a triangle, so
// it's reused rather than copy-pasted a second time.
function selectParallelRows(pattern, rows) {
  const selected = new Set();
  if (pattern === 'parallelOuter') {
    const bottomIdx = 0;
    const topIdx = rows - 1;
    if (bottomIdx >= 0 && bottomIdx < rows) selected.add(bottomIdx);
    if (topIdx >= 0 && topIdx < rows) selected.add(topIdx);
  } else if (pattern === 'parallelInner') {
    const secondIdx = 1;
    const thirdIdx = rows - 2;
    if (secondIdx >= 0 && secondIdx < rows) selected.add(secondIdx);
    if (thirdIdx >= 0 && thirdIdx < rows) selected.add(thirdIdx);
  }
  return selected;
}
export function buildCheckerSideSquares(radius, height, opts = {}) {
  const pattern = opts.pattern ?? 'full';
  const isDiagonalPattern = pattern === 'leftDiagonal' || pattern === 'rightDiagonal';
  const diagonalPeriod = opts.diagonalPeriod ?? 2;
  const diagonalBandWidth = opts.diagonalBandWidth ?? 1;
  const gapDashPeriod = opts.gapDashPeriod ?? 2; // 1 = no dashing (fully empty gap)
  const size = CHECKER_SQUARE_SIZE;
  const circumference = radius * Math.PI * 2;

  // Column count must wrap seamlessly around the cylinder. For the plain
  // checkerboard, that only requires an EVEN column count (so the color
  // parity at col=cols-1 hands off correctly to col=0). But the diagonal
  // patterns add a second, coarser loop on top: they group black
  // diagonals into bands of `diagonalPeriod`, and that grouping only
  // closes cleanly if the total number of black diagonals going all the
  // way around (cols / 2) is itself evenly divisible by `diagonalPeriod`.
  // Nothing enforced that before, so most radii happened to land on a
  // multiple by luck and looped fine, but some didn't — the band pattern
  // would get cut short right where the loop closes, showing up as a
  // visible seam/dead-end. Rounding `cols` to the nearest multiple of
  // `unit` (instead of just the nearest even number) guarantees cols/2
  // divides evenly by diagonalPeriod every time, so the loop always
  // closes exactly where it started, regardless of the cake's radius.
  const unit = isDiagonalPattern ? 2 * diagonalPeriod : 2;
  const targetUnits = Math.max(3, Math.round(circumference / size / unit));
  const cols = targetUnits * unit;

  const isParallelPattern = pattern === 'parallelOuter' || pattern === 'parallelInner';

  // Same row count/cellHeight formula for every pattern, including
  // Parallel Lines — this is Pattern 1's (Full Pattern's) own grid,
  // already rendering safely with zero overflow, so reusing it directly
  // means Parallel Lines inherits that same safety instead of needing its
  // own bounds math.
  const rows = Math.max(2, Math.round(height / size));
  const cellAngle = (Math.PI * 2) / cols;
  const cellHeight = height / rows;

  const parallelRows = isParallelPattern ? selectParallelRows(pattern, rows) : null;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    if (isParallelPattern && !parallelRows.has(row)) continue;

    for (let col = 0; col < cols; col++) {
      const isCheckerboardBlack = Math.abs(row + col) % 2 === 0;
      if (!isCheckerboardBlack) continue;

      if (isDiagonalPattern) {
        // Black diagonals sit at (col ± row) = 0, 2, 4, 6, ... — every
        // other diagonal line, never odd ones. Divide by 2 to get their
        // actual sequential index (0, 1, 2, 3, ...) before applying the
        // period/band interval; without this, `% diagonalPeriod` on the
        // raw even value can only ever land on 2 distinct buckets no
        // matter how large diagonalPeriod is, which was the bug — it made
        // every interval setting behave like a 1-skip-1 pattern.
        // 'leftDiagonal' groups by (col + row); 'rightDiagonal' by
        // (col - row) — the mirrored direction.
        const rawDiag = pattern === 'rightDiagonal' ? col - row : col + row;
        const diag = ((rawDiag % cols) + cols) % cols;
        const blackDiagIndex = diag / 2;
        const isPrimaryDiagonal = (blackDiagIndex % diagonalPeriod) < diagonalBandWidth;
        if (!isPrimaryDiagonal) {
          // In the gap: keep only every `gapDashPeriod`-th cell (by row)
          // so the gap reads as a shorter, dashed line rather than a
          // fully empty one.
          if (gapDashPeriod <= 1 || row % gapDashPeriod !== 0) continue;
        }
      }
      cells.push({ row, col });
    }
  }

  // Curve the square's own geometry along the cylinder's arc instead of
  // using a flat chord — teammate's improvement (mirrors the standoffRadius
  // used for instance placement below, computed once here and shared since
  // every instance uses the exact same curved shape template).
  const standoffRadius = radius + CHECKER_THICKNESS / 2 + CHECKER_STANDOFF;
  const arcLength = standoffRadius * cellAngle * CHECKER_GAP_RATIO;
  const geo = new THREE.BoxGeometry(arcLength, cellHeight * CHECKER_GAP_RATIO, CHECKER_THICKNESS, 4, 1, 1);
  const posAttribute = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttribute.count; i++) {
    v.fromBufferAttribute(posAttribute, i);
    const theta = v.x / standoffRadius;
    const r = standoffRadius + v.z;
    const newX = r * Math.sin(theta);
    const newZ = r * Math.cos(theta) - standoffRadius;
    posAttribute.setXYZ(i, newX, v.y, newZ);
  }
  geo.computeVertexNormals();

  const mat = buildCheckerSquareMaterial(opts.color);
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const dummy = new THREE.Object3D();

  cells.forEach(({ row, col }, i) => {
    const angle = (col + 0.5) * cellAngle;
    const y = -height / 2 + (row + 0.5) * cellHeight;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// buildCheckerTopSquares() was removed along with the "Top Only" option —
// the 4th Checkered Pattern slot is now "Right Diagonal" (id
// 'rightDiagonal'), a side-wall treatment handled by
// buildCheckerSideSquares() above instead.


/**
 * Triangle Pattern — a duplicate of Checkered Pattern's entire
 * architecture (this file's buildCheckerSideSquares above, and
 * TRIANGLE_PATTERN_SETS in cakeConfig.js duplicating CHECKERED_PATTERN_SETS),
 * with one difference: each cell is a real 3D triangular prism instead of
 * a box. Same 6 variants (Full/Left Diagonal/X/Right Diagonal/Parallel
 * Outer/Parallel Inner), same cell-selection logic (reuses
 * selectParallelRows above — pure row-index math, identical regardless of
 * cell shape), same real-geometry-not-texture approach, same arc-bend
 * technique, same per-cell InstancedMesh placement. Only
 * buildTriangleCellGeometry (the shape itself) and the constants sized for
 * it are new; everything else mirrors buildCheckerSideSquares line for
 * line.
 */
const TRIANGLE_SIZE = 1.22;     // same physical size convention as CHECKER_SQUARE_SIZE
const TRIANGLE_STANDOFF = -0.06;
const TRIANGLE_THICKNESS = 0.12;
const TRIANGLE_GAP_RATIO = 0.9;

function buildTriangleShapeMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({ color: colorHex ?? '#1F1F1F', roughness: 0.72 });
}

// One triangular prism cell — apex up, base at the bottom, spanning the
// same arcLength x cellHeight footprint a checkered square would. Built as
// a subdivided grid (base full-width, tapering to zero width at the apex)
// with real thickness — front face, back face, and side walls along the
// base/left/right edges — rather than a flat plane, so the per-vertex
// arc-bend below (identical to Checkered's own) has enough resolution to
// read as a smooth curve instead of just repositioning 3 corners.
function buildTriangleCellGeometry(arcLength, cellHeight, thickness) {
  const widthSegments = 6;
  const heightSegments = 4;
  const halfThickness = thickness / 2;
  const rows = heightSegments + 1;
  const cols = widthSegments + 1;

  const gridX = [], gridY = [];
  for (let j = 0; j < rows; j++) {
    const v = j / heightSegments;              // 0 at the base, 1 at the apex
    const y = -cellHeight / 2 + v * cellHeight;
    const halfW = (1 - v) * (arcLength / 2);    // full width at the base, tapers to 0 at the apex
    for (let i = 0; i < cols; i++) {
      const u = i / widthSegments;
      gridX.push(-halfW + u * (halfW * 2));
      gridY.push(y);
    }
  }

  const positions = [], indices = [];
  const vertsPerFace = rows * cols;
  const frontOffset = 0, backOffset = vertsPerFace;
  for (let n = 0; n < vertsPerFace; n++) positions.push(gridX[n], gridY[n], halfThickness);
  for (let n = 0; n < vertsPerFace; n++) positions.push(gridX[n], gridY[n], -halfThickness);

  // Front face (normal +Z)
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = frontOffset + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  // Back face (normal -Z, reversed winding)
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = backOffset + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Side walls — left edge, right edge, and the base (bottom); the apex
  // needs no wall, since the top row collapses to a single point on its
  // own (halfW=0), same convergence Checkered's own box corners don't
  // need to worry about since a box has no taper at all.
  for (let j = 0; j < rows - 1; j++) {
    const fA = frontOffset + j * cols, fB = frontOffset + (j + 1) * cols;
    const bA = backOffset + j * cols, bB = backOffset + (j + 1) * cols;
    indices.push(fA, fB, bB, fA, bB, bA); // left
    const rFA = fA + cols - 1, rFB = fB + cols - 1, rBA = bA + cols - 1, rBB = bB + cols - 1;
    indices.push(rFA, rBA, rBB, rFA, rBB, rFB); // right
  }
  for (let i = 0; i < cols - 1; i++) {
    const fA = frontOffset + i, fB = frontOffset + i + 1;
    const bA = backOffset + i, bB = backOffset + i + 1;
    indices.push(fA, bB, bA, fA, fB, bB); // base
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Raised triangles wrapped around a tier's side wall — exact same 6
 * patterns, exact same cell-selection logic as buildCheckerSideSquares
 * above (see that function's own doc comment for the full pattern
 * explanation: 'full', 'leftDiagonal'/'rightDiagonal' with
 * diagonalPeriod/diagonalBandWidth/gapDashPeriod, 'parallelOuter'/
 * 'parallelInner' via selectParallelRows). The only difference from
 * Checkered is buildTriangleCellGeometry (a triangular prism) in place of
 * THREE.BoxGeometry, and the arc-bend applies to that triangle's own
 * (already width-subdivided) vertices instead of a box's.
 */
export function buildTriangleSideShapes(radius, height, opts = {}) {
  const pattern = opts.pattern ?? 'full';
  const isDiagonalPattern = pattern === 'leftDiagonal' || pattern === 'rightDiagonal';
  const diagonalPeriod = opts.diagonalPeriod ?? 2;
  const diagonalBandWidth = opts.diagonalBandWidth ?? 1;
  const gapDashPeriod = opts.gapDashPeriod ?? 2;
  const size = TRIANGLE_SIZE;
  const circumference = radius * Math.PI * 2;

  const unit = isDiagonalPattern ? 2 * diagonalPeriod : 2;
  const targetUnits = Math.max(3, Math.round(circumference / size / unit));
  const cols = targetUnits * unit;

  const isParallelPattern = pattern === 'parallelOuter' || pattern === 'parallelInner';

  const rows = Math.max(2, Math.round(height / size));
  const cellAngle = (Math.PI * 2) / cols;
  const cellHeight = height / rows;

  const parallelRows = isParallelPattern ? selectParallelRows(pattern, rows) : null;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    if (isParallelPattern && !parallelRows.has(row)) continue;

    for (let col = 0; col < cols; col++) {
      const isCheckerboardBlack = Math.abs(row + col) % 2 === 0;
      if (!isCheckerboardBlack) continue;

      if (isDiagonalPattern) {
        const rawDiag = pattern === 'rightDiagonal' ? col - row : col + row;
        const diag = ((rawDiag % cols) + cols) % cols;
        const blackDiagIndex = diag / 2;
        const isPrimaryDiagonal = (blackDiagIndex % diagonalPeriod) < diagonalBandWidth;
        if (!isPrimaryDiagonal) {
          if (gapDashPeriod <= 1 || row % gapDashPeriod !== 0) continue;
        }
      }
      cells.push({ row, col });
    }
  }

  const standoffRadius = radius + TRIANGLE_THICKNESS / 2 + TRIANGLE_STANDOFF;
  const arcLength = standoffRadius * cellAngle * TRIANGLE_GAP_RATIO;
  const geo = buildTriangleCellGeometry(arcLength, cellHeight * TRIANGLE_GAP_RATIO, TRIANGLE_THICKNESS);
  // Same per-vertex arc-bend as Checkered's squares — identical formula,
  // just applied to the triangle's own (already subdivided) vertex set.
  const posAttribute = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttribute.count; i++) {
    v.fromBufferAttribute(posAttribute, i);
    const theta = v.x / standoffRadius;
    const r = standoffRadius + v.z;
    const newX = r * Math.sin(theta);
    const newZ = r * Math.cos(theta) - standoffRadius;
    posAttribute.setXYZ(i, newX, v.y, newZ);
  }
  geo.computeVertexNormals();

  const mat = buildTriangleShapeMaterial(opts.color);
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const dummy = new THREE.Object3D();

  cells.forEach(({ row, col }, i) => {
    const angle = (col + 0.5) * cellAngle;
    const y = -height / 2 + (row + 0.5) * cellHeight;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Deterministic pearl layout — shared by every "scatter" Scatter Pearls
 * variant (Random Scatter, Big Pearls Scatter, Small Pearls Scatter) so all
 * three read as the same organic family, just at different sizes.
 *
 * Uses the same seeded linear-congruential generator as Sunshine Play's
 * Star Burst (scatterStarPositions in sets/sunshinePlayHelpers.js) —
 * genuinely random-looking placement, with the natural clumps and gaps
 * true randomness has, rather than the golden-angle Kronecker sequence
 * this used previously. That sequence was deliberately even/gapless
 * ("sunflower-seed" coverage with no clustering by construction), which
 * reads as a visibly different, too-uniform pattern next to Star Burst's
 * actual scatter — the mismatch this fixes. Still fully deterministic (a
 * fixed seed, not Math.random() or the `rand` PRNG passed into this file):
 * the same cake config always renders the exact same placement, it just
 * looks organically scattered instead of evenly gridded now. Uses its own
 * seed (distinct from Star Burst's 54321) so the two decorations don't
 * echo each other's exact layout despite sharing a method.
 */
function scatterPearlPositions(count) {
  const seed = 13579;
  const points = [];
  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };
  for (let i = 0; i < count; i++) {
    points.push({
      angle:      seededRandom() * Math.PI * 2,
      heightFrac: seededRandom(),
      sizeFrac:   seededRandom(),
    });
  }
  return points;
}

/**
 * Same seeded-LCG scatter as scatterPearlPositions, but with a rejection
 * step: draws candidates one at a time and only keeps ones that clear a
 * minimum distance from every pearl already placed, so large pearls this
 * sparse never visually overlap or clip into each other. Only Big Pearls
 * Scatter uses this — it's the one variant sparse and large enough for
 * collisions between individually-readable pearls to actually show; the
 * denser/smaller pearl variants above are fine with the plain sequence.
 *
 * The distance check uses the true 3D straight-line distance between two
 * pearl centers on the cylinder (2·radius·sin(Δangle/2) for the
 * around-the-circumference component, combined with the height
 * difference) rather than arc length — arc length is always ≥ the actual
 * straight-line distance between two points on a circle, so using it here
 * would let some genuinely-overlapping pairs slip through as "far enough
 * apart".
 *
 * Deterministic like every other scatter in this file (fixed seed, no
 * Math.random()), and bounded: if the surface is packed tight enough that
 * a valid spot can't be found within a generous attempt budget, it simply
 * returns fewer pearls than asked for rather than looping forever or
 * letting a pearl through that collides.
 */
function scatterNonCollidingBigPearls(radius, height, targetCount, getScale) {
  const seed = 24680;
  let current = seed;
  const seededRandom = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };

  const GAP = 0.05; // minimum clear space left between two pearls' surfaces, not just "not touching"
  const MAX_ATTEMPTS = targetCount * 60;

  const accepted = [];
  let attempts = 0;
  while (accepted.length < targetCount && attempts < MAX_ATTEMPTS) {
    attempts++;
    const angle = seededRandom() * Math.PI * 2;
    const heightFrac = seededRandom();
    const sizeFrac = seededRandom();
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
    const scale = getScale(sizeFrac);

    let collides = false;
    for (const p of accepted) {
      let dAngle = Math.abs(angle - p.angle) % (Math.PI * 2);
      if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
      const chordXZ = 2 * radius * Math.sin(dAngle / 2); // true center-to-center distance around the circumference
      const dy = y - p.y;
      const dist = Math.sqrt(chordXZ * chordXZ + dy * dy);
      if (dist < scale + p.scale + GAP) {
        collides = true;
        break;
      }
    }

    if (!collides) accepted.push({ angle, y, scale });
  }

  return accepted;
}

export function buildScatterPearlsRing(radius, height, colorHex, rand, opts = {}) {
  const variant = opts.variant || 'randomScatter';
  const mat = new THREE.MeshPhysicalMaterial({
    color: colorHex || '#FFFFFF',
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const geo = new THREE.SphereGeometry(1, 16, 16);

  if (variant === 'diamondGrid') {
    const rows = 4;
    const colsPerTier = Math.max(8, Math.round((radius * Math.PI * 2) / 0.8));
    const pearlCount = rows * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = -height / 2 + (r + 0.5) * (height / rows);
      const rowOffset = (r % 2) * (Math.PI / colsPerTier);
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2 + rowOffset;
        const scale = 0.16;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'diamondGridBorder') {
    // Diamond Grid with its own 2nd and 3rd rows (of 4) removed — row
    // Y-positions, column count, and the per-row stagger offset are all
    // computed identically to 'diamondGrid' above (same totalRows=4
    // spacing), just skipping r=1 and r=2 so only the top and bottom rows
    // survive. Keeping the stagger (row 3 is still offset by half a
    // column relative to row 0, exactly as it would be inside the full
    // grid) is what keeps this reading as "Diamond Grid with rows
    // removed" rather than two independent plain rows.
    const totalRows = 4;
    const keepRows = [0, 3];
    const colsPerTier = Math.max(8, Math.round((radius * Math.PI * 2) / 0.8));
    const pearlCount = keepRows.length * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (const r of keepRows) {
      const y = -height / 2 + (r + 0.5) * (height / totalRows);
      const rowOffset = (r % 2) * (Math.PI / colsPerTier);
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2 + rowOffset;
        const scale = 0.16;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'horizontalRows') {
    const rows = 3;
    const colsPerTier = Math.max(10, Math.round((radius * Math.PI * 2) / 0.65));
    const pearlCount = rows * colsPerTier;
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = -height / 2 + (r + 1) * (height / (rows + 1));
      for (let c = 0; c < colsPerTier; c++) {
        const angle = (c / colsPerTier) * Math.PI * 2;
        const scale = (c % 2 === 0) ? 0.18 : 0.12;
        const standoffRadius = radius + scale * 0.3;
        dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'bigPearlsScatter') {
    // Design 5 — same organic scatter family as Random Scatter below (same
    // seeded-LCG approach), fixed to a big-pearl-only size range. Bigger
    // pearls need more clearance from each other to read as individual
    // pearls rather than a fused blob, so this uses a much lower density
    // (bigger areaPerPearl budget) than Random Scatter or Small Pearls —
    // a deliberately sparse scatter of a few large pearls, not a dense
    // field of them. Placement itself also actively checks for and
    // rejects collisions (see scatterNonCollidingBigPearls) — at this
    // size and sparseness, two pearls landing close enough to visually
    // overlap is common enough with a plain unchecked sequence to be
    // worth guarding against directly, unlike the denser/smaller pearl
    // variants above.
    const areaPerPearl = 2.6;
    const targetCount = Math.max(15, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    const getScale = (sizeFrac) => 0.22 + sizeFrac * 0.06; // big pearls only: 0.22–0.28

    const placed = scatterNonCollidingBigPearls(radius, height, targetCount, getScale);
    const mesh = new THREE.InstancedMesh(geo, mat, placed.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < placed.length; i++) {
      const { angle, y, scale } = placed[i];
      // Centered exactly on the wall surface (no outward offset) so the
      // cut is right through the sphere's middle — half the pearl sits
      // buried in the frosting, half pokes out, instead of the small
      // 0.3×-scale outward nudge every other pearl variant uses (which
      // only buries a little over a third of it).
      const standoffRadius = radius;
      dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (variant === 'smallPearlsScatter') {
    // Design 6 — identical approach to Big Pearls Scatter (design 5) above,
    // fixed to a small-pearl-only size range instead. Small pearls can sit
    // much closer together without visually merging, so this uses a
    // higher density (smaller areaPerPearl budget) to still read as fully
    // populated at their smaller size.
    const areaPerPearl = 0.32;
    const pearlCount = Math.max(130, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
    const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
    const dummy = new THREE.Object3D();

    const points = scatterPearlPositions(pearlCount);
    for (let i = 0; i < pearlCount; i++) {
      const { angle, heightFrac, sizeFrac } = points[i];
      const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
      const scale = 0.07 + sizeFrac * 0.04; // small pearls only: 0.07–0.11
      const standoffRadius = radius + scale * 0.3;
      dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Default: 'randomScatter'. Fixed, not randomized — see
  // scatterPearlPositions' docstring above. Every render of the same cake
  // shows the identical layout instead of reshuffling. This variant is tuned
  // intentionally lighter than the other scatter families: the pearls are
  // smaller and spread further apart so the pattern reads as "scattered"
  // instead of a dense cluster.
  const areaPerPearl = 0.75;
  const pearlCount = Math.max(70, Math.round((2 * Math.PI * radius * height) / areaPerPearl));
  const mesh = new THREE.InstancedMesh(geo, mat, pearlCount);
  const dummy = new THREE.Object3D();

  const points = scatterPearlPositions(pearlCount);
  for (let i = 0; i < pearlCount; i++) {
    const { angle, heightFrac, sizeFrac } = points[i];
    const y = -height / 2 + height * 0.05 + heightFrac * height * 0.9;
    const scale = 0.06 + sizeFrac * 0.10; // light scatter: small-to-medium pearls only
    const standoffRadius = radius + scale * 0.3;
    dummy.position.set(Math.sin(angle) * standoffRadius, y, Math.cos(angle) * standoffRadius);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Chevron Pattern (Multi-Color / Single Color / Two-Tone Zigzag Stripes)
 * Real 3D extruded chevron ribbons wrapped cylindrically around the side wall.
 */
const CHEVRON_THICKNESS = 0.10;
const CHEVRON_STANDOFF = -0.04;

const MULTI_COLOR_PALETTE = [
  '#3B5FA0', // dark navy (row 0 - bottom)
  '#7CC47A', // green (row 1)
  '#E9BE6A', // gold/yellow (row 2)
  '#6BA8D4', // sky blue (row 3)
  '#E87B5E', // coral/orange (row 4 - top)
];

function buildChevronRowGeometry(radius, rowY, rowHeight, numTeeth, thickness) {
  const stepsPerTooth = 8;
  const totalSteps = numTeeth * stepsPerTooth;
  const standoffR = radius + thickness / 2 + CHEVRON_STANDOFF;
  const rIn = standoffR - thickness / 2;
  const rOut = standoffR + thickness / 2;

  const bandHeight = rowHeight * 0.70;
  const amplitude = rowHeight * 0.28;

  const positions = [];
  const normals = [];
  const indices = [];

  for (let s = 0; s <= totalSteps; s++) {
    const angle = (s / totalSteps) * Math.PI * 2;
    const toothU = (s / stepsPerTooth) % 1;
    const T = (toothU < 0.5) ? (-1 + 4 * toothU) : (3 - 4 * toothU);
    const yCenter = rowY + amplitude * T;
    const yTop = yCenter + bandHeight / 2;
    const yBot = yCenter - bandHeight / 2;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    positions.push(
      rOut * sinA, yTop, rOut * cosA,
      rOut * sinA, yBot, rOut * cosA,
      rIn * sinA, yTop, rIn * cosA,
      rIn * sinA, yBot, rIn * cosA,
    );

    normals.push(
      sinA, 0, cosA,
      sinA, 0, cosA,
      -sinA, 0, -cosA,
      -sinA, 0, -cosA,
    );
  }

  for (let s = 0; s < totalSteps; s++) {
    const base = s * 4;
    const next = (s + 1) * 4;

    const outTopA = base + 0, outBotA = base + 1, inTopA = base + 2, inBotA = base + 3;
    const outTopB = next + 0, outBotB = next + 1, inTopB = next + 2, inBotB = next + 3;

    // Front face
    indices.push(outTopA, outBotA, outBotB, outTopA, outBotB, outTopB);
    // Back face
    indices.push(inTopA, inTopB, inBotB, inTopA, inBotB, inBotA);
    // Top face
    indices.push(outTopA, inTopA, inTopB, outTopA, inTopB, outTopB);
    // Bottom face
    indices.push(outBotA, outBotB, inBotB, outBotA, inBotB, inBotA);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildChevronSideStripes(radius, height, opts = {}) {
  const group = new THREE.Group();
  const setId = opts.setId || 'multiColor';
  const mainColor = opts.color || '#3B5FA0';

  let numRows = 5;
  if (setId === 'wideZigzag') numRows = 3;
  else if (setId === 'tightZigzag') numRows = 7;

  const rowHeight = height / numRows;
  const circumference = radius * Math.PI * 2;
  const targetToothWidth = 1.6;
  const numTeeth = Math.max(6, Math.round(circumference / targetToothWidth));

  for (let r = 0; r < numRows; r++) {
    // 'singleColorGapped' — identical row layout to Single Color (same
    // numRows, same rowY positions below), just skipping rows 2 and 4
    // (1-indexed; r === 1 and r === 3 here) so those two lines are simply
    // absent rather than the remaining rows being re-spaced to fill the gap.
    if (setId === 'singleColorGapped' && (r === 1 || r === 3)) continue;

    const rowY = -height / 2 + (r + 0.5) * rowHeight;
    let hexColor;
    if (setId === 'multiColor') {
      hexColor = MULTI_COLOR_PALETTE[r % MULTI_COLOR_PALETTE.length];
    } else if (setId === 'twoTone') {
      hexColor = (r % 2 === 0) ? mainColor : '#FFFFFF';
    } else {
      hexColor = mainColor;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const geo = buildChevronRowGeometry(radius, rowY, rowHeight, numTeeth, CHEVRON_THICKNESS);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}