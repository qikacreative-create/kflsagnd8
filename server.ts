import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const port = 3000;

  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');
  const publicPath = path.resolve(process.cwd(), 'public');

  app.get('/b/*', (_req, res) => {
    const bookingFile =
      isProduction && fs.existsSync(path.join(distPath, 'booking.html'))
        ? path.join(distPath, 'booking.html')
        : path.join(publicPath, 'booking.html');
    res.sendFile(bookingFile);
  });

  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // 2. Setup Vite (untuk frontend development)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();

