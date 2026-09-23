# Fix Sugar Color Pattern/Gradient Display for Edge Tab Designs

Support all pattern, gradient, and metallic Sugar Colors (Marble, Ombré, Rainbow Swirl, Gold Shimmer, Watercolor Pastel Mix, and Red-White Gradient) across all Edge Tab designs: Border Piping (all 12 solid and alternating), Beaded Trim (all 6), Dollops (all Star and Round variants), Whipped Cream Rosettes, and Middle Edge piping.

## User Review Required

> [!NOTE]
> - **Visual finish preserved**: `fillingMaterial.js` maintains its soft glossy whipped cream / jam surface (`roughness: 0.38`), while now rendering true gradients and metallic sparkle when pattern colors are selected.
> - **Beaded Trim glossy clearcoat preserved**: Beaded Trim keeps its signature `MeshPhysicalMaterial` with clearcoat, now extended with gradient texture mapping and metallic sheen for Gold Shimmer.
> - **Fruit & Confection rims**: Strawberry, Hershey's Kiss, Ferrero Rocher, Cherry, Basketball, and Soccer Ball rims remain unchanged with their dedicated photorealistic textures as intended.

## Proposed Changes

### Core Material Utilities

#### [MODIFY] [materialUtils.js](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/materialUtils.js)
- Add and export `parseGradientStops(gradientCss)` utility supporting both `linear-gradient` and `conic-gradient` (for Rainbow Swirl).
- Allows `frostingMaterial.js`, `fillingMaterial.js`, and `DecorationSets.jsx` to parse Sugar Color gradients cleanly without circular dependencies.

#### [MODIFY] [frostingMaterial.js](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/frostingMaterial.js)
- Re-export `parseGradientStops` from `materialUtils.js` for backwards compatibility.

---

### Filling Material & Beaded Trim Material

#### [MODIFY] [fillingMaterial.js](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/fillingMaterial.js)
- Update `createFillingMaterial(hexColor, colorId = null)` and `getFillingMaterial(hexColor, colorId = null)`:
  - Cache key updated to `colorId ? \`${colorId}_${hexColor}\` : hexColor`.
  - Look up `SUGAR_COLORS` entry for `colorId`.
  - Detect `isGradient` (`linear-gradient` / `conic-gradient`) and `isMetallic` (`goldShimmer`).
  - For gradients: parse stops via `parseGradientStops`, build 512×512 clamped texture via `buildGradientTexture`, and return a glossy `MeshStandardMaterial` (`roughness: 0.38, metalness: 0, map: gradientTexture`).
  - For metallic (`goldShimmer`): set `roughness: 0.25, metalness: 0.85`, inject procedural sparkle glint into `emissivemap_fragment`, and clamp roughness in `roughnessmap_fragment`.
  - For solid colors: retain existing procedural whipped-cream/jam undulating shader unchanged.

#### [MODIFY] [DecorationSets.jsx](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/DecorationSets.jsx)
- Add `getBeadedTrimMaterial(colorHex, colorId = null)`:
  - Cache key `colorId ? \`${colorId}_${colorHex}\` : colorHex`.
  - Gradient handling with `map: gradientTexture, roughness: 0.25, clearcoat: 0.6`.
  - Metallic handling for Gold Shimmer (`roughness: 0.2, metalness: 0.85, clearcoat: 0.8`).
  - Solid color fallback with `roughness: 0.25, clearcoat: 0.6`.
- Update `buildBeadedTrimRing(radius, colorHex, rand, opts = {})`:
  - Extract `colorId = opts.colorId || null` and acquire material from `getBeadedTrimMaterial(colorHex, colorId)`.
  - Call `applyVerticalGradientUV` on `dotGeo`, `dashGeo`, and `geo` to ensure linear top-to-bottom UV mapping across beads for clean vertical gradient rendering.

---

### Piping Geometry UV Mapping

#### [MODIFY] [pipingTipsDeluxe.js](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/pipingTipsDeluxe.js)
- Import `applyVerticalGradientUV` from `./frostingMaterial`.
- Call `applyVerticalGradientUV` on:
  - `getUnitGeometry(tip)`: sets vertical UVs on all instanced unit geometries (`star`, `shell`, `bead`, `pulledDot`, `round`, `leaf`, `dropFlower`, `starDollop`, `roundDollop`, `kissDollop`, `whippedCreamRosette`).
  - `mergeGeometries(geometries)`: sets vertical UVs on merged geometries (`reverseShell`, `reverseShellAlt`, `elongatedShell`, `elongatedShellAlt`, `ropeTwist`, `ropeTwistAlt`, `ropeTwistClassic`, `ropeTwistClassicAlt`, `lambeth`).
  - `wrapStripAroundRing(stripGeometry, ringRadius)`: sets vertical UVs on continuous wrapped strips (`zigzag`, `wavePiping`, `rope`, `petal`, `buildContinuousStarDollopRingGeometry`).
  - `buildSolidScallopRimGeometry`: sets vertical UVs on scallop rim geometries.

