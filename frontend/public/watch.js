const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const player = document.getElementById("player");

async function loadMovie() {
  const res = await fetch(
    `https://your-backend.onrender.com/api/stream/${id}`
  );

  const data = await res.json();

  player.src = data.vidsrc;

  saveContinueWatching(id);
}

function saveContinueWatching(id) {
  const existing = JSON.parse(
    localStorage.getItem("continueWatching") || "[]"
  );

  existing.push({
    id,
    timestamp: Date.now()
  });

  localStorage.setItem(
    "continueWatching",
    JSON.stringify(existing)
  );
}

loadMovie();
