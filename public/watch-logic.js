const params = new URLSearchParams(window.location.search);

const id = params.get("id");

const type = params.get("type") || "movie";

const IMG = "https://image.tmdb.org/t/p/w500";

async function loadMovie() {

    try {

        const res = await fetch(`/api/details/${id}?type=${type}`);

        const data = await res.json();

        // TITLE

        document.getElementById("movieTitle").innerText =
            data.title || data.name;

        // OVERVIEW

        document.getElementById("movieOverview").innerText =
            data.overview || "No overview available.";

        // PLAYER

        document.getElementById("videoPlayer").src =
            `https://vidsrc.to/embed/${type}/${id}`;

        // CAST

        renderCast(data.credits?.cast || []);

        // RELATED

        renderRelated(
            data.recommendations?.results ||
            data.similar?.results ||
            []
        );

        // TV

        if (type === "tv") {

            document.getElementById("episodeTab").style.display = "block";

            loadEpisodes(id, 1);
        }

    } catch (err) {

        console.log(err);

    }

}

function renderCast(cast) {

    const container = document.getElementById("castList");

    container.innerHTML = cast.slice(0, 12).map(person => `

        <div class="cast-card">

            <img src="${
                person.profile_path
                ? IMG + person.profile_path
                : 'https://via.placeholder.com/300x450'
            }">

            <p>${person.name}</p>

        </div>

    `).join("");

}

function renderRelated(movies) {

    const container = document.getElementById("similarMovies");

    container.innerHTML = movies.slice(0, 12).map(movie => `

        <div class="movie-card"
        onclick="openMovie(${movie.id}, '${movie.title ? 'movie' : 'tv'}')">

            <div class="rating-badge">
                ★ ${movie.vote_average?.toFixed(1) || 'N/A'}
            </div>

            <img src="${
                movie.poster_path
                ? IMG + movie.poster_path
                : 'https://via.placeholder.com/500x750'
            }">

        </div>

    `).join("");

}

function openMovie(id, type) {

    window.location.href =
        `watch.html?id=${id}&type=${type}`;

}

async function loadEpisodes(id, season) {

    const res = await fetch(
        `/api/tv/${id}/season/${season}`
    );

    const data = await res.json();

    const container =
        document.getElementById("episodeGrid");

    container.innerHTML =
        data.episodes.map(ep => `

        <div class="ep-box"
        onclick="playEpisode(${season}, ${ep.episode_number})">

            EP ${ep.episode_number}

        </div>

    `).join("");

}

function playEpisode(season, episode) {

    document.getElementById("videoPlayer").src =
        `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;

}

function switchTab(name, el) {

    document.querySelectorAll(".tab")
    .forEach(tab => tab.classList.remove("active"));

    document.querySelectorAll(".pane")
    .forEach(pane => pane.classList.remove("active"));

    el.classList.add("active");

    document.getElementById(name + "Pane")
    .classList.add("active");

}

function scrollToDownloads() {

    document.getElementById("downloads")
    .scrollIntoView({
        behavior: "smooth"
    });

}

loadMovie();
