export type Role = 'cliente' | 'tecnico' | 'admin';

export type UserStatus = 'activo' | 'suspendido';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  city: string;
  createdAt: string;
  /** Solo para usuarios con rol técnico: id de su perfil profesional. */
  techId?: string;
}

export interface Specialty {
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  active: boolean;
}

export interface Technician {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  specialties: string[];
  headline: string;
  bio: string;
  experienceYears: number;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  jobsDone: number;
  available: boolean;
  verified: boolean;
  approved: boolean;
  district: string;
  address: string;
  lat: number;
  lng: number;
  whatsapp: string;
  schedule: string;
  gallery: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  techId: string;
  requestId?: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type RequestStatus =
  | 'pendiente'
  | 'aceptada'
  | 'en_camino'
  | 'en_servicio'
  | 'completada'
  | 'cancelada';

export interface RequestEvent {
  status: RequestStatus;
  at: string;
  note?: string;
}

export interface ServiceRequest {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  techId: string;
  techName: string;
  specialty: string;
  description: string;
  photos: string[];
  address: string;
  reference: string;
  district: string;
  lat: number;
  lng: number;
  date: string;
  time: string;
  status: RequestStatus;
  price: number;
  createdAt: string;
  updatedAt: string;
  history: RequestEvent[];
  rating?: number;
  reviewComment?: string;
  techNote?: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'cliente' | 'tecnico';
  city?: string;
  specialty?: string;
  experienceYears?: number;
  priceFrom?: number;
  district?: string;
  address?: string;
}

export interface CreateRequestInput {
  specialty: string;
  description: string;
  photos: string[];
  address: string;
  reference: string;
  district: string;
  lat: number;
  lng: number;
  date: string;
  time: string;
  techId: string;
}

export interface TechnicianPatch {
  name?: string;
  specialty?: string;
  specialties?: string[];
  headline?: string;
  bio?: string;
  experienceYears?: number;
  priceFrom?: number;
  available?: boolean;
  verified?: boolean;
  approved?: boolean;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  whatsapp?: string;
  schedule?: string;
  gallery?: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RequestFilters {
  specialty?: string;
  available?: boolean;
  maxDistance?: number;
  query?: string;
}
