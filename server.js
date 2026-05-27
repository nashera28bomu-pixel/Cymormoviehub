/**
 * =========================================================
 * CYMOR MOVIE HUB v4.0
 * NETFLIX-STYLE STREAMING BACKEND
 * ✅ Stable Streaming Providers
 * ✅ Render Free Tier Optimized
 * ✅ Subtitle Proxy
 * ✅ TMDB Secure Proxy
 * ✅ Multi-Server Fallback
 * ✅ Mobile Playback Optimized
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

const TMDB_KEY = process.env.TMDB_API_KEY;
const OPENSUBTITLES_KEY =
    process.env.OPENSUBTITLES_KEY ||
    'Wr5qZLMGG28QgGRXI5vHmBHsN1Bt2GMm';

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

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.'
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

/**
 * =========================================================
 * STREAM PROVIDERS
 * =========================================================
 */

function buildPrimaryStream(id, type, season, episode) {
    type = normalizeType(type);

    if (type === 'tv') {
        return `https://embed.su/embed/tv/${id}/${season || 1}/${episode || 1}`;
    }

    return `https://embed.su/embed/movie/${id}`;
}

function buildFallbackStream(id, type, season, episode) {
    type = normalizeType(type);

    if (type === 'tv') {
        return `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}`;
    }

    return `https://vidlink.pro/tv/${id}`;
}

function buildThirdStream(id, type, season, episode) {
    type = normalizeType(type);

    if (type === 'tv') {
        return `https://moviesapi.club/tv/${id}-${season || 1}-${episode || 1}`;
    }

    return `https://moviesapi.club/movie/${id}`;
}

function buildDownloadLinks(id, type, s, e) {
    const base = `/api/download?id=${id}&type=${type}`;
    const ep = type === 'tv'
        ? `&s=${s || 1}&e=${e || 1}`
        : '';

    return {
        '1080p': `${base}&quality=1080${ep}`,
        '720p': `${base}&quality=720${ep}`,
        '480p': `${base}&quality=480${ep}`
    };
}

/**
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get('/health', async (req, res) => {
    res.json({
        success: true,
        app: 'Cymor Movie Hub',
        version: '4.0',
        status: 'online',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

/**
 * =========================================================
 * PROVIDER STATUS
 * =========================================================
 */

app.get('/api/ping', async (req, res) => {
    try {
        await axios.get('https://embed.su', {
            timeout: 5000
        });

        res.json({
            success: true,
            provider: 'online'
        });

    } catch (err) {
        res.json({
            success: false,
            provider: 'offline'
        });
    }
});

/**
 * =========================================================
 * STREAM SOURCE API
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

        const mediaType = normalizeType(type);

        const primary = buildPrimaryStream(id, mediaType, s, e);
        const fallback = buildFallbackStream(id, mediaType, s, e);
        const backup = buildThirdStream(id, mediaType, s, e);

        res.json({
            success: true,
            id,
            type: mediaType,

            stream: {
                primary,
                fallback,
                backup
            },

            downloads: buildDownloadLinks(
                id,
                mediaType,
                s,
                e
            ),

            subtitleEndpoint:
                `/api/subtitles?id=${id}&type=${mediaType}` +
                `${mediaType === 'tv'
                    ? `&s=${s}&e=${e}`
                    : ''
                }`,

            autoplay: true,
            ads: false,
            server: 'Cymor Edge Streaming v4'
        });

    } catch (err) {

        console.error('STREAM ERROR:', err.message);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch stream'
        });
    }
});

/**
 * =========================================================
 * SUBTITLE API
 * =========================================================
 */

app.get('/api/subtitles', async (req, res) => {

    try {

        const {
            id,
            type = 'movie',
            s = 1,
            e = 1,
            lang = 'en'
        } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Missing TMDB ID'
            });
        }

        const params = {
            tmdb_id: id,
            languages: lang,
            type: type === 'tv'
                ? 'episode'
                : 'movie'
        };

        if (type === 'tv') {
            params.season_number = s;
            params.episode_number = e;
        }

        const response = await axios.get(
            'https://api.opensubtitles.com/api/v1/subtitles',
            {
                params,
                headers: {
                    'Api-Key': OPENSUBTITLES_KEY,
                    'Content-Type': 'application/json',
                    'User-Agent': 'CymorHub v4'
                },
                timeout: 8000
            }
        );

        const data = response.data?.data || [];

        const tracks = data.slice(0, 10).map(item => {

            const attrs = item.attributes;
            const file = attrs.files?.[0];

            return {
                id: file?.file_id,
                language: attrs.language,
                label: attrs.language?.toUpperCase(),
                downloadUrl: file
                    ? `/api/subtitle-file?file_id=${file.file_id}`
                    : null
            };

        }).filter(t => t.downloadUrl);

        res.json({
            success: true,
            count: tracks.length,
            tracks
        });

    } catch (err) {

        console.error('SUBTITLE ERROR:', err.message);

        res.json({
            success: true,
            count: 0,
            tracks: []
        });
    }
});

