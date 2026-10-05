// Template Background Studio & Showcase Compositor
// Generates high-definition marketing backgrounds, studio lighting,
// Red Ribbon-style arched title banners, pedestal plates, and promotional badges.

export const STUDIO_PRESETS = [
  {
    id: 'red-ribbon-showcase',
    name: 'Red Ribbon Ad Style',
    subtitle: 'Classic bakery ad with arched title ribbon & promo badges',
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
      enabled: true,
      style: 'gold-red',
      opacity: 0.95,
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
  {
    id: 'pastel-rose',
    name: 'Pastel Rose Studio',
    subtitle: 'Soft blush studio gradient with delicate rose ribbon',
    background: {
      type: 'gradient',
      topColor: '#f7c5d2',
      midColor: '#fdf0f4',
      bottomColor: '#fef7f9',
      lightingIntensity: 0.75,
    },
    ribbon: {
      enabled: true,
      style: 'arched-ribbon',
      color: '#d64571',
      goldTrim: true,
      textColor: '#ffffff',
      fontSize: 22,
    },
    plate: {
      enabled: true,
      style: 'rose-gold',
      opacity: 0.85,
    },
    shadow: {
      enabled: true,
      opacity: 0.35,
      blur: 20,
      yOffset: 10,
    },
    badge: {
      enabled: true,
      text: 'BESTSELLER ★ 4.9',
      subtitle: 'Artisan Buttercream Collection',
      bgColor: '#d64571',
    },
    promo: {
      enabled: false,
      mainText: 'Handcrafted Daily',
      subText: 'Fresh premium ingredients',
      color: '#d64571',
    },
  },
  {
    id: 'caramel-warm',
    name: 'Warm Caramel & Honey',
    subtitle: 'Cozy amber bakery studio with golden ribbon banner',
    background: {
      type: 'gradient',
      topColor: '#ebb577',
      midColor: '#fbf0e1',
      bottomColor: '#fcf7ef',
      lightingIntensity: 0.8,
    },
    ribbon: {
      enabled: true,
      style: 'arched-ribbon',
      color: '#b06f28',
      goldTrim: true,
      textColor: '#ffffff',
      fontSize: 22,
    },
    plate: {
      enabled: true,
      style: 'gold-rim',
      opacity: 0.9,
    },
    shadow: {
      enabled: true,
      opacity: 0.4,
      blur: 22,
      yOffset: 12,
    },
    badge: {
      enabled: true,
      text: 'CHEF RECOMMENDED ★ 5.0',
      subtitle: 'Signature Oven Fresh',
      bgColor: '#b06f28',
    },
    promo: {
      enabled: false,
      mainText: 'Freshly Baked',
      subText: 'Baked upon order',
      color: '#b06f28',
    },
  },
  {
    id: 'luxury-noir',
    name: 'Luxury Noir & Gold',
    subtitle: 'Sophisticated dark studio vignette with metallic gold trim',
    background: {
      type: 'gradient',
      topColor: '#1e1c24',
      midColor: '#2d2936',
      bottomColor: '#1a1820',
      lightingIntensity: 0.5,
    },
    ribbon: {
      enabled: true,
      style: 'arched-ribbon',
      color: '#c99a3e',
      goldTrim: false,
      textColor: '#1a1820',
      fontSize: 22,
    },
    plate: {
      enabled: true,
      style: 'gold-rim',
      opacity: 0.95,
    },
    shadow: {
      enabled: true,
      opacity: 0.65,
      blur: 28,
      yOffset: 14,
    },
    badge: {
      enabled: true,
      text: 'PREMIUM TIER ★ 4.9',
      subtitle: 'Haute Pâtisserie Selection',
      bgColor: '#c99a3e',
    },
    promo: {
      enabled: false,
      mainText: 'Exclusive Edition',
      subText: 'Pre-order available',
      color: '#c99a3e',
    },
  },
  {
    id: 'mint-fresh',
    name: 'Mint & Vanilla Fresh',
    subtitle: 'Vibrant spring palette for celebration and birthday cakes',
    background: {
      type: 'gradient',
      topColor: '#aee3d3',
      midColor: '#eef8f5',
      bottomColor: '#ffffff',
      lightingIntensity: 0.7,
    },
    ribbon: {
      enabled: true,
      style: 'arched-ribbon',
      color: '#2b8f72',
      goldTrim: true,
      textColor: '#ffffff',
      fontSize: 22,
    },
    plate: {
      enabled: true,
      style: 'minimal',
      opacity: 0.8,
    },
    shadow: {
      enabled: true,
      opacity: 0.35,
      blur: 18,
      yOffset: 10,
    },
    badge: {
      enabled: true,
      text: 'PARTY SPECIAL ★ 4.8',
      subtitle: 'Sweet Celebrations',
      bgColor: '#2b8f72',
    },
    promo: {
      enabled: false,
      mainText: 'Free Delivery',
      subText: 'On selected locations',
      color: '#2b8f72',
    },
  },
  {
    id: 'clean-white',
    name: 'Clean Studio White',
    subtitle: 'Minimal seamless white catalog look with soft shadow',
    background: {
      type: 'gradient',
      topColor: '#f4f4f7',
      midColor: '#ffffff',
      bottomColor: '#ffffff',
      lightingIntensity: 0.6,
    },
    ribbon: {
      enabled: false,
      style: 'modern-pill',
      color: '#ee4f84',
      goldTrim: false,
      textColor: '#ffffff',
      fontSize: 20,
    },
    plate: {
      enabled: false,
      style: 'minimal',
      opacity: 0.5,
    },
    shadow: {
      enabled: true,
      opacity: 0.3,
      blur: 24,
      yOffset: 14,
    },
    badge: {
      enabled: false,
      text: '★ 4.8',
      subtitle: '',
      bgColor: '#ee4f84',
    },
    promo: {
      enabled: false,
      mainText: '',
      subText: '',
      color: '#ee4f84',
    },
  },
  {
    id: 'raw-transparent',
    name: 'Pure 3D Raw',
    subtitle: 'Original transparent cutout without background decorations',
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
];

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

  // 1. Draw Background
  if (bg.type === 'transparent') {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  } else if (bg.type === 'solid') {
    ctx.fillStyle = bg.topColor || '#fbe2d2';
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

  // Cake dimensions
  const cakeW = canvasWidth * 0.78 * scale;
  const cakeH = canvasHeight * 0.78 * scale;
  const cakeX = centerX - cakeW / 2;
  const cakeY = centerY - cakeH / 2 + 10;
  const cakeBottomY = centerY + cakeH * 0.28;

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

  return canvas.toDataURL('image/jpeg', 0.94);
}
