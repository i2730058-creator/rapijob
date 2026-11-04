import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crosshair,
  ImagePlus,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import type { LatLng, ServiceRequest, Technician } from '@/types';
import { MapView } from '@/components/MapView';
import { Avatar } from '@/components/Avatar';
import { Rating } from '@/components/Rating';
import { SpecialtyIcon } from '@/components/SpecialtyIcon';
import { Button, buttonStyles } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { RequestTimeline } from '@/components/RequestTimeline';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_CENTER, DISTRICTS, SERVICE_DISTRICTS, TIME_SLOTS, STATUS_META } from '@/lib/constants';
import { IS_SUPABASE } from '@/lib/repo';
import { geocodeAddress, reverseGeocode } from '@/lib/maps';
import {
  cn,
  compressImage,
  formatDate,
  formatDistance,
  formatPrice,
  haversineKm,
  isFuture,
  todayISO,
} from '@/lib/utils';

const STEPS = [
  { n: 1, label: 'Servicio' },
  { n: 2, label: 'Ubicación' },
  { n: 3, label: 'Fecha' },
  { n: 4, label: 'Técnico' },
  { n: 5, label: 'Confirmar' },
];

function nearestDistrict(point: LatLng): string {
  return DISTRICTS.reduce((best, district) => {
    const bestDistance = haversineKm(point, { lat: best.lat, lng: best.lng });
    const currentDistance = haversineKm(point, { lat: district.lat, lng: district.lng });
    return currentDistance < bestDistance ? district : best;
  }, DISTRICTS[0]).name;
}

