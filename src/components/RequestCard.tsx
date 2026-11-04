import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Star,
  Wallet,
  X,
} from 'lucide-react';
import type { ServiceRequest } from '@/types';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { STATUS_META } from '@/lib/constants';
import { cn, formatDate, formatPrice } from '@/lib/utils';

interface RequestCardProps {
  request: ServiceRequest;
  role: 'cliente' | 'tecnico' | 'admin';
  specialtyName: string;
  onOpen?: () => void;
  onCancel?: () => void;
  onRate?: () => void;
  onAdvance?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
  className?: string;
}

const nextLabel: Record<string, string> = {
  pendiente: 'Aceptar solicitud',
  aceptada: 'Marcar en camino',
  en_camino: 'Iniciar servicio',
  en_servicio: 'Marcar completada',
};

export function RequestCard({
  request,
  role,
  specialtyName,
  onOpen,
  onCancel,
  onRate,
  onAdvance,
  onAccept,
  onReject,
  busy = false,
  className,
}: RequestCardProps) {
  const active = ['pendiente', 'aceptada', 'en_camino', 'en_servicio'].includes(request.status);
  const personName = role === 'cliente' ? request.techName : request.clientName;
  const personRole = role === 'cliente' ? 'Técnico asignado' : 'Cliente';

  return (
    <article className={cn('card overflow-hidden', className)}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={personName} size="md" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {personRole}
              </p>
              <p className="truncate font-display text-sm font-bold text-ink">{personName}</p>
              <p className="text-xs text-brand-600">{specialtyName}</p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{request.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              {formatDate(request.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-500" />
              {request.time}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">
                {request.district} · {request.address}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {request.status === 'completada' ? 'Costo final' : 'Precio referencial'}
              </p>
              <p className="inline-flex items-center gap-1 font-display text-base font-extrabold text-ink">
                <Wallet className="h-4 w-4 text-brand-500" />
                {formatPrice(request.price)}
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-300">|</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Folio</p>
              <p className="font-mono text-xs font-semibold text-slate-600">{request.folio}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {role === 'tecnico' && request.status === 'pendiente' && (
              <>
                <Button variant="outline" size="sm" onClick={onReject} disabled={busy}>
                  <X className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
                <Button variant="primary" size="sm" onClick={onAccept} disabled={busy}>
                  <Check className="h-3.5 w-3.5" />
                  Aceptar
                </Button>
              </>
            )}
            {role === 'tecnico' && active && request.status !== 'pendiente' && (
              <Button variant="primary" size="sm" onClick={onAdvance} disabled={busy}>
                {nextLabel[request.status]}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {role === 'cliente' && request.status === 'completada' && !request.rating && (
              <Button variant="yellow" size="sm" onClick={onRate} disabled={busy}>
                <Star className="h-3.5 w-3.5" />
                Calificar
              </Button>
            )}
            {role === 'cliente' && active && request.status !== 'en_servicio' && (
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                Cancelar
              </Button>
            )}
            {onOpen && (
              <Button variant="outline" size="sm" onClick={onOpen}>
                Ver detalle
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {role === 'cliente' && request.rating && (
          <div className="flex items-center gap-1.5 rounded-xl bg-sun-100/60 px-3 py-2 text-xs font-medium text-amber-800">
            <Star className="h-3.5 w-3.5 fill-sun-500 text-sun-500" />
            Calificaste este servicio con {request.rating}/5
          </div>
        )}
        {role === 'tecnico' && request.status === 'pendiente' && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {STATUS_META.pendiente.description} Responde lo antes posible para no perder el servicio.
          </p>
        )}
      </div>
    </article>
  );
}
