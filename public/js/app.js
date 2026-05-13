async function loadFixtures() {
  try {
    const res = await fetch("/api/fixtures");
    const result = await res.json();

    const container = document.getElementById("fixtures");

    if (!container) return;

    const matches = result.data || [];

    if (!Array.isArray(matches) || matches.length === 0) {
      container.innerHTML = `
        <p style="color:#9ca3af;">No fixtures available today.</p>
      `;
      return;
    }

    container.innerHTML = matches.map(match => {

      const time = new Date(match.time);
      const now = new Date();

      const diff = Math.floor((time - now) / 60000);

      const countdown =
        diff > 0 ? `Starts in ${diff} min` : "LIVE 🔴";

      return `
        <div class="fixture-card">

          <div class="fixture-top">

            <span class="league">
              ${match.league || "League"}
            </span>

            <span class="${match.live ? "live-badge" : "kickoff"}">
              ${match.live ? "LIVE 🔴" : countdown}
            </span>

          </div>

          <div class="teams">

            <div class="team">
              <img src="${match.home.logo || ''}" />
              <p>${match.home.name || "Home"}</p>
            </div>

            <div class="vs">VS</div>

            <div class="team">
              <img src="${match.away.logo || ''}" />
              <p>${match.away.name || "Away"}</p>
            </div>

          </div>

        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("❌ Fixtures UI error:", err);
  }
}

/* ========================
   INIT
======================== */

document.addEventListener("DOMContentLoaded", loadFixtures);
