# Notificaciones en tiempo real y Web Push

La implementación mantiene la interfaz actual. Usa SSE autenticado para actualizar la campana sin recargar y Web Push/VAPID para Android, iPhone/iPad (PWA instalada en iOS 16.4 o posterior) y navegadores de escritorio compatibles. SQL Server conserva dispositivos, preferencias, destinatarios y una cola de entrega con reintentos exponenciales.

## Instalación segura

1. Trabaja únicamente con la base de demostración. Ejecuta `database/2026-11-18-notifications.sql` una vez; el script es incremental e idempotente.
2. Genera un par VAPID fuera del repositorio. Una opción gratuita es `npx web-push generate-vapid-keys`. Conserva ambas claves durante toda la vida de las suscripciones.
3. Configura en Vercel, MonsterASP.NET o IIS:

```text
WebPush__VapidSubject=mailto:administrador@tu-dominio.com
WebPush__VapidPublicKey=<clave pública>
WebPush__VapidPrivateKey=<clave privada>
```

La clave privada nunca debe incluirse en Git ni exponerse al frontend. `/api/notifications/config` entrega únicamente la clave pública a un usuario autenticado. Los mensajes mostrados por el sistema operativo son deliberadamente genéricos para no revelar pedidos, clientes o importes en una pantalla bloqueada.

## Despliegue

### GitHub y Vercel

1. Revisa `git diff`, ejecuta `npm.cmd run build` en `web` y `dotnet test`/`dotnet build` en una máquina con .NET SDK 10.
2. Sube los cambios al repositorio de la demo. No subas `.env`.
3. Añade las tres variables VAPID a Production y Preview en Vercel y vuelve a desplegar los servicios.
4. HTTPS es obligatorio para Push y Service Worker (localhost es la única excepción).

SSE funciona a través del rewrite `/api/*` y se reconecta automáticamente. Los runtimes serverless pueden cortar conexiones largas: `EventSource` vuelve a abrirlas y recupera desde el último ID. Un contenedor serverless también puede suspender el procesador de cola cuando no hay tráfico; para Push con la aplicación cerrada, la opción gratuita más confiable es alojar la API en MonsterASP.NET/IIS y dejar React en Vercel.

### MonsterASP.NET / IIS

1. Publica la API ASP.NET Core y configura las variables anteriores en el panel o `web.config` del servidor (nunca en el repositorio).
2. Usa la cadena SQL local de MonsterASP.NET y ejecuta el script incremental con su editor SQL.
3. Habilita HTTPS. SSE no requiere WebSockets; si el proxy usa buffering, respeta `X-Accel-Buffering: no`.
4. En Vercel, dirige `/api/*` a la URL HTTPS de esa API si frontend y backend quedan separados. En ese caso configura CORS con credenciales y cookies `SameSite=None; Secure`; el despliegue actual del mismo origen no lo necesita.

## Comportamiento y permisos

- Nuevas órdenes: administradores y aprobadores activos.
- Aprobaciones/rechazos: vendedor propietario y personal autorizado; una orden aceptada también avisa a Facturación.
- Stock y eventos generales: solo la audiencia definida por el evento.
- Las preferencias desactivadas excluyen tanto SSE como Push.
- Cada navegador crea una suscripción independiente. Un endpoint Push solo puede pertenecer a un usuario y se reasigna de forma segura al iniciar su registro.
- Al cerrar sesión, los dispositivos con “Tras cerrar sesión” desactivado quedan pausados. Los demás continúan con mensajes genéricos.
- Respuestas 404/410 del proveedor Push invalidan y desactivan automáticamente la suscripción. Otros errores se reintentan desde SQL hasta ocho intentos; reinicios no pierden la cola.

## Pruebas manuales después del despliegue

1. Abre dos sesiones con usuarios distintos. Emite una orden y comprueba que la campana autorizada cambia en unos dos segundos sin recargar.
2. Registra dos navegadores/celulares desde **Notificaciones → Configurar**. Cierra ambos y genera un evento; ambos deben recibir el aviso genérico.
3. Desactiva una categoría y verifica que no llegue ni a la campana ni al sistema operativo.
4. Desmarca “Tras cerrar sesión”, cierra sesión y genera otra alerta: ese dispositivo no debe recibirla.
5. Elimina un dispositivo y confirma que desaparezca y deje de recibir. Revoca el permiso desde el navegador; el siguiente 404/410 debe marcarlo inválido en SQL.
6. En iPhone/iPad instala primero la PWA en la pantalla de inicio y activa las notificaciones desde ella.

Las entregas reales de Apple/Google/Mozilla, suspensión del hosting y pantallas bloqueadas solo se pueden validar en dispositivos y dominios HTTPS reales; no son reproducibles en una compilación local sin claves VAPID y acceso a esos servicios.
