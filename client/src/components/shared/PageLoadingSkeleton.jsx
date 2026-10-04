import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import LandingPageSkeleton from '@/components/shared/LandingPageSkeleton';

function ClientNavigationSkeleton() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[84px] flex-col items-center gap-6 border-r border-[var(--cn-line,rgba(44,23,19,0.16))] bg-[var(--cn-cream,#fffaf2)] py-4 md:flex">
        <Skeleton className="h-10 w-10 rounded-xl bg-primary/10" />
        {[0, 1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-9 w-9 rounded-xl bg-primary/10" />
        ))}
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-10 grid h-[68px] grid-cols-5 border-t border-[var(--cn-line,rgba(44,23,19,0.16))] bg-[var(--cn-cream,#fffaf2)] p-2 md:hidden">
        {[0, 1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-10 rounded-xl bg-primary/10" />
        ))}
      </div>
    </>
  );
}

function DesignCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-[var(--cn-line,rgba(44,23,19,0.16))] bg-[var(--cn-cream,#fffaf2)] p-3 shadow-sm">
          <Skeleton className="aspect-[16/10] w-full rounded-xl bg-black/5" />
          <Skeleton className="mt-4 h-4 w-3/5 bg-black/5" />
          <Skeleton className="mt-2 h-3 w-2/5 bg-black/5" />
        </div>
      ))}
    </div>
  );
}

