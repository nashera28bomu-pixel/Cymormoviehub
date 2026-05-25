/**
 * =========================================================
 * 🎧 CYMOR FRONTEND ENGINE v7.0 PIPED READY
 * =========================================================
 * 🚀 Optimized for Piped + Invidious backend
 * 🚀 Faster streaming
 * 🚀 Better mobile stability
 * 🚀 Safer audio lifecycle
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

let currentAudio = null;
let currentStreamUrl = null;

let downloadHistory =
    JSON.parse(localStorage.getItem('cymor_downloads')) || [];

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
        if (!res.ok) throw new Error();

        const data = await res.json();
        console.log(`🎧 ${data.name} ONLINE`);
    } catch {
        console.log('⚠️ Cymor Engine Offline');
    }
}

/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {
    searchBtn?.addEventListener('click', performSearch);

    searchInput?.addEventListener('keypress', e => {
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
            resultsContainer.innerHTML = createEmptyState('No results found');
            return;
        }

        preferenceSection?.classList.remove('hidden');
        musicSection?.classList.remove('hidden');

        renderResults(data.results);

        showToast(`${data.results.length} tracks found`, 'success');

    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = createEmptyState('Try again shortly');
        showToast('Search failed', 'error');

    } finally {
        isSearching = false;
        searchBtn.disabled = false;
    }
}

/* =========================================================
   RESULTS
========================================================= */

function renderResults(results) {
    resultsContainer.innerHTML = results.map(track => {
        const title = sanitizeHTML(track.title);
        const thumb = track.thumbnail || 'https://placehold.co/300x300';

        return `
        <div class="glass p-3 rounded-2xl flex gap-3 items-center hover:bg-white/5 transition">

            <img src="${thumb}" class="w-16 h-16 rounded-xl object-cover" />

            <div class="flex-1 overflow-hidden">

                <h3 class="text-xs font-bold truncate">${title}</h3>

                <p class="text-[10px] text-gray-400">
                    ${track.author || 'Unknown'}
                </p>

                <button
                    onclick="openElitePreview(
                        '${track.id}',
                        '${encodeURIComponent(title)}',
                        '${thumb}'
                    )"
                    class="mt-2 bg-yellow-500 text-black px-4 py-2 rounded-full text-[10px]"
                >
                    SELECT
                </button>

            </div>
        </div>`;
    }).join('');
}

/* =========================================================
   ELITE PREVIEW
========================================================= */

window.openElitePreview = function(id, encodedTitle, thumb) {

    const title = decodeURIComponent(encodedTitle);

    document.getElementById('eliteModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'eliteModal';

    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4';

    modal.innerHTML = `
    <div class="absolute inset-0 bg-black/90"></div>

    <div class="relative w-full max-w-md glass rounded-3xl overflow-hidden">

        <div class="h-64 relative">
            <img src="${thumb}" class="w-full h-full object-cover" />

            <button onclick="closeEliteModal()" class="absolute top-3 right-3 bg-black/60 w-10 h-10 rounded-full">✕</button>

            <button id="previewBtn"
                onclick="togglePreview('${id}')"
                class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 w-16 h-16 rounded-full">
                ▶
            </button>
        </div>

        <div class="p-5">

            <h2 class="text-white font-bold truncate">${title}</h2>

            <p class="text-xs text-gray-400 mt-1">Cymor Streaming Engine</p>

            <div id="status" class="text-center text-yellow-400 text-xs mt-4">
                Ready to preview
            </div>

            <div class="grid grid-cols-2 gap-4 mt-5">

                <button onclick="startDownload('${id}','${encodeURIComponent(title)}','${thumb}','mp3')"
                    class="bg-blue-600 py-3 rounded-xl text-sm">
                    🎵 MP3
                </button>

                <button onclick="startDownload('${id}','${encodeURIComponent(title)}','${thumb}','mp4')"
                    class="bg-yellow-500 text-black py-3 rounded-xl text-sm">
                    🎬 MP4
                </button>

            </div>

        </div>
    </div>`;

    document.body.appendChild(modal);
};

/* =========================================================
   PREVIEW STREAM (FIXED MEMORY HANDLING)
========================================================= */

window.togglePreview = async function(id) {

    const btn = document.getElementById('previewBtn');
    const status = document.getElementById('status');

    try {

        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio = null;

            btn.innerHTML = '▶';
            status.innerText = 'Paused';
            return;
        }

        status.innerText = 'Loading...';

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(`/api/preview?id=${id}`);
        currentAudio.preload = 'auto';

        await currentAudio.play();

        btn.innerHTML = '❚❚';
        status.innerText = 'Playing preview';

        currentAudio.onended = () => {
            btn.innerHTML = '▶';
            status.innerText = 'Finished';
        };

    } catch (err) {
        console.error(err);
        status.innerText = 'Preview failed';
        showToast('Preview unavailable', 'error');
    }
};

