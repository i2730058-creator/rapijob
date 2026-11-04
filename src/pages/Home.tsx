import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Headphones,
  MapPin,
  Navigation,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { LatLng } from '@/types';
import { MapView } from '@/components/MapView';
import { TechCard } from '@/components/TechCard';
import { Avatar } from '@/components/Avatar';
import { Rating } from '@/components/Rating';
import { SpecialtyIcon } from '@/components/SpecialtyIcon';
import { SectionHeading } from '@/components/SectionHeading';
import { buttonStyles } from '@/components/Button';
import { useData } from '@/context/DataContext';
import { DEFAULT_CENTER } from '@/lib/constants';
import { formatDistance, formatPrice, haversineKm, pluralize } from '@/lib/utils';

const STEPS = [
  {
    icon: Search,
    title: 'Cuéntanos qué necesitas',
    text: 'Elige la especialidad, describe el problema y adjunta fotos si lo deseas.',
  },
  {
    icon: MapPin,
    title: 'Elige un técnico cercano',
    text: 'Compara distancia, precio, calificación y disponibilidad en el mapa.',
  },
  {
    icon: CalendarCheck2,
    title: 'Agenda fecha y hora',
    text: 'Selecciona cuándo quieres el servicio y confirma tu solicitud.',
  },
  {
    icon: Star,
    title: 'Califica el servicio',
    text: 'Sigue el estado en tiempo real y comparte tu experiencia al terminar.',
  },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Técnicos verificados',
    text: 'Revisamos identidad y antecedentes. Los perfiles aprobados llevan el sello de verificación.',
  },
  {
    icon: Navigation,
    title: 'Cerca de ti',
    text: 'Ubicamos a los profesionales disponibles en Huancayo, El Tambo y Chilca según tu dirección.',
  },
  {
    icon: Wallet,
    title: 'Precios transparentes',
    text: 'Consulta el precio referencial antes de solicitar. Sin sorpresas ni costos ocultos.',
  },
  {
    icon: Headphones,
    title: 'Acompañamiento real',
    text: 'Seguimiento de tu solicitud y soporte ante cualquier inconveniente con el servicio.',
  },
];

const FAQS = [
  {
    q: '¿Cómo sé que un técnico es confiable?',
    a: 'Todos los perfiles pasan por una revisión administrativa. Los técnicos verificados muestran el sello azul, su experiencia, precio referencial y las opiniones de clientes anteriores.',
  },
  {
    q: '¿El precio que veo es el precio final?',
    a: 'El monto mostrado es referencial y sirve para comparar. El técnico confirma el costo final antes de empezar, según la complejidad del trabajo y los materiales necesarios.',
  },
  {
    q: '¿Puedo cancelar una solicitud?',
    a: 'Sí. Mientras el servicio no esté completado puedes cancelarlo desde tu panel. Si el técnico ya está en camino, te recomendamos coordinar directamente para evitar cargos por movilidad.',
  },
  {
    q: '¿En qué zonas funciona RapiJob?',
    a: 'Iniciamos operaciones en Huancayo, El Tambo y Chilca. La plataforma está preparada para ampliarse a otras ciudades del Perú en las siguientes etapas.',
  },
];

