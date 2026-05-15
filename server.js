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
   FILE LIMIT (YOUR REQUEST)
========================= */

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 40 * 1024 * 1024 // 40MB max ✅
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
   REAL PROGRESS HELPER
========================= */

function parseTimeToSeconds(time) {
    if (!time) return 0;
    const parts = time.split(":");
    if (parts.length !== 3) return 0;

    const [h, m, s] = parts;
    return (+h) * 3600 + (+m) * 60 + parseFloat(s);
}

/* =========================
   ENHANCE ROUTE (REAL PROGRESS)
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

        let totalDuration = 0;
        let lastProgress = 0;

        /* =========================
           FFPROBE (GET DURATION)
        ========================= */

        ffmpeg.ffprobe(inputPath, (err, metadata) => {

            if (err) {
                console.error(err);
            } else {
                totalDuration =
                    metadata.format.duration || 0;
            }

        });

        /* =========================
           FFmpeg PROCESS (YOUR FAST PIPELINE)
        ========================= */

        const command = ffmpeg(inputPath)

            .videoFilters([

                "scale=960:-2",
                "eq=contrast=1.06:brightness=0.015:saturation=1.05",
                "unsharp=3:3:0.5"

            ])

            .videoCodec("libx264")

            .outputOptions([

                "-preset ultrafast",
                "-crf 26",
                "-movflags +faststart",
                "-pix_fmt yuv420p",
                "-threads 1"

            ])

            .audioCodec("aac")
            .audioBitrate("96k")
            .format("mp4")

            /* =========================
               REAL PROGRESS TRACKING
            ========================= */

            .on("start", (cmd) => {
                console.log("FFmpeg started");
                console.log(cmd);
            })

            .on("progress", (progress) => {

                let percent = 0;

                if (progress.timemark && totalDuration) {

                    const current =
                        parseTimeToSeconds(progress.timemark);

                    percent =
                        (current / totalDuration) * 100;

                } else if (progress.percent) {

                    percent = progress.percent;

                }

                percent = Math.min(100, Math.max(lastProgress, percent));

                lastProgress = percent;

                console.log("Progress:", percent.toFixed(2), "%");

            })

            .on("end", async () => {

                console.log("Enhancement finished");

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
                    error: "Video processing failed"

                });

            })

            .save(outputPath);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: "Server error"
        });

    }

});

/* =========================
   CLEANUP
========================= */

setInterval(async () => {

    try {

        const files = await fs.readdir("outputs");

        const now = Date.now();

        for (const file of files) {

            const filePath = path.join("outputs", file);

            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > 30 * 60 * 1000) {
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
