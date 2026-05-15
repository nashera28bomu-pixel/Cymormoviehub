const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   FOLDERS
========================= */

fs.ensureDirSync("uploads");
fs.ensureDirSync("outputs");

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/outputs", express.static(path.join(__dirname, "outputs")));

/* =========================
   MEMORY SAFE UPLOAD LIMITS
========================= */

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 80 * 1024 * 1024 // 🔥 80MB max (Render-safe)
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("Only video files allowed"));
        }
    }
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/ping", (req, res) => {
    res.json({ status: "ok", message: "CYMOR4K running" });
});

/* =========================
   VIDEO ENHANCEMENT (OPTIMIZED)
========================= */

app.post("/enhance", upload.single("video"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No video uploaded"
            });
        }

        const inputPath = req.file.path;

        const outputName =
            "cymor4k_" + Date.now() + ".mp4";

        const outputPath =
            path.join("outputs", outputName);

        /* =========================
           LIGHTWEIGHT FFmpeg PIPELINE
        ========================= */

        ffmpeg(inputPath)

            .videoFilters([

                // SAFE upscale (no memory spike)
                "scale=1280:-2:flags=lanczos",

                // light enhancement only
                "eq=contrast=1.08:brightness=0.02:saturation=1.08",

                // mild sharpening (safe version)
                "unsharp=3:3:0.6:3:3:0.0"

            ])

            .videoCodec("libx264")

            .outputOptions([

                "-preset veryfast", // 🔥 reduces RAM usage
                "-crf 23", // 🔥 lighter encoding (important)
                "-movflags +faststart",
                "-pix_fmt yuv420p",
                "-threads 1" // 🔥 prevents Render overload crash

            ])

            .audioCodec("aac")
            .audioBitrate("128k")

            .format("mp4")

            .on("start", (cmd) => {
                console.log("FFmpeg started");
                console.log(cmd);
            })

            .on("progress", (progress) => {
                console.log("Progress:", progress.percent || 0);
            })

            .on("end", async () => {

                await fs.remove(inputPath);

                res.json({
                    success: true,
                    video: "/outputs/" + outputName
                });

            })

            .on("error", async (err) => {

                console.error(err);

                await fs.remove(inputPath);

                res.status(500).json({
                    success: false,
                    error: "Processing failed (memory-safe mode)"
                });

            })

            .save(outputPath);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: "Server crash prevented"
        });

    }

});

/* =========================
   AUTO CLEANUP (SAFE)
========================= */

setInterval(async () => {

    try {

        const files = await fs.readdir("outputs");

        const now = Date.now();

        for (const file of files) {

            const filePath = path.join("outputs", file);

            const stats = await fs.stat(filePath);

            const age = now - stats.mtimeMs;

            // delete after 30 mins (Render storage saving)
            if (age > 30 * 60 * 1000) {
                await fs.remove(filePath);
                console.log("Deleted:", file);
            }

        }

    } catch (err) {
        console.error(err);
    }

}, 15 * 60 * 1000);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
    console.log(`CYMOR4K running on port ${PORT}`);
});
