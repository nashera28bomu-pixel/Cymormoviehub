require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

// 1. IMPORT RATE LIMITERS
const { generalLimiter, strictLimiter } = require('./middleware/rateLimiter');

// 2. ROUTE IMPORTS
const tmdbRoutes = require('./routes/tmdb');
const trailerRoutes = require('./routes/trailers');
const subtitleRoutes = require('./routes/subtitles');
const aiRoutes = require('./routes/ai');
const watchRoutes = require('./routes/watch');

const app = express();

/* --- GLOBAL MIDDLEWARE --- */

app.use(express.json());
app.use(compression());
app.use(morgan('dev'));

// Security: Relaxed for Third-Party Embeds (VidSrc/TMDB)
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, 
}));

// CORS: Full access for Vercel/Localhost
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Apply General Rate Limit to all requests
app.use(generalLimiter);

/* --- SECURE API ROUTES --- */

// Apply Strict Limiter specifically to heavy Search/AI routes
app.use('/api/tmdb/search', strictLimiter);
app.use('/api/ai', strictLimiter);

/* --- APP ROUTES --- */

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cymor Movie Hub Elite Backend v10.0 Online',
    timestamp: new Date()
  });
});

// Main Feature Routes
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/trailers', trailerRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/watch', watchRoutes);

/* --- ELITE FEATURE: STREAMING & PROGRESS --- */

/**
 * SOURCE SELECTOR
 * Maps the TMDB ID to the actual streaming provider
 */
app.get('/api/watch/sources/:type/:id/:season?/:episode?', (req, res) => {
  const { type, id, season, episode } = req.params;
  
  let embedUrl = "";
  if (type === 'movie') {
    embedUrl = `https://vidsrc.me/embed/movie?tmdb=${id}`;
  } else {
    embedUrl = `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${season || 1}&epi=${episode || 1}`;
  }

  res.json({
    success: true,
    stream: {
      embedUrl: embedUrl,
      downloadUrl: `https://vidsrc.me/download/movie?tmdb=${id}` // Proxy link for download
    }
  });
});

/**
 * CONTINUE WATCHING LOGIC
 * (Use a database like MongoDB here for permanent storage)
 */
let memoryHistory = []; 

app.post('/api/watch/save-progress', (req, res) => {
  const { id, type, title, poster } = req.body;
  
  // Prevent duplicates
  memoryHistory = memoryHistory.filter(item => item.id !== id);
  memoryHistory.unshift({ id, type, title, poster, date: new Date() });

  if (memoryHistory.length > 20) memoryHistory.pop(); // Keep it lean
  res.json({ success: true });
});

/* --- ERROR HANDLING --- */

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error("SERVER_ERROR:", err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Cymor Hub running at: http://localhost:${PORT}`);
});
