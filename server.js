const express = require("express");
const axios = require("axios");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 900 }); // 15-minute cache

// Middleware
app.use(express.json());
app.use(compression());
app.use(cors());

// Premium Security: Allowing streaming embeds while protecting the app
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
      frameSrc: ["'self'", "https://vidsrc.to", "https://vidsrc.me", "https://superembed.stream", "https://2embed.cc"],
      connectSrc: ["'self'", "https://api.themoviedb.org"]
    },
  },
}));

// Prevent API abuse
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.static("public"));

const TMDB_URL = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

// Helper for TMDB requests with automatic caching
async function fetchTMDB(endpoint, params = {}) {
  const cacheKey = endpoint + JSON.stringify(params);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await axios.get(`${TMDB_URL}${endpoint}`, {
    params: { api_key: KEY, ...params }
  });

  cache.set(cacheKey, res.data);
  return res.data;
}

// --- PAGE ROUTES ---
// These ensure that navigating to /movies or /watch actually loads your HTML files

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/movies', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'movies.html'));
});

app.get('/watch', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});

// --- API ROUTES ---

// 1. Details Route (Cast, Suggestions, Videos)
app.get("/api/details/:id", async (req, res) => {
  try {
    const type = req.query.type || 'movie';
    const data = await fetchTMDB(`/${type}/${req.params.id}`, {
      append_to_response: "credits,videos,recommendations,similar"
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TV Season/Episode Route
app.get("/api/tv/:id/season/:number", async (req, res) => {
  try {
    const data = await fetchTMDB(`/tv/${req.params.id}/season/${req.params.number}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Category Routes (Trending, Popular, Top Rated)
app.get("/api/trending", async (req, res) => {
  try {
    const data = await fetchTMDB("/trending/all/day");
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

// 4. Search Route
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    const data = await fetchTMDB("/search/multi", { query: q });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cymor Movie Hub Running on port ${PORT}`);
});
