import * as THREE from 'three';

/**
 * Adds a whipped-cream table skirt around a cake layer.
 * @param {THREE.Group} group - the cake group to add to
 * @param {number} radius - the radius of the cake layer
 * @param {number} baseY - the Y position of the bottom of this layer
 * @param {number} layerHeight - the height of the cake layer
 */
export function addWhippedCreamSkirt(group, radius, baseY, layerHeight, color = '#FFFEF5') {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0.0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
  });

  // Scale dimensions proportionally to cake radius
  const scaleFactor = radius / 4; // Normalize to old radius (~2-2.5 units)
  const swagCount = Math.max(24, Math.floor(24 * scaleFactor)); // More swags for larger cakes
  const swagDepth = radius * 0.08; // Proportional to cake size
  const swagHeight = layerHeight * 0.75; // Keep proportional to layer height
  const swagY = baseY + swagHeight * 0.5 + (radius * 0.02);

  for (let i = 0; i < swagCount; i++) {
    const angle = (i / swagCount) * Math.PI * 2;
    const nextAngle = ((i + 1) / swagCount) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;

    // Each swag is a flattened sphere (the "pouf" of whipped cream)
    const pouchGeo = new THREE.SphereGeometry(swagDepth, 12, 10);
    pouchGeo.scale(0.9, 1.1, 0.7);
    const pouch = new THREE.Mesh(pouchGeo, mat);

    const pouchR = radius + (radius * 0.02);
    pouch.position.set(
      Math.cos(midAngle) * pouchR,
      swagY,
      Math.sin(midAngle) * pouchR
    );
    pouch.rotation.y = -midAngle;
    pouch.castShadow = true;
    group.add(pouch);

    // Add a small dollop/peak at the bottom of each swag
    const dollopSize = swagDepth * 0.3;
    const dollop = new THREE.Mesh(
      new THREE.ConeGeometry(dollopSize, dollopSize * 2, 8),
      mat
    );
    dollop.position.set(
      Math.cos(midAngle) * pouchR,
      swagY - swagDepth * 0.9,
      Math.sin(midAngle) * pouchR
    );
    dollop.rotation.x = Math.PI; // point downward
    dollop.castShadow = true;
    group.add(dollop);

    // Add small connector beads between each swag
    const beadSize = swagDepth * 0.3;
    const beadGeo = new THREE.SphereGeometry(beadSize, 8, 8);
    const bead = new THREE.Mesh(beadGeo, mat);
    bead.position.set(
      Math.cos(angle) * (radius + (radius * 0.03)),
      swagY + (swagDepth * 0.2),
      Math.sin(angle) * (radius + (radius * 0.03))
    );
    bead.castShadow = true;
    group.add(bead);
  }

  // Top ridge pipe along the top of the skirt
  const ridgeTubeSegments = 64;
  const ridgePoints = [];
  for (let i = 0; i <= ridgeTubeSegments; i++) {
    const a = (i / ridgeTubeSegments) * Math.PI * 2;
    ridgePoints.push(new THREE.Vector3(
      Math.cos(a) * (radius + (radius * 0.05)),
      swagY + swagDepth * 0.6,
      Math.sin(a) * (radius + (radius * 0.05))
    ));
  }
  const ridgeCurve = new THREE.CatmullRomCurve3(ridgePoints, true);
  const ridgeTube = new THREE.Mesh(
    new THREE.TubeGeometry(ridgeCurve, 128, swagDepth * 0.25, 8, true),
    mat
  );
  ridgeTube.castShadow = true;
  group.add(ridgeTube);
}