/**
 * =========================================================
 * 🎵 CYMOR ENGINE v6.1 (RENDER FIXED CORE)
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const { spawn } = require('child_process');
const fs = require('fs');

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
   CHECK yt-dlp PATH (CRITICAL FIX)
========================================================= */
const YTDLP_PATH = fs.existsSync(path.join(__dirname, 'yt-dlp'))
    ? path.join(__dirname, 'yt-dlp')
    : 'yt-dlp'; // fallback if globally installed

/* =========================================================
   STATUS
========================================================= */
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        name: "Cymor Engine v6.1",
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
        console.error("Search error:", err);
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   DOWNLOAD ENGINE (FIXED + SAFE SPAWN)
========================================================= */
app.get('/api/download', (req, res) => {
    const { id, format = 'mp3' } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Missing video ID"
        });
    }

    const url = `https://www.youtube.com/watch?v=${id}`;

    res.setHeader('Access-Control-Allow-Origin', '*');

    // ===================== MP3 =====================
    if (format === 'mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="cymor.mp3"`);

        const ytdlp = spawn(YTDLP_PATH, [
            url,
            '-x',
            '--audio-format', 'mp3',
            '-o', '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.on('error', (err) => {
            console.error("MP3 spawn error:", err);
            if (!res.headersSent) {
                res.status(500).end("Download failed (yt-dlp not found)");
            }
        });

        ytdlp.stderr.on('data', (data) => {
            console.error("yt-dlp MP3:", data.toString());
        });

    // ===================== MP4 =====================
    } else {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="cymor.mp4"`);

        const ytdlp = spawn(YTDLP_PATH, [
            url,
            '-f', 'mp4',
            '-o', '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.on('error', (err) => {
            console.error("MP4 spawn error:", err);
            if (!res.headersSent) {
                res.status(500).end("Download failed (yt-dlp not found)");
            }
        });

        ytdlp.stderr.on('data', (data) => {
            console.error("yt-dlp MP4:", data.toString());
        });
    }
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
    console.log(`
========================================
🎧 CYMOR ENGINE v6.1 STABLE FIX
========================================
🚀 STATUS : ONLINE
👑 CREATOR: ${APP_NAME}
🌍 PORT   : ${PORT}
========================================
    `);
});
