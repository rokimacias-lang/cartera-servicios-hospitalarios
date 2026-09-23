import { useAuth } from './AuthContext.jsx';
import { PageState } from '../shared/PageState.jsx';
import { navigate } from '../app/router.jsx';

export function ProtectedRoute({ children }) {
  const { session, profile, loading, error } = useAuth();
  if (loading) return <PageState title="Restaurando sesión" busy />;
  if (!session) {
    navigate('/login', { replace: true });
    return null;
  }
  if (error || !profile) {
    return <PageState tone="error" title="Perfil no disponible" message={error?.userMessage ?? 'No existe un perfil institucional activo para esta cuenta.'} />;
  }
  if (profile.estado !== undefined && profile.estado !== null && !['ACTIVO', 'activo', true].includes(profile.estado)) {
    return <PageState tone="error" title="Perfil inactivo" message="Contacte al administrador institucional." />;
  }
  return children;
}
