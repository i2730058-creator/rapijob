import { Link } from 'react-router-dom';
import { BadgeCheck, Clock3, MapPin, Wallet } from 'lucide-react';
import type { Technician } from '@/types';
import { Avatar } from './Avatar';
import { Rating } from './Rating';
import { buttonStyles } from './Button';
import { cn, formatDistance, formatPrice } from '@/lib/utils';

interface TechCardProps {
  tech: Technician;
  specialtyName?: string;
  distanceKm?: number;
  className?: string;
  compact?: boolean;
}

export function TechCard({ tech, specialtyName, distanceKm, className, compact = false }: TechCardProps) {
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <Avatar name={tech.name} size={compact ? 'lg' : 'xl'} />
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white',
              tech.available ? 'bg-emerald-500' : 'bg-slate-300',
            )}
            title={tech.available ? 'Disponible ahora' : 'No disponible'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/tecnico/${tech.id}`}
              className="font-display text-base font-bold text-ink transition hover:text-brand-600"
            >
              {tech.name}
            </Link>
            {tech.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 ring-1 ring-inset ring-brand-100">
                <BadgeCheck className="h-3 w-3" />
                Verificado
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-brand-600">
            {specialtyName ?? 'Servicio técnico'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Rating value={tech.rating} count={tech.reviewCount} />
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold',
                tech.available ? 'text-emerald-700' : 'text-slate-500',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  tech.available ? 'bg-emerald-500' : 'bg-slate-300',
                )}
              />
              {tech.available ? 'Disponible' : 'No disponible'}
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-3.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{tech.headline}</p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
          <MapPin className="h-3 w-3" />
          {tech.district}
          {distanceKm !== undefined && (
            <span className="font-semibold text-brand-600">· {formatDistance(distanceKm)}</span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
          <Clock3 className="h-3 w-3" />
          {tech.experienceYears} años de exp.
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Desde</p>
          <p className="flex items-center gap-1 font-display text-lg font-extrabold text-ink">
            <Wallet className="h-4 w-4 text-brand-500" />
            {formatPrice(tech.priceFrom)}
          </p>
        </div>
        <Link
          to={`/tecnico/${tech.id}`}
          className={buttonStyles({ variant: 'outline', size: 'sm', className: 'group-hover:border-brand-300 group-hover:text-brand-700' })}
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
