import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { supabaseConfigured } from '../../services/supabase/client.js';
import { navigate } from '../../app/router.jsx';

export function LoginPage() {
  const { session, login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (session) {
    navigate('/', { replace: true });
    return null;
  }

  const submit = async (event) => {
    event.preventDefault();
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch { /* AuthProvider presents the safe error. */ }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand--login"><span className="brand__mark">S</span><div><strong>SIGCAS-MSP</strong><small>Sistema de Gestión de Cartera de Servicios</small></div></div>
        <h1>Acceso institucional</h1>
        <p>Ingrese con su cuenta autorizada de Supabase Auth.</p>
        {!supabaseConfigured && <div className="alert alert--warning">La conexión Supabase no está configurada en este entorno.</div>}
        {error && <div className="alert alert--error" role="alert">{error.userMessage}</div>}
        <label>Correo institucional<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="button" disabled={loading || !supabaseConfigured}>{loading ? 'Verificando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
