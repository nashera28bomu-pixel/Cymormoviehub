const params = new URLSearchParams(window.location.search);

const id = params.get("id");

const player = document.getElementById("player");

player.src =
`https://vidsrc.me/embed/movie?tmdb=${id}`;
