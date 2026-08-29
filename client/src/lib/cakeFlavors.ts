// ─── Flavor Palette System ───────────────────────────────────────────────────
// Geometry, pore pattern, roughness, bump, and normal maps are SHARED.
// Color and per-flavor "bake physics" (pore density, crust thickness, etc.)
// change per flavor.
//
// `highlight` / `primary` / `secondary` / `rimDark` / `sideCenter` are kept
// for backward compatibility with anything still reading the old flat shape
// (e.g. flavor swatch UI). `colors` + the bake-physics fields below are what
// CakeScene.jsx's 3D renderer actually reads.

export type FlavorId =
  | "default"
  | "vanilla"
  | "chocolate"
  | "strawberry"
  | "cheese"
  | "ube"
  | "mocha";

/** Physically-derived sponge color set, used by the 3D renderer. */
export interface SpongeColors {
  /** Moist interior — brightest tone, used for subtle highlight blending */
  crumbHighlight: string;
  /** Main sponge body color */
  crumbBase: string;
  /** Transition tone between crumbBase and the baked crust */
  crumbMid: string;
  /** Upper crust — top of the cake, exposed to direct oven heat */
  bakedTop: string;
  /** Darkest baked edge — sharpest crust accent */
  bakedRim: string;
  /** Protected side wall (shielded by the pan) — lightest exterior tone */
  sideCenter: string;
  /** Pan-contact bottom — darkest exterior tone */
  bottomBake: string;
}

export interface FlavorPalette {
  id: FlavorId;
  name: string;
  /** @deprecated kept for backward compatibility — Brightest color, used at the center of top/bottom caps */
  highlight: string;
  /** @deprecated kept for backward compatibility — Mid-tone main body color */
  primary: string;
  /** @deprecated kept for backward compatibility — Darker mid-tone, transitions toward the rim */
  secondary: string;
  /** @deprecated kept for backward compatibility — Darkest baked-rim color */
  rimDark: string;
  /** @deprecated kept for backward compatibility — Side-texture center override */
  sideCenter?: string;

  /** Physically-derived 7-color palette used by the 3D renderer's side texture */
  colors: SpongeColors;

  // ── Per-flavor "bake physics" — how this batter actually behaves in the oven ──
  /** Relative pore (crumb hole) count, 1 = baseline */
  poreDensity: number;
  /** Relative pore radius, 1 = baseline */
  poreSize: number;
  /** Relative horizontal fiber-streak opacity/count, 1 = baseline */
  fiberStrength: number;
  /** 0–1, how strongly the moist crumbHighlight tint bleeds into the protected side */
  moisture: number;
  /** 0–1, how dark the top crust / bottom bake regions get relative to the side */
  bakeContrast: number;
  /** 0–0.3, how much of the side texture's height the crust transition band occupies */
  crustThickness: number;
  /** Base material roughness (lower = slightly glossier sponge surface) */
  roughness: number;
}

