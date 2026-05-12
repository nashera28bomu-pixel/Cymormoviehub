const express = require('express');
const router = express.Router();

router.get('/:id', async (req, res) => {

  res.json({
    success: true,
    subtitles: [
      {
        language: 'English',
        file: '/subtitles/sample-en.vtt'
      },
      {
        language: 'French',
        file: '/subtitles/sample-fr.vtt'
      }
    ]
  });

});

module.exports = router;
