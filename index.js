const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { handleCommands } = require("./commands");

const app = express();
const PORT = process.env.PORT || 3000;
const myNumber = "254113821327"; 

async function startCymorBot() {
    // Ensure session directory exists
    if (!fs.existsSync('./session')) fs.mkdirSync('./session');

    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), // Silent is better for Render RAM
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        // Using a more modern browser string to fix the "Couldn't link" lag
        browser: ["Chrome (Linux)", "Chrome", "120.0.6099.129"],
        syncFullHistory: false, // Speeds up the initial link significantly
        markOnlineOnConnect: true,
    });

    // --- AUTOMATIC TRIAL DEPLOYMENT ---
    if (!sock.authState.creds.registered) {
        console.log("🛠️ Initializing Trial Deployment for:", myNumber);
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(myNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n🚀 YOUR PAIRING CODE: ${code}\n\n`);
            } catch (e) {
                console.log("Pairing request failed, retrying...");
            }
        }, 5000); // Increased delay to ensure socket is fully stable
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connection closed. Reason Code: ${reason}`);
            
            // If it's not a manual logout, restart immediately
            if (reason !== DisconnectReason.loggedOut) {
                startCymorBot();
            }
        } else if (connection === 'open') {
            console.log('✅ SMILEY CYMOR IS LIVE ON RENDER');
            
            try {
                const sessionData = fs.readFileSync('./session/creds.json');
                const sessionId = Buffer.from(sessionData).toString('base64');
                
                const welcomeMsg = `*⚡ SMILEY CYMOR SYSTEM DEPLOYED*\n\n` +
                                 `Trial deployment successful. Your bot is now active on Render.\n\n` +
                                 `*SESSION ID:* \n${sessionId}\n\n` +
                                 `> *Powered by Cymor*`;

                await sock.sendMessage(myNumber + "@s.whatsapp.net", { text: welcomeMsg });
            } catch (err) {
                console.log('Error sending Session ID DM');
            }
        }
    });

    // Save credentials whenever updated to prevent linking lag
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        if (m.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key]);
            return;
        }
        await handleCommands(sock, m, myNumber);
    });

    // --- FIX FOR EADDRINUSE ---
    // Only start the server if it isn't already listening
    if (!app.get('serverStarted')) {
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        app.get('/code', async (req, res) => {
            let num = req.query.number;
            if (!num) return res.json({ error: "Number required" });
            try {
                let code = await sock.requestPairingCode(num);
                res.json({ code });
            } catch (error) { res.json({ error: "Service Busy" }); }
        });

        app.listen(PORT, () => {
            console.log(`🌐 Cyber Interface ready on port: ${PORT}`);
            app.set('serverStarted', true);
        });
    }
}

startCymorBot();
