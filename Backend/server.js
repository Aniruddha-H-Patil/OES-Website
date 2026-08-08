// Root directory se .env load karne ke liye path
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

// MVC Module Imports
const { initDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to Frontend folder (Backend ke ek level upar)
const FRONTEND_PATH = path.join(__dirname, '../Frontend');

// ENVIRONMENT CHECK
const envMode = process.env.NODE_ENV || 'development';
const IS_PROD = envMode === 'production';

// 1. TRUST PROXY
app.set('trust proxy', 1);

// 2. SECURITY & DYNAMIC CORS
app.use(helmet({ contentSecurityPolicy: false }));

// Allowed origins array (Local ports ALWAYS allowed)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

// Env se CLIENT_URL padhega (comma-separated URLs allowed)
if (process.env.CLIENT_URL) {
  const clientUrls = process.env.CLIENT_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...clientUrls);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin [${origin}] not allowed`));
    }
  },
  credentials: true
}));

// 3. PARSERS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. INITIALIZE DB SCHEMA
initDB();

// 5. STATIC FILES (Frontend ke saare folders - css, js, assets, etc. Auto-Serve honge)
app.use('/', express.static(FRONTEND_PATH));
app.use(express.static(FRONTEND_PATH));

// 6. VIEW ROUTES
app.get(['/', '/OES'], (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'OES.html')));
app.get('/form', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'form.html')));
app.get('/Contact', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'Contact.html')));

// 7. API ROUTES
app.use('/api', authRoutes);

// 8. 404 FALLBACK
app.use((req, res) => res.status(404).sendFile(path.join(FRONTEND_PATH, '404.html')));

// 9. CENTRALIZED GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(`[ERROR]: ${err.stack || err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: IS_PROD ? 'Internal Server Error' : err.message
  });
});

// SERVER START
app.listen(PORT, () => {
  console.log(`🚀 Registration Web Portal Running in [${envMode.toUpperCase()}] mode on http://localhost:${PORT}`);
});