import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  History,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { ServiceRequest } from '@/types';
import { Avatar } from '@/components/Avatar';
import { Button, buttonStyles } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { Rating } from '@/components/Rating';
import { RequestCard } from '@/components/RequestCard';
import { StatusBadge } from '@/components/StatusBadge';
import { FullPageLoader } from '@/components/ProtectedRoute';
import { PanelHeader } from '@/components/panel/PanelHeader';
import { PanelTabs } from '@/components/panel/PanelTabs';
import { RequestDetail } from '@/components/panel/RequestDetail';
import { StatCard } from '@/components/panel/StatCard';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { ACTIVE_STATUSES } from '@/lib/constants';
import { IS_SUPABASE, resetDemoData } from '@/lib/repo';
import { formatDate, formatPriceExact, pluralize } from '@/lib/utils';

type TabId = 'activas' | 'historial' | 'perfil';

export function ClientPanel() {
  const { user, updateProfile, signOut } = useAuth();
  const { requests, loading, specialtyName, cancelRequest, rateRequest } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('activas');
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ServiceRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [ratingTarget, setRatingTarget] = useState<ServiceRequest | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    city: user?.city ?? 'Huancayo',
  });

  const active = useMemo(
    () => requests.filter((request) => ACTIVE_STATUSES.includes(request.status)),
    [requests],
  );
  const history = useMemo(
    () => requests.filter((request) => !ACTIVE_STATUSES.includes(request.status)),
    [requests],
  );
  const completed = requests.filter((request) => request.status === 'completada');
  const spent = completed.reduce((sum, request) => sum + request.price, 0);
  const rated = requests.filter((request) => typeof request.rating === 'number');
  const averageRating = rated.length
    ? rated.reduce((sum, request) => sum + (request.rating ?? 0), 0) / rated.length
    : 0;
  const nextRequest = active[0];

  const tabs = [
    { id: 'activas', label: 'En curso', icon: Clock3, count: active.length },
    { id: 'historial', label: 'Historial', icon: History, count: history.length },
    { id: 'perfil', label: 'Mi perfil', icon: UserRound },
  ];

  const openRating = (request: ServiceRequest) => {
    setRatingTarget(request);
    setRating(5);
    setComment('');
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const updated = await cancelRequest(cancelTarget.id, cancelReason.trim() || undefined);
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.success('Solicitud cancelada', `El folio ${updated.folio} quedó cancelado.`);
      setCancelTarget(null);
      setCancelReason('');
    } catch (error) {
      toast.error(
        'No se pudo cancelar',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRate = async () => {
    if (!ratingTarget) return;
    setBusy(true);
    try {
      const updated = await rateRequest(ratingTarget.id, rating, comment);
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.success('¡Gracias por tu opinión!', 'Tu calificación ayuda a otros clientes.');
      setRatingTarget(null);
    } catch (error) {
      toast.error(
        'No se pudo enviar la calificación',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (profile.name.trim().length < 3) {
      toast.error('Ingresa tu nombre completo');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
        city: profile.city.trim(),
      });
      toast.success('Datos actualizados', 'Tu información de contacto quedó guardada.');
    } catch (error) {
      toast.error(
        'No se pudieron guardar los cambios',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    resetDemoData();
    await signOut();
    toast.info('Datos demo restablecidos', 'Vuelve a iniciar sesión con una cuenta de prueba.');
    navigate('/login', { replace: true });
  };

  const detailActions = detail ? (
    <>
      {detail.status === 'completada' && !detail.rating && (
        <Button variant="yellow" size="sm" onClick={() => openRating(detail)}>
          <Star className="h-3.5 w-3.5" />
          Calificar servicio
        </Button>
      )}
      {ACTIVE_STATUSES.includes(detail.status) && detail.status !== 'en_servicio' && (
        <Button variant="ghost" size="sm" onClick={() => setCancelTarget(detail)}>
          Cancelar solicitud
        </Button>
      )}
      {['completada', 'cancelada'].includes(detail.status) && (
        <Link
          to={`/solicitar?tecnico=${detail.techId}&especialidad=${detail.specialty}`}
          className={buttonStyles({ variant: 'outline', size: 'sm' })}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Solicitar de nuevo
        </Link>
      )}
      <Button variant="primary" size="sm" onClick={() => setDetail(null)}>
        Cerrar
      </Button>
    </>
  ) : null;

  if (loading) return <FullPageLoader label="Cargando tu panel…" />;

  return (
    <div className="min-h-screen bg-cloud pb-16">
      <PanelHeader
        eyebrow="Panel de cliente"
        title={user ? `Hola, ${user.name.split(' ')[0]}` : 'Mi panel'}
        description="Sigue el estado de tus servicios, revisa tu historial y mantén tus datos de contacto al día."
        actions={
          <>
            <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'md' })}>
              <Search className="h-4 w-4" />
              Buscar técnicos
            </Link>
            <Link to="/solicitar" className={buttonStyles({ variant: 'primary', size: 'md' })}>
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Link>
          </>
        }
      >
        <div className="mt-6 border-t border-slate-100 pt-1">
          <PanelTabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />
        </div>
      </PanelHeader>

      <div className="container-rj pt-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Solicitudes activas"
            value={active.length}
            hint={active.length ? 'En seguimiento ahora' : 'Sin servicios en curso'}
            tone="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label="Servicios completados"
            value={completed.length}
            hint="Historial de trabajos"
            tone="emerald"
          />
          <StatCard
            icon={Wallet}
            label="Inversión total"
            value={formatPriceExact(spent)}
            hint="Solo servicios completados"
            tone="amber"
          />
          <StatCard
            icon={Star}
            label="Tu calificación promedio"
            value={averageRating.toFixed(1)}
            hint={`${pluralize(rated.length, 'servicio calificado', 'servicios calificados')}`}
            tone="violet"
          />
        </div>

        {nextRequest && tab === 'activas' && (
          <div className="mt-5 overflow-hidden rounded-3xl bg-brand-950 p-5 text-white shadow-soft sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-500 text-ink">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-300">
                    Próximo servicio
                  </p>
                  <p className="mt-1 font-display text-lg font-extrabold">
                    {specialtyName(nextRequest.specialty)} · {formatDate(nextRequest.date)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-200">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {nextRequest.time} hrs
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {nextRequest.district} · {nextRequest.address}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={nextRequest.status} />
                <Button variant="white" size="sm" onClick={() => setDetail(nextRequest)}>
                  Ver seguimiento
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {tab === 'activas' && (
            <div className="space-y-4">
              {active.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={Sparkles}
                    title="No tienes servicios en curso"
                    description="Cuéntanos qué necesitas y te conectaremos con técnicos verificados cerca de ti."
                    action={
                      <Link to="/solicitar" className={buttonStyles({ variant: 'primary', size: 'md' })}>
                        Solicitar un técnico
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    }
                  />
                </div>
              ) : (
                active.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    role="cliente"
                    specialtyName={specialtyName(request.specialty)}
                    onOpen={() => setDetail(request)}
                    onCancel={() => setCancelTarget(request)}
                    busy={busy}
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
                    title="Aún no hay historial"
                    description="Cuando completes o canceles una solicitud, aparecerá aquí para que puedas consultarla."
                    action={
                      <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                        Explorar técnicos
                      </Link>
                    }
                  />
                </div>
              ) : (
                history.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    role="cliente"
                    specialtyName={specialtyName(request.specialty)}
                    onOpen={() => setDetail(request)}
                    onRate={() => openRating(request)}
                    busy={busy}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'perfil' && user && (
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
              <form onSubmit={saveProfile} className="card p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Datos personales</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Usaremos estos datos para coordinar tus servicios.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="profile-name">
                      Nombre completo
                    </label>
                    <input
                      id="profile-name"
                      value={profile.name}
                      onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-phone">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      id="profile-phone"
                      value={profile.phone}
                      onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-email">
                      Correo electrónico
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="profile-city">
                      Distrito
                    </label>
                    <select
                      id="profile-city"
                      value={profile.city}
                      onChange={(event) => setProfile({ ...profile, city: event.target.value })}
                      className="select-field"
                    >
                      <option value="Huancayo">Huancayo</option>
                      <option value="El Tambo">El Tambo</option>
                      <option value="Chilca">Chilca</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-brand-50 p-4 text-xs leading-relaxed text-brand-800">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Tu teléfono solo se comparte con el técnico asignado cuando la solicitud está
                    aceptada. Nunca mostramos tu correo ni tu ubicación exacta a otros usuarios.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button type="submit" variant="primary" size="md" loading={busy}>
                    Guardar cambios
                  </Button>
                </div>
              </form>

              <aside className="space-y-4">
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-ink">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Cuenta activa
                      </span>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Cliente desde</dt>
                      <dd className="font-semibold text-ink">{formatDate(user.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Solicitudes totales</dt>
                      <dd className="font-semibold text-ink">{requests.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Distrito</dt>
                      <dd className="font-semibold text-ink">{user.city}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card p-5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <CreditCard className="h-3.5 w-3.5" />
                    Resumen de cuenta
                  </p>
                  <p className="mt-2 font-display text-2xl font-extrabold text-ink">
                    {formatPriceExact(spent)}
                  </p>
                  <p className="text-xs text-slate-500">Invertido en servicios completados</p>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-cloud px-3 py-2 text-[11px] text-slate-500">
                    <Star className="h-3.5 w-3.5 fill-sun-500 text-sun-500" />
                    {averageRating ? `${averageRating.toFixed(1)} / 5` : 'Sin calificaciones aún'}
                  </div>
                </div>

                {!IS_SUPABASE && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Modo demostración
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">
                      Puedes restaurar los datos originales de RapiJob. Se cerrará tu sesión y se
                      eliminarán las solicitudes creadas en este navegador.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      onClick={() => void resetDemo()}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restablecer datos demo
                    </Button>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* Detalle de la solicitud */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalle de tu solicitud"
        description="Consulta el avance, los datos del servicio y el contacto del técnico."
        size="lg"
      >
        {detail && <RequestDetail request={detail} role="cliente" actions={detailActions} />}
      </Modal>

      {/* Cancelación */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="¿Cancelar esta solicitud?"
        description="Cuéntanos el motivo para mejorar el servicio. El técnico será notificado."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(null)} disabled={busy}>
              Volver
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleCancel()} loading={busy}>
              <XCircle className="h-3.5 w-3.5" />
              Sí, cancelar
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-cloud p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-500">
                  {cancelTarget.folio}
                </span>
                <StatusBadge status={cancelTarget.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {cancelTarget.description}
              </p>
            </div>
            <label className="block">
              <span className="label">Motivo (opcional)</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                placeholder="Ej. resolví el problema por mi cuenta, cambié de horario…"
                className="input-field resize-none"
              />
            </label>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              Si el técnico ya está en camino, coordina directamente antes de cancelar para evitar
              cargos por movilidad.
            </p>
          </div>
        )}
      </Modal>

      {/* Calificación */}
      <Modal
        open={Boolean(ratingTarget)}
        onClose={() => setRatingTarget(null)}
        title="Califica el servicio"
        description="Tu opinión es pública y ayuda a que otros clientes elijan con confianza."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRatingTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="yellow" size="sm" onClick={() => void handleRate()} loading={busy}>
              <Star className="h-3.5 w-3.5" />
              Enviar calificación
            </Button>
          </>
        }
      >
        {ratingTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-cloud p-3.5">
              <Avatar name={ratingTarget.techName} size="md" />
              <div>
                <p className="text-sm font-bold text-ink">{ratingTarget.techName}</p>
                <p className="text-xs text-slate-500">
                  {specialtyName(ratingTarget.specialty)} · {ratingTarget.folio}
                </p>
              </div>
            </div>
            <div>
              <span className="label">¿Cómo fue tu experiencia?</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="rounded-xl p-1.5 transition hover:bg-sun-100"
                    aria-label={`${value} estrellas`}
                  >
                    <Star
                      className={
                        value <= rating
                          ? 'h-8 w-8 fill-sun-500 text-sun-500'
                          : 'h-8 w-8 text-slate-300'
                      }
                    />
                  </button>
                ))}
                <span className="ml-1 text-sm font-bold text-ink">{rating}/5</span>
              </div>
            </div>
            <label className="block">
              <span className="label">Tu comentario</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={400}
                placeholder="Cuéntanos cómo fue la puntualidad, el trato y la calidad del trabajo…"
                className="input-field resize-none"
              />
              <span className="mt-1 block text-right text-[10px] text-slate-500">
                {comment.length}/400
              </span>
            </label>
            <Rating value={rating} showValue={false} size="md" />
          </div>
        )}
      </Modal>
    </div>
  );
}
