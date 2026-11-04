import {
  AirVent,
  Camera,
  Car,
  DoorOpen,
  Droplets,
  Flame,
  Hammer,
  Laptop,
  Paintbrush,
  Smartphone,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const map: Record<string, { icon: LucideIcon; className: string }> = {
  electricista: { icon: Zap, className: 'bg-amber-50 text-amber-600' },
  plomero: { icon: Droplets, className: 'bg-sky-50 text-sky-600' },
  gasfitero: { icon: Flame, className: 'bg-orange-50 text-orange-600' },
  computadoras: { icon: Laptop, className: 'bg-indigo-50 text-indigo-600' },
  celulares: { icon: Smartphone, className: 'bg-violet-50 text-violet-600' },
  instalador: { icon: Camera, className: 'bg-slate-100 text-slate-700' },
  hogar: { icon: Hammer, className: 'bg-emerald-50 text-emerald-700' },
  refrigeracion: { icon: AirVent, className: 'bg-cyan-50 text-cyan-600' },
  pintor: { icon: Paintbrush, className: 'bg-rose-50 text-rose-600' },
  carpintero: { icon: DoorOpen, className: 'bg-yellow-50 text-yellow-700' },
  mecanico: { icon: Car, className: 'bg-blue-50 text-blue-600' },
  otros: { icon: Wrench, className: 'bg-slate-100 text-slate-600' },
};

interface SpecialtyIconProps {
  slug: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: { box: 'h-9 w-9 rounded-xl', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 rounded-2xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' },
  xl: { box: 'h-16 w-16 rounded-3xl', icon: 'h-7 w-7' },
};

export function SpecialtyIcon({ slug, size = 'md', className }: SpecialtyIconProps) {
  const config = map[slug] ?? map.otros;
  const Icon = config.icon;
  const s = sizes[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        config.className,
        s.box,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={s.icon} strokeWidth={1.9} />
    </span>
  );
}
