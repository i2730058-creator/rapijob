import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FolderTree,
  LayoutDashboard,
  MapPin,
  MessageSquareQuote,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import type { Role, ServiceRequest, Specialty, Technician, User } from '@/types';
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
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { ACTIVE_STATUSES, STATUS_FLOW, STATUS_META } from '@/lib/constants';
import { cn, formatDate, formatDateShort, formatPrice, pluralize, timeAgo } from '@/lib/utils';

type TabId =
  | 'resumen'
  | 'tecnicos'
  | 'usuarios'
  | 'solicitudes'
  | 'categorias'
  | 'reportes'
  | 'resenas';

type RoleFilter = 'todos' | Role;
type UserStatusFilter = 'todos' | 'activo' | 'suspendido';
type TechFilter = 'todos' | 'pendientes' | 'aprobados' | 'verificados' | 'no_disponibles';
type RequestFilter = 'todas' | ServiceRequest['status'];
type CategoryEditing = Specialty | 'new' | null;

interface CategoryForm {
  slug: string;
  name: string;
  description: string;
  basePrice: string;
}

const ROLE_LABEL: Record<Role, string> = {
  cliente: 'Cliente',
  tecnico: 'Técnico',
  admin: 'Administrador',
};

const ROLE_STYLE: Record<Role, string> = {
  cliente: 'bg-brand-50 text-brand-700 ring-brand-200',
  tecnico: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
};

