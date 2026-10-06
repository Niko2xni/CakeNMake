import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="cn-auth-page min-h-screen px-4">
      <Link to="/" className="cn-auth-brand" aria-label="CakeNMake home">
        Cake<span>N</span>Make
      </Link>

      <aside className="cn-auth-story" aria-hidden="true">
        <p className="cn-kicker">Your occasion starts here</p>
        <h2>A thoughtful cake begins with one clear idea.</h2>
        <p>Sign in, return to your designs, and keep every detail together.</p>
        <div className="cn-auth-orbit"><span>made<br /><em>for you</em></span></div>
      </aside>

      <main className="cn-auth-panel w-full max-w-md">
        <div className="text-center mb-8">
          {Icon ? (
            <div className="cn-auth-icon inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          ) : (
            <div className="w-14 h-14 mb-4 mx-auto" aria-hidden="true" />
          )}
          <h1 className="text-4xl font-medium tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="cn-auth-form bg-card rounded-2xl border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </main>
    </div>
  );
}
