#!/usr/bin/env node
// Simple HTTP proxy for LM Studio
import http from 'http';

const LM_STUDIO_HOST = '192.168.100.99';
const LM_STUDIO_PORT = 1234;
const PROXY_PORT = 8888;

const server = http.createServer((req, res) => {
  // Forward to LM Studio
  const options = {
    hostname: LM_STUDIO_HOST,
    port: LM_STUDIO_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`LM Studio proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`Forwarding to ${LM_STUDIO_HOST}:${LM_STUDIO_PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});