const flavors = ['vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'];
const colors = ['red', 'black', 'pink', 'white', 'ivory', 'blush', 'sage', 'navy', 'terracotta', 'lavenderGrey', 'charcoal', 'gold', 'marble', 'ombre', 'rainbowSwirl', 'goldShimmer', 'watercolorPastel', 'redWhiteGradient'];
const placed = ['cherry', 'strawberry', 'mango', 'candyFlowers', 'ferreroRocher', 'hersheysKisses', 'oreo', 'chocolateBear', 'basketball', 'soccerball', 'candle', 'chocolateChip', 'rosette'];
const sideModes = ['checkeredPattern', 'trianglePattern', 'chevronPattern', 'scatterPearls', 'whippedSkirt', 'drip', 'pipingScrolls', 'sunshinePlay', 'victorianLambeth'];

function title(value) {
  return String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const item = (componentKey, displayName, category, billingUnit = 'per_cake', isRequired = false) => ({
  componentKey, displayName, category, billingUnit, costBasisMinor: 0, markupMinor: 0, isActive: true, isRequired,
});

const CATALOG_DEFINITIONS = [
  item('base.standard', 'Standard Base Cake', 'base', 'per_cake', true),
  item('size.small', 'Small Cake (6×4)', 'structure', 'per_cake'),
  item('size.big', 'Large Cake (8×5)', 'structure', 'per_cake'),
  item('tier.additional', 'Additional Tier', 'structure', 'per_tier'),
  item('filling.layer', 'Filling Layer', 'filling', 'per_layer'),
  item('finish.naked', 'Naked Finish', 'finish'),
  item('finish.fullyFrosted', 'Fully Frosted', 'finish'),
  item('finish.texturedButtercream', 'Textured Buttercream', 'finish'),
  item('texture.ridged', 'Ridged Buttercream Texture', 'finish'),
  item('texture.ribbonWrap', 'Ribbon Wrap Texture', 'finish'),
  item('surface.glaze', 'Glaze Treatment', 'surface'),
  item('center.customText', 'Custom Buttercream Text', 'center', 'per_set'),
  item('edge.piping', 'Edge Piping', 'edge', 'per_edge'),
  item('edge.decorationSet', 'Edge Decoration Set', 'edge', 'per_edge'),
  item('side.treatment', 'Side Treatment', 'side', 'per_set'),
  ...flavors.flatMap((id) => [
    item(`sponge.${id}`, `${title(id)} Sponge`, 'sponge', 'per_tier'),
    item(`filling.${id}`, `${title(id)} Filling`, 'filling', 'per_layer'),
    item(`frosting.${id}`, `${title(id)} Frosting`, 'finish', 'per_tier'),
  ]),
  ...colors.map((id) => item(`color.${id}`, `${title(id)} Color`, 'color', 'per_set')),
  ...placed.map((id) => item(`placed.${id}`, title(id), 'decoration', 'per_piece')),
  ...sideModes.map((id) => item(`side.${id}`, title(id), 'side', 'per_set')),
];

module.exports = { CATALOG_DEFINITIONS, title };
