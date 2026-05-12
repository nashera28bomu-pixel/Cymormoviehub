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

app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(rateLimiter);

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
