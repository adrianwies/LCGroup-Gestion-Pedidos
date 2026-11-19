# Cuentas de demostración

Credenciales exclusivas para la base ficticia creada por `demo-schema.sql` y `demo-seed.sql`. No deben reutilizarse en producción.

| Usuario | Contraseña | Rol | Uso |
|---|---|---|---|
| `admin` | `DemoAdmin#2026!` | Administrador | Administración completa y usuarios |
| `vendedor` | `DemoSeller#2026!` | Vendedor | Clientes asociados y pedidos |
| `alfredo` | `DemoApprover#2026!` | Aprobador | Primera aprobación |
| `creditos` | `DemoApprover#2026!` | Aprobador | Aprobación de créditos |
| `facturacion` | `DemoBilling#2026!` | Facturación | Funciones de facturación permitidas |

## Instalación en MonsterASP.NET

1. Crear y seleccionar una base SQL Server vacía para la demo.
2. Ejecutar completo `demo-schema.sql`.
3. Ejecutar completo `demo-seed.sql`.
4. Configurar `ConnectionStrings__SqlServer` en Vercel con la conexión de MonsterASP.NET.
5. Mantener `Database__CreateIfMissing=false` y volver a desplegar.

El `seed` almacena únicamente hashes PBKDF2 en `Users.PasswordHash`. Si una cuenta ya existe, una segunda ejecución no cambia su contraseña, rol ni estado.
