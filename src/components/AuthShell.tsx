import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Logo } from './Logo';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[1fr_0.95fr]">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-20" />
        <div
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-sun-400/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <Link to="/">
            <Logo variant="light" size="md" />
          </Link>
        </div>

        <div className="relative my-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sun-300 ring-1 ring-inset ring-white/15">
            <MapPin className="h-3 w-3" />
            Huancayo · El Tambo · Chilca
          </span>
          <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Técnicos confiables,
            <br />
            <span className="text-sun-400">soluciones rápidas</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-200">
            Gestiona tus solicitudes, sigue el estado del servicio y califica a los profesionales
            desde un solo lugar.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'Técnicos verificados por el equipo de RapiJob',
              'Mapa de cobertura y distancia en tiempo real',
              'Historial, seguimiento y calificaciones',
              'Pagos acordados directamente con el técnico',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-brand-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-3xl bg-white/5 p-5 ring-1 ring-inset ring-white/10 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sun-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">Todo en un solo lugar</p>
              <p className="text-[10px] text-brand-300">Solicitudes, seguimiento y reseñas</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-brand-200">
            Gestiona tus solicitudes, sigue el estado del servicio y califica a los profesionales
            desde un solo lugar.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-[10px] text-brand-300">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Perfiles verificados
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-sun-400" />
              Reseñas verificadas
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5 text-sun-400" />
              Historial de servicios
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
