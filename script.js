/**
 * =========================================================
 * 🎧 CYMOR SPOTIFY FRONTEND ENGINE v5.1 (ELITE EDITION)
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
        console.log(`🎧 Engine: ${data.name} Online`);
    } catch (e) {
        console.log('Elite Engine Offline');
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
    }
}

/* =========================================================
   RENDER RESULTS (WATERMARK-FREE & CLEAN)
========================================================= */

function renderResults(results) {
    resultsContainer.innerHTML = results.map(track => `
        <div class="glass p-3 rounded-2xl flex gap-3 items-center hover:bg-white/5 transition-all">
            <img src="${track.thumbnail}" class="w-16 h-16 rounded-xl object-cover shadow-lg"/>

            <div class="flex-1">
                <h3 class="text-xs font-bold leading-tight">${sanitizeHTML(track.title)}</h3>
                <p class="text-[10px] text-gray-400 mt-1">${track.author || 'Artist'}</p>
                
                <div class="flex gap-2 mt-2">
                    <button onclick="openElitePreview('${track.id}','${track.title.replace(/'/g,"")}','${track.thumbnail}')"
                        class="bg-white text-black font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider">
                        Select
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/* =========================================================
   ELITE PREVIEW MODAL (FULL SCREEN & NO WATERMARK)
========================================================= */

function openElitePreview(videoId, title, thumb) {
    const modal = document.createElement('div');
    modal.id = "eliteModal";
    modal.className = "fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn";
    
    // Glassmorphic Full Screen Overlay
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>
        
        <div class="relative w-full max-w-lg glass rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
            <div class="relative h-64">
                <img src="${thumb}" class="w-full h-full object-cover"/>
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <button onclick="closeEliteModal()" class="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white">✕</button>
            </div>

            <div class="p-6 text-center">
                <h2 class="text-lg font-bold text-white mb-1">${title}</h2>
                <p class="text-gray-400 text-xs mb-6 uppercase tracking-widest">Elite Media Engine</p>

                <div class="grid grid-cols-2 gap-4">
                    <button onclick="startDownload('${videoId}','${title}','${thumb}', 'mp3')" 
                        class="bg-blue-600 hover:bg-blue-500 py-3 rounded-2xl font-bold text-sm transition-all">
                        🎵 MP3 Audio
                    </button>
                    <button onclick="startDownload('${videoId}','${title}','${thumb}', 'mp4')" 
                        class="glass hover:bg-white/10 py-3 rounded-2xl font-bold text-sm transition-all border border-white/20">
                        🎬 MP4 Video
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeEliteModal() {
    const modal = document.getElementById('eliteModal');
    if (modal) modal.remove();
}

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

async function startDownload(videoId, title, thumbnail, forcedFormat = null) {
    const format = forcedFormat || selectedFormat;
    showToast(`Initializing ${format.toUpperCase()} Download...`, 'success');
    
    const url = `/api/download?id=${videoId}&format=${format}&quality=${selectedQuality}`;
    
    // Direct link trigger for Render stability
    window.location.href = url;

    addToHistory({
        videoId,
        title,
        thumbnail,
        format: format,
        date: new Date().toLocaleDateString()
    });
    
    setTimeout(closeEliteModal, 500);
}

/* =========================================================
   UI HELPERS & HISTORY
========================================================= */

function addToHistory(item) {
    downloadHistory = [item, ...downloadHistory.filter(i => i.videoId !== item.videoId)].slice(0, 10);
    localStorage.setItem('cymor_downloads', JSON.stringify(downloadHistory));
    renderDownloadHistory();
}

function renderDownloadHistory() {
    if (!downloadsContainer) return;
    downloadsContainer.innerHTML = downloadHistory.map(item => `
        <div class="glass p-2 rounded-xl flex gap-2 items-center opacity-80 hover:opacity-100 transition-opacity">
            <img src="${item.thumbnail}" class="w-10 h-10 rounded-lg object-cover"/>
            <div class="overflow-hidden">
                <p class="text-[10px] font-bold truncate">${sanitizeHTML(item.title)}</p>
                <p class="text-[8px] text-blue-400 uppercase">${item.format}</p>
            </div>
        </div>
    `).join('');
}

function createLoader() {
    return `<div class="flex flex-col items-center justify-center p-20 gap-4">
                <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-gray-400 font-mono">ENCRYPTING STREAM...</p>
            </div>`;
}

function createEmptyState(msg) {
    return `<div class="text-center p-10 text-gray-500 text-xs">${msg}</div>`;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `px-6 py-3 rounded-full text-white text-[10px] font-bold shadow-2xl animate-bounce ${
        type === 'success' ? 'bg-blue-600' : 'bg-red-600'
    }`;
    el.textContent = msg;
    document.getElementById('toast').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function createToastContainer() {
    if (document.getElementById('toast')) return;
    const div = document.createElement('div');
    div.id = 'toast';
    div.className = "fixed bottom-10 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none";
    document.body.appendChild(div);
}
