# RapiJob — Técnicos confiables, soluciones rápidas

Node.js + Express (backend seguro) · Supabase (BD, auth, fotos) · Google Maps · listo para Render.
La plataforma inicia **vacía**: no hay datos ficticios.

## 1. Supabase
1. Crea un proyecto en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/schema.sql` (tablas, vista, trigger, seguridad y bucket `photos`).
3. Settings → API: copia `Project URL`, `anon key` y `service_role key`.
4. Authentication → URL Configuration: pon la URL de Render en *Site URL*.
   (Opcional en pruebas: Authentication → Providers → Email → desactiva "Confirm email".)

## 2. Google Maps
Google Cloud → habilita **Maps JavaScript API**, crea una API key y restríngela por HTTP referrer
(`https://TU-APP.onrender.com/*` y `http://localhost:3000/*`). Requiere facturación activa en Google Cloud.

## 3. Probar en local
```
cp .env.example .env   # completa los valores
npm install && npm start   # http://localhost:3000
```

## 4. Crear tu cuenta de administrador
1. En la web: **Registrarse** con tu correo (como cliente).
2. En Supabase → SQL Editor:
```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'TU_CORREO');
```
3. Cierra sesión, vuelve a ingresar: aparecerá **Administración** en el menú (el rol admin no puede asignarse desde el registro).

## 5. Publicar en Render
1. Sube esta carpeta a un repositorio de GitHub (el `.env` NO se sube).
2. Render → New → **Blueprint** → elige el repo (usa `render.yaml`), o New → Web Service con
   Build `npm install` y Start `npm start`.
3. Carga las variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`.
4. Deploy. Health check: `/health`.

## Reglas implementadas
- Roles: cliente, técnico, administrador (verificados en el servidor con el token de Supabase).
- Solo el cliente dueño de una solicitud **completada** puede calificar (una vez por servicio).
- Técnicos (autorregistrados o creados por el admin) se publican y aparecen en la web y el mapa; el admin puede editar, desactivar o eliminar.
- El DNI solo lo ven el técnico y el admin; públicamente se muestra enmascarado. El teléfono del cliente se revela al técnico solo tras aceptar.
- Validación en servidor, límites de tasa, Helmet/CSP, fotos JPG/PNG/WEBP ≤ 5 MB, ubicaciones limitadas a la zona de Huancayo.
