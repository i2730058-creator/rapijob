import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CreateRequestInput,
  Review,
  ServiceRequest,
  Specialty,
  Technician,
  TechnicianPatch,
  User,
  UserStatus,
} from '@/types';
import { repo } from '@/lib/repo';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface DataContextValue {
  specialties: Specialty[];
  technicians: Technician[];
  reviews: Review[];
  requests: ServiceRequest[];
  users: User[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  techProfile: Technician | null;
  refreshAll: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshReviews: () => Promise<void>;
  technicianById: (id: string) => Technician | undefined;
  specialtyName: (slug: string) => string;
  reviewsForTech: (techId: string) => Review[];
  createRequest: (input: CreateRequestInput) => Promise<ServiceRequest>;
  updateRequestStatus: (
    id: string,
    status: ServiceRequest['status'],
    note?: string,
  ) => Promise<ServiceRequest>;
  cancelRequest: (id: string, reason?: string) => Promise<ServiceRequest>;
  rateRequest: (id: string, rating: number, comment: string) => Promise<ServiceRequest>;
  updateTechnician: (id: string, patch: TechnicianPatch) => Promise<Technician>;
  updateSpecialty: (slug: string, patch: Partial<Specialty>) => Promise<Specialty>;
  addSpecialty: (input: Omit<Specialty, 'active'> & { active?: boolean }) => Promise<Specialty>;
  updateUser: (
    id: string,
    patch: { status?: UserStatus; name?: string; phone?: string },
  ) => Promise<User>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const toast = useToast();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const isAdmin = user?.role === 'admin';

  const loadPublic = useCallback(async () => {
    const [specialtyList, techList, reviewList] = await Promise.all([
      repo.listSpecialties(isAdmin),
      repo.listTechnicians({ includePending: isAdmin }),
      repo.listReviews(),
    ]);
    setSpecialties(specialtyList);
    setTechnicians(techList);
    setReviews(reviewList);
  }, [isAdmin]);

  const refreshRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      return;
    }
    const list = await repo.listRequests({
      userId: user.id,
      role: user.role,
      techId: user.techId,
    });
    setRequests(list);
  }, [user]);

  const refreshUsers = useCallback(async () => {
    if (user?.role !== 'admin') {
      setUsers([]);
      return;
    }
    setUsers(await repo.listUsers());
  }, [user]);

  const refreshReviews = useCallback(async () => {
    setReviews(await repo.listReviews());
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPublic();
      await refreshRequests();
      await refreshUsers();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
    } finally {
      setRefreshing(false);
    }
  }, [loadPublic, refreshRequests, refreshUsers]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      try {
        await loadPublic();
        if (active && user) await refreshRequests();
        if (active && user?.role === 'admin') await refreshUsers();
        if (active) setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
      } finally {
        if (active) {
          setLoading(false);
          loadedOnce.current = true;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user, loadPublic, refreshRequests, refreshUsers]);

  // Seguimiento casi en tiempo real: simulación en demo y sondeo con Supabase.
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(async () => {
      try {
        if (repo.mode === 'demo') {
          const changed = (await repo.simulateTick?.()) ?? 0;
          if (changed > 0) await refreshRequests();
        } else {
          await refreshRequests();
        }
      } catch {
        // Silencioso: no interrumpimos la experiencia por un fallo de red.
      }
    }, repo.mode === 'demo' ? 18000 : 25000);
    return () => window.clearInterval(interval);
  }, [user, refreshRequests]);

  const technicianById = useCallback(
    (id: string) => technicians.find((tech) => tech.id === id),
    [technicians],
  );

  const specialtyName = useCallback(
    (slug: string) => specialties.find((s) => s.slug === slug)?.name ?? 'Servicio técnico',
    [specialties],
  );

  const reviewsForTech = useCallback(
    (techId: string) => reviews.filter((review) => review.techId === techId),
    [reviews],
  );

  const techProfile = useMemo(() => {
    if (!user || user.role !== 'tecnico') return null;
    return (
      technicians.find((tech) => tech.userId === user.id) ??
      technicians.find((tech) => tech.id === user.techId) ??
      null
    );
  }, [technicians, user]);

  const createRequest = useCallback(
    async (input: CreateRequestInput) => {
      if (!user) throw new Error('Debes iniciar sesión para solicitar un técnico.');
      const request = await repo.createRequest(input, user);
      await refreshRequests();
      return request;
    },
    [user, refreshRequests],
  );

  const updateRequestStatus = useCallback(
    async (id: string, status: ServiceRequest['status'], note?: string) => {
      const updated = await repo.updateRequestStatus(id, status, note);
      setRequests((current) => current.map((req) => (req.id === id ? updated : req)));
      if (status === 'completada') {
        await loadPublic();
      }
      return updated;
    },
    [loadPublic],
  );

  const cancelRequest = useCallback(
    async (id: string, reason?: string) => {
      if (!user) throw new Error('Debes iniciar sesión.');
      const by = user.role === 'cliente' ? 'cliente' : user.role === 'tecnico' ? 'tecnico' : 'admin';
      const updated = await repo.cancelRequest(id, by, reason);
      setRequests((current) => current.map((req) => (req.id === id ? updated : req)));
      return updated;
    },
    [user],
  );

  const rateRequest = useCallback(
    async (id: string, rating: number, comment: string) => {
      if (!user) throw new Error('Debes iniciar sesión.');
      const updated = await repo.rateRequest(id, rating, comment, user.name);
      setRequests((current) => current.map((req) => (req.id === id ? updated : req)));
      await Promise.all([loadPublic(), refreshReviews()]);
      return updated;
    },
    [user, loadPublic, refreshReviews],
  );

  const updateTechnician = useCallback(
    async (id: string, patch: TechnicianPatch) => {
      const updated = await repo.updateTechnician(id, patch);
      setTechnicians((current) => {
        const exists = current.some((tech) => tech.id === id);
        if (!exists) return [...current, updated];
        return current.map((tech) => (tech.id === id ? updated : tech));
      });
      return updated;
    },
    [],
  );

  const updateSpecialty = useCallback(async (slug: string, patch: Partial<Specialty>) => {
    const updated = await repo.updateSpecialty(slug, patch);
    setSpecialties((current) => current.map((item) => (item.slug === slug ? updated : item)));
    return updated;
  }, []);

  const addSpecialty = useCallback(
    async (input: Omit<Specialty, 'active'> & { active?: boolean }) => {
      const created = await repo.addSpecialty(input);
      setSpecialties((current) => [...current, created]);
      return created;
    },
    [],
  );

  const updateUser = useCallback(
    async (id: string, patch: { status?: UserStatus; name?: string; phone?: string }) => {
      const updated = await repo.updateUser(id, patch);
      setUsers((current) => current.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    [],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      specialties,
      technicians,
      reviews,
      requests,
      users,
      loading,
      refreshing,
      error,
      techProfile,
      refreshAll,
      refreshRequests,
      refreshUsers,
      refreshReviews,
      technicianById,
      specialtyName,
      reviewsForTech,
      createRequest,
      updateRequestStatus,
      cancelRequest,
      rateRequest,
      updateTechnician,
      updateSpecialty,
      addSpecialty,
      updateUser,
    }),
    [
      specialties,
      technicians,
      reviews,
      requests,
      users,
      loading,
      refreshing,
      error,
      techProfile,
      refreshAll,
      refreshRequests,
      refreshUsers,
      refreshReviews,
      technicianById,
      specialtyName,
      reviewsForTech,
      createRequest,
      updateRequestStatus,
      cancelRequest,
      rateRequest,
      updateTechnician,
      updateSpecialty,
      addSpecialty,
      updateUser,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData debe usarse dentro de DataProvider');
  return context;
}
