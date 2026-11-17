/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ephemeral Static File Server for Mediobot UI E2E Testing
 * Serves compiled frontend artifacts on an OS-assigned dynamic ephemeral port (port 0)
 * Bound exclusively to 127.0.0.1 with zero external egress.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_DIST_DIR = path.resolve(__dirname, '../../../dist');

export interface StaticServerHandle {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

/**
 * Creates and starts an isolated static file server on dynamic port 0.
 */
export function createStaticServer(distDir: string = DEFAULT_DIST_DIR): Promise<StaticServerHandle> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0]!;
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      // Security check: prevent directory traversal
      const safeSuffix = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(distDir, safeSuffix);

      if (!filePath.startsWith(distDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath)) {
        if (reqPath === '/favicon.ico') {
          res.writeHead(204);
          res.end();
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const indexInDir = path.join(filePath, 'index.html');
        if (fs.existsSync(indexInDir)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(indexInDir).pipe(res);
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const url = `http://127.0.0.1:${port}`;

      const handle: StaticServerHandle = {
        server,
        port,
        url,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          }),
      };

      resolve(handle);
    });
  });
}
