import { spawn } from 'child_process';
import { request } from 'http';

const SERVER_DIR = new URL('../apps/server', import.meta.url).pathname;
const PORT = 3000;
const MAX_WAIT = 30_000;

const server = spawn('node', ['dist/main'], {
  cwd: SERVER_DIR,
  stdio: 'inherit',
  env: { ...process.env },
});

const start = Date.now();

function poll() {
  const req = request(
    { hostname: '127.0.0.1', port: PORT, path: '/api/v1/seed', method: 'POST' },
    (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        console.log(body);
        server.kill();
        process.exit(0);
      });
    },
  );
  req.on('error', () => {
    if (Date.now() - start > MAX_WAIT) {
      console.error('Server did not start in time');
      server.kill();
      process.exit(1);
    }
    setTimeout(poll, 500);
  });
  req.end();
}

poll();
