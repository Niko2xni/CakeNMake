# AI-to-AI Handoff Note: Porting 3D Studio & Features from `cakenmake-capstone-clutch` to `cakenmake-capstone`

---

## 1. Context & Repository Status

* **Target / Main Project**: `cakenmake-capstone` (Branch: `base`)
  * Contains the latest **Backend Authentication, Firebase Account Sync, Redis-backed OTP Security, User Roles**, and **Editorial UI / Mobile Responsiveness**.
* **Source / Feature Folder**: `cakenmake-capstone-clutch` (Branch: `test` + uncommitted working tree changes)
  * Contains major **3D Studio enhancements**, **Sugar Color gradient & metallic shaders**, **Collision & filling-band hugging physics**, **Multi-tier individual design controls**, and **3D Live Decoration Previews**.
* **Goal for ChatGPT Codex**: Port the 3D features, materials, physics, and UI workflows from `cakenmake-capstone-clutch` into `cakenmake-capstone` without regressing the backend auth or editorial refresh present on `base`.

---

## 2. File Action Summary

### A. New Files to Add to `cakenmake-capstone`
1. `client/src/components/cake/sections/DecorationPreview.jsx`
   * Dedicated Three.js mini-viewport rendered in the designer panel for live orientation (rotation $Y$ and tilt $X$) preview of armed items and buttercream letters.
2. `client/src/components/cake/sections/TierDesignControl.jsx`
   * UI toggle component switching between `"uniform"` (all tiers share styling) and `"individual"` (independent per-tier styling).
3. `client/src/components/cake/pipingTipsDeluxe.js`
   * 2,600+ lines physical piping geometry generator wrapping all piping unit geometries with `applyVerticalGradientUV(geometry)`.
4. `client/src/pages/FrostingImage.jsx`
   * SVG dripping glaze visual component and experimental physical glaze shader prototypes.
5. `sugar_implementation_plan.md`
   * Technical documentation detailing the Sugar Color pattern & gradient implementation.

### B. Files with Critical Code to Merge (Do NOT Blindly Overwrite)
1. `client/src/lib/configAdapter.js`
   * Add extraction of `pipingColorId`, `pipingSecondaryColorId`, `sideDecorationColorId`, `sideCheckeredColorId`, `sideTriangleColorId`, `sideChevronColorId`.
   * Add per-tier surface treatment arrays: `layerSurfaceTreatmentModes`, `layerSurfaceTreatmentColors`, `layerSurfaceTreatmentPatterns`.
2. `client/src/lib/cakeConfig.js`
   * Add `DEFAULT_CONFIG.structure.layerDesign = 'uniform'`, `edge.activeSlot = 'top'`.
   * Add Deluxe variation constants: `BORDER_PIPING_VARIATIONS_DELUXE`, `BEADED_TRIM_VARIATIONS_DELUXE`, `DOLLOPS_VARIATIONS_DELUXE`, `WHIPPED_CREAM_VARIATIONS`, `FRUIT_CONFECTION_RIM_OPTIONS`, `PIPING_TIPS_DELUXE`.
3. `client/src/components/cake/materialUtils.js`
   * Export `parseGradientStops(gradientCss)` supporting `linear-gradient` and `conic-gradient`.
4. `client/src/components/cake/frostingMaterial.js`
   * Export `applyVerticalGradientUV(geometry)`.
   * Add procedural noise sparkle in `#include <emissivemap_fragment>` for Gold Shimmer (`uIsMetallic > 0.5`).
5. `client/src/components/cake/fillingMaterial.js`
   * Support `colorId` in `createFillingMaterial(hexColor, colorId)` and `getFillingMaterial`: builds 512×512 clamped gradient textures for CSS gradients and metallic properties for Gold Shimmer.
6. `client/src/components/cake/DecorationSets.jsx`
   * Add `getBeadedTrimMaterial(colorHex, colorId)` with clearcoat, UV gradients, and metallic sheen.
   * Add coverage functions: `getCheckerCoverageFn`, `getTriangleCoverageFn`, `buildScatterPearlsRing`, `getScatterPearlsCoverageFn`, `getChevronCoverageFn`.
