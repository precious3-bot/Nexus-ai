import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import workspacesRouter from './routes/workspaces.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { getAuthenticatedUser } from './middleware/auth.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.get('/', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    return res.redirect('/dashboard');
  }
  return res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/auth.html', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    return res.redirect('/dashboard');
  }
  return res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/dashboard', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProduction ? 31557600000 : 0 }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus AI is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/readyz', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/workspaces', workspacesRouter);

app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Nexus AI server running on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

export default app;
