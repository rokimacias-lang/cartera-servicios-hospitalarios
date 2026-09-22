import { AuthProvider } from '../auth/AuthProvider.jsx';
import { ProtectedRoute } from '../auth/ProtectedRoute.jsx';
import { RoleGuard } from '../auth/RoleGuard.jsx';
import { isCentralAdministrator } from '../config/roles.js';
import { InstitutionalLayout } from '../layout/InstitutionalLayout.jsx';
import { LoginPage } from '../modules/auth/LoginPage.jsx';
import { HomePage } from '../modules/home/HomePage.jsx';
import { TypologyAssignmentPage } from '../modules/typology-assignment/TypologyAssignmentPage.jsx';
import { PageState } from '../shared/PageState.jsx';
import { navigate, usePathname } from './router.jsx';

function ProtectedApplication({ path }) {
  let page;
  if (path === '/') page = <HomePage />;
  else if (path === '/admin/asignacion-tipologia') page = <RoleGuard allow={[isCentralAdministrator]}><TypologyAssignmentPage /></RoleGuard>;
  else if (path === '/sin-autorizacion') page = <PageState tone="error" title="Acceso no autorizado" message="Su rol o alcance institucional no permite abrir esta sección." />;
  else {
    navigate('/', { replace: true });
    return null;
  }
  return <ProtectedRoute><InstitutionalLayout>{page}</InstitutionalLayout></ProtectedRoute>;
}

function Routes() {
  const path = usePathname();
  return path === '/login' ? <LoginPage /> : <ProtectedApplication path={path} />;
}

export default function SigcasApp() {
  return <AuthProvider><Routes /></AuthProvider>;
}
