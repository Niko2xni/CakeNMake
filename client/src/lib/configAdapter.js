// Adapter to convert new bakery-style config to legacy CakeScene-compatible config
// This allows the new UI to work with the existing 3D rendering system
//
// This adapter resolves every colorId (from SUGAR_COLORS) to an actual
// hex value before handing off to CakeScene — CakeScene receives ready-to-use
// hex strings for every new region (Fundamentals' Sugar Color/Center/Edge/
// Side), rather than doing its own palette lookups. This differs from the
// older fillingColor/cakeColor pattern (where CakeScene resolves flavor ids
// via its own local FILLING_COLORS) because those predate SUGAR_COLORS
// existing at all; consolidating new lookups here avoids introducing a
// second copy of the palette inside CakeScene.jsx.
//
// SUGAR_COLORS replaces the old DECORATIVE_COLORS + FROSTING_COLOR_PALETTE
// split (see cakeConfig.js) — one merged, fully-priced list, one resolver.

import { SUGAR_COLORS } from './cakeConfig';

function resolveColor(colorId) {
  const entry = SUGAR_COLORS.find((c) => c.id === colorId);
  return entry ? entry.hex : SUGAR_COLORS[0].hex; // fall back to vanilla
}

// Sugar Color's "colorOverride" mode is the only mode today that resolves
// to a real hex — null means "no override," a meaningfully different state
// from "some resolved color," unlike resolveColor() above (which always
// falls back to vanilla rather than going null). 'default' has nothing to
// override — its color comes from Exterior Finish's flavor instead, shown
// in the UI as a read-only preview (see SugarColorSection.jsx) rather than
// resolved here. Reused below for Surface Treatment's Glaze color too
// (same "only one real mode resolves to a hex" shape).
function resolveSugarColorHex(mode, colorId) {
  if (mode !== 'colorOverride') return null;
  if (!colorId) return null;
  const entry = SUGAR_COLORS.find((c) => c.id === colorId);
  return entry ? entry.hex : null;
}

