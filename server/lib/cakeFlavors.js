// Flavor definitions for sponge, filling, and frosting
// Each flavor has a consistent color palette across all cake components
// Includes detailed color properties for the 3D sponge texture system

const FLAVORS = {
  plain: {
    name: 'Plain',
    // Sponge-only — per request, Plain describes a base sponge cake
    // (whole-egg-yolk butter sponge), not a frosting or filling flavor.
    // ExteriorFinishSection and FillingSection both filter FLAVOR_ORDER
    // down to ids with no exclusiveFlavor set before rendering their own
    // flavor grids (see FROSTING_FILLING_FLAVOR_ORDER below), so this
    // single field is the one place that controls where Plain can be
    // picked — Sponge Flavor still uses the full FLAVOR_ORDER and shows
    // it normally. Named exclusiveFlavor (value: this entry's own name,
    // not a generic boolean) so the field itself reads as "exclusive to
    // Plain" rather than an opaque flag.
    exclusiveFlavor: 'Plain',
    colors: {
      // Cheese is the foundation, kept exactly as-is (see cheese entry
      // below) — this is that same palette with yellow/gold saturation
      // boosted ~10-15%, so Plain reads as a richer, more golden butter
      // sponge (whole egg yolks) next to Cheese's paler, milkier cream
      // (cream cheese + egg whites). Calibrated per-channel from the
      // recommended Cheese→Plain example (#FAF5EB → #FBE6C2): R roughly
      // unchanged, G pulled down ~6%, B pulled down ~17-18% — reducing
      // blue more than green is what deepens a pale cream into gold
      // without shifting the hue toward orange or brown.
      crumbBase: '#FFE5A0',
      crumbDark: '#FFD26B',
      crumbLight: '#FFEEBF',
      filling: '#F9C03A',
      frosting: '#F9C03A',
      // Sponge texture colors
      sideCenter: '#FFE5A0',
      crumbHighlight: '#FFEEBF',
      bakedRim: '#FFD26B',
      bakedTop: '#F1B44F',
      crumbMid: '#FFC384',
      bottomBake: '#D59635',
    }
  },
  vanilla: {
    name: 'Vanilla',
    colors: {
      crumbBase: '#F5E6C8',
      crumbDark: '#E8D4B0',
      crumbLight: '#FFF8E7',
      filling: '#F6E8D5',
      frosting: '#F6E8D5',
      // Sponge texture colors
      sideCenter: '#F5E6C8',
      crumbHighlight: '#FFF8E7',
      bakedRim: '#E8D4B0',
      bakedTop: '#D4B896',
      crumbMid: '#F0D9B8',
      bottomBake: '#C9A86C',
    }
  },
  chocolate: {
    name: 'Chocolate',
    colors: {
      // Shifted warmer/redder (mahogany, not charcoal) — the original
      // read as too dark/desaturated, like potting soil. Same relative
      // structure (each field's role vs. the others) preserved, just
      // with more red pushed through and slightly less muddying gray.
      crumbBase: '#7A4433',
      crumbDark: '#6B3320',
      crumbLight: '#9C6448',
      filling: '#70402E',
      frosting: '#70402E',
      // Sponge texture colors
      sideCenter: '#7A4433',
      crumbHighlight: '#9C6448',
      bakedRim: '#6B3320',
      bakedTop: '#5A3420',
      crumbMid: '#6B4A3A',
      bottomBake: '#4A2818',
    }
  },
  strawberry: {
    name: 'Strawberry',
    colors: {
      // Shifted warmer/lighter — the original leaned mauve/dusty (too
      // close in R/G/B, reading as synthetic pink). Pushed red-orange
      // through and pulled back on blue so it reads as coral-pink rather
      // than pink-purple; bottomBake pushed toward the deeper red-orange
      // of cooked berry bits rather than staying in the same pink family.
      crumbBase: '#F4A8A0',
      crumbDark: '#E08878',
      crumbLight: '#FFC8B8',
      filling: '#EB8E7E',
      frosting: '#EB8E7E',
      // Sponge texture colors
      sideCenter: '#F4A8A0',
      crumbHighlight: '#FFC8B8',
      bakedRim: '#E08878',
      bakedTop: '#D4785E',
      crumbMid: '#EFA090',
      bottomBake: '#B85A48',
    }
  },
  cheese: {
    name: 'Cheese',
    colors: {
      crumbBase: '#FFF4C2',
      crumbDark: '#FFE082',
      crumbLight: '#FFFDE7',
      filling: '#F8CC46',
      frosting: '#F8CC46',
      // Sponge texture colors
      sideCenter: '#FFF4C2',
      crumbHighlight: '#FFFDE7',
      bakedRim: '#FFE082',
      bakedTop: '#F0C060',
      crumbMid: '#FFD0A0',
      bottomBake: '#D4A040',
    }
  },
  ube: {
    name: 'Ube',
    colors: {
      // Darkened and desaturated across the board — the original read
      // as neon/synthetic (grape candy, plastic). Grounded into a
      // deeper, muted royal purple with a slight gray undertone instead
      // of a bright magenta/violet, closer to real ube's natural color.
      crumbBase: '#6B4F82',
      crumbDark: '#5A3D6E',
      crumbLight: '#8672A0',
      filling: '#5F3F5C',
      frosting: '#5F3F5C',
      // Sponge texture colors
      sideCenter: '#6B4F82',
      crumbHighlight: '#8672A0',
      bakedRim: '#5A3D6E',
      bakedTop: '#4A3058',
      crumbMid: '#68507E',
      bottomBake: '#3A2048',
    }
  },
  mocha: {
    name: 'Mocha',
    colors: {
      // Lightened warm milk-coffee / mocha chiffon sponge
      crumbBase: '#D4A47A',
      crumbDark: '#B2825E',
      crumbLight: '#E8C4A0',
      filling: '#B8977E',
      frosting: '#B8977E',
      // Sponge texture colors
      sideCenter: '#D4A47A',
      crumbHighlight: '#E8C4A0',
      bakedRim: '#B2825E',
      bakedTop: '#A07050',
      crumbMid: '#C5996E',
      bottomBake: '#8B5A3E',
    }
  },
};

// Order for displaying flavors in UI — the full list, used by Sponge
// Flavor (the only picker exclusiveFlavor entries like Plain should
// appear in).
const FLAVOR_ORDER = ['plain', 'vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'];

// Same order, minus any flavor with exclusiveFlavor set (currently just
// Plain). Frosting Flavor (ExteriorFinishSection) and Filling Flavor
// (FillingSection) both use this instead of FLAVOR_ORDER directly, so an
// exclusive flavor never shows up as a frosting or filling option.
// Derived once here rather than filtered separately in each consuming
// file, so marking another flavor exclusive later only ever needs
// exclusiveFlavor set on that one entry above — nothing to remember to
// update in the picker components themselves.
const FROSTING_FILLING_FLAVOR_ORDER = FLAVOR_ORDER.filter((id) => !FLAVORS[id].exclusiveFlavor);
module.exports = { FLAVORS, FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER };
