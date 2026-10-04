import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildAndAddDecoration, buildRotatedDecoration } from '@/components/cake/CakeScene.jsx';
import { areFontsReady, onFontsReady } from '@/components/cake/cakeFonts';

// A small, self-contained 3D viewport that shows the armed Center design at
// its current rotationY/rotationX -- reuses buildAndAddDecoration (the same
// function that builds both the real placed item and the on-cake ghost) so
// this never drifts out of sync with what actually gets built on drop.
//
// This exists because the on-cake ghost only appears while hovering over
// the cake, from whatever angle the camera happens to be at -- there was no
// way to just look at "what does this thing look like right now" without
// hunting for a moment mid-drag. This is a static, always-visible view in
// the panel itself instead.
export default function DecorationPreview({
  designId,
  orientation,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0,
  color = '#F6DEAB',
  colorId = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const itemGroupRef = useRef(null);
  const [fontsReady, setFontsReady] = useState(() => areFontsReady());

  // Buttercream Text letters need a loaded font to build at all (see
  // buildAndAddDecoration's 'letter' branch in CakeScene.jsx, which just
  // returns early -- rendering nothing -- if the font isn't ready yet).
  // Every other design here is plain mesh geometry with no such
  // dependency, so this was never needed before letters existed. Without
  // this, arming a letter before fonts finish loading would leave this
  // preview permanently blank until something else (a rotation change,
  // re-arming) happened to re-trigger the rebuild effect below.
  useEffect(() => {
    if (fontsReady) return undefined;
    onFontsReady(() => setFontsReady(true));
    return undefined;
  }, [fontsReady]);

  // One-time scene/renderer/camera setup.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1);
    mount.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight('#FFFFFF', 1.15);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#FFFFFF', 0.35);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);
    scene.add(new THREE.AmbientLight('#FFFFFF', 0.55));

    const itemGroup = new THREE.Group();
    scene.add(itemGroup);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    itemGroupRef.current = itemGroup;

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    resizeObserver.observe(mount);

    return () => {
      resizeObserver.disconnect();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      renderer.forceContextLoss?.();
    };
  }, []);

  // Rebuild the item and re-fit the camera whenever the design, pose, or
  // rotation changes.
  useEffect(() => {
    const itemGroup = itemGroupRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!itemGroup || !renderer || !scene || !camera || !designId) return;

    // Deliberately not disposing children's geometry/materials -- see the
    // unmount cleanup above for why (shared cached resources, reused by
    // every real placement of that design on the actual cake).
    while (itemGroup.children.length > 0) {
      itemGroup.remove(itemGroup.children[0]);
    }

    // Measured unrotated, purely for camera fit (radius + look-at center)
    // -- a sphere's radius is rotation-invariant, but an axis-aligned box
    // measured on an already-rotated object isn't, so this has to happen
    // before any rotation for the camera distance to stay stable as the
    // item turns.
    const measureGroup = new THREE.Group();
    // Scale 1 == the true real-world size this design was calibrated at
    // (see the 8x5 reference-cake scale notes in CakeScene.jsx) -- the
    // camera fit below adapts to whatever size that produces per design,
    // rather than needing a per-design fixed camera distance.
    buildAndAddDecoration(measureGroup, designId, 0, 0, 0, 1, color, Math.random, orientation, colorId);
    const box = new THREE.Box3().setFromObject(measureGroup);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, 0.05);

    // The actual (rotated) preview content -- same buildRotatedDecoration
    // the on-cake ghost and final placed render use, which rotates around
    // the design's own measured true center rather than whatever local-
    // origin convention its mesh-building code happens to use. Without
    // this, tilting rotated the design around its resting BASE instead of
    // its middle, so the whole thing visibly swung/orbited away from
    // camera as tilt increased instead of spinning in place -- most
    // obvious on Buttercream Text letters, which are flat and thin enough
    // in one direction that the base and the true center are noticeably
    // far apart.
    const rotatedGroup = buildRotatedDecoration(designId, orientation, rotationX, rotationY, 1, color, Math.random, rotationZ, colorId);
    itemGroup.add(rotatedGroup);

    // Auto-fit: the designs vary hugely in size (a Chocolate Bear vs a
    // Hershey's Kiss), so a fixed camera distance would leave some tiny
    // and clip others. Frame each one by its own bounding sphere instead.
    // Centered on the sphere's actual center (not a hardcoded origin),
    // since some designs sit offset from their own local (0,0,0) -- e.g.
    // standing Oreo's built-in y + 1.55*scale lift.
    const fitDist = (radius / Math.sin((camera.fov * Math.PI / 180) / 2)) * 1.5;
    const rotBox = new THREE.Box3().setFromObject(rotatedGroup);
    const center = new THREE.Vector3();
    rotBox.getCenter(center);
    // Level, not angled down -- an elevated camera looking down implies a
    // surface the item is resting on, which is exactly the illusion that
    // was reading as clipping when the item pitched. Straight-on framing
    // has no such implied floor, so the whole item stays visible with
    // even clearance no matter how it's rotated.
    camera.position.set(center.x, center.y, center.z + fitDist);
    camera.lookAt(center);
    camera.near = Math.max(fitDist - radius * 3, 0.01);
    camera.far = fitDist + radius * 3;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }, [designId, orientation, rotationY, rotationX, rotationZ, color, colorId, fontsReady]);

  return <div ref={mountRef} className="w-full h-32 rounded-xl bg-muted/40 overflow-hidden" />;
}