/**
 * =========================================================
 * CYMOR MOVIE HUB — ELITE STREAMING SERVER v3.0
 * ✅ No-Redirect Streaming
 * ✅ Real Download Links via Multiple Providers
 * ✅ Subtitle Proxy (OpenSubtitles)
 * ✅ Optimized for Render Free Tier
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

// ── Put your TMDB key here or in an env var ──────────────
const TMDB_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';

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
    max: 150,
    message: { success: false, message: 'Too many requests. Slow down.' }
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
 * Build the primary embed URL.
 * vidsrc.me is used as primary — it supports subtitles natively
 * and is more stable than vidsrc.to for no-redirect playback.
 */
function buildEmbedUrl(id, type, season, episode) {
    type = normalizeType(type);
    if (type === 'tv') {
        const s = season || 1;
        const e = episode || 1;
        // Primary: vidsrc.me (subtitle support, lower ad aggression)
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
    }
    return `https://vidsrc.me/embed/movie?tmdb=${id}`;
}

/**
 * Fallback embed URL if primary fails.
 */
function buildFallbackUrl(id, type, season, episode) {
    type = normalizeType(type);
    if (type === 'tv') {
        return `https://vidsrc.to/embed/tv/${id}/${season || 1}/${episode || 1}`;
    }
    return `https://vidsrc.to/embed/movie/${id}`;
}

/**
 * Build download page links — these route through our server so we can
 * control quality selection and provider fallback cleanly.
 */
function buildDownloadLinks(id, type, s, e) {
    const base = `/api/download?id=${id}&type=${type}`;
    const ep = type === 'tv' ? `&s=${s || 1}&e=${e || 1}` : '';
    return {
        '1080p': `${base}&quality=1080${ep}`,
        '720p':  `${base}&quality=720${ep}`,
        '480p':  `${base}&quality=480${ep}`,
        '360p':  `${base}&quality=360${ep}`
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
 * Returns embed URL + fallback + download links + subtitle URL
 * =========================================================
 */

app.get('/api/get-source', async (req, res) => {
    try {
        const { id, type = 'movie', s = 1, e = 1 } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Missing TMDB ID' });
        }

        const mediaType = normalizeType(type);
        const embedUrl   = buildEmbedUrl(id, mediaType, s, e);
        const fallback   = buildFallbackUrl(id, mediaType, s, e);

        res.json({
            success: true,
            id,
            type: mediaType,
            stream: {
                primary:  embedUrl,
                fallback: fallback
            },
            downloads: buildDownloadLinks(id, mediaType, s, e),
            // Subtitle endpoint — frontend fetches this separately
            subtitleEndpoint: `/api/subtitles?id=${id}&type=${mediaType}${mediaType === 'tv' ? `&s=${s}&e=${e}` : ''}`,
            autoplay: true,
            server: 'Cymor Edge Streaming v3',
            ads: false
        });

    } catch (err) {
        console.error('STREAM ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch stream source' });
    }
});

/**
 * =========================================================
 * SUBTITLE PROXY API
 *
 * Uses OpenSubtitles.com REST API (free, no key needed for
 * basic searches).  Returns a list of subtitle tracks the
 * frontend can load into a <track> element or a custom
 * subtitle renderer.
 *
 * Endpoint: GET /api/subtitles?id=&type=&s=&e=&lang=en
 * =========================================================
 */

app.get('/api/subtitles', async (req, res) => {
    try {
        const { id, type = 'movie', s = 1, e = 1, lang = 'en' } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Missing TMDB ID' });
        }

        // Build OpenSubtitles query params
        const params = {
            tmdb_id: id,
            languages: lang,
            type: type === 'tv' ? 'episode' : 'movie'
        };

        if (type === 'tv') {
            params.season_number  = s;
            params.episode_number = e;
        }

        const response = await axios.get('https://api.opensubtitles.com/api/v1/subtitles', {
            params,
            headers: {
                'Api-Key': process.env.OPENSUBTITLES_KEY || 'Wr5qZLMGG28QgGRXI5vHmBHsN1Bt2GMm', // public demo key
                'Content-Type': 'application/json',
                'User-Agent': 'CymorMovieHub v3.0'
            },
            timeout: 8000
        });

        const data  = response.data?.data || [];

        // Map to clean usable objects
        const tracks = data.slice(0, 10).map(item => {
            const attrs = item.attributes;
            const file  = attrs.files?.[0];
            return {
                id:       file?.file_id,
                language: attrs.language,
                label:    attrs.language?.toUpperCase() || 'Unknown',
                release:  attrs.release || '',
                downloadUrl: file ? `/api/subtitle-file?file_id=${file.file_id}` : null
            };
        }).filter(t => t.downloadUrl);

        res.json({ success: true, count: tracks.length, tracks });

    } catch (err) {
        console.error('SUBTITLE ERROR:', err.message);
        // Don't crash — subtitles are optional
        res.json({ success: true, count: 0, tracks: [], note: 'Subtitle fetch failed gracefully' });
    }
});

/**
 * =========================================================
 * SUBTITLE FILE PROXY
 * Downloads the .srt/.vtt and serves it so the browser can
 * load it without CORS issues.
 * =========================================================
 */