---

### Config Adapter & Scene Dispatch

#### [MODIFY] [configAdapter.js](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/lib/configAdapter.js)
- In `resolveEdgeSlot(slot, context)`:
  - Resolve `mainSugarData = resolveContextSugarColorWithId(context, null, true)` and `secondarySugarData = resolveContextSugarColorWithId(\`${context}Secondary\`, null, true)`.
  - Emit `decorationColorId: mainSugarData?.id || slot?.decorations?.colorId || null`.
  - Emit `pipingColorId: mainSugarData?.id || slot?.piping?.colorId || null`.
  - Emit `pipingSecondaryColorId: secondarySugarData?.id || slot?.piping?.secondaryColorId || 'red'`.
- In `edgeMiddle`:
  - Resolve `edgeMiddleSugarData = resolveContextSugarColorWithId('edgeMiddle', null, true) || resolveContextSugarColorWithId(edgeMode === 'both' ? 'edgeBoth' : 'edgeTop', null, true)`.
  - Emit `pipingColor: edgeMiddleSugarData?.hex || resolveColor(edge.middle?.piping?.colorId)`.
  - Emit `pipingColorId: edgeMiddleSugarData?.id || edge.middle?.piping?.colorId || null`.
  - Emit `pipingSecondaryColorId: edge.middle?.piping?.secondaryColorId || 'red'`.

#### [MODIFY] [CakeScene.jsx](file:///c:/Users/jomar/Downloads/cakenmake-capstone/client/src/components/cake/CakeScene.jsx)
- Track `let lastFrostColorId = null;` alongside `lastFrostColor` (updated each layer to `frostColorId`).
- At line 2130 (Beaded Trim):
  Pass `colorId: slot?.decorationColorId || lastFrostColorId` in options to `buildBeadedTrimRing`.
- At line 2138 (Main Edge Piping):
  Pass `colorId`: `getFillingMaterial(slot?.pipingColor || lastFrostColor, slot?.pipingColorId || lastFrostColorId)`.
- At line 2140 (Secondary / Alternating Edge Piping):
  Pass `secondaryColorId`: `getFillingMaterial(slot?.pipingSecondaryColor || '#D6293E', slot?.pipingSecondaryColorId || 'red')`.
- At line 2159 (Middle Edge Piping):
  Pass `colorId`: `getFillingMaterial(edgeMiddle.pipingColor || lastFrostColor, edgeMiddle.pipingColorId || lastFrostColorId)`.

---

## Verification Plan

### Automated Tests
- Run existing test suites:
  ```powershell
  npm test
  ```
- Add unit tests verifying:
  - `getFillingMaterial` returns gradient-textured materials for all 5 gradient colors (`marble`, `ombre`, `rainbowSwirl`, `watercolorPastel`, `redWhiteGradient`) and metallic materials for `goldShimmer`.
  - `getBeadedTrimMaterial` builds physical materials with correct `map` and `metalness`/`roughness` for gradient and metallic `colorId`s.
  - `configAdapter.js` outputs `pipingColorId`, `decorationColorId`, `pipingSecondaryColorId`, and `edgeMiddle.pipingColorId`.
  - Piped geometries from `pipingTipsDeluxe.js` have valid non-null `uv` BufferAttributes.

### Manual Verification
- In the 3D customizer, select the **Edge** tab:
  1. Test **Border Piping** with "Marble", "Ombré", "Rainbow Swirl", "Gold Shimmer", "Watercolor Pastel Mix", and "Red-White Gradient": verify that the piping displays the gradient/metallic finish rather than a flat color.
  2. Test **Alternating Border Piping** (e.g. Shell Border - Alternating): verify secondary and primary colors render distinct patterns/colors.
  3. Test **Beaded Trim** (all 6 styles): verify beads display gradients and gold shimmer with their glossy clearcoat.
  4. Test **Dollops** (Star and Round tip variants) and **Whipped Cream Rosettes**: verify patterns render along the height of the dollop/rosette.
  5. Test **Layer 1 Middle Edge** piping on a 2-layer cake: verify it inherits or reflects the selected Sugar Color pattern.
  6. Confirm Fruit/Confection Rims (Strawberries, Cherries, etc.) continue to display their realistic food textures properly.

