import { useAuth } from './AuthContext.jsx';
import { navigate } from '../app/router.jsx';

export function ScopeGuard({ permits, children }) {
  const { profile } = useAuth();
  if (!permits(profile)) {
    navigate('/sin-autorizacion', { replace: true });
    return null;
  }
  return children;
}
