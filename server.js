const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const axios = require("axios");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ========================
   MIDDLEWARE
======================== */

app.use(cors());
app.use(express.json());
app.use(compression());
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

/* ========================
   SOCKET (LIVE READY)
======================== */

io.on("connection", socket => {
  console.log("⚽ user connected");

  socket.emit("connected", { status: "live" });
});

/* ========================
   FIXTURES API (FIXED)
======================== */

app.get("/api/fixtures", async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date().toISOString().split("T")[0];

    const response = await axios.get(
      `https://api.sportmonks.com/v3/football/fixtures/date/${date}`,
      {
        params: {
          api_token: process.env.SPORTMONKS_API_KEY,
          include: "participants;scores;league"
        }
      }
    );

    const fixtures = response.data?.data || [];

    res.json({
      success: true,
      count: fixtures.length,
      data: fixtures
    });

  } catch (err) {
    console.log(
      "FIXTURES ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ========================
   STANDINGS API (KEEP YOUR FILE)
======================== */

const standings = require("./engine/standings/standings");

app.get("/api/standings/:league", standings.getStandings);

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
🚀 RUNNING ON PORT ${PORT}
=================================
`);
});
