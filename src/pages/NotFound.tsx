import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home, Search, Wrench } from 'lucide-react';
import { buttonStyles } from '@/components/Button';
import { Logo } from '@/components/Logo';

export function NotFound() {
  return (
    <div className="relative overflow-hidden bg-cloud">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]" />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-sun-300/30 blur-3xl"
        aria-hidden="true"
      />
      <div className="container-rj relative flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <Logo size="lg" />
        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600 shadow-card ring-1 ring-inset ring-brand-100">
          <Compass className="h-3.5 w-3.5" />
          Error 404
        </span>
        <h1 className="mt-4 max-w-xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          No encontramos esta página
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Puede que el enlace haya cambiado o que la página ya no exista. Vuelve al inicio o explora
          a los técnicos disponibles cerca de ti.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Link to="/" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
          <Link to="/buscar" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
            <Search className="h-4 w-4" />
            Buscar técnicos
          </Link>
          <Link to="/solicitar" className={buttonStyles({ variant: 'ghost', size: 'lg' })}>
            <Wrench className="h-4 w-4" />
            Solicitar un servicio
          </Link>
        </div>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Regresar a RapiJob
        </Link>
      </div>
    </div>
  );
}
