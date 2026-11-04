import { CheckCircle2, Clock3, MapPin, Navigation, Wrench, XCircle } from 'lucide-react';
import type { RequestStatus } from '@/types';
import { STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

const icons = {
  pendiente: Clock3,
  aceptada: CheckCircle2,
  en_camino: Navigation,
  en_servicio: Wrench,
  completada: MapPin,
  cancelada: XCircle,
} as const;

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: RequestStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = icons[status];
  return (
    <span className={cn('chip', meta.badge, className)}>
      {showIcon ? <Icon className="h-3.5 w-3.5" /> : <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />}
      {meta.label}
    </span>
  );
}
