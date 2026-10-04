import { Skeleton } from '@/components/ui/skeleton';
import landingPageBackground from '@/assets/landing-page-bg.jpg';

export default function LandingPageSkeleton() {
  return (
    <div className="landing-page min-h-full" aria-hidden="true">
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <Skeleton className="h-8 w-36 bg-[#2c1713]/10" />
          <nav className="nav-links">
            <Skeleton className="h-4 w-12 bg-[#2c1713]/10" />
            <Skeleton className="h-4 w-20 bg-[#2c1713]/10" />
            <Skeleton className="h-4 w-16 bg-[#2c1713]/10" />
          </nav>
          <div className="nav-actions">
            <Skeleton className="h-11 w-36 rounded-full bg-[#ee4f84]/25" />
          </div>
          <Skeleton className="mobile-toggle h-10 w-10 rounded-full bg-[#2c1713]/10" />
        </div>
      </header>

      <main>
        <section
          className="landing-hero"
          style={{ backgroundImage: `url(${landingPageBackground})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(105deg, rgba(245,238,226,.99) 0%, rgba(245,238,226,.94) 38%, rgba(245,238,226,.68) 58%, rgba(245,238,226,.12) 100%)' }}
          />
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <Skeleton className="h-3 w-64 max-w-full bg-[#b52d60]/20" />
              <div className="mt-7 space-y-3">
                <Skeleton className="h-14 w-[min(31rem,90%)] bg-[#2c1713]/10 sm:h-20" />
                <Skeleton className="h-14 w-[min(25rem,78%)] bg-[#2c1713]/10 sm:h-20" />
                <Skeleton className="h-14 w-[min(29rem,86%)] bg-[#2c1713]/10 sm:h-20" />
              </div>
              <div className="mt-7 max-w-lg space-y-2">
                <Skeleton className="h-4 w-full bg-[#755762]/15" />
                <Skeleton className="h-4 w-[92%] bg-[#755762]/15" />
                <Skeleton className="h-4 w-[70%] bg-[#755762]/15" />
              </div>
              <div className="hero-actions">
                <Skeleton className="h-14 w-48 rounded-full bg-[#ee4f84]/30" />
                <Skeleton className="h-4 w-32 bg-[#2c1713]/10" />
              </div>
              <div className="hero-reassurance">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-[#efbd61]/50" />
                <Skeleton className="h-3 w-64 max-w-[75vw] bg-[#755762]/15" />
              </div>
            </div>
          </div>
        </section>

        <section className="occasion-strip">
          <div className="landing-container occasion-inner">
            <Skeleton className="my-auto h-5 w-40 bg-[#2c1713]/10" />
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-4 w-24 bg-[#755762]/15" />
              ))}
            </div>
          </div>
        </section>

        <section className="process-section">
          <div className="landing-container">
            <div className="process-heading">
              <div className="space-y-4">
                <Skeleton className="h-3 w-48 bg-[#b52d60]/20" />
                <Skeleton className="h-12 w-80 max-w-full bg-[#2c1713]/10" />
                <Skeleton className="h-12 w-64 max-w-full bg-[#2c1713]/10" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-[#755762]/15" />
                <Skeleton className="h-4 w-[90%] bg-[#755762]/15" />
                <Skeleton className="h-4 w-[72%] bg-[#755762]/15" />
              </div>
            </div>
            <div className="process-list">
              {[0, 1, 2].map((item) => (
                <div key={item} className="process-step">
                  <Skeleton className="h-8 w-10 bg-[#ee4f84]/20" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-48 max-w-full bg-[#2c1713]/10" />
                    <Skeleton className="h-4 w-full bg-[#755762]/15" />
                    <Skeleton className="h-4 w-[78%] bg-[#755762]/15" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
