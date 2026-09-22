export const ROLES = Object.freeze({
  CENTRAL: 'Administrador Central MSP',
  PROVINCIAL: 'Administrador Provincial',
  HOSPITAL: 'Administrador Hospitalario / Responsable de registro',
  VALIDATOR: 'Validador/Aprobador',
  READ_ONLY: 'Consulta',
});

const CENTRAL_ALIASES = new Set([
  ROLES.CENTRAL.toLowerCase(),
  'administrador central',
  'admin_central',
]);

export function roleName(profile) {
  const joinedRole = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
  return joinedRole?.nombre ?? profile?.rol?.nombre ?? profile?.rol_nombre ?? profile?.rol ?? '';
}

export function isCentralAdministrator(profile) {
  return CENTRAL_ALIASES.has(String(roleName(profile)).trim().toLowerCase());
}
