# APK de pruebas

El perfil `preview` de `zenitapp/frontend/eas.json` genera un APK instalable, sin Expo Go, conectado a la API de Render. Incluye la bienvenida institucional y el ícono Z dorado.

```bash
cd zenitapp/frontend
npm ci
eas build --platform android --profile preview
```

El proyecto está vinculado a `@scilafeuersturm/eventos-zenit`. Las claves de firma son administradas por EAS; no se guardan en el repositorio. Conservá el mismo proyecto y las credenciales de firma para generar futuras actualizaciones.

Cada persona que pruebe puede registrarse con su propia cuenta de cliente. No se incluyen credenciales de administrador en el APK.

Las notificaciones actuales se muestran dentro de la app; todavía no hay push cuando está cerrada. La API gratuita de Render puede tardar en responder después de un período sin uso. PostgreSQL Free vence el 6 de diciembre de 2026.
