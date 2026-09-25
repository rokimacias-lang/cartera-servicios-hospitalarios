export class SigcasError extends Error {
  constructor(kind, userMessage, cause) {
    super(userMessage, { cause });
    this.name = 'SigcasError';
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

export function mapSupabaseError(error, fallback = 'No fue posible completar la operación.') {
  if (error instanceof SigcasError) return error;
  if (!error) return new SigcasError('unexpected', fallback);

  const status = Number(error.status);
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toLowerCase();
  if (status === 401 || message.includes('jwt expired')) {
    return new SigcasError('session_expired', 'La sesión expiró. Ingrese nuevamente.', error);
  }
  if (status === 403 || code === '42501' || message.includes('row-level security')) {
    return new SigcasError('permission_denied', 'No tiene permisos para realizar esta operación.', error);
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return new SigcasError('network', 'No se pudo conectar con el servicio. Verifique su conexión.', error);
  }
  if (status === 400 || code.startsWith('22')) {
    return new SigcasError('validation', 'Revise los datos ingresados e intente nuevamente.', error);
  }
  return new SigcasError('unexpected', fallback, error);
}
