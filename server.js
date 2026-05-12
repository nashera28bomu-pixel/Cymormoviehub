const express = require("express");
const axios = require("axios");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 900 }); 

// Middleware
app.use(express.json());
app.use(compression());

// Updated Helmet: Specifically allowing vidsrc and superembed for streaming/subs
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
      frameSrc: ["'self'", "https://vidsrc.to", "https://vidsrc.me", "https://superembed.stream"],
      connectSrc: ["'self'", "https://api.themoviedb.org"]
    },
  },
}));

app.use(cors());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.static("public"));

const TMDB = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

async function fetchTMDB(endpoint, params = {}) {
  const cacheKey = endpoint + JSON.stringify(params);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const res = await axios.get(`${TMDB}${endpoint}`, {
    params: { api_key: KEY, ...params }
  });

  cache.set(cacheKey, res.data);
  return res.data;
}

// --- API ROUTES ---

// 1. THE ALL-IN-ONE DETAILS ROUTE (Crucial for the Watch Page)
app.get("/api/details/:id", async (req, res) => {
  try {
    const type = req.query.type || 'movie'; // handles 'movie' or 'tv'
    // append_to_response gets everything for the info, cast, and suggestions tabs at once
    const data = await fetchTMDB(`/${type}/${req.params.id}`, {
      append_to_response: "credits,videos,recommendations,similar"
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TV SEASON/EPISODE ROUTE (For the Episode Grid in Screenshot 4)
app.get("/api/tv/:id/season/:number", async (req, res) => {
  try {
    const data = await fetchTMDB(`/tv/${req.params.id}/season/${req.params.number}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    const resData = await axios.get(`${TMDB}/search/multi`, {
      params: { api_key: KEY, query: q }
    });
    res.json(resData.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cymor Movie Hub Running on port ${PORT}`);
});
