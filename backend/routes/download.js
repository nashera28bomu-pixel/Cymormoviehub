const express = require("express");
const ytDlp = require("yt-dlp-exec");
const path = require("path");

const router = express.Router();

router.get("/video", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({
        error: "Video URL missing"
      });
    }

    const output = path.resolve(
      __dirname,
      `../downloads/%(title)s.%(ext)s`
    );

    await ytDlp(url, {
      output,
      format: "bestvideo+bestaudio",
      mergeOutputFormat: "mp4"
    });

    res.json({
      success: true,
      message: "Download complete"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
