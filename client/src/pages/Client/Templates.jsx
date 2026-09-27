import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Home, LayoutTemplate, Cake, Heart, PartyPopper, Palette } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import classicBirthdayImage from '@/assets/cake1-choice.png';
import weddingEleganceImage from '@/assets/cake2-choice.png';
import funPartyImage from '@/assets/cake3-choice.png';
import romanticRoseImage from '@/assets/templates/romantic-rose.png';
import oceanBreezeImage from '@/assets/templates/ocean-breeze.png';
import gardenFreshImage from '@/assets/templates/garden-fresh.png';
import midnightChocolateImage from '@/assets/templates/midnight-chocolate.png';

const TEMPLATES = [
  {
    id: 1,
    name: 'Classic Birthday',
    description: 'Perfect for celebrations',
    longDescription:
      'A timeless birthday cake with soft buttercream layers, playful piping, and a candle-ready top tier. Customizable with any flavor combination and color scheme.',
    price: '$45',
    specs: ['Buttercream Cake', 'Frosting: Vanilla Buttercream'],
    views: [],
  },
  {
    id: 2,
    name: 'Wedding Elegance',
    description: 'Sophisticated and beautiful',
    longDescription:
      'A multi-tier showpiece finished in smooth white fondant with delicate sugar flowers. Designed to anchor the dessert table at your reception.',
    price: '$180',
    specs: ['Fondant Cake', 'Frosting: White Fondant'],
    views: [],
  },
  {
    id: 3,
    name: 'Fun Party',
    description: 'Colorful and playful',
    longDescription:
      'A bright, confetti-packed cake built for birthdays and celebrations that call for a little chaos. Loaded with sprinkles inside and out.',
    price: '$50',
    specs: ['Buttercream Cake', 'Frosting: Rainbow Buttercream'],
    views: [],
  },
  {
    id: 4,
    name: 'Romantic Rose',
    description: 'Sweet and lovely',
    longDescription:
      'Hand-piped buttercream roses cascade across a soft blush base. A romantic choice for anniversaries, engagements, or Valentine\u2019s Day.',
    price: '$65',
    specs: ['Buttercream Cake', 'Frosting: Rose Buttercream'],
    views: [],
  },
  {
    id: 5,
    name: 'Ocean Breeze',
    description: 'Fresh and cool',
    longDescription:
      'Cool blue ombre layers with a wave-like buttercream texture, finished with a scattering of edible pearls. A refreshing pick for summer events.',
    price: '$55',
    specs: ['Buttercream Cake', 'Frosting: Blue Ombre Buttercream'],
    views: [],
  },
  {
    id: 6,
    name: 'Garden Fresh',
    description: 'Natural and wholesome',
    longDescription:
      'Earthy tones and hand-crafted sugar botanicals give this cake a natural, garden-grown feel. Pairs well with lemon, honey, or vanilla bean fillings.',
    price: '$60',
    specs: ['Buttercream Cake', 'Frosting: Honey Buttercream'],
    views: [],
  },
  {
    id: 7,
    name: 'Midnight Chocolate',
    description: 'Rich and indulgent',
    longDescription:
      'Deep chocolate layers wrapped in a glossy dark ganache drip. Built for chocolate lovers who want something bold and decadent.',
    price: '$58',
    specs: ['Ganache Cake', 'Frosting: Dark Chocolate Ganache'],
    views: [],
  },
  {
    id: 8,
    name: 'Strawberry Delight',
    description: 'Fresh and fruity',
    longDescription:
      'Layers of vanilla sponge with a fresh strawberry buttercream and a ring of glazed berries on top. A bright, fruity pick for spring and summer occasions.',
    price: '$52',
    specs: ['Buttercream Cake', 'Frosting: Strawberry Buttercream'],
    views: [],
  },
];

