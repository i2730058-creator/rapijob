import type {
  CreateRequestInput,
  RequestEvent,
  Review,
  ServiceRequest,
  SignUpInput,
  Specialty,
  Technician,
  TechnicianPatch,
  User,
  UserStatus,
} from '@/types';
import type { AuthApi, Repo, RequestScope } from './repo';
import { supabase } from './supabase';
import { DISTRICTS } from './constants';
import { folioFor, uid } from './utils';

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

function translate(message?: string): string {
  if (!message) return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/email already registered|already been registered/i.test(message)) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (/password should be at least/i.test(message)) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (/rate limit/i.test(message)) return 'Demasiados intentos. Espera unos minutos.';
  return message;
}

type Row = Record<string, unknown>;

function mapUser(row: Row, techId?: string): User {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    role: row.role as User['role'],
    status: (row.status as UserStatus) ?? 'activo',
    city: String(row.city ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    techId,
  };
}

function mapSpecialty(row: Row): Specialty {
  return {
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ''),
    basePrice: Number(row.base_price ?? 50),
    active: Bool(row.active ?? true),
  };
}

function Bool(value: unknown): boolean {
  return value === true || value === 'true';
}

function mapTechnician(row: Row): Technician {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    name: String(row.name ?? ''),
    specialty: String(row.specialty ?? 'otros'),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    headline: String(row.headline ?? ''),
    bio: String(row.bio ?? ''),
    experienceYears: Number(row.experience_years ?? 0),
    priceFrom: Number(row.price_from ?? 0),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    jobsDone: Number(row.jobs_done ?? 0),
    available: Bool(row.available),
    verified: Bool(row.verified),
    approved: Bool(row.approved),
    district: String(row.district ?? ''),
    address: String(row.address ?? ''),
    lat: Number(row.lat ?? -12.0651),
    lng: Number(row.lng ?? -75.2049),
    whatsapp: String(row.whatsapp ?? ''),
    schedule: String(row.schedule ?? ''),
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapReview(row: Row): Review {
  return {
    id: String(row.id),
    techId: String(row.tech_id),
    requestId: row.request_id ? String(row.request_id) : undefined,
    clientName: String(row.client_name ?? ''),
    rating: Number(row.rating ?? 0),
    comment: String(row.comment ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapRequest(row: Row): ServiceRequest {
  return {
    id: String(row.id),
    folio: String(row.folio ?? ''),
    clientId: String(row.client_id ?? ''),
    clientName: String(row.client_name ?? ''),
    clientPhone: String(row.client_phone ?? ''),
    techId: String(row.tech_id ?? ''),
    techName: String(row.tech_name ?? ''),
    specialty: String(row.specialty ?? ''),
    description: String(row.description ?? ''),
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    address: String(row.address ?? ''),
    reference: String(row.reference ?? ''),
    district: String(row.district ?? ''),
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    status: row.status as ServiceRequest['status'],
    price: Number(row.price ?? 0),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    history: Array.isArray(row.history) ? (row.history as RequestEvent[]) : [],
    rating: row.rating ? Number(row.rating) : undefined,
    reviewComment: row.review_comment ? String(row.review_comment) : undefined,
    techNote: row.tech_note ? String(row.tech_note) : undefined,
  };
}

async function fetchProfile(userId: string): Promise<User | null> {
  const db = client();
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(translate(error.message));
  if (!data) return null;
  let techId: string | undefined;
  if (data.role === 'tecnico') {
    const { data: tech } = await db
      .from('technicians')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    techId = tech?.id ? String(tech.id) : undefined;
  }
  return mapUser(data as Row, techId);
}

const auth: AuthApi = {
  async current() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    try {
      const profile = await fetchProfile(data.session.user.id);
      if (!profile || profile.status === 'suspendido') return null;
      return profile;
    } catch {
      return null;
    }
  },

  async signIn(email, password) {
    const db = client();
    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(translate(error.message));
    if (!data.user) throw new Error('No se pudo iniciar sesión.');
    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      await db.auth.signOut();
      throw new Error('Tu perfil no está disponible. Contacta con soporte.');
    }
    if (profile.status === 'suspendido') {
      await db.auth.signOut();
      throw new Error('Tu cuenta está suspendida. Contacta con soporte de RapiJob.');
    }
    return profile;
  },

  async signUp(input: SignUpInput) {
    const db = client();
    const center = DISTRICTS.find((d) => d.name === input.district) ?? DISTRICTS[0];
    const { data, error } = await db.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          name: input.name.trim(),
          phone: input.phone.trim(),
          role: input.role,
          city: input.city?.trim() || input.district || 'Huancayo',
          specialty: input.specialty ?? 'otros',
          district: input.district ?? 'Huancayo',
          address: input.address ?? '',
          experience_years: input.experienceYears ?? 1,
          price_from: input.priceFrom ?? 50,
          lat: center.lat,
          lng: center.lng,
        },
      },
    });
    if (error) throw new Error(translate(error.message));
    if (!data.user) throw new Error('No se pudo crear la cuenta.');
    if (!data.session) {
      throw new Error(
        'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión. ' +
          'Consejo: para demos, desactiva "Confirm email" en Supabase Auth.',
      );
    }

    // El trigger handle_new_user crea el perfil. Esperamos brevemente por si acaso.
    let profile: User | null = null;
    for (let i = 0; i < 3 && !profile; i += 1) {
      profile = await fetchProfile(data.user.id);
      if (!profile) await new Promise((r) => setTimeout(r, 400));
    }
    if (!profile) throw new Error('La cuenta fue creada, pero no se pudo cargar el perfil.');

    if (input.role === 'tecnico') {
      const { data: techRow, error: techError } = await db
        .from('technicians')
        .insert({
          user_id: data.user.id,
          name: input.name.trim(),
          specialty: input.specialty || 'otros',
          specialties: [input.specialty || 'otros'],
          headline: 'Técnico independiente en RapiJob',
          bio: 'Perfil en proceso de verificación por el equipo de RapiJob.',
          experience_years: input.experienceYears ?? 1,
          price_from: input.priceFrom ?? 50,
          available: false,
          verified: false,
          approved: false,
          district: input.district ?? 'Huancayo',
          address: input.address ?? '',
          lat: center.lat,
          lng: center.lng,
          whatsapp: input.phone.replace(/\D/g, ''),
          schedule: 'Lun a Sáb · 8:00 a 18:00',
          gallery: [],
        })
        .select('id')
        .single();
      if (techError) {
        await db.auth.signOut();
        throw new Error(translate(techError.message));
      }
      profile.techId = String(techRow.id);
    }
    return profile;
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async resetPassword(email) {
    const db = client();
    const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(translate(error.message));
  },

  async updateProfile(patch) {
    const db = client();
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session?.user) throw new Error('Debes iniciar sesión.');
    const update: Row = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.email !== undefined) update.email = patch.email.trim().toLowerCase();
    if (patch.phone !== undefined) update.phone = patch.phone.trim();
    if (patch.city !== undefined) update.city = patch.city.trim();
    const { error } = await db.from('profiles').update(update).eq('id', sessionData.session.user.id);
    if (error) throw new Error(translate(error.message));
    if (patch.email) {
      await db.auth.updateUser({ email: patch.email.trim().toLowerCase() });
    }
    const profile = await fetchProfile(sessionData.session.user.id);
    if (!profile) throw new Error('No se pudo actualizar el perfil.');
    return profile;
  },
};

