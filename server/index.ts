import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { registerHub, corsOptionsFor } from './hub';

const app = express();
const httpServer = createServer(app);

app.use(cors(corsOptionsFor()));

app.use(express.json({ limit: '10mb' }));

// Basic security headers + request logging
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${ip}`);
  next();
});

// Mount every subsystem + agent WebSocket events on a single process.
registerHub(app, httpServer);

// Standalone agent server port. Kept on its own env var so it does not
// collide with the main app's PORT from .env.
const PORT = Number(process.env.AGENT_PORT || 3002);

// Auto-fall back to the next free port if this one is busy.
function startAt(port: number, attempts = 0) {
  const server = app.listen(port, () => {
    console.log(`DevForge Agent Server running on http://0.0.0.0:${port}`);
    console.log('WebSocket server ready for connections');
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attempts < 20) {
      console.warn(`Port ${port} in use — trying ${port + 1}…`);
      startAt(port + 1, attempts + 1);
    } else {
      console.error('Agent server failed to start:', err.message);
      process.exit(1);
    }
  });
}

startAt(PORT);