/**
 * =========================================================
 * 🎵 CYMOR MUSIC DOWNLOADER — ELITE SERVER ENGINE
 * =========================================================
 * Creator: Legendary Smiley Cymor
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

// BOT BYPASS: Create a custom agent to mimic a real browser
const agent = ytdl.createAgent(); 

/* =========================================================
   SECURITY & SETTINGS
========================================================= */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // Increased for better UX
    message: { success: false, message: 'Elite servers busy. Please wait 60s.' }
});

app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, '/')));

const APP_INFO = {
    app: 'Cymor Music Downloader',
    creator: 'Legendary Smiley Cymor',
    company: 'CymorTechServices',
    status: 'LEGENDARY_ONLINE'
};

/* =========================================================
   SEARCH SYSTEM
========================================================= */
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ success: false, message: 'Query required' });

    try {
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 15).map(v => ({
            id: v.videoId,
            title: v.title,
            duration: v.timestamp,
            views: v.views,
            ago: v.ago,
            author: v.author.name,
            thumbnail: v.thumbnail,
            url: v.url
        }));

        res.json({ success: true, results: videos, creator: APP_INFO.creator });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cymor Search Node Failure' });
    }
});

/* =========================================================
   DOWNLOAD ENGINE (THE BYPASS VERSION)
========================================================= */
app.get('/api/download', async (req, res) => {
    const { id, format, quality } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'ID missing' });

    const videoURL = `https://www.youtube.com/watch?v=${id}`;

    try {
        // Use the custom agent here to bypass the bot detection
        const info = await ytdl.getInfo(videoURL, { agent });
        
        const safeTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

        if (format === 'mp3') {
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
            res.setHeader('Content-Type', 'audio/mpeg');

            const stream = ytdl(videoURL, {
                agent,
                quality: 'highestaudio',
                filter: 'audioonly',
                highWaterMark: 1 << 25
            });

            ffmpeg(stream)
                .audioBitrate(quality || 320)
                .format('mp3')
                .on('error', (e) => console.error('FFmpeg Error:', e.message))
                .pipe(res, { end: true });

        } else {
            // MP4 Logic - Uses itag 18 (360p) or 22 (720p) for combined Audio/Video
            // This is safer for Render's limited RAM than merging streams
            const itag = quality === '720' ? 22 : 18;
            
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
            res.setHeader('Content-Type', 'video/mp4');

            ytdl(videoURL, {
                agent,
                quality: itag,
                highWaterMark: 1 << 25
            }).pipe(res);
        }

    } catch (error) {
        console.error('DOWNLOAD CRITICAL ERROR:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message.includes('confirm you\'re not a bot') 
                ? "YouTube blocked this request. Try again in a moment." 
                : "Processing failed." 
        });
    }
});

app.get('/api/status', (req, res) => res.json(APP_INFO));

app.listen(PORT, () => {
    console.log(`🚀 CYMOR ELITE ENGINE STARTUP | PORT: ${PORT} | CREATOR: ${APP_INFO.creator}`);
});