/* =========================================================
   CLOSE
========================================================= */

window.closeEliteModal = function() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    document.getElementById('eliteModal')?.remove();
};

/* =========================================================
   DOWNLOAD
========================================================= */

window.startDownload = function(id, encodedTitle, thumb, forcedFormat) {

    const title = decodeURIComponent(encodedTitle);
    const format = forcedFormat || selectedFormat;

    showToast(`Downloading ${format.toUpperCase()}...`, 'success');

    const url = `/api/download?id=${id}&format=${format}&quality=${selectedQuality}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();

    addToHistory({
        videoId: id,
        title,
        thumbnail: thumb,
        format,
        date: new Date().toLocaleDateString()
    });

    setTimeout(() => closeEliteModal(), 800);
};

/* =========================================================
   QUALITY + FORMAT
========================================================= */

window.selectQuality = function(btn, quality) {
    selectedQuality = quality;

    document.querySelectorAll('.quality-select')
        .forEach(b => b.classList.remove('bg-yellow-500'));

    btn.classList.add('bg-yellow-500');

    showToast(`Quality ${quality}`, 'success');
};

function setupFormatSelection() {
    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedFormat = btn.id === 'mp4-btn' ? 'mp4' : 'mp3';
        });
    });
}

function setupQualitySelection() {
    qualityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            qualityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedQuality = btn.dataset.quality || '320';
        });
    });
}

/* =========================================================
   HISTORY (OPTIMIZED)
========================================================= */

function addToHistory(item) {
    downloadHistory = [item, ...downloadHistory]
        .filter((v, i, a) => a.findIndex(x => x.videoId === v.videoId) === i)
        .slice(0, 10);

    localStorage.setItem('cymor_downloads', JSON.stringify(downloadHistory));
    renderDownloadHistory();
}

function renderDownloadHistory() {
    if (!downloadsContainer) return;

    downloadsContainer.innerHTML = downloadHistory.map(item => `
        <div class="glass p-2 rounded-xl flex gap-2 items-center">
            <img src="${item.thumbnail}" class="w-10 h-10 rounded-lg" />
            <div>
                <p class="text-[10px] truncate">${sanitizeHTML(item.title)}</p>
                <p class="text-[8px] text-yellow-400">${item.format}</p>
            </div>
        </div>
    `).join('');
}

/* =========================================================
   HELPERS
========================================================= */

function createLoader() {
    return `<div class="p-10 text-center text-xs text-gray-400">Loading Cymor Engine...</div>`;
}

function createEmptyState(msg) {
    return `<div class="p-10 text-center text-xs text-gray-500">${msg}</div>`;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* =========================================================
   TOAST
========================================================= */

function showToast(msg, type) {
    const container = document.getElementById('toast');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `px-4 py-2 text-xs rounded-full text-white ${type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
    el.innerText = msg;

    container.appendChild(el);

    setTimeout(() => el.remove(), 3000);
}

function createToastContainer() {
    if (document.getElementById('toast')) return;

    const div = document.createElement('div');
    div.id = 'toast';
    div.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[99999]';

    document.body.appendChild(div);
}
