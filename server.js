const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1. SOCKET.IO SETUP
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 2. HELMET & SECURITY CONFIG
// We must explicitly allow the API-Football CDN domains so images aren't blocked
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https://media.api-sports.io", "https://images.unsplash.com"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
            "connect-src": ["'self'", "https://api-football-v1.p.rapidapi.com", "wss://*.onrender.com"]
        },
    },
}));

// 3. PERFORMANCE MIDDLEWARE
app.use(compression()); // Essential for Render's limited bandwidth
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Attach Socket.IO to requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// 4. API ROUTES
// Ensure this path matches your folder structure exactly
const footballRoutes = require('./engine/api/footballApi');
app.use('/api', footballRoutes);

// 5. LIVE HUB SOCKET LOGIC
io.on('connection', (socket) => {
    console.log('⚽ Fan connected to Cymor Live Hub');
    
    socket.on('join-match', (matchId) => {
        socket.join(`match-${matchId}`);
    });

    socket.on('disconnect', () => {
        console.log('Fan disconnected');
    });
});

// 6. ERROR HANDLING (Prevents server crashes)
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR:', err.stack);
    res.status(500).send({ error: 'Tactical Engine Malfunction' });
});

// 7. SPA FALLBACK
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    🚀 CYMOR FOOTBALL HUB: DEPLOYED
    🏟️  Running on Port: ${PORT}
    🛡️  Security: Custom CSP Active
    -------------------------------------------
    `);
});
