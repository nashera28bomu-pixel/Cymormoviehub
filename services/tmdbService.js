const axios = require('axios');

const BASE_URL = 'https://api.themoviedb.org/3';

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: process.env.TMDB_API_KEY
  }
});

async function fetchTrending() {
  const res = await api.get('/trending/all/day');
  return res.data;
}

async function fetchPopularMovies() {
  const res = await api.get('/movie/popular');
  return res.data;
}

async function search(query) {
  const res = await api.get('/search/multi', {
    params: { query }
  });

  return res.data;
}

async function getMovieDetails(type, id) {
  const res = await api.get(`/${type}/${id}`);
  return res.data;
}

async function getMovieVideos(type, id) {
  const res = await api.get(`/${type}/${id}/videos`);
  return res.data;
}

async function getRecommendations(type, id) {
  const res = await api.get(`/${type}/${id}/recommendations`);
  return res.data;
}

module.exports = {
  fetchTrending,
  fetchPopularMovies,
  search,
  getMovieDetails,
  getMovieVideos,
  getRecommendations
};
