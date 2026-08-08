# Checklist de producción

- [ ] Dominio configurado.
- [ ] HTTPS activo.
- [ ] `POSTGRES_PASSWORD` aleatoria y guardada en un gestor seguro.
- [ ] `SESSION_SECRET` aleatorio de 64+ caracteres.
- [ ] `DEFAULT_ADMIN_PASSWORD` cambiado por una contraseña institucional segura.
- [ ] Puerto 5432 NO expuesto a Internet.
- [ ] Firewall permite únicamente 80/443 (y SSH según necesidad).
- [ ] Backups automáticos diarios.
- [ ] Restauración de backup probada.
- [ ] CORS_ORIGIN ajustado al dominio real.
- [ ] Correo institucional definido si posteriormente se implementa recuperación por email.
- [ ] Monitoreo y logs configurados.
- [ ] Política de usuarios y permisos aprobada.
- [ ] Validación funcional con usuarios piloto.
