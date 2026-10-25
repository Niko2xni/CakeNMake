import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Search, Home, LayoutTemplate, Cake, Heart, PartyPopper, Palette, Sparkles, Layers, ArrowRight } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { TemplateRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { templateApi } from '@/services/api';
import classicBirthdayImage from '@/assets/cake1-choice.png';
import weddingEleganceImage from '@/assets/cake2-choice.png';
import funPartyImage from '@/assets/cake3-choice.png';
import romanticRoseImage from '@/assets/templates/romantic-rose.png';
import oceanBreezeImage from '@/assets/templates/ocean-breeze.png';
import gardenFreshImage from '@/assets/templates/garden-fresh.png';
import midnightChocolateImage from '@/assets/templates/midnight-chocolate.png';

const FALLBACK_TEMPLATES = [
  {
    id: 1,
    name: 'Classic Birthday',
    description: 'Perfect for celebrations',
    longDescription:
      'A timeless birthday cake with soft buttercream layers, playful piping, and a candle-ready top tier. Customizable with any flavor combination and color scheme.',
    price: '₱2,250',
    specs: ['Buttercream Cake', 'Frosting: Vanilla Buttercream'],
    views: [],
    image: classicBirthdayImage,
  },
  {
    id: 2,
    name: 'Wedding Elegance',
    description: 'Sophisticated and beautiful',
    longDescription:
      'A multi-tier showpiece finished in smooth white fondant with delicate sugar flowers. Designed to anchor the dessert table at your reception.',
    price: '₱4,500',
    specs: ['Fondant Cake', 'Frosting: White Fondant'],
    views: [],
    image: weddingEleganceImage,
  },
  {
    id: 3,
    name: 'Fun Party',
    description: 'Colorful and playful',
    longDescription:
      'A bright, confetti-packed cake built for birthdays and celebrations that call for a little chaos. Loaded with sprinkles inside and out.',
    price: '₱2,500',
    specs: ['Buttercream Cake', 'Frosting: Rainbow Buttercream'],
    views: [],
    image: funPartyImage,
  },
  {
    id: 4,
    name: 'Romantic Rose',
    description: 'Sweet and lovely',
    longDescription:
      'Hand-piped buttercream roses cascade across a soft blush base. A romantic choice for anniversaries, engagements, or Valentine’s Day.',
    price: '₱3,250',
    specs: ['Buttercream Cake', 'Frosting: Rose Buttercream'],
    views: [],
    image: romanticRoseImage,
  },
  {
    id: 5,
    name: 'Ocean Breeze',
    description: 'Fresh and cool',
    longDescription:
      'Cool blue ombre layers with a wave-like buttercream texture, finished with a scattering of edible pearls. A refreshing pick for summer events.',
    price: '₱2,750',
    specs: ['Buttercream Cake', 'Frosting: Blue Ombre Buttercream'],
    views: [],
    image: oceanBreezeImage,
  },
  {
    id: 6,
    name: 'Garden Fresh',
    description: 'Natural and wholesome',
    longDescription:
      'Earthy tones and hand-crafted sugar botanicals give this cake a natural, garden-grown feel. Pairs well with lemon, honey, or vanilla bean fillings.',
    price: '₱3,000',
    specs: ['Buttercream Cake', 'Frosting: Honey Buttercream'],
    views: [],
    image: gardenFreshImage,
  },
  {
    id: 7,
    name: 'Midnight Chocolate',
    description: 'Rich and indulgent',
    longDescription:
      'Deep chocolate layers wrapped in a glossy dark ganache drip. Built for chocolate lovers who want something bold and decadent.',
    price: '₱2,900',
    specs: ['Ganache Cake', 'Frosting: Dark Chocolate Ganache'],
    views: [],
    image: midnightChocolateImage,
  },
];

const FALLBACK_TEMPLATES_ROW_2 = [
  {
    id: 8,
    name: 'Strawberry Delight',
    description: 'Fresh and fruity',
    longDescription:
      'Layers of vanilla sponge with a fresh strawberry buttercream and a ring of glazed berries on top. A bright, fruity pick for spring and summer occasions.',
    price: '₱2,600',
    specs: ['Buttercream Cake', 'Frosting: Strawberry Buttercream'],
    views: [],
    image: romanticRoseImage,
  },
  {
    id: 9,
    name: 'Lemon Zest',
    description: 'Bright and tangy',
    longDescription:
      'A light lemon sponge layered with a citrus buttercream and candied lemon peel. A refreshing choice for spring gatherings and afternoon celebrations.',
    price: '₱2,400',
    specs: ['Buttercream Cake', 'Frosting: Lemon Buttercream'],
    views: [],
    image: gardenFreshImage,
  },
  {
    id: 10,
    name: 'Coffee Toffee',
    description: 'Bold and aromatic',
    longDescription:
      'Espresso-soaked layers wrapped in a coffee buttercream with a scatter of toffee bits on top. Built for the coffee lover in the room.',
    price: '₱2,750',
    specs: ['Buttercream Cake', 'Frosting: Coffee Buttercream'],
    views: [],
    image: midnightChocolateImage,
  },
  {
    id: 11,
    name: 'Mint Chocolate',
    description: 'Crisp and decadent',
    longDescription:
      'Rich chocolate sponge with layers of peppermint cream, coated in chocolate glaze and fresh mint sprigs. Cool, rich, and unforgettable.',
    price: '₱2,800',
    specs: ['Ganache Cake', 'Frosting: Peppermint Buttercream'],
    views: [],
    image: oceanBreezeImage,
  },
];

function formatDisplayPrice(template) {
  if (template.price) return template.price;
  if (template.priceMinor) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: template.priceMinor % 100 === 0 ? 0 : 2,
    }).format(template.priceMinor / 100);
  }
  return '₱2,500';
}

