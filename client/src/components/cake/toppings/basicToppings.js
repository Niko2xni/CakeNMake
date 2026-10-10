import * as THREE from 'three';
export { addCherry } from './cherry';
export { addStrawberry } from './strawberry';
export { addBlueberry } from './blueberry';
export { addMango, addMangoCube } from './mango';
export { addRosette } from './floralRosette';

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

