/**
 * =========================================================
 * 🎵 CYMOR ENGINE v6.0 (RENDER STABLE CORE)
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const APP_NAME = "Legendary Smiley Cymor";

/* =========================================================
   MIDDLEWARE
========================================================= */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 60
}));

/* =========================================================
   STATUS
========================================================= */
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: "Cymor Engine v6",
        creator: APP_NAME,
        uptime: process.uptime()
    });
});

/* =========================================================
   SEARCH
========================================================= */
app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false });

    try {
        const r = await ytSearch(q);

        res.json({
            success: true,
            results: r.videos.slice(0, 20).map(v => ({
                id: v.videoId,
                title: v.title,
                thumbnail: v.thumbnail,
                duration: v.timestamp,
                author: v.author?.name
            }))
        });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   DOWNLOAD ENGINE (FIXED CORE)
========================================================= */
app.get('/api/download', (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: "Missing ID" });
    }

    const url = `https://www.youtube.com/watch?v=${id}`;

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (format === 'mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="cymor.mp3"`);

        const ytdlp = spawn('yt-dlp', [
            url,
            '-x',
            '--audio-format', 'mp3',
            '-o', '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.on('error', (err) => {
            console.error("MP3 error:", err);
            res.status(500).end("Download failed");
        });

    } else {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="cymor.mp4"`);

        const ytdlp = spawn('yt-dlp', [
            url,
            '-f', 'mp4',
            '-o', '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.on('error', (err) => {
            console.error("MP4 error:", err);
            res.status(500).end("Download failed");
        });
    }
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
    console.log(`
========================================
🎧 CYMOR ENGINE v6 STABLE
========================================
🚀 STATUS : ONLINE
👑 CREATOR: ${APP_NAME}
🌍 PORT   : ${PORT}
========================================
    `);
});
