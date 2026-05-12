const express = require('express');
const router = express.Router();

// A helper function to simulate fetching real subtitles for a specific ID
// In a production app, you would fetch these from an API like OpenSubtitles
const getSubtitlesForMovie = (movieId) => {
  return [
    { label: 'English', lang: 'en', src: `https://api.subtitleprovider.com/en/${movieId}.vtt` },
    { label: 'Spanish', lang: 'es', src: `https://api.subtitleprovider.com/es/${movieId}.vtt` },
    { label: 'French', lang: 'fr', src: `https://api.subtitleprovider.com/fr/${movieId}.vtt` },
    { label: 'Arabic', lang: 'ar', src: `https://api.subtitleprovider.com/ar/${movieId}.vtt` },
    { label: 'Swahili', lang: 'sw', src: `https://api.subtitleprovider.com/sw/${movieId}.vtt` },
    { label: 'Hindi', lang: 'hi', src: `https://api.subtitleprovider.com/hi/${movieId}.vtt` }
  ];
};

router.get('/:id', async (req, res) => {
  const movieId = req.params.id;

  try {
    // We pass the movieId to ensure the links generated are unique to that film
    const subtitles = getSubtitlesForMovie(movieId);

    res.json({
      success: true,
      movieId: movieId,
      subtitles: subtitles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load subtitles"
    });
  }
});

module.exports = router;
