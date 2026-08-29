import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FLAVORS } from "../../lib/cakeFlavors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Darken an RGB triple by a factor in 0–1 */
function dim(rgb, f) {
  return `${Math.round(rgb[0] * f)},${Math.round(rgb[1] * f)},${Math.round(rgb[2] * f)}`;
}

// ─── Shared Geometry (built once) ─────────────────────────────────────────────

const CAKE_RADIUS = 2;
const CAKE_HEIGHT = 0.88;
const HALF_H = CAKE_HEIGHT / 2;

/**
 * DefaultSpongeGeometry — shared across all flavor renders.
 * Dome on top, slight bottom-rim rounding.
 * Geometry, pore, bump, roughness, and normal topology never change.
 */
function buildDefaultSpongeGeometry() {
  const geo = new THREE.CylinderGeometry(
    CAKE_RADIUS, CAKE_RADIUS, CAKE_HEIGHT, 80, 20, false,
  );
  const pos = geo.attributes.position;
  const domeAmount = 0.16;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Top cap — quadratic dome falloff from center
    if (y > HALF_H - 0.02) {
      const dist = Math.sqrt(x * x + z * z);
      const t = Math.max(0, 1 - dist / CAKE_RADIUS);
      pos.setY(i, y + domeAmount * t * t);
    }

    // Bottom rim — nudge inward & slightly up for soft rounding
    if (Math.abs(y + HALF_H) < 0.02 && Math.sqrt(x * x + z * z) > 0.01) {
      const angle = Math.atan2(z, x);
      pos.setX(i, Math.cos(angle) * CAKE_RADIUS * 0.97);
      pos.setZ(i, Math.sin(angle) * CAKE_RADIUS * 0.97);
      pos.setY(i, y + 0.04);
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ─── Shared Structural Maps (grayscale — reused across flavors) ───────────────

/**
 * Generates a shared grayscale roughness map.
 * Same for every flavor — only material tint changes.
 */
function buildRoughnessMap(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d4d4d4";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const v = Math.floor(Math.random() * 60 + 165);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  return new THREE.CanvasTexture(canvas);
}

// ─── Flavor-Tinted Color Textures ─────────────────────────────────────────────
// These are the ONLY things that change between flavors.
// Geometry, pore pattern, fiber layout, and roughness structure stay constant.

/**
 * Top cap texture — radial gradient from highlight center to dark baked rim.
 * Pore dots and center highlight blobs overlay the gradient.
 */
function buildTopTexture(p) {
  const s = 512;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");

  // Base radial gradient: highlight → primary → secondary → rimDark
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0,    p.highlight);
  grad.addColorStop(0.40, p.primary);
  grad.addColorStop(0.68, p.secondary);
  grad.addColorStop(0.85, p.rimDark);
  grad.addColorStop(1.0,  p.rimDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  // Universal rim-darkening overlay (works on any base color)
  const rimOv = ctx.createRadialGradient(s / 2, s / 2, s * 0.55, s / 2, s / 2, s / 2);
  rimOv.addColorStop(0, "rgba(0,0,0,0)");
  rimOv.addColorStop(1, "rgba(0,0,0,0.40)");
  ctx.fillStyle = rimOv;
  ctx.fillRect(0, 0, s, s);

  // Pore dots — color derived from rimDark (darker version)
  const rimRgb = hexToRgb(p.rimDark);
  const poreFill = dim(rimRgb, 0.5);
  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 1.8 + 0.3;
    const a = Math.random() * 0.28 + 0.08;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${poreFill},${a})`;
    ctx.fill();
  }

  // Highlight blobs near center
  const hlRgb = hexToRgb(p.highlight);
  const hlFill = `${hlRgb[0]},${hlRgb[1]},${hlRgb[2]}`;
  for (let i = 0; i < 300; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * s * 0.25;
    const x = s / 2 + Math.cos(angle) * dist;
    const y = s / 2 + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 4 + 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hlFill},${Math.random() * 0.12 + 0.04})`;
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Side texture — top edge reduced to almost nothing (barely visible),
 * bottom blends naturally from center → secondary → rimDark.
 * Supports optional sideCenter override (used by Default sponge for cream sides).
 */
function buildSideTexture(p) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // The center color of the side: use sideCenter override if available, else highlight
  const center = p.sideCenter ?? p.highlight;

  // Vertical gradient:
  //   Top edge  → almost the same as center (≈ nothing visible)
  //   Center    → center color
  //   Bottom    → primary → secondary → rimDark
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,    center);      // top = center (almost no visible edge)
  grad.addColorStop(0.50, center);      // hold center color through mid
  grad.addColorStop(0.76, p.primary);
  grad.addColorStop(0.90, p.secondary);
  grad.addColorStop(1,    p.rimDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Very subtle top shadow — almost nothing (was 0.35, now 0.06)
  const topOv = ctx.createLinearGradient(0, 0, 0, h * 0.06);
  topOv.addColorStop(0, "rgba(0,0,0,0.06)");
  topOv.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topOv;
  ctx.fillRect(0, 0, w, h * 0.06);

  // Bottom edge darkening (kept intentional — pan-baked look)
  const botOv = ctx.createLinearGradient(0, h * 0.82, 0, h);
  botOv.addColorStop(0, "rgba(0,0,0,0)");
  botOv.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = botOv;
  ctx.fillRect(0, h * 0.82, w, h * 0.18);

  // Horizontal sponge fiber streaks (secondary-tinted)
  const secRgb = hexToRgb(p.secondary);
  const fiberFill = dim(secRgb, 0.72);
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * 0.14 + 0.04;
    ctx.fillStyle = `rgba(${fiberFill},${a})`;
    ctx.fillRect(x, y, Math.random() * 12 + 2, Math.random() * 1.5 + 0.3);
  }

  // Fine pore dots
  const rimRgb = hexToRgb(p.rimDark);
  const poreFill = dim(rimRgb, 0.55);
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 1.4 + 0.2;
    const a = Math.random() * 0.18 + 0.06;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${poreFill},${a})`;
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Bottom cap texture — radial gradient (highlight center → rimDark outer),
 * mimicking a pan-baked bottom with the same flavor palette.
 */
function buildBottomTexture(p) {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0,    p.highlight);
  grad.addColorStop(0.45, p.primary);
  grad.addColorStop(0.72, p.secondary);
  grad.addColorStop(0.88, p.rimDark);
  grad.addColorStop(1.0,  p.rimDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  // Rim darkening
  const rimOv = ctx.createRadialGradient(s / 2, s / 2, s * 0.50, s / 2, s / 2, s / 2);
  rimOv.addColorStop(0, "rgba(0,0,0,0)");
  rimOv.addColorStop(1, "rgba(0,0,0,0.40)");
  ctx.fillStyle = rimOv;
  ctx.fillRect(0, 0, s, s);

  // Pore dots
  const rimRgb = hexToRgb(p.rimDark);
  const poreFill = dim(rimRgb, 0.55);
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 1.2 + 0.2;
    const a = Math.random() * 0.18 + 0.05;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${poreFill},${a})`;
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// ─── Texture Bundle ──────────────────────────────────────────────────────────

