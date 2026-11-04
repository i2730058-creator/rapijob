import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { panelPath } from '@/lib/navigation';
import { IS_SUPABASE } from '@/lib/repo';
import { isValidEmail } from '@/lib/utils';

export function Login() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextParam = params.get('next');
  const next = nextParam
    ? (() => {
        try {
          const decoded = decodeURIComponent(nextParam);
          return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : null;
        } catch {
          return null;
        }
      })()
    : null;

  if (ready && user) {
    return <Navigate to={next ?? panelPath(user.role)} replace />;
  }

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    const account = await signIn(loginEmail, loginPassword);
    toast.success(`Bienvenido, ${account.name.split(' ')[0]}`, 'Tu sesión se inició correctamente.');
    navigate(next ?? panelPath(account.role), { replace: true });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await doLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const useDemo = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setError(null);
    setEmail(account.email);
    setPassword(account.password);
    setDemoLoading(account.role);
    try {
      await doLogin(account.email, account.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <AuthShell>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 ring-1 ring-inset ring-brand-100">
          <LockKeyhole className="h-3 w-3" />
          Acceso seguro
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Inicia sesión para gestionar tus solicitudes y servicios.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <Link
                to="/recuperar"
                className="mb-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                ¿La olvidaste?
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="input-field px-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" full loading={loading}>
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {!IS_SUPABASE && (
          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Cuentas de demostración
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-brand-700/70">
              Entra con un clic para probar cada rol. La contraseña es <strong>demo1234</strong>.
            </p>
            <div className="mt-3 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => void useDemo(account)}
                  disabled={demoLoading !== null || loading}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-left text-xs shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
                >
                  <span>
                    <span className="block font-bold text-ink">{account.label}</span>
                    <span className="block text-[10px] text-slate-500">{account.email}</span>
                  </span>
                  {demoLoading === account.role ? (
                    <span className="text-[10px] font-semibold text-brand-600">Entrando…</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600">
                      Usar
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {IS_SUPABASE && (
          <p className="mt-4 rounded-xl bg-cloud px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            Modo Supabase activo. Las cuentas de demostración locales no están disponibles; crea tu
            cuenta o usa un usuario registrado en tu proyecto.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-bold text-brand-600 hover:text-brand-700">
            Regístrate gratis
          </Link>
        </p>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Al continuar aceptas los términos y la política de privacidad de RapiJob.
        </p>
      </div>
    </AuthShell>
  );
}
