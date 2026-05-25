/**
 * =========================================================
 * 🎵 CYMOR ENGINE v9.0 PIPED CORE
 * =========================================================
 * 🚀 NO yt-dlp
 * 🚀 NO ffmpeg
 * 🚀 NO spawn / child_process
 * 🚀 Uses Piped + Invidious APIs
 * 🚀 Direct streaming architecture
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const APP_NAME = 'Legendary Smiley Cymor';

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.use(
    rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        message: {
            success: false,
            message: 'Too many requests'
        }
    })
);

/* =========================================================
   HELPERS
========================================================= */

function sanitizeFileName(name = 'cymor-media') {
    return name
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 80);
}

/* =========================================================
   STATUS
========================================================= */

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: 'Cymor Engine v9.0 Piped Core',
        creator: APP_NAME,
        uptime: process.uptime(),
        backend: 'Piped + Invidious (no yt-dlp)'
    });
});

/* =========================================================
   SEARCH (Piped + yt-search fallback)
========================================================= */

app.get('/api/search', async (req, res) => {
    const q = req.query.q;

    if (!q) {
        return res.status(400).json({
            success: false,
            message: 'Search query missing'
        });
    }

    try {
        // Primary: yt-search (fast + stable)
        const results = await ytSearch(q);

        const videos = results.videos.slice(0, 20).map(v => ({
            id: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            duration: v.timestamp,
            views: v.views,
            author: v.author?.name || 'Unknown'
        }));

        return res.json({
            success: true,
            source: 'yt-search',
            results: videos
        });

    } catch (err) {
        console.error('Search error:', err);

        return res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/* =========================================================
   GET STREAM URL (PIPED)
========================================================= */

async function getPipedStream(id) {
    try {
        const url = `https://pipedapi.kavin.rocks/streams/${id}`;
        const { data } = await axios.get(url, { timeout: 10000 });

        if (data?.audioStreams?.length > 0) {
            return data.audioStreams[0].url;
        }

        if (data?.videoStreams?.length > 0) {
            return data.videoStreams[0].url;
        }

        throw new Error('No streams found');

    } catch (err) {
        console.log('⚠️ Piped failed, trying Invidious fallback...');

        // fallback
        const fallback = await axios.get(
            `https://invidious.io/api/v1/videos/${id}`
        ).catch(() => null);

        if (fallback?.data?.formatStreams?.length > 0) {
            return fallback.data.formatStreams[0].url;
        }

        throw err;
    }
}

/* =========================================================
   PREVIEW (DIRECT STREAM 30s)
========================================================= */

app.get('/api/preview', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Missing video ID'
        });
    }

    try {
        const streamUrl = await getPipedStream(id);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');

        // proxy stream
        const response = await axios.get(streamUrl, {
            responseType: 'stream'
        });

        response.data.pipe(res);

    } catch (err) {
        console.error('Preview error:', err);
        res.status(500).json({
            success: false,
            message: 'Preview failed'
        });
    }
});

/* =========================================================
   DOWNLOAD ENGINE (DIRECT REDIRECT)
========================================================= */

app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Missing video ID'
        });
    }

    try {
        const streamUrl = await getPipedStream(id);

        const fileName = sanitizeFileName(`cymor-${id}`);

        console.log(`
================================================
🎧 CYMOR DOWNLOAD
================================================
🆔 ID     : ${id}
🎵 FORMAT : ${format}
================================================
        `);

        if (format === 'mp4') {
            res.redirect(streamUrl);
        } else {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${fileName}.mp3"`
            );

            const response = await axios.get(streamUrl, {
                responseType: 'stream'
            });

            response.data.pipe(res);
        }

    } catch (err) {
        console.error('Download error:', err);

        res.status(500).json({
            success: false,
            message: 'Download failed'
        });
    }
});

/* =========================================================
   FRONTEND ROUTE
========================================================= */

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
    console.log(`
==================================================
🎵 CYMOR ENGINE v9.0 PIPED CORE
==================================================
🚀 STATUS : ONLINE
🌍 PORT   : ${PORT}
🔗 MODE   : Piped + Invidious
==================================================
    `);
});