7. `client/src/components/cake/spongeGeometry.js`
   * Export `makeMashedBumpJitter(bumpCount, vScaleMin, vScaleMax, rand, pattern)`.
   * Update `buildMashedCircleFillingGeometry` to accept `precomputedJitter` and `coverageFn` to shave bumps under side patterns on naked cakes.
8. `client/src/components/cake/frostingGeometry.js`
   * Update `buildGlazeGeometry` to pass `(y, angle)` to `ridgeProfileFn`.
9. `client/src/components/cake/CakeScene.jsx`
   * Import `buildPipingRing` from `./pipingTipsDeluxe`.
   * Add `makeFillingBandHugFn(bands, originY, meshBaseRadius)` for filling bump conformity.
   * Add side coverage adapters (`checkerCoverageFn`, `triangleCoverageFn`, `chevronCoverageFn`, `scatterPearlsCoverageFn`, `pipingScrollsCoverageFn`, `sunshinePlayCoverageFn`, `victorianLambethCoverageFn`).
   * Enforce rendering hierarchy: `Filling < Glaze < Side < Center < Edge`.
   * Update edge piping dispatch to pass `pipingColorId` and `pipingSecondaryColorId` to `getFrostingMaterial`.
10. `client/src/components/cake/toppings/strawberry.js`
    * Add `buildSlicedStrawberryMesh` with 180° lathe body, procedural cut-face texture (vascular rays, ivory heart, pulp micro-noise), and triple-calyx leaves.
11. `client/src/components/cake/toppings/oreo.js`
    * Fix `buildOreoMesh` default orientation to exact 90° upright stand (`rotX = Math.PI / 2, rotY = 0, rotZ = 0`).
    * Add `buildOreoMeshFlat(x, y, z, scale, spin)` for flat-lying Oreos.
12. `client/src/components/cake/toppings/ferreroRocher.js`
    * Scale adjusted from `0.28` to `0.45`; 2D canvas context guarded with null checks.
13. `client/src/components/cake/sections/CenterSection.jsx`
    * Integrate `DecorationPreview` for armed decorations and buttercream text.
    * Consolidate placement modes (`decorations`, `piping`, `buttercream`).
14. `client/src/components/cake/sections/EdgeSection.jsx`
    * Streamline into 5 Deluxe categories (Border Piping, Beaded Trim, Dollops, Whipped Cream Rosettes, Edible Delicates).
    * Inline contextual `SugarColorSection` rendering at 6-button row boundaries.
    * Add `1st Color` / `2nd Color` toggle for alternating ("Alt") piping designs.
15. `client/src/components/cake/sections/SurfaceTreatmentSection.jsx`
    * Add multi-tier glaze support (`layerTreatments`, `isIndividual`, `activeLayer`).
16. `client/src/components/cake/ToolPanel.jsx`
    * Simplify tabs from 5 to 4 (`Fundamentals`, `Center`, `Edge`, `Side`).
    * Integrate `TierDesignControl`.
    * Add `sectionRefs` with double-rAF smooth auto-scrolling on section expand.
    * Gate Sponge Flavor and Filling behind Naked exterior finish.
    * Clean up floating top-tier placed items when reducing layer count.

### C. Files to LEAVE INTACT in `cakenmake-capstone` (DO NOT OVERWRITE)
* **`server/**`**: Keep `cakenmake-capstone/server` intact. Clutch lacks `accountController.js`, `authenticate.js`, `authorize.js`, `User.js`, `emailOtpService.js`, `otpStore.js`, etc.
* **`client/src/pages/Landing.jsx` and `Landing.css`**: Keep capstone's editorial layout. If desired, port only the `FrostingImage` SVG component and its `IntersectionObserver` scroll listener.
* **`client/src/pages/Client/**`**: Keep capstone's customer portal pages (`CakeAI.jsx`, `Chats.jsx`, `Profile.jsx`, `Home.jsx`, etc.) which have auth integration.

