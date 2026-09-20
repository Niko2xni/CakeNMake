import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  MousePointer2,
  Rotate3D,
  X,
} from 'lucide-react';
import heroCake from '@/assets/hero-cake.png';
import landingPageBackground from '@/assets/landing-page-bg.jpg';
import './Landing.css';

const navigation = [
  ['home', 'Home'],
  ['how-it-works', 'How it works'],
  ['about', 'About us'],
];

const occasions = ['Birthdays', 'Weddings', 'Anniversaries', 'Milestones', 'Just because'];

const processSteps = [
  {
    number: '01',
    title: 'Set the scene',
    text: 'Choose the size, shape, layers, and flavor that fit your celebration.',
  },
  {
    number: '02',
    title: 'Make it yours',
    text: 'Play with frosting, colors, piping, toppers, and a message that means something.',
  },
  {
    number: '03',
    title: 'Love every angle',
    text: 'Preview it in 3D, follow the price, and send a clear design to your baker.',
  },
];

const questions = [
  {
    title: 'Do I need design experience?',
    answer: 'Not at all. Start with the occasion, then build your cake one decision at a time. The preview keeps every choice easy to understand.',
  },
  {
    title: 'Will I see the price before ordering?',
    answer: 'Yes. Your estimate updates as you change the size, layers, finishes, and decorations, so you can design with your budget in mind.',
  },
  {
    title: 'Can a baker adjust my design?',
    answer: 'Your CakeNMake design is a clear starting point for the bakery. Final availability and any craft adjustments can be discussed before the order is confirmed.',
  },
  {
    title: 'What happens after I finish?',
    answer: 'Review the complete cake brief, save your design, and share it with the bakery so the conversation begins with everyone looking at the same cake.',
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  const scrollLockRef = useRef(false);
  const scrollAnimRef = useRef(null);
  const navContainerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const sections = document.querySelectorAll('.landing-page main section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-38% 0px -54% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateScrolledState = () => {
      const hero = document.getElementById('home');
      if (!hero) {
        setScrolled(window.scrollY > 80);
        return;
      }
      const heroRect = hero.getBoundingClientRect();
      // Transition to floating pill navbar when user scrolls past first section into next section
      const isPastHero = heroRect.bottom <= 130 || (window.scrollY > 100 && activeSection !== 'home');
      setScrolled(isPastHero);
    };

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    window.addEventListener('resize', updateScrolledState, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScrolledState);
      window.removeEventListener('resize', updateScrolledState);
    };
  }, [activeSection]);

  useEffect(() => {
    const reveals = document.querySelectorAll('[data-reveal]');
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    reveals.forEach((element) => revealObserver.observe(element));
    return () => revealObserver.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const activeNavId =
    activeSection === 'design-brief'
      ? 'how-it-works'
      : activeSection === 'questions'
      ? 'about'
      : activeSection;

  const updateIndicator = () => {
    if (!navContainerRef.current) return;
    const activeLink = navContainerRef.current.querySelector(`[data-nav-id="${activeNavId}"]`);
    if (activeLink) {
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setIndicatorStyle({
        left: linkRect.left - containerRect.left,
        width: linkRect.width,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeNavId]);

  const smoothScrollTo = (targetY, duration = 800) => {
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
    }
    const startY = window.scrollY;
    const difference = targetY - startY;
    if (Math.abs(difference) < 4) {
      scrollLockRef.current = false;
      return;
    }

    const startTime = performance.now();
    // EaseInOutCubic curve for cinematic smooth scroll
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + difference * ease);

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollLockRef.current = false;
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
  };

  const scrollToSection = (e, targetId) => {
    if (e) e.preventDefault();
    closeMenu();
    scrollLockRef.current = true;
    setActiveSection(targetId);

    if (targetId === 'home') {
      smoothScrollTo(0);
      return;
    }
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navOffset = 84;
      const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navOffset;
      smoothScrollTo(Math.max(0, targetPosition));
    } else {
      scrollLockRef.current = false;
    }
  };

  return (
    <div className="landing-page">
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''} ${menuOpen ? 'menu-is-open' : ''}`}>
        <div className="landing-container nav-inner">
          <Link to="/" className="landing-brand" onClick={(e) => scrollToSection(e, 'home')} aria-label="CakeNMake home">
            Cake<span>N</span>Make
          </Link>

          <nav
            ref={navContainerRef}
            className={`nav-links ${menuOpen ? 'is-open' : ''}`}
            aria-label="Main navigation"
          >
            {navigation.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                data-nav-id={id}
                className={activeNavId === id ? 'active' : ''}
                onClick={(e) => scrollToSection(e, id)}
              >
                {label}
              </a>
            ))}
            <span
              className="nav-indicator"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
              aria-hidden="true"
            />
            <Link to="/login" className="mobile-login" onClick={closeMenu}>Log in</Link>
            <Link to="/login" className="mobile-start" onClick={closeMenu}>Start designing</Link>
          </nav>

          <div className="nav-actions">
            <Link to="/login" className="nav-cta">
              Start designing
            </Link>
          </div>

          <button
            className="mobile-toggle"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="home" aria-labelledby="landing-hero-title">
          <img
            className="hero-background"
            src={landingPageBackground}
            alt=""
            aria-hidden="true"
          />
          <div className="landing-container hero-grid">
            <div className="hero-copy" data-reveal>
              <p className="editorial-kicker">You imagine it. We make it bakeable.</p>
              <h1 id="landing-hero-title">
                <span>A cake for the</span>
                <span>way <em>you</em></span>
                <span>celebrate.</span>
              </h1>
              <p className="hero-description">
                Choose the shape, finish, colors, and little details. See your cake in 3D,
                know the price as you go, then send a design your baker can bring to life.
              </p>
              <div className="hero-actions">
                <Link to="/login" className="primary-action">
                  Design your cake <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="text-action" onClick={(e) => scrollToSection(e, 'how-it-works')}>See how it works</a>
              </div>
              <p className="hero-reassurance">
                <span aria-hidden="true">✦</span> No design skills needed—just bring the occasion.
              </p>
            </div>
          </div>
        </section>

        <section className="occasion-strip" aria-label="Celebration occasions">
          <div className="landing-container occasion-inner">
            <p>What are we celebrating?</p>
            <div className="occasion-list">
              {occasions.map((occasion) => <span key={occasion}>{occasion}</span>)}
            </div>
          </div>
        </section>

        <section className="process-section" id="how-it-works">
          <div className="landing-container">
            <div className="process-heading" data-reveal>
              <div>
                <p className="editorial-kicker">Simple from the first click</p>
                <h2>From “I have an idea”<br />to “that’s the one.”</h2>
              </div>
              <p>
                CakeNMake keeps the fun parts of planning a cake and removes the guesswork.
                Three clear moments, one design that is ready to share.
              </p>
            </div>

            <div className="process-list">
              {processSteps.map((step) => (
                <article className="process-step" key={step.number} data-reveal>
                  <span className="step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="brief-section" id="design-brief">
          <div className="landing-container brief-grid">
            <div className="brief-board" aria-label="Example CakeNMake cake design brief" data-reveal>
              <div className="brief-toolbar">
                <span>Your cake brief</span>
                <span className="brief-status"><i /> Saved</span>
              </div>
              <div className="brief-preview">
                <img src={heroCake} alt="Cake shown inside the CakeNMake design preview" />
                <span className="preview-mode"><Rotate3D size={14} aria-hidden="true" /> Live 3D preview</span>
                <div className="preview-annotations" aria-hidden="true">
                  <span className="annotation-one">Cream drip</span>
                  <span className="annotation-two">Chocolate finish</span>
                </div>
              </div>
              <div className="brief-selections">
                <div><span>Finish</span><strong>Blush buttercream</strong></div>
                <div><span>Palette</span><span className="color-swatches"><i /><i /><i /></span></div>
                <div><span>Message</span><strong>Twenty & thriving</strong></div>
                <div><span>Estimate</span><strong>Updates as you design</strong></div>
              </div>
            </div>

            <div className="brief-copy" data-reveal>
              <p className="editorial-kicker">Clear enough to share</p>
              <h2>No more “something like this.”</h2>
              <p className="brief-lede">
                Build one visual cake brief with the details that usually get lost between
                inspiration photos, sketches, and chat messages.
              </p>
              <ul>
                <li><Check size={17} aria-hidden="true" /> See changes before committing</li>
                <li><Check size={17} aria-hidden="true" /> Keep the design and estimate together</li>
                <li><Check size={17} aria-hidden="true" /> Give your baker a clearer starting point</li>
              </ul>
              <Link to="/login" className="inline-link">Try the designer <ArrowRight size={17} /></Link>
              <aside className="brief-note">
                <span>Why it matters</span>
                <p>“Something like this” becomes one cake both you and your baker can see.</p>
              </aside>
            </div>
          </div>
        </section>

        <section className="craft-section" id="about">
          <div className="landing-container craft-grid">
            <div className="craft-art" aria-hidden="true" data-reveal>
              <span className="craft-orbit one" />
              <span className="craft-orbit two" />
              <p>made<br /><em>by hand</em></p>
              <span className="craft-spark">✦</span>
            </div>
            <div className="craft-copy" data-reveal>
              <p className="editorial-kicker light">Technology with a human finish</p>
              <h2>Designed digitally.<br /><em>Finished by human hands.</em></h2>
              <p>
                The screen helps you be specific. The baker brings the craft. The result
                should still feel personal, beautifully made, and unmistakably yours.
              </p>
              <p className="craft-proof"><Check size={16} aria-hidden="true" /> A clear brief gives your baker a practical starting point.</p>
              <div className="craft-signoff">
                <span>Our promise</span>
                <strong>Your idea stays at the heart of the cake.</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="questions-section" id="questions">
          <div className="landing-container questions-grid">
            <div className="questions-heading" data-reveal>
              <p className="editorial-kicker">Before you begin</p>
              <h2>A few good questions.</h2>
              <p>Everything you need to know before turning the first layer.</p>
              <Link to="/login" className="inline-link">Ready to make yours? <ArrowRight size={17} /></Link>
            </div>
            <div className="question-list" data-reveal>
              {questions.map((question, index) => (
                <details key={question.title} open={index === 0}>
                  <summary>{question.title}<ChevronDown size={19} aria-hidden="true" /></summary>
                  <p>{question.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-section">
          <div className="landing-container final-inner" data-reveal>
            <MousePointer2 className="final-cursor" size={32} aria-hidden="true" />
            <p className="editorial-kicker">Your occasion starts here</p>
            <h2>What should your next cake say about you?</h2>
            <p>Start with a blank cake. Add a little imagination.</p>
            <Link to="/login" className="primary-action">
              Start designing <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-main">
          <Link to="/" className="footer-brand" onClick={(e) => scrollToSection(e, 'home')}>Cake<span>N</span>Make</Link>
          <p>Designed by you. Made by a baker.</p>
          <div className="footer-links">
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How it works</a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')}>About</a>
            <Link to="/login">Log in</Link>
          </div>
        </div>
        <div className="landing-container footer-bottom">
          <span>© 2026 CakeNMake</span>
          <span>Made for celebrations big, small, and entirely your own.</span>
        </div>
      </footer>
    </div>
  );
}
