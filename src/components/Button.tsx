import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'yellow' | 'dark' | 'outline' | 'ghost' | 'danger' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_10px_30px_-12px_rgba(21,101,255,0.75)] hover:bg-brand-700 hover:shadow-[0_14px_34px_-12px_rgba(21,101,255,0.8)] active:bg-brand-800',
  yellow:
    'bg-sun-500 text-ink shadow-[0_10px_30px_-14px_rgba(255,197,49,0.9)] hover:bg-sun-400 active:bg-sun-600',
  dark: 'bg-brand-950 text-white shadow-soft hover:bg-brand-900',
  outline:
    'border border-slate-200 bg-white text-ink shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  white: 'bg-white text-brand-700 shadow-soft hover:bg-brand-50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-6 text-sm',
  xl: 'h-14 gap-2.5 rounded-2xl px-7 text-base',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  full = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:pointer-events-none disabled:opacity-55',
    variants[variant],
    sizes[size],
    full && 'w-full',
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles({ variant, size, full, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
