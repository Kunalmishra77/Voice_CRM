import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes.js';
import net from 'net';

dotenv.config();

const app = express();
const INITIAL_PORT = Number(process.env.PORT) || 3010;
const API_KEY = process.env.API_KEY || 'dev_key_2026';
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Auth Middleware
const authGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (DISABLE_AUTH) return next();
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// Root & Health
app.get('/', (req, res) => res.json({ ok: true, service: 'whatsapp-crm-supabase' }));
app.get('/health', (req, res) => res.json({ ok: true }));

// Protected Routes
app.use('/api', authGuard, routes);

// Port Auto-Increment Logic
function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`
🚀 Backend is running!
📡 URL: http://localhost:${port}
🔐 Auth: ${DISABLE_AUTH ? 'DISABLED (Local Dev)' : 'ENABLED'}
    `);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(INITIAL_PORT);
