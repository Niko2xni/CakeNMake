import * as THREE from 'three';

export function addCherry(group, x, y, z, rand) {
  const cherryMat = new THREE.MeshPhysicalMaterial({ color: '#CC0033', roughness: 0.2, metalness: 0.1, clearcoat: 0.9 });
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), cherryMat);
  cherry.position.set(x, y + 0.35, z);
  cherry.castShadow = true;
  group.add(cherry);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), new THREE.MeshStandardMaterial({ color: '#2D5016' }));
  stem.position.set(x, y + 0.75, z);
  stem.rotation.z = rand() * 0.3 - 0.15;
  group.add(stem);
}

export function addStrawberry(group, x, y, z) {
  const strawGeo = new THREE.SphereGeometry(0.42, 12, 12);
  strawGeo.scale(1, 1.3, 1);
  const straw = new THREE.Mesh(strawGeo, new THREE.MeshPhysicalMaterial({ color: '#E53E3E', roughness: 0.6, clearcoat: 0.3 }));
  straw.position.set(x, y + 0.42, z);
  straw.castShadow = true;
  group.add(straw);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#2D7D2D' }));
  leaf.position.set(x, y + 0.9, z);
  leaf.rotation.x = Math.PI;
  group.add(leaf);
}

export function addCandle(group, x, y, z, rand) {
  const candleColors = ['#FF8BA7', '#FFD93D', '#98E4C6', '#C8A2E8', '#7B9ED9', '#FFB347', '#FF6B9D'];
  const color = candleColors[Math.floor(rand() * candleColors.length)];
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 12), new THREE.MeshStandardMaterial({ color }));
  candle.position.set(x, y + 0.7, z);
  candle.castShadow = true;
  group.add(candle);
  const flameGeo = new THREE.SphereGeometry(0.14, 8, 8);
  flameGeo.scale(1, 1.8, 1);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: '#FFD700' }));
  flame.position.set(x, y + 1.5, z);
  group.add(flame);
  const innerGeo = new THREE.SphereGeometry(0.07, 8, 8);
  innerGeo.scale(1, 1.6, 1);
  const inner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
  inner.position.set(x, y + 1.48, z);
  group.add(inner);
}

export function addChocolateChip(group, x, y, z) {
  const chipGeo = new THREE.SphereGeometry(0.2, 8, 8);
  chipGeo.scale(1, 0.6, 1);
  const chip = new THREE.Mesh(chipGeo, new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.7 }));
  chip.position.set(x, y + 0.12, z);
  group.add(chip);
}

export function addRosette(group, x, y, z, frostColor) {
  const roseMat = new THREE.MeshPhysicalMaterial({ color: frostColor, roughness: 0.3, clearcoat: 0.5 });
  const roseGeo = new THREE.SphereGeometry(0.36, 12, 12);
  roseGeo.scale(1, 0.6, 1);
  const rose = new THREE.Mesh(roseGeo, roseMat);
  rose.position.set(x, y + 0.24, z);
  group.add(rose);
  for (let p = 0; p < 5; p++) {
    const pa = (p / 5) * Math.PI * 2;
    const petalGeo = new THREE.SphereGeometry(0.24, 8, 8);
    petalGeo.scale(1, 0.5, 0.8);
    const petal = new THREE.Mesh(petalGeo, roseMat);
    petal.position.set(x + Math.cos(pa) * 0.3, y + 0.2, z + Math.sin(pa) * 0.3);
    group.add(petal);
  }
}
