# FASE 1 — Diagnóstico técnico para SIGCAS-MSP v0.4

**Fecha de corte:** 22 de septiembre de 2026<br>
**Alcance:** revisión estática del código, datos semilla, configuración de construcción y despliegue, y ejecución de las comprobaciones disponibles en el entorno.<br>
**Resultado:** **NO APTO para iniciar el desarrollo funcional de v0.4 ni para desplegar en producción sin una estabilización previa.**

## 1. Resumen ejecutivo

El repositorio contiene un prototipo funcionalmente amplio: autenticación con sesiones, roles `admin` y `hospital`, mantenimiento e importación de establecimientos, catálogo de prestaciones, auditoría, panel React, PostgreSQL, dos alternativas de contenedorización y scripts de respaldo. Los datos semilla incluyen **137 establecimientos** y **263 prestaciones**, sin unicódigos ni identificadores de catálogo duplicados.

La base presenta, sin embargo, bloqueadores de severidad crítica:

1. Las dos variantes del backend envían una cantidad incorrecta de parámetros al `INSERT` de establecimientos. Esto impide la carga semilla inicial y cualquier alta/actualización.
2. Se crean accesos hospitalarios cuya contraseña inicial es el propio unicódigo y la interfaz la revela. Es una credencial predecible, compartida en la práctica y sin cambio obligatorio.
3. Existen valores de respaldo inseguros para la clave del administrador y el secreto de sesión. Railway no exige esas variables durante la construcción o el arranque.
4. La autorización de un usuario hospitalario protege qué fila puede modificar, pero no restringe qué campos puede modificar; el cliente deshabilita campos oficiales, aunque la API acepta su alteración directa.
5. No hay pruebas automatizadas, CI, archivos de bloqueo de dependencias, migraciones versionadas, `.gitignore` ni un `.env.example`, a pesar de que el README lo exige.

**Recomendación:** ejecutar primero un hito **v0.4.0-estabilización**. No agregar nuevas capacidades funcionales hasta resolver P0/P1 y contar con una prueba integrada contra PostgreSQL.

## 2. Inventario técnico observado

| Área | Estado actual |
|---|---|
| Frontend | React, Vite y Recharts; aplicación casi monolítica en `frontend/src/App.jsx` (857 líneas, ~200 KiB) |
| API | Express 5 sobre Node.js; dos entradas casi duplicadas: `server.js` y `server-postgres.js` |
| Persistencia | PostgreSQL mediante `pg`; DDL y semillas ejecutados automáticamente al iniciar |
| Autenticación | `express-session`, almacén PostgreSQL y `bcryptjs` |
| Seguridad HTTP | Helmet sin CSP, CORS configurable y límite de intentos únicamente en login |
| Despliegue | Compose con Nginx + API + PostgreSQL; Railway como servicio único API + estáticos |
| Datos iniciales | 137 establecimientos y 263 prestaciones |
| Operación | Healthcheck, scripts de backup/restauración y checklist manual |
| Calidad | Sin pruebas, linter, formateador, cobertura, CI ni contratos OpenAPI |
| Reproducibilidad | Dependencias con rangos y `latest`; no hay archivos lock; las imágenes tampoco están fijadas por digest |

### Flujos implementados

- Inicio/cierre de sesión y consulta de sesión.
- Cambio de contraseña del propio usuario mediante API.
- Listado, alta, edición, eliminación e importación masiva de establecimientos.
- Perfil restringido por unicódigo para el rol hospitalario.
- Selección de cartera desde catálogo y reportes básicos.
- Creación/provisión de usuarios, cambio de estado y consulta de auditoría.
- Exportación e importación CSV desde el navegador.

## 3. Hallazgos priorizados

### P0 — Bloqueadores

#### P0-01. Escritura de establecimientos rota por parámetros SQL inconsistentes

`hospitals` tiene 29 columnas en el `INSERT`. El objeto de negocio aporta 27 valores y se concatenan dos marcas de tiempo, es decir, se envían 29 parámetros.

- `backend/server.js` solo declara marcadores hasta `$27`.
- `backend/server-postgres.js` declara hasta `$28` y reutiliza `$28` para ambas fechas.
- En ambos casos se entregan 29 valores a `pg`, que rechaza parámetros de enlace sobrantes.

**Impacto:** una base vacía falla durante `seedDb()` en el primer establecimiento y el proceso no llega a escuchar el puerto. En una base ya inicializada fallan creación, edición e importación. Afecta tanto Compose como Railway.

**Acción v0.4:** unificar el backend y corregir el `INSERT` usando una lista explícita de 29 parámetros o, preferiblemente, encapsular la persistencia y cubrirla con pruebas de integración.

