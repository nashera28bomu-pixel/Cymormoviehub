document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       ELEMENTS
    ========================= */

    const fileInput =
        document.getElementById("fileInput");

    const dropZone =
        document.getElementById("dropZone");

    const sourceVideo =
        document.getElementById("sourceVideo");

    const fileInfo =
        document.getElementById("fileInfo");

    const startBtn =
        document.getElementById("startBtn");

    const downloadBtn =
        document.getElementById("downloadBtn");

    const loader =
        document.getElementById("loader");

    const progressBar =
        document.getElementById("progressBar");

    const progressText =
        document.getElementById("progressText");

    const statusText =
        document.getElementById("statusText");

    /* =========================
       VARIABLES
    ========================= */

    let selectedFile = null;

    let enhancedVideoURL = null;

    /* =========================
       FILE SELECT
    ========================= */

    fileInput.addEventListener(
        "change",
        handleFileSelect
    );

    function handleFileSelect(e) {

        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("video/")) {

            alert("Please upload a video file");

            return;

        }

        selectedFile = file;

        fileInfo.textContent =
            file.name;

        previewVideo(file);

    }

    /* =========================
       VIDEO PREVIEW
    ========================= */

    function previewVideo(file) {

        const videoURL =
            URL.createObjectURL(file);

        sourceVideo.src = videoURL;

        sourceVideo.load();

        sourceVideo.play();

    }

    /* =========================
       DRAG & DROP
    ========================= */

    dropZone.addEventListener(
        "dragover",
        (e) => {

            e.preventDefault();

            dropZone.style.borderColor =
                "#00e5ff";

        }
    );

    dropZone.addEventListener(
        "dragleave",
        () => {

            dropZone.style.borderColor =
                "rgba(255,255,255,0.08)";

        }
    );

    dropZone.addEventListener(
        "drop",
        (e) => {

            e.preventDefault();

            dropZone.style.borderColor =
                "rgba(255,255,255,0.08)";

            const file =
                e.dataTransfer.files[0];

            if (!file) return;

            selectedFile = file;

            fileInfo.textContent =
                file.name;

            previewVideo(file);

        }
    );

    /* =========================
       ENHANCE BUTTON
    ========================= */

    startBtn.addEventListener(
        "click",
        async () => {

            if (!selectedFile) {

                alert(
                    "Please upload a video first"
                );

                return;

            }

            startEnhancement();

        }
    );

    /* =========================
       ENHANCEMENT PROCESS
    ========================= */

    async function startEnhancement() {

        loader.classList.remove("hidden");

        startBtn.disabled = true;

        startBtn.innerText =
            "PROCESSING...";

        progressBar.style.width = "0%";

        progressText.textContent = "0%";

        statusText.textContent =
            "Uploading video...";

        const formData =
            new FormData();

        formData.append(
            "video",
            selectedFile
        );

        try {

            let progress = 0;

            /* =========================
               FAKE LIVE PROGRESS
            ========================= */

            const progressInterval =
                setInterval(() => {

                    if (progress < 90) {

                        progress +=
                            Math.random() * 8;

                        progressBar.style.width =
                            progress + "%";

                        progressText.textContent =
                            Math.floor(progress) +
                            "%";

                        updateStatus(progress);

                    }

                }, 700);

            /* =========================
               SEND TO SERVER
            ========================= */

            const response =
                await fetch("/enhance", {

                    method: "POST",

                    body: formData

                });

            const data =
                await response.json();

            clearInterval(
                progressInterval
            );

            /* =========================
               SUCCESS
            ========================= */

            if (data.success) {

                progressBar.style.width =
                    "100%";

                progressText.textContent =
                    "100%";

                statusText.textContent =
                    "Enhancement complete";

                enhancedVideoURL =
                    data.video;

                setTimeout(() => {

                    loader.classList.add(
                        "hidden"
                    );

                }, 1200);

                /* =========================
                   SHOW ENHANCED VIDEO
                ========================= */

                sourceVideo.src =
                    enhancedVideoURL;

                sourceVideo.load();

                sourceVideo.play();

                /* =========================
                   DOWNLOAD BUTTON
                ========================= */

                downloadBtn.classList.remove(
                    "hidden"
                );

                downloadBtn.href =
                    enhancedVideoURL;

            } else {

                showError(
                    data.error ||
                    "Enhancement failed"
                );

            }

        } catch (err) {

            console.error(err);

            showError(
                "Server error occurred"
            );

        }

    }

    /* =========================
       STATUS TEXTS
    ========================= */

    function updateStatus(progress) {

        if (progress < 20) {

            statusText.textContent =
                "Uploading video...";

        } else if (progress < 40) {

            statusText.textContent =
                "Analyzing frames...";

        } else if (progress < 60) {

            statusText.textContent =
                "Enhancing details...";

        } else if (progress < 80) {

            statusText.textContent =
                "Applying AI sharpening...";

        } else {

            statusText.textContent =
                "Rendering final video...";

        }

    }

    /* =========================
       ERROR HANDLING
    ========================= */

    function showError(message) {

        loader.classList.add("hidden");

        startBtn.disabled = false;

        startBtn.innerText =
            "ENHANCE TO 4K";

        alert(message);

    }

});
