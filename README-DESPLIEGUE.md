# Proyecto universitario: Vercel + MonsterASP.NET

Esta carpeta es una copia independiente preparada para demostración. No utiliza la base original ni contiene archivos Excel, sesiones o credenciales del proyecto de presentación.

## Arquitectura verificada

- Frontend: React 19.3, TypeScript 7, Vite 8 y Nginx.
- Backend: ASP.NET Core Minimal API sobre **.NET 10 (`net10.0`)**.
- Acceso a datos: `Microsoft.Data.SqlClient` 6.1.2 y Microsoft SQL Server.
- Autenticación: cookie HTTP-only; las claves de protección se guardan en SQL Server para sobrevivir reinicios y escalado del contenedor.
- Despliegue: dos servicios HTTP dentro del mismo proyecto Vercel. `/api/*` y `/health` van al contenedor .NET; el resto va al frontend.

## Compatibilidad y límites importantes

Al 10 de noviembre de 2026, Vercel admite servidores HTTP empaquetados mediante `Dockerfile.vercel`. Los contenedores son funciones sin estado, escalan a cero y deben escuchar el puerto indicado por `PORT`. Vercel Services permite frontend y backend en un mismo proyecto, pero sigue siendo una función reciente/beta y debe seleccionarse como framework **Services** en el proyecto.

El plan Hobby es gratuito y para uso personal/no comercial. Tiene límites de CPU, memoria, invocaciones y duración; al agotarlos el proyecto puede pausarse. Es adecuado para una exposición, no para operación empresarial permanente. No ejecutar importaciones grandes durante la presentación.

MonsterASP.NET ofrece una base MSSQL gratuita de 1 GB sin tarjeta. El acceso remoto está desactivado inicialmente y debe habilitarse desde su panel. Para una aplicación externa se usa la cadena **Remote access**, nunca la cadena local. La base gratuita está en el centro de datos europeo y puede añadir latencia desde Vercel.

Si Vercel Services/containers no aparece habilitado en tu cuenta, la alternativa gratuita más estable es alojar la API .NET en el sitio gratuito de MonsterASP.NET y dejar solo el frontend en Vercel. La base y la API quedarían en la misma plataforma y la API usaría la cadena local. Esta alternativa conserva SQL Server y no requiere tarjeta.

## 1. Crear la base demo

1. Registra una cuenta gratuita en MonsterASP.NET.
2. Crea una base **SQL Server** gratuita. No restaures una copia de producción.
3. Desde el panel, habilita `Remote access`.
4. Ejecuta, en este orden, usando el editor web o SSMS:
   - `database/demo-schema.sql`
   - `database/demo-seed.sql`
   - `database/2026-11-18-notifications.sql`
5. Consulta `database/CUENTAS-DEMO.md` para los usuarios y contraseñas ficticios de la exposición.
6. Copia la cadena marcada como **Remote access**. Debe tener esta forma aproximada:

```text
Server=dbXXXX.public.databaseasp.net;Database=dbXXXX;User Id=dbXXXX;Password=...;Encrypt=True;TrustServerCertificate=False;Connect Timeout=15;MultipleActiveResultSets=True
```

Los scripts crean el esquema, las cuentas con hashes PBKDF2 y los datos ficticios dentro de la base seleccionada. La API no crea cuentas durante el arranque. El `seed` no restablece la contraseña, el rol ni el estado de una cuenta que ya exista.

## 2. Preparar el repositorio

Sube únicamente el contenido de `AplicacionConta-Demo-Vercel` a un repositorio privado o público nuevo. Antes de subirlo comprueba:

```powershell
git status
git ls-files | Select-String -Pattern '\.env$|\.xlsx$|session\.txt|\.bak$'
```

El segundo comando no debe mostrar resultados.

## 3. Crear el proyecto Vercel

