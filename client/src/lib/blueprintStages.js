import { getSurfaceTreatmentPattern, isPetitsFourStructure } from './cakeConfig';
import { name, flavorColorOf } from './blueprintDetails';

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

function edgeDetails(edge) {
    const rows = [];
    if (edge.piping?.tip) {
        rows.push(['Piping', name(edge.piping.tip)]);
        rows.push(['Piping Color', [name(edge.piping.colorId), edge.piping.secondaryColorId && name(edge.piping.secondaryColorId)].filter(Boolean).join(' / ')]);
    }
    if (edge.decorations?.setId) {
        rows.push(['Decoration', name(edge.decorations.setId)]);
        if (edge.decorations.colorId) rows.push(['Decoration Color', name(edge.decorations.colorId)]);
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

    stages.push({ key: 'base', config: plain });

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
        stages.push({ key: 'finish', config: running, diffConfig: plain });
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
        stages.push({
            key: 'surface-front',
            config: surfaceConfig,
            diffConfig: surfaceBase,
            azimuth: 18,
            tilt: 26,
            fit: 0.86,
        });
        // Close back screenshot (180 deg opposite)
        stages.push({
            key: 'surface-back',
            config: surfaceConfig,
            azimuth: 198,
            tilt: 26,
            fit: 0.86,
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

        // Close front screenshot (flatter tilt to showcase side design)
        stages.push({
            key: 'side-front',
            config: sideConfig,
            diffConfig: sideBase,
            azimuth: 18,
            tilt: 14,
            fit: 0.86,
        });
        // Close back screenshot (180 deg opposite)
        stages.push({
            key: 'side-back',
            config: sideConfig,
            azimuth: 198,
            tilt: 14,
            fit: 0.86,
        });

        running = { ...clone(running), side: clone(config.side) };
    }
    slots.forEach(([slot, edge]) => {
        const only = clone(running);
        const e = { ...(only.edge || {}) };
        ['top', 'middle', 'bottom', 'both'].forEach((s) => { delete e[s]; });
        e.mode = slot;
        e[slot] = clone(edge);
        only.edge = e;
        stages.push({ key: `edge-${slot}`, config: only, diffConfig: running });
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
        stages.push({ key: `filling-zoom-${t.i}`, config: slab, slice: sliceOf, zoom: { band: 0.45 } });
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
                layers: t.fillingLayers,
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
        }

        if (t.style && t.style !== 'naked') {
            const rows = [['Finish', name(t.style)]];
            if (t.style === 'texturedButtercream' && t.texture) rows.push(['Texture', name(t.texture)]);
            pages.push({
                kind: 'finish', section: 'EXTERIOR FINISH', image: 'finish', title: 'Exterior Finish',
                callouts: [callout('finish', `finish-${t.i}`, 'EXTERIOR FINISH', midHy, -0.45, 0.4, anchorY)],
                details: rows,
                highlights: [`${name(t.style)} coating over the whole cake`],
                flavor: t.frost ? name(t.frost) : null,
            });
        }

        if (t.surface?.mode) {
            const surfaceSugarOverride = config.sugarColorOverrides?.[`surface-${t.i}`] || config.sugarColorOverrides?.surface;
            const surfaceColorId = (surfaceSugarOverride?.mode === 'colorOverride' && surfaceSugarOverride.colorId)
              ? surfaceSugarOverride.colorId
              : (surfaceSugarOverride?.colorId || 'vanilla');
            const surfaceChipColor = flavorColorOf(surfaceColorId) || '#F6DEAB';
            const surfaceFlavorName = name(surfaceColorId);
            const patternId = getSurfaceTreatmentPattern(t.surface, config.structure);
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
                        ...callout('surface-front', `surface-flavor-${t.i}`, 'FLAVOR', 0.95, -0.3, 0.45, 0.28),
                    },
                ],
                pattern: {
                    label: 'PATTERN',
                    sub: patternName,
                    anchorId: `surface-pattern-${t.i}`,
                    ...callout('surface-back', `surface-pattern-${t.i}`, 'PATTERN', 0.85, -0.3, 0.45, 0.42),
                },
                details: [
                    ['Treatment', name(t.surface.mode)],
                    ['Pattern', patternName],
                    ['Flavor', surfaceFlavorName],
                ],
                highlights: [`${name(t.surface.mode)} finish applied to the surface (Front and Back views)`],
            });
        }

        if (t.side?.mode) {
            const choice = t.side[t.side.mode] || {};
            const sideSugarOverride = config.sugarColorOverrides?.[`side-${t.i}`] || config.sugarColorOverrides?.side;
            const sideColorId = (sideSugarOverride?.mode === 'colorOverride' && sideSugarOverride.colorId)
              ? sideSugarOverride.colorId
              : (choice.colorId || choice.flavorId || sideSugarOverride?.colorId || 'vanilla');
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
                        ...callout('side-front', `side-flavor-${t.i}`, 'FLAVOR', midHy, -0.3, 0.45, anchorY),
                    },
                ],
                pattern: {
                    label: 'PATTERN',
                    sub: sidePatternName,
                    anchorId: `side-pattern-${t.i}`,
                    ...callout('side-back', `side-pattern-${t.i}`, 'PATTERN', midHy, -0.3, 0.45, anchorY),
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
        }

        return { tierLabel: label, pages };
    });

    // Edge and Center belong to the cake as a whole, so they follow every
    // tier's own pages once (edges are Top then Bottom, only those chosen).
    const shared = groups[groups.length - 1].pages;
    slots.forEach(([slot, edge]) => {
        shared.push({
            kind: 'edge', section: 'EDGE', image: `edge-${slot}`, title: `Edge ${name(slot)}`,
            callouts: [callout(`edge-${slot}`, `edge-${slot}`, `EDGE ${slot.toUpperCase()}`, slot === 'top' ? 0.97 : 0.04, -0.7, 0.3, slot === 'top' ? 0.34 : 0.84)],
            details: edgeDetails(edge),
            highlights: [`${name(slot)} border only`],
            flavor: null,
        });
    });

    function cleanDecorName(rawType) {
        if (!rawType) return 'Decoration';
        let s = String(rawType)
            .replace(/^center-/, '')
            .replace(/-default$/, '')
            .replace(/-standing$/, ' (Standing)')
            .replace(/-/g, ' ');
        const letterMatch = s.match(/^letter(Upper|Lower)([A-Za-z0-9])/i);
        if (letterMatch) {
            return `Letter '${letterMatch[2]}'`;
        }
        return s.replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, (c) => c.toUpperCase())
            .trim();
    }

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
        if (!items || items.length === 0) return 'Top surface';
        if (items.length === 1) {
            const zone = getItemZone(items[0]);
            return zone === 'Center' ? 'Center of cake' : `${zone} edge`;
        }

        const zones = items.map(getItemZone);
        const uniqueZones = [...new Set(zones)];

        const allBack = items.every((it) => (Number(it.z) || 0) < -0.2);
        const allFront = items.every((it) => (Number(it.z) || 0) > 0.2);

        if (items.length >= 6) {
            if (allBack) return 'Circular arc along rear perimeter';
            if (allFront) return 'Circular arc along front perimeter';
            if (uniqueZones.length >= 5) return 'Full perimeter ring arrangement';
        }

        if (uniqueZones.length <= 3) {
            return `Placed at ${uniqueZones.join(', ')}`;
        }

        if (allBack) return `Rear arrangement across ${uniqueZones.slice(0, 3).join(', ')}`;
        if (allFront) return `Front arrangement across ${uniqueZones.slice(0, 3).join(', ')}`;
        return `Arranged across ${uniqueZones.slice(0, 4).join(', ')}`;
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
                `Top-view placement layout for ${placed.length} center decoration${placed.length > 1 ? 's' : ''}`,
            ],
            flavor: null,
        });
    }

    return { stages, groups };
}