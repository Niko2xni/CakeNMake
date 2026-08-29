import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';

let loadedPacificoFont = null;
let loadedHandwrittenFont = null;

const ttfLoader = new TTFLoader();
ttfLoader.load('/fonts/Pacifico-Regular.ttf', (json) => {
  loadedPacificoFont = new Font(json);
});
ttfLoader.load('/fonts/PatrickHand-Regular.ttf', (json) => {
  loadedHandwrittenFont = new Font(json);
});

export const getPacificoFont = () => loadedPacificoFont;
export const getHandwrittenFont = () => loadedHandwrittenFont;
