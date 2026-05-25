/**
 * =========================================================
 * 🎧 CYMOR FRONTEND ENGINE v7.0 PIPED READY
 * =========================================================
 * 🚀 Optimized for Piped Proxy Backend
 * 🚀 Fixed Search & UI Overlays
 * 🚀 Improved Mobile Audio Lifecycle
 * =========================================================
 */

// Element Selectors
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const downloadsContainer = document.getElementById('downloads-container');
const overlay = document.getElementById('overlay');
const loader = document.getElementById('loader');

// State Management
let selectedFormat = 'mp3';
let selectedQuality = '320';
let isSearching = false;
let currentAudio = null;
let downloadHistory = JSON.parse(localStorage.getItem('cymor_downloads')) || [];

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    createToastContainer();
    fetchServerStatus();
    renderDownloadHistory();
}

/* =========================================================
   SERVER STATUS
========================================================= */

async function fetchServerStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        console.log(`🎧 ${data.name} ONLINE`);
    } catch (err) {
        console.warn('⚠️ Cymor Engine Offline or Sleeping (Render Wake-up needed)');
    }
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {
    // Standard Search Button
    searchBtn?.addEventListener('click', performSearch);

    // Enter Key Support
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Cleanup audio on modal close is handled in closeEliteModal
}

/* =========================================================
   SEARCH LOGIC
========================================================= */

async function performSearch() {
    const query = searchInput.value.trim();

    if (!query || isSearching) return;

    isSearching = true;
    if (loader) loader.classList.add('active');
    searchBtn.disabled = true;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (loader) loader.classList.remove('active');

        if (!data.success || !data.results.length) {
            resultsContainer.innerHTML = `<p class="p-10 text-center text-gray-500">No tracks found.</p>`;
            return;
        }

        renderResults(data.results);
        showToast(`${data.results.length} tracks found`, 'success');

    } catch (err) {
        if (loader) loader.classList.remove('active');
        showToast('Server connection error', 'error');
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
        const title = sanitizeHTML(track.title);
        const thumb = track.thumbnail || 'https://placehold.co/300x300';

        return `
        <div class="glass p-3 rounded-2xl flex gap-3 items-center hover:bg-white/5 transition mb-3">
            <img src="${thumb}" class="w-16 h-16 rounded-xl object-cover" />
            <div class="flex-1 overflow-hidden">
                <h3 class="text-xs font-bold truncate">${title}</h3>
                <p class="text-[10px] text-gray-400">${track.author || 'YouTube'}</p>
                <button
                    onclick="openElitePreview('${track.id}', '${encodeURIComponent(title)}', '${thumb}')"
                    class="mt-2 bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[10px] font-bold"
                >
                    SELECT
                </button>
            </div>
        </div>`;
    }).join('');
}

/* =========================================================
   ELITE PREVIEW & MODAL
========================================================= */

