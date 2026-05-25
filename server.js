/**
 * =========================================================
 * 🎵 CYMOR ENGINE v10.0 ULTRA CORE (Render Optimized)
 * =========================================================
 * 🚀 FIXED: Instance Rotation with Mobile Spoofing
 * 🚀 FIXED: Header-forwarding to bypass Bot Detection
 * 🚀 FIXED: Auto-fallback for failed streaming links
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

// Updated stable instance list as of May 2026
const PIPED_INSTANCES = [
    'https://piped-api.garudalinux.org',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.tokyo.privacydev.net',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.kavin.rocks'
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
        max: 200, 
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
 * Advanced Piped Fetcher with Mobile Headers
 * Spoofs a real Android device to bypass Render IP blocks
 */
async function getPipedStream(id) {
    let lastError = null;
    
    // Attempt every instance in the list
    for (let baseUrl of PIPED_INSTANCES) {
        try {
            console.log(`📡 Cymor Engine: Probing ${baseUrl}...`);
            const { data } = await axios.get(`${baseUrl}/streams/${id}`, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            
            if (data && (data.audioStreams?.length > 0 || data.videoStreams?.length > 0)) {
                console.log(`✅ Success: Instance ${baseUrl} responded.`);
                return data;
            }
        } catch (err) {
            lastError = err.message;
            console.warn(`⚠️ Instance ${baseUrl} failed: ${err.message}`);
            continue; 
        }
    }
    throw new Error(`All streaming instances are currently busy. Last error: ${lastError}`);
}

/* =========================================================
   API ROUTES
========================================================= */

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: 'Cymor Engine v10.0 Ultra',
        creator: APP_NAME,
        backend: 'Piped Distributed Proxy',
        status: 'Online'
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
            author: v.author?.name || 'YouTube'
        }));

        res.json({ success: true, results: videos });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Search engine busy' });
    }
});

/* =========================================================
   DOWNLOAD & PREVIEW PROXY
========================================================= */

app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3' } = req.query;

    try {
        const streamData = await getPipedStream(id);
        let streamUrl;

        if (format === 'mp4') {
            // Select 720p or 360p video
            streamUrl = streamData.videoStreams.find(s => s.quality === '720p') ?.url 
                        || streamData.videoStreams[0].url;
            res.setHeader('Content-Type', 'video/mp4');
        } else {
            // Select highest bitrate audio
            streamUrl = streamData.audioStreams.reduce((prev, curr) => (prev.bitrate > curr.bitrate) ? prev : curr).url;
            res.setHeader('Content-Type', 'audio/mpeg');
        }

        const fileName = sanitizeFileName(`cymor-${id}`);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${format}"`);

        // PIPE THE DATA
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                'Referer': 'https://piped.video/'
            }
        });

        response.data.pipe(res);

    } catch (err) {
        console.error('Download Logic Failure:', err.message);
        res.status(500).send(`Cymor Error: ${err.message}. Try again in 5 seconds.`);
    }
});

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
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' }
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
    console.log(`
==================================================
🎵 CYMOR ENGINE v10.0 ULTRA ONLINE
🌍 PORT   : ${PORT}
🔗 MODE   : Multi-Instance Fallback Enabled
==================================================
    `);
});
