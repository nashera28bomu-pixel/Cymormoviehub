const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { Server } = require("socket.io");

require("dotenv").config();

const fixtures = require("./engine/matches/fixtures");
const standings = require("./engine/standings/standings");

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(cors());

app.use(express.json());

app.use(compression());

app.use(helmet({
  crossOriginEmbedderPolicy:false
}));

app.use(morgan("dev"));

app.use(express.static(
  path.join(__dirname, "public")
));

io.on("connection", socket => {

  console.log("⚽ user connected");

  socket.emit("connected", {
    status:"live"
  });

});

app.get("/api/fixtures",
fixtures.getFixtures);

app.get("/api/standings/:league",
standings.getStandings);

app.get("*", (req,res)=>{

  res.sendFile(
    path.join(__dirname,
    "public/index.html")
  );

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{

  console.log(`
=================================
⚽ CYMOR FOOTBALL HUB
🚀 PORT ${PORT}
=================================
`);

});
