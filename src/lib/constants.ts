import type { LatLng, RequestStatus } from '@/types';

export const APP_NAME = 'RapiJob';
export const TAGLINE = 'Técnicos confiables, soluciones rápidas';
export const SUBTAGLINE = 'Técnicos cerca de ti';

export const DEFAULT_CENTER: LatLng = {
  lat: Number(import.meta.env.VITE_DEFAULT_LAT ?? -12.0651),
  lng: Number(import.meta.env.VITE_DEFAULT_LNG ?? -75.2049),
};

export const DISTRICTS = [
  { name: 'Huancayo', lat: -12.0651, lng: -75.2049 },
  { name: 'El Tambo', lat: -12.0502, lng: -75.2182 },
  { name: 'Chilca', lat: -12.0831, lng: -75.2158 },
] as const;

export type DistrictName = (typeof DISTRICTS)[number]['name'];

export const SERVICE_DISTRICTS = DISTRICTS.map((d) => d.name);

export const STATUS_META: Record<
  RequestStatus,
  { label: string; short: string; description: string; badge: string; dot: string }
> = {
  pendiente: {
    label: 'Pendiente',
    short: 'Pendiente',
    description: 'La solicitud fue enviada y espera la confirmación del técnico.',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  aceptada: {
    label: 'Aceptada',
    short: 'Aceptada',
    description: 'El técnico aceptó el servicio y se prepara para salir.',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
  },
  en_camino: {
    label: 'Técnico en camino',
    short: 'En camino',
    description: 'El técnico ya se dirige a la ubicación del servicio.',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dot: 'bg-indigo-500',
  },
  en_servicio: {
    label: 'En servicio',
    short: 'En servicio',
    description: 'El técnico está realizando el trabajo solicitado.',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
  },
  completada: {
    label: 'Completada',
    short: 'Completada',
    description: 'El servicio terminó correctamente. ¡Ya puedes calificar!',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelada: {
    label: 'Cancelada',
    short: 'Cancelada',
    description: 'La solicitud fue cancelada.',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
};

export const ACTIVE_STATUSES: RequestStatus[] = [
  'pendiente',
  'aceptada',
  'en_camino',
  'en_servicio',
];

export const STATUS_FLOW: RequestStatus[] = [
  'pendiente',
  'aceptada',
  'en_camino',
  'en_servicio',
  'completada',
];

export const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export const PRICE_FROM_LABEL = 'Precio referencial';

export const DEMO_ACCOUNTS = [
  {
    role: 'cliente' as const,
    label: 'Cliente',
    name: 'María Fernández',
    email: 'cliente@rapijob.pe',
    password: 'demo1234',
  },
  {
    role: 'tecnico' as const,
    label: 'Técnico',
    name: 'Carlos Quispe',
    email: 'tecnico@rapijob.pe',
    password: 'demo1234',
  },
  {
    role: 'admin' as const,
    label: 'Administrador',
    name: 'Administrador RapiJob',
    email: 'admin@rapijob.pe',
    password: 'demo1234',
  },
];
