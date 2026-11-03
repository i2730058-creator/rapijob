require('dotenv').config();
const express = require('express'), helmet = require('helmet'), rateLimit = require('express-rate-limit');
const multer = require('multer'), path = require('path'), crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno de Supabase (ver .env.example)'); process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATS = ['Electricidad', 'Plomería', 'Computación', 'Gasfitería', 'Reparaciones', 'Otras especialidades'];
const DIST = ['Huancayo', 'El Tambo', 'Chilca'];
const U = /^[0-9a-f-]{36}$/i;
const inArea = (la, ln) => la >= -12.3 && la <= -11.8 && ln >= -75.4 && ln <= -75.0;

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://maps.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ['https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com', 'https://*.ggpht.com'],
  connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.googleapis.com'],
  workerSrc: ['blob:'], frameSrc: ['https://*.google.com'] } } }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 400 }));
const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 });

const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (r, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)) });
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
async function upload(file, folder) {
  const p = `${folder}/${crypto.randomUUID()}.${EXT[file.mimetype]}`;
  const { error } = await db.storage.from('photos').upload(p, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  return db.storage.from('photos').getPublicUrl(p).data.publicUrl;
}

const auth = roles => async (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return res.status(401).json({ error: 'Inicia sesión para continuar' });
  const { data: { user }, error } = await db.auth.getUser(t);
  if (error || !user) return res.status(401).json({ error: 'Sesión inválida o vencida' });
  const { data: p } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!p || (roles && !roles.includes(p.role))) return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  req.user = { ...p, email: user.email }; next();
};
const A = auth(['admin']);

// DNI nunca se expone públicamente: solo los últimos 4 dígitos
const pub = ({ dni, user_id, ...r }) => ({ ...r, dni_masked: '****' + String(dni).slice(-4) });

function tech(b) {
  const e = [], s = (k, min, max) => { const v = String(b[k] ?? '').trim(); if (v.length < min || v.length > max) e.push(k); return v; };
  const o = { full_name: s('full_name', 3, 100), dni: s('dni', 8, 8), category: s('category', 1, 50), description: s('description', 10, 1000),
    price_info: s('price_info', 1, 200), phone: s('phone', 7, 15), whatsapp: s('whatsapp', 7, 15), address: s('address', 0, 200),
    schedule: s('schedule', 1, 200), district: s('district', 1, 20) };
  if (!/^\d{8}$/.test(o.dni)) e.push('dni');
  if (!/^\+?\d{7,15}$/.test(o.phone)) e.push('phone');
  if (!/^\+?\d{7,15}$/.test(o.whatsapp)) e.push('whatsapp');
  if (!CATS.includes(o.category)) e.push('category');
  if (!DIST.includes(o.district)) e.push('district');
  o.experience_years = parseInt(b.experience_years);
  if (!(o.experience_years >= 0 && o.experience_years <= 60)) e.push('experience_years');
  o.lat = parseFloat(b.lat); o.lng = parseFloat(b.lng);
  if (!inArea(o.lat, o.lng)) e.push('ubicación (debe estar en Huancayo, El Tambo o Chilca)');
  o.available = b.available === true || b.available === 'true' || b.available === 'on';
  return { o, e };
}
async function prep(q, s) {
  const { o, e } = tech(q.body);
  if (e.length) { s.status(400).json({ error: 'Revisa estos campos: ' + [...new Set(e)].join(', ') }); return null; }
  if (q.file) o.photo_url = await upload(q.file, 'technicians');
  return o;
}

app.get('/health', (q, s) => s.send('ok'));
app.get('/api/config', (q, s) => s.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, mapsKey: GOOGLE_MAPS_API_KEY || '', categories: CATS, districts: DIST }));
app.get('/api/me', auth(), (q, s) => s.json({ id: q.user.id, role: q.user.role, full_name: q.user.full_name, phone: q.user.phone, email: q.user.email }));

