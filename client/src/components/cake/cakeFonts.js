import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';

let loadedPacificoFont = null;
const fontReadyCallbacks = [];

const notifyFontReady = () => {
  if (loadedPacificoFont) {
    fontReadyCallbacks.forEach((cb) => cb());
    fontReadyCallbacks.length = 0;
  }
};

const ttfLoader = new TTFLoader();
ttfLoader.load('/fonts/Pacifico-Regular.ttf', (json) => {
  loadedPacificoFont = new Font(json);
  notifyFontReady();
});

export const getPacificoFont = () => loadedPacificoFont;
export const areFontsReady = () => !!(loadedPacificoFont);
export const onFontsReady = (cb) => {
  if (areFontsReady()) { cb(); return; }
  fontReadyCallbacks.push(cb);
};
