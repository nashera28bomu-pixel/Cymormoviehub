const axios = require('axios');

// Fetch API Key from .env
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Reusable helper for TMDB requests
const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'en-US',
  },
});

/**
 * VISIONARY TMDB SERVICE
 * Designed for Cymor Movie Hub
 */

const tmdbService = {
  // 1. Hero Section Data
  fetchTrending: async () => {
    const { data } = await tmdb.get('/trending/all/day');
    return data;
  },

  // 2. Popular Movies Row
  fetchPopularMovies: async () => {
    const { data } = await tmdb.get('/movie/popular');
    return data;
  },

  // 3. Popular Series Row (Crucial for your Goal UI)
  fetchPopularSeries: async () => {
    const { data } = await tmdb.get('/tv/popular');
    return data;
  },

  // 4. Search Functionality
  search: async (query) => {
    const { data } = await tmdb.get('/search/multi', {
      params: { query, include_adult: false },
    });
    return data;
  },

  // 5. Enhanced Details (Movies)
  getMovieDetails: async (type, id) => {
    const { data } = await tmdb.get(`/${type}/${id}`, {
      params: { append_to_response: 'videos,credits,recommendations' },
    });
    return data;
  },

  // 6. TV Specific Details (Fetches Seasons & Episode counts)
  getTvShowDetails: async (id) => {
    const { data } = await tmdb.get(`/tv/${id}`, {
      params: { append_to_response: 'videos,credits,recommendations' },
    });
    return data;
  },

  /**
   * 7. Category Filtering (Nollywood / Hollywood)
   * Nollywood is filtered by Origin Country (NG)
   */
  fetchByGenre: async (customParams = {}) => {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        sort_by: 'popularity.desc',
        ...customParams,
      },
    });
    return data;
  },

  // 8. Recommendations Row
  getRecommendations: async (type, id) => {
    const { data } = await tmdb.get(`/${type}/${id}/recommendations`);
    return data;
  },
};

module.exports = tmdbService;
