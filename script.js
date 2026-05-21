/**
 * =========================================================
 * 🎧 CYMOR SPOTIFY FRONTEND ENGINE v5.2 (STABILITY UPDATE)
 * =========================================================
 * Updated to handle Render relative paths and eliminate
 * "Server error" popups.
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
        // Using relative path to match Render's environment
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Offline');
        const data = await res.json();
        console.log(`🎧 Engine: ${data.name || 'Cymor'} Online`);
    } catch (e) {
        console.log('Elite Engine Connectivity Issue');
    }
}

/* =========================================================
   SEARCH ENGINE
========================================================= */

function setupSearch() {
    if (!searchBtn || !searchInput) return;

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
        // URL is now relative to ensure HTTPS/Domain compatibility
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!res.ok) {
            throw new Error('API unreachable');
        }

        const data = await res.json();

        if (!data.success || !data.results || data.results.length === 0) {
            resultsContainer.innerHTML = createEmptyState("No results found. Try a different song.");
            return;
        }

        // Show sections if hidden
        preferenceSection?.classList.remove('hidden');
        musicSection?.classList.remove('hidden');

        renderResults(data.results);
        showToast(`${data.results.length} tracks found`, 'success');

    } catch (e) {
        console.error('Search Engine Error:', e);
        resultsContainer.innerHTML = createEmptyState("Server is warming up. Please try again in 5 seconds.");
        showToast("Server error - check logs", "error");
    } finally {
        isSearching = false;
        searchBtn.disabled = false;
    }
}

/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(results) {
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = results.map(track => {
        // Clean title for JS safety
        const cleanTitle = track.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        return `
        <div class="glass p-3 rounded-2xl flex gap-3 items-center hover:bg-white/5 transition-all">
            <img src="${track.thumbnail}" class="w-16 h-16 rounded-xl object-cover shadow-lg" onerror="this.src='https://placehold.co/100x100?text=Music'"/>

            <div class="flex-1 overflow-hidden">
                <h3 class="text-xs font-bold leading-tight truncate">${sanitizeHTML(track.title)}</h3>
                <p class="text-[10px] text-gray-400 mt-1">${track.author || 'Cymor Artist'}</p>
                
                <div class="flex gap-2 mt-2">
                    <button onclick="openElitePreview('${track.id}','${cleanTitle}','${track.thumbnail}')"
                        class="bg-white text-black font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider active:scale-90 transition-transform">
                        Select
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

/* =========================================================
   ELITE PREVIEW MODAL
========================================================= */

window.openElitePreview = function(videoId, title, thumb) {
    const modal = document.createElement('div');
    modal.id = "eliteModal";
    modal.className = "fixed inset-0 z-[10000] flex items-center justify-center p-4";
    
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fadeIn"></div>
        
        <div class="relative w-full max-w-lg glass rounded-[32px] overflow-hidden shadow-2xl border border-white/10 scale-up">
            <div class="relative h-64">
                <img src="${thumb}" class="w-full h-full object-cover"/>
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <button onclick="closeEliteModal()" class="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center">✕</button>
            </div>

            <div class="p-6 text-center">
                <h2 class="text-lg font-bold text-white mb-1 truncate">${title}</h2>
                <p class="text-gray-400 text-xs mb-6 uppercase tracking-widest">Elite Media Engine</p>

                <div class="grid grid-cols-2 gap-4">
                    <button onclick="startDownload('${videoId}','${title.replace(/'/g, "\\'")}','${thumb}', 'mp3')" 
                        class="bg-blue-600 hover:bg-blue-500 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95">
                        🎵 MP3 Audio
                    </button>
                    <button onclick="startDownload('${videoId}','${title.replace(/'/g, "\\'")}','${thumb}', 'mp4')" 
                        class="glass hover:bg-white/10 py-3 rounded-2xl font-bold text-sm transition-all border border-white/20 active:scale-95">
                        🎬 MP4 Video
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

window.closeEliteModal = function() {
    const modal = document.getElementById('eliteModal');
    if (modal) modal.remove();
}

/* =========================================================
   DOWNLOAD ENGINE
========================================================= */

window.startDownload = async function(videoId, title, thumbnail, forcedFormat = null) {
    const format = forcedFormat || selectedFormat;
    showToast(`Preparing ${format.toUpperCase()}...`, 'success');
    
    // Direct link trigger is safest for Render's free tier timeouts
    const url = `/api/download?id=${videoId}&format=${format}&quality=${selectedQuality}`;
    
    window.location.href = url;

    addToHistory({
        videoId,
        title,
        thumbnail,
        format: format,
        date: new Date().toLocaleDateString()
    });
    
    setTimeout(window.closeEliteModal, 800);
}

/* =========================================================
   FORMAT & QUALITY (For UI control)
========================================================= */

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
            selectedQuality = btn.textContent.includes('320') ? '320' : '128';
        });
    });
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
            <img src="${item.thumbnail}" class="w-10 h-10 rounded-lg object-cover" onerror="this.src='https://placehold.co/50x50'"/>
            <div class="overflow-hidden">
                <p class="text-[10px] font-bold truncate text-white">${sanitizeHTML(item.title)}</p>
                <p class="text-[8px] text-blue-400 uppercase">${item.format}</p>
            </div>
        </div>
    `).join('');
}

function createLoader() {
    return `<div class="flex flex-col items-center justify-center p-20 gap-4">
                <div class="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-gray-400 font-mono tracking-widest">CONNECTING TO CYMOR ENGINE...</p>
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
    const container = document.getElementById('toast');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `px-6 py-3 rounded-full text-white text-[10px] font-bold shadow-2xl transition-all duration-500 transform translate-y-10 opacity-0 ${
        type === 'success' ? 'bg-blue-600' : 'bg-red-600'
    }`;
    el.textContent = msg;
    
    container.appendChild(el);
    
    // Animate in
    setTimeout(() => {
        el.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Remove
    setTimeout(() => {
        el.classList.add('opacity-0');
        setTimeout(() => el.remove(), 500);
    }, 3000);
}

function createToastContainer() {
    if (document.getElementById('toast')) return;
    const div = document.createElement('div');
    div.id = 'toast';
    div.className = "fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none flex flex-col gap-2";
    document.body.appendChild(div);
}
