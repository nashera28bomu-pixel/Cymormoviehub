const express = require('express');
const router = express.Router();

const {
  getRecommendations
} = require('../services/tmdbService');

router.get('/recommend/:type/:id', async (req, res) => {

  const data = await getRecommendations(
    req.params.type,
    req.params.id
  );

  const smartRecommendations = data.results.slice(0, 12);

  res.json({
    success: true,
    recommendations: smartRecommendations
  });

});

module.exports = router;