#### P0-02. Credenciales iniciales predecibles y expuestas

La provisión masiva usa el unicódigo simultáneamente como usuario, contraseña y vínculo al establecimiento. La vista administrativa además muestra “Usuario y clave” con ese unicódigo, y el formulario de inicio de sesión lo sugiere como contraseña.

**Impacto:** cualquiera que conozca o enumere unicódigos puede intentar acceder a perfiles hospitalarios; no existe cambio obligatorio en el primer ingreso.

**Acción v0.4:** eliminar la contraseña derivada del unicódigo, generar invitaciones/secretos aleatorios de un solo uso, registrar expiración y forzar cambio inicial. Invalidar las credenciales previamente provisionadas.

#### P0-03. Secretos con valores de respaldo inseguros

Si faltan variables, el backend usa `CarteraMSP2026` para el administrador y `change-me` para firmar sesiones. Compose obliga a declarar secretos, pero Railway ejecuta el backend sin esa garantía.

**Impacto:** un error de configuración produce credenciales conocidas y permite comprometer cuentas o sesiones.

**Acción v0.4:** validar todas las variables al arrancar y terminar con error si faltan o son débiles; nunca incluir secretos predeterminados. Añadir un `.env.example` sin valores reales.

### P1 — Riesgo alto

#### P1-01. Autorización hospitalaria demasiado amplia

El `PUT /api/hospitals/:id` comprueba que el unicódigo de la fila pertenezca a la sesión, pero pasa el cuerpo completo a `saveHospital()`. Un cliente directo puede cambiar nombre oficial, unicódigo, nivel, tipología, ubicación y demás campos que la UI presenta como inmutables. Incluso puede cambiar el unicódigo y perder su asociación futura.

**Acción:** aplicar DTO/lista permitida por rol en el servidor; reservar campos maestros al administrador y probar horizontal privilege escalation y mass assignment.

#### P1-02. Operaciones compuestas sin transacciones

`saveHospital()` actualiza primero el establecimiento, elimina todas sus prestaciones y luego las reinserta una por una. La importación masiva repite el proceso por fila, también sin transacción.

**Impacto:** un error intermedio deja datos parciales; una importación puede confirmar algunas filas y fallar en otras sin una respuesta recuperable.

**Acción:** usar transacciones, inserción por lotes e informe por fila; definir política atómica o de errores parciales.

#### P1-03. DDL embebido sin historial de migraciones

La API ejecuta `CREATE TABLE` y `ALTER TABLE` al iniciar. No hay esquema versionado, rollback, control de concurrencia ni registro de migraciones aplicadas.

**Impacto:** cambios de v0.4 no son auditables ni desplegables de forma segura entre ambientes.

**Acción:** adoptar migraciones versionadas, separar migración/seed del arranque normal y probar upgrade/rollback sobre una copia anonimizada.

#### P1-04. Dependencias no reproducibles y auditoría bloqueada

No se versiona ningún `package-lock.json`. El frontend usa `latest` para React, React DOM, Recharts, Vite y su plugin. Los Dockerfiles ejecutan `npm install`, por lo que una reconstrucción puede producir artefactos diferentes. `npm audit` no puede operar sin lockfile.

**Acción:** fijar versiones compatibles, generar y versionar locks, cambiar imágenes a `npm ci` y habilitar actualización automatizada y escaneo en CI.

#### P1-05. Ausencia total de pruebas y CI

No existen scripts `test`, pruebas unitarias/integradas/E2E ni workflows. La única verificación automatizable actual es construir el frontend y revisar sintaxis.

**Acción:** introducir una pirámide mínima: validación y autorización unitarias, repositorios/API contra PostgreSQL, y E2E para login, aislamiento por hospital y actualización de cartera.

#### P1-06. Datos personales y auditoría sin gobierno explícito

Se almacenan nombre, cargo, teléfono y correo de contactos; el administrador puede exportarlos por CSV. Auditoría guarda actor y detalles, pero no hay retención, paginación real, exportación controlada, clasificación, consentimiento/base legal ni procedimiento de atención de incidentes documentados.

**Acción:** acordar con MSP clasificación, finalidad, retención, minimización, trazabilidad de exportaciones y perfiles autorizados antes de datos reales.

### P2 — Deuda técnica y operativa

#### P2-01. Dos backends divergentes

Compose usa `server.js`; Railway usa `server-postgres.js`. Ya difieren en CORS, versión del healthcheck, estáticos y SQL. Cada corrección debe duplicarse y puede comportarse de manera distinta por ambiente.

