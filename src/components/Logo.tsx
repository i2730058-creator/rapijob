import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { mark: 'h-8 w-8', text: 'text-lg' },
  md: { mark: 'h-10 w-10', text: 'text-xl' },
  lg: { mark: 'h-12 w-12', text: 'text-2xl' },
};

export function Logo({ className, variant = 'dark', showText = true, size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        className={cn('shrink-0 drop-shadow-sm', s.mark)}
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
      >
        <rect width="44" height="44" rx="13" fill="url(#rj-logo-gradient)" />
        <path
          d="M25.4 7.5 13.2 24.1h6.6l-2.2 12.4 12.2-16.6h-6.6l2.2-12.4Z"
          fill="white"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="9.5" r="4.5" fill="#FFC531" stroke="white" strokeWidth="2" />
        <defs>
          <linearGradient id="rj-logo-gradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1565FF" />
            <stop offset="1" stopColor="#0B2447" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span
          className={cn(
            'font-display font-extrabold tracking-tight',
            s.text,
            variant === 'dark' ? 'text-ink' : 'text-white',
          )}
        >
          Rapi<span className={variant === 'dark' ? 'text-brand-500' : 'text-sun-400'}>Job</span>
        </span>
      )}
    </span>
  );
}
