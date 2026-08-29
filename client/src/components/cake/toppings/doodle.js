import * as THREE from 'three';
import { getDoodleShape } from '../sets/premadeDoodles';
import { getFrostingMaterial } from '../frostingMaterial';

// colorId is still accepted (the tool-id string format still carries one,
// see CenterSection.jsx's DOODLE_COLOR_PLACEHOLDER) but is no longer used
// to resolve the color — hexColor (Sugar Color's frostColor) drives it
// instead, since Center's own doodle color picker was removed.
export function addPremadeDoodle(group, cx, baseY, cz, actualDomeHeight, topRadius, shapeId, colorId, hexColor, rotation = 0) {
  const doodleShape = getDoodleShape(shapeId);
  if (!doodleShape) return;

  const mat = getFrostingMaterial(hexColor);

  const pts = doodleShape.points.map(p => new THREE.Vector3(p[0] * 0.4, 0, p[1] * 0.4));
  const isClosed = doodleShape.closed !== false; // default to closed if not specified
  // Remove trailing duplicate if provided (only matters for closed shapes)
  if (isClosed && pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 0.001) {
    pts.pop();
  }

  const curve = new THREE.CatmullRomCurve3(pts, isClosed);

  const tubeGeo = new THREE.TubeGeometry(curve, 128, 0.05, 8, isClosed);

  // Conform to dome and apply rotation
  const pos = tubeGeo.attributes.position;
  const R = topRadius - 0.15;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    // Apply rotation
    const rx = vx * Math.cos(rotation) - vz * Math.sin(rotation);
    const rz = vx * Math.sin(rotation) + vz * Math.cos(rotation);
    vx = rx;
    vz = rz;

    const worldX = cx + vx;
    const worldZ = cz + vz;
    const r = Math.sqrt(worldX * worldX + worldZ * worldZ);

    let heightAtR = baseY;
    if (r < R) {
      heightAtR += actualDomeHeight * (1 - (r / R) * (r / R));
    }

    // Set world Y (which is local Y + heightAtR)
    pos.setXYZ(i, vx, vy + heightAtR, vz);
  }
  pos.needsUpdate = true;
  tubeGeo.computeVertexNormals();
  tubeGeo.computeBoundingSphere();
  tubeGeo.computeBoundingBox();

  const mesh = new THREE.Mesh(tubeGeo, mat);
  mesh.position.set(cx, 0, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}
