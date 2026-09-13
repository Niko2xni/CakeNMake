import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CakeSlice, CircleDollarSign, Eye, Menu, Palette, Sparkles, X } from 'lucide-react';
import './Landing.css';
import heroCake from '@/assets/hero-cake.png';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const frostingRef = useRef(null);

  useEffect(() => {
    const sections = document.querySelectorAll('main section[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -55% 0px' });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Trigger Full-Width Glaze Drip on Scroll
  useEffect(() => {
    const target = frostingRef.current;
    if (!target) return;

    const dripObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            target.classList.remove('is-retracting');
            target.classList.add('is-dripping');
          } else if (entry.boundingClientRect.top > 0 && target.classList.contains('is-dripping')) {
            target.classList.remove('is-dripping');
            target.classList.add('is-retracting');
          }
        });
      },
      { threshold: 0.15 } // Triggers early as section approaches view
    );

    dripObserver.observe(target);
    return () => dripObserver.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <Link to="/" className="landing-brand" onClick={closeMenu}>
            <span className="brand-name">Cake<span>N</span>Make</span>
            <span className="brand-tagline">Design it. We bake it.</span>
          </Link>
          <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {[
              ['home', 'Home'],
              ['how-it-works', 'How it Works'],
              ['gallery', 'Gallery'],
              ['about', 'About Us'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className={activeSection === id ? 'active' : ''} onClick={closeMenu}>{label}</a>
            ))}
            <Link to="/login" className="mobile-login" onClick={closeMenu}>Log in</Link>
          </nav>
          <Link to="/login" className="nav-cta">Start Designing <span className="arrow"><ArrowRight size={16} aria-hidden="true" /></span></Link>
          <button className="mobile-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="home" style={{ '--hero-image': `url("${heroCake}")` }}>
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><Sparkles size={14} aria-hidden="true" />AI-Powered Cake Customization</div>
              <h1 className="hero-title">Bite into <span>Happiness.</span></h1>
              <p className="hero-description">Design your dream cake in 3D, see your creation come to life, and know the price as you customize every delicious detail.</p>
              <div className="hero-actions">
                <Link to="/login" className="primary-btn">Create Your Cake <span className="button-icon"><ArrowRight size={17} aria-hidden="true" /></span></Link>
                <a href="#how-it-works" className="text-btn">See how it works <ArrowRight size={16} aria-hidden="true" /></a>
              </div>
              <div className="trust"><div className="avatars"><span>C</span><span>M</span><span>J</span><span>A</span></div><p><strong>Made for cake lovers</strong><br />Your idea. Your design. Your cake.</p></div>
            </div>
          </div>
        </section>

        <section className="feature-wrap" aria-label="CakeNMake features">
          <div className="landing-container feature-bar">
            <Feature icon={Palette} title="3D Customization" text="Design every detail just the way you want." />
            <Feature icon={Eye} title="Realistic Preview" text="See your cake in 3D before you order." />
            <Feature icon={CircleDollarSign} title="Real-time Pricing" text="Instant price updates as you customize." />
            <Feature icon={CakeSlice} title="Made for You" text="Turn your idea into a cake worth celebrating." />
          </div>
        </section>

        {/* Story Section with Full Screen Glaze Overlay */}
        <section className="story" id="about">
          {/* Full Width Drip Visual */}
          <FrostingImage ref={frostingRef} className="full-width-glaze" />

          <div className="landing-container story-grid">
            <div className="story-copy">
              <div className="eyebrow"><Sparkles size={14} /> Delicious Crafting</div>
              <h2 className="story-title">Crafted with <span>Precision.</span></h2>
              <p className="story-text">
                Watch your designs transform into rich, layered visual masterpieces. Every drip, sprinkle, and layer is rendered live.
              </p>
            </div>

            <div className="story-visual" id="gallery">
              <div className="video-card">
                <div className="video-badge">
                  <Sparkles size={14} aria-hidden="true" />
                  <span>3D Designer Preview</span>
                </div>
                <div className="video-wrapper">
                  <video autoPlay loop muted playsInline poster={heroCake} className="cake-demo-video">
                    <source src="YOUR_VIDEO_URL_HERE.mp4" type="video/mp4" />
                  </video>
                  <div className="video-overlay" />
                </div>
                <div className="video-copy">
                  <div>
                    <strong>Real-time 3D Studio</strong>
                    <p>Watch customizations update live as you build</p>
                  </div>
                  <span className="live-indicator"><span className="dot" /> Demo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="process" id="how-it-works"><div className="landing-container"><div className="section-heading"><div className="eyebrow">Simple as cake</div><h2 className="section-title">From idea to <span>icing.</span></h2><p> CakeNMake makes customization visual, simple, and transparent. Build your cake step by step and see exactly what you're creating.</p></div><div className="steps"><Step number="01" icon={CakeSlice} title="Choose your base" text="Start with the cake size, shape, layers, and flavors available from your bakery." /><Step number="02" icon={Sparkles} title="Customize it" text="Personalize frosting, colors, decorations, piping, toppings, and more." /><Step number="03" icon={Eye} title="See it in 3D" text="Rotate and inspect your cake so you know what your finished design will look like." /><Step number="04" icon={CircleDollarSign} title="Place your order" text="Review your design and real-time price before sending your cake to the bakery." /></div></div></section>

        <section className="final-cta" id="create"><div className="landing-container"><div className="cta-card"><div className="eyebrow">Let's make something delicious</div><h2 className="cta-title">Your perfect cake is <span>waiting to be designed.</span></h2><p>Your idea deserves more than a template. Turn it into a 3D cake design and make your next celebration a little more yours.</p><Link to="/login" className="cta-button">Start Designing <ArrowRight size={17} aria-hidden="true" /></Link></div></div></section>
      </main>

      <footer><div className="landing-container footer-inner"><div className="footer-brand">Cake<span>N</span>Make</div><p>© 2026 CakeNMake. Design it. We bake it.</p><div className="footer-links"><a href="#about">About</a><a href="#how-it-works">How it works</a><Link to="/login">Log in</Link></div></div></footer>
    </div>
  );
}

