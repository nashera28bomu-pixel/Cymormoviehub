/**
 * =========================================================
 * 🎵 CYMOR MUSIC DOWNLOADER — ELITE FRONTEND ENGINE
 * =========================================================
 * Creator:
 * Legendary Smiley Cymor
 * CEO of CymorTechServices
 * =========================================================
 */

/* =========================================================
   ELEMENTS
========================================================= */

const searchInput = document.getElementById('search-input');

const searchBtn = document.getElementById('search-btn');

const resultsContainer = document.getElementById('results-container');

const formatButtons = document.querySelectorAll('.format-btn');

const qualityButtons = document.querySelectorAll('.quality-btn');

/* =========================================================
   GLOBAL STATES
========================================================= */

let selectedFormat = 'mp3';

let selectedQuality = '320';

let isSearching = false;

/* =========================================================
   INITIALIZATION
========================================================= */

initializeApp();

/* =========================================================
   INITIALIZE APP
========================================================= */

function initializeApp() {

    setupSearch();

    setupFormatSelection();

    setupQualitySelection();

    createToastContainer();

    fetchServerStatus();

}

/* =========================================================
   SERVER STATUS
========================================================= */

async function fetchServerStatus() {

    try {

        const response = await fetch('/api/status');

        const data = await response.json();

        console.log(`
🎵 ${data.app}
👑 ${data.creator}
🚀 STATUS: ${data.status}
        `);

    } catch (error) {

        console.log('Server status unavailable.');

    }

}

/* =========================================================
   SEARCH SYSTEM
========================================================= */

function setupSearch() {

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', function(event) {

        if (event.key === 'Enter') {
            performSearch();
        }

    });

}

/* =========================================================
   FORMAT SELECTOR
========================================================= */

function setupFormatSelection() {

    formatButtons.forEach(button => {

        button.addEventListener('click', () => {

            formatButtons.forEach(btn => {

                btn.classList.remove(
                    'bg-gradient-to-r',
                    'from-blue-500',
                    'to-cyan-500',
                    'active'
                );

            });

            button.classList.add(
                'bg-gradient-to-r',
                'from-blue-500',
                'to-cyan-500',
                'active'
            );

            selectedFormat = button.textContent.includes('MP4')
                ? 'mp4'
                : 'mp3';

            updateQualityVisibility();

            showToast(
                `Selected ${selectedFormat.toUpperCase()} format`,
                'success'
            );

        });

    });

}

/* =========================================================
   QUALITY SELECTOR
========================================================= */

function setupQualitySelection() {

    qualityButtons.forEach(button => {

        button.addEventListener('click', () => {

            qualityButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            button.classList.add('active');

            selectedQuality = button.textContent
                .replace('kbps', '')
                .replace('p', '')
                .trim();

            showToast(
                `Quality set to ${button.textContent}`,
                'success'
            );

        });

    });

}

/* =========================================================
   QUALITY VISIBILITY
========================================================= */

function updateQualityVisibility() {

    qualityButtons.forEach(button => {

        const text = button.textContent;

        if (selectedFormat === 'mp3') {

            if (text.includes('p')) {
                button.style.display = 'none';
            } else {
                button.style.display = 'block';
            }

        } else {

            if (text.includes('kbps')) {
                button.style.display = 'none';
            } else {
                button.style.display = 'block';
            }

        }

    });

}

/* =========================================================
   PERFORM SEARCH
========================================================= */

async function performSearch() {

    const query = searchInput.value.trim();

    if (!query) {

        showToast('Please enter a search term', 'error');

        return;

    }

    if (isSearching) return;

    isSearching = true;

    resultsContainer.innerHTML = createLoader();

    searchBtn.disabled = true;

    searchBtn.innerHTML = `
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    `;

    try {

        const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!data.success) {

            resultsContainer.innerHTML = createEmptyState(
                'Search failed'
            );

            return;

        }

        if (data.results.length === 0) {

            resultsContainer.innerHTML = createEmptyState(
                'No songs found'
            );

            return;

        }

        renderResults(data.results);

        showToast(
            `${data.results.length} songs found`,
            'success'
        );

    } catch (error) {

        console.error(error);

        resultsContainer.innerHTML = createEmptyState(
            'Server connection failed'
        );

        showToast(
            'Backend server unavailable',
            'error'
        );

    } finally {

        isSearching = false;

        searchBtn.disabled = false;

        searchBtn.innerHTML = 'Go';

    }

}

