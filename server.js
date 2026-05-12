const express = require("express");
const axios = require("axios");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(cors());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.static("public"));

const TMDB = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

async function fetchTMDB(endpoint) {
  const cacheKey = endpoint;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const res = await axios.get(
    `${TMDB}${endpoint}?api_key=${KEY}`
  );

  cache.set(cacheKey, res.data);

  return res.data;
}

app.get("/api/trending", async (req, res) => {
  try {
    const data = await fetchTMDB("/trending/movie/week");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/popular", async (req, res) => {
  try {
    const data = await fetchTMDB("/movie/popular");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/toprated", async (req, res) => {
  try {
    const data = await fetchTMDB("/movie/top_rated");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;

    const resData = await axios.get(
      `${TMDB}/search/movie?api_key=${KEY}&query=${q}`
    );

    res.json(resData.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trailer/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `${TMDB}/movie/${req.params.id}/videos?api_key=${KEY}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/recommend/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `${TMDB}/movie/${req.params.id}/recommendations?api_key=${KEY}`
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Cymor Movie Hub Running");
});
