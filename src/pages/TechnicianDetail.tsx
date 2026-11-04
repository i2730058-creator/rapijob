import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Rating } from '@/components/Rating';
import { TechCard } from '@/components/TechCard';
import { MapView } from '@/components/MapView';
import { SpecialtyIcon } from '@/components/SpecialtyIcon';
import { SectionHeading } from '@/components/SectionHeading';
import { buttonStyles } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useData } from '@/context/DataContext';
import { formatDate, formatDistance, formatPrice, haversineKm } from '@/lib/utils';
import { DEFAULT_CENTER } from '@/lib/constants';

export function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const { technicians, reviewsForTech, specialtyName, specialties } = useData();
  const tech = technicians.find((item) => item.id === id);

  if (!tech || !tech.approved) {
    return (
      <div className="container-rj py-20">
        <EmptyState
          icon={Wrench}
          title="Técnico no encontrado"
          description="El perfil que buscas no existe o aún no está verificado en RapiJob."
          action={
            <Link to="/buscar" className={buttonStyles({ variant: 'primary', size: 'md' })}>
              Ver otros técnicos
            </Link>
          }
        />
      </div>
    );
  }

  const reviews = reviewsForTech(tech.id);
  const specialty = specialties.find((item) => item.slug === tech.specialty);
  const distance = haversineKm(DEFAULT_CENTER, { lat: tech.lat, lng: tech.lng });
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => Math.round(review.rating) === star).length,
  }));
  const maxCount = Math.max(1, ...ratingBreakdown.map((item) => item.count));
  const others = technicians
    .filter((item) => item.approved && item.id !== tech.id)
    .sort(
      (a, b) =>
        Number(b.specialty === tech.specialty) - Number(a.specialty === tech.specialty) ||
        b.rating - a.rating,
    )
    .slice(0, 3);

  return (
    <div className="bg-cloud pb-16">
      <section className="relative overflow-hidden bg-brand-950 py-9 text-white">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-20" />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-rj relative">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-brand-300">
            <Link to="/" className="hover:text-white">
              Inicio
            </Link>
            <span>/</span>
            <Link to="/buscar" className="hover:text-white">
              Técnicos
            </Link>
            <span>/</span>
            <span className="text-white">{tech.name}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar name={tech.name} size="2xl" ring className="shadow-2xl" />
              {tech.available && (
                <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-950 bg-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {tech.name}
                </h1>
                {tech.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sun-500/20 px-2.5 py-1 text-[10px] font-bold text-sun-300 ring-1 ring-inset ring-sun-400/30">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verificado
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${
                    tech.available
                      ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30'
                      : 'bg-white/10 text-brand-200 ring-white/15'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${tech.available ? 'bg-emerald-400' : 'bg-slate-400'}`}
                  />
                  {tech.available ? 'Disponible ahora' : 'No disponible'}
                </span>
              </div>
              <p className="mt-1 text-sm text-brand-200">
                {specialtyName(tech.specialty)} · {tech.district}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-brand-200">
                <Rating value={tech.rating} count={tech.reviewCount} size="md" />
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sun-400" />
                  a {formatDistance(distance)} del centro de Huancayo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-sun-400" />
                  {tech.schedule}
                </span>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-col">
              <Link
                to={`/solicitar?tecnico=${tech.id}&especialidad=${tech.specialty}`}
                className={buttonStyles({ variant: 'yellow', size: 'lg', full: true })}
              >
                Solicitar servicio
              </Link>
              <a
                href={`https://wa.me/${tech.whatsapp}?text=${encodeURIComponent(
                  `Hola ${tech.name}, te contacto desde RapiJob porque necesito un servicio de ${specialtyName(tech.specialty).toLowerCase()}.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({
                  variant: 'outline',
                  size: 'lg',
                  full: true,
                  className: 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white',
                })}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-rj mt-8">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="card p-6 lg:p-7">
              <h2 className="font-display text-lg font-bold text-ink">Sobre {tech.name.split(' ')[0]}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{tech.bio}</p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: BriefcaseBusiness, value: `${tech.experienceYears} años`, label: 'Experiencia' },
                  { icon: CheckCircle2, value: `${tech.jobsDone}+`, label: 'Servicios' },
                  { icon: Star, value: tech.rating ? tech.rating.toFixed(1) : 'Nuevo', label: 'Calificación' },
                  { icon: Clock3, value: '15 min', label: 'Respuesta' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-cloud p-3.5 text-center">
                    <stat.icon className="mx-auto h-4 w-4 text-brand-500" />
                    <p className="mt-1.5 font-display text-base font-extrabold text-ink">{stat.value}</p>
                    <p className="text-[10px] font-medium text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-7 font-display text-sm font-bold text-ink">Especialidades</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {tech.specialties.map((slug) => (
                  <Link
                    key={slug}
                    to={`/buscar?especialidad=${slug}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
                  >
                    <SpecialtyIcon slug={slug} size="sm" className="h-7 w-7 rounded-lg" />
                    {specialtyName(slug)}
                  </Link>
                ))}
              </div>

              {tech.gallery.length > 0 && (
                <>
                  <h3 className="mt-7 font-display text-sm font-bold text-ink">Trabajos recientes</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {tech.gallery.slice(0, 6).map((photo, index) => (
                      <a
                        key={`${photo.slice(0, 20)}-${index}`}
                        href={photo}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100"
                      >
                        <img
                          src={photo}
                          alt={`Trabajo de ${tech.name} ${index + 1}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}

              <h3 className="mt-7 font-display text-sm font-bold text-ink">Zona de atención</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                <div className="h-[240px]">
                  <MapView
                    center={{ lat: tech.lat, lng: tech.lng }}
                    points={[
                      {
                        id: tech.id,
                        lat: tech.lat,
                        lng: tech.lng,
                        label: tech.name,
                        kind: 'tech',
                      },
                    ]}
                    zoom={15}
                    interactive={false}
                    showLegend={false}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-3 text-xs text-slate-500">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  {tech.address}, {tech.district} — Huancayo
                </div>
              </div>
            </section>

            <section className="card p-6 lg:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Opiniones de clientes</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Experiencias reales de personas atendidas por {tech.name.split(' ')[0]}.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-cloud px-4 py-2.5">
                  <span className="font-display text-3xl font-extrabold text-ink">
                    {tech.rating ? tech.rating.toFixed(1) : '—'}
                  </span>
                  <div>
                    <Rating value={tech.rating} showValue={false} size="md" />
                    <p className="text-[10px] text-slate-500">{tech.reviewCount} opiniones</p>
                  </div>
                </div>
              </div>

              {reviews.length > 0 ? (
                <>
                  <div className="mt-5 grid gap-4 rounded-2xl bg-cloud p-4 sm:grid-cols-[140px_1fr] sm:items-center">
                    <div className="text-center">
                      <p className="font-display text-4xl font-extrabold text-ink">
                        {tech.rating.toFixed(1)}
                      </p>
                      <Rating value={tech.rating} showValue={false} size="md" className="mt-1 justify-center" />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Basado en {tech.reviewCount} opiniones
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {ratingBreakdown.map((item) => (
                        <div key={item.star} className="flex items-center gap-2">
                          <span className="w-8 text-right text-[10px] font-semibold text-slate-500">
                            {item.star}★
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-sun-500"
                              style={{ width: `${(item.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="w-6 text-[10px] text-slate-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 divide-y divide-slate-100">
                    {reviews.map((review) => (
                      <article key={review.id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar name={review.clientName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-ink">{review.clientName}</p>
                              <span className="text-[10px] text-slate-500">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            <Rating value={review.rating} showValue={false} className="mt-1" />
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                              {review.comment}
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Servicio verificado
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl bg-cloud p-6 text-center text-sm text-slate-500">
                  Este técnico todavía no tiene opiniones. ¡Sé el primero en contratarlo!
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-brand-950 p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-300">
                  Precio referencial
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">
                  {formatPrice(tech.priceFrom)}
                  <span className="ml-1 text-xs font-medium text-brand-300">/ desde</span>
                </p>
                <p className="mt-1 text-[11px] text-brand-300">
                  El técnico confirma el costo final antes de iniciar.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Perfil verificado por RapiJob. Puedes coordinar por WhatsApp o solicitar el
                    servicio desde la plataforma.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-brand-500" />
                    {tech.schedule}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-500" />
                    {tech.district}, Huancayo
                  </p>
                  <p className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-brand-500" />
                    Precio desde {formatPrice(tech.priceFrom)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-sun-500" />
                    {tech.rating.toFixed(1)} de 5 · {tech.reviewCount} opiniones
                  </p>
                </div>

                <Link
                  to={`/solicitar?tecnico=${tech.id}&especialidad=${tech.specialty}`}
                  className={buttonStyles({ variant: 'primary', size: 'lg', full: true })}
                >
                  Solicitar servicio
                </Link>
                <a
                  href={`https://wa.me/${tech.whatsapp}?text=${encodeURIComponent(
                    `Hola ${tech.name}, te contacto desde RapiJob porque necesito un servicio de ${specialtyName(tech.specialty).toLowerCase()}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonStyles({ variant: 'outline', size: 'lg', full: true })}
                >
                  <MessageCircle className="h-4 w-4" />
                  Contactar por WhatsApp
                </a>

                <ul className="space-y-1.5 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                  {['Atención en Huancayo, El Tambo y Chilca', 'Pago acordado directamente con el técnico', 'Garantía del servicio según el trabajo'].map(
                    (item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            {specialty && (
              <div className="mt-4 rounded-2xl bg-white p-4 text-xs text-slate-500 shadow-card">
                <div className="flex items-center gap-2">
                  <SpecialtyIcon slug={specialty.slug} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-ink">{specialty.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Desde {formatPrice(specialty.basePrice)}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/buscar?especialidad=${specialty.slug}`}
                  className="mt-3 inline-block font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ver más {specialty.name.toLowerCase()} →
                </Link>
              </div>
            )}
          </aside>
        </div>

        <section className="mt-14">
          <SectionHeading
            eyebrow="También te pueden servir"
            title="Otros técnicos recomendados"
            action={
              <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                Ver todos
              </Link>
            }
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <TechCard key={item.id} tech={item} specialtyName={specialtyName(item.specialty)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
