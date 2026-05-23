/**
 * =========================================================
 * 🎵 CYMOR SPOTIFY-LEVEL ENGINE v5.2 (STABLE RENDER BUILD)
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 3000;

const APP_NAME = "Legendary Smiley Cymor";

/* =========================================================
   CORE MEMORY
========================================================= */
const JOBS = new Map();

/* =========================================================
   MIDDLEWARE
========================================================= */
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, message: 'Server busy, try again.' }
});

app.use(cors());
app.use(express.json());
app.use(limiter);
app.use(express.static(path.join(__dirname, '/')));

/* =========================================================
   STATUS
========================================================= */
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: "Cymor Music Engine",
        version: "5.2.0",
        creator: APP_NAME,
        uptime: process.uptime(),
        activeJobs: JOBS.size
    });
});

/* =========================================================
   SEARCH ENGINE
========================================================= */
app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false });

    try {
        const result = await ytSearch(q);

        const videos = result.videos.slice(0, 20).map(v => ({
            id: v.videoId,
            title: v.title,
            duration: v.timestamp,
            views: v.views,
            author: v.author?.name,
            thumbnail: v.thumbnail
        }));

        res.json({ success: true, results: videos });

    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   DOWNLOAD ENGINE (FIXED & RENDER SAFE)
========================================================= */
app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: "Video ID required" });
    }

    const url = `https://www.youtube.com/watch?v=${id}`;

    try {
        // safer metadata fetch
        const meta = await ytSearch(url);
        const video = meta.videos?.[0];

        const title = (video?.title || 'Cymor_Download')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_');

        console.log(`🚀 Download starting: ${title}`);

        if (format === 'mp3') {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);

            const stream = youtubedl(
                url,
                {
                    extractAudio: true,
                    audioFormat: 'mp3',
                    output: '-',
                    noCheckCertificates: true,
                    noWarnings: true,
                    preferFreeFormats: true
                },
                { stdio: ['ignore', 'pipe', 'pipe'] }
            );

            stream.stdout.pipe(res);

            stream.on('error', (err) => {
                console.error("MP3 Error:", err);
                if (!res.headersSent) {
                    res.status(500).send("Download failed");
                }
            });

        } else if (format === 'mp4') {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);

            const stream = youtubedl(
                url,
                {
                    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    output: '-',
                    noCheckCertificates: true,
                    noWarnings: true
                },
                { stdio: ['ignore', 'pipe', 'pipe'] }
            );

            stream.stdout.pipe(res);

            stream.on('error', (err) => {
                console.error("MP4 Error:", err);
                if (!res.headersSent) {
                    res.status(500).send("Download failed");
                }
            });
        }

    } catch (err) {
        console.error("Engine failure:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Engine crashed" });
        }
    }
});

/* =========================================================
   SERVER START
========================================================= */
app.listen(PORT, () => {
    console.log(`
=========================================================
🎧 CYMOR ENGINE v5.2 STABLE
=========================================================
🚀 STATUS  : ONLINE
👑 CREATOR : ${APP_NAME}
🌍 PORT    : ${PORT}
=========================================================
    `);
});
