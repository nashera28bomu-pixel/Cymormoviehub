const express = require('express');
const router = express.Router();

const {
  fetchTrending,
  fetchPopularMovies,
  fetchPopularSeries, // New
  fetchByGenre,       // New
  search,
  getMovieDetails,
  getRecommendations,
  getTvShowDetails    // New
} = require('../services/tmdbService');

// 1. Trending (For the big Hero section)
router.get('/trending', async (req, res) => {
  const data = await fetchTrending();
  res.json(data);
});

// 2. Popular Movies (Horizontal Row 1)
router.get('/movies', async (req, res) => {
  const data = await fetchPopularMovies();
  res.json(data);
});

// 3. Popular Series (Horizontal Row 2 - Essential for your goal UI)
router.get('/series', async (req, res) => {
  try {
    const data = await fetchPopularSeries();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

// 4. Categories / Genres (Nollywood/Hollywood Logic)
// Example: /api/tmdb/category/nollywood
router.get('/category/:type', async (req, res) => {
  const { type } = req.params;
  let genreId;

  if (type === 'nollywood') {
    // In TMDB, Nollywood is usually filtered by Region (NG) or specific genre combos
    const data = await fetchByGenre({ region: 'NG', with_original_language: 'en' });
    return res.json(data);
  }
  
  const data = await fetchByGenre({ with_genres: genreId });
  res.json(data);
});

// 5. SEARCH
router.get('/search', async (req, res) => {
  const data = await search(req.query.q);
  res.json(data);
});

// 6. ENHANCED DETAILS (Includes Seasons/Episodes for TV)
router.get('/details/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  
  try {
    let data;
    if (type === 'tv') {
      // Must fetch with "append_to_response=content_ratings,credits,videos"
      data = await getTvShowDetails(id); 
    } else {
      data = await getMovieDetails(type, id);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Details not found" });
  }
});

router.get('/recommendations/:type/:id', async (req, res) => {
  const data = await getRecommendations(req.params.type, req.params.id);
  res.json(data);
});

module.exports = router;
