import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Sparkles,
  Sliders,
  Type,
  Layers,
  Upload,
  RotateCcw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  Tag,
  CheckCircle2,
  Copy,
  Wand2,
  Image as ImageIcon,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  STUDIO_PRESETS,
  compositeTemplateImage,
  removeImageBackground,
} from '@/utils/templateBackgroundCompositor';

export default function TemplateBackgroundStudioModal({
  isOpen,
  onClose,
  views = [],
  templateName = 'Special Cake',
  onSaveViews,
  onSave,
}) {
  if (!isOpen) return null;

  // Working copy of views with rawUrl, transparentUrl, cutoutUrl, and composite url
  const [workingViews, setWorkingViews] = useState(() => {
    return (views && views.length > 0 ? views : []).map((v) => ({
      ...v,
      rawUrl: v.rawUrl || v.url, // clean 3D capture from Image 3
      cutoutUrl: v.cutoutUrl || v.transparentUrl || null,
      url: v.url || v.rawUrl,
    }));
  });

  // Sync workingViews whenever views prop is updated
  useEffect(() => {
    if (views && views.length > 0) {
      setWorkingViews(
        views.map((v) => ({
          ...v,
          rawUrl: v.rawUrl || v.url,
          cutoutUrl: v.cutoutUrl || v.transparentUrl || null,
          url: v.url || v.rawUrl,
        }))
      );
    }
  }, [views]);

  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'banner' | 'adjust'
  // Default to plain-background (clean studio neutral) or first preset
  const defaultPreset = STUDIO_PRESETS[1] || STUDIO_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [notification, setNotification] = useState('');

  // Custom Bakery Backgrounds (persisted in localStorage)
  const [customBackgrounds, setCustomBackgrounds] = useState(() => {
    try {
      const saved = localStorage.getItem('cakenmake_custom_backgrounds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showAddBackgroundModal, setShowAddBackgroundModal] = useState(false);
  const [newBgName, setNewBgName] = useState('');
  const [newBgType, setNewBgType] = useState('gradient'); // 'gradient' | 'solid' | 'image'
  const [newBgTopColor, setNewBgTopColor] = useState('#fff5eb');
  const [newBgMidColor, setNewBgMidColor] = useState('#fff0e6');
  const [newBgBottomColor, setNewBgBottomColor] = useState('#ffe4d6');
  const [newBgUseMidColor, setNewBgUseMidColor] = useState(false);
  const [newBgImageUrl, setNewBgImageUrl] = useState('');
  const customBgImageInputRef = useRef(null);

  // Active studio settings
  const [studioSettings, setStudioSettings] = useState({
    background: { ...defaultPreset.background },
    ribbon: { ...defaultPreset.ribbon, titleText: templateName },
    plate: { ...defaultPreset.plate },
    shadow: { ...defaultPreset.shadow },
    badge: { ...defaultPreset.badge },
    promo: { ...defaultPreset.promo },
    transform: { scale: 1.0, offsetX: 0, offsetY: 0 },
    filters: { brightness: 0, contrast: 0, saturate: 0 },
  });

  const fileInputRef = useRef(null);
  const renderTimeoutRef = useRef(null);

  // Sync title text if templateName changes and user hasn't overridden
  useEffect(() => {
    if (templateName) {
      setStudioSettings((prev) => ({
        ...prev,
        ribbon: {
          ...prev.ribbon,
          titleText: prev.ribbon.titleText || templateName,
        },
      }));
    }
  }, [templateName]);

  // Re-composite active view whenever settings, preset, or active view changes
  useEffect(() => {
    if (!workingViews || workingViews.length === 0) return;
    const currentView = workingViews[activeAngleIndex];
    if (!currentView) return;

    // Plain background with no overlays: keep the pristine original capture from Image 3
    const isPlainPreset = selectedPresetId === 'plain-background';
    const isTransparentPreset = selectedPresetId === 'no-background' || studioSettings.background?.type === 'transparent';
    const hasDecorations = studioSettings.ribbon?.enabled || studioSettings.badge?.enabled || studioSettings.promo?.enabled;

    if (isPlainPreset && !hasDecorations) {
      const pristineUrl = currentView.rawUrl || currentView.url;
      if (currentView.url !== pristineUrl) {
        setWorkingViews((prev) =>
          prev.map((v, idx) =>
            idx === activeAngleIndex ? { ...v, url: pristineUrl } : v
          )
        );
      }
      return;
    }

    if (isTransparentPreset && !hasDecorations) {
      const transparentImg = currentView.cutoutUrl || currentView.transparentUrl || currentView.rawUrl || currentView.url;
      if (currentView.url !== transparentImg) {
        setWorkingViews((prev) =>
          prev.map((v, idx) =>
            idx === activeAngleIndex ? { ...v, url: transparentImg } : v
          )
        );
      }
      return;
    }

    // For banner or custom background: use clean cutout if available, else raw image
    const baseCakeImage = isTransparentPreset
      ? (currentView.cutoutUrl || currentView.transparentUrl || currentView.rawUrl || currentView.url)
      : (currentView.cutoutUrl || currentView.transparentUrl || currentView.rawUrl || currentView.url);

    if (!baseCakeImage) return;

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

    renderTimeoutRef.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const compositeUrl = await compositeTemplateImage({
          cakeImageUrl: baseCakeImage,
          templateName: studioSettings.ribbon.titleText || templateName,
          settings: studioSettings,
        });

        setWorkingViews((prev) =>
          prev.map((v, idx) =>
            idx === activeAngleIndex ? { ...v, url: compositeUrl } : v
          )
        );
      } catch (err) {
        console.error('Error compositing template view:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 60);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [studioSettings, activeAngleIndex, selectedPresetId]);

  // Select a preset or custom background
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setStudioSettings((prev) => ({
      ...prev,
      background: { ...preset.background },
      ribbon: { ...preset.ribbon, titleText: prev.ribbon?.titleText || templateName },
      plate: { ...preset.plate },
      shadow: { ...preset.shadow },
      badge: { ...preset.badge },
      promo: { ...preset.promo },
    }));
    triggerFeedback(`Applied background: ${preset.name}`);
  };

  // Save new custom background
  const handleSaveNewBackground = () => {
    const trimmed = newBgName.trim();
    if (!trimmed) {
      // Field is required, browser will show validation
      return;
    }
    if (newBgType === 'image' && !newBgImageUrl) {
      alert('Please select or upload a wallpaper image.');
      return;
    }

    const newBg = {
      id: `custom-bg-${Date.now()}`,
      name: trimmed,
      subtitle: `Custom ${newBgType} bakery backdrop`,
      isCustom: true,
      background: {
        type: newBgType,
        topColor: newBgTopColor,
        midColor: newBgUseMidColor ? newBgMidColor : newBgTopColor,
        bottomColor: newBgType === 'gradient' ? newBgBottomColor : newBgTopColor,
        imageUrl: newBgType === 'image' ? newBgImageUrl : null,
        lightingIntensity: 0.7,
      },
      ribbon: { enabled: false },
      plate: { enabled: false },
      shadow: { enabled: true, opacity: 0.35, blur: 20, yOffset: 12 },
      badge: { enabled: false },
      promo: { enabled: false },
    };

    const updated = [newBg, ...customBackgrounds];
    setCustomBackgrounds(updated);
    try {
      localStorage.setItem('cakenmake_custom_backgrounds', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom backgrounds:', e);
    }

    setShowAddBackgroundModal(false);
    setNewBgName('');
    setNewBgImageUrl('');
    handleSelectPreset(newBg);
    triggerFeedback(`✓ Created & applied background "${trimmed}"!`);
  };

  // Delete custom background
  const handleDeleteCustomBackground = (bgId, bgName) => {
    const updated = customBackgrounds.filter((b) => b.id !== bgId);
    setCustomBackgrounds(updated);
    try {
      localStorage.setItem('cakenmake_custom_backgrounds', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update localStorage:', e);
    }

    if (selectedPresetId === bgId) {
      handleSelectPreset(STUDIO_PRESETS[1] || STUDIO_PRESETS[0]);
    }
    triggerFeedback(`Removed background "${bgName}"`);
  };

  // Manual trigger for background removal
  const handleManualRemoveBackground = async () => {
    if (!workingViews || workingViews.length === 0) return;
    const currentView = workingViews[activeAngleIndex];
    if (!currentView) return;

    // If native transparent cutout from WebGL is available, use it directly!
    if (currentView.transparentUrl) {
      setWorkingViews((prev) =>
        prev.map((v, idx) =>
          idx === activeAngleIndex
            ? { ...v, url: currentView.transparentUrl, cutoutUrl: currentView.transparentUrl }
            : v
        )
      );
      setSelectedPresetId('no-background');
      triggerFeedback('✓ Clean transparent cutout applied!');
      return;
    }

    setIsRemovingBg(true);
    triggerFeedback('Removing background… Extracting cake & plate');

    try {
      const src = currentView.rawUrl || currentView.url;
      const cutout = await removeImageBackground(src);

      setWorkingViews((prev) =>
        prev.map((v, idx) =>
          idx === activeAngleIndex ? { ...v, cutoutUrl: cutout, url: cutout } : v
        )
      );
      setSelectedPresetId('no-background');
      triggerFeedback('✓ Background removed! Cake & plate isolated.');
    } catch (err) {
      console.error('Manual background removal failed:', err);
      triggerFeedback('Background removal failed. Please try again.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Apply current background & styles to ALL 8 angles
  const handleApplyToAllAngles = async () => {
    if (!workingViews || workingViews.length === 0) return;
    setIsProcessing(true);
    triggerFeedback('Applying background style to all pictures…');

    try {
      const isPlainPreset = selectedPresetId === 'plain-background';
      const isTransparentPreset = selectedPresetId === 'no-background' || studioSettings.background?.type === 'transparent';
      const hasDecorations = studioSettings.ribbon?.enabled || studioSettings.badge?.enabled || studioSettings.promo?.enabled;

      if (isPlainPreset && !hasDecorations) {
        setWorkingViews((prev) =>
          prev.map((v) => ({
            ...v,
            url: v.rawUrl || v.url,
          }))
        );
        triggerFeedback('✓ Applied clean original presentation to all 8 angles!');
        return;
      }

      if (isTransparentPreset && !hasDecorations) {
        setWorkingViews((prev) =>
          prev.map((v) => ({
            ...v,
            url: v.cutoutUrl || v.transparentUrl || v.rawUrl || v.url,
          }))
        );
        triggerFeedback('✓ Applied transparent cutout to all 8 angles!');
        return;
      }

      const updatedViews = await Promise.all(
        workingViews.map(async (view) => {
          const baseImage = isTransparentPreset
            ? (view.cutoutUrl || view.transparentUrl || view.rawUrl || view.url)
            : (view.cutoutUrl || view.transparentUrl || view.rawUrl || view.url);

          const compositeUrl = await compositeTemplateImage({
            cakeImageUrl: baseImage,
            templateName: studioSettings.ribbon.titleText || templateName,
            settings: studioSettings,
          });
          return {
            ...view,
            url: compositeUrl,
          };
        })
      );
      setWorkingViews(updatedViews);
      triggerFeedback('✓ Successfully applied to all 8 picture angles!');
    } catch (err) {
      console.error('Failed to batch apply studio style:', err);
      triggerFeedback('Failed to apply to some views. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload custom photo to replace active angle
  const handleCustomPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const customUrl = ev.target?.result;
      if (!customUrl) return;

      setIsRemovingBg(true);
      triggerFeedback('Extracting cake & plate from uploaded photo…');

      try {
        const [cutout] = await Promise.all([
          removeImageBackground(customUrl),
          new Promise((res) => setTimeout(res, 550)),
        ]);

        const compositeUrl = await compositeTemplateImage({
          cakeImageUrl: cutout,
          templateName: studioSettings.ribbon.titleText || templateName,
          settings: studioSettings,
        });

        setWorkingViews((prev) =>
          prev.map((v, idx) =>
            idx === activeAngleIndex
              ? { ...v, rawUrl: customUrl, cutoutUrl: cutout, url: compositeUrl }
              : v
          )
        );
        triggerFeedback('Photo background removed & updated!');
      } catch (err) {
        console.error('Failed to process uploaded photo:', err);
      } finally {
        setIsRemovingBg(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset active picture to raw
  const handleResetActivePicture = () => {
    setWorkingViews((prev) =>
      prev.map((v, idx) =>
        idx === activeAngleIndex
          ? { ...v, url: v.rawUrl || v.url, cutoutUrl: null }
          : v
      )
    );
    setStudioSettings((prev) => ({
      ...prev,
      transform: { scale: 1.0, offsetX: 0, offsetY: 0 },
      filters: { brightness: 0, contrast: 0, saturate: 0 },
    }));
    triggerFeedback('Active angle reset to original capture');
  };

  const triggerFeedback = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const handleSaveAndClose = () => {
    if (onSaveViews) {
      onSaveViews(workingViews);
    }
    if (onSave) {
      onSave(workingViews);
    }
    onClose();
  };

  const activeView = workingViews[activeAngleIndex] || {};

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#fffdf9] text-gray-900 rounded-3xl w-full max-w-6xl max-h-[95vh] shadow-2xl border border-pink-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/80 via-white to-orange-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-gray-900 text-lg leading-tight">
                  Template Background Maker & Studio
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Apply marketing backdrops, Red Ribbon arched title banners, pedestal plates, and manually edit each picture.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" /> Save & Apply Pictures
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Canvas Preview & Angle Thumbnails */}
          <div className="lg:w-7/12 p-5 bg-[#fbf7f0] border-b lg:border-b-0 lg:border-r border-pink-100/80 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Preview Bar Actions */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">
                    {activeView.label || `Angle ${activeAngleIndex + 1}`} ({activeView.angle || 'View'})
                  </span>
                  {isProcessing && (
                    <span className="text-[10px] text-pink-600 font-semibold animate-pulse">
                      Updating canvas…
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-[11px] font-semibold transition-colors shadow-xs select-none"
                    title="Press and hold to view original raw capture"
                  >
                    <Eye className="w-3.5 h-3.5" /> Hold for Original
                  </button>

                  <button
                    type="button"
                    onClick={handleManualRemoveBackground}
                    disabled={isRemovingBg}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 text-pink-600 text-[11px] font-semibold transition-colors shadow-xs disabled:opacity-50"
                    title="Remove background to leave only plate and cake"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Remove Background
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 text-pink-600 text-[11px] font-semibold transition-colors shadow-xs"
                    title="Upload external photo for this angle"
                  >
                    <Upload className="w-3.5 h-3.5" /> Replace Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomPhotoUpload}
                  />
                </div>
              </div>

              {/* Large Main Showcase Canvas Preview */}
              <div
                className={`w-full max-w-[500px] aspect-square mx-auto rounded-2xl overflow-hidden border border-pink-200/80 shadow-lg relative group flex items-center justify-center ${
                  selectedPresetId === 'no-background'
                    ? 'bg-[linear-gradient(45deg,#f4f4f4_25%,transparent_25%),linear-gradient(-45deg,#f4f4f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f4_75%),linear-gradient(-45deg,transparent_75%,#f4f4f4_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-white'
                    : 'bg-[#fff5ee]'
                }`}
              >
                {isRemovingBg && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 mb-3.5 animate-pulse">
                      <Wand2 className="w-7 h-7 animate-spin" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 font-heading">
                      Processing Background…
                    </h4>
                    <p className="text-[11px] text-gray-500 max-w-xs mt-1">
                      Applying transparent cutout for active angle
                    </p>
                    <div className="w-40 h-1.5 bg-pink-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {showOriginal ? (
                  <img
                    src={activeView.rawUrl || activeView.url}
                    alt="Original raw"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <img
                    src={activeView.url || activeView.rawUrl}
                    alt={activeView.label || 'Studio view'}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Navigation Arrows */}
                {workingViews.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAngleIndex((prev) => (prev - 1 + workingViews.length) % workingViews.length)
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAngleIndex((prev) => (prev + 1) % workingViews.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {showOriginal && (
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider">
                    Viewing Raw 3D Capture
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: Angle Selector Carousel & Batch Action */}
            <div className="mt-4 pt-4 border-t border-pink-100">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Select Picture Angle to Edit ({activeAngleIndex + 1} of {workingViews.length})
                </span>
                <button
                  type="button"
                  onClick={handleApplyToAllAngles}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Apply Current Style to All 8 Angles
                </button>
              </div>

              {/* Angle thumbnails */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {workingViews.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveAngleIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                      activeAngleIndex === idx
                        ? 'border-pink-500 ring-2 ring-pink-500/20 scale-105 shadow-sm'
                        : 'border-gray-200 bg-white opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={v.url || v.rawUrl} alt={v.label} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 text-[8px] font-bold text-white bg-black/60 rounded px-1 truncate">
                      {v.angle || `#${idx + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="lg:w-5/12 flex flex-col bg-white overflow-hidden">
            {/* Control Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 p-1.5 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
                  activeTab === 'presets'
                    ? 'bg-white text-pink-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Palette className="w-4 h-4" /> Studio Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('banner')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
                  activeTab === 'banner'
                    ? 'bg-white text-pink-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Type className="w-4 h-4" /> Ribbon & Badges
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
                  activeTab === 'adjust'
                    ? 'bg-white text-pink-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Sliders className="w-4 h-4" /> Manual Edit
              </button>
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* TAB 1: BACKGROUND SELECTION */}
              {activeTab === 'presets' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-heading mb-1">
                      Background Selections
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      Choose from the 3 core bakery presets or create and manage custom backgrounds.
                    </p>
                  </div>

                  {/* Core 3 Presets */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Core Presets ({STUDIO_PRESETS.length})
                    </span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {STUDIO_PRESETS.map((p) => {
                        const isSelected = selectedPresetId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPreset(p)}
                            className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all ${
                              isSelected
                                ? 'border-pink-500 bg-pink-50/40 ring-2 ring-pink-500/15 shadow-xs'
                                : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Color preview circle */}
                              <div
                                className="w-10 h-10 rounded-xl shrink-0 border border-black/10 shadow-xs flex items-center justify-center text-xs font-bold"
                                style={{
                                  background:
                                    p.background.type === 'transparent'
                                      ? '#ffffff'
                                      : `linear-gradient(135deg, ${p.background.topColor}, ${p.background.bottomColor || p.background.topColor})`,
                                }}
                              >
                                {p.ribbon.enabled && (
                                  <div
                                    className="w-5 h-2 rounded-full shadow-xs"
                                    style={{ backgroundColor: p.ribbon.color }}
                                  />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                  {p.name}
                                  {p.id === 'no-background' && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-bold">
                                      Transparent
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{p.subtitle}</p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-pink-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Backgrounds Management */}
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                          Custom Bakery Backgrounds
                        </span>
                        {customBackgrounds.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold">
                            {customBackgrounds.length}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddBackgroundModal(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 hover:bg-pink-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Background
                      </button>
                    </div>

                    {customBackgrounds.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-center bg-gray-50/50">
                        <p className="text-[11px] text-gray-500 mb-2">
                          No custom backgrounds added yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddBackgroundModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-600 text-[11px] font-bold hover:bg-pink-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Custom Wallpaper / Color
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {customBackgrounds.map((cb) => {
                          const isSelected = selectedPresetId === cb.id;
                          return (
                            <div
                              key={cb.id}
                              onClick={() => handleSelectPreset(cb)}
                              className={`p-2.5 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-pink-500 bg-pink-50/40 ring-2 ring-pink-500/15 shadow-xs'
                                  : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div
                                  className="w-10 h-10 rounded-xl shrink-0 border border-black/10 overflow-hidden flex items-center justify-center bg-cover bg-center shadow-xs"
                                  style={{
                                    background:
                                      cb.background.type === 'image' && cb.background.imageUrl
                                        ? `url(${cb.background.imageUrl}) center/cover no-repeat`
                                        : cb.background.type === 'solid'
                                        ? cb.background.topColor
                                        : `linear-gradient(135deg, ${cb.background.topColor}, ${cb.background.bottomColor || cb.background.topColor})`,
                                  }}
                                />
                                <div className="truncate">
                                  <div className="font-bold text-gray-900 text-xs truncate flex items-center gap-1.5">
                                    {cb.name}
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                      Custom
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 capitalize">
                                    {cb.background.type} background
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-pink-600" />}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomBackground(cb.id, cb.name);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remove this background"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: RIBBON & BADGES */}
              {activeTab === 'banner' && (
                <div className="space-y-5">
                  {/* Arched Ribbon Title */}
                  <div className="p-4 rounded-2xl border border-pink-100 bg-pink-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-pink-600" />
                        <h4 className="font-bold text-gray-900 text-xs">Arched Ribbon Title Banner</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studioSettings.ribbon.enabled}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              ribbon: { ...prev.ribbon, enabled: e.target.checked },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>

                    {studioSettings.ribbon.enabled && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                            Banner Title Text (Auto-synced with template)
                          </label>
                          <input
                            type="text"
                            value={studioSettings.ribbon.titleText || ''}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                ribbon: { ...prev.ribbon, titleText: e.target.value },
                              }))
                            }
                            placeholder="e.g. Red Ribbon, Chocolate Dedication"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Ribbon Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={studioSettings.ribbon.color || '#c01828'}
                                onChange={(e) =>
                                  setStudioSettings((prev) => ({
                                    ...prev,
                                    ribbon: { ...prev.ribbon, color: e.target.value },
                                  }))
                                }
                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                              />
                              <span className="text-[10px] text-gray-600 font-mono">
                                {studioSettings.ribbon.color}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Ribbon Style</label>
                            <select
                              value={studioSettings.ribbon.style}
                              onChange={(e) =>
                                setStudioSettings((prev) => ({
                                  ...prev,
                                  ribbon: { ...prev.ribbon, style: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                            >
                              <option value="arched-ribbon">Arched Ribbon</option>
                              <option value="curved-wave">Curved Wave Ribbon</option>
                              <option value="wavy-ribbon">Wavy Ribbon Banner</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="goldTrimCheck"
                            checked={studioSettings.ribbon.goldTrim}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                ribbon: { ...prev.ribbon, goldTrim: e.target.checked },
                              }))
                            }
                            className="rounded text-pink-500 focus:ring-pink-400"
                          />
                          <label htmlFor="goldTrimCheck" className="text-xs text-gray-700 font-medium cursor-pointer">
                            Golden Trim Edge Lines
                          </label>
                        </div>
                      </div>
                    )}
                  </div>



                  {/* Promo Headline Banner */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-pink-600" />
                        <h4 className="font-bold text-gray-900 text-xs">Promo Headline Text</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studioSettings.promo.enabled}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              promo: { ...prev.promo, enabled: e.target.checked },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>

                    {studioSettings.promo.enabled && (
                      <div className="space-y-2 pt-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Promo Main Headline</label>
                          <input
                            type="text"
                            value={studioSettings.promo.mainText || ''}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                promo: { ...prev.promo, mainText: e.target.value },
                              }))
                            }
                            placeholder="e.g. up to 50% off"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-pink-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Subtext</label>
                          <input
                            type="text"
                            value={studioSettings.promo.subText || ''}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                promo: { ...prev.promo, subText: e.target.value },
                              }))
                            }
                            placeholder="e.g. Special bakery selection"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MANUAL EDIT OF EACH PICTURE */}
              {activeTab === 'adjust' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-heading mb-1">
                      Manual Picture Framing & Adjustments
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      Fine-tune cake scale, offset, serving plate, and image lighting for the active angle.
                    </p>
                  </div>

                  {/* Scale & Position */}
                  <div className="space-y-3 p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <h4 className="font-bold text-gray-900 text-xs">Cake Size & Position</h4>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-600 font-medium">Scale (Zoom)</span>
                        <span className="font-mono font-semibold">{studioSettings.transform.scale}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.5"
                        step="0.05"
                        value={studioSettings.transform.scale}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            transform: { ...prev.transform, scale: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full accent-pink-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-600 font-medium">Position X</span>
                          <span className="font-mono">{studioSettings.transform.offsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-120"
                          max="120"
                          step="5"
                          value={studioSettings.transform.offsetX}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              transform: { ...prev.transform, offsetX: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-pink-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-600 font-medium">Position Y</span>
                          <span className="font-mono">{studioSettings.transform.offsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-120"
                          max="120"
                          step="5"
                          value={studioSettings.transform.offsetY}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              transform: { ...prev.transform, offsetY: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full accent-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image Color Filters */}
                  <div className="space-y-3 p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <h4 className="font-bold text-gray-900 text-xs">Lighting & Color Tone</h4>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-600 font-medium">Brightness</span>
                        <span className="font-mono">{studioSettings.filters.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-35"
                        max="35"
                        value={studioSettings.filters.brightness}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            filters: { ...prev.filters, brightness: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-pink-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-600 font-medium">Contrast</span>
                        <span className="font-mono">{studioSettings.filters.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-35"
                        max="35"
                        value={studioSettings.filters.contrast}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            filters: { ...prev.filters, contrast: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-pink-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-600 font-medium">Saturation</span>
                        <span className="font-mono">{studioSettings.filters.saturate}</span>
                      </div>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={studioSettings.filters.saturate}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            filters: { ...prev.filters, saturate: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full accent-pink-500"
                      />
                    </div>
                  </div>

                  {/* Reset picture button */}
                  <button
                    type="button"
                    onClick={handleResetActivePicture}
                    className="w-full py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset This Angle to Original Raw
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">
                {workingViews.length} picture angles ready
              </span>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" /> Save Pictures to Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADD CUSTOM BACKGROUND MODAL */}
      {showAddBackgroundModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveNewBackground();
            }}
            className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-pink-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm font-heading">Add Background</h3>
                  <p className="text-[11px] text-gray-500">Create a custom named background for your bakery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBackgroundModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Background Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBgName}
                  onChange={(e) => setNewBgName(e.target.value)}
                  placeholder="e.g. Birthday Pastel, Modern Velvet"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                  Background Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gradient', label: 'Gradient' },
                    { id: 'solid', label: 'Solid Color' },
                    { id: 'image', label: 'Wallpaper Image' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewBgType(t.id)}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        newBgType === t.id
                          ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {newBgType === 'gradient' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Top Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newBgTopColor}
                          onChange={(e) => setNewBgTopColor(e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer border border-gray-300 p-0.5"
                        />
                        <span className="text-xs font-mono text-gray-600">{newBgTopColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Bottom Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newBgBottomColor}
                          onChange={(e) => setNewBgBottomColor(e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer border border-gray-300 p-0.5"
                        />
                        <span className="text-xs font-mono text-gray-600">{newBgBottomColor}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Optional Mid Color */}
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      type="checkbox"
                      id="useMidColor"
                      checked={newBgUseMidColor}
                      onChange={(e) => setNewBgUseMidColor(e.target.checked)}
                      className="rounded text-pink-500 focus:ring-pink-400"
                    />
                    <label htmlFor="useMidColor" className="text-[10px] text-gray-600 font-medium cursor-pointer">
                      Use Mid Color (3-color gradient)
                    </label>
                  </div>
                  
                  {newBgUseMidColor && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Mid Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newBgMidColor}
                          onChange={(e) => setNewBgMidColor(e.target.value)}
                          className="w-9 h-9 rounded-xl cursor-pointer border border-gray-300 p-0.5"
                        />
                        <span className="text-xs font-mono text-gray-600">{newBgMidColor}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {newBgType === 'solid' && (
                <div className="pt-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Color Tone</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBgTopColor}
                      onChange={(e) => setNewBgTopColor(e.target.value)}
                      className="w-9 h-9 rounded-xl cursor-pointer border border-gray-300 p-0.5"
                    />
                    <span className="text-xs font-mono text-gray-600">{newBgTopColor}</span>
                  </div>
                </div>
              )}

              {newBgType === 'image' && (
                <div className="pt-1 space-y-2">
                  <label className="text-[10px] text-gray-500 block">Upload Wallpaper File</label>
                  <div
                    onClick={() => customBgImageInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/30 rounded-2xl p-4 text-center cursor-pointer transition-colors"
                  >
                    {newBgImageUrl ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={newBgImageUrl}
                          alt="Preview"
                          className="w-16 h-16 rounded-xl object-cover border border-gray-300 shadow-xs"
                        />
                        <div className="text-left">
                          <span className="text-xs font-bold text-gray-800 block">Image Loaded</span>
                          <span className="text-[10px] text-pink-600 hover:underline">Click to change</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-6 h-6 text-pink-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-gray-700 block">Select Wallpaper Image</span>
                        <span className="text-[10px] text-gray-400">PNG, JPG, or WEBP up to 5MB</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={customBgImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = (ev) => setNewBgImageUrl(ev.target?.result);
                        r.readAsDataURL(f);
                      }
                    }}
                  />
                </div>
              )}

              {/* Live Swatch Preview */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Preview</label>
                <div
                  className="w-full h-14 rounded-xl border border-gray-200 shadow-inner flex items-center justify-center text-xs font-bold text-gray-700"
                  style={{
                    background:
                      newBgType === 'image' && newBgImageUrl
                        ? `url(${newBgImageUrl}) center/cover no-repeat`
                        : newBgType === 'solid'
                        ? newBgTopColor
                        : newBgUseMidColor
                        ? `linear-gradient(135deg, ${newBgTopColor}, ${newBgMidColor}, ${newBgBottomColor})`
                        : `linear-gradient(135deg, ${newBgTopColor}, ${newBgBottomColor})`,
                  }}
                >
                  {newBgName || 'Background Preview'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddBackgroundModal(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all active:scale-98"
              >
                Save Background
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
