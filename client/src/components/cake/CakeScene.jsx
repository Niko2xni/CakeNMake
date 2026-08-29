import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addWhippedCreamSkirt } from './sets/skirtHelpers';
import { addTuxedo } from './sets/tuxedoHelpers';
import { buildPipingScrolls } from './sets/pipingScrollsHelpers';
import { buildFondantSwag } from './sets/fondantSwagHelpers';
import { buildVictorianLambeth } from './sets/victorianLambethHelpers';
import { buildPipingRing } from './pipingTips';
import {
  buildDripRing,
  buildBeadedTrimRing,
  buildStripesRing,
  buildCheckerSideSquares,
  buildTriangleSideShapes,
  buildScatterPearlsRing,
  buildChevronSideStripes,
} from './DecorationSets';
import { getFrostingMaterial } from './frostingMaterial';
import { SUGAR_COLORS, TOP_SURFACE_SLOTS, computeSlotPosition, getSlotById } from '../../lib/cakeConfig';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getPacificoFont, getHandwrittenFont } from './cakeFonts';
import { makePRNG, hashStr } from './cakeMath';
import {
  FROSTING_COLORS,
  PIPING_FLAVOR_COLORS,
  FILLING_COLORS,
  INTERIOR_PREVIEW_CLIP_PLANES,
  GLAZE_PATTERN_CARVES,
  getRenderDimensions,
} from './cakeConstants';
import { disposeSceneObject, registerNewChildrenForClipping } from './sceneUtils';
import {
  buildSpongeProfileGeometry,
  buildFillingProfileGeometry,
  buildMashedCircleFillingGeometry,
  buildMashedSwirlFillingGeometry,
} from './spongeGeometry';
import {
  buildOrganicFrostingGeometry,
  buildGlazeGeometry,
  makeGlazeMaterial,
  makeRidgeProfileFn,
  computeRidgeCount,
  buildTexturedButtercreamGeometry,
  buildRibbonWrapButtercreamGeometry,
  buildVerticalPipingButtercreamGeometry,
} from './frostingGeometry';
import { getFillingMaterial } from './fillingMaterial';
import { getSpongeMaterial } from './spongeMaterial';
import {
  addPremadeDoodle,
  addCherry,
  addStrawberry,
  addCandle,
  addChocolateChip,
  addRosette,
  buildFerreroRocherMesh,
  buildHersheysKissMesh,
  buildOreoMesh,
  buildChocolateBearMesh,
  buildBasketballMesh,
  buildSoccerBallMesh,
  addPipingPattern,
} from './toppings';




