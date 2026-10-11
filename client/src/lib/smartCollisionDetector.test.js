import { describe, it, expect } from 'vitest';
import {
  CENTER_ITEM_RADII,
  getCenterItemRadius,
  getItemFootprint,
  doFootprintsClash,
  doItemsClash,
  CENTER_BOUNDARY_RESERVE,
  getCenterPlacementBoundaryRadius,
  isFootprintInBoundary,
  getEdgeDelicatesObstacles,
  getDelicatesAwareBoundaryRadius,
  pruneItemsCollidingWithEdgeDelicates,
  getEdgeFerreroObstacles,
  getFerreroAwareBoundaryRadius,
  pruneItemsCollidingWithEdgeFerrero,
  getTopTierRadiusFromConfig,
} from './cakeConfig';

describe('Smart Collision Detector for Center Tab Designs', () => {
  it('defines accurate physical radii for all Center items matching their 3D meshes', () => {
    expect(CENTER_ITEM_RADII.strawberry).toBe(0.30);
    expect(CENTER_ITEM_RADII.cherry).toBe(0.34);
    expect(CENTER_ITEM_RADII.blueberry).toBe(0.25);
    expect(CENTER_ITEM_RADII.mangoCube).toBe(0.24);
    expect(CENTER_ITEM_RADII.ferreroRocher).toBe(0.62);
    expect(CENTER_ITEM_RADII.oreo).toBe(0.875);
    expect(CENTER_ITEM_RADII.hersheysKisses).toBe(0.40);
    expect(CENTER_ITEM_RADII.chocolateBear).toBe(0.56);
    expect(CENTER_ITEM_RADII.basketball).toBe(0.54);
    expect(CENTER_ITEM_RADII.soccerball).toBe(0.54);
  });

  it('keeps delicate edible items at fixed 1:1 real-life size while scaling scalable items', () => {
    // Ferrero Rocher, Strawberry, Cherry, Blueberry, Mango Cube, Hershey Kisses, Basketball, Soccer Ball are delicate fixed-scale
    expect(getCenterItemRadius('ferreroRocher', 1.5)).toBe(0.62);
    expect(getCenterItemRadius('ferreroRocher', 0.5)).toBe(0.62);
    expect(getCenterItemRadius('strawberry', 1.5)).toBe(0.30);
    expect(getCenterItemRadius('cherry', 1.5)).toBe(0.34);
    expect(getCenterItemRadius('blueberry', 1.5)).toBe(0.25);
    expect(getCenterItemRadius('mangoCube', 1.5)).toBe(0.24);
    expect(getCenterItemRadius('hersheysKisses', 1.5)).toBe(0.40);
    expect(getCenterItemRadius('basketball', 1.5)).toBe(0.54);
    expect(getCenterItemRadius('soccerball', 1.5)).toBe(0.54);

    // Chocolate Bear, Oreo, Letters scale with centerDecorScale
    expect(getCenterItemRadius('chocolateBear', 1.0)).toBe(0.56);
    expect(getCenterItemRadius('chocolateBear', 1.2)).toBeCloseTo(0.672);
    expect(getCenterItemRadius('oreo', 1.0)).toBe(0.875);
    expect(getCenterItemRadius('oreo', 0.8)).toBeCloseTo(0.70);
  });

  it('detects and prevents clash between two Ferrero Rochers placed too close', () => {
    // Required minimum separation = 0.62 + 0.62 + 0.02 = 1.26
    const item1 = { designId: 'ferreroRocher', x: 0, z: 0 };
    
    // Distance 0.70 (clearly overlapping)
    const overlapping = { designId: 'ferreroRocher', x: 0.70, z: 0 };
    expect(doItemsClash(item1, overlapping)).toBe(true);

    // Distance 1.20 (still intersecting)
    const tooClose = { designId: 'ferreroRocher', x: 1.20, z: 0 };
    expect(doItemsClash(item1, tooClose)).toBe(true);

    // Distance 1.28 (fully clear and separated)
    const clear = { designId: 'ferreroRocher', x: 1.28, z: 0 };
    expect(doItemsClash(item1, clear)).toBe(false);
  });

  it('detects and prevents clash between Ferrero Rocher and Chocolate Bear', () => {
    // Required minimum separation = 0.62 + 0.56 + 0.02 = 1.20
    const ferrero = { designId: 'ferreroRocher', x: 0, z: 0 };
    const bearClose = { designId: 'chocolateBear', x: 0.85, z: 0 };
    const bearSafe = { designId: 'chocolateBear', x: 1.25, z: 0 };

    expect(doItemsClash(ferrero, bearClose)).toBe(true);
    expect(doItemsClash(ferrero, bearSafe)).toBe(false);
  });

  it('acknowledges free distance using 2D OBB for standing Oreo cookie faces', () => {
    // Standing Oreo: halfLength = 0.875 along cookie diameter, halfWidth = 0.23 across wafer thickness
    const standingOreo = { designId: 'oreo', orientation: 'standing', x: 0, z: 0, rotation: 0 };
    
    // Strawberry placed near wafer face (along Z axis):
    // Minimum safe Z = halfWidth (0.23) + strawberry radius (0.30) + gap (0.02) = 0.55
    const strawberryTooClose = { designId: 'strawberry', x: 0, z: 0.45 };
    const strawberryInFreeDistance = { designId: 'strawberry', x: 0, z: 0.58 };

    expect(doItemsClash(standingOreo, strawberryTooClose)).toBe(true);
    // Old circular model blocked everything within 0.875 + 0.30 = 1.175, but real free space exists!
    expect(doItemsClash(standingOreo, strawberryInFreeDistance)).toBe(false);

    // Two parallel standing Oreos side by side along Z:
    // Minimum safe Z = 0.23 + 0.23 + 0.02 = 0.48
    const oreoParallelClose = { designId: 'oreo', orientation: 'standing', x: 0, z: 0.40, rotation: 0 };
    const oreoParallelSafe = { designId: 'oreo', orientation: 'standing', x: 0, z: 0.50, rotation: 0 };
    expect(doItemsClash(standingOreo, oreoParallelClose)).toBe(true);
    expect(doItemsClash(standingOreo, oreoParallelSafe)).toBe(false);
  });

  it('allows placing a strawberry in the real free space between two existing strawberries', () => {
    // Strawberry radius = 0.30. Spacing needed = 0.30 + 0.30 + 0.02 = 0.62
    const strawberryLeft = { designId: 'strawberry', x: -0.65, z: 0 };
    const strawberryRight = { designId: 'strawberry', x: 0.65, z: 0 };
    const candidateMiddle = { designId: 'strawberry', x: 0, z: 0 };

    // With calibrated physical radius 0.30, the 0.65 distance is valid and clear
    expect(doItemsClash(candidateMiddle, strawberryLeft)).toBe(false);
    expect(doItemsClash(candidateMiddle, strawberryRight)).toBe(false);

    // But if placed too close (e.g. x = 0.40 from the right strawberry, distance = 0.25)
    const tooCloseToRight = { designId: 'strawberry', x: 0.40, z: 0 };
    expect(doItemsClash(tooCloseToRight, strawberryRight)).toBe(true);
  });

  it('detects and prevents clash between Strawberry, Cherry, and Hershey Kisses', () => {
    // Strawberry (0.30) + Cherry (0.34) + 0.02 = 0.66
    const strawberry = { designId: 'strawberry', x: 0, z: 0 };
    const cherryClose = { designId: 'cherry', x: 0.50, z: 0 };
    const cherrySafe = { designId: 'cherry', x: 0.70, z: 0 };
    expect(doItemsClash(strawberry, cherryClose)).toBe(true);
    expect(doItemsClash(strawberry, cherrySafe)).toBe(false);

    // Hershey Kisses (0.40) + Strawberry (0.30) + 0.02 = 0.72
    const kissClose = { designId: 'hersheysKisses', x: 0.55, z: 0 };
    const kissSafe = { designId: 'hersheysKisses', x: 0.75, z: 0 };
    expect(doItemsClash(strawberry, kissClose)).toBe(true);
    expect(doItemsClash(strawberry, kissSafe)).toBe(false);
  });

  it('detects and prevents clash between Fondant Basketball and Soccer Ball', () => {
    // Basketball (0.54) + Soccerball (0.54) + 0.02 = 1.10
    const basketball = { designId: 'basketball', x: 0, z: 0 };
    const soccerClose = { designId: 'soccerball', x: 0.90, z: 0 };
    const soccerSafe = { designId: 'soccerball', x: 1.15, z: 0 };

    expect(doItemsClash(basketball, soccerClose)).toBe(true);
    expect(doItemsClash(basketball, soccerSafe)).toBe(false);
  });

  it('enforces a single constant boundary reserve for Center designs to protect Edge designs', () => {
    // 0.48 reserve permanently preserves the rim for Edge designs (at topRadius * 0.88 fine line)
    expect(CENTER_BOUNDARY_RESERVE).toBe(0.48);

    // On a cake with top radius 4.0, boundary radius is 3.52 (4.0 * 0.88)
    expect(getCenterPlacementBoundaryRadius(4.0)).toBeCloseTo(3.52, 2);
    expect(getCenterPlacementBoundaryRadius(3.0)).toBeCloseTo(2.64, 2);
    expect(getCenterPlacementBoundaryRadius(0)).toBe(0);
  });

  it('allows placing items across the full available space up to the fine line boundary', () => {
    const boundaryR = getCenterPlacementBoundaryRadius(4.0); // 3.52
    // Standing Oreo placed well beyond the old restrictive 2.05 limit (e.g. at 2.80 and 3.20)
    const oreoNearEdge = getItemFootprint({ designId: 'oreo', orientation: 'standing', x: 2.80, z: 0, rotation: 0 });
    expect(isFootprintInBoundary(oreoNearEdge, boundaryR, 4.0)).toBe(true);

    const oreoTangential = getItemFootprint({ designId: 'oreo', orientation: 'standing', x: 0, z: 3.40, rotation: 0 });
    expect(isFootprintInBoundary(oreoTangential, boundaryR, 4.0)).toBe(true);

    // Strawberry placed near edge
    const strawberryNearEdge = getItemFootprint({ designId: 'strawberry', x: 3.40, z: 0 });
    expect(isFootprintInBoundary(strawberryNearEdge, boundaryR, 4.0)).toBe(true);

    // Completely off-cake placement is rejected
    const offCake = getItemFootprint({ designId: 'strawberry', x: 4.20, z: 0 });
    expect(isFootprintInBoundary(offCake, boundaryR, 4.0)).toBe(false);
  });

  it('detects tilted flat Oreos and uses circular footprint accordingly', () => {
    // Upright Oreo is an OBB
    const standing = getItemFootprint({ designId: 'oreo', orientation: 'standing', x: 0, z: 0, tiltX: 0 });
    expect(standing.type).toBe('obb');

    // Tilted flat Oreo (tiltX = Math.PI / 2 or 90 deg) is a circle of radius 0.875
    const tiltedFlat = getItemFootprint({ designId: 'oreo', orientation: 'standing', x: 0, z: 0, tiltX: Math.PI / 2 });
    expect(tiltedFlat.type).toBe('circle');
    expect(tiltedFlat.radius).toBe(0.875);

    // Explicitly flat Oreo
    const flat = getItemFootprint({ designId: 'oreo', orientation: 'flat', x: 0, z: 0 });
    expect(flat.type).toBe('circle');
    expect(flat.radius).toBe(0.875);
  });

  it('generates Edge Ferrero Rocher obstacles and reduces boundary due to large physical size', () => {
    const defaultBoundary = getCenterPlacementBoundaryRadius(4.0); // 3.52
    const edgeConfigNone = { mode: 'both', both: { pipingTip: 'shell' } };
    expect(getEdgeFerreroObstacles(edgeConfigNone, 4.0)).toHaveLength(0);
    expect(getFerreroAwareBoundaryRadius(4.0, edgeConfigNone)).toBeCloseTo(defaultBoundary);

    const edgeConfigFerrero = { mode: 'both', both: { pipingTip: 'ferreroRocherRim' } };
    const obstacles = getEdgeFerreroObstacles(edgeConfigFerrero, 4.0);
    expect(obstacles.length).toBeGreaterThan(0);
    expect(obstacles[0].radius).toBe(0.62);
    expect(obstacles[0].type).toBe('circle');

    const ferreroBoundary = getFerreroAwareBoundaryRadius(4.0, edgeConfigFerrero);
    // Ferrero boundary should be smaller than standard boundary due to large size
    expect(ferreroBoundary).toBeLessThan(defaultBoundary);
    expect(ferreroBoundary).toBeCloseTo(3.41 - 0.62, 1);
  });

  it('detects collisions between Center items (decorations and text) and Edge Ferrero Rochers', () => {
    const edgeConfig = { mode: 'both', both: { pipingTip: 'ferreroRocherRim' } };
    const obstacles = getEdgeFerreroObstacles(edgeConfig, 4.0);
    // Grab one of the Edge Ferrero Rocher obstacles
    const firstObstacle = obstacles[0];

    // Center strawberry placed directly on or too close to the Edge Ferrero Rocher
    const strawberryOverlapping = getItemFootprint({
      designId: 'strawberry',
      x: firstObstacle.x,
      z: firstObstacle.z,
    });
    expect(doFootprintsClash(strawberryOverlapping, firstObstacle, 0.02)).toBe(true);

    // Center strawberry placed inward away from the Edge Ferrero Rocher
    const distFromCenter = Math.hypot(firstObstacle.x, firstObstacle.z);
    const unitX = firstObstacle.x / distFromCenter;
    const unitZ = firstObstacle.z / distFromCenter;
    // Step inward by 0.62 (ferrero) + 0.30 (strawberry) + 0.10 (margin) = 1.02
    const strawberryClear = getItemFootprint({
      designId: 'strawberry',
      x: firstObstacle.x - unitX * 1.05,
      z: firstObstacle.z - unitZ * 1.05,
    });
    expect(doFootprintsClash(strawberryClear, firstObstacle, 0.02)).toBe(false);

    // Center Buttercream Letter design placed near Edge Ferrero Rocher
    const letterColliding = getItemFootprint({
      designId: 'letterUpperH',
      x: firstObstacle.x,
      z: firstObstacle.z,
    });
    expect(doFootprintsClash(letterColliding, firstObstacle, 0.02)).toBe(true);
  });

  it('prunes ONLY center items that collide with Edge Ferrero Rocher, preserving safe items', () => {
    const edgeConfigFerrero = { mode: 'both', both: { pipingTip: 'ferreroRocherRim' } };
    const obstacles = getEdgeFerreroObstacles(edgeConfigFerrero, 4.0);
    const firstObstacle = obstacles[0];

    const itemOnObstacle = {
      id: 'colliding-strawberry',
      type: 'center-strawberry-default',
      x: firstObstacle.x,
      z: firstObstacle.z,
    };
    const itemInCenter = {
      id: 'safe-strawberry-center',
      type: 'center-strawberry-default',
      x: 0,
      z: 0,
    };
    const itemInnerSafe = {
      id: 'safe-oreo-inner',
      type: 'center-oreo-standing',
      x: 0.5,
      z: 0.5,
    };
    const itemAtOuterRim = {
      id: 'colliding-rim-item',
      type: 'center-strawberry-default',
      x: 3.4,
      z: 0,
    };

    const initialPlacedItems = [
      itemOnObstacle,
      itemInCenter,
      itemInnerSafe,
      itemAtOuterRim,
    ];

    const pruned = pruneItemsCollidingWithEdgeFerrero(
      initialPlacedItems,
      edgeConfigFerrero,
      4.0,
      1.0,
      'fullyFrosted'
    );

    // Only the safe items remain; the items hit by Edge Ferrero Rocher or violating the Ferrero boundary are pruned
    expect(pruned.map((it) => it.id)).toEqual(['safe-strawberry-center', 'safe-oreo-inner']);

    // When edge design is NOT Ferrero Rocher, no items are pruned
    const edgeConfigShell = { mode: 'both', both: { pipingTip: 'shell' } };
    const untouched = pruneItemsCollidingWithEdgeFerrero(
      initialPlacedItems,
      edgeConfigShell,
      4.0,
      1.0,
      'fullyFrosted'
    );
    expect(untouched).toHaveLength(4);
  });

  it('prunes ONLY items colliding with Hershey Kisses Rim and Cherry Rim', () => {
    // 1. Hershey's Kisses Rim (radius 0.40, inset 0.48)
    const edgeConfigKisses = { mode: 'both', both: { pipingTip: 'hersheysKissRim' } };
    const kissObstacles = getEdgeDelicatesObstacles(edgeConfigKisses, 4.0);
    expect(kissObstacles.length).toBeGreaterThan(0);
    expect(kissObstacles[0].radius).toBe(0.40);

    const firstKissObs = kissObstacles[0];
    const itemOnKiss = { id: 'on-kiss', type: 'center-strawberry-default', x: firstKissObs.x, z: firstKissObs.z };
    const safeItem = { id: 'safe-center', type: 'center-strawberry-default', x: 0, z: 0 };

    const prunedKisses = pruneItemsCollidingWithEdgeDelicates([itemOnKiss, safeItem], edgeConfigKisses, 4.0);
    expect(prunedKisses.map((it) => it.id)).toEqual(['safe-center']);

    // 2. Cherry Rim (radius 0.34, inset 0.36)
    const edgeConfigCherry = { mode: 'both', both: { pipingTip: 'cherryRim' } };
    const cherryObstacles = getEdgeDelicatesObstacles(edgeConfigCherry, 4.0);
    expect(cherryObstacles.length).toBe(10);
    expect(cherryObstacles[0].radius).toBe(0.34);

    const firstCherryObs = cherryObstacles[0];
    const itemOnCherry = { id: 'on-cherry', type: 'center-strawberry-default', x: firstCherryObs.x, z: firstCherryObs.z };
    const prunedCherry = pruneItemsCollidingWithEdgeDelicates([itemOnCherry, safeItem], edgeConfigCherry, 4.0);
    expect(prunedCherry.map((it) => it.id)).toEqual(['safe-center']);
  });

  it('calculates correct top tier radius for all cake sizes with 1 or 2 layers', () => {
    expect(getTopTierRadiusFromConfig({ structure: { size: '6x6', layers: 1 } })).toBe(3.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '6x6', layers: 2 } })).toBe(2.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '8x8', layers: 1 } })).toBe(4.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '8x8', layers: 2 } })).toBe(3.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '10x10', layers: 1 } })).toBe(5.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '10x10', layers: 2 } })).toBe(4.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '12x12', layers: 1 } })).toBe(6.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: '12x12', layers: 2 } })).toBe(5.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: 'big', layers: 1 } })).toBe(4.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: 'big', layers: 2 } })).toBe(3.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: 'small', layers: 1 } })).toBe(3.0);
    expect(getTopTierRadiusFromConfig({ structure: { size: 'small', layers: 2 } })).toBe(2.0);
  });
});
