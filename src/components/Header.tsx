import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { buttonStyles } from './Button';
import { useAuth } from '@/context/AuthContext';
import { panelLabel, panelPath, roleLabel } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/buscar', label: 'Buscar técnicos' },
  { to: '/#servicios', label: 'Servicios' },
  { to: '/#como-funciona', label: 'Cómo funciona' },
  { to: '/#ser-tecnico', label: 'Ser técnico' },
];

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="container-rj flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
        <Link to="/" aria-label="RapiJob — Inicio" className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
          {NAV.map((item) => {
            const isHash = item.to.includes('#');
            const active = isHash ? false : location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-sm font-medium transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-left transition hover:border-brand-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Avatar name={user.name} size="sm" />
                <span className="hidden max-w-[120px] sm:block">
                  <span className="block truncate text-xs font-semibold text-ink">{user.name}</span>
                  <span className="block text-[10px] font-medium text-slate-500">
                    {roleLabel(user.role)}
                  </span>
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 text-slate-500 transition', menuOpen && 'rotate-180')}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 animate-fade-up overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-soft"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                      {user.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                      {roleLabel(user.role)}
                    </span>
                  </div>
                  <Link
                    to={panelPath(user.role)}
                    role="menuitem"
                    className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {panelLabel(user.role)}
                  </Link>
                  <Link
                    to="/buscar"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Search className="h-4 w-4" />
                    Buscar técnicos
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className={buttonStyles({ variant: 'ghost', size: 'md', className: 'gap-1.5' })}
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Link>
              <Link
                to="/solicitar"
                className={buttonStyles({ variant: 'primary', size: 'md' })}
              >
                Solicitar técnico
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-[68px] z-50 h-[calc(100vh-68px)] overflow-y-auto border-t border-slate-100 bg-white px-4 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {user ? (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-cloud p-3">
                  <Avatar name={user.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
                  </div>
                </div>
                <Link
                  to={panelPath(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className={buttonStyles({ variant: 'primary', size: 'lg', full: true })}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {panelLabel(user.role)}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={buttonStyles({ variant: 'outline', size: 'lg', full: true })}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/solicitar"
                  onClick={() => setMobileOpen(false)}
                  className={buttonStyles({ variant: 'primary', size: 'lg', full: true })}
                >
                  Solicitar técnico
                </Link>
                <Link
                  to="/registro?rol=tecnico"
                  onClick={() => setMobileOpen(false)}
                  className={buttonStyles({ variant: 'yellow', size: 'lg', full: true })}
                >
                  Trabaja como técnico
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className={buttonStyles({ variant: 'outline', size: 'lg', full: true })}
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