---

## 3. Step-by-Step Implementation Guide for Codex

### Step 1: Copy Standalone Files
Copy the following files directly from `cakenmake-capstone-clutch` into `cakenmake-capstone`:
* `client/src/components/cake/sections/DecorationPreview.jsx`
* `client/src/components/cake/sections/TierDesignControl.jsx`
* `client/src/components/cake/pipingTipsDeluxe.js`
* `client/src/pages/FrostingImage.jsx`
* `sugar_implementation_plan.md`

### Step 2: Update Material & Texture Pipelines
1. In `client/src/components/cake/materialUtils.js`: add and export `parseGradientStops`.
2. In `client/src/components/cake/frostingMaterial.js`: export `applyVerticalGradientUV`, add the procedural sparkle glint for Gold Shimmer in `#include <emissivemap_fragment>`.
3. In `client/src/components/cake/fillingMaterial.js`: add `colorId` support to create gradient textures and metallic materials.
4. In `client/src/components/cake/DecorationSets.jsx`: add `getBeadedTrimMaterial` and UV-mapped Beaded Trim rings.

### Step 3: Update Topping Models
1. In `client/src/components/cake/toppings/strawberry.js`: add `buildSlicedStrawberryMesh`.
2. In `client/src/components/cake/toppings/oreo.js`: update `buildOreoMesh` rotation to `Math.PI / 2` and add `buildOreoMeshFlat`.
3. In `client/src/components/cake/toppings/ferreroRocher.js`: adjust scale to `0.45` and add context guard.

### Step 4: Update Geometries & Physics
1. In `client/src/components/cake/spongeGeometry.js`: export `makeMashedBumpJitter` and wire `coverageFn` into `buildMashedCircleFillingGeometry`.
2. In `client/src/components/cake/frostingGeometry.js`: pass `angle` to `ridgeProfileFn(y, angle)` in `buildGlazeGeometry`.
3. In helper files (`sunshinePlayHelpers.js`, `victorianLambethHelpers.js`, `pipingScrollsHelpers.js`): add the coverage functions (`getSunshinePlayCoverageFn`, `getVictorianLambethCoverageFn`, `getPipingScrollsCoverageFn`).

### Step 5: Adapt Configuration & Scene Dispatch
1. In `client/src/lib/cakeConfig.js`: add Deluxe variation constants and default tier config.
2. In `client/src/lib/configAdapter.js`: forward all `*ColorId` and `layerSurfaceTreatment*` properties.
3. In `client/src/components/cake/CakeScene.jsx`:
   * Point import to `./pipingTipsDeluxe`.
   * Add `makeFillingBandHugFn` and the side coverage adapters.
   * Update Edge dispatch with `pipingColorId` and `pipingSecondaryColorId`.

### Step 6: ToolPanel & Section UI Integration
1. In `CenterSection.jsx`: add `DecorationPreview`.
2. In `EdgeSection.jsx`: replace with Deluxe rows and inline Sugar Color pickers.
3. In `SurfaceTreatmentSection.jsx`: add per-tier glaze support.
4. In `ToolPanel.jsx`: update to 4 tabs, add `TierDesignControl`, and integrate auto-scrolling.

---

## 4. Verification & Testing

* **Build & Dev Server**: Run `npm run dev` in `client` to verify compilation.
* **Console Warnings**: Check for any missing Three.js textures or undefined `colorId` errors.
* **Interactive Testing**:
  1. **Center Tab**: Arm a strawberry/cherry/letter and verify the 3D preview viewport updates smoothly with rotation/tilt.
  2. **Edge Tab**: Test alternating piping tips with two different Sugar Colors (e.g., Gold Shimmer + Rainbow Swirl) and verify both render accurately.
  3. **Fundamentals Tab**: Set 2 layers, toggle "Individual" tier design, and test applying glaze only to Tier 1.
  4. **Naked Cake Physics**: Switch Exterior Finish to Naked and apply Checkered Pattern; verify filling bumps are shaved flush under the squares.