function normalizeTemplate(t) {
  const views = t.views && t.views.length > 0
    ? t.views
    : t.thumbnail
    ? [{ label: 'Front View', url: t.thumbnail }]
    : t.image
    ? [{ label: 'Front View', url: t.image }]
    : [{ label: 'Front View', url: classicBirthdayImage }];

  const specsList = Array.isArray(t.specs)
    ? t.specs.map((s) => (typeof s === 'object' ? `${s.label ? s.label + ': ' : ''}${s.value}` : String(s)))
    : [];

  return {
    ...t,
    id: t._id || t.id,
    price: formatDisplayPrice(t),
    views,
    specs: specsList,
  };
}

function TemplateCard({ template, onSelect }) {
  const normalized = normalizeTemplate(template);
  const mainImage = normalized.views[0]?.url || normalized.thumbnail || normalized.image;

  return (
    <div
      onClick={() => onSelect(normalized.id)}
      className="cn-template-card group bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer border border-pink-100/60 flex flex-col"
    >
      <div className="cn-template-card-media relative overflow-hidden aspect-video bg-pink-50">
        <img
          src={mainImage}
          alt={normalized.name}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />
        {normalized.views?.length > 1 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
            {normalized.views.length} Angles
          </span>
        )}
      </div>

      <div className="cn-template-card-content p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="cn-template-card-title text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-pink-600 transition-colors">
            {normalized.name}
          </h3>
          <p className="cn-template-card-desc text-xs text-gray-500 line-clamp-1 mt-0.5">
            {normalized.description || normalized.longDescription || 'Custom celebration cake'}
          </p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-pink-50 flex items-center justify-between">
          <span className="text-xs font-bold text-pink-600 tabular-nums">
            {normalized.price}
          </span>
          <span className="text-[11px] font-semibold text-gray-400 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all">
            View →
          </span>
        </div>
      </div>
    </div>
  );
}

