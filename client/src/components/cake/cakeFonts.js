import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';

let loadedPacificoFont = null;
let loadedHandwrittenFont = null;
const fontReadyCallbacks = [];

const checkBothLoaded = () => {
  if (loadedPacificoFont && loadedHandwrittenFont) {
    fontReadyCallbacks.forEach((cb) => cb());
    fontReadyCallbacks.length = 0;
  }
};

const ttfLoader = new TTFLoader();
ttfLoader.load('/fonts/Pacifico-Regular.ttf', (json) => {
  loadedPacificoFont = new Font(json);
  checkBothLoaded();
});
ttfLoader.load('/fonts/PatrickHand-Regular.ttf', (json) => {
  loadedHandwrittenFont = new Font(json);
  checkBothLoaded();
});

export const getPacificoFont = () => loadedPacificoFont;
export const getHandwrittenFont = () => loadedHandwrittenFont;
export const areFontsReady = () => !!(loadedPacificoFont && loadedHandwrittenFont);
export const onFontsReady = (cb) => {
  if (areFontsReady()) { cb(); return; }
  fontReadyCallbacks.push(cb);
};
