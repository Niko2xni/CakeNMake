import { getSurfaceTreatmentPattern, isPetitsFourStructure } from './cakeConfig';
import { name } from './blueprintDetails';

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
        const prevRunning = running;
        running = { ...clone(running), surfaceTreatment: clone(config.surfaceTreatment) };
        stages.push({ key: 'surface', config: running, diffConfig: prevRunning });
        runningKey = 'surface';
    }
    if (anySide) {
        const beforeSide = running;
        running = { ...clone(running), side: clone(config.side) };
        stages.push({ key: 'side', config: running, diffConfig: beforeSide });
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
        stages.push({ key: 'center', config: clone(config), diffConfig: withoutCenter });
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
        fundamentals.push(['Sponge Flavor', name(t.sponge)]);
        pages.push({
            kind: 'fundamentals', section: 'FUNDAMENTALS', image: 'base',
            title: 'Cake Format, Size, Tier, Shape & Sponge',
            callouts: [callout('base', `fund-${t.i}`, 'FLAVOR', midHy, -0.45, 0.4, anchorY)],
            details: fundamentals,
            highlights: [
                `${name(t.sponge)} sponge, baked fresh for your order`,
                petit ? 'Four individually decorated petit fours' : `${tiers} tier${tiers > 1 ? 's' : ''} built to the size above`,
            ],
            flavor: null,
        });

        if (t.fillingOn) {
            // One slice is enough however many filling layers there are: a cake
            // layer with the filling on top, then a close-up of its piping.
            pages.push({
                kind: 'filling', section: 'FILLING', title: 'Filling',
                image: `filling-${t.i}`, zoomImage: `filling-zoom-${t.i}`,
                flavor: name(t.fillingFlavor),
                layers: t.fillingLayers,
                piping: t.piping?.tip ? name(t.piping.tip) : null,
                pipingColor: t.piping?.tip ? name(t.piping.colorId) : null,
                // Top picture: FILLING = the colour the filling really is on the cake
                // (measured from the render, named in plain words).
                crops: [
                    { kind: 'color', label: 'FILLING', side: 'left', colorKey: `filling-${t.i}`, fallbackName: t.piping?.colorId ? name(t.piping.colorId) : null, ...callout(`filling-${t.i}`, `fill-${t.i}`, 'FILLING', 0.99, -0.3, 0.35, 0.3, { role: 'filling' }), anchorId: `fill-${t.i}` },
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
            pages.push({
                kind: 'surface', section: 'SURFACE TREATMENT', image: 'surface', title: 'Surface Treatment',
                callouts: [callout('surface', `surface-${t.i}`, 'SURFACE TREATMENT', Math.min(0.97, midHy + 0.2 / count), -0.45, 0.4, Math.max(0.28, anchorY - 0.1))],
                details: [['Treatment', name(t.surface.mode)], ['Pattern', name(getSurfaceTreatmentPattern(t.surface, config.structure))]],
                highlights: [`${name(t.surface.mode)} finish applied to the surface`],
                flavor: null,
            });
        }

        if (t.side?.mode) {
            const choice = t.side[t.side.mode] || {};
            pages.push({
                kind: 'side', section: 'SIDE', image: 'side', title: 'Side Design',
                callouts: [callout('side', `side-${t.i}`, 'SIDE DESIGN', midHy, -0.45, 0.4, anchorY)],
                details: [['Design', name(t.side.mode)], ['Set', name(choice.setId)], ['Color', name(choice.colorId)]],
                highlights: [`${name(t.side.mode)} wrapped around the cake's side`],
                flavor: choice.flavorId ? name(choice.flavorId) : null,
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

    if (placed.length) {
        const rows = [];
        placed.forEach((item) => {
            const textValue = item.text ?? item.content ?? item.value;
            if (item.type === 'text' || textValue != null) {
                const color = item.colorId || item.color;
                rows.push(['Writing', `"${textValue ?? ''}"${color ? `, in ${String(name(color)).toLowerCase()}` : ''}${item.fontId || item.font ? `, ${String(name(item.fontId || item.font)).toLowerCase()} lettering` : ''}`]);
            } else {
                rows.push(['Decoration', `${name(item.designId || item.type)}, placed on top of the cake`]);
            }
        });
        shared.push({
            kind: 'center', section: 'CENTER', image: 'center', title: 'Center',
            callouts: [callout('center', 'center', 'CENTER', 0.99, 0, 0.5, 0.3)],
            details: rows,
            highlights: [`${placed.length} item${placed.length > 1 ? 's' : ''} placed on top of the cake`],
            flavor: null,
        });
    }

    return { stages, groups };
}