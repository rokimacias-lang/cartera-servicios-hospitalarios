import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext.jsx';
import * as authService from '../services/supabase/auth.service.js';
import { mapSupabaseError } from '../services/supabase/errors.js';
import { supabaseConfigured } from '../services/supabase/client.js';

export function AuthProvider({ children }) {
  const [state, setState] = useState({ session: null, profile: null, loading: true, error: null });

  const applySession = useCallback(async (session) => {
    if (!session?.user) {
      setState({ session: null, profile: null, loading: false, error: null });
      return;
    }
    setState((current) => ({ ...current, session, loading: true, error: null }));
    try {
      const profile = await authService.getProfile(session.user.id);
      setState({ session, profile, loading: false, error: null });
    } catch (error) {
      setState({ session, profile: null, loading: false, error: mapSupabaseError(error) });
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setState({ session: null, profile: null, loading: false, error: null });
      return undefined;
    }
    let active = true;
    authService.getSession()
      .then((session) => active && applySession(session))
      .catch((error) => active && setState({ session: null, profile: null, loading: false, error: mapSupabaseError(error) }));
    const { data } = authService.onAuthStateChange((_event, session) => {
      if (active) void applySession(session);
    });
    const refreshTimer = window.setInterval(() => {
      authService.getSession().catch(() => undefined);
    }, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(async (email, password) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const { session } = await authService.signIn(email, password);
      await applySession(session);
    } catch (error) {
      const mapped = mapSupabaseError(error, 'Correo o contraseña incorrectos.');
      setState({ session: null, profile: null, loading: false, error: mapped });
      throw mapped;
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authService.signOut();
    } finally {
      setState({ session: null, profile: null, loading: false, error: null });
    }
  }, []);

  const value = useMemo(() => ({ ...state, user: state.session?.user ?? null, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
