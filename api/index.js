// Vercel serverless entry point. Vercel treats every file in /api as its own
// serverless function; this one re-exports the full Express app from
// backend/src/server.js, so every /api/* route defined there is handled by
// this single function (Vercel's routing sends all /api/** traffic here —
// see vercel.json).
//
// Locally, this file isn't used at all — `npm start` inside backend/ runs
// server.js directly with .listen(). This file only matters in the deployed
// Vercel environment.

module.exports = require('../backend/src/server');
