/**
 * =========================================================
 * 🎵 CYMOR ENGINE v8.0 SUPREME
 * =========================================================
 * ✅ Fixed Render yt-dlp execution
 * ✅ Added anti-bot YouTube bypass
 * ✅ Added Android client spoofing
 * ✅ Added custom preview player support
 * ✅ Added MP3 + MP4 quality engine
 * ✅ Added safer streaming
 * ✅ Added elite logging
 * ✅ Better Render compatibility
 * ✅ Better error handling
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

const APP_NAME = 'Legendary Smiley Cymor';

/* =========================================================
   yt-dlp GLOBAL PATH
========================================================= */

const YTDLP_PATH = 'yt-dlp';

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
   yt-dlp BASE ARGS
========================================================= */

function getBaseArgs(url) {

    return [

        url,

        '--no-playlist',

        '--geo-bypass',

        '--user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',

        '--add-header',
        'Accept-Language:en-US,en;q=0.9',

        '--extractor-args',
        'youtube:player_client=android',

        '--socket-timeout',
        '30',

        '--no-warnings'
    ];
}

/* =========================================================
   STATUS
========================================================= */

app.get('/api/status', (req, res) => {

    res.json({
        success: true,
        name: 'Cymor Engine v8.0 Supreme',
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

                author:
                    video.author?.name ||
                    'Unknown Artist'
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

    res.setHeader(
        'Content-Type',
        'audio/mpeg'
    );

    res.setHeader(
        'Accept-Ranges',
        'bytes'
    );

    /*
       30 SECOND PREVIEW
    */

    const args = [

        ...getBaseArgs(url),

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
    ];

    const ytdlp =
        spawn(YTDLP_PATH, args);

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', data => {

        console.log(
            '🎧 Preview:',
            data.toString()
        );
    });

    ytdlp.on('error', err => {

        streamError(
            res,
            err,
            'Preview'
        );
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
            message: 'Missing video ID'
        });
    }

    const url =
        `https://www.youtube.com/watch?v=${id}`;

    const safeName =
        sanitizeFileName(`cymor-${id}`);

    console.log(`
================================================
🎧 CYMOR DOWNLOAD STARTED
================================================
🆔 ID       : ${id}
🎵 FORMAT   : ${format}
⚡ QUALITY  : ${quality}
================================================
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

        const args = [

            ...getBaseArgs(url),

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
        ];

        const ytdlp =
            spawn(YTDLP_PATH, args);

        ytdlp.stdout.pipe(res);

        ytdlp.stderr.on('data', data => {

            console.log(
                '🎵 MP3:',
                data.toString()
            );
        });

        ytdlp.on('error', err => {

            streamError(
                res,
                err,
                'MP3'
            );
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
        }

        if (quality === '1080') {

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

        const args = [

            ...getBaseArgs(url),

            '-f',
            formatSelector,

            '--merge-output-format',
            'mp4',

            '-o',
            '-'
        ];

        const ytdlp =
            spawn(YTDLP_PATH, args);

        ytdlp.stdout.pipe(res);

        ytdlp.stderr.on('data', data => {

            console.log(
                '🎬 MP4:',
                data.toString()
            );
        });

        ytdlp.on('error', err => {

            streamError(
                res,
                err,
                'MP4'
            );
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
🎵 CYMOR ENGINE v8.0 SUPREME
==================================================
🚀 STATUS      : ONLINE
👑 CREATOR     : ${APP_NAME}
🌍 PORT        : ${PORT}
🎯 yt-dlp PATH : ${YTDLP_PATH}
==================================================
    `);
});
