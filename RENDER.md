# Despliegue en Render

`render.yaml` define cuatro recursos nuevos en Virginia:

- `zenit-web`: landing pública, sitio estático.
- `zenit-app`: versión web de la app Expo, sitio estático con fallback SPA.
- `zenit-api`: FastAPI en Docker, un worker para conservar el funcionamiento del chat.
- `zenit-db`: PostgreSQL accesible solo por la red privada.

Las URLs públicas se enlazan mediante variables de Render. No se incluyen secretos en Git. Render genera `SECRET_KEY` y `FIRST_ADMIN_PASSWORD`.

## Primer acceso

El administrador inicial usa `admin@eventoszenit.com`. Consultá `FIRST_ADMIN_PASSWORD` en **zenit-api → Environment** dentro del Dashboard. No publiques esa contraseña. Si cambiás las variables `FIRST_ADMIN_*` después del primer arranque, el usuario existente no se modifica automáticamente.

## Plan gratuito

La API usa el plan Free y puede demorar en responder después de un período sin tráfico. Comparte el cupo de horas gratuitas del workspace con sus otras APIs.

PostgreSQL Free vence a los 30 días: antes del vencimiento, exportá los datos o elegí un plan de pago. Esta configuración sirve para una prueba; revisá el plan y los límites antes de usarla con datos reales.

La página institucional presenta Zenit, sus experiencias y el contacto, con enlaces al Instagram público. La entrada web de la app sin sesión abre esa página; el login sigue disponible en `/login`. Android muestra una bienvenida institucional antes de ingresar.

## Desarrollo local

La configuración local sigue usando los valores de `frontend/app.json` y `backend/.env`. Para apuntar Expo a otra API, configurá `EXPO_PUBLIC_API_URL` al iniciar o exportar la app. La URL WebSocket se deriva automáticamente de esa URL.

La landing se puede servir directamente, o generar con `APP_URL=https://... API_URL=https://... node build.cjs` desde `zenitapp/landing`.

Los cambios preparados para Render están en GitHub; la carpeta original del Escritorio no fue modificada.
