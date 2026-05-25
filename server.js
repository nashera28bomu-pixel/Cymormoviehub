/**
 * =========================================================
 * 🎵 CYMOR ENGINE v7.0 ULTRA
 * =========================================================
 * ✅ Fixed yt-dlp spawn errors
 * ✅ Added custom preview endpoint
 * ✅ Added MP3 quality support
 * ✅ Added MP4 quality support
 * ✅ Better Render compatibility
 * ✅ Better error handling
 * ✅ Safer streaming
 * ✅ Elite logging system
 * ✅ Thumbnail + metadata optimization
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
        max: 100,
        message: {
            success: false,
            message: 'Too many requests'
        }
    })
);

/* =========================================================
   yt-dlp PATH DETECTION
========================================================= */

const YTDLP_PATH = 'yt-dlp';

console.log('🎯 yt-dlp Path:', YTDLP_PATH);

/* =========================================================
   HELPERS
========================================================= */

function sanitizeFileName(name = 'cymor-media') {

    return name
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 80);
}

function streamError(res, err, type = 'Download') {

    console.error(`❌ ${type} Error:`, err);

    if (!res.headersSent) {

        return res.status(500).json({
            success: false,
            message: `${type} failed`
        });
    }

    res.end();
}

/* =========================================================
   STATUS
========================================================= */

app.get('/api/status', (req, res) => {

    res.json({
        success: true,
        name: 'Cymor Engine v7.0 Ultra',
        creator: APP_NAME,
        uptime: process.uptime(),
        yt_dlp: YTDLP_PATH
    });
});

/* =========================================================
   SEARCH ENGINE
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

        const results = await ytSearch(q);

        const videos = results.videos
            .slice(0, 20)
            .map(video => ({

                id: video.videoId,

                title: video.title,

                thumbnail:
                    video.thumbnail ||
                    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,

                duration: video.timestamp,

                views: video.views,

                author: video.author?.name || 'Unknown Artist'
            }));

        res.json({
            success: true,
            total: videos.length,
            results: videos
        });

    } catch (err) {

        console.error('❌ Search Error:', err);

        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/* =========================================================
   AUDIO PREVIEW
========================================================= */

app.get('/api/preview', (req, res) => {

    const { id } = req.query;

    if (!id) {

        return res.status(400).json({
            success: false,
            message: 'Missing video ID'
        });
    }

    const url =
        `https://www.youtube.com/watch?v=${id}`;

    res.setHeader('Content-Type', 'audio/mpeg');

    res.setHeader('Accept-Ranges', 'bytes');

    /*
        30 SECOND AUDIO PREVIEW
    */

    const ytdlp = spawn(YTDLP_PATH, [

        url,

        '-f',
        'bestaudio',

        '--extract-audio',

        '--audio-format',
        'mp3',

        '--audio-quality',
        '128K',

        '--download-sections',
        '*0-30',

        '-o',
        '-'
    ]);

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', data => {

        console.log(
            '🎧 Preview:',
            data.toString()
        );
    });

    ytdlp.on('error', err => {

        streamError(res, err, 'Preview');
    });

    ytdlp.on('close', () => {

        res.end();
    });
});

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

app.get('/api/download', (req, res) => {

    const {
        id,
        format = 'mp3',
        quality = '320'
    } = req.query;

    if (!id) {

        return res.status(400).json({
            success: false,
            message: 'Video ID missing'
        });
    }

    const url =
        `https://www.youtube.com/watch?v=${id}`;

    const safeName =
        sanitizeFileName(`cymor-${id}`);

    console.log(`
===================================
🎧 DOWNLOAD STARTED
===================================
🆔 ID      : ${id}
🎵 FORMAT  : ${format}
⚡ QUALITY : ${quality}
===================================
    `);

    /* =====================================================
       MP3 DOWNLOAD
    ===================================================== */

    if (format === 'mp3') {

        res.setHeader(
            'Content-Type',
            'audio/mpeg'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${safeName}.mp3"`
        );

        const ytdlp = spawn(YTDLP_PATH, [

            url,

            '-f',
            'bestaudio',

            '--extract-audio',

            '--audio-format',
            'mp3',

            '--audio-quality',
            quality === '128'
                ? '128K'
                : '320K',

            '-o',
            '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.stderr.on('data', data => {

            console.log(
                '🎵 MP3:',
                data.toString()
            );
        });

        ytdlp.on('error', err => {

            streamError(res, err, 'MP3');
        });

        ytdlp.on('close', () => {

            res.end();
        });

    /* =====================================================
       MP4 DOWNLOAD
    ===================================================== */

    } else {

        let formatSelector =
            'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4';

        /*
            QUALITY CONTROL
        */

        if (quality === '720') {

            formatSelector =
                'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4';

        } else if (quality === '1080') {

            formatSelector =
                'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/mp4';
        }

        res.setHeader(
            'Content-Type',
            'video/mp4'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${safeName}.mp4"`
        );

        const ytdlp = spawn(YTDLP_PATH, [

            url,

            '-f',
            formatSelector,

            '--merge-output-format',
            'mp4',

            '-o',
            '-'
        ]);

        ytdlp.stdout.pipe(res);

        ytdlp.stderr.on('data', data => {

            console.log(
                '🎬 MP4:',
                data.toString()
            );
        });

        ytdlp.on('error', err => {

            streamError(res, err, 'MP4');
        });

        ytdlp.on('close', () => {

            res.end();
        });
    }
});

/* =========================================================
   FRONTEND ROUTING
========================================================= */

app.get('*', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'index.html')
    );
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {

    console.log(`
==================================================
🎧 CYMOR ENGINE v7.0 ULTRA
==================================================
🚀 STATUS      : ONLINE
👑 CREATOR     : ${APP_NAME}
🌍 PORT        : ${PORT}
🎯 yt-dlp PATH : ${YTDLP_PATH}
==================================================
    `);
});
