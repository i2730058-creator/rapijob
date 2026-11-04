import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  MapPin,
  MessageSquareQuote,
  Pencil,
  Phone,
  Power,
  Save,
  ShieldCheck,
  Star,
  UserRound,
  Wallet,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { RequestStatus, ServiceRequest, TechnicianPatch } from '@/types';
import { Avatar } from '@/components/Avatar';
import { Button, buttonStyles } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { Rating } from '@/components/Rating';
import { RequestCard } from '@/components/RequestCard';
import { SpecialtyIcon } from '@/components/SpecialtyIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { FullPageLoader } from '@/components/ProtectedRoute';
import { PanelHeader } from '@/components/panel/PanelHeader';
import { PanelTabs } from '@/components/panel/PanelTabs';
import { RequestDetail } from '@/components/panel/RequestDetail';
import { StatCard } from '@/components/panel/StatCard';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { ACTIVE_STATUSES, SERVICE_DISTRICTS, STATUS_FLOW } from '@/lib/constants';
import { formatDate, formatPrice, formatDistance, haversineKm, pluralize, timeAgo } from '@/lib/utils';
import { DEFAULT_CENTER } from '@/lib/constants';

type TabId = 'solicitudes' | 'historial' | 'resenas' | 'perfil';

interface TechForm {
  name: string;
  headline: string;
  bio: string;
  priceFrom: string;
  experienceYears: string;
  schedule: string;
  district: string;
  address: string;
  whatsapp: string;
  specialties: string[];
  available: boolean;
}

function nextStatus(status: RequestStatus): RequestStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

const ADVANCE_LABEL: Partial<Record<RequestStatus, string>> = {
  aceptada: 'Marcar en camino',
  en_camino: 'Iniciar servicio',
  en_servicio: 'Marcar completada',
};

