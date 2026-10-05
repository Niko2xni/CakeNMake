// Template Background Studio & Showcase Compositor
// Generates high-definition marketing backgrounds, studio lighting,
// Red Ribbon-style arched title banners, pedestal plates, and promotional badges.

export const STUDIO_PRESETS = [
  {
    id: 'no-background',
    name: 'No Background',
    subtitle: 'Transparent cutout with only the plate and cake',
    background: {
      type: 'transparent',
      topColor: 'transparent',
      midColor: 'transparent',
      bottomColor: 'transparent',
      lightingIntensity: 0,
    },
    ribbon: { enabled: false },
    plate: { enabled: false },
    shadow: { enabled: false },
    badge: { enabled: false },
    promo: { enabled: false },
  },
  {
    id: 'plain-background',
    name: 'Plain Background',
    subtitle: 'Clean studio backdrop with original cake & plate presentation',
    background: {
      type: 'plain',
      topColor: '#fff5ee',
      midColor: '#fff0e6',
      bottomColor: '#ffe4d6',
      lightingIntensity: 0.65,
    },
    ribbon: { enabled: false },
    plate: { enabled: false },
    shadow: {
      enabled: false,
      opacity: 0,
      blur: 0,
      yOffset: 0,
    },
    badge: { enabled: false },
    promo: { enabled: false },
  },
  {
    id: 'banner-background',
    name: 'Banner Background',
    subtitle: 'Foodpanda / Red Ribbon style with red arched banner & rating badge',
    background: {
      type: 'gradient',
      topColor: '#f9a875',
      midColor: '#fbe2d2',
      bottomColor: '#fde6eb',
      lightingIntensity: 0.85,
    },
    ribbon: {
      enabled: true,
      style: 'arched-ribbon',
      color: '#c01828', // Crimson Red
      goldTrim: true,
      textColor: '#ffffff',
      fontSize: 24,
    },
    plate: {
      enabled: false,
    },
    shadow: {
      enabled: true,
      opacity: 0.45,
      blur: 24,
      yOffset: 12,
    },
    badge: {
      enabled: true,
      text: '$$$ ★ 4.8',
      subtitle: 'CakeNMake Bakery - Signature',
      bgColor: '#e91e63',
    },
    promo: {
      enabled: true,
      mainText: 'up to 50% off',
      subText: 'Special bakery promotion',
      color: '#e91e63',
    },
  },
];

/**
 * Automated Background Removal Engine
 * Extracts the cake and plate by removing perimeter backgrounds.
 * If the image is already a transparent cutout (from 3D scene captures),
 * it preserves transparency cleanly.
 * If the image has a solid, light, or studio background (e.g. uploaded photo or legacy capture),
 * it detects perimeter background colors, traces inward, protects the cake & plate,
 * and sets the background pixels to transparent with edge anti-aliasing/feathering.
 */
