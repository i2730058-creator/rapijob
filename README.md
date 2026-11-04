# RapiJob

**Técnicos confiables, soluciones rápidas.**

RapiJob es una plataforma web que conecta a clientes con técnicos profesionales cercanos en **Huancayo, El Tambo y Chilca**. Incluye mapa interactivo, búsqueda con filtros, solicitud de servicio en pasos, paneles por rol y backend opcional con Supabase.

> **Funciona de inmediato en modo demo**, sin configurar nada: datos de ejemplo, persistencia en `localStorage` y avance automático de las solicitudes.

---

## Índice

- [Demostración rápida](#demostración-rápida)
- [Cuentas demo](#cuentas-demo)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Modo demo](#modo-demo)
- [Conectar Supabase](#conectar-supabase)
- [Google Maps](#google-maps)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Scripts disponibles](#scripts-disponibles)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Solución de problemas](#solución-de-problemas)
- [Roadmap](#roadmap)

---

## Demostración rápida

```bash
cd rapijob-web
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`). No necesitas backend ni claves para probar todos los flujos.

También puedes generar la versión de producción:

```bash
npm run build
npm run preview
```

---

## Cuentas demo

Todas usan la contraseña **`demo1234`**.

| Rol | Correo | Acceso |
| --- | --- | --- |
| Cliente | `cliente@rapijob.pe` | Mis solicitudes, seguimiento, calificaciones y perfil |
| Técnico | `tecnico@rapijob.pe` | Disponibilidad, solicitudes asignadas, reseñas y perfil |
| Administrador | `admin@rapijob.pe` | Usuarios, técnicos, categorías, solicitudes y reportes |

En modo demo también existen otras cuentas de clientes y técnicos con datos realistas. Puedes registrarte con cualquier correo: la cuenta queda guardada en el navegador.

---

## Funcionalidades

### Sitio público

- **Inicio** con hero, servicios, técnicos destacados, opiniones y beneficios.
- **Búsqueda de técnicos** con filtros por especialidad, disponibilidad y distancia, orden por cercanía o calificación.
- **Mapa interactivo** con marcadores de técnicos, cobertura de los tres distritos, selección de punto y geolocalización del navegador.
- **Perfil de técnico** con foto, especialidad, experiencia, precio referencial, calificación, reseñas, horario, mapa, distancia, botón de WhatsApp y solicitud directa.
- **Diseño responsive** con identidad visual azul oscuro, azul eléctrico, amarillo y blanco.

### Solicitud de servicio (5 pasos)

1. **Servicio** requerido.
2. **Descripción** del problema y fotos de referencia.
3. **Ubicación** en mapa, dirección, referencia y distrito.
4. **Fecha y hora** del servicio.
5. **Técnico** disponible cercano y confirmación con resumen y número de comprobante.

Al confirmar se crea la solicitud con estado **pendiente**. En modo demo avanza automáticamente cada **18 segundos**: `pendiente → aceptada → en camino → en servicio → completada`. El cliente puede cancelar mientras esté activa y calificar al finalizar.

### Panel del cliente

- Resumen con métricas y solicitudes activas.
- Historial completo, línea de tiempo por estado y detalle de cada servicio.
- Cancelación con motivo, calificación con estrellas y comentario.
- Edición de datos personales.

### Panel del técnico

- Interruptor de **disponibilidad**.
- Bandeja de solicitudes asignadas y cambio de estado.
- Ingresos estimados, trabajos completados y calificación promedio.
- Reseñas recibidas y edición del perfil profesional (bio, precios, horario, cobertura).
- Acceso directo a su perfil público.

### Panel de administración

- Métricas generales de la plataforma.
- **Usuarios:** búsqueda, activación y suspensión de cuentas.
- **Técnicos:** aprobación, verificación, disponibilidad y edición.
- **Categorías:** alta, edición, activación y precio base.
- **Solicitudes:** seguimiento global y cambio de estado.
- **Reportes:** exportación CSV de solicitudes, técnicos y usuarios.
- **Reseñas:** moderación del contenido.

### Autenticación

- Registro como cliente o técnico con validaciones.
- Inicio de sesión, cierre de sesión y recuperación de contraseña.
- Rutas protegidas por rol.
- Sesión persistente.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Estilos | Tailwind CSS 3 |
| Rutas | React Router 7 |
| Iconos | Lucide React |
| Mapas | Google Maps JS API (opcional) / Leaflet + OpenStreetMap (fallback) |
| Backend | Supabase (PostgreSQL + Auth + RLS) — opcional |
| Persistencia demo | `localStorage` |

---

## Requisitos

- **Node.js 20 o superior** (probado con Node 26) y npm.
- Navegador moderno.
- Conexión a internet para mapas, geocodificación y fuentes (el resto funciona offline).

---

## Instalación y ejecución

```bash
# 1. Entra al proyecto
cd rapijob-web

# 2. Instala dependencias
npm install

# 3. (Opcional) crea tu archivo de entorno
#    Windows: copy .env.example .env
#    macOS/Linux: cp .env.example .env

# 4. Inicia el servidor de desarrollo
npm run dev
```

La app arranca en **modo demo** si no defines variables de Supabase.

---

## Variables de entorno

Copia `.env.example` como `.env` y completa solo lo que necesites:

```env
# Supabase (opcional)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Google Maps (opcional)
VITE_GOOGLE_MAPS_API_KEY=

# Centro inicial del mapa (opcional)
VITE_DEFAULT_LAT=-12.0651
VITE_DEFAULT_LNG=-75.2049
```

> Vite solo expone variables con prefijo `VITE_`. **Nunca** coloques la `service_role` key de Supabase en el frontend; usa únicamente la `anon`/publishable key.

---

## Modo demo

El modo demo se activa automáticamente cuando faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`.

- Guarda usuarios, técnicos, solicitudes y reseñas en `localStorage`.
- Siembra 13 técnicos, 5 usuarios, 6 solicitudes, reseñas y 12 categorías.
- Simula el avance de las solicitudes creadas en la sesión cada 18 segundos.
- Permite probar los tres paneles sin ningún servicio externo.

**Reiniciar los datos demo:** abre la consola del navegador y ejecuta:

```js
localStorage.removeItem('rapijob:db:v1');
localStorage.removeItem('rapijob:session:v1');
localStorage.removeItem('rapijob:sim:v1');
location.reload();
```

---

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor**, pega el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y ejecútalo. Crea tablas, índices, triggers, políticas RLS, Realtime y las 12 categorías.
3. En **Project Settings → API**, copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` / publishable key → `VITE_SUPABASE_ANON_KEY`
4. Para demos, desactiva **Authentication → Providers → Email → Confirm email** (así el registro inicia sesión al instante).
5. Crea el administrador:
   - Registra una cuenta desde la app o en **Authentication → Users**.
   - En SQL Editor ejecuta:
     ```sql
     update public.profiles
     set role = 'admin'
     where email = 'tu-correo@dominio.com';
     ```
6. Reinicia el servidor (`npm run dev`). La app detectará Supabase y usará el backend real.

### Modelo de datos

| Tabla | Contenido |
| --- | --- |
| `profiles` | Usuarios (cliente, técnico, admin), estado y ciudad |
| `specialties` | Catálogo de 12 categorías con precio base |
| `technicians` | Perfil profesional, ubicación, precios, rating y verificación |
| `service_requests` | Solicitudes con historial JSONB, estado, fotos y calificación |
| `reviews` | Reseñas vinculadas a técnicos y solicitudes |

La seguridad se aplica con **Row Level Security**: cada cliente ve sus solicitudes, cada técnico las suyas y el administrador todo. Los usuarios no pueden cambiar su propio rol ni estado.

---

## Google Maps

- **Sin clave:** se usa **Leaflet + OpenStreetMap** automáticamente. Los mapas, marcadores, geolocalización y geocodificación (Nominatim) siguen funcionando.
- **Con clave:** define `VITE_GOOGLE_MAPS_API_KEY` y la app cargará el SDK de Google Maps para mapas y geocodificación.

Recomendaciones para la clave:

1. Habilita **Maps JavaScript API** y **Geocoding API** en Google Cloud Console.
2. Restringe la clave por **HTTP referrers** a tus dominios (`localhost:5173`, tu dominio de producción).
3. Configura límites de cuota y alertas de facturación.

---

## Despliegue

El proyecto genera archivos estáticos en `dist/` y puede desplegarse en cualquier hosting.

### Vercel

1. Importa el repositorio.
2. **Root Directory:** `rapijob-web`.
3. **Framework Preset:** Vite.
4. **Build Command:** `npm run build` · **Output Directory:** `dist`.
5. Agrega las variables de entorno y despliega.

### Netlify

1. **Base directory:** `rapijob-web`.
2. **Build command:** `npm run build`.
3. **Publish directory:** `rapijob-web/dist`.
4. Agrega las variables de entorno.

Como la app usa rutas del lado del cliente, configura la redirección de SPA:

- **Netlify:** crea `public/_redirects` con `/* /index.html 200`.
- **Vercel:** Vercel ya maneja el fallback de SPA en proyectos Vite.

### Build local

```bash
npm run build
npm run preview
```

---

## Estructura del proyecto

```
rapijob-web/
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ components/          # UI reutilizable (Header, MapView, TechCard, panel, etc.)
│  ├─ context/             # AuthContext, DataContext, ToastContext
│  ├─ lib/
│  │  ├─ constants.ts      # Distritos, estados, cuentas demo
│  │  ├─ demoRepo.ts       # Persistencia localStorage + simulación
│  │  ├─ seed.ts           # Datos demo
│  │  ├─ supabase.ts       # Cliente Supabase
│  │  ├─ supabaseRepo.ts   # Implementación del repositorio Supabase
│  │  ├─ repo.ts           # Contrato común y selección de backend
│  │  ├─ maps.ts           # Google Maps / OpenStreetMap
│  │  └─ utils.ts          # Helpers (distancias, formato, folios)
│  ├─ pages/               # Home, Search, TechnicianDetail, RequestService, paneles...
│  ├─ App.tsx              # Rutas y providers
│  ├─ main.tsx
│  └─ index.css
├─ supabase/
│  └─ schema.sql           # Esquema completo, RLS, triggers y seed
├─ .env.example
├─ package.json
└─ vite.config.ts
```

---

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Verificación TypeScript + build de producción |
| `npm run preview` | Sirve el build de producción |
| `npm run typecheck` | Solo verificación de tipos |

---

## Seguridad y privacidad

- RLS activo en todas las tablas de Supabase.
- Políticas por rol: cliente, técnico y administrador.
- Trigger que impide la escalada de rol/estado desde el cliente.
- Validación de formularios y mensajes de error en español.
- Datos de contacto visibles solo para las partes involucradas en una solicitud.
- No se almacenan tarjetas ni pagos: el precio es referencial y se coordina con el técnico.

---

## Solución de problemas

| Problema | Solución |
| --- | --- |
| El mapa aparece gris | Revisa la conexión; los tiles de OpenStreetMap requieren internet. Verifica también la clave de Google Maps. |
| No se ven técnicos | Reinicia los datos demo o revisa que estén aprobados en el panel admin. |
| Supabase no se activa | Define **ambas** variables y reinicia el servidor de Vite. |
| Error de correo no confirmado | Desactiva *Confirm email* en Supabase para demos, o confirma el correo. |
| La sesión no persiste | No bloquees `localStorage` (modo demo) ni cookies de terceros (Supabase). |
| El registro Supabase falla al crear técnico | Verifica que ejecutaste `supabase/schema.sql` y que el trigger `handle_new_user` existe. |

---

## Roadmap

- Notificaciones push y correo transaccional.
- Chat cliente–técnico dentro de la plataforma.
- Pagos y adelantos con pasarela local.
- Verificación de identidad y antecedentes de técnicos.
- Suscripciones en tiempo real con Supabase Realtime.
- Expansión a nuevas ciudades del Perú.

---

Hecho con dedicación para conectar talento técnico local con quienes lo necesitan.  
**RapiJob — Técnicos cerca de ti.**
