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
   INIT
======================== */

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
   SOCKET (LIVE READY)
======================== */

io.on("connection", (socket) => {
  console.log("⚽ user connected");

  socket.emit("connected", {
    status: "live"
  });
});

/* ========================
   EPL FIXTURES ROUTE
======================== */

app.get("/api/fixtures", fixtures.getFixtures);

/* ========================
   STANDINGS
======================== */

app.get(
  "/api/standings/:league",
  standings.getStandings
);

/* ========================
   HEALTH CHECK
======================== */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "Cymor EPL Hub Running ⚽"
  });
});

/* ========================
   FRONTEND
======================== */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public/index.html")
  );
});

/* ========================
   START
======================== */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
=================================
⚽ CYMOR EPL HUB
🚀 PORT: ${PORT}
🔥 MODE: PREMIER LEAGUE ONLY
=================================
`);
});
