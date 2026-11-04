import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { panelPath } from '@/lib/navigation';

export function FullPageLoader({ label = 'Cargando RapiJob…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <FullPageLoader />;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={panelPath(user.role)} replace />;
  }
  return <Outlet />;
}
