/**
 * =========================================================
 * 🎵 CYMOR MUSIC DOWNLOADER — ELITE SERVER ENGINE
 * =========================================================
 * Creator:
 * Legendary Smiley Cymor
 * CEO of CymorTechServices
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const rateLimit = require('express-rate-limit');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================================================
   SECURITY + PERFORMANCE
========================================================= */

// Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.'
    }
});

/* =========================================================
   MIDDLEWARES
========================================================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, '/')));

/* =========================================================
   GLOBAL STATUS
========================================================= */

const APP_INFO = {
    app: 'Cymor Music Downloader',
    creator: 'Legendary Smiley Cymor',
    company: 'CymorTechServices',
    version: '2.0.0',
    status: 'ONLINE'
};

/* =========================================================
   HOME STATUS ROUTE
========================================================= */

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        ...APP_INFO,
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

/* =========================================================
   SEARCH ROUTE
========================================================= */

app.get('/api/search', async (req, res) => {

    const query = req.query.q;

    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Search query is required'
        });
    }

    try {

        const results = await ytSearch(query);

        const videos = results.videos
            .slice(0, 12)
            .map(video => ({

                id: video.videoId,

                title: video.title,

                duration: video.timestamp,

                views: video.views,

                ago: video.ago,

                author: video.author?.name || 'Unknown Artist',

                thumbnail: video.thumbnail,

                url: video.url

            }));

        return res.json({
            success: true,
            total: videos.length,
            creator: APP_INFO.creator,
            results: videos
        });

    } catch (error) {

        console.error('SEARCH ERROR:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to search videos'
        });
    }
});

/* =========================================================
   VIDEO INFO ROUTE
========================================================= */

app.get('/api/info/:id', async (req, res) => {

    try {

        const videoId = req.params.id;

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

        const info = await ytdl.getInfo(videoURL);

        const details = info.videoDetails;

        return res.json({

            success: true,

            data: {

                id: details.videoId,

                title: details.title,

                lengthSeconds: details.lengthSeconds,

                views: details.viewCount,

                author: details.author.name,

                thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url,

                publishDate: details.publishDate

            }

        });

    } catch (error) {

        console.error('INFO ERROR:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch video info'
        });
    }
});

/* =========================================================
   DOWNLOAD ROUTE
========================================================= */

app.get('/api/download', async (req, res) => {

    const videoId = req.query.id;

    const format = req.query.format || 'mp3';

    const quality = req.query.quality || '320';

    if (!videoId) {
        return res.status(400).json({
            success: false,
            message: 'Video ID is required'
        });
    }

    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

    try {

        const info = await ytdl.getInfo(videoURL);

        const rawTitle = info.videoDetails.title;

        const safeTitle = rawTitle
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_')
            .substring(0, 80);

        /* =========================================================
           MP3 DOWNLOAD
        ========================================================= */

        if (format === 'mp3') {

            const audioFormat = ytdl.chooseFormat(info.formats, {
                filter: 'audioonly',
                quality: 'highestaudio'
            });

            res.setHeader(
                'Content-Disposition',
                `attachment; filename=\"${safeTitle}.mp3\"`
            );

            res.setHeader('Content-Type', 'audio/mpeg');

            const audioStream = ytdl(videoURL, {
                format: audioFormat,
                highWaterMark: 1 << 25
            });

            ffmpeg(audioStream)

                .audioBitrate(Number(quality))

                .audioChannels(2)

                .audioFrequency(44100)

                .format('mp3')

                .on('start', () => {
                    console.log(`🎧 MP3 Download Started: ${safeTitle}`);
                })

                .on('end', () => {
                    console.log(`✅ MP3 Download Finished: ${safeTitle}`);
                })

                .on('error', error => {

                    console.error('FFMPEG AUDIO ERROR:', error.message);

                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Audio conversion failed'
                        });
                    }
                })

                .pipe(res, { end: true });

        }

        /* =========================================================
           MP4 DOWNLOAD
        ========================================================= */

        else if (format === 'mp4') {

            /**
             * Safer quality system
             * Avoids server crashes
             */

            let selectedQuality = '18';

            if (quality === '720') {
                selectedQuality = '22';
            }

            const videoFormat = ytdl.chooseFormat(info.formats, {
                quality: selectedQuality
            });

            res.setHeader(
                'Content-Disposition',
                `attachment; filename=\"${safeTitle}.mp4\"`
            );

            res.setHeader('Content-Type', 'video/mp4');

            ytdl(videoURL, {
                format: videoFormat,
                highWaterMark: 1 << 25
            })

            .on('start', () => {
                console.log(`🎬 MP4 Download Started: ${safeTitle}`);
            })

            .on('end', () => {
                console.log(`✅ MP4 Download Finished: ${safeTitle}`);
            })

            .on('error', error => {

                console.error('VIDEO STREAM ERROR:', error.message);

                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Video stream failed'
                    });
                }
            })

            .pipe(res);

        }

        /* =========================================================
           INVALID FORMAT
        ========================================================= */

        else {

            return res.status(400).json({
                success: false,
                message: 'Invalid format. Use mp3 or mp4'
            });

        }

    } catch (error) {

        console.error('DOWNLOAD ERROR:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Download processing failed'
        });
    }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });

});

/* =========================================================
   SERVER START
========================================================= */

app.listen(PORT, () => {

    console.log(`
=========================================================
🎵 CYMOR MUSIC DOWNLOADER
=========================================================
🚀 STATUS   : ONLINE
🌍 PORT     : ${PORT}
👑 CREATOR  : Legendary Smiley Cymor
🏢 COMPANY  : CymorTechServices
=========================================================
    `);

});
