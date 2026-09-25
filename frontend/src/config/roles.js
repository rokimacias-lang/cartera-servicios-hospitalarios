export const ROLES = Object.freeze({
  MASTER_CENTRAL: 'MASTER_CENTRAL',
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

function joinedRole(profile) {
  return Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
}

export function roleCode(profile) {
  const role = joinedRole(profile);
  return role?.codigo ?? profile?.rol?.codigo ?? profile?.rol_codigo ??
    (profile?.rol === ROLES.MASTER_CENTRAL ? profile.rol : '');
}

export function roleName(profile) {
  const role = joinedRole(profile);
  return role?.nombre ?? profile?.rol?.nombre ?? profile?.rol_nombre ?? profile?.rol ?? '';
}

export function isCentralAdministrator(profile) {
  if (String(roleCode(profile)).trim().toUpperCase() === ROLES.MASTER_CENTRAL) return true;
  return CENTRAL_ALIASES.has(String(roleName(profile)).trim().toLowerCase());
}

export const canAccessTypologyAssignment = isCentralAdministrator;
