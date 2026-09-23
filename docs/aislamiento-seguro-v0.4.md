# FASE 2 — Aislamiento seguro de SIGCAS-MSP v0.4

**Fecha de ejecución:** 22 de septiembre de 2026<br>
**Objetivo:** separar código fuente, secretos, dependencias, artefactos y datos operativos antes de modificar la línea base para v0.4.

## 1. Resultado

La línea de trabajo de v0.4 queda aislada en la rama actual y en el commit correspondiente a esta fase. El aislamiento aplicado cubre el repositorio y los tres contextos de construcción Docker. Esta fase **no corrige todavía los bloqueadores funcionales P0** del diagnóstico; establece una frontera reproducible y reduce el riesgo de incorporar secretos o archivos locales en commits e imágenes.

## 2. Controles aplicados

### 2.1 Frontera de control de versiones

El `.gitignore` raíz excluye:

- dependencias (`node_modules/`);
- salidas de construcción, cobertura y cachés;
- `.env` y sus variantes, conservando únicamente `.env.example`;
- claves y certificados privados;
- backups, volcados SQL y logs;
- archivos locales de editores y sistemas operativos.

Los directorios `backend/node_modules/` y `frontend/node_modules/`, presentes antes de esta fase como archivos no rastreados, quedan fuera del estado de Git sin borrarse del ambiente del desarrollador.

### 2.2 Frontera de secretos y configuración

Se incorpora `.env.example` como contrato mínimo de configuración, exclusivamente con marcadores no operativos para los secretos. Cada ambiente debe mantener su propio `.env` fuera de Git y usar secretos distintos.

Reglas operativas:

1. Generar `POSTGRES_PASSWORD`, `SESSION_SECRET` y `DEFAULT_ADMIN_PASSWORD` por ambiente.
2. No copiar credenciales de desarrollo a pruebas, piloto o producción.
3. Inyectar secretos desde el gestor de la plataforma en CI/CD y Railway.
4. Rotar inmediatamente cualquier valor que se haya compartido fuera del canal autorizado.
5. No usar los marcadores de `.env.example` para iniciar servicios.

> La validación estricta de secretos al arrancar continúa siendo una tarea P0 de la fase de estabilización.

### 2.3 Frontera de construcción Docker

Se añaden exclusiones para:

- el contexto raíz usado por `Dockerfile.railway`;
- el contexto `backend/` usado por Compose;
- el contexto `frontend/` usado por Compose.

Esto evita enviar dependencias locales, secretos, backups, volcados, cobertura e historial Git al daemon o constructor remoto. La plantilla `.env.example` puede permanecer como documentación, pero no contiene valores utilizables.

### 2.4 Reproducibilidad de dependencias

Se generan y versionan archivos `package-lock.json` para raíz, backend y frontend. Los Dockerfiles usan ahora `npm ci`:

- rechaza discrepancias entre manifiesto y lock;
- instala exactamente el árbol resuelto;
- evita que una reconstrucción seleccione versiones diferentes por los rangos o etiquetas `latest` del manifiesto.

El siguiente paso deberá sustituir también `latest` por versiones explícitas en `frontend/package.json`; el lock reduce el riesgo inmediato, pero no reemplaza una política de actualización controlada.

## 3. Matriz de separación por ambiente

| Recurso | Desarrollo | CI/pruebas | Piloto/producción |
|---|---|---|---|
| Código | Rama de trabajo v0.4 | Commit inmutable del PR | Tag/release aprobado |
| Base de datos | Instancia local desechable | Instancia efímera | Instancia administrada dedicada |
| Secretos | `.env` local ignorado | Secret store del CI | Secret store de la plataforma |
| Datos | Semillas sintéticas/institucionales aprobadas | Fixtures sin datos personales | Datos reales bajo gobierno MSP |
| Backups | Directorio local ignorado | Artefacto temporal cifrado si aplica | Almacenamiento externo cifrado y probado |
| Dependencias | `npm ci` | `npm ci` | Imagen construida desde los mismos locks |

No se permite compartir base de datos ni secretos entre estas columnas.

## 4. Procedimiento de trabajo seguro para v0.4

1. Actualizar la rama desde la base aprobada antes de iniciar un bloque de trabajo.
2. Crear `.env` desde la plantilla y reemplazar todos los marcadores localmente.
3. Instalar con `npm ci`; no editar `node_modules`.
4. Ejecutar pruebas con una base desechable y sin datos personales reales.
5. Revisar `git status --short` antes de cada commit.
6. Ejecutar una búsqueda de nombres sensibles y un escáner de secretos en CI.
7. Construir imágenes únicamente desde un commit limpio.
8. Promover el mismo artefacto inmutable; no reconstruirlo con dependencias distintas por ambiente.

## 5. Comprobaciones de esta fase

| Comprobación | Resultado |
|---|---|
| Locks raíz/backend/frontend generados | Correcto |
| Instalación reproducible con `npm ci` | Correcto en raíz y backend; frontend bloqueado por respuestas HTTP 403 del registro npm del entorno |
| Construcción del frontend desde locks | Pendiente en esta ejecución: la instalación frontend no pudo completarse por la restricción de red indicada |
| Sintaxis de los dos servidores | Correcto |
| Exclusión Git de dependencias, `.env`, build, backups y claves | Correcto |
| Revisión de archivos sensibles ya rastreados | No se encontraron `.env`, claves, certificados, dependencias ni artefactos rastreados |
| Auditoría npm con locks | Los locks eliminan el bloqueo `ENOLOCK`; la consulta quedó limitada por indisponibilidad del endpoint npm (`EADDRNOTAVAIL`) |
| Construcción Docker | Pendiente por ausencia de Docker en este entorno |

## 6. Criterios de salida

- `git status` no muestra dependencias, builds, secretos ni backups locales.
- Cada paquete posee un lock coherente; `npm ci` debe verificarse para frontend en CI con acceso al registro autorizado.
- Los contextos Docker excluyen información local y sensible.
- Existe una plantilla de configuración sin secretos reales.
- La fase está identificada por un commit y un PR revisable.

Con estos controles queda preparado el aislamiento técnico. El equipo debe continuar con el **Hito A — Recuperar una línea base ejecutable** definido en el diagnóstico, sin declarar todavía la aplicación apta para producción.
