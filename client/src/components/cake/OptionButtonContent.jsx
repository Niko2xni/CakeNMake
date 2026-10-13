import React from 'react';
import { X } from 'lucide-react';

export default function OptionButtonContent({ selected, canDeselect = false, label, children, iconClassName = '' }) {
  if (!canDeselect || !selected) return children;

  return (
    <>
      <span className="sr-only">{label}</span>
      <span className="invisible" aria-hidden="true">{children}</span>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <X className={`h-5 w-5 ${iconClassName}`} strokeWidth={3} />
      </span>
    </>
  );
}