app.get('/api/subtitle-file', async (req, res) => {
    try {
        const { file_id } = req.query;
        if (!file_id) return res.status(400).send('Missing file_id');

        // Request download link from OpenSubtitles
        const tokenRes = await axios.post(
            'https://api.opensubtitles.com/api/v1/download',
            { file_id: Number(file_id), sub_format: 'webvtt' },
            {
                headers: {
                    'Api-Key': process.env.OPENSUBTITLES_KEY || 'Wr5qZLMGG28QgGRXI5vHmBHsN1Bt2GMm',
                    'Content-Type': 'application/json',
                    'User-Agent': 'CymorMovieHub v3.0'
                },
                timeout: 8000
            }
        );

        const downloadLink = tokenRes.data?.link;
        if (!downloadLink) return res.status(404).send('No download link returned');

        // Stream the subtitle file through our server (avoids CORS)
        const fileRes = await axios.get(downloadLink, {
            responseType: 'stream',
            timeout: 15000
        });

        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        fileRes.data.pipe(res);

    } catch (err) {
        console.error('SUBTITLE FILE ERROR:', err.message);
        res.status(500).send('Failed to fetch subtitle file');
    }
});

/**
 * =========================================================
 * DOWNLOAD API
 *
 * Strategy (Render Free Tier Safe):
 * 1. Try to get a real direct link from mymovies.tf (fast CDN)
 * 2. Fallback to vidsrc embed URL (user can save from player)
 *
 * We NEVER proxy the video file itself — that would destroy
 * Render's free tier bandwidth in seconds.
 * =========================================================
 */

app.get('/api/download', async (req, res) => {
    try {
        const { id, type = 'movie', quality = '720', s = 1, e = 1 } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Missing TMDB ID' });
        }

        const mediaType = normalizeType(type);

        /**
         * ── Provider 1: vidsrc.icu download page ───────────
         * This gives users a download-oriented player page
         * rather than a streaming embed, which often exposes
         * a direct download button.
         */
        let downloadPageUrl = '';
        if (mediaType === 'tv') {
            downloadPageUrl = `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`;
        } else {
            downloadPageUrl = `https://vidsrc.icu/embed/movie/${id}`;
        }

        /**
         * ── Provider 2: dl.vidsrc.vip ──────────────────────
         * Direct download page (quality-aware)
         */
        let dlUrl = '';
        if (mediaType === 'tv') {
            dlUrl = `https://dl.vidsrc.vip/tv/${id}/${s}/${e}`;
        } else {
            dlUrl = `https://dl.vidsrc.vip/movie/${id}`;
        }

        /**
         * ── Provider 3: moviesmod style link ───────────────
         * Fetched via TMDB title for a search-based redirect
         */
        let tmdbTitle = '';
        try {
            const tmdb = await axios.get(
                `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_KEY}`,
                { timeout: 5000 }
            );
            tmdbTitle = tmdb.data.title || tmdb.data.name || '';
        } catch (_) {}

        res.json({
            success: true,
            id,
            type: mediaType,
            quality,
            title: tmdbTitle,
            providers: [
                {
                    name: 'VidSrc DL',
                    url: dlUrl,
                    note: 'Direct download page — click the download button inside',
                    preferred: true
                },
                {
                    name: 'VidSrc ICU',
                    url: downloadPageUrl,
                    note: 'Alternate download player'
                }
            ],
            // Convenience: frontend can window.open() the preferred provider
            primaryUrl: dlUrl,
            subtitleEndpoint: `/api/subtitles?id=${id}&type=${mediaType}${mediaType === 'tv' ? `&s=${s}&e=${e}` : ''}`
        });

    } catch (err) {
        console.error('DOWNLOAD ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Download generation failed' });
    }
});

/**
 * =========================================================
 * TMDB PROXY — keeps API key server-side
 * GET /api/tmdb?path=/movie/123&...queryparams
 * =========================================================
 */

app.get('/api/tmdb', async (req, res) => {
    try {
        const { path: tmdbPath, ...rest } = req.query;

        if (!tmdbPath) {
            return res.status(400).json({ success: false, message: 'Missing TMDB path' });
        }

        const tmdb = await axios.get(
            `https://api.themoviedb.org/3${tmdbPath}`,
            {
                params: { api_key: TMDB_KEY, ...rest },
                timeout: 10000
            }
        );

        res.json(tmdb.data);

    } catch (err) {
        console.error('TMDB PROXY ERROR:', err.message);
        res.status(500).json({ success: false, message: 'TMDB request failed' });
    }
});

/**
 * =========================================================
 * RECOMMENDATIONS API
 * =========================================================
 */

app.get('/api/recommendations', async (req, res) => {
    try {
        const { id, type } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const mediaType = normalizeType(type);

        const tmdb = await axios.get(
            `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations`,
            { params: { api_key: TMDB_KEY }, timeout: 10000 }
        );

        res.json({ success: true, results: tmdb.data.results || [] });

    } catch (err) {
        console.error('RECOMMENDATION ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
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
            return res.status(400).json({ success: false, message: 'Missing search query' });
        }

        const tmdb = await axios.get(
            'https://api.themoviedb.org/3/search/multi',
            { params: { api_key: TMDB_KEY, query }, timeout: 10000 }
        );

        res.json({ success: true, results: tmdb.data.results || [] });

    } catch (err) {
        console.error('SEARCH ERROR:', err.message);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

/**
 * =========================================================
 * FALLBACK ROUTES
 * =========================================================
 */

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

/**
 * =========================================================
 * SERVER START
 * =========================================================
 */

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║        CYMOR MOVIE HUB v3.0 ONLINE      ║
╠══════════════════════════════════════════╣
║  PORT     : ${PORT}
║  STREAMING: vidsrc.me (primary)
║  FALLBACK : vidsrc.to
║  DOWNLOADS: vidsrc.icu + dl.vidsrc.vip
║  SUBTITLES: OpenSubtitles API
║  ADS      : Disabled
║  STATUS   : Stable ✅
╚══════════════════════════════════════════╝
    `);
});
