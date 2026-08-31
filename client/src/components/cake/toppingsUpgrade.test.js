import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildCherryMesh,
  addCherry,
  getSharedCherryBodyGeometry,
  getSharedCherryBodyMaterial,
  buildStrawberryMesh,
  addStrawberry,
  getSharedStrawberryBodyGeometry,
  getSharedStrawberryTextures,
  buildFloralRosetteMesh,
  addRosette,
  getSharedFloralRosetteGeometry,
  getSharedFloralRosetteMaterial,
} from './toppings';

describe('High-Fidelity Toppings Upgrade', () => {
  describe('Cherry Module', () => {
    it('creates a Cherry mesh group with expected components and shadow flags', () => {
      const cherry = buildCherryMesh(1, 2, 3, 0.85);
      expect(cherry).toBeInstanceOf(THREE.Group);
      expect(cherry.position.x).toBe(1);
      expect(cherry.position.y).toBe(2);
      expect(cherry.position.z).toBe(3);
      expect(cherry.scale.x).toBeCloseTo(0.85);

      // Cherry should contain body mesh, collar mesh, curved stem, and tip node
      expect(cherry.children.length).toBeGreaterThanOrEqual(3);
      const meshes = cherry.children.filter((c) => c.isMesh);
      expect(meshes.length).toBeGreaterThanOrEqual(3);
      meshes.forEach((mesh) => {
        expect(mesh.castShadow).toBe(true);
      });
    });

    it('caches Cherry geometry and materials properly', () => {
      const geo1 = getSharedCherryBodyGeometry();
      const geo2 = getSharedCherryBodyGeometry();
      expect(geo1).toBe(geo2);
      expect(geo1.userData.sharedCache).toBe(true);

      const mat1 = getSharedCherryBodyMaterial();
      const mat2 = getSharedCherryBodyMaterial();
      expect(mat1).toBe(mat2);
      expect(mat1.userData.sharedCache).toBe(true);
      expect(mat1.clearcoat).toBeGreaterThan(0.5); // High-gloss clearcoat glaze
    });

    it('addCherry adds a cherry to target group backwards-compatibly', () => {
      const group = new THREE.Group();
      const res = addCherry(group, 0, 0, 0);
      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBe(res);
    });
  });

  describe('Strawberry Module', () => {
    it('creates a Strawberry mesh group with body and calyx crown', () => {
      const strawberry = buildStrawberryMesh(0, 1, 0, 0.8);
      expect(strawberry).toBeInstanceOf(THREE.Group);
      expect(strawberry.children.length).toBeGreaterThanOrEqual(2);

      const bodyMesh = strawberry.children.find((c) => c.isMesh);
      expect(bodyMesh).toBeDefined();
      expect(bodyMesh.castShadow).toBe(true);

      // Calyx group with 6 sepals + pedicel
      const calyxGroup = strawberry.children.find((c) => c.isGroup);
      expect(calyxGroup).toBeDefined();
      expect(calyxGroup.children.length).toBeGreaterThanOrEqual(6);
    });

    it('generates procedural textures with achene seed pits', () => {
      const textures = getSharedStrawberryTextures();
      expect(textures.colorTexture).toBeDefined();
      expect(textures.bumpTexture).toBeDefined();
      expect(textures.colorTexture.userData.sharedCache).toBe(true);
      expect(textures.bumpTexture.userData.sharedCache).toBe(true);
    });

    it('caches Strawberry geometry and material', () => {
      const geo1 = getSharedStrawberryBodyGeometry();
      const geo2 = getSharedStrawberryBodyGeometry();
      expect(geo1).toBe(geo2);
      expect(geo1.userData.sharedCache).toBe(true);
    });

    it('addStrawberry adds strawberry to target group backwards-compatibly', () => {
      const group = new THREE.Group();
      const res = addStrawberry(group, 0, 0, 0);
      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBe(res);
    });
  });

  describe('Floral Rosette Module', () => {
    it('creates a Floral Rosette mesh with star-tip fluted geometry', () => {
      const rosette = buildFloralRosetteMesh(2, 0, -1, 0.9, '#FF8BA7');
      expect(rosette).toBeInstanceOf(THREE.Mesh);
      expect(rosette.position.x).toBe(2);
      expect(rosette.position.y).toBe(0);
      expect(rosette.position.z).toBe(-1);
      expect(rosette.scale.x).toBeCloseTo(0.9);
      expect(rosette.castShadow).toBe(true);
      expect(rosette.receiveShadow).toBe(true);
    });

    it('supports dynamic color tinting with material caching', () => {
      const pinkMat1 = getSharedFloralRosetteMaterial('#FF8BA7');
      const pinkMat2 = getSharedFloralRosetteMaterial('#FF8BA7');
      expect(pinkMat1).toBe(pinkMat2);

      const yellowMat = getSharedFloralRosetteMaterial('#FFD93D');
      expect(yellowMat).not.toBe(pinkMat1);
      expect(yellowMat.color.getHexString().toUpperCase()).toBe('FFD93D');
    });

    it('caches Floral Rosette geometry', () => {
      const geo1 = getSharedFloralRosetteGeometry();
      const geo2 = getSharedFloralRosetteGeometry();
      expect(geo1).toBe(geo2);
      expect(geo1.userData.sharedCache).toBe(true);
      expect(geo1.attributes.position.count).toBeGreaterThan(100);
      expect(geo1.attributes.normal).toBeDefined();
    });

    it('addRosette adds rosette to target group backwards-compatibly with color', () => {
      const group = new THREE.Group();
      const res = addRosette(group, 0, 0, 0, '#4CAF50');
      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBe(res);
    });
  });
});
