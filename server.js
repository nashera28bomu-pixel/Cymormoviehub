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

/* =========================
   RENDER / PROXY FIX
========================= */

app.set("trust proxy", 1);

/* =========================
   CACHE
========================= */

const cache = new NodeCache({
    stdTTL: 900,
    checkperiod: 120
});

/* =========================
   BASIC MIDDLEWARE
========================= */

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(compression());

app.use(cors());

/* =========================
   SECURITY
========================= */

app.use(
    helmet({
        crossOriginEmbedderPolicy: false,

        contentSecurityPolicy: {
            directives: {

                defaultSrc: ["'self'"],

                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com"
                ],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com",
                    "https://fonts.googleapis.com"
                ],

                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "data:"
                ],

                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://image.tmdb.org",
                    "https://i.imgur.com",
                    "https://via.placeholder.com"
                ],

                frameSrc: [
                    "'self'",
                    "https://vidsrc.to",
                    "https://vidsrc.me",
                    "https://2embed.cc",
                    "https://multiembed.mov",
                    "https://superembed.stream"
                ],

                connectSrc: [
                    "'self'",
                    "https://api.themoviedb.org"
                ]
            }
        }
    })
);

/* =========================
   RATE LIMITER
========================= */

const apiLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 150,

    message: {
        success: false,
        error: "Too many requests. Please try again later."
    },

    standardHeaders: true,

    legacyHeaders: false
});

app.use("/api/", apiLimiter);

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   TMDB CONFIG
========================= */

const TMDB_URL = "https://api.themoviedb.org/3";

const TMDB_KEY = process.env.TMDB_API_KEY;

if (!TMDB_KEY) {
    console.log("❌ Missing TMDB_API_KEY in .env");
}

/* =========================
   TMDB FETCH HELPER
========================= */

async function fetchTMDB(endpoint, params = {}) {

    try {

        const cacheKey =
            endpoint + JSON.stringify(params);

        // CACHE HIT

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        // API REQUEST

        const response = await axios.get(
            `${TMDB_URL}${endpoint}`,
            {
                params: {
                    api_key: TMDB_KEY,
                    ...params
                }
            }
        );

        // STORE CACHE

        cache.set(cacheKey, response.data);

        return response.data;

    } catch (error) {

        console.log("TMDB ERROR:", error.message);

        throw error;
    }
}

/* =========================
   PAGE ROUTES
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});

app.get("/movies", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "movies.html")
    );

});

app.get("/watch", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "watch.html")
    );

});

/* =========================
   API ROUTES
========================= */

/* TRENDING */

app.get("/api/trending", async (req, res) => {

    try {

        const data = await fetchTMDB(
            "/trending/all/day"
        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* POPULAR */

app.get("/api/popular", async (req, res) => {

    try {

        const data = await fetchTMDB(
            "/movie/popular"
        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* TOP RATED */

app.get("/api/toprated", async (req, res) => {

    try {

        const data = await fetchTMDB(
            "/movie/top_rated"
        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* MOVIE / TV DETAILS */

app.get("/api/details/:id", async (req, res) => {

    try {

        const type = req.query.type || "movie";

        const data = await fetchTMDB(

            `/${type}/${req.params.id}`,

            {
                append_to_response:
                    "credits,videos,recommendations,similar"
            }

        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* TV SEASONS */

app.get("/api/tv/:id/season/:number", async (req, res) => {

    try {

        const data = await fetchTMDB(

            `/tv/${req.params.id}/season/${req.params.number}`

        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* SEARCH */

app.get("/api/search", async (req, res) => {

    try {

        const query = req.query.q;

        if (!query) {

            return res.status(400).json({
                success: false,
                error: "Search query missing"
            });

        }

        const data = await fetchTMDB(

            "/search/multi",

            {
                query
            }

        );

        res.json(data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/* =========================
   404 API HANDLER
========================= */

app.use("/api/*", (req, res) => {

    res.status(404).json({
        success: false,
        error: "API route not found"
    });

});

/* =========================
   FRONTEND FALLBACK
========================= */

app.get("*", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`
========================================
🎬 CYMOR MOVIE HUB RUNNING
🌍 PORT: ${PORT}
⚡ STATUS: ONLINE
========================================
`);

});