export const FLAVORS: Record<FlavorId, FlavorPalette> = {
  // ── Default ── original golden-brown sponge; cream sides, golden caps ──────
  default: {
    id: "default",
    name: "Classic",
    highlight:  "#E8A84E",
    primary:    "#C87820",
    secondary:  "#9A5510",
    rimDark:    "#6B3508",
    sideCenter: "#F8E9B9",

    colors: {
      crumbHighlight: "#FFF3DC",
      crumbBase:      "#F8E9B9",
      crumbMid:       "#E8C685",
      bakedTop:       "#C87820",
      bakedRim:       "#6B3508",
      sideCenter:     "#F8E9B9",
      bottomBake:     "#7A4010",
    },
    poreDensity: 0.75, poreSize: 0.85, fiberStrength: 0.4,
    moisture: 0.65, bakeContrast: 0.85, crustThickness: 0.18, roughness: 0.88,
  },

  vanilla: {
    id: "vanilla",
    name: "Vanilla",
    highlight: "#FFF9EF",
    primary:   "#F8F4E8",
    secondary: "#EFE6D0",
    rimDark:   "#BFA870",

    colors: {
      crumbHighlight: "#FFF7E7",
      crumbBase:      "#F6DEAB",
      crumbMid:       "#E9C67F",
      bakedTop:       "#D9A85D",
      bakedRim:       "#B87937",
      sideCenter:     "#FCECC5",
      bottomBake:     "#A86B2D",
    },
    poreDensity: 0.7, poreSize: 0.7, fiberStrength: 0.35,
    moisture: 0.75, bakeContrast: 0.55, crustThickness: 0.10, roughness: 0.85,
  },

  chocolate: {
    id: "chocolate",
    name: "Chocolate",
    highlight: "#8A6141",
    primary:   "#5C3A21",
    secondary: "#70482A",
    rimDark:   "#251205",

    colors: {
      crumbHighlight: "#A77B5A",
      crumbBase:      "#775032",
      crumbMid:       "#603C24",
      bakedTop:       "#4C2B18",
      bakedRim:       "#30180D",
      sideCenter:     "#8E6647",
      bottomBake:     "#26120A",
    },
    poreDensity: 1.1, poreSize: 1.1, fiberStrength: 0.6,
    moisture: 0.5, bakeContrast: 0.95, crustThickness: 0.22, roughness: 0.95,
  },

  strawberry: {
    id: "strawberry",
    name: "Strawberry",
    highlight: "#FF8A8A",
    primary:   "#F05A5A",
    secondary: "#D63B3B",
    rimDark:   "#8A1010",

    colors: {
      crumbHighlight: "#F6B7AE",
      crumbBase:      "#DE7A6F",
      crumbMid:       "#C9655B",
      bakedTop:       "#AE4D46",
      bakedRim:       "#85312E",
      sideCenter:     "#E9948C",
      bottomBake:     "#6F2625",
    },
    poreDensity: 0.85, poreSize: 1.0, fiberStrength: 0.45,
    moisture: 0.7, bakeContrast: 0.65, crustThickness: 0.13, roughness: 0.88,
  },

  cheese: {
    id: "cheese",
    name: "Cheese",
    highlight: "#FFF2B3",
    primary:   "#F7E58D",
    secondary: "#F0D86D",
    rimDark:   "#B89810",

    colors: {
      crumbHighlight: "#FFF3C6",
      crumbBase:      "#F5D97F",
      crumbMid:       "#E6BD5F",
      bakedTop:       "#CF9942",
      bakedRim:       "#A96E2D",
      sideCenter:     "#FAE8A8",
      bottomBake:     "#8F5922",
    },
    poreDensity: 0.65, poreSize: 0.75, fiberStrength: 0.3,
    moisture: 0.65, bakeContrast: 0.85, crustThickness: 0.16, roughness: 0.78,
  },

  ube: {
    id: "ube",
    name: "Ube",
    highlight: "#B08AE3",
    primary:   "#8B5FBF",
    secondary: "#7446AB",
    rimDark:   "#3A1565",

    colors: {
      crumbHighlight: "#D5C3E8",
      crumbBase:      "#A787C3",
      crumbMid:       "#8B6BA8",
      bakedTop:       "#725187",
      bakedRim:       "#563967",
      sideCenter:     "#BEA5D8",
      bottomBake:     "#442A53",
    },
    poreDensity: 1.0, poreSize: 1.0, fiberStrength: 0.5,
    moisture: 0.55, bakeContrast: 0.6, crustThickness: 0.14, roughness: 0.9,
  },

  mocha: {
    id: "mocha",
    name: "Mocha",
    highlight: "#A87D59",
    primary:   "#8A6141",
    secondary: "#725136",
    rimDark:   "#321A08",

    colors: {
      crumbHighlight: "#C29B74",
      crumbBase:      "#98704D",
      crumbMid:       "#7F593D",
      bakedTop:       "#66412C",
      bakedRim:       "#492B1C",
      sideCenter:     "#AF8460",
      bottomBake:     "#392116",
    },
    poreDensity: 0.9, poreSize: 0.95, fiberStrength: 0.5,
    moisture: 0.55, bakeContrast: 0.9, crustThickness: 0.19, roughness: 0.92,
  },
};

export const FLAVOR_ORDER: FlavorId[] = [
  "default",
  "vanilla",
  "chocolate",
  "strawberry",
  "cheese",
  "ube",
  "mocha",
];