const data = {
  async listSpecialties(includeInactive = false) {
    const db = client();
    let query = db.from('specialties').select('*').order('name');
    if (!includeInactive) query = query.eq('active', true);
    const { data: rows, error } = await query;
    if (error) throw new Error(translate(error.message));
    return (rows ?? []).map((r) => mapSpecialty(r as Row));
  },

  async addSpecialty(input: Omit<Specialty, 'active'> & { active?: boolean }) {
    const db = client();
    const { data: row, error } = await db
      .from('specialties')
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description,
        base_price: input.basePrice,
        active: input.active ?? true,
      })
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    return mapSpecialty(row as Row);
  },

  async updateSpecialty(slug: string, patch: Partial<Specialty>) {
    const db = client();
    const update: Row = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.basePrice !== undefined) update.base_price = patch.basePrice;
    if (patch.active !== undefined) update.active = patch.active;
    const { data: row, error } = await db
      .from('specialties')
      .update(update)
      .eq('slug', slug)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    return mapSpecialty(row as Row);
  },

  async listTechnicians(opts?: { includePending?: boolean }) {
    const db = client();
    let query = db.from('technicians').select('*').order('rating', { ascending: false });
    if (!opts?.includePending) query = query.eq('approved', true);
    const { data: rows, error } = await query;
    if (error) throw new Error(translate(error.message));
    return (rows ?? []).map((r) => mapTechnician(r as Row));
  },

  async getTechnician(id: string) {
    const db = client();
    const { data: row, error } = await db.from('technicians').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(translate(error.message));
    return row ? mapTechnician(row as Row) : null;
  },

  async updateTechnician(id: string, patch: TechnicianPatch) {
    const db = client();
    const update: Row = {};
    const map: Record<string, string> = {
      name: 'name',
      specialty: 'specialty',
      specialties: 'specialties',
      headline: 'headline',
      bio: 'bio',
      experienceYears: 'experience_years',
      priceFrom: 'price_from',
      available: 'available',
      verified: 'verified',
      approved: 'approved',
      district: 'district',
      address: 'address',
      lat: 'lat',
      lng: 'lng',
      whatsapp: 'whatsapp',
      schedule: 'schedule',
      gallery: 'gallery',
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined && map[key]) update[map[key]] = value;
    }
    const { data: row, error } = await db
      .from('technicians')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    if (patch.name) {
      const tech = mapTechnician(row as Row);
      await db.from('profiles').update({ name: patch.name }).eq('id', tech.userId);
    }
    return mapTechnician(row as Row);
  },

  async listReviews(techId?: string) {
    const db = client();
    let query = db.from('reviews').select('*').order('created_at', { ascending: false });
    if (techId) query = query.eq('tech_id', techId);
    const { data: rows, error } = await query;
    if (error) throw new Error(translate(error.message));
    return (rows ?? []).map((r) => mapReview(r as Row));
  },

  async listRequests(scope: RequestScope) {
    const db = client();
    let query = db.from('service_requests').select('*').order('created_at', { ascending: false });
    if (scope.role === 'cliente') query = query.eq('client_id', scope.userId);
    if (scope.role === 'tecnico') {
      let techId = scope.techId;
      if (!techId) {
        const { data: tech } = await db
          .from('technicians')
          .select('id')
          .eq('user_id', scope.userId)
          .maybeSingle();
        techId = tech?.id ? String(tech.id) : undefined;
      }
      if (!techId) return [];
      query = query.eq('tech_id', techId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(translate(error.message));
    return (rows ?? []).map((r) => mapRequest(r as Row));
  },

  async createRequest(input: CreateRequestInput, user: User) {
    const db = client();
    if (user.role !== 'cliente') throw new Error('Solo los clientes pueden solicitar un técnico.');
    const { data: techRow, error: techError } = await db
      .from('technicians')
      .select('*')
      .eq('id', input.techId)
      .maybeSingle();
    if (techError) throw new Error(translate(techError.message));
    if (!techRow || !techRow.approved) throw new Error('El técnico seleccionado no está disponible.');
    const tech = mapTechnician(techRow as Row);
    if (!input.description.trim() || input.description.trim().length < 15) {
      throw new Error('Describe el problema con al menos 15 caracteres.');
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      folio: folioFor(id),
      client_id: user.id,
      client_name: user.name,
      client_phone: user.phone,
      tech_id: tech.id,
      tech_name: tech.name,
      specialty: input.specialty,
      description: input.description.trim(),
      photos: input.photos,
      address: input.address.trim(),
      reference: input.reference.trim(),
      district: input.district,
      lat: input.lat,
      lng: input.lng,
      date: input.date,
      time: input.time,
      status: 'pendiente',
      price: tech.priceFrom,
      history: [{ status: 'pendiente', at: now, note: 'Solicitud enviada por el cliente.' }],
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await db
      .from('service_requests')
      .insert(row)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    return mapRequest(created as Row);
  },

  async updateRequestStatus(id: string, status: ServiceRequest['status'], note?: string) {
    const db = client();
    const { data: current, error: readError } = await db
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (readError) throw new Error(translate(readError.message));
    const request = mapRequest(current as Row);
    if (request.status === 'cancelada' || request.status === 'completada') {
      throw new Error('No se puede cambiar el estado de una solicitud finalizada.');
    }
    const now = new Date().toISOString();
    const history = [...request.history, { status, at: now, note }];
    const { data: updated, error } = await db
      .from('service_requests')
      .update({ status, updated_at: now, history })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    if (status === 'completada') {
      const { data: tech } = await db
        .from('technicians')
        .select('jobs_done')
        .eq('id', request.techId)
        .maybeSingle();
      if (tech) {
        await db
          .from('technicians')
          .update({ jobs_done: Number(tech.jobs_done ?? 0) + 1 })
          .eq('id', request.techId);
      }
    }
    return mapRequest(updated as Row);
  },

  async cancelRequest(id: string, by: 'cliente' | 'tecnico' | 'admin', reason?: string) {
    const db = client();
    const { data: current, error: readError } = await db
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (readError) throw new Error(translate(readError.message));
    const request = mapRequest(current as Row);
    if (request.status === 'completada') {
      throw new Error('Una solicitud completada no se puede cancelar.');
    }
    if (request.status === 'cancelada') return request;
    const now = new Date().toISOString();
    const history = [
      ...request.history,
      { status: 'cancelada', at: now, note: reason || `Cancelada por el ${by}.` },
    ];
    const { data: updated, error } = await db
      .from('service_requests')
      .update({ status: 'cancelada', updated_at: now, history })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    return mapRequest(updated as Row);
  },

  async rateRequest(requestId: string, rating: number, comment: string, clientName: string) {
    const db = client();
    const { data: current, error: readError } = await db
      .from('service_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (readError) throw new Error(translate(readError.message));
    const request = mapRequest(current as Row);
    if (request.status !== 'completada') throw new Error('Solo puedes calificar servicios completados.');
    if (request.rating) throw new Error('Ya calificaste este servicio.');
    const { data: updated, error } = await db
      .from('service_requests')
      .update({ rating, review_comment: comment.trim() })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));

    const { data: techRow } = await db
      .from('technicians')
      .select('rating, review_count')
      .eq('id', request.techId)
      .maybeSingle();
    if (techRow) {
      const count = Number(techRow.review_count ?? 0);
      const average = Number(techRow.rating ?? 0);
      const newCount = count + 1;
      const newRating = Math.round(((average * count + rating) / newCount) * 10) / 10;
      await db
        .from('technicians')
        .update({ rating: newRating, review_count: newCount })
        .eq('id', request.techId);
    }
    await db.from('reviews').insert({
      id: uid('rev'),
      tech_id: request.techId,
      request_id: request.id,
      client_name: clientName,
      rating,
      comment: comment.trim() || 'Servicio calificado sin comentario.',
    });
    return mapRequest(updated as Row);
  },

  async listUsers() {
    const db = client();
    const { data: rows, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(translate(error.message));
    return (rows ?? []).map((r) => mapUser(r as Row));
  },

  async updateUser(id: string, patch: { status?: UserStatus; name?: string; phone?: string }) {
    const db = client();
    const update: Row = {};
    if (patch.status) update.status = patch.status;
    if (patch.name) update.name = patch.name;
    if (patch.phone) update.phone = patch.phone;
    const { data: row, error } = await db
      .from('profiles')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(translate(error.message));
    return mapUser(row as Row);
  },
};

export const supabaseRepo: Repo = {
  mode: 'supabase',
  auth,
  ...data,
};
