import { useAuth } from './AuthContext.jsx';
import { roleName } from '../config/roles.js';
import { navigate } from '../app/router.jsx';

export function RoleGuard({ allow, children }) {
  const { profile } = useAuth();
  if (!allow.some((check) => check(profile, roleName(profile)))) {
    navigate('/sin-autorizacion', { replace: true });
    return null;
  }
  return children;
}