export function adaptConfigToLegacy(newConfig) {
  // If the config is already in legacy format, return it as-is
  if (newConfig.cakeColor !== undefined) {
    return newConfig;
  }

  // Convert new bakery-style config to legacy format
  const structure = newConfig.structure || {};
  const sponge = newConfig.sponge || {};
  const filling = newConfig.filling || {};
  const exteriorFinish = newConfig.exteriorFinish || {};
  const sugarColor = newConfig.sugarColor || {};
  const sugarColorOverrides = newConfig.sugarColorOverrides || {};
  const surfaceTreatment = newConfig.surfaceTreatment || {};
  const center = newConfig.center || {};
  const edge = newConfig.edge || {};
  const side = newConfig.side || {};
  const place = newConfig.place || {};

  const isIndividual = structure.layerDesign === 'individual' && structure.layers > 1;
  const resolveContextSugarColor = (context, index = null, allowDefault = false) => {
    const value = sugarColorOverrides[index === null ? context : `${context}-${index}`] || sugarColorOverrides[context];
    if (allowDefault && value?.mode === 'default' && value.colorId) return resolveColor(value.colorId);
    return resolveSugarColorHex(value?.mode || 'default', value?.colorId);
  };

  // Map structure
  const layers = structure.layers || 1;
  const cakeSize = structure.size || 'big';
  const realSize = newConfig.realSize || { diameter: 8, height: 5 };

  // Map sponge flavor
  let cakeColor, layerColors;
  if (isIndividual) {
    layerColors = sponge.layerFlavors || Array(layers).fill('vanilla');
    cakeColor = layerColors[0] || 'vanilla';
  } else {
    cakeColor = sponge.flavor || 'vanilla';
    layerColors = Array(layers).fill(cakeColor);
  }
  
  // Ensure cakeColor is never undefined
  if (!cakeColor) {
    cakeColor = 'vanilla';
  }

  // Map filling
  const fillingEnabled = filling.enabled || false;
  const fillingLayers = fillingEnabled ? (filling.layers || 1) : 0;  // Only use layers if enabled
  let fillingColor, layerFillings;
  
  if (fillingEnabled) {
    // Only set filling colors if filling is actually enabled
    if (isIndividual) {
      layerFillings = filling.layerFlavors || Array(layers).fill('vanilla');
      fillingColor = layerFillings[0];
    } else {
      fillingColor = filling.flavor || 'vanilla';
      layerFillings = Array(layers).fill(fillingColor);
    }
  } else {
    // Filling is disabled - set colors to null
    fillingColor = null;
    layerFillings = Array(layers).fill(null);
  }

  // filling.piping.tip/.colorId are preserved no matter what (never deleted
  // just because they're temporarily hidden — see FillingSection). The
  // legacy/render-facing values below are only "active" when the piping
  // would actually be visible: Full Frosting covers the filling edge,
  // exactly like the picker's own disabled state. Note: piping color is
  // now resolved from SUGAR_COLORS (the shared, merged color palette),
  // NOT the eating-flavor palette — color here is purely decorative, see cakeConfig.js.
  //
  // Mashed Circles (and Mashed Swirls, the same body with a slash pattern
  // — see buildMashedSwirlFillingGeometry in CakeScene.jsx) are the
  // exception: they're piped in the Filling Flavor's own color rather
  // than an independently-chosen one — real buttercream piped straight
  // from the filling would naturally match it. SUGAR_COLORS' first six
  // entries are exactly the flavor-mirror colors (same id as the flavor,
  // same hex CakeScene resolves for it — see SugarColorSection.jsx's
  // "Default" mode, same trick), so resolveColor on fillingColor (the
  // flavor id) gives the matching hex directly, no separate lookup
  // needed. piping.colorId is still preserved untouched in the stored
  // config either way — this only affects what render-facing hex gets
  // used, same "preserve, don't delete" pattern as the tip/color
  // themselves above.
  const piping = filling.piping || {};
  // Any style that fully covers the cake hides the filling edge — that's
  // now Fully Frosted OR Textured Buttercream (a different application of
  // the same base coat, see exteriorFinish's comment in cakeConfig.js),
  // not just Fully Frosted alone.
  const regionsHidden = exteriorFinish.style === 'fullyFrosted' || exteriorFinish.style === 'texturedButtercream';
  const fillingPipingTip = (fillingEnabled && piping.tip && !regionsHidden) ? piping.tip : null;
  const usesFlavorColor = piping.tip === 'mashedCircles' || piping.tip === 'mashedSwirls';
  const fillingSugarColorHex = resolveContextSugarColor('filling');
  const layerFillingSugarColors = Array.from({ length: layers }, (_, index) => resolveContextSugarColor('filling', index));
  const fillingPipingColor = fillingSugarColorHex || (usesFlavorColor
    ? resolveColor(fillingColor)
    : resolveColor(piping.colorId));

  // Map exterior finish
  // Only apply frosting if a style has been selected
  let frostingColor, layerFrostings;
  if (exteriorFinish.style === null) {
    // No exterior finish selected - don't apply frosting
    frostingColor = null;
    layerFrostings = Array(layers).fill(null);
  } else if (isIndividual) {
    layerFrostings = exteriorFinish.layerFlavors || Array(layers).fill('vanilla');
    frostingColor = layerFrostings[0] || 'vanilla';
  } else {
    frostingColor = exteriorFinish.flavor || 'vanilla';
    layerFrostings = Array(layers).fill(frostingColor);
  }

  // ── Sugar Color — "what does the coating look like," independent of
  // exteriorFinish.style ("is there a coating") and .flavor ("what does it
  // taste like"). Only `colorOverride` mode resolves to a hex today (see
  // resolveSugarColorHex above) — 'default' is intentionally left null;
  // CakeScene already falls back to the flavor-driven color whenever
  // surfaceFrostingColorHex is null, which is also exactly the color
  // SugarColorSection shows as Default's read-only preview swatch, so
  // renderer and UI agree without this adapter needing to do anything
  // extra for that case. When surfaceFrostingColorHex IS set, CakeScene
  // uses it as the complete frosting color, replacing the flavor's natural
  // color. Named surfaceFrostingColorHex (not
  // frostingColor) to avoid colliding with the Fundamentals flavor-id
  // variable of that name above, and kept under that name since it's
  // exactly what CakeScene.jsx already reads for the frosting-color
  // blend — no renderer changes needed for this part of the move.
  const sugarColorMode = sugarColor.mode || 'default';
  const surfaceFrostingColorHex = resolveContextSugarColor('exterior');
  const layerSurfaceFrostingColors = Array.from({ length: layers }, (_, index) => resolveContextSugarColor('exterior', index));
  // Passed through separately (not yet read by CakeScene) so the person's
  // chosen color for a future Color Override variant isn't lost — same
  // "implemented: false but data-preserved" pattern as the unbuilt
  // SUGAR_COLORS pattern swatches.
  const sugarColorHex = sugarColor.colorId ? resolveColor(sugarColor.colorId) : null;

  // ── Surface Treatment — Glaze, an overlay independent of both Sugar
  // Color (a color choice) and Exterior Finish's `style` (the base coat
  // itself) — see exteriorFinish's comment in cakeConfig.js for why
  // Textured Buttercream ended up over there instead of here. Glaze now
  // has real geometry (buildGlazeGeometry in CakeScene.jsx), so
  // surfaceTreatmentColorHex resolves the person's actual Sugar Color
  // choice for context 'surface' — same resolveContextSugarColor(...,
  // allowDefault=true) call Center/Edge/Side use, since Glaze has no
  // flavor of its own either and so also uses Sugar Color's pickable
  // Default grid, not a read-only flavor swatch (see
  // SurfaceTreatmentSection.jsx/ToolPanel.jsx — the section's own
  // standalone Color grid that used to write surfaceTreatment.colorId
  // directly was a duplicate of Sugar Color and has been removed).
  // Falls back to vanilla via resolveColor(), the same "always resolves
  // to *some* hex" shape CakeScene expects from every other covering
  // color (frostColor, sideNoNameColor, etc.), rather than
  // resolveSugarColorHex's "null unless colorOverride" shape, since Glaze
  // has no equivalent "no color chosen yet" state — picking Glaze at all
  // means a color applies. surfaceTreatmentPattern passes through the six
  // GLAZE_PATTERNS ids as-is (no resolution needed, same as
  // buttercreamTexture above) — falls back to 'longGaps' so older saved
  // configs without a pattern field still render one of the six rather
  // than an unhandled id.
  const surfaceTreatmentMode = surfaceTreatment.mode || null;
  const surfaceTreatmentColorHex = surfaceTreatmentMode === 'glaze'
    ? (resolveContextSugarColor('surface', null, true) || resolveColor('vanilla'))
    : null;
  const surfaceTreatmentPattern = surfaceTreatment.pattern || 'longGaps';

  const centerDecorationSetId = center.decorations?.setId || null;
  const centerDecorationVariation = center.decorations?.variation || 'outerRing';
  const centerSugarColorHex = resolveContextSugarColor('center', null, true);
  const centerDecorationColor = centerSugarColorHex || resolveColor(center.decorations?.colorId);
    const centerTextTop = center.text?.top ?? '';
  const centerTextMiddle = center.text?.middle ?? (center.text?.value ?? '');
  const centerTextBottom = center.text?.bottom ?? '';
  const centerText = center.text?.value ?? [centerTextTop, centerTextMiddle, centerTextBottom].filter(Boolean).join('\n');
  const centerTextFont = center.text?.font || 'script';
  const centerTextColor = centerSugarColorHex || resolveColor(center.text?.colorId);
  const centerTextSpacing = typeof center.text?.spacing === 'number' ? center.text.spacing : 0.28;

  // ── Edge — Top+Bottom-separate XOR Both (genuine delete, spec §4b).
  // Resolve all three slots regardless of mode; CakeScene only needs to
  // render whichever `edgeMode` says is active.
  const edgeMode = edge.mode || 'both';
  const resolveEdgeSlot = (slot, context) => ({
    decorationSetId: slot?.decorations?.setId || null,
    decorationColor: resolveContextSugarColor(context, null, true) || resolveColor(slot?.decorations?.colorId),
    pipingTip: slot?.piping?.tip || null,
    pipingColor: resolveContextSugarColor(context, null, true) || resolveColor(slot?.piping?.colorId),
  });
  const edgeTop = resolveEdgeSlot(edge.top, 'edgeTop');
  const edgeBottom = resolveEdgeSlot(edge.bottom, 'edgeBottom');
  const edgeBoth = resolveEdgeSlot(edge.both, 'edgeBoth');
  // Middle — piping only (no decoration setId), always resolved regardless of edgeMode
  const edgeMiddle = {
    pipingTip: edge.middle?.piping?.tip || null,
    pipingColor: resolveColor(edge.middle?.piping?.colorId),
  };

  // ── Side — exactly one of seven treatments is active at a time
  // (`side.mode`), each with its own dedicated field so switching between
  // them never loses a person's settings. Resolved back into the SAME
  // legacy field names CakeScene.jsx already reads (sideDecorationSetId /
  // sideNoNameSetId / sideCheckeredPatternSetId etc.) — this used to be
  // three independent fields a person could set all at once with nothing
  // stopping them (a real gap); `mode` now enforces "only one visible"
  // at the data layer instead of by convention, and CakeScene needs no
  // renderer changes since the values it reads are shaped identically to
  // before, just computed differently here.
  const sideMode = side.mode || null;
  const DECORATION_MODES = ['stripes', 'scatterPearls', 'pipingScrolls', 'fondantSwag', 'chevronPattern', 'victorianLambeth'];
  const NO_NAME_MODES = ['tuxedo', 'whippedSkirt', 'drip'];

  const sideDecorationSetId = DECORATION_MODES.includes(sideMode) ? sideMode : null;
  const sideSugarColorHex = resolveContextSugarColor('side', null, true);
  const sideDecorationColor = sideDecorationSetId
    ? (sideSugarColorHex || resolveColor(side[sideDecorationSetId]?.colorId))
    : resolveColor(undefined);

  const sideNoNameSetId = NO_NAME_MODES.includes(sideMode) ? sideMode : null;
  const sideNoNameColor = sideNoNameSetId
    ? (sideSugarColorHex || resolveColor(side[sideNoNameSetId]?.colorId))
    : resolveColor(undefined);

  // Checkered Pattern — its own field regardless of mode (4 variants live
  // under checkeredPattern.setId), only "active" when it's the chosen
  // side.mode. Not hidden by regionsHidden — like the old Surface fields,
  // this IS the thing Interior Preview needs to clip through, not
  // something Interior Preview hides.
  const sideCheckeredPatternSetId = sideMode === 'checkeredPattern'
    ? (side.checkeredPattern?.setId || null)
    : null;
  // NEW capability, not yet read by CakeScene.jsx: Checkered Pattern is now
  // tintable (previously locked to black+white). Passed through so the
  // color isn't lost once the checkered-square builder is updated to
  // accept a tint — see the follow-up note where this adapter is used.
  const sideCheckeredColor = sideSugarColorHex || resolveColor(side.checkeredPattern?.colorId);

  // Triangle Pattern — duplicate of Checkered Pattern's exact resolution:
  // its own field regardless of mode (6 variants live under
  // trianglePattern.setId), only "active" when it's the chosen side.mode.
  // Tintable via SUGAR_COLORS same as Checkered.
  const sideTrianglePatternSetId = sideMode === 'trianglePattern'
    ? (side.trianglePattern?.setId || null)
    : null;
  const sideTriangleColor = sideSugarColorHex || resolveColor(side.trianglePattern?.colorId);

  const sideChevronPatternSetId = sideMode === 'chevronPattern'
    ? (side.chevronPattern?.setId || 'multiColor')
    : null;
  const sideChevronColor = sideSugarColorHex || resolveColor(side.chevronPattern?.colorId);

  const sideScatterPearlsSetId = sideMode === 'scatterPearls'
    ? (side.scatterPearls?.setId || 'randomScatter')
    : null;

  const sidePipingScrollsSetId = sideMode === 'pipingScrolls'
    ? (side.pipingScrolls?.setId || 'waveRope')
    : null;

  const sideFondantSwagSetId = sideMode === 'fondantSwag'
    ? (side.fondantSwag?.setId || 'classic')
    : null;

  const sideVictorianLambethSetId = sideMode === 'victorianLambeth'
    ? (side.victorianLambeth?.setId || 'classic')
    : null;

  // ── Place — maps place.items to placedItems format for CakeScene, PricingPanel, etc.
  const placeItems = Array.isArray(place.items) ? place.items : [];
  const mappedPlaceItems = placeItems.map(item => ({
    slotId: item.slotId || null,
    type: item.type,
    x: item.position?.x !== undefined ? item.position.x : (item.x || 0),
    z: item.position?.z !== undefined ? item.position.z : (item.z || 0),
    rotation: item.rotation?.y !== undefined ? item.rotation.y : (item.rotation || 0),
    flavor: item.flavor || 'vanilla',
    pattern: item.pattern || 'shell',
    colorId: item.colorId || 'vanilla',
    price: item.price || 0,
  }));

  const legacyPlacedItems = Array.isArray(newConfig.placedItems) ? newConfig.placedItems : [];
  const combinedPlacedItems = mappedPlaceItems.length > 0 ? mappedPlaceItems : legacyPlacedItems;

  // Build legacy config
  return {
    // Legacy structure
    layers,
    cakeSize,
    realSize,
    designMode: isIndividual ? 'individual' : 'uniform',
    
    // Legacy colors
    cakeColor,
    frostingColor,
    fillingColor,
    layerColors,
    layerFrostings,
    layerFillings,
    
    // Legacy filling
    fillingEnabled,
    fillingLayers,
    fillingPipingTip,
    fillingPipingColor,
    layerFillingSugarColors,
    
    // Exterior finish style (needed for rendering logic)
    exteriorFinishStyle: exteriorFinish.style || 'fullyFrosted',
    // Only meaningful to CakeScene when exteriorFinishStyle is
    // 'texturedButtercream' — picks Ridged Comb / Ribbon Wrap / Vertical
    // Piping. Same flat-value-only limitation as exteriorFinishStyle
    // itself: layerButtercreamTextures exists on exteriorFinish for
    // per-layer individual design, same as layerStyles/layerFlavors, but
    // isn't read here — CakeScene doesn't render per-tier style
    // differences today regardless of what's picked per layer.
    buttercreamTexture: exteriorFinish.buttercreamTexture || 'ridged',

    // Sugar Color (formerly Surface) — surfaceFrostingColorHex IS rendered
    // in CakeScene.jsx (replacing the flavor color) when
    // mode is colorOverride. sugarColorMode itself isn't read by
    // CakeScene — kept here so the person's mode choice round-trips, and
    // sugarColorHex is passed through regardless so a future non-override
    // use of it isn't lost.
    surfaceFrostingColorHex,
    layerSurfaceFrostingColors,
    sugarColorMode,
    sugarColorHex,

    // Surface Treatment — Glaze only now (Textured Buttercream moved to
    // exteriorFinishStyle above, see exteriorFinish's comment in
    // cakeConfig.js). surfaceTreatmentMode, surfaceTreatmentColorHex, and
    // surfaceTreatmentPattern are all read by CakeScene now
    // (buildGlazeGeometry).
    surfaceTreatmentMode,
    surfaceTreatmentColorHex,
    surfaceTreatmentPattern,

    // Center
    centerDecorationSetId,
    centerDecorationVariation,
    centerDecorationColor,
    centerText,
    centerTextTop,
    centerTextMiddle,
    centerTextBottom,
    centerTextSpacing,
    centerTextFont,
    centerTextColor,

    // Edge
    edgeMode,
    edgeTop,
    edgeBottom,
    edgeBoth,
    edgeMiddle,

    // Side — exactly one of seven treatments active at a time via
    // side.mode (see above). sideDecorationSetId/sideNoNameSetId/
    // sideCheckeredPatternSetId are already rendered in CakeScene.jsx,
    // register into coveringMaterialsRef, and now come mutually-exclusive
    // by construction rather than by convention. sideCheckeredColor is new
    // — Checkered Pattern is tintable now, but CakeScene's checkered-square
    // builder doesn't accept a tint yet, so this is passed through
    // un-rendered until that follow-up lands.
    sideDecorationSetId,
    sideDecorationColor,
    sideCheckeredPatternSetId,
    sideCheckeredColor,
    sideTrianglePatternSetId,
    sideTriangleColor,
    sideChevronPatternSetId,
    sideChevronColor,
    sideScatterPearlsSetId,
    sidePipingScrollsSetId,
    sideFondantSwagSetId,
    sideVictorianLambethSetId,
    sideNoNameSetId,
    sideNoNameColor,

    // Place
    placeItems,

    // Legacy decorations (deprecated sources removed — toppings/placedItems
    // no longer derive from anything; nothing currently populates these,
    // kept only because CakeScene.jsx still reads them)
    toppings: [],
    placedItems: combinedPlacedItems,
    plateVisible: newConfig.plateVisible !== undefined ? newConfig.plateVisible : true,
    
    // Legacy sets (old tuxedo/skirt mechanism — superseded by
    // side.mode + side.tuxedo/side.whippedSkirt, kept only for any code
    // path not yet migrated)
    activeSet: null,
    activeSetLayers: [],
    
    // Preserve interior preview flag for rendering
    interiorPreview: newConfig.interiorPreview || false,
    
    // Preserve new structure for future use
    _newConfig: newConfig,
  };
}

