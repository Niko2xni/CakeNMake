const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pairs = [
  ['../client/src/lib/cakeFlavors.js', 'lib/cakeFlavors.js'],
  ['../client/src/lib/cakeConfig.js', 'lib/cakeConfig.js'],
  ['../client/src/lib/aiCakeToolSchemas.js', 'lib/aiCakeToolSchemas.js'],
];

for (const [srcRel, outRel] of pairs) {
  const srcPath = path.join(root, srcRel);
  const outPath = path.join(root, outRel);
  let text = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');

  if (srcRel.endsWith('cakeFlavors.js')) {
    text = text.replace("import { FLAVORS } from './cakeFlavors';", "const { FLAVORS } = require('./cakeFlavors');");
    text = text.replace("import { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } from './cakeFlavors.js';", "const { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } = require('./cakeFlavors');");
  }

  if (srcRel.endsWith('cakeConfig.js')) {
    text = text.replace("import { FLAVORS } from './cakeFlavors';", "const { FLAVORS } = require('./cakeFlavors');");
  }

  if (srcRel.endsWith('aiCakeToolSchemas.js')) {
    text = text.replace(
      "import {\n  SIZE_OPTIONS,\n  LAYER_OPTIONS,\n  FINISH_STYLES,\n  BUTTERCREAM_TEXTURES,\n  FILLING_LAYER_OPTIONS,\n  FILLING_PIPING_DESIGNS,\n  SUGAR_COLORS,\n  SUGAR_COLOR_MODES,\n  GLAZE_PATTERNS,\n  SIDE_TREATMENTS,\n  CHECKERED_PATTERN_SETS,\n  TRIANGLE_PATTERN_SETS,\n  CHEVRON_PATTERN_SETS,\n  SCATTER_PEARLS_SETS,\n  PIPING_SCROLLS_SETS,\n  SUNSHINE_PLAY_SETS,\n  VICTORIAN_LAMBETH_SETS,\n  CENTER_PLACEABLE_DESIGNS,\n} from './cakeConfig.js';",
      "const {\n  SIZE_OPTIONS,\n  LAYER_OPTIONS,\n  FINISH_STYLES,\n  BUTTERCREAM_TEXTURES,\n  FILLING_LAYER_OPTIONS,\n  FILLING_PIPING_DESIGNS,\n  SUGAR_COLORS,\n  SUGAR_COLOR_MODES,\n  GLAZE_PATTERNS,\n  SIDE_TREATMENTS,\n  CHECKERED_PATTERN_SETS,\n  TRIANGLE_PATTERN_SETS,\n  CHEVRON_PATTERN_SETS,\n  SCATTER_PEARLS_SETS,\n  PIPING_SCROLLS_SETS,\n  SUNSHINE_PLAY_SETS,\n  VICTORIAN_LAMBETH_SETS,\n  CENTER_PLACEABLE_DESIGNS,\n} = require('./cakeConfig');"
    );
    text = text.replace("import { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } from './cakeFlavors.js';", "const { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } = require('./cakeFlavors');");
  }

  const exportNames = Array.from(
    new Set(
      [...text.matchAll(/export\s+(?:const|function)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1])
    )
  );

  text = text.replace(/export const ([A-Za-z0-9_]+)\s*=\s*/g, 'const $1 = ');
  text = text.replace(/export function ([A-Za-z0-9_]+)\s*\(/g, 'function $1(');

  text += '\nmodule.exports = { ' + exportNames.join(', ') + ' };\n';
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text, 'utf8');
  console.log('generated:', outRel);
}
