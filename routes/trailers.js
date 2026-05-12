const express = require('express');
const router = express.Router();

const {
  getMovieVideos
} = require('../services/tmdbService');

router.get('/:type/:id', async (req, res) => {

  const data = await getMovieVideos(
    req.params.type,
    req.params.id
  );

  const trailers = data.results.filter(
    video =>
      video.site === 'YouTube' &&
      video.type === 'Trailer'
  );

  res.json({
    success: true,
    trailers
  });
});

module.exports = router;
