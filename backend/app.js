const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT harus berupa angka antara 1 dan 65535.');
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad Request');
    return;
  }

  const requestedPath = path.resolve(frontendRoot, `.${pathname}`);
  const relativePath = path.relative(frontendRoot, requestedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const filePath = pathname.endsWith('/') ? path.join(requestedPath, 'index.html') : requestedPath;
  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      if (statError.code === 'ENOENT' || statError.code === 'ENOTDIR') {
        response.writeHead(404);
        response.end('Not Found');
        return;
      }
      console.error(`Gagal memeriksa ${filePath}:`, statError);
      response.writeHead(500);
      response.end('Internal Server Error');
      return;
    }

    if (!stats.isFile()) {
      response.writeHead(404);
      response.end('Not Found');
      return;
    }

    response.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', error => {
      console.error(`Gagal membaca ${filePath}:`, error);
      if (!response.headersSent) response.writeHead(500);
      response.end('Internal Server Error');
    });
    fileStream.pipe(response);
  });
});

server.on('error', error => {
  console.error('Server gagal dijalankan:', error);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`PressLedger berjalan di http://localhost:${port}`);
});
