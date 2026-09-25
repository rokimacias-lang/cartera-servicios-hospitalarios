import { useAuth } from '../auth/AuthContext.jsx';
import { isCentralAdministrator, roleName } from '../config/roles.js';
import { AppLink } from '../app/router.jsx';

function scopeLabel(profile) {
  if (profile?.establecimiento_nombre) return profile.establecimiento_nombre;
  if (profile?.provincia_nombre ?? profile?.provincia) return profile.provincia_nombre ?? profile.provincia;
  return profile?.nivel ?? 'MSP Central';
}

export function InstitutionalLayout({ children }) {
  const { user, profile, logout } = useAuth();
  const displayName = profile?.nombre_completo ?? profile?.nombre ?? user?.email;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand__mark">S</span><div><strong>SIGCAS-MSP</strong><small>Versión 0.4</small></div></div>
        <nav aria-label="Navegación principal">
          <AppLink to="/">Inicio</AppLink>
          {profile?.establecimiento_id && <AppLink to="/hospital/cartera">Cartera hospitalaria</AppLink>}
          {isCentralAdministrator(profile) && <AppLink to="/admin/asignacion-tipologia">Asignación Tipología/Nivel</AppLink>}
        </nav>
        <p className="legacy-note">Migración modular SIGCAS-MSP en curso.</p>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div><strong>{displayName}</strong><span>{roleName(profile)}</span></div>
          <div className="topbar__scope"><span>{scopeLabel(profile)}</span><button className="button button--quiet" onClick={() => void logout()}>Cerrar sesión</button></div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
