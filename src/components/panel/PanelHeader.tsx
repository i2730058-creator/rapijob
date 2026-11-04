import type { ReactNode } from 'react';

export function PanelHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="container-rj py-7 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
