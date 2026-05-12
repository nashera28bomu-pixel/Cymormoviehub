require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const rateLimiter = require('./middleware/rateLimiter');

const tmdbRoutes = require('./routes/tmdb');
const trailerRoutes = require('./routes/trailers');
const subtitleRoutes = require('./routes/subtitles');
const aiRoutes = require('./routes/ai');
const watchRoutes = require('./routes/watch');

const app = express();

/* MIDDLEWARE */
app.use(express.json());
app.use(compression());

// Updated Helmet to allow cross-origin resource sharing for images/media
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(morgan('dev'));

// Updated CORS to allow all origins - fixes the blank screen issue on Vercel
app.use(cors()); 

app.use(rateLimiter);

/* ROUTES */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cymor Movie Hub Backend Running'
  });
});

app.use('/api/tmdb', tmdbRoutes);
app.use('/api/trailers', trailerRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/watch', watchRoutes);

/* ERROR HANDLING */
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
