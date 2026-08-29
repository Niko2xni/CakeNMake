import * as THREE from 'three';

/**
 * Adds a tuxedo decoration on the FRONT SIDE of the cake.
 * Bow tie sits at the top, lapels drape down, shirt front + buttons below.
 * @param {THREE.Group} group
 * @param {number} topRadius - radius of the top (smallest) layer
 * @param {number} topY - Y of the top cake surface
 */
export function addTuxedo(group, topRadius, topY, color = '#111111') {
  // Scale dimensions proportionally to cake radius
  const scaleFactor = topRadius / 4; // Normalize to old radius (~2-2.5 units)
  
  // Place on the front face of the top layer
  // The top layer has radius topRadius, height scales with size
  const layerHeight = topRadius * 0.4; // Proportional to radius
  const midY = topY - layerHeight / 2;      // vertical center of top layer
  const faceZ = topRadius + (topRadius * 0.02); // Proportional offset from cake surface

  // ── Materials ──────────────────────────────────────────────────────────────
  const blackMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.55,
    metalness: 0.05,
  });

  // Slightly glossy satin for bow tie
  const satinMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });

  const whiteMat = new THREE.MeshPhysicalMaterial({
    color: '#F8F8F6',
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.3,
  });

  const buttonMat = new THREE.MeshPhysicalMaterial({
    color: '#EFEFEF',
    roughness: 0.3,
    metalness: 0.05,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15,
  });

  // ── Helper: flat extruded shape on the front face ──────────────────────────
  // All shapes are in the XY plane, then rotated to face forward (along Z)

  // ── Left lapel ─────────────────────────────────────────────────────────────
  // V-shaped drape going down-left from center
  const leftLapelShape = new THREE.Shape();
  leftLapelShape.moveTo(0, 0.05 * scaleFactor);
  leftLapelShape.lineTo(-0.55 * scaleFactor, 0.1 * scaleFactor);
  leftLapelShape.lineTo(-0.75 * scaleFactor, -0.18 * scaleFactor);
  leftLapelShape.lineTo(-0.2 * scaleFactor, -0.55 * scaleFactor);
  leftLapelShape.lineTo(0.08 * scaleFactor, -0.28 * scaleFactor);
  leftLapelShape.lineTo(0, 0.05 * scaleFactor);

  const leftLapelGeo = new THREE.ExtrudeGeometry(leftLapelShape, {
    depth: 0.05 * scaleFactor,
    bevelEnabled: false,
  });
  const leftLapel = new THREE.Mesh(leftLapelGeo, blackMat);
  // rotate so shape lies flat against the front face
  leftLapel.rotation.y = 0; // already faces +Z after extrude
  leftLapel.position.set(-0.05 * scaleFactor, midY + 0.18 * scaleFactor, faceZ);
  leftLapel.castShadow = true;
  group.add(leftLapel);

  // ── Right lapel (mirror) ───────────────────────────────────────────────────
  const rightLapelShape = new THREE.Shape();
  rightLapelShape.moveTo(0, 0.05 * scaleFactor);
  rightLapelShape.lineTo(0.55 * scaleFactor, 0.1 * scaleFactor);
  rightLapelShape.lineTo(0.75 * scaleFactor, -0.18 * scaleFactor);
  rightLapelShape.lineTo(0.2 * scaleFactor, -0.55 * scaleFactor);
  rightLapelShape.lineTo(-0.08 * scaleFactor, -0.28 * scaleFactor);
  rightLapelShape.lineTo(0, 0.05 * scaleFactor);

  const rightLapelGeo = new THREE.ExtrudeGeometry(rightLapelShape, {
    depth: 0.05 * scaleFactor,
    bevelEnabled: false,
  });
  const rightLapel = new THREE.Mesh(rightLapelGeo, blackMat);
  rightLapel.position.set(0.05 * scaleFactor, midY + 0.18 * scaleFactor, faceZ);
  rightLapel.castShadow = true;
  group.add(rightLapel);

  // ── Shirt front (white vertical strip) ────────────────────────────────────
  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(-0.15 * scaleFactor, 0.28 * scaleFactor);
  shirtShape.lineTo(0.15 * scaleFactor, 0.28 * scaleFactor);
  shirtShape.lineTo(0.13 * scaleFactor, -0.38 * scaleFactor);
  shirtShape.lineTo(0, -0.46 * scaleFactor);
  shirtShape.lineTo(-0.13 * scaleFactor, -0.38 * scaleFactor);
  shirtShape.lineTo(-0.15 * scaleFactor, 0.28 * scaleFactor);

  const shirtGeo = new THREE.ExtrudeGeometry(shirtShape, {
    depth: 0.055 * scaleFactor,
    bevelEnabled: false,
  });
  const shirt = new THREE.Mesh(shirtGeo, whiteMat);
  shirt.position.set(0, midY + 0.08 * scaleFactor, faceZ + 0.01 * scaleFactor);
  shirt.castShadow = true;
  group.add(shirt);

  // ── White side panels (shirt pleats hugging the button strip) ─────────────
  // Panel width and height to match the button strip area
  const panelW = 0.28 * scaleFactor;
  const panelH = 0.62 * scaleFactor;
  const panelGeoL = new THREE.BoxGeometry(panelW, panelH, 0.05 * scaleFactor);
  const panelGeoR = new THREE.BoxGeometry(panelW, panelH, 0.05 * scaleFactor);

  // Left panel: sits just to the left of the center strip
  const leftPanel = new THREE.Mesh(panelGeoL, whiteMat);
  leftPanel.position.set(-0.15 * scaleFactor - panelW / 2, midY + 0.08 * scaleFactor - panelH / 2 + panelH * 0.55, faceZ + 0.03 * scaleFactor);
  leftPanel.castShadow = true;
  group.add(leftPanel);

  // Right panel: sits just to the right of the center strip
  const rightPanel = new THREE.Mesh(panelGeoR, whiteMat);
  rightPanel.position.set(0.15 * scaleFactor + panelW / 2, midY + 0.08 * scaleFactor - panelH / 2 + panelH * 0.55, faceZ + 0.03 * scaleFactor);
  rightPanel.castShadow = true;
  group.add(rightPanel);

  // ── Buttons (3 stacked on shirt) ───────────────────────────────────────────
  const buttonOffsets = [0.12 * scaleFactor, -0.06 * scaleFactor, -0.24 * scaleFactor];
  for (let i = 0; i < 3; i++) {
    // Button disc (cylinder lying flat = rotated on X)
    const btnGeo = new THREE.CylinderGeometry(0.07 * scaleFactor, 0.07 * scaleFactor, 0.04 * scaleFactor, 20);
    const btn = new THREE.Mesh(btnGeo, buttonMat);
    btn.rotation.x = Math.PI / 2; // face forward
    btn.position.set(0, midY + buttonOffsets[i], faceZ + 0.08 * scaleFactor);
    btn.castShadow = true;
    group.add(btn);

    // 4 button holes
    for (let h = 0; h < 4; h++) {
      const ha = (h / 4) * Math.PI * 2;
      const holeMat = new THREE.MeshBasicMaterial({ color: '#999999' });
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01 * scaleFactor, 0.01 * scaleFactor, 0.05 * scaleFactor, 6),
        holeMat
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(
        Math.cos(ha) * 0.025 * scaleFactor,
        midY + buttonOffsets[i] + Math.sin(ha) * 0.025 * scaleFactor,
        faceZ + 0.1 * scaleFactor
      );
      group.add(hole);
    }
  }

  // ── Bow tie ────────────────────────────────────────────────────────────────
  const bowY = midY + 0.3 * scaleFactor; // sits near the top of the layer

  // Center knot
  const knotGeo = new THREE.BoxGeometry(0.14 * scaleFactor, 0.18 * scaleFactor, 0.1 * scaleFactor);
  const knot = new THREE.Mesh(knotGeo, satinMat);
  knot.position.set(0, bowY, faceZ + 0.08 * scaleFactor);
  knot.castShadow = true;
  group.add(knot);

  // Left bow wing
  const leftWingShape = new THREE.Shape();
  leftWingShape.moveTo(0, 0.07 * scaleFactor);
  leftWingShape.lineTo(-0.55 * scaleFactor, 0.22 * scaleFactor);
  leftWingShape.lineTo(-0.65 * scaleFactor, 0);
  leftWingShape.lineTo(-0.55 * scaleFactor, -0.22 * scaleFactor);
  leftWingShape.lineTo(0, -0.07 * scaleFactor);
  leftWingShape.lineTo(0, 0.07 * scaleFactor);

  const lwGeo = new THREE.ExtrudeGeometry(leftWingShape, {
    depth: 0.07 * scaleFactor,
    bevelEnabled: true,
    bevelSize: 0.015 * scaleFactor,
    bevelThickness: 0.015 * scaleFactor,
    bevelSegments: 2,
  });
  const leftWing = new THREE.Mesh(lwGeo, satinMat);
  leftWing.position.set(-0.07 * scaleFactor, bowY - 0.07 * scaleFactor, faceZ + 0.04 * scaleFactor);
  leftWing.castShadow = true;
  group.add(leftWing);

  // Right bow wing
  const rightWingShape = new THREE.Shape();
  rightWingShape.moveTo(0, 0.07 * scaleFactor);
  rightWingShape.lineTo(0.55 * scaleFactor, 0.22 * scaleFactor);
  rightWingShape.lineTo(0.65 * scaleFactor, 0);
  rightWingShape.lineTo(0.55 * scaleFactor, -0.22 * scaleFactor);
  rightWingShape.lineTo(0, -0.07 * scaleFactor);
  rightWingShape.lineTo(0, 0.07 * scaleFactor);

  const rwGeo = new THREE.ExtrudeGeometry(rightWingShape, {
    depth: 0.07 * scaleFactor,
    bevelEnabled: true,
    bevelSize: 0.015 * scaleFactor,
    bevelThickness: 0.015 * scaleFactor,
    bevelSegments: 2,
  });
  const rightWing = new THREE.Mesh(rwGeo, satinMat);
  rightWing.position.set(0.07 * scaleFactor, bowY - 0.07 * scaleFactor, faceZ + 0.04 * scaleFactor);
  rightWing.castShadow = true;
  group.add(rightWing);
}