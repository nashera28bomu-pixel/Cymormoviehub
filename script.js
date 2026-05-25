/**
 * =========================================================
 * 🎧 CYMOR SPOTIFY FRONTEND ENGINE v6.0 ELITE PLAYER
 * =========================================================
 * ✅ Custom Preview Player
 * ✅ Real MP3/MP4 Preview
 * ✅ Download Quality Selector
 * ✅ Cleaner Modal
 * ✅ Better Render Stability
 * ✅ Safer HTML Handling
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

        if (!res.ok) throw new Error('Offline');

        const data = await res.json();

        console.log(`🎧 ${data.name} ONLINE`);
    } catch (e) {
        console.log('⚠️ Engine Offline');
    }
}

/* =========================================================
   SEARCH ENGINE
========================================================= */

function setupSearch() {
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

async function performSearch() {
    const query = searchInput.value.trim();

    if (!query || isSearching) return;

    isSearching = true;

    resultsContainer.innerHTML = createLoader();

    searchBtn.disabled = true;

    try {
        const res = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
        );

        if (!res.ok) {
            throw new Error('Search failed');
        }

        const data = await res.json();

        if (
            !data.success ||
            !data.results ||
            data.results.length === 0
        ) {
            resultsContainer.innerHTML =
                createEmptyState('No results found');
            return;
        }

        preferenceSection?.classList.remove('hidden');
        musicSection?.classList.remove('hidden');

        renderResults(data.results);

        showToast(`${data.results.length} tracks found`, 'success');

    } catch (err) {
        console.error(err);

        resultsContainer.innerHTML =
            createEmptyState(
                'Server warming up. Retry in 5 seconds.'
            );

        showToast('Search failed', 'error');

    } finally {
        isSearching = false;
        searchBtn.disabled = false;
    }
}

/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(results) {

    resultsContainer.innerHTML = results.map(track => {

        const cleanTitle =
            sanitizeHTML(track.title);

        const thumb =
            track.thumbnail ||
            'https://placehold.co/300x300';

        return `
        <div class="glass p-3 rounded-2xl flex gap-3 items-center hover:bg-white/5 transition-all">

            <img
                src="${thumb}"
                class="w-16 h-16 rounded-xl object-cover shadow-lg"
                onerror="this.src='https://placehold.co/100x100?text=Music'"
            />

            <div class="flex-1 overflow-hidden">

                <h3 class="text-xs font-bold leading-tight truncate">
                    ${cleanTitle}
                </h3>

                <p class="text-[10px] text-gray-400 mt-1">
                    ${track.author || 'Unknown Artist'}
                </p>

                <div class="flex items-center gap-2 mt-3">

                    <button
                        onclick="openElitePreview(
                            '${track.id}',
                            '${encodeURIComponent(cleanTitle)}',
                            '${thumb}'
                        )"
                        class="bg-yellow-500 text-black font-bold px-4 py-2 rounded-full text-[10px] uppercase tracking-wider active:scale-90"
                    >
                        SELECT
                    </button>

                </div>

            </div>
        </div>
        `;
    }).join('');
}

/* =========================================================
   ELITE PREVIEW PLAYER
========================================================= */

