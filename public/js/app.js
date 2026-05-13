async function loadFixtures() {
  try {
    const res = await fetch("/api/fixtures");
    const data = await res.json();

    const container = document.getElementById("matches");
    if (!container) return;

    if (!data.data || data.data.length === 0) {
      container.innerHTML = `
        <div style="padding:20px;color:#fbbf24;">
          No EPL fixtures found right now ⚽
        </div>
      `;
      return;
    }

    container.innerHTML = data.data.map(match => {

      const time = new Date(match.time);
      const now = new Date();
      const diff = Math.floor((time - now) / 60000);

      const status = match.live
        ? "LIVE 🔴"
        : diff > 0
          ? `Kickoff in ${diff} min`
          : "Started";

      return `
        <div class="fixture-card">

          <div class="fixture-top">
            <span>${match.league}</span>
            <span class="${match.live ? "live-badge" : "kickoff"}">
              ${status}
            </span>
          </div>

          <div class="teams">

            <div class="team">
              <img src="${match.home.logo}" />
              <p>${match.home.name}</p>
            </div>

            <div class="vs">VS</div>

            <div class="team">
              <img src="${match.away.logo}" />
              <p>${match.away.name}</p>
            </div>

          </div>

        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Fixtures UI error:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadFixtures);
