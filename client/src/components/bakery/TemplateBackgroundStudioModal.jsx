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
  Star,
  Tag,
  CheckCircle2,
  Copy,
  Wand2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  STUDIO_PRESETS,
  compositeTemplateImage,
} from '@/utils/templateBackgroundCompositor';

export default function TemplateBackgroundStudioModal({
  isOpen,
  onClose,
  views = [],
  templateName = 'Special Cake',
  onSaveViews,
}) {
  if (!isOpen) return null;

  // Working copy of views
  const [workingViews, setWorkingViews] = useState(() => {
    return (views && views.length > 0 ? views : []).map((v) => ({
      ...v,
      rawUrl: v.rawUrl || v.url, // preserve raw 3D or original image
    }));
  });

  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'banner' | 'adjust'
  const [selectedPresetId, setSelectedPresetId] = useState('red-ribbon-showcase');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState('');

  // Active studio settings
  const defaultPreset = STUDIO_PRESETS[0];
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

  // Re-composite active view whenever settings or active view changes
  useEffect(() => {
    if (!workingViews || workingViews.length === 0) return;
    const currentView = workingViews[activeAngleIndex];
    if (!currentView) return;

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

    renderTimeoutRef.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const compositeUrl = await compositeTemplateImage({
          cakeImageUrl: currentView.rawUrl || currentView.url,
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
    }, 120);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [studioSettings, activeAngleIndex]);

  // Select a preset
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setStudioSettings((prev) => ({
      ...prev,
      background: { ...preset.background },
      ribbon: { ...preset.ribbon, titleText: prev.ribbon.titleText || templateName },
      plate: { ...preset.plate },
      shadow: { ...preset.shadow },
      badge: { ...preset.badge },
      promo: { ...preset.promo },
    }));
    triggerFeedback(`Applied preset: ${preset.name}`);
  };

  // Apply current background & styles to ALL 8 angles
  const handleApplyToAllAngles = async () => {
    if (!workingViews || workingViews.length === 0) return;
    setIsProcessing(true);
    triggerFeedback('Applying background studio style to all pictures…');

    try {
      const updatedViews = await Promise.all(
        workingViews.map(async (view) => {
          const compositeUrl = await compositeTemplateImage({
            cakeImageUrl: view.rawUrl || view.url,
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
      triggerFeedback('✓ Successfully applied to all picture angles!');
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

      setWorkingViews((prev) =>
        prev.map((v, idx) =>
          idx === activeAngleIndex ? { ...v, rawUrl: customUrl, url: customUrl } : v
        )
      );

      // Re-composite with studio
      const compositeUrl = await compositeTemplateImage({
        cakeImageUrl: customUrl,
        templateName: studioSettings.ribbon.titleText || templateName,
        settings: studioSettings,
      });

      setWorkingViews((prev) =>
        prev.map((v, idx) =>
          idx === activeAngleIndex ? { ...v, url: compositeUrl } : v
        )
      );

      triggerFeedback('Custom photo loaded for this angle!');
    };
    reader.readAsDataURL(file);
  };

  // Reset active picture to raw
  const handleResetActivePicture = () => {
    setWorkingViews((prev) =>
      prev.map((v, idx) =>
        idx === activeAngleIndex ? { ...v, url: v.rawUrl || v.url } : v
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 uppercase tracking-wider">
                  Showcase Ad Creator
                </span>
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

        {/* Notification Toast */}
        {notification && (
          <div className="bg-pink-600 text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top-2 duration-150">
            {notification}
          </div>
        )}

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
              <div className="w-full max-w-[500px] aspect-square mx-auto rounded-2xl overflow-hidden bg-white border border-pink-200/80 shadow-lg relative group flex items-center justify-center">
                {showOriginal ? (
                  <img
                    src={activeView.rawUrl || activeView.url}
                    alt="Original raw"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <img
                    src={activeView.url}
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
                    <img src={v.url} alt={v.label} className="w-full h-full object-cover" />
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
              {/* TAB 1: STUDIO PRESETS */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-heading mb-1">
                      1-Click Marketing Presets
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      Instantly transform raw cake screenshots into eye-catching bakery promotional posters.
                    </p>
                  </div>

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
                                    : `linear-gradient(135deg, ${p.background.topColor}, ${p.background.bottomColor})`,
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
                                {p.id === 'red-ribbon-showcase' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                    Ad Banner Style
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

                  {/* Custom Background Colors */}
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <h4 className="font-bold text-gray-800 text-xs">Custom Gradient Colors</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Top Tone</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={studioSettings.background.topColor || '#f9a875'}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                background: { ...prev.background, type: 'gradient', topColor: e.target.value },
                              }))
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                          />
                          <span className="text-[10px] text-gray-600 font-mono">
                            {studioSettings.background.topColor}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Mid Tone</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={studioSettings.background.midColor || '#fbe2d2'}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                background: { ...prev.background, type: 'gradient', midColor: e.target.value },
                              }))
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                          />
                          <span className="text-[10px] text-gray-600 font-mono">
                            {studioSettings.background.midColor}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Bottom Tone</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={studioSettings.background.bottomColor || '#fde6eb'}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                background: { ...prev.background, type: 'gradient', bottomColor: e.target.value },
                              }))
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0.5"
                          />
                          <span className="text-[10px] text-gray-600 font-mono">
                            {studioSettings.background.bottomColor}
                          </span>
                        </div>
                      </div>
                    </div>
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
                              <option value="arched-ribbon">Arched Ribbon (Red Ribbon Style)</option>
                              <option value="modern-pill">Modern Pill Badge</option>
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

                  {/* Rating / Badge Tag */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <h4 className="font-bold text-gray-900 text-xs">Rating & Location Badge</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studioSettings.badge.enabled}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              badge: { ...prev.badge, enabled: e.target.checked },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>

                    {studioSettings.badge.enabled && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Badge Text</label>
                          <input
                            type="text"
                            value={studioSettings.badge.text || ''}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                badge: { ...prev.badge, text: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Subtitle / Location</label>
                          <input
                            type="text"
                            value={studioSettings.badge.subtitle || ''}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                badge: { ...prev.badge, subtitle: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                          />
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

                  {/* Serving Plate & Contact Shadow */}
                  <div className="space-y-3 p-4 rounded-2xl border border-gray-200 bg-white">
                    <h4 className="font-bold text-gray-900 text-xs">Serving Plate & Studio Shadow</h4>

                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-700 font-medium cursor-pointer">
                        Serving Plate Pedestal
                      </label>
                      <input
                        type="checkbox"
                        checked={studioSettings.plate.enabled}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            plate: { ...prev.plate, enabled: e.target.checked },
                          }))
                        }
                        className="rounded text-pink-500 focus:ring-pink-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-700 font-medium cursor-pointer">
                        Soft Floor Contact Shadow
                      </label>
                      <input
                        type="checkbox"
                        checked={studioSettings.shadow.enabled}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            shadow: { ...prev.shadow, enabled: e.target.checked },
                          }))
                        }
                        className="rounded text-pink-500 focus:ring-pink-400"
                      />
                    </div>

                    {studioSettings.shadow.enabled && (
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-600 font-medium">Shadow Darkness</span>
                          <span className="font-mono">{Math.round(studioSettings.shadow.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.8"
                          step="0.05"
                          value={studioSettings.shadow.opacity}
                          onChange={(e) =>
                            setStudioSettings((prev) => ({
                              ...prev,
                              shadow: { ...prev.shadow, opacity: parseFloat(e.target.value) },
                            }))
                          }
                          className="w-full accent-pink-500"
                        />
                      </div>
                    )}
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
    </div>
  );
}
