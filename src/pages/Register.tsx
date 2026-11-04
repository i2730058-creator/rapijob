import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { panelPath } from '@/lib/navigation';
import { DISTRICTS, SERVICE_DISTRICTS } from '@/lib/constants';
import { cn, isValidEmail, passwordStrength } from '@/lib/utils';

type RegisterRole = 'cliente' | 'tecnico';

export function Register() {
  const { user, ready, signUp } = useAuth();
  const { specialties } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const initialRole: RegisterRole = params.get('rol') === 'tecnico' ? 'tecnico' : 'cliente';

  const [role, setRole] = useState<RegisterRole>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Huancayo');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialty, setSpecialty] = useState('electricista');
  const [experience, setExperience] = useState('2');
  const [priceFrom, setPriceFrom] = useState('60');
  const [address, setAddress] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  if (ready && user) {
    return <Navigate to={panelPath(user.role)} replace />;
  }

  const strength = passwordStrength(password);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 3) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Ingresa un número de celular válido (9 dígitos).');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!accepted) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }
    if (role === 'tecnico' && (!specialty || !address.trim())) {
      setError('Completa tu especialidad y dirección de atención.');
      return;
    }

    setLoading(true);
    try {
      const created = await signUp({
        name,
        email,
        phone,
        password,
        role,
        city: district,
        district,
        address,
        specialty: role === 'tecnico' ? specialty : undefined,
        experienceYears: role === 'tecnico' ? Number(experience) : undefined,
        priceFrom: role === 'tecnico' ? Number(priceFrom) : undefined,
      });
      toast.success(
        'Cuenta creada',
        role === 'tecnico'
          ? 'Tu perfil será revisado por el equipo de RapiJob.'
          : 'Ya puedes solicitar tu primer técnico.',
      );
      navigate(panelPath(created.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 ring-1 ring-inset ring-brand-100">
          <UserRound className="h-3 w-3" />
          Crear cuenta
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Únete a RapiJob
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Crea tu cuenta gratis y empieza en menos de un minuto.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-cloud p-1.5">
          <button
            type="button"
            onClick={() => setRole('cliente')}
            className={cn(
              'rounded-xl px-3 py-3 text-center transition',
              role === 'cliente' ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'text-slate-500',
            )}
          >
            <UserRound className={cn('mx-auto h-5 w-5', role === 'cliente' ? 'text-brand-600' : 'text-slate-500')} />
            <span className="mt-1 block text-xs font-bold text-ink">Soy cliente</span>
            <span className="block text-[10px] text-slate-500">Busco un técnico</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('tecnico')}
            className={cn(
              'rounded-xl px-3 py-3 text-center transition',
              role === 'tecnico' ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'text-slate-500',
            )}
          >
            <BriefcaseBusiness
              className={cn('mx-auto h-5 w-5', role === 'tecnico' ? 'text-brand-600' : 'text-slate-500')}
            />
            <span className="mt-1 block text-xs font-bold text-ink">Soy técnico</span>
            <span className="block text-[10px] text-slate-500">Ofrezco servicios</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="label">
              Nombre completo
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombres y apellidos"
                className="input-field pl-10"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="label">
                Correo
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
            <div>
              <label htmlFor="phone" className="label">
                Celular
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="987 654 321"
                  className="input-field pl-10"
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="district" className="label">
              Distrito
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                id="district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="select-field pl-10"
              >
                {SERVICE_DISTRICTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {role === 'tecnico' && (
            <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Datos profesionales
              </p>
              <div>
                <label htmlFor="specialty" className="label">
                  Especialidad principal
                </label>
                <select
                  id="specialty"
                  value={specialty}
                  onChange={(event) => setSpecialty(event.target.value)}
                  className="input-field"
                >
                  {specialties.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="experience" className="label">
                    Años de experiencia
                  </label>
                  <input
                    id="experience"
                    type="number"
                    min={0}
                    max={50}
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="price" className="label">
                    Precio desde (S/)
                  </label>
                  <input
                    id="price"
                    type="number"
                    min={0}
                    step={5}
                    value={priceFrom}
                    onChange={(event) => setPriceFrom(event.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="address" className="label">
                  Dirección de atención
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Calle, número y distrito"
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-brand-700/70">
                Al registrarte, tu perfil pasa por una revisión. Podrás completar tu bio, horarios y
                fotos desde el panel del técnico.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-field pl-10 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded-full',
                          strength.score >= level
                            ? strength.score >= 3
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500">{strength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirm" className="label">
                Confirmar contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repite tu contraseña"
                  className="input-field pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-slate-500">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
            />
            Acepto los términos y condiciones, la política de privacidad y el tratamiento de mis datos
            personales para la gestión de servicios.
          </label>

          <Button type="submit" size="lg" full loading={loading}>
            Crear mi cuenta
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">
            Inicia sesión
          </Link>
        </p>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Datos de demostración. No uses contraseñas reales en este entorno.
        </p>
      </div>
    </AuthShell>
  );
}
