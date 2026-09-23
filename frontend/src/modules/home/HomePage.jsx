import { useAuth } from '../../auth/AuthContext.jsx';
import { roleName } from '../../config/roles.js';

export function HomePage() {
  const { profile } = useAuth();
  return <section><div className="eyebrow">SIGCAS-MSP v0.4</div><h1>Inicio</h1><p className="lead">Sesión institucional activa como {roleName(profile)}.</p><div className="card"><h2>Base funcional Supabase</h2><p>La autenticación, el perfil, el alcance y la navegación protegida están disponibles. Los módulos heredados continuarán migrándose de forma incremental.</p></div></section>;
}
