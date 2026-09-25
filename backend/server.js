import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sigcasRouter from './sigcas-router.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sigcas-msp-uat', version: '0.6.6' });
});

// SIGCAS uses Supabase bearer authentication and RLS.
// Do not place the legacy session middleware in front of these routes.
app.use('/api/v1', sigcasRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta API SIGCAS no encontrada' });
});

app.use((error, _req, res, _next) => {
  console.error('[SIGCAS API]', error);
  const status = Number(error?.status || error?.statusCode || 500);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: error?.message || 'Error interno del servidor'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIGCAS-MSP UAT API en puerto ${PORT}`);
  });
}

export default app;