window.openElitePreview = function(videoId, encodedTitle, thumb) {

    const title = decodeURIComponent(encodedTitle);

    const existing = document.getElementById('eliteModal');

    if (existing) existing.remove();

    const modal = document.createElement('div');

    modal.id = 'eliteModal';

    modal.className =
        'fixed inset-0 z-[99999] flex items-center justify-center p-4';

    modal.innerHTML = `
    
    <div class="absolute inset-0 bg-black/90 backdrop-blur-xl"></div>

    <div class="relative w-full max-w-md glass rounded-[30px] overflow-hidden border border-white/10">

        <!-- COVER -->
        <div class="relative h-64">

            <img
                src="${thumb}"
                class="w-full h-full object-cover"
            />

            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

            <button
                onclick="closeEliteModal()"
                class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white"
            >
                ✕
            </button>

            <!-- PLAY BUTTON -->
            <button
                id="previewPlayBtn"
                onclick="togglePreview('${videoId}')"
                class="absolute bottom-5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black w-16 h-16 rounded-full text-2xl shadow-2xl active:scale-90"
            >
                ▶
            </button>

        </div>

        <!-- CONTENT -->
        <div class="p-6">

            <h2 class="text-lg font-bold text-white truncate">
                ${title}
            </h2>

            <p class="text-xs text-gray-400 mt-1">
                Cymor Elite Media Engine
            </p>

            <!-- PLAYER STATUS -->
            <div
                id="previewStatus"
                class="text-center text-[11px] text-yellow-400 mt-4"
            >
                30s Audio Preview
            </div>

            <!-- QUALITY -->
            <div class="mt-6">

                <p class="text-[11px] uppercase tracking-widest text-gray-400 mb-2">
                    Select Quality
                </p>

                <div class="grid grid-cols-3 gap-2">

                    <button
                        onclick="selectQuality(this, '128')"
                        class="quality-select bg-white/10 rounded-xl py-2 text-xs active"
                    >
                        128K
                    </button>

                    <button
                        onclick="selectQuality(this, '320')"
                        class="quality-select bg-white/10 rounded-xl py-2 text-xs"
                    >
                        320K
                    </button>

                    <button
                        onclick="selectQuality(this, '1080')"
                        class="quality-select bg-white/10 rounded-xl py-2 text-xs"
                    >
                        1080P
                    </button>

                </div>
            </div>

            <!-- DOWNLOAD BUTTONS -->
            <div class="grid grid-cols-2 gap-4 mt-6">

                <button
                    onclick="startDownload(
                        '${videoId}',
                        '${encodeURIComponent(title)}',
                        '${thumb}',
                        'mp3'
                    )"
                    class="bg-blue-600 hover:bg-blue-500 rounded-2xl py-3 font-bold text-sm active:scale-95"
                >
                    🎵 MP3
                </button>

                <button
                    onclick="startDownload(
                        '${videoId}',
                        '${encodeURIComponent(title)}',
                        '${thumb}',
                        'mp4'
                    )"
                    class="bg-yellow-500 text-black rounded-2xl py-3 font-bold text-sm active:scale-95"
                >
                    🎬 MP4
                </button>

            </div>

        </div>

    </div>
    `;

    document.body.appendChild(modal);
};

/* =========================================================
   PREVIEW PLAYER
========================================================= */

window.togglePreview = async function(videoId) {

    const btn =
        document.getElementById('previewPlayBtn');

    const status =
        document.getElementById('previewStatus');

    try {

        if (currentAudio && !currentAudio.paused) {

            currentAudio.pause();

            btn.innerHTML = '▶';

            status.innerHTML = 'Preview Paused';

            return;
        }

        status.innerHTML = 'Loading Preview...';

        currentAudio = new Audio(
            `/api/preview?id=${videoId}`
        );

        currentAudio.volume = 1;

        await currentAudio.play();

        btn.innerHTML = '❚❚';

        status.innerHTML = 'Now Playing Preview';

        currentAudio.onended = () => {
            btn.innerHTML = '▶';
            status.innerHTML = 'Preview Finished';
        };

    } catch (err) {

        console.error(err);

        status.innerHTML = 'Preview Failed';

        showToast('Preview unavailable', 'error');
    }
};

/* =========================================================
   CLOSE MODAL
========================================================= */

window.closeEliteModal = function() {

    if (currentAudio) {
        currentAudio.pause();
    }

    const modal =
        document.getElementById('eliteModal');

    if (modal) modal.remove();
};

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

window.startDownload = async function(
    videoId,
    encodedTitle,
    thumbnail,
    forcedFormat = null
) {

    const title = decodeURIComponent(encodedTitle);

    const format = forcedFormat || selectedFormat;

    showToast(
        `Preparing ${format.toUpperCase()} Download...`,
        'success'
    );

    const url =
        `/api/download?id=${videoId}&format=${format}&quality=${selectedQuality}`;

    const a = document.createElement('a');

    a.href = url;

    a.download = '';

    document.body.appendChild(a);

    a.click();

    a.remove();

    addToHistory({
        videoId,
        title,
        thumbnail,
        format,
        date: new Date().toLocaleDateString()
    });

    setTimeout(() => {
        closeEliteModal();
    }, 1000);
};

