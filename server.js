/**
 * =========================================================
 * 🎵 CYMOR SPOTIFY-LEVEL ENGINE v5.1 (RENDER OPTIMIZED)
 * =========================================================
 * Creator: Legendary Smiley Cymor
 * CEO of CymorTechServices
 * =========================================================
 */
const APP_NAME = "Cymor Music Downloader";

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const { exec } = require('youtube-dl-exec'); // Cleaner execution for Render
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   MEMORY LAYERS (SPOTIFY STYLE CORE)
========================================================= */
const CACHE = new Map();
const JOBS = new Map();

/* =========================================================
   SECURITY & MIDDLEWARE
========================================================= */
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60, // Increased for search-heavy usage
    message: { success: false, message: 'Elite Engine busy. Please wait.' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

/* =========================================================
   API ROUTES
========================================================= */

// 1. Engine Status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: "Cymor Spotify Engine",
        version: "5.1.0",
        engine: "SPOTIFY-LEVEL STREAM CORE",
        creator: "Legendary Smiley Cymor",
        uptime: process.uptime(),
        activeJobs: JOBS.size
    });
});

// 2. High-Speed Search
app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false });

    try {
        const results = await ytSearch(q);
        res.json({
            success: true,
            results: results.videos.slice(0, 20).map(v => ({
                id: v.videoId,
                title: v.title,
                duration: v.timestamp,
                views: v.views,
                author: v.author?.name,
                thumbnail: v.thumbnail
            }))
        });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 3. Elite Download Engine (The Fix)
app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) return res.status(400).json({ success: false, message: "ID Required" });

    const videoURL = `https://www.youtube.com/watch?v=${id}`;
    
    try {
        // Fetching fresh metadata to get the clean title
        const search = await ytSearch({ videoId: id });
        const safeTitle = (search.title || 'Cymor_Download')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_');

        console.log(`🚀 Elite Engine starting download: ${safeTitle}`);

        if (format === 'mp3') {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);

            // Using youtube-dl-exec (Render compatible)
            // It automatically finds the binary if installed via npm or buildpack
            const stream = exec(videoURL, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: '-',
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                addHeader: ['referer:youtube.com', 'user-agent:googlebot']
            }, { stdio: ['ignore', 'pipe', 'pipe'] });

            stream.stdout.pipe(res);

            stream.on('error', (err) => {
                console.error('Download Error:', err);
                if (!res.headersSent) res.status(500).send('Download Error');
            });

        } else if (format === 'mp4') {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

            const stream = exec(videoURL, {
                format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                output: '-',
                noCheckCertificates: true,
                noWarnings: true,
                addHeader: ['referer:youtube.com', 'user-agent:googlebot']
            }, { stdio: ['ignore', 'pipe', 'pipe'] });

            stream.stdout.pipe(res);
        }

    } catch (e) {
        console.error('Engine Failure:', e);
        if (!res.headersSent) res.status(500).json({ success: false });
    }
});

/* =========================================================
   CLEANUP & START
========================================================= */
app.listen(PORT, () => {
    console.log(`
=========================================================
🎧 CYMOR SPOTIFY ENGINE v5.1
=========================================================
🚀 STATUS  : ONLINE (RENDER READY)
👑 CREATOR : ${APP_NAME}
🌍 PORT    : ${PORT}
=========================================================
    `);
});
