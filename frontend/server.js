/**
 * =========================================================
 * CYMOR MOVIE HUB — ELITE BRIDGE SERVER v5.0
 * ✅ Python FastAPI Integration (moviebox_api)
 * ✅ Node-to-Python Internal Bridge
 * ✅ Zero-Ad Direct Stream Delivery
 * =========================================================
 */

const express = require('express');
const axios = require('axios');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Internal URL for the Python service (port 5000)
const PYTHON_ENGINE_URL = "http://127.0.0.1:5000"; 

app.set('trust proxy', 1);

const TMDB_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';

/**
 * =========================================================
 * MIDDLEWARE
 * =========================================================
 */
app.use(compression());
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false // Required for direct video streams
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * =========================================================
 * THE BRIDGE: Node.js to Python Scraper
 * =========================================================
 */
app.get('/api/get-source', async (req, res) => {
    try {
        const { q, type = 'movie', s = 1, e = 1 } = req.query;
        
        if (!q) return res.status(400).json({ success: false, message: "Query required" });

        console.log(`[Bridge] Requesting ${type}: ${q} from Python Engine...`);

        // Forward the request to the Python FastAPI service
        const pythonResponse = await axios.get(`${PYTHON_ENGINE_URL}/api/v1/scrape`, {
            params: { q, type, s, e },
            timeout: 15000 // Give the scraper time to do its "magic"
        });

        // Send the direct links back to your script.js
        res.json(pythonResponse.data);

    } catch (err) {
        console.error('[Bridge Error] Python Engine Unreachable or Error:', err.message);
        
        // FAILOVER: If Python service is down, return a "Success: false" 
        // so script.js can trigger the vidsrc fallback.
        res.status(500).json({ 
            success: false, 
            message: "Python Scraper Offline",
            fallback: true 
        });
    }
});

/**
 * =========================================================
 * TMDB PROXY (Keeps your Frontend working)
 * =========================================================
 */
app.get('/api/tmdb', async (req, res) => {
    try {
        const { path: tmdbPath, ...rest } = req.query;
        const response = await axios.get(`https://api.themoviedb.org/3${tmdbPath}`, {
            params: { api_key: TMDB_KEY, ...rest }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get('https://api.themoviedb.org/3/search/multi', {
            params: { api_key: TMDB_KEY, query }
        });
        res.json({ success: true, results: response.data.results || [] });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Serve the main entry point
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     CYMOR ELITE BRIDGE v5.0 - ONLINE       ║
╠════════════════════════════════════════════╣
║ > FRONTEND : Node.js Port ${PORT}               ║
║ > ENGINE   : Connecting to Python (5000)... ║
║ > STATUS   : 10/10 Ad-Free Mode Ready ✅   ║
╚════════════════════════════════════════════╝
    `);
});
