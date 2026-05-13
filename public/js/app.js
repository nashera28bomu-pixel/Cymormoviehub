async function loadMatches(){

  const res =
  await fetch("/api/fixtures");

  const matches =
  await res.json();

  const container =
  document.getElementById("matches");

  container.innerHTML =
  matches.map(match=>`

    <div class="match-card">

      <h3>

      ${match.teams?.home?.name}

      vs

      ${match.teams?.away?.name}

      </h3>

      <p>

      ${match.fixture?.status?.short}

      </p>

    </div>

  `).join("");

}

loadMatches();