const TEMPLATES_ROW_2 = [
  {
    id: 9,
    name: 'Lemon Zest',
    description: 'Bright and tangy',
    longDescription:
      'A light lemon sponge layered with a citrus buttercream and candied lemon peel. A refreshing choice for spring gatherings and afternoon celebrations.',
    price: '$48',
    specs: ['Buttercream Cake', 'Frosting: Lemon Buttercream'],
    views: [],
  },
  {
    id: 10,
    name: 'Coffee Toffee',
    description: 'Bold and aromatic',
    longDescription:
      'Espresso-soaked layers wrapped in a coffee buttercream with a scatter of toffee bits on top. Built for the coffee lover in the room.',
    price: '$55',
    specs: ['Buttercream Cake', 'Frosting: Coffee Buttercream'],
    views: [],
  },
  {
    id: 11,
    name: 'Mint Chocolate',
    description: 'Cool and rich',
    longDescription:
      'Dark chocolate layers paired with a cool mint ganache and a dusting of chocolate shavings. A crisp, refreshing twist on a classic chocolate cake.',
    price: '$56',
    specs: ['Ganache Cake', 'Frosting: Mint Ganache'],
    views: [],
  },
  {
    id: 12,
    name: 'Caramel Drizzle',
    description: 'Sweet and buttery',
    longDescription:
      'Soft vanilla layers finished with a salted caramel buttercream and a generous caramel drizzle running down the sides.',
    price: '$54',
    specs: ['Buttercream Cake', 'Frosting: Salted Caramel Buttercream'],
    views: [],
  },
  {
    id: 13,
    name: 'Blueberry Bliss',
    description: 'Fresh and fruity',
    longDescription:
      'A vanilla bean cake layered with blueberry compote and a light blueberry buttercream, topped with a scatter of fresh berries.',
    price: '$53',
    specs: ['Buttercream Cake', 'Frosting: Blueberry Buttercream'],
    views: [],
  },
  {
    id: 14,
    name: 'Pistachio Rose',
    description: 'Elegant and nutty',
    longDescription:
      'A delicate pistachio sponge paired with a rose-infused buttercream and a scatter of crushed pistachios. A refined choice for upscale events.',
    price: '$62',
    specs: ['Buttercream Cake', 'Frosting: Pistachio Buttercream'],
    views: [],
  },
  {
    id: 15,
    name: 'Velvet Dream',
    description: 'Classic and smooth',
    longDescription:
      'A rich red velvet cake layered with a tangy cream cheese frosting and a smooth, velvety crumb. A timeless favorite for any occasion.',
    price: '$57',
    specs: ['Cream Cheese Cake', 'Frosting: Cream Cheese Frosting'],
    views: [],
  },
  {
    id: 16,
    name: 'Honey Almond',
    description: 'Warm and nutty',
    longDescription:
      'A honey-sweetened almond cake with a light honey buttercream and toasted almond flakes pressed along the sides. Warm and comforting.',
    price: '$51',
    specs: ['Buttercream Cake', 'Frosting: Honey Almond Buttercream'],
    views: [],
  },
];

const TEMPLATE_IMAGES = [
  classicBirthdayImage,
  weddingEleganceImage,
  funPartyImage,
  romanticRoseImage,
  oceanBreezeImage,
  gardenFreshImage,
  midnightChocolateImage,
  romanticRoseImage,
  gardenFreshImage,
  classicBirthdayImage,
  weddingEleganceImage,
  classicBirthdayImage,
  oceanBreezeImage,
  weddingEleganceImage,
  romanticRoseImage,
  gardenFreshImage,
];

const applyTemplateArtwork = (template) => ({
  ...template,
  views: [{ url: TEMPLATE_IMAGES[template.id - 1], label: `${template.name} preview` }],
});

const DISPLAY_TEMPLATES = TEMPLATES.map(applyTemplateArtwork);
const DISPLAY_TEMPLATES_ROW_2 = TEMPLATES_ROW_2.map(applyTemplateArtwork);
const ALL_TEMPLATES = [...DISPLAY_TEMPLATES, ...DISPLAY_TEMPLATES_ROW_2];

