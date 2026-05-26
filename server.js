/**
 * =========================================================
 * CYMOR MOVIE HUB — ELITE STREAMING SERVER
 * Optimized For Render Free Tier
 * No Puppeteer • No Heavy RAM Usage • Fast Startup
 * =========================================================
 */

const express = require('express');
const axios = require('axios');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * =========================================================
 * SECURITY + PERFORMANCE
 * =========================================================
 */

app.use(compression());

app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: {
        success: false,
        message: 'Too many requests. Slow down.'
    }
});

app.use('/api', apiLimiter);

/**
 * =========================================================
 * STATIC FILES
 * =========================================================
 */

app.use(express.static(path.join(__dirname)));

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeType(type) {
    return type === 'tv' ? 'tv' : 'movie';
}

function buildEmbedUrl(id, type, season, episode) {
    type = normalizeType(type);

    if (type === 'tv') {
        return `https://vidsrc.to/embed/tv/${id}/${season || 1}/${episode || 1}`;
    }

    return `https://vidsrc.to/embed/movie/${id}`;
}

function buildDownloadLinks(id, type) {
    return {
        ultra: `/api/download?id=${id}&type=${type}&quality=1080`,
        hd: `/api/download?id=${id}&type=${type}&quality=720`,
        sd: `/api/download?id=${id}&type=${type}&quality=480`,
        mobile: `/api/download?id=${id}&type=${type}&quality=360`
    };
}

/**
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get('/health', (req, res) => {
    res.json({
        success: true,
        app: 'Cymor Movie Hub',
        status: 'online',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

/**
 * =========================================================
 * STREAM SOURCE API
 * Frontend requests streaming source here
 * =========================================================
 */

app.get('/api/get-source', async (req, res) => {
    try {
        const {
            id,
            type = 'movie',
            s = 1,
            e = 1
        } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Missing TMDB ID'
            });
        }

        const embedUrl = buildEmbedUrl(id, type, s, e);

        res.json({
            success: true,
            id,
            type,
            stream: {
                embed: embedUrl
            },
            downloads: buildDownloadLinks(id, type),
            subtitles: true,
            autoplay: true,
            server: 'Cymor Edge Streaming',
            ads: false
        });

    } catch (err) {
        console.error('STREAM ERROR:', err.message);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch stream source'
        });
    }
});

/**
 * =========================================================
 * DOWNLOAD API
 * Lightweight Redirect System
 * Keeps Render Free Tier Stable
 * =========================================================
 */

app.get('/api/download', async (req, res) => {
    try {
        const {
            id,
            type = 'movie',
            quality = '720',
            s = 1,
            e = 1
        } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Missing TMDB ID'
            });
        }

        /**
         * =====================================================
         * LIGHTWEIGHT DOWNLOAD REDIRECT
         * =====================================================
         * Avoids:
         * - Huge bandwidth costs
         * - Render memory crashes
         * - ffmpeg processing
         * - video buffering on server
         * =====================================================
         */

        let redirectUrl = '';

        if (type === 'tv') {
            redirectUrl =
                `https://vidsrc.to/embed/tv/${id}/${s}/${e}`;
        } else {
            redirectUrl =
                `https://vidsrc.to/embed/movie/${id}`;
        }

        res.json({
            success: true,
            quality,
            provider: 'VidSrc',
            redirect: redirectUrl,
            note: 'Frontend can now process external downloader or native player.',
            no_ads: true
        });

    } catch (err) {
        console.error('DOWNLOAD ERROR:', err.message);

        res.status(500).json({
            success: false,
            message: 'Download generation failed'
        });
    }
});

/**
 * =========================================================
 * RECOMMENDATION API
 * Ready For Frontend Ingestion
 * =========================================================
 */

app.get('/api/recommendations', async (req, res) => {
    try {
        const { id, type, apiKey } = req.query;

        if (!id || !apiKey) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const mediaType = normalizeType(type);

        const tmdb = await axios.get(
            `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations`,
            {
                params: {
                    api_key: apiKey
                },
                timeout: 10000
            }
        );

        res.json({
            success: true,
            results: tmdb.data.results || []
        });

    } catch (err) {
        console.error('RECOMMENDATION ERROR:', err.message);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch recommendations'
        });
    }
});

/**
 * =========================================================
 * SEARCH API
 * =========================================================
 */

app.get('/api/search', async (req, res) => {
    try {
        const { query, apiKey } = req.query;

        if (!query || !apiKey) {
            return res.status(400).json({
                success: false,
                message: 'Missing search query or TMDB key'
            });
        }

        const tmdb = await axios.get(
            'https://api.themoviedb.org/3/search/multi',
            {
                params: {
                    api_key: apiKey,
                    query
                },
                timeout: 10000
            }
        );

        res.json({
            success: true,
            results: tmdb.data.results || []
        });

    } catch (err) {
        console.error('SEARCH ERROR:', err.message);

        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * =========================================================
 * FALLBACK ROUTES
 * =========================================================
 */

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * =========================================================
 * 404 HANDLER
 * =========================================================
 */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

/**
 * =========================================================
 * SERVER START
 * =========================================================
 */

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║        CYMOR MOVIE HUB ONLINE       ║
╠══════════════════════════════════════╣
║ PORT: ${PORT}
║ MODE: Render Free Tier Optimized
║ STREAMING: Active
║ DOWNLOADS: Active
║ ADS: Disabled
║ STATUS: Stable
╚══════════════════════════════════════╝
    `);
});
