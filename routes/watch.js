const express = require('express');
const router = express.Router();

let watchHistory = [];

router.post('/save', (req, res) => {

  const data = req.body;

  watchHistory.push(data);

  res.json({
    success: true,
    message: 'Watch history saved'
  });

});

router.get('/history', (req, res) => {

  res.json({
    success: true,
    history: watchHistory
  });

});

module.exports = router;
