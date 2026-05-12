const express = require("express");

const router = express.Router();

const SERVERS = {
  vidsrc: (id, type) =>
    `https://vidsrc.me/embed/${type}?tmdb=${id}`,

  superembed: (id) =>
    `https://multiembed.mov/?video_id=${id}&tmdb=1`
};

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const type = req.query.type || "movie";

  res.json({
    vidsrc: SERVERS.vidsrc(id, type),
    superembed: SERVERS.superembed(id)
  });
});

module.exports = router;
