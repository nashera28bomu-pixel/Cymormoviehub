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

// --- 1. GLOBAL SERVER & PAIRING SITE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let globalSock;

app.get('/code', async (req, res) => {
    let num = req.query.number;
    // Remove '+' and spaces if the user accidentally adds them
    if (num) num = num.replace(/[^0-9]/g, '');
    
    if (!num) return res.json({ error: "Number required" });
    if (!globalSock) return res.json({ error: "Bot initializing, please refresh in 10 seconds." });

    try {
        // Requesting a fresh, real pairing code from WhatsApp servers
        let code = await globalSock.requestPairingCode(num);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        res.json({ code });
        console.log(`🚀 Manual pairing requested for: ${num}`);
    } catch (error) {
        console.error("Pairing Error:", error);
        res.json({ error: "Service Busy. Try again in a moment." });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Cyber Interface ready on port: ${PORT}`);
});

// --- 2. BOT CORE LOGIC ---
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
        // Updated browser string to ensure WhatsApp accepts the link immediately
        browser: ["Chrome (Linux)", "Chrome", "124.0.6367.119"],
        syncFullHistory: false, // Prevents the 5-minute lag during linking
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
    });

    globalSock = sock; 

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connection closed. Reason: ${reason}`);
            
            if (reason !== DisconnectReason.loggedOut) {
                console.log("Re-initializing Smiley Cymor Bot...");
                startCymorBot();
            }
        } else if (connection === 'open') {
            console.log('✅ SMILEY CYMOR IS LIVE');
            
            try {
                const sessionData = fs.readFileSync('./session/creds.json');
                const sessionId = Buffer.from(sessionData).toString('base64');
                
                const welcomeMsg = `*⚡ SMILEY CYMOR SYSTEM ONLINE*\n\n` +
                                 `Trial deployment successful. You are now connected.\n\n` +
                                 `*SESSION ID:* \n\`${sessionId}\`\n\n` +
                                 `> *Powered by Cymor*`;

                await sock.sendMessage(myNumber + "@s.whatsapp.net", { text: welcomeMsg });
            } catch (err) { 
                console.log('Session ID delivery failed, check logs.'); 
            }
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
