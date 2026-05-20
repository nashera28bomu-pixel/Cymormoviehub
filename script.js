/**
 * =========================================================
 * 🎵 CYMOR MUSIC DOWNLOADER — ELITE FRONTEND ENGINE
 * =========================================================
 * Creator: Legendary Smiley Cymor
 * CEO of CymorTechServices
 * =========================================================
 */

/* =========================================================
   ELEMENTS & STATE
========================================================= */
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
   INITIALIZATION
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
   CORE FUNCTIONS
========================================================= */

async function fetchServerStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        console.log(`🎵 ${data.app} | Status: ${data.status}`);
    } catch (e) { console.log('Offline Mode Active'); }
}

function setupSearch() {
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return showToast('Please enter a search term', 'error');
    if (isSearching) return;

    isSearching = true;
    resultsContainer.innerHTML = createLoader();
    searchBtn.disabled = true;
    searchBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            // REVEAL HIDDEN SECTIONS
            if (preferenceSection) preferenceSection.classList.remove('hidden');
            if (musicSection) musicSection.classList.remove('hidden');
            
            renderResults(data.results);
            showToast(`${data.results.length} results found`, 'success');
        } else {
            resultsContainer.innerHTML = createEmptyState('No results found');
        }
    } catch (error) {
        resultsContainer.innerHTML = createEmptyState('Server connection failed');
        showToast('Backend unavailable', 'error');
    } finally {
        isSearching = false;
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Go';
    }
}

/* =========================================================
   UI SELECTION LOGIC
========================================================= */

function setupFormatSelection() {
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            formatButtons.forEach(btn => {
                btn.classList.remove('bg-blue-500/20', 'border-blue-500/40');
                btn.classList.add('border-white/10', 'text-gray-400');
            });

            button.classList.remove('border-white/10', 'text-gray-400');
            button.classList.add('bg-blue-500/20', 'border-blue-500/40', 'text-white');

            selectedFormat = button.textContent.includes('MP4') ? 'mp4' : 'mp3';
            updateQualityVisibility();
            showToast(`Format: ${selectedFormat.toUpperCase()}`, 'success');
        });
    });
}

function setupQualitySelection() {
    qualityButtons.forEach(button => {
        button.addEventListener('click', () => {
            qualityButtons.forEach(btn => {
                btn.classList.remove('bg-blue-500/20', 'border-blue-500/40');
                btn.classList.add('border-white/10', 'text-gray-400');
            });

            button.classList.remove('border-white/10', 'text-gray-400');
            button.classList.add('bg-blue-500/20', 'border-blue-500/40', 'text-white');

            selectedQuality = button.textContent.replace(/[a-z]/gi, '').trim();
            showToast(`Quality: ${button.textContent}`, 'success');
        });
    });
}

function updateQualityVisibility() {
    qualityButtons.forEach(btn => {
        const isVideoQ = btn.textContent.includes('p');
        btn.style.display = (selectedFormat === 'mp3' && !isVideoQ) || (selectedFormat === 'mp4' && isVideoQ) ? 'block' : 'none';
    });
}

/* =========================================================
   DOWNLOAD & HISTORY ENGINE
========================================================= */

async function startDownload(videoId, title, thumbnail) {
    try {
        showDownloadOverlay();
        updateDownloadStatus('Initializing Cymor Engine...', '15%');

        const downloadURL = `/api/download?id=${videoId}&format=${selectedFormat}&quality=${selectedQuality}`;

        // Save to History
        addToHistory({ videoId, title, thumbnail, format: selectedFormat, date: new Date().toLocaleDateString() });

        setTimeout(() => updateDownloadStatus(`Processing ${selectedFormat.toUpperCase()}...`, '55%'), 1000);
        setTimeout(() => updateDownloadStatus('Injecting Metadata...', '85%'), 2500);

        setTimeout(() => {
            window.location.href = downloadURL;
            updateDownloadStatus('Complete!', '100%');
            showToast('Download Started', 'success');
            setTimeout(hideDownloadOverlay, 2000);
        }, 3500);

    } catch (e) {
        hideDownloadOverlay();
        showToast('Download Failed', 'error');
    }
}

function addToHistory(item) {
    downloadHistory = [item, ...downloadHistory.slice(0, 9)]; // Keep last 10
    localStorage.setItem('cymor_downloads', JSON.stringify(downloadHistory));
    renderDownloadHistory();
}

