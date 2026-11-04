import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { Logo } from './Logo';
import { useData } from '@/context/DataContext';
import { resetDemoData } from '@/lib/repo';
import { IS_SUPABASE } from '@/lib/repo';

export function Footer() {
  const { specialties } = useData();

  const handleReset = () => {
    if (
      window.confirm(
        '¿Restablecer los datos de demostración? Se borrarán las cuentas y solicitudes creadas en este navegador.',
      )
    ) {
      resetDemoData();
      window.location.href = '/';
    }
  };

  return (
    <footer className="mt-20 bg-brand-950 text-white">
      <div className="container-rj py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <Logo variant="light" size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-200">
              Técnicos confiables, soluciones rápidas. Conectamos a personas de Huancayo, El Tambo y
              Chilca con profesionales verificados cerca de su ubicación.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://wa.me/51987654321"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label="WhatsApp de RapiJob"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Facebook de RapiJob"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Instagram de RapiJob"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white">Plataforma</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-200">
              <li>
                <Link to="/buscar" className="transition hover:text-sun-400">
                  Buscar técnicos
                </Link>
              </li>
              <li>
                <Link to="/solicitar" className="transition hover:text-sun-400">
                  Solicitar un servicio
                </Link>
              </li>
              <li>
                <Link to="/registro?rol=tecnico" className="transition hover:text-sun-400">
                  Trabaja como técnico
                </Link>
              </li>
              <li>
                <Link to="/#como-funciona" className="transition hover:text-sun-400">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link to="/#beneficios" className="transition hover:text-sun-400">
                  Beneficios
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white">Servicios</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-200">
              {specialties.slice(0, 5).map((specialty) => (
                <li key={specialty.slug}>
                  <Link
                    to={`/buscar?especialidad=${specialty.slug}`}
                    className="transition hover:text-sun-400"
                  >
                    {specialty.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/buscar" className="font-semibold text-sun-400 hover:text-sun-300">
                  Ver todas →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white">Contacto</h3>
            <ul className="mt-4 space-y-3 text-sm text-brand-200">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sun-400" />
                Huancayo, El Tambo y Chilca — Junín, Perú
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-sun-400" />
                <a href="tel:+51987654321" className="hover:text-white">
                  +51 987 654 321
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-sun-400" />
                <a href="mailto:hola@rapijob.pe" className="hover:text-white">
                  hola@rapijob.pe
                </a>
              </li>
            </ul>
            <div className="mt-4 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-brand-300 ring-1 ring-inset ring-white/10">
              Atención: Lun a Sáb · 8:00 a 20:00
              <br />
              Emergencias 24/7 con recargo.
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RapiJob. Proyecto académico — Huancayo, Perú.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {IS_SUPABASE ? 'Conectado a Supabase' : 'Modo demo local'}
            </span>
            <Link to="/login" className="transition hover:text-white">
              Acceso demo
            </Link>
            {!IS_SUPABASE && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 transition hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                Restablecer datos
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-brand-400">
          Los técnicos, precios, opiniones y ubicaciones mostrados son datos de demostración. Los
          montos son referenciales y no representan una oferta comercial real.
        </p>
      </div>
    </footer>
  );
}