export function Home() {
  const { specialties, technicians, reviews, specialtyName } = useData();
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [radius, setRadius] = useState(6);

  const available = technicians.filter((tech) => tech.approved && tech.available);
  const featured = [...technicians]
    .filter((tech) => tech.approved)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 3);

  const nearby = useMemo(() => {
    return available
      .filter((tech) => !specialtyFilter || tech.specialties.includes(specialtyFilter) || tech.specialty === specialtyFilter)
      .map((tech) => ({
        tech,
        distance: haversineKm(mapCenter, { lat: tech.lat, lng: tech.lng }),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [available, specialtyFilter, mapCenter, radius]);

  const mapPoints = nearby.map(({ tech }) => ({
    id: tech.id,
    lat: tech.lat,
    lng: tech.lng,
    label: `${tech.name} · ${formatDistance(haversineKm(mapCenter, { lat: tech.lat, lng: tech.lng }))}`,
    kind: 'tech' as const,
  }));

  const topReviews = useMemo(
    () => reviews.filter((review) => review.rating === 5 && review.comment.length > 40).slice(0, 3),
    [reviews],
  );

  const averageRating =
    technicians.length > 0
      ? technicians.reduce((sum, tech) => sum + tech.rating, 0) / technicians.length
      : 0;

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-cloud pb-16 pt-10 lg:pb-24 lg:pt-16">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 top-20 h-[380px] w-[380px] rounded-full bg-sun-300/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_75%)]" />

        <div className="container-rj relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Cobertura en Huancayo · El Tambo · Chilca
            </span>

            <h1 className="mt-5 font-display text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.5rem]">
              ¿Necesitas un técnico?
              <br />
              <span className="relative inline-block">
                <span className="text-gradient">Encuentra uno cerca de ti</span>
                <svg
                  className="absolute -bottom-2 left-0 h-3 w-full text-sun-400"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5C61 3.5 147 2.5 297 6.5"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
              RapiJob conecta a clientes con técnicos profesionales verificados para electricidad,
              plomería, computadoras y más. Solicita, compara y contrata en minutos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/solicitar" className={buttonStyles({ variant: 'primary', size: 'xl' })}>
                Solicitar técnico
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/registro?rol=tecnico" className={buttonStyles({ variant: 'outline', size: 'xl' })}>
                <UserRoundCheck className="h-5 w-5" />
                Trabaja como técnico
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2.5">
                  {['María Fernández', 'José Luis Ramos', 'Rosa Huamán', 'Luis Paredes'].map((name) => (
                    <Avatar key={name} name={name} size="sm" ring />
                  ))}
                </div>
                <div>
                  <Rating value={Number(averageRating.toFixed(1))} showValue={false} />
                  <p className="text-[11px] font-medium text-slate-500">
                    <span className="font-bold text-ink">{averageRating.toFixed(1)}/5</span> ·{' '}
                    {pluralize(reviews.length, 'reseña', 'reseñas')}
                  </p>
                </div>
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Técnicos verificados
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Clock3 className="h-4 w-4 text-brand-500" />
                Respuesta en minutos
              </div>
            </div>
          </div>

          {/* Hero app preview */}
          <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:120ms]">
            <div
              className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-brand-300/40 via-white to-sun-200/50 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-white bg-white shadow-[0_35px_80px_-30px_rgba(7,26,51,0.45)]">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-extrabold text-white">
                    R
                  </span>
                  <div>
                    <p className="text-[11px] font-bold leading-none text-ink">RapiJob</p>
                    <p className="mt-0.5 text-[9px] font-medium text-emerald-700">● Técnicos en línea</p>
                  </div>
                </div>
                <span className="rounded-full bg-cloud px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  Huancayo
                </span>
              </div>

              <div className="relative h-[280px] sm:h-[320px]">
                <MapView
                  center={DEFAULT_CENTER}
                  points={available.slice(0, 5).map((tech) => ({
                    id: tech.id,
                    lat: tech.lat,
                    lng: tech.lng,
                    label: tech.name,
                    kind: 'tech',
                  }))}
                  zoom={13}
                  interactive={false}
                  showLegend={false}
                />
                <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-card backdrop-blur">
                  <Search className="h-3.5 w-3.5 text-brand-500" />
                  Electricista cerca de mí
                </div>
                <div className="pointer-events-none absolute bottom-3 right-3 z-[400] hidden items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-card backdrop-blur sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  </span>
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      Técnicos
                    </p>
                    <p className="text-[11px] font-bold text-ink">100% verificados</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink">Técnicos cerca de ti</p>
                  <span className="text-[10px] font-semibold text-brand-600">
                    {nearby.length || available.length} disponibles
                  </span>
                </div>
                {available.slice(0, 2).map((tech) => (
                  <div key={tech.id} className="flex items-center gap-2.5 rounded-xl bg-cloud p-2.5">
                    <Avatar name={tech.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-ink">{tech.name}</p>
                      <p className="truncate text-[9px] text-slate-500">
                        {specialtyName(tech.specialty)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end gap-0.5 text-[10px] font-bold text-amber-600">
                        <Star className="h-2.5 w-2.5 fill-sun-500 text-sun-500" />
                        {tech.rating}
                      </p>
                      <p className="text-[9px] text-slate-500">desde {formatPrice(tech.priceFrom)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -left-3 top-24 hidden animate-float items-center gap-2 rounded-2xl bg-white p-3 shadow-soft sm:flex lg:-left-8">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Navigation className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                  Estado del servicio
                </p>
                <p className="text-[11px] font-bold text-ink">Técnico en camino</p>
                <p className="text-[9px] text-brand-600">Llega en 8 min</p>
              </div>
            </div>

            <div className="absolute -right-2 bottom-20 hidden animate-float-slow items-center gap-2 rounded-2xl bg-brand-950 p-3 text-white shadow-soft sm:flex lg:-right-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-500 text-ink">
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wide text-brand-300">
                  Precio referencial
                </p>
                <p className="text-sm font-extrabold">S/ 60.00</p>
                <p className="text-[9px] text-emerald-400">Sin costos ocultos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TRUST STRIP ---------------- */}
      <section className="border-b border-slate-100 bg-white py-7">
        <div className="container-rj grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            { icon: BadgeCheck, value: '100%', label: 'Perfiles verificados' },
            { icon: Users, value: `${technicians.length}+`, label: 'Técnicos en la red' },
            { icon: Star, value: averageRating.toFixed(1), label: 'Valoración promedio' },
            { icon: Clock3, value: '< 15 min', label: 'Tiempo de respuesta' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold leading-none text-ink">{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section id="servicios" className="container-rj scroll-mt-24 py-16 lg:py-20">
        <SectionHeading
          eyebrow="12 especialidades"
          title="Soluciones para tu hogar, oficina y negocio"
          description="Encuentra al profesional adecuado para cada necesidad. Todos los servicios con precio referencial y técnicos de la zona."
          action={
            <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'md' })}>
              Ver todos los técnicos
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {specialties.slice(0, 8).map((specialty) => (
            <Link
              key={specialty.slug}
              to={`/buscar?especialidad=${specialty.slug}`}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <SpecialtyIcon slug={specialty.slug} size="lg" />
                <ArrowRight className="h-4 w-4 translate-x-1 text-slate-300 opacity-0 transition group-hover:translate-x-0 group-hover:text-brand-500 group-hover:opacity-100" />
              </div>
              <h3 className="mt-4 font-display text-sm font-bold text-ink">{specialty.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {specialty.description}
              </p>
              <p className="mt-3 text-[11px] font-semibold text-brand-600">
                Desde {formatPrice(specialty.basePrice)}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cloud px-5 py-4">
          <p className="text-sm text-slate-600">
            También hay cerrajería, soldadura, armado de muebles y más de 12 especialidades.
          </p>
          <Link to="/buscar" className="text-sm font-bold text-brand-600 hover:text-brand-700">
            Explorar todas →
          </Link>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="como-funciona" className="scroll-mt-24 bg-cloud py-16 lg:py-20">
        <div className="container-rj">
          <SectionHeading
            align="center"
            eyebrow="Así de simple"
            title="De la necesidad al técnico en 4 pasos"
            description="Diseñamos RapiJob para que resolver un problema técnico sea rápido, claro y seguro."
          />
          <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="absolute left-[12%] right-[12%] top-10 hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 lg:block"
              aria-hidden="true"
            />
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative rounded-3xl border border-white bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span aria-hidden="true" className="font-display text-2xl font-extrabold text-brand-500">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURED TECHS ---------------- */}
      <section className="container-rj py-16 lg:py-20">
        <SectionHeading
          eyebrow="Técnicos destacados"
          title="Profesionales mejor valorados de la zona"
          description="Perfiles verificados, con experiencia comprobada y opiniones reales de clientes."
          action={
            <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'md' })}>
              Ver más técnicos
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((tech) => (
            <TechCard key={tech.id} tech={tech} specialtyName={specialtyName(tech.specialty)} />
          ))}
        </div>
      </section>

      {/* ---------------- MAP / NEARBY ---------------- */}
      <section className="bg-brand-950 py-16 text-white lg:py-20">
        <div className="container-rj grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeading
              light
              eyebrow="Cobertura local"
              title="Mira quién está disponible cerca de ti"
              description="Explora el mapa, filtra por especialidad y descubre a los técnicos disponibles en tu distrito. La distancia se calcula desde el punto que elijas."
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { name: 'Huancayo', lat: -12.0651, lng: -75.2049 },
                { name: 'El Tambo', lat: -12.0502, lng: -75.2182 },
                { name: 'Chilca', lat: -12.0831, lng: -75.2158 },
              ].map((district) => (
                <button
                  key={district.name}
                  type="button"
                  onClick={() => {
                    const point = { lat: district.lat, lng: district.lng };
                    setMapCenter(point);
                    setSelectedPoint(point);
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition ${
                    Math.abs(mapCenter.lat - district.lat) < 0.001
                      ? 'bg-sun-500 text-ink ring-sun-500'
                      : 'bg-white/5 text-brand-100 ring-white/15 hover:bg-white/10'
                  }`}
                >
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  {district.name}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-brand-300">
                  Especialidad
                </span>
                <select
                  value={specialtyFilter}
                  onChange={(event) => setSpecialtyFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-medium text-white outline-none transition focus:border-sun-400"
                >
                  <option value="" className="text-ink">
                    Todas las especialidades
                  </option>
                  {specialties.map((specialty) => (
                    <option key={specialty.slug} value={specialty.slug} className="text-ink">
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-brand-300">
                  Distancia
                  <span className="text-sun-400">{radius} km</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="mt-3 w-full accent-sun-500"
                />
              </label>
            </div>

            <div className="mt-6 space-y-2">
              {nearby.slice(0, 3).map(({ tech, distance }) => (
                <Link
                  key={tech.id}
                  to={`/tecnico/${tech.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
                >
                  <Avatar name={tech.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{tech.name}</p>
                    <p className="truncate text-[11px] text-brand-300">
                      {specialtyName(tech.specialty)} · {tech.district}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-sun-400">{formatDistance(distance)}</p>
                    <p className="text-[10px] text-brand-300">desde {formatPrice(tech.priceFrom)}</p>
                  </div>
                </Link>
              ))}
              {nearby.length === 0 && (
                <p className="rounded-2xl bg-white/5 p-4 text-xs text-brand-300 ring-1 ring-inset ring-white/10">
                  No hay técnicos en ese rango. Amplía la distancia o prueba otra especialidad.
                </p>
              )}
            </div>

            <Link
              to="/buscar"
              className={buttonStyles({
                variant: 'yellow',
                size: 'lg',
                className: 'mt-6',
              })}
            >
              Buscar en el mapa completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] border-4 border-white/10 shadow-2xl">
            <div className="h-[380px] sm:h-[460px]">
              <MapView
                center={mapCenter}
                points={mapPoints}
                selected={selectedPoint}
                onPick={(point) => {
                  setSelectedPoint(point);
                  setMapCenter(point);
                }}
                radiusKm={radius}
                zoom={13}
                showLegend
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-500" />
                {selectedPoint
                  ? `Punto elegido: ${selectedPoint.lat.toFixed(4)}, ${selectedPoint.lng.toFixed(4)}`
                  : 'Haz clic en el mapa para calcular distancias'}
              </span>
              <span className="font-semibold text-brand-600">{nearby.length} técnicos en el rango</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- BENEFITS ---------------- */}
      <section id="beneficios" className="container-rj scroll-mt-24 py-16 lg:py-20">
        <SectionHeading
          align="center"
          eyebrow="Por qué RapiJob"
          title="Confianza y rapidez en cada servicio"
          description="Una plataforma pensada para que contratar un técnico deje de ser una lotería."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="card p-6 transition hover:-translate-y-1 hover:shadow-soft">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <benefit.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-ink">{benefit.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="bg-cloud py-16 lg:py-20">
        <div className="container-rj">
          <SectionHeading
            eyebrow="Opiniones de clientes"
            title="Servicios que la gente recomienda"
            description="Opiniones de clientes que ya encontraron a su técnico en RapiJob."
            action={
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-card">
                <Rating value={Number(averageRating.toFixed(1))} showValue={false} size="md" />
                <span className="text-sm font-bold text-ink">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-slate-500">/ 5</span>
              </div>
            }
          />
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {topReviews.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-2 p-8 text-center md:col-span-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Star className="h-5 w-5" />
                </span>
                <p className="font-display text-base font-bold text-ink">
                  Aún no hay reseñas publicadas
                </p>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                  Las opiniones aparecerán aquí cuando los clientes califiquen servicios completados.
                </p>
              </div>
            ) : (
              topReviews.map((review) => {
              const tech = technicians.find((item) => item.id === review.techId);
              return (
                <figure key={review.id} className="card relative flex flex-col p-6">
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-100" />
                  <Rating value={review.rating} size="md" showValue={false} />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                    “{review.comment}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <Avatar name={review.clientName} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-ink">{review.clientName}</p>
                      <p className="text-[10px] text-slate-500">
                        {tech ? specialtyName(tech.specialty) : 'Cliente verificado'} · Cliente
                      </p>
                    </div>
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                  </figcaption>
                </figure>
              );
            })
            )}
          </div>
        </div>
      </section>

      {/* ---------------- TECHNICIAN CTA ---------------- */}
      <section id="ser-tecnico" className="container-rj scroll-mt-24 py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-7 text-white shadow-glow sm:p-10 lg:p-14">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-20" />
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-sun-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-sun-300 ring-1 ring-inset ring-sun-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                Para técnicos
              </span>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Haz crecer tu oficio con más clientes
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-200 sm:text-base">
                Publica tu perfil, define tus precios y recibe solicitudes de clientes cercanos.
                Nosotros te ayudamos con la visibilidad; tú te encargas del trabajo bien hecho.
              </p>
              <ul className="mt-6 grid gap-2.5 text-sm text-brand-100 sm:grid-cols-2">
                {[
                  'Perfil profesional verificado',
                  'Solicitudes cerca de tu zona',
                  'Tú decides cuándo trabajar',
                  'Calificaciones que generan confianza',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/registro?rol=tecnico" className={buttonStyles({ variant: 'yellow', size: 'lg' })}>
                  Registrarme como técnico
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className={buttonStyles({
                    variant: 'outline',
                    size: 'lg',
                    className: 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white',
                  })}
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur">
                <div className="rounded-2xl bg-white p-4 text-ink shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">Nueva solicitud</p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Pendiente
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Avatar name="José Luis Ramos" size="sm" />
                    <div>
                      <p className="text-xs font-bold text-ink">José Luis Ramos</p>
                      <p className="text-[10px] text-slate-500">El Tambo · a 1.2 km</p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-xl bg-cloud p-2.5 text-[11px] leading-relaxed text-slate-600">
                    Necesito instalar 3 tomacorrientes y revisar el tablero eléctrico.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-extrabold">S/ 90.00</span>
                    <span className="text-[10px] text-slate-500">Hoy · 16:00</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <span className="rounded-xl bg-slate-100 py-2 text-center text-[11px] font-bold text-slate-600">
                      Rechazar
                    </span>
                    <span className="rounded-xl bg-brand-600 py-2 text-center text-[11px] font-bold text-white">
                      Aceptar
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-950/60 px-3 py-2.5">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-brand-300">Ingresos registrados</p>
                    <p className="text-sm font-extrabold text-white">S/ 0.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="container-rj scroll-mt-24 pb-16 lg:pb-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Preguntas frecuentes"
            title="Resolvemos tus dudas"
            description="¿Tienes otra pregunta? Escríbenos a hola@rapijob.pe y te responderemos a la brevedad."
          />
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition open:border-brand-200 open:shadow-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-ink marker:hidden">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="container-rj pb-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-sun-500 px-6 py-10 sm:px-10 lg:px-14">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                Técnicos confiables, soluciones rápidas
              </p>
              <h2 className="mt-2 max-w-2xl font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Tu problema técnico tiene solución hoy mismo
              </h2>
              <p className="mt-2 max-w-xl text-sm text-amber-900/80">
                Publica tu solicitud gratis y recibe atención de técnicos verificados de tu zona.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link to="/solicitar" className={buttonStyles({ variant: 'dark', size: 'lg' })}>
                Solicitar técnico
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/buscar"
                className={buttonStyles({
                  variant: 'outline',
                  size: 'lg',
                  className: 'border-ink/15 bg-white/60 hover:bg-white',
                })}
              >
                Explorar técnicos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