function nextStatus(status: ServiceRequest['status']): ServiceRequest['status'] | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdminPanel() {
  const {
    users,
    technicians,
    requests,
    specialties,
    reviews,
    loading,
    refreshing,
    refreshAll,
    updateTechnician,
    updateUser,
    updateSpecialty,
    addSpecialty,
    updateRequestStatus,
    cancelRequest,
    specialtyName,
  } = useData();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('resumen');
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [techQuery, setTechQuery] = useState('');
  const [techFilter, setTechFilter] = useState<TechFilter>('todos');

  const [userQuery, setUserQuery] = useState('');
  const [userRole, setUserRole] = useState<RoleFilter>('todos');
  const [userStatus, setUserStatus] = useState<UserStatusFilter>('todos');

  const [requestQuery, setRequestQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('todas');

  const [editingCategory, setEditingCategory] = useState<CategoryEditing>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    slug: '',
    name: '',
    description: '',
    basePrice: '50',
  });

  const pendingTechs = technicians.filter((tech) => !tech.approved);
  const activeRequests = requests.filter((request) => ACTIVE_STATUSES.includes(request.status));
  const completedRequests = requests.filter((request) => request.status === 'completada');
  const revenue = completedRequests.reduce((sum, request) => sum + request.price, 0);
  const averageRating =
    technicians.filter((tech) => tech.reviewCount > 0).length > 0
      ? technicians.reduce((sum, tech) => sum + tech.rating, 0) /
        technicians.filter((tech) => tech.reviewCount > 0).length
      : 0;

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'tecnicos', label: 'Técnicos', icon: Wrench, count: pendingTechs.length },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'solicitudes', label: 'Solicitudes', icon: ClipboardList, count: activeRequests.length },
    { id: 'categorias', label: 'Categorías', icon: FolderTree },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'resenas', label: 'Reseñas', icon: MessageSquareQuote },
  ];

  const filteredTechs = useMemo(() => {
    const query = techQuery.trim().toLowerCase();
    return technicians
      .filter((tech) => {
        if (techFilter === 'pendientes') return !tech.approved;
        if (techFilter === 'aprobados') return tech.approved;
        if (techFilter === 'verificados') return tech.verified;
        if (techFilter === 'no_disponibles') return !tech.available;
        return true;
      })
      .filter((tech) => {
        if (!query) return true;
        return (
          tech.name.toLowerCase().includes(query) ||
          tech.district.toLowerCase().includes(query) ||
          specialtyName(tech.specialty).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => Number(a.approved) - Number(b.approved) || a.name.localeCompare(b.name));
  }, [technicians, techFilter, techQuery, specialtyName]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return users
      .filter((user) => (userRole === 'todos' ? true : user.role === userRole))
      .filter((user) => (userStatus === 'todos' ? true : user.status === userStatus))
      .filter((user) => {
        if (!query) return true;
        return (
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phone.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          Number(b.status === 'activo') - Number(a.status === 'activo') ||
          a.name.localeCompare(b.name),
      );
  }, [users, userRole, userStatus, userQuery]);

  const filteredRequests = useMemo(() => {
    const query = requestQuery.trim().toLowerCase();
    return requests
      .filter((request) => (requestFilter === 'todas' ? true : request.status === requestFilter))
      .filter((request) => {
        if (!query) return true;
        return (
          request.folio.toLowerCase().includes(query) ||
          request.clientName.toLowerCase().includes(query) ||
          request.techName.toLowerCase().includes(query) ||
          request.district.toLowerCase().includes(query)
        );
      });
  }, [requests, requestFilter, requestQuery]);

  const bySpecialty = useMemo(() => {
    return specialties
      .map((specialty) => ({
        label: specialty.name,
        value: requests.filter((request) => request.specialty === specialty.slug).length,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [specialties, requests]);

  const byDistrict = useMemo(() => {
    return ['Huancayo', 'El Tambo', 'Chilca']
      .map((district) => ({
        label: district,
        value: requests.filter((request) => request.district === district).length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [requests]);

  const byStatus = useMemo(() => {
    return (Object.keys(STATUS_META) as Array<ServiceRequest['status']>).map((status) => ({
      label: STATUS_META[status].label,
      value: requests.filter((request) => request.status === status).length,
    }));
  }, [requests]);

  const topTechs = useMemo(
    () =>
      [...technicians]
        .map((tech) => ({
          tech,
          completed: requests.filter(
            (request) => request.techId === tech.id && request.status === 'completada',
          ).length,
          income: requests
            .filter((request) => request.techId === tech.id && request.status === 'completada')
            .reduce((sum, request) => sum + request.price, 0),
        }))
        .sort((a, b) => b.income - a.income || b.tech.rating - a.tech.rating)
        .slice(0, 5),
    [technicians, requests],
  );

  const doRefresh = async () => {
    await refreshAll();
    toast.success('Datos actualizados', 'La información más reciente ya está en pantalla.');
  };

  const approveTech = async (tech: Technician) => {
    setBusy(`tech-${tech.id}`);
    try {
      await updateTechnician(tech.id, { approved: true });
      toast.success('Técnico aprobado', `${tech.name} ya puede recibir solicitudes de clientes.`);
    } catch (error) {
      toast.error(
        'No se pudo aprobar al técnico',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const verifyTech = async (tech: Technician) => {
    setBusy(`tech-${tech.id}`);
    try {
      await updateTechnician(tech.id, { verified: true });
      toast.success('Perfil verificado', `${tech.name} ahora muestra el sello de verificación.`);
    } catch (error) {
      toast.error(
        'No se pudo verificar al técnico',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleTechAvailability = async (tech: Technician) => {
    setBusy(`tech-${tech.id}`);
    try {
      await updateTechnician(tech.id, { available: !tech.available });
      toast.info(
        tech.available ? 'Disponibilidad pausada' : 'Disponibilidad activada',
        `${tech.name} ${tech.available ? 'no aparecerá' : 'ya aparece'} en las búsquedas.`,
      );
    } catch (error) {
      toast.error(
        'No se pudo actualizar la disponibilidad',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleUserStatus = async (user: User) => {
    const nextStatusValue = user.status === 'activo' ? 'suspendido' : 'activo';
    setBusy(`user-${user.id}`);
    try {
      await updateUser(user.id, { status: nextStatusValue });
      toast.info(
        nextStatusValue === 'suspendido' ? 'Usuario suspendido' : 'Usuario reactivado',
        `${user.name} ahora tiene estado ${nextStatusValue}.`,
      );
    } catch (error) {
      toast.error(
        'No se pudo actualizar al usuario',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleCategory = async (specialty: Specialty) => {
    setBusy(`cat-${specialty.slug}`);
    try {
      await updateSpecialty(specialty.slug, { active: !specialty.active });
      toast.info(
        specialty.active ? 'Categoría ocultada' : 'Categoría activada',
        `${specialty.name} ${specialty.active ? 'no se mostrará' : 'ya está disponible'} en el sitio.`,
      );
    } catch (error) {
      toast.error(
        'No se pudo actualizar la categoría',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const openNewCategory = () => {
    setCategoryForm({ slug: '', name: '', description: '', basePrice: '50' });
    setEditingCategory('new');
  };

  const openEditCategory = (specialty: Specialty) => {
    setCategoryForm({
      slug: specialty.slug,
      name: specialty.name,
      description: specialty.description,
      basePrice: String(specialty.basePrice),
    });
    setEditingCategory(specialty);
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCategory) return;
    if (categoryForm.name.trim().length < 3) {
      toast.error('Escribe el nombre de la categoría');
      return;
    }
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      basePrice: Number(categoryForm.basePrice) || 50,
    };
    if (editingCategory === 'new' && !/^[a-z0-9-]{3,}$/.test(categoryForm.slug.trim())) {
      toast.error(
        'Identificador inválido',
        'Usa solo minúsculas, números y guiones (mínimo 3 caracteres).',
      );
      return;
    }
    setBusy('category');
    try {
      if (editingCategory === 'new') {
        await addSpecialty({ slug: categoryForm.slug.trim(), ...payload });
        toast.success('Categoría creada', `${payload.name} ya está disponible en RapiJob.`);
      } else {
        await updateSpecialty(editingCategory.slug, payload);
        toast.success('Categoría actualizada', 'Los cambios se guardaron correctamente.');
      }
      setEditingCategory(null);
    } catch (error) {
      toast.error(
        'No se pudo guardar la categoría',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const advanceRequest = async (request: ServiceRequest) => {
    const next = nextStatus(request.status);
    if (!next) return;
    setBusy(`request-${request.id}`);
    try {
      const updated = await updateRequestStatus(
        request.id,
        next,
        'Estado actualizado por el equipo de administración.',
      );
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.success('Solicitud actualizada', `Nuevo estado: ${STATUS_META[next].label}.`);
    } catch (error) {
      toast.error(
        'No se pudo actualizar la solicitud',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const cancelAsAdmin = async (request: ServiceRequest) => {
    setBusy(`request-${request.id}`);
    try {
      const updated = await cancelRequest(request.id, 'Cancelada por el equipo de administración.');
      setDetail((current) => (current?.id === updated.id ? updated : current));
      toast.info('Solicitud cancelada', `El folio ${request.folio} quedó cancelado.`);
    } catch (error) {
      toast.error(
        'No se pudo cancelar la solicitud',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setBusy(null);
    }
  };

  const exportRequests = () => {
    downloadCsv('rapijob-solicitudes.csv', [
      ['Folio', 'Cliente', 'Técnico', 'Especialidad', 'Distrito', 'Fecha', 'Hora', 'Estado', 'Precio'],
      ...requests.map((request) => [
        request.folio,
        request.clientName,
        request.techName,
        specialtyName(request.specialty),
        request.district,
        request.date,
        request.time,
        STATUS_META[request.status].label,
        request.price,
      ]),
    ]);
    toast.success('Reporte exportado', 'Se descargó el archivo CSV con todas las solicitudes.');
  };

  const detailActions = detail ? (
    <>
      {nextStatus(detail.status) && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => void advanceRequest(detail)}
          disabled={busy === `request-${detail.id}`}
        >
          Avanzar a {STATUS_META[nextStatus(detail.status)!].label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
      {!['completada', 'cancelada'].includes(detail.status) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void cancelAsAdmin(detail)}
          disabled={busy === `request-${detail.id}`}
          className="text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
        Cerrar
      </Button>
    </>
  ) : null;

  if (loading) return <FullPageLoader label="Cargando administración…" />;

  return (
    <div className="min-h-screen bg-cloud pb-16">
      <PanelHeader
        eyebrow="Administración"
        title="Centro de control RapiJob"
        description="Supervisa usuarios, técnicos, solicitudes y la operación de la plataforma en Huancayo, El Tambo y Chilca."
        actions={
          <>
            <Link to="/" className={buttonStyles({ variant: 'outline', size: 'md' })}>
              <Eye className="h-4 w-4" />
              Ver sitio
            </Link>
            <Button variant="primary" size="md" onClick={() => void doRefresh()} loading={refreshing}>
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </Button>
          </>
        }
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Plataforma operativa
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            Huancayo · El Tambo · Chilca
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            <Clock3 className="h-3.5 w-3.5 text-brand-500" />
            Actualización cada 25 s
          </span>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-1">
          <PanelTabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />
        </div>
      </PanelHeader>

      <div className="container-rj pt-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard
            icon={Users}
            label="Usuarios"
            value={users.length}
            hint={`${users.filter((user) => user.role === 'cliente').length} clientes`}
            tone="brand"
          />
          <StatCard
            icon={Wrench}
            label="Técnicos"
            value={technicians.length}
            hint={`${pendingTechs.length} por aprobar`}
            tone="emerald"
          />
          <StatCard
            icon={ClipboardList}
            label="Solicitudes activas"
            value={activeRequests.length}
            hint={`${requests.length} en total`}
            tone="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completadas"
            value={completedRequests.length}
            hint={`${reviews.length} reseñas`}
            tone="violet"
          />
          <StatCard
            icon={Wallet}
            label="Ingresos registrados"
            value={formatPrice(revenue)}
            hint="Servicios completados"
            tone="rose"
          />
        </div>

        <div className="mt-6">
          {/* ------------------------------ RESUMEN ------------------------------ */}
          {tab === 'resumen' && (
            <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="min-w-0 space-y-5">
                <section className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                        <Sparkles className="h-4 w-4 text-sun-500" />
                        Técnicos pendientes de aprobación
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Revisa sus datos y habilítalos para recibir solicitudes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('tecnicos')}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                      Ver todos →
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pendingTechs.length === 0 ? (
                      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                        Todos los técnicos están aprobados. ¡Buen trabajo!
                      </p>
                    ) : (
                      pendingTechs.slice(0, 4).map((tech) => (
                        <div
                          key={tech.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3"
                        >
                          <Avatar name={tech.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{tech.name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {specialtyName(tech.specialty)} · {tech.district} ·{' '}
                              {tech.experienceYears} años de exp.
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              Registrado {timeAgo(tech.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to={`/tecnico/${tech.id}`}
                              className={buttonStyles({ variant: 'outline', size: 'sm' })}
                            >
                              Ver
                            </Link>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void approveTech(tech)}
                              loading={busy === `tech-${tech.id}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                      <Clock3 className="h-4 w-4 text-brand-500" />
                      Solicitudes recientes
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('solicitudes')}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                      Gestionar →
                    </button>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                          <th className="pb-2 font-bold">Folio</th>
                          <th className="pb-2 font-bold">Cliente</th>
                          <th className="pb-2 font-bold">Técnico</th>
                          <th className="pb-2 font-bold">Estado</th>
                          <th className="pb-2 text-right font-bold">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.slice(0, 6).map((request) => (
                          <tr
                            key={request.id}
                            className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-cloud/60"
                            onClick={() => setDetail(request)}
                          >
                            <td className="py-2.5 font-mono text-[10px] font-semibold text-brand-700">
                              {request.folio}
                            </td>
                            <td className="max-w-[130px] truncate py-2.5 font-semibold text-ink">
                              {request.clientName}
                            </td>
                            <td className="max-w-[130px] truncate py-2.5 text-slate-600">
                              {request.techName}
                            </td>
                            <td className="py-2.5">
                              <StatusBadge status={request.status} />
                            </td>
                            <td className="py-2.5 text-right font-bold text-ink">
                              {formatPrice(request.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-5">
                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Salud de la plataforma
                  </h2>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: 'Tasa de aprobación de técnicos',
                        value: technicians.length
                          ? Math.round(
                              (technicians.filter((tech) => tech.approved).length /
                                technicians.length) *
                                100,
                            )
                          : 0,
                        tone: 'bg-emerald-500',
                      },
                      {
                        label: 'Solicitudes completadas',
                        value: requests.length
                          ? Math.round((completedRequests.length / requests.length) * 100)
                          : 0,
                        tone: 'bg-brand-500',
                      },
                      {
                        label: 'Solicitudes canceladas',
                        value: requests.length
                          ? Math.round(
                              (requests.filter((request) => request.status === 'cancelada').length /
                                requests.length) *
                                100,
                            )
                          : 0,
                        tone: 'bg-rose-400',
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{item.label}</span>
                          <span className="font-bold text-ink">{item.value}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full', item.tone)}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div className="rounded-xl bg-cloud p-2.5">
                      <p className="font-display text-lg font-extrabold text-ink">
                        {averageRating ? averageRating.toFixed(1) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-500">Valoración media</p>
                    </div>
                    <div className="rounded-xl bg-cloud p-2.5">
                      <p className="font-display text-lg font-extrabold text-ink">
                        {requests.length ? formatPrice(Math.round(revenue / completedRequests.length || 0)) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-500">Ticket promedio</p>
                    </div>
                  </div>
                </section>

                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <Award className="h-4 w-4 text-sun-500" />
                    Técnicos destacados
                  </h2>
                  <div className="mt-4 space-y-2.5">
                    {topTechs.map(({ tech, completed, income }) => (
                      <div key={tech.id} className="flex items-center gap-2.5">
                        <Avatar name={tech.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-ink">{tech.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {completed} servicios · {formatPrice(income)}
                          </p>
                        </div>
                        <Rating value={tech.rating} showValue={false} size="sm" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ------------------------------ TECNICOS ------------------------------ */}
          {tab === 'tecnicos' && (
            <div>
              <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row">
                <label className="relative block flex-1">
                  <span className="sr-only">Buscar técnico</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={techQuery}
                    onChange={(event) => setTechQuery(event.target.value)}
                    placeholder="Buscar por nombre, especialidad o distrito…"
                    className="input-field pl-10"
                  />
                </label>
                <select
                  value={techFilter}
                  onChange={(event) => setTechFilter(event.target.value as TechFilter)}
                  className="select-field sm:max-w-[210px]"
                >
                  <option value="todos">Todos los técnicos</option>
                  <option value="pendientes">Pendientes de aprobación</option>
                  <option value="aprobados">Aprobados</option>
                  <option value="verificados">Verificados</option>
                  <option value="no_disponibles">No disponibles</option>
                </select>
              </div>

              {filteredTechs.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={Search}
                    title="No hay técnicos con ese filtro"
                    description="Prueba con otro término o cambia el estado de aprobación."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTechs.map((tech) => (
                    <article key={tech.id} className="card p-4 sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Avatar name={tech.name} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-sm font-bold text-ink">{tech.name}</p>
                              {tech.verified && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 ring-1 ring-inset ring-brand-100">
                                  <BadgeCheck className="h-3 w-3" />
                                  Verificado
                                </span>
                              )}
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                                  tech.approved
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200',
                                )}
                              >
                                {tech.approved ? 'Aprobado' : 'Pendiente'}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                  tech.available
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500',
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    tech.available ? 'bg-emerald-500' : 'bg-slate-400',
                                  )}
                                />
                                {tech.available ? 'Disponible' : 'No disponible'}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-brand-600">
                              {specialtyName(tech.specialty)} · {tech.district}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                              {tech.headline}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3 w-3 text-sun-500" />
                                {tech.rating || 'Sin calificación'} ({tech.reviewCount})
                              </span>
                              <span>{tech.jobsDone} trabajos</span>
                              <span>Desde {formatPrice(tech.priceFrom)}</span>
                              <span>Registrado {formatDateShort(tech.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/tecnico/${tech.id}`}
                            className={buttonStyles({ variant: 'outline', size: 'sm' })}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver perfil
                          </Link>
                          {!tech.approved && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void approveTech(tech)}
                              loading={busy === `tech-${tech.id}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Aprobar
                            </Button>
                          )}
                          {!tech.verified && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void verifyTech(tech)}
                              disabled={busy === `tech-${tech.id}`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verificar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void toggleTechAvailability(tech)}
                            disabled={busy === `tech-${tech.id}`}
                          >
                            {tech.available ? (
                              <PauseCircle className="h-3.5 w-3.5" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            {tech.available ? 'Pausar' : 'Activar'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------ USUARIOS ------------------------------ */}
          {tab === 'usuarios' && (
            <div>
              <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_170px_170px]">
                <label className="relative block">
                  <span className="sr-only">Buscar usuario</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Buscar por nombre, correo o teléfono…"
                    className="input-field pl-10"
                  />
                </label>
                <select
                  value={userRole}
                  onChange={(event) => setUserRole(event.target.value as RoleFilter)}
                  className="select-field"
                >
                  <option value="todos">Todos los roles</option>
                  <option value="cliente">Clientes</option>
                  <option value="tecnico">Técnicos</option>
                  <option value="admin">Administradores</option>
                </select>
                <select
                  value={userStatus}
                  onChange={(event) => setUserStatus(event.target.value as UserStatusFilter)}
                  className="select-field"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="suspendido">Suspendidos</option>
                </select>
              </div>

              <div className="card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <p className="text-xs font-bold text-ink">
                    {pluralize(filteredUsers.length, 'usuario encontrado', 'usuarios encontrados')}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {pluralize(users.filter((user) => user.status === 'suspendido').length, 'suspendido', 'suspendidos')}
                  </span>
                </div>
                {filteredUsers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No encontramos usuarios"
                    description="Ajusta la búsqueda o los filtros aplicados."
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                                  ROLE_STYLE[user.role],
                                )}
                              >
                                {ROLE_LABEL[user.role]}
                              </span>
                              {user.status === 'suspendido' && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                                  Suspendido
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate-500">
                              {user.email} · {user.phone}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {user.city} · Registrado {formatDateShort(user.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.role !== 'admin' ? (
                            <Button
                              variant={user.status === 'activo' ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => void toggleUserStatus(user)}
                              disabled={busy === `user-${user.id}`}
                              className={
                                user.status === 'activo'
                                  ? 'text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                                  : undefined
                              }
                            >
                              {user.status === 'activo' ? (
                                <>
                                  <PauseCircle className="h-3.5 w-3.5" />
                                  Suspender
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  Reactivar
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500">
                              Cuenta protegida
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------ SOLICITUDES ------------------------------ */}
          {tab === 'solicitudes' && (
            <div>
              <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row">
                <label className="relative block flex-1">
                  <span className="sr-only">Buscar solicitud</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={requestQuery}
                    onChange={(event) => setRequestQuery(event.target.value)}
                    placeholder="Buscar por folio, cliente, técnico o distrito…"
                    className="input-field pl-10"
                  />
                </label>
                <select
                  value={requestFilter}
                  onChange={(event) => setRequestFilter(event.target.value as RequestFilter)}
                  className="select-field sm:max-w-[210px]"
                >
                  <option value="todas">Todos los estados</option>
                  {(Object.keys(STATUS_META) as Array<ServiceRequest['status']>).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => void doRefresh()} loading={refreshing}>
                  <RefreshCcw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={ClipboardList}
                    title="No hay solicitudes con ese filtro"
                    description="Cambia el estado o limpia la búsqueda para ver más resultados."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      role="admin"
                      specialtyName={specialtyName(request.specialty)}
                      onOpen={() => setDetail(request)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------ CATEGORIAS ------------------------------ */}
          {tab === 'categorias' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
                <div>
                  <p className="text-sm font-bold text-ink">
                    {pluralize(specialties.length, 'categoría', 'categorías')} de servicio
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Activa, desactiva o ajusta el precio base de cada especialidad.
                  </p>
                </div>
                <Button variant="primary" size="md" onClick={openNewCategory}>
                  <Plus className="h-4 w-4" />
                  Nueva categoría
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specialties.map((specialty) => {
                  const usage = requests.filter(
                    (request) => request.specialty === specialty.slug,
                  ).length;
                  return (
                    <article
                      key={specialty.slug}
                      className={cn(
                        'card flex flex-col p-5',
                        !specialty.active && 'border-dashed bg-slate-50/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <SpecialtyIcon slug={specialty.slug} size="lg" />
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                            specialty.active
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-slate-100 text-slate-500 ring-slate-200',
                          )}
                        >
                          {specialty.active ? 'Activa' : 'Oculta'}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-sm font-bold text-ink">{specialty.name}</h3>
                      <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                        {specialty.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                        <span className="font-semibold text-brand-600">
                          Desde {formatPrice(specialty.basePrice)}
                        </span>
                        <span className="text-slate-500">
                          {pluralize(usage, 'solicitud', 'solicitudes')}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditCategory(specialty)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleCategory(specialty)}
                          disabled={busy === `cat-${specialty.slug}`}
                        >
                          {specialty.active ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Activar
                            </>
                          )}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------ REPORTES ------------------------------ */}
          {tab === 'reportes' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
                <div>
                  <p className="text-sm font-bold text-ink">Reporte operativo</p>
                  <p className="text-[11px] text-slate-500">
                    Datos consolidados de {pluralize(requests.length, 'solicitud', 'solicitudes')} y{' '}
                    {pluralize(technicians.length, 'técnico', 'técnicos')}.
                  </p>
                </div>
                <Button variant="primary" size="md" onClick={exportRequests}>
                  <Download className="h-4 w-4" />
                  Exportar solicitudes (CSV)
                </Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <BarChart3 className="h-4 w-4 text-brand-500" />
                    Solicitudes por especialidad
                  </h2>
                  <div className="mt-4 space-y-3">
                    {bySpecialty.length === 0 ? (
                      <p className="text-xs text-slate-500">Aún no hay datos suficientes.</p>
                    ) : (
                      bySpecialty.map((item) => {
                        const max = bySpecialty[0]?.value || 1;
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="truncate text-slate-600">{item.label}</span>
                              <span className="font-bold text-ink">{item.value}</span>
                            </div>
                            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                                style={{ width: `${Math.round((item.value / max) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <MapPin className="h-4 w-4 text-sun-500" />
                    Cobertura por distrito
                  </h2>
                  <div className="mt-4 space-y-3">
                    {byDistrict.map((item) => {
                      const total = byDistrict.reduce((sum, entry) => sum + entry.value, 0) || 1;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-bold text-ink">
                              {item.value} · {Math.round((item.value / total) * 100)}%
                            </span>
                          </div>
                          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-sun-500"
                              style={{ width: `${Math.round((item.value / total) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-xl bg-cloud p-3 text-[11px] leading-relaxed text-slate-500">
                    La cobertura inicial se concentra en Huancayo, El Tambo y Chilca. La plataforma está
                    preparada para agregar nuevos distritos.
                  </div>
                </section>

                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <ClipboardList className="h-4 w-4 text-violet-500" />
                    Estado de las solicitudes
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {byStatus.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-cloud p-3">
                        <p className="font-display text-xl font-extrabold text-ink">{item.value}</p>
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card p-5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    Resumen económico
                  </h2>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2.5">
                      <span className="text-slate-500">Ingresos registrados</span>
                      <span className="font-display text-base font-extrabold text-ink">
                        {formatPrice(revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2.5">
                      <span className="text-slate-500">Servicios completados</span>
                      <span className="font-bold text-ink">{completedRequests.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2.5">
                      <span className="text-slate-500">Ticket promedio</span>
                      <span className="font-bold text-ink">
                        {completedRequests.length
                          ? formatPrice(Math.round(revenue / completedRequests.length))
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-cloud px-3 py-2.5">
                      <span className="text-slate-500">Ingresos potenciales activos</span>
                      <span className="font-bold text-ink">
                        {formatPrice(
                          activeRequests.reduce((sum, request) => sum + request.price, 0),
                        )}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <section className="card min-w-0 p-5">
                <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Ranking de técnicos por ingresos
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-bold">#</th>
                        <th className="pb-2 font-bold">Técnico</th>
                        <th className="pb-2 font-bold">Especialidad</th>
                        <th className="pb-2 font-bold">Distrito</th>
                        <th className="pb-2 font-bold">Completados</th>
                        <th className="pb-2 text-right font-bold">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTechs.map(({ tech, completed, income }, index) => (
                        <tr key={tech.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 font-bold text-slate-500">{index + 1}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={tech.name} size="sm" />
                              <span className="font-semibold text-ink">{tech.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-slate-600">{specialtyName(tech.specialty)}</td>
                          <td className="py-2.5 text-slate-600">{tech.district}</td>
                          <td className="py-2.5 font-semibold text-ink">{completed}</td>
                          <td className="py-2.5 text-right font-bold text-ink">
                            {formatPrice(income)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* ------------------------------ RESEÑAS ------------------------------ */}
          {tab === 'resenas' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
                <div>
                  <p className="text-sm font-bold text-ink">Opiniones de clientes</p>
                  <p className="text-[11px] text-slate-500">
                    {pluralize(reviews.length, 'reseña registrada', 'reseñas registradas')} ·{' '}
                    {averageRating ? `promedio ${averageRating.toFixed(1)}/5` : 'sin promedio aún'}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-cloud px-3 py-2">
                  <Star className="h-4 w-4 fill-sun-500 text-sun-500" />
                  <span className="text-sm font-bold text-ink">
                    {reviews.length
                      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                      : '—'}
                  </span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={MessageSquareQuote}
                    title="Aún no hay reseñas"
                    description="Las calificaciones de los clientes aparecerán aquí cuando se completen los servicios."
                  />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reviews.map((review) => {
                    const tech = technicians.find((item) => item.id === review.techId);
                    return (
                      <article key={review.id} className="card flex flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={review.clientName} size="md" />
                            <div>
                              <p className="text-sm font-bold text-ink">{review.clientName}</p>
                              <p className="text-[10px] text-slate-500">{timeAgo(review.createdAt)}</p>
                            </div>
                          </div>
                          <Rating value={review.rating} showValue={false} size="sm" />
                        </div>
                        <p className="mt-3 flex-1 text-xs leading-relaxed text-slate-600">
                          {review.comment || 'Servicio calificado sin comentario.'}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px]">
                          <span className="truncate text-slate-500">
                            Para {tech?.name ?? 'técnico eliminado'}
                          </span>
                          {tech && (
                            <Link
                              to={`/tecnico/${tech.id}`}
                              className="shrink-0 font-bold text-brand-600 hover:text-brand-700"
                            >
                              Ver perfil →
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detalle de solicitud */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Gestión de la solicitud"
        description="Revisa la información completa y actualiza el estado del servicio."
        size="lg"
      >
        {detail && <RequestDetail request={detail} role="admin" actions={detailActions} />}
      </Modal>

      {/* Categoría */}
      <Modal
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        title={editingCategory === 'new' ? 'Nueva categoría' : 'Editar categoría'}
        description="Las categorías definen los servicios disponibles para los clientes."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              form="category-form"
              type="submit"
              loading={busy === 'category'}
            >
              <Check className="h-3.5 w-3.5" />
              {editingCategory === 'new' ? 'Crear categoría' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={saveCategory} className="space-y-4">
          <div>
            <label className="label" htmlFor="cat-name">
              Nombre visible
            </label>
            <input
              id="cat-name"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
              placeholder="Ej. Técnicos de refrigeración"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="cat-slug">
              Identificador
            </label>
            <input
              id="cat-slug"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
              placeholder="ej. refrigeracion"
              className="input-field font-mono text-xs"
              disabled={editingCategory !== 'new'}
              required
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Solo minúsculas, números y guiones. No se puede cambiar después de crear la categoría.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="cat-description">
              Descripción
            </label>
            <textarea
              id="cat-description"
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm({ ...categoryForm, description: event.target.value })
              }
              rows={3}
              className="input-field resize-none"
              placeholder="Describe brevemente los servicios incluidos…"
            />
          </div>
          <div>
            <label className="label" htmlFor="cat-price">
              Precio base referencial (S/)
            </label>
            <input
              id="cat-price"
              type="number"
              min={10}
              step={5}
              value={categoryForm.basePrice}
              onChange={(event) => setCategoryForm({ ...categoryForm, basePrice: event.target.value })}
              className="input-field"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
