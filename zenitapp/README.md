# Eventos Zenit — App Móvil

Monorepo con el backend (FastAPI) y la app móvil (Expo / React Native) de Eventos Zenit.

```
zenitEventosApp/
├── backend/     API REST + WebSockets (FastAPI)
├── frontend/    App móvil multiplataforma (Expo Router)
└── landing/     Landing page pública de marketing (HTML/CSS/JS estático)
```

## 1. Backend (FastAPI)

### Arrancar en local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
cp .env.example .env          # y completar SECRET_KEY, etc.
pip install -r requirements.txt
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000`, con docs interactivas en `http://localhost:8000/docs`.

Al arrancar, si no existe ningún usuario admin, se crea automáticamente uno con
los datos de `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` del `.env`.

### Base de datos

Por defecto usa **SQLite** (`zenit.db`, cero configuración) — ideal para arrancar
rápido en el VPS de Hostinger. Si más adelante se necesita Postgres, alcanza con
cambiar `DATABASE_URL` en `.env` (el compose ya trae comentado un servicio de
Postgres) y reinstalar dependencias — el código no cambia porque SQLAlchemy
abstrae el dialecto.

### Despliegue en VPS de Hostinger

```bash
cd backend
docker compose up -d --build
```

Eso deja la API escuchando en el puerto 8000 del VPS. Delante, en el mismo VPS,
se recomienda un Nginx como reverse proxy con certificado TLS (Let's Encrypt)
que:
- redirija `https://api.tudominio.com/` → `http://127.0.0.1:8000/`
- soporte upgrade de conexión para `/ws` (WebSocket)

Ejemplo mínimo de bloque Nginx para el WebSocket:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Notas de diseño del backend

- **Roles**: viven como un enum en `User.role` (`cliente` / `admin` / `empleado`)
  en vez de una tabla de permisos aparte — con 3 roles fijos, una tabla de Roles
  dinámica sería sobre-ingeniería para el alcance actual.
- **WebSockets sin FCM**: un único canal `/ws?token=<jwt>` multiplexa chat y
  notificaciones in-app (`ConnectionManager` en `app/ws/manager.py`). El estado
  vive en memoria del proceso, por lo que en producción conviene correr con
  **un solo worker** (ver `gunicorn_conf.py`) — para el volumen esperado de
  Zenit alcanza sobradamente; si más adelante hace falta escalar horizontalmente,
  se reemplaza por Redis pub/sub sin tocar el resto del código.
- **Esquema de datos**: `Service` funciona a la vez como catálogo público y
  como inventario (`stock_total`), evitando duplicar el concepto.
  `QuoteRequest` → al aprobarse genera automáticamente un `Event`.
  `EquipmentChecklist` registra condición antes/después por equipo y evento.

## 2. Frontend (Expo / React Native)

### Arrancar en local

```bash
cd frontend
npm install
npx expo start
```

Antes de correr en un dispositivo físico, actualizar `app.json → expo.extra.apiUrl`
y `wsUrl` con la IP/dominio real del backend (no sirve `localhost` desde un
celular en otra red).

### Estructura (Expo Router, basado en archivos)

```
app/
├── _layout.tsx           Providers globales (Auth, SafeArea)
├── index.tsx              Redirección según sesión/rol
├── (auth)/                 Login y registro (público)
├── (client)/                Tabs del cliente: Catálogo, Mis Eventos, Chat, Perfil
│   └── event/[id].tsx        Detalle de evento + línea de tiempo + reseña
└── (admin)/                 Tabs de admin/empleado: Resumen, Solicitudes,
    │                         Operación, Servicios, Chats
    ├── event/[id].tsx         Detalle operativo: personal, checklist de equipos
    └── chat/[conversationId].tsx  Hilo de chat con un cliente

components/ui/     Button, TextField, Badge, ScreenContainer (design system liviano)
context/            AuthContext (JWT access/refresh, persistidos con expo-secure-store)
services/           api.ts (fetch + refresh automático), auth.ts, storage.ts
hooks/              useZenitSocket (conexión WS con reconexión automática)
constants/theme.ts  Paleta, spacing, tipografía
```

### Notas de diseño del frontend

- El login es único para todos los roles: el backend devuelve el rol en el
  token y `app/index.tsx` redirige automáticamente a `(client)` o `(admin)`
  — evita que alguien "elija" un rol que no le corresponde.
- La paleta (`constants/theme.ts`) ya está tomada del logo real de Zenit:
  fondo negro, blanco y dorado/ámbar (el estallido del logo). Falta agregar
  los assets de ícono/splash reales: `app.json` no referencia
  `assets/icon.png` todavía porque el logo se compartió como imagen en el
  chat, no como archivo — exportarlo en PNG (mínimo 1024×1024 para el ícono)
  y colocarlo en `frontend/assets/` (`icon.png`, y opcionalmente
  `adaptiveIcon.foregroundImage` para Android) antes de armar un build nativo.

## 3. Landing page (marketing público)

Sitio estático (sin build step) en `landing/`, pensado para servirse como página
principal del dominio de Zenit — la app (Expo) queda en un subdominio aparte
(p. ej. `app.eventoszenit.com`).

### Arrancar en local

```bash
cd landing
python -m http.server 5501   # o: npx serve . -l 5501
```

Abrir `http://localhost:5501`. Necesita el backend corriendo en `http://localhost:8000`
para que funcione el formulario de contacto (agregar el puerto que uses a
`CORS_ORIGINS` en `backend/.env`, igual que ya se hizo para `5501`).

### Estructura

```
landing/
├── index.html    Header, hero, servicios, quiénes somos, galería,
│                  testimonios, banda de CTA, contacto, footer
├── css/styles.css
└── js/main.js     Menú mobile, scroll-reveal, lightbox de galería,
                    envío del formulario de contacto, links de login/registro
```

### Decisiones de diseño

- **Login / registro no se reimplementan acá**: los botones del header y del
  footer apuntan directo a la app ya existente (`js/main.js → CONFIG.APP_URL`),
  reusando el flujo de auth ya probado — incluye que el admin **no se registra**
  desde la web, solo inicia sesión con las credenciales que ya tiene. Antes de
  desplegar a producción, cambiar `CONFIG.APP_URL` / `CONFIG.API_URL` en
  `js/main.js` por los dominios reales.
- **Formulario de contacto real**: pega contra `POST /api/contact` (nuevo
  endpoint en el backend), que guarda el mensaje y dispara una notificación
  in-app a los admins conectados (mismo sistema de WebSocket que el chat).
  Los mensajes recibidos se pueden listar con `GET /api/contact` (requiere
  rol admin) — todavía no tiene pantalla propia en la app, es la próxima
  pieza natural a agregar en el panel de admin.
- **Imágenes de la galería/hero son placeholders** (LoremFlickr, con fallback
  automático a Picsum si LoremFlickr falla — es un servicio gratuito algo
  inestable) y los avatares de testimonios son de `pravatar.cc`. Todo el
  contenido de texto es lorem ipsum. Reemplazar por fotografía real de eventos
  de Zenit y testimonios reales antes de publicar.
- **Paleta**: mantiene la base negro + dorado del logo (elegancia) y suma un
  degradé "luces de fiesta" (magenta → violeta → turquesa) usado en dosis
  puntuales — título del hero, brillo de fondo, borde superior de las tarjetas
  de testimonios, hover de los links — para sumar la parte de diversión/fiesta
  sin perder la identidad del logo.

### Despliegue en el VPS de Hostinger

Al ser HTML/CSS/JS estático, alcanza con que Nginx sirva la carpeta `landing/`
como raíz del dominio principal:

```nginx
server {
    listen 80;
    server_name eventoszenit.com www.eventoszenit.com;
    root /var/www/zenit/landing;
    index index.html;
}
```

## 4. Próximos pasos sugeridos

1. Cargar el catálogo real de servicios de Zenit (vía `/api/services` o un
   seed script).
2. Sumar recuperación de contraseña (actualmente no implementada) y reemplazar
   el campo de fecha en texto (`AAAA-MM-DD`) del catálogo por un selector nativo
   (`@react-native-community/datetimepicker`).
3. Agregar una pantalla de "Mensajes de contacto" al panel de admin de la app
   (ya existe `GET /api/contact` en el backend, falta la UI) y reemplazar las
   fotos/testimonios placeholder de la landing por contenido real de Zenit.
4. Si el equipo crece y el tráfico de WebSocket lo justifica, migrar el
   `ConnectionManager` en memoria a Redis pub/sub para poder escalar a
   múltiples workers/instancias.
5. Considerar Alembic para migraciones una vez el esquema esté estable en
   producción (hoy se usa `Base.metadata.create_all`, suficiente para el MVP).