export function adaptConfigFromLegacy(legacyConfig) {
  // If the config is already in new format, return it as-is
  if (legacyConfig.structure !== undefined) {
    return legacyConfig;
  }

  // Convert legacy config to new bakery-style format
  const isIndividual = legacyConfig.designMode === 'individual' && legacyConfig.layers > 1;

  return {
    structure: {
      size: legacyConfig.cakeSize || 'big',
      layers: legacyConfig.layers || 1,
      layerDesign: isIndividual ? 'individual' : 'uniform',
    },
    realSize: legacyConfig.realSize || { diameter: 8, height: 5 },
    
    sponge: {
      flavor: legacyConfig.cakeColor || 'vanilla',
      layerFlavors: legacyConfig.layerColors || [],
    },
    
    filling: {
      enabled: legacyConfig.fillingEnabled || false,
      layers: legacyConfig.fillingLayers || 1,
      flavor: legacyConfig.fillingColor || 'vanilla',
      layerFlavors: legacyConfig.layerFillings || [],
      piping: {
        tip: legacyConfig.fillingPipingTip || null,
        colorId: 'vanilla', // legacy configs never had a colorId — reset to default
      },
    },
    
    exteriorFinish: {
      style: 'fullyFrosted', // Default for legacy configs
      flavor: legacyConfig.frostingColor || 'vanilla',
      buttercreamTexture: legacyConfig.buttercreamTexture || 'ridged',
      layerStyles: [],
      layerFlavors: legacyConfig.layerFrostings || [],
      layerButtercreamTextures: [],
      customization: {
        size: 'medium',
        density: 'medium',
      },
    },

    sugarColor: {
      mode: 'default',
      colorId: null,
    },

    surfaceTreatment: {
      mode: null,
      colorId: null,
    },

    center: {
      mode: null,
      decorations: { setId: null, variation: 'outerRing', colorId: 'vanilla' },
      text: { value: '', font: 'default' },
    },

    edge: {
      mode: 'both',
      top: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
      bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
      both: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla' } },
    },

    side: {
      mode: null,
      checkeredPattern: { setId: null, colorId: 'vanilla' },
      trianglePattern: { setId: null, colorId: 'vanilla' },
      stripes: { colorId: 'vanilla' },
      scatterPearls: { colorId: 'vanilla' },
      tuxedo: { colorId: 'vanilla' },
      whippedSkirt: { colorId: 'vanilla' },
      drip: { colorId: 'vanilla' },
      piping: { tip: null, colorId: 'vanilla' },
    },

    place: {
      items: legacyConfig.place?.items || (legacyConfig.placedItems || []).map((item, idx) => ({
        id: item.slotId || `legacy-${idx}`,
        slotId: item.slotId || null,
        type: item.type,
        position: { x: item.x || 0, y: 0, z: item.z || 0 },
        rotation: { x: 0, y: item.rotation || 0, z: 0 },
        flavor: item.flavor || 'vanilla',
        pattern: item.pattern || 'shell',
        colorId: item.colorId || 'vanilla',
        price: item.price || 0,
      })),
    },

    interiorPreview: false,
    
    // Preserve legacy fields
    toppings: legacyConfig.toppings || [],
    plateVisible: legacyConfig.plateVisible !== undefined ? legacyConfig.plateVisible : true,
    placedItems: legacyConfig.placedItems || [],
    designMode: legacyConfig.designMode || 'uniform',
    layerColors: legacyConfig.layerColors || [],
    layerFrostings: legacyConfig.layerFrostings || [],
    layerFillings: legacyConfig.layerFillings || [],
    activeSet: legacyConfig.activeSet || null,
    activeSetLayers: legacyConfig.activeSetLayers || [],
  };
}