const SLIDE_INTERVAL_MS = 1500;

const CATEGORY_CHIPS = [
  { label: 'Birthday', icon: Cake },
  { label: 'Wedding', icon: Heart },
  { label: 'Party', icon: PartyPopper },
  { label: 'Custom', icon: Palette },
];

function TemplateCard({ template, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const intervalRef = useRef(null);
  const fadeTimeoutRef = useRef(null);

  const thumbnail = template.views[0].url;
  const slideshow = useMemo(
    () => template.views.slice(1).map((v) => v.url),
    [template]
  );

  function handleMouseLeave() {
    setIsHovered(false);
  }

  useEffect(() => {
    if (isHovered && slideshow.length > 0) {
      intervalRef.current = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % slideshow.length);
      }, SLIDE_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
      setSlideIndex(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isHovered, slideshow]);

  const currentImage = isHovered ? slideshow[slideIndex] : thumbnail;

  // Crossfade: keep the previous image visible underneath while the new one fades in on top.
  const [baseImage, setBaseImage] = useState(currentImage);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    if (currentImage === baseImage) return;
    setOverlayImage(currentImage);
    setOverlayVisible(false);
    const raf = requestAnimationFrame(() => setOverlayVisible(true));
    fadeTimeoutRef.current = setTimeout(() => {
      setBaseImage(currentImage);
      setOverlayImage(null);
      setOverlayVisible(false);
    }, SLIDE_INTERVAL_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(template.id)}
      className="cn-template-card rounded-xl border border-pink-100 overflow-hidden bg-white/80 backdrop-blur-sm shadow-lg cursor-pointer transition-shadow hover:shadow-xl"
    >
      <div className="cn-template-card-media relative w-full aspect-[4/3] bg-pink-50 overflow-hidden">
        <img
          src={baseImage}
          alt={template.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {overlayImage && (
          <img
            src={overlayImage}
            alt={template.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
              overlayVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
      <div className="cn-template-card-copy px-3 py-2">
        <p className="cn-template-card-title font-medium text-gray-800 truncate">{template.name}</p>
        <p className="cn-template-card-description text-gray-400 truncate">{template.description}</p>
      </div>
    </div>
  );
}

function TemplateCarouselRow({ title, templates, onSelect }) {
  const scrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  function handleScroll() {
    setIsScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
  }

  useEffect(() => () => clearTimeout(scrollTimeoutRef.current), []);

  function scrollByPage(direction) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  }

  return (
    <section className="cn-template-row mb-10">
      <div className="cn-template-row-header flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="cn-template-row-controls flex gap-2">
          <button
            onClick={() => scrollByPage(-1)}
            aria-label="Previous templates"
            className="w-8 h-8 rounded-full border border-pink-100 bg-white flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollByPage(1)}
            aria-label="Next templates"
            className="w-8 h-8 rounded-full border border-pink-100 bg-white flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="cn-template-track-shell">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`cn-template-track flex overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isScrolling ? 'pointer-events-none' : ''
          }`}
        >
          {templates.map((template) => (
            <div key={template.id} className="cn-template-item flex-shrink-0">
              <TemplateCard template={template} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplateModal({ template, allTemplates, onSwitch, onClose, onSelectTemplate }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [template.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const total = template.views.length;
  const activeView = template.views[activeIndex];
  const otherTemplates = allTemplates.filter((t) => t.id !== template.id);

  function goPrev() {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % total);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 overflow-y-auto [animation:fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center px-4 pt-10 pb-10">
        <div
          className="relative w-full max-w-[1080px] bg-white rounded-2xl shadow-2xl [animation:modalPop_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left: main image, indicators flanked by prev/next arrows */}
          <div className="md:w-3/5 p-5 flex flex-col">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-pink-50">
              <img src={activeView.url} alt={template.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="w-7 h-7 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-2 flex-1 overflow-x-auto">
                {template.views.map((view, idx) => (
                  <button
                    key={view.url}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Show ${view.label}`}
                    className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                      idx === activeIndex
                        ? 'border-pink-500'
                        : 'border-pink-100 hover:border-pink-300'
                    }`}
                  >
                    <img src={view.url} alt={view.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <button
                onClick={goNext}
                aria-label="Next image"
                className="w-7 h-7 rounded-full bg-white border border-pink-100 flex items-center justify-center text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors shadow flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: name, price, promotional description, cake specs, select button */}
          <div className="md:w-2/5 p-5 pt-12 md:pt-5 flex flex-col border-t md:border-t-0 md:border-l border-pink-100">
            {/* 1. Name */}
            <h2 className="text-xl font-bold text-gray-900 text-right md:text-left mb-1">{template.name}</h2>

            {/* 2. Price, its own row */}
            <p className="text-base text-pink-500 font-semibold text-right md:text-left mb-3">{template.price}</p>

            {/* 3. Promotional description */}
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{template.longDescription}</p>

            {/* 4. Cake specs */}
            <div className="space-y-1 mb-5">
              {template.specs.map((spec) => (
                <p key={spec} className="text-xs text-gray-700">{spec}</p>
              ))}
            </div>

            <button
              onClick={() => onSelectTemplate(template)}
              className="mt-auto w-full py-2.5 text-sm rounded-full bg-pink-500 text-white font-semibold hover:bg-pink-600 transition-colors"
            >
              Select This Template
            </button>
          </div>
        </div>

        {/* More templates, browsable without leaving the modal */}
        <div className="border-t border-pink-100 p-5">
          <p className="text-xs font-semibold text-gray-700 mb-2.5">More Templates</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {otherTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} onSelect={onSwitch} />
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function Templates({ onSelectTemplate }) {
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedTemplate = ALL_TEMPLATES.find((t) => t.id === selectedId) || null;

  function matchesSearch(t) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }

  const filteredTemplates = DISPLAY_TEMPLATES.filter(matchesSearch);
  const filteredTemplatesRow2 = DISPLAY_TEMPLATES_ROW_2.filter(matchesSearch);

  function handleSelectTemplate(template) {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      // Wire this up to your router, e.g.:
      // navigate('/cake-scene', { state: { template } })
      console.log('Navigate to Cake Scene with template:', template);
    }
    setSelectedId(null);
  }

  return (
    <div className="cn-app-page cn-templates-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 ml-[70px]">
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <ClientNavbar />
      <div className="cn-templates-shell w-full px-6 md:px-10 py-6">
        <div className="cn-templates-content mx-auto">
          {/* Hero / search section */}
          <div className="cn-page-header cn-template-hero max-w-3xl mx-auto text-center pt-6 pb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 mb-6">
              What cake will you design today?
            </h1>

            <div className="flex items-center justify-center gap-2 mb-5">
              <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-pink-100 bg-white text-gray-600 hover:bg-pink-50 transition-colors">
                <Home className="w-4 h-4" />
                Home
              </button>
              <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-pink-500 bg-pink-500 text-white">
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </button>
            </div>

            <div className="relative max-w-2xl mx-auto mb-5">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cake templates"
                className="w-full pl-11 pr-4 py-3 rounded-full border border-pink-100 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm text-gray-700"
              />
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {CATEGORY_CHIPS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-pink-100 bg-white text-gray-600 hover:bg-pink-50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-pink-400" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <TemplateCarouselRow
            title="Mamshie Classics"
            templates={filteredTemplates}
            onSelect={setSelectedId}
          />

          <TemplateCarouselRow
            title="Seasonal Favorites"
            templates={filteredTemplatesRow2}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          allTemplates={ALL_TEMPLATES}
          onSwitch={setSelectedId}
          onClose={() => setSelectedId(null)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
    </div>
  );
}
