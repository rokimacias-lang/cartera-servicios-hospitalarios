import { mapSupabaseError } from './errors.js';
import { requireSupabase } from './client.js';

export async function signIn(email, password) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw mapSupabaseError(error, 'No fue posible iniciar sesión.');
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw mapSupabaseError(error, 'No fue posible cerrar la sesión.');
}

export async function getSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw mapSupabaseError(error, 'No fue posible restaurar la sesión.');
  return data.session;
}

export async function getProfile(userId) {
  const { data, error } = await requireSupabase()
    .from('perfiles')
    .select('*, roles(*)')
    .eq('id', userId)
    .single();
  if (error) throw mapSupabaseError(error, 'No fue posible cargar el perfil institucional.');
  return data;
}

export function onAuthStateChange(callback) {
  return requireSupabase().auth.onAuthStateChange(callback);
}