1. Crea una cuenta personal Hobby. No inicies una suscripción Pro.
2. Importa el repositorio.
3. En `Build and Deployment > Framework Preset`, selecciona **Services**.
4. Mantén la raíz del proyecto en la raíz del repositorio.
5. No cambies `vercel.json` ni los archivos `Dockerfile.vercel`.

Vercel construirá:

- `web/Dockerfile.vercel`: compila Vite y sirve la SPA con Nginx.
- `server/Dockerfile.vercel`: compila ASP.NET Core 10 y escucha en `$PORT`.

## 4. Variables de entorno de Vercel

Agrega para `Production` y, si se desea, `Preview`:

```text
ConnectionStrings__SqlServer=<cadena Remote access de MonsterASP.NET>
ASPNETCORE_ENVIRONMENT=Production
Database__CreateIfMissing=false
WebPush__VapidSubject=mailto:administrador@tu-dominio.com
WebPush__VapidPublicKey=<clave pública VAPID>
WebPush__VapidPrivateKey=<clave privada VAPID>
```

No uses comillas alrededor de los valores en el panel. No agregues la cadena de conexión a Git. Genera las claves VAPID fuera del repositorio (por ejemplo, `npx web-push generate-vapid-keys`) y no cambies el par después de registrar dispositivos. Consulta `NOTIFICACIONES.md` para las pruebas de SSE, Push, cierre de sesión y revocación.

La API no crea cuentas ni restablece contraseñas durante el arranque. Los usuarios deben existir previamente en la tabla `Users` de SQL Server con su `PasswordHash`. Después del acceso, una cuenta administrativa válida puede gestionar usuarios desde el módulo correspondiente.

## 5. Publicar

Pulsa **Deploy** solo cuando estés listo. Este trabajo no ejecutó ningún despliegue externo.

Después de publicar valida:

1. `https://TU-PROYECTO.vercel.app/health` responde `status: ready`.
2. Inicia sesión como `admin`.
3. Comprueba productos, clientes, vendedores y usuarios ficticios.
4. Crea una orden como `vendedor`.
5. Apruébala con `alfredo` y `creditos`.
6. Confirma que el administrador pueda abrir el detalle e imprimirla.

## Desarrollo local

1. Copia `.env.example` como `.env`.
2. Sustituye todas las claves `REEMPLAZAR...`.
3. Ejecuta:

```powershell
docker compose up --build
```

Abrir `http://127.0.0.1:5182`. La base local se crea solo porque Compose establece `Database__CreateIfMissing=true`. En Vercel debe permanecer en `false`. La demo usa puertos 14335, 5092 y 5182 y el nombre Docker `university-demo`, por lo que no comparte contenedores ni volúmenes con el proyecto original.

Para detener el laboratorio:

```powershell
docker compose down
```

## Diagnóstico

- Error de conexión: verifica que MonsterASP.NET tenga `Remote access` habilitado y usa el hostname público, no el local.
- Error TLS: copia exactamente la cadena entregada por el panel. Mantén `Encrypt=True`.
- Error 500 al iniciar: revisa la cadena SQL, la conectividad remota y que el esquema requerido exista en la base configurada.
- Sesión que se cierra: confirma que `DataProtectionKeys` exista y que el usuario SQL tenga permisos de lectura e inserción.
- Tiempo de espera: evita cargas masivas; el plan Hobby y una base remota gratuita tienen recursos limitados.
- Services no disponible: publica la API en el sitio gratuito de MonsterASP.NET y configura el frontend para consumir esa URL en una segunda adaptación.

## Archivos de despliegue

- `vercel.json`: enrutamiento y definición de servicios.
- `server/Dockerfile.vercel`: backend .NET 10.
- `web/Dockerfile.vercel`: frontend Vite/Nginx.
- `.env.example`: nombres de variables sin secretos.
- `database/demo-schema.sql`: esquema nuevo y aislado.
- `database/demo-seed.sql`: datos ficticios.
- `database/CUENTAS-DEMO.md`: accesos ficticios y orden de instalación.
