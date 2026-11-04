import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
  light = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <span
            className={cn(
              'mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset',
              light
                ? 'bg-white/10 text-sun-300 ring-white/15'
                : 'bg-brand-50 text-brand-600 ring-brand-100',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', light ? 'bg-sun-400' : 'bg-brand-500')} />
            {eyebrow}
          </span>
        )}
        <h2
          className={cn(
            'font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[2.15rem] lg:leading-[1.15]',
            light ? 'text-white' : 'text-ink',
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn('mt-3 text-sm leading-relaxed sm:text-base', light ? 'text-brand-200' : 'text-slate-600')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