function TemplateCarouselRow({ title, templates, onSelect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    checkScroll();
  }, [templates]);

  function scroll(dir) {
    const el = scrollRef.current;
    if (!el) return;
    setIsScrolling(true);
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(() => {
      checkScroll();
      setIsScrolling(false);
    }, 350);
  }

  function handleScroll() {
    checkScroll();
  }

  if (!templates || templates.length === 0) return null;

  return (
    <section className="cn-template-row mb-10 last:mb-0">
      <div className="cn-template-row-header flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-gray-800">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${title} left`}
            className="w-8 h-8 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label={`Scroll ${title} right`}
            className="w-8 h-8 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="cn-template-track-shell">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`cn-template-track flex gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isScrolling ? 'pointer-events-none' : ''
          }`}
        >
          {templates.map((template) => (
            <div key={template.id || template._id} className="cn-template-item flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px]">
              <TemplateCard template={template} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplateModal({ template, allTemplates, onSwitch, onClose, onSelectTemplate }) {
  const normalized = normalizeTemplate(template);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const total = normalized.views.length;
  const activeView = normalized.views[activeIndex] || normalized.views[0];
  const otherTemplates = allTemplates.filter((t) => (t._id || t.id) !== normalized.id);

  function goPrev() {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }

  function goNext() {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-start sm:items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-pink-100 overflow-hidden my-2 sm:my-6 max-h-[96dvh] flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-20 w-8 h-8 rounded-full bg-white/90 border border-pink-100 flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col md:flex-row">
            {/* Left: 8 angles viewer */}
            <div className="md:w-3/5 p-4 sm:p-6 bg-pink-50/40 flex flex-col justify-center border-b md:border-b-0 md:border-r border-pink-100 shrink-0">
              <div className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-none mx-auto aspect-square rounded-2xl overflow-hidden bg-white border border-pink-100 shadow-sm relative">
                <img src={activeView?.url} alt={normalized.name} className="w-full h-full object-cover" />
                {activeView?.label && (
                  <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] sm:text-xs font-bold backdrop-blur-xs">
                    {activeView.label} {activeView.angle ? `(${activeView.angle})` : ''}
                  </span>
                )}
              </div>

              {total > 1 && (
                <div className="flex items-center gap-1.5 sm:gap-2 mt-3 max-w-[280px] sm:max-w-[340px] md:max-w-none mx-auto w-full">
                  <button
                    onClick={goPrev}
                    aria-label="Previous image"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow-xs shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <div className="flex gap-1.5 sm:gap-2 flex-1 overflow-x-auto py-1 [scrollbar-width:none]">
                    {normalized.views.map((view, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        aria-label={`Show ${view.label}`}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          idx === activeIndex
                            ? 'border-pink-500 ring-2 ring-pink-200 scale-105'
                            : 'border-pink-100 hover:border-pink-300 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={view.url} alt={view.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goNext}
                    aria-label="Next image"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow-xs shrink-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Details, Specs, Customize Button */}
            <div className="md:w-2/5 p-4 sm:p-6 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600">
                  Preset Cake Template
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 mt-0.5">{normalized.name}</h2>
                <p className="text-lg sm:text-xl text-pink-600 font-bold mt-0.5 font-heading">{normalized.price}</p>

                <p className="text-xs text-gray-600 leading-relaxed my-2.5">
                  {normalized.longDescription || normalized.description}
                </p>

                {normalized.specs?.length > 0 && (
                  <div className="space-y-1 pt-2.5 border-t border-pink-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Specifications</p>
                    <div className="space-y-1">
                      {normalized.specs.map((spec, i) => (
                        <p key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                          {spec}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-pink-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(normalized)}
                  className="w-full py-2.5 sm:py-3 px-5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition-all shadow-md shadow-pink-500/25 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Customize in 3D Designer
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* More templates carousel in modal */}
          {otherTemplates.length > 0 && (
            <div className="border-t border-pink-100 p-3 sm:p-5 bg-gray-50/50">
              <p className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">More Cake Templates</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                {otherTemplates.slice(0, 6).map((t) => {
                  const norm = normalizeTemplate(t);
                  const thumb = norm.views[0]?.url || norm.thumbnail || norm.image;
                  return (
                    <button
                      key={norm.id}
                      type="button"
                      onClick={() => onSwitch(norm.id)}
                      className="group bg-white rounded-xl overflow-hidden border border-pink-100 p-1 text-left hover:border-pink-300 transition-all shadow-2xs"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-pink-50">
                        <img src={thumb} alt={norm.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-gray-800 truncate mt-1 px-0.5">{norm.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-pink-600 font-semibold px-0.5">{norm.price}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Templates({ onSelectTemplate }) {
  const navigate = useNavigate();
  const [sectionsData, setSectionsData] = useState([]);
  const [allTemplatesList, setAllTemplatesList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useDragToScroll();

  useEffect(() => {
    fetchDynamicTemplates();
  }, []);

  const fetchDynamicTemplates = async () => {
    try {
      const data = await templateApi.getPublicTemplates();
      setSectionsData(data?.sections || []);
      setAllTemplatesList(data?.allTemplates || []);
    } catch (err) {
      console.warn('Failed to fetch public templates:', err);
      setSectionsData([]);
      setAllTemplatesList([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = useMemo(() => {
    if (!selectedId) return null;
    return allTemplatesList.find((t) => (t._id || t.id) === selectedId) || null;
  }, [selectedId, allTemplatesList]);

  function matchesSearch(t) {
    if (!searchQuery.trim()) return true;
    const raw = searchQuery.trim().toLowerCase();
    const clean = raw.replace(/^#/, '').trim();
    const id = String(t._id || t.id || '').toLowerCase();
    const shortId6 = id.slice(-6);
    const shortId8 = id.slice(-8);

    const matchesId = id.includes(raw) || (clean && (id.includes(clean) || shortId6.includes(clean) || shortId8.includes(clean)));

    return (
      matchesId ||
      (t.name || '').toLowerCase().includes(raw) ||
      (t.description || '').toLowerCase().includes(raw) ||
      (t.longDescription || '').toLowerCase().includes(raw)
    );
  }

  function handleSelectTemplate(template) {
    const tplId = template._id || template.id;
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      navigate(`/designer?templateId=${tplId}`);
    }
    setSelectedId(null);
  }

  const hasAnyMatchingTemplates = useMemo(() => {
    if (!searchQuery.trim()) return sectionsData.some((s) => (s.templates || []).length > 0);
    return sectionsData.some((s) => (s.templates || []).some(matchesSearch));
  }, [sectionsData, searchQuery]);

  return (
    <div className="cn-app-page cn-templates-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <ClientNavbar />
      <div className="cn-templates-shell w-full px-6 md:px-10 py-6">
        <div className="cn-templates-content max-w-[1400px] mx-auto">
          {/* Hero / Search Section */}
          <div className="cn-page-header cn-template-hero max-w-3xl mx-auto text-center pt-6 pb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 mb-6 font-heading">
              What cake will you design today?
            </h1>

            <div className="relative max-w-2xl mx-auto">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cake templates"
                className="w-full pl-11 pr-10 py-3 rounded-full border border-pink-100 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm text-gray-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Template Carousel Rows */}
          {loading ? (
            <TemplateRowsSkeleton />
          ) : sectionsData.length === 0 ? (
            <div className="cn-home-state is-empty max-w-lg mx-auto text-center py-16">
              <Sparkles className="w-10 h-10 text-pink-400 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-xl font-bold font-heading text-gray-800 mb-1">No templates yet</h3>
              <p className="text-sm text-gray-500 mb-6">The bakery hasn't published any template designs yet. You can start creating your own cake from scratch!</p>
              <Link
                to="/designer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-medium text-sm transition-colors shadow-sm"
              >
                Start designing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : !hasAnyMatchingTemplates && searchQuery ? (
            <div className="cn-home-state is-empty max-w-lg mx-auto text-center py-16">
              <Search className="w-10 h-10 text-pink-300 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-xl font-bold font-heading text-gray-800 mb-1">No matching templates</h3>
              <p className="text-sm text-gray-500 mb-6">We couldn't find any cake templates matching "{searchQuery}". Try a different keyword or clear your search.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 font-medium text-sm transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            sectionsData.map((section) => {
              const filtered = (section.templates || []).filter(matchesSearch);
              if (filtered.length === 0 && searchQuery) return null;
              return (
                <TemplateCarouselRow
                  key={section._id || section.name}
                  title={section.name}
                  templates={filtered}
                  onSelect={setSelectedId}
                />
              );
            })
          )}
        </div>
      </div>

      {selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          allTemplates={allTemplatesList}
          onSwitch={setSelectedId}
          onClose={() => setSelectedId(null)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
    </div>
  );
}
