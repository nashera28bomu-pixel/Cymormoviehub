const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { Server } = require("socket.io");

require("dotenv").config();

/* ========================
   ENGINE IMPORTS
======================== */

const fixtures = require("./engine/matches/fixtures");
const standings = require("./engine/standings/standings");

/* ========================
   APP INIT
======================== */

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

/* ========================
   MIDDLEWARE
======================== */

app.use(cors());
app.use(express.json());
app.use(compression());

app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

/* ========================
   SOCKET ENGINE (LIVE READY)
======================== */

io.on("connection", socket => {
  console.log("⚽ user connected");

  socket.emit("connected", {
    status: "live"
  });
});

/* ========================
   FIXTURES ROUTE (LIVE FIX ENABLED)
======================== */

app.get("/api/fixtures", (req, res) => {
  // 🔥 FIX: timezone-safe date handling (East Africa / Render fix)
  const date =
    req.query.date ||
    new Date(Date.now() + 3 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  // attach date to request so engine can use it
  req.query.date = date;

  return fixtures.getFixtures(req, res);
});

/* ========================
   STANDINGS ROUTE
======================== */

app.get("/api/standings/:league", standings.getStandings);

/* ========================
   HEALTH CHECK (RENDER SAFE)
======================== */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "Cymor Football Hub Running ⚽",
    time: new Date().toISOString()
  });
});

/* ========================
   FRONTEND ROUTE
======================== */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public/index.html")
  );
});

/* ========================
   START SERVER
======================== */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
=================================
⚽ CYMOR FOOTBALL HUB
🚀 PORT: ${PORT}
🔥 STATUS: LIVE
=================================
`);
});