window.openElitePreview = function(id, encodedTitle, thumb) {
    const title = decodeURIComponent(encodedTitle);
    
    // Remove existing modal if any
    document.getElementById('eliteModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'eliteModal';
    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4';
    modal.innerHTML = `
    <div class="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
    <div class="relative w-full max-w-sm glass rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="h-56 relative">
            <img src="${thumb}" class="w-full h-full object-cover" />
            <button onclick="closeEliteModal()" class="absolute top-3 right-3 bg-black/60 w-8 h-8 rounded-full text-white">✕</button>
            <button id="previewBtn"
                onclick="togglePreview('${id}')"
                class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 w-14 h-14 rounded-full text-black text-xl shadow-lg shadow-yellow-500/20">
                ▶
            </button>
        </div>
        <div class="p-5">
            <h2 class="text-white font-bold truncate text-center">${title}</h2>
            <div id="status" class="text-center text-yellow-400 text-[10px] mt-2 uppercase tracking-widest">
                Ready to stream
            </div>
            <div class="grid grid-cols-2 gap-3 mt-6">
                <button onclick="startDownload('${id}','${encodedTitle}','${thumb}','mp3')"
                    class="bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-bold transition">
                    🎵 MP3
                </button>
                <button onclick="startDownload('${id}','${encodedTitle}','${thumb}','mp4')"
                    class="bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl text-sm font-bold transition">
                    🎬 MP4
                </button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modal);
};

/* =========================================================
   AUDIO LIFECYCLE
========================================================= */

window.togglePreview = async function(id) {
    const btn = document.getElementById('previewBtn');
    const status = document.getElementById('status');

    try {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            btn.innerHTML = '▶';
            status.innerText = 'Paused';
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        status.innerText = 'Initializing...';
        currentAudio = new Audio(`/api/preview?id=${id}`);
        
        await currentAudio.play();
        btn.innerHTML = '❚❚';
        status.innerText = 'Streaming preview';

        currentAudio.onended = () => {
            btn.innerHTML = '▶';
            status.innerText = 'Finished';
        };

    } catch (err) {
        status.innerText = 'Connection Error';
        showToast('Stream failed - Server is busy', 'error');
    }
};

window.closeEliteModal = function() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    document.getElementById('eliteModal')?.remove();
};

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

window.startDownload = function(id, encodedTitle, thumb, format) {
    const title = decodeURIComponent(encodedTitle);
    
    showToast(`Preparing ${format.toUpperCase()}...`, 'success');
    
    // Direct link to the proxy route
    const downloadUrl = `/api/download?id=${id}&format=${format}`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = ''; // Let server Content-Disposition handle naming
    document.body.appendChild(a);
    a.click();
    a.remove();

    addToHistory({ videoId: id, title, thumbnail: thumb, format });
    
    // Close modal after a short delay
    setTimeout(() => closeEliteModal(), 1500);
};

/* =========================================================
   HISTORY & STORAGE
========================================================= */

function addToHistory(item) {
    downloadHistory = [item, ...downloadHistory]
        .filter((v, i, a) => a.findIndex(x => x.videoId === v.videoId) === i)
        .slice(0, 12);

    localStorage.setItem('cymor_downloads', JSON.stringify(downloadHistory));
    renderDownloadHistory();
}

function renderDownloadHistory() {
    if (!downloadsContainer) return;

    if (downloadHistory.length === 0) {
        downloadsContainer.innerHTML = `<p class="text-[10px] text-gray-500">No history yet.</p>`;
        return;
    }

    downloadsContainer.innerHTML = downloadHistory.map(item => `
        <div class="glass p-2 rounded-xl flex gap-2 items-center min-w-[150px]">
            <img src="${item.thumbnail}" class="w-8 h-8 rounded-lg object-cover" />
            <div class="overflow-hidden">
                <p class="text-[9px] font-bold truncate text-white">${sanitizeHTML(item.title)}</p>
                <p class="text-[8px] text-yellow-500 uppercase">${item.format}</p>
            </div>
        </div>
    `).join('');
}

/* =========================================================
   UI HELPERS
========================================================= */

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg, type) {
    const container = document.getElementById('toast');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `px-5 py-2.5 text-[11px] font-bold rounded-full text-white shadow-xl animate-bounce-short ${
        type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`;
    el.innerText = msg;

    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

function createToastContainer() {
    if (document.getElementById('toast')) return;
    const div = document.createElement('div');
    div.id = 'toast';
    div.className = 'fixed top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[100000] pointer-events-none';
    document.body.appendChild(div);
}

/**
 * Global function to open overlay from index.html buttons
 */
window.openSearch = function() {
    if (overlay) {
        overlay.classList.add('active');
        searchInput?.focus();
    }
};

window.togglePrivacyModal = function(show) {
    const modal = document.getElementById('privacy-modal');
    if (modal) modal.classList.toggle('hidden', !show);
};
