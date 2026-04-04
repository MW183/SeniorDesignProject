import "dotenv/config";  
import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';

import usersRouter from "./routes/users.js";
import vendorsRouter from "./routes/vendors.js";
import addressRouter from "./routes/address.js";
import tasksRouter from "./routes/tasks.js";
import weddingsRouter from "./routes/weddings.js";
import authRouter from "./routes/auth.js";
import weddingTemplatesRouter from "./routes/weddingTemplates.js";
import templateCategoriesRouter from "./routes/templateCategories.js";
import templateTasksRouter from "./routes/templateTasks.js";
import taskCategoriesRouter from "./routes/taskCategories.js";

const app = express();

// CORS configuration to allow credentials from frontend
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

if (process.env.NODE_ENV === 'production') {
  // Production: Strict whitelist only
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.APP_URL
  ].filter(Boolean);

  corsOptions.origin = allowedOrigins;
  console.log('CORS (production):', allowedOrigins);
} else {
  // Development: Allow local + curl/Postman requests
  corsOptions.origin = function (origin, callback) {
    const devOrigins = [
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (!origin || devOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  };
  console.log('CORS (development): permissive mode');
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Root status endpoint to make visiting the base URL useful
app.get('/', (req, res) => {
  // If the client prefers HTML (a browser), return a simple landing page
  const accept = req.headers.accept || '';
  const info = {
    status: 'ok',
    message: 'Wedding planner API',
    endpoints: {
      users: '/users',
      vendors: '/vendors',
      addresses: '/address',
      tasks: '/tasks',
      weddings: '/weddings',
      auth: '/auth',
      weddingTemplates: '/wedding-templates',
      templateCategories: '/template-categories',
      templateTasks: '/template-tasks',
      taskCategories: '/task-categories'
    }
  };

  if (accept.includes('text/html')) {
    // Simple styled HTML page with links to endpoints
    res.send(`<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Wedding Planner API</title>
        <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:40px}h1{color:#333}ul{line-height:1.6}</style>
      </head>
      <body>
        <h1>Wedding Planner API</h1>
        <p>Status: <strong>${info.status}</strong> — ${info.message}</p>
        <h2>Endpoints</h2>
        <ul>
          <li><a href="/users">/users</a> — Users collection</li>
          <li><a href="/vendors">/vendors</a> — Vendors collection</li>
          <li><a href="/address">/address</a> — Addresses collection</li>
          <li><a href="/tasks">/tasks</a> — Tasks collection</li>
          <li><a href="/weddings">/weddings</a> — Weddings collection</li>
          <li><a href="/auth">/auth</a> — Authentication</li>
          <li><a href="/wedding-templates">/wedding-templates</a> — Wedding Templates</li>
          <li><a href="/template-categories">/template-categories</a> — Template Categories</li>
          <li><a href="/template-tasks">/template-tasks</a> — Template Tasks</li>
          <li><a href="/task-categories">/task-categories</a> — Task Categories</li>
        </ul>
        <h3>Utilities</h3>
        <ul>
          <li><a href="/healthz">/healthz</a> — Health check (200 OK)</li>
        </ul>
        <p>Use <code>?format=json</code> or set Accept header to <code>application/json</code> to get JSON output.</p>
      </body>
      </html>`);
    return;
  }

  // Default to JSON response
  if (req.query.format === 'json' || accept.includes('application/json') || !accept) {
    res.json(info);
    return;
  }

  // Fallback to JSON
  res.json(info);
});

// Health-check endpoint for monitoring
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount routers
app.use('/users', usersRouter);
app.use('/vendors', vendorsRouter);
app.use('/address', addressRouter);
app.use('/tasks', tasksRouter);
app.use('/weddings', weddingsRouter);
app.use('/auth', authRouter);
app.use('/wedding-templates', weddingTemplatesRouter);
app.use('/template-categories', templateCategoriesRouter);
app.use('/template-tasks', templateTasksRouter);
app.use('/task-categories', taskCategoriesRouter);

const PORT = process.env.PORT || 3000;

let serverInstance = null;


// Global error handler (after all routes)
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);

  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) return next(err);

  // Use error status if provided, otherwise default to 500
  const status = err.status || 500;

  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Something went wrong',
  });
});
if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