// ---------- Público ----------
app.get('/api/technicians', async (q, s) => {
  let x = db.from('technicians_public').select('*').eq('status', 'published');
  if (CATS.includes(q.query.category)) x = x.eq('category', q.query.category);
  if (DIST.includes(q.query.district)) x = x.eq('district', q.query.district);
  const t = String(q.query.q || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 50);
  if (t) x = x.or(`full_name.ilike.%${t}%,description.ilike.%${t}%,category.ilike.%${t}%`);
  const { data, error } = await x.order('rating_avg', { ascending: false });
  if (error) throw error;
  s.json(data.map(pub));
});
app.get('/api/technicians/:id', async (q, s) => {
  if (!U.test(q.params.id)) return s.status(404).json({ error: 'Técnico no encontrado' });
  const { data: t } = await db.from('technicians_public').select('*').eq('id', q.params.id).eq('status', 'published').maybeSingle();
  if (!t) return s.status(404).json({ error: 'Técnico no encontrado' });
  const { data: rv } = await db.from('reviews').select('rating,comment,created_at,client:client_id(full_name)').eq('technician_id', t.id).order('created_at', { ascending: false }).limit(50);
  s.json({ ...pub(t), reviews: (rv || []).map(r => ({ rating: r.rating, comment: r.comment, created_at: r.created_at, client: (r.client?.full_name || 'Cliente').split(' ')[0] })) });
});

