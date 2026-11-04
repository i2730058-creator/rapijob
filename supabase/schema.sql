-- =====================================================================
-- RapiJob · Esquema de base de datos para Supabase (PostgreSQL)
-- ---------------------------------------------------------------------
-- Ejecuta este archivo completo en: Supabase Dashboard → SQL Editor.
-- Es idempotente: puedes volver a ejecutarlo sin perder datos.
--
-- Contenido:
--   1. Extensiones y tablas
--   2. Funciones auxiliares y triggers
--   3. Índices
--   4. Row Level Security (RLS) y políticas
--   5. Realtime
--   6. Seed de las 12 categorías
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONES Y TABLAS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Perfiles: extiende auth.users con los datos públicos de la plataforma.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  phone       text not null default '',
  role        text not null default 'cliente'
              check (role in ('cliente', 'tecnico', 'admin')),
  status      text not null default 'activo'
              check (status in ('activo', 'suspendido')),
  city        text not null default 'Huancayo',
  created_at  timestamptz not null default now()
);

-- Categorías / especialidades del catálogo.
create table if not exists public.specialties (
  slug         text primary key,
  name         text not null,
  description  text not null default '',
  base_price   numeric(10, 2) not null default 50,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Perfil profesional de cada técnico (1:1 con profiles).
create table if not exists public.technicians (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references public.profiles (id) on delete cascade,
  name             text not null default '',
  specialty        text not null default 'otros',
  specialties      text[] not null default '{}',
  headline         text not null default '',
  bio              text not null default '',
  experience_years integer not null default 0 check (experience_years >= 0),
  price_from       numeric(10, 2) not null default 0,
  rating           numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count     integer not null default 0,
  jobs_done        integer not null default 0,
  available        boolean not null default false,
  verified         boolean not null default false,
  approved         boolean not null default false,
  district         text not null default 'Huancayo',
  address          text not null default '',
  lat              double precision not null default -12.0651,
  lng              double precision not null default -75.2049,
  whatsapp         text not null default '',
  schedule         text not null default 'Lun a Sáb · 8:00 a 18:00',
  gallery          text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- Solicitudes de servicio.
create table if not exists public.service_requests (
  id             uuid primary key default gen_random_uuid(),
  folio          text not null unique,
  client_id      uuid not null references public.profiles (id) on delete cascade,
  client_name    text not null default '',
  client_phone   text not null default '',
  tech_id        uuid not null references public.technicians (id) on delete restrict,
  tech_name      text not null default '',
  specialty      text not null default '',
  description    text not null,
  photos         text[] not null default '{}',
  address        text not null default '',
  reference      text not null default '',
  district       text not null default 'Huancayo',
  lat            double precision not null default 0,
  lng            double precision not null default 0,
  date           date,
  time           text not null default '',
  status         text not null default 'pendiente'
                 check (status in ('pendiente', 'aceptada', 'en_camino',
                                   'en_servicio', 'completada', 'cancelada')),
  price          numeric(10, 2) not null default 0,
  history        jsonb not null default '[]'::jsonb,
  rating         integer check (rating between 1 and 5),
  review_comment text,
  tech_note      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Reseñas de los servicios completados.
create table if not exists public.reviews (
  id          text primary key,
  tech_id     uuid not null references public.technicians (id) on delete cascade,
  request_id  uuid references public.service_requests (id) on delete set null,
  client_name text not null default '',
  rating      integer not null check (rating between 1 and 5),
  comment     text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES Y TRIGGERS
-- ---------------------------------------------------------------------

-- ¿El usuario autenticado es administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Id del perfil de técnico del usuario autenticado (o null).
create or replace function public.current_tech_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.technicians where user_id = auth.uid();
$$;

-- Crea el perfil automáticamente al registrarse en Supabase Auth.
-- El perfil profesional del técnico lo crea la aplicación tras el registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' in ('cliente', 'tecnico')
      then new.raw_user_meta_data ->> 'role'
    else 'cliente'
  end;

  insert into public.profiles (id, name, email, phone, role, status, city)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    v_role,
    'activo',
    coalesce(nullif(new.raw_user_meta_data ->> 'city', ''), 'Huancayo')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario cambie su propio rol o estado por API.
-- (El editor SQL y los administradores sí pueden hacerlo).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Mantiene updated_at al día en las solicitudes.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists service_requests_touch_updated_at on public.service_requests;
create trigger service_requests_touch_updated_at
  before update on public.service_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. ÍNDICES
-- ---------------------------------------------------------------------
create index if not exists technicians_approved_idx
  on public.technicians (approved, available, district);
create index if not exists technicians_specialty_idx
  on public.technicians (specialty);
create index if not exists technicians_rating_idx
  on public.technicians (rating desc);
create index if not exists service_requests_client_idx
  on public.service_requests (client_id, created_at desc);
create index if not exists service_requests_tech_idx
  on public.service_requests (tech_id, created_at desc);
create index if not exists service_requests_status_idx
  on public.service_requests (status);
create index if not exists reviews_tech_idx
  on public.reviews (tech_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.specialties      enable row level security;
alter table public.technicians      enable row level security;
alter table public.service_requests enable row level security;
alter table public.reviews          enable row level security;

-- ---- profiles -------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.is_admin());

-- ---- specialties ----------------------------------------------------
drop policy if exists "specialties_select_public" on public.specialties;
create policy "specialties_select_public"
  on public.specialties for select
  using (active = true or public.is_admin());

drop policy if exists "specialties_write_admin" on public.specialties;
create policy "specialties_write_admin"
  on public.specialties for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- technicians ----------------------------------------------------
drop policy if exists "technicians_select_public" on public.technicians;
create policy "technicians_select_public"
  on public.technicians for select
  using (approved = true or user_id = auth.uid() or public.is_admin());

drop policy if exists "technicians_insert_own" on public.technicians;
create policy "technicians_insert_own"
  on public.technicians for insert
  with check (user_id = auth.uid());

drop policy if exists "technicians_update_own_or_admin" on public.technicians;
create policy "technicians_update_own_or_admin"
  on public.technicians for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "technicians_delete_admin" on public.technicians;
create policy "technicians_delete_admin"
  on public.technicians for delete
  using (public.is_admin());

-- ---- service_requests ----------------------------------------------
drop policy if exists "requests_select_involved" on public.service_requests;
create policy "requests_select_involved"
  on public.service_requests for select
  using (
    client_id = auth.uid()
    or tech_id = public.current_tech_id()
    or public.is_admin()
  );

drop policy if exists "requests_insert_client" on public.service_requests;
create policy "requests_insert_client"
  on public.service_requests for insert
  with check (client_id = auth.uid());

drop policy if exists "requests_update_involved" on public.service_requests;
create policy "requests_update_involved"
  on public.service_requests for update
  using (
    client_id = auth.uid()
    or tech_id = public.current_tech_id()
    or public.is_admin()
  )
  with check (
    client_id = auth.uid()
    or tech_id = public.current_tech_id()
    or public.is_admin()
  );

drop policy if exists "requests_delete_admin" on public.service_requests;
create policy "requests_delete_admin"
  on public.service_requests for delete
  using (public.is_admin());

-- ---- reviews --------------------------------------------------------
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

drop policy if exists "reviews_insert_authenticated" on public.reviews;
create policy "reviews_insert_authenticated"
  on public.reviews for insert
  with check (auth.uid() is not null);

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin"
  on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin"
  on public.reviews for delete
  using (public.is_admin());

-- Permisos base para los roles de Supabase.
grant usage on schema public to anon, authenticated;
grant select on public.specialties, public.technicians, public.reviews to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.service_requests to authenticated;
grant insert on public.reviews to authenticated;
grant insert, update, delete on public.technicians to authenticated;
grant insert, update, delete on public.specialties to authenticated;

-- ---------------------------------------------------------------------
-- 5. REALTIME (opcional, para futuras suscripciones en vivo)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.service_requests;
exception
  when duplicate_object then null;
  when others then null;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. SEED · 12 CATEGORÍAS
-- ---------------------------------------------------------------------
insert into public.specialties (slug, name, description, base_price)
values
  ('electricista',  'Electricistas',              'Instalaciones, cortocircuitos, tableros y tomacorrientes.',       60),
  ('plomero',       'Plomeros',                   'Fugas de agua, tuberías, grifos y desagües.',                      55),
  ('gasfitero',     'Gasfiteros',                 'Conexiones de gas, termas y calentadores de agua.',                65),
  ('computadoras',  'Técnicos de computadoras',   'Mantenimiento, reparación, software y redes.',                     50),
  ('celulares',     'Técnicos de celulares',      'Pantallas, baterías, software y recuperación de datos.',           45),
  ('instalador',    'Instaladores',               'Cámaras, antenas, televisores y equipos de seguridad.',            80),
  ('hogar',         'Reparaciones del hogar',     'Muebles, puertas, cerraduras y arreglos generales.',               50),
  ('refrigeracion', 'Técnicos de refrigeración',  'Refrigeradoras, congeladoras y aire acondicionado.',               90),
  ('pintor',        'Pintores',                   'Pintura de interiores, fachadas y acabados.',                      70),
  ('carpintero',    'Carpinteros',                'Muebles a medida, closets, puertas y reparaciones.',               85),
  ('mecanico',      'Mecánicos',                  'Mantenimiento y reparación de autos y motos.',                     80),
  ('otros',         'Otros servicios técnicos',   'Cerrajería, soldadura y servicios especializados.',                45)
on conflict (slug) do nothing;

-- =====================================================================
-- DESPUÉS DE EJECUTAR:
-- 1. Crea tu usuario administrador en Authentication → Users.
-- 2. Convierte su perfil en admin (SQL Editor):
--      update public.profiles set role = 'admin' where email = 'tu-correo@dominio.com';
-- 3. Para demos, desactiva "Confirm email" en Authentication → Providers → Email.
-- 4. Copia la URL del proyecto y la anon/publishable key en tu .env.
-- =====================================================================
