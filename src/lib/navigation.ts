import type { Role } from '@/types';

export function panelPath(role: Role | undefined): string {
  if (role === 'tecnico') return '/panel-tecnico';
  if (role === 'admin') return '/admin';
  return '/panel';
}

export function panelLabel(role: Role | undefined): string {
  if (role === 'tecnico') return 'Panel técnico';
  if (role === 'admin') return 'Administración';
  return 'Mi panel';
}

export function roleLabel(role: Role | undefined): string {
  if (role === 'tecnico') return 'Técnico';
  if (role === 'admin') return 'Administrador';
  return 'Cliente';
}