function buildTexBundle(p, maxAniso) {
  const top = buildTopTexture(p);
  top.anisotropy = maxAniso;
  top.needsUpdate = true;

  const side = buildSideTexture(p);
  side.wrapS = THREE.RepeatWrapping;
  side.repeat.set(3, 1);
  side.anisotropy = maxAniso;
  side.needsUpdate = true;

  const bottom = buildBottomTexture(p);
  bottom.anisotropy = maxAniso;
  bottom.needsUpdate = true;

  return [side, top, bottom];
}

function buildMatBundle(texs, roughMap) {
  const [sideTex, topTex, bottomTex] = texs;
  return [
    new THREE.MeshStandardMaterial({ map: sideTex,   roughnessMap: roughMap, roughness: 0.93, metalness: 0 }),
    new THREE.MeshStandardMaterial({ map: topTex,    roughnessMap: roughMap, roughness: 0.87, metalness: 0 }),
    new THREE.MeshStandardMaterial({ map: bottomTex, roughnessMap: roughMap, roughness: 0.90, metalness: 0 }),
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SpongeCake3D({ flavor }) {
  const mountRef  = useRef(null);
  const matsRef   = useRef(null);
  const texsRef   = useRef(null);
  const anisoRef  = useRef(1);
  const roughRef  = useRef(null);
  const firstFlavor = useRef(true); // skip flavor effect on initial mount

  // ── Scene setup (once) ────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a0f00");
    scene.fog = new THREE.Fog("#1a0f00", 12, 25);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 5.5);

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.set(0, 0.1, 0);
    controls.update();

    /* Lights */
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.7));

    const keyLight = new THREE.DirectionalLight(0xffecd2, 1.8);
    keyLight.position.set(4, 6, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xfff0d0, 0.6, 20);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffddaa, 0.4);
    rimLight.position.set(-2, 1, -5);
    scene.add(rimLight);

    /* DefaultSpongeGeometry — shared, never rebuilt */
    const geometry = buildDefaultSpongeGeometry();

    /* Shared roughness map — same structure for all flavors */
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    anisoRef.current = maxAniso;
    const roughMap = buildRoughnessMap();
    roughMap.anisotropy = maxAniso;
    roughMap.needsUpdate = true;
    roughRef.current = roughMap;

    /* Initial flavor textures + materials */
    const initPalette = FLAVORS[flavor];
    const texs = buildTexBundle(initPalette, maxAniso);
    const mats = buildMatBundle(texs, roughMap);

    texsRef.current = texs;
    matsRef.current = mats;

    /* Cake mesh — material array: [side=0, top=1, bottom=2] */
    const cake = new THREE.Mesh(geometry, mats);
    cake.castShadow = true;
    cake.receiveShadow = true;
    scene.add(cake);

    /* Ground shadow receiver */
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -HALF_H;
    ground.receiveShadow = true;
    scene.add(ground);

    /* Animation */
    let animId;
    let userInteracting = false;
    controls.addEventListener("start", () => { userInteracting = true; });
    controls.addEventListener("end",   () => { userInteracting = false; });
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!userInteracting) cake.rotation.y += clock.getDelta() * 0.35;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    /* Cleanup */
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      roughMap.dispose();
      mats.forEach(m => m.dispose());
      texs.forEach(t => t.dispose());
      groundGeo.dispose();
      groundMat.dispose();
      matsRef.current = null;
      texsRef.current = null;
      roughRef.current = null;
      mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flavor swap (runs when flavor prop changes, skips initial mount) ───────
  useEffect(() => {
    if (firstFlavor.current) {
      firstFlavor.current = false;
      return;
    }
    if (!matsRef.current || !texsRef.current || !roughRef.current) return;

    const palette = FLAVORS[flavor];
    const newTexs = buildTexBundle(palette, anisoRef.current);

    // Dispose old color textures — geometry/roughness stay alive
    texsRef.current.forEach(t => t.dispose());
    texsRef.current = newTexs;

    // Update material maps in-place (no new material objects needed)
    matsRef.current[0].map = newTexs[0]; // side
    matsRef.current[1].map = newTexs[1]; // top
    matsRef.current[2].map = newTexs[2]; // bottom
    matsRef.current.forEach(m => { m.needsUpdate = true; });
  }, [flavor]);

  return <div ref={mountRef} className="w-full h-full" />;
}
