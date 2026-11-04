import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { ServiceRequest } from '@/types';
import { Avatar } from '@/components/Avatar';
import { Rating } from '@/components/Rating';
import { StatusBadge } from '@/components/StatusBadge';
import { RequestTimeline } from '@/components/RequestTimeline';
import { MapView } from '@/components/MapView';
import { SpecialtyIcon } from '@/components/SpecialtyIcon';
import { useData } from '@/context/DataContext';
import { STATUS_META } from '@/lib/constants';
import { formatDate, formatDistance, formatPrice, haversineKm } from '@/lib/utils';

export function RequestDetail({
  request,
  role,
  actions,
}: {
  request: ServiceRequest;
  role: 'cliente' | 'tecnico' | 'admin';
  actions?: ReactNode;
}) {
  const { technicianById, specialtyName } = useData();
  const tech = technicianById(request.techId);
  const meta = STATUS_META[request.status];
  const showTechContact = role !== 'cliente' || !['pendiente', 'cancelada'].includes(request.status);
  const showClientContact =
    role !== 'tecnico' || ['aceptada', 'en_camino', 'en_servicio', 'completada'].includes(request.status);
  const distance =
    tech !== undefined
      ? haversineKm(
          { lat: request.lat, lng: request.lng },
          { lat: tech.lat, lng: tech.lng },
        )
      : undefined;

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-4 ring-1 ring-inset ${meta.badge}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={request.status} />
          <span className="font-mono text-[10px] font-bold">{request.folio}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed opacity-90">{meta.description}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar
            name={role === 'cliente' ? request.techName : request.clientName}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {role === 'cliente' ? 'Técnico asignado' : 'Cliente'}
            </p>
            <p className="truncate font-display text-base font-bold text-ink">
              {role === 'cliente' ? request.techName : request.clientName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-brand-600">
                {specialtyName(request.specialty)}
              </span>
              {role !== 'tecnico' && tech && <Rating value={tech.rating} count={tech.reviewCount} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === 'cliente' && showTechContact && tech && (
              <a
                href={`https://wa.me/${tech.whatsapp}?text=${encodeURIComponent(
                  `Hola ${tech.name}, te escribo desde RapiJob por el servicio ${request.folio} (${specialtyName(request.specialty)}).`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
            {role !== 'cliente' && showClientContact && (
              <a
                href={`tel:${request.clientPhone.replace(/\s/g, '')}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <Phone className="h-3.5 w-3.5" />
                {request.clientPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-cloud p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            Fecha y hora
          </p>
          <p className="mt-1.5 text-sm font-bold text-ink">{formatDate(request.date)}</p>
          <p className="text-xs text-slate-500">{request.time} hrs</p>
        </div>
        <div className="rounded-2xl bg-cloud p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Wallet className="h-3.5 w-3.5" />
            Precio {request.status === 'completada' ? 'final' : 'referencial'}
          </p>
          <p className="mt-1.5 font-display text-lg font-extrabold text-ink">
            {formatPrice(request.price)}
          </p>
          <p className="text-[10px] text-slate-500">Se confirma con el técnico</p>
        </div>
        <div className="rounded-2xl bg-cloud p-4 sm:col-span-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            Ubicación del servicio
          </p>
          <p className="mt-1.5 text-sm font-bold text-ink">
            {request.district} · {request.address}
          </p>
          {request.reference && (
            <p className="mt-0.5 text-xs text-slate-500">Referencia: {request.reference}</p>
          )}
          {distance !== undefined && (
            <p className="mt-1 text-[10px] font-semibold text-brand-600">
              El técnico está a {formatDistance(distance)} del punto del servicio
            </p>
          )}
          <div className="mt-3 h-[170px] overflow-hidden rounded-xl border border-white">
            <MapView
              center={{ lat: request.lat, lng: request.lng }}
              points={[
                ...(tech
                  ? [
                      {
                        id: tech.id,
                        lat: tech.lat,
                        lng: tech.lng,
                        label: tech.name,
                        kind: 'tech' as const,
                      },
                    ]
                  : []),
                {
                  id: request.id,
                  lat: request.lat,
                  lng: request.lng,
                  label: 'Ubicación del servicio',
                  kind: 'selected' as const,
                },
              ]}
              selected={{ lat: request.lat, lng: request.lng }}
              interactive={false}
              showLegend={false}
              zoom={13}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <UserRound className="h-3.5 w-3.5" />
          Descripción del problema
        </p>
        <p className="mt-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-600">
          {request.description}
        </p>
        {request.photos.length > 0 && (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {request.photos.map((photo, index) => (
              <a
                key={`${photo.slice(0, 20)}-${index}`}
                href={photo}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
              >
                <img
                  src={photo}
                  alt={`Foto ${index + 1} del problema`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Seguimiento de la solicitud
        </p>
        <div className="mt-3 rounded-2xl border border-slate-100 p-4">
          <RequestTimeline request={request} />
        </div>
      </div>

      {request.rating && (
        <div className="rounded-2xl bg-sun-100/60 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            <Star className="h-3.5 w-3.5" />
            Calificación del cliente
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Rating value={request.rating} showValue={false} size="md" />
            <span className="text-sm font-bold text-ink">{request.rating}/5</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          {request.reviewComment && (
            <p className="mt-2 text-xs leading-relaxed text-amber-900/80">{request.reviewComment}</p>
          )}
        </div>
      )}

      {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">{actions}</div>}
    </div>
  );
}