**Acción:** mantener una sola entrada parametrizable y probar las dos topologías con el mismo artefacto.

#### P2-02. Frontend monolítico y datos triplicados

`App.jsx` contiene UI, estilos, llamadas, parser CSV y copias embebidas completas de establecimientos y catálogo. Las constantes `SEED_HOSPITALES`, `STORAGE_KEY`, `ADMIN_USER` y `ADMIN_PASS` no participan en el flujo activo, pero aumentan el bundle y exponen una contraseña histórica. Los mismos datos viven también en JSON del backend.

**Acción:** retirar código/datos muertos, dividir por dominio, crear una capa API tipada y conservar una única fuente de catálogo.

#### P2-03. Bundle grande y fuentes remotas

La construcción genera un chunk JavaScript de **676.54 KiB** (188.04 KiB gzip) y Vite emite advertencia por superar 500 KiB. Los estilos importan Google Fonts en ejecución, introduciendo una dependencia externa y potencial transferencia de metadatos.

**Acción:** carga diferida de administración/gráficos, revisar Recharts y alojar tipografías aprobadas localmente.

#### P2-04. Validación insuficiente y errores inconsistentes

- No hay esquema común para cuerpos, parámetros ni respuestas.
- Rol, correo, fechas, unicódigo, límites de texto y pertenencia de servicios se validan parcialmente o no se validan.
- El límite de auditoría permite `NaN` o negativos.
- Los handlers asíncronos no siguen una estrategia uniforme de errores.
- Algunas operaciones reportan éxito aun sin afectar filas (estado/contraseña/eliminación).

**Acción:** adoptar validación de esquema, errores estructurados, límites y códigos HTTP consistentes.

#### P2-05. CSV no robusto

El importador divide cada línea por coma y no soporta correctamente comas dentro de campos entrecomillados, saltos de línea, BOM ni diagnóstico por fila. La exportación no mitiga fórmulas (`=`, `+`, `-`, `@`) al abrirse en una hoja de cálculo.

**Acción:** usar un parser probado, validar cabeceras/tamaño/contenido y neutralizar CSV injection.

#### P2-06. Rendimiento y escalabilidad

El listado realiza una consulta de servicios por hospital (patrón N+1), luego entrega todos los hospitales y todos sus servicios sin paginar. Seed, provisión e importación también operan secuencialmente y recalculan bcrypt por registro.

**Acción:** consultas agregadas, paginación y filtros del lado servidor, lotes y trabajos controlados para importaciones/provisión.

#### P2-07. Repositorio y documentación inconsistentes

- No existe `.gitignore`; `backend/node_modules/` y `frontend/node_modules/` aparecen como no rastreados.
- README solicita copiar `.env.example`, pero el archivo no existe.
- Las versiones declaradas son 1.0.0, 4.0.0, 4.1 y “Etapa 3”; no hay una fuente única de versión v0.4.
- La API expone `window.storage` para rutas `/api/storage/*` inexistentes.
- Hay un único commit inicial y no se documenta estrategia de ramas, releases ni changelog.

**Acción:** higiene de repositorio, versionado semántico único y documentación generada/verificada.

#### P2-08. Observabilidad y continuidad incompletas

El healthcheck solo prueba `SELECT 1`; no distingue vida de preparación. Los logs son texto libre y pueden perder contexto. Backup/restauración existen, pero no se verifican integridad, cifrado, retención, restauración periódica ni objetivos RPO/RTO.

**Acción:** logs estructurados con correlación, métricas/alertas, healthchecks separados y simulacro de restauración documentado.

### P3 — Mejoras recomendadas

- Accesibilidad: revisar navegación por teclado, foco, etiquetas, contraste y tablas responsivas.
- UX: pedir confirmación antes de eliminar, mostrar errores reales del API y estados de envío para impedir dobles operaciones.
- Seguridad de navegador: habilitar CSP en lugar de desactivarla; definir `Referrer-Policy`, permisos y estrategia CSRF explícita.
- Mantenibilidad: formatear backend, eliminar variables duplicadas/no usadas y documentar decisiones de arquitectura.

## 4. Aspectos positivos reutilizables

- Las consultas de datos usan parámetros en lugar de interpolación SQL.
- Las contraseñas persistidas se procesan con bcrypt y las cookies son `httpOnly`.
- Las sesiones se guardan en PostgreSQL y tienen expiración de ocho horas.
- Hay separación de roles y comprobación de pertenencia del establecimiento, aunque debe endurecerse a nivel de campos.
- La base aplica claves únicas, claves foráneas con cascada e índices iniciales.
- Compose no publica PostgreSQL en la configuración de producción.
- Existen scripts básicos de backup/restauración y una lista operativa para producción.
- Los datos semilla analizados no presentan unicódigos hospitalarios, IDs de catálogo ni etiquetas de catálogo duplicados.

