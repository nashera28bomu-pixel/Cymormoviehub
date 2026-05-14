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

// --- 1. GLOBAL SERVER START (Fixes EADDRINUSE) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// We define a placeholder for the socket to use in the /code route
let globalSock;

app.get('/code', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Number required" });
    if (!globalSock) return res.json({ error: "Bot initializing, wait..." });
    try {
        let code = await globalSock.requestPairingCode(num);
        res.json({ code });
    } catch (error) { res.json({ error: "Service Busy" }); }
});

app.listen(PORT, () => {
    console.log(`🌐 Cyber Interface ready on port: ${PORT}`);
});

// --- 2. BOT LOGIC ---
async function startCymorBot() {
    if (!fs.existsSync('./session')) fs.mkdirSync('./session');

    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false, 
        markOnlineOnConnect: true,
    });

    globalSock = sock; // Update the global socket for the pairing site

    if (!sock.authState.creds.registered) {
        console.log("🛠️ Trial Deployment Initializing...");
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(myNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n🚀 YOUR PAIRING CODE: ${code}\n\n`);
            } catch (e) { console.log("Pairing failed, retrying..."); }
        }, 8000); 
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("Reconnecting bot...");
                startCymorBot();
            }
        } else if (connection === 'open') {
            console.log('✅ SMILEY CYMOR IS LIVE');
            
            try {
                const sessionData = fs.readFileSync('./session/creds.json');
                const sessionId = Buffer.from(sessionData).toString('base64');
                
                const welcomeMsg = `*⚡ SMILEY CYMOR SYSTEM DEPLOYED*\n\n` +
                                 `Trial successful. Your bot is active.\n\n` +
                                 `*SESSION ID:* \n${sessionId}\n\n` +
                                 `> *Powered by Cymor*`;

                await sock.sendMessage(myNumber + "@s.whatsapp.net", { text: welcomeMsg });
            } catch (err) { console.log('Session ID DM failed.'); }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.remoteJid === 'status@broadcast') return;
        await handleCommands(sock, m, myNumber);
    });
}

startCymorBot();
