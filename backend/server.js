const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const tmdbRoutes = require("./routes/tmdb");
const trailerRoutes = require("./routes/trailers");
const downloadRoutes = require("./routes/download");
const aiRoutes = require("./routes/ai");
const streamRoutes = require("./routes/stream");

const app = express();

app.use(express.json());
app.use(compression());
app.use(helmet());

app.use(cors({
  origin: "*"
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.get("/", (req, res) => {
  res.json({
    status: "Cymor Movie Hub Backend Running"
  });
});

app.use("/api/tmdb", tmdbRoutes);
app.use("/api/trailers", trailerRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stream", streamRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
