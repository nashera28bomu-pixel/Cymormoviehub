const express = require('express');
const router = express.Router();

/**
 * Note: watchHistory is stored in memory. 
 * On Render Free Tier, this resets every 15 mins of inactivity.
 */
let watchHistory = [];

// GET: Generate Streaming & Download Links
router.get('/sources/:type/:id/:season?/:episode?', (req, res) => {
  const { type, id, season, episode } = req.params;
  
  // Base external player providers (Commonly used in these types of projects)
  // These usually handle the subtitles and quality selection automatically
  const primaryProvider = type === 'movie' 
    ? `https://vidsrc.me/embed/movie?tmdb=${id}`
    : `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${season}&epi=${episode}`;

  const downloadLink = `https://downloadprovider.com/get?id=${id}&type=${type}`; // Placeholder for your DL logic

  res.json({
    success: true,
    meta: {
      type,
      id,
      season: season || null,
      episode: episode || null
    },
    stream: {
      embedUrl: primaryProvider,
      quality: ["720p", "1080p"],
      hasSubtitles: true
    },
    download: {
      url: downloadLink,
      note: "Subtitles are embedded in the MKV/MP4 file"
    }
  });
});

// POST: Save Progress (Timestamp & Episode info)
router.post('/save', (req, res) => {
  const { id, title, type, poster, season, episode, timestamp } = req.body;

  if (!id) return res.status(400).json({ success: false, message: 'ID required' });

  // Update existing entry or add new one
  const index = watchHistory.findIndex(item => item.id === id);
  const historyData = { 
    id, title, type, poster, season, episode, timestamp, 
    updatedAt: new Date() 
  };

  if (index !== -1) {
    watchHistory[index] = historyData;
  } else {
    watchHistory.unshift(historyData);
  }

  // Keep only last 20 items to save memory
  watchHistory = watchHistory.slice(0, 20);

  res.json({
    success: true,
    message: 'Progress saved'
  });
});

// GET: Get specific history
router.get('/history', (req, res) => {
  res.json({
    success: true,
    history: watchHistory
  });
});

module.exports = router;
