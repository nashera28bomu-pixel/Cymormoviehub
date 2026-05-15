const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================
   CREATE REQUIRED FOLDERS
========================= */

fs.ensureDirSync("uploads");
fs.ensureDirSync("outputs");
fs.ensureDirSync("temp");

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.use("/outputs", express.static(path.join(__dirname, "outputs")));

/* =========================
   MULTER STORAGE
========================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/");

    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            file.originalname.replace(/\s+/g, "_");

        cb(null, uniqueName);

    }

});

const upload = multer({

    storage,

    limits: {

        fileSize: 500 * 1024 * 1024 // 500MB

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
   HEALTH ROUTE
========================= */

app.get("/ping", (req, res) => {

    res.json({

        status: "ok",
        message: "CYMOR4K server online"

    });

});

/* =========================
   VIDEO ENHANCEMENT ROUTE
========================= */

app.post(
    "/enhance",
    upload.single("video"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,
                    error: "No video uploaded"

                });

            }

            const inputPath = req.file.path;

            const outputName =
                "cymor4k_" +
                Date.now() +
                ".mp4";

            const outputPath =
                path.join("outputs", outputName);

            /* =========================
               VIDEO ENHANCEMENT
            ========================= */

            ffmpeg(inputPath)

                // VIDEO FILTERS
                .videoFilters([
                    "eq=contrast=1.12:brightness=0.03:saturation=1.15",
                    "unsharp=5:5:1.2:5:5:0.0",
                    "hqdn3d=1.5:1.5:6:6",
                    "scale=1920:1080:flags=lanczos"
                ])

                // VIDEO SETTINGS
                .videoCodec("libx264")

                .outputOptions([
                    "-preset medium",
                    "-crf 18",
                    "-pix_fmt yuv420p",
                    "-movflags +faststart"
                ])

                // AUDIO
                .audioCodec("aac")

                .audioBitrate("192k")

                // OUTPUT
                .format("mp4")

                .on("start", (command) => {

                    console.log("FFmpeg started");

                    console.log(command);

                })

                .on("progress", (progress) => {

                    console.log(
                        "Processing:",
                        progress.percent
                            ? progress.percent.toFixed(2)
                            : 0,
                        "%"
                    );

                })

                .on("end", async () => {

                    console.log("Enhancement finished");

                    // DELETE ORIGINAL FILE
                    await fs.remove(inputPath);

                    res.json({

                        success: true,

                        video:
                            "/outputs/" +
                            outputName

                    });

                })

                .on("error", async (err) => {

                    console.error(err);

                    await fs.remove(inputPath);

                    res.status(500).json({

                        success: false,
                        error: "Video enhancement failed"

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

    }
);

/* =========================
   AUTO CLEANUP OLD FILES
========================= */

setInterval(async () => {

    try {

        const files =
            await fs.readdir("outputs");

        const now = Date.now();

        for (const file of files) {

            const filePath =
                path.join("outputs", file);

            const stats =
                await fs.stat(filePath);

            const age =
                now - stats.mtimeMs;

            // DELETE AFTER 1 HOUR
            if (age > 60 * 60 * 1000) {

                await fs.remove(filePath);

                console.log(
                    "Deleted old file:",
                    file
                );

            }

        }

    } catch (err) {

        console.error(err);

    }

}, 30 * 60 * 1000);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

    console.log(
        `CYMOR4K running on port ${PORT}`
    );

});
