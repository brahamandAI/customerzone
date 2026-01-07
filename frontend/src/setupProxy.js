const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend - non-blocking configuration
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'error', // Reduce logging overhead
      timeout: 10000, // 10 second timeout
      onError: (err, req, res) => {
        // Handle proxy errors gracefully without blocking dev server
        console.error('Proxy error:', err.message);
        res.status(503).json({ error: 'Backend service unavailable' });
      },
      onProxyReq: (proxyReq, req, res) => {
        // Optional: Add any request modifications here
      },
    })
  );
};