// Forward Ref attached so IntersectionObserver targets the SVG directly
const FrostingImage = React.forwardRef(({ className = '' }, ref) => (
  <svg
    ref={ref}
    viewBox="0 0 1440 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <defs>
      <filter id="glaze-shadow" x="-5%" y="-5%" width="110%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#590d22" floodOpacity="0.15" />
      </filter>

      <linearGradient id="glaze-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff758f" />
        <stop offset="50%" stopColor="#ff4d6d" />
        <stop offset="100%" stopColor="#c9184a" />
      </linearGradient>

      <linearGradient id="shine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* Seamless Full-Width Drip Path */}
    <path
      d="M 0,0
         L 1440,0
         L 1440,110
         C 1360,130 1310,240 1240,240
         C 1170,240 1140,120 1060,120
         C 980,120 940,290 860,290
         C 780,290 740,150 670,150
         C 600,150 560,310 470,310
         C 380,310 350,140 270,140
         C 190,140 150,260 70,260
         C 30,260 10,160 0,130
         Z"
      fill="url(#glaze-gradient)"
      filter="url(#glaze-shadow)"
    />

    <path
      d="M 20,10 L 1420,10 C 1420,35 1340,65 1240,65 C 1120,65 1070,25 960,25 C 850,25 800,80 670,80 C 540,80 490,25 360,25 C 240,25 180,50 70,50 C 30,50 15,35 20,10 Z"
      fill="url(#shine-gradient)"
    />

    {/* Highlights on Drips */}
    <ellipse cx="470" cy="290" rx="22" ry="7" fill="#ffffff" fillOpacity="0.35" />
    <ellipse cx="860" cy="270" rx="18" ry="6" fill="#ffffff" fillOpacity="0.35" />
    <ellipse cx="1240" cy="222" rx="16" ry="5" fill="#ffffff" fillOpacity="0.35" />
  </svg>
));

function Feature({ icon: Icon, title, text }) {
  return <article className="feature"><div className="feature-icon"><Icon size={22} aria-hidden="true" /></div><div><h3>{title}</h3><p>{text}</p></div></article>;
}

function Step({ number, icon: Icon, title, text }) {
  return <article className="step"><span className="step-number">{number}</span><Icon className="step-icon" size={26} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>;
}
