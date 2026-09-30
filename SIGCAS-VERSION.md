# SIGCAS-MSP — V1 Preview

Estado: preparado para despliegue de auditoría en Vercel.

## Alcance de este hito
- Rama aislada: `sigcas-v1-vercel`
- Frontend React/Vite existente preservado
- Configuración explícita de build para Vercel
- `main` no modificada
- Sin migración de base de datos en este hito

## Build esperado
- Install: `npm --prefix frontend install`
- Build: `npm --prefix frontend run build`
- Output: `frontend/dist`

## Próximo control
Publicar Preview URL, validar navegación visual y registrar aprobación/rechazo antes de integrar Supabase.
