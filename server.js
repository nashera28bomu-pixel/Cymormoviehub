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

// Initialize Socket.IO for Live Analytics & Goal Alerts
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware for Performance & Security
app.use(helmet({
    contentSecurityPolicy: false, // Allows external API & Image loads
}));
app.use(compression()); // Shrinks responses for faster loading on mobile
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Attach Socket.IO to the Request object so API routes can trigger alerts
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Import the Engine Routes
const footballRoutes = require('./engine/api/footballApi');
app.use('/api', footballRoutes);

// Socket.IO Connection Logic
io.on('connection', (socket) => {
    console.log('⚽ A fan joined the Cymor Live Hub');
    
    socket.on('join-match', (matchId) => {
        socket.join(`match-${matchId}`);
        console.log(`User tracking match: ${matchId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    🚀 CYMOR FOOTBALL HUB IS LIVE
    🏟️  Port: ${PORT}
    💜  Focus: Premier League Elite
    -------------------------------------------
    `);
});