function renderDownloadHistory() {
    if (!downloadsContainer) return;
    if (downloadHistory.length === 0) return;

    downloadsContainer.innerHTML = downloadHistory.map(item => `
        <div class="glass rounded-2xl p-3 flex gap-3 border border-white/5 animate-fadeIn">
            <img src="${item.thumbnail}" class="w-16 h-16 object-cover rounded-xl">
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold truncate">${sanitizeHTML(item.title)}</h4>
                <p class="text-[10px] text-blue-400 mt-1 uppercase font-bold">${item.format} • ${item.date}</p>
                <button onclick="window.open('https://youtube.com/watch?v=${item.videoId}')" class="text-[10px] text-gray-500 underline mt-1">Watch Again</button>
            </div>
        </div>
    `).join('');
}

/* =========================================================
   RENDERING & UTILS
========================================================= */

function renderResults(results) {
    resultsContainer.innerHTML = results.map(track => `
        <div class="glass rounded-[28px] p-3 flex gap-3 border border-white/5 hover:border-blue-500/20 transition-all duration-300 animate-fadeIn">
            <div class="relative flex-shrink-0">
                <img src="${track.thumbnail}" class="w-24 h-24 object-cover rounded-2xl">
                <div class="absolute bottom-1 right-1 bg-black/70 px-2 py-0.5 rounded text-[9px]">${track.duration}</div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-xs line-clamp-2 leading-tight">${sanitizeHTML(track.title)}</h3>
                    <p class="text-[10px] text-gray-400 mt-1">${track.author} • ${formatViews(track.views)} views</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="startDownload('${track.id}', '${track.title.replace(/'/g, "")}', '${track.thumbnail}')" 
                        class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl py-2 text-[11px] font-bold active:scale-95 transition-all">
                        ⬇ DOWNLOAD
                    </button>
                    <button onclick="window.open('${track.url}', '_blank')" class="glass rounded-xl px-3 text-sm">▶</button>
                </div>
            </div>
        </div>
    `).join('');
}

function showDownloadOverlay() {
    if (document.getElementById('download-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'download-overlay';
    overlay.className = 'fixed inset-0 bg-black/90 backdrop-blur-xl z-[999] flex items-center justify-center px-5 animate-fadeIn';
    overlay.innerHTML = `
        <div class="glass rounded-[32px] p-8 w-full max-w-sm text-center border border-blue-500/20">
            <div class="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto text-3xl animate-bounce">⬇</div>
            <h2 class="text-xl font-black mt-4">CYMOR PRO</h2>
            <p id="download-message" class="text-xs text-gray-400 mt-2">Connecting to secure tunnel...</p>
            <div class="mt-6 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div id="download-progress" class="h-full w-0 bg-gradient-to-r from-blue-400 to-purple-600 transition-all duration-500"></div>
            </div>
            <p id="download-percent" class="text-xs text-blue-400 mt-3 font-bold">0%</p>
        </div>`;
    document.body.appendChild(overlay);
}

function updateDownloadStatus(msg, pct) {
    const m = document.getElementById('download-message');
    const p = document.getElementById('download-progress');
    const t = document.getElementById('download-percent');
    if (m) m.textContent = msg;
    if (p) p.style.width = pct;
    if (t) t.textContent = pct;
}

function hideDownloadOverlay() {
    const el = document.getElementById('download-overlay');
    if (el) el.remove();
}

function createToastContainer() {
    if (document.getElementById('toast-container')) return;
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[1000] space-y-2 w-full max-w-[280px]';
    document.body.appendChild(c);
}

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    const color = type === 'success' ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-pink-600';
    t.className = `bg-gradient-to-r ${color} text-white px-4 py-2 rounded-xl text-[11px] font-bold text-center shadow-xl animate-bounce`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function createLoader() {
    return `<div class="flex flex-col items-center py-20 animate-pulse">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs text-gray-500 mt-4 font-medium uppercase tracking-widest">Searching Cymor Nodes...</p>
    </div>`;
}

function createEmptyState(msg) {
    return `<div class="glass rounded-3xl p-10 text-center border border-white/5">
        <span class="text-4xl">🏜️</span>
        <h3 class="text-sm font-bold mt-4">${msg}</h3>
    </div>`;
}

function formatViews(v) {
    if (!v) return '0';
    return v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v;
}

function sanitizeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
