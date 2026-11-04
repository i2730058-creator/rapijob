import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { repo, IS_SUPABASE } from '@/lib/repo';
import { useToast } from '@/context/ToastContext';
import { isValidEmail } from '@/lib/utils';

export function Recover() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    try {
      await repo.auth.resetPassword(email);
      setSent(true);
      toast.success('Solicitud registrada', 'Revisa las instrucciones para recuperar tu acceso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">Revisa tu correo</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Si existe una cuenta vinculada a <strong className="text-ink">{email}</strong>, enviamos las
            instrucciones para restablecer tu contraseña.
          </p>
          {!IS_SUPABASE && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-left text-[11px] leading-relaxed text-amber-800">
              <p className="font-bold">Modo demo</p>
              <p className="mt-1">
                Este entorno no envía correos reales. Usa una de las cuentas de demostración de la
                pantalla de inicio de sesión (contraseña <strong>demo1234</strong>) o restablece los
                datos desde el pie de página.
              </p>
            </div>
          )}
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 ring-1 ring-inset ring-brand-100">
            <Mail className="h-3 w-3" />
            Recuperar acceso
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Ingresa el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <Button type="submit" size="lg" full loading={loading}>
              Enviar instrucciones
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