export function TemplateRowsSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((row) => (
        <section key={row}>
          <Skeleton className="mb-4 h-6 w-44 bg-black/5" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="w-36 shrink-0 rounded-xl border border-[var(--cn-line,rgba(44,23,19,0.16))] bg-[var(--cn-cream,#fffaf2)] p-2 sm:w-48">
                <Skeleton className="aspect-square w-full rounded-lg bg-black/5" />
                <Skeleton className="mx-1 mt-3 h-3 w-3/4 bg-black/5" />
                <Skeleton className="mx-1 mt-2 h-3 w-1/2 bg-black/5" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AdminRowsSkeleton({ count = 6, avatar = false }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-pink-100 p-4">
          {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ClientPage({ children, wide = false }) {
  return (
    <div className="min-h-full bg-[var(--cn-paper,#f5eee2)]">
      <ClientNavigationSkeleton />
      <main className={`mx-auto space-y-7 px-5 py-8 sm:px-8 md:ml-[84px] ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {children}
      </main>
    </div>
  );
}

export function AdminPageSkeleton({ children }) {
  return (
    <div className="flex min-h-full bg-pink-50">
      <aside className="hidden w-[70px] shrink-0 border-r border-pink-100 bg-white p-4 md:flex md:flex-col md:items-center md:gap-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-9 w-9 rounded-xl" />)}
      </aside>
      <main className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="flex h-[calc(100dvh-2rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminHeaderSkeleton({ lines = 2 }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-pink-100 px-6 py-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        {lines > 1 && <Skeleton className="h-3 w-64 max-w-full" />}
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </header>
  );
}

function TableSkeleton({ summary = false }) {
  return (
    <AdminPageSkeleton>
      <AdminHeaderSkeleton />
      {summary && (
        <div className="grid grid-cols-1 gap-3 border-b border-pink-100 p-5 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 rounded-xl border border-pink-100 p-4">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-hidden p-4">
        <AdminRowsSkeleton avatar />
      </div>
    </AdminPageSkeleton>
  );
}

function ChatSkeleton() {
  return (
    <AdminPageSkeleton>
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <section className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-pink-100 p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full rounded-full" />
          <AdminRowsSkeleton count={5} avatar />
        </section>
        <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-pink-100">
          <div className="flex items-center gap-3 border-b border-pink-100 p-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex-1 space-y-5 p-6">
            <Skeleton className="h-12 w-2/5 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
            <Skeleton className="h-16 w-1/3 rounded-2xl" />
          </div>
          <Skeleton className="m-4 h-11 rounded-full" />
        </section>
      </div>
    </AdminPageSkeleton>
  );
}

function DesignerSkeleton({ admin = false }) {
  const page = (
    <div className="flex h-full min-h-[500px] min-w-0 gap-4 p-4">
      <section className="hidden w-64 shrink-0 space-y-4 rounded-2xl border border-pink-100 bg-white p-4 lg:block">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </section>
      <Skeleton className="min-h-[400px] min-w-0 flex-1 rounded-2xl" />
      <section className="hidden w-80 shrink-0 space-y-4 rounded-2xl border border-pink-100 bg-white p-4 sm:block">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>
    </div>
  );
  return admin ? (
    <AdminPageSkeleton>{page}</AdminPageSkeleton>
  ) : (
    <div className="min-h-full bg-gradient-to-br from-pink-50 to-orange-50">
      <header className="flex h-14 items-center justify-between border-b border-pink-100 bg-white/80 px-4">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </header>
      {page}
    </div>
  );
}

function AuthFormSkeleton({ title = "Welcome back", subtitle = "Choose how you'd like to sign in" }) {
  return (
    <div className="cn-auth-page min-h-screen px-4 bg-[var(--cn-paper,#f5eee2)]">
      <div className="cn-auth-brand" aria-hidden="true">
        Cake<span>N</span>Make
      </div>

      <aside className="cn-auth-story" aria-hidden="true">
        <p className="cn-kicker">Your occasion starts here</p>
        <h2>A thoughtful cake begins with one clear idea.</h2>
        <p>Sign in, return to your designs, and keep every detail together.</p>
        <div className="cn-auth-orbit">
          <span>made<br /><em>for you</em></span>
        </div>
      </aside>

      <main className="cn-auth-panel w-full max-w-md">
        <div className="text-center mb-8">
          <div className="cn-auth-icon inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary mb-4 shadow-sm">
            <LogIn className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>

        <div className="cn-auth-form bg-card rounded-2xl border border-border p-8 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl bg-black/5" />
          <Skeleton className="h-12 w-full rounded-xl bg-black/5" />
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-border/40" />
            <span className="px-3 text-[10px] text-muted-foreground uppercase font-medium">OR</span>
            <div className="flex-1 border-t border-border/40" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-12 rounded bg-black/5" />
            <Skeleton className="h-12 w-full rounded-xl bg-black/5" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl bg-primary/30" />
        </div>
      </main>
    </div>
  );
}

function PageSkeletonContent({ path }) {
  if (path === '/') return <LandingPageSkeleton />;
  if (path === '/client') {
    return <ClientPage wide><Skeleton className="mx-auto h-10 w-2/3" /><Skeleton className="mx-auto h-11 w-full max-w-xl rounded-full" /><div className="space-y-4"><Skeleton className="h-6 w-40" /><DesignCards /></div></ClientPage>;
  }
  if (path === '/templates') {
    return <ClientPage wide><Skeleton className="mx-auto h-12 w-3/4 max-w-2xl" /><Skeleton className="mx-auto h-11 w-full max-w-2xl rounded-full" /><TemplateRowsSkeleton /></ClientPage>;
  }
  if (path === '/trash') {
    return <ClientPage wide><Skeleton className="mx-auto h-10 w-36" /><Skeleton className="h-14 w-full rounded-xl" /><DesignCards count={3} /></ClientPage>;
  }
  if (path === '/profile') {
    return <ClientPage><Skeleton className="h-9 w-48" /><div className="grid gap-5 md:grid-cols-2"><section className="space-y-4 rounded-2xl border border-pink-100 bg-white p-6"><Skeleton className="mx-auto h-24 w-24 rounded-full" />{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-11 w-full rounded-xl" />)}</section><section className="space-y-4 rounded-2xl border border-pink-100 bg-white p-6"><Skeleton className="h-6 w-1/2" />{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full rounded-xl" />)}</section></div></ClientPage>;
  }
  if (path === '/settings') {
    return <ClientPage><Skeleton className="h-9 w-48" />{[0, 1, 2].map((item) => <section key={item} className="space-y-4 rounded-2xl border border-pink-100 bg-white p-6"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-12 w-full rounded-xl" /></section>)}</ClientPage>;
  }
  if (path === '/chats') {
    return <ClientPage wide><div className="flex h-[70dvh] min-h-[500px] overflow-hidden rounded-2xl border border-pink-100 bg-white"><section className="hidden w-80 shrink-0 space-y-3 border-r border-pink-100 p-4 sm:block"><Skeleton className="h-7 w-40" /><Skeleton className="h-10 w-full rounded-full" /><AdminRowsSkeleton count={5} avatar /></section><section className="flex min-w-0 flex-1 flex-col p-5"><Skeleton className="h-10 w-full" /><div className="flex-1 space-y-5 py-8"><Skeleton className="h-16 w-2/5 rounded-2xl" /><Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" /><Skeleton className="h-20 w-1/3 rounded-2xl" /></div><Skeleton className="h-12 w-full rounded-xl" /></section></div></ClientPage>;
  }
  if (path === '/cake-ai') {
    return <ClientPage wide><div className="flex h-[70dvh] min-h-[500px] overflow-hidden rounded-2xl border border-pink-100 bg-white"><section className="hidden w-72 shrink-0 space-y-4 border-r border-pink-100 p-4 md:block"><Skeleton className="h-8 w-full rounded-full" /><AdminRowsSkeleton count={6} /></section><section className="flex min-w-0 flex-1 flex-col p-5"><Skeleton className="h-8 w-52" /><div className="flex-1 space-y-6 py-12"><Skeleton className="h-14 w-3/5 rounded-2xl" /><Skeleton className="ml-auto h-20 w-3/4 rounded-2xl" /></div><Skeleton className="h-16 w-full rounded-2xl" /></section></div></ClientPage>;
  }
  if (path === '/designer') return <DesignerSkeleton />;
  if (path === '/bakery/designer') return <DesignerSkeleton />;
  if (path === '/bakery/chats') return <ChatSkeleton />;
  if (path === '/bakery/reservations') return <TableSkeleton />;
  if (path === '/bakery/transactions') return <TableSkeleton summary />;
  if (path === '/bakery/blueprints') return <TableSkeleton />;
  if (path === '/bakery/billing') return <AdminPageSkeleton><AdminHeaderSkeleton /><div className="flex-1 space-y-6 overflow-hidden p-6"><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div><Skeleton className="h-8 w-48" /><AdminRowsSkeleton count={4} /></div></AdminPageSkeleton>;
  if (path === '/bakery/pricing') return <AdminPageSkeleton><div className="flex flex-1 gap-5 overflow-hidden p-5"><section className="hidden w-64 shrink-0 space-y-4 lg:block"><Skeleton className="h-8 w-full" />{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-11 w-full rounded-xl" />)}</section><section className="flex-1 space-y-5"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-8 w-1/3" />{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}</section></div></AdminPageSkeleton>;
  if (path === '/bakery/templates') return <AdminPageSkeleton><AdminHeaderSkeleton /><div className="flex-1 space-y-7 overflow-hidden p-5"><div className="flex gap-4"><Skeleton className="h-24 w-24 rounded-xl" /><Skeleton className="h-24 flex-1 rounded-xl" /></div><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="aspect-square rounded-xl" />)}</div></div></AdminPageSkeleton>;
  if (path === '/bakery/assets') return <AdminPageSkeleton><AdminHeaderSkeleton /><div className="flex-1 space-y-5 overflow-hidden p-5"><Skeleton className="h-10 w-64 rounded-full" /><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="aspect-square rounded-xl" />)}</div></div></AdminPageSkeleton>;
  if (path === '/bakery/profile') return <AdminPageSkeleton><AdminHeaderSkeleton /><div className="flex-1 space-y-5 overflow-hidden p-6"><div className="flex items-center gap-4 border-b border-pink-100 pb-5"><Skeleton className="h-20 w-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-4 w-56" /></div></div>{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full rounded-xl" />)}</div></AdminPageSkeleton>;
  if (path === '/bakery') return <AdminPageSkeleton><AdminHeaderSkeleton /><div className="grid flex-1 gap-4 p-5 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-40 rounded-xl" />)}</div></AdminPageSkeleton>;
  if (path === '/login') return <AuthFormSkeleton title="Welcome back" subtitle="Choose how you'd like to sign in" />;
  if (path === '/forgot-password') return <AuthFormSkeleton title="Reset your password" subtitle="We'll send you an OTP to verify your account" />;
  if (path === '/reset-password') return <AuthFormSkeleton title="Set a new password" subtitle="Create a secure new password for your account" />;
  if (path === '/login-success') return <div className="flex min-h-screen items-center justify-center bg-[var(--cn-paper,#f5eee2)]"><div className="space-y-4 rounded-2xl border border-border bg-card p-8 shadow-xl"><Skeleton className="mx-auto h-10 w-10 rounded-full" /><Skeleton className="h-5 w-48" /></div></div>;
  return <div className="flex min-h-screen items-center justify-center bg-[var(--cn-paper,#f5eee2)] p-6"><div className="w-full max-w-5xl space-y-6"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-80 w-full rounded-3xl" /><Skeleton className="h-12 w-40 rounded-full" /></div></div>;
}

export default function PageLoadingSkeleton({ path: explicitPath }) {
  const location = useLocation();
  const path = explicitPath || location.pathname;
  const routePath = path === '/' ? '/' : path.replace(/\/+$/, '') || '/';
  const isAuthRoute = ['/login', '/forgot-password', '/reset-password', '/login-success'].includes(routePath);
  const isClientRoute = ['/client', '/templates', '/trash', '/profile', '/settings', '/chats', '/cake-ai'].includes(routePath);

  return (
    <div
      className={`fixed inset-0 z-[200] overflow-y-auto ${
        isAuthRoute || isClientRoute ? 'bg-[var(--cn-paper,#f5eee2)]' : 'bg-pink-50'
      }`}
      role="status"
      aria-label={`Loading ${routePath === '/' ? 'home page' : 'page'}`}
    >
      <PageSkeletonContent path={routePath} />
      <span className="sr-only">Loading page content</span>
    </div>
  );
}
