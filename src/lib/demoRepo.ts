import type {
  CreateRequestInput,
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
import { createSeedDb, DEMO_DB_VERSION, type DemoDb, type DemoUser } from './seed';
import { DISTRICTS, STATUS_FLOW } from './constants';
import { folioFor, isValidEmail, uid } from './utils';

const DB_KEY = 'rapijob:db:v1';
const SESSION_KEY = 'rapijob:session:v1';
const SIM_KEY = 'rapijob:sim:v1';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadDb(): DemoDb {
  const restored = safeParse<DemoDb>(localStorage.getItem(DB_KEY));
  if (restored && restored.version === DEMO_DB_VERSION && Array.isArray(restored.technicians)) {
    return restored;
  }
  const seeded = createSeedDb();
  saveDb(seeded);
  return seeded;
}

function saveDb(db: DemoDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function session(): DemoUser | null {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const db = loadDb();
  return db.users.find((u) => u.id === id) ?? null;
}

function publicUser(user: DemoUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

function findTechOrThrow(db: DemoDb, techId: string): Technician {
  const tech = db.technicians.find((t) => t.id === techId);
  if (!tech) throw new Error('El técnico seleccionado ya no está disponible.');
  return tech;
}

function assertActive(user: DemoUser): void {
  if (user.status === 'suspendido') {
    throw new Error('Tu cuenta está suspendida. Contacta con soporte de RapiJob.');
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getSimulatedIds(): string[] {
  return safeParse<string[]>(localStorage.getItem(SIM_KEY)) ?? [];
}

function setSimulatedIds(ids: string[]): void {
  localStorage.setItem(SIM_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function computeNextStatus(status: ServiceRequest['status']): ServiceRequest['status'] | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

const auth: AuthApi = {
  async current() {
    const user = session();
    if (!user || user.status === 'suspendido') return null;
    return publicUser(user);
  },

  async signIn(email, password) {
    const db = loadDb();
    const user = db.users.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
    if (!user || user.password !== password) {
      throw new Error('Correo o contraseña incorrectos. Verifica tus datos e inténtalo otra vez.');
    }
    assertActive(user);
    localStorage.setItem(SESSION_KEY, user.id);
    return publicUser(user);
  },

  async signUp(input: SignUpInput) {
    const db = loadDb();
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) throw new Error('Ingresa un correo electrónico válido.');
    if (input.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    if (db.users.some((u) => normalizeEmail(u.email) === email)) {
      throw new Error('Ya existe una cuenta registrada con ese correo.');
    }

    const userId = uid('u');
    const district = input.district && DISTRICTS.some((d) => d.name === input.district)
      ? input.district
      : 'Huancayo';
    const center = DISTRICTS.find((d) => d.name === district) ?? DISTRICTS[0];

    let techId: string | undefined;
    if (input.role === 'tecnico') {
      techId = uid('t');
      const specialty = input.specialty || 'otros';
      db.technicians.unshift({
        id: techId,
        userId,
        name: input.name.trim(),
        specialty,
        specialties: [specialty],
        headline: 'Técnico independiente en RapiJob',
        bio: 'Perfil en proceso de verificación por el equipo de RapiJob.',
        experienceYears: Number(input.experienceYears) || 1,
        priceFrom: Number(input.priceFrom) || 50,
        rating: 0,
        reviewCount: 0,
        jobsDone: 0,
        available: false,
        verified: false,
        approved: false,
        district,
        address: input.address?.trim() || `${district}, Huancayo`,
        lat: center.lat + (Math.random() - 0.5) * 0.014,
        lng: center.lng + (Math.random() - 0.5) * 0.014,
        whatsapp: input.phone.replace(/\D/g, '').replace(/^51?/, '51'),
        schedule: 'Lun a Sáb · 8:00 a 18:00',
        gallery: [],
        createdAt: new Date().toISOString(),
      });
    }

    const user: DemoUser = {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      role: input.role,
      status: 'activo',
      city: input.city?.trim() || district,
      createdAt: new Date().toISOString(),
      techId,
      password: input.password,
    };
    db.users.push(user);
    saveDb(db);
    localStorage.setItem(SESSION_KEY, user.id);
    return publicUser(user);
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },

  async resetPassword(email) {
    const db = loadDb();
    const exists = db.users.some((u) => normalizeEmail(u.email) === normalizeEmail(email));
    if (!exists) {
      throw new Error('No encontramos una cuenta con ese correo.');
    }
    // En modo demo no se envían correos reales.
    return;
  },

  async updateProfile(patch) {
    const db = loadDb();
    const user = session();
    if (!user) throw new Error('Debes iniciar sesión.');
    const target = db.users.find((u) => u.id === user.id);
    if (!target) throw new Error('Usuario no encontrado.');

    if (patch.email && normalizeEmail(patch.email) !== normalizeEmail(target.email)) {
      if (db.users.some((u) => u.id !== target.id && normalizeEmail(u.email) === normalizeEmail(patch.email!))) {
        throw new Error('Ese correo ya está registrado por otra cuenta.');
      }
      target.email = normalizeEmail(patch.email);
    }
    if (patch.name) target.name = patch.name.trim();
    if (patch.phone) target.phone = patch.phone.trim();
    if (patch.city) target.city = patch.city.trim();

    if (target.techId && patch.name) {
      const tech = db.technicians.find((t) => t.id === target.techId);
      if (tech) tech.name = target.name;
    }
    saveDb(db);
    return publicUser(target);
  },
};

const data = {
  async listSpecialties(includeInactive = false) {
    const db = loadDb();
    return db.specialties.filter((s) => includeInactive || s.active).sort((a, b) => a.name.localeCompare(b.name));
  },

  async addSpecialty(input: Omit<Specialty, 'active'> & { active?: boolean }) {
    const db = loadDb();
    if (db.specialties.some((s) => s.slug === input.slug)) {
      throw new Error('Ya existe una categoría con ese identificador.');
    }
    const specialty: Specialty = {
      slug: input.slug,
      name: input.name,
      description: input.description,
      basePrice: Number(input.basePrice) || 50,
      active: input.active ?? true,
    };
    db.specialties.push(specialty);
    saveDb(db);
    return specialty;
  },

  async updateSpecialty(slug: string, patch: Partial<Specialty>) {
    const db = loadDb();
    const specialty = db.specialties.find((s) => s.slug === slug);
    if (!specialty) throw new Error('Categoría no encontrada.');
    Object.assign(specialty, patch, { slug });
    saveDb(db);
    return specialty;
  },

  async listTechnicians(opts?: { includePending?: boolean }) {
    const db = loadDb();
    return db.technicians
      .filter((t) => opts?.includePending || t.approved)
      .sort((a, b) => Number(b.available) - Number(a.available) || b.rating - a.rating);
  },

  async getTechnician(id: string) {
    return loadDb().technicians.find((t) => t.id === id) ?? null;
  },

  async updateTechnician(id: string, patch: TechnicianPatch) {
    const db = loadDb();
    const tech = findTechOrThrow(db, id);
    Object.assign(tech, patch);
    if (tech.userId) {
      const user = db.users.find((u) => u.id === tech.userId);
      if (user && patch.name) user.name = patch.name;
    }
    saveDb(db);
    return tech;
  },

  async listReviews(techId?: string) {
    const db = loadDb();
    return db.reviews
      .filter((r) => !techId || r.techId === techId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async listRequests(scope: RequestScope) {
    const db = loadDb();
    let requests = db.requests;
    if (scope.role === 'cliente') {
      requests = requests.filter((r) => r.clientId === scope.userId);
    } else if (scope.role === 'tecnico') {
      const tech = db.technicians.find((t) => t.userId === scope.userId);
      requests = requests.filter((r) => r.techId === (scope.techId ?? tech?.id));
    }
    return [...requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async createRequest(input: CreateRequestInput, user: User) {
    if (user.role !== 'cliente') {
      throw new Error('Solo las cuentas de cliente pueden solicitar un técnico.');
    }
    const db = loadDb();
    const tech = findTechOrThrow(db, input.techId);
    if (!tech.approved) throw new Error('Ese técnico aún no está verificado.');
    if (!input.description.trim() || input.description.trim().length < 15) {
      throw new Error('Describe el problema con al menos 15 caracteres.');
    }
    const id = uid('rq');
    const now = new Date().toISOString();
    const request: ServiceRequest = {
      id,
      folio: folioFor(id),
      clientId: user.id,
      clientName: user.name,
      clientPhone: user.phone,
      techId: tech.id,
      techName: tech.name,
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
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pendiente', at: now, note: 'Solicitud enviada por el cliente.' }],
    };
    db.requests.unshift(request);
    saveDb(db);
    setSimulatedIds([...getSimulatedIds(), id]);
    return request;
  },

  async updateRequestStatus(id: string, status: ServiceRequest['status'], note?: string) {
    const db = loadDb();
    const request = db.requests.find((r) => r.id === id);
    if (!request) throw new Error('Solicitud no encontrada.');
    if (request.status === status) return request;
    if (request.status === 'cancelada' || request.status === 'completada') {
      throw new Error('No se puede cambiar el estado de una solicitud finalizada.');
    }
    const now = new Date().toISOString();
    request.status = status;
    request.updatedAt = now;
    request.history.push({ status, at: now, note });
    if (status === 'completada') {
      const tech = db.technicians.find((t) => t.id === request.techId);
      if (tech) tech.jobsDone += 1;
      setSimulatedIds(getSimulatedIds().filter((x) => x !== id));
    }
    saveDb(db);
    return request;
  },

  async cancelRequest(id: string, by: 'cliente' | 'tecnico' | 'admin', reason?: string) {
    const db = loadDb();
    const request = db.requests.find((r) => r.id === id);
    if (!request) throw new Error('Solicitud no encontrada.');
    if (request.status === 'completada') {
      throw new Error('Una solicitud completada ya no se puede cancelar.');
    }
    if (request.status === 'cancelada') return request;
    const now = new Date().toISOString();
    request.status = 'cancelada';
    request.updatedAt = now;
    request.history.push({
      status: 'cancelada',
      at: now,
      note: reason || `Cancelada por el ${by}.`,
    });
    setSimulatedIds(getSimulatedIds().filter((x) => x !== id));
    saveDb(db);
    return request;
  },

  async rateRequest(requestId: string, rating: number, comment: string, clientName: string) {
    const db = loadDb();
    const request = db.requests.find((r) => r.id === requestId);
    if (!request) throw new Error('Solicitud no encontrada.');
    if (request.status !== 'completada') {
      throw new Error('Solo puedes calificar un servicio completado.');
    }
    if (request.rating) throw new Error('Ya calificaste este servicio.');

    request.rating = rating;
    request.reviewComment = comment.trim();
    const tech = db.technicians.find((t) => t.id === request.techId);
    if (tech) {
      const total = tech.rating * tech.reviewCount + rating;
      tech.reviewCount += 1;
      tech.rating = Math.round((total / tech.reviewCount) * 10) / 10;
      const review: Review = {
        id: uid('rev'),
        techId: tech.id,
        requestId: request.id,
        clientName,
        rating,
        comment: comment.trim() || 'Servicio calificado sin comentario.',
        createdAt: new Date().toISOString(),
      };
      db.reviews.unshift(review);
    }
    saveDb(db);
    return request;
  },

  async listUsers() {
    return loadDb().users.map(publicUser);
  },

  async updateUser(id: string, patch: { status?: UserStatus; name?: string; phone?: string }) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error('Usuario no encontrado.');
    if (user.role === 'admin' && patch.status === 'suspendido') {
      throw new Error('No puedes suspender a un administrador.');
    }
    Object.assign(user, patch);
    if (patch.name && user.techId) {
      const tech = db.technicians.find((t) => t.id === user.techId);
      if (tech) tech.name = patch.name;
    }
    saveDb(db);
    return publicUser(user);
  },
};

export const demoRepo: Repo = {
  mode: 'demo',
  auth,
  ...data,
  async simulateTick() {
    const db = loadDb();
    const ids = getSimulatedIds();
    if (!ids.length) return 0;
    const finished: string[] = [];
    let changed = 0;
    for (const id of ids) {
      const request = db.requests.find((r) => r.id === id);
      if (!request) {
        finished.push(id);
        continue;
      }
      const next = computeNextStatus(request.status);
      if (!next) {
        finished.push(id);
        continue;
      }
      const now = new Date().toISOString();
      request.status = next;
      request.updatedAt = now;
      request.history.push({
        status: next,
        at: now,
        note: 'Actualización automática del equipo técnico (modo demo).',
      });
      if (next === 'completada') {
        const tech = db.technicians.find((t) => t.id === request.techId);
        if (tech) tech.jobsDone += 1;
        finished.push(id);
      }
      changed += 1;
    }
    saveDb(db);
    setSimulatedIds(ids.filter((id) => !finished.includes(id)));
    return changed;
  },
};

export function resetDemoData(): void {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SIM_KEY);
  loadDb();
}
