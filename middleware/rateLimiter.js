const rateLimit = require('express-rate-limit');

/**
 * 10/10 RATE LIMITER STRATEGY
 * Prevents API abuse while keeping the experience smooth for real users.
 */

// 1. General Limiter (Applies to the whole site)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.'
  }
});

// 2. Strict Limiter (For Search & AI routes)
// This prevents bots from spamming your TMDB API keys
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Only 10 searches/AI requests per minute
  message: {
    success: false,
    error: 'Slow down! You are searching too fast.'
  }
});

module.exports = {
  generalLimiter,
  strictLimiter
};