/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(results) {

    resultsContainer.innerHTML = '';

    results.forEach(track => {

        const card = document.createElement('div');

        card.className = `
            glass
            rounded-[28px]
            p-3
            flex
            gap-3
            border
            border-white/5
            hover:border-blue-500/20
            transition-all
            duration-300
            animate-fadeIn
        `;

        card.innerHTML = `

            <div class="relative">

                <img
                    src="${track.thumbnail}"
                    alt="${track.title}"
                    class="w-28 h-28 object-cover rounded-2xl"
                    loading="lazy"
                >

                <div class="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-lg text-[10px]">
                    ${track.duration}
                </div>

            </div>

            <div class="flex-1 min-w-0">

                <div class="flex items-start justify-between gap-2">

                    <div>

                        <h3 class="font-bold text-sm line-clamp-2 leading-snug">
                            ${sanitizeHTML(track.title)}
                        </h3>

                        <p class="text-xs text-gray-400 mt-2">
                            ${track.author}
                        </p>

                        <p class="text-[11px] text-gray-500 mt-1">
                            ${formatViews(track.views)} views • ${track.ago}
                        </p>

                    </div>

                    <button
                        onclick="previewTrack('${track.url}')"
                        class="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-95 transition-all"
                    >
                        ▶️
                    </button>

                </div>

                <div class="flex gap-2 mt-4">

                    <button
                        onclick="startDownload('${track.id}')"
                        class="
                            flex-1
                            bg-gradient-to-r
                            from-emerald-500
                            to-green-500
                            rounded-xl
                            py-2.5
                            text-sm
                            font-semibold
                            active:scale-95
                            transition-all
                        "
                    >
                        ⬇ Download
                    </button>

                </div>

            </div>
        `;

        resultsContainer.appendChild(card);

    });

}

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

async function startDownload(videoId) {

    try {

        showDownloadOverlay();

        updateDownloadStatus(
            'Preparing your download...',
            '20%'
        );

        const downloadURL =
            `/api/download?id=${videoId}` +
            `&format=${selectedFormat}` +
            `&quality=${selectedQuality}`;

        setTimeout(() => {

            updateDownloadStatus(
                `Downloading ${selectedFormat.toUpperCase()}...`,
                '65%'
            );

        }, 1200);

        setTimeout(() => {

            updateDownloadStatus(
                'Finalizing download...',
                '92%'
            );

        }, 2500);

        setTimeout(() => {

            window.location.href = downloadURL;

            updateDownloadStatus(
                'Download started successfully',
                '100%'
            );

            showToast(
                `${selectedFormat.toUpperCase()} download started`,
                'success'
            );

        }, 3500);

        setTimeout(() => {

            hideDownloadOverlay();

        }, 5000);

    } catch (error) {

        console.error(error);

        hideDownloadOverlay();

        showToast(
            'Download failed',
            'error'
        );

    }

}

/* =========================================================
   PREVIEW TRACK
========================================================= */

function previewTrack(url) {

    window.open(url, '_blank');

}

/* =========================================================
   DOWNLOAD OVERLAY
========================================================= */

