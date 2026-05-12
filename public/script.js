const IMG = "https://image.tmdb.org/t/p/w500";

const hero = document.getElementById("hero");

async function fetchMovies(endpoint, target) {

  const res = await fetch(`/api/${endpoint}`);
  const data = await res.json();

  renderMovies(data.results, target);

  if(endpoint === "trending") {
    setHero(data.results[0]);
  }

}

function renderMovies(movies, targetId) {

  const container = document.getElementById(targetId);

  container.innerHTML = movies.map(movie => `

    <div class="movie-card"
      onclick="openMovie(${movie.id})">

      <img src="${IMG + movie.poster_path}">

    </div>

  `).join("");

}

function setHero(movie) {

  hero.style.backgroundImage = `
    linear-gradient(
      to top,
      rgba(0,0,0,0.95),
      rgba(0,0,0,0.2)
    ),
    url(https://image.tmdb.org/t/p/original${movie.backdrop_path})
  `;

  hero.innerHTML = `

    <div class="hero-content">

      <h1>${movie.title}</h1>

      <p>${movie.overview}</p>

      <button onclick="openMovie(${movie.id})">
        Watch Now
      </button>

    </div>

  `;

}

function openMovie(id) {

  window.location.href = `watch.html?id=${id}`;

}

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", async (e) => {

  const q = e.target.value;

  if(q.length < 2) return;

  const res = await fetch(`/api/search?q=${q}`);
  const data = await res.json();

  renderMovies(data.results, "trending");

});

fetchMovies("trending", "trending");
fetchMovies("popular", "popular");
fetchMovies("toprated", "toprated");
