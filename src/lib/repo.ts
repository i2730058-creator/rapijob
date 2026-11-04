import type {
  CreateRequestInput,
  Review,
  Role,
  ServiceRequest,
  SignUpInput,
  Specialty,
  Technician,
  TechnicianPatch,
  User,
  UserStatus,
} from '@/types';

export interface RequestScope {
  userId: string;
  role: Role;
  techId?: string;
}

export interface AuthApi {
  current(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updateProfile(patch: Partial<User>): Promise<User>;
}

export interface Repo {
  mode: 'demo' | 'supabase';
  auth: AuthApi;
  listSpecialties(includeInactive?: boolean): Promise<Specialty[]>;
  addSpecialty(input: Omit<Specialty, 'active'> & { active?: boolean }): Promise<Specialty>;
  updateSpecialty(slug: string, patch: Partial<Specialty>): Promise<Specialty>;
  listTechnicians(opts?: { includePending?: boolean }): Promise<Technician[]>;
  getTechnician(id: string): Promise<Technician | null>;
  updateTechnician(id: string, patch: TechnicianPatch): Promise<Technician>;
  listReviews(techId?: string): Promise<Review[]>;
  listRequests(scope: RequestScope): Promise<ServiceRequest[]>;
  createRequest(input: CreateRequestInput, user: User): Promise<ServiceRequest>;
  updateRequestStatus(id: string, status: ServiceRequest['status'], note?: string): Promise<ServiceRequest>;
  cancelRequest(id: string, by: 'cliente' | 'tecnico' | 'admin', reason?: string): Promise<ServiceRequest>;
  rateRequest(
    requestId: string,
    rating: number,
    comment: string,
    clientName: string,
  ): Promise<ServiceRequest>;
  listUsers(): Promise<User[]>;
  updateUser(id: string, patch: { status?: UserStatus; name?: string; phone?: string }): Promise<User>;
  /** Solo en modo demo: avanza las solicitudes creadas en esta sesión. */
  simulateTick?(): Promise<number>;
}

export const IS_SUPABASE = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export { demoRepo, resetDemoData } from './demoRepo';
export { supabaseRepo } from './supabaseRepo';

import { demoRepo } from './demoRepo';
import { supabaseRepo } from './supabaseRepo';

export const repo: Repo = IS_SUPABASE ? supabaseRepo : demoRepo;
