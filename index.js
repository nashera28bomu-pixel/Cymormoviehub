const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { handleCommands } = require("./commands");

const app = express();
const PORT = process.env.PORT || 3000;
const myNumber = "254113821327"; // Your WhatsApp Number

async function startCymorBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }), 
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    // --- PAIRING LOGIC ---
    // This will display your code in the Render console for your number
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(myNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n\n🚀 SMILEY CYMOR BOT PAIRING CODE: ${code}\n\n`);
        }, 3000);
    }

    // --- CONNECTION EVENTS ---
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startCymorBot();
        } else if (connection === 'open') {
            console.log('✅ Smiley Cymor Bot is Online and Ready!');
            
            // --- SESSION ID TO DM LOGIC ---
            try {
                // Generate Session ID from credentials
                const sessionData = fs.readFileSync('./session/creds.json');
                const sessionId = Buffer.from(sessionData).toString('base64');
                
                const welcomeMsg = `*🚀 SMILEY CYMOR BOT CONNECTED*\n\n` +
                                 `Your Session ID is ready. Use this to host your bot on other platforms.\n\n` +
                                 `*SESSION ID:*\n${sessionId}\n\n` +
                                 `_Keep this ID secret!_\n\n` +
                                 `> *Powered by Cymor*`;

                await sock.sendMessage(myNumber + "@s.whatsapp.net", { text: welcomeMsg });
                console.log('📦 Session ID sent to your DM.');
            } catch (err) {
                console.error('Failed to send Session ID:', err);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- PAIRING CODE ENDPOINT FOR SITE ---
    // This allows the index.html you created to fetch the code for other users
    app.get('/code', async (req, res) => {
        let num = req.query.number;
        if (!num) return res.json({ error: "Number required" });
        try {
            let code = await sock.requestPairingCode(num);
            res.json({ code });
        } catch (error) {
            res.json({ error: "Check if bot is already paired" });
        }
    });

    // --- MESSAGE HANDLING ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        if (m.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key]);
            return;
        }

        await handleCommands(sock, m, myNumber);
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.listen(PORT, () => {
        console.log(`🌐 Web Interface active on port: ${PORT}`);
    });
}

startCymorBot();
