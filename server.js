/**
 * =========================================================
 * 🎵 CYMOR SPOTIFY-LEVEL ENGINE v5.0
 * =========================================================
 * Creator: Legendary Smiley Cymor
 * CEO of CymorTechServices
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ytSearch = require('yt-search');
const rateLimit = require('express-rate-limit');
const ytdlp = require('yt-dlp-exec');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   YT-DLP BINARY PATH (RENDER SAFE)
========================================================= */
const YTDLP_PATH = path.join(__dirname, 'bin', 'yt-dlp');

/* =========================================================
   MEMORY LAYERS (SPOTIFY STYLE CORE)
========================================================= */

// cache: instant replay downloads
const CACHE = new Map();

// queue system
const QUEUE = new Map();

// progress tracker
const JOBS = new Map();

/* =========================================================
   SECURITY
========================================================= */

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    message: { success: false, message: 'Server busy. Try again.' }
});

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());
app.use('/api/', limiter);
app.use(express.static(path.join(__dirname, '/')));

/* =========================================================
   APP INFO
========================================================= */

const APP = {
    name: "Cymor Spotify Engine",
    version: "5.0.0",
    engine: "SPOTIFY-LEVEL STREAM CORE",
    creator: "Legendary Smiley Cymor"
};

/* =========================================================
   STATUS
========================================================= */

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        ...APP,
        uptime: process.uptime(),
        cacheSize: CACHE.size,
        queueSize: QUEUE.size,
        activeJobs: JOBS.size
    });
});

/* =========================================================
   SEARCH (FAST + CACHE OPTIONAL)
========================================================= */

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

/* =========================================================
   INFO (CACHE ENABLED)
========================================================= */

app.get('/api/info/:id', async (req, res) => {
    const id = req.params.id;

    if (CACHE.has(id)) {
        return res.json({ success: true, cached: true, data: CACHE.get(id) });
    }

    try {
        const url = `https://www.youtube.com/watch?v=${id}`;

        const data = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            binary: YTDLP_PATH
        });

        CACHE.set(id, data);

        res.json({
            success: true,
            cached: false,
            data: {
                id: data.id,
                title: data.title,
                duration: data.duration,
                views: data.view_count,
                uploader: data.uploader,
                thumbnail: data.thumbnail
            }
        });

    } catch (e) {
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   QUEUE SYSTEM (SPOTIFY STYLE CONTROL)
========================================================= */

function createJob() {
    const id = crypto.randomUUID();
    JOBS.set(id, {
        status: 'queued',
        progress: 0,
        created: Date.now()
    });
    return id;
}

function updateJob(id, data) {
    if (JOBS.has(id)) {
        JOBS.set(id, { ...JOBS.get(id), ...data });
    }
}

/* =========================================================
   DOWNLOAD ENGINE (SPOTIFY STYLE STREAMING)
========================================================= */

app.get('/api/download', async (req, res) => {
    const { id, format = 'mp3', quality = '320' } = req.query;

    if (!id) return res.status(400).json({ success: false });

    const videoURL = `https://www.youtube.com/watch?v=${id}`;

    const jobId = createJob();

    try {
        updateJob(jobId, { status: 'processing' });

        const meta = await ytdlp(videoURL, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            binary: YTDLP_PATH
        });

        const safeTitle = meta.title
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 80);

        let stream;

        /* =====================================================
           MP3 STREAM (SPOTIFY AUDIO MODE)
        ===================================================== */

        if (format === 'mp3') {

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);

            stream = ytdlp.exec(videoURL, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: quality,
                output: '-',
                binary: YTDLP_PATH
            });
        }

        /* =====================================================
           MP4 STREAM (VIDEO MODE)
        ===================================================== */

        else if (format === 'mp4') {

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

            stream = ytdlp.exec(videoURL, {
                format: quality === '720' ? '22' : '18',
                output: '-',
                binary: YTDLP_PATH
            });
        }

        else {
            return res.status(400).json({ success: false });
        }

        /* =====================================================
           STREAM HANDLER + PROGRESS SIMULATION
        ===================================================== */

        updateJob(jobId, { status: 'streaming' });

        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + 5, 95);
            updateJob(jobId, { progress });
        }, 500);

        stream.stdout.pipe(res);

        stream.stderr.on('data', d => {
            console.log('[YT-DLP]', d.toString());
        });

        req.on('close', () => {
            if (stream?.kill) stream.kill();
            clearInterval(interval);
            updateJob(jobId, { status: 'cancelled' });
        });

        stream.on('close', () => {
            clearInterval(interval);
            updateJob(jobId, { status: 'done', progress: 100 });
            console.log(`✔ Completed: ${safeTitle}`);
        });

    } catch (e) {
        updateJob(jobId, { status: 'failed' });
        res.status(500).json({ success: false });
    }
});

/* =========================================================
   JOB STATUS API (SPOTIFY FEATURE)
========================================================= */

app.get('/api/job/:id', (req, res) => {
    const job = JOBS.get(req.params.id);
    if (!job) return res.status(404).json({ success: false });

    res.json({ success: true, job });
});

/* =========================================================
   CLEANUP (PREVENT MEMORY LEAKS)
========================================================= */

setInterval(() => {
    const now = Date.now();

    for (const [id, job] of JOBS.entries()) {
        if (now - job.created > 1000 * 60 * 10) {
            JOBS.delete(id);
        }
    }

    for (const [id] of CACHE.entries()) {
        if (CACHE.size > 100) CACHE.delete(id);
    }

}, 60000);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
    console.log(`
=========================================================
🎧 CYMOR SPOTIFY ENGINE v5.0
=========================================================
🚀 STATUS : ONLINE
⚡ MODE   : STREAM + QUEUE + CACHE
🌍 PORT   : ${PORT}
👑 BUILT  : CymorTechServices
=========================================================
`);
});