/**
 * =========================================================
 * SUBTITLE FILE PROXY
 * =========================================================
 */

app.get('/api/subtitle-file', async (req, res) => {

    try {

        const { file_id } = req.query;

        if (!file_id) {
            return res.status(400).send('Missing file_id');
        }

        const tokenRes = await axios.post(
            'https://api.opensubtitles.com/api/v1/download',
            {
                file_id: Number(file_id),
                sub_format: 'webvtt'
            },
            {
                headers: {
                    'Api-Key': OPENSUBTITLES_KEY,
                    'Content-Type': 'application/json',
                    'User-Agent': 'CymorHub v4'
                }
            }
        );

        const downloadLink = tokenRes.data?.link;

        if (!downloadLink) {
            return res.status(404).send('Subtitle not found');
        }

        const fileRes = await axios.get(downloadLink, {
            responseType: 'stream'
        });

        res.setHeader(
            'Content-Type',
            'text/vtt; charset=utf-8'
        );

        res.setHeader(
            'Access-Control-Allow-Origin',
            '*'
        );

        fileRes.data.pipe(res);

    } catch (err) {

        console.error(
            'SUBTITLE FILE ERROR:',
            err.message
        );

        res.status(500).send(
            'Failed to fetch subtitle'
        );
    }
});

/**
 * =========================================================
 * DOWNLOAD API
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

        const mediaType = normalizeType(type);

        let downloadUrl = '';

        if (mediaType === 'tv') {

            downloadUrl =
                `https://dl.vidsrc.vip/tv/${id}/${s}/${e}`;

        } else {

            downloadUrl =
                `https://dl.vidsrc.vip/movie/${id}`;
        }

        res.json({
            success: true,
            id,
            type: mediaType,
            quality,
            primaryUrl: downloadUrl
        });

    } catch (err) {

        console.error(
            'DOWNLOAD ERROR:',
            err.message
        );

        res.status(500).json({
            success: false,
            message: 'Download generation failed'
        });
    }
});

/**
 * =========================================================
 * TMDB PROXY
 * =========================================================
 */

app.get('/api/tmdb', async (req, res) => {

    try {

        const {
            path: tmdbPath,
            ...rest
        } = req.query;

        if (!TMDB_KEY) {
            return res.status(500).json({
                success: false,
                message: 'TMDB API key missing'
            });
        }

        if (!tmdbPath) {
            return res.status(400).json({
                success: false,
                message: 'Missing TMDB path'
            });
        }

        const tmdb = await axios.get(
            `https://api.themoviedb.org/3${tmdbPath}`,
            {
                params: {
                    api_key: TMDB_KEY,
                    ...rest
                },
                timeout: 10000
            }
        );

        res.json(tmdb.data);

    } catch (err) {

        console.error(
            'TMDB ERROR:',
            err.message
        );

        res.status(500).json({
            success: false,
            message: 'TMDB request failed'
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

        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Missing search query'
            });
        }

        const tmdb = await axios.get(
            'https://api.themoviedb.org/3/search/multi',
            {
                params: {
                    api_key: TMDB_KEY,
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

        console.error(
            'SEARCH ERROR:',
            err.message
        );

        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * =========================================================
 * RECOMMENDATIONS API
 * =========================================================
 */

app.get('/api/recommendations', async (req, res) => {

    try {

        const {
            id,
            type = 'movie'
        } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Missing ID'
            });
        }

        const mediaType = normalizeType(type);

        const tmdb = await axios.get(
            `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations`,
            {
                params: {
                    api_key: TMDB_KEY
                },
                timeout: 10000
            }
        );

        res.json({
            success: true,
            results: tmdb.data.results || []
        });

    } catch (err) {

        console.error(
            'RECOMMENDATION ERROR:',
            err.message
        );

        res.status(500).json({
            success: false,
            message: 'Recommendations failed'
        });
    }
});

/**
 * =========================================================
 * ROOT
 * =========================================================
 */

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * =========================================================
 * 404
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
 * START SERVER
 * =========================================================
 */

app.listen(PORT, () => {

    console.log(`
╔══════════════════════════════════════╗
║      CYMOR MOVIE HUB v4 ONLINE      ║
╠══════════════════════════════════════╣
║ PORT      : ${PORT}
║ PRIMARY   : embed.su
║ FALLBACK  : vidlink.pro
║ SUBTITLES : OpenSubtitles
║ STATUS    : ONLINE ✅
╚══════════════════════════════════════╝
`);
});