export async function removeImageBackground(imageSrc) {
  if (!imageSrc) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 800;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imageSrc);

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 1. Quick check: Is the image already transparent around the perimeter?
        let transparentPerimeterCount = 0;
        const perimeterSamples = 120;
        for (let i = 0; i < perimeterSamples; i++) {
          const px = Math.floor((i / perimeterSamples) * width);
          const topAlpha = data[(px) * 4 + 3];
          const bottomAlpha = data[((height - 1) * width + px) * 4 + 3];
          if (topAlpha < 25) transparentPerimeterCount++;
          if (bottomAlpha < 25) transparentPerimeterCount++;
        }

        // If perimeter is already mostly transparent (> 75%), this image is already a clean cutout!
        if (transparentPerimeterCount > perimeterSamples * 1.5) {
          return resolve(imageSrc);
        }

        // 2. Sample background color palette from corners and borders
        const sampleCoords = [
          [2, 2], [Math.floor(width / 2), 2], [width - 3, 2],
          [2, Math.floor(height / 4)], [width - 3, Math.floor(height / 4)],
          [2, height - 3], [width - 3, height - 3]
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        sampleCoords.forEach(([sx, sy]) => {
          const idx = (sy * width + sx) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR = Math.round(bgR / sampleCoords.length);
        bgG = Math.round(bgG / sampleCoords.length);
        bgB = Math.round(bgB / sampleCoords.length);

        // Center protection box (where cake and plate live: center 60% horizontally, 65% vertically)
        const centerX = width / 2;
        const centerY = height / 2 + height * 0.05;
        const protectRadiusX = width * 0.36;
        const protectRadiusY = height * 0.38;

        // BFS / Flood fill from the 4 borders inward to remove connected background pixels
        const visited = new Uint8Array(width * height);
        const queue = [];

        // Push border pixels that match background color
        const isBgColor = (r, g, b, tol = 58) => {
          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          return Math.sqrt(dr * dr + dg * dg + db * db) <= tol;
        };

        // Seed with all border pixels
        for (let x = 0; x < width; x++) {
          const topIdx = x;
          const tIdx4 = topIdx * 4;
          if (isBgColor(data[tIdx4], data[tIdx4 + 1], data[tIdx4 + 2], 65)) {
            visited[topIdx] = 1;
            queue.push(topIdx);
          }
          const btmIdx = (height - 1) * width + x;
          const bIdx4 = btmIdx * 4;
          if (isBgColor(data[bIdx4], data[bIdx4 + 1], data[bIdx4 + 2], 65)) {
            visited[btmIdx] = 1;
            queue.push(btmIdx);
          }
        }
        for (let y = 0; y < height; y++) {
          const leftIdx = y * width;
          const lIdx4 = leftIdx * 4;
          if (!visited[leftIdx] && isBgColor(data[lIdx4], data[lIdx4 + 1], data[lIdx4 + 2], 65)) {
            visited[leftIdx] = 1;
            queue.push(leftIdx);
          }
          const rightIdx = y * width + (width - 1);
          const rIdx4 = rightIdx * 4;
          if (!visited[rightIdx] && isBgColor(data[rIdx4], data[rIdx4 + 1], data[rIdx4 + 2], 65)) {
            visited[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // Process queue
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          // Clear this pixel (make transparent)
          const p4 = curr * 4;
          data[p4 + 3] = 0;

          // Check 4 neighbors
          const neighbors = [
            cx > 0 ? curr - 1 : -1,
            cx < width - 1 ? curr + 1 : -1,
            cy > 0 ? curr - width : -1,
            cy < height - 1 ? curr + width : -1,
          ];

          for (let n = 0; n < neighbors.length; n++) {
            const next = neighbors[n];
            if (next === -1 || visited[next]) continue;

            const nx = next % width;
            const ny = Math.floor(next / width);

            // Elliptical center protection check: don't flood into the core cake body
            const dx = (nx - centerX) / protectRadiusX;
            const dy = (ny - centerY) / protectRadiusY;
            const isInsideCore = (dx * dx + dy * dy) < 0.65;

            const nIdx4 = next * 4;
            const nr = data[nIdx4];
            const ng = data[nIdx4 + 1];
            const nb = data[nIdx4 + 2];

            if (!isInsideCore && isBgColor(nr, ng, nb, 55)) {
              visited[next] = 1;
              queue.push(next);
            }
          }
        }

        // Soft edge feathering around boundary pixels
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const p4 = idx * 4;
            if (data[p4 + 3] > 0) {
              if (
                data[(idx - 1) * 4 + 3] === 0 ||
                data[(idx + 1) * 4 + 3] === 0 ||
                data[(idx - width) * 4 + 3] === 0 ||
                data[(idx + width) * 4 + 3] === 0
              ) {
                const dr = data[p4] - bgR;
                const dg = data[p4 + 1] - bgG;
                const db = data[p4 + 2] - bgB;
                const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                if (dist < 75) {
                  data[p4 + 3] = Math.max(0, Math.min(255, Math.round((dist / 75) * 220)));
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Background removal error, falling back to original:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Loads an image from a URL into an HTMLImageElement
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('No image src'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Draws an arched ribbon banner with folded ends and text along an arc
 */
function drawArchedRibbon(ctx, x, y, width, height, title, ribbonConfig) {
  if (!title) return;
  const ribbonColor = ribbonConfig?.color || '#c01828';
  const hasGoldTrim = ribbonConfig?.goldTrim ?? true;
  const textColor = ribbonConfig?.textColor || '#ffffff';
  const fontSize = ribbonConfig?.fontSize || 24;

  ctx.save();
  ctx.translate(x, y);

  const halfW = width / 2;
  const archDepth = 18;

  // Ribbon tail drops on left and right
  const tailWidth = 46;
  const tailHeight = 38;
  const tailY = 16;

  // 1. Left Tail (behind)
  ctx.save();
  ctx.fillStyle = shadeColor(ribbonColor, -35);
  ctx.beginPath();
  ctx.moveTo(-halfW + 12, tailY);
  ctx.lineTo(-halfW - tailWidth + 10, tailY + 8);
  ctx.lineTo(-halfW - tailWidth + 24, tailY + tailHeight);
  ctx.lineTo(-halfW - tailWidth + 10, tailY + tailHeight + 14);
  ctx.lineTo(-halfW + 12, tailY + 28);
  ctx.closePath();
  ctx.fill();
  if (hasGoldTrim) {
    ctx.strokeStyle = '#f3cf7a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Right Tail (behind)
  ctx.save();
  ctx.fillStyle = shadeColor(ribbonColor, -35);
  ctx.beginPath();
  ctx.moveTo(halfW - 12, tailY);
  ctx.lineTo(halfW + tailWidth - 10, tailY + 8);
  ctx.lineTo(halfW + tailWidth - 24, tailY + tailHeight);
  ctx.lineTo(halfW + tailWidth - 10, tailY + tailHeight + 14);
  ctx.lineTo(halfW - 12, tailY + 28);
  ctx.closePath();
  ctx.fill();
  if (hasGoldTrim) {
    ctx.strokeStyle = '#f3cf7a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // 3. Ribbon Fold Under-Shadows
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.moveTo(-halfW + 14, 8);
  ctx.lineTo(-halfW - 4, tailY + 12);
  ctx.lineTo(-halfW + 14, tailY + 18);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(halfW - 14, 8);
  ctx.lineTo(halfW + 4, tailY + 12);
  ctx.lineTo(halfW - 14, tailY + 18);
  ctx.closePath();
  ctx.fill();

  // 4. Main Arched Banner Body
  const bannerGrad = ctx.createLinearGradient(0, -archDepth - 10, 0, height);
  bannerGrad.addColorStop(0, shadeColor(ribbonColor, 20));
  bannerGrad.addColorStop(0.4, ribbonColor);
  bannerGrad.addColorStop(1, shadeColor(ribbonColor, -25));

  ctx.fillStyle = bannerGrad;
  ctx.shadowColor = 'rgba(44, 23, 19, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  // Top arched curve
  ctx.moveTo(-halfW, 0);
  ctx.quadraticCurveTo(0, -archDepth, halfW, 0);
  // Right cut
  ctx.lineTo(halfW - 8, height);
  // Bottom arched curve
  ctx.quadraticCurveTo(0, height - archDepth, -halfW + 8, height);
  // Left cut
  ctx.closePath();
  ctx.fill();

  // Reset shadow for crisp borders
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Gold Trim Border Lines
  if (hasGoldTrim) {
    ctx.save();
    ctx.strokeStyle = '#f6d376';
    ctx.lineWidth = 2;
    // Top border
    ctx.beginPath();
    ctx.moveTo(-halfW + 2, 2);
    ctx.quadraticCurveTo(0, -archDepth + 2, halfW - 2, 2);
    ctx.stroke();

    // Bottom border
    ctx.beginPath();
    ctx.moveTo(-halfW + 10, height - 2);
    ctx.quadraticCurveTo(0, height - archDepth - 2, halfW - 10, height - 2);
    ctx.stroke();

    // Inner gold pin-stripe
    ctx.strokeStyle = 'rgba(255, 235, 170, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfW + 5, 5);
    ctx.quadraticCurveTo(0, -archDepth + 5, halfW - 5, 5);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Arched Title Text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold italic ${fontSize}px "Fraunces", "DM Sans", serif, sans-serif`;

  const chars = title.length > 28 ? title.slice(0, 26) + '…' : title;
  const radius = (halfW * halfW + archDepth * archDepth) / (2 * archDepth) * 0.9;
  const totalAngle = Math.min(Math.PI * 0.45, (chars.length * fontSize * 0.55) / radius);
  const startAngle = -Math.PI / 2 - totalAngle / 2;
  const angleStep = totalAngle / Math.max(1, chars.length - 1);
  const textCenterY = radius - archDepth / 2 + 4;

  // Text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // Draw each letter along the curved arch
  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + i * angleStep;
    const charX = radius * Math.cos(angle);
    const charY = radius * Math.sin(angle) + textCenterY;

    ctx.save();
    ctx.translate(charX, charY);
    ctx.rotate(angle + Math.PI / 2);

    ctx.fillStyle = textColor;
    ctx.fillText(chars[i], 0, 0);

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws a modern pill badge for title (alternative to arched ribbon)
 */
function drawModernPillBanner(ctx, x, y, title, ribbonConfig) {
  if (!title) return;
  const color = ribbonConfig?.color || '#ee4f84';
  const textColor = ribbonConfig?.textColor || '#ffffff';
  const fontSize = ribbonConfig?.fontSize || 20;

  ctx.save();
  ctx.font = `bold ${fontSize}px "DM Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(title).width;
  const padX = 24;
  const pillW = textWidth + padX * 2;
  const pillH = fontSize + 18;

  ctx.shadowColor = 'rgba(44, 23, 19, 0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = color;
  roundRect(ctx, x - pillW / 2, y - pillH / 2, pillW, pillH, 999);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = textColor;
  ctx.fillText(title, x, y);
  ctx.restore();
}

/**
 * Utility to shade a hex color brighter or darker
 */
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  const RR = R.toString(16).length === 1 ? '0' + R.toString(16) : R.toString(16);
  const GG = G.toString(16).length === 1 ? '0' + G.toString(16) : G.toString(16);
  const BB = B.toString(16).length === 1 ? '0' + B.toString(16) : B.toString(16);

  return '#' + RR + GG + BB;
}

/**
 * Helper to draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Main Template Canvas Compositor
 * Combines 3D cake cutout, custom background, pedestal plate,
 * contact shadow, arched title ribbon, and promo badges into one final picture.
 */
export async function compositeTemplateImage({
  cakeImageUrl,
  templateName = 'Special Cake',
  settings = {},
  canvasWidth = 800,
  canvasHeight = 800,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cakeImageUrl;

  // Active settings with defaults
  const bg = settings.background || {
    type: 'gradient',
    topColor: '#f9a875',
    midColor: '#fbe2d2',
    bottomColor: '#fde6eb',
    lightingIntensity: 0.85,
  };

  const cakeTransform = settings.transform || {
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
  };

  const filters = settings.filters || {
    brightness: 0,
    contrast: 0,
    saturate: 0,
    warmth: 0,
  };

  const shadow = settings.shadow || {
    enabled: true,
    opacity: 0.45,
    blur: 24,
    yOffset: 12,
  };

  const plate = settings.plate || {
    enabled: true,
    style: 'gold-red',
    opacity: 0.95,
  };

  const ribbon = settings.ribbon || {
    enabled: true,
    style: 'arched-ribbon',
    color: '#c01828',
    goldTrim: true,
    textColor: '#ffffff',
    fontSize: 24,
    titleText: templateName,
  };

  const badge = settings.badge || {
    enabled: true,
    text: '$$$ ★ 4.8',
    subtitle: 'CakeNMake Bakery - Signature',
    bgColor: '#e91e63',
  };

  const promo = settings.promo || {
    enabled: true,
    mainText: 'up to 50% off',
    subText: 'Special bakery promotion',
    color: '#e91e63',
  };

  // If plain background without overlays/adjustments, return the pristine original capture directly
  if (
    bg.type === 'plain' &&
    !ribbon.enabled &&
    !plate.enabled &&
    !shadow.enabled &&
    !badge.enabled &&
    !promo.enabled &&
    scale === 1.0 &&
    (cakeTransform.offsetX || 0) === 0 &&
    (cakeTransform.offsetY || 0) === 0 &&
    !filters.brightness &&
    !filters.contrast &&
    !filters.saturate
  ) {
    return cakeImageUrl;
  }

  // 1. Draw Background
  if (bg.type === 'transparent') {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  } else if (bg.type === 'plain') {
    ctx.fillStyle = '#fff5ee';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (bg.type === 'image' && bg.imageUrl) {
    try {
      const bgImg = await loadImage(bg.imageUrl);
      const scale = Math.max(canvasWidth / bgImg.width, canvasHeight / bgImg.height);
      const w = bgImg.width * scale;
      const h = bgImg.height * scale;
      const x = (canvasWidth - w) / 2;
      const y = (canvasHeight - h) / 2;
      ctx.drawImage(bgImg, x, y, w, h);
    } catch (e) {
      console.warn('Failed to load custom background image, falling back:', e);
      ctx.fillStyle = '#fff5ee';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } else if (bg.type === 'solid') {
    ctx.fillStyle = bg.topColor || '#fff5ee';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    // Studio gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, bg.topColor || '#f9a875');
    grad.addColorStop(0.48, bg.midColor || '#fbe2d2');
    grad.addColorStop(0.85, bg.bottomColor || '#fde6eb');
    grad.addColorStop(1, shadeColor(bg.bottomColor || '#fde6eb', -5));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Studio soft radial spotlight
    const spotX = canvasWidth / 2;
    const spotY = canvasHeight * 0.45;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 20, spotX, spotY, canvasWidth * 0.65);
    const lightAlpha = Math.min(0.5, Math.max(0, (bg.lightingIntensity || 0.8) * 0.45));
    spotGrad.addColorStop(0, `rgba(255, 255, 255, ${lightAlpha})`);
    spotGrad.addColorStop(0.5, `rgba(255, 255, 255, ${lightAlpha * 0.4})`);
    spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Cake base position
  const centerX = canvasWidth / 2 + (cakeTransform.offsetX || 0);
  const centerY = canvasHeight / 2 + (cakeTransform.offsetY || 0);
  const scale = cakeTransform.scale || 1.0;

  // Cake dimensions (full 1:1 scale by default to match 3D camera framing)
  const cakeW = canvasWidth * scale;
  const cakeH = canvasHeight * scale;
  const cakeX = centerX - cakeW / 2;
  const cakeY = centerY - cakeH / 2;
  const cakeBottomY = centerY + cakeH * 0.38;

  // 2. Draw Serving Plate (Red Ribbon reference look)
  if (plate.enabled && bg.type !== 'transparent') {
    const plateRadiusX = cakeW * 0.48;
    const plateRadiusY = cakeW * 0.15;
    const plateY = cakeBottomY + 6;

    ctx.save();
    ctx.globalAlpha = plate.opacity ?? 0.95;

    // Plate Outer Gold/Bronze Rim
    ctx.beginPath();
    ctx.ellipse(centerX, plateY, plateRadiusX * 1.06, plateRadiusY * 1.06, 0, 0, Math.PI * 2);
    const rimGrad = ctx.createLinearGradient(centerX - plateRadiusX, plateY, centerX + plateRadiusX, plateY);
    rimGrad.addColorStop(0, '#d1983d');
    rimGrad.addColorStop(0.3, '#f7e7a8');
    rimGrad.addColorStop(0.7, '#d1983d');
    rimGrad.addColorStop(1, '#97651a');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Plate Inner Center Dish (Red or Porcelain)
    ctx.beginPath();
    ctx.ellipse(centerX, plateY - 2, plateRadiusX * 0.98, plateRadiusY * 0.98, 0, 0, Math.PI * 2);
    if (plate.style === 'gold-red') {
      const dishGrad = ctx.createRadialGradient(centerX, plateY - 2, 10, centerX, plateY - 2, plateRadiusX);
      dishGrad.addColorStop(0, '#c71f2b');
      dishGrad.addColorStop(0.7, '#9e121d');
      dishGrad.addColorStop(1, '#66080f');
      ctx.fillStyle = dishGrad;
    } else if (plate.style === 'rose-gold') {
      ctx.fillStyle = '#e89fb2';
    } else {
      ctx.fillStyle = '#fefcf8';
    }
    ctx.fill();

    // Inner gold ring line
    ctx.beginPath();
    ctx.ellipse(centerX, plateY - 2, plateRadiusX * 0.98, plateRadiusY * 0.98, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#f6d376';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  // 3. Draw Floor Contact Shadow
  if (shadow.enabled && bg.type !== 'transparent') {
    const shadowRadiusX = cakeW * 0.45;
    const shadowRadiusY = cakeW * 0.13;
    const shadowY = cakeBottomY + (shadow.yOffset || 12);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centerX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    const shadowGrad = ctx.createRadialGradient(centerX, shadowY, 10, centerX, shadowY, shadowRadiusX);
    const sOpacity = shadow.opacity ?? 0.45;
    shadowGrad.addColorStop(0, `rgba(44, 23, 19, ${sOpacity})`);
    shadowGrad.addColorStop(0.5, `rgba(44, 23, 19, ${sOpacity * 0.5})`);
    shadowGrad.addColorStop(1, 'rgba(44, 23, 19, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.filter = `blur(${Math.max(2, (shadow.blur || 24) * 0.4)}px)`;
    ctx.fill();
    ctx.restore();
  }

  // 4. Draw 3D Cake Image
  if (cakeImageUrl) {
    try {
      const img = await loadImage(cakeImageUrl);
      ctx.save();

      // Apply CSS-like filters on canvas
      const b = 100 + (filters.brightness || 0);
      const c = 100 + (filters.contrast || 0);
      const s = 100 + (filters.saturate || 0);
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

      ctx.drawImage(img, cakeX, cakeY, cakeW, cakeH);
      ctx.restore();
    } catch (err) {
      console.warn('Failed to draw cake image on canvas:', err);
    }
  }

  // 5. Draw Arched Title Ribbon (The "Red Ribbon" title maker!)
  if (ribbon.enabled && (ribbon.titleText || templateName)) {
    const title = ribbon.titleText || templateName;
    if (ribbon.style === 'modern-pill') {
      drawModernPillBanner(ctx, centerX, 80, title, ribbon);
    } else {
      // Classic Arched Ribbon Banner
      const ribbonWidth = Math.min(460, canvasWidth * 0.58);
      const ribbonHeight = 52;
      drawArchedRibbon(ctx, centerX, 74, ribbonWidth, ribbonHeight, title, ribbon);
    }
  }

  // 6. Draw Rating & Tag Badge (like in Foodpanda ad: "$$$ ★ 4.8")
  if (badge.enabled && badge.text) {
    ctx.save();
    const badgeX = canvasWidth - 36;
    const badgeY = canvasHeight * 0.62;

    ctx.font = 'bold 15px "DM Sans", sans-serif';
    ctx.textAlign = 'right';
    const tagText = badge.text;
    const tagW = ctx.measureText(tagText).width + 24;
    const tagH = 30;

    // Badge Pill
    ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = badge.bgColor || '#e91e63';
    roundRect(ctx, badgeX - tagW, badgeY, tagW, tagH, 999);
    ctx.fill();

    // Badge text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, badgeX - 12, badgeY + tagH / 2);

    // Subtitle below badge
    if (badge.subtitle) {
      ctx.font = 'bold 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#bd2250';
      ctx.fillText(badge.subtitle, badgeX, badgeY + tagH + 16);
    }
    ctx.restore();
  }

  // 7. Draw Promo Text Banner (like in Foodpanda ad: "up to 50% off your order")
  if (promo.enabled && promo.mainText) {
    ctx.save();
    ctx.textAlign = 'left';
    const promoX = 36;
    const promoY = canvasHeight - 74;

    ctx.font = '900 32px "Fraunces", "DM Sans", sans-serif';
    ctx.fillStyle = promo.color || '#e91e63';
    ctx.shadowColor = 'rgba(233, 30, 99, 0.2)';
    ctx.shadowBlur = 8;
    ctx.fillText(promo.mainText, promoX, promoY);

    if (promo.subText) {
      ctx.font = '600 13px "DM Sans", sans-serif';
      ctx.fillStyle = 'rgba(44, 23, 19, 0.65)';
      ctx.shadowColor = 'transparent';
      ctx.fillText(promo.subText, promoX, promoY + 22);
    }
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