export function TechnicianPanel() {
  const { user } = useAuth();
  const {
    techProfile,
    requests,
    reviewsForTech,
    specialties,
    specialtyName,
    loading,
    updateTechnician,
    updateRequestStatus,
    cancelRequest,
  } = useData();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('solicitudes');
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TechForm | null>(null);

  const allReviews = useMemo(
    () => (techProfile ? reviewsForTech(techProfile.id) : []),
    [reviewsForTech, techProfile],
  );

  useEffect(() => {
    if (!techProfile) return;
    setForm({
      name: techProfile.name,
      headline: techProfile.headline,
      bio: techProfile.bio,
      priceFrom: String(techProfile.priceFrom),
      experienceYears: String(techProfile.experienceYears),
      schedule: techProfile.schedule,
      district: techProfile.district,
      address: techProfile.address,
      whatsapp: techProfile.whatsapp,
      specialties: [...techProfile.specialties],
      available: techProfile.available,
    });
  }, [techProfile]);

  const pending = requests.filter((request) => request.status === 'pendiente');
  const active = requests.filter((request) => ACTIVE_STATUSES.includes(request.status));
  const completed = requests.filter((request) => request.status === 'completada');
  const income = completed.reduce((sum, request) => sum + request.price, 0);
  const history = requests.filter((request) => !ACTIVE_STATUSES.includes(request.status));
  const ratingBreakdown = [5, 4, 3, 2, 1].map((value) => ({
    value,
    count: allReviews.filter((review) => Math.round(review.rating) === value).length,
  }));

  const tabs = [
    { id: 'solicitudes', label: 'Solicitudes', icon: ClipboardList, count: active.length },
    { id: 'historial', label: 'Historial', icon: History, count: history.length },
    { id: 'resenas', label: 'Reseñas', icon: MessageSquareQuote, count: allReviews.length },
    { id: 'perfil', label: 'Mi perfil', icon: UserRound },
  ];

  const setRequestBusy = (id: string) => setBusyId(id);

  const handleAccept = async (request: ServiceRequest) => {
    setRequestBusy(request.id);
    try {
      const updated = await updateRequestStatus(
        request.id,
        'aceptada',
        'El técnico aceptó la solicitud y coordinará la llegada.',
      );
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.success('Solicitud aceptada', `Coordina con ${request.clientName} por WhatsApp o teléfono.`);
    } catch (error) {
      toast.error(
        'No se pudo aceptar la solicitud',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAdvance = async (request: ServiceRequest) => {
    const next = nextStatus(request.status);
    if (!next) return;
    setRequestBusy(request.id);
    try {
      const updated = await updateRequestStatus(request.id, next);
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.success('Estado actualizado', `La solicitud ahora está en estado “${next}”.`);
    } catch (error) {
      toast.error(
        'No se pudo actualizar el estado',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: ServiceRequest) => {
    setRequestBusy(request.id);
    try {
      const updated = await cancelRequest(
        request.id,
        'El técnico no cuenta con disponibilidad para este servicio.',
      );
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.info('Solicitud rechazada', 'El cliente podrá elegir otro técnico cercano.');
    } catch (error) {
      toast.error(
        'No se pudo rechazar la solicitud',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailability = async () => {
    if (!techProfile) return;
    try {
      const updated = await updateTechnician(techProfile.id, { available: !techProfile.available });
      toast.success(
        updated.available ? 'Ahora estás disponible' : 'Pausaste tu disponibilidad',
        updated.available
          ? 'Tu perfil aparecerá en las búsquedas de clientes.'
          : 'No recibirás nuevas solicitudes hasta que vuelvas a activarte.',
      );
    } catch (error) {
      toast.error(
        'No se pudo cambiar tu disponibilidad',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!techProfile || !form) return;
    if (form.headline.trim().length < 10) {
      toast.error('Escribe un titular profesional', 'Necesitamos al menos 10 caracteres.');
      return;
    }
    if (form.bio.trim().length < 30) {
      toast.error('Amplía tu descripción', 'Cuéntanos sobre tu experiencia (mínimo 30 caracteres).');
      return;
    }
    if (form.specialties.length === 0) {
      toast.error('Selecciona al menos una especialidad');
      return;
    }
    setSaving(true);
    try {
      const patch: TechnicianPatch = {
        name: form.name.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        priceFrom: Number(form.priceFrom) || techProfile.priceFrom,
        experienceYears: Number(form.experienceYears) || techProfile.experienceYears,
        schedule: form.schedule.trim(),
        district: form.district,
        address: form.address.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, '').replace(/^51?/, '51'),
        specialties: form.specialties,
        specialty: form.specialties[0],
        available: form.available,
      };
      await updateTechnician(techProfile.id, patch);
      toast.success('Perfil actualizado', 'Los cambios se reflejan en tu perfil público.');
    } catch (error) {
      toast.error(
        'No se pudo guardar el perfil',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSpecialtyToggle = (slug: string) => {
    setForm((current) => {
      if (!current) return current;
      const exists = current.specialties.includes(slug);
      const next = exists
        ? current.specialties.filter((item) => item !== slug)
        : [...current.specialties, slug];
      return { ...current, specialties: next };
    });
  };

  if (loading) return <FullPageLoader label="Cargando tu panel técnico…" />;

  if (!techProfile) {
    return (
      <div className="container-rj py-16">
        <div className="card mx-auto max-w-xl">
          <EmptyState
            icon={Wrench}
            title="No encontramos tu perfil profesional"
            description="Tu cuenta aún no tiene un perfil de técnico asociado. Escríbenos a hola@rapijob.pe para completar tu registro."
            action={
              <Link to="/" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                Volver al inicio
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const detailNext = detail ? nextStatus(detail.status) : null;

  const detailActions = detail ? (
    <>
      {detail.status === 'pendiente' && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReject(detail)}
            disabled={busyId === detail.id}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rechazar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleAccept(detail)}
            disabled={busyId === detail.id}
          >
            <Check className="h-3.5 w-3.5" />
            Aceptar solicitud
          </Button>
        </>
      )}
      {detail.status !== 'pendiente' && detailNext && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleAdvance(detail)}
          disabled={busyId === detail.id}
        >
          {ADVANCE_LABEL[detail.status] ?? 'Avanzar estado'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
        Cerrar
      </Button>
    </>
  ) : null;

  const distanceToBase = haversineKm(
    { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
    { lat: techProfile.lat, lng: techProfile.lng },
  );

  return (
    <div className="min-h-screen bg-cloud pb-16">
      <PanelHeader
        eyebrow="Panel técnico"
        title={techProfile.name}
        description={techProfile.headline}
        actions={
          <>
            <Link to={`/tecnico/${techProfile.id}`} className={buttonStyles({ variant: 'outline', size: 'md' })}>
              <UserRound className="h-4 w-4" />
              Ver perfil público
            </Link>
            <Button
              variant={techProfile.available ? 'primary' : 'dark'}
              size="md"
              onClick={() => void toggleAvailability()}
            >
              <Power className="h-4 w-4" />
              {techProfile.available ? 'Disponible ahora' : 'No disponible'}
            </Button>
          </>
        }
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            <span
              className={
                techProfile.available
                  ? 'h-2 w-2 rounded-full bg-emerald-500'
                  : 'h-2 w-2 rounded-full bg-slate-300'
              }
            />
            {techProfile.available ? 'Recibiendo solicitudes' : 'Disponibilidad pausada'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            {techProfile.district} · {formatDistance(distanceToBase)} del centro
          </span>
          {techProfile.approved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Perfil aprobado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
              <Clock3 className="h-3.5 w-3.5" />
              En revisión por el equipo
            </span>
          )}
          {techProfile.verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Identidad verificada
            </span>
          )}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-1">
          <PanelTabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />
        </div>
      </PanelHeader>

      <div className="container-rj pt-6">
        {!techProfile.approved && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Tu perfil está en proceso de aprobación</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                Un administrador revisará tu información. Mientras tanto puedes completar tu perfil,
                pero no aparecerás en las búsquedas ni recibirás solicitudes.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Solicitudes pendientes"
            value={pending.length}
            hint="Requieren tu respuesta"
            tone="amber"
          />
          <StatCard
            icon={Wrench}
            label="Servicios en curso"
            value={active.filter((request) => request.status !== 'pendiente').length}
            hint="Aceptados o en ejecución"
            tone="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label="Servicios completados"
            value={completed.length}
            hint={`${techProfile.jobsDone} trabajos históricos`}
            tone="emerald"
          />
          <StatCard
            icon={Wallet}
            label="Ingresos registrados"
            value={formatPrice(income)}
            hint="Solicitudes completadas"
            tone="violet"
          />
        </div>

        <div className="mt-6">
          {tab === 'solicitudes' && (
            <div className="space-y-4">
              {active.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={ClipboardList}
                    title="No tienes solicitudes activas"
                    description="Cuando un cliente te elija, la solicitud aparecerá aquí. Mantén tu disponibilidad activa para recibir más oportunidades."
                    action={
                      <Button variant="outline" onClick={() => void toggleAvailability()}>
                        <Power className="h-4 w-4" />
                        {techProfile.available ? 'Pausar disponibilidad' : 'Activar disponibilidad'}
                      </Button>
                    }
                  />
                </div>
              ) : (
                active.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    role="tecnico"
                    specialtyName={specialtyName(request.specialty)}
                    onOpen={() => setDetail(request)}
                    onAccept={() => void handleAccept(request)}
                    onReject={() => void handleReject(request)}
                    onAdvance={() => void handleAdvance(request)}
                    busy={busyId === request.id}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={History}
                    title="Tu historial está vacío"
                    description="Los servicios completados y cancelados se guardarán aquí."
                  />
                </div>
              ) : (
                history.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    role="tecnico"
                    specialtyName={specialtyName(request.specialty)}
                    onOpen={() => setDetail(request)}
                    busy={busyId === request.id}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'resenas' && (
            <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
              <div className="card p-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Valoración general
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-display text-4xl font-extrabold text-ink">
                    {techProfile.rating ? techProfile.rating.toFixed(1) : '—'}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">/ 5</span>
                </div>
                <div className="mt-2">
                  <Rating value={techProfile.rating} showValue={false} size="md" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {pluralize(techProfile.reviewCount, 'reseña', 'reseñas')} ·{' '}
                  {techProfile.verified ? 'perfil verificado' : 'perfil en revisión'}
                </p>

                <div className="mt-5 space-y-1.5">
                  {ratingBreakdown.map((item) => {
                    const percent = allReviews.length
                      ? Math.round((item.count / allReviews.length) * 100)
                      : 0;
                    return (
                      <div key={item.value} className="flex items-center gap-2 text-[11px]">
                        <span className="w-8 font-semibold text-slate-500">{item.value}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-sun-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-slate-500">{item.count}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Award className="h-3.5 w-3.5" />
                      Experiencia
                    </span>
                    <span className="font-semibold text-ink">
                      {techProfile.experienceYears} años
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      Trabajos
                    </span>
                    <span className="font-semibold text-ink">{techProfile.jobsDone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Wallet className="h-3.5 w-3.5" />
                      Precio base
                    </span>
                    <span className="font-semibold text-ink">{formatPrice(techProfile.priceFrom)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {allReviews.length === 0 ? (
                  <div className="card">
                    <EmptyState
                      icon={Star}
                      title="Aún no tienes reseñas"
                      description="Completa servicios y pide a tus clientes que califiquen tu trabajo para ganar confianza."
                    />
                  </div>
                ) : (
                  allReviews.map((review) => (
                    <article key={review.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={review.clientName} size="md" />
                          <div>
                            <p className="text-sm font-bold text-ink">{review.clientName}</p>
                            <p className="text-[10px] text-slate-500">{timeAgo(review.createdAt)}</p>
                          </div>
                        </div>
                        <Rating value={review.rating} showValue={false} />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {review.comment || 'Servicio calificado sin comentario.'}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'perfil' && form && (
            <form onSubmit={saveProfile} className="grid items-start gap-5 lg:grid-cols-[1fr_330px]">
              <div className="card p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Pencil className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Perfil profesional</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Un perfil completo y claro genera más confianza y mejores solicitudes.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="tech-name">
                      Nombre completo
                    </label>
                    <input
                      id="tech-name"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="tech-headline">
                      Titular profesional
                    </label>
                    <input
                      id="tech-headline"
                      value={form.headline}
                      onChange={(event) => setForm({ ...form, headline: event.target.value })}
                      placeholder="Ej. Electricista certificado con 8 años de experiencia"
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="tech-bio">
                      Descripción de tu servicio
                    </label>
                    <textarea
                      id="tech-bio"
                      value={form.bio}
                      onChange={(event) => setForm({ ...form, bio: event.target.value })}
                      rows={5}
                      maxLength={900}
                      className="input-field resize-y"
                    />
                    <span className="mt-1 block text-right text-[10px] text-slate-500">
                      {form.bio.length}/900
                    </span>
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-price">
                      Precio base (S/)
                    </label>
                    <input
                      id="tech-price"
                      type="number"
                      min={10}
                      step={5}
                      value={form.priceFrom}
                      onChange={(event) => setForm({ ...form, priceFrom: event.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-experience">
                      Años de experiencia
                    </label>
                    <input
                      id="tech-experience"
                      type="number"
                      min={0}
                      max={60}
                      value={form.experienceYears}
                      onChange={(event) => setForm({ ...form, experienceYears: event.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-whatsapp">
                      WhatsApp (con código de país)
                    </label>
                    <input
                      id="tech-whatsapp"
                      value={form.whatsapp}
                      onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                      placeholder="51987654321"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-schedule">
                      Horario de atención
                    </label>
                    <input
                      id="tech-schedule"
                      value={form.schedule}
                      onChange={(event) => setForm({ ...form, schedule: event.target.value })}
                      placeholder="Lun a Sáb · 8:00 a 18:00"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-district">
                      Distrito de atención
                    </label>
                    <select
                      id="tech-district"
                      value={form.district}
                      onChange={(event) => setForm({ ...form, district: event.target.value })}
                      className="select-field"
                    >
                      {SERVICE_DISTRICTS.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="tech-address">
                      Dirección de referencia
                    </label>
                    <input
                      id="tech-address"
                      value={form.address}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <span className="label">Especialidades</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {specialties.map((specialty) => {
                      const selected = form.specialties.includes(specialty.slug);
                      return (
                        <button
                          key={specialty.slug}
                          type="button"
                          onClick={() => handleSpecialtyToggle(specialty.slug)}
                          className={
                            selected
                              ? 'flex items-center gap-2 rounded-xl border border-brand-500 bg-brand-50 p-2.5 text-left ring-2 ring-brand-100'
                              : 'flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-brand-300'
                          }
                        >
                          <SpecialtyIcon slug={specialty.slug} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-ink">
                            {specialty.name}
                          </span>
                          {selected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-cloud p-4">
                  <span>
                    <span className="block text-sm font-bold text-ink">Disponibilidad inmediata</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      Los clientes solo ven técnicos disponibles al solicitar.
                    </span>
                  </span>
                  <span
                    className={
                      form.available
                        ? 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-emerald-500 transition'
                        : 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 transition'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(event) => setForm({ ...form, available: event.target.checked })}
                      className="peer sr-only"
                    />
                    <span
                      className={
                        form.available
                          ? 'inline-block h-4 w-4 translate-x-6 rounded-full bg-white shadow transition'
                          : 'inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition'
                      }
                    />
                  </span>
                </label>

                <div className="mt-6 flex justify-end">
                  <Button type="submit" variant="primary" size="md" loading={saving}>
                    <Save className="h-4 w-4" />
                    Guardar perfil
                  </Button>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={techProfile.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-ink">
                        {techProfile.name}
                      </p>
                      <p className="truncate text-xs text-brand-600">
                        {specialtyName(techProfile.specialty)}
                      </p>
                      <Rating value={techProfile.rating} count={techProfile.reviewCount} />
                    </div>
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Miembro desde</dt>
                      <dd className="font-semibold text-ink">{formatDate(techProfile.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Solicitudes</dt>
                      <dd className="font-semibold text-ink">{requests.length}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Estado</dt>
                      <dd className="font-semibold text-ink">
                        {techProfile.approved ? 'Aprobado' : 'En revisión'}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    to={`/tecnico/${techProfile.id}`}
                    className={buttonStyles({ variant: 'outline', size: 'sm', full: true, className: 'mt-4' })}
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    Ver cómo me ven los clientes
                  </Link>
                </div>

                <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-xs leading-relaxed text-brand-800">
                  <p className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    Consejo para tu perfil
                  </p>
                  <p className="mt-1.5 text-brand-700/80">
                    Responde las solicitudes en menos de 15 minutos. Un titular claro, fotos de
                    trabajos anteriores y un precio base realista mejoran tu tasa de aceptación.
                  </p>
                </div>

                <div className="card p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Datos de contacto
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-brand-500" />
                    {user?.phone ?? 'Sin teléfono'}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-brand-500" />
                    {techProfile.address}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <Clock3 className="h-3.5 w-3.5 text-brand-500" />
                    {techProfile.schedule}
                  </p>
                </div>
              </aside>
            </form>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalle de la solicitud"
        description="Gestiona el servicio y mantén informado al cliente."
        size="lg"
      >
        {detail && <RequestDetail request={detail} role="tecnico" actions={detailActions} />}
      </Modal>
    </div>
  );
}
