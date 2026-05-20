/**
 * =========================================================
 * 🎧 CYMOR SPOTIFY FRONTEND ENGINE v5.0
 * =========================================================
 */

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const downloadsContainer = document.getElementById('downloads-container');

const formatButtons = document.querySelectorAll('.format-btn');
const qualityButtons = document.querySelectorAll('.quality-btn');

const preferenceSection = document.getElementById('preference-section');
const musicSection = document.getElementById('music-section');

let selectedFormat = 'mp3';
let selectedQuality = '320';
let isSearching = false;
let downloadHistory = JSON.parse(localStorage.getItem('cymor_downloads')) || [];

/* =========================================================
   INIT
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupFormatSelection();
    setupQualitySelection();
    createToastContainer();
    fetchServerStatus();
    renderDownloadHistory();
});

/* =========================================================
   SERVER STATUS
========================================================= */

async function fetchServerStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        console.log(`🎧 ${data.app}`);
        console.log(`⚡ ${data.engine}`);
    } catch (e) {
        console.log('Offline mode');
    }
}

/* =========================================================
   SEARCH ENGINE
========================================================= */

function setupSearch() {
    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') performSearch();
    });
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query || isSearching) return;

    isSearching = true;
    resultsContainer.innerHTML = createLoader();

    searchBtn.disabled = true;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!data.success || !data.results.length) {
            resultsContainer.innerHTML = createEmptyState("No results found");
            return;
        }

        preferenceSection?.classList.remove('hidden');
        musicSection?.classList.remove('hidden');

        renderResults(data.results);

        showToast(`${data.results.length} tracks found`, 'success');

    } catch (e) {
        resultsContainer.innerHTML = createEmptyState("Server error");
        showToast("Connection failed", "error");
    } finally {
        isSearching = false;
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Go';
    }
}

/* =========================================================
   FORMAT + QUALITY
========================================================= */

function setupFormatSelection() {
    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => resetBtn(b));
            activateBtn(btn);

            selectedFormat = btn.textContent.includes('MP4') ? 'mp4' : 'mp3';

            showToast(`Format: ${selectedFormat.toUpperCase()}`, 'success');
        });
    });
}

function setupQualitySelection() {
    qualityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            qualityButtons.forEach(b => resetBtn(b));
            activateBtn(btn);

            selectedQuality = btn.textContent.replace(/[^\d]/g, '');

            showToast(`Quality: ${selectedQuality}`, 'success');
        });
    });
}

function resetBtn(btn) {
    btn.classList.remove('active');
}

function activateBtn(btn) {
    btn.classList.add('active');
}

/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(results) {
    resultsContainer.innerHTML = results.map(track => `
        <div class="glass p-3 rounded-2xl flex gap-3">

            <img src="${track.thumbnail}" class="w-20 h-20 rounded-xl object-cover"/>

            <div class="flex-1">

                <h3 class="text-xs font-bold">${sanitizeHTML(track.title)}</h3>

                <p class="text-[10px] text-gray-400">
                    ${track.author} • ${formatViews(track.views)} views
                </p>

                <div class="flex gap-2 mt-2">

                    <button onclick="startDownload('${track.id}','${track.title.replace(/'/g,'')}','${track.thumbnail}')"
                        class="bg-blue-500 px-3 py-1 rounded-lg text-[10px]">
                        Download
                    </button>

                    <button onclick="openPreviewPlayer('${track.id}','${sanitizeHTML(track.title)}')"
                        class="glass px-3 rounded-lg text-sm">
                        ▶
                    </button>

                </div>

            </div>

        </div>
    `).join('');
}

/* =========================================================
   SPOTIFY-LEVEL DOWNLOAD ENGINE
========================================================= */

async function startDownload(videoId, title, thumbnail) {
    showDownloadOverlay();

    const url = `/api/download?id=${videoId}&format=${selectedFormat}&quality=${selectedQuality}`;

    const jobId = await triggerDownload(url);

    trackJobProgress(jobId);

    addToHistory({
        videoId,
        title,
        thumbnail,
        format: selectedFormat,
        date: new Date().toLocaleDateString()
    });
}

/* =========================================================
   JOB SYSTEM (REAL SPOTIFY STYLE)
========================================================= */

async function triggerDownload(url) {
    try {
        const res = await fetch(url);
        const data = await res.json?.();

        return data?.jobId || null;
    } catch {
        // fallback: no job system available
        window.location.href = url;
        return null;
    }
}

async function trackJobProgress(jobId) {
    if (!jobId) return;

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/job/${jobId}`);
            const data = await res.json();

            if (!data.success) return;

            updateDownloadStatus(
                `Downloading...`,
                `${data.job.progress}%`
            );

            if (data.job.status === 'done') {
                clearInterval(interval);

                showToast("Download complete", "success");

                setTimeout(hideDownloadOverlay, 1500);
            }

            if (data.job.status === 'failed') {
                clearInterval(interval);
                showToast("Download failed", "error");
                hideDownloadOverlay();
            }

        } catch (e) {
            clearInterval(interval);
        }
    }, 1000);
}

/* =========================================================
   DOWNLOAD HISTORY
========================================================= */

function addToHistory(item) {
    downloadHistory.unshift(item);
    downloadHistory = downloadHistory.slice(0, 10);

    localStorage.setItem('cymor_downloads', JSON.stringify(downloadHistory));
    renderDownloadHistory();
}

function renderDownloadHistory() {
    if (!downloadsContainer) return;

    downloadsContainer.innerHTML = downloadHistory.map(item => `
        <div class="glass p-3 rounded-xl flex gap-2">
            <img src="${item.thumbnail}" class="w-14 h-14 rounded-lg object-cover"/>

            <div>
                <p class="text-xs font-bold">${sanitizeHTML(item.title)}</p>
                <p class="text-[10px] text-blue-400 uppercase">${item.format}</p>
            </div>
        </div>
    `).join('');
}

/* =========================================================
   PREVIEW PLAYER
========================================================= */

function openPreviewPlayer(videoId, title) {
    const modal = document.createElement('div');

    modal.className = "fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]";
    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-black rounded-2xl overflow-hidden">

            <div class="p-3 border-b border-white/10 flex justify-between">
                <span class="text-white text-xs">${title}</span>
                <button onclick="this.closest('div').remove()" class="text-white">✕</button>
            </div>

            <iframe
                class="w-full aspect-video"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                allowfullscreen>
            </iframe>

        </div>
    `;

    document.body.appendChild(modal);
}

/* =========================================================
   TOAST SYSTEM
========================================================= */

function createToastContainer() {
    if (document.getElementById('toast')) return;

    const div = document.createElement('div');
    div.id = 'toast';
    div.className = "fixed top-5 left-1/2 -translate-x-1/2 space-y-2";
    document.body.appendChild(div);
}

function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `px-4 py-2 rounded-lg text-white text-xs ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;

    el.textContent = msg;

    document.getElementById('toast').appendChild(el);

    setTimeout(() => el.remove(), 2500);
}

/* =========================================================
   UI HELPERS
========================================================= */

function createLoader() {
    return `<div class="text-center p-10 text-gray-400">Loading...</div>`;
}

function createEmptyState(msg) {
    return `<div class="text-center p-10 text-gray-400">${msg}</div>`;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatViews(v) {
    if (!v) return '0';
    if (v > 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v > 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v;
}
