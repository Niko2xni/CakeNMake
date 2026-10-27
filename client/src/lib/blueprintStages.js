import { getSurfaceTreatmentPattern, isPetitsFourStructure } from './cakeConfig';
import { name, flavorColorOf, cleanDecorName, resolveEdgeColors } from './blueprintDetails';

// Blueprint "DETAILS:" tier pages -- the plan.
//
// buildBlueprintTierPlan(config) looks at the customer's (new-format) cake
// config and returns
//
//   { stages, groups }
//
//   stages  what CakeScene.captureBlueprintStages must photograph:
//           [{ key, config, slice? }]. `config` is a NEW-format config -- the
//           caller runs it through adaptConfigToLegacy, and for `slice`
//           stages sets legacy `__sliceScale = slice` (a short single-tier
//           slab, used for the stacked filling slices).
//   groups  the pages to draw, one group per tier (a single group when the
//           tiers share one design): [{ tierLabel, pages: [page] }].
//
// A page is { kind, section, image | images, callouts, details, highlights,
// flavor }. Anything the customer did not choose produces no page, so the
// PDF never contains an empty tab. Order inside a group is always:
//   Fundamentals (format/size/tier/shape/sponge, "Naked Finish" cake) ->
//   Filling -> Exterior Finish -> Surface Treatment -> Side -> Edge Top ->
//   Edge Bottom -> Center.

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const pick = (individual, list, fallback, i) => (individual && Array.isArray(list) && list[i] != null ? list[i] : fallback);

function stripTo(config) {
    // The same cake with every decorative layer removed: plain naked sponge.
    const plain = clone(config);
    const finish = plain.exteriorFinish || {};
    plain.exteriorFinish = { ...finish, style: 'naked' };
    if (Array.isArray(finish.layerStyles)) plain.exteriorFinish.layerStyles = finish.layerStyles.map(() => 'naked');
    const filling = plain.filling || {};
    plain.filling = { ...filling, enabled: false };
    if (Array.isArray(filling.layerEnabled)) plain.filling.layerEnabled = filling.layerEnabled.map(() => false);
    const surface = plain.surfaceTreatment || {};
    plain.surfaceTreatment = { ...surface, mode: null };
    if (Array.isArray(surface.layerTreatments)) plain.surfaceTreatment.layerTreatments = surface.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
    const side = plain.side || {};
    plain.side = { ...side, mode: null };
    if (Array.isArray(side.layerTreatments)) plain.side.layerTreatments = side.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
    const edge = { ...(plain.edge || {}) };
    ['top', 'middle', 'bottom', 'both'].forEach((slot) => { delete edge[slot]; });
    plain.edge = edge;
    plain.place = { ...(plain.place || {}), items: [] };
    return plain;
}

// Which edge slots to show, in the required order: Top, then Bottom. A
// "both" edge is the same design on each, so it yields two pages.
function edgeSlots(config) {
    const edge = config.edge || {};
    const has = (e) => Boolean(e?.piping?.tip || e?.decorations?.setId);
    if (edge.mode === 'both') return has(edge.both) ? [['top', edge.both], ['bottom', edge.both]] : [];
    return [['top', edge.top], ['bottom', edge.bottom]].filter(([, e]) => has(e));
}

function edgeDetails(edge, slot = 'top', config = {}) {
    const rows = [];
    const colors = resolveEdgeColors(config, slot, edge);
    if (edge.piping?.tip) {
        rows.push(['Piping', name(edge.piping.tip)]);
        rows.push(['Piping Color', colors.fullColorName]);
    }
    if (edge.decorations?.setId) {
        rows.push(['Decoration', name(edge.decorations.setId)]);
        if (colors.decorColorId) rows.push(['Decoration Color', colors.decorName]);
    }
    return rows;
}