/* =========================================================
   QUALITY SELECT
========================================================= */

window.selectQuality = function(btn, quality) {

    selectedQuality = quality;

    document
        .querySelectorAll('.quality-select')
        .forEach(el => {
            el.classList.remove(
                'bg-yellow-500',
                'text-black'
            );
        });

    btn.classList.add(
        'bg-yellow-500',
        'text-black'
    );

    showToast(
        `Quality set to ${quality}`,
        'success'
    );
};

/* =========================================================
   FORMAT SELECTION
========================================================= */

function setupFormatSelection() {

    formatButtons.forEach(btn => {

        btn.addEventListener('click', () => {

            formatButtons.forEach(b =>
                b.classList.remove('active')
            );

            btn.classList.add('active');

            selectedFormat =
                btn.id === 'mp4-btn'
                    ? 'mp4'
                    : 'mp3';
        });
    });
}

/* =========================================================
   QUALITY BUTTONS
========================================================= */

function setupQualitySelection() {

    qualityButtons.forEach(btn => {

        btn.addEventListener('click', () => {

            qualityButtons.forEach(b =>
                b.classList.remove('active')
            );

            btn.classList.add('active');

            selectedQuality =
                btn.dataset.quality || '320';
        });
    });
}

/* =========================================================
   HISTORY
========================================================= */

function addToHistory(item) {

    downloadHistory = [
        item,
        ...downloadHistory.filter(
            i => i.videoId !== item.videoId
        )
    ].slice(0, 10);

    localStorage.setItem(
        'cymor_downloads',
        JSON.stringify(downloadHistory)
    );

    renderDownloadHistory();
}

function renderDownloadHistory() {

    if (!downloadsContainer) return;

    downloadsContainer.innerHTML =
        downloadHistory.map(item => `

        <div class="glass p-2 rounded-xl flex gap-2 items-center">

            <img
                src="${item.thumbnail}"
                class="w-10 h-10 rounded-lg object-cover"
            />

            <div class="overflow-hidden">

                <p class="text-[10px] font-bold truncate text-white">
                    ${sanitizeHTML(item.title)}
                </p>

                <p class="text-[8px] text-yellow-400 uppercase">
                    ${item.format}
                </p>

            </div>

        </div>

    `).join('');
}

/* =========================================================
   HELPERS
========================================================= */

function createLoader() {

    return `
    <div class="flex flex-col items-center justify-center p-20 gap-4">

        <div class="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>

        <p class="text-xs text-gray-400 font-mono tracking-widest">
            CONNECTING TO CYMOR ENGINE...
        </p>

    </div>
    `;
}

function createEmptyState(msg) {

    return `
    <div class="text-center p-10 text-gray-500 text-xs">
        ${msg}
    </div>
    `;
}

function sanitizeHTML(str) {

    const div = document.createElement('div');

    div.textContent = str;

    return div.innerHTML;
}

/* =========================================================
   TOAST
========================================================= */

function showToast(msg, type = 'success') {

    const container =
        document.getElementById('toast');

    if (!container) return;

    const el =
        document.createElement('div');

    el.className = `
        px-6 py-3 rounded-full text-white text-[10px]
        font-bold shadow-2xl transition-all duration-500
        transform translate-y-10 opacity-0
        ${type === 'success'
            ? 'bg-blue-600'
            : 'bg-red-600'}
    `;

    el.textContent = msg;

    container.appendChild(el);

    setTimeout(() => {
        el.classList.remove(
            'translate-y-10',
            'opacity-0'
        );
    }, 10);

    setTimeout(() => {

        el.classList.add('opacity-0');

        setTimeout(() => {
            el.remove();
        }, 500);

    }, 3000);
}

function createToastContainer() {

    if (document.getElementById('toast'))
        return;

    const div =
        document.createElement('div');

    div.id = 'toast';

    div.className =
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none flex flex-col gap-2';

    document.body.appendChild(div);
}