function quickDates() {
  const base = new Date();
  return [0, 1, 2, 3].map((offset) => {
    const date = new Date(base.getTime() + offset * 86400000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const label =
      offset === 0
        ? 'Hoy'
        : offset === 1
          ? 'Mañana'
          : date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
    return { value: local, label };
  });
}

export function RequestService() {
  const { user } = useAuth();
  const { specialties, technicians, specialtyName, createRequest } = useData();
  const toast = useToast();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [specialty, setSpecialty] = useState(params.get('especialidad') ?? '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [district, setDistrict] = useState('Huancayo');
  const [addressQuery, setAddressQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [techId, setTechId] = useState(params.get('tecnico') ?? '');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ServiceRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const selectedSpecialty = specialties.find((item) => item.slug === specialty);
  const selectedTech = technicians.find((tech) => tech.id === techId);
  const dates = quickDates();

  const availableTechs = useMemo(() => {
    const origin = location ?? mapCenter;
    return technicians
      .filter((tech) => tech.approved && tech.available)
      .map((tech) => ({ tech, distance: haversineKm(origin, { lat: tech.lat, lng: tech.lng }) }))
      .sort((a, b) => a.distance - b.distance);
  }, [technicians, location, mapCenter]);

  const specialtyTechs = useMemo(() => {
    const matches = availableTechs.filter(
      (item) => item.tech.specialty === specialty || item.tech.specialties.includes(specialty),
    );
    return matches.length > 0 ? matches : availableTechs;
  }, [availableTechs, specialty]);

  const fallback = specialty && !availableTechs.some(
    (item) => item.tech.specialty === specialty || item.tech.specialties.includes(specialty),
  );

  useEffect(() => {
    if (params.get('especialidad')) setSpecialty(params.get('especialidad') ?? '');
    if (params.get('tecnico')) setTechId(params.get('tecnico') ?? '');
  }, [params]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, created]);

  const goNext = () => {
    if (step === 1) {
      if (!specialty) {
        toast.error('Selecciona un tipo de servicio');
        return;
      }
      if (description.trim().length < 15) {
        toast.error('Describe el problema', 'Necesitamos al menos 15 caracteres para orientar al técnico.');
        return;
      }
    }
    if (step === 2) {
      if (!location) {
        toast.error('Selecciona tu ubicación en el mapa');
        return;
      }
      if (address.trim().length < 5) {
        toast.error('Escribe tu dirección', 'Incluye calle, número o una referencia clara.');
        return;
      }
    }
    if (step === 3) {
      if (!date || !time) {
        toast.error('Elige fecha y hora del servicio');
        return;
      }
      if (!isFuture(date, time)) {
        toast.error('La fecha debe ser posterior a hoy', 'Elige otro día u horario.');
        return;
      }
    }
    if (step === 4 && !techId) {
      toast.error('Elige un técnico para continuar');
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  };

  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = 4 - photos.length;
    if (remaining <= 0) {
      toast.error('Máximo 4 fotos', 'Elimina una foto para agregar otra.');
      return;
    }
    setUploadingPhotos(true);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const compressed = await Promise.all(selected.map((file) => compressImage(file)));
      setPhotos((current) => [...current, ...compressed].slice(0, 4));
      toast.success(
        `${compressed.length} foto${compressed.length > 1 ? 's' : ''} agregada${compressed.length > 1 ? 's' : ''}`,
      );
    } catch (error) {
      toast.error('No se pudo procesar la imagen', error instanceof Error ? error.message : undefined);
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyPoint = async (point: LatLng, options?: { silent?: boolean }) => {
    setLocation(point);
    setMapCenter(point);
    setDistrict(nearestDistrict(point));
    if (!options?.silent) {
      const found = await reverseGeocode(point);
      if (found) {
        setAddress((current) => (current.trim() ? current : found));
        toast.success('Ubicación marcada', found.split(',').slice(0, 3).join(','));
      } else if (!options?.silent) {
        toast.info('Ubicación marcada', 'Escribe tu dirección o referencia para completar.');
      }
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite geolocalización');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocating(false);
        await applyPoint(point);
      },
      () => {
        setLocating(false);
        toast.error('No pudimos acceder a tu ubicación', 'Marca el punto manualmente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    setSearchingAddress(true);
    const result = await geocodeAddress(addressQuery, mapCenter);
    setSearchingAddress(false);
    if (!result) {
      toast.error('Dirección no encontrada', 'Prueba con una referencia más específica.');
      return;
    }
    const point = { lat: result.lat, lng: result.lng };
    setLocation(point);
    setMapCenter(point);
    setDistrict(nearestDistrict(point));
    setAddress((current) => current || result.label);
    toast.success('Ubicación encontrada', result.label.split(',').slice(0, 3).join(','));
  };

  const submit = async () => {
    if (!location || !selectedTech || !selectedSpecialty) {
      toast.error('Faltan datos de la solicitud');
      return;
    }
    if (!accepted) {
      toast.error('Acepta las condiciones para enviar la solicitud');
      return;
    }
    setSubmitting(true);
    try {
      const request = await createRequest({
        specialty,
        description,
        photos,
        address,
        reference,
        district,
        lat: location.lat,
        lng: location.lng,
        date,
        time,
        techId: selectedTech.id,
      });
      setCreated(request);
      toast.success('¡Solicitud enviada!', `Folio ${request.folio}`);
    } catch (error) {
      toast.error(
        'No se pudo enviar la solicitud',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div ref={topRef} className="min-h-screen bg-cloud py-12">
        <div className="container-rj max-w-3xl">
          <div className="card overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-10 text-center text-white">
              <div className="bg-dots pointer-events-none absolute inset-0 opacity-20" />
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <h1 className="relative mt-4 font-display text-2xl font-extrabold sm:text-3xl">
                ¡Solicitud enviada con éxito!
              </h1>
              <p className="relative mx-auto mt-2 max-w-md text-sm text-emerald-50">
                {created.techName} recibió tu solicitud. Te avisaremos en cuanto la acepte y puedas
                seguir el servicio en tiempo real.
              </p>
              <span className="relative mt-4 inline-block rounded-xl bg-white/15 px-4 py-2 font-mono text-sm font-bold tracking-wide ring-1 ring-inset ring-white/25">
                {created.folio}
              </span>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cloud p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Estado actual
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={created.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Precio referencial
                  </p>
                  <p className="font-display text-xl font-extrabold text-ink">
                    {formatPrice(created.price)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">Detalle del servicio</h2>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Especialidad</dt>
                      <dd className="text-right font-semibold text-ink">
                        {specialtyName(created.specialty)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Técnico</dt>
                      <dd className="text-right font-semibold text-ink">{created.techName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Fecha</dt>
                      <dd className="text-right font-semibold text-ink">{formatDate(created.date)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Hora</dt>
                      <dd className="text-right font-semibold text-ink">{created.time}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-slate-500">Dirección</dt>
                      <dd className="text-right font-semibold text-ink">
                        {created.district} · {created.address}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">Seguimiento</h2>
                  <div className="mt-3">
                    <RequestTimeline request={created} compact />
                  </div>
                </div>
              </div>

              {!IS_SUPABASE && (
                <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-brand-50 p-4 text-xs text-brand-800">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <strong>Modo demo:</strong> el estado avanzará automáticamente cada 18 segundos.
                    También puedes gestionarlo desde el panel del técnico.
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/panel"
                  className={buttonStyles({ variant: 'primary', size: 'lg', full: true })}
                >
                  Ir a mis solicitudes
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/buscar"
                  className={buttonStyles({ variant: 'outline', size: 'lg', full: true })}
                >
                  Seguir explorando técnicos
                </Link>
              </div>
              <p className="mt-4 text-center text-[11px] text-slate-500">
                Guarda tu folio. Puedes consultar el estado en cualquier momento desde tu panel de
                cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="min-h-screen bg-cloud pb-16">
      <div className="border-b border-slate-100 bg-white">
        <div className="container-rj py-7">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/" className="hover:text-brand-600">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-slate-600">Solicitar técnico</span>
          </nav>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Solicita tu técnico en 5 pasos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Hola {user?.name.split(' ')[0]}, cuéntanos qué necesitas y encontraremos al profesional
                adecuado.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Solicitud gratuita y sin compromiso
            </div>
          </div>
        </div>
      </div>

      <div className="container-rj pt-6">
        {/* Stepper */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((item, index) => {
              const done = item.n < step;
              const current = item.n === step;
              return (
                <div key={item.n} className="flex flex-1 items-center last:flex-none">
                  <button
                    type="button"
                    onClick={() => item.n < step && setStep(item.n)}
                    disabled={item.n > step}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-2 py-1 transition',
                      item.n < step && 'cursor-pointer hover:bg-brand-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition',
                        done
                          ? 'bg-brand-600 text-white'
                          : current
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                            : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : item.n}
                    </span>
                    <span
                      className={cn(
                        'hidden whitespace-nowrap text-xs font-semibold sm:block',
                        current ? 'text-brand-700' : done ? 'text-slate-600' : 'text-slate-500',
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <span
                      className={cn(
                        'mx-1 h-0.5 flex-1 rounded-full transition',
                        item.n < step ? 'bg-brand-400' : 'bg-slate-100',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <div className="card p-5 sm:p-7">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      ¿Qué necesitas resolver?
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Elige la especialidad y describe el problema con el mayor detalle posible.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="label">Tipo de servicio</span>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {specialties.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => {
                          setSpecialty(item.slug);
                          if (
                            selectedTech &&
                            !selectedTech.specialties.includes(item.slug) &&
                            selectedTech.specialty !== item.slug
                          ) {
                            setTechId('');
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition',
                          specialty === item.slug
                            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                        )}
                      >
                        <SpecialtyIcon slug={item.slug} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-ink">
                            {item.name}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            Desde {formatPrice(item.basePrice)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="label" htmlFor="description">
                    Descripción del problema
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    maxLength={700}
                    placeholder="Ejemplo: hay una fuga de agua debajo del lavadero y el mueble se está mojando. Necesito revisión hoy."
                    className="input-field resize-y"
                  />
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                    <span>Mínimo 15 caracteres. Evita compartir datos sensibles.</span>
                    <span>{description.length}/700</span>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="label">Fotos del problema (opcional)</span>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {photos.map((photo, index) => (
                      <div
                        key={`${photo.slice(0, 24)}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                      >
                        <img
                          src={photo}
                          alt={`Foto del problema ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                          className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1.5 text-white transition hover:bg-rose-600"
                          aria-label="Eliminar foto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhotos}
                        className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-cloud text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                      >
                        {uploadingPhotos ? (
                          <span className="text-[10px] font-semibold">Procesando…</span>
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[10px] font-semibold">Agregar foto</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleFiles(event.target.files)}
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Camera className="h-3 w-3" />
                    Hasta 4 imágenes. Se optimizan automáticamente para cuidar tu privacidad.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      ¿Dónde realizaremos el servicio?
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Marca el punto exacto en el mapa. Usaremos esta ubicación para calcular la
                      distancia de los técnicos.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={addressQuery}
                      onChange={(event) => setAddressQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void searchAddress();
                        }
                      }}
                      placeholder="Buscar dirección (ej. Jr. Puno 452, Huancayo)"
                      className="input-field pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="dark" onClick={searchAddress} loading={searchingAddress}>
                      Buscar
                    </Button>
                    <Button variant="outline" onClick={useMyLocation} loading={locating}>
                      <Crosshair className="h-4 w-4" />
                      Mi ubicación
                    </Button>
                  </div>
                </div>

                <div className="relative mt-4 h-[300px] overflow-hidden rounded-2xl border border-slate-200">
                  <MapView
                    center={mapCenter}
                    points={specialtyTechs.slice(0, 8).map(({ tech }) => ({
                      id: tech.id,
                      lat: tech.lat,
                      lng: tech.lng,
                      label: tech.name,
                      kind: 'tech' as const,
                    }))}
                    selected={location}
                    onPick={(point) => void applyPoint(point)}
                    zoom={14}
                    showLegend={false}
                  />
                  {!location && (
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400] rounded-xl bg-white/95 px-3 py-2 text-center text-[11px] font-semibold text-slate-600 shadow-card backdrop-blur">
                      Haz clic en el mapa para marcar la ubicación del servicio
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-xl bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-card backdrop-blur">
                    {location
                      ? `Punto marcado · ${district}`
                      : 'Aún no marcaste tu ubicación'}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="address">
                      Dirección del servicio
                    </label>
                    <input
                      id="address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Calle, número, dpto. / interior"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="reference">
                      Referencia (opcional)
                    </label>
                    <input
                      id="reference"
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Ej. frente al parque, portón negro"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="district">
                      Distrito
                    </label>
                    <select
                      id="district"
                      value={district}
                      onChange={(event) => {
                        const name = event.target.value;
                        setDistrict(name);
                        const found = DISTRICTS.find((item) => item.name === name);
                        if (found) {
                          const point = { lat: found.lat, lng: found.lng };
                          setMapCenter(point);
                          if (location) setLocation(point);
                        }
                      }}
                      className="select-field"
                    >
                      {SERVICE_DISTRICTS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded-xl bg-cloud px-3.5 py-3 text-[11px] text-slate-500">
                      {location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-brand-500" />
                          Coordenadas: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <Info className="h-3.5 w-3.5" />
                          Marca tu ubicación para continuar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      ¿Cuándo quieres el servicio?
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Elige el día y la hora. El técnico confirmará la disponibilidad exacta.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="label">Fecha</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {dates.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setDate(item.value)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-center transition',
                          date === item.value
                            ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300',
                        )}
                      >
                        <span className="block text-xs font-bold">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {new Date(`${item.value}T12:00:00`).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <label className="sr-only" htmlFor="date">
                      Otra fecha
                    </label>
                    <input
                      id="date"
                      type="date"
                      min={todayISO()}
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <span className="label">Horario disponible</span>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {TIME_SLOTS.map((slot) => {
                      const past = date === todayISO() && !isFuture(date || todayISO(), slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={past}
                          onClick={() => setTime(slot)}
                          className={cn(
                            'rounded-xl border px-2 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35',
                            time === slot
                              ? 'border-brand-500 bg-brand-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300',
                          )}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    Horario referencial. El técnico puede proponer un ajuste si está ocupado.
                  </p>
                </div>

                <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Para emergencias (fugas, cortocircuitos) elige el horario más próximo y escribe
                    “emergencia” en la descripción.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Elige a tu técnico</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Ordenados por cercanía desde la ubicación del servicio. Solo mostramos técnicos
                      disponibles.
                    </p>
                  </div>
                </div>

                {fallback && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-xs text-amber-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      No hay especialistas de {specialtyName(specialty).toLowerCase()} disponibles en
                      este momento. Te mostramos otros técnicos cercanos que podrían ayudarte.
                    </p>
                  </div>
                )}

                <div className="mt-4 h-[220px] overflow-hidden rounded-2xl border border-slate-200">
                  <MapView
                    center={location ?? mapCenter}
                    points={specialtyTechs.slice(0, 10).map(({ tech }) => ({
                      id: tech.id,
                      lat: tech.lat,
                      lng: tech.lng,
                      label: `${tech.name} · ${formatPrice(tech.priceFrom)}`,
                      kind: 'tech' as const,
                    }))}
                    selected={location}
                    onPointClick={(id) => setTechId(id)}
                    zoom={13}
                    interactive={false}
                    showLegend={false}
                  />
                </div>

                <div className="mt-4 space-y-2.5">
                  {specialtyTechs.slice(0, 12).map(({ tech, distance }) => {
                    const selected = tech.id === techId;
                    return (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => setTechId(tech.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                          selected
                            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                        )}
                      >
                        <Avatar name={tech.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-ink">{tech.name}</p>
                            {tech.verified && (
                              <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-slate-500">
                            {specialtyName(tech.specialty)} · {formatDistance(distance)} de distancia
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Rating value={tech.rating} count={tech.reviewCount} />
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Wallet className="h-3 w-3 text-brand-500" />
                              Desde {formatPrice(tech.priceFrom)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                            selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white',
                          )}
                        >
                          {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {specialtyTechs.length === 0 && (
                  <div className="mt-4 rounded-2xl bg-cloud p-6 text-center text-sm text-slate-500">
                    No hay técnicos disponibles ahora. Prueba con otra fecha u otra especialidad.
                  </div>
                )}
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && location && selectedTech && (
              <div className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Revisa y confirma</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Verifica que todo esté correcto antes de enviar tu solicitud.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <SpecialtyIcon slug={specialty} size="sm" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Servicio
                          </p>
                          <p className="text-sm font-bold text-ink">{specialtyName(specialty)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="mt-2.5 rounded-xl bg-cloud p-3 text-xs leading-relaxed text-slate-600">
                      {description}
                    </p>
                    {photos.length > 0 && (
                      <div className="mt-2.5 flex gap-2">
                        {photos.map((photo, index) => (
                          <img
                            key={`${photo.slice(0, 20)}-${index}`}
                            src={photo}
                            alt={`Adjunto ${index + 1}`}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-brand-500" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Ubicación
                          </p>
                          <p className="text-sm font-bold text-ink">
                            {district} · {address}
                          </p>
                          {reference && <p className="text-xs text-slate-500">Ref. {reference}</p>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                      >
                        Editar
                      </button>
                    </div>
                    <div className="mt-2.5 h-[140px] overflow-hidden rounded-xl">
                      <MapView
                        center={location}
                        points={[
                          {
                            id: 'selected',
                            lat: location.lat,
                            lng: location.lng,
                            label: 'Ubicación del servicio',
                            kind: 'selected',
                          },
                        ]}
                        selected={location}
                        interactive={false}
                        showLegend={false}
                        zoom={15}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <CalendarDays className="mt-0.5 h-4 w-4 text-brand-500" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Fecha y hora
                            </p>
                            <p className="text-sm font-bold text-ink">{formatDate(date)}</p>
                            <p className="text-xs text-slate-500">{time} hrs</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 h-4 w-4 text-brand-500" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Técnico
                            </p>
                            <p className="text-sm font-bold text-ink">{selectedTech.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatDistance(haversineKm(location, { lat: selectedTech.lat, lng: selectedTech.lng }))} ·{' '}
                              {formatPrice(selectedTech.priceFrom)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-cloud p-3.5 text-xs leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span>
                    Acepto las condiciones del servicio y confirmo que la información proporcionada es
                    correcta. Entiendo que el precio es referencial y será confirmado por el técnico
                    antes de iniciar el trabajo.
                  </span>
                </label>
              </div>
            )}

            {/* NAV BUTTONS */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              {step > 1 ? (
                <Button variant="ghost" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
              ) : (
                <Link to="/" className={buttonStyles({ variant: 'ghost', size: 'md' })}>
                  Cancelar
                </Link>
              )}

              {step < 5 ? (
                <Button variant="primary" size="lg" onClick={goNext}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={submit} loading={submitting}>
                  Enviar solicitud
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* SUMMARY SIDEBAR */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-brand-950 px-5 py-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-300">
                  Resumen de tu solicitud
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold">
                  {selectedTech ? formatPrice(selectedTech.priceFrom) : 'S/ —'}
                  <span className="ml-1 text-[10px] font-medium text-brand-300">referencial</span>
                </p>
              </div>
              <ul className="divide-y divide-slate-100 text-xs">
                <li className="flex items-start gap-3 px-5 py-3">
                  <SpecialtyIcon slug={specialty || 'otros'} size="sm" className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Servicio
                    </p>
                    <p className="truncate font-semibold text-ink">
                      {specialty ? specialtyName(specialty) : 'Por elegir'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 px-5 py-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Ubicación
                    </p>
                    <p className="truncate font-semibold text-ink">
                      {location ? `${district} · ${address || 'Dirección pendiente'}` : 'Por elegir'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 px-5 py-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Fecha y hora
                    </p>
                    <p className="font-semibold text-ink">
                      {date ? `${formatDate(date)}${time ? ` · ${time}` : ''}` : 'Por elegir'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 px-5 py-3">
                  <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Técnico
                    </p>
                    <p className="truncate font-semibold text-ink">
                      {selectedTech ? selectedTech.name : 'Por elegir'}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="border-t border-slate-100 bg-cloud/60 px-5 py-3">
                <p className="text-[10px] leading-relaxed text-slate-500">
                  El precio final se acuerda con el técnico según el trabajo y los materiales. No se
                  realiza ningún cobro desde la plataforma.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs font-bold text-ink">¿Necesitas ayuda?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Escríbenos y te ayudamos a completar tu solicitud.
              </p>
              <a
                href="https://wa.me/51987654321?text=Hola%20RapiJob%2C%20necesito%20ayuda%20con%20mi%20solicitud"
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ variant: 'outline', size: 'sm', full: true, className: 'mt-3' })}
              >
                <Camera className="h-3.5 w-3.5" />
                Contactar por WhatsApp
              </a>
            </div>

            <div className="rounded-2xl bg-brand-50 p-4 text-[11px] leading-relaxed text-brand-800">
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" />
                Compra protegida por RapiJob
              </p>
              <p className="mt-1 text-brand-700/80">
                Guardamos el historial de tu solicitud y puedes calificar al técnico al finalizar.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