function showDownloadOverlay() {

    let overlay = document.getElementById('download-overlay');

    if (overlay) overlay.remove();

    overlay = document.createElement('div');

    overlay.id = 'download-overlay';

    overlay.className = `
        fixed
        inset-0
        bg-black/80
        backdrop-blur-xl
        z-[999]
        flex
        items-center
        justify-center
        px-5
    `;

    overlay.innerHTML = `

        <div class="
            glass
            rounded-[32px]
            p-6
            w-full
            max-w-sm
            border
            border-blue-500/20
        ">

            <div class="text-center">

                <div class="
                    w-20
                    h-20
                    rounded-full
                    bg-gradient-to-r
                    from-blue-500
                    to-purple-600
                    flex
                    items-center
                    justify-center
                    mx-auto
                    text-4xl
                    animate-pulse
                ">
                    ⬇
                </div>

                <h2 class="text-xl font-bold mt-5">
                    Cymor Downloader
                </h2>

                <p
                    id="download-message"
                    class="text-sm text-gray-400 mt-2"
                >
                    Preparing...
                </p>

                <div class="
                    mt-5
                    w-full
                    h-3
                    bg-white/5
                    rounded-full
                    overflow-hidden
                ">

                    <div
                        id="download-progress"
                        class="
                            h-full
                            w-[0%]
                            bg-gradient-to-r
                            from-blue-500
                            to-purple-600
                            rounded-full
                            transition-all
                            duration-500
                        "
                    ></div>

                </div>

                <p
                    id="download-percent"
                    class="text-sm text-blue-300 mt-3 font-semibold"
                >
                    0%
                </p>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);

}

/* =========================================================
   UPDATE DOWNLOAD STATUS
========================================================= */

function updateDownloadStatus(message, percent) {

    const msg = document.getElementById('download-message');

    const progress = document.getElementById('download-progress');

    const percentText = document.getElementById('download-percent');

    if (msg) msg.textContent = message;

    if (progress) {
        progress.style.width = percent;
    }

    if (percentText) {
        percentText.textContent = percent;
    }

}

/* =========================================================
   HIDE DOWNLOAD OVERLAY
========================================================= */

function hideDownloadOverlay() {

    const overlay = document.getElementById('download-overlay');

    if (overlay) {
        overlay.remove();
    }

}

/* =========================================================
   TOAST SYSTEM
========================================================= */

function createToastContainer() {

    const toastContainer = document.createElement('div');

    toastContainer.id = 'toast-container';

    toastContainer.className = `
        fixed
        top-5
        left-1/2
        -translate-x-1/2
        z-[9999]
        space-y-3
    `;

    document.body.appendChild(toastContainer);

}

/* =========================================================
   SHOW TOAST
========================================================= */

function showToast(message, type = 'success') {

    const toastContainer = document.getElementById('toast-container');

    const toast = document.createElement('div');

    const bg =
        type === 'success'
            ? 'from-emerald-500 to-green-500'
            : 'from-red-500 to-pink-500';

    toast.className = `
        bg-gradient-to-r
        ${bg}
        text-white
        px-5
        py-3
        rounded-2xl
        shadow-2xl
        text-sm
        font-medium
        animate-bounce
    `;

    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);

}

/* =========================================================
   LOADER UI
========================================================= */

function createLoader() {

    return `

        <div class="flex flex-col items-center justify-center py-16">

            <div class="
                w-14
                h-14
                border-4
                border-blue-500
                border-t-transparent
                rounded-full
                animate-spin
            "></div>

            <p class="text-gray-400 text-sm mt-5">
                Searching Cymor servers...
            </p>

        </div>

    `;

}

/* =========================================================
   EMPTY STATE
========================================================= */

function createEmptyState(message) {

    return `

        <div class="glass rounded-[28px] p-10 text-center">

            <div class="text-5xl mb-4">
                🎵
            </div>

            <h2 class="text-lg font-bold">
                ${message}
            </h2>

            <p class="text-sm text-gray-400 mt-2">
                Try another keyword or artist.
            </p>

        </div>

    `;

}

/* =========================================================
   FORMAT VIEWS
========================================================= */

function formatViews(views) {

    if (!views) return '0';

    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    }

    if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }

    return views;

}

/* =========================================================
   SANITIZE HTML
========================================================= */

function sanitizeHTML(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;

}
