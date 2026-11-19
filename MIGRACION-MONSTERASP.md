# Migración privada a MonsterASP.NET

La fuente es la base local `APLICACION_CONTA_DESARROLLO`, alojada en SQL Server 2022 dentro del contenedor Docker local. La exportación corresponde al estado real de la base al momento de generarla; no se limita al seed.

## Archivos privados

Los archivos se encuentran en `migration-private/monsteraspnet/` y la carpeta completa está excluida mediante `.gitignore` porque `02-data.sql` contiene datos de aplicación, hashes de contraseña, claves de protección de datos y suscripciones Push.

1. `01-schema.sql`: tablas, columnas, tipos, IDENTITY, claves, relaciones, restricciones e índices.
2. `02-data.sql`: todos los registros actuales, valores IDENTITY y resecuencias actuales.

## Orden de importación

1. Crear desde el panel de MonsterASP.NET una base SQL Server vacía y seleccionar esa base en el editor o cliente SQL.
2. Ejecutar `01-schema.sql` completo.
3. Ejecutar `02-data.sql` completo.
4. Configurar en el backend la variable `ConnectionStrings__SqlServer` usando los datos entregados por MonsterASP.NET.
5. Mantener `Database__CreateIfMissing=false`.

Los scripts no contienen `CREATE DATABASE`, `CREATE LOGIN`, contraseñas SQL ni un nombre fijo para la base de destino. Tampoco requieren privilegios de administrador del servidor; solo permisos para crear objetos e insertar datos dentro de la base asignada.

## Variables del backend

Usar `.env.monsteraspnet.example` únicamente como referencia. Las credenciales y la clave VAPID privada deben configurarse en las variables protegidas del hosting, nunca dentro del repositorio.

La configuración local en `.env.local` y `compose.local.yaml` permanece separada y continúa apuntando a Docker.

## Verificación realizada

Ambos archivos fueron ejecutados, en orden, sobre una base temporal vacía de SQL Server 2022. Se compararon cantidades y huellas de datos de las 15 tablas, 28 índices, restricciones, relaciones y valores IDENTITY. No se detectaron diferencias de datos ni restricciones deshabilitadas o no confiables.
