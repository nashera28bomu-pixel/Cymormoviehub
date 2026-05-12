require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

// Layered rate limiting
const { generalLimiter, strictLimiter } = require('./middleware/rateLimiter');

const tmdbRoutes = require('./routes/tmdb');
const trailerRoutes = require('./routes/trailers');
const subtitleRoutes = require('./routes/subtitles');
const aiRoutes = require('./routes/ai');
const watchRoutes = require('./routes/watch');

const app = express();

/* --- MIDDLEWARE --- */

// 1. Security & Performance
app.use(express.json());
app.use(compression());
app.use(morgan('dev'));

// 2. Global Rate Limiting (Applies to all routes)
app.use(generalLimiter);

// 3. Relaxed Helmet for Media Streaming
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Useful if you're embedding external players
}));

// 4. Global CORS (Allows Vercel to communicate with Render)
app.use(cors()); 

/* --- SECURE ROUTES --- */

// Apply Strict Limiter to Search and AI before the general route definitions
app.use('/api/tmdb/search', strictLimiter);
app.use('/api/ai', strictLimiter);

/* --- APP ROUTES --- */

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cymor Movie Hub Backend Running (v10.0)'
  });
});

app.use('/api/tmdb', tmdbRoutes);
app.use('/api/trailers', trailerRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/watch', watchRoutes);

/* --- ERROR HANDLING --- */

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
