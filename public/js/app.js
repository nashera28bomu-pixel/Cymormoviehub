async function loadFixtures() {
  try {
    const res = await fetch("/api/fixtures");

    const data = await res.json();

    const fixtures = data.data || [];

    const container = document.getElementById("matches");

    if (!container) return;

    if (!fixtures.length) {
      container.innerHTML = `
        <div style="padding:20px;color:#9ca3af;">
          No fixtures found for today.
        </div>
      `;
      return;
    }

    container.innerHTML = fixtures.map(match => {

      const time = new Date(match.time);
      const now = new Date();
      const diff = Math.floor((time - now) / 60000);

      const countdown =
        diff > 0 ? `Starts in ${diff} min` : "LIVE";

      const live = match.live || diff <= 0;

      return `
        <div class="fixture-card">

          <div class="fixture-top">
            <span class="league">${match.league || "Football"}</span>

            <span class="${live ? "live-badge" : "kickoff"}">
              ${live ? "🔴 LIVE" : countdown}
            </span>
          </div>

          <div class="teams">

            <div class="team">
              <img src="${match.home?.logo || ''}" />
              <p>${match.home?.name || "Home"}</p>
            </div>

            <div class="vs">VS</div>

            <div class="team">
              <img src="${match.away?.logo || ''}" />
              <p>${match.away?.name || "Away"}</p>
            </div>

          </div>

        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Fixtures UI error:", err);

    const container = document.getElementById("matches");
    if (container) {
      container.innerHTML = `
        <div style="color:red;padding:20px;">
          Failed to load fixtures.
        </div>
      `;
    }
  }
}

/* AUTO REFRESH (LIVE ENGINE FEEL) */
document.addEventListener("DOMContentLoaded", () => {
  loadFixtures();

  setInterval(() => {
    loadFixtures();
  }, 60000); // refresh every 60s
});