export function buildBlueprintTierPlan(config = {}) {
    const tiers = config.structure?.layers || 1;
    const petit = isPetitsFourStructure(config.structure);
    const count = petit ? 4 : tiers;
    const individual = (tiers > 1 || petit) && config.structure?.layerDesign === 'individual';
    const pieceName = petit ? 'Variant' : 'Tier';
    const loops = individual ? count : 1;

    const finishCfg = config.exteriorFinish || {};
    const stages = [];
    const plain = stripTo(config);

    stages.push({ key: 'base', config: plain, fit: 0.88 });

    // ── per-tier data ──
    const info = [];
    for (let i = 0; i < loops; i++) {
        const sponge = pick(individual, config.sponge?.layerFlavors, config.sponge?.flavor, i);
        const fillingOn = individual && Array.isArray(config.filling?.layerEnabled) ? config.filling.layerEnabled[i] !== false : Boolean(config.filling?.enabled);
        const fillingLayers = pick(individual, config.filling?.layerLayers, config.filling?.layers || 1, i) || 1;
        const fillingFlavor = pick(individual, config.filling?.layerFlavors, config.filling?.flavor, i);
        const piping = pick(individual, config.filling?.layerPipings, config.filling?.piping, i);
        const style = pick(individual, finishCfg.layerStyles, finishCfg.style, i);
        const frost = pick(individual, finishCfg.layerFlavors, finishCfg.flavor, i);
        const texture = pick(individual, finishCfg.layerButtercreamTextures, finishCfg.buttercreamTexture, i);
        const surface = individual ? config.surfaceTreatment?.layerTreatments?.[i] || config.surfaceTreatment : config.surfaceTreatment;
        const side = individual ? config.side?.layerTreatments?.[i] || config.side : config.side;
        info.push({ i, sponge, fillingOn, fillingLayers, fillingFlavor, piping, style, frost, texture, surface, side });
    }

    // ── stage configs (cumulative, so each image shows what was just added) ──
    const anyFinish = info.some((t) => t.style && t.style !== 'naked');
    const anySurface = info.some((t) => t.surface?.mode);
    const anySide = info.some((t) => t.side?.mode);
    const slots = edgeSlots(config);
    const placed = config.place?.items || [];

    let running = plain;
    let runningKey = 'base';
    if (anyFinish) {
        running = { ...clone(running), exteriorFinish: clone(finishCfg) };
        const hasTexturedFinish = info.some((t) => t.style === 'texturedButtercream');
        if (hasTexturedFinish) {
            stages.push({
                key: 'finish',
                config: running,
                azimuth: 18,
                tilt: 0,
                fit: 0.86,
                zoom: {
                    mode: 'pattern',
                    fullHeight: true,
                    tilt: 0,
                    arc: 28,
                    fit: 1.0,
                },
            });
        } else {
            stages.push({ key: 'finish', config: running, fit: 0.88 });
        }
        runningKey = 'finish';
    }
    if (anySurface) {
        const surfaceBase = anyFinish ? { ...clone(plain), exteriorFinish: clone(finishCfg) } : clone(plain);
        const surfaceConfig = {
            ...clone(surfaceBase),
            surfaceTreatment: clone(config.surfaceTreatment),
            side: { mode: null },
        };
        if (surfaceConfig.side && Array.isArray(surfaceConfig.side.layerTreatments)) {
            surfaceConfig.side.layerTreatments = surfaceConfig.side.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
        }

        // Close front screenshot (tilted to highlight top surface treatment & drips)
        // Zoomed out slightly (fit: 0.82) so the end/bottom rim of the cake is seen
        stages.push({
            key: 'surface-front',
            config: surfaceConfig,
            diffConfig: surfaceBase,
            azimuth: 18,
            tilt: 0,
            fit: 0.82,
            zoom: {
                mode: 'pattern',
                fullHeight: true,
                tilt: 0,
                arc: 28,
                fit: 0.82,
            },
        });
        // Close back screenshot (no background, only surface pattern)
        stages.push({
            key: 'surface-back',
            config: surfaceConfig,
            azimuth: 198,
            fit: 0.82,
            zoom: {
                mode: 'pattern',
                fullHeight: true,
                tilt: 0,
                arc: 28,
                fit: 0.82,
            },
        });

        running = { ...clone(running), surfaceTreatment: clone(config.surfaceTreatment) };
        runningKey = 'surface';
    }
    if (anySide) {
        // Base for SIDE: strictly excludes any surface treatment!
        // Display as Naked + SIDE or Frosted/Texture + SIDE
        const sideBase = anyFinish ? { ...clone(plain), exteriorFinish: clone(finishCfg) } : clone(plain);
        const sideConfig = {
            ...clone(sideBase),
            side: clone(config.side),
            surfaceTreatment: { mode: null },
        };
        if (sideConfig.surfaceTreatment && Array.isArray(sideConfig.surfaceTreatment.layerTreatments)) {
            sideConfig.surfaceTreatment.layerTreatments = sideConfig.surfaceTreatment.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
        }

        // Close front screenshot (no background, only side pattern)
        stages.push({
            key: 'side-front',
            config: sideConfig,
            diffConfig: sideBase,
            azimuth: 18,
            tilt: 0,
            fit: 0.86,
            zoom: {
                mode: 'pattern',
                fullHeight: true,
                tilt: 0,
                arc: 28,
                fit: 1.0,
            },
        });
        // Close back screenshot (no background, only side pattern)
        stages.push({
            key: 'side-back',
            config: sideConfig,
            azimuth: 198,
            fit: 0.86,
            zoom: {
                mode: 'pattern',
                fullHeight: true,
                tilt: 0,
                arc: 28,
                fit: 1.0,
            },
        });

        running = { ...clone(running), side: clone(config.side) };
    }
    slots.forEach(([slot, edge]) => {
        // Edge screenshot strictly isolates the edge design:
        // Excludes side decorations and surface treatments so it focuses on edge piping.
        const edgeBase = anyFinish ? { ...clone(plain), exteriorFinish: clone(finishCfg) } : clone(plain);
        const only = {
            ...clone(edgeBase),
            side: { mode: null },
            surfaceTreatment: { mode: null },
        };
        if (only.side && Array.isArray(only.side.layerTreatments)) {
            only.side.layerTreatments = only.side.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
        }
        if (only.surfaceTreatment && Array.isArray(only.surfaceTreatment.layerTreatments)) {
            only.surfaceTreatment.layerTreatments = only.surfaceTreatment.layerTreatments.map((t) => ({ ...(t || {}), mode: null }));
        }
        const e = { ...(only.edge || {}) };
        ['top', 'middle', 'bottom', 'both'].forEach((s) => { delete e[s]; });
        e.mode = slot;
        e[slot] = clone(edge);
        only.edge = e;
        stages.push({
            key: `edge-${slot}`,
            config: only,
            diffConfig: edgeBase,
            azimuth: 18,
            tilt: slot === 'top' ? 14 : 10,
            fit: 0.95,
            zoom: {
                mode: 'edge',
                position: slot === 'top' ? 'top' : 'bottom',
                tilt: slot === 'top' ? 14 : 10,
                arc: 24,
                band: 0.18,
                fit: 0.98,
            },
        });
        stages.push({
            key: `edge-${slot}-top`,
            config: only,
            diffConfig: edgeBase,
            azimuth: 18,
            tilt: 72,
            fit: 0.95,
            zoom: {
                mode: 'edge',
                position: slot === 'top' ? 'top' : 'bottom',
                tilt: 72,
                arc: 24,
                band: 0.22,
                fit: 0.98,
            },
        });
    });
    if (placed.length) {
        const withoutCenter = clone(config);
        withoutCenter.place = { ...(withoutCenter.place || {}), items: [] };
        stages.push({
            key: 'center',
            config: clone(config),
            diffConfig: withoutCenter,
            tilt: 90,
            azimuth: 0,
            fit: 0.85,
        });
        stages.push({
            key: 'center-top',
            config: clone(config),
            diffConfig: withoutCenter,
            tilt: 90,
            azimuth: 0,
            fit: 0.85,
        });
    }

    // One short single-tier slab per filling layer, for the stacked slices.
    info.forEach((t) => {
        if (!t.fillingOn) return;
        const slab = clone(plain);
        slab.structure = { ...slab.structure, layers: 1, layerDesign: 'same' };
        slab.sponge = { ...slab.sponge, flavor: t.sponge };
        slab.filling = { ...slab.filling, enabled: true, layers: 1, flavor: t.fillingFlavor, piping: t.piping };
        delete slab.filling.layerEnabled;
        // The slab stands for ONE of this tier's real layers (see CakeScene __slice).
        const sliceOf = { tier: individual ? t.i : 0, layers: t.fillingLayers };
        stages.push({ key: `filling-${t.i}`, config: slab, slice: sliceOf });
        // Close-up of the same slab: the top band, where the piping sits.
        stages.push({ key: `filling-zoom-${t.i}`, config: slab, slice: sliceOf, zoom: { mode: 'pattern', band: 0.45, fit: 1.0 } });
    });

    // Callouts carry an anchor id; the capture finds where that spot really
    // lands in the picture so the PDF's arrows hit it exactly. ax/ay are only
    // a fallback if a capture could not measure it.
    const stageByKey = Object.fromEntries(stages.map((st) => [st.key, st]));
    const callout = (stageKey, id, label, hy, side, ax, ay, extra = {}) => {
        const st = stageByKey[stageKey];
        if (st) (st.anchors ||= []).push({ id, hy, side, refine: Boolean(st.diffConfig), ...extra });
        return { label, anchorId: id, ax, ay };
    };

    // ── pages ──
    const sizeKey = config.structure?.size || '8x8';
    const shape = config.structure?.shape || config.realSize?.shape;
    const groups = info.map((t) => {
        const label = individual ? `${pieceName} ${t.i + 1}` : '';
        const pages = [];
        // Height up the cake where this tier's middle sits (tier 1 is the bottom).
        const midHy = individual ? (t.i + 0.5) / count : 0.5;
        const anchorY = 1 - (0.1 + 0.8 * midHy);

        // Fundamentals (+ the Naked Finish render).
        const fundamentals = [
            [petit ? 'Format' : 'Tiers', petit ? 'Petit Fours · 4 pieces' : `${tiers} tier${tiers > 1 ? 's' : ''}`],
            ['Size', petit ? name(sizeKey) : `${config.realSize?.diameter || ''} in diameter · ${config.realSize?.height || ''} in height`],
        ];
        if (shape) fundamentals.push(['Shape', name(shape)]);
        // Same look as the Filling page: one picture of the cake, a FLAVOR bubble
        // (the sponge flavor's colour icon) and a NAKED FINISH bubble (a magnified
        // look at the bare sponge), both pointing at the real sponge in the picture.
        const spongeAnchor = { role: 'sponge', tier: individual ? t.i : 0, tiers: individual ? count : 1 };
        pages.push({
            kind: 'fundamentals', section: 'FUNDAMENTALS', image: 'base',
            title: 'Cake Format, Size, Tier, Shape & Sponge',
            crops: [
                { kind: 'flavor', label: 'FLAVOR', sub: name(t.sponge), chipColor: flavorColorOf(t.sponge), ...callout('base', `sponge-${t.i}`, 'FLAVOR', midHy, -0.3, 0.4, anchorY, { ...spongeAnchor, color: true }), anchorId: `sponge-${t.i}` },
            ],
            naked: { label: 'NAKED FINISH', sub: 'Bare sponge, no frosting', ...callout('base', `naked-${t.i}`, 'NAKED FINISH', midHy, 0.3, 0.6, anchorY, spongeAnchor), anchorId: `naked-${t.i}` },
            details: fundamentals,
            highlights: [
                'Naked finish: the sponge is left unfrosted',
                petit ? 'Four individually decorated petit fours' : `${tiers} tier${tiers > 1 ? 's' : ''} built to the size above`,
            ],
        });

        if (t.fillingOn) {
            // One slice is enough however many filling layers there are: a cake
            // layer with the filling on top, then a close-up of its piping.
            const fillingSugarOverride = config.sugarColorOverrides?.[`filling-${t.i}`] || config.sugarColorOverrides?.filling;
            const hasSugarOverride = fillingSugarOverride?.mode === 'colorOverride' && fillingSugarOverride.colorId;
            const fillingColorId = hasSugarOverride ? fillingSugarOverride.colorId : t.fillingFlavor;
            const fillingChipColor = flavorColorOf(fillingColorId) || flavorColorOf(t.fillingFlavor);
            const fillingSub = hasSugarOverride ? name(fillingColorId) : name(t.fillingFlavor);

            pages.push({
                kind: 'filling', section: 'FILLING', title: 'Filling',
                image: `filling-${t.i}`, zoomImage: `filling-zoom-${t.i}`,
                flavor: name(t.fillingFlavor),
                flavorName: fillingSub,
                flavorChipColor: fillingChipColor,
                layers: t.fillingLayers,
                pipingTip: t.piping?.tip || null,
                piping: t.piping?.tip ? name(t.piping.tip) : null,
                pipingColor: t.piping?.tip ? name(t.piping.colorId) : null,
                // Top picture: FILLING icon directly takes the ToolPanel chip color and name
                crops: [
                    {
                        kind: 'color',
                        label: 'FILLING',
                        side: 'left',
                        sub: fillingSub,
                        chipColor: fillingChipColor,
                        colorKey: `filling-${t.i}`,
                        fallbackName: fillingSub,
                        ...callout(`filling-${t.i}`, `fill-${t.i}`, 'FILLING', 0.99, -0.3, 0.35, 0.3, { role: 'filling' }),
                        anchorId: `fill-${t.i}`,
                    },
                ],
                // Bottom (closer) picture: a magnified round look at the filling's edge,
                // i.e. the piping design (or a plain edge when none was chosen).
                pattern: {
                    label: 'PATTERN',
                    sub: t.piping?.tip ? name(t.piping.tip) : 'Plain edge · no piping',
                    ...callout(`filling-zoom-${t.i}`, `pattern-${t.i}`, 'PATTERN', 0.99, -0.3, 0.4, 0.3, { role: 'filling', edge: true }),
                    anchorId: `pattern-${t.i}`,
                },
            });

            // Dedicated ASSEMBLING page: Layer-by-layer breakdown and complete assembled look
            pages.push({
                kind: 'assembling',
                section: 'ASSEMBLING',
                title: 'Cake Layer-by-Layer Assembly',
                shape: shape || 'round',
                spongeFlavor: name(t.sponge),
                spongeColor: flavorColorOf(t.sponge) || '#F5E6CA',
                fillingFlavor: fillingSub,
                fillingColor: fillingChipColor || '#7A4B2A',
                layers: Number(t.fillingLayers) || 1,
                pipingTip: t.piping?.tip ? name(t.piping.tip) : null,
                details: [
                    ['Sponge Base', name(t.sponge)],
                    ['Filling Flavor', fillingSub],
                    ['Filling Layers', `${t.fillingLayers} layer${t.fillingLayers > 1 ? 's' : ''}`],
                    ['Total Sponge Slices', `${(Number(t.fillingLayers) || 1) + 1} slices (including enclosing crown)`],
                    ...(t.piping?.tip ? [['Perimeter Dam / Piping', name(t.piping.tip)]] : []),
                ],
                highlights: [
                    'Assemble cake tier from bottom up: base sponge, alternating filling layers, then crown with enclosing sponge',
                    'Ensure filling is spread evenly to edges; chill stacked core before exterior crumb-coating',
                ],
            });
        }

        if (t.style && t.style !== 'naked') {
            const exteriorSugarOverride = config.sugarColorOverrides?.[`exterior-${t.i}`] || config.sugarColorOverrides?.exterior || config.sugarColor;
            const finishColorId = exteriorSugarOverride?.colorId || t.frost || 'vanilla';
            const finishChipColor = flavorColorOf(finishColorId) || flavorColorOf(t.frost) || '#F6DEAB';
            const finishFlavorSub = name(finishColorId);

            const finishSub = t.style === 'texturedButtercream' && t.texture
                ? `${name(t.style)} · ${name(t.texture)}`
                : `${name(t.style)} · Smooth coating`;

            const rows = [['Finish', name(t.style)]];
            if (t.style === 'texturedButtercream' && t.texture) rows.push(['Texture', name(t.texture)]);
            rows.push(['Flavor', finishFlavorSub]);

            const finishAnchor = { role: 'finish', tier: individual ? t.i : 0, tiers: individual ? count : 1 };

            pages.push({
                kind: 'finish',
                section: 'EXTERIOR FINISH',
                image: 'finish',
                title: 'Exterior Finish',
                style: t.style,
                texture: t.texture,
                isTextured: t.style === 'texturedButtercream',
                textureName: t.texture ? name(t.texture) : '',
                flavorName: finishFlavorSub,
                flavorChipColor: finishChipColor,
                crops: [
                    {
                        kind: 'flavor',
                        label: 'FLAVOR',
                        sub: finishFlavorSub,
                        chipColor: finishChipColor,
                        ...callout('finish', `finish-flavor-${t.i}`, 'FLAVOR', midHy, -0.3, 0.4, anchorY, { ...finishAnchor, color: true }),
                        anchorId: `finish-flavor-${t.i}`,
                    },
                ],
                finish: {
                    label: 'EXTERIOR FINISH',
                    sub: finishSub,
                    ...callout('finish', `finish-texture-${t.i}`, 'EXTERIOR FINISH', midHy, 0.3, 0.6, anchorY, finishAnchor),
                    anchorId: `finish-texture-${t.i}`,
                },
                details: rows,
                highlights: [
                    t.style === 'texturedButtercream' && t.texture
                        ? `${name(t.style)} applied with ${name(t.texture).toLowerCase()} texture across the whole cake`
                        : `${name(t.style)} coating spread smoothly over the whole cake`,
                ],
            });

            // Dedicated ASSEMBLING page (Exterior Coating): in-between EXTERIOR FINISH and SURFACE TREATMENT
            // Left: Assembled Fundamentals + Filling ("FILLING") -> Right: Covered with Frosting or Textured ("COATED")
            const fillingSugarOverrideForCoating = config.sugarColorOverrides?.[`filling-${t.i}`] || config.sugarColorOverrides?.filling;
            const hasSugarOverrideForCoating = fillingSugarOverrideForCoating?.mode === 'colorOverride' && fillingSugarOverrideForCoating.colorId;
            const fillingColorIdForCoating = hasSugarOverrideForCoating ? fillingSugarOverrideForCoating.colorId : t.fillingFlavor;
            const activeFillingChipColor = t.fillingOn ? (flavorColorOf(fillingColorIdForCoating) || flavorColorOf(t.fillingFlavor) || '#7A4B2A') : (flavorColorOf(t.sponge) || '#F5E6CA');
            const activeFillingSub = t.fillingOn ? (hasSugarOverrideForCoating ? name(fillingColorIdForCoating) : name(t.fillingFlavor)) : 'None';

            pages.push({
                kind: 'coating-assembly',
                section: 'ASSEMBLING',
                title: 'Cake Exterior Coating Assembly',
                shape: shape || 'round',
                spongeFlavor: name(t.sponge),
                spongeColor: flavorColorOf(t.sponge) || '#F5E6CA',
                fillingFlavor: activeFillingSub,
                fillingColor: activeFillingChipColor,
                layers: t.fillingOn ? (Number(t.fillingLayers) || 1) : 1,
                style: t.style,
                styleName: name(t.style),
                texture: t.texture,
                textureName: t.texture ? name(t.texture) : '',
                isTextured: t.style === 'texturedButtercream',
                finishFlavor: finishFlavorSub,
                finishColor: finishChipColor,
                finishColorId: finishColorId,
                details: [
                    ['Assembled Core', `${name(t.sponge)} Sponge${t.fillingOn ? ` with ${activeFillingSub} Filling` : ''}`],
                    ['Exterior Finish', name(t.style)],
                    ...(t.style === 'texturedButtercream' && t.texture ? [['Texture Pattern', name(t.texture)]] : []),
                    ['Frosting Flavor / Color', finishFlavorSub],
                    ['Crumb Coat', 'Apply thin crumb coat layer to seal core; chill 15–20 minutes before exterior finish'],
                    ['Finish Coat', t.style === 'texturedButtercream' && t.texture
                        ? `Apply 4–6mm even buttercream coat, then carve ${name(t.texture).toLowerCase()} with decorating comb`
                        : 'Apply 4–6mm even frosting layer, smoothed with bench scraper'],
                ],
                highlights: [
                    'Step 1 (FILLING): Take assembled and chilled cake core (sponge slices and filling layers)',
                    `Step 2 (COATED): Apply crumb coat, then cover completely with ${finishFlavorSub} ${name(t.style)}${t.style === 'texturedButtercream' && t.texture ? ` (${name(t.texture)} texture)` : ''}`,
                ],
            });
        }

        if (t.surface?.mode) {
            const surfaceSugarOverride = config.sugarColorOverrides?.[`surface-${t.i}`]
              || config.sugarColorOverrides?.surface
              || config.sugarColor;
            const surfaceColorId = (surfaceSugarOverride?.mode === 'colorOverride' && surfaceSugarOverride.colorId)
              ? surfaceSugarOverride.colorId
              : (surfaceSugarOverride?.colorId
                 || t.surface?.colorId
                 || t.surface?.[t.surface?.mode]?.colorId
                 || t.surface?.[t.surface?.mode]?.flavor
                 || config.surfaceTreatment?.colorId
                 || (surfaceSugarOverride?.mode === 'default' ? (surfaceSugarOverride.colorId || t.frost || 'vanilla') : 'vanilla'));
            const isChoc = String(surfaceColorId || '').toLowerCase().includes('choc');
            const surfaceChipColor = isChoc ? '#301009' : (flavorColorOf(surfaceColorId) || '#F6DEAB');
            const surfaceFlavorName = name(surfaceColorId);
            const patternId = t.surface?.[t.surface?.mode]?.setId
              || t.surface?.pattern
              || config.surfaceTreatment?.[config.surfaceTreatment?.mode]?.setId
              || getSurfaceTreatmentPattern(t.surface, config.structure);
            const patternName = name(patternId);

            pages.push({
                kind: 'surface',
                section: 'SURFACE TREATMENT',
                title: 'Surface Treatment',
                image: 'surface-front',
                zoomImage: 'surface-back',
                frontImage: 'surface-front',
                backImage: 'surface-back',
                flavorName: surfaceFlavorName,
                flavorChipColor: surfaceChipColor,
                patternId,
                patternName,
                mode: t.surface.mode,
                crops: [
                    {
                        kind: 'flavor',
                        label: 'FLAVOR',
                        side: 'left',
                        sub: surfaceFlavorName,
                        chipColor: surfaceChipColor,
                        anchorId: `surface-flavor-${t.i}`,
                        ...callout('surface-front', `surface-flavor-${t.i}`, 'FLAVOR', 0.95, -0.3, 0.45, 0.28, { role: 'pattern', color: true }),
                    },
                ],
                pattern: {
                    label: 'PATTERN',
                    sub: patternName,
                    anchorId: `surface-pattern-${t.i}`,
                    ...callout('surface-back', `surface-pattern-${t.i}`, 'PATTERN', 0.85, -0.3, 0.45, 0.42, { role: 'pattern' }),
                },
                details: [
                    ['Treatment', name(t.surface.mode)],
                    ['Pattern', patternName],
                    ['Flavor', surfaceFlavorName],
                ],
                highlights: [`${name(t.surface.mode)} finish applied to the surface (Front and Back views)`],
            });

            // Dedicated ASSEMBLING page (Surface Treatment / Drip Application): in-between SURFACE TREATMENT and SIDE
            // Left: Coated Cake ("COATED") -> Right: Cake with Surface Treatment / Drips ("DRIP")
            const finishSugarOverrideForSurface = config.sugarColorOverrides?.[`exterior-${t.i}`] || config.sugarColorOverrides?.exterior || config.sugarColor;
            const finishColorIdForSurface = finishSugarOverrideForSurface?.colorId || t.frost || 'vanilla';
            const finishChipColorForSurface = flavorColorOf(finishColorIdForSurface) || flavorColorOf(t.frost) || '#F6DEAB';
            const finishFlavorSubForSurface = name(finishColorIdForSurface);

            pages.push({
                kind: 'surface-assembly',
                section: 'ASSEMBLING',
                title: 'Surface Treatment Application Assembly',
                shape: shape || 'round',
                spongeFlavor: name(t.sponge),
                spongeColor: flavorColorOf(t.sponge) || '#F5E6CA',
                style: t.style || 'smooth',
                styleName: name(t.style || 'Smooth Coating'),
                texture: t.texture || '',
                textureName: t.texture ? name(t.texture) : '',
                isTextured: t.style === 'texturedButtercream',
                finishFlavor: finishFlavorSubForSurface,
                finishColor: finishChipColorForSurface,
                surfaceMode: t.surface.mode,
                surfaceModeName: name(t.surface.mode),
                patternId,
                patternName,
                surfaceFlavorName,
                surfaceColor: surfaceChipColor,
                details: [
                    ['Coated Base', `${finishFlavorSubForSurface} ${name(t.style || 'smooth')}${t.style === 'texturedButtercream' && t.texture ? ` (${name(t.texture)})` : ''}`],
                    ['Surface Treatment', name(t.surface.mode)],
                    ['Treatment Pattern', patternName],
                    ['Drip Flavor / Color', surfaceFlavorName],
                    ['Application Method', 'Pour glaze onto center of top tier; gently guide cascading drips over rim with squeeze bottle / spatula'],
                    ['Setting Time', 'Allow glaze to drip naturally and set for 10–15 minutes before piping edge borders'],
                ],
                highlights: [
                    'Step 1 (COATED): Chilled cake with set exterior finish ready for surface treatment application',
                    `Step 2 (DRIP): Apply ${surfaceFlavorName} ${name(t.surface.mode)} glaze evenly across the crown, forming descending drips along perimeter`,
                ],
            });
        }

        if (t.side?.mode) {
            const choice = t.side[t.side.mode] || {};
            const sideSugarOverride = config.sugarColorOverrides?.[`side-${t.i}`] || config.sugarColorOverrides?.side;
            const sideColorId = (sideSugarOverride?.mode === 'colorOverride' && sideSugarOverride.colorId)
              ? sideSugarOverride.colorId
              : (sideSugarOverride?.colorId || choice.colorId || choice.flavorId || config.sugarColor?.colorId || 'vanilla');
            const sideChipColor = flavorColorOf(sideColorId) || '#F6DEAB';
            const sideColorName = name(sideColorId);
            const sidePatternName = name(choice.setId || t.side.mode);

            const isTextured = t.style === 'texturedButtercream';
            const isFrosted = t.style && t.style !== 'naked';
            const baseFinishName = isTextured
                ? `Textured (${name(t.texture || 'Buttercream')})`
                : isFrosted
                    ? `Frosted (${name(t.frost || 'Buttercream')})`
                    : 'Naked';
            const baseTypeDisplay = isTextured ? 'TEXTURE + SIDE' : isFrosted ? 'FROSTED + SIDE' : 'NAKED + SIDE';

            pages.push({
                kind: 'side',
                section: 'SIDE',
                title: 'Side Design',
                image: 'side-front',
                zoomImage: 'side-back',
                frontImage: 'side-front',
                backImage: 'side-back',
                flavorName: sideColorName,
                flavorChipColor: sideChipColor,
                patternName: sidePatternName,
                mode: t.side.mode,
                treatmentId: t.side.mode,
                variantId: choice.setId || null,
                baseFinish: baseFinishName,
                baseTypeDisplay,
                crops: [
                    {
                        kind: 'flavor',
                        label: 'FLAVOR',
                        side: 'left',
                        sub: sideColorName,
                        chipColor: sideChipColor,
                        anchorId: `side-flavor-${t.i}`,
                        ...callout('side-front', `side-flavor-${t.i}`, 'FLAVOR', midHy, -0.3, 0.45, anchorY, { role: 'pattern', color: true }),
                    },
                ],
                pattern: {
                    label: 'PATTERN',
                    sub: sidePatternName,
                    treatmentId: t.side.mode,
                    variantId: choice.setId || null,
                    anchorId: `side-pattern-${t.i}`,
                    ...callout('side-back', `side-pattern-${t.i}`, 'PATTERN', midHy, -0.3, 0.45, anchorY, { role: 'pattern' }),
                },
                details: [
                    ['Base Finish', baseFinishName],
                    ['Design', name(t.side.mode)],
                    ['Set', sidePatternName],
                    ['Color', sideColorName],
                ],
                highlights: [
                    `${baseTypeDisplay}: ${name(t.side.mode)} design with ${baseFinishName.toLowerCase()} base (Front and Back views)`,
                ],
            });

            // Dedicated ASSEMBLING page (Side Design Application): in-between SIDE and EDGE
            // Left: Cake with Drip (or Coated) -> Right: Cake with Side Design Pattern Applied ("SIDE")
            const hasSurface = Boolean(t.surface?.mode);
            const surfaceChoice = hasSurface ? (t.surface[t.surface.mode] || {}) : {};
            const surfacePatternIdForSide = surfaceChoice.setId
              || t.surface?.pattern
              || config.surfaceTreatment?.[config.surfaceTreatment?.mode]?.setId
              || null;
            const surfacePatternNameForSide = surfacePatternIdForSide ? name(surfacePatternIdForSide) : (hasSurface ? name(t.surface.mode) : '');
            const surfaceSugarOverride = config.sugarColorOverrides?.[`surface-${t.i}`] || config.sugarColorOverrides?.surface;
            const surfaceColorId = (surfaceSugarOverride?.mode === 'colorOverride' && surfaceSugarOverride.colorId)
              ? surfaceSugarOverride.colorId
              : (surfaceSugarOverride?.colorId
                  || surfaceChoice.colorId
                  || surfaceChoice.flavorId
                  || surfaceChoice.flavor
                  || t.surface?.colorId
                  || config.surfaceTreatment?.colorId
                  || config.sugarColor?.colorId
                  || 'vanilla');
            const isChoc = String(surfaceColorId || '').toLowerCase().includes('choc');
            const surfaceChipColorForSide = isChoc ? '#301009' : (flavorColorOf(surfaceColorId) || '#F6DEAB');
            const surfaceFlavorNameForSide = name(surfaceColorId);

            const finishSugarOverrideForSide = config.sugarColorOverrides?.[`exterior-${t.i}`] || config.sugarColorOverrides?.exterior || config.sugarColor;
            const finishColorIdForSide = finishSugarOverrideForSide?.colorId || t.frost || 'vanilla';
            const finishChipColorForSide = flavorColorOf(finishColorIdForSide) || flavorColorOf(t.frost) || '#F6DEAB';
            const finishFlavorSubForSide = name(finishColorIdForSide);

            pages.push({
                kind: 'side-assembly',
                section: 'ASSEMBLING',
                title: 'Side Design Application Assembly',
                shape: shape || 'round',
                spongeFlavor: name(t.sponge),
                spongeColor: flavorColorOf(t.sponge) || '#F5E6CA',
                style: t.style || 'smooth',
                styleName: name(t.style || 'Smooth Coating'),
                texture: t.texture || '',
                textureName: t.texture ? name(t.texture) : '',
                isTextured,
                finishFlavor: finishFlavorSubForSide,
                finishColor: finishChipColorForSide,
                hasSurface,
                surfaceMode: t.surface?.mode || '',
                surfaceModeName: t.surface?.mode ? name(t.surface.mode) : '',
                surfacePatternId: surfacePatternIdForSide,
                surfacePatternName: surfacePatternNameForSide,
                surfaceFlavorName: surfaceFlavorNameForSide,
                surfaceColor: surfaceChipColorForSide,
                treatmentId: t.side.mode,
                treatmentName: name(t.side.mode),
                variantId: choice.setId || null,
                sidePatternName,
                sideColorName,
                sideColor: sideChipColor,
                secondaryColor: choice.secondaryColorId ? (flavorColorOf(choice.secondaryColorId) || null) : null,
                details: [
                    ['Base Preparation', hasSurface ? `${surfaceFlavorNameForSide} ${name(t.surface.mode)} on ${finishFlavorSubForSide} ${name(t.style || 'smooth')}` : `${finishFlavorSubForSide} ${name(t.style || 'smooth')}`],
                    ['Side Design', name(t.side.mode)],
                    ['Pattern / Set', sidePatternName],
                    ['Piping Color', sideColorName],
                    ['Application Technique', 'Pipe design motifs uniformly around the circumference wall using steady hand pressure and consistent spacing'],
                    ['Alignment', 'Verify vertical and radial alignment along tier perimeter before proceeding to border edges'],
                ],
                highlights: [
                    `Step 1 (${hasSurface ? 'DRIP' : 'COATED'}): Prepared tier base ready for circumference wall decoration`,
                    `Step 2 (SIDE): Pipe ${sideColorName} ${sidePatternName} motifs evenly along the cake wall with precision piping tip`,
                ],
            });
        }

        return { tierLabel: label, pages };
    });

    // Edge and Center belong to the cake as a whole, so they follow every
    // tier's own pages once (edges are Top then Bottom, only those chosen).
    const shared = groups[groups.length - 1].pages;
    slots.forEach(([slot, edge]) => {
        const edgePipingTip = edge.piping?.tip || edge.decorations?.setId || 'shell';
        const colors = resolveEdgeColors(config, slot, edge);
        const edgeDesignName = name(edgePipingTip);

        shared.push({
            kind: 'edge',
            section: 'EDGE',
            image: `edge-${slot}`,
            title: `Edge ${name(slot)}`,
            slot,
            designId: edgePipingTip,
            designName: edgeDesignName,
            color: colors.primaryHex,
            colorName: colors.fullColorName,
            primaryColorName: colors.primaryName,
            secondaryColor: colors.secondaryHex,
            secondaryColorName: colors.secondaryName,
            callouts: [callout(`edge-${slot}`, `edge-${slot}`, `EDGE ${slot.toUpperCase()}`, slot === 'top' ? 0.97 : 0.04, -0.7, 0.3, slot === 'top' ? 0.34 : 0.84)],
            details: edgeDetails(edge, slot, config),
            highlights: [`${name(slot)} border (${edgeDesignName}) - 2D pattern schematic vs. 3D render`],
            flavor: null,
        });
    });


    function getItemZone(item) {
        const x = Number(item.x) || 0;
        const z = Number(item.z) || 0;
        const r = Math.hypot(x, z);
        if (r < 0.35) return 'Center';

        const deg = (Math.atan2(z, x) * 180) / Math.PI;
        if (deg >= -22.5 && deg < 22.5) return 'Right';
        if (deg >= 22.5 && deg < 67.5) return 'Front-Right';
        if (deg >= 67.5 && deg < 112.5) return 'Front';
        if (deg >= 112.5 && deg < 157.5) return 'Front-Left';
        if (deg >= 157.5 || deg < -157.5) return 'Left';
        if (deg >= -157.5 && deg < -112.5) return 'Back-Left';
        if (deg >= -112.5 && deg < -67.5) return 'Back';
        return 'Back-Right';
    }

    function describeGroupPlacement(items) {
        if (!items || items.length === 0) return 'Place flat on the top surface';
        if (items.length === 1) {
            const zone = getItemZone(items[0]);
            return zone === 'Center'
                ? 'Place firmly upright in the exact center of the top tier'
                : `Place upright toward the ${zone.toLowerCase()} side of the top tier`;
        }

        const zones = items.map(getItemZone);
        const uniqueZones = [...new Set(zones)];

        // Check for cross / cardinal arrangement (1 center piece + 4 surrounding pieces, e.g. 5 mango cubes)
        const centerItems = items.filter((it) => Math.hypot(Number(it.x) || 0, Number(it.z) || 0) < 0.25);
        const outerItems = items.filter((it) => Math.hypot(Number(it.x) || 0, Number(it.z) || 0) >= 0.25);
        if (items.length === 5 && centerItems.length === 1 && outerItems.length === 4) {
            return 'Arrange in a symmetrical cross (+) pattern at the center of the top tier: place 1 piece in the exact center, then place the remaining 4 pieces evenly around it facing front, back, left, and right (approx. 1 inch apart)';
        }

        if (items.length >= 3 && items.length <= 6 && centerItems.length >= 1) {
            return `Cluster evenly around the center of the top tier: place 1 piece centered and surrounding pieces spaced 1 inch apart`;
        }

        const allBack = items.every((it) => (Number(it.z) || 0) < -0.2);
        const allFront = items.every((it) => (Number(it.z) || 0) > 0.2);
        const allLeft = items.every((it) => (Number(it.x) || 0) < -0.2);
        const allRight = items.every((it) => (Number(it.x) || 0) > 0.2);

        if (items.length >= 6) {
            if (allBack) return 'Circular arc along rear perimeter, inset 1.5 inches from the edge';
            if (allFront) return 'Circular arc along front perimeter, inset 1.5 inches from the edge';
            if (uniqueZones.length >= 5) return 'Full perimeter ring arrangement, keeping a uniform 1.5-inch border from the rim';
        }

        if (allBack) return `Arrange across the rear top surface (${uniqueZones.join(', ')}) with even spacing`;
        if (allFront) return `Arrange across the front top surface (${uniqueZones.join(', ')}) with even spacing`;
        if (allLeft) return `Arrange along the left side of the top tier with balanced spacing`;
        if (allRight) return `Arrange along the right side of the top tier with balanced spacing`;

        if (uniqueZones.length === 1 && uniqueZones[0] === 'Center') {
            return 'Group tightly together as a centerpiece in the exact center of the cake top';
        }

        return `Distribute evenly across the top surface (${uniqueZones.join(', ')}), maintaining uniform spacing between pieces`;
    }

    if (placed.length) {
        const groupsByType = new Map();
        placed.forEach((item) => {
            const textValue = item.text ?? item.content ?? item.value;
            const key = (item.type === 'text' || textValue != null)
                ? `text_${textValue}_${item.colorId || item.color || ''}`
                : (item.designId || item.type || 'decor');
            if (!groupsByType.has(key)) groupsByType.set(key, []);
            groupsByType.get(key).push(item);
        });

        const rows = [];
        groupsByType.forEach((groupItems) => {
            const first = groupItems[0];
            const textValue = first.text ?? first.content ?? first.value;
            if (first.type === 'text' || textValue != null) {
                const color = first.colorId || first.color;
                const font = first.fontId || first.font;
                const zone = getItemZone(first);
                const colorStr = color ? `${name(color)} ` : '';
                const fontStr = font ? `${name(font)} ` : '';
                rows.push(['Writing', `"${textValue ?? ''}" · ${zone} · ${colorStr}${fontStr}lettering`.trim()]);
            } else {
                const decorName = cleanDecorName(first.designId || first.type);
                const count = groupItems.length;
                const label = count > 1 ? `${decorName} (×${count})` : decorName;
                const placementText = describeGroupPlacement(groupItems);
                rows.push([label, placementText]);
            }
        });

        shared.push({
            kind: 'center',
            section: 'CENTER',
            image: 'center',
            title: 'Center Decorations',
            callouts: [], // Remove CENTER pointing arrow & pill
            details: rows,
            highlights: [
                `Top-view diagram showing where decorations are placed on the cake`,
                `Bakery Placement Guide: Place center piece first, then align adjacent pieces symmetrically with equal spacing`,
                `Ensure decorations are set firmly into the frosting and kept clear of the edge piping border`,
            ],
            flavor: null,
        });
    }

    return { stages, groups };
}