## 5. Plan de estabilización propuesto para v0.4

### Hito A — Recuperar una línea base ejecutable (P0)

1. Unificar el servidor y corregir persistencia.
2. Añadir PostgreSQL efímero en pruebas y verificar migración + seed + CRUD.
3. Eliminar secretos predeterminados y validar configuración al arranque.
4. Revocar el esquema de contraseña igual al unicódigo e implementar activación segura.
5. Restringir los campos modificables por cada rol.

**Criterio de salida:** instalación limpia levanta, carga 137/263 registros, pasa smoke test y no acepta modificación de campos maestros por un hospital.

### Hito B — Ingeniería reproducible (P1)

1. Locks, versiones fijadas, `.gitignore`, `.env.example` y `npm ci`.
2. Migraciones versionadas y transacciones.
3. Linter, formato, pruebas y CI con build, audit y análisis estático.
4. Contrato OpenAPI y validación de entradas/salidas.

**Criterio de salida:** el mismo commit produce el mismo artefacto y toda migración se valida automáticamente desde cero y desde la versión anterior.

### Hito C — Modularidad, datos y operación (P2)

1. Modularizar API y frontend; retirar semillas/copias y credenciales muertas del navegador.
2. Paginación, consultas agregadas y procesamiento masivo transaccional.
3. Importación CSV robusta con prevalidación y reporte por fila.
4. Política de datos, auditoría, observabilidad y simulacro de backup/restore.
5. Pruebas E2E y de carga con volúmenes objetivo acordados.

**Criterio de salida:** piloto aprobado por seguridad, operaciones y usuarios funcionales con evidencia reproducible.

## 6. Matriz mínima de pruebas para v0.4

| Capa | Casos obligatorios |
|---|---|
| Configuración | Falta/debilidad de secretos; combinaciones proxy/CORS/cookie |
| Migraciones | Base vacía, actualización desde versión previa, ejecución repetida y rollback ensayado |
| Autenticación | Login válido/inválido, rate limit, usuario inactivo, cambio inicial, logout e invalidación |
| Autorización | Admin/hospital/anónimo por endpoint; acceso horizontal; lista permitida de campos |
| Hospitales | CRUD, unicódigo duplicado/vacío, servicio inexistente, valores límite y concurrencia |
| Importación | CSV válido, comillas/comas/BOM, duplicados, archivo grande, rollback y fórmulas |
| Auditoría | Actor/acción/entidad correctos, paginación, retención y eventos fallidos críticos |
| E2E | Provisión segura, primer acceso, edición de perfil, panel admin y exportación |
| Operación | Healthchecks, apagado ordenado, pérdida de DB, backup verificado y restauración |

## 7. Decisiones que el equipo debe cerrar antes de implementar

1. Alcance funcional exacto de “v0.4” y fuente maestra oficial de establecimientos/prestaciones.
2. Propiedad de cada campo: MSP central frente a establecimiento.
3. Flujo institucional de alta, recuperación, MFA y baja de usuarios.
4. Ambientes objetivo y si Railway seguirá siendo válido para datos reales.
5. Clasificación de datos, retención, responsables, perfiles y requisitos regulatorios del MSP.
6. Volumen esperado, concurrencia, disponibilidad, RPO y RTO.
7. Identificador estable del catálogo: no depender de `label`, porque una corrección ortográfica rompe asociaciones/importaciones.

## 8. Evidencia de comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| `node --check backend/server.js` | Correcto: sintaxis válida |
| `node --check backend/server-postgres.js` | Correcto: sintaxis válida |
| `npm run build` | Correcto con advertencia: chunk JS de 676.54 KiB |
| Parseo de JSON semilla y conteo/duplicados | Correcto: 137 hospitales, 263 prestaciones; sin duplicados en claves relevantes |
| `npm audit --omit=dev` en backend/frontend | No ejecutable: faltan archivos lock |
| `docker compose config --quiet` con variables de prueba | No ejecutable: Docker no está instalado en el entorno |
| Prueba integrada con PostgreSQL | No ejecutada: no hay servicio/cliente PostgreSQL ni Docker disponible |

Estas limitaciones no rebajan los hallazgos estáticos. En particular, el defecto de parámetros SQL debe convertirse en una prueba de regresión integrada, no considerarse validado únicamente con revisión visual.
