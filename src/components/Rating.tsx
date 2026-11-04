import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const starSizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };

export function Rating({ value, count, size = 'sm', showValue = true, className }: RatingProps) {
  const safe = Math.max(0, Math.min(5, value));
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, safe - i));
          return (
            <span key={i} className={cn('relative inline-block', starSizes[size])}>
              <Star className={cn('absolute inset-0 text-slate-200', starSizes[size])} fill="currentColor" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn('text-sun-500', starSizes[size])}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="text-xs font-semibold text-ink">
          {safe > 0 ? safe.toFixed(1) : 'Nuevo'}
          {count !== undefined && count > 0 && (
            <span className="ml-1 font-normal text-slate-500">({count})</span>
          )}
        </span>
      )}
      <span className="sr-only">
        {safe.toFixed(1)} de 5 estrellas {count ? `basado en ${count} opiniones` : ''}
      </span>
    </span>
  );
}

interface StarsInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarsInput({ value, onChange }: StarsInputProps) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          <Star
            className={cn(
              'h-8 w-8 transition-colors',
              star <= value ? 'text-sun-500' : 'text-slate-200',
            )}
            fill="currentColor"
            strokeWidth={star <= value ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}
