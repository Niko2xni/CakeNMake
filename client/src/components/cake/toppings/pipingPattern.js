import * as THREE from 'three';

export function addPipingPattern(group, x, y, z, pattern, color) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.6 });
  const radius = 0.55;  // scaled up ~2.5× from 0.22

  const addDot = (px, pz, s = 0.10) => {
    const geo = new THREE.SphereGeometry(s, 8, 8);
    geo.scale(1, 0.5, 1);
    const dot = new THREE.Mesh(geo, mat);
    dot.position.set(x + px, y + 0.10, z + pz);
    group.add(dot);
  };

  if (pattern === 'shell') {
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const a = t * Math.PI * 3;
      const r = t * radius;
      const sx = Math.cos(a) * r;
      const sz = Math.sin(a) * r;
      const geo = new THREE.SphereGeometry(0.075 + t * 0.05, 6, 6);
      geo.scale(1, 0.5, 1);
      const dot = new THREE.Mesh(geo, mat);
      dot.position.set(x + sx, y + 0.10 + t * 0.07, z + sz);
      group.add(dot);
    }
  } else if (pattern === 'star') {
    for (let arm = 0; arm < 5; arm++) {
      const baseA = (arm / 5) * Math.PI * 2 - Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const r = t * radius;
        const geo = new THREE.SphereGeometry(0.10 - t * 0.038, 6, 6);
        geo.scale(1, 0.5, 1);
        const dot = new THREE.Mesh(geo, mat);
        dot.position.set(x + Math.cos(baseA) * r, y + 0.10, z + Math.sin(baseA) * r);
        group.add(dot);
      }
    }
  } else if (pattern === 'round') {
    for (let ring = 0; ring < 3; ring++) {
      const rr = (ring + 1) * radius * 0.33;
      const count = 8 + ring * 4;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const s = 0.10 - ring * 0.02;
        addDot(Math.cos(a) * rr, Math.sin(a) * rr, s);
      }
    }
    const centerG = new THREE.SphereGeometry(0.125, 8, 8);
    centerG.scale(1, 0.5, 1);
    const center = new THREE.Mesh(centerG, mat);
    center.position.set(x, y + 0.10, z);
    group.add(center);
  } else if (pattern === 'leaf') {
    addDot(0, 0, 0.10);
    const leafPoints = [[0.15, 0], [0.30, -0.10], [0.20, -0.25], [0, -0.35], [-0.20, -0.25], [-0.30, -0.10], [-0.15, 0]];
    for (const [lx, lz] of leafPoints) addDot(lx, lz);
  } else if (pattern === 'zigzag') {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const sx = (t - 0.5) * radius * 1.6;
      const sz = (i % 2 === 0 ? 1 : -1) * radius * 0.5;
      const geo = new THREE.SphereGeometry(0.112, 6, 6);
      geo.scale(1, 0.5, 1);
      const dot = new THREE.Mesh(geo, mat);
      dot.position.set(x + sx, y + 0.10, z + sz);
      group.add(dot);
    }
  }
}