// ---------- Solicitudes ----------
app.post('/api/requests', writeLimit, auth(['client']), up.array('photos', 4), async (q, s) => {
  const b = q.body, e = [];
  const description = String(b.description || '').trim();
  if (description.length < 10 || description.length > 1000) e.push('descripción (10-1000 caracteres)');
  if (!CATS.includes(b.category)) e.push('categoría');
  const lat = parseFloat(b.lat), lng = parseFloat(b.lng);
  if (!inArea(lat, lng)) e.push('ubicación en el mapa');
  if (e.length) return s.status(400).json({ error: 'Revisa: ' + e.join(', ') });
  let technician_id = null;
  if (b.technician_id) {
    const { data: t } = U.test(b.technician_id) ? await db.from('technicians').select('id').eq('id', b.technician_id).eq('status', 'published').maybeSingle() : {};
    if (!t) return s.status(400).json({ error: 'El técnico elegido no está disponible' });
    technician_id = t.id;
  }
  const photos = await Promise.all((q.files || []).map(f => upload(f, 'requests')));
  const { error } = await db.from('requests').insert({ client_id: q.user.id, technician_id, category: b.category, description,
    address: String(b.address || '').trim().slice(0, 200), lat, lng, photos });
  if (error) throw error;
  s.json({ ok: true });
});
app.get('/api/requests/mine', auth(['client', 'technician']), async (q, s) => {
  let x = db.from('requests').select('*, client:client_id(full_name,phone), tech:technician_id(full_name,phone,whatsapp), reviews(id)').order('created_at', { ascending: false }).limit(100);
  if (q.user.role === 'client') x = x.eq('client_id', q.user.id);
  else {
    const { data: t } = await db.from('technicians').select('id,category').eq('user_id', q.user.id).maybeSingle();
    if (!t) return s.json([]);
    x = x.or(`technician_id.eq.${t.id},and(technician_id.is.null,category.eq.${t.category},status.eq.pending)`);
  }
  const { data, error } = await x; if (error) throw error;
  s.json(data.map(({ reviews, ...r }) => {
    if (q.user.role === 'technician' && !['accepted', 'completed'].includes(r.status) && r.client) r.client = { full_name: r.client.full_name };
    return { ...r, reviewed: Array.isArray(reviews) ? reviews.length > 0 : !!reviews };
  }));
});
const FLOW = { technician: { pending: ['accepted', 'rejected'], accepted: ['completed'] }, client: { pending: ['cancelled'], accepted: ['cancelled'] } };
app.patch('/api/requests/:id/status', writeLimit, auth(['client', 'technician', 'admin']), async (q, s) => {
  const st = q.body.status, role = q.user.role;
  if (!U.test(q.params.id)) return s.status(404).json({ error: 'Solicitud no encontrada' });
  const { data: r } = await db.from('requests').select('*').eq('id', q.params.id).maybeSingle();
  if (!r) return s.status(404).json({ error: 'Solicitud no encontrada' });
  let mine = null;
  if (role === 'client' && r.client_id !== q.user.id) return s.status(403).json({ error: 'No es tu solicitud' });
  if (role === 'technician') {
    mine = (await db.from('technicians').select('id,category').eq('user_id', q.user.id).maybeSingle()).data;
    const ok = mine && (r.technician_id === mine.id || (!r.technician_id && r.category === mine.category));
    if (!ok) return s.status(403).json({ error: 'No es tu solicitud' });
    if (!r.technician_id && st !== 'accepted') return s.status(400).json({ error: 'Solo puedes aceptar solicitudes abiertas' });
  }
  const allowed = role === 'admin' ? ['pending', 'accepted', 'rejected', 'completed', 'cancelled'] : (FLOW[role][r.status] || []);
  if (!allowed.includes(st)) return s.status(400).json({ error: 'Cambio de estado no permitido' });
  const patch = { status: st };
  if (st === 'accepted' && mine && !r.technician_id) patch.technician_id = mine.id;
  if (st === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await db.from('requests').update(patch).eq('id', r.id); if (error) throw error;
  s.json({ ok: true });
});

// ---------- Calificaciones (solo tras servicio completado) ----------
app.post('/api/reviews', writeLimit, auth(['client']), async (q, s) => {
  const rating = parseInt(q.body.rating), comment = String(q.body.comment || '').trim().slice(0, 500);
  if (!(rating >= 1 && rating <= 5)) return s.status(400).json({ error: 'La calificación debe ser de 1 a 5' });
  const { data: r } = U.test(String(q.body.request_id)) ? await db.from('requests').select('*').eq('id', q.body.request_id).eq('client_id', q.user.id).maybeSingle() : {};
  if (!r || r.status !== 'completed' || !r.technician_id) return s.status(400).json({ error: 'Solo puedes calificar servicios completados' });
  const { error } = await db.from('reviews').insert({ request_id: r.id, client_id: q.user.id, technician_id: r.technician_id, rating, comment });
  if (error) return s.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Ya calificaste este servicio' : 'No se pudo guardar' });
  s.json({ ok: true });
});

// ---------- Panel del técnico ----------
app.get('/api/technician/profile', auth(['technician']), async (q, s) => {
  const { data } = await db.from('technicians').select('*').eq('user_id', q.user.id).maybeSingle();
  s.json(data);
});
app.put('/api/technician/profile', writeLimit, auth(['technician']), up.single('photo'), async (q, s) => {
  const o = await prep(q, s); if (!o) return;
  const ex = (await db.from('technicians').select('id').eq('user_id', q.user.id).maybeSingle()).data;
  const r = ex ? await db.from('technicians').update(o).eq('id', ex.id) : await db.from('technicians').insert({ ...o, user_id: q.user.id, status: 'published' });
  if (r.error) throw r.error;
  s.json({ ok: true });
});

// ---------- Administrador ----------
app.get('/api/admin/technicians', A, async (q, s) => {
  const { data, error } = await db.from('technicians_public').select('*').order('created_at', { ascending: false }); if (error) throw error; s.json(data);
});
app.post('/api/admin/technicians', writeLimit, A, up.single('photo'), async (q, s) => {
  const o = await prep(q, s); if (!o) return;
  o.status = q.body.status === 'inactive' ? 'inactive' : 'published';
  const { error } = await db.from('technicians').insert(o); if (error) throw error; s.json({ ok: true });
});
app.put('/api/admin/technicians/:id', writeLimit, A, up.single('photo'), async (q, s) => {
  if (!U.test(q.params.id)) return s.status(404).json({ error: 'No encontrado' });
  const o = await prep(q, s); if (!o) return;
  if (['published', 'inactive'].includes(q.body.status)) o.status = q.body.status;
  const { error } = await db.from('technicians').update(o).eq('id', q.params.id); if (error) throw error; s.json({ ok: true });
});
app.patch('/api/admin/technicians/:id/status', A, async (q, s) => {
  if (!U.test(q.params.id) || !['published', 'inactive'].includes(q.body.status)) return s.status(400).json({ error: 'Datos inválidos' });
  const { error } = await db.from('technicians').update({ status: q.body.status }).eq('id', q.params.id); if (error) throw error; s.json({ ok: true });
});
app.delete('/api/admin/technicians/:id', A, async (q, s) => {
  if (!U.test(q.params.id)) return s.status(404).json({ error: 'No encontrado' });
  const { error } = await db.from('technicians').delete().eq('id', q.params.id); if (error) throw error; s.json({ ok: true });
});
app.get('/api/admin/requests', A, async (q, s) => {
  const { data, error } = await db.from('requests').select('*, client:client_id(full_name,phone), tech:technician_id(full_name)').order('created_at', { ascending: false }).limit(200);
  if (error) throw error; s.json(data);
});

app.use('/api', (q, s) => s.status(404).json({ error: 'Ruta no encontrada' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use((err, q, s, n) => {
  console.error(err);
  if (err instanceof multer.MulterError) return s.status(400).json({ error: 'Fotos: máximo 4 imágenes JPG/PNG/WEBP de 5 MB' });
  s.status(500).json({ error: 'Error del servidor. Intenta nuevamente.' });
});
app.listen(process.env.PORT || 3000, () => console.log('RapiJob activo'));
