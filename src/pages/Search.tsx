import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Crosshair,
  Filter,
  MapPin,
  Navigation,
  Search as SearchIcon,
  SearchX,
  SlidersHorizontal,
  Star,
  Wallet,
  X,
} from 'lucide-react';
import type { LatLng } from '@/types';
import { MapView } from '@/components/MapView';
import { TechCard } from '@/components/TechCard';
import { Avatar } from '@/components/Avatar';
import { Rating } from '@/components/Rating';
import { Button, buttonStyles } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_CENTER } from '@/lib/constants';
import { geocodeAddress, reverseGeocode } from '@/lib/maps';
import { cn, formatDistance, formatPrice, haversineKm } from '@/lib/utils';

type SortOption = 'distance' | 'rating' | 'price';

export function Search() {
  const { technicians, specialties, specialtyName } = useData();
  const toast = useToast();
  const [params] = useSearchParams();

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState(params.get('especialidad') ?? '');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [radius, setRadius] = useState(15);
  const [sort, setSort] = useState<SortOption>('distance');
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationLabel, setLocationLabel] = useState('Huancayo centro');
  const [addressQuery, setAddressQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (params.get('especialidad')) setSpecialty(params.get('especialidad') ?? '');
  }, [params]);

  useEffect(() => {
    if (!selectedTechId) return;
    const element = document.getElementById(`tech-${selectedTechId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-brand-400', 'ring-offset-2');
      window.setTimeout(() => element.classList.remove('ring-2', 'ring-brand-400', 'ring-offset-2'), 2200);
    }
  }, [selectedTechId]);

  const origin = selectedPoint ?? mapCenter;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return technicians
      .filter((tech) => tech.approved)
      .filter((tech) => (onlyAvailable ? tech.available : true))
      .filter(
        (tech) =>
          !specialty ||
          tech.specialty === specialty ||
          tech.specialties.includes(specialty),
      )
      .filter((tech) => {
        if (!q) return true;
        return (
          tech.name.toLowerCase().includes(q) ||
          tech.headline.toLowerCase().includes(q) ||
          tech.district.toLowerCase().includes(q) ||
          specialtyName(tech.specialty).toLowerCase().includes(q)
        );
      })
      .map((tech) => ({
        tech,
        distance: haversineKm(origin, { lat: tech.lat, lng: tech.lng }),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => {
        if (sort === 'rating') return b.tech.rating - a.tech.rating;
        if (sort === 'price') return a.tech.priceFrom - b.tech.priceFrom;
        return a.distance - b.distance;
      });
  }, [technicians, onlyAvailable, specialty, query, radius, sort, origin, specialtyName]);

  const selectedTech = selectedTechId
    ? technicians.find((tech) => tech.id === selectedTechId)
    : undefined;

  const mapPoints = results.map(({ tech, distance }) => ({
    id: tech.id,
    lat: tech.lat,
    lng: tech.lng,
    label: `${tech.name} · ${formatDistance(distance)}`,
    kind: 'tech' as const,
  }));

  const resetFilters = () => {
    setQuery('');
    setSpecialty('');
    setOnlyAvailable(false);
    setRadius(15);
    setSort('distance');
    setSelectedPoint(null);
    setLocationLabel('Huancayo centro');
    setMapCenter(DEFAULT_CENTER);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(point);
        setSelectedPoint(point);
        setMapCenter(point);
        setRadius(15);
        setLocationLabel('Mi ubicación actual');
        toast.success('Ubicación detectada', 'Mostrando técnicos cerca de ti.');
        setLocating(false);
        const address = await reverseGeocode(point);
        if (address) setLocationLabel(address.split(',').slice(0, 3).join(','));
      },
      () => {
        setLocating(false);
        toast.error(
          'No pudimos acceder a tu ubicación',
          'Revisa los permisos del navegador o elige un punto en el mapa.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const searchLocation = async () => {
    if (!addressQuery.trim()) return;
    setSearchingAddress(true);
    const result = await geocodeAddress(addressQuery, mapCenter);
    setSearchingAddress(false);
    if (!result) {
      toast.error('No encontramos esa dirección', 'Prueba con una referencia más específica.');
      return;
    }
    const point = { lat: result.lat, lng: result.lng };
    setSelectedPoint(point);
    setMapCenter(point);
    setLocationLabel(result.label.split(',').slice(0, 3).join(','));
    toast.success('Ubicación encontrada', result.label);
  };

  return (
    <div className="bg-cloud pb-16">
      <div className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-rj relative py-10 lg:py-12">
          <nav className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/" className="hover:text-brand-600">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-slate-600">Buscar técnicos</span>
          </nav>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-600 ring-1 ring-inset ring-brand-100">
                <MapPin className="h-3.5 w-3.5" />
                Huancayo · El Tambo · Chilca
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Encuentra al técnico ideal cerca de ti
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
                Filtra por especialidad, disponibilidad y distancia. Haz clic en el mapa para calcular
                la distancia exacta desde tu ubicación.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-cloud px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Técnicos encontrados
                </p>
                <p className="font-display text-xl font-extrabold text-ink">{results.length}</p>
              </div>
              <Link to="/solicitar" className={buttonStyles({ variant: 'primary', size: 'md' })}>
                Solicitar técnico
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-rj pt-6">
        {/* Filters */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-card lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar por nombre o servicio</span>
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar técnico, servicio o distrito…"
                className="input-field pl-10"
              />
            </label>
            <label className="block">
              <span className="sr-only">Especialidad</span>
              <select
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                className="select-field"
              >
                <option value="">Todas las especialidades</option>
                {specialties.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Ordenar por</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="select-field"
              >
                <option value="distance">Más cercanos</option>
                <option value="rating">Mejor calificados</option>
                <option value="price">Menor precio</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((open) => !open)}
              className={buttonStyles({ variant: 'outline', size: 'md', className: 'lg:px-4' })}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {onlyAvailable && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
            </button>
          </div>

          <div
            className={cn(
              'mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1.3fr_1.7fr]',
              showFilters ? '' : 'hidden lg:grid',
            )}
          >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={addressQuery}
                    onChange={(event) => setAddressQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void searchLocation();
                      }
                    }}
                    placeholder="Escribe una dirección o referencia…"
                    className="input-field pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="dark"
                    size="md"
                    onClick={searchLocation}
                    loading={searchingAddress}
                    className="flex-1 sm:flex-none"
                  >
                    Buscar
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={useMyLocation}
                    loading={locating}
                    title="Usar mi ubicación actual"
                  >
                    <Crosshair className="h-4 w-4" />
                    <span className="sm:hidden">Mi ubicación</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(event) => setOnlyAvailable(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                  />
                  Solo disponibles ahora
                </label>
                <label className="flex min-w-[180px] flex-1 items-center gap-3 text-xs font-semibold text-slate-600">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  Radio
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={radius}
                    onChange={(event) => setRadius(Number(event.target.value))}
                    className="flex-1 accent-brand-600"
                  />
                  <span className="w-12 text-right font-bold text-brand-600">{radius} km</span>
                </label>
                {(query || specialty || onlyAvailable || radius !== 15 || selectedPoint) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium">
              <Navigation className="h-3 w-3 text-brand-500" />
              Calculando desde:
            </span>
            <span className="max-w-full truncate rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
              {locationLabel}
            </span>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              {specialty && (
                <button
                  type="button"
                  onClick={() => setSpecialty('')}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600"
                >
                  {specialtyName(specialty)}
                  <X className="h-3 w-3" />
                </button>
              )}
              {onlyAvailable && (
                <button
                  type="button"
                  onClick={() => setOnlyAvailable(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"
                >
                  Disponibles
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results + map */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_430px]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {results.length} técnico{results.length === 1 ? '' : 's'} disponible
                {results.length === 1 ? '' : 's'}
                {specialty && (
                  <span className="font-normal text-slate-500"> en {specialtyName(specialty)}</span>
                )}
              </p>
              <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex">
                <Star className="h-3.5 w-3.5 text-sun-500" fill="currentColor" />
                Ordenado por {sort === 'distance' ? 'cercanía' : sort === 'rating' ? 'calificación' : 'precio'}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={SearchX}
                  title="No encontramos técnicos con esos filtros"
                  description="Prueba ampliando el radio de búsqueda, cambiando la especialidad o seleccionando otro punto en el mapa."
                  action={
                    <Button variant="outline" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map(({ tech, distance }) => (
                  <div id={`tech-${tech.id}`} key={tech.id} className="rounded-3xl transition-shadow">
                    <TechCard
                      tech={tech}
                      specialtyName={specialtyName(tech.specialty)}
                      distanceKm={distance}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-card sm:flex-row">
              <p className="text-slate-500">
                ¿No encuentras lo que buscas? Publica tu solicitud y te ayudamos a asignar un técnico.
              </p>
              <Link to="/solicitar" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
                Solicitar técnico
              </Link>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="relative h-[380px] sm:h-[460px] lg:h-[560px]">
                <MapView
                  center={mapCenter}
                  points={mapPoints}
                  selected={selectedPoint}
                  userLocation={userLocation}
                  onPick={(point) => {
                    setSelectedPoint(point);
                    setMapCenter(point);
                    setSelectedTechId(null);
                    setLocationLabel(
                      `Punto seleccionado (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`,
                    );
                  }}
                  onPointClick={(id) => setSelectedTechId(id)}
                  radiusKm={radius}
                  zoom={13}
                  showLegend={false}
                />
                <div className="pointer-events-none absolute left-3 top-3 z-[400] flex max-w-[calc(100%-24px)] items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-card backdrop-blur">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <span className="truncate">{locationLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="absolute right-3 top-3 z-[400] inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[11px] font-bold text-brand-700 shadow-card transition hover:bg-brand-50"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Mi ubicación
                </button>

                {selectedTech && (
                  <div className="absolute inset-x-3 bottom-3 z-[450] animate-fade-up rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-100">
                    <div className="flex items-start gap-2.5">
                      <Avatar name={selectedTech.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{selectedTech.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {specialtyName(selectedTech.specialty)} · {selectedTech.district}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Rating value={selectedTech.rating} count={selectedTech.reviewCount} />
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                            <Wallet className="h-3 w-3" />
                            {formatPrice(selectedTech.priceFrom)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTechId(null)}
                        className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                        aria-label="Cerrar ficha"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <Link
                        to={`/tecnico/${selectedTech.id}`}
                        className={buttonStyles({ variant: 'outline', size: 'sm' })}
                      >
                        Ver perfil
                      </Link>
                      <Link
                        to={`/solicitar?tecnico=${selectedTech.id}&especialidad=${selectedTech.specialty}`}
                        className={buttonStyles({ variant: 'primary', size: 'sm' })}
                      >
                        Solicitar
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-500" />
                  Haz clic en el mapa para mover tu punto
                </span>
                <span className="font-semibold text-brand-600">{results.length} en el rango</span>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-brand-50 p-4 text-xs leading-relaxed text-brand-800">
              <p className="font-bold">Consejo RapiJob</p>
              <p className="mt-1 text-brand-700/80">
                Las distancias son aproximadas y se calculan en línea recta. El técnico confirmará el
                tiempo de llegada al aceptar tu solicitud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