const CakeScene = React.forwardRef(function CakeScene({ cakeConfig, activeTool, onPlace, thumbnailMode = false }, ref) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const thumbnailCameraRef = useRef(null);
  const cakeGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ isDown: false, prevX: 0, prevY: 0, moved: false });
  const autoRotateRef = useRef(false);
  const activeToolRef = useRef(activeTool);
  const onPlaceRef = useRef(onPlace);
  const cakeConfigRef = useRef(cakeConfig);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isCapturingThumbnailRef = useRef(false);
  const baselineYRef = useRef(0);
  const coveringMaterialsRef = useRef([]);

  // Predefined slot & ghost preview refs
  const slotsGroupRef = useRef(null);
  const ghostGroupRef = useRef(null);
  const hoveredSlotRef = useRef(null);
  const topMetricsRef = useRef({ baseY: 0, domeHeight: 0, topY: 0, radius: 4 });

  // Update visual slot markers and ghost preview
  const updateSlotVisuals = useCallback(() => {
    if (!slotsGroupRef.current || !ghostGroupRef.current) return;
    const slotsGroup = slotsGroupRef.current;
    const ghostGroup = ghostGroupRef.current;

    // Clear old slot markers & ghosts
    while (slotsGroup.children.length > 0) {
      const child = slotsGroup.children[0];
      disposeSceneObject(child);
      slotsGroup.remove(child);
    }
    while (ghostGroup.children.length > 0) {
      const child = ghostGroup.children[0];
      disposeSceneObject(child);
      ghostGroup.remove(child);
    }

    if (!activeToolRef.current) return;

    const { radius, baseY, domeHeight, topY } = topMetricsRef.current;
    const placedItems = cakeConfigRef.current?.placedItems || [];
    const occupiedSlotIds = new Set(placedItems.map(it => it.slotId).filter(Boolean));
    const hoveredSlot = hoveredSlotRef.current;

    TOP_SURFACE_SLOTS.forEach(slot => {
      const pos = computeSlotPosition(slot, radius);
      const R = radius - 0.15;
      const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      let surfaceY = baseY;
      if (r < R) {
        surfaceY += domeHeight * (1 - (r / R) * (r / R));
      } else {
        surfaceY = topY;
      }
      surfaceY += 0.03; // slightly above frosting surface

      const isHovered = hoveredSlot?.id === slot.id;
      const isOccupied = occupiedSlotIds.has(slot.id);

      // Create slot marker disc
      const markerRadius = isHovered ? 0.32 : 0.22;
      const markerGeo = new THREE.CircleGeometry(markerRadius, 24);
      const markerColor = isHovered
        ? (isOccupied ? '#EF4444' : '#EC4899')
        : (isOccupied ? '#10B981' : '#F43F5E');
      const markerOpacity = isHovered ? 0.85 : (isOccupied ? 0.45 : 0.3);

      const markerMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: markerOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(pos.x, surfaceY, pos.z);
      marker.userData.slotId = slot.id;
      slotsGroup.add(marker);

      // If hovered, render ghost preview at this slot
      if (isHovered && activeToolRef.current) {
        const ghostSeed = 12345;
        const ghostRand = makePRNG(ghostSeed);
        const tool = activeToolRef.current;
        const toolType = typeof tool === 'object' ? tool.type : tool;

        const ghostContainer = new THREE.Group();
        ghostContainer.position.set(0, 0, 0);

        if (toolType === 'cherry') {
          addCherry(ghostContainer, pos.x, surfaceY - 0.03, pos.z, ghostRand);
        } else if (toolType === 'strawberry') {
          addStrawberry(ghostContainer, pos.x, surfaceY - 0.03, pos.z);
        } else if (toolType === 'candle') {
          addCandle(ghostContainer, pos.x, surfaceY - 0.03, pos.z, ghostRand);
        } else if (toolType === 'chocolateChip') {
          addChocolateChip(ghostContainer, pos.x, surfaceY - 0.03, pos.z);
        } else if (toolType === 'rosette') {
          const roseColor = tool.colorId ? (SUGAR_COLORS.find(c => c.id === tool.colorId)?.hex || '#FF8BA7') : '#FF8BA7';
          addRosette(ghostContainer, pos.x, surfaceY - 0.03, pos.z, roseColor);
        } else if (toolType === 'piping') {
          const pipeColor = tool.colorId ? (SUGAR_COLORS.find(c => c.id === tool.colorId)?.hex || '#FFAB00') : '#FFAB00';
          addPipingPattern(ghostContainer, pos.x, surfaceY - 0.03, pos.z, tool.pattern || 'shell', pipeColor);
        }

        // Apply semi-transparency and tint to ghost
        ghostContainer.traverse(node => {
          if (node.isMesh && node.material) {
            node.material = node.material.clone();
            node.material.transparent = true;
            node.material.opacity = isOccupied ? 0.35 : 0.6;
            if (isOccupied) {
              node.material.color = new THREE.Color('#EF4444');
            }
          }
        });

        ghostGroup.add(ghostContainer);
      }
    });
  }, []);

  // Expose renderer ref to parent
  React.useImperativeHandle(ref, () => ({
    getRenderer: () => rendererRef.current,
    resetCamera: () => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      camera.position.set(0, 8, 22);
      controls.target.set(0, 4, 0);
      controls.update();
    },
    captureScreenshot: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const cam = cameraRef.current;
      if (!renderer || !scene || !cam) return null;

      renderer.render(scene, cam);
      return renderer.domElement.toDataURL('image/png');
    },
    captureThumbnail: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const thumbnailCam = thumbnailCameraRef.current;
      if (!renderer || !scene || !thumbnailCam) return null;

      const prevClipStates = coveringMaterialsRef.current.map(mat => mat.clippingPlanes);
      coveringMaterialsRef.current.forEach(mat => { mat.clippingPlanes = []; });

      const prevSlotsVisible = slotsGroupRef.current ? slotsGroupRef.current.visible : true;
      const prevGhostVisible = ghostGroupRef.current ? ghostGroupRef.current.visible : true;
      if (slotsGroupRef.current) slotsGroupRef.current.visible = false;
      if (ghostGroupRef.current) ghostGroupRef.current.visible = false;

      const prevRotY = cakeGroupRef.current?.rotation?.y ?? 0;
      if (cakeGroupRef.current) cakeGroupRef.current.rotation.set(0, 0, 0);

      renderer.render(scene, thumbnailCam);
      const dataUrl = renderer.domElement.toDataURL('image/png');

      if (cakeGroupRef.current) cakeGroupRef.current.rotation.y = prevRotY;

      coveringMaterialsRef.current.forEach((mat, i) => { mat.clippingPlanes = prevClipStates[i]; });
      if (slotsGroupRef.current) slotsGroupRef.current.visible = prevSlotsVisible;
      if (ghostGroupRef.current) ghostGroupRef.current.visible = prevGhostVisible;

      return dataUrl;
    }
  }));

  useEffect(() => {
    activeToolRef.current = activeTool;
    updateSlotVisuals();
  }, [activeTool, updateSlotVisuals]);
  useEffect(() => { onPlaceRef.current = onPlace; }, [onPlace]);
  useEffect(() => { cakeConfigRef.current = cakeConfig; }, [cakeConfig]);

  const buildCake = useCallback(() => {
    if (!sceneRef.current || !cakeGroupRef.current) return;

    const group = cakeGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0];
      disposeSceneObject(child);
      group.remove(child);
    }
    // Tracks every material that visually covers the sponge/filling (currently
    // just the frosting shell) so Interior Preview's cutaway can clip them, and
    // so thumbnail capture can temporarily un-clip them regardless of the
    // current preview state.
    coveringMaterialsRef.current = [];

    const {
      layers, frostingColor, toppings = [], cakeColor, plateVisible, placedItems = [],
      designMode, layerColors, layerFrostings, fillingColor, layerFillings, cakeSize = 'big',
      fillingEnabled = false, fillingLayers = 1, interiorPreview = false, exteriorFinishStyle = 'fullyFrosted',
      // Only meaningful when exteriorFinishStyle === 'texturedButtercream'
      // — picks which of the three ripple geometries below gets built.
      buttercreamTexture = 'ridged',
      fillingPipingTip = null, fillingPipingColor = '#F6DEAB',
      layerFillingSugarColors = [],
      // New Surface/Center/Edge/Side/Place fields — all pre-resolved to real
      // hex colors by configAdapter.js. NONE of these have corresponding
      // geometry in CakeScene yet (see CAKE_SETS_REWORK_SPEC.md §12 step 7);
      // destructured here so the contract is explicit and ready to wire up
      // without touching this line again.
      surfaceFrostingColorHex = null,
      layerSurfaceFrostingColors = [],
      centerDecorationColor = '#F6DEAB', centerTextColor = '#F6DEAB',
      // Surface Treatment is Glaze-only now (Textured Buttercream moved to
      // exteriorFinishStyle — see the frostGeo branch below, and
      // cakeConfig.js's comment on exteriorFinish for why). Glaze is built
      // below, after topY/topRadius are known, via buildGlazeGeometry.
      surfaceTreatmentMode = null,
      surfaceTreatmentColorHex = '#F6DEAB',
      surfaceTreatmentPattern = 'longGaps', // one of GLAZE_PATTERNS ids, see GLAZE_PATTERN_CARVES above
      sideCheckeredPatternSetId = null,
      sideTrianglePatternSetId = null,
      sideChevronPatternSetId = 'multiColor',
      sideScatterPearlsSetId = 'randomScatter',
      sidePipingScrollsSetId = 'waveRope',
      sideFondantSwagSetId = 'classic',
      sideVictorianLambethSetId = 'classic',
      sideNoNameSetId = null,
      centerDecorationSetId = null,
      centerDecorationVariation = 'outerRing',
      centerText = '', centerTextTop = '', centerTextMiddle = '', centerTextBottom = '', centerTextSpacing = 0.28, centerTextFont = 'default',
      edgeMode = 'both', edgeTop = null, edgeBottom = null, edgeBoth = null,
      edgeMiddle = null,
      sideDecorationColor = '#F6DEAB', sideCheckeredColor = '#F6DEAB',
      sideTriangleColor = '#F6DEAB', sideChevronColor = '#F6DEAB', sideNoNameColor = '#F6DEAB',
      sideDecorationSetId = null, sideDecorationVariant = 0,
    } = cakeConfig;
    const isIndividual = designMode === 'individual' && layers > 1;

    // Seed the PRNG from stable config properties so the random visual details
    // (candle colors, drip heights, sprinkle positions) are consistent across
    // re-renders triggered by unrelated changes like frosting color or tool selection.
    const seed = hashStr(
      [layers, cakeSize, cakeColor, frostingColor, ...(toppings || [])].join('|')
    );
    const rand = makePRNG(seed);

    // Use visual scale system for render dimensions
    const renderDims = getRenderDimensions(cakeSize);
    const BASE_RADIUS = renderDims.diameter / 2;  // Half of diameter
    const RADIUS_STEP = 0.5;   // 1" per tier in radius = 0.5 display units
    const PLATE_RADIUS = BASE_RADIUS + 1.2;
    const PLATE_RIM = BASE_RADIUS + 1.4;

    // Layer geometry dimensions based on render height
    const LAYER_H = renderDims.height;  // Each layer has full height (10 units)
    const FROST_H = 0.25;  // ~0.5" frosting band
    const FILLING_H = LAYER_H * 0.06; // Filling height

    if (plateVisible !== false) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RIM, 0.15, 64),
        new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.1, metalness: 0.05, clearcoat: 0.8 })
      );
      plate.position.y = -0.15;  // just below ground level
      plate.castShadow = true;
      plate.receiveShadow = true;
      group.add(plate);
    }

    let currentY = 0;
    let lastRadius = BASE_RADIUS;
    // Tracks the topmost tier's own wall height (distinct from lastRadius's
    // "last iteration's radius"). Same "carry the last iteration's value
    // out" reasoning as lastFrostColor below — used as the Naked-cake
    // fallback height for Glaze (see lastFrostTotalHeight/lastFrostDomeH
    // just below, which take over whenever a real frosting shell exists).
    let lastHeight = renderDims.height;
    const layerCount = Math.max(1, Math.min(2, layers));

    let topLayerBaseY = 0;
    let topLayerDomeHeight = 0;
    let ledgeY = 0;
    let layer1OuterRadius = BASE_RADIUS;
    // frostColor itself is block-scoped inside the per-layer loop below
    // (recomputed each iteration since flavor/override can vary per layer
    // in Individual mode) — this carries the LAST iteration's value out
    // for the Drip ring, which renders after the loop ends and needs
    // whatever the topmost layer's Sugar-Color-driven color was.
    let lastFrostColor = null;
    // Same "carry the last iteration's value out" reasoning as
    // lastFrostColor, for Glaze (built after this loop ends — see the
    // Surface Treatment > Glaze block below). Glaze is a "secondary copy"
    // of the top tier's own Frosting shell (buildGlazeGeometry mirrors
    // buildOrganicFrostingGeometry's top exactly), so it needs that
    // shell's real height/dome/Y-position, not fixed constants. Defaulted
    // here to a Naked-cake fallback (wrap the sponge directly, no cap
    // padding) and overwritten inside the Frosting Shell block below
    // whenever a real frosting shell is actually built for that tier.
    let lastHasFrosting = false;
    let lastFrostTotalHeight = lastHeight;
    let lastFrostDomeH = lastHeight * 0.05;
    let lastFrostMeshY = 0;

    for (let i = 0; i < layerCount; i++) {
      // Layer 1: base dimensions, Layer 2: smaller dimensions
      let radius, height;
      if (i === 0) {
        // Bottom layer
        radius = BASE_RADIUS;
        height = renderDims.height;  // 5 units
      } else {
        // Top layer (second layer)
        radius = cakeSize === 'big' ? 3 : 2.5;  // Big: 6 units diameter, Small: 5 units diameter
        height = cakeSize === 'big' ? 4 : 4;  // Big: 4 units, Small: 4 units
      }
      lastRadius = radius;
      lastHeight = height;

      const cakeKey = isIndividual ? (layerColors?.[i] || cakeColor) : cakeColor;
      const frostKey = isIndividual ? (layerFrostings?.[i] || frostingColor) : frostingColor;
      const fillingKey = isIndividual ? (layerFillings?.[i] || fillingColor) : fillingColor;
      const frostColorBase = frostKey ? FROSTING_COLORS[frostKey] : null;
      // Color Override replaces the flavor's natural frosting color. When
      // it is not selected, the frosting keeps using the flavor color.
      const frostColor = layerSurfaceFrostingColors[i] || surfaceFrostingColorHex || frostColorBase;
      lastFrostColor = frostColor;
      const fillColor = fillingKey ? FILLING_COLORS[fillingKey] : null;

      // Build layer with separate sections: Sponge Body + Filling Layers + Frosting Shell

      // Calculate sponge height (subtract filling space if enabled)
      const totalFillingHeight = fillingEnabled ? (FILLING_H * fillingLayers) : 0;
      const spongeHeight = height - totalFillingHeight;

      // Sponge Body (main interior cake body) - use procedural texture system
      const spongeMat = cakeKey ? getSpongeMaterial(cakeKey) : null;

      // Build sponge sections separated by filling layers
      let spongeCurrentY = currentY;
      const spongeSectionHeight = spongeHeight / (fillingEnabled ? fillingLayers + 1 : 1);

      // The pointy-top dome amount is derived from the FULL tier height (not the
      // per-section height above), so it stays constant no matter how many
      // Filling Layers (1-3) the section height ends up getting divided into.
      const domeAmount = height * 0.05;

      // Naked-cake fallback for Glaze (see lastFrostTotalHeight/lastFrostDomeH/
      // lastFrostMeshY's declaration above) — overwritten below by the
      // Frosting Shell block whenever this tier actually gets frosted.
      lastHasFrosting = false;
      lastFrostTotalHeight = height;
      lastFrostDomeH = domeAmount;
      lastFrostMeshY = currentY;

      for (let s = 0; s < (fillingEnabled ? fillingLayers + 1 : 1); s++) {
        const isTopSection = s === (fillingEnabled ? fillingLayers + 1 : 1) - 1;
        const fillingActive = fillingEnabled && !!fillColor;

        let bottomSocketHeight = 0;
        // (Socket-into-the-tier-below removed — see the matching removal of
        // the frosting dome for intermediate tiers below. Two tiers meeting
        // via a bump+socket pair only works if BOTH sides are shaped to
        // match; the frosting was flat/domed inconsistently, which is what
        // caused the visible floating gap. Simple flush flat-to-flat
        // stacking is robust and doesn't depend on getting that matching
        // exactly right.)

        const spongeGeo = buildSpongeProfileGeometry(radius - 0.02, spongeSectionHeight, {
          // Only the very last tier's very last section gets the pointy
          // dome top — intermediate tiers (with another tier stacked on
          // them) get a flat top so the next tier sits flush against it.
          topBumpHeight: (isTopSection && i === layerCount - 1) ? domeAmount : 0,
          bottomSocketHeight,
          // Flush (no taper) on any face that meets a filling layer, so the
          // filling can sit flat against it with no gap.
          bevelTop: !(fillingActive && s < fillingLayers),
          bevelBottom: !(fillingActive && s > 0),
        });

        if (spongeMat) {
          const spongeSection = new THREE.Mesh(spongeGeo, spongeMat);
          spongeSection.position.y = spongeCurrentY + spongeSectionHeight / 2;
          spongeSection.castShadow = true;
          spongeSection.receiveShadow = true;
          group.add(spongeSection);
        }

        spongeCurrentY += spongeSectionHeight;

        // Add filling layer after sponge section (except after last section)
        if (fillingEnabled && s < fillingLayers && fillColor) {
          const fillingY = spongeCurrentY + FILLING_H / 2;

          // "Mashed Circles" and "Mashed Swirls" both replace the filling
          // body itself with the bumped geometry below, piped in the
          // decorative Piping Color — the dome bulges ARE the exposed
          // filling edge, not a separate trim mesh added in front of a
          // plain flat cylinder (see buildMashedCircleFillingGeometry's
          // comment for why). Mashed Swirls is the same body with a
          // diagonal slash groove pattern switched on — see
          // buildMashedSwirlFillingGeometry, a thin wrapper right below
          // buildMashedCircleFillingGeometry.
          if (fillingPipingTip === 'mashedCircles' || fillingPipingTip === 'mashedSwirls') {
            // Uses getFrostingMaterial (the same buttercream shader as
            // Fully Frosted / Textured Buttercream elsewhere in this file),
            // NOT getFillingMaterial — that one's tuned for a glossy
            // whipped-cream/jam look (see its own doc comment), which read
            // wrong for a design that's meant to look piped in buttercream.
            const pipingMat = getFrostingMaterial(layerFillingSugarColors[i] || fillingPipingColor);
            const buildMashedGeometry = fillingPipingTip === 'mashedSwirls'
              ? buildMashedSwirlFillingGeometry
              : buildMashedCircleFillingGeometry;
            const mashedFilling = new THREE.Mesh(
              // Starting point pushed deeper into the cake (radius * 0.95,
              // vs. the plain filling profile's flat -0.02 recess below) —
              // this is the baseline the whole bump shape (peaks AND
              // valleys) is built from, so recessing it further sells the
              // valley's "cut into the cake" look even more convincingly,
              // without touching bumpCount/peakBulge/valleyRecess/widthFrac
              // themselves.
              buildMashedGeometry(radius * 0.95, FILLING_H, { rand }),
              pipingMat
            );
            mashedFilling.position.y = fillingY;
            mashedFilling.castShadow = true;
            mashedFilling.receiveShadow = true;
            group.add(mashedFilling);
          } else {
            // "None" — no piping design chosen. Uses getFrostingMaterial,
            // the same buttercream shader as Mashed Circles/Mashed Swirls
            // above (and Fully Frosted/Textured Buttercream elsewhere in
            // this file), so the plain filling edge reads as the same
            // buttercream, just without the piped bump geometry — not the
            // glossy whipped-cream/jam material getFillingMaterial is
            // tuned for (see that function's own doc comment).
            const fillingMat = getFrostingMaterial(fillColor);
            const fillingSection = new THREE.Mesh(
              buildFillingProfileGeometry(radius - 0.02, FILLING_H, 0),
              fillingMat
            );
            fillingSection.position.y = fillingY;
            fillingSection.castShadow = true;
            fillingSection.receiveShadow = true;
            group.add(fillingSection);

            // No separate piping trim here: this branch only ever runs
            // when fillingPipingTip is null ("None") — FILLING_PIPING_DESIGNS
            // only has 'mashedCircles'/'mashedSwirls', both handled by the
            // branch above, so there's no other tip value this could be.
          }

          spongeCurrentY += FILLING_H;
        }
      }

      // Frosting Shell (exterior coating - solid cylinder covering entire layer)
      // Only add frosting if a color is selected AND not a naked cake
      if (frostColor && exteriorFinishStyle !== 'naked') {
        const frostMat = getFrostingMaterial(frostColor);
        // Interior Preview cutaway — real geometric clipping, not an overlay.
        // clipIntersection must be set even when clippingPlanes is empty so
        // it's already correct the moment interiorPreview turns on.
        frostMat.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
        frostMat.clipIntersection = true;
        frostMat.clipShadows = true;
        coveringMaterialsRef.current.push(frostMat);
        // Unified organic frosting geometry (replaces separate cylinder and caps)
        const FROST_CAP_H = 0.12;
        const isOverallTopTier = i === layerCount - 1;

        const totalFrostHeight = isOverallTopTier
          ? FROST_CAP_H + height
          : FROST_CAP_H + height + FROST_H;

        const domeH = isOverallTopTier ? (domeAmount + 0.05) : 0;

        const frostGeo = exteriorFinishStyle === 'texturedButtercream'
          ? (
            buttercreamTexture === 'ribbonWrap'
              ? buildRibbonWrapButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH)
              : buttercreamTexture === 'verticalPiping'
                ? buildVerticalPipingButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH)
                : buildTexturedButtercreamGeometry(radius + 0.06, totalFrostHeight, domeH) // 'ridged', also the default
          )
          : buildOrganicFrostingGeometry(radius + 0.06, totalFrostHeight, domeH);

        const frost = new THREE.Mesh(frostGeo, frostMat);
        frost.position.y = currentY - FROST_CAP_H;
        frost.castShadow = true;
        group.add(frost);

        // Glaze (see buildGlazeGeometry) is a "secondary copy" of THIS
        // tier's own frosting shell, built after the loop ends — capture
        // the real numbers it was just built from so Glaze's shoulder
        // matches this shell's shoulder exactly instead of drifting off
        // fixed constants. Only meaningful for isOverallTopTier in
        // practice (Glaze only ever wraps the outermost/topmost tier, the
        // same "poured from the very top" convention Drip already uses),
        // but harmless to set on every tier — the last iteration wins.
        lastHasFrosting = true;
        lastFrostTotalHeight = totalFrostHeight;
        lastFrostDomeH = domeH;
        lastFrostMeshY = frost.position.y;
      }


      // Side > No Name — merged former Full Coverage (tuxedo, whipped
      // skirt) + former Partial Coverage (drip), moved here from Surface.
      // This is what actually covers the sponge/filling directly on a
      // Naked cake, or sits on top of the frosting when one exists —
      // either way it registers into coveringMaterialsRef so Interior
      // Preview's wedge clips through whatever is actually covering things
      // right now, not just frosting.
      if (sideNoNameSetId === 'whippedSkirt') {
        const startIdx = group.children.length;
        addWhippedCreamSkirt(group, radius, currentY, height, sideNoNameColor);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview);
      }
      if (sideNoNameSetId === 'tuxedo') {
        const lTopY = currentY + height + 0.05;
        const startIdx = group.children.length;
        addTuxedo(group, radius, lTopY, sideNoNameColor);
        registerNewChildrenForClipping(group, startIdx, coveringMaterialsRef, interiorPreview);
      }

      // Checkered/Triangle Pattern's standoff above the tier radius has to
      // clear whichever Exterior Finish shell they're sitting on. A flat
      // 0.08 clearance is enough for a smooth Fully Frosted shell, but
      // Textured Buttercream's ridges are real bulging geometry (not a
      // texture map) — a flat 0.08 doesn't reliably clear a ridge peak, so
      // the ridge pokes through the flat square/triangle face as a visible
      // wavy cut line across it.
      //
      // The ridge clearance numbers below (0.1/0.08/0.115) are the same
      // worst-case ridge+wobble amplitude figures Glaze's own
      // coatThickness uses per texture (see the Surface Treatment > Glaze
      // block further below) — but Glaze adds coatThickness on top of
      // radius + 0.06 (the frosting shell's own base radius: its call
      // site passes `lastRadius + (lastHasFrosting ? 0.06 : 0)` in, since
      // the ridge geometry itself is carved starting from that base, not
      // from the bare tier radius — see buildTexturedButtercreamGeometry's
      // call site above). Adding those same numbers straight onto the
      // bare `radius` under-clears by exactly that missing 0.06, which is
      // why the ridge still poked through even with this "fix" in place —
      // the +0.06 below is what actually closes that gap.
      const sideDecorStandoff = (() => {
        if (!(frostColor && exteriorFinishStyle !== 'naked')) return 0; // naked — sits right at the sponge radius, unchanged
        if (exteriorFinishStyle === 'texturedButtercream') {
          const frostBase = 0.06; // matches Glaze's own call-site offset
          if (buttercreamTexture === 'ribbonWrap') return frostBase + 0.08;
          if (buttercreamTexture === 'verticalPiping') return frostBase + 0.115;
          return frostBase + 0.1; // 'ridged' (Ridge Comb), also the default
        }
        return 0.08; // smooth Fully Frosted shell, unchanged — its own base IS radius + 0.06, no ridge on top of it to clear
      })();

      // Side > Checkered Pattern (sides) — real raised squares
      // (buttercream stenciling), not a printed texture. Tinted via
      // Sugar Color's frostColor now (Side's own Checkered Pattern color
      // grid was removed) — was hardcoded black regardless of selection
      // until DecorationSets.jsx's buildCheckerSideSquares was updated to
      // accept a color option.
      // "Full Pattern" (id 'wholeCake') gets the full alternating
      // checkerboard, applied uniformly to every tier's side wall.
      // "Left Diagonal" (id 'sidesOnly'), "X Pattern" (id 'xPattern'), and
      // "Right Diagonal" (id 'rightDiagonal') all start from that same
      // checkerboard, then thin its naturally-diagonal black lines at a
      // repeating interval (see buildCheckerSideSquares's 'leftDiagonal'/
      // 'rightDiagonal' patterns in DecorationSets.jsx). Left Diagonal and
      // Right Diagonal are mirror images of each other (which way the
      // stripe leans) with a fully empty gap between stripes; X Pattern
      // uses the same left-leaning direction as Left Diagonal but dashes
      // the gap instead, creating the crossing look.
      // "Parallel Lines — Outer" (id 'parallelOuter') and "Parallel Lines
      // — Inner" (id 'parallelInner') are a different family entirely —
      // not checkerboard-derived, just two full horizontal bands at
      // specific row positions (1st-from-top/4th-from-bottom for Outer,
      // 2nd-from-top/3rd-from-bottom for Inner). See
      // buildCheckerSideSquares's 'parallelOuter'/'parallelInner' patterns
      // in DecorationSets.jsx.
      // Registered into coveringMaterialsRef for the same reason as No
      // Name above — on a Naked cake this IS the covering layer sitting
      // directly on the sponge/filling.
      if (
        sideCheckeredPatternSetId === 'wholeCake' ||
        sideCheckeredPatternSetId === 'sidesOnly' ||
        sideCheckeredPatternSetId === 'xPattern' ||
        sideCheckeredPatternSetId === 'rightDiagonal' ||
        sideCheckeredPatternSetId === 'parallelOuter' ||
        sideCheckeredPatternSetId === 'parallelInner'
      ) {
        const patternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideCheckeredPatternSetId];
        // Compensate for frosting thickness: when there's a frosting shell
        // on this tier, the checker squares need to sit on top of that
        // extra layer, not at the bare sponge radius, or they'd end up
        // partially buried in the frosting. sideDecorStandoff (computed
        // above) also accounts for Textured Buttercream's actual ridge
        // geometry, not just a flat frosting thickness — see its comment.
        const effectiveRadius = radius + sideDecorStandoff;
        const checkerSide = buildCheckerSideSquares(effectiveRadius, height, {
          pattern: patternForId,
          // Only 'xPattern' dashes the gap (the crossing look); Left
          // Diagonal and Right Diagonal both use a fully empty gap.
          gapDashPeriod: sideCheckeredPatternSetId === 'xPattern' ? 2 : 1,
          // Colored by Sugar Color's frostColor now (Side's per-treatment
          // color pickers were removed) — see the "Sugar Color applies
          // everywhere outside Fundamentals" pass.
          color: sideCheckeredColor,
        });
        checkerSide.position.y = currentY + height / 2;
        checkerSide.material.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
        checkerSide.material.clipIntersection = true;
        checkerSide.material.clipShadows = true;
        coveringMaterialsRef.current.push(checkerSide.material);
        group.add(checkerSide);
      }

      // Side > Triangle Pattern (sides) — duplicate of Checkered Pattern's
      // exact dispatch above, real raised triangles instead of squares.
      // Tinted via Sugar Color's frostColor now (Side's own Triangle
      // Pattern color grid was removed). Same 6 variants, same
      // pattern-id mapping, same frosting-thickness compensation, same
      // Interior Preview clipping — see buildTriangleSideShapes's own doc
      // comment in DecorationSets.jsx for the geometry (itself a
      // duplicate of buildCheckerSideSquares).
      if (
        sideTrianglePatternSetId === 'wholeCake' ||
        sideTrianglePatternSetId === 'sidesOnly' ||
        sideTrianglePatternSetId === 'xPattern' ||
        sideTrianglePatternSetId === 'rightDiagonal' ||
        sideTrianglePatternSetId === 'parallelOuter' ||
        sideTrianglePatternSetId === 'parallelInner'
      ) {
        const trianglePatternForId = {
          wholeCake: 'full',
          sidesOnly: 'leftDiagonal',
          xPattern: 'leftDiagonal',
          rightDiagonal: 'rightDiagonal',
          parallelOuter: 'parallelOuter',
          parallelInner: 'parallelInner',
        }[sideTrianglePatternSetId];
        // Same frosting-thickness (and Textured Buttercream ridge)
        // compensation as Checkered Pattern — see sideDecorStandoff above.
        const triangleEffectiveRadius = radius + sideDecorStandoff;
        // Colored by Sugar Color's frostColor now (Side's per-treatment
        // color pickers were removed).
        const triangleSide = buildTriangleSideShapes(triangleEffectiveRadius, height, {
          pattern: trianglePatternForId,
          gapDashPeriod: sideTrianglePatternSetId === 'xPattern' ? 2 : 1,
          color: sideTriangleColor,
        });
        triangleSide.position.y = currentY + height / 2;
        triangleSide.material.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
        triangleSide.material.clipIntersection = true;
        triangleSide.material.clipShadows = true;
        coveringMaterialsRef.current.push(triangleSide.material);
        group.add(triangleSide);
      }

      // Side > Decorations (Stripes, Scatter Pearls, Piping Scrolls, Fondant Swag, Victorian Lambeth, Chevron)
      // Colored by Sugar Color's frostColor now (Side's per-treatment
      // color pickers were removed) — see the "Sugar Color applies
      // everywhere outside Fundamentals" pass. The old '#F6DEAB' fallback
      // swap-to-white (for decorations that read better on white than the
      // old default vanilla-ish tan) no longer applies since frostColor
      // is never that specific placeholder value — decorations now simply
      // render in whatever frostColor actually is.
      const hasFrostingForDeco = frostColor && exteriorFinishStyle !== 'naked';
      const sideDecorationRadius = hasFrostingForDeco ? radius + 0.06 : radius - 0.02;

      // Chevron Pattern, Piping Scrolls, Fondant Swag, and Victorian
      // Lambeth all need the same Textured Buttercream ridge-clearance fix
      // Checkered/Triangle Pattern got (see sideDecorStandoff above) —
      // sideDecorationRadius's shared flat 0.06 clearance is even tighter
      // than Checkered/Triangle's old 0.08 was, so ridge peaks poke
      // through these the same way they did through those before that
      // fix. All four build genuine flat/relief-faced shapes (squares,
      // triangles, chevron teeth, scroll/swag/lace relief), so a ridge
      // peak breaking the surface reads as a visible cut line the same
      // way. Reuses sideDecorStandoff's already-texture-aware value
      // (falls back to sideDecorationRadius untouched for Naked/Fully
      // Frosted, so nothing changes there for these either). Stripes and
      // Scatter Pearls are left on sideDecorationRadius, unchanged —
      // both build round-rod/bead instanced geometry (see
      // buildStripesRing above), which doesn't get visibly cut into by a
      // ridge poking through it the way a flat face does; Scatter Pearls
      // in particular already blends fine with the ridges as-is per
      // visual review.
      const ridgedTextureRadius = (exteriorFinishStyle === 'texturedButtercream' && hasFrostingForDeco)
        ? radius + sideDecorStandoff
        : sideDecorationRadius;

      if (sideDecorationSetId === 'stripes') {
        const stripes = buildStripesRing(sideDecorationRadius - 0.03, height * 0.92, sideDecorationColor);
        stripes.position.y = currentY + height / 2;
        group.add(stripes);
      }

      if (sideDecorationSetId === 'scatterPearls') {
        const pearlRand = makePRNG(hashStr(`pearls-${cakeSize}-${sideDecorationVariant}-tier${i}`));
        const pearls = buildScatterPearlsRing(sideDecorationRadius, height * 0.92, sideDecorationColor, pearlRand, {
          variant: sideScatterPearlsSetId || 'randomScatter'
        });
        pearls.position.y = currentY + height / 2;
        group.add(pearls);
      }

      if (sideDecorationSetId === 'pipingScrolls') {
        const scrolls = buildPipingScrolls(ridgedTextureRadius, height * 0.85, sideDecorationColor, sidePipingScrollsSetId || 'waveRope');
        scrolls.position.y = currentY + height / 2;
        group.add(scrolls);
      }

      if (sideDecorationSetId === 'fondantSwag') {
        const swag = buildFondantSwag(ridgedTextureRadius, height * 0.85, sideDecorationColor, sideFondantSwagSetId || 'classic');
        swag.position.y = currentY + height / 2;
        group.add(swag);
      }

      if (sideDecorationSetId === 'victorianLambeth') {
        const lambeth = buildVictorianLambeth(ridgedTextureRadius, height * 0.85, sideDecorationColor, undefined, sideVictorianLambethSetId || 'classic');
        lambeth.position.y = currentY + height / 2 + 0.2;
        group.add(lambeth);
      }

      if (sideDecorationSetId === 'chevronPattern') {
        const chevron = buildChevronSideStripes(ridgedTextureRadius, height * 0.92, {
          setId: sideChevronPatternSetId || 'multiColor',
          color: sideChevronColor,
        });
        chevron.position.y = currentY + height / 2;
        group.add(chevron);
      }

      if (i === 0 && layerCount >= 2) {
        const hasFrosting0 = frostColor && exteriorFinishStyle !== 'naked';
        ledgeY = currentY + height + (hasFrosting0 ? FROST_H : 0);
        layer1OuterRadius = hasFrosting0 ? radius + 0.06 : radius;
      }

      if (i === layerCount - 1) {
        topLayerBaseY = currentY + height;
        const domeAmount = height * 0.05;
        topLayerDomeHeight = (frostColor && exteriorFinishStyle !== 'naked') ? (domeAmount + 0.05) : domeAmount;
      }

      const hasFrosting = frostColor && exteriorFinishStyle !== 'naked';
      currentY += height + (hasFrosting ? FROST_H : 0);
    }

    const topY = currentY + 0.05;
    const topRadius = lastRadius;

    topMetricsRef.current = {
      baseY: topLayerBaseY,
      domeHeight: topLayerDomeHeight,
      topY,
      radius: topRadius,
    };

    // Surface > No Name > Drip — a real covering treatment, so (unlike the
    // decorations below) it's built OUTSIDE the interiorPreview gate and
    // registers into coveringMaterialsRef so Interior Preview's wedge
    // clips through it correctly, same as the frosting shell. Colored by
    // Sugar Color's frostColor (captured as lastFrostColor since
    // frostColor itself is block-scoped inside the per-layer loop above,
    // and this renders after that loop ends) — Side's color picker for
    // this was removed.
    if (sideNoNameSetId === 'drip') {
      const dripRing = buildDripRing(topRadius, sideNoNameColor, rand);
      dripRing.position.y = topY;
      dripRing.material.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
      dripRing.material.clipIntersection = true;
      dripRing.material.clipShadows = true;
      coveringMaterialsRef.current.push(dripRing.material);
      group.add(dripRing);
    }

    // Surface Treatment > Glaze — same "real covering treatment" reasoning
    // as Drip just above: built outside the interiorPreview gate and
    // registered into coveringMaterialsRef so Interior Preview's cutaway
    // shows the full Sponge → Frosting → Glaze stack correctly. Independent
    // of (and stacks with) Side's own Drip above — a Naked cake with Glaze,
    // or a Fully-Frosted cake with both Side's Drip AND a Glaze coat, are
    // both valid combinations (see SurfaceTreatmentSection.jsx's comment on
    // why Glaze stayed out of exteriorFinish.style).
    //
    // buildGlazeGeometry (a "secondary copy" of buildOrganicFrostingGeometry,
    // defined right beside it above) is built from the SAME height/dome/
    // Y-position the top tier's own Frosting shell was just built from
    // (lastFrostTotalHeight/lastFrostDomeH/lastFrostMeshY, captured inside
    // that shell's own construction above) — so its top matches the
    // frosting's shoulder exactly and only its carved-away bottom differs.
    //
    // For Textured Buttercream, "matches the shoulder" isn't enough on its
    // own — Ridge Comb and Ribbon Wrap's ridges are real geometry, not a
    // flat radius, so a uniform clearance would either bury them under a
    // smooth shell (too little clearance: they'd poke through) or sit
    // disconnected above them (too much: no hugging). makeRidgeProfileFn
    // reproduces each texture's own Y-based ridge formula so Glaze's side
    // wall can follow it point-for-point. Vertical Piping's ridges are
    // angle-based instead (see buildVerticalPipingButtercreamGeometry) —
    // hugging those isn't implemented yet, so it falls back to a flat
    // clearance sized to clear their amplitude instead of following them.
    if (surfaceTreatmentMode === 'glaze') {
      const carve = GLAZE_PATTERN_CARVES[surfaceTreatmentPattern] || GLAZE_PATTERN_CARVES.longGaps;
      let ridgeProfileFn = null;
      let ridgeSpacing = null;
      let edgeFadeCycles = 4.5; // how many ridge cycles the boundary fade covers — overridden per texture below
      let coatThickness;   // undefined -> buildGlazeGeometry's own 0.06 default
      let sideSamples;     // undefined -> buildGlazeGeometry's own 48 default (fine for a flat/smooth side)
      let ridgeHugStrength; // undefined -> buildGlazeGeometry's own full-strength (1) default
      let edgeFadeDist;     // undefined -> buildGlazeGeometry's own 0.4 default
      if (lastHasFrosting && exteriorFinishStyle === 'texturedButtercream') {
        if (buttercreamTexture === 'verticalPiping') {
          coatThickness = 0.095 + 0.02; // clears the piping lines' own amplitude + wobble, without hugging them
        } else if (buttercreamTexture === 'ribbonWrap') {
          ridgeSpacing = 0.26;
          edgeFadeCycles = 4.5; // confirmed working at this ratio — leave it alone
          ridgeProfileFn = makeRidgeProfileFn(lastFrostTotalHeight, 0.05, ridgeSpacing, 3.5, 4);
          // Ribbon Wrap's shapePow=3.5 sharpens each ridge toward a plateau
          // rather than a plain sine — that needs noticeably more samples
          // per cycle than Ridge Comb to resolve without the hugged
          // surface's linear interpolation cutting across a peak and
          // dipping below the true ridge envelope (the thin dashes of
          // frosting color showing through at scattered heights).
          sideSamples = Math.max(140, computeRidgeCount(lastFrostTotalHeight, ridgeSpacing, 4) * 20);
          // Floor, not just hug: buildGlazeGeometry's default 0.06
          // coatThickness is a FLAT guarantee that has to hold even where
          // the ridge-hug bulge fades to 0 (the carve boundary — see the
          // Ridge Comb branch below for the full explanation). Ribbon
          // Wrap's own ridgeAmplitude (0.05) plus its own angular wobble
          // (buildRibbonWrapButtercreamGeometry's 0.008+0.005, ~0.013
          // worst case) tops out at ~0.063 — already a hair past the old
          // 0.06 default, which is what let a thin sliver of Ribbon Wrap
          // peek past a carve edge on close inspection. 0.08 clears that
          // worst case with real margin, matching how Vertical Piping
          // (verticalPiping's coatThickness above) sizes its own floor off
          // its texture's amplitude instead of relying on the generic
          // smooth-finish default.
          coatThickness = 0.08;
        } else {
          ridgeSpacing = 0.42;
          // A smaller cycle count than Ribbon Wrap's: at 4.5 (the same
          // ratio that fixed Ribbon Wrap's staircase), Ridge Comb's wider
          // spacing pushed the fade zone wide enough to swallow most of
          // a short/medium drip's own length, so the ridge texture barely
          // showed before fading back out — read as "the hugging starts,
          // then just goes flat/off before finishing" rather than a
          // staircase. 3 cycles, combined with the smoothstep fade curve
          // above (a strict improvement over the old linear ramp on its
          // own), keeps enough of each drip's visible length actually
          // textured while still smoothing the transition cleanly.
          edgeFadeCycles = 3;
          ridgeProfileFn = makeRidgeProfileFn(lastFrostTotalHeight, 0.07, ridgeSpacing, 1, 3); // 'ridged', also the default
          sideSamples = Math.max(140, computeRidgeCount(lastFrostTotalHeight, ridgeSpacing, 3) * 20);
          // Same floor reasoning as Ribbon Wrap just above, but the gap
          // this closes is much bigger here: Ridge Comb's own ridgeAmplitude
          // (0.07) plus its own angular wobble (buildTexturedButtercream-
          // Geometry's 0.01+0.006, ~0.016 worst case) tops out at ~0.086 —
          // a full ~0.026 past the old 0.06 default. That deficit is what
          // read as the Ridge Comb texture visibly poking through the
          // glaze in a jagged/toothed line along every carve edge (the
          // "hugging" bulge that covers it everywhere else fades to
          // exactly 0 right at that edge, on purpose — see edgeFadeDist
          // below — so only a flat coatThickness floor is left to cover
          // the ridge there, and 0.06 was never big enough to). 0.1 clears
          // the ~0.086 worst case with real margin, same margin philosophy
          // as Ribbon Wrap's 0.08 above and Vertical Piping's 0.115.
          coatThickness = 0.1;
        }
        if (ridgeProfileFn && !carve.wave) {
          // Long Drips / Long & Short Drips / Short Drips carve so
          // dramatically (a single column can go from nearly full
          // coverage to nearly none within a handful of neighboring
          // columns) that this used to read as wrinkled along every
          // carved edge. That was never really an edge-fade-strength
          // problem, though — buildGlazeGeometry sampled each column's
          // rows as a fraction of THAT column's own (angle-dependent)
          // depth, so mesh-adjacent columns near a drip tip (where depth
          // changes fastest) were sampling ridgeProfileFn at very
          // different, uncorrelated absolute heights and then stitching
          // those together as if they matched. Dialing ridgeHugStrength
          // down (or off) only ever masked that misalignment, it didn't
          // fix it. buildGlazeGeometry now samples every column against
          // the same absolute height grid, so the root cause is gone and
          // full-strength hugging is safe here again — only the taper
          // right at each column's own cut edge (a separate, legitimate
          // concern: an abruptly-sliced ridge looks odd) still needs
          // tuning, via edgeFadeDist below.
          edgeFadeDist = ridgeSpacing * edgeFadeCycles;
        }
      }
      const glazeGeo = buildGlazeGeometry(
        lastRadius + (lastHasFrosting ? 0.06 : 0),
        lastFrostTotalHeight,
        lastFrostDomeH,
        rand,
        { coatThickness, ridgeProfileFn, sideSamples, carve, ridgeHugStrength, edgeFadeDist },
      );
      const glazeMat = makeGlazeMaterial(surfaceTreatmentColorHex);
      glazeMat.clippingPlanes = interiorPreview ? INTERIOR_PREVIEW_CLIP_PLANES : [];
      glazeMat.clipIntersection = true;
      glazeMat.clipShadows = true;
      coveringMaterialsRef.current.push(glazeMat);
      const glaze = new THREE.Mesh(glazeGeo, glazeMat);
      glaze.position.y = lastFrostMeshY;
      glaze.castShadow = true;
      group.add(glaze);
    }

    // Note: "Top Only"'s checkered-top-squares block used to live here.
    // It's been removed — the 4th Checkered Pattern option is now
    // "Right Diagonal" (id 'rightDiagonal'), handled in the side-squares
    // block above alongside Full Pattern / Left Diagonal / X Pattern,
    // since it's a side-wall treatment, not a top-surface one.

    // Tuxedo set — uniform: top layer only; individual: each assigned layer
    const frostColor2 = FROSTING_COLORS[frostingColor] || FROSTING_COLORS.vanilla;

    // Interior Preview: Skip decorations, borders, drips, topper, and manual placement
    // Only show sponge, filling, and exterior finish
    if (!interiorPreview) {
      // Auto-scattered toppings
      if (toppings.includes('cherry')) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          addCherry(group, Math.cos(angle) * topRadius * 0.6, topY, Math.sin(angle) * topRadius * 0.6, rand);
        }
      }

      if (toppings.includes('sprinkles')) {
        const sprinkleColors = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8B3D', '#C77DFF'];
        for (let i = 0; i < 80; i++) {
          const angle = rand() * Math.PI * 2;
          const r = rand() * topRadius * 0.85;
          const sGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.30, 6);
          const sprinkle = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ color: sprinkleColors[Math.floor(rand() * sprinkleColors.length)] }));
          sprinkle.position.set(Math.cos(angle) * r, topY + 0.15, Math.sin(angle) * r);
          sprinkle.rotation.x = rand() * Math.PI;
          sprinkle.rotation.z = rand() * Math.PI;
          group.add(sprinkle);
        }
      }

      if (toppings.includes('candles')) {
        const candleCount = Math.min(layerCount + 2, 7);
        for (let i = 0; i < candleCount; i++) {
          const angle = (i / candleCount) * Math.PI * 2;
          addCandle(group, Math.cos(angle) * topRadius * 0.5, topY, Math.sin(angle) * topRadius * 0.5, rand);
        }
      }

      if (toppings.includes('strawberries')) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + 0.3;
          addStrawberry(group, Math.cos(angle) * topRadius * 0.55, topY, Math.sin(angle) * topRadius * 0.55);
        }
      }

      if (toppings.includes('chocolateChips')) {
        for (let i = 0; i < 40; i++) {
          const angle = rand() * Math.PI * 2;
          const r = rand() * topRadius * 0.8;
          addChocolateChip(group, Math.cos(angle) * r, topY, Math.sin(angle) * r);
        }
      }

      if (toppings.includes('rosettes')) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          addRosette(group, Math.cos(angle) * topRadius * 0.7, topY, Math.sin(angle) * topRadius * 0.7, frostColor2);
        }
      }

      // Center > Decorations — shared adaptation helpers so every set
      // here (Floral Cluster, Ferrero Rocher, Hershey's Kisses, Oreo,
      // Chocolate Bear, Basketball, Soccer Ball) responds the same way to
      // the rest of the design instead of each hardcoding a flat Y and a
      // fixed absolute scale:
      //
      // 1. centerSurfaceY(x, z) — the topmost tier's top is a DOME, not a
      //    flat plane, whenever Exterior Finish adds a shell (Fully
      //    Frosted / Textured Buttercream both set a non-zero
      //    topLayerDomeHeight; Naked's is smaller/zero). A flat `topY`
      //    only matches the true surface height at the rim — anything
      //    placed nearer the center of the top needs the same
      //    "topLayerBaseY + dome bulge" formula the click-to-place items
      //    below (placedItems, doodles) already use, or it renders
      //    embedded in the frosting/glaze instead of resting on it. Glaze
      //    (Surface Treatment) mirrors the frosting shell's top exactly
      //    (see buildGlazeGeometry's call site above), so this formula
      //    already covers Glaze too without a separate case.
      // 2. centerDecorScale — these sets were modeled/tuned against a
      //    single-layer "big" (8×5) cake, i.e. topRadius === 4. Cake
      //    Structure's size (small/6×5 vs big/8×5) and layer count (the
      //    2nd tier is narrower than the 1st, per RADIUS_STEP above) both
      //    change topRadius, so scaling every mesh by
      //    topRadius/REFERENCE_TOP_RADIUS keeps them sized proportionally
      //    to whatever top tier they're actually sitting on, instead of
      //    staying pinned at their "big, 1 layer" size regardless of
      //    structure. REFERENCE_TOP_RADIUS === 4 means a big, 1-layer
      //    cake — the config these were originally tuned on — renders
      //    identically to before this change.
      const REFERENCE_TOP_RADIUS = 4;
      const centerDecorScale = topRadius / REFERENCE_TOP_RADIUS;
      const centerSurfaceR = topRadius - 0.15; // same edge clearance placedItems' dome formula uses below
      const centerSurfaceY = (x, z) => {
        const r = Math.sqrt(x * x + z * z);
        if (r < centerSurfaceR) {
          return topLayerBaseY + topLayerDomeHeight * (1 - (r / centerSurfaceR) * (r / centerSurfaceR));
        }
        return topY;
      };

      // Center > Decorations — 6-Variation Parametric Placement System
      // Spacing definitions per asset (scaled dynamically with centerDecorScale and topRadius)
      const DECORATION_SPACING = {
        floralCluster: 1.1,
        strawberry: 0.95,
        cherry: 0.85,
        fruitRing: 1.2,
        ferreroRocher: 1.1,
        hersheysKisses: 0.75,
        oreo: 0.95,
        chocolateBear: 1.32,
        basketball: 1.28,
        soccerball: 1.28,
      };

      const computeVariantPositions = (setId, variation, rTop, prng) => {
        const spacing = (DECORATION_SPACING[setId] || 1.0) * centerDecorScale;
        const positions = [];

        if (variation === 'single') {
          positions.push({ x: 0, z: 0 });
        } else if (variation === 'outerRing') {
          const ringRadius = rTop * 0.72;
          const count = Math.max(4, Math.round((2 * Math.PI * ringRadius) / spacing));
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
              x: Math.cos(angle) * ringRadius,
              z: Math.sin(angle) * ringRadius,
            });
          }
        } else if (variation === 'fullFill') {
          positions.push({ x: 0, z: 0 });
          const maxR = rTop * 0.78;
          let currentR = spacing * 0.9;
          while (currentR <= maxR) {
            const count = Math.max(3, Math.round((2 * Math.PI * currentR) / spacing));
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              positions.push({
                x: Math.cos(angle) * currentR,
                z: Math.sin(angle) * currentR,
              });
            }
            currentR += spacing * 0.9;
          }
        } else if (variation === 'crescent') {
          const arcRadius = rTop * 0.72;
          const count = Math.max(3, Math.round((Math.PI * arcRadius) / spacing));
          for (let i = 0; i < count; i++) {
            const frac = count > 1 ? i / (count - 1) : 0.5;
            const angle = -Math.PI * 0.55 + frac * Math.PI * 1.1;
            positions.push({
              x: Math.cos(angle) * arcRadius,
              z: Math.sin(angle) * arcRadius,
            });
          }
        } else if (variation === 'cluster') {
          const clusterOffsets = [
            { x: 0, z: 0 },
            { x: 0.38 * spacing, z: 0.28 * spacing },
            { x: -0.36 * spacing, z: 0.24 * spacing },
            { x: 0.12 * spacing, z: -0.42 * spacing },
            { x: -0.38 * spacing, z: -0.26 * spacing },
          ];
          const offsetX = rTop * 0.28;
          const offsetZ = -rTop * 0.24;
          for (const off of clusterOffsets) {
            positions.push({
              x: offsetX + off.x,
              z: offsetZ + off.z,
            });
          }
        } else if (variation === 'diagonal') {
          const maxDiag = rTop * 0.68;
          const count = Math.max(3, Math.round((2 * maxDiag * 1.414) / spacing));
          for (let i = 0; i < count; i++) {
            const frac = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
            positions.push({
              x: frac * maxDiag * 0.707,
              z: frac * maxDiag * 0.707,
            });
          }
        } else {
          positions.push({ x: 0, z: 0 });
        }

        return positions;
      };

      const buildAndAddDecoration = (targetGroup, setId, x, y, z, scaleFactor, decorColor, prng) => {
        if (setId === 'floralCluster') {
          const unitGroup = new THREE.Group();
          addRosette(unitGroup, 0, 0, 0, decorColor);
          unitGroup.scale.setScalar(0.75 * scaleFactor);
          unitGroup.position.set(x, y, z);
          targetGroup.add(unitGroup);
        } else if (setId === 'strawberry') {
          const unitGroup = new THREE.Group();
          addStrawberry(unitGroup, 0, 0, 0);
          unitGroup.scale.setScalar(0.85 * scaleFactor);
          unitGroup.position.set(x, y, z);
          targetGroup.add(unitGroup);
        } else if (setId === 'cherry') {
          const unitGroup = new THREE.Group();
          addCherry(unitGroup, 0, 0, 0, prng || rand);
          unitGroup.scale.setScalar(0.85 * scaleFactor);
          unitGroup.position.set(x, y, z);
          targetGroup.add(unitGroup);
        } else if (setId === 'fruitRing') {
          const unitGroup = new THREE.Group();
          addStrawberry(unitGroup, -0.15 * scaleFactor, 0, 0);
          addCherry(unitGroup, 0.22 * scaleFactor, 0, 0.1 * scaleFactor, prng || rand);
          unitGroup.scale.setScalar(0.65 * scaleFactor);
          unitGroup.position.set(x, y, z);
          targetGroup.add(unitGroup);
        } else if (setId === 'ferreroRocher') {
          const rocherScale = 0.28 * scaleFactor;
          const rocherMesh = buildFerreroRocherMesh(x, y, z, rocherScale);
          targetGroup.add(rocherMesh);
        } else if (setId === 'hersheysKisses') {
          const kissScale = 0.22 * scaleFactor;
          const rot = prng ? prng() * Math.PI * 2 : 0;
          const kissMesh = buildHersheysKissMesh(x, y, z, kissScale, rot);
          targetGroup.add(kissMesh);
        } else if (setId === 'oreo') {
          const oreoScale = 0.20 * scaleFactor;
          const oreoMesh = buildOreoMesh(x, y, z, oreoScale, 1.38, -0.20, 0.08);
          targetGroup.add(oreoMesh);
        } else if (setId === 'chocolateBear') {
          const bearMesh = buildChocolateBearMesh(x, y, z, 0.28 * scaleFactor);
          targetGroup.add(bearMesh);
        } else if (setId === 'basketball') {
          const basketballMesh = buildBasketballMesh(x, y, z, 0.18 * scaleFactor);
          targetGroup.add(basketballMesh);
        } else if (setId === 'soccerball') {
          const soccerMesh = buildSoccerBallMesh(x, y, z, 0.18 * scaleFactor);
          targetGroup.add(soccerMesh);
        }
      };

      const ALL_DECORATION_ASSET_IDS = [
        'floralCluster', 'strawberry', 'cherry', 'fruitRing', 'ferreroRocher', 'hersheysKisses',
        'oreo', 'chocolateBear', 'basketball', 'soccerball'
      ];

      if (centerDecorationSetId && ALL_DECORATION_ASSET_IDS.includes(centerDecorationSetId)) {
        const positions = computeVariantPositions(
          centerDecorationSetId,
          centerDecorationVariation || 'outerRing',
          topRadius,
          rand
        );
        for (const { x, z } of positions) {
          const y = centerSurfaceY(x, z);
          buildAndAddDecoration(
            group,
            centerDecorationSetId,
            x,
            y,
            z,
            centerDecorScale,
            centerDecorationColor,
            rand
          );
        }
      }

      const isHandwritten = centerTextFont === 'handwritten';
      const activeFont = isHandwritten ? getHandwrittenFont() : getPacificoFont();

      const topStr = (centerTextTop || '').trim();
      const middleStr = (centerTextMiddle || '').trim();
      const bottomStr = (centerTextBottom || '').trim();
      const hasExplicitSlots = Boolean(
        centerTextTop !== undefined || centerTextMiddle !== undefined || centerTextBottom !== undefined
      );

      let textSlots = [];
      const spacingRatio = typeof centerTextSpacing === 'number' ? centerTextSpacing : 0.28;

      if (hasExplicitSlots) {
        if (topStr) textSlots.push({ line: topStr, zRatio: -spacingRatio });
        if (middleStr) textSlots.push({ line: middleStr, zRatio: 0.00 });
        if (bottomStr) textSlots.push({ line: bottomStr, zRatio: spacingRatio });
      } else if (centerText && centerText.trim()) {
        const lines = centerText.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 1) {
          textSlots.push({ line: lines[0], zRatio: 0.00 });
        } else if (lines.length === 2) {
          textSlots.push({ line: lines[0], zRatio: -spacingRatio * 0.65 });
          textSlots.push({ line: lines[1], zRatio: spacingRatio * 0.65 });
        } else if (lines.length >= 3) {
          textSlots.push({ line: lines[0], zRatio: -spacingRatio });
          textSlots.push({ line: lines[1], zRatio: 0.00 });
          textSlots.push({ line: lines[2], zRatio: spacingRatio });
        }
      }

      if (textSlots.length > 0 && activeFont) {
        const textMat = getFrostingMaterial(centerTextColor);
        const textGroup = new THREE.Group();

        textSlots.forEach((slot) => {
          const textGeo = new TextGeometry(slot.line, {
            font: activeFont,
            size: isHandwritten ? 0.38 : 0.33,
            depth: 0.015,
            curveSegments: 8,
            bevelEnabled: true,
            bevelThickness: isHandwritten ? 0.03 : 0.025,
            bevelSize: isHandwritten ? 0.015 : 0.01,
            bevelSegments: 4
          });
          textGeo.computeBoundingBox();
          const bbox = textGeo.boundingBox;
          const xOffset = -0.5 * (bbox.max.x - bbox.min.x);

          const targetWorldZ = slot.zRatio * topRadius;
          const yOffset = -targetWorldZ;

          // Conform the text to the cake's domed surface
          const R = topRadius - 0.15; // Bevel size is 0.15
          const pos = textGeo.attributes.position;
          for (let v = 0; v < pos.count; v++) {
            const vx = pos.getX(v);
            const vy = pos.getY(v);
            const vz = pos.getZ(v);

            const worldX = vx + xOffset;
            const worldZ = -(vy + yOffset);
            const r = Math.sqrt(worldX * worldX + worldZ * worldZ);

            let heightAtR = topLayerBaseY;
            if (r < R) {
              heightAtR += topLayerDomeHeight * (1 - (r / R) * (r / R));
            }

            pos.setZ(v, vz + heightAtR);
          }
          textGeo.computeVertexNormals();

          const textMesh = new THREE.Mesh(textGeo, textMat);
          textMesh.position.set(xOffset, yOffset, 0);
          textMesh.castShadow = true;
          textMesh.receiveShadow = true;
          textGroup.add(textMesh);
        });

        textGroup.rotation.x = -Math.PI / 2;
        textGroup.position.set(0, 0, 0);
        group.add(textGroup);
      }

      // Edge > Decorations > Beaded Trim + Edge > Piping — colored by
      // Sugar Color's frostColor now (the per-slot pickers were removed)
      // — see the "Sugar Color applies everywhere outside Fundamentals"
      // pass. Uses lastFrostColor (see Floral Cluster's comment above)
      // since this runs after the per-layer loop where frostColor itself
      // is declared.
      const edgeSlotsToRender =
        edgeMode === 'both' ? [{ slot: edgeBoth, y: topY, radius: topRadius }, { slot: edgeBoth, y: 0, radius: BASE_RADIUS }]
          : [{ slot: edgeTop, y: topY, radius: topRadius }, { slot: edgeBottom, y: 0, radius: BASE_RADIUS }];
      for (const { slot, y, radius: edgeRadius } of edgeSlotsToRender) {
        const edgeTrimId = slot?.pipingTip === 'beadedTrim' ? 'beadedTrim' : slot?.decorationSetId;
        if (edgeTrimId === 'beadedTrim') {
          const trim = buildBeadedTrimRing(edgeRadius + 0.05, slot?.decorationColor || lastFrostColor, rand);
          trim.position.y = y;
          group.add(trim);
        }
        if (slot?.pipingTip) {
          const pipingMat = getFillingMaterial(slot?.pipingColor || lastFrostColor);
          const edgePiping = buildPipingRing(slot.pipingTip, pipingMat, {
            radius: edgeRadius - 0.25,
            y,
            rand,
            scale: 3,
          });
          if (edgePiping) {
            edgePiping.receiveShadow = true;
            group.add(edgePiping);
          }
        }
      }

      // Edge > Middle (Layer 1 shelf piping ring for 2-layer cakes) —
      // same Sugar Color colorization as the main Edge slots above.
      if (layerCount >= 2 && edgeMiddle?.pipingTip) {
        const middlePipingMat = getFillingMaterial(edgeMiddle.pipingColor || lastFrostColor);
        const middlePiping = buildPipingRing(edgeMiddle.pipingTip, middlePipingMat, {
          radius: layer1OuterRadius - 0.25,
          y: ledgeY,
          rand,
          scale: 3,
        });
        if (middlePiping) {
          middlePiping.receiveShadow = true;
          group.add(middlePiping);
        }
      }

      // Slot-placed and manually placed items
      for (const item of placedItems) {
        let px, pz, py;
        const slot = item.slotId ? getSlotById(item.slotId) : null;
        if (slot) {
          const pos = computeSlotPosition(slot, topRadius);
          px = pos.x;
          pz = pos.z;
        } else {
          const dist = Math.sqrt((item.x || 0) * (item.x || 0) + (item.z || 0) * (item.z || 0));
          const clampedR = Math.min(dist, topRadius * 0.88);
          const angle = Math.atan2(item.z || 0, item.x || 0);
          px = Math.cos(angle) * clampedR;
          pz = Math.sin(angle) * clampedR;
        }

        const R = topRadius - 0.15;
        const r = Math.sqrt(px * px + pz * pz);
        if (r < R) {
          py = topLayerBaseY + topLayerDomeHeight * (1 - (r / R) * (r / R));
        } else {
          py = topY;
        }

        const itemGroup = new THREE.Group();
        itemGroup.userData.slotId = item.slotId || null;

        if (item.type === 'piping') {
          const pipeColor = (item.colorId && SUGAR_COLORS.find(c => c.id === item.colorId)?.hex) || PIPING_FLAVOR_COLORS[item.flavor] || '#FFAB00';
          addPipingPattern(itemGroup, px, py, pz, item.pattern || 'shell', pipeColor);
        } else if (item.type === 'cherry') {
          addCherry(itemGroup, px, py, pz, rand);
        } else if (item.type === 'strawberry') {
          addStrawberry(itemGroup, px, py, pz);
        } else if (item.type === 'candle') {
          addCandle(itemGroup, px, py, pz, rand);
        } else if (item.type === 'chocolateChip') {
          addChocolateChip(itemGroup, px, py, pz);
        } else if (item.type === 'rosette') {
          const roseColor = (item.colorId && SUGAR_COLORS.find(c => c.id === item.colorId)?.hex) || frostColor2;
          addRosette(itemGroup, px, py, pz, roseColor);
        } else if (item.type && item.type.startsWith('doodle-')) {
          const [_, shapeId, colorId] = item.type.split('-');
          addPremadeDoodle(itemGroup, px, topLayerBaseY, pz, topLayerDomeHeight, topRadius, shapeId, colorId, centerDecorationColor, item.rotation !== undefined ? item.rotation : 0);
        }

        group.add(itemGroup);
      }
    }

    // Fixed baseline — bottom of the cake sits at y=0, cake rises upward.
    const baselineY = 0;
    if (baselineYRef.current === 0 || group.position.y !== baselineY) {
      group.position.y = baselineY;
      baselineYRef.current = baselineY;
    }

    // Update slot markers and ghost previews after build
    updateSlotVisuals();

    // Interior Preview's cutaway is now real geometric clipping, applied
    // directly to covering materials (currently just frostMat) at the point
    // they're created above — nothing left to do here.
  }, [cakeConfig]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#FFF5EE');
      scene.fog = new THREE.Fog('#FFF5EE', 40, 80);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 300);
      camera.position.set(0, 8, 22);
      camera.lookAt(0, 4, 0);
      cameraRef.current = camera;

      const thumbnailCamera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 300);
      thumbnailCamera.position.set(8, 6, 16);
      thumbnailCamera.lookAt(0, 4, 0);
      thumbnailCameraRef.current = thumbnailCamera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.localClippingEnabled = true;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      // Make the canvas fill its container exactly — prevents CSS-stretch cropping
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 8;
      controls.maxDistance = 45;
      controls.maxPolarAngle = Math.PI - 0.05;
      controls.target.set(0, 4, 0);
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.update();

      scene.add(new THREE.AmbientLight('#FFFFFF', 0.35));
      const mainLight = new THREE.DirectionalLight('#FFFFFF', 1.2);
      mainLight.position.set(12, 20, 12);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      // Default orthographic shadow-camera frustum is only ±5 units —
      // too small for this cake (plate + decorations can span well beyond
      // that), which is what was clipping the shadow's silhouette before
      // it reached its full extent. Widened to comfortably cover the
      // largest cake + decorations this scene builds.
      mainLight.shadow.camera.left = -18;
      mainLight.shadow.camera.right = 18;
      mainLight.shadow.camera.top = 18;
      mainLight.shadow.camera.bottom = -18;
      mainLight.shadow.camera.near = 1;
      mainLight.shadow.camera.far = 60;
      mainLight.shadow.camera.updateProjectionMatrix();
      scene.add(mainLight);
      const fillLight = new THREE.DirectionalLight('#FFE4E1', 0.25);
      fillLight.position.set(-12, 8, -8);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight('#E8D4F0', 0.3);
      rimLight.position.set(0, 5, -15);
      scene.add(rimLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ color: '#FFF0E6', roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.3;
      ground.receiveShadow = true;
      scene.add(ground);

      const cakeGroup = new THREE.Group();
      scene.add(cakeGroup);
      cakeGroupRef.current = cakeGroup;

      const slotsGroup = new THREE.Group();
      scene.add(slotsGroup);
      slotsGroupRef.current = slotsGroup;

      const ghostGroup = new THREE.Group();
      scene.add(ghostGroup);
      ghostGroupRef.current = ghostGroup;

      const clock = new THREE.Clock();
      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (thumbnailMode) {
          camera.position.set(8, 6, 16);
          camera.lookAt(0, 4, 0);
          cakeGroup.rotation.set(0, 0, 0);
          cakeGroup.position.y = baselineYRef.current;
        } else {
          controls.update();
          cakeGroup.rotation.set(0, 0, 0);
          cakeGroup.position.y = baselineYRef.current;
        }

        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        const aspect = w / h;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        thumbnailCamera.aspect = aspect;
        thumbnailCamera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mount);
      handleResize();

      const getMouseNDC = (clientX, clientY) => {
        const rect = mount.getBoundingClientRect();
        return {
          x: ((clientX - rect.left) / rect.width) * 2 - 1,
          y: -((clientY - rect.top) / rect.height) * 2 + 1,
        };
      };

      const detectHoveredSlot = (clientX, clientY) => {
        if (!activeToolRef.current || !cameraRef.current || !cakeGroupRef.current) return null;
        const ndc = getMouseNDC(clientX, clientY);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, cameraRef.current);
        const { radius, topY } = topMetricsRef.current;
        const planeY = cakeGroupRef.current.position.y + topY;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
        const hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, hit);
        if (!hit) return null;

        const localHit = cakeGroupRef.current.worldToLocal(hit.clone());
        let closestSlot = null;
        let minDistSq = Infinity;
        for (const slot of TOP_SURFACE_SLOTS) {
          const pos = computeSlotPosition(slot, radius);
          const dx = localHit.x - pos.x;
          const dz = localHit.z - pos.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < 0.60 && dSq < minDistSq) {
            minDistSq = dSq;
            closestSlot = slot;
          }
        }
        return closestSlot;
      };

      const tryPlace = (clientX, clientY) => {
        if (!activeToolRef.current) return;
        const slot = detectHoveredSlot(clientX, clientY);
        if (slot) {
          const tool = activeToolRef.current;
          const toolType = typeof tool === 'object' ? tool.type : tool;
          const pos = computeSlotPosition(slot, topMetricsRef.current.radius);
          onPlaceRef.current?.({
            slotId: slot.id,
            type: toolType,
            x: pos.x,
            z: pos.z,
            flavor: tool?.flavor || 'vanilla',
            pattern: tool?.pattern || 'shell',
            colorId: tool?.colorId || 'vanilla',
          });
        }
      };

      const handleMouseDown = (e) => {
        if (e.button !== THREE.MOUSE.LEFT) return;
        mouseRef.current.isDown = true;
        mouseRef.current.moved = false;
        mouseRef.current.prevX = e.clientX;
        mouseRef.current.prevY = e.clientY;
      };

      const handleMouseMove = (e) => {
        if (mouseRef.current.isDown) {
          const dx = e.clientX - mouseRef.current.prevX;
          const dy = e.clientY - mouseRef.current.prevY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) mouseRef.current.moved = true;
          mouseRef.current.prevX = e.clientX;
          mouseRef.current.prevY = e.clientY;
        }

        // Slot hover detection
        if (activeToolRef.current) {
          const hovered = detectHoveredSlot(e.clientX, e.clientY);
          if (hovered?.id !== hoveredSlotRef.current?.id) {
            hoveredSlotRef.current = hovered;
            updateSlotVisuals();
          }
        }
      };

      const handleMouseUp = (e) => {
        const wasDown = mouseRef.current.isDown;
        const wasDrag = mouseRef.current.moved;
        mouseRef.current.isDown = false;
        if (wasDown && !wasDrag && e.button === THREE.MOUSE.LEFT) {
          tryPlace(e.clientX, e.clientY);
        }
      };

      const handleMouseLeave = () => {
        if (hoveredSlotRef.current) {
          hoveredSlotRef.current = null;
          updateSlotVisuals();
        }
      };

      const el = renderer.domElement;

      const handleContextLost = (e) => {
        e.preventDefault();
        console.warn('WebGL context lost. Pausing animation frame.');
        cancelAnimationFrame(animFrameRef.current);
      };

      const handleContextRestored = () => {
        console.info('WebGL context restored. Rebuilding scene and restarting animation.');
        buildCake();
        animate();
      };

      el.addEventListener('webglcontextlost', handleContextLost, false);
      el.addEventListener('webglcontextrestored', handleContextRestored, false);

      if (!thumbnailMode) {
        el.addEventListener('mousedown', handleMouseDown);
        el.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      setIsLoaded(true);

      return () => {
        cancelAnimationFrame(animFrameRef.current);
        resizeObserver.disconnect();
        el.removeEventListener('webglcontextlost', handleContextLost);
        el.removeEventListener('webglcontextrestored', handleContextRestored);
        if (!thumbnailMode) {
          el.removeEventListener('mousedown', handleMouseDown);
          el.removeEventListener('mouseleave', handleMouseLeave);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
        controls.dispose();
        controlsRef.current = null;
        mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    } catch (err) {
      console.error('Three.js initialization error:', err);
      setError(err.message || 'Failed to initialize 3D scene');
    }
  }, []);

  useEffect(() => {
    buildCake();
  }, [buildCake]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-6">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">3D Scene Error</p>
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-red-400 text-xs mt-2">Check browser console for details</p>
          </div>
        </div>
      ) : !isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      ) : null}
      <div
        ref={mountRef}
        className={`w-full h-full ${activeTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />
    </div>
  );
});

export default CakeScene;