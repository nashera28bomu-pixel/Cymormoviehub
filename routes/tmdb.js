const express = require('express');
const router = express.Router();

const {
  fetchTrending,
  fetchPopularMovies,
  search,
  getMovieDetails,
  getRecommendations
} = require('../services/tmdbService');

router.get('/trending', async (req, res) => {
  const data = await fetchTrending();
  res.json(data);
});

router.get('/movies', async (req, res) => {
  const data = await fetchPopularMovies();
  res.json(data);
});

router.get('/search', async (req, res) => {
  const data = await search(req.query.q);
  res.json(data);
});

router.get('/details/:type/:id', async (req, res) => {
  const data = await getMovieDetails(
    req.params.type,
    req.params.id
  );

  res.json(data);
});

router.get('/recommendations/:type/:id', async (req, res) => {
  const data = await getRecommendations(
    req.params.type,
    req.params.id
  );

  res.json(data);
});

module.exports = router;
