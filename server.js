/**
 * =========================================================
 * 🎵 CYMOR ENGINE v9.0 PIPED CORE (Render Optimized)
 * =========================================================
 * 🚀 FIXED: Proxy-piping for all media (No 403 Forbidden)
 * 🚀 FIXED: Multi-instance failover for Piped API
 * 🚀 FIXED: Browser headers for stable streaming
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

// List of stable Piped instances for failover
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.victr.me',
    'https://pipedapi.drgns.space',
    'https://pipedapi.astre.me'
];

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.use(
    rateLimit({
        windowMs: 60 * 1000,
        max: 150, // Slightly increased for search-heavy users
        message: { success: false, message: 'Too many requests' }
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

/**
 * Rotates through Piped instances to find a working stream
 */
async function getPipedStream(id) {
    for (let baseUrl of PIPED_INSTANCES) {
        try {
            const { data } = await axios.get(`${baseUrl}/streams/${id}`, { timeout: 4000 });
            
            // Prefer audio-only for MP3, video for MP4
            // We'll let the downloader route decide which one to grab from this object
            if (data.audioStreams || data.videoStreams) {
                return data;
            }
        } catch (err) {
            console.log(`⚠️ Instance ${baseUrl} failed, trying next...`);
            continue;
        }
    }
    throw new Error('All streaming instances are currently busy.');
}

/* =========================================================
   API ROUTES
========================================================= */

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: 'Cymor Engine v9.0 Piped Core',
        creator: APP_NAME,
        uptime: process.uptime(),
        backend: 'Piped Multi-Instance Proxy'
    });
});

app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, message: 'Query missing' });

    try {
        const results = await ytSearch(q);
        const videos = results.videos.slice(0, 20).map(v => ({
            id: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            duration: v.timestamp,
            views: v.views,
            author: v.author?.name || 'Unknown'
        }));

        res.json({ success: true, source: 'yt-search', results: videos });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

/* =========================================================
   STREAMING ENGINE (The Core Fix)
========================================================= */

app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) return res.status(400).send('ID Required');

    try {
        const streamData = await getPipedStream(id);
        let streamUrl;

        // Logic to select the best stream based on format
        if (format === 'mp4') {
            // Get high quality video
            streamUrl = streamData.videoStreams.find(s => s.quality === '720p' || s.quality === '360p')?.url 
                        || streamData.videoStreams[0].url;
            res.setHeader('Content-Type', 'video/mp4');
        } else {
            // Get best audio
            streamUrl = streamData.audioStreams.reduce((prev, curr) => (prev.bitrate > curr.bitrate) ? prev : curr).url;
            res.setHeader('Content-Type', 'audio/mpeg');
        }

        const fileName = sanitizeFileName(`cymor-${id}`);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${format}"`);

        // PROXY THE STREAM
        // This is critical. We request it with a User-Agent so YouTube doesn't block Render.
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://piped.video/'
            }
        });

        response.data.pipe(res);

    } catch (err) {
        console.error('Download Error:', err.message);
        res.status(500).send('The streaming link expired or was blocked. Please try again.');
    }
});

// Preview uses the same logic but shorter
app.get('/api/preview', async (req, res) => {
    const { id } = req.query;
    try {
        const streamData = await getPipedStream(id);
        const streamUrl = streamData.audioStreams[0].url;

        res.setHeader('Content-Type', 'audio/mpeg');
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        response.data.pipe(res);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   STARTUP
========================================================= */

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CYMOR v9.0 ONLINE | PORT ${PORT} | RENDER MODE`);